Aether = require '../aether'

describe "Python Test suite", ->
  describe "Basics", ->
    aether = new Aether language: "python"
    it "return 1000", ->
      code = """
      return 1000
      """
      aether.transpile(code)
      expect(aether.run()).toEqual 1000

    it "simple if", ->
      code = """
      if False: return 2000
      return 1000
      """
      aether.transpile(code)
      expect(aether.run()).toBe(1000)

    it "multiple elif", ->
      code = """
      x = 4
      if x == 2:
        x += 1
        return '2'
      elif x == 44564:
        x += 1
        return '44564'
      elif x == 4:
        x += 1
        return '4'
      """
      aether.transpile(code)
      expect(aether.run()).toBe('4')

    it "mathmetics order", ->
      code = """
      return (2*2 + 2/2 - 2*2/2)
      """
      aether.transpile(code)
      expect(aether.run()).toBe(3)

    it "fibonacci function", ->
      code = """
      def fib(n):
        if n < 2: return n
        else: return fib(n - 1) + fib(n - 2)
      chupacabra = fib(6)
      return chupacabra
      """
      aether.transpile(code)
      expect(aether.run()).toBe(8)

    it "for loop", ->
      code = """
      data = [4, 2, 65, 7]
      total = 0
      for d in data:
        total += d
      return total
      """
      aether.transpile(code)
      expect(aether.run()).toBe(78)

    it "bubble sort", ->
      code = """
      import random
      def createShuffled(n):
        r = n * 10 + 1
        shuffle = []
        for i in range(n):
          item = int(r * random.random())
          shuffle.append(item)
        return shuffle
    
      def bubbleSort(data):
        sorted = False
        while not sorted:
          sorted = True
          for i in range(len(data) - 1):
            if data[i] > data[i + 1]:
              t = data[i]
              data[i] = data[i + 1]
              data[i + 1] = t
              sorted = False
        return data
    
      def isSorted(data):
        for i in range(len(data) - 1):
          if data[i] > data[i + 1]:
            return False
        return True
    
      data = createShuffled(10)
      bubbleSort(data)
      return isSorted(data)
      """
      aether.transpile(code)
      expect(aether.run()).toBe(true)

    it "dictionary", ->
      code = """
      d = {'p1': 'prop1'}
      return d['p1']
      """
      aether.transpile(code)
      expect(aether.run()).toBe('prop1')

  describe "Usage", ->
    it "self.doStuff via thisValue param", ->
      history = []
      log = (s) -> history.push s 
      moveDown = () -> history.push 'moveDown'
      thisValue = {say: log, moveDown: moveDown}
      aetherOptions = {
        language: 'python'
      }
      aether = new Aether aetherOptions
      code = """
      self.moveDown()
      self.say('hello')
      """
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(history).toEqual(['moveDown', 'hello'])

    it "Math is fun?", ->
      thisValue = {}
      aetherOptions = {
        language: 'python'
      }
      aether = new Aether aetherOptions
      code = """
      return Math.abs(-3) == abs(-3)
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
        language: 'python'
      }
      aether = new Aether aetherOptions
      code = """
      items = self.getItems()
      for item in items:
        self.move(item['pos'])
      """
      aether.transpile code
      method = aether.createMethod thisValue
      aether.run method
      expect(history).toEqual([1, 4, 3, 5])
