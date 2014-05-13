Language = require './language'
lua2js = require 'lua2js'

module.exports = class Lua extends Language
  name: 'Lua'
  id: 'lua'
  parserID: 'lua2js'
  runtimeGlobals: require('lua2js').stdlib

  obviouslyCannotTranspile: (rawCode) ->
    false

  parse: (code, aether) ->

    ast = lua2js.parse code, {forceVar: false, decorateLuaObjects: true, luaCalls: true, luaOperators: true, encloseWithFunctions: false }
#    ast = Rob.parser.parse code, {forceVar: true}

    ast = {type: "Program", body:[{type: "FunctionDeclaration", id: {type: "Identifier", name: aether.options.functionName}, params: [], body: ast}]}
    ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [
                { "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }
            ],"kind": "var"}
    ast
