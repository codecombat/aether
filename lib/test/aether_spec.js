(function() {
  var Aether;

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
      return it("Compiles a blank piece of code", function() {
        var raw;
        raw = "";
        return expect(aether.canTranspile(raw)).toEqual(true);
      });
    });
  });

}).call(this);
