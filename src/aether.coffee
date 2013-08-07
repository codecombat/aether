_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
#esprima = require 'esprima'  # getting our Esprima Harmony
falafel = require 'falafel'  # pulls in dev Esprima

defaults = require './defaults'
problems = require './problems'
execution = require './execution'
errors = require './errors'

module.exports = class Aether
  @defaults: defaults
  @problems: problems
  @execution: execution
  @errors: errors
  constructor: (options) ->
    @options = _.defaults(options or {}, _.cloneDeep Aether.defaults)

  canTranspile: (raw) ->
    # Quick heuristics: can this code be run, or will it produce a compilation error?
    true

  hasChangedSignificantly: (raw, oldAether) ->
    # Barring things like comments and whitespace and such, are the ASTs going to be different? (oldAether being a previously compiled instance)
    true

  hasChanged: (raw, oldAether) ->
    # Is the code exactly the same?
    true

  transpile: (@raw) ->
    # Transpile it. Even if it can't transpile, it will give syntax errors and warnings and such.
    # Should generate: @raw, @pure, @problems, @style, and an empty @flow, @metrics, and @visualization to be populated when function is run
    return @raw
    @pure = @cook()  # TODO: for now we're just cooking like old CodeCombat Cook did

  createFunction: ->
    # Return a ready-to-execute, instrumented function from the purified code
    new Function options.parameters.join(', '), pure

  createMethod: ->
    # Like createFunction, but binds method to thisValue if specified
    func = @createFunction()
    func = _.bind func, options.thisValue if options.thisValue
    func

  purifyError: (error) ->
    # Fill in the context and attach to our list of errors

  serialize: ->
    # Convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such

  @deserialize: (serialized) ->
    # Convert a serialized Aether instance back from JSON

  #### TODO: this stuff is all the old CodeCombat Cook way of doing it ####
  cook: ->
    @methodType = @options.methodType or "instance"  # TODO: this is old
    @requireThis = @options.requireThis ? false  # TODO: this is old
    wrapped = "function wrapped() {\n\"use strict\";\n#{@raw}\n}"
    wrapped = @checkCommonMistakes wrapped
    @vars = {}
    @methodLineNumbers = ([] for i in @raw.split('\n'))
    try
      output = falafel wrapped, {}, @transform
    catch error
      throw new errors.UserCodeError error.message, thangID: @options.thang.id, thangSpriteName: @options.thang.spriteName, methodName: @options.methodName, methodType: @methodType, code: @rawCode, recoverable: true, lineNumber: error.lineNumber - 2, column: error.column
    @cookedCode = Aether.getFunctionBody output.toString(), false
    @cookedCode = @raw

  transform: (node) =>
    #if $? then console.log "Doing node", node, node.source()

    unless @requireThis
      if node.type is 'VariableDeclarator'
        @vars[node.id] = true
      else if node.type is 'CallExpression'
        if node.callee.name and not @vars[node.callee.name] and not (@options.global[node.callee.name])
          node.update "this.#{node.source()}"
      else if node.type is 'ReturnStatement' and not node.argument
        node.update "return this.validateReturn('#{@options.methodName}', null);"
      else if node.parent?.type is 'ReturnStatement'
        node.update "this.validateReturn('#{@options.methodName}', (#{node.source()}))"

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
        @methodLineNumbers[lineNumber].push name
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
          return lineNumber
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
    line = if forRawCode then -1 else 1
    for i in [0 ... node.range[0]]
      if fullSource[i] is '\n'
        ++line
    #console.log "getLineNumberFor", node, forRawCode, "of", fullSource, "is", line
    line

  @getFunctionBody: (source, removeIndent=true) ->
    # Remove function() { ... } wrapper and perhaps initial indentation
    lines = source.split /\r?\n/
    lines = lines.splice 1, lines.length - 2
    if removeIndent and lines.length
      indent = lines[0].length - lines[0].replace(/^ +/, '').length
    else
      indent = 0
    (line.slice indent for line in lines).join '\n'

self.Aether = Aether if self?
window.Aether = Aether if window?
