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

    it "Shouldn't die on more invalid crazy code", ->
      code = """
        var coins = {'emerald': []};
        coins.'emerald'.push({type: 'emerald', bountyGold: 5});
      """
      aether = new Aether {}
      expect(-> aether.transpile(code)).not.toThrow()
      aether.run()
      expect(aether.problems.errors.length).toBeGreaterThan 0
      problem = aether.problems.errors[0]
      expect(problem.type).toEqual 'transpile'
      expect(problem.level).toEqual 'error'

    it "Should hard-cap execution to break infinite loops.", ->
      code = """
        while(true) {
          ;
        }
      """
      aether = new Aether {executionLimit: 9001}
      aether.transpile(code)
      aether.run()
      expect(aether.problems.errors.length).toBeGreaterThan 0
      problem = aether.problems.errors[0]
      expect(problem.type).toEqual 'runtime'
      expect(problem.level).toEqual 'error'

    it "Should hard-cap execution after a certain limit.", ->
      code = """
        for (var i = 0; i < 1000; ++i) {}
        return 'mojambo';
      """
      aether = new Aether {executionLimit: 500}
      aether.transpile(code)
      expect(aether.run()).toBeUndefined()

    it "Shouldn't hard-cap execution too early.", ->
      code = """
        for (var i = 0; i < 1000; ++i) {}
        return 'mojambo';
      """
      aether = new Aether {executionLimit: 9001}
      aether.transpile(code)
      expect(aether.run()).toEqual 'mojambo'

    it "Should error on undefined property accesses.", ->
      code = """
        var bar = 'bar';
        var foobar = foo + bar;
        return foobar;
      """
      aether = new Aether functionName: 'foobarFactory'
      aether.transpile(code)
      expect(aether.run()).not.toEqual 'undefinedbar'
      expect(aether.run()).toEqual undefined
      expect(aether.problems.errors).not.toEqual []
      
  describe "Context-aware problems", ->
    it "Brak not defined", ->
      history = []
      log = (s) -> history.push s
      attack = -> history.push 'attack'
      selfValue = {say: log, attack: attack}
      code = """
      self.attack(Brak)
      """
      problemContext = stringReferences: ['Brak']
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: Brak is not defined")
      expect(aether.problems.errors[0].hint).toEqual("You may need quotes. Did you mean \"Brak\"?")

    it "attack not defined", ->
      history = []
      log = (s) -> history.push s
      attack = -> history.push 'attack'
      selfValue = {say: log, attack: attack}
      code = """
      attack
      """
      problemContext = thisMethods: [ 'log', 'attack' ]
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: attack is not defined")
      expect(aether.problems.errors[0].hint).toEqual("Did you mean self.attack()?")

    it "buildables not defined", ->
      history = []
      log = (s) -> history.push s
      attack = -> history.push 'attack'
      selfValue = {say: log, attack: attack}
      code = """
      b = buildables
      """
      problemContext = thisProperties: [ 'buildables' ]
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: buildables is not defined")
      expect(aether.problems.errors[0].hint).toEqual("Did you mean self.buildables?")

    it "Call non-this undefined function x()", ->
      history = []
      log = (s) -> history.push s
      attack = -> history.push 'attack'
      selfValue = {say: log, attack: attack}
      code = """x()"""
      problemContext = thisMethods: [ 'log', 'attack' ]
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: x is not defined")
      expect(aether.problems.errors[0].range).toEqual([ { ofs: 0, row: 0, col: 0 }, { ofs: 1, row: 0, col: 1 } ])

    it "Call this-defined function attack() without this", ->
      history = []
      log = (s) -> history.push s
      attack = -> history.push 'attack'
      selfValue = {say: log, attack: attack}
      code = """attack()"""
      problemContext = thisMethods: [ 'log', 'attack' ]
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(2)
      expect(aether.problems.errors[0].message).toEqual("Missing `self` keyword; should be `self.attack`.")
      expect(aether.problems.errors[0].range).toEqual([ { ofs: 0, row: 0, col: 0 }, { ofs: 8, row: 0, col: 8 } ])
      expect(aether.problems.errors[1].message).toEqual("Line 1: ReferenceError: attack is not defined")
      expect(aether.problems.errors[1].range).toEqual([ { ofs: 0, row: 0, col: 0 }, { ofs: 6, row: 0, col: 6 } ])

    xit "undefined is not a function", ->
      # TODO: this behaves differently in production
      selfValue = {}
      code = """
      this.attack("Brak");
      """
      problemContext = commonThisMethods: ['attack']
      aether = new Aether problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("Line 1: undefined is not a function")

    it "Incomplete 'this' and unavailable method", ->
      selfValue = {}
      code = """
      self.moveUp
      """
      problemContext = commonThisMethods: ['moveUp']
      aether = new Aether language: 'python', problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("self.moveUp is not currently unavailable.")

    it "Incomplete 'this' and available method", ->
      selfValue = {}
      code = """
      this.moveUp
      """
      problemContext = thisMethods: ['moveUp']
      aether = new Aether problemContext: problemContext
      aether.transpile code
      method = aether.createMethod selfValue
      aether.run method
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].message).toEqual("this.moveUp has no effect. It needs parentheses: this.moveUp()")

