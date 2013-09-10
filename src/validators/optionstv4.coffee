tv4 = require 'tv4'

module.exports = (options) ->
	tv4.validate options, 
		title: "Aether options"
		type: "object"
		properties:
			thisValue:
				type: 'boolean'
				description:'placeholder'
			global:
				type: 'array'
				description:'placeholder'
			functionName:
				type: 'string'
				description:'placeholder'
			functionParameters:
				type: 'array'
				description:'placeholder'
			yieldAutomatically:
				type: 'boolean'
				description:'placeholder'
			yieldConditionally:
				type: 'boolean'
				description:'placeholder'
			requiresThis:
				type:'boolean'
				description:'Whether leaving off "this" is an error, or just a warning which we work around.'
			executionCosts:
				type:'object'
				description:'placeholder'
			language:
				type: 'string'
				description:'Input language'
				minItems: 1
				oneOf:[
					'javascript'
				]
			languageVersion:
				type: 'string'
				description: "Input language version"
				minItems: 1
				oneOf: [
					"ES5",
					"ES6"
				]
			problems:
				description:"placeholder"
			includeFlow:
				type: "boolean"
				description:"placeholder"

			includeMetrics:
				type: "boolean"
				description:"placeholder"

			includeStyle:
				type: "boolean"
				description:"placeholder"



		required: ["requiresThis","includeFlow","includeMetrics","includeStyle"]



