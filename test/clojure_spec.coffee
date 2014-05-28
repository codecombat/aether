Aether = require '../aether'

beforeEach ->
  @addMatchers toBeAUserCodeProblemOfType: (expected) ->
    @message = ->
      "Expected #{JSON.stringify(@actual)} to be a UserCodeProblem of type #{expected}."
    @actual.isUserCodeProblem is true and @actual.id is expected

describe 'Clojure test suite', ->
  describe 'Basic transpilation', ->
    aether = new Aether language: 'clojure'
    it 'should return 1000', ->
      code = '1000'
      aether.transpile(code)
      expect(aether.run()).toEqual 1000

  describe 'Functional tests', ->
    aether = new Aether language: 'clojure'
    it 'should compute the factorial of 10', ->
      code = '(#(reduce * (range 1 (inc %))) 10)'
      aether.transpile(code)
      expect(aether.run()).toEqual 3628800

    aether.reset()
    it 'should generate an ArityError UserCodeProblem if a function is passed the wrong number of arguments', ->
      code = '(#(do %) 2 3)'
      aether.transpile(code)
      aether.run()
      expect(aether.problems.errors[0]).toBeAUserCodeProblemOfType 'aether_ArityError'

    aether.reset()
    it 'should generate an ArgTypeError UserCodeProblem if a function is passed the wrong types of arguments', ->
      code = '(+ 1 2 "string")'
      aether.transpile(code)
      aether.run()
      expect(aether.problems.errors[0]).toBeAUserCodeProblemOfType 'aether_ArgTypeError'

    it 'should parse incomplete code in loose mode', ->
      aether.transpile('(clj->js (map inc [1 2 3')
      expect(aether.run()).toEqual [2, 3, 4]

  describe "Runtime problems", ->
    xit 'should error out on missing methods', ->
      code = """
        (.exploooode this)  ;; Should error
      """
      thisValue = explode: ->
      aetherOptions = language: 'clojure'
      aether = new Aether aetherOptions
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(aether.problems.errors.length).toEqual 1
      if problem = aether.problems.errors[0]
        expect(problem.type).toEqual 'runtime'
        expect(problem.level).toEqual 'error'
        expect(problem.message).toMatch /exploooode/

    xit "should capture runtime problems", ->
      # 0123456789012345678901234567
      code = """
        (.moveXY this 30 26)
        (.exploooode this 3)   ;; Should error
        (.attackXY this 46 5)  ;; Shouldn't run
      """
      moves = []
      attacks = []
      thisValue =
        moveXY: (x, y) -> moves.push {x: x, y: y}
        attackXY: (x, y) -> attacks.push {x: x, y: y}
      aetherOptions = language: 'clojure'
      aether = new Aether aetherOptions
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(moves).toEqual([{x: 30, y: 26}])
      expect(attacks).toEqual([])
      expect(aether.problems.errors.length).toEqual 1
      if problem = aether.problems.errors[0]
        expect(problem.type).toEqual 'runtime'
        expect(problem.level).toEqual 'error'
        expect(problem.message).toMatch /exploooode/
        expect(problem.range?.length).toEqual 2
        [start, end] = problem.range
        expect(start.ofs).toEqual 21
        expect(start.row).toEqual 1
        expect(start.col).toEqual 0
        expect(end.ofs).toEqual 38
        expect(end.row).toEqual 1
        expect(end.col).toEqual 18
        expect(problem.message).toMatch /Line 2/
