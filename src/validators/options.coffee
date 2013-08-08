module.exports = (options) ->
  module = if json? then json else require('revalidator')
  module.validate options,
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
        'enum': ["ES5"] #change this later
      problems:
        required: false
