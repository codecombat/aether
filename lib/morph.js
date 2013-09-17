(function() {
  var acorn_loose, esprima, insertHelpers, morph, _, _ref, _ref1, _ref2;

  _ = (_ref = (_ref1 = (_ref2 = typeof window !== "undefined" && window !== null ? window._ : void 0) != null ? _ref2 : typeof self !== "undefined" && self !== null ? self._ : void 0) != null ? _ref1 : typeof global !== "undefined" && global !== null ? global._ : void 0) != null ? _ref : require('lodash');

  esprima = require('esprima');

  acorn_loose = require('acorn/acorn_loose');

  module.exports = morph = function(source, transforms, parser) {
    var ast, chunks, lines, locToRange, posToOffset, walk;
    if (parser == null) {
      parser = "esprima";
    }
    chunks = source.split('');
    if (parser === 'esprima') {
      ast = esprima.parse(source, {
        range: true,
        loc: true
      });
      locToRange = null;
    } else if (parser === 'acorn_loose') {
      ast = acorn_loose.parse_dammit(source, {
        locations: true
      });
      lines = source.replace(/\n/g, '\n空').split('空');
      posToOffset = function(pos) {
        return _.reduce(lines.slice(0, pos.line - 1), (function(sum, line) {
          return sum + line.length;
        }), 0) + pos.column;
      };
      locToRange = function(loc) {
        return [posToOffset(loc.start), posToOffset(loc.end)];
      };
    }
    walk = function(node, parent) {
      var child, grandchild, key, transform, _i, _j, _len, _len1, _results;
      insertHelpers(node, parent, chunks, locToRange);
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
          insertHelpers(child, node, chunks, locToRange);
          walk(child, node);
        }
      }
      _results = [];
      for (_j = 0, _len1 = transforms.length; _j < _len1; _j++) {
        transform = transforms[_j];
        _results.push(transform(node));
      }
      return _results;
    };
    walk(ast, void 0);
    return chunks.join('');
  };

  insertHelpers = function(node, parent, chunks, locToRange) {
    var update;
    if (node.loc && locToRange) {
      node.range = locToRange(node.loc);
    }
    if (!node.range) {
      return;
    }
    node.parent = parent;
    node.source = function() {
      return chunks.slice(node.range[0], node.range[1]).join('');
    };
    update = function(s) {
      var i, _i, _ref3, _ref4, _results;
      chunks[node.range[0]] = s;
      _results = [];
      for (i = _i = _ref3 = node.range[0] + 1, _ref4 = node.range[1]; _ref3 <= _ref4 ? _i < _ref4 : _i > _ref4; i = _ref3 <= _ref4 ? ++_i : --_i) {
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
