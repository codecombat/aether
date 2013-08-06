(function() {
  var Aether, commonMethods, defaults, errors, esprima, execution, falafel, problems, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = require('lodash');

  esprima = require('esprima');

  falafel = require('falafel');

  defaults = require('./defaults');

  problems = require('./problems');

  execution = require('./execution');

  errors = require('./errors');

  commonMethods = ['moveRight', 'moveLeft', 'moveUp', 'moveDown', 'attackNearbyEnemy', 'say', 'move', 'attackNearestEnemy', 'shootAt', 'rotateTo', 'shoot', 'distance', 'getNearestEnemy', 'getEnemies', 'attack', 'setAction', 'setTarget', 'getFriends', 'patrol'];

  module.exports = Aether = (function() {
    Aether.defaults = defaults;

    Aether.problems = problems;

    Aether.execution = execution;

    Aether.errors = errors;

    function Aether(options) {
      this.transform = __bind(this.transform, this);
      this.options = _.defaults(options || {}, _.cloneDeep(Aether.defaults));
    }

    Aether.prototype.canTranspile = function(raw) {
      return true;
    };

    Aether.prototype.hasChangedSignificantly = function(raw, oldAether) {
      return true;
    };

    Aether.prototype.hasChanged = function(raw, oldAether) {
      return true;
    };

    Aether.prototype.transpile = function(raw) {
      this.raw = raw;
      return this.pure = this.cook();
    };

    Aether.prototype.createFunction = function() {
      var func;
      func = new Function(options.parameters.join(', '), pure);
      if (options.thisValue) {
        func = _.bind(func, options.thisValue);
      }
      return func;
    };

    Aether.prototype.purifyError = function(error) {};

    Aether.prototype.serialize = function() {};

    Aether.deserialize = function(serialized) {};

    Aether.prototype.cook = function() {
      var error, i, output, wrapped, _ref;
      this.methodType = this.options.methodType || "instance";
      this.requireThis = (_ref = this.options.requireThis) != null ? _ref : false;
      wrapped = "function wrapped() {\n\"use strict\";\n" + this.raw + "\n}";
      wrapped = this.checkCommonMistakes(wrapped);
      this.vars = {};
      this.methodLineNumbers = (function() {
        var _i, _len, _ref1, _results;
        _ref1 = this.raw.split('\n');
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          i = _ref1[_i];
          _results.push([]);
        }
        return _results;
      }).call(this);
      try {
        output = falafel(wrapped, {}, this.transform);
      } catch (_error) {
        error = _error;
        throw new errors.UserCodeError(error.message, {
          thangID: this.options.thang.id,
          thangSpriteName: this.options.thang.spriteName,
          methodName: this.options.methodName,
          methodType: this.methodType,
          code: this.rawCode,
          recoverable: true,
          lineNumber: error.lineNumber - 2,
          column: error.column
        });
      }
      return this.cookedCode = Aether.getFunctionBody(output.toString(), false);
    };

    Aether.prototype.transform = function(node) {
      var error, exp, lineNumber, m, name, _ref, _ref1;
      if (!this.requireThis) {
        if (node.type === 'VariableDeclarator') {
          this.vars[node.id] = true;
        } else if (node.type === 'CallExpression') {
          if (node.callee.name && !this.vars[node.callee.name] && !this.options.global[node.callee.name]) {
            node.update("this." + (node.source()));
          }
        } else if (node.type === 'ReturnStatement' && !node.argument) {
          node.update("return this.validateReturn('" + this.options.methodName + "', null);");
        } else if (((_ref = node.parent) != null ? _ref.type : void 0) === 'ReturnStatement') {
          node.update("this.validateReturn('" + this.options.methodName + "', (" + (node.source()) + "))");
        }
      }
      if (node.type === 'ExpressionStatement') {
        lineNumber = Aether.getLineNumberForNode(node, true);
        exp = node.expression;
        if (exp.type === 'CallExpression') {
          if (exp.callee.type === 'MemberExpression') {
            name = exp.callee.property.name;
          } else if (exp.callee.type === 'Identifier') {
            name = exp.callee.name;
          } else if (typeof $ !== "undefined" && $ !== null) {
            console.log("How is this CallExpression being handled?", node, node.source(), exp.callee, exp.callee.source());
          }
          return this.methodLineNumbers[lineNumber].push(name);
        } else if (exp.type === 'MemberExpression') {
          if (exp.property.name === "IncompleteThisReference") {
            m = "this.what? (Check available spells below.)";
          } else {
            m = "" + (exp.source()) + " has no effect.";
            if (_ref1 = exp.property.name, __indexOf.call(commonMethods, _ref1) >= 0) {
              m += " It needs parentheses: " + exp.property.name + "()";
            }
          }
          error = new Error(m);
          error.lineNumber = lineNumber + 2;
          throw error;
        }
      }
    };

    Aether.prototype.getLineNumberForPlannedMethod = function(plannedMethod, numMethodsSeen) {
      var j, lineNumber, method, methods, n, _i, _j, _len, _len1, _ref;
      n = 0;
      _ref = this.methodLineNumbers;
      for (lineNumber = _i = 0, _len = _ref.length; _i < _len; lineNumber = ++_i) {
        methods = _ref[lineNumber];
        for (j = _j = 0, _len1 = methods.length; _j < _len1; j = ++_j) {
          method = methods[j];
          if (n++ < numMethodsSeen) {
            continue;
          }
          if (method === plannedMethod) {
            return lineNumber;
          }
        }
      }
      return null;
    };

    Aether.prototype.checkCommonMistakes = function(code) {
      code = code.replace(/this.\s*?\n/g, "this.IncompleteThisReference;");
      return code;
    };

    Aether.getLineNumberForNode = function(node, forRawCode) {
      var fullSource, i, line, parent, _i, _ref;
      if (forRawCode == null) {
        forRawCode = false;
      }
      parent = node;
      while (parent.type !== "Program") {
        parent = parent.parent;
      }
      fullSource = parent.source();
      line = forRawCode ? -1 : 1;
      for (i = _i = 0, _ref = node.range[0]; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        if (fullSource[i] === '\n') {
          ++line;
        }
      }
      return line;
    };

    Aether.getFunctionBody = function(source, removeIndent) {
      var indent, line, lines;
      if (removeIndent == null) {
        removeIndent = true;
      }
      lines = source.split(/\r?\n/);
      lines = lines.splice(1, lines.length - 2);
      if (removeIndent && lines.length) {
        indent = lines[0].length - lines[0].replace(/^ +/, '').length;
      } else {
        indent = 0;
      }
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = lines.length; _i < _len; _i++) {
          line = lines[_i];
          _results.push(line.slice(indent));
        }
        return _results;
      })()).join('\n');
    };

    return Aether;

  })();

}).call(this);
