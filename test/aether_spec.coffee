Aether = require '../aether'

describe "Aether", ->
  it "doesn't immediately break", ->
    aether = new Aether()
    code = "var x = 3;"
    expect(aether.canTranspile(code)).toEqual true
