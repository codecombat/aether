Language = require './language'
parserHolder = {}
esprima = require 'esprima'

module.exports = class Io extends Language
  name: 'Io'
  id: 'io'
  parserID: 'iota'

  constructor: ->
    super arguments...
    parserHolder.iota ?= self?.aetherIotaCompiler ? require 'iota-compiler'
    @runtimeGlobals = _io: parserHolder.iota.lib
    @injectCode = require './iota-stdlib.ast.json'

  obviouslyCannotTranspile: (rawCode) ->
    false

  wrap: (rawCode, aether) ->
    @wrappedCodePrefix = ''
    @wrappedCodeSuffix = ''
    @wrappedCodePrefix + rawCode + @wrappedCodeSuffix

  parse: (code, aether) ->

    wrappedCode = parserHolder.iota.compile(code,
      wrapWithFunction: true,
      functionName: aether.options.functionName or 'foo',
      useProxy: true
    );

    ast = esprima.parse(wrappedCode, {range: true})
