Language = require './language'
parser = require 'closer/dist/closer'
core = require 'closer/dist/closer-core'
assertions = require 'closer/dist/assertions'
estraverse = require 'estraverse'
escodegen = require 'escodegen'
esprima = require 'esprima'

module.exports = class Clojure extends Language
  name: 'Clojure'
  id: 'clojure'
  parserID: 'closer'
  runtimeGlobals:
    core: core
    assertions: assertions

  constructor: (version) ->
    super version

  parse: (code, aether) ->
    ast = parser.parse code
    estraverse.replace ast,
      leave: (node) ->
        if node.type is 'Identifier' and node.name of core
          obj = parser.node 'Identifier', 'closerCore', node.loc
          prop = parser.node 'Identifier', node.name, node.loc
          node = parser.node 'MemberExpression', obj, prop, false, node.loc
        if node.type is 'Program'
          # replace last statement with return
          lastStmt = node.body[node.body.length-1]
          if lastStmt.type is 'ExpressionStatement'
            lastStmt.type = 'ReturnStatement'
            lastStmt.argument = lastStmt.expression
            delete lastStmt.expression
        node
    jsCode = escodegen.generate ast
    fullCode = """
    function #{aether.options.functionName or 'foo'}(#{aether.options.functionParameters.join(', ')}) {\n
      #{jsCode}\n
    }"""
    ast = esprima.parse fullCode
    ast
