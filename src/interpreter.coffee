_ = window?._ ? self?._ ? global?._ ? require 'lodash'
addedGlobals = require('./protectBuiltins').addedGlobals

updateState = (aether, evaluator) ->
  frame_stack = evaluator.frames
  top = frame_stack[0]
  bottom = frame_stack[frame_stack.length - 1]

  if aether.options.includeFlow
    unless bottom.flow?
      bottom.flow = {statementsExecuted: 0, statements: []}
      aether.flow.states ?= []
      aether.flow.states.push bottom.flow

  if aether.options.includeMetrics
    aether.metrics.statementsExecuted ?= 0
    aether.metrics.callsExecuted ?= 0
  
  astStack = (x.ast for x in frame_stack when x.ast?)

  if astStack[0]? 
    rng = astStack[0].originalRange
    aether.lastStatementRange = [rng.start, rng.end] if rng

  if top.ast?
    ++aether.metrics.callsExecuted if aether.options.includeMetrics and top.ast.type == 'CallExpression'

    unless top.ast.type in ['Literal', 'Identifier', 'ThisExpression', 'BlockStatement', 'MemberExpression', 'FunctionExpression']
      ++aether.metrics.statementsExecuted if aether.options.includeMetrics
      ++bottom.flow.statementsExecuted if bottom.flow?

      if bottom.flow?
        f = {}
        f.userInfo = _.cloneDeep aether._userInfo if aether._userInfo?
        unless aether.options.noVariablesInFlow
          variables = {}
          for s in [(frame_stack.length - 2) .. 0]
            p = frame_stack[s]
            continue if not p.scope
            for n in Object.keys(p.scope.object.properties)
              continue if n[0] is '_'
              variables[n] = p.value.debugString if p.value
          f.variables = variables

        if astStack[0]? 
          rng = astStack[0].originalRange
          f.range = [rng.start, rng.end] if rng
        
        bottom.flow.statements.push f unless not f.range # Dont push statements without ranges

module.exports.createFunction = (aether, code) ->
  esper = window?.esper ? self?.esper ? global?.esper ? require 'esper.js'
  state = {}
  #aether.flow.states.push state
  messWithLoops = false
  if aether.options.whileTrueAutoYield or aether.options.simpleLoops
    messWithLoops = true

  engine = new esper.Engine(strict: true)
  #console.log JSON.stringify(aether.ast, null, '  ')

  #fxName = aether.ast.body[0].id.name
  fxName = aether.options.functionName or 'foo'
  #console.log JSON.stringify(aether.ast, null, "  ")

  if aether.language.injectCode?
    engine.evalASTSync(aether.language.injectCode)

  for name in Object.keys addedGlobals
    engine.addGlobal(name, addedGlobals[name])

  engine.evalASTSync(aether.ast)
  #console.log require('escodegen').generate(aether.ast)
  executionCount = 0
  engine.evaluator.insterment = () ->
    if ++executionCount > aether.options.executionLimit
      throw new TypeError 'Statement execution limit reached'

    updateState aether, engine.evaluator

  x = 0

  if aether.options.yieldConditionally 
    fx = engine.fetchFunction fxName, (engine) -> 
      frame_stack = engine.evaluator.frames
      #console.log x.type + " " + x.ast?.type for x in frame_stack
      #console.log "----"

      top = frame_stack[0]

      if top.type is 'loop'
        if frame_stack[1].ast.type is 'WhileStatement' and frame_stack[1].ast.test.type is 'Literal'
          if not top.marked
            top.marked = true
          else if not top.ast?
            if not top.didYield
              top.didYield = false
              return true

      yieldValue = aether._shouldYield
      return false unless yieldValue

      aether._shouldYield = false

      if aether.onAetherYield
        aether.onAetherYield yieldValue

      aether._shouldYield = false
      if frame_stack[1].type is 'loop'
        frame_stack[1].didYield = true

      return yieldValue

  else if aether.options.yieldAutomatically
    fx = engine.fetchFunction fxName, (engine) ->
      return true

  else
    fx = engine.fetchFunctionSync fxName

  return fx
