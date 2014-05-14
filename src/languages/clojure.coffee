Language = require './language'
closer = require 'closer/lib/src/closer'
closerCore = require 'closer/lib/src/closer-core'
assertions = require 'closer/lib/src/assertions'
estraverse = require 'estraverse'

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

  parse: (code, aether) ->
    ast = closer.parse code

    # remove the arity check from the top-level function
    ast.body[0].declarations[0].init.body.body.splice(0, 1)

    estraverse.replace ast,
      leave: (node) ->
        if node.type is 'Identifier' and node.name of closerCore
          obj = closer.node 'Identifier', 'closerCore', node.loc
          prop = closer.node 'Identifier', node.name, node.loc
          node = closer.node 'MemberExpression', obj, prop, false, node.loc
        if node.type is 'Program'
          # replace last statement with return
          lastStmt = node.body[node.body.length-1]
          if lastStmt.type is 'ExpressionStatement'
            lastStmt.type = 'ReturnStatement'
            lastStmt.argument = lastStmt.expression
            delete lastStmt.expression
        node
    ast
