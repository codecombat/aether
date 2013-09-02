var editors = [];
$(function() {
  $('.ace_editor_wrapper').each(function() {
    var editor = ace.edit(this);
    editor.setTheme("ace/theme/xcode");
    //editor.getSession().setMode("ace/mode/javascript");
    editors.push(editor);
  });

  setInterval(watchForCodeChanges, 100);
});

var aetherOptions = {
  thisValue: {
    charge: function() { return "attack!"; },
    hesitate: function() { this._aetherShouldYield = true; }
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

function watchForCodeChanges() {
  var code = editors[0].getValue();
  if(!aether.hasChangedSignificantly(code, aether)) return;
  aether.transpile(code);
  editors[1].setValue(aether.pure);
  $('#aether_problems').text(JSON.stringify(aether.problems, null, 2));
}
