_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

serializeVariableValue = (value, depth=0) ->
  return value unless value
  return "<Function>" if _.isFunction value
  value = value.__aetherAPIValue if value.__aetherAPIValue
  return value.serializeForAether() if not depth and value.serializeForAether
  isArray = _.isArray(value)
  if isArray or _.isPlainObject(value)
    # TODO: this string-based approach doesn't let us get into any nested properties.
    brackets = if isArray then ["[", "]"] else ["{", "}"]
    size = _.size value
    return brackets.join "" unless size
    return "#{brackets[0]}... #{size} items ...#{brackets[1]}" if depth > 0
    max = 5
    values = []
    if isArray
      values = ("" + serializeVariableValue(v, depth + 1) for v in value[0 ... max])
    else
      for key, v of value
        break if values.length > max
        values.push key + ": " + serializeVariableValue(v, depth + 1)
    values.push "(... #{size - max} more)" if size > max
    return "#{brackets[0]}\n  #{values.join '\n  '}\n#{brackets[1]}"
  else if value.toString
    return value.toString()
  value

module.exports.logStatementStart = logStatementStart = (@lastStatementRange) ->

module.exports.logStatement = logStatement = (range, userInfo, captureFlow) ->
  @lastStatementRange = null
  if @options.includeMetrics or @options.executionLimit
    m = (@metrics.statements ?= {})[range[0].ofs + "-" + range[1].ofs] ?= {}
    m.executions ?= 0
    ++m.executions
    @metrics.statementsExecuted ?= 0
    @metrics.statementsExecuted += 1
    @metrics.statementsExecutedThisCall += 1
    if @metrics.statementsExecutedThisCall > @options.executionLimit
      error = new Error "Hard execution limit of #{@options.executionLimit} exceeded."
      error.name = "ExecutionLimitExceededError"
      error.userInfo = userInfo
      throw error
  if flopt = @options.includeFlow
    call = _.last @callStack
    ++call.statementsExecuted
    if captureFlow
      if @options.skipDuplicateUserInfoInFlow
        # Mad hackery to only track the latest statement called in a frame, especially if the userInfo is just like, {time: 1.5}
        if lastStatement = _.last call.statements
          if lastStatement.userInfo?.time?
            duplicate = userInfo.time is lastStatement.userInfo.time
          else
            duplicate = _.isEqual lastStatement.userInfo, userInfo
          if duplicate
            lastStatement.range = range
            return
      state =
        range: range
        #userInfo: _.cloneDeep userInfo  # Slower
        userInfo: _.clone userInfo  # Less robust, but faster; so far we only do single-level, like {time: 1.5}
      unless @options.noVariablesInFlow
        variables = {}
        for name, value of @vars
          # TODO: We should probably only store changes, not full copies every time.
          if @options.noSerializationInFlow
            variables[name] = value
          else
            variables[name] = serializeVariableValue value
        state.variables = variables
      call.statements.push state
  #console.log "Logged statement", range, "'#{source}'", "with userInfo", userInfo#, "and now have metrics", @metrics

module.exports.logCallStart = logCallStart = (userInfo) ->
  @vars ?= {}
  call = {statementsExecuted: 0, statements: [], userInfo: _.cloneDeep userInfo}
  (@callStack ?= []).push call
  if @options.includeMetrics
    @metrics.callsExecuted ?= 0
    ++@metrics.callsExecuted
    @metrics.maxDepth = Math.max(@metrics.maxDepth or 0, @callStack.length)
    @metrics.statementsExecutedThisCall = 0 if @callStack.length is 1
  if @options.includeFlow
    if @callStack.length is 1
      ((@flow ?= {}).states ?= []).push call
      @vars = {}
    else
      3
      # TODO: Nest the current call into the parent call? Otherwise it's just thrown away.
  #console.log "Logged call to", @options.functionName, @metrics, @flow

module.exports.logCallEnd = logCallEnd = ->
  @callStack?.pop()
