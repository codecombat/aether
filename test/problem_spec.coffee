Aether = require '../aether'

describe "Problem Test Suite", ->
  describe "Transpile problems", ->
    it "missing a closing quote: self.attack('Brak)", ->
      code = """
      self.attack('Brak) 
      """
      aether = new Aether language: 'python'
      aether.transpile code
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unterminated string constant")
      expect(aether.problems.errors[0].hint).toEqual("Missing a quote character. Did you mean 'Brak'?")

    it "missing a closing quote: s = \"hi", ->
      code = """
      s = "hi
      """
      aether = new Aether language: 'python'
      aether.transpile code
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unterminated string constant")
      expect(aether.problems.errors[0].hint).toEqual("Missing a quote character. Did you mean \"hi\"?")

    it "missing a closing quote: '", ->
      code = """
      '
      """
      aether = new Aether language: 'python'
      aether.transpile code
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unterminated string constant")
      expect(aether.problems.errors[0].hint).toEqual("Missing a quote character. Did you mean ''?")

    it "Unexpected indent", ->
      code = """
      x = 5
        y = 7
      """
      aether = new Aether language: 'python'
      aether.transpile code
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unexpected indent")
      expect(aether.problems.errors[0].hint).toEqual("Lines need same indentation?")

    xit "missing a closing quote: s = \"hi", ->
      # https://github.com/codecombat/aether/issues/113
      code = """
      var s = "hi
      """
      aether = new Aether
      aether.transpile code
      expect(aether.problems.errors.length).toEqual(3)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unclosed string.")
      expect(aether.problems.errors[0].hint).toEqual("You may be missing a closing quote character. Did you mean \"hi\"?")

    it "Unexpected token 'self move'", ->
      code = """
      self move
      """
      problemContext = thisMethods: [ 'moveUp']
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unexpected token")
      expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveUp()?")

    it "Unexpected token 'self self.move'", ->
      code = """
      self self.move
      """
      problemContext = thisMethods: [ 'moveUp']
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      expect(aether.problems.errors.length).toEqual(2)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unexpected token")
      expect(aether.problems.errors[0].hint).toEqual("Remove extra self")

    it "Unexpected token 'self.moveUp())'", ->
      code = """
      self.moveUp())
      """
      problemContext = thisMethods: [ 'moveUp']
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unexpected token")
      expect(aether.problems.errors[0].hint).toEqual("Remove extra )")

    it "Unexpected token 'self.moveUp()self.moveDown()'", ->
      code = """
      self.moveUp()self.moveDown()
      """
      problemContext = thisMethods: [ 'moveUp', 'moveDown']
      aether = new Aether language: "python", problemContext: problemContext
      aether.transpile(code)
      expect(aether.problems.errors.length).toEqual(1)
      expect(aether.problems.errors[0].type).toEqual('transpile')
      expect(aether.problems.errors[0].message).toEqual("Unexpected token")
      expect(aether.problems.errors[0].hint).toEqual("Put each command on a separate line")

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

  describe "problemContext", ->
    # NOTE: the problemContext tests are roughly in the order they're checked in the code

    describe "General", ->

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
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: x is not defined")
        expect(aether.problems.errors[0].hint).toEqual("")
        expect(aether.problems.errors[0].range).toEqual([ { ofs: 0, row: 0, col: 0 }, { ofs: 1, row: 0, col: 1 } ])

      it "loop is not defined", ->
        code = "loop"
        aether = new Aether language: "python", simpleLoops: true
        aether.transpile code
        aether.run()
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: loop is not defined")
        expect(aether.problems.errors[0].hint).toEqual("You are missing a `:` after `loop`.")

      it "loop is not defined w/ newline", ->
        code = """
        loop
        x = 5
        """
        aether = new Aether language: "python", simpleLoops: true
        aether.transpile code
        aether.run()
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: loop is not defined")
        expect(aether.problems.errors[0].hint).toEqual("You are missing a `:` after `loop`.")

      it "loop is not defined w/o simpleLoops", ->
        code = "loop"
        aether = new Aether language: "python"
        aether.transpile code
        method = aether.createMethod
        aether.run()
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: loop is not defined")
        expect(aether.problems.errors[0].hint).toEqual("")

    describe "No function", ->

      it "Exact thisMethods", ->
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

      it "Case thisMethods", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        Attack
        """
        problemContext = thisMethods: [ 'log', 'attack', 'tickle' ]
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: Attack is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.attack()?")

      it "Exact commonThisMethods", ->
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
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'attack'")
        expect(aether.problems.errors[0].hint).toEqual("attack is not available in this challenge.")

      it "Exact commonThisMethods #2", ->
        selfValue = {}
        code = """
        self.moveRight()
        """
        problemContext = thisMethods: ['moveUp', 'moveLeft'], commonThisMethods: ['moveRight']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'moveRight'")
        expect(aether.problems.errors[0].hint).toEqual("moveRight is not available in this challenge.")

      it "Case commonThisMethods", ->
        selfValue = {}
        code = """
        self.moveup()
        """
        problemContext = commonThisMethods: ['moveUp']
        aether = new Aether language: 'python', problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'moveup'")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean moveUp? It is not available in this challenge.")

      it "Score commonThisMethods", ->
        selfValue = {}
        code = """
        self.movright()
        """
        problemContext = thisMethods: ['moveUp', 'moveLeft'], commonThisMethods: ['moveRight']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'movright'")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean moveRight? It is not available in this challenge.")

      it "Score commonThisMethods #2", ->
        selfValue = {}
        code = """
        this.movright()
        """
        problemContext = thisMethods: ['moveUp', 'moveLeft'], commonThisMethods: ['moveRight']
        aether = new Aether problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'movright'")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean moveRight? It is not available in this challenge.")

    describe "ReferenceError", ->

      it "Exact stringReferences", ->
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
        expect(aether.problems.errors[0].hint).toEqual("Missing quotes. Try \"Brak\"")

      it "Exact thisMethods", ->
        selfValue = {}
        code = """
        moveleft
        """
        problemContext = thisMethods: ['moveRight', 'moveLeft', 'moveUp', 'moveDown']
        aether = new Aether language: 'python', problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: moveleft is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveLeft()?")

      it "Exact thisMethods with range checks", ->
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

      it "Exact thisProperties", ->
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

      it "Case this value", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, moveRight: attack}
        code = """
        sElf.moveRight()
        """
        problemContext = thisMethods: ['moveRight']
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: sElf is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Capitilization problem? Try self")

      it "Case stringReferences", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        self.attack(brak)
        """
        problemContext = stringReferences: ['Bob', 'Brak', 'Zort']
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: brak is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Missing quotes.  Try \"Brak\"")

      it "Case thisMethods", ->
        selfValue = {}
        code = """
        this.moveright();
        """
        problemContext = thisMethods: ['moveUp', 'moveRight', 'moveLeft']
        aether = new Aether problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'moveright'")
        expect(aether.problems.errors[0].hint).toEqual("Capitilization problem? Try this.moveRight()")

      it "Case thisProperties", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        b = Buildables
        """
        problemContext = thisProperties: [ 'buildables' ]
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: Buildables is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.buildables?")

      it "Score this value", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        elf.moveDown()
        """
        problemContext = thisMethods: [ 'moveDown' ]
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: elf is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self?")

      it "Score stringReferences", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        self.attack(brOk)
        """
        problemContext = stringReferences: ['Bob', 'Brak', 'Zort']
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: brOk is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Missing quotes. Try \"Brak\"")

      it "Score thisMethods", ->
        selfValue = {}
        code = """
        self.moveEight()
        """
        problemContext = thisMethods: ['moveUp', 'moveRight', 'moveLeft']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual("runtime")
        expect(aether.problems.errors[0].message).toEqual("Line 1: Object #<Object> has no method 'moveEight'")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveRight()?")

      it "Score thisMethods #2", ->
        selfValue = {}
        code = """
        movleft
        """
        problemContext = thisMethods: ['moveRight', 'moveLeft', 'moveUp', 'moveDown']
        aether = new Aether language: 'python', problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: movleft is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveLeft()?")

      it "Score thisMethods #3", ->
        selfValue = {}
        code = """
        moveeft
        """
        problemContext = thisMethods: ['moveRight', 'moveLeft', 'moveUp', 'moveDown']
        aether = new Aether language: 'python', problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: moveeft is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveLeft()?")

      it "Score thisProperties", ->
        history = []
        log = (s) -> history.push s
        attack = -> history.push 'attack'
        selfValue = {say: log, attack: attack}
        code = """
        b = Bildaables
        """
        problemContext = thisProperties: [ 'buildables' ]
        aether = new Aether language: "python", problemContext: problemContext
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: Bildaables is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.buildables?")

      it "Exact commonThisMethods", ->
        selfValue = {}
        code = """
        attack()
        """
        problemContext = thisMethods: [], commonThisMethods: ['attack']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual('runtime')
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: attack is not defined")
        expect(aether.problems.errors[0].hint).toEqual("attack is not available in this challenge.")

      it "Case commonThisMethods", ->
        selfValue = {}
        code = """
        ATTACK()
        """
        problemContext = thisMethods: [], commonThisMethods: ['attack']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual('runtime')
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: ATTACK is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean attack? It is not available in this challenge.")

      it "Score commonThisMethods", ->
        selfValue = {}
        code = """
        atac()
        """
        problemContext = thisMethods: [], commonThisMethods: ['attack']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual('runtime')
        expect(aether.problems.errors[0].message).toEqual("Line 1: ReferenceError: atac is not defined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean attack? It is not available in this challenge.")

    describe "Missing property", ->
      it "self.self.moveUp()", ->
        selfValue = {}
        code = """
        self.self.moveUp()
        """
        problemContext = thisMethods: ['moveUp'], commonThisMethods: ['attack']
        aether = new Aether problemContext: problemContext, language: 'python'
        aether.transpile code
        method = aether.createMethod selfValue
        aether.run method
        expect(aether.problems.errors.length).toEqual(1)
        expect(aether.problems.errors[0].type).toEqual('runtime')
        expect(aether.problems.errors[0].message).toEqual("Line 1: Cannot call method 'moveUp' of undefined")
        expect(aether.problems.errors[0].hint).toEqual("Did you mean self.moveUp()?")

    describe "transforms.makeCheckIncompleteMembers", ->

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
        expect(aether.problems.errors[0].hint).toEqual("")
