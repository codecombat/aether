_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

parserHolder = {}
estraverse = require 'estraverse'

Language = require './language'

module.exports = class CoffeeScript extends Language
  name: 'CoffeeScript'
  id: 'coffeescript'
  parserID: 'csredux'
  thisValue:'@'
  thisValueAccess:'@'
  wrappedCodeIndentLen: 4

  constructor: ->
    super arguments...
    @indent = Array(@wrappedCodeIndentLen + 1).join ' '
    parserHolder.csredux ?= self?.aetherCoffeeScriptRedux ? require 'coffee-script-redux'

  # Wrap the user code in a function. Store @wrappedCodePrefix and @wrappedCodeSuffix.
  wrap: (rawCode, aether) ->
    @wrappedCodePrefix ?="""
    #{aether.options.functionName or 'foo'} = (#{aether.options.functionParameters.join(', ')}) ->
    \n"""
    @wrappedCodeSuffix ?= '\n'
    indentedCode = (@indent + line for line in rawCode.split '\n').join '\n'
    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  removeWrappedIndent: (range) ->
    # Assumes range not in @wrappedCodePrefix
    range = _.cloneDeep range
    range[0].ofs -= @wrappedCodeIndentLen * range[0].row
    range[1].ofs -= @wrappedCodeIndentLen * range[1].row
    range

  # Using a third-party parser, produce an AST in the standardized Mozilla format.
  parse: (code, aether) ->
    csAST = parserHolder.csredux.parse code, {optimise: false, raw: true}
    jsAST = parserHolder.csredux.compile csAST, {bare: true}
    fixLocations jsAST
    jsAST


class StructuredCode
  # TODO: What does this class do?
  constructor: (code) ->
    [@cursors, @indentations] = @generateOffsets code
    @length = @cursors.length

  generateOffsets: (code) ->
    reg = /(?:\r\n|[\r\n\u2028\u2029])/g
    result = [ 0 ]
    indentations = [ 0 ]
    while res = reg.exec(code)
      cursor = res.index + res[0].length
      reg.lastIndex = cursor
      result.push cursor
      indentations.push code.substr(cursor).match(/^\s+/)?[0]?.length
    [result, indentations]

  column: (offset) ->
    @loc(offset).column

  line: (offset) ->
    @loc(offset).line

  fixRange: (range, loc) ->
    fix = Math.floor(@indentations[loc.start.line-1]+5/4)
    range[0] -= fix
    range[1] -= fix
    range

  loc: (offset) ->
    index = _.sortedIndex @cursors, offset
    if @cursors.length > index and @cursors[index] is offset
      column = 0
      line = index + 1
    else
      column = offset - 4 - @cursors[index - 1]
      line = index
    { column, line }

fixLocations = (program) ->
  # TODO: What does this function do?
  structured = new StructuredCode(program.raw)
  estraverse.traverse program,
    leave: (node, parent) ->
      if node.range?
        # calculate start line & column
        loc =
          start: null
          end: structured.loc(node.range[1])
        if node.loc?
          loc.start = node.loc.start
        else
          loc.start = structured.loc(node.range[0])
        if _.isNaN loc.end.column
          loc.end.column = loc.start.column + 1  # Fix for bad CSR(?) parsing of "Sammy the Python moved #{meters}m."
        node.loc = loc
        unless node.range[1]?
          node.range[1] = node.range[0] + 1  # Same #{meters} fix
        node.range = structured.fixRange(node.range, loc)
      else
        node.loc = switch node.type
          when 'BlockStatement'
            if node.body.length
              start: node.body[0].loc.start
              end: node.body[node.body.length - 1].loc.end
            else
              parent.loc
          when 'VariableDeclarator'
            if node?.init?.loc?
              start: node.id.loc.start
              end: node.init.loc.end
            else
              node.id.loc
          when 'ExpressionStatement'
            node.expression.loc
          when 'ReturnStatement'
            if node.argument? then node.argument.loc else node.loc
          when 'VariableDeclaration'
            start: node.declarations[0].loc.start
            end: node.declarations[node.declarations.length - 1].loc.end
          else
            start: {line: 0, column: 0}
            end: {line: 0, column: 0}
      return
