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
    #console.log(require('escodegen').generate ast)
    if aether.options.yieldConditionally or aether.options.yiedAutomatically
        pruneMainMethod ast, aether

    heroToThis ast.body[0].body.body

    #console.log("AST", require('escodegen').generate ast)
    ast

pruneMainMethod = (ast, aether) ->
  target = aether.staticCall or 'main'

  locator = (node) ->
    
    switch node.type
      when "Program"
        for n in node.body
          found = locator n
          return found if found      
        return
      when "BlockStatement"
        for n in node.body
          found = locator n
          return found if found
        return
      when "FunctionDeclaration"
        name = node.id?.name
        return locator node.body
      when "FunctionExpression"
        return locator node.body
      when "ReturnStatement"
        return locator node.argument
      when "CallExpression"
        return locator node.callee
      when "MemberExpression"
        return locator node.object
      when "ExpressionStatement"
        return locator node.expression
      when "AssignmentExpression"
        name = node.left.name
        if name == target
          return node.right 
        return locator node.right
      else
        return

    
  #console.log "AST", target, JSON.stringify(ast, null, '  ')
  main = locator(ast)
  return ast unless main
  ast.body = [
    type: 'FunctionDeclaration'
    id: {type: 'Identifier', name: aether.options.functionName or 'foo'}
    body: main.body,
    params: []
  ]

heroToThis = (body) ->
  body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "hero" },"init": {"type": "ThisExpression"} }],"kind": "var"}
