Aether = require '../aether'

describe "CS test Suite!", ->
	describe "CS compilation", ->
		aether = new Aether languageVersion: "CS"
		it "Should compile funcitons", ->
			code = """
				fn = (x) -> x * x
			"""
			console.log aether.transpile code

