Language = require './language'
luapegjs = require 'luapegjs'

module.exports = class Lua2 extends Language
  name: 'Lua 2'
  id: 'lua2'
  parserID: 'luapegjs'
  runtimeGlobals: {}

  obviouslyCannotTranspile: (rawCode) ->
    false

  wrap: (rawCode, aether) ->
    @wrappedCodePrefix ?="""
    function #{aether.options.functionName or 'foo'}(#{aether.options.functionParameters.join(', ')})
    \n"""
    @wrappedCodeSuffix ?= "end"

    # Add indentation of 4 spaces to every line
    indentedCode = ('   ' + line for line in rawCode.split '\n').join '\n'

    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  parse: (code, aether) ->

    ast = luapegjs.parse code, {locations: true, range: true}

    ast
