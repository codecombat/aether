_ = window?._ ? self?._ ? global?._ ? require 'lodash'  # rely on lodash existing, since it busts CodeCombat to browserify it--TODO

Aether = require '../aether'
{protectionVersion} = require '../protectAPI'

describe "API Protection Test Suite", ->
  class Vector
    @className: "Vector"
    @add: (a, b) -> a.copy().add b
    @subtract: (a, b) -> a.copy().subtract b
    constructor: (@x=0, @y=0, @z=0) ->
    copy: -> new Vector(@x, @y, @z)
    equals: (other) -> other and @x is other.x and @y is other.y and @z is other.z
    add: (other) ->
      @x += other.x
      @y += other.y
      @z += other.z
      @
    subtract: (other) ->
      @x -= other.x
      @y -= other.y
      @z -= other.z
      @
    apiProperties: ['copy', 'equals', 'x', 'y', 'z', 'add', 'subtract']
    apiMethods: []  # nothing destructively modifies original Vector

  hero = {id: 'He-Man', pos: {x: 5, y: 10, z: 20}, original: true, log: console.log}
  enemy = {id: 'Skeletor', pos: {x: 50, y: 50, z: 10}, target: hero, original: true}
  hero.target = enemy
  hero.getTarget = enemy.getTarget = -> @target
  hero.setTarget = enemy.setTarget = (@target) ->
  hero.apiProperties = ['id', 'pos', 'target', 'getTarget']
  hero.apiMethods = ['setTarget']
  enemy.apiProperties = ['id', 'pos', 'target', 'getTarget']

  it 'should not let you mess with original objects', ->
    # Writes should fail to non-writable property, and in strict mode, they throw errors.
    code = """
      var failures = 0;
      var enemy = this.getTarget();
      try { delete enemy.id; } catch (e) { ++failures; }
      try { enemy.id = 'Zelda'; } catch (e) { ++failures; }
      var enemy2 = this.getTarget();
      try { enemy2.pos.z = 9001; } catch (e) { ++failures; }
      try { this.pos.z = 9001; } catch (e) { ++failures; }
      try { enemy2.getTarget().pos.z = 9001; } catch (e) { ++failures; }
      return enemy2.id + failures;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod hero
    hero._aetherAPIMethodsAllowed = true
    result = method()
    hero._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toEqual 'Skeletor5'
    expect(enemy.id).toEqual 'Skeletor'
    expect(hero.pos.z).not.toEqual 9001
    expect(enemy.pos.z).not.toEqual 9001

  it 'should restore original objects when used as function arguments', ->
    code = """
      var failures = 0;
      var hero = this.getTarget().getTarget();
      var heroID = hero.id;
      hero.setTarget(hero);
      var hero2 = hero.getTarget();
      try { hero2.id = 'Pikachu'; } catch (e) { ++failures; }
      return heroID + failures;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod hero
    hero._aetherAPIMethodsAllowed = true
    result = method()
    hero._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toEqual "He-Man1"
    expect(hero.id).toEqual 'He-Man'
    expect(hero.target.id).toEqual 'He-Man'
    expect(enemy.id).toEqual 'Skeletor'

  it 'should restrict access to apiProperties', ->
    hand = {id: 'Hand', world: "Secret", apiProperties: ["id"], apiMethods: ["getEnemies"]}
    foot = {id: 'Foot', world: "Secret", apiProperties: ["id"], apiMethods: ["getEnemies"]}
    butt = {id: 'Butt', world: "Secret", apiProperties: ["id"], apiMethods: ["getEnemies"]}
    hand.enemies = [foot, butt]
    foot.enemies = [hand]
    butt.enemies = [hand]
    hand.getEnemies = foot.getEnemies = butt.getEnemies = -> @enemies

    code = """
      var failures = 0;
      var enemies = this.getEnemies();
      enemies[1] = enemies[0];
      try { enemies[0].id = 'The Hammer'; } catch (e) { ++failures; }
      enemies.push(enemies[0]);
      var thisWorld = this.world;
      try { this.world = 'Public'; } catch (e) { ++failures; }
      var theirWorld = enemies[0].world;
      try { enemies[0].world = 'Mine'; } catch (e) { ++failures; }
      return {ourWorld: thisWorld, theirWorld: theirWorld,
              ourEnemies: this.enemies, theirEnemies: enemies[0].enemies,
              ourWorldAttempted: this.world, ourEnemiesAttempted: enemies,
              failures: failures};
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod hand
    hand._aetherAPIMethodsAllowed = true
    result = method()
    hand._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(result.ourWorld).toEqual undefined
    expect(result.theirWorld).toEqual undefined
    expect(result.ourEnemies).toEqual undefined
    expect(result.theirEnemies).toEqual undefined
    expect(hand.world).toEqual 'Secret'
    expect(foot.world).toEqual 'Secret'
    expect(hand.enemies[0].id).toEqual 'Foot'
    expect(hand.enemies[1].id).toEqual 'Butt'
    expect(hand.enemies.length).toEqual 2
    expect(result.ourWorldAttempted).toEqual 'Public'  # Not in API, they can write their own values
    expect(result.ourEnemiesAttempted.length).toEqual 2  # Don't let them modify the array
    expect(result.ourEnemiesAttempted[0].id).toEqual 'Foot'  # Non-writable
    expect(result.failures).not.toEqual 0

  it 'should restrict mutation of nested function parameters', ->
    coins = [{gold: 5, pos: {x: 10, y: 20}, apiProperties: ['gold', 'pos']}, {gold: 10, pos: {x: 30, y: 40}, apiProperties: ['gold', 'pos']}]
    originalCoins = _.cloneDeep coins
    peon = {getCoins: -> coins}

    code = """
      var failures = 0;
      var coins = this.getCoins();
      var coin = coins[0];
      try { coin.gold = 50; } catch(e) { ++failures; }
      try { coins[0].gold = 50; } catch(e) { ++failures; }
      try { coins[1].pos.x = 50; } catch(e) { ++failures; }
      coins.push({gold: 50, pos: {x: 50, y: 50}});
      this.inner = function(items) {
        try { items[0].gold = 50; } catch(e) { ++failures; }
        try { items[1].pos.x = 50; } catch(e) { ++failures; }
        items.push({gold: 50, pos: {x: 50, y: 50}});
      };
      this.inner(coins);
      return failures;
    """
    aether = new Aether protectAPI: true, includeMetrics: false, includeFlow: false
    aether.transpile code
    method = aether.createMethod peon
    peon._aetherAPIMethodsAllowed = true
    failures = method()
    peon._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    #expect(failures).toEqual 5  # hmm, why is failures 0?
    expect(coins).toEqual originalCoins

  it 'should let you use your own arrays', ->
    coins = [{gold: 5, apiProperties: ['gold']}, {gold: 10, apiProperties: ['gold']}, {gold: 15, apiProperties: ['gold']}]
    originalCoins = _.cloneDeep coins
    peon = {getCoins: -> coins}

    code = """
      var coinLengths = [];
      var coins = this.getCoins();
      coinLengths.push(coins.length);
      this.inner = function(items) {
        items.push({gold: 50});
        items.push({gold: 50});
        items.push({gold: 50});
        items.splice(0, 1);
        coinLengths.push(items.length);
      };
      this.inner2 = function() {
        coins.push({gold: 50});
        coins.push({gold: 50});
        coins.push({gold: 50});
        coins.splice(0, 1);
        coinLengths.push(coins.length);
      };
      coins.push({gold: 50});
      coins.push({gold: 50});
      coins.push({gold: 50});
      coins.splice(0, 1);
      coinLengths.push(coins.length);
      this.inner(coins);
      this.inner2();

      // https://github.com/codecombat/aether/issues/43
      var board = [];
      this.makeBoard = function() {
        for(var i = 0; i < 3; ++i) {
          board.push([]);
          for(var j = 0; j < 3; ++j) {
            board[i].push([]);
          }
        }
      }

      return coinLengths;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod peon
    peon._aetherAPIMethodsAllowed = true
    coinLengths = method()
    peon._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors).toEqual []
    expect(coinLengths).toEqual [3, 5, 7, 9]
    expect(coins).toEqual originalCoins

  it 'should handle instances of classes', ->
    p0 = new Vector 0, 0, 0
    p1 = new Vector 10, 10, 10
    p2 = new Vector 100, 100, 100
    originalPoints = (p.copy() for p in [p0, p1, p2])
    milo =
      id: "Milo"
      pos: p0
      target: p1
      target2: p2
      setTarget: (@target) ->
      move: -> @pos.add Vector.subtract(@target, @pos)
      apiProperties: ['id', 'pos', 'target', 'target2']
      apiMethods: ['setTarget', 'move']
    code = """
      var failures = 0;
      try { this.pos.constructor.subtract = this.pos.constructor.add; } catch (e) { ++failures; } // no error I guess
      try { this.pos.subtract = this.pos.add; } catch (e) { ++failures; }
      try { this.target.subtract = this.pos.add; } catch (e) { ++failures; }
      try { this.target2.subtract = this.pos.add; } catch (e) { ++failures; }
      var points = [];
      points.push(this.pos.copy());  // points[0] == p0
      try { this.pos.x = this.target.x; } catch (e) { ++failures; }
      points.push(this.pos.copy());  // points[1] == p0
      this.pos.add(this.target);
      points.push(this.pos.copy());  // points[2] == p0
      this.move();
      points.push(this.pos.copy());  // points[3] == p1
      this.setTarget(this.target2);
      this.move();
      points.push(this.pos.copy());  // points[4] == p2
      return {points: points, failures: failures};
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod milo
    milo._aetherAPIMethodsAllowed = true
    {points, failures} = method()
    milo._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(milo.pos).toBe p0
    expect(milo.target).toBe p2
    expect(Vector.add(originalPoints[1], originalPoints[1]).x).toEqual 20
    expect(points[0].equals(originalPoints[0])).toBe true
    expect(points[1].equals(originalPoints[0])).toBe true
    expect(points[2].equals(originalPoints[0])).toBe true
    expect(points[3].equals(originalPoints[1])).toBe true
    expect(points[4].equals(originalPoints[2])).toBe true
    expect(failures).toBeGreaterThan 3

  it 'should protect function arguments', ->
    p0 = new Vector 10, 10, 10
    p1 = new Vector 100, 100, 100
    code = """
      var failures = 0;
      try { target.x = 5; } catch (e) { ++failures; }
      try { home.y = 50; } catch (e) { ++failures; }
      try { arguments[0].z = 500; } catch (e) { ++failures; }
      return {tx: target.x, hy: home.y, tz: target.z, failures: failures};
    """
    aether = new Aether protectAPI: true, functionParameters: ['target', 'home', 'nothing']
    aether.transpile code
    {tx, hy, tz, failures} = aether.run null, p0, p1
    expect(aether.problems.errors.length).toEqual 0
    expect(p0.x).toEqual 10
    expect(p1.y).toEqual 100
    expect(tx).toEqual 10
    expect(hy).toEqual 100
    expect(tz).toEqual 10
    expect(failures).toEqual 3

  it 'should protect return values', ->
    code = """
      return hero;
    """
    aether = new Aether protectAPI: true, functionParameters: ['hero']
    aether.transpile code
    result = aether.run null, hero
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toBe hero

  it 'should not interfere with user-defined properties', ->
    code = """
      if(typeof this.infants === 'undefined') {
        this.infants = 0;
        this.namesLeft = ['Max', 'Jax', 'Dax'];
        this.namesUsed = [];
        this.petShouldEat = [];
        this.hackThePets = this.pets;
      }
      this.namesUsed.push(this.namesLeft.shift());
      this.petShouldEat[0] = this.namesUsed[this.namesUsed.length - 1];
      this.hackThePets.push(this.petShouldEat[0]);
      this.pets.push(this.petShouldEat[0]);
      return ++this.infants;
    """
    mama = id: "Mama", pets: ['dog'], apiProperties: ['pets']
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod mama
    for i in [0 ... 3]
      mama._aetherAPIMethodsAllowed = 1
      expect(method()).toEqual i + 1
      mama._aetherAPIMethodsAllowed = 0

      # Get the API clone of the mama object
      if protectionVersion is 0
        clone = mama.__aetherAPIClone
      else  # protectionVersion is 1
        clone = aether.protectAPIValuesToClones[mama.__aetherID]

      for prop of clone when typeof mama[prop] is 'undefined' and not (prop in (mama.apiUserProperties ? []))
        mama.apiUserProperties ?= []
        mama.apiUserProperties.push prop
      for prop in (mama.apiUserProperties ? [])
        mama[prop] = clone[prop]
      if protectionVersion is 0
        delete mama.__aetherAPIClone

      expect(mama.infants).toEqual i + 1
      expect(mama.namesUsed.length).toEqual i + 1
      expect(mama.namesLeft.length).toEqual 2 - i
      expect(mama.petShouldEat[0]).toEqual mama.namesUsed[mama.namesUsed.length - 1]
      expect(mama.pets.length).toEqual 1

  xit 'should allow assigning complex prototypes to this', ->
    # See: https://github.com/codecombat/codecombat/issues/654
    code = """
      function Foo(arr) {
          this.arr = arr;
          this.val = this.bar();
      }

      Foo.prototype.bar = function() {
          return this.arr[0];
      };

      return new Foo([1, 2, 3]).val;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    expect(aether.problems.errors.length).toEqual 0
    that = {}
    method = aether.createMethod that
    result = aether.run method
    expect(result).toBe 1
    expect(aether.problems.errors).toEqual []

  it 'should work with multiple Aethers', ->
    # See: https://github.com/codecombat/aether/pull/83
    # and: http://discourse.codecombat.com/t/gamebreaking-bug-attack-target-method-broken-in-dungeon-arena/936
    # I keep trying, but I can't make a test case that captures the issue.
    # Here's the inspiration:
    #
    # Human Base chooseAction():
    # this.enemies = this.getEnemies();
    # if(!this.builtHero)
    #     return this.builtHero = this.build('tharin');
    # return this.build('soldier');
    #
    # Tharin chooseAction():
    # this.getFriends();
    # this.attack(this.getEnemies()[0]);
    #
    # This fails because somehow the human base's this.enemies = this.getEnemies() assignment interacting with
    # Tharin's this.getFriends() call to make the Ogre Base enemy passed to attack just be a clone, not the full Thang.
    # If Tharin doesn't call this.getFriends() (even though he doesn't do anything with it), it works.

    movies = 0
    guys = (first: name.split(' ')[0], last: name.split(' ')[1], apiMethods: ['getFriends', 'bond'], apiProperties: ['first'] for name in ['George Clooney', 'Brad Pitt'])
    getFriends = ->
      (guy for guy in guys when guy.last isnt @last)
    bond = (friend) ->
      movies += friend.last.length
    guys[0].getFriends = guys[1].getFriends = getFriends
    guys[0].bond = guys[1].bond = bond

    for guy in guys
      do (guy) ->
        code = """
          this.friends = this.getFriends();
          this.bond(this.friends[0]);
          if (!this.breaths)
            this.breaths = 0;
          return this.breaths += this.friends[0].first.length;
        """
        guy.aether = new Aether protectAPI: true, functionName: 'breathe'
        guy.aether.transpile code
        guy.breathe = guy.aether.createMethod guy
        guy.live = ->
          if protectionVersion is 0
            delete @__aetherAPIClone
          else
            if @__aetherID
              delete @aether.protectAPIValuesToClones[@__aetherID]
              delete @aether.protectAPIClonesToValues[@__aetherID]
              delete @__aetherID
          @_aetherAPIMethodsAllowed = 1
          ret = @breathe()
          @_aetherAPIMethodsAllowed = 0
          if protectionVersion is 0
            clone = guy.__aetherAPIClone
          else
            clone = guy.aether.protectAPIValuesToClones[@__aetherID]
          for prop of clone when typeof @[prop] is 'undefined' and not (prop in (@apiUserProperties ? []))
            @apiUserProperties ?= []
            @apiUserProperties.push prop
          for prop in (@apiUserProperties ? [])
            @[prop] = clone[prop]
          if protectionVersion is 0
            delete @__aetherAPIClone
          else
            if @__aetherID
              delete @aether.protectAPIValuesToClones[@__aetherID]
              delete @aether.protectAPIClonesToValues[@__aetherID]
              delete @__aetherID
          for prop in @apiProperties
            if protectionVersion is 0
              delete @[prop].__aetherAPIClone if @[prop]?.__aetherAPIClone
            else
              if propAetherID = @[prop]?.__aetherID
                delete @aether.protectAPIValuesToClones[propAetherID]
                delete @aether.protectAPIClonesToValues[propAetherID]
                delete @[prop].__aetherID
          ret

    guys[0].live()
    expect(guys[0].breaths).toEqual 1 * guys[1].first.length
    guys[1].live()
    expect(guys[1].breaths).toEqual 1 * guys[0].first.length
    guys[0].live()
    guys[1].live()
    expect(guys[0].breaths).toEqual 2 * guys[1].first.length
    expect(guys[1].breaths).toEqual 2 * guys[0].first.length
    expect(movies).toEqual 2 * guys[0].last.length + 2 * guys[1].last.length

  xit 'should let you mess with your own method return values', ->
    # See: https://github.com/codecombat/codecombat/issues/1100
    code = '''
      function makePoint (x, y) { return {x: x, y: y}; }
      var p1 = makePoint(1, 2);
      p1.d = 3;
      var p2 = {x: 4, y: 5};
      p2.d = 6;
      return {p1: p1, p2: p2, p1s: JSON.stringify(p1), p2s: JSON.stringify(p2), p1d: p1.d, p2d: p2.d}
    '''
    aether = new Aether protectAPI: true
    aether.transpile code
    result = aether.run()
    expect(result.p1).toEqual {x: 1, y: 2, d: 3}
    expect(result.p2).toEqual {x: 4, y: 5, d: 6}
    expect(result.p1s).toEqual '{"x":1,"y":2,"d":3}'
    expect(result.p2s).toEqual '{"x":4,"y":5,"d":6}'
    expect(result.p1d).toEqual 3
    expect(result.p2d).toEqual 6
    expect(aether.problems.errors).toEqual []

  it 'cloning with non-JS language yields language-specific object', ->
    code = '''
      a = [1]
      a += [2]
      a *= 3
      return a
    '''
    aether = new Aether protectAPI: true, language:'python'
    aether.transpile code
    result = aether.run()
    expect(result._isPython).toEqual true
    expect(result._type).toEqual 'list'
    expect(result).toEqual [1, 2, 1, 2, 1, 2]
    expect(aether.problems.errors).toEqual []
