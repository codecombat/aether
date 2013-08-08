(function() {
  module.exports = function(options) {
    var module;
    module = typeof json !== "undefined" && json !== null ? json : require('revalidator');
    return module.validate(options, {
      additionalProperties: false,
      properties: {
        thisValue: {
          required: false
        },
        global: {
          required: false
        },
        functionName: {
          required: false
        },
        functionParameters: {
          required: false
        },
        yieldAutomatically: {
          required: false
        },
        yieldConditionally: {
          required: false
        },
        executionCosts: {
          required: false
        },
        language: {
          type: 'string',
          description: "Input language",
          minLength: 1,
          'enum': ['javascript'],
          required: false
        },
        languageVersion: {
          type: 'string',
          description: "Input language version",
          minLength: 1,
          'enum': ["ES5"]
        },
        problems: {
          required: false
        }
      }
    });
  };

}).call(this);
