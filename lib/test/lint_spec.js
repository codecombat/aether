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

  describe("Linting Test Suite", function() {
    describe("Default linting", function() {
      var aether;
      aether = new Aether();
      return it("should warn about missing semicolons", function() {
        var code, warnings;
        code = "var bandersnatch = 'frumious'";
        warnings = aether.lint(code).warnings;
        expect(warnings.length).toEqual(1);
        return expect(warnings[0].message).toEqual('Missing semicolon.');
      });
    });
    return describe("Custom lint levels", function() {
      return it("should allow ignoring of warnings", function() {
        var aether, code, options, warnings;
        options = {
          problems: {
            jshint_W033: 'ignore'
          }
        };
        aether = new Aether(options);
        code = "var bandersnatch = 'frumious'";
        warnings = aether.lint(code).warnings;
        return expect(warnings.length).toEqual(0);
      });
    });
  });

}).call(this);
