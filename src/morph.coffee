# Based on https://github.com/substack/node-falafel
# A similar approach could be seen in https://github.com/ariya/esmorph
_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'  # getting our Esprima Harmony
acorn_loose = require 'acorn/acorn_loose'  # for if Esprima dies. Note it can't do ES6.
csredux = require 'coffee-script-redux'
estraverse = require 'estraverse'

module.exports = morph = (source, transforms, parser="esprima") ->
  chunks = source.split ''
  if parser is 'esprima'
    ast = esprima.parse source, {range: true, loc: true}
    locToRange = null
  else if parser is 'csredux'
    csAST = csredux.parse source, {optimise: false, raw: true}
    ast = csredux.compile csAST, {bare: true}
    attachLocation ast
    locToRange = null  
  else if parser is 'acorn_loose'
    ast = acorn_loose.parse_dammit source, {locations: true}
    # Esprima uses "range", but acorn_loose only has "locations"
    lines = source.replace(/\n/g, '\n空').split '空'  # split while preserving newlines
    posToOffset = (pos) ->
      _.reduce(lines.slice(0, pos.line - 1), ((sum, line) -> sum + line.length), 0) + pos.column
      # lines are 1-indexed, and I think columns are 0-indexed, but should verify
    locToRange = (loc) ->
      [posToOffset(loc.start), posToOffset(loc.end)]

  walk = (node, parent) ->
    insertHelpers node, parent, chunks, locToRange
    for key, child of node
      continue if key is 'parent'
      if _.isArray child
        for grandchild in child
          walk grandchild, node if _.isString grandchild?.type
      else if _.isString child?.type
        insertHelpers child, node, chunks, locToRange
        walk child, node      
    transform node for transform in transforms   
  walk ast, undefined
  chunks.join ''

insertHelpers = (node, parent, chunks, locToRange) ->
  node.range = locToRange(node.loc) if node.loc and locToRange
  return unless node.range
  node.parent = parent
  node.source = -> chunks.slice(node.range[0], node.range[1]).join ''
  update = (s) ->
    chunks[node.range[0]] = s
    for i in [node.range[0] + 1 ... node.range[1]]
      chunks[i] = ''
  if _.isObject node.update
    _.extend update, node.update
  node.update = update

removeIndent = (code) ->
  code.replace /[\uEFEF\uEFFE\uEFFF]/g, ''

calculateColumn = (raw, offset) ->
  code = raw[...offset]
  lines = code.split /(?:\r\n|[\r\n])/g
  (removeIndent lines[lines.length - 1]).length  

attachLocation = (program)->
  # TODO(Constellation)
  # calculate precise offset or attach in
  # CoffeeScriptRedux compiler
  estraverse.traverse program,
    leave: (node, parent) ->
      if node.loc? and node.range? and (node.raw? or node.value?)
        value =
          if node.raw?
            node.raw
          else if typeof node.value is 'string'
            "\"#{node.value.replace /"/g, '\\"'}\""
          else
            "#{node.value}"

        # calculate start line & column
        node.loc =
          start:
            line: node.loc.start.line
            column: calculateColumn program.raw, node.range[0]
          end:
            line: node.loc.start.line
            column: 0
        node.loc.end.column = node.loc.start.column + value.length
        lines = value.split /(?:\r\n|[\r\n])/g
        unless lines.length in [0, 1]
          node.loc.end.line += lines.length - 1
          node.loc.end.column = removeIndent(lines[lines.length - 1]).length
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