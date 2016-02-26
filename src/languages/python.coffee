_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

parserHolder = {}
estraverse = require 'estraverse'
traversal = require '../traversal'
Language = require './language'

module.exports = class Python extends Language
  name: 'Python'
  id: 'python'
  parserID: 'filbert'
  thisValue: 'self'
  thisValueAccess: 'self.'
  wrappedCodeIndentLen: 4

  constructor: ->
    super arguments...
    @injectCode = require './python-stdlib.ast.json'
    @indent = Array(@wrappedCodeIndentLen + 1).join ' '
    unless parserHolder.parser?.pythonRuntime?
      if parserHolder.parser?
        console.log 'Aether python parser ONLY missing pythonRuntime'
      parserHolder.parser = self?.aetherFilbert ? require 'filbert'
      unless parserHolder.parser.pythonRuntime
        console.error "Couldn't import Python runtime; our filbert import only gave us", parserHolder.parser
    parserHolder.parserLoose ?= self?.aetherFilbertLoose ? require 'filbert/filbert_loose'
    @runtimeGlobals =
      __pythonRuntime: parserHolder.parser.pythonRuntime

  hasChangedASTs: (a, b) ->
    try
      [aAST, bAST] = [null, null]
      options = {locations: false, ranges: false}
      aAST = parserHolder.parserLoose.parse_dammit a, options
      bAST = parserHolder.parserLoose.parse_dammit b, options
      unless aAST and bAST
        return true
      return not _.isEqual(aAST, bAST)
    catch error
      return true

  # Replace 'loop:' with 'while True:'
  replaceLoops: (rawCode) ->
    # rawCode is pre-wrap
    return [rawCode, []] if not rawCode.match(/^\s*loop/m)
    convertedCode = ""
    @replacedLoops = []
    problems = []
    rangeIndex = 0
    lines = rawCode.split '\n'
    for line, lineNumber in lines
      rangeIndex += @wrappedCodeIndentLen # + 4 for future wrapped indent
      if line.match(/^\s*loop\b/, "") and lineNumber < lines.length - 1
        start = line.indexOf 'loop'
        end = start + 4
        end++ while (end < line.length and line[end].match(/\s/))
        if line[end] != ':'
          problems.push
            type: 'transpile'
            message: "You are missing a ':' after 'loop'. Try `loop:`"
            range: [
                row: lineNumber
                column: start
              ,
                row: lineNumber
                column: end
            ]
        a = line.split("")
        a[start..end] = 'while True:'.split ""
        line = a.join("")
        @replacedLoops.push rangeIndex + start
      convertedCode += line
      convertedCode += '\n' unless lineNumber is lines.length - 1
      rangeIndex += line.length + 1 # + 1 for newline
    [convertedCode, @replacedLoops, problems]

  # Return an array of UserCodeProblems detected during linting.
  lint: (rawCode, aether) ->
    problems = []

    try
      ast = parserHolder.parser.parse rawCode, locations: true, ranges: true

      # Check for empty loop
      traversal.walkASTCorrect ast, (node) =>
        return unless node.type is "WhileStatement"
        return unless node.body.body.length is 0
        # Craft an warning for empty loop
        problems.push
          type: 'transpile'
          reporter: 'aether'
          level: 'warning'
          message: "Empty loop. Put 4 spaces in front of statements inside loops."
          range: [
              ofs: node.range[0]
              row: node.loc.start.line - 1
              col: node.loc.start.column
            ,
              ofs: node.range[1]
              row: node.loc.end.line - 1
              col: node.loc.end.column
          ]

      # Check for empty if
      if problems.length is 0
        traversal.walkASTCorrect ast, (node) =>
          return unless node.type is "IfStatement"
          return unless node.consequent.body.length is 0
          # Craft an warning for empty loop
          problems.push
            type: 'transpile'
            reporter: 'aether'
            level: 'warning'
            # TODO: Try 'belong to' instead of 'inside' if players still have problems
            message: "Empty if statement. Put 4 spaces in front of statements inside the if statement."
            range: [
                ofs: node.range[0]
                row: node.loc.start.line - 1
                col: node.loc.start.column
              ,
                ofs: node.range[1]
                row: node.loc.end.line - 1
                col: node.loc.end.column
            ]

    catch error

    problems

  # Wrap the user code in a function. Store @wrappedCodePrefix and @wrappedCodeSuffix.
  wrap: (rawCode, aether) ->
    @wrappedCodePrefix ?="""
    def #{aether.options.functionName or 'foo'}(#{aether.options.functionParameters.join(', ')}):
    \n"""
    @wrappedCodeSuffix ?= "\n"
    indentedCode = (@indent + line for line in rawCode.split '\n').join '\n'
    @wrappedCodePrefix + indentedCode + @wrappedCodeSuffix

  removeWrappedIndent: (range) ->
    # Assumes range not in @wrappedCodePrefix
    range = _.cloneDeep range
    range[0].ofs -= @wrappedCodeIndentLen * (range[0].row + 1)
    range[0].col -= @wrappedCodeIndentLen
    range[1].ofs -= @wrappedCodeIndentLen * (range[1].row + 1)
    range[1].col -= @wrappedCodeIndentLen
    range

  # Using a third-party parser, produce an AST in the standardized Mozilla format.
  parse: (code, aether) ->
    ast = parserHolder.parser.parse code, {locations: false, ranges: true}
    selfToThis ast
    ast

  parseDammit: (code, aether) ->
    try
      ast = parserHolder.parserLoose.parse_dammit code, {locations: false, ranges: true}
      selfToThis ast
    catch error
      ast = {type: "Program", body:[{"type": "EmptyStatement"}]}
    ast

  convertToNativeType: (obj) ->
    parserHolder.parser.pythonRuntime.utils.convertToList(obj) if not obj?._isPython and _.isArray obj
    parserHolder.parser.pythonRuntime.utils.convertToDict(obj) if not obj?._isPython and _.isObject obj
    obj

  cloneObj: (obj, cloneFn=(o) -> o) ->
    if _.isArray obj
      result = new parserHolder.parser.pythonRuntime.objects.list()
      result.append(cloneFn v) for v in obj
    else if _.isObject obj
      result = new parserHolder.parser.pythonRuntime.objects.dict()
      result[k] = cloneFn v for k, v of obj
    else
      result = cloneFn obj
    result

# 'this' is not a keyword in Python, so it does not parse to a ThisExpression
# Instead, we expect the variable 'self', and map it to a ThisExpression
selfToThis = (ast) ->
  ast.body[0].body.body.unshift {"type": "VariableDeclaration","declarations": [{ "type": "VariableDeclarator", "id": {"type": "Identifier", "name": "self" },"init": {"type": "ThisExpression"} }],"kind": "var", "userCode": false}
  ast
