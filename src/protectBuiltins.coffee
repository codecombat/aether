_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

problems = require './problems'

# These builtins, being objects, will have to be cloned and restored.
module.exports.builtinObjectNames = builtinObjectNames = [
  # Built-in Objects
  'Object', 'Function', 'Array', 'String', 'Boolean', 'Number', 'Date', 'RegExp', 'Math', 'JSON',

  # Error Objects
  'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'
]

# These builtins aren't objects, so it's easy.
module.exports.builtinNames = builtinNames = builtinObjectNames.concat [
  # Math-related
  'NaN', 'Infinity', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',

  # URI-related
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',

  # Nope!
  # 'eval'
]

Object.freeze Error  # https://github.com/codecombat/aether/issues/81

getOwnPropertyNames = Object.getOwnPropertyNames  # Grab all properties, including non-enumerable ones.
getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
defineProperty = Object.defineProperty.bind Object
copy = (source, target) ->
  return target if not target?
  for name in getOwnPropertyNames source when name isnt 'caller' and name isnt 'arguments'
    if getOwnPropertyDescriptor
      desc = getOwnPropertyDescriptor source, name
      if not desc.get
        target[name] = desc.value
    else
      target[name] = source[name]
  target

cloneBuiltin = (obj) ->
  masked = {}
  copy obj, masked
  if obj::
    masked:: = {}
    copy obj::, masked::
  masked

copyBuiltin = (source, target, resetPrototype) ->
  copy source, target
  if source::
    copy source::, target::
    if resetPrototype
      # I wish I could just do target:: = {} above, but it doesn't work.
      delete target::[name] for name in getOwnPropertyNames(target::) when not source::[name]?

globalScope = (-> @)()
builtinClones = []  # We make pristine copies of our builtins so that we can copy them overtop the real ones later.
builtinReal = []  # These are the globals that the player will actually get to mess with, which we'll clean up after.
module.exports.addedGlobals = addedGlobals = {}

module.exports.addGlobal = addGlobal = (name, value) ->
  # Ex.: Aether.addGlobal('Vector', require('lib/world/vector')), before the Aether instance is constructed.
  return if addedGlobals[name]?
  value ?= globalScope[name]
  builtinClones.push cloneBuiltin value
  builtinReal.push value
  addedGlobals[name] = value

addGlobal name for name in builtinObjectNames  # Protect our initial builtin objects as globals.

module.exports.replaceBuiltin = replaceBuiltin = (name, value) ->
  # Say we want to protect a new version of Math (for Math.random) afterwards. We'll use this.
  builtinIndex = _.indexOf builtinReal, value
  return console.error "We can't replace builtin #{name}, because we never added it:", value if builtinIndex is -1
  builtinClones[builtinIndex] = cloneBuiltin value

module.exports.restoreBuiltins = restoreBuiltins = ->
  # Restore the original state of the builtins.
  for name, offset in builtinObjectNames
    real = builtinReal[offset]
    cloned = builtinClones[offset]
    copyBuiltin cloned, real, true  # Write over the real object with the pristine clone.
    globalScope[name] = real
  return


raiseDisabledFunctionConstructor = ->
  throw new Error '[Sandbox] Function::constructor is disabled. If you are a developer, please make sure you have a reference to your builtins.'

module.exports.createSandboxedFunction = createSandboxedFunction = (functionName, code, aether) ->
  dummyContext = {}
  for name in builtinNames.concat aether.options.globals, Object.keys aether.language.runtimeGlobals
    dummyContext[name] = addedGlobals[name] ? globalScope[name]
  dummyFunction = raiseDisabledFunctionConstructor
  copyBuiltin Function, dummyFunction
  dummyContext.Function = dummyFunction

  # Because JS_WALA normalizes it to define a wrapper function on `this`, we need to run the wrapper to get our real function out.
  try
    wrapper = new Function ['_aether'], code
    wrapper.call dummyContext, aether
  catch e
    console.warn "Error creating function. Returning empty function instead. Error: #{e}"  #\nCode:", code
    problem = aether.createUserCodeProblem reporter: 'aether', type: 'transpile', kind: 'Untranspilable', message: 'Code could not be compiled. Check syntax.', error: e, code: code, codePrefix: ''
    aether.addProblem problem
    return ->

  dummyContext[functionName]

module.exports.wrapWithSandbox = wrapWithSandbox = (self, fn) ->
  # Wrap calls to Aether function in a sandbox. Not safe with functions parsed outside of Aether.
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
