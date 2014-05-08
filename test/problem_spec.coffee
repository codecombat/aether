Aether = require '../aether'

describe "Problem Test Suite", ->
  describe "Runtime problems", ->
    it "Should capture runtime problems", ->
      # 0123456789012345678901234567
      code = """
        var methodName = 'explode';
        this[methodName]();
      """
      options =
        thisValue: {}
        problems: {jshint_W040: {level: "ignore"}}
      aether = new Aether options
      aether.transpile(code)
      aether.run()
      expect(aether.problems.errors.length).toEqual 1
      problem = aether.problems.errors[0]
      expect(problem.type).toEqual 'runtime'
      expect(problem.level).toEqual 'error'
      expect(problem.message).toMatch /has no method/
      expect(problem.range?.length).toEqual 2
      [start, end] = problem.range
      expect(start.ofs).toEqual 28
      expect(start.row).toEqual 1
      expect(start.col).toEqual 0
      expect(end.ofs).toEqual 46
      expect(end.row).toEqual 1
      expect(end.col).toEqual 18
      expect(problem.message).toMatch /Line 2/

    it "Shouldn't die on invalid crazy code", ->
      code = """
        if (true >== true){
          true;}
      """
      aether = new Aether {}
      aether.transpile(code)
      aether.run()
      expect(aether.problems.errors.length).toBeGreaterThan 0
      problem = aether.problems.errors[0]
      expect(problem.type).toEqual 'transpile'
      expect(problem.level).toEqual 'error'
