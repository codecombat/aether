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

  parse: (code, aether) ->

    wrappedCode = iota.compile(code, true);
    if aether.options.functionName
      wrappedCode = wrappedCode.replace('execute', aether.options.functionName)
    else
      wrappedCode = wrappedCode.replace('execute', 'foo')

    ast = esprima.parse(wrappedCode, {range: true})
    ast