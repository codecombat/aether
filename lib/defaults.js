(function() {
  var category, categoryProblems, defaults, execution, problem, problems, val, _, _ref;

  problems = require('./problems');

  execution = require('./execution');

  _ = require('lodash');

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

  _ref = defaults.levels;
  for (category in _ref) {
    categoryProblems = _ref[category];
    for (problem in categoryProblems) {
      val = categoryProblems[problem];
      category[problem] = val.level;
    }
  }

}).call(this);
