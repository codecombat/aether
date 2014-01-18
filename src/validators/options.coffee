tv4 = require('tv4').tv4

module.exports = (options) ->
  tv4.validateMultiple options,
    "type": "object"
    additionalProperties: false
    properties:
      thisValue:
        required: false
      global:
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
      requiresThis:
        type: 'boolean'
        default: true
        description: 'Whether leaving off "this" is an error, or just a warning which we work around.'
      executionCosts:
        required: false
      language:
        type: 'string'
        description: "Input language"
        minLength:1
        'enum': ['javascript']
        required: false
      languageVersion:
        type: 'string'
        description: "Input language version"
        minLength:1
        'enum': ["ES5", "ES6"] #change this later
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
      includeMetrics:
        type: 'boolean'
        default: true
      includeStyle:
        type: 'boolean'
        default: true
      includeVisualization:
        type: 'boolean'
        default: false
