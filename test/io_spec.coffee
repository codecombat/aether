Aether = require '../aether'

aether = new Aether language: "io"

ioEval = (code, that) ->
  aether.reset()
  aether.transpile(code)
  return aether.run()

describe "Io test suite", ->
  describe "Basics", ->
    it "should return 1000", ->
      expect(ioEval("""1000""")).toBe(1000)

    it "should return the value of the alternative branch", ->
      expect(ioEval("""if(false, 1000, 2000)""")).toBe(2000)

    it "should evaluate operators with the right precedence", ->
      expect(ioEval("""1 + 2 * 3""")).toBe(7)

    it "factorial function", ->
      expect(ioEval("""fact := method(n, if (n == 0, 1, n * fact (n - 1))); fact(5)""")).toBe(120)
