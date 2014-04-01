_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
traceur = window?.traceur ? self?.traceur ? global?.traceur ? require 'traceur'  # rely on traceur existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
acorn_loose = require 'acorn/acorn_loose'  # for if Esprima dies. Note it can't do ES6.
jshint = require('jshint').JSHINT
normalizer = require 'JS_WALA/normalizer/lib/normalizer'
escodegen = require 'escodegen'
csredux = require 'coffee-script-redux'

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
fixLocations = require './fixLocations'
morph = require './morph'
transforms = require './transforms'
protectAPI = require './protectAPI'
protectBuiltins = require './protectBuiltins'
instrumentation = require './instrumentation'

optionsValidator = require './validators/options'

module.exports = class Aether
  # various declarations
  @defaults: defaults
  @problems: problems
  @execution: execution

  # Current call depth
  depth: 0

  # MODIFIES: @options
  # EFFECTS: Initialize the Aether object by modifying @options by combining the default options with the options parameter
  #          and doing validation.
  constructor: (options) ->

    # do a deep copy of the options (using lodash, not underscore)
    @originalOptions = _.cloneDeep options

    # if options and options.problems do not exist, create them as empty objects
    options ?= {}
    options.problems ?= {}
    # unless the user has specified to exclude the default options, merge the given options with the default options
    unless options.excludeDefaultProblems
      options.problems = _.merge _.cloneDeep(Aether.problems.problems), options.problems

    # validate the options
    optionsValidation = optionsValidator options
    throw new Error("Options array is not valid: " + JSON.stringify(optionsValidation.errors, null, 4)) if not optionsValidation.valid

    # merge the given options with the default
    @options = _.merge _.cloneDeep(Aether.defaults), options

    # reset the state of the Aether object
    @reset()

  # EFFECTS: Performs quick heuristics to determine whether the code will run or produce compilation errors.
  #          If the bool thorough is specified, it will perform detailed linting. Returns true if raw will run, and false if it won't.
  # NOTES:   First check inspired by ACE: https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/javascript_worker.js
  canTranspile: (raw, thorough=false) ->
    return true if not raw # blank code should compile, but bypass the other steps
    try
      if @options.language is "javascript"
        eval "'use strict;'\nthrow 0;" + raw  # evaluated code can only create variables in this function
      else true
    catch e
      return false if e isnt 0
    return true unless thorough
    lintProblems = @lint raw
    return lintProblems.errors.length is 0

  # Determine whether two strings of code are significantly different.
  # If careAboutLineNumbers, we strip trailing comments and whitespace and compare line count.
  # If careAboutLint, we also lint and make sure lint problems are the same. Use this instance for lint config.
  hasChangedSignificantly: (a, b, careAboutLineNumbers=false, careAboutLint=false) ->
    lintAether = @ if careAboutLint
    Aether.hasChangedSignificantly a, b, careAboutLineNumbers, lintAether

  # If the simple tests fail, we compare abstract syntax trees for equality.
  # We try first with Esprima, to be precise, then with acorn_loose if that doesn't work.
  @hasChangedSignificantly: (a, b, careAboutLineNumbers=false, lintAether=null) ->
    return true unless a? and b?
    return false if a is b
    return true if careAboutLineNumbers and @hasChangedLineNumbers a, b
    return true if lintAether?.hasChangedLintProblems a, b
    options = {loc: false, range: false, comment: false, tolerant: true}
    [aAST, bAST] = [null, null]
    try aAST = esprima.parse a, options
    try bAST = esprima.parse b, options
    return true if (not aAST or not bAST) and (aAST or bAST)
    if aAST and bAST
      return true if (aAST.errors ? []).length isnt (bAST.errors ? []).length
      return not _.isEqual(aAST.body, bAST.body)
    # Esprima couldn't parse either ASTs, so let's fall back to acorn_loose
    options = {locations: false, tabSize: 4, ecmaVersion: 5}
    aAST = acorn_loose.parse_dammit a, options
    bAST = acorn_loose.parse_dammit b, options
    # acorn_loose annoyingly puts start/end in every node; we'll remove before comparing
    walk = (node) ->
      node.start = node.end = null
      for key, child of node
        if _.isArray child
          for grandchild in child
            walk grandchild if _.isString grandchild?.type
        else if _.isString child?.type
          walk child
    walk(aAST)
    walk(bAST)
    return not _.isEqual(aAST, bAST)

  @hasChangedLineNumbers: (a, b) ->
    unless String.prototype.trimRight
      String.prototype.trimRight = -> String(@).replace /\s\s*$/, ''
    a = a.replace(/^[ \t]+\/\/.*/g, '').trimRight()
    b = b.replace(/^[ \t]+\/\/.*/g, '').trimRight()
    return a.split('\n').length isnt b.split('\n').length

  hasChangedLintProblems: (a, b) ->
    aLintProblems = [p.id, p.message, p.hint] for p in @getAllProblems @lint a
    bLintProblems = [p.id, p.message, p.hint] for p in @getAllProblems @lint b
    return not _.isEqual aLintProblems, bLintProblems

  # EFFECTS: Resets the state of Aether.
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
    unless @options.language is 'coffeescript'
      @problems = @lint @raw
    @pure = @purifyCode @raw
    @pure

  beautify: (raw) ->
    try
      ast = esprima.parse raw, {range: true, tokens: true, comment: true, tolerant: true}
      ast = escodegen.attachComments ast, ast.comments, ast.tokens
    catch e
      console.log 'got error beautifying', e
      ast = acorn_loose.parse_dammit raw, {tabSize: 4, ecmaVersion: 5}
    beautified = escodegen.generate ast, {comment: true, parse: esprima.parse}
    beautified

  addProblem: (problem, problems=null) ->
    return if problem.level is "ignore"
    #console.log "found problem:", problem.serialize()
    (problems ? @problems)[problem.level + "s"].push problem
    problem

  wrap: (rawCode) ->
    @wrappedCodePrefix ?="""
    function #{@options.functionName or 'foo'}(#{@options.functionParameters.join(', ')}) {
    \"use strict\";
    """
    # Should add \n after? (Not `"use strict";this.moveXY(30, 26);` on one line.)
    # TODO: Try it and make sure our line counts are fine.
    @wrappedCodeSuffix ?= "\n}"
    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  wrapCS: (rawCode) ->
    @wrappedCodePrefix ?="""
    #{@options.functionName or 'foo'} = (#{@options.functionParameters.join(', ')}) ->
    \n"""
    @wrappedCodeSuffix ?= "\n"

    lines = rawCode.split "\n"
    lines[i] = "    " + lines[i] for i in [0...lines.length] # add indentation of 4 spaces to every line
    indentedCode = lines.join "\n"

    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  lint: (rawCode) ->
    wrappedCode = @wrap rawCode
    lintProblems = errors: [], warnings: [], infos: []

    # Run it through JSHint first, because that doesn't rely on Esprima
    # See also how ACE does it: https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/javascript_worker.js
    # TODO: make JSHint stop providing these globals somehow; the below doesn't work
    jshintOptions = browser: false, couch: false, devel: false, dojo: false, jquery: false, mootools: false, node: false, nonstandard: false, phantom: false, prototypejs: false, rhino: false, worker: false, wsh: false, yui: false
    jshintGlobals = _.keys(@options.global)
    jshintGlobals = _.zipObject jshintGlobals, (false for g in jshintGlobals)  # JSHint expects {key: writable} globals
    try
      jshintSuccess = jshint(wrappedCode, jshintOptions, jshintGlobals)
    catch e
      console.warn "JSHint died with error", e  #, "on code\n", wrappedCode
    for error in jshint.errors
      @addProblem new problems.TranspileProblem(@, 'jshint', error?.code, error, {}, wrappedCode, @wrappedCodePrefix), lintProblems

    lintProblems

  createFunction: ->
    # Return a ready-to-execute, instrumented function from the purified code
    fn = protectBuiltins.createSandboxedFunction @options.functionName or 'foo', @pure, @
    protectBuiltins.wrapWithSandbox @, fn

  createMethod: (thisValue) ->
    # Like createFunction, but binds method to thisValue if specified
    fn = @createFunction()
    fn = _.bind fn, thisValue or @options.thisValue if thisValue or @options.thisValue
    fn

  sandboxGenerator: (fn) ->
    # If you want to sandbox a generator each time it's called, then call result of createFunction and hand to this.
    oldNext = fn.next
    fn.next = protectBuiltins.wrapWithSandbox @, ->
      oldNext.apply fn, arguments
    fn

  run: (fn, args...) ->
    # Convenience wrapper for running the compiled function with default error handling
    try
      fn ?= @createMethod()
      fn args...
    catch error
      @addProblem new problems.RuntimeProblem @, error, {}

  getAllProblems: (problems) ->
    _.flatten _.values (problems ? @problems)

  serialize: ->
    # Convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such
    serialized = originalOptions: @originalOptions, raw: @raw, pure: @pure, problems: @problems
    serialized.flow = @flow if @options.includeFlow
    serialized.metrics = @metrics if @options.includeMetrics
    serialized.style = @style if @options.includeStyle
    serialized.visualization = @visualization if @options.includeVisualization
    #serialized = _.cloneDeep serialized  # hmm, needed?
    serialized.originalOptions.thisValue = null  # TODO: haaack, what
    # TODO: serialize problems, too
    #console.log "Serialized into", serialized
    serialized

  @deserialize: (serialized) ->
    # Convert a serialized Aether instance back from JSON
    aether = new Aether serialized.originalOptions
    for prop, val of serialized when prop isnt "originalOptions"
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
    url = "randotron_" + Math.random()
    reporter = new traceur.util.ErrorReporter()
    loaderHooks = new traceur.runtime.InterceptOutputLoaderHooks reporter, url
    loader = new traceur.System.internalLoader_.constructor loaderHooks  # Some day traceur's API will stabilize.
    loader.script code, url
    # Could also do the following, but that wraps in a module
    #loader = new traceur.runtime.Loader loaderHooks
    #loader.module code, url
    if reporter.hadError()
      console.warn "traceur had error trying to compile"
    loaderHooks.transcoded

  transform: (code, transforms, parser="esprima", withAST=false) ->
    transformedCode = morph code, (_.bind t, @ for t in transforms), parser
    return transformedCode unless withAST
    [parse, options] = switch parser
      when "esprima" then [esprima.parse, {loc: true, range: true, comment: true, tolerant: true}]
      when "acorn_loose" then [acorn_loose.parse_dammit, {locations: true, tabSize: 4, ecmaVersion: 5}]
      when "csredux" then [csredux.compile, {bare: true}]
    if parser is 'csredux'
      temp = csredux.parse transformedCode, {optimise: false, raw: true}
      transformedAST = parse temp, options
      fixLocations transformedAST
    else
      transformedAST = parse transformedCode, options
    [transformedCode, transformedAST]

  purifyCode: (rawCode) ->
    if @options.language is 'coffeescript'
      wrappedCode = @wrapCS rawCode
    else
      preprocessedCode = @checkCommonMistakes rawCode  # TODO: if we could somehow not change the source ranges here, that would be awesome....
      wrappedCode = @wrap preprocessedCode

    originalNodeRanges = []
    varNames = {}
    varNames[parameter] = true for parameter in @options.functionParameters
    preNormalizationTransforms = [
      transforms.makeGatherNodeRanges originalNodeRanges, wrappedCode, @wrappedCodePrefix
      transforms.makeCheckThisKeywords @options.global, varNames
      transforms.checkIncompleteMembers
    ]

    try
      if @options.language is 'coffeescript'
        [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, "csredux", true
      else
        [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, "esprima", true
    catch error
      if @options.language is 'coffeescript'
        problem = new problems.TranspileProblem @, 'csredux', error.index, error, {}, wrappedCode, ''
      else
        problem = new problems.TranspileProblem @, 'esprima', error.id, error, {}, wrappedCode, ''
      @addProblem problem
      return '' if @options.language is 'coffeescript'
      originalNodeRanges.splice()  # Reset any ranges we did find; we'll try again
      [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, "acorn_loose", true

    # TODO: need to insert 'use strict' after normalization, since otherwise you get tmp2 = 'use strict'
    normalizedAST = normalizer.normalize transformedAST, {}
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
    if @options.includeFlow
      postNormalizationTransforms.unshift transforms.makeInstrumentStatements varNames
    else if @options.includeMetrics
      postNormalizationTransforms.unshift transforms.makeInstrumentStatements()
    postNormalizationTransforms.unshift transforms.makeInstrumentCalls() if @options.includeMetrics or @options.includeFlow
    postNormalizationTransforms.unshift transforms.makeFindOriginalNodes originalNodeRanges, @wrappedCodePrefix, normalizedSourceMap, normalizedNodeIndex
    postNormalizationTransforms.unshift transforms.makeProtectAPI @options.functionParameters if @options.protectAPI
    postNormalizationTransforms.unshift transforms.interceptThis
    try
      instrumentedCode = @transform normalizedCode, postNormalizationTransforms
    catch error
      @addProblem new problems.TranspileProblem @, 'esprima', error.id, error, {}, normalizedCode, ''
      instrumentedCode = @transform normalizedCode, postNormalizationTransforms, "acorn_loose"
    if @options.yieldConditionally or @options.yieldAutomatically
      purifiedCode = @traceurify instrumentedCode
    else
      purifiedCode = instrumentedCode
    interceptThis = 'var __interceptThis=(function(){var G=this;return function($this,sandbox){if($this==G){return sandbox;}return $this;};})();\n'
    purifiedCode = interceptThis + "return " + purifiedCode
    if false
      console.log "---NODE RANGES---:\n" + _.map(originalNodeRanges, (n) -> "#{n.originalRange.start} - #{n.originalRange.end}\t#{n.originalSource.replace(/\n/g, '↵')}").join('\n')
      console.log "---RAW CODE----: #{rawCode.split('\n').length}\n", {code: rawCode}
      console.log "---WRAPPED-----: #{wrappedCode.split('\n').length}\n", {code: wrappedCode}
      console.log "---TRANSFORMED-: #{transformedCode.split('\n').length}\n", {code: transformedCode}
      console.log "---NORMALIZED--: #{normalizedCode.split('\n').length}\n", {code: normalizedCode}
      console.log "---INSTRUMENTED: #{instrumentedCode.split('\n').length}\n", {code: "return " + instrumentedCode}
      console.log "---PURIFIED----: #{purifiedCode.split('\n').length}\n", {code: purifiedCode}
    purifiedCode

  checkCommonMistakes: (code) ->
    # Stop this.\n from failing on the next weird line
    code = code.replace /this\.\s*?\n/g, "this.IncompleteThisReference;"
    # If we wanted to do it just when it would hit the ending } but allow multiline this refs:
    #code = code.replace /this.(\s+})$/, "this.IncompleteThisReference;$1"
    code

  @getFunctionBody: (func) ->
    # Remove function() { ... } wrapper and any extra indentation
    source = if _.isString func then func else func.toString()
    return "" if source.trim() is "function () {}"
    source = source.substring(source.indexOf('{') + 2, source.lastIndexOf('}'))  #.trim()
    lines = source.split /\r?\n/
    indent = if lines.length then lines[0].length - lines[0].replace(/^ +/, '').length else 0
    (line.slice indent for line in lines).join '\n'

  setLanguage: (lang) ->
    return unless @options.language isnt lang
    optionsValidation = optionsValidator (language: lang)
    throw new Error("Options array is not valid: " + JSON.stringify(optionsValidation.errors, null, 4)) if not optionsValidation.valid
    @options.language = lang
    @wrappedCodePrefix = null
    @wrappedCodeSuffix = null
    @reset()
    return lang

  logStatementStart: instrumentation.logStatementStart
  logStatement: instrumentation.logStatement
  logCallStart: instrumentation.logCallStart
  logCallEnd: instrumentation.logCallEnd

  createAPIClone: protectAPI.createAPIClone
  restoreAPIClone: protectAPI.restoreAPIClone

  restoreBuiltins: protectBuiltins.restoreBuiltins

self.Aether = Aether if self?
window.Aether = Aether if window?
self.esprima ?= esprima if self?
window.esprima ?= esprima if window?
