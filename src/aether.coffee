_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
traceur = window?.traceur ? self?.traceur ? global?.traceur ? require 'traceur'  # rely on traceur existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
jshint = require('jshint').JSHINT
normalizer = require 'JS_WALA/normalizer/lib/normalizer'
escodegen = require 'escodegen'
estraverse = require 'estraverse'

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
errors = require './errors'
morph = require './morph'

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

    @pure = @cook()  # TODO: for now we're just cooking like old CodeCombat Cook did
    @pure

  lint: (raw) ->
    prefix = "function wrapped() {\n\"use strict\";\n"
    suffix = "\n}"
    strictCode = prefix + raw + suffix
    lintProblems = errors: [], warnings: [], infos: []

    # Run it through JSHint first, because that doesn't rely on Esprima
    # See also how ACE does it: https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/javascript_worker.js
    # TODO: make JSHint stop providing these globals somehow; the below doesn't work
    jshintOptions = browser: false, couch: false, devel: false, dojo: false, jquery: false, mootools: false, node: false, nonstandard: false, phantom: false, prototypejs: false, rhino: false, worker: false, wsh: false, yui: false
    jshintGlobals = _.keys(@options.global)
    jshintGlobals = _.zipObject jshintGlobals, (false for g in jshintGlobals)  # JSHint expects {key: writable} globals
    jshintSuccess = jshint(strictCode, jshintOptions, jshintGlobals)
    for error in jshint.errors
      problem = new problems.UserCodeProblem error, strictCode, @, 'jshint', prefix
      continue if problem.level is "ignore"
      #console.log "JSHint found problem:", problem.serialize()
      lintProblems[problem.level + "s"].push problem

    lintProblems

  createFunction: ->
    # Return a ready-to-execute, instrumented function from the purified code
    console.log "About to create function from", @pure, @options.functionParameters.join(', ')
    new Function @options.functionParameters.join(', '), @pure

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
    @problems[pureError.level + "s"].push pureError.serialize()
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

  normalize: (ast) ->
    console.log "About to normalize:", ast, '\n', escodegen.generate(ast)
    normalized = normalizer.normalize(ast)
    console.log "Normalized:", normalized, '\n', escodegen.generate(normalized)
    normalized

  #### TODO: this stuff is all the old CodeCombat Cook way of doing it ####
  cook: ->
    @methodType = @options.methodType or "instance"  # TODO: this is old
    @requireThis = @options.requireThis ? false  # TODO: this is old
    wrapped = "function wrapped() {\n\"use strict\";\n#{@raw}\n}"
    wrapped = @checkCommonMistakes wrapped
    @vars = {}
    @methodLineNumbers = ([] for i in @raw.split('\n'))

    ast = esprima.parse(wrapped, loc: true, range: true, raw: true, comment: true, tolerant: true)
    try
      normalized = @normalize(ast)
    catch error
      console.log "Couldn't normalize", error.message
      throw error

    # Now that it's normalized to this: https://github.com/nwinter/JS_WALA/blob/master/normalizer/doc/normalization.md
    # ... we can basically just put a yield check in after every CallExpression except the outermost one if we are yielding conditionally.
    # TODO: only do this conditionally, skip the outermost check, also handle the case where we want to yield after every original statement.
    Syntax = esprima.Syntax
    blocks = []
    instrumented = estraverse.replace normalized, {
      enter: (node) ->
        block = blocks[blocks.length - 1] if blocks.length
        #console.log "Got", node.type, node
        if block? and node.type in [Syntax.ExpressionStatement, Syntax.VariableDeclaration, Syntax.ReturnStatement, Syntax.LabeledStatement, Syntax.WhileStatement, Syntax.IfStatement]
          # Handle more statements? EmptyStatement, ExpressionStatement, BreakStatement, ContinueStatement, DebuggerStatement, DoWhileStatement, ForStatement, FunctionDeclaration, ClassDeclaration, IfStatement, ReturnStatement, SwitchStatement, ThrowStatement, TryStatement, VariableStatement, WhileStatement, WithStatement
          ++block.statementIndex
          block.body.push node
          #console.log "-------- Incremented block statement index to", block.statementIndex, "for", node
        switch node.type
          when Syntax.BlockStatement
            #console.log "Entering block statement:", node
            blocks.push {block: node, statementIndex: 0, body: []}
            #console.log "   ", blocks[blocks.length - 1]
          when Syntax.CallExpression
            #console.log "Entering call expression:", node, block
            if block?
              #yieldGuard =
              #  type: Syntax.ExpressionStatement
              #  expression:
              #    type: Syntax.Literal
              #    value: "Hohoho"
              #    raw: "Hohoho"
              yieldGuard =
                type: Syntax.IfStatement
                test:
                  type: Syntax.MemberExpression
                  computed: false
                  object:
                    type: Syntax.ThisExpression
                  property:
                    type: Syntax.Identifier
                    name: "_shouldYield"
                consequent:
                  type: Syntax.BlockStatement
                  body: [
                      type: Syntax.ExpressionStatement
                      expression:
                        type: Syntax.AssignmentExpression
                        operator: "="
                        left:
                          type: Syntax.MemberExpression
                          computed: false
                          object:
                            type: Syntax.ThisExpression
                          property:
                            type: Syntax.Identifier
                            name: "_shouldYield"
                        right:
                          type: Syntax.Literal
                          value: false
                          raw: "false"
                    ,
                      type: Syntax.ExpressionStatement
                      expression:
                        type: Syntax.YieldExpression
                        argument:
                          type: Syntax.Literal
                          value: "waiting..."
                          raw: "waiting..."
                        delegate: false  # not sure what this should be
                  ]
                alternate: null
              console.log "Inserting", yieldGuard, "into", block.block.body.slice(), "at", block.statementIndex
              block.body.push yieldGuard
        node
      leave: (node) ->
        block = blocks[blocks.length - 1] if blocks.length
        switch node.type
          when Syntax.BlockStatement
            #console.log "Leaving block statement:", node
            block = blocks.pop()
            node = _.clone node
            node.body = block.body
            return node
          #when Syntax.CallExpression
            #console.log "Leaving call expression:", node
        node
    }

    console.log "Now we have:\n", escodegen.generate(instrumented)

    #instrumented2 = morph escodegen.generate(normalized), ->

    try
      output = morph wrapped, @transform
    catch error
      # TODO: change this to generating UserCodeProblems instead
      lineNumber = if error.lineNumber? then error.lineNumber - 1 else null
      column = error.column
      userInfo = thangID: @options.thisValue.id, thangSpriteName: @options.thisValue.spriteName, methodName: @options.functionName, methodType: @methodType, lineNumber: lineNumber, column: column
      console.log "Whoa, got me an error!", error, userInfo
      pureError = @purifyError error.message, userInfo
      @cookedCode = ''
      return
    console.log "Got output", output
    @cookedCode = Aether.getFunctionBody output

  transform: (node) =>
    #if $? then console.log "Doing node", node, node.source()

    unless @requireThis
      if node.type is 'VariableDeclarator'
        @vars[node.id] = true
      else if node.type is 'CallExpression'
        if node.callee.name and not @vars[node.callee.name] and not (@options.global[node.callee.name])
          node.update "this.#{node.source()}"
      else if node.type is 'ReturnStatement' and not node.argument
        node.update "return this.validateReturn('#{@options.functionName}', null);"
      else if node.parent?.type is 'ReturnStatement'
        node.update "this.validateReturn('#{@options.functionName}', (#{node.source()}))"

    if node.type is 'ExpressionStatement'
      lineNumber = Aether.getLineNumberForNode node, true
      exp = node.expression
      if exp.type is 'CallExpression'
        # Quick hack to handle tracking line number for plan() method invocations
        if exp.callee.type is 'MemberExpression'
          name = exp.callee.property.name
        else if exp.callee.type is 'Identifier'
          name = exp.callee.name  # say() without this... (even though I added this)
        else if $?
          console.log "How is this CallExpression being handled?", node, node.source(), exp.callee, exp.callee.source()
        if @methodLineNumbers.length > lineNumber
          @methodLineNumbers[lineNumber].push name
        else
          console.log "More lines than we can actually handle:", lineNumber, name, "of", @methodLineNumbers.length, "lines"
      else if exp.type is 'MemberExpression'
        # Handle missing parentheses, like in:  this.moveUp;
        if exp.property.name is "IncompleteThisReference"
          m = "this.what? (Check available spells below.)"
        else
          m = "#{exp.source()} has no effect."
          if exp.property.name in errors.commonMethods
            m += " It needs parentheses: #{exp.property.name}()"
        error = new Error m
        error.lineNumber = lineNumber + 2  # Reapply wrapper function offset
        #if $? then console.log node, node.source(), "going to error out!"
        throw error

    #if $? then console.log "Did node", node, node.source()  # avoid DataClone error in worker

    #if node.type is 'Program'
    #  node.update """
    #                 "use strict";
    #                 #{node.source()}
    #              """
    # Also insert instrumentation here

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

  @getLineNumberForNode: (node, forRawCode=false) ->
    # If forRawCode, then we ignore the first two wrapper lines
    parent = node
    while parent.type isnt "Program"
      parent = parent.parent
    fullSource = parent.source()
    line = if forRawCode then -2 else 0
    for i in [0 ... node.range[0]]
      if fullSource[i] is '\n'
        ++line
    #console.log "getLineNumberFor", node, forRawCode, "of", fullSource, "is", line
    line

  @getFunctionBody: (func) ->
    # Remove function() { ... } wrapper and any extra indentation
    source = if _.isString func then func else func.toString()
    source = source.substring(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
    lines = source.split /\r?\n/
    indent = if lines.length then lines[0].length - lines[0].replace(/^ +/, '').length else 0
    (line.slice indent for line in lines).join '\n'

self.Aether = Aether if self?
window.Aether = Aether if window?
