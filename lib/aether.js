(function() {
  var Aether, defaults, errors, execution, falafel, jshint, optionsValidator, problems, _, _ref, _ref1, _ref2,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = (_ref = (_ref1 = (_ref2 = typeof window !== "undefined" && window !== null ? window._ : void 0) != null ? _ref2 : typeof self !== "undefined" && self !== null ? self._ : void 0) != null ? _ref1 : typeof global !== "undefined" && global !== null ? global._ : void 0) != null ? _ref : require('lodash');

  falafel = require('falafel');

  jshint = require('jshint').JSHINT;

  defaults = require('./defaults');

  problems = require('./problems');

  execution = require('./execution');

  errors = require('./errors');

  optionsValidator = require('./validators/options');

  module.exports = Aether = (function() {
    Aether.defaults = defaults;

    Aether.problems = problems.problems;

    Aether.execution = execution;

    Aether.errors = errors;

    function Aether(options) {
      this.transform = __bind(this.transform, this);
      var optionsValidation;
      this.originalOptions = _.cloneDeep(options);
      if (options == null) {
        options = {};
      }
      if (options.problems == null) {
        options.problems = {};
      }
      if (!options.excludeDefaultProblems) {
        options.problems = _.merge(_.cloneDeep(Aether.problems), options.problems);
      }
      optionsValidation = optionsValidator(options);
      if (!optionsValidation.valid) {
        throw new Error("Options array is not valid: " + JSON.stringify(optionsValidation.errors, null, 4));
      }
      this.options = _.merge(_.cloneDeep(Aether.defaults), options);
      this.reset();
    }

    Aether.prototype.canTranspile = function(raw, thorough) {
      var e, lintProblems;
      if (thorough == null) {
        thorough = false;
      }
      if (!raw) {
        return true;
      }
      try {
        eval("'use strict;'\nthrow 0;" + raw);
      } catch (_error) {
        e = _error;
        if (e !== 0) {
          return false;
        }
      }
      if (!thorough) {
        return true;
      }
      lintProblems = this.lint(raw);
      return lintProblems.errors.length === 0;
    };

    Aether.prototype.hasChangedSignificantly = function(raw, oldAether) {
      if (!oldAether) {
        return true;
      }
      return raw !== oldAether.raw;
    };

    Aether.prototype.hasChanged = function(raw, oldAether) {
      if (!oldAether) {
        return true;
      }
      return raw !== oldAether.raw;
    };

    Aether.prototype.reset = function() {
      this.problems = {
        errors: [],
        warnings: [],
        infos: []
      };
      this.style = {};
      this.flow = {};
      this.metrics = {};
      this.visualization = {};
      return this.pure = null;
    };

    Aether.prototype.transpile = function(raw) {
      this.raw = raw;
      this.reset();
      this.problems = this.lint(this.raw);
      this.pure = this.cook();
      return this.pure;
    };

    Aether.prototype.lint = function(raw) {
      var error, g, jshintGlobals, jshintOptions, jshintSuccess, lintProblems, prefix, problem, strictCode, suffix, _i, _len, _ref3;
      prefix = "function wrapped() {\n\"use strict\";\n";
      suffix = "\n}";
      strictCode = prefix + raw + suffix;
      lintProblems = {
        errors: [],
        warnings: [],
        infos: []
      };
      jshintOptions = {
        browser: false,
        couch: false,
        devel: false,
        dojo: false,
        jquery: false,
        mootools: false,
        node: false,
        nonstandard: false,
        phantom: false,
        prototypejs: false,
        rhino: false,
        worker: false,
        wsh: false,
        yui: false
      };
      jshintGlobals = _.keys(this.options.global);
      jshintGlobals = _.zipObject(jshintGlobals, (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = jshintGlobals.length; _i < _len; _i++) {
          g = jshintGlobals[_i];
          _results.push(false);
        }
        return _results;
      })());
      jshintSuccess = jshint(strictCode, jshintOptions, jshintGlobals);
      _ref3 = jshint.errors;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        error = _ref3[_i];
        problem = new problems.UserCodeProblem(error, strictCode, this, 'jshint', prefix);
        if (problem.level === "ignore") {
          continue;
        }
        console.log("JSHint found problem:", problem.serialize());
        lintProblems[problem.level + "s"].push(problem);
      }
      return lintProblems;
    };

    Aether.prototype.createFunction = function() {
      return new Function(this.options.functionParameters.join(', '), this.pure);
    };

    Aether.prototype.createMethod = function() {
      var func;
      func = this.createFunction();
      if (this.options.thisValue) {
        func = _.bind(func, this.options.thisValue);
      }
      return func;
    };

    Aether.prototype.purifyError = function(error, userInfo) {
      var errorMessage, errorPos, pureError, _ref3;
      errorPos = Aether.errors.UserCodeError.getAnonymousErrorPosition(error);
      errorMessage = Aether.errors.UserCodeError.explainErrorMessage(error);
      if (userInfo == null) {
        userInfo = {};
      }
      if (userInfo.lineNumber == null) {
        userInfo.lineNumber = errorPos.lineNumber != null ? errorPos.lineNumber - 1 : void 0;
      }
      if (userInfo.column == null) {
        userInfo.column = errorPos.column;
      }
      pureError = new Aether.errors.UserCodeError(errorMessage, (_ref3 = error.level) != null ? _ref3 : "error", userInfo);
      this.problems[pureError.level + "s"].push(pureError.serialize());
      return pureError;
    };

    Aether.prototype.getAllProblems = function() {
      return _.flatten(_.values(this.problems));
    };

    Aether.prototype.serialize = function() {
      var serialized;
      serialized = {
        originalOptions: this.originalOptions,
        raw: this.raw,
        pure: this.pure,
        problems: this.problems,
        style: this.style,
        flow: this.flow,
        metrics: this.metrics,
        visualization: this.visualization
      };
      serialized = _.cloneDeep(serialized);
      serialized.originalOptions.thisValue = null;
      return serialized;
    };

    Aether.deserialize = function(serialized) {
      var aether, prop, val;
      aether = new Aether(serialized.originalOptions);
      for (prop in serialized) {
        val = serialized[prop];
        aether[prop] = val;
      }
      return aether;
    };

    Aether.prototype.cook = function() {
      var column, error, i, lineNumber, output, pureError, userInfo, wrapped, _ref3;
      this.methodType = this.options.methodType || "instance";
      this.requireThis = (_ref3 = this.options.requireThis) != null ? _ref3 : false;
      wrapped = "function wrapped() {\n\"use strict\";\n" + this.raw + "\n}";
      wrapped = this.checkCommonMistakes(wrapped);
      this.vars = {};
      this.methodLineNumbers = (function() {
        var _i, _len, _ref4, _results;
        _ref4 = this.raw.split('\n');
        _results = [];
        for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
          i = _ref4[_i];
          _results.push([]);
        }
        return _results;
      }).call(this);
      try {
        output = falafel(wrapped, {}, this.transform);
      } catch (_error) {
        error = _error;
        lineNumber = error.lineNumber != null ? error.lineNumber - 1 : null;
        column = error.column;
        userInfo = {
          thangID: this.options.thisValue.id,
          thangSpriteName: this.options.thisValue.spriteName,
          methodName: this.options.functionName,
          methodType: this.methodType,
          lineNumber: lineNumber,
          column: column
        };
        console.log("Whoa, got me an error!", error, userInfo);
        pureError = this.purifyError(error.message, userInfo);
        this.cookedCode = '';
        return;
      }
      return this.cookedCode = Aether.getFunctionBody(output.toString(), false);
    };

    Aether.prototype.transform = function(node) {
      var error, exp, lineNumber, m, name, _ref3, _ref4;
      if (!this.requireThis) {
        if (node.type === 'VariableDeclarator') {
          this.vars[node.id] = true;
        } else if (node.type === 'CallExpression') {
          if (node.callee.name && !this.vars[node.callee.name] && !this.options.global[node.callee.name]) {
            node.update("this." + (node.source()));
          }
        } else if (node.type === 'ReturnStatement' && !node.argument) {
          node.update("return this.validateReturn('" + this.options.functionName + "', null);");
        } else if (((_ref3 = node.parent) != null ? _ref3.type : void 0) === 'ReturnStatement') {
          node.update("this.validateReturn('" + this.options.functionName + "', (" + (node.source()) + "))");
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
            if (_ref4 = exp.property.name, __indexOf.call(errors.commonMethods, _ref4) >= 0) {
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
      var j, lineNumber, method, methods, n, _i, _j, _len, _len1, _ref3;
      n = 0;
      _ref3 = this.methodLineNumbers;
      for (lineNumber = _i = 0, _len = _ref3.length; _i < _len; lineNumber = ++_i) {
        methods = _ref3[lineNumber];
        for (j = _j = 0, _len1 = methods.length; _j < _len1; j = ++_j) {
          method = methods[j];
          if (n++ < numMethodsSeen) {
            continue;
          }
          if (method === plannedMethod) {
            return lineNumber - 1;
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
      var fullSource, i, line, parent, _i, _ref3;
      if (forRawCode == null) {
        forRawCode = false;
      }
      parent = node;
      while (parent.type !== "Program") {
        parent = parent.parent;
      }
      fullSource = parent.source();
      line = forRawCode ? -2 : 0;
      for (i = _i = 0, _ref3 = node.range[0]; 0 <= _ref3 ? _i < _ref3 : _i > _ref3; i = 0 <= _ref3 ? ++_i : --_i) {
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

  if (typeof self !== "undefined" && self !== null) {
    self.Aether = Aether;
  }

  if (typeof window !== "undefined" && window !== null) {
    window.Aether = Aether;
  }

}).call(this);
