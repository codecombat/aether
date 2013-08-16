# Based on https://github.com/substack/node-falafel
# A similar approach could be seen in https://github.com/ariya/esmorph
_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

esprima = require 'esprima'

module.exports = morph = (source, transforms) ->
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
    transform node for transform in transforms
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
