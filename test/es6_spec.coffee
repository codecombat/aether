Aether = require '../aether'

describe "JavaScript Test Suite", ->
  describe "Traceur compilation with ES6", ->
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
      compiled = aether.traceurify code
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
      compiled = aether.traceurify code
      eval(compiled)
      expect(hobaby("A yeti!")).toEqual 'name: A yeti!, codes: JavaScript, livesIn: USA'

  describe "Conditional yielding", ->
    aether = new Aether yieldConditionally: true, functionName: 'foo'
    it "should yield when necessary", ->
      dude =
        charge: -> "attack!"
        hesitate: -> aether._shouldYield = true
      code = """
        this.charge();
        this.hesitate();
        this.hesitate();
        return this.charge();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true

  describe "Automatic yielding", ->
    aether = new Aether yieldAutomatically: true, functionName: 'foo'
    it "should yield a lot", ->
      dude =
        charge: -> "attack!"
      code = """
        this.charge();
        var x = 3;
        x += 5 * 8;
        return this.charge();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      # At least four times
      for i in [0 ... 4]
        expect(gen.next().done).toEqual false
      # Should stop eventually
      while i < 100
        if gen.next().done then break else ++i
      expect(i < 100).toBe true

    it "with user method", ->
      dude =
        charge: -> "attack!"
      code = """
        function f(self) {
          self.charge();
        }
        f(this);
        var x = 3;
        x += 5 * 8;
        return this.charge();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      # At least four times
      for i in [0 ... 4]
        expect(gen.next().done).toEqual false
      # Should stop eventually
      while i < 100
        if gen.next().done then break else ++i
      expect(i < 100).toBe true

  describe "No yielding", ->
    aether = new Aether
    it "should not yield", ->
      dude =
        charge: -> "attack!"
        hesitate: -> aether._shouldYield = true
      code = """
        this.charge();
        this.hesitate();
        this.hesitate();
        return this.charge();
      """
      aether.transpile code
      f = aether.createFunction()
      ret = f.apply dude
      expect(ret).toEqual "attack!"

  describe "Yielding within a while-loop", ->
    aether = new Aether yieldConditionally: true
    it "should handle breaking out of a while loop with yields inside", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        while(true) {
          this.hesitate();
          this.hesitate();
          this.slay();
          if(this.enemy === 'slain!')
             break;
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true

    aether = new Aether yieldConditionally: true
    it "should handle breaking and continuing in a while loop with yields inside", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        var i = 0;
        while (true) {
            if (i < 3) {
                this.slay()
                this.hesitate();
                i++;
                continue;
            } else
                return null;
            break;
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true

  describe "User method conditional yielding", ->
    aether = new Aether yieldConditionally: true
    it "Simple fn decl", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        function f(self) {
          self.hesitate();
          self.hesitate();
          self.slay();
        }
        f(this);
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Fn decl after call", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        f(this);
        function f(self) {
          self.hesitate();
          self.hesitate();
          self.slay();
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Simple fn expr", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        this.f = function() {
          this.hesitate();
          this.hesitate();
          this.hesitate();
        };
        this.f();
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "IIFE", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        (function (self) {
          for (var i = 0, max = 3; i < max; ++i) {
            self.hesitate();
          }
        })(this);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "IIFE with .call()", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        (function () {
          for (var i = 0, max = 3; i < max; ++i) {
            this.hesitate();
          }
        }).call(this);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "IIFE without generatorify", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        (function (self) {
          self.slay();
        })(this);
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Nested methods one generatorify", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        (function (self) {
          function f(self) {
            self.hesitate();
          }
          f(self);
          self.slay();
        })(this);
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Nested methods many generatorify", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        (function (self) {
          function f(self) {
            self.hesitate();
            var f2 = function(self, n) {
              for (var i = 0; i < n; i++) {
                self.hesitate();
              }
            }
            f2(self, 2);
            self.hesitate();
          }
          f(self);
          self.hesitate();
          self.slay();
        })(this);
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

     it "Call user fn decl from another user method", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
         function f(self) {
            self.hesitate();
            b(self);
            (function () {
                self.hesitate();
            })();
        }
        function b(self) {
            self.hesitate();
        }
        f(this);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

     it "Call user fn expr from another user method", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        this.b = function () {
            this.hesitate();
        };
         function f(self) {
            var x = self;
            x.b();
        }
        var y = this;
        f(y);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Complex objects", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        var o1 = {};
        o1.m = function(self) {
          self.hesitate();
        };
        o1.o2 = {};
        o1.o2.m = function(self) {
          self.hesitate();
        };
        o1.m(this);
        o1.o2.m(this);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Functions as parameters", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        function f(m, self) {
            m(self);
        }
        function b(self) {
          self.hesitate();
        }
        f(b, this);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Nested clauses", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        this.b = function (self) {
            self.hesitate();
        }
        function f(self) {
          self.hesitate();
          self.b(self);
        }
        if (true) {
          f(this);
        }
        for (var i = 0; i < 2; i++) {
          if (i === 1) {
            f(this);
          }
        }
        var inc = 0;
        while (inc < 2) {
          f(this);
          inc += 1;
        }
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    it "Recursive user function", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> aether._shouldYield = true
      code = """
        function f(self, n) {
          self.hesitate();
          if (n > 0) {
            f(self, n - 1);
          }
        }
        f(this, 2);
        this.slay();
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual false
      expect(gen.next().done).toEqual true
      expect(dude.enemy).toEqual "slain!"

    # TODO: Method reassignment not supported yet
    #it "Reassigning methods", ->
    #  dude =
    #    slay: -> @enemy = "slain!"
    #    hesitate: -> aether._shouldYield = true
    #  code = """
    #    function f(self) {
    #      self.hesitate();
    #    }
    #    var b = f;
    #    b(this);
    #    this.slay();
    #  """
    #  aether.transpile code
    #  f = aether.createFunction()
    #  gen = f.apply dude
    #  expect(gen.next().done).toEqual false
    #  expect(gen.next().done).toEqual true
    #  expect(dude.enemy).toEqual "slain!"

    # TODO: Calling inner function returned from another function is not supported yet
    #it "Return user function", ->
    #  dude =
    #    slay: -> @enemy = "slain!"
    #    hesitate: -> aether._shouldYield = true
    #  code = """
    #    function f(self) {
    #      self.hesitate();
    #    }
    #    function b() {
    #      return f;
    #    }
    #    var m = b();
    #    m(this);
    #    this.slay();
    #  """
    #  aether.transpile code
    #  f = aether.createFunction()
    #  gen = f.apply dude
    #  expect(gen.next().done).toEqual false
    #  expect(gen.next().done).toEqual true
    #  expect(dude.enemy).toEqual "slain!"

  describe "Simple loop", ->
    it "loop{", ->
      code = """
      var total = 0
      loop{
        total += 1
        break;
      }
      return total
      """
      aether = new Aether language: "javascript", simpleLoops: true
      aether.transpile(code)
      expect(aether.run()).toEqual(1)

    it "loop {}", ->
      code = """
      var total = 0
      loop { total += 1; if (total >= 12) {break;}}
      return total
      """
      aether = new Aether language: "javascript", simpleLoops: true
      aether.transpile(code)
      expect(aether.run()).toEqual(12)

    it "Conditional yielding", ->
      aether = new Aether yieldConditionally: true, simpleLoops: true
      dude =
        killCount: 0
        slay: ->
          @killCount += 1
          aether._shouldYield = true
        getKillCount: -> return @killCount
      code = """
        while (true) {
          this.slay();
          break;
        }
        loop {
          this.slay();
          if (this.getKillCount() >= 5) {
            break;
          }
        }
        while (true) {
          this.slay();
          break;
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      for i in [1..6]
        expect(gen.next().done).toEqual false
        expect(dude.killCount).toEqual i
      expect(gen.next().done).toEqual true
      expect(dude.killCount).toEqual 6

# Huh, somehow this is being actually infinite for me.
#    it "Conditional yielding infinite loop", ->
#      aether = new Aether yieldConditionally: true, simpleLoops: true
#      code = """
#        x = 0
#        loop {
#          x++;
#        }
#      """
#      aether.transpile code
#      f = aether.createFunction()
#      gen = f()
#      for i in [0..100]
#        expect(gen.next().done).toEqual false

    it "Conditional yielding mixed loops", ->
      aether = new Aether yieldConditionally: true, simpleLoops: true
      dude =
        killCount: 0
        slay: ->
          @killCount += 1
          aether._shouldYield = true
        getKillCount: -> return @killCount
      code = """
        loop {
          this.slay();
          if (this.getKillCount() >= 5) {
            break;
          }
        }
        function f() {
          var x = 0;
          loop {
            x++;
            if (x > 10) break;
          }
          loop {
            this.slay();
            if (this.getKillCount() >= 15) {
              break;
            }
          }
        }
        f.call(this);
        while (true) {
          this.slay();
          break;
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      for i in [1..5]
        expect(gen.next().done).toEqual false
        expect(dude.killCount).toEqual i
      for i in [1..10]
        expect(gen.next().done).toEqual false
        expect(dude.killCount).toEqual 5
      for i in [6..15]
        expect(gen.next().done).toEqual false
        expect(dude.killCount).toEqual i
      expect(gen.next().done).toEqual false
      expect(dude.killCount).toEqual 16
      expect(gen.next().done).toEqual true
      expect(dude.killCount).toEqual 16

    it "Conditional yielding nested loops", ->
      aether = new Aether yieldConditionally: true, simpleLoops: true
      dude =
        killCount: 0
        slay: ->
          @killCount += 1
          aether._shouldYield = true
        getKillCount: -> return @killCount
      code = """
        function f() {
          // outer auto yield, inner yield
          var x = 0;
          loop {
            var y = 0;
            loop {
              this.slay();
              y++;
              if (y >= 2) break;
            }
            x++;
            if (x >= 3) break;
          }
        }
        f.call(this);

        // outer yield, inner auto yield
        var x = 0;
        loop {
          this.slay();
          var y = 0;
          loop {
            y++;
            if (y >= 4) break;
          }
          x++;
          if (x >= 5) break;
        }

        // outer and inner auto yield
        x = 0;
        loop {
          y = 0;
          loop {
            y++;
            if (y >= 6) break;
          }
          x++;
          if (x >= 7) break;
        }

        // outer and inner yields
        x = 0;
        loop {
          this.slay();
          y = 0;
          loop {
            this.slay();
            y++;
            if (y >= 9) break;
          }
          x++;
          if (x >= 8) break;
        }
      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude

      # NOTE: keep in mind no-yield loops break before invisible automatic yield

      # outer auto yield, inner yield
      for i in [1..3]
        for j in [1..2]
          expect(gen.next().done).toEqual false
          expect(dude.killCount).toEqual (i - 1) * 2 + j
        expect(gen.next().done).toEqual false if i < 3
      expect(dude.killCount).toEqual 6

      # outer yield, inner auto yield
      killOffset = dude.killCount
      for i in [1..5]
        for j in [1..3]
          expect(gen.next().done).toEqual false
        expect(gen.next().done).toEqual false
        expect(dude.killCount).toEqual i + killOffset
      expect(dude.killCount).toEqual 6 + 5

      # outer and inner auto yield
      killOffset = dude.killCount
      for i in [1..7]
        for j in [1..5]
          expect(gen.next().done).toEqual false
          expect(dude.killCount).toEqual killOffset
        expect(gen.next().done).toEqual false if i < 7
      expect(dude.killCount).toEqual 6 + 5 + 0

      # outer and inner yields
      killOffset = dude.killCount
      for i in [1..8]
        expect(gen.next().done).toEqual false
        for j in [1..9]
          expect(gen.next().done).toEqual false
          expect(dude.killCount).toEqual (i - 1) * 9 + i + j + killOffset
      expect(dude.killCount).toEqual 6 + 5 + 0 + 80

      expect(gen.next().done).toEqual true
      expect(dude.killCount).toEqual 91

    it "Automatic yielding", ->
      aether = new Aether yieldAutomatically: true, simpleLoops: true
      dude =
        killCount: 0
        slay: -> @killCount += 1
        getKillCount: -> return @killCount
      code = """
        while (true) {
          this.slay();
          break;
        }
        loop {
          this.slay();
          if (this.getKillCount() >= 5) {
            break;
          }
        }
        while (true) {
          this.slay();
          break;
        }

      """
      aether.transpile code
      f = aether.createFunction()
      gen = f.apply dude
      while (true)
        if gen.next().done then break
      expect(dude.killCount).toEqual 6
