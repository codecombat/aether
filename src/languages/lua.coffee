Language = require './language'
ranges = require '../ranges'
parserHolder = {}

module.exports = class Lua extends Language
  name: 'Lua'
  id: 'lua'
  parserID: 'lua2js'

  constructor: ->
    super arguments...
    parserHolder.lua2js ?= self?.aetherLua2JS ? require 'lua2js'
    @runtimeGlobals = parserHolder.lua2js.stdlib
    @injectCode = require 'aether-lang-stdlibs/lua-stdlib.ast.json'
    @fidMap = {}

  obviouslyCannotTranspile: (rawCode) ->
    false

  callParser: (code, loose) ->
    ast = parserHolder.lua2js.parse code, {loose: loose, forceVar: false, decorateLuaObjects: true, luaCalls: true, luaOperators: true, encloseWithFunctions: false }
    ast


  # Replace instances of 'loop' with 'while true do}'
  # Assuming 'loop' is on a single line, only preceded by whitespace
  replaceLoops: (rawCode) ->
    return [rawCode, []] if rawCode.indexOf('loop') is -1
    convertedCode = ""
    replacedLoops = []
    rangeIndex = 0
    lines = rawCode.split '\n'
    for line, lineNumber in lines
      if line.replace(/^\s+/g, "").indexOf('loop') is 0
        start = line.indexOf 'loop'
        a = line.split("")
        a[start..start + 3] = 'while true do'.split ""
        line = a.join("")
        replacedLoops.push rangeIndex + start
      convertedCode += line
      convertedCode += '\n' unless lineNumber is lines.length - 1
      rangeIndex += line.length + 1 # + newline
    [convertedCode, replacedLoops]

  # Return an array of problems detected during linting.
  lint: (rawCode, aether) ->
    lintProblems = []

    try
      ast = @callParser rawCode, true
    catch e
      return []
      return [aether.createUserCodeProblem type: 'transpile', reporter: 'lua2js', error: e, code:rawCode, codePrefix: ""]
    for error in ast.errors
      rng = ranges.offsetsToRange(error.range[0], error.range[1], rawCode, '')
      lintProblems.push aether.createUserCodeProblem type: 'transpile', reporter: 'lua2js', message: error.msg, code: rawCode, codePrefix: "", range: [rng.start, rng.end]

    lintProblems

  usesFunctionWrapping: () -> false

  wrapResult: (ast, name, params) ->
    ast.body.unshift {"type": "VariableDeclaration","declarations": [
         { "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }
      ],"kind": "var", "userCode": false}
    ast

  parse: (code, aether) ->
    ast = Lua.prototype.wrapResult (Lua.prototype.callParser code, false), aether.options.functionName, aether.options.functionParameters
    ast


  parseDammit: (code, aether) ->
    try
      ast = Lua.prototype.wrapResult (Lua.prototype.callParser code, true), aether.options.functionName, aether.options.functionParameters
      return ast
    catch error
      return {"type": "BlockStatement": body:[{type: "EmptyStatement"}]}

  pryOpenCall: (call, val, finder) ->
    node = call.right
    if val[1] != "__lua"
      return null

    if val[2] == "call"
      target = node.arguments[1]
      #if @fidMap[target.name]
      #  return @fidMap[target]
      return finder(target)

    if val[2] == "makeFunction"
        @fidMap[node.arguments[0].name] = finder(call.left)

    return null

  rewriteFunctionID: (fid) ->
    @fidMap[fid] or fid
