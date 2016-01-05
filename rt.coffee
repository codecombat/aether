Aether = require './src/aether'

aether = new Aether
  language: "java"
  executionLimit: 1000,
  problems: {
    jshint_W040: {level: "ignore"},
    aether_MissingThis: {level: "warning"}
  },
  yieldConditionally: true
  language: 'java'
  includeFlow: false
  includeMetrics: false

aether.className = "One"
aether.staticCall = "main"

code = """
public class One {
    public static void main(String[] arg) {
        hero.charge();
        hero.hesitate();
        hero.hesitate();
        hero.charge();
        hero.hesitate();
        hero.charge();
    }
}
"""

aether.transpile code
console.log "A", aether.problems

thisValue =
  charge: () ->
    @say "attack!"
    return "attack!";
  hesitate: () ->
    @say "uhh..."
    aether._shouldYield = true
  say: console.log


method = aether.createMethod thisValue
generator = method()
aether.sandboxGenerator generator

executeSomeMore = () ->
  result = generator.next()
  if not result.done
    setTimeout executeSomeMore, 2000

executeSomeMore()

