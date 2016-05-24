_ = window?._ ? self?._ ? global?._ ? require 'lodash'
addedGlobals = require('./protectBuiltins').addedGlobals

isStatement = (name) ->
  name not in [
    'Literal', 'Identifier', 'ThisExpression', 'BlockStatement', 'MemberExpression',
    'FunctionExpression', 'LogicalExpression', 'BinaryExpression', 'UnaryExpression'
  ]

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
  statementStack = ( x for x in astStack when isStatement x.type )

  if statementStack[0]?
    rng = statementStack[0].originalRange
    aether.lastStatementRange = [rng.start, rng.end] if rng

  if top.ast?
    ++aether.metrics.callsExecuted if aether.options.includeMetrics and top.ast.type == 'CallExpression'

    if isStatement top.ast.type
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

  unless aether.esperEngine
    aether.esperEngine = new esper.Engine(strict: true, foreignObjectMode: 'smart')

  engine = aether.esperEngine
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

  upgradeEvaluator aether, engine.evaluator

  x = 0

  if aether.options.yieldConditionally
    fx = engine.fetchFunction fxName, makeYieldFilter(aether)
  else if aether.options.yieldAutomatically
    fx = engine.fetchFunction fxName, (engine) -> true
  else
    fx = engine.fetchFunctionSync fxName

  return fx

makeYieldFilter = (aether) -> (engine) ->
  frame_stack = engine.evaluator.frames
  #console.log x.type + " " + x.ast?.type for x in frame_stack
  #console.log "----"

  top = frame_stack[0]

  if top.type is 'loop'
    if frame_stack[1].ast.type is 'WhileStatement' and frame_stack[1].ast.test.type is 'Literal'
      if not top.marked
        top.marked = true
        top.mark = aether.whileLoopMarker() if aether.whileLoopMarker
      else if not top.ast?
        currentMark = aether.whileLoopMarker()
        if not aether.whileLoopMarker or currentMark is top.mark
          #console.log "[Aether] Forcing while-true loop to yield."
          top.mark = currentMark + 1
          return true
        else
          #console.log "[Aether] Loop Avoided, mark #{top.mark} isnt #{currentMark}"
          top.mark = currentMark

  return false

module.exports.createThread = (aether, fx) ->
  internalFx = esper.Value.getBookmark fx
  engine = new esper.Engine aether.esperEngine.options
  Evaluator = aether.esperEngine.evaluator.constructor  # Get internal reference to this constructor
  # TODO: Make this more efficient at some point rather than retrofitting the old engine
  #engine.evaluator = new Evaluator aether.esperEngine.realm, aether.esperEngine.evaluator.ast, aether.esperEngine.globalScope  # Correct? scope
  engine.evaluator = new Evaluator aether.esperEngine.realm, aether.esperEngine.evaluator.ast, aether.esperEngine.evaluator.frames[0].scope  # Crazy debugging scope
  engine.evaluator.frames = []
  upgradeEvaluator aether, engine.evaluator
  return engine.makeFunctionFromClosure internalFx, -> false  # TODO: pass makeYieldFilter(aether) and fix that to handle while-true yielding properly

module.exports.upgradeEvaluator = upgradeEvaluator = (aether, evaluator) ->
  executionCount = 0
  evaluator.instrument = ->
    if ++executionCount > aether.options.executionLimit
      throw new TypeError 'Statement execution limit reached'
    updateState aether, evaluator
