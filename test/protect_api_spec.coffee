Aether = require '../aether'

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
    code = """
      var enemy = this.getTarget();
      enemy.id = 'Zelda';
      var enemy2 = this.getTarget();
      enemy2.pos.z = this.pos.z = enemy2.getTarget().pos.z = 9001;
      return enemy2.id;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod hero
    hero._aetherAPIMethodsAllowed = true
    result = method()
    hero._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toEqual 'Skeletor'  # Writes fail to non-writable property
    expect(enemy.id).toEqual 'Skeletor'
    expect(hero.pos.z).not.toEqual 9001
    expect(enemy.pos.z).not.toEqual 9001

  it 'should restore original objects when used as function arguments', ->
    code = """
      var hero = this.getTarget().getTarget();
      var heroID = hero.id;
      hero.setTarget(hero);
      var hero2 = hero.getTarget();
      hero2.id = 'Pikachu';
      return heroID;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod hero
    hero._aetherAPIMethodsAllowed = true
    result = method()
    hero._aetherAPIMethodsAllowed = false
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toEqual "He-Man"
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
      var enemies = this.getEnemies();
      enemies[1] = enemies[0];
      enemies[0].id = 'The Hammer';
      enemies.push(enemies[0]);
      var thisWorld = this.world;
      this.world = 'Public';
      var theirWorld = enemies[0].world;
      enemies[0].world = 'Mine';
      return {ourWorld: thisWorld, theirWorld: theirWorld,
              ourEnemies: this.enemies, theirEnemies: enemies[0].enemies,
              ourWorldAttempted: this.world, ourEnemiesAttempted: enemies};
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
      this.pos.constructor.subtract = this.pos.constructor.add;
      this.pos.subtract = this.target.subtract = this.target2.subtract = this.pos.add;
      var points = [];
      points.push(this.pos.copy());  // points[0] == p0
      this.pos.x = this.target.x;
      points.push(this.pos.copy());  // points[1] == p0
      this.pos.add(this.target);
      points.push(this.pos.copy());  // points[2] == p0
      this.move();
      points.push(this.pos.copy());  // points[3] == p1
      this.setTarget(this.target2);
      this.move();
      points.push(this.pos.copy());  // points[4] == p2
      return points;
    """
    aether = new Aether protectAPI: true
    aether.transpile code
    method = aether.createMethod milo
    milo._aetherAPIMethodsAllowed = true
    points = method()
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

  it 'should protect function arguments', ->
    p0 = new Vector 10, 10, 10
    p1 = new Vector 100, 100, 100
    code = """
      target.x = 5;
      home.y = 50;
      return target.z;
    """
    aether = new Aether protectAPI: true, functionParameters: ['target', 'home', 'nothing']
    aether.transpile code
    result = aether.run null, p0, p1
    expect(aether.problems.errors.length).toEqual 0
    expect(p0.x).toEqual 10
    expect(p1.y).toEqual 100
    expect(result).toEqual 10

  it 'should protect return values', ->
    code = """
      return hero;
    """
    aether = new Aether protectAPI: true, functionParameters: ['hero']
    aether.transpile code
    result = aether.run null, hero
    expect(aether.problems.errors.length).toEqual 0
    expect(result).toBe hero
