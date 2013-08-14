Aether = require '../aether'

describe "ES6 Test Suite", ->
  describe "Traceur compilation", ->
    aether = new Aether languageVersion: "ES6"
    it "should compile generator functions", ->
      code = """
        var x = 3;
        function* gen(z) {
          yield z;
          yield z + x;
          yield z * x;
        }
      """
      compiled = aether.es6ify code
      eval(compiled)
      hoboz = gen(5)
      expect(hoboz.next().value).toEqual 5
      expect(hoboz.next().value).toEqual 8
      expect(hoboz.next().value).toEqual 15
      expect(hoboz.next().done).toEqual true

    it "should compile default parameters", ->
      aether = new Aether languageVersion: "ES6"
      code = """
      function hobaby(name, codes = 'JavaScript', livesIn = 'USA') {
        return 'name: ' + name + ', codes: ' + codes + ', livesIn: ' + livesIn;
      };
      """
      compiled = aether.es6ify code
      eval(compiled)
      expect(hobaby("A yeti!")).toEqual 'name: A yeti!, codes: JavaScript, livesIn: USA'
