Aether = require '../aether'

describe "Flow test suite", ->
  describe "Defining functions", ->
    aether = new Aether()
    it "should be able to define functions in functions", ->
      code = """
        function fib(n) {
          return n < 2 ? n : fib(n - 1) + fib(n - 2);
        var chupacabra = fib(5)
        //console.log("I want", chupacabra, "gold.");
        return chupacabra;
      """
      aether.transpile(code)
      fn = aether.createFunction()
      fn()
      fn()
      fn()
