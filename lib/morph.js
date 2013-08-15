(function() {
  var esprima, insertHelpers, morph;

  esprima = require('esprima');

  module.exports = morph = function(source, transform) {
    var ast, chunks, walk;
    chunks = source.split('');
    ast = esprima.parse(source, {
      range: true
    });
    walk = function(node, parent) {
      var child, grandchild, key, _i, _len;
      insertHelpers(node, parent, chunks);
      for (key in node) {
        child = node[key];
        if (key === 'parent') {
          continue;
        }
        if (_.isArray(child)) {
          for (_i = 0, _len = child.length; _i < _len; _i++) {
            grandchild = child[_i];
            if (_.isString(grandchild != null ? grandchild.type : void 0)) {
              walk(grandchild, node);
            }
          }
        } else if (_.isString(child != null ? child.type : void 0)) {
          insertHelpers(child, node, chunks);
          walk(child, node);
        }
      }
      return transform(node);
    };
    walk(ast, void 0);
    return chunks.join('');
  };

  insertHelpers = function(node, parent, chunks) {
    var update;
    if (!node.range) {
      return;
    }
    node.parent = parent;
    node.source = function() {
      return chunks.slice(node.range[0], node.range[1]).join('');
    };
    update = function(s) {
      var i, _i, _ref, _ref1, _results;
      chunks[node.range[0]] = s;
      _results = [];
      for (i = _i = _ref = node.range[0] + 1, _ref1 = node.range[1]; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
        _results.push(chunks[i] = '');
      }
      return _results;
    };
    if (_.isObject(node.update)) {
      _.extend(update, node.update);
    }
    return node.update = update;
  };

}).call(this);
