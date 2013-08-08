(function() {
  var Aether, _;

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

  Aether = require('../aether');

  describe("Aether", function() {
    describe("Basic tests", function() {
      return it("doesn't immediately break", function() {
        var aether, code;
        aether = new Aether();
        code = "var x = 3;";
        return expect(aether.canTranspile(code)).toEqual(true);
      });
    });
    return describe("Transpile heuristics", function() {
      var aether;
      aether = null;
      beforeEach(function() {
        return aether = new Aether();
      });
      return it("doesn't compile a blank piece of code", function() {
        var raw;
        raw = "";
        return expect(aether.canTranspile(raw)).toEqual(false);
      });
    });
  });

}).call(this);
