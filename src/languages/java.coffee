Language = require './language'
parserHolder = {}

module.exports = class Java extends Language
  name: 'Java'
  id: 'java'
  parserID: 'cashew'

  constructor: ->
    super arguments...
    parserHolder.cashew ?= self?.aetherCashew ? require 'cashew-js'
    @runtimeGlobals = ___JavaRuntime: parserHolder.cashew.___JavaRuntime, _Object: parserHolder.cashew._Object, Integer: parserHolder.cashew.Integer, Double: parserHolder.cashew.Double, _NotInitialized: parserHolder.cashew._NotInitialized, _ArrayList: parserHolder.cashew._ArrayList


  obviouslyCannotTranspile: (rawCode) ->
    false



  parse: (code, aether) ->
    ast = parserHolder.cashew.Parse code
    ast = parserHolder.cashew.wrapFunction ast, aether.options.functionName, aether.className, aether.staticCall
    heroToThis ast.body[0].body.body
    ast



heroToThis = (body) ->
  body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "pet" },"init": {"type": "MemberExpression", "computed": false, "object": {"type": "Identifier", "name": "hero"}, "property": {"type": "Identifier", "name": "pet"}} }],"kind": "var", "userCode": false}  # var pet = hero.pet;
  body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "hero" },"init": {"type": "ThisExpression"} }],"kind": "var"}  # var hero = this;
  body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "game" },"init": {"type": "ThisExpression"} }],"kind": "var"}  # var game = this;
