execution = require './execution'

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
