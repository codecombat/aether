Language = require './language'
aether = require '../aether'
closer = require 'closer/lib/src/closer'
closerCore = require 'closer/lib/src/closer-core'
assertions = require 'closer/lib/src/assertions'

callParser = (code, aether, loose) ->
  ast = closer.parse code, { loc: true, range: true, loose: loose }

  # remove the arity check from the top-level function
  ast.body[0]?.declarations?[0]?.init?.body?.body?.splice(0, 1)

  # hook-up core library calls
  closerCore.$wireCallsToCoreFunctions(ast)

  # replace last statement with return
  lastStmt = ast.body[ast.body.length-1]
  if lastStmt?.type is 'ExpressionStatement'
    lastStmt.type = 'ReturnStatement'
    lastStmt.argument = lastStmt.expression
    delete lastStmt.expression

  ast

module.exports = class Clojure extends Language
  name: 'Clojure'
  id: 'clojure'
  parserID: 'closer'
  runtimeGlobals:
    closerCore: closerCore
    assertions: assertions

  constructor: (version) ->
    super version

  wrap: (rawCode, aether) ->
    @wrappedCodePrefix = """(defn #{aether.options.functionName or 'foo'} [#{aether.options.functionParameters.join(', ')}]\n
    """
    @wrappedCodeSuffix = "\n)"
    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  lint: (rawCode, aether) ->
    lintProblems = []
    ast = callParser rawCode, aether, true
    if ast.errors
      for error in ast.errors
        lintProblems.push aether.createUserCodeProblem
          type: 'transpile'
          reporter: 'closer'
          level: 'warning'
          error: error
          code: rawCode
          codePrefix: ''
    lintProblems

  parse: (code, aether) ->
    callParser code, aether, false

  parseDammit: (code, aether) ->
    callParser code, aether, true