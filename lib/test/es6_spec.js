(function() {
  var Aether;

  Aether = require('../aether');

  describe("ES6 Test Suite", function() {
    describe("Traceur compilation", function() {
      var aether;
      aether = new Aether({
        languageVersion: "ES6"
      });
      it("should compile generator functions", function() {
        var code, compiled, hoboz;
        code = "var x = 3;\nfunction* gen(z) {\n  yield z;\n  yield z + x;\n  yield z * x;\n}";
        compiled = aether.traceurify(code);
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
        compiled = aether.traceurify(code);
        eval(compiled);
        return expect(hobaby("A yeti!")).toEqual('name: A yeti!, codes: JavaScript, livesIn: USA');
      });
    });
    describe("Conditional yielding", function() {
      var aether;
      aether = new Aether({
        yieldConditionally: true,
        functionName: 'foo'
      });
      return it("should yield when necessary", function() {
        var code, dude, f, gen;
        dude = {
          charge: function() {
            return "attack!";
          },
          hesitate: function() {
            return this._shouldYield = true;
          }
        };
        code = "this.charge();\nthis.hesitate();\nthis.hesitate();\nreturn this.charge();";
        aether.transpile(code);
        f = aether.createFunction();
        gen = f.apply(dude);
        expect(gen.next().done).toEqual(false);
        expect(gen.next().done).toEqual(false);
        return expect(gen.next().done).toEqual(true);
      });
    });
    describe("Automatic yielding", function() {
      var aether;
      aether = new Aether({
        yieldAutomatically: true,
        functionName: 'foo'
      });
      return it("should yield a lot", function() {
        var code, dude, f, gen, i, _i;
        dude = {
          charge: function() {
            return "attack!";
          }
        };
        code = "this.charge();\nvar x = 3;\nx += 5 * 8;\nreturn this.charge();";
        aether.transpile(code);
        f = aether.createFunction();
        gen = f.apply(dude);
        for (i = _i = 0; _i < 4; i = ++_i) {
          expect(gen.next().done).toEqual(false);
        }
        while (i < 100) {
          if (gen.next().done) {
            break;
          } else {
            ++i;
          }
        }
        return expect(i < 100).toBeTrue;
      });
    });
    describe("No yielding", function() {
      var aether;
      aether = new Aether;
      return it("should not yield", function() {
        var code, dude, f, ret;
        dude = {
          charge: function() {
            return "attack!";
          },
          hesitate: function() {
            return this._shouldYield = true;
          }
        };
        code = "this.charge();\nthis.hesitate();\nthis.hesitate();\nreturn this.charge();";
        aether.transpile(code);
        f = aether.createFunction();
        ret = f.apply(dude);
        return expect(ret).toEqual("attack!");
      });
    });
    return describe("Yielding within a while-loop", function() {
      var aether;
      aether = new Aether({
        yieldConditionally: true
      });
      return;
      return it("should handle breaking out of a while loop with yields inside", function() {
        var code, dude, f, gen;
        dude = {
          slay: function() {
            return this.enemy = "slain!";
          },
          hesitate: function() {
            return this._shouldYield = true;
          }
        };
        code = "while(true) {\n  this.hesitate();\n  this.hesitate();\n  this.slay();\n  if(this.enemy === 'slain!')\n     break;\n}";
        aether.transpile(code);
        f = aether.createFunction();
        gen = f.apply(dude);
        expect(gen.next().done).toEqual(false);
        expect(gen.next().done).toEqual(false);
        return expect(gen.next().done).toEqual(true);
      });
    });
  });

}).call(this);
