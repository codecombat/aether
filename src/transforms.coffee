_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO
problems = require './problems'
esprima = require 'esprima'
SourceMap = require 'source-map'
S = esprima.Syntax

statements = [S.EmptyStatement, S.ExpressionStatement, S.BreakStatement, S.ContinueStatement, S.DebuggerStatement, S.DoWhileStatement, S.ForStatement, S.FunctionDeclaration, S.ClassDeclaration, S.IfStatement, S.ReturnStatement, S.SwitchStatement, S.ThrowStatement, S.TryStatement, S.VariableStatement, S.WhileStatement, S.WithStatement]

getParents = (node) ->
  parents = []
  while node.parent
    parents.push node = node.parent
  parents

getParentsOfType = (node, type) ->
  _.filter getParents(node), {type: type}

getFunctionNestingLevel = (node) ->
  getParentsOfType(node, S.FunctionExpression).length

getLineNumberForNode = (node) ->
  # We ignore the first two wrapper lines -- TODO: how do we know there are two lines?
  parent = node
  while parent.type isnt S.Program
    parent = parent.parent
  fullSource = parent.source()
  line = -2
  for i in [0 ... node.range[0]]
    if fullSource[i] is '\n'
      ++line
  #console.log "getLineNumberFor", node, "of", fullSource, "is", line
  line

########## Before JS_WALA Normalization ##########

# Original node range preservation.
# 1. Make a many-to-one mapping of normalized nodes to original nodes based on the original ranges, which are unique except for the outer Program wrapper.
# 2. When we generate the normalizedCode, we can also create a source map.
# 3. A postNormalizationTransform can then get the original ranges for each node by going through the source map to our normalized mapping to our original node ranges.
# 4. Instrumentation can then include the original ranges and node source in the saved flow state.
module.exports.makeGatherNodeRanges = makeGatherNodeRanges = (nodeRanges, codePrefix) -> (node) ->
  node.originalRange = start: node.range[0] - codePrefix.length, end: node.range[1] - codePrefix.length
  node.originalSource = node.source()
  nodeRanges.push node

# Making
module.exports.makeCheckThisKeywords = makeCheckThisKeywords = (global) ->
  vars = {}
  return (node) ->
    if node.type is S.VariableDeclarator
      vars[node.id.name] = true
    else if node.type is S.FunctionDeclaration
      vars[node.id.name] = true
    else if node.type is S.CallExpression
      v = node.callee.name
      if v and not vars[v] and not global[v]
        # Probably MissingThis, but let's check if we're recursively calling an inner function from itself first.
        for p in getParentsOfType node, S.FunctionDeclaration
          vars[p.id.name] = true
          return if p.id.name is v
        problem = new problems.TranspileProblem @, 'aether', 'MissingThis', {}, '', ''  # TODO: last args
        problem.message = "Missing `this.` keyword; should be `this.#{v}`."
        problem.hint = "There is no function `#{v}`, but `this` has a method `#{v}`."
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
  if node.type is 'ExpressionStatement'
    lineNumber = getLineNumberForNode node
    exp = node.expression
    if exp.type is 'MemberExpression'
      # Handle missing parentheses, like in:  this.moveUp;
      if exp.property.name is "IncompleteThisReference"
        m = "this.what? (Check available spells below.)"
      else
        m = "#{exp.source()} has no effect."
        if exp.property.name in problems.commonMethods
          m += " It needs parentheses: #{exp.property.name}()"
      # Should become a UserCodeProblem like in makeCheckThisKeywords
      error = new Error m
      error.lineNumber = lineNumber + 2  # Reapply wrapper function offset
      #if $? then console.log node, node.source(), "going to error out!"
      #throw error


########## After JS_WALA Normalization ##########

# Restoration of original nodes after normalization
module.exports.makeFindOriginalNodes = makeFindOriginalNodes = (originalNodes, codePrefix, wrappedCode, normalizedSourceMap, normalizedNodeIndex) ->
  normalizedPosToOriginalNode = (pos) ->
    start = pos.start_offset - codePrefix.length
    end = pos.end_offset - codePrefix.length
    return node for node in originalNodes when start is node.originalRange.start and end is node.originalRange.end
    return null
  smc = new SourceMap.SourceMapConsumer normalizedSourceMap.toString()
  #console.log "Got smc", smc, "from map", normalizedSourceMap, "string", normalizedSourceMap.toString()
  return (node) ->
    return unless mapped = smc.originalPositionFor line: node.loc.start.line, column: node.loc.start.column
    #console.log "Got normalized position", mapped, "for node", node, node.source()
    return unless normalizedNode = normalizedNodeIndex[mapped.column]
    #nconsole.log "  Got normalized node", normalizedNode
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

module.exports.makeInstrumentStatements = makeInstrumentStatements = ->
  # set up any state tracking here
  return (node) ->
    return unless node.originalNode and node.originalNode.originalRange.start >= 0
    return unless node.type in statements
    return if node.originalNode.type in [S.ThisExpression, S.Identifier, S.Literal]  # probably need to add to this to get statements which corresponded to interesting expressions before normalization
    # Only do this in nested functions, not our wrapper
    return unless getFunctionNestingLevel(node) > 1
    # TODO: actually save this into aether.flow, and have it happen before the yield happens
    range = [node.originalNode.originalRange.start, node.originalNode.originalRange.end]
    source = node.originalNode.originalSource
    safeSource = source.replace(/\"/g, '\\"').replace(/\n/g, '\\n')
    node.update "#{node.source()} _aether.logStatement(#{range[0]}, #{range[1]}, \"#{safeSource}\", this._aetherUserInfo);"
    #console.log " ... created logger", node.source(), node.originalNode

module.exports.makeInstrumentCalls = makeInstrumentCalls = ->
  # set up any state tracking here
  return (node) ->
    # Don't do this if it's an inner function they defined
    return unless getFunctionNestingLevel(node) is 2
    if node.type is S.ReturnStatement
      node.update "_aether.logCallEnd(); #{node.source()}"
    # Look at the top variable declaration inside our appropriately nested function to see where the call starts
    return unless node.type is S.VariableDeclaration
    node.update "_aether.logCallStart(); #{node.source()}"  # TODO: pull in arguments?
