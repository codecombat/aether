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
    @wrappedCodePrefix = ''
    @wrappedCodeSuffix = ''
    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  parse: (code, aether) ->

    wrappedCode = iota.compile(code,
      wrapWithFunction: true,
      functionName: aether.options.functionName or 'foo',
      useProxy: true
    );

    ast = esprima.parse(wrappedCode, {range: true})
