_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
problems = require './problems'
ranges = require './ranges'
esprima = require 'esprima'
SourceMap = require 'source-map'
S = esprima.Syntax

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
module.exports.makeCheckThisKeywords = makeCheckThisKeywords = (global, varNames) ->
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
      if v and not varNames[v] and not global[v]
        # Probably MissingThis, but let's check if we're recursively calling an inner function from itself first.
        for p in getParentsOfTypes node, [S.FunctionDeclaration, S.FunctionExpression, S.VariableDeclarator, S.AssignmentExpression]
          varNames[p.id.name] = true if p.id?
          varNames[p.left.name] = true if p.left?
          varNames[param.name] = true for param in p.params if p.params?
          return if varNames[v] is true
        problem = new problems.TranspileProblem @, 'aether', 'MissingThis', {}, null, '', ''  # TODO: last args
        problem.message = "Missing `this.` keyword; should be `this.#{v}`."
        problem.hint = "There is no function `#{v}`, but `this` has a method `#{v}`."
        problem.ranges = [[node.originalRange.start, node.originalRange.end]]
        @addProblem problem
        if not @options.requiresThis
          node.update "this.#{node.source()}"

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
        problem = new problems.TranspileProblem @, 'aether', 'IncompleteThis', {}, null, '', ''  # TODO: last args
        m = "this.what? (Check available spells below.)"
      else
        problem = new problems.TranspileProblem @, 'aether', 'NoEffect', {}, null, '', ''  # TODO: last args
        m = "#{exp.source()} has no effect."
        if exp.property.name in problems.commonMethods
          m += " It needs parentheses: #{exp.source()}()"
        else
          problem.hint = "Is it a method? Those need parentheses: #{exp.source()}()"
      problem.message = m
      problem.ranges = [[node.originalRange.start, node.originalRange.end]]
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
    node.update "#{node.source()} if (this._aetherShouldYield) { var _yieldValue = this._aetherShouldYield; this._aetherShouldYield = false; yield _yieldValue; }"
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
    if orig.parent?.type is S.AssignmentExpression and orig.parent.parent?.type is S.ExpressionStatement
      orig = orig.parent.parent
    else if orig.parent?.type is S.VariableDeclarator and orig.parent.parent?.type is S.VariableDeclaration
      orig = orig.parent.parent
    # TODO: actually save this into aether.flow, and have it happen before the yield happens
    safeRange = ranges.stringifyRange orig.originalRange.start, orig.originalRange.end
    safeSource = orig.originalSource.replace(/\"/g, '\\"').replace(/\n/g, '\\n')
    prefix = "_aether.logStatementStart(#{safeRange});"
    loggers = ("_aether.vars['#{varName}'] = typeof #{varName} == 'undefined' ? undefined : #{varName};" for varName of varNames)
    loggers.push "_aether.logStatement(#{safeRange}, \"#{safeSource}\", this._aetherUserInfo);"
    node.update "#{prefix} #{node.source()} #{loggers.join ' '}"
    #console.log " ... created logger", node.source(), orig

module.exports.interceptThis = interceptThis = (node) ->
  return unless node.type is S.ThisExpression
  return unless getFunctionNestingLevel(node) > 1
  node.update "__interceptThis(this, __global)"

module.exports.makeInstrumentCalls = makeInstrumentCalls = (varNames) ->
  # set up any state tracking here
  return (node) ->
    # Don't do this if it's an inner function they defined
    return unless getFunctionNestingLevel(node) is 2
    if node.type is S.ReturnStatement
      node.update "_aether.logCallEnd(); #{node.source()}"
    # Look at the top variable declaration inside our appropriately nested function to see where the call starts
    return unless node.type is S.VariableDeclaration
    node.update "_aether.logCallStart(this._aetherUserInfo); #{node.source()}"  # TODO: pull in arguments?

module.exports.makeProtectAPI = makeProtectAPI = (parameters) ->
  parameters ?= []
  return (node) ->
    return unless node.type in [S.CallExpression, S.ThisExpression, S.VariableDeclaration, S.ReturnStatement]
    level = getFunctionNestingLevel node
    return unless level > 1
    if node.type is S.CallExpression
      for arg in node.arguments
        arg.update "_aether.restoreAPIClone(#{arg.source()})"
    if node.parent.type is S.AssignmentExpression or node.type is S.ThisExpression
      node.update "_aether.createAPIClone(#{node.source()})"
    else if level is 2
      if node.type is S.VariableDeclaration and parameters.length
        protectors = ("#{parameter} = _aether.createAPIClone(#{parameter});" for parameter in parameters)
        node.update "#{node.source()} #{protectors.join ' '}"
      else if node.type is S.ReturnStatement and arg = node.argument
        arg.update "_aether.restoreAPIClone(#{arg.source()})"
    #console.log "protectAPI?", node, node.source()
