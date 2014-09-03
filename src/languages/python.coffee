_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

parser = require 'filbert'
parser_loose = require 'filbert/filbert_loose'
estraverse = require 'estraverse'

Language = require './language'

module.exports = class Python extends Language
  name: 'Python'
  id: 'python'
  parserID: 'filbert'
  runtimeGlobals:
    __pythonRuntime: parser.pythonRuntime

  hasChangedASTs: (a, b) ->
    try
      [aAST, bAST] = [null, null]
      options = {locations: false, ranges: false}
      aAST = parser_loose.parse_dammit a, options
      bAST = parser_loose.parse_dammit b, options
      unless aAST and bAST
        return true
      return not _.isEqual(aAST, bAST)
    catch error
      return true

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
    ast = parser.parse code, {locations: false, ranges: true}
    fixLocations ast
    selfToThis ast
    ast

  parseDammit: (code, aether) ->
    try
      ast = parser_loose.parse_dammit code, {locations: false, ranges: true}
      fixLocations ast
      selfToThis ast
    catch error
      ast = {type: "Program", body:[{"type": "EmptyStatement"}]}
    ast

  convertToNativeType: (obj) ->
    return parser.pythonRuntime.utils.createList(obj) if not obj?._isPython and _.isArray obj
    return parser.pythonRuntime.utils.createDict(obj) if not obj?._isPython and _.isObject obj
    obj

  cloneObj: (obj, cloneFn=(o) -> o) ->
    if _.isArray obj
      result = new parser.pythonRuntime.objects.list()
      result.append(cloneFn v) for v in obj
    else if _.isObject obj
      result = new parser.pythonRuntime.objects.dict()
      result[k] = cloneFn v for k, v of obj
    else
      result = cloneFn obj
    result

fixLocations = (ast) ->
  wrappedCodeIndent = 4
  estraverse.traverse ast,
    leave: (node, parent) ->
      if node.range?
        node.range = [node.range[0] - wrappedCodeIndent, node.range[1] - wrappedCodeIndent]

# 'this' is not a keyword in Python, so it does not parse to a ThisExpression
# Instead, we expect the variable 'self', and map it to a ThisExpression
selfToThis = (ast) ->
  ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }],"kind": "var"}
  ast
