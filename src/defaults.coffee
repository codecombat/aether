execution = require './execution'
_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

try
  Vector = eval("require('lib/world/vector')")  # haaaaaaaaaaaaaaa.... aaaaaaaaaaaack
catch error
  Vector = {}  # ugh

module.exports = defaults =
  thisValue: null  # TODO: don't use this. Aether doesn't use it at compile time and CodeCombat uses it just at runtime, and it makes cloning original options weird/unintuitive/slow.
  global: {Math: Math, parseInt: parseInt, parseFloat: parseFloat, eval: eval, isNaN: isNaN, escape: escape, unescape: unescape, _: _, Vector: Vector}
  language: "javascript"
  languageVersion: "ES5"
  functionName: null  # In case we need it for error messages
  functionParameters: []  # Or something like ["target"]
  yieldAutomatically: false  # Horrible name... we could have it auto-insert yields after every statement
  yieldConditionally: false  # Also bad name, but what it would do is make it yield whenever this._aetherShouldYield is true (and clear it)
  requiresThis: true  # Whether leaving off "this" is an error, or just a warning which we work around.
  executionCosts: execution
  includeFlow: true
  includeMetrics: true
  includeStyle: true
  includeVisualization: false
  protectAPI: false
