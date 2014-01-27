Aether = require '../aether'

describe "API Protection Test Suite", ->
  hero = {id: 'He-Man', pos: {x: 5, y: 10, z: 20}, original: true, log: console.log}
  enemy = {id: 'Skeletor', pos: {x: 50, y: 50, z: 10}, target: hero, original: true}
  hero.target = enemy
  hero.getTarget = enemy.getTarget = -> @target
  hero.setTarget = enemy.setTarget = (@target) ->
  hero.apiProperties = ['id', 'pos', 'target', 'getTarget', 'setTarget']
  enemy.apiProperties = ['id', 'pos', 'target', 'getTarget']
  aether = new Aether protectAPI: true, thisValue: hero

  it 'should not let you mess with original objects', ->
    code = """
      var enemy = this.getTarget();
      enemy.id = 'Zelda';
      var enemy2 = this.getTarget();
      return enemy2.id;
    """
    aether.transpile(code)
    result = aether.run()
    #expect(result).toEqual 'Skeletor'  # we get our clone again when we ask
    expect(enemy.id).toEqual 'Skeletor'

  it 'should restore original objects when used as function arguments', ->
    code = """
      var hero = this.getTarget().getTarget();
      var heroID = hero.id;
      hero.setTarget(hero);
      var hero2 = hero.getTarget();
      hero2.id = 'Pikachu';
      return heroID;
    """
    aether.options.thisValue = hero
    aether.transpile(code)
    result = aether.run()
    expect(result).toEqual "He-Man"
    expect(hero.id).toEqual 'He-Man'
    expect(hero.target.id).toEqual 'He-Man'
    expect(enemy.id).toEqual 'Skeletor'
