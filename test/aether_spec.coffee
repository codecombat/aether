Aether = require '../aether'

describe "Aether", ->
  describe "Basic tests", ->
    it "doesn't immediately break", ->
      aether = new Aether()
      code = "var x = 3;"
      expect(aether.canTranspile(code)).toEqual true

    it "running functions isn't broken horribly", ->
      aether = new Aether()
      code = "return 1000;"
      aether.transpile(code)
      expect(aether.run()).toEqual 1000

  describe "Transpile heuristics", ->
    aether = null
    beforeEach ->
      aether = new Aether()
    it "Compiles a blank piece of code", ->
      raw = ""
      expect(aether.canTranspile(raw)).toEqual true
