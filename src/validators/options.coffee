revalidator = require 'revalidator'

module.exports = (options) ->
  revalidator.validate options,
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
        type: 'boolean'
        default: true
      includeMetrics:
        type: 'boolean'
        default: true
      includeStyle:
        type: 'boolean'
        default: true