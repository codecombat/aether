(function() {
  var defaults, execution;

  execution = require('./execution');

  module.exports = defaults = {
    thisValue: null,
    global: {
      Math: Math,
      parseInt: parseInt,
      parseFloat: parseFloat,
      "eval": eval,
      isNaN: isNaN,
      escape: escape,
      unescape: unescape
    },
    language: "javascript",
    languageVersion: "ES5",
    methodName: "foo",
    methodParameters: [],
    yieldAutomatically: false,
    yieldConditionally: false,
    executionCosts: execution
  };

}).call(this);
