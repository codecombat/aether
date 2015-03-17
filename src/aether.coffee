self = window if window? and not self?
self = global if global? and not self?
self.self ?= self

_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
traceur = window?.traceur ? self?.traceur ? global?.traceur ? require 'traceur'  # rely on traceur existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
normalizer = require 'JS_WALA/normalizer/lib/normalizer'
escodegen = require 'escodegen'

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
traversal = require './traversal'
transforms = require './transforms'
protectAPI = require './protectAPI'
protectBuiltins = require './protectBuiltins'
instrumentation = require './instrumentation'
optionsValidator = require './validators/options'
languages = require './languages/languages'

module.exports = class Aether
  @execution: execution
  @addGlobal: protectBuiltins.addGlobal  # Use before instantiating Aether instances
  @replaceBuiltin: protectBuiltins.replaceBuiltin
  @globals: protectBuiltins.addedGlobals

  # Current call depth
  depth: 0

  constructor: (options) ->
    options ?= {}
    validationResults = optionsValidator options
    unless validationResults.valid
      throw new Error "Aether options are invalid: " + JSON.stringify(validationResults.errors, null, 4)

    # Save our original options for recreating this Aether later.
    @originalOptions = _.cloneDeep options  # TODO: slow

    # Merge the given options with the defaults.
    defaultsCopy = _.cloneDeep defaults
    @options = _.merge defaultsCopy, options

    @setLanguage @options.language, @options.languageVersion
    @allGlobals = @options.globals.concat protectBuiltins.builtinNames, Object.keys @language.runtimeGlobals  # After setLanguage, which can add globals.

    ## For mapping API clones and values to each other
    @protectAPIClonesToValues = {}
    @protectAPIValuesToClones = {}

  # Language can be changed after construction. (It will reset Aether's state.)
  setLanguage: (language, languageVersion) ->
    return if @language and @language.id is language and @language.version is languageVersion
    validationResults = optionsValidator language: language, languageVersion: languageVersion
    unless validationResults.valid
      throw new Error "New language is invalid: " + JSON.stringify(validationResults.errors, null, 4)
    @originalOptions.language = @options.language = language
    @originalOptions.languageVersion = @options.languageVersion = languageVersion
    @language = new languages[language] languageVersion
    @languageJS ?= if language is 'javascript' then @language else new languages.javascript 'ES5'
    Aether.addGlobal name, global for name, global of @language.runtimeGlobals
    @reset()
    return language

  # Resets the state of Aether, readying it for a fresh transpile.
  reset: ->
    @problems = errors: [], warnings: [], infos: []
    @style = {}
    @flow = {}
    @metrics = {}
    @pure = null

  # Convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such.
  serialize: ->
    _.pick @, ['originalOptions', 'raw', 'pure', 'problems', 'flow', 'metrics', 'style']

  # Convert a serialized Aether instance back from JSON.
  @deserialize: (serialized) ->
    aether = new Aether serialized.originalOptions
    aether[prop] = val for prop, val of serialized when prop isnt "originalOptions"
    aether

  # Performs quick heuristics to determine whether the code will run or produce compilation errors.
  # If thorough, it will perform detailed linting and return false if there are any lint errors.
  canTranspile: (rawCode, thorough=false) ->
    return true if not rawCode # blank code should compile, but bypass the other steps
    return false if @language.obviouslyCannotTranspile rawCode
    return true unless thorough
    @lint(rawCode, @).errors.length is 0

  # Determine whether two strings of code are significantly different.
  # If careAboutLineNumbers, we strip trailing comments and whitespace and compare line count.
  # If careAboutLint, we also lint and make sure lint problems are the same.
  hasChangedSignificantly: (a, b, careAboutLineNumbers=false, careAboutLint=false) ->
    return true unless a? and b?
    return false if a is b
    return true if careAboutLineNumbers and @language.hasChangedLineNumbers a, b
    return true if careAboutLint and @hasChangedLintProblems a, b
    # If the simple tests fail, we compare abstract syntax trees for equality.
    @language.hasChangedASTs a, b

  # Determine whether two strings of code produce different lint problems.
  hasChangedLintProblems: (a, b) ->
    aLintProblems = ([p.id, p.message, p.hint] for p in @getAllProblems @lint a)
    bLintProblems = ([p.id, p.message, p.hint] for p in @getAllProblems @lint b)
    return not _.isEqual aLintProblems, bLintProblems

  # Return a beautified representation of the code (cleaning up indentation, etc.)
  beautify: (rawCode) ->
    @language.beautify rawCode, @

  # Transpile it. Even if it can't transpile, it will give syntax errors and warnings and such. Clears any old state.
  transpile: (@raw) ->
    @reset()
    rawCode = @raw
    if @options.simpleLoops
      rawCode = _.cloneDeep @raw
      [rawCode, @replacedLoops] = @language.replaceLoops rawCode
    @problems = @lint rawCode
    @pure = @purifyCode rawCode
    @pure

  # Perform some fast static analysis (without transpiling) and find any lint problems.
  lint: (rawCode) ->
    lintProblems = errors: [], warnings: [], infos: []
    @addProblem problem, lintProblems for problem in @language.lint rawCode, @
    lintProblems

  # Return a ready-to-execute, instrumented, sandboxed function from the purified code.
  createFunction: ->
    fn = protectBuiltins.createSandboxedFunction @options.functionName or 'foo', @pure, @
    if @options.protectBuiltins
      fn = protectBuiltins.wrapWithSandbox @, fn
    fn

  # Like createFunction, but binds method to thisValue.
  createMethod: (thisValue) ->
    _.bind @createFunction(), thisValue

  # If you want to sandbox a generator each time it's called, then call result of createFunction and hand to this.
  sandboxGenerator: (fn) ->
    oldNext = fn.next
    fn.next = ->
      oldNext.apply fn, arguments
    if @options.protectBuiltins
      fn.next = protectBuiltins.wrapWithSandbox @, fn.next
    fn

  # Convenience wrapper for running the compiled function with default error handling
  run: (fn, args...) ->
    try
      fn ?= @createFunction()
    catch error
      problem = @createUserCodeProblem error: error, code: @raw, type: 'transpile', reporter: 'aether'
      @addProblem problem
      return
    try
      fn args...
    catch error
      problem = @createUserCodeProblem error: error, code: @raw, type: 'runtime', reporter: 'aether'
      @addProblem problem
      return

  # Create a standard Aether problem object out of some sort of transpile or runtime problem.
  createUserCodeProblem: problems.createUserCodeProblem

  updateProblemContext: (problemContext) ->
    @options.problemContext = problemContext

  # Add problem to the proper level's array within the given problems object (or @problems).
  addProblem: (problem, problems=null) ->
    return if problem.level is "ignore"
    (problems ? @problems)[problem.level + "s"].push problem
    problem

  # Return all the problems as a flat array.
  getAllProblems: (problems) ->
    _.flatten _.values (problems ? @problems)

  # The meat of the transpilation.
  purifyCode: (rawCode) ->
    preprocessedCode = @language.hackCommonMistakes rawCode, @  # TODO: if we could somehow not change the source ranges here, that would be awesome.... but we'll probably just need to get rid of this step.
    wrappedCode = @language.wrap preprocessedCode, @

    originalNodeRanges = []
    varNames = {}
    varNames[parameter] = true for parameter in @options.functionParameters
    preNormalizationTransforms = [
      transforms.makeGatherNodeRanges originalNodeRanges, wrappedCode, @language.wrappedCodePrefix
      transforms.makeCheckThisKeywords @allGlobals, varNames, @language, @options.problemContext
      transforms.makeCheckIncompleteMembers @language, @options.problemContext
    ]

    try
      [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, @language.parse, true
    catch error
      problemOptions = error: error, code: wrappedCode, codePrefix: @language.wrappedCodePrefix, reporter: @language.parserID, kind: error.index or error.id, type: 'transpile'
      @addProblem @createUserCodeProblem problemOptions
      return '' unless @language.parseDammit
      originalNodeRanges.splice()  # Reset any ranges we did find; we'll try again.
      try
        [transformedCode, transformedAST] = @transform wrappedCode, preNormalizationTransforms, @language.parseDammit, true
      catch error
        problemOptions.kind = error.index or error.id
        problemOptions.reporter = 'acorn_loose' if @language.id is 'javascript'
        @addProblem @createUserCodeProblem problemOptions
        return ''

    # Now we've shed all the trappings of the original language behind; it's just JavaScript from here on.

    # TODO: need to insert 'use strict' after normalization, since otherwise you get tmp2 = 'use strict'
    try
      normalizedAST = normalizer.normalize transformedAST, {reference_errors: true}
    catch error
      console.log "JS_WALA couldn't handle", transformedAST, "\ngave error:", error.toString()
      problemOptions = error: error, message: 'Syntax error during code normalization.', kind: 'NormalizationError', code: '', codePrefix: '', reporter: 'aether', type: 'transpile', hint: "Possibly a bug with advanced #{@language.name} feature parsing."
      @addProblem @createUserCodeProblem problemOptions
      return ''
    normalizedNodeIndex = []
    traversal.walkAST normalizedAST, (node) ->
      return unless pos = node?.attr?.pos
      node.loc = {start: {line: 1, column: normalizedNodeIndex.length}, end: {line: 1, column: normalizedNodeIndex.length + 1}}
      normalizedNodeIndex.push node

    try
      normalized = escodegen.generate normalizedAST, {sourceMap: @options.functionName or 'foo', sourceMapWithCode: true}
      normalizedCode = normalized.code
      normalizedSourceMap = normalized.map
    catch error
      console.warn "escodegen couldn't handle", normalizedAST, "\ngave error:", error.toString()
      try
        # Maybe we can get it to work without source maps, if it errored during source mapping. Ranges (and thus other things) won't work, though.
        normalizedCode = escodegen.generate normalizedAST, {}
        normalizedSourceMap = null
      catch error2
        # Well, it was worth a try to do it without source maps.
        problemOptions = error: error, message: 'Syntax error during code generation.', kind: 'CodeGenerationError', code: '', codePrefix: '', reporter: 'aether', type: 'transpile', hint: "Possibly a bug with advanced #{@language.name} feature parsing."
        @addProblem @createUserCodeProblem problemOptions
        return ''

    postNormalizationTransforms = []
    if @options.yieldConditionally and @options.simpleLoops
      postNormalizationTransforms.unshift transforms.makeSimpleLoopsYieldAutomatically @replacedLoops, @language.wrappedCodePrefix
    if @options.yieldConditionally
      postNormalizationTransforms.unshift transforms.makeYieldConditionally @options.simpleLoops
    if @options.yieldConditionally and @options.simpleLoops
      postNormalizationTransforms.unshift transforms.makeIndexSimpleLoops()
    postNormalizationTransforms.unshift transforms.makeYieldAutomatically() if @options.yieldAutomatically
    if @options.includeFlow
      varNamesToRecord = if @options.noVariablesInFlow then null else varNames
      postNormalizationTransforms.unshift transforms.makeInstrumentStatements @language, varNamesToRecord, true
    else if @options.includeMetrics or @options.executionLimit
      postNormalizationTransforms.unshift transforms.makeInstrumentStatements @language
    postNormalizationTransforms.unshift transforms.makeInstrumentCalls() if @options.includeMetrics or @options.includeFlow
    if normalizedSourceMap
      postNormalizationTransforms.unshift transforms.makeFindOriginalNodes originalNodeRanges, @language.wrappedCodePrefix, normalizedSourceMap, normalizedNodeIndex
    postNormalizationTransforms.unshift transforms.convertToNativeTypes
    postNormalizationTransforms.unshift transforms.protectAPI if @options.protectAPI
    postNormalizationTransforms.unshift transforms.interceptThis
    postNormalizationTransforms.unshift transforms.interceptEval
    try
      instrumentedCode = @transform normalizedCode, postNormalizationTransforms, @languageJS.parse
    catch error
      problemOptions = error: error, code: normalizedCode, codePrefix: '', reporter: @languageJS.parserID, kind: error.id, type: 'transpile'
      @addProblem @createUserCodeProblem problemOptions
      instrumentedCode = @transform normalizedCode, postNormalizationTransforms, @languageJS.parseDammit
    if @options.yieldConditionally or @options.yieldAutomatically
      try
        purifiedCode = @traceurify instrumentedCode
      catch error
        console.log "Traceur couldn't handle", instrumentedCode, "\ngave error:", error.toString()
        problemOptions = error: error, code: instrumentedCode, codePrefix: '', reporter: 'aether', kind: 'TraceurError', type: 'transpile', message: 'Syntax error during code transmogrification.', hint: 'Possibly a bug with break/continue parsing.'
        @addProblem @createUserCodeProblem problemOptions
        return ''
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

  transform: (code, transforms, parseFn, withAST=false) ->
    transformedCode = traversal.morphAST code, (_.bind t, @ for t in transforms), parseFn, @
    return transformedCode unless withAST
    transformedAST = parseFn transformedCode, @
    [transformedCode, transformedAST]

  traceurify: (code) ->
    # Latest Traceur version that works with this hacky API is 0.0.25.
    # Versions 0.0.27 - 0.0.34 complained about System.baseURL being an empty string despite my best attempts to provide it.
    # Versions 0.0.35 - 0.0.41 complained that the EvalCodeUnit's metadata was undefined and so it couldn't find "tree".
    url = "http://codecombat.com/randotron_" + Math.random()
    reporter = new traceur.util.ErrorReporter()
    loaderHooks = new traceur.runtime.InterceptOutputLoaderHooks reporter, url
    loader = new traceur.System.internalLoader_.constructor loaderHooks, url  # Some day traceur's API will stabilize.
    loader.script code, url, url, url
    # Could also do the following, but that wraps in a module
    #loader = new traceur.runtime.Loader loaderHooks
    #loader.module code, url
    if reporter.hadError()
      console.warn "traceur had error trying to compile"
    loaderHooks.transcoded

  @getFunctionBody: (func) ->
    # Remove function() { ... } wrapper and any extra indentation
    source = if _.isString func then func else func.toString()
    return "" if source.trim() is "function () {}"
    source = source.substring(source.indexOf('{') + 2, source.lastIndexOf('}'))  #.trim()
    lines = source.split /\r?\n/
    indent = if lines.length then lines[0].length - lines[0].replace(/^ +/, '').length else 0
    (line.slice indent for line in lines).join '\n'

  convertToNativeType: (obj) ->
    # Convert obj to current language's equivalent type if necessary
    # E.g. if language is Python, JavaScript Array is converted to a Python list
    @language.convertToNativeType(obj)

  # Runtime modules

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
