var editors = [];
var Range = ace.require('ace/range').Range;

$(function() {
  $('.ace_editor_wrapper').each(function() {
    var editor = ace.edit(this);
    editor.setTheme("ace/theme/xcode");
    //editor.getSession().setMode("ace/mode/javascript");
    editors.push(editor);
  });

  setInterval(watchForCodeChanges, 500);
});

function grabThatCode() {
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
  var treemaOptions = {data: aether.problems, schema: {
    type: "object", additionalProperties: false, properties: {
      "errors": {type: 'array', maxItems: aether.problems.errors.length},
      "warnings": {type: 'array', maxItems: aether.problems.warnings.length},
      "infos": {type: 'array', maxItems: aether.problems.infos.length}
    }}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_problems').empty().append(el);

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
  if(!aether.flow) return;
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
  var treemaOptions = {data: aether.flow, schema: {type: "object", additionalProperties: false, properties: {states: {type: "array"}}}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_flow').append(el);
}

function showMetrics(aether) {
  $('#aether_metrics').empty();
  if(!aether.metrics) return;
  var el = $("<div></div>");
  var treemaOptions = {data: aether.metrics, schema: {type: "object"}};
  var treema = TreemaNode.make(el, treemaOptions);
  treema.build();
  $('#aether_metrics').append(el);
}

function showOutput(aether) {
  showProblems(aether);
  console.log("show the output", 3, 5, "yeah");
  editors[2].setValue(aether.pure);
  showMetrics(aether);
  showFlow(aether);
}

var lastJSInputAether = new Aether();
var lastAetherInput = '';
function watchForCodeChanges() {
  var aetherInput = editors[1].getValue();
  var code = grabThatCode();
  if(!lastJSInputAether.hasChangedSignificantly(code, lastJSInputAether) &&
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
