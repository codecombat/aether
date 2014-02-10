_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

estraverse = require 'estraverse'

class StructuredCode
  constructor: (code) ->
    @cursors = @generateOffsets code
    @length = @cursors.length

  generateOffsets: (code) ->
    reg = /(?:\r\n|[\r\n\u2028\u2029])/g
    result = [ 0 ]
    while res = reg.exec(code)
      cursor = res.index + res[0].length
      reg.lastIndex = cursor
      result.push cursor
    result

  column: (offset) ->
    @loc(offset).column

  line: (offset) ->
    @loc(offset).line

  loc: (offset) ->
    index = _.sortedIndex @cursors, offset
    if @cursors.length > index and @cursors[index] is offset
      column = 0
      line = index + 1
    else
      column = offset - @cursors[index - 1]
      line = index
    { column, line }

module.exports = fixLocations = (program) ->
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
        node.loc = loc
      else
        node.loc = switch node.type
          when 'BlockStatement'
            start: node.body[0].loc.start
            end: node.body[node.body.length - 1].loc.end
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
