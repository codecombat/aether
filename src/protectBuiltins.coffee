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
