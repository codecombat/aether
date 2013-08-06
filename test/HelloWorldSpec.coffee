helloWorld = require '../helloWorld'

describe "Hello World", ->
  it "says hello", ->
    expect(helloWorld()).toEqual "Hello World"
