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
  thisValue: 'self'
  thisValueAccess: 'self.'

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

  # Replace 'loop:' with 'while True:'
  replaceLoops: (rawCode, aether) ->
    # rawCode is pre-wrap
    return [rawCode, []] if rawCode.indexOf('loop:') is -1
    convertedCode = ""
    replacedLoops = []
    rangeIndex = 0
    lines = rawCode.split '\n'
    for line, lineNumber in lines
      rangeIndex += 4 # + 4 for future wrapped indent
      if line.replace(/^\s+/g, "").indexOf('loop') is 0
        start = line.indexOf 'loop'
        end = start + 4
        end++ while (line[end] != ':' and end < line.length)
        if end < line.length
          a = line.split("")
          a[start..end] = 'while True:'.split ""
          line = a.join("")
          replacedLoops.push rangeIndex + start
      convertedCode += line
      convertedCode += '\n' unless lineNumber is lines.length - 1
      rangeIndex += line.length + 1 # + 1 for newline
    [convertedCode, replacedLoops]

  # Wrap the user code in a function. Store @wrappedCodePrefix and @wrappedCodeSuffix.
  wrap: (rawCode, aether) ->
    @wrappedCodePrefix ?="""
    def #{aether.options.functionName or 'foo'}(#{aether.options.functionParameters.join(', ')}):
    \n"""
    @wrappedCodeSuffix ?= "\n"

    # Add indentation of 4 spaces to every line
    indentedCode = ('    ' + line for line in rawCode.split '\n').join '\n'

    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  removeWrappedIndent: (range) ->
    # Assumes range not in @wrappedCodePrefix
    range = _.cloneDeep range
    range[0].ofs -= 4 * (range[0].row + 1)
    range[0].col -= 4
    range[1].ofs -= 4 * (range[1].row + 1)
    range[1].col -= 4
    range

  # Using a third-party parser, produce an AST in the standardized Mozilla format.
  parse: (code, aether) ->
    ast = parser.parse code, {locations: false, ranges: true}
    selfToThis ast
    ast

  parseDammit: (code, aether) ->
    try
      ast = parser_loose.parse_dammit code, {locations: false, ranges: true}
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

# 'this' is not a keyword in Python, so it does not parse to a ThisExpression
# Instead, we expect the variable 'self', and map it to a ThisExpression
selfToThis = (ast) ->
  ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }],"kind": "var"}
  ast
