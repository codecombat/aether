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
    return it("doesn't immediately break", function() {
      var aether, code;
      aether = new Aether();
      code = "var x = 3;";
      return expect(aether.canTranspile(code)).toEqual(true);
    });
  });

}).call(this);
