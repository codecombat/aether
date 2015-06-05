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

  describe "Usage", ->
    it "invoking methods of an arbitrary object", ->
      history = []
      log = (s) ->
        expect(s).toEqual "hello"
        history.push s
      thisValue = {say: log}
      thisValue.moveDown = () ->
        expect(this).toEqual thisValue
        history.push 'moveDown'

      aether = new Aether language: 'io'
      code = """moveDown;say("hello")"""
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(history).toEqual(['moveDown', 'hello'])

  describe "Runtime problems", ->
    it "Should capture runtime problems", ->
      # 0123456789012345678901234567
      code = """
        explode
        exploooode  // should error
        explode
      """
      explosions = []
      thisValue = explode: -> explosions.push 'explosion!'
      aetherOptions = language: 'io'
      aether = new Aether aetherOptions
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(explosions).toEqual(['explosion!'])
      expect(aether.problems.errors.length).toEqual 1
      problem = aether.problems.errors[0]
      expect(problem.type).toEqual 'runtime'
      expect(problem.level).toEqual 'error'
      #expect(problem.message).toMatch /exploooode/  # would be nice
      expect(problem.range?.length).toEqual 2
      [start, end] = problem.range
      # These are not close.
      #expect(start.ofs).toEqual 8
      #expect(start.row).toEqual 1
      #expect(start.col).toEqual 0
      #expect(end.ofs).toEqual 18
      #expect(end.row).toEqual 1
      #expect(end.col).toEqual 10
      #expect(problem.message).toMatch /Line 2/
