Language = require './language'
parserHolder = {}

module.exports = class Java extends Language
  name: 'Java'
  id: 'java'
  parserID: 'cashew'

  constructor: ->
    super arguments...
    parserHolder.cashew ?= self?.aetherCashew ? require 'cashew-js'
    @runtimeGlobals = ___JavaRuntime: parserHolder.cashew.___JavaRuntime


  obviouslyCannotTranspile: (rawCode) ->
    false

  parse: (code, aether) ->
    ast = parserHolder.cashew.Cashew code
    ast = parserHolder.cashew.wrapFunction ast, aether.options.functionName, aether.className, aether.staticCall
    ast

