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
      functionName:
        type: 'string'
      functionParameters:
        type: ['array', 'undefined']
      yieldAutomatically:
        type: 'boolean'
      yieldConditionally:
        type: 'boolean'
      executionCosts:
        type: 'object'
      executionLimit:
        type: 'integer'
        minimum: 0
        description: 'If given and non-zero, user code will throw execution exceeded errors after using too many statements.'
      language:
        type: 'string'
        description: "Input language"
        minLength:1
        'enum': ['javascript', 'coffeescript', 'clojure', 'lua', 'python', 'io']
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
        type: ['object', 'undefined']
      includeFlow:
        type: 'boolean'
        default: true
        description: "Whether to record control flow and variable values as user code executes."
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
