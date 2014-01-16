getOwnPropertyNames = Object.getOwnPropertyNames

copy = (source, target)->
  for name in getOwnPropertyNames source
    target[name] = source[name]

  return target

cloneBuiltin = (obj,name)->
  if not obj?
    throw name

  masked = {}
  copy obj, masked

  if obj::
    masked:: = {}
    copy obj::, masked::

  return masked


module.exports.copyBuiltin = copyBuiltin = (source, target)->
  copy source, target

  if source::
    copy source::, target::

global = (->this)()
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
