Aether = require '../aether'

describe "CS test Suite!", ->
  describe "CS compilation", ->
    aether = new Aether language: "coffeescript"
    it "Should compile functions", ->
      code = """
        return 1000
      """
      aether.transpile(code)
      expect(aether.run()).toEqual 1000

  describe "CS compilation with lang set after contruction", ->
    aether = new Aether()
    it "Should compile functions", ->
      code = """
      return 2000 if false
      return 1000
      """
      aether.setLanguage "coffeescript"
      aether.transpile(code)

      expect(aether.canTranspile(code)).toEqual true

  describe "CS Test Spec #1", ->
    aether = new Aether language: "coffeescript"
    it "mathmetics order", ->
      code = "
        return (2*2 + 2/2 - 2*2/2)
      "
      aether.transpile(code)
      expect(aether.run()).toEqual 3

  describe "CS Test Spec #2", ->
    aether = new Aether language: "coffeescript"
    it "function call", ->
      code = """
      fib = (n) ->
        (if n < 2 then n else fib(n - 1) + fib(n - 2))
      chupacabra = fib(6)
      """
      aether.transpile(code)
      fn = aether.createFunction()
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual 8 # fail
