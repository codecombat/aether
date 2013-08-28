_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
traceur = window?.traceur ? self?.traceur ? global?.traceur ? require 'traceur'  # rely on traceur existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
acorn_loose = require 'acorn/acorn_loose'  # for if Esprima dies. Note it can't do ES6.
jshint = require('jshint').JSHINT
normalizer = require 'JS_WALA/normalizer/lib/normalizer'
escodegen = require 'escodegen'
#infer = require 'tern/lib/infer'  # Not enough time to figure out how to integrate this yet

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
morph = require './morph'
transforms = require './transforms'

optionsValidator = require './validators/options'

module.exports = class Aether
  @defaults: defaults
  @problems: problems
  @execution: execution
  constructor: (options) ->
    @originalOptions = _.cloneDeep options
    options ?= {}
    options.problems ?= {}
    unless options.excludeDefaultProblems
      options.problems = _.merge _.cloneDeep(Aether.problems.problems), options.problems

    optionsValidation = optionsValidator options
    throw new Error("Options array is not valid: " + JSON.stringify(optionsValidation.errors, null, 4)) if not optionsValidation.valid

    @options = _.merge _.cloneDeep(Aether.defaults), options
    @reset()

  canTranspile: (raw, thorough=false) ->
    # Quick heuristics: can this code be run, or will it produce a compilation error?
    # First check inspired by ACE: https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/javascript_worker.js
    return true if not raw #blank code should compile, but bypass the other steps
    try
      eval "'use strict;'\nthrow 0;" + raw  # evaluated code can only create variables in this function
    catch e
      return false if e isnt 0
    return true unless thorough
    lintProblems = @lint raw
    return lintProblems.errors.length is 0

  hasChangedSignificantly: (raw, oldAether) ->
    # Barring things like comments and whitespace and such, are the ASTs going to be different? (oldAether being a previously compiled instance)
    return true unless oldAether
    return raw isnt oldAether.raw  # TODO: add AST checks

  hasChanged: (raw, oldAether) ->
    # Is the code exactly the same?
    return true unless oldAether
    return raw isnt oldAether.raw

  reset: ->
    @problems = errors: [], warnings: [], infos: []
    @style = {}
    @flow = {}
    @metrics = {}
    @visualization = {}
    @pure = null

  transpile: (@raw) ->
    # Transpile it. Even if it can't transpile, it will give syntax errors and warnings and such. Clears any old state.
    @reset()
    @problems = @lint @raw
    @pure = @purifyCode @raw
    @pure

  addProblem: (problem, problems=null) ->
    return if problem.level is "ignore"
    #console.log "found problem:", problem.serialize()
    (problems ? @problems)[problem.level + "s"].push problem
    problem

  wrap: (rawCode) ->
    @wrappedCodePrefix ?=
    """
    function #{@options.functionName or 'foo'}(#{@options.functionParameters.join(', ')}) {
    \"use strict\";

    """
    @wrappedCodeSuffix ?= "\n}"
    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  lint: (rawCode) ->
    wrappedCode = @wrap rawCode
    lintProblems = errors: [], warnings: [], infos: []

    # Run it through JSHint first, because that doesn't rely on Esprima
    # See also how ACE does it: https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/javascript_worker.js
    # TODO: make JSHint stop providing these globals somehow; the below doesn't work
    jshintOptions = browser: false, couch: false, devel: false, dojo: false, jquery: false, mootools: false, node: false, nonstandard: false, phantom: false, prototypejs: false, rhino: false, worker: false, wsh: false, yui: false
    jshintGlobals = _.keys(@options.global)
    jshintGlobals = _.zipObject jshintGlobals, (false for g in jshintGlobals)  # JSHint expects {key: writable} globals
    jshintSuccess = jshint(wrappedCode, jshintOptions, jshintGlobals)
    for error in jshint.errors
      @addProblem new problems.TranspileProblem(@, 'jshint', error.code, error, {}, wrappedCode, @wrappedCodePrefix), lintProblems

    lintProblems

  createFunction: ->
    # Return a ready-to-execute, instrumented function from the purified code
    # Because JS_WALA normalizes it to define a wrapper function on this, we need to run the wrapper to get our real function out.
    wrapper = new Function ['_aether'], @pure
    dummyContext = {Math: Math}  # TODO: put real globals in
    wrapper.call dummyContext, @
    dummyContext[@options.functionName or 'foo']

  createMethod: ->
    # Like createFunction, but binds method to thisValue if specified
    func = @createFunction()
    func = _.bind func, @options.thisValue if @options.thisValue
    func

  getAllProblems: ->
    _.flatten _.values @problems

  serialize: ->
    # Convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such
    serialized = originalOptions: @originalOptions, raw: @raw, pure: @pure, problems: @problems, style: @style, flow: @flow, metrics: @metrics, visualization: @visualization
    serialized = _.cloneDeep serialized
    serialized.originalOptions.thisValue = null  # TODO: haaack, what
    # TODO: serialize problems, too
    #console.log "Serialized into", serialized
    serialized

  @deserialize: (serialized) ->
    # Convert a serialized Aether instance back from JSON
    aether = new Aether serialized.originalOptions
    for prop, val of serialized
      aether[prop] = val
    aether

  walk: (node, fn) ->
    # TODO: this is redundant with morph walk logic
    for key, child of node
      if _.isArray child
        for grandchild in child
          @walk grandchild, fn if _.isString grandchild?.type
      else if _.isString child?.type
        @walk child, fn
      fn child

  traceurify: (code) ->
    # TODO: where to put this?
    project = new traceur.semantics.symbols.Project('codecombat')
    reporter = new traceur.util.ErrorReporter()
    compiler = new traceur.codegeneration.Compiler(reporter, project)
    sourceFile = new traceur.syntax.SourceFile("randotron_" + Math.random(), code)
    project.addFile(sourceFile)
    trees = compiler.compile_()
    if reporter.hadError()
      console.log "traceur had error trying to compile"
    tree = trees.values()[0]
    opts = showLineNumbers: false
    tree.generatedSource = traceur.outputgeneration.TreeWriter.write(tree, opts)
    tree.generatedSource

  transform: (code, transforms, parser="esprima", withAST=false) ->
    transformedCode = morph code, (_.bind t, @ for t in transforms), parser
    return transformedCode unless withAST
    [parse, options] = switch parser
      when "esprima" then [esprima.parse, {loc: true, range: true, raw: true, comment: true, tolerant: true}]
      when "acorn_loose" then [acorn_loose.parse_dammit, {locations: true, tabSize: 4, ecmaVersion: 5}]
    transformedAST = parse transformedCode, options
    [transformedCode, transformedAST]

  purifyCode: (rawCode) ->
    preprocessedCode = @checkCommonMistakes rawCode  # TODO: if we could somehow not change the source ranges here, that would be awesome....
    wrappedCode = @wrap preprocessedCode
    @vars = {}

    originalNodeRanges = []
    preNormalizationTransforms = [
      transforms.makeGatherNodeRanges originalNodeRanges, @wrappedCodePrefix
      transforms.makeCheckThisKeywords @options.global
      transforms.checkIncompleteMembers
    ]
    try
      [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, "esprima", true
    catch error
      problem = new problems.TranspileProblem @, 'esprima', error.id, error, {}, wrappedCode, ''
      @addProblem problem
      originalNodeRanges.splice()  # Reset any ranges we did find; we'll try again
      [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, "acorn_loose", true

    # TODO: need to insert 'use strict' after normalization, since otherwise you get tmp2 = 'use strict'
    normalizedAST = normalizer.normalize transformedAST
    normalizedNodeIndex = []
    @walk normalizedAST, (node) ->
      return unless pos = node?.attr?.pos
      node.loc = {start: {line: 1, column: normalizedNodeIndex.length}, end: {line: 1, column: normalizedNodeIndex.length + 1}}
      normalizedNodeIndex.push node

    normalized = escodegen.generate normalizedAST, {sourceMap: @options.functionName or 'foo', sourceMapWithCode: true}
    normalizedCode = normalized.code
    normalizedSourceMap = normalized.map

    postNormalizationTransforms = []
    postNormalizationTransforms.unshift transforms.validateReturns if @options.thisValue?.validateReturn  # TODO: parameter/return validation should be part of Aether, not some half-external function call
    postNormalizationTransforms.unshift transforms.yieldConditionally if @options.yieldConditionally
    postNormalizationTransforms.unshift transforms.yieldAutomatically if @options.yieldAutomatically
    postNormalizationTransforms.unshift transforms.makeInstrumentStatements() if @options.includeMetrics or @options.includeFlow
    postNormalizationTransforms.unshift transforms.makeInstrumentCalls() if @options.includeMetrics or @options.includeFlow
    postNormalizationTransforms.unshift transforms.makeFindOriginalNodes originalNodeRanges, @wrappedCodePrefix, wrappedCode, normalizedSourceMap, normalizedNodeIndex
    instrumentedCode = @transform normalizedCode, postNormalizationTransforms
    traceuredCode = @traceurify "return " + instrumentedCode
    if false
      console.log "---NODE RANGES---:\n" + _.map(originalNodeRanges, (n) -> "#{n.originalRange.start} - #{n.originalRange.end}\t#{n.originalSource.replace(/\n/g, '↵')}").join('\n')
      console.log "---RAW CODE----: #{rawCode.split('\n').length}\n", {code: rawCode}
      console.log "---WRAPPED-----: #{wrappedCode.split('\n').length}\n", {code: wrappedCode}
      console.log "---TRANSFORMED-: #{transformedCode.split('\n').length}\n", {code: transformedCode}
      console.log "---NORMALIZED--: #{normalizedCode.split('\n').length}\n", {code: normalizedCode}
      console.log "---INSTRUMENTED: #{instrumentedCode.split('\n').length}\n", {code: "return " + instrumentedCode}
      console.log "---TRACEURED---: #{traceuredCode.split('\n').length}\n", {code: traceuredCode}
    return traceuredCode

  getLineNumberForPlannedMethod: (plannedMethod, numMethodsSeen) ->
    n = 0
    for methods, lineNumber in [] # @methodLineNumbers
      for method, j in methods
        if n++ < numMethodsSeen then continue
        if method is plannedMethod
          return lineNumber - 1
    null

  checkCommonMistakes: (code) ->
    # Stop this.\n from failing on the next weird line
    code = code.replace /this.\s*?\n/g, "this.IncompleteThisReference;"
    # If we wanted to do it just when it would hit the ending } but allow multiline this refs:
    #code = code.replace /this.(\s+})$/, "this.IncompleteThisReference;$1"
    code

  @getFunctionBody: (func) ->
    # Remove function() { ... } wrapper and any extra indentation
    source = if _.isString func then func else func.toString()
    source = source.substring(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
    lines = source.split /\r?\n/
    indent = if lines.length then lines[0].length - lines[0].replace(/^ +/, '').length else 0
    (line.slice indent for line in lines).join '\n'

  ### Flow/metrics -- put somewhere else? ###
  logStatement: (start, end, source) ->
    range = [start, end]
    if @options.includeMetrics
      m = (@metrics.statements ?= {})[range] ?= {source: source}
      m.executions ?= 0
      ++m.executions
      @metrics.statementsExecuted ?= 0
      @metrics.statementsExecuted += 1
    if @options.includeFlow
      state =
        range: [start, end]
        source: source
        variables: {}  # TODO
      callState = _.last @flow.states
      callState.push state

    #console.log "Logged statement", range, "'#{source}'"#, "and now have metrics", @metrics

  # TODO: handle recursion better; we should perhaps have a list of call trees, so that we can handle recursion, instead of just a list of lists of calls
  logCallStart: ->
    @callDepth ?= 0
    ++@callDepth
    if @options.includeMetrics
      @metrics.callsExecuted ?= 0
      ++@metrics.callsExecuted
      @metrics.maxDepth = Math.max(@metrics.maxDepth or 0, @callDepth)
    if @options.includeFlow
      (@flow ?= {}).states ?= []
      @flow.states.push call = []
      (@callStack ?= []).push call
    #console.log "Logged call to", @options.functionName, @metrics, @flow

  logCallEnd: ->
    if @options.includeFlow
      @callStack.pop()
    --@callDepth

self.Aether = Aether if self?
window.Aether = Aether if window?
