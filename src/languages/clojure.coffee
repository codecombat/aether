Language = require './language'
parserHolder = {}

callParser = (code, aether, loose) ->
  ast = parserHolder.closer.parse code,
    loc: true
    range: true
    loose: loose
    coreIdentifier: 'closerCore'
    assertionsIdentifier: 'closerAssertions'

  # remove the arity check from the top-level function
  ast.body[0]?.declarations?[0]?.init?.body?.body?.splice(0, 1)

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

  constructor: ->
    super arguments...
    parserHolder.closer ?= self?.aetherCloser ? require 'closer'
    @runtimeGlobals =
      closerCore: parserHolder.closer.core
      closerAssertions: parserHolder.closer.assertions

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
