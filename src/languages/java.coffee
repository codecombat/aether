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
    heroToThis ast
    ast

# 'this' is not a keyword in Python, so it does not parse to a ThisExpression
# Instead, we expect the variable 'self', and map it to a ThisExpression
heroToThis = (ast) ->
  ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "hero" },"init": {"type": "ThisExpression"} }],"kind": "var"}
  ast
