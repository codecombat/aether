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
    expect(->aether.run()).toThrow

  it 'should disallow Function.__proto__.constructor', ->
    code = "(function(){}).__proto__.constructor('')"
    aether = new Aether()
    aether.transpile(code)
    expect(->aether.run()).toThrow

  it 'should protect builtins', ->
    code = "(function(){}).__proto__.constructor = 100;"
    aether = new Aether()
    aether.transpile(code)
    aether.run()
    expect((->).__proto__.constructor).not.toEqual 100
