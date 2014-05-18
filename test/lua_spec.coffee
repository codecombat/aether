Aether = require '../aether'

aether = new Aether language: "lua"

luaEval = (code, that) ->
  aether.reset()
  aether.transpile(code)
  return aether.run()

describe "Lua Test suite", ->
  describe "Basics", ->
    it "return 1000", ->
      expect(luaEval("""

      return 1000
      
      """)).toEqual 1000
    it "simple if", ->
      expect(luaEval("""
      if false then return 2000 end
      return 1000
      """)).toBe(1000)

    it "multiple elif", ->
      expect(luaEval("""
      local x = 4
      if x == 2 then
        x = x + 1
        return '2'
      elseif x == 44564 then
        x = x + 1
        return '44564'
      elseif x == 4 then
        x = x + 1
        return x
      end
      """)).toBe(5)

    it "mathmetics order", ->
      code = """
      return (2*2 + 2/2 - 2*2/2)
      """
      aether.transpile(code)
      expect(aether.run()).toBe(3)

    it "fibonacci function", ->
      expect(luaEval("""
      function fib(n)
        if n < 2 then return n
        else return fib(n - 1) + fib(n - 2) end
      end
      chupacabra = fib(10)
      return chupacabra
      """)).toEqual 55

    it "for loop", ->
      expect(luaEval("""
      data = {4, 2, 65, 7}
      total = 0
      for k,d in pairs(data) do
        total = total + d
      end
      return total
      """)).toBe(78)

    it "bubble sort", ->
      code = """
      local function createShuffled(n)
        r = n * 10 + 1
        shuffle = {}
        for i=1,n do
          item = r * math.random()
          shuffle[#shuffle] = item
        end
        return shuffle
      end

      local function bubbleSort(data)
        sorted = false
        while not sorted do
          sorted = true
          for i=1,#data - 1 do
            if data[i] > data[i + 1] then
              t = data[i]
              data[i] = data[i + 1]
              data[i+1] = t
              sorted = false
            end
          end
        end
        return data
      end
    
      local function isSorted(data)
        for i=1,#data - 1 do
          if data[i] > data[i + 1] then
            return false
          end
        end
        return true
      end

      data = createShuffled(10)
      bubbleSort(data)
      return isSorted(data)
      """
      aether.transpile(code)
      expect(aether.run()).toBe(true)

    it "dictionary", ->
      code = """
      d = {p1='prop1'}
      return d['p1']
      """
      aether.transpile(code)
      expect(aether.run()).toBe('prop1')

  describe "Usage", ->
    it "self.doStuff via thisValue param", ->
      history = []
      log = (s) ->
        expect(s).toEqual "hello"
        history.push s
      thisValue = {say: log}
      thisValue.moveDown = () ->
        expect(this).toEqual thisValue
        history.push 'moveDown'
      
      aetherOptions = {
        language: 'lua'
      }
      aether = new Aether aetherOptions
      code = """
      self:moveDown()
      self:say('hello')
      """
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(history).toEqual(['moveDown', 'hello'])

    it "Math is fun?", ->
      thisValue = {}
      aetherOptions = {
        language: 'lua'
      }
      aether = new Aether aetherOptions
      code = """
      return math.abs(-3) == 3
      """
      aether.transpile code
      method = aether.createMethod thisValue
      expect(aether.run(method)).toEqual(true)

    it "self.getItems", ->
      history = []
      getItems = () -> [{'pos':1}, {'pos':4}, {'pos':3}, {'pos':5}]
      move = (i) -> history.push i
      thisValue = {getItems: getItems, move: move}
      aetherOptions = {
        language: 'lua'
      }
      aether = new Aether aetherOptions
      code = """
      local items = self.getItems()
      for k,item in pairs(items) do
        self.move(item['pos'])
      end
      """
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(history).toEqual([1, 4, 3, 5])

