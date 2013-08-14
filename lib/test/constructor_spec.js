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

  describe("Constructor Test Suite", function() {
    describe("Default values", function() {
      var aether;
      aether = new Aether();
      it("should initialize thisValue to be null", function() {
        return expect(aether.options.thisValue).toBeNull();
      });
      it("should initialize functionName as null", function() {
        return expect(aether.options.functionName).toBeNull();
      });
      it("should have javascript as the default language", function() {
        return expect(aether.options.language).toEqual("javascript");
      });
      it("should be using ECMAScript 5", function() {
        return expect(aether.options.languageVersion).toBe("ES5");
      });
      it("should have no functionParameters", function() {
        return expect(aether.options.functionParameters).toEqual([]);
      });
      it("should not yield automatically by default", function() {
        return expect(aether.options.yieldAutomatically).toBe(false);
      });
      it("should not yield conditionally", function() {
        return expect(aether.options.yieldConditionally).toBe(false);
      });
      it("should have defined execution costs", function() {
        return expect(aether.options.executionCosts).toBeDefined();
      });
      return it("should have defined globals", function() {
        return expect(aether.options.global).toBeDefined();
      });
    });
    return describe("Custom option values", function() {
      var constructAther;
      constructAther = function(options) {
        var aether;
        return aether = new Aether(options);
      };
      beforeEach(function() {
        var aether;
        return aether = null;
      });
      it("should not allow non-supported languages", function() {
        var options;
        options = {
          language: "Brainfuck"
        };
        return expect(constructAther.bind(null, options)).toThrow();
      });
      it("should not allow non-supported language versions", function() {
        var options;
        options = {
          languageVersion: "ES7"
        };
        return expect(constructAther.bind(null, options)).toThrow();
      });
      return it("should not allow options that do not exist", function() {
        var options;
        options = {
          blah: "blah"
        };
        return expect(constructAther.bind(null, options)).toThrow();
      });
    });
  });

}).call(this);
