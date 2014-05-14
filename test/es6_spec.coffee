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
        hesitate: -> @_aetherShouldYield = true
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

  describe "No yielding", ->
    aether = new Aether
    it "should not yield", ->
      dude =
        charge: -> "attack!"
        hesitate: -> @_aetherShouldYield = true
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
        hesitate: -> @_aetherShouldYield = true
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

    it "should handle breaking and continuing in a while loop with yields inside", ->
      dude =
        slay: -> @enemy = "slain!"
        hesitate: -> @_aetherShouldYield = true
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
