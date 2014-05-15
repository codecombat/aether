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
      expect(aether.run()).toBeAUserCodeProblemOfType 'aether_ArityError'

    aether.reset()
    it 'should generate an ArgTypeError UserCodeProblem if a function is passed the wrong types of arguments', ->
      code = '(+ 1 2 "string")'
      aether.transpile(code)
      expect(aether.run()).toBeAUserCodeProblemOfType 'aether_ArgTypeError'
