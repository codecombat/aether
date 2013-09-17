Aether = require '../aether'

describe "Linting Test Suite", ->
  describe "Default linting", ->
    aether = new Aether()
    it "should warn about missing semicolons", ->
      code = "var bandersnatch = 'frumious'"
      warnings = aether.lint(code).warnings
      expect(warnings.length).toEqual 1
      expect(warnings[0].message).toEqual 'Missing semicolon.'

  describe "Custom lint levels", ->
    it "should allow ignoring of warnings", ->
      options = problems: {jshint_W033: {level: 'ignore'}}
      aether = new Aether options
      code = "var bandersnatch = 'frumious'"
      warnings = aether.lint(code).warnings
      expect(warnings.length).toEqual 0
