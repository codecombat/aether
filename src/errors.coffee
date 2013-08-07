

module.exports.commonMethods = commonMethods = ['moveRight', 'moveLeft', 'moveUp', 'moveDown', 'attackNearbyEnemy', 'say', 'move', 'attackNearestEnemy', 'shootAt', 'rotateTo', 'shoot', 'distance', 'getNearestEnemy', 'getEnemies', 'attack', 'setAction', 'setTarget', 'getFriends', 'patrol']  # TODO: should be part of user configuration

module.exports.UserCodeError = class UserCodeError extends Error
  @className: "UserCodeError"
  constructor: (@message, properties) ->
    super message
    # Can specify things like thangID, thangSpriteName, methodName, methodType, code, recoverable, lineNumber, column
    for own key, val of properties
      @[key] = val
    if @lineNumber?
      if @message.search(/^Line \d+/) != -1
        @message = @message.replace /^Line \d+/, (match, n) => "Line #{@lineNumber}"
      else
        @message = "Line #{@lineNumber}: #{@message}"
    @name = "UserCodeError"
    @key = (if @methodType is 'instance' then @thangID else @thangSpriteName) + "|" + @methodName + "|" + @message
    if Error.captureStackTrace?
      Error.captureStackTrace @, @constructor

  serialize: () ->
    o = {}
    for own key, value of @
      o[key] = value
    o

  @getAnonymousErrorPosition: (error) ->
    # Cross-browser stack trace libs like TraceKit throw away the eval line number, as it's inline with another line number. And only Chrome gives the anonymous line number. So we don't actually need a cross-browser solution.
    return {lineNumber: error.lineNumber, column: error.column} if error.lineNumber  # useful?
    stack = error.stack
    return {} unless stack
    lines = stack.split('\n')
    for line, i in lines
      continue unless line.indexOf("Object.eval") != -1
      lineNumber = line.match(/<anonymous>:(\d+):/)?[1]
      column = line.match(/<anonymous>:\d+:(\d+)/)?[1]
      lineNumber = parseInt lineNumber if lineNumber?
      column = parseInt column if column?
      chromeVersion = parseInt navigator?.appVersion?.match(/Chrome\/(\d+)\./)[1] or "28", 10
      if chromeVersion >= 28
        lineNumber -= 1  # Apparently the indexing has changed in version 28
      #console.log "Parsed", lineNumber, column, "from stack", stack
      return {lineNumber: lineNumber, column: column}
    #console.log "Couldn't parse stack:", stack
    return {}

  @explainErrorMessage: (error, thang=null) ->
    m = error.toString()
    if m is "RangeError: Maximum call stack size exceeded"
      m += ". (Did you use #{methodName}() recursively?)"

    missingMethodMatch = m.match /has no method '(.*?)'/
    if missingMethodMatch
      method = missingMethodMatch[1]
      [closestMatch, closestMatchScore] = ['Murgatroyd Kerfluffle', 0]
      explained = false
      for commonMethod in commonMethods
        if method is commonMethod
          m += ". (#{missingMethodMatch[1]} not available in this challenge.)"
          explained = true
          break
        else if method.toLowerCase() is commonMethod.toLowerCase()
          m = "#{method} should be #{commonMethod} because JavaScript is case-sensitive."
          explained = true
          break
        else
          matchScore = string_score?.score commonMethod, method, 0.5
          if matchScore > closestMatchScore
            [closestMatch, closestMatchScore] = [commonMethod, matchScore]
      unless explained
        if closestMatchScore > 0.25
          m += ". (Did you mean #{closestMatch}?)"

      m = m.replace 'TypeError:', 'Error:'
      if thang
        m = m.replace "Object #<Object>", thang.id

    m
