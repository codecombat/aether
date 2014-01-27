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
  className = Object.prototype.toString.call value
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

  if isArr = _.isArray value
    result = ctor value.length
    # Add array properties assigned by RegExp.exec.
    result.index = value.index if value.hasOwnProperty "index"
    result.input = value.input if value.hasOwnProperty "input"
  else
    result = {}

  # Add the source value to the stack of traversed objects and associate it with its clone.
  Object.defineProperty value, "__aetherAPIClone", configurable: false, enumerable: false, writable: false, value: result
  Object.defineProperty result, "__aetherAPIValue", configurable: false, enumerable: false, writable: false, value: value

  # Recursively populate clone (susceptible to call stack limits).
  if isArr
    result[i] = createAPIClone v for v, i in value
  else if value.apiProperties
    _.bindAll value, (prop for prop in value.apiProperties when _.isFunction value[prop])
    result[k] = createAPIClone value[k] for k in value.apiProperties
  else
    result[k] = createAPIClone v for own k, v of value
  #console.log "Cloned\n", value, "\n\ninto\n\n", result, "\n"
  result

# Hmm; this will make it so that if we are, say, passing an array or object around, even if it doesn't have an API,
# then modifications to the contents will be ignored after clone restoration. Is this bad?
module.exports.restoreAPIClone = restoreAPIClone = (value) ->
  return value unless _.isObject value
  className = Object.prototype.toString.call value
  return value unless cloneableClasses[className]
  return value if className in [boolClass, dateClass, numberClass, stringClass, regexpClass]
  #console.log "Restoring\n", value, "\n\nto\n\n", source, "\n" if source = value.__aetherAPIValue
  return source if source = value.__aetherAPIValue

  # We now have a new array/object that may contain some clones, so let's recurse to find them.
  if isArr = _.isArray value
    result = (restoreAPIClone v for v in value)
  else
    result = {}
    result[k] = restoreAPIClone v for k, v of value
  result
