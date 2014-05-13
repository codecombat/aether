Language = require './language'

parser = require 'filbert'

estraverse = require 'estraverse'
escodegen = require 'escodegen'
esprima = require 'esprima'

module.exports = class Python extends Language
  name: 'Python'
  id: 'python'
  parserID: 'filbert'
  runtimeGlobals:
    __pythonRuntime: parser.pythonRuntime

  hasChangedSignificantly: (a, b) ->
    true

  # Wrap the user code in a function. Store @wrappedCodePrefix and @wrappedCodeSuffix.
  wrap: (rawCode, aether) ->
    @wrappedCodePrefix ?="""
    def #{aether.options.functionName or 'foo'}(#{aether.options.functionParameters.join(', ')}):
    \n"""
    @wrappedCodeSuffix ?= "\n"

    # Add indentation of 4 spaces to every line
    indentedCode = ('    ' + line for line in rawCode.split '\n').join '\n'

    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  # Using a third-party parser, produce an AST in the standardized Mozilla format.
  parse: (code, aether) ->
    ast = parser.parse code, {locations: true, ranges: true}
    ast
