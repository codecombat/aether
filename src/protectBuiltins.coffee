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

global = (-> this)()
builtinNames = ['Object', 'Function', 'Array', 'String', 'Boolean', 'Number', 'Date', 'RegExp', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError']
builtinClones = (cloneBuiltin global[name],name for name in builtinNames)
builtinReal = (global[name] for name in builtinNames)

module.exports.restoreBuiltins = restoreBuiltins = (globals)->
  ## Mask Builtins
  for name, offset in builtinNames
    real = builtinReal[offset]
    cloned = builtinClones[offset]
    copyBuiltin cloned, real
    global[name] = real

  return

module.exports.raiseDisabledFunctionConstructor = raiseDisabledFunctionConstructor = ->
  # Should we make this a normal Aether UserCodeProblem?
  throw new Error '[Sandbox] Function::constructor is disabled. If you are a developer, please make sure you have a reference to your builtins.'


module.exports.createSandboxedFunction = createSandboxedFunction = (functionName, code, aether) ->
  globals = [
      # Other
      # 'eval',

      # TODO: figure out how to really get these in (CodeCombat-specific, hack)
      'Vector', '_',

      # Math related
      'NaN', 'Infinity', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',

      # URI related
      'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',

      # Built-in objects
      'Object', 'Function', 'Array', 'String', 'Boolean', 'Number', 'Date', 'RegExp', 'Math', 'JSON',

      # Error Objects
      'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'
  ]
  dummyContext = {}
  globalRef = global ? window
  for name in globals
    dummyContext[name] = globalRef[name]
    if name is 'Vector'
      try
        dummyContext[name] = eval("require('lib/world/vector')")  # haaaaaaaaaaaaaaa.... aaaaaaaaaaaack
      catch error
        console.log 'dude, there is no Vector', error

  dummyFunction = raiseDisabledFunctionConstructor
  copyBuiltin Function, dummyFunction
  dummyContext.Function = dummyFunction

  # Because JS_WALA normalizes it to define a wrapper function on `this`, we need to run the wrapper to get our real function out.
  wrapper = new Function ['_aether'], code
  wrapper.call dummyContext, aether
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
