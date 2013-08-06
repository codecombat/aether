(function() {
  var Aether;

  Aether = require('../aether');

  describe("Aether", function() {
    return it("doesn't immediately break", function() {
      var aether, code;
      aether = new Aether();
      code = "var x = 3;";
      return expect(aether.canTranspile(code)).toEqual(true);
    });
  });

}).call(this);
