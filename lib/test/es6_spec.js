(function() {
  var Aether, traceur, _;

  _ = require('lodash');

  if (typeof window !== "undefined" && window !== null) {
    window._ = _;
  }

  if (typeof global !== "undefined" && global !== null) {
    global._ = _;
  }

  if (typeof self !== "undefined" && self !== null) {
    self._ = _;
  }

  traceur = require('traceur');

  Aether = require('../aether');

  describe("ES6 Test Suite", function() {
    return describe("Traceur compilation", function() {
      var aether;
      aether = new Aether({
        languageVersion: "ES6"
      });
      it("should compile generator functions", function() {
        var code, compiled, hoboz;
        code = "var x = 3;\nfunction* gen(z) {\n  yield z;\n  yield z + x;\n  yield z * x;\n}";
        compiled = aether.es6ify(code);
        eval(compiled);
        hoboz = gen(5);
        expect(hoboz.next().value).toEqual(5);
        expect(hoboz.next().value).toEqual(8);
        expect(hoboz.next().value).toEqual(15);
        return expect(hoboz.next().done).toEqual(true);
      });
      return it("should compile default parameters", function() {
        var code, compiled;
        aether = new Aether({
          languageVersion: "ES6"
        });
        code = "function hobaby(name, codes = 'JavaScript', livesIn = 'USA') {\n  return 'name: ' + name + ', codes: ' + codes + ', livesIn: ' + livesIn;\n};";
        compiled = aether.es6ify(code);
        eval(compiled);
        return expect(hobaby("A yeti!")).toEqual('name: A yeti!, codes: JavaScript, livesIn: USA');
      });
    });
  });

}).call(this);
