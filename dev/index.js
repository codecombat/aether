var editors = [];
var Range = ace.require('ace/range').Range;

$(function() {
  $('.ace_editor_wrapper').each(function() {
    var editor = ace.edit(this);
    editor.setTheme("ace/theme/xcode");
    //editor.getSession().setMode("ace/mode/javascript");
    editors.push(editor);
  });
  populateExamples();

  setInterval(watchForCodeChanges, 500);
});

function grabDemoCode() {
  return editors[0].getValue();
};

var markerRanges = [];

function clearMarkers() {
  var editor = editors[0];
  for(var i = 0; i < markerRanges.length; ++i) {
    var markerRange = markerRanges[i];
    markerRange.start.detach();
    markerRange.end.detach();
    editor.getSession().removeMarker(markerRange.id);
  }
  markerRanges = [];
};

function offsetToPos(offset, text) {
  var rows = text.substr(0, offset).split('\n');
  return {row: rows.length - 1, column: rows[rows.length - 1].length};
}

function showProblems(aether) {
  var el = $("<div></div>");
  for(var level in aether.problems) {
    var problems = aether.problems[level];
    for(var problemIndex in problems) {
      var problem = problems[problemIndex];
      if(problem.serialize)
        problems[problemIndex] = problem.serialize();
    }
  }
  var treemaOptions = {preventEditing: true, data: aether.problems, schema: {
    type: "object", additionalProperties: false, properties: {
      "errors": {type: 'array', maxItems: aether.problems.errors.length},
      "warnings": {type: 'array', maxItems: aether.problems.warnings.length},
      "infos": {type: 'array', maxItems: aether.problems.infos.length}
    }}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_problems').empty().append(el);
  treema.open(2);

  var editor = editors[0];
  var session = editor.getSession();
  var annotations = [];
  var allProblems = aether.getAllProblems();
  for(var problemIndex in allProblems) {
    var problem = allProblems[problemIndex];
    if(!problem.ranges) continue;
    var ann = {row: problem.ranges[0][0][0],
               column: problem.ranges[0][0][1],
               raw: problem.message,
               text: problem.message,
               type: problem.level || "error"
              };
    annotations.push(ann);
  }
  session.setAnnotations(annotations);
}

function showFlow(aether) {
  clearMarkers();
  $('#aether_flow').empty();
  if(!aether.flow || !aether.flow.states) return;
  var text = editors[0].getValue();
  var session = editors[0].getSession();
  for(var i = 0; i < aether.flow.states.length; ++i) {
    for(var j = 0; j < aether.flow.states[i].length; ++j) {
      var state = aether.flow.states[i][j];
      var start = offsetToPos(state.range[0], text);
      var end = offsetToPos(state.range[1], text);
      var markerRange = new Range(start.row, start.column, end.row, end.column);
      markerRange.start = session.doc.createAnchor(markerRange.start);
      markerRange.end = session.doc.createAnchor(markerRange.end);
      markerRange.id = session.addMarker(markerRange, "executed", "text");
      markerRanges.push(markerRange);
    }
  }

  var el = $("<div></div>");
  var treemaOptions = {preventEditing: true, data: aether.flow, schema: {type: "object", additionalProperties: false, properties: {states: {type: "array"}}}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_flow').append(el);
  treema.open(3);
}

function showMetrics(aether) {
  $('#aether_metrics').empty();
  if(!aether.metrics) return;
  var el = $("<div></div>");
  var treemaOptions = {preventEditing: true, data: aether.metrics, schema: {type: "object"}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_metrics').append(el);
  treema.open(3);
}

function demoShowOutput(aether) {
  showProblems(aether);
  editors[2].setValue(aether.pure);
  editors[2].clearSelection();
  showMetrics(aether);
  showFlow(aether);
}

var lastJSInputAether = new Aether();
var lastAetherInput = '';
function watchForCodeChanges() {
  var aetherInput = editors[1].getValue();
  var code = grabDemoCode();
  if(!Aether.hasChangedSignificantly(code, lastJSInputAether.raw) &&
     aetherInput == lastAetherInput)
    return;
  clearOutput();
  lastAetherInput = aetherInput;
  lastJSInputAether.transpile(code);
  eval(aetherInput);
}

var oldConsoleLog = console.log;
console.log = function() {
  oldConsoleLog.apply(console, arguments);
  var oldText = $("#aether_console").text();
  var newText = oldText + Array.prototype.slice.call(arguments).join(' ')+ '\n';
  $("#aether_console").text(newText);
};

function clearOutput() {
  $("#aether_console").text('');
  $("#aether_metrics").empty();
  $("#aether_flows").empty();
  $("#aether_problems").empty();
}

var examples = [
  {
    name: "Basic",
    code: function() {
      function fib(n) {
        return n < 2 ? n : fib(n - 1) + fib(n - 2);
      }
      var chupacabra = fib(Math.ceil(Math.random() * 5))
      this.say("I want", chupacabra, "gold.");
      return chupacabra;
    },
    aether: function() {
      var aetherOptions = {
        thisValue: {say: console.log},
        problems: {jshint_W040: {level: "ignore"}}
      };
      var aether = new Aether(aetherOptions);
      var code = grabDemoCode();
      aether.transpile(code);
      aether.run();
      aether.run();
      aether.run();
      demoShowOutput(aether);
    }
  },
  
  {
    name: "Buggy",
    code: function() {
      function distance_squared(from, target) {  // no camelCase
        if(from.pos)
          return distance_squared(from.pos, target);  // |from| as Thang
          if(target.pos)  // weird indentation
            return distance_squared(from, target.pos);  // |target| as Thang
        var dx = target.x - from.x; var dy = target.y - from.y;  // bad style: two statements, one line
////  return dx * dx + dy dy;  // syntax error
      }

      var enemies = getEnemys();  // missing this, also typo in method
      var nearestEnemy = null  // missing semicolon
      nearestDistance = 9001;  // missing var
      for(var enemy in enemies) {  // style: somehow warn user that JS loops don't really work like this on arrays?
        //for(var i = 0; i < enemies.length; ++i) {  // (better method of looping an array)
        var enemy = enemies[i];
        var distance = distance_squared(this, enemy);
        if(distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemyy;  // typo in local variable
        }
}//// //}  // missing curly brace
      this.markForDeath(nearestEnemy);  // no markForDeath method available in this challenge
////  this.say(nearestEnemy.id, you are going down!);  // missing string quotes, also will have runtime error when nearestEnemy is still null
      nearestEnemy.health = -9001;  // disallowed
      window.alert("pwn!");  // nope
      try {
        this.die();  // die() is not available, but they are going to handle it, so perhaps it shouldn't be an error?
      }
      catch (error) {
        this.say("Couldn't shuffle mortal coil.");
      }
      this.  // clearly not done typing
      this.explode;  // doesn't do anything because the function isn't called
      96;  // no effect
      return nearestEnemy;      
    },
    aether: function() {
      var aetherOptions = {
        thisValue: {
          getEnemies: function() { return [{id: "Brack", health: 10, pos: {x: 15, y: 20}}, {id: "Goreball", health: 20, pos: {x: 25, y: 30}}]; },
          say: console.log,
          explode: function() { this.say("Exploooode!"); }
        },
        problems: {
          jshint_W040: {level: "ignore"},
          aether_MissingThis: {level: 'warning'}
        },
        functionName: 'getNearestEnemy',
        requiresThis: false
      };
      var aether = new Aether(aetherOptions);
      var code = grabDemoCode();
      aether.transpile(code);
      aether.run();
      demoShowOutput(aether);
    }
  },
  
  {
    name: "Yield Sometimes",
    code: function() {
      // Try your own code here
      var x = this.charge();
      this.hesitate();
      this.hesitate();
      if(retries)
        return this.planStrategy(retries - 1);
      else
        return this.charge();
    },
    aether: function() {
      var aetherOptions = {
        thisValue: {
          charge: function() { this.say("attack!"); return "attack!"; },
          hesitate: function() { this.say("uhh..."); this._aetherShouldYield = true; },
          say: console.log
        },
        problems: {
          jshint_W040: {level: "ignore"},
          aether_MissingThis: {level: 'warning'}
        },
        functionName: 'planStrategy',
        functionParameters: ["retries"],
        yieldConditionally: true,
        requiresThis: false
      };
      var aether = new Aether(aetherOptions);
      var code = grabDemoCode();
      aether.transpile(code);
      var method = aether.createMethod();
      var generator = method();
      var executeSomeMore = function executeSomeMore() {
        var result = generator.next();
        demoShowOutput(aether);
        if(!result.done)
          setTimeout(executeSomeMore, 2000);
      };
      executeSomeMore();
    }
  },
  
  {
    name: "Yield Always",
    code: function() {
      // TODO: write a good test/demo here showing how we can execute the program piecemeal
    },
    aether: function() {
      // TODO: write a good test/demo here
    }
  },
  
  {
    name: "Hacker",
    code: function() {
      // TODO: write a good test/demo here where the user tries to hack out of the sandbox
    },
    aether: function() {
      // TODO: write a good test/demo here to show how we can stop her
    }
  },

  {
    name: "Advanced",
    code: function() {
      // TODO: write a good test/demo here to show off some crazy stuff
    },
    aether: function() {
      // TODO: write a good test/demo here
    }
  },

  {
    name: "Rectangles",
    code: function() {
      function largestRectangle(grid, bottomY, leftX, width, height) {
        var coveredRows = [];
        var shortestCoveredRow = width - leftX;
        var done = false;
        for(var y = bottomY; !done && y < grid.height; ++y) {
          var coveredRow = 0, done2 = false;
          for(var x = leftX; !done2 && x < leftX + shortestCoveredRow; ++x) {
            if(grid[y][x].length)
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
      var tileSize = 2;
      for(var y = tileSize / 2; y < grid.length; y += tileSize) {
        for(var x = tileSize / 2; x < grid[0].length; x += tileSize) {
          var occupied = grid[y][x].length > 0;
          if(!occupied) {
            var rect = largestRectangle(grid, y, x, grid[0].length, grid.length);
            this.say("rect", rect.x, rect.y, rect.width, rect.height);
            this.addRect(rect.x, rect.y, rect.width, rect.height);
            this.wait(0.01);
          }
        }
      }
    },
    aether: function() {
      var aetherOptions = {
        thisValue: {
          getNavGrid: function() { return {grid: [[[], [], []], [[], [], []], [['ho'], ['you'], []]]}; },
          addRect: function() { },
          say: console.log,
          wait: function() { }
        },
        problems: {
          jshint_W040: {level: "ignore"},
          aether_MissingThis: {level: 'warning'}
        },
        functionName: 'plan',
        functionParameters: [],
        yieldConditionally: true,
        requiresThis: true
      };
      var aether = new Aether(aetherOptions);
      var code = grabDemoCode();
      aether.transpile(code);
      var method = aether.createMethod();
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
    }
  }
];

function populateExamples() {
  var exampleSelect = $('#example-select');
  for(var i = 0; i < examples.length; ++i) {
    var option = $("<option></option>");
    option.val(i).text(examples[i].name);
    exampleSelect.append(option);
  }
  exampleSelect.change(function() {
    loadExample(parseInt($(this).val()));
  });
  loadExample(0);
}

function loadExample(i) {
  var ex = examples[i];
  editors[0].setValue(Aether.getFunctionBody(ex.code).replace(/^[^\/]*?(\/){4}/g, ''));
  editors[0].clearSelection();
  editors[1].setValue(Aether.getFunctionBody(ex.aether));
  editors[1].clearSelection();
}
