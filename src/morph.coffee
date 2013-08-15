# Based on https://github.com/substack/node-falafel
# A similar approach could be seen in https://github.com/ariya/esmorph

esprima = require 'esprima'  # getting our Esprima Harmony

module.exports = morph = (source, transform) ->
  chunks = source.split ''
  ast = esprima.parse source, range: true
  walk = (node, parent) ->
    insertHelpers node, parent, chunks
    for key, child of node
      continue if key is 'parent'
      if _.isArray child
        for grandchild in child
          walk grandchild, node if _.isString grandchild?.type
      else if _.isString child?.type
        insertHelpers child, node, chunks
        walk child, node
    transform node
  walk ast, undefined
  chunks.join ''

insertHelpers = (node, parent, chunks) ->
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
