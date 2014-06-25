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

  describe "Basics", ->
    aether = new Aether language: "coffeescript"
    it "Simple For", ->
      code = """
      count = 0
      count++ for num in [1..10]
      return count
      """
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual 10

    it "Simple While", ->
      code = """
      count = 0
      count++ until count is 100
      return count
      """
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual 100

    it "Should Map", ->
      code = "return (num for num in [10..1])"

      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

    it "Should Map properties", ->
      code = '''
      yearsOld = max: 10, ida: 9, tim: 11
      ages = for child, age of yearsOld
        #{child} is #{age}'
      return ages
      '''
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual ["max is 10", "ida is 9", "tim is 11"]

    it "Should compile empty function", ->
      code = """
        func = () ->
        return typeof func
        """
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual 'function'

    it "Should compile objects", ->
      code = """
        singers = {Jagger: 'Rock', Elvis: 'Roll'}
        return singers
      """
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual ({Jagger: 'Rock', Elvis: 'Roll'})

    it "Should compile classes", ->
      code = """
      class MyClass
        test: ->
          return 1000
      myClass = new MyClass()
      return myClass.test()
      """
      aether.transpile(code)
      expect(aether.canTranspile(code)).toEqual true
      expect(aether.run()).toEqual 1000
