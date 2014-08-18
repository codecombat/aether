_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

# Object.toString result shortcuts and matching built-in constructors
ctorByClass = {}
argsClass = "[object Arguments]"
ctorByClass[arrayClass = "[object Array]"] = Array
ctorByClass[boolClass = "[object Boolean]"] = Boolean
ctorByClass[dateClass = "[object Date]"] = Date
ctorByClass[errorClass = "[object Error]"] = Error
ctorByClass[funcClass = "[object Function]"] = Function
ctorByClass[numberClass = "[object Number]"] = Number
ctorByClass[objectClass = "[object Object]"] = Object
ctorByClass[regexpClass = "[object RegExp]"] = RegExp
ctorByClass[stringClass = "[object String]"] = String

# Used to identify object classifications that we can clone.
cloneableClasses = {}
cloneableClasses[funcClass] = false
cloneableClasses[argsClass] = cloneableClasses[arrayClass] = cloneableClasses[boolClass] = cloneableClasses[dateClass] = cloneableClasses[numberClass] = cloneableClasses[objectClass] = cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true

# Increments for each object that is protected
#   because this is known (and can be faked from the user end)
#   we must only pass objects to the protection API that are
#   otherwise available to the user.
#
#   CSPRNG would mean that we could map anything we wanted without
#   any this problem -BUT- was avoided for performance reasons.
protectionIdCounter = 0

module.exports.protectionVersion = PROTECTION_VERSION = 0  # Old way of doing it, storing clone/value references on each other (which is insecure)
#module.exports.protectionVersion = PROTECTION_VERSION = 1  # New way of doing it, storing a mapping in each Aether instance (which can't share them globally)

# Used to match regexp flags from their coerced string values.
reFlags = /\w*$/

# Hacky reimplementation of lodash's cloneDeep, minus the parts we don't need, plus limiting clones to apiProperties.
module.exports.createAPIClone = createAPIClone = (aether, value) ->
  return value unless _.isObject value
  className = Object::toString.call value
  return value unless cloneableClasses[className]
  ctor = ctorByClass[className]
  switch className
    when boolClass, dateClass
      return new ctor +value
    when numberClass, stringClass
      return new ctor value
    when regexpClass
      result = ctor value.source, reFlags.exec(value)
      result.lastIndex = value.lastIndex
      return result

  if PROTECTION_VERSION is 0
    # Check for circular references and return corresponding clone.
    return clone if clone = value.__aetherAPIClone
    return value if value.__aetherAPIValue
  else  # PROTECTION_VERSION is 1
    if value.__aetherID?
      id = value.__aetherID
      return result if (result = aether.protectAPIValuesToClones[id])?
    else
      id = protectionIdCounter++
      Object.defineProperty value, '__aetherID', value: id

  if isArr = _.isArray value
    result = ctor value.length
    if className is regexpClass
      # Add array properties assigned by RegExp.exec.
      result.index = value.index if value.hasOwnProperty "index"
      result.input = value.input if value.hasOwnProperty "input"
  else
    result = {}

  if PROTECTION_VERSION is 0
    # Add the source value to the stack of traversed objects and associate it with its clone.
    # Object.defineProperty defaults to non-configurable, non-enumerable, non-writable.
    Object.defineProperty value, "__aetherAPIClone", value: result, writable: true, configurable: true
    Object.defineProperty result, "__aetherAPIValue", value: value
  else  # PROTECTION_VERSION is 1
    # Link the value and the clone together
    Object.defineProperty result, '__aetherID', value: id
    aether.protectAPIValuesToClones[id] = result
    aether.protectAPIClonesToValues[id] = value

  # Recursively populate clone (susceptible to call stack limits) with non-configurable, non-writable properties.
  if isArr
    result[i] = createAPIClone aether, v for v, i in value
    #Object.freeze result  # Do we want to freeze arrays? Maybe not; caused bug with defining __aetherAPIClone.
  else if value.apiProperties
    for prop in value.apiOwnMethods ? []
      # Make a version of the function that calls itself on the original, and only if allowed.
      do (prop) ->
        fn = ->
          throw new Error "Calling #{prop} is not allowed." unless value._aetherAPIOwnMethodsAllowed
          value[prop].apply value, arguments
        Object.defineProperty result, prop, value: fn, enumerable: true
    for prop in value.apiMethods ? []
      # Make a version of the function that calls itself on the original.
      do (prop) ->
        fn = ->
          value[prop].apply value, arguments
        Object.defineProperty result, prop, value: fn, enumerable: true
    for prop in value.apiUserProperties ? [] when not result[prop]?  # Don't redefine it if it's already done.
      result[prop] = createAPIClone aether, value[prop]  # Maybe we don't need to clone this?
    for prop in value.apiProperties when not result[prop]?  # Don't redefine it if it's already done.
      do (prop) ->
        # Accessing a property on the clone will get the value from the original.
        fn = ->
          createAPIClone aether, value[prop]
        Object.defineProperty result, prop, get: fn, enumerable: true
  else
    # Hmm, should we protect normal objects?
    #result[k] = createAPIClone(v) for own k, v of value
    Object.defineProperty result, k, value: createAPIClone(aether, v), enumerable: true for own k, v of value

  result

# Hmm; this will make it so that if we are, say, passing an array or object around, even if it doesn't have an API,
# then modifications to the contents will be ignored after clone restoration. Is this bad?
module.exports.restoreAPIClone = restoreAPIClone = (aether, value, depth=0) ->
  return value unless _.isObject value
  className = Object::toString.call value
  return value unless cloneableClasses[className]
  return value if className in [boolClass, dateClass, numberClass, stringClass, regexpClass]
  if PROTECTION_VERSION is 0
    return source if source = value.__aetherAPIValue
    return source if source = value.__aetherAPIClone?.__aetherAPIValue  # hack, but this helped in one case, not sure why
  else  # PROTECTION_VERSION is 1
    return source if (source = aether.protectAPIClonesToValues[value.__aetherID])?
    #return source if source = value.__aetherAPIClone?.__aetherAPIValue  # hack, but this helped in one case, not sure why
  return value if depth > 1  # hack, but I don't understand right now--when do we stop? can't recurse forever

  # We now have a new array/object that may contain some clones, so let's recurse to find them.
  # Use language-specific cloning in case we need a non-JS equivalent
  aether.language.cloneObj(value, (v) -> restoreAPIClone aether, v, depth + 1)
