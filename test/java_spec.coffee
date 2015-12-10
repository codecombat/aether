Aether = require '../aether'

describe "Java test suite", ->
  describe "Java Basics", ->
    aether = new Aether language: "java"
    it "JAVA - return 1000", ->
      code = """
      public class MyClass{
       public static int basicReturn()
         {
            return 1000;
         }
      }
      """
      aether.className = "MyClass"
      aether.staticCall = "basicReturn"
      aether.transpile code
      expect(aether.run()).toEqual 1000
