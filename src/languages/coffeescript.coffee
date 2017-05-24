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
  heroValueAccess:'hero.'
  wrappedCodeIndentLen: 4

  constructor: ->
    super arguments...
    @indent = Array(@wrappedCodeIndentLen + 1).join ' '
    parserHolder.csredux ?= self?.aetherCoffeeScriptRedux ? {}

  usesFunctionWrapping: () -> false

  # Using a third-party parser, produce an AST in the standardized Mozilla format.
  parse: (code, aether) ->
    csAST = parserHolder.csredux.parse code, {optimise: false, raw: true}
    jsAST = parserHolder.csredux.compile csAST, {bare: true}
    jsAST

