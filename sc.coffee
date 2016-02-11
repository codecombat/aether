Aether = require './src/aether'

aether = new Aether
  language: "java"
  executionLimit: 1000,
  problems: {
    jshint_W040: {level: "ignore"},
    aether_MissingThis: {level: "warning"}
  },
  yieldConditionally: true
  language: 'lua'
  includeFlow: false
  includeMetrics: false

aether.className = "One"
aether.staticCall = "main"

code = """
function doit()
  self.charge()
  self.hesitate()
end

self.hesitate()
self.charge()
self.hesitate()
self.charge()
"""

aether.transpile code
console.log "A", aether.problems
console.log "C", aether.getStatementCount()


