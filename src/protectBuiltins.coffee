problems = require './problems'

getOwnPropertyNames = Object.getOwnPropertyNames

copy = (source, target) ->
  for name in getOwnPropertyNames source
    target[name] = source[name]

  return target

cloneBuiltin = (obj,name) ->
  if not obj?
    throw name

  masked = {}
  copy obj, masked

  if obj::
    masked:: = {}
    copy obj::, masked::

  return masked


module.exports.copyBuiltin = copyBuiltin = (source, target) ->
  copy source, target

  if source::
    copy source::, target::


module.exports.builtinObjectNames = builtinObjectNames = [
  # Built-in objects
  'Object', 'Function', 'Array', 'String', 'Boolean', 'Number', 'Date', 'RegExp', 'Math', 'JSON',

  # Error Objects
  'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'
]

module.exports.builtinNames = builtinNames = builtinObjectNames.concat [
  # Math related
  'NaN', 'Infinity', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',

  # URI related
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',

  # Nope
  # 'eval'
]

global = (-> @)()
builtinClones = []
builtinReal = []
addedGlobals = {}

module.exports.addGlobal = addGlobal = (name, value) ->
  # Ex.: Aether.addGlobal('Vector', require('lib/world/vector')), before the Aether instance is constructed
  value ?= global[name]
  builtinClones.push cloneBuiltin(value, name)
  builtinReal.push value
  addedGlobals[name] = value

addGlobal name for name in builtinObjectNames

module.exports.restoreBuiltins = restoreBuiltins = (globals)->
  ## Mask Builtins
  for name, offset in builtinObjectNames
    real = builtinReal[offset]
    cloned = builtinClones[offset]
    copyBuiltin cloned, real
    global[name] = real
  return


module.exports.raiseDisabledFunctionConstructor = raiseDisabledFunctionConstructor = ->
  # Should we make this a normal Aether UserCodeProblem?
  throw new Error '[Sandbox] Function::constructor is disabled. If you are a developer, please make sure you have a reference to your builtins.'


module.exports.createSandboxedFunction = createSandboxedFunction = (functionName, code, aether) ->
  dummyContext = {}
  globalRef = global ? window
  for name in builtinNames.concat aether.options.globals
    dummyContext[name] = addedGlobals[name] ? globalRef[name]
  dummyFunction = raiseDisabledFunctionConstructor
  copyBuiltin Function, dummyFunction
  dummyContext.Function = dummyFunction

  # Because JS_WALA normalizes it to define a wrapper function on `this`, we need to run the wrapper to get our real function out.
  try
    wrapper = new Function ['_aether'], code
    wrapper.call dummyContext, aether
  catch e
    console.warn "Error creating function, so returning empty function instead. Error: #{e}\nCode:", code
    problem = aether.createUserCodeProblem reporter: 'aether', type: 'transpile', kind: 'Untranspilable', message: 'Code could not be compiled. Check syntax.', error: e, code: code, codePrefix: ''
    aether.addProblem problem
    return ->

  dummyContext[functionName]

module.exports.wrapWithSandbox = wrapWithSandbox = (self, fn) ->
  # Wrap calls to aether function in a sandbox
  # This is NOT safe with functions parsed outside of aether
  ->
    Function::constructor = raiseDisabledFunctionConstructor
    try
      self.depth++
      result = fn.apply @, arguments
    finally
      self.depth--
      if self.depth <= 0
        # Shouldn't ever be less than 0
        # Should we throw an exception if it is?
        restoreBuiltins()

    result
