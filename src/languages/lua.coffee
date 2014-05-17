Language = require './language'
lua2js = require 'lua2js'
ranges = require '../ranges'

module.exports = class Lua extends Language
  name: 'Lua'
  id: 'lua'
  parserID: 'lua2js'
  runtimeGlobals: require('lua2js').stdlib

  obviouslyCannotTranspile: (rawCode) ->
    false

  callParser: (code, aether, loose) ->
    ast = lua2js.parse code, {loose: loose, forceVar: false, decorateLuaObjects: true, luaCalls: true, luaOperators: true, encloseWithFunctions: false }
    ast

  # Return an array of problems detected during linting.
  lint: (rawCode, aether) ->
    lintProblems = []

    try
      ast = @callParser rawCode, aether, true
    catch e
      return []
      return [aether.createUserCodeProblem type: 'transpile', reporter:'lua2js', error: e, code:rawCode, codePrefix: ""]
    for error in ast.errors
      rng = ranges.offsetsToRange(error.range[0], error.range[1], rawCode, '')
      lintProblems.push aether.createUserCodeProblem type: 'transpile', reporter: 'lua2js', message: error.msg, code: rawCode, codePrefix: "", range: [rng.start, rng.end]

    lintProblems
    

  wrapResult: (ast, name) -> 
    ast = {type: "Program", body:[{type: "FunctionDeclaration", id: {type: "Identifier", name: name}, params: [], body: ast}]}
    ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [
         { "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }
      ],"kind": "var"}
    ast

  parse: (code, aether) ->
    Lua.prototype.wrapResult (Lua.prototype.callParser code, aether, false), aether.options.functionName


  parseDammit: (code, aether) ->
    try 
      return Lua.prototype.wrapResult (Lua.prototype.callParser code, aether, true), aether.options.functionName
    catch error
      return {"type": "BlockStatement": body:[{type: "EmptyStatement"}]}