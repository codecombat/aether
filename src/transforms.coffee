_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

S = require('esprima').Syntax
SourceMap = require 'source-map'

ranges = require './ranges'
{commonMethods} = require './problems'

statements = [S.EmptyStatement, S.ExpressionStatement, S.BreakStatement, S.ContinueStatement, S.DebuggerStatement, S.DoWhileStatement, S.ForStatement, S.FunctionDeclaration, S.ClassDeclaration, S.IfStatement, S.ReturnStatement, S.SwitchStatement, S.ThrowStatement, S.TryStatement, S.VariableStatement, S.WhileStatement, S.WithStatement, S.VariableDeclaration]

getParents = (node) ->
  parents = []
  while node.parent
    parents.push node = node.parent
  parents

getParentsOfTypes = (node, types) ->
  _.filter getParents(node), (elem) -> elem.type in types

getFunctionNestingLevel = (node) ->
  getParentsOfTypes(node, [S.FunctionExpression]).length

########## Before JS_WALA Normalization ##########

# Original node range preservation.
# 1. Make a many-to-one mapping of normalized nodes to original nodes based on the original ranges, which are unique except for the outer Program wrapper.
# 2. When we generate the normalizedCode, we can also create a source map.
# 3. A postNormalizationTransform can then get the original ranges for each node by going through the source map to our normalized mapping to our original node ranges.
# 4. Instrumentation can then include the original ranges and node source in the saved flow state.
module.exports.makeGatherNodeRanges = makeGatherNodeRanges = (nodeRanges, code, codePrefix) -> (node) ->
  return unless node.range
  node.originalRange = ranges.offsetsToRange node.range[0], node.range[1], code, codePrefix
  node.originalSource = node.source()
  nodeRanges.push node

# Making
module.exports.makeCheckThisKeywords = makeCheckThisKeywords = (globals, varNames) ->
  return (node) ->
    if node.type is S.VariableDeclarator
      varNames[node.id.name] = true
    else if node.type is S.AssignmentExpression
      varNames[node.left.name] = true
    else if node.type is S.FunctionDeclaration or node.type is S.FunctionExpression# and node.parent.type isnt S.Program
      varNames[node.id.name] = true if node.id?
      varNames[param.name] = true for param in node.params
    else if node.type is S.CallExpression
      v = node
      while v.type in [S.CallExpression, S.MemberExpression]
        v = if v.object? then v.object else v.callee
      v = v.name
      if v and not varNames[v] and not (v in globals)
        # Probably MissingThis, but let's check if we're recursively calling an inner function from itself first.
        for p in getParentsOfTypes node, [S.FunctionDeclaration, S.FunctionExpression, S.VariableDeclarator, S.AssignmentExpression]
          varNames[p.id.name] = true if p.id?
          varNames[p.left.name] = true if p.left?
          varNames[param.name] = true for param in p.params if p.params?
          return if varNames[v] is true
        # TODO: we need to know whether `this` has this method before saying this...
        message = "Missing `this.` keyword; should be `this.#{v}`."
        hint = "There is no function `#{v}`, but `this` has a method `#{v}`."
        range = [node.originalRange.start, node.originalRange.end]
        problem = @createUserCodeProblem type: 'transpile', reporter: 'aether', kind: 'MissingThis', message: message, hint: hint, range: range  # TODO: code/codePrefix?
        @addProblem problem

module.exports.validateReturns = validateReturns = (node) ->
  # Only on top-level function (inside the wrapper), not inner functions.
  return unless getFunctionNestingLevel(node) is 2
  if node.type is S.ReturnStatement and not node.argument
    node.update node.source().replace "return;", "return this.validateReturn('#{@options.functionName}', null);"
  else if node.parent?.type is S.ReturnStatement
    node.update "this.validateReturn('#{@options.functionName}', (#{node.source()}))"

module.exports.checkIncompleteMembers = checkIncompleteMembers = (node) ->
  #console.log 'check incomplete members', node, node.source() if node.source().search('this.') isnt -1
  if node.type is 'ExpressionStatement'
    exp = node.expression
    if exp.type is 'MemberExpression'
      # Handle missing parentheses, like in:  this.moveUp;
      if exp.property.name is "IncompleteThisReference"
        kind = 'IncompleteThis'
        m = "this.what? (Check available spells below.)"
        hint = ''
      else
        kind = 'NoEffect'
        m = "#{exp.source()} has no effect."
        if exp.property.name in commonMethods
          m += " It needs parentheses: #{exp.source()}()"
        else
          hint = "Is it a method? Those need parentheses: #{exp.source()}()"
      problem = @createUserCodeProblem type: 'transpile', reporter: 'aether', message: m, kind: kind, hint: hint, range: if node.originalRange then [node.originalRange.start, node.originalRange.end] else null  # TODO: code/codePrefix?
      @addProblem problem

########## After JS_WALA Normalization ##########

# Restoration of original nodes after normalization
module.exports.makeFindOriginalNodes = makeFindOriginalNodes = (originalNodes, codePrefix, normalizedSourceMap, normalizedNodeIndex) ->
  normalizedPosToOriginalNode = (pos) ->
    start = pos.start_offset - codePrefix.length
    end = pos.end_offset - codePrefix.length
    return node for node in originalNodes when start is node.originalRange.start.ofs and end is node.originalRange.end.ofs
    return null
  smc = new SourceMap.SourceMapConsumer normalizedSourceMap.toString()
  #console.log "Got smc", smc, "from map", normalizedSourceMap, "string", normalizedSourceMap.toString()
  return (node) ->
    return unless mapped = smc.originalPositionFor line: node.loc.start.line, column: node.loc.start.column
    #console.log "Got normalized position", mapped, "for node", node, node.source()
    return unless normalizedNode = normalizedNodeIndex[mapped.column]
    #console.log "  Got normalized node", normalizedNode
    node.originalNode = normalizedPosToOriginalNode normalizedNode.attr.pos
    #console.log "  Got original node", node.originalNode, "from pos", normalizedNode.attr?.pos

possiblyGeneratorifyAncestorFunction = (node) ->
  while node.type isnt S.FunctionExpression
    node = node.parent
  node.mustBecomeGeneratorFunction = true

# Now that it's normalized to this: https://github.com/nwinter/JS_WALA/blob/master/normalizer/doc/normalization.md
# ... we can basically just put a yield check in after every CallExpression except the outermost one if we are yielding conditionally.
module.exports.yieldConditionally = yieldConditionally = (node) ->
  if node.type is S.ExpressionStatement and node.expression.right?.type is S.CallExpression
    # Because we have a wrapper function which shouldn't yield, we only yield inside nested functions.
    # We can't generatorify inner functions or when they're called, they'll return generator values, not real values.
    return unless getFunctionNestingLevel(node) is 2
    node.update "#{node.source()} if (_aether._shouldYield) { var _yieldValue = _aether._shouldYield; _aether._shouldYield = false; yield _yieldValue; }"
    node.yields = true
    possiblyGeneratorifyAncestorFunction node
  else if node.mustBecomeGeneratorFunction
    node.update node.source().replace /^function \(/, 'function* ('

module.exports.yieldAutomatically = yieldAutomatically = (node) ->
  # TODO: don't yield after things like 'use strict';
  # TODO: think about only doing this after some of the statements which have a different original range?
  if node.type in statements
    # Because we have a wrapper function which shouldn't yield, we only yield inside nested functions.
    # We can't generatorify inner functions or when they're called, they'll return generator values, not real values.
    return unless getFunctionNestingLevel(node) is 2
    node.update "#{node.source()} yield 'waiting...';"
    node.yields = true
    possiblyGeneratorifyAncestorFunction node
  else if node.mustBecomeGeneratorFunction
    node.update node.source().replace /^function \(/, 'function* ('

module.exports.makeInstrumentStatements = makeInstrumentStatements = (varNames) ->
  # set up any state tracking here
  return (node) ->
    orig = node.originalNode
    #console.log "Should we instrument", orig?.originalSource, node.source(), node, "?", (orig and orig.originalRange.start >= 0), (node.type in statements), orig?.type, getFunctionNestingLevel(node) if node.source().length < 50
    return unless orig and orig.originalRange.start.ofs >= 0
    return unless node.type in statements
    return if orig.type in [S.ThisExpression, S.Identifier]  # probably need to add to this to get statements which corresponded to interesting expressions before normalization
    # Only do this in nested functions, not our wrapper
    return unless getFunctionNestingLevel(node) > 1
    if orig.parent?.type is S.AssignmentExpression and orig.parent.parent?.type is S.ExpressionStatement and orig.parent.parent.originalRange
      orig = orig.parent.parent
    else if orig.parent?.type is S.VariableDeclarator and orig.parent.parent?.type is S.VariableDeclaration and orig.parent.parent.originalRange
      orig = orig.parent.parent
    # TODO: actually save this into aether.flow, and have it happen before the yield happens
    safeRange = ranges.stringifyRange orig.originalRange.start, orig.originalRange.end
    prefix = "_aether.logStatementStart(#{safeRange});"
    if varNames
      loggers = ("_aether.vars['#{varName}'] = typeof #{varName} == 'undefined' ? undefined : #{varName};" for varName of varNames)
      logging = " if (!_aether._shouldSkipFlow) { #{loggers.join ' '} }"
    else
      logging = ''
    suffix = " _aether.logStatement(#{safeRange}, _aether._userInfo, #{if varNames then '!_aether._shouldSkipFlow' else 'false'});"
    node.update "#{prefix} #{node.source()} #{logging}#{suffix}"
    #console.log " ... created logger", node.source(), orig

module.exports.interceptThis = interceptThis = (node) ->
  return unless node.type is S.ThisExpression
  return unless getFunctionNestingLevel(node) > 1
  node.update "__interceptThis(this, __global)"

module.exports.interceptEval = interceptEval = (node) ->
  return unless node.type is S.Identifier and node.name is 'eval'
  node.update "evil"

module.exports.makeInstrumentCalls = makeInstrumentCalls = (varNames) ->
  # set up any state tracking here
  return (node) ->
    # Don't do this if it's an inner function they defined
    return unless getFunctionNestingLevel(node) is 2
    if node.type is S.ReturnStatement
      node.update "_aether.logCallEnd(); #{node.source()}"
    # Look at the top variable declaration inside our appropriately nested function to see where the call starts
    return unless node.type is S.VariableDeclaration
    node.update "'use strict'; _aether.logCallStart(_aether._userInfo); #{node.source()}"  # TODO: pull in arguments?

module.exports.protectAPI = (node) ->
  return unless node.type in [S.CallExpression, S.ThisExpression, S.VariableDeclaration, S.ReturnStatement]
  level = getFunctionNestingLevel node
  return unless level > 1

  # Restore clones when passing to functions or returning them.
  if node.type is S.CallExpression
    for arg in node.arguments
      arg.update "_aether.restoreAPIClone(_aether, #{arg.source()})"
  else if node.type is S.ReturnStatement and arg = node.argument
    arg.update "_aether.restoreAPIClone(_aether, #{arg.source()})"

  # Create clones from arguments and function return values.
  if node.parent.type is S.AssignmentExpression or node.type is S.ThisExpression
    node.update "_aether.createAPIClone(_aether, #{node.source()})"
  else if node.type is S.VariableDeclaration
    parameters = (param.name for param in (node.parent.parent.params ? []))
    protectors = ("#{parameter} = _aether.createAPIClone(_aether, #{parameter});" for parameter in parameters)
    argumentsProtector = "for(var __argIndexer = 0; __argIndexer < arguments.length; ++__argIndexer) arguments[__argIndexer] = _aether.createAPIClone(_aether, arguments[__argIndexer]);"
    node.update "#{node.source()} #{protectors.join ' '} #{argumentsProtector}"
    #console.log "variable declaration #{node.source()} grandparent is", node.parent.parent

  #console.log "protectAPI?", node, node.source()
