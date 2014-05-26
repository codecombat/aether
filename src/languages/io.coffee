Language = require './language'
iota = require 'iota-compiler'
esprima = require 'esprima'

module.exports = class Io extends Language
  name: 'Io'
  id: 'io'
  parserID: 'iota'
  runtimeGlobals: {"_io": iota.lib}

  obviouslyCannotTranspile: (rawCode) ->
    false

  wrap: (rawCode, aether) ->
    @wrappedCodePrefix = """chooseAction := method("""
    @wrappedCodeSuffix = """)\nplayer chooseAction := getSlot("chooseAction")\nplayer chooseAction"""

    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  unwrapTransform: (expr) ->
    {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        computed: false,
        object: {
          type: "Identifier",
          name: "_io"
        },
        property: {
          type: "Identifier",
          name: "unwrapIoValue"
        }
      },
      arguments: [expr]
    }

  makeLastStatementReturn: (ast) ->
    program = ast
    wrapperFunction = program.body[0]
    blockStatement = wrapperFunction.body
    lastExpressionStatement = blockStatement.body[blockStatement.body.length - 1]
    blockStatement.body[blockStatement.body.length - 1] = {type: "ReturnStatement", argument: Io.prototype.unwrapTransform(lastExpressionStatement.expression)}
    ast

  parse: (code, aether) ->

    wrappedCode = iota.compile(code,
      boilerplate: true,
      functionName: aether.options.functionName or 'foo'
    );

    ast = esprima.parse(wrappedCode, {range: true})
    ast = Io.prototype.makeLastStatementReturn ast
    ast