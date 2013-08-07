(function() {
  var category, categoryProblems, defaults, execution, problem, problems, val, _, _ref, _ref1, _ref2, _ref3;

  problems = require('./problems');

  execution = require('./execution');

  _ = (_ref = (_ref1 = (_ref2 = typeof window !== "undefined" && window !== null ? window._ : void 0) != null ? _ref2 : typeof self !== "undefined" && self !== null ? self._ : void 0) != null ? _ref1 : typeof global !== "undefined" && global !== null ? global._ : void 0) != null ? _ref : require('lodash');

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

  defaults.levels = _.cloneDeep(problems);

  _ref3 = defaults.levels;
  for (category in _ref3) {
    categoryProblems = _ref3[category];
    for (problem in categoryProblems) {
      val = categoryProblems[problem];
      category[problem] = val.level;
    }
  }

}).call(this);
