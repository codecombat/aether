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
