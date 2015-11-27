Aether = require '../aether'

describe "Java test suite", ->
  describe "Java Basics", ->
    aether = new Aether language: "java"
    it "JAVA - return 1000", ->
      code = """
      public class MyClass{
       public static void main(String[] args)
         {
            return 1000;
         }
      }
      """
      aether.transpile(code)
      expect(aether.run()).toEqual 1000
