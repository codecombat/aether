Aether = require '../aether'

describe "Global Scope Exploit Suite", ->
  it 'should intercept "this"', ->
    code = "G=100;var globals=(function(){return this;})();return globals.G;"
    aether = new Aether()
    aether.transpile(code)
    expect(aether.run()).toEqual 100

  it 'should disallow using Function', ->
    code = "Function('')"
    aether = new Aether()
    aether.transpile(code)
    func = aether.createFunction()
    expect(func).toThrow()

  it 'should disallow Function.__proto__.constructor', ->
    code = "(function(){}).__proto__.constructor('')"
    aether = new Aether()
    aether.transpile(code)
    func = aether.createFunction()
    expect(func).toThrow()

  it 'should protect builtins', ->
    code = "(function(){}).__proto__.constructor = 100;"
    aether = new Aether()
    aether.transpile(code)
    aether.run()
    expect((->).__proto__.constructor).not.toEqual 100

  it 'should sandbox nested aether functions', ->
    c1 = "arguments[0]();"
    c2 = "(function(){}).__proto__.constructor('');"

    aether = new Aether()
    aether.transpile c1
    f1 = aether.createFunction()

    aether.transpile c2
    f2 = aether.createFunction()

    expect(->f1 f2).toThrow()

  it 'shouldn\'t remove sandbox in nested aether functions', ->
    c1 = "arguments[0]();(function(){}).__proto__.constructor('');"
    c2 = ""

    aether = new Aether()
    aether.transpile c1
    f1 = aether.createFunction()

    aether.transpile c2
    f2 = aether.createFunction()

    expect(->f1 f2).toThrow()

  it 'should sandbox generators', ->
    code = "(function(){}).__proto__.constructor();"
    aether = new Aether
      yieldAutomatically: true

    aether.transpile code
    func = aether.sandboxGenerator aether.createFunction()()

    try
      while true
        func.next()
    catch e
      # If we change the error message or whatever make sure we change it here too
      expect(e.message).toEqual '[Sandbox] Function::constructor is disabled. If you are a developer, please make sure you have a reference to your builtins.'

  xit 'should not break on invalid code', ->
    # Why doesn't this work? It should be catching the error. Works in production...
    code = '''
      if (friend.health < 5) {
          this.castRegen(friend);
          this.say("Healing " + friend.id + ".");
      }
      if (this.health < 50) {
    '''
    aether = new Aether()
    aether.transpile code
    fn = aether.createFunction()
    fn()
