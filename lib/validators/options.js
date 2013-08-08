(function() {
  module.exports = function(options) {
    var module;
    module = typeof json !== "undefined" && json !== null ? json : require('revalidator');
    return module.validate(options, {
      additionalProperties: false,
      properties: {
        language: {
          type: 'string',
          description: "Input language",
          minLength: 1,
          'enum': ['javascript'],
          required: false
        },
        problems: {
          required: false
        }
      }
    });
  };

}).call(this);
