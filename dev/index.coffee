editors = []
Range = ace.require("ace/range").Range
$ ->
  $(".ace-editor-wrapper").each ->
    editor = ace.edit(this)
    editor.setTheme "ace/theme/xcode"
    editor.getSession().setUseWorker false
    editor.getSession().setMode "ace/mode/javascript"
    editor.getSession().getDocument().on "change", watchForCodeChanges
    editors.push editor

  populateExamples()

  if top.location.href.match 'file:'
    $('a[href="#demo"]').tab('show')

grabDemoCode = ->
  editors[0].getValue()

markerRanges = []

clearMarkers = ->
  editor = editors[0]
  for markerRange in markerRanges
    markerRange.start.detach()
    markerRange.end.detach()
    editor.getSession().removeMarker markerRange.id
  markerRanges = []

lastProblems = null
showProblems = (aether) ->
  return if _.isEqual aether.problems, lastProblems
  lastProblems = aether.problems
  el = $("<div></div>")
  for level of aether.problems
    problems = aether.problems[level]
    for problemIndex of problems
      problem = problems[problemIndex]
      problems[problemIndex] = problem.serialize() if problem.serialize
  treemaOptions =
    readOnly: true
    data: aether.problems
    schema:
      type: "object"
      additionalProperties: false
      properties:
        errors:
          type: "array"
          maxItems: aether.problems.errors.length
        warnings:
          type: "array"
          maxItems: aether.problems.warnings.length
        infos:
          type: "array"
          maxItems: aether.problems.infos.length

  try
    treema = TreemaNode.make(el, treemaOptions)
    treema.build()
    $("#aether-problems").empty().append el
    treema.open 2
  catch err
    console.error "Couldn't make problems Treema:", err
  editor = editors[0]
  session = editor.getSession()
  annotations = []
  allProblems = aether.getAllProblems()
  for problemIndex of allProblems
    problem = allProblems[problemIndex]
    continue unless problem.ranges?[0]?
    ann =
      row: problem.ranges[0][0].row
      column: problem.ranges[0][0].col
      raw: problem.message
      text: problem.message
      type: problem.level or "error"
    annotations.push ann
  session.setAnnotations annotations
  wrapper = $("#worst-problem-wrapper").empty()
  worst = allProblems[0]
  if worst
    text = worst.type + " " + worst.level
    text += ": " + worst.message
    wrapper.text text
    wrapper.toggleClass "error", worst.level is "error"
    wrapper.toggleClass "warning", worst.level is "warning"
    wrapper.toggleClass "info", worst.level is "info"

showFlow = (aether) ->
  clearMarkers()
  $("#aether-flow").empty()
  return unless aether.flow?.states
  text = editors[0].getValue()
  session = editors[0].getSession()
  seen = {}
  for states in aether.flow.states
    for state in states.statements
      key = state.range[0].ofs + '-' + state.range[1].ofs
      continue if seen[key] > 3
      seen[key] ?= 0
      ++seen[key]
      [start, end] = state.range
      markerRange = new Range(start.row, start.col, end.row, end.col)
      markerRange.start = session.doc.createAnchor(markerRange.start)
      markerRange.end = session.doc.createAnchor(markerRange.end)
      markerRange.id = session.addMarker(markerRange, "executed", "text")
      markerRanges.push markerRange
  el = $("<div></div>")
  treemaOptions =
    readOnly: true
    data: aether.flow
    schema:
      type: "object"
      additionalProperties: false
      properties:
        states:
          type: "array"
  try
    treema = TreemaNode.make(el, treemaOptions)
    treema.build()
    $("#aether-flow").append el
    treema.open 3
  catch err
    console.error "Couldn't make flow Treema:", err

showMetrics = (aether) ->
  $("#aether-metrics").empty()
  return unless aether.metrics
  el = $("<div></div>")
  treemaOptions =
    readOnly: true
    data: aether.metrics
    schema:
      type: "object"
  try
    treema = TreemaNode.make(el, treemaOptions)
    treema.build()
    $("#aether-metrics").append el
    treema.open 1
  catch err
    console.error "Couldn't make metrics Treema:", err

demoShowOutput = (aether) ->
  showProblems aether
  editors[2].setValue aether.pure
  editors[2].clearSelection()
  window.lastAether = aether
  showMetrics aether
  showFlow aether

clearOutput = ->
  $("#aether-console").text ""
  $("#aether-metrics").empty()
  $("#aether-flows").empty()
  $("#aether-problems").empty()

lastJSInputAether = new Aether
lastAetherInput = ""
watchForCodeChanges = ->
  aetherInput = editors[1].getValue()
  code = grabDemoCode()
  return if not lastJSInputAether.hasChangedSignificantly(code, lastJSInputAether.raw) and aetherInput is lastAetherInput
  clearOutput()
  lastAetherInput = aetherInput
  lastJSInputAether.staticCall = 'output'
  lastJSInputAether.className = 'Main'
  lastJSInputAether.transpile code
  eval aetherInput
watchForCodeChanges = _.debounce(watchForCodeChanges, 1000)

oldConsoleLog = console.log
console.log = ->
  oldConsoleLog.apply console, arguments
  ac = $("#aether-console")
  oldText = ac.text()
  newText = oldText + Array::slice.call(arguments).join(" ") + "\n"
  ac.text(newText).scrollTop(ac.prop 'scrollHeight')

populateExamples = ->
  exampleSelect = $("#example-select")
  for example, i in examples
    option = $("<option></option>")
    option.val(i).text example.name
    exampleSelect.append option
  exampleSelect.change ->
    loadExample parseInt($(this).val())

  loadExample 0

loadExample = (i) ->
  ex = examples[i]
  editors[0].setValue ex.code
  editors[0].clearSelection()
  editors[1].setValue ex.aether
  editors[1].clearSelection()


examples = [
  name: "Java Yielding Conditionally"
  code: '''
    public class Main {
        public static void main(String[] args) {
            hero.charge();
            hero.hesitate();
            hero.hesitate();
            hero.charge();
            hero.hesitate();
            hero.charge();
        }
    }
    '''
  aether: '''
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      yieldConditionally: true,
      language: 'java',
      includeFlow: false,
      includeMetrics: false
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      charge: function() { this.say("attack!"); return "attack!"; },
      hesitate: function() { this.say("uhh..."); aether._shouldYield = true; },
      say: console.log
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    aether.sandboxGenerator(generator);
    var executeSomeMore = function executeSomeMore() {
      var result = generator.next();
      demoShowOutput(aether);
      if(!result.done)
        setTimeout(executeSomeMore, 2000);
    };
    executeSomeMore();
    '''
,
  name: "Basic Java"
  code: '''
    public class Main {
        public static void main(String[] args) {
            hero.moveRight(2);
        }
    }
    '''

  aether: '''
    var thisValue = {
        moveRight: function (s) { console.log('moveRight(' + s + ')!');}
    };
    var aetherOptions = {
      executionLimit: 1000,
      problems: {jshint_W040: {level: "ignore"}},
      language: 'java',
      includeFlow: false,
      includeMetrics: false
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
  name: "Basic"
  code: '''
    function fib(n) {
      return n < 2 ? n : fib(n - 1) + fib(n - 2);
    }
    var chupacabra = fib(Math.ceil(Math.random() * 5))
    this.say("I want", chupacabra, "gold.");
    return chupacabra;
    '''

  aether: '''
    var thisValue = {say: console.log};
    var aetherOptions = {
      executionLimit: 1000,
      problems: {jshint_W040: {level: "ignore"}}
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    aether.run(method);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
  name: "Basic Python"
  code: '''
    self.sayItLoud('Hi')
    '''

  aether: '''
    var thisValue = {
        sayItLoud: function (s) { console.log(s + '!');}
    };
    var aetherOptions = {
      executionLimit: 1000,
      problems: {jshint_W040: {level: "ignore"}},
      language: 'python'
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
  name: "While true auto yields"
  code: '''
    x = 0
    while True:
      x += 1
      if x >= 4:
        break
  '''
  aether: '''
    var aetherOptions = {
      yieldConditionally: true,
      whileTrueAutoYield: true,
      language: 'python',
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      killCount: 0,
      slay: function() {
        this.killCount += 1;
        aether._shouldYield = true;
        },
      getKillCount: function() { return this.killCount; }
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var f = aether.createFunction();
    var gen = f.apply(thisValue);
    console.log(gen.next().done);
    console.log(gen.next().done);
    console.log(gen.next().done);
    console.log(gen.next().done);
    '''
,
  name: "Simple loop"
  code: '''
    x = 0
    loop:
      y = 0
      loop:
        self.slay()
        y += 1
        if y >= 2:
          break
      x += 1
      if x >= 3:
        break
  '''
  aether: '''
    var aetherOptions = {
      yieldConditionally: true,
      simpleLoops: true,
      language: 'python',
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      killCount: 0,
      slay: function() {
        this.killCount += 1;
        aether._shouldYield = true;
        },
      getKillCount: function() { return this.killCount; }
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var f = aether.createFunction();
    var gen = f.apply(thisValue);
    for (var i = 1; i <= 3; i++) {
      for (var j = 1; j <= 2; j++) {
        console.log(gen.next().done);
        console.log(thisValue.killCount);
      }
      if (i < 3) console.log(gen.next().done);
    }
    console.log("Equals 6?", thisValue.killCount);
    '''
,
  name: "Python yielding from subfunction"
  code: '''
    def buildArmy():
        self.hesitate()

    loop:
        buildArmy()
    '''
  aether: '''
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      functionName: "planStrategy",
      yieldConditionally: true,
      simpleLoops: true,
      language: "python",
      includeFlow: false,
      includeMetrics: false
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      charge: function() { this.say("attack!"); return "attack!"; },
      hesitate: function() { this.say("uhh...!!"); aether._shouldYield = true; },
      say: console.log
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    aether.sandboxGenerator(generator);
    var executeSomeMore = function executeSomeMore() {
      var result = generator.next();
      demoShowOutput(aether);
      if(!result.done)
        setTimeout(executeSomeMore, 2000);
    };
    executeSomeMore();
    '''
,
  name: "Python protected"
  code: '''
    a = [1]
    b = [2]
    c = a + b
    print(c.type)
    print(c)
    '''

  aether: '''
    var thisValue = {say: console.log};
    var aetherOptions = {
      executionLimit: 1000,
      problems: {jshint_W040: {level: "ignore"}},
      language:'python',
      protectAPI:true
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
  name: "Buggy"
  code: '''
    function distance_squared(from, target) {  // no camelCase
      if(from.pos)
        return distance_squared(from.pos, target);  // |from| as Thang
        if(target.pos)  // weird indentation
          return distance_squared(from, target.pos);  // |target| as Thang
      var dx = target.x - from.x; var dy = target.y - from.y;  // bad style: two statements, one line
    return dx * dx + dy dy;  // syntax error
    }

    var enemies = getEnemys();  // missing this, also typo in method
    var nearestEnemy = null  // missing semicolon
    nearestDistance = 9001;  // missing var
    for(var enemy in enemies) {  // style: somehow warn user that JS loops do not really work like this on arrays?
      //for(var i = 0; i < enemies.length; ++i) {  // (better method of looping an array)
      var enemy = enemies[i];
      var distance = distance_squared(this, enemy);
      if(distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemyy;  // typo in local variable
      }
    //}  // missing curly brace
    this.markForDeath(nearestEnemy);  // no markForDeath method available in this challenge
    this.say(nearestEnemy.id, you are going down!);  // missing string quotes, also will have runtime error when nearestEnemy is still null
    nearestEnemy.health = -9001;  // disallowed
    window.alert("pwn!");  // nope
    try {
      this.die();  // die() is not available, but they are going to handle it, so perhaps it should not be an error?
    }
    catch (error) {
      this.say("Could not shuffle mortal coil.");
    }
    this.  // clearly not done typing
    this.explode;  // does not do anything because the function is not called
    96;  // no effect
    return nearestEnemy;
  '''

  aether: '''
    var thisValue ={
      getEnemies: function() { return [{id: "Brack", health: 10, pos: {x: 15, y: 20}}, {id: "Goreball", health: 20, pos: {x: 25, y: 30}}]; },
      say: console.log,
      explode: function() { this.say("Exploooode!"); }
    };
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      functionName: "getNearestEnemy",
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
  name: "Yield Conditionally"
  code: '''
    // Try your own code here
    var x = this.charge();
    this.hesitate();
    this.hesitate();
    if(retries)
      return this.planStrategy(retries - 1);
    else
      return this.charge();
    '''

  aether: '''
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      functionName: "planStrategy",
      functionParameters: ["retries"],
      yieldConditionally: true,
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      charge: function() { this.say("attack!"); return "attack!"; },
      hesitate: function() { this.say("uhh..."); aether._shouldYield = true; },
      say: console.log
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    aether.sandboxGenerator(generator);
    var executeSomeMore = function executeSomeMore() {
      var result = generator.next();
      demoShowOutput(aether);
      if(!result.done)
        setTimeout(executeSomeMore, 2000);
    };
    executeSomeMore();
    '''
,
  name: "Yield Automatically"
  code: '''
    for (var i = 1; i <= 100; ++i) {
      this.print([!(i % 3) ? 'fizz' : void 0] + [!(i % 5) ? 'buzz' : void 0] || i);
    }
    '''

  aether: '''
    var thisValue = {
      print: console.log
    };
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"}
      },
      yieldAutomatically: true
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    aether.sandboxGenerator(generator);
    var executeSomeMore = function executeSomeMore() {
      var result = generator.next();
      demoShowOutput(aether);
      if(!result.done)
        setTimeout(executeSomeMore, 25);
    };
    executeSomeMore();
    '''
,
  name: "Hacker"
  code: '''
      var s = 'var x=new XMLHttpRequest();x.open("GET","/auth/whoami",false);x.send();var u=JSON.parse(x.responseText);u.name="Nick!";x=new XMLHttpRequest();x.open("PUT","/db/user/"+u._id,false);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify(u));'
      this.say("Trying to run hack!");
      (function(){}).__proto__.constructor(s)();
      this.say("Did we error out?");
    '''

  aether: '''
    var thisValue = {say: console.log};
    var aetherOptions = {
      executionLimit: 1000,
      problems: {jshint_W040: {level: "ignore"}}
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    aether.run(method);
    demoShowOutput(aether);
    '''
,
#  name: "Advanced"
#  code: '''
#    // TODO: write a good test/demo here to show off some crazy stuff
#    '''
#  aether: '''
#    // TODO: write a good test/demo here
#    '''
#,
  name: "Rectangles"
  code: '''
    function largestRectangle(grid, bottomY, leftX, width, height) {
      var coveredRows = [];
      var shortestCoveredRow = width - leftX;
      var done = false;
      for(var y = bottomY; !done && y < height; ++y) {
        var coveredRow = 0, done2 = false;
        for(var x = leftX; !done2 && x < leftX + shortestCoveredRow; ++x) {
          if(!grid[y][x])
            ++coveredRow;
          else
            done2 = true;
        }
        if(!coveredRow)
          done = true;
        else {
          coveredRows.push(coveredRow);
          shortestCoveredRow = Math.min(shortestCoveredRow, coveredRow);
        }
      }
      var maxArea = 0, maxAreaRows = 0, maxAreaRowLength = 0, shortestRow = 0;
      for(var rowIndex = 0; rowIndex < coveredRows.length; ++rowIndex) {
        var rowLength = coveredRows[rowIndex];
        if(!shortestRow)
          shortestRow = rowLength;
        area = rowLength * (rowIndex + 1);
        if(area > maxArea) {
          maxAreaRows = rowIndex +1;
          maxAreaRowLength = shortestRow;
          maxArea = area;
        }
        shortestRow = Math.min(rowLength, shortestRow);
      }
      return {x: leftX + maxAreaRowLength / 2, y: bottomY + maxAreaRows / 2, width: maxAreaRowLength, height: maxAreaRows};
    }

    var grid = this.getNavGrid().grid;
    var tileSize = 4;
    for(var y = 0; y < grid.length - tileSize / 2; y += tileSize) {
      for(var x = 0; x < grid[0].length - tileSize / 2; x += tileSize) {
        var occupied = grid[y][x];
        if(!occupied) {
          var rect = largestRectangle(grid, y, x, grid[0].length, grid.length);
          this.addRect(rect.x, rect.y, rect.width, rect.height);
          this.say("Placed rect " + rect.x + ", " + rect.y + ", " + rect.width + ", " + rect.height + " for " + grid[0].length + ",  " + grid.length + ", " + x + ", " + y);
          this.wait(0.1);
          for(var y2 = rect.y - rect.height / 2; y2 < rect.y + rect.height / 2; ++y2) {
            for(var x2 = rect.x - rect.width / 2; x2 < rect.x + rect.width / 2; ++x2) {
              grid[y2][x2] = 1;
            }
          }
        }
      }
    }
    '''

  aether: '''
    var _canvas = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    var thisValue = {
      getNavGrid: function() { return {grid: _canvas }; },
      addRect: function() { },
      say: console.log,
      wait: function() { }
    };
    var aetherOptions = {
      executionLimit: 10000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      functionName: "plan",
      functionParameters: [],
      yieldConditionally: true,
    };
    var aether = new Aether(aetherOptions);
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    if(aetherOptions.yieldConditionally) {
      var executeSomeMore = function executeSomeMore() {
        var result = generator.next();
        demoShowOutput(aether);
        if(!result.done)
          setTimeout(executeSomeMore, 2000);
      };
      executeSomeMore();
    }
    else {
      demoShowOutput(aether);
    }
    '''
,
  name: "User method"
  code: '''
    function f(self) {
        self.hesitate();
        b(self);
        (function () {
            self.stroll();
        })();
    }
    function b(self) {
        self.hesitate();
    }
    f(this);
    this.charge();
    '''

  aether: '''
    var aetherOptions = {
      executionLimit: 1000,
      problems: {
        jshint_W040: {level: "ignore"},
        aether_MissingThis: {level: "warning"}
      },
      functionName: "planStrategy",
      functionParameters: ["retries"],
      yieldConditionally: true,
    };
    var aether = new Aether(aetherOptions);
    var thisValue = {
      charge: function() { this.say("attack!"); return "attack!"; },
      hesitate: function() { this.say("uhh..."); aether._shouldYield = true; },
      stroll: function() { this.say("strolling..."); aether._shouldYield = true; },
      say: console.log
    };
    var code = grabDemoCode();
    aether.transpile(code);
    var method = aether.createMethod(thisValue);
    var generator = method();
    aether.sandboxGenerator(generator);
    var executeSomeMore = function executeSomeMore() {
      var result = generator.next();
      demoShowOutput(aether);
      if(!result.done)
        setTimeout(executeSomeMore, 2000);
    };
    executeSomeMore();
    '''
]
