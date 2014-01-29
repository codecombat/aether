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

# Used to match regexp flags from their coerced string values.
reFlags = /\w*$/

# Hacky reimplementation of lodash's cloneDeep, minus the parts we don't need, plus limiting clones to apiProperties.
module.exports.createAPIClone = createAPIClone = (value) ->
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

  # Check for circular references and return corresponding clone.
  return clone if clone = value.__aetherAPIClone
  return value if value.__aetherAPIValue

  if isArr = _.isArray value
    result = ctor value.length
    # Add array properties assigned by RegExp.exec.
    result.index = value.index if value.hasOwnProperty "index"
    result.input = value.input if value.hasOwnProperty "input"
  else
    result = {}

  # Add the source value to the stack of traversed objects and associate it with its clone.
  # Object.defineProperty defaults to non-configurable, non-enumerable, non-writable.
  Object.defineProperty value, "__aetherAPIClone", value: result
  Object.defineProperty result, "__aetherAPIValue", value: value

  # Recursively populate clone (susceptible to call stack limits) with non-configurable, non-writable properties.
  if isArr
    result[i] = createAPIClone v for v, i in value
    #Object.freeze result  # Do we want to freeze arrays? Maybe not; caused bug with defining __aetherAPIClone.
  else if value.apiProperties
    for prop in value.apiMethods ? []
      # Make a version of the function that calls itself on the original, and only if allowed.
      do (prop) ->
        fn = ->
          throw new Error "Calling #{prop} is not allowed." unless value._aetherAPIMethodsAllowed
          value[prop].apply value, arguments
        Object.defineProperty result, prop, value: fn, enumerable: true
    for prop in value.apiProperties
      do (prop) ->
        # Accessing a property on the clone will get the value from the original.
        fn = -> createAPIClone value[prop]
        Object.defineProperty result, prop, get: fn, enumerable: true
  else
    # Hmm, should we protect normal objects?
    #result[k] = createAPIClone(v) for own k, v of value
    Object.defineProperty result, k, value: createAPIClone(v), enumerable: true for own k, v of value

  result

# Hmm; this will make it so that if we are, say, passing an array or object around, even if it doesn't have an API,
# then modifications to the contents will be ignored after clone restoration. Is this bad?
module.exports.restoreAPIClone = restoreAPIClone = (value) ->
  return value unless _.isObject value
  className = Object::toString.call value
  return value unless cloneableClasses[className]
  return value if className in [boolClass, dateClass, numberClass, stringClass, regexpClass]
  return source if source = value.__aetherAPIValue

  # We now have a new array/object that may contain some clones, so let's recurse to find them.
  if isArr = _.isArray value
    result = (restoreAPIClone v for v in value)
  else
    result = {}
    result[k] = restoreAPIClone v for k, v of value
  result
