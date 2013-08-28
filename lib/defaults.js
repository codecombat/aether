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
    functionName: null,
    functionParameters: [],
    yieldAutomatically: false,
    yieldConditionally: false,
    requiresThis: true,
    executionCosts: execution,
    includeFlow: true,
    includeMetrics: true,
    includeStyle: true
  };

}).call(this);
