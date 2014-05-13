tv4 = require('tv4').tv4

module.exports = (options) ->
  tv4.validateMultiple options,
    "type": "object"
    additionalProperties: false
    properties:
      thisValue:
        required: false
      globals:
        type: 'array'
        required: false
      functionName:
        required: false
      functionParameters:
        required: false
      yieldAutomatically:
        type: 'boolean'
        required: false
      yieldConditionally:
        type: 'boolean'
        required: false
      executionCosts:
        required: false
      language:
        type: 'string'
        description: "Input language"
        minLength:1
        'enum': ['javascript', 'coffeescript', 'clojure', 'lua', 'python', 'io']
        required: false
      languageVersion:
        oneOf: [
          type: 'string'
          description: "Input language version"
          minLength:1
          'enum': ["ES5", "ES6"] #change this later
        ,
          type: ['null', 'undefined']
          description: "Input language version"
        ]
      problems:
        required: false
      includeFlow:
        oneOf: [
          type: 'boolean'
          default: true
          description: "If true, will record everything."
        ,
          type: 'object'
          description: "Limitations on what to record."
          properties:
            callIndex:
              type: 'integer'
              description: "If set, record flow only for the given call, not every call."
            statementIndex:
              type: 'integer'
              description: "If set, record flow only for the given statement within the given call."
            timelessVariables:
              type: 'array'
              description: "Record flow for these variables regardless of callIndex and statementIndex."
              items:
                type: 'string'
        ]
      noSerializationInFlow:
        type: 'boolean'
        default: false
      includeMetrics:
        type: 'boolean'
        default: true
      includeStyle:
        type: 'boolean'
        default: true
      protectAPI:
        type: 'boolean'
        default: false
        description: "Whether to clone/restore values coming in and out of user code to limit them to apiProperties."
