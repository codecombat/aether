_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
traceur = window?.traceur ? self?.traceur ? global?.traceur ? require 'traceur'  # rely on traceur existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
jshint = require('jshint').JSHINT
normalizer = require 'JS_WALA/normalizer/lib/normalizer'
escodegen = require 'escodegen'

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
errors = require './errors'
morph = require './morph'
transforms = require './transforms'

optionsValidator = require './validators/options'

module.exports = class Aether
  @defaults: defaults
  @problems: problems.problems
  @execution: execution
  @errors: errors
  constructor: (options) ->
    @originalOptions = _.cloneDeep options
    options ?= {}
    options.problems ?= {}
    unless options.excludeDefaultProblems
      options.problems = _.merge _.cloneDeep(Aether.problems), options.problems

    optionsValidation = optionsValidator options
    throw new Error("Options array is not valid: " + JSON.stringify(optionsValidation.errors,null,4)) if not optionsValidation.valid

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
      @addProblem new problems.UserCodeProblem(error, wrappedCode, @, 'jshint', @wrappedCodePrefix), lintProblems

    lintProblems

  createFunction: ->
    # Return a ready-to-execute, instrumented function from the purified code
    # Because JS_WALA normalizes it to define a wrapper function on this, we need to run the wrapper to get our real function out.
    wrapper = new Function [], @pure
    dummyContext = {Math: Math}  # TODO: put real globals in
    wrapper.call dummyContext
    dummyContext[@options.functionName or 'foo']

  createMethod: ->
    # Like createFunction, but binds method to thisValue if specified
    func = @createFunction()
    func = _.bind func, @options.thisValue if @options.thisValue
    func

  purifyError: (error, userInfo) ->
    # Fill in the context and attach to our list of errors
    # TODO: change it into a RuntimeError (UserCodeProblem) instead of the old UserCodeError
    errorPos = Aether.errors.UserCodeError.getAnonymousErrorPosition error
    errorMessage = Aether.errors.UserCodeError.explainErrorMessage error#, @  # TODO: preserve thang explanation in message somehow
    userInfo ?= {}
    userInfo.lineNumber ?= if errorPos.lineNumber? then errorPos.lineNumber - 2 else undefined
    userInfo.column ?= errorPos.column
    pureError = new Aether.errors.UserCodeError errorMessage, error.level ? "error", userInfo
    @addProblem pureError.serialize()
    #console.log "Purified UserCodeError:", pureError.serialize()
    pureError

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

  es6ify: (code) ->
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

  purifyCode: (rawCode) ->
    preprocessedCode = @checkCommonMistakes rawCode
    wrappedCode = @wrap preprocessedCode
    @vars = {}  # TODO: add in flow analysis
    @methodLineNumbers = ([] for i in preprocessedCode.split('\n'))  # TODO: add in flow analysis

    preNormalizationTransforms = [transforms.checkThisKeywords, transforms.checkIncompleteMembers]
    try
      transformedCode = morph wrappedCode, (_.bind t, @ for t in preNormalizationTransforms)
      transformedAST = esprima.parse(transformedCode, loc: true, range: true, raw: true, comment: true, tolerant: true)
    catch error
      problem = new problems.UserCodeProblem error, wrappedCode, @, 'esprima', ''
      if problem.level in ["ignore", "info", "warning"]
        console.log "Esprima can't survive", problem.serialize(), "at level", problem.level
        problem.level = "error"
      @addProblem problem
      return ''

    # TODO: need to insert 'use strict' after normalization, since otherwise you get tmp2 = 'use strict'
    normalizedAST = normalizer.normalize transformedAST
    normalizedCode = escodegen.generate normalizedAST
    postNormalizationTransforms = [transforms.instrumentStatements]
    postNormalizationTransforms.unshift transforms.validateReturns if @options.thisValue?.validateReturn  # TODO: parameter/return validation should be part of Aether, not some half-external function call
    postNormalizationTransforms.unshift transforms.yieldConditionally if @options.yieldConditionally
    postNormalizationTransforms.unshift transforms.yieldAutomatically if @options.yieldAutomatically
    instrumentedCode = morph normalizedCode, (_.bind t, @ for t in postNormalizationTransforms)
    traceuredCode = @es6ify "return " + instrumentedCode
    if true
      console.log "---RAW CODE----: #{rawCode.split('\n').length}\n", {code: rawCode}
      console.log "---WRAPPED-----: #{wrappedCode.split('\n').length}\n", {code: wrappedCode}
      console.log "---TRANSFORMED-: #{transformedCode.split('\n').length}\n", {code: transformedCode}
      console.log "---NORMALIZED--: #{normalizedCode.split('\n').length}\n", {code: normalizedCode}
      console.log "---INSTRUMENTED: #{instrumentedCode.split('\n').length}\n", {code: "return " + instrumentedCode}
      console.log "---TRACEURED---: #{traceuredCode.split('\n').length}\n", {code: traceuredCode}
    return traceuredCode

  getLineNumberForPlannedMethod: (plannedMethod, numMethodsSeen) ->
    n = 0
    for methods, lineNumber in @methodLineNumbers
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

self.Aether = Aether if self?
window.Aether = Aether if window?
