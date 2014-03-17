Aether = require '../aether'

describe "CS test Suite!", ->
  describe "CS compilation", ->
    aether = new Aether language: "coffeescript"
    it "Should compile funcitons", ->
      code = """
        return 1000
      """
      aether.transpile(code)
      expect(aether.run()).toEqual 1000

  describe "CS compilation with lang set after contruction", ->
    aether = new Aether()
    it "Should compile funcitons", ->
      code = """
        return 2000 if false
        \treturn 1000
      """
      aether.setLanguage "coffeescript"
      aether.transpile(code)
      expect(aether.run()).toEqual 1000