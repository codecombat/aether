problems = require './problems'
execution = require './execution'
_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

module.exports = defaults =
  thisValue: null
  global: {Math: Math, parseInt: parseInt, parseFloat: parseFloat, eval: eval, isNaN: isNaN, escape: escape, unescape: unescape}
  language: "javascript"
  languageVersion: "ES5"
  methodName: "foo"  # in case we need it for error messages
  methodParameters: []  # or something like ["target"]
  yieldAutomatically: false  # horrible name... we could have it auto-insert yields after every statement
  yieldConditionally: false  # also bad name, but what it would do is make it yield whenever this._shouldYield is true (and clear it)
  executionCosts: execution

defaults.levels = _.cloneDeep problems
for category, categoryProblems of defaults.levels
  for problem, val of categoryProblems
    category[problem] = val.level
