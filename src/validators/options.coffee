module.exports = (options) ->
  module = if json? then json else require('revalidator')
  module.validate options,
    additionalProperties: false
    properties:
    	language:
    		type: 'string'
    		description: "Input language"
    		minLength:1
    		'enum': ['javascript']
    		required: false
    	problems:
    		required: false