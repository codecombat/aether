;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var global=self;(function() {
  var Aether, defaults, errors, execution, falafel, jshint, problems, _, _ref, _ref1, _ref2,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = (_ref = (_ref1 = (_ref2 = typeof window !== "undefined" && window !== null ? window._ : void 0) != null ? _ref2 : typeof self !== "undefined" && self !== null ? self._ : void 0) != null ? _ref1 : typeof global !== "undefined" && global !== null ? global._ : void 0) != null ? _ref : require('lodash');

  falafel = require('falafel');

  jshint = require('jshint').JSHINT;

  defaults = require('./defaults');

  problems = require('./problems');

  execution = require('./execution');

  errors = require('./errors');

  module.exports = Aether = (function() {
    Aether.defaults = defaults;

    Aether.problems = problems.problems;

    Aether.execution = execution;

    Aether.errors = errors;

    function Aether(options) {
      this.transform = __bind(this.transform, this);
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
      this.options = _.merge(_.cloneDeep(Aether.defaults), options);
      this.reset();
    }

    Aether.prototype.canTranspile = function(raw, thorough) {
      var e, lintProblems;
      if (thorough == null) {
        thorough = false;
      }
      try {
        eval("throw 0;" + raw);
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
      userInfo.lineNumber = errorPos.lineNumber != null ? errorPos.lineNumber - 1 : void 0;
      userInfo.column = errorPos.column;
      pureError = new Aether.errors.UserCodeError(errorMessage, (_ref3 = error.level) != null ? _ref3 : "error", userInfo);
      this.problems[pureError.level + "s"].push(pureError.serialize());
      console.log("Purified UserCodeError:", pureError.serialize());
      return pureError;
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
      var error, i, output, wrapped, _ref3;
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
        throw new errors.UserCodeError(error.message, {
          thangID: this.options.thisValue.id,
          thangSpriteName: this.options.thisValue.spriteName,
          methodName: this.options.functionName,
          methodType: this.methodType,
          code: this.rawCode,
          recoverable: true,
          lineNumber: error.lineNumber - 2,
          column: error.column
        });
      }
      this.cookedCode = Aether.getFunctionBody(output.toString(), false);
      return this.cookedCode = this.raw;
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
      var fullSource, i, line, parent, _i, _ref3;
      if (forRawCode == null) {
        forRawCode = false;
      }
      parent = node;
      while (parent.type !== "Program") {
        parent = parent.parent;
      }
      fullSource = parent.source();
      line = forRawCode ? -1 : 1;
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

},{"./defaults":2,"./errors":3,"./execution":4,"./problems":5,"falafel":7,"jshint":20,"lodash":25}],2:[function(require,module,exports){
(function() {
  var defaults, execution;

  execution = require('./execution');

  module.exports = defaults = {
    thisValue: null,
    global: {
      Math: Math,
      parseInt: parseInt,
      parseFloat: parseFloat,
      "eval": eval,
      isNaN: isNaN,
      escape: escape,
      unescape: unescape
    },
    language: "javascript",
    languageVersion: "ES5",
    functionName: "foo",
    functionParameters: [],
    yieldAutomatically: false,
    yieldConditionally: false,
    executionCosts: execution
  };

}).call(this);

},{"./execution":4}],3:[function(require,module,exports){
(function() {
  var UserCodeError, commonMethods,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports.commonMethods = commonMethods = ['moveRight', 'moveLeft', 'moveUp', 'moveDown', 'attackNearbyEnemy', 'say', 'move', 'attackNearestEnemy', 'shootAt', 'rotateTo', 'shoot', 'distance', 'getNearestEnemy', 'getEnemies', 'attack', 'setAction', 'setTarget', 'getFriends', 'patrol'];

  module.exports.UserCodeError = UserCodeError = (function(_super) {
    __extends(UserCodeError, _super);

    UserCodeError.className = "UserCodeError";

    function UserCodeError(message, level, userInfo) {
      var key, val,
        _this = this;
      this.message = message;
      this.level = level != null ? level : "error";
      UserCodeError.__super__.constructor.call(this, message);
      for (key in userInfo) {
        if (!__hasProp.call(userInfo, key)) continue;
        val = userInfo[key];
        this[key] = val;
      }
      if (this.lineNumber != null) {
        if (this.message.search(/^Line \d+/) !== -1) {
          this.message = this.message.replace(/^Line \d+/, function(match, n) {
            return "Line " + _this.lineNumber;
          });
        } else {
          this.message = "Line " + this.lineNumber + ": " + this.message;
        }
      }
      this.name = "UserCodeError";
      this.key = (this.methodType === 'instance' ? this.thangID : this.thangSpriteName) + "|" + this.methodName + "|" + this.message;
      if (Error.captureStackTrace != null) {
        Error.captureStackTrace(this, this.constructor);
      }
    }

    UserCodeError.prototype.serialize = function() {
      var key, o, value;
      o = {};
      for (key in this) {
        if (!__hasProp.call(this, key)) continue;
        value = this[key];
        o[key] = value;
      }
      return o;
    };

    UserCodeError.getAnonymousErrorPosition = function(error) {
      var chromeVersion, column, i, line, lineNumber, lines, stack, _i, _len, _ref, _ref1, _ref2;
      if (error.lineNumber) {
        return {
          lineNumber: error.lineNumber,
          column: error.column
        };
      }
      stack = error.stack;
      if (!stack) {
        return {};
      }
      lines = stack.split('\n');
      for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
        line = lines[i];
        if (line.indexOf("Object.eval") === -1) {
          continue;
        }
        lineNumber = (_ref = line.match(/<anonymous>:(\d+):/)) != null ? _ref[1] : void 0;
        column = (_ref1 = line.match(/<anonymous>:\d+:(\d+)/)) != null ? _ref1[1] : void 0;
        if (lineNumber != null) {
          lineNumber = parseInt(lineNumber);
        }
        if (column != null) {
          column = parseInt(column);
        }
        chromeVersion = parseInt((typeof navigator !== "undefined" && navigator !== null ? (_ref2 = navigator.appVersion) != null ? _ref2.match(/Chrome\/(\d+)\./)[1] : void 0 : void 0) || "28", 10);
        if (chromeVersion >= 28) {
          lineNumber -= 1;
        }
        return {
          lineNumber: lineNumber,
          column: column
        };
      }
      return {};
    };

    UserCodeError.explainErrorMessage = function(error, thang) {
      var closestMatch, closestMatchScore, commonMethod, explained, m, matchScore, method, missingMethodMatch, _i, _len, _ref, _ref1;
      if (thang == null) {
        thang = null;
      }
      m = error.toString();
      if (m === "RangeError: Maximum call stack size exceeded") {
        m += ". (Did you use " + methodName + "() recursively?)";
      }
      missingMethodMatch = m.match(/has no method '(.*?)'/);
      if (missingMethodMatch) {
        method = missingMethodMatch[1];
        _ref = ['Murgatroyd Kerfluffle', 0], closestMatch = _ref[0], closestMatchScore = _ref[1];
        explained = false;
        for (_i = 0, _len = commonMethods.length; _i < _len; _i++) {
          commonMethod = commonMethods[_i];
          if (method === commonMethod) {
            m += ". (" + missingMethodMatch[1] + " not available in this challenge.)";
            explained = true;
            break;
          } else if (method.toLowerCase() === commonMethod.toLowerCase()) {
            m = "" + method + " should be " + commonMethod + " because JavaScript is case-sensitive.";
            explained = true;
            break;
          } else {
            matchScore = typeof string_score !== "undefined" && string_score !== null ? string_score.score(commonMethod, method, 0.5) : void 0;
            if (matchScore > closestMatchScore) {
              _ref1 = [commonMethod, matchScore], closestMatch = _ref1[0], closestMatchScore = _ref1[1];
            }
          }
        }
        if (!explained) {
          if (closestMatchScore > 0.25) {
            m += ". (Did you mean " + closestMatch + "?)";
          }
        }
        m = m.replace('TypeError:', 'Error:');
        if (thang) {
          m = m.replace("Object #<Object>", thang.id);
        }
      }
      return m;
    };

    return UserCodeError;

  })(Error);

}).call(this);

},{}],4:[function(require,module,exports){
(function() {
  var execution;

  module.exports = execution = {
    ArrayExpression: 1,
    ArrayPattern: 1,
    ArrowFunctionExpression: 1,
    AssignmentExpression: 1,
    BinaryExpression: 1,
    BlockStatement: 1,
    BreakStatement: 1,
    CallExpression: 1,
    CatchClause: 1,
    ClassBody: 1,
    ClassDeclaration: 1,
    ClassExpression: 1,
    ClassHeritage: 1,
    ComprehensionBlock: 1,
    ComprehensionExpression: 1,
    ConditionalExpression: 1,
    ContinueStatement: 1,
    DebuggerStatement: 1,
    DoWhileStatement: 1,
    EmptyStatement: 1,
    ExportDeclaration: 1,
    ExportBatchSpecifier: 1,
    ExportSpecifier: 1,
    ExpressionStatement: 1,
    ForInStatement: 1,
    ForOfStatement: 1,
    ForStatement: 1,
    FunctionDeclaration: 1,
    FunctionExpression: 1,
    Identifier: 1,
    IfStatement: 1,
    ImportDeclaration: 1,
    ImportSpecifier: 1,
    LabeledStatement: 1,
    Literal: 1,
    LogicalExpression: 1,
    MemberExpression: 1,
    MethodDefinition: 1,
    ModuleDeclaration: 1,
    NewExpression: 1,
    ObjectExpression: 1,
    ObjectPattern: 1,
    Program: 1,
    Property: 1,
    ReturnStatement: 1,
    SequenceExpression: 1,
    SpreadElement: 1,
    SwitchCase: 1,
    SwitchStatement: 1,
    TaggedTemplateExpression: 1,
    TemplateElement: 1,
    TemplateLiteral: 1,
    ThisExpression: 1,
    ThrowStatement: 1,
    TryStatement: 1,
    UnaryExpression: 1,
    UpdateExpression: 1,
    VariableDeclaration: 1,
    VariableDeclarator: 1,
    WhileStatement: 1,
    WithStatement: 1,
    YieldExpression: 1
  };

}).call(this);

},{}],5:[function(require,module,exports){
(function() {
  var RuntimeError, UserCodeProblem, problems,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  module.exports.UserCodeProblem = UserCodeProblem = (function() {
    UserCodeProblem.className = "UserCodeProblem";

    function UserCodeProblem(err, code, aether, source, codePrefix) {
      var endCol, line, originalLines, problemConfig, startCol, _ref;
      if (source == null) {
        source = 'unknown';
      }
      if (codePrefix == null) {
        codePrefix = "function wrapped() {\n\"use strict\";\n";
      }
      originalLines = code.slice(codePrefix.length).split('\n');
      this.id = this.getProblemID(err, source);
      problemConfig = aether.options.problems[this.id];
      this.level = (_ref = problemConfig != null ? problemConfig.level : void 0) != null ? _ref : "error";
      this.hint = problemConfig != null ? problemConfig.hint : void 0;
      if (source === 'jshint') {
        this.message = err.reason;
        line = err.line - codePrefix.split('\n').length;
        startCol = originalLines[line].indexOf(err.evidence);
        endCol = startCol + err.evidence.length;
        this.ranges = [[[line, startCol], [line, endCol]]];
      }
    }

    UserCodeProblem.prototype.getProblemID = function(err, source) {
      var id;
      id = (function() {
        switch (source) {
          case 'jshint':
            return err.code;
          default:
            return err.id || "Unknown";
        }
      })();
      return source + "_" + id;
    };

    UserCodeProblem.prototype.serialize = function() {
      var key, o, value;
      o = {};
      for (key in this) {
        if (!__hasProp.call(this, key)) continue;
        value = this[key];
        o[key] = value;
      }
      return o;
    };

    return UserCodeProblem;

  })();

  module.exports.RuntimeError = RuntimeError = (function(_super) {
    __extends(RuntimeError, _super);

    RuntimeError.className = "RuntimeError";

    function RuntimeError() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      RuntimeError.__super__.constructor.apply(this, args);
    }

    return RuntimeError;

  })(UserCodeProblem);

  module.exports.problems = problems = {
    unknown_Unknown: {
      message: "Unknown problem.",
      level: "error"
    },
    esprima_UnexpectedToken: {
      message: 'Unexpected token %0',
      level: "error"
    },
    esprima_UnexpectedNumber: {
      message: 'Unexpected number',
      level: "error"
    },
    esprima_UnexpectedString: {
      message: 'Unexpected string',
      level: "error"
    },
    esprima_UnexpectedIdentifier: {
      message: 'Unexpected identifier',
      level: "error"
    },
    esprima_UnexpectedReserved: {
      message: 'Unexpected reserved word',
      level: "error"
    },
    esprima_UnexpectedTemplate: {
      message: 'Unexpected quasi %0',
      level: "error"
    },
    esprima_UnexpectedEOS: {
      message: 'Unexpected end of input',
      level: "error"
    },
    esprima_NewlineAfterThrow: {
      message: 'Illegal newline after throw',
      level: "error"
    },
    esprima_InvalidRegExp: {
      message: 'Invalid regular expression',
      level: "error"
    },
    esprima_UnterminatedRegExp: {
      message: 'Invalid regular expression: missing /',
      level: "error"
    },
    esprima_InvalidLHSInAssignment: {
      message: 'Invalid left-hand side in assignment',
      level: "error"
    },
    esprima_InvalidLHSInFormalsList: {
      message: 'Invalid left-hand side in formals list',
      level: "error"
    },
    esprima_InvalidLHSInForIn: {
      message: 'Invalid left-hand side in for-in',
      level: "error"
    },
    esprima_MultipleDefaultsInSwitch: {
      message: 'More than one default clause in switch statement',
      level: "error"
    },
    esprima_NoCatchOrFinally: {
      message: 'Missing catch or finally after try',
      level: "error"
    },
    esprima_UnknownLabel: {
      message: 'Undefined label \'%0\'',
      level: "error"
    },
    esprima_Redeclaration: {
      message: '%0 \'%1\' has already been declared',
      level: "error"
    },
    esprima_IllegalContinue: {
      message: 'Illegal continue statement',
      level: "error"
    },
    esprima_IllegalBreak: {
      message: 'Illegal break statement',
      level: "error"
    },
    esprima_IllegalDuplicateClassProperty: {
      message: 'Illegal duplicate property in class definition',
      level: "error"
    },
    esprima_IllegalReturn: {
      message: 'Illegal return statement',
      level: "error"
    },
    esprima_IllegalYield: {
      message: 'Illegal yield expression',
      level: "error"
    },
    esprima_IllegalSpread: {
      message: 'Illegal spread element',
      level: "error"
    },
    esprima_StrictModeWith: {
      message: 'Strict mode code may not include a with statement',
      level: "error"
    },
    esprima_StrictCatchVariable: {
      message: 'Catch variable may not be eval or arguments in strict mode',
      level: "error"
    },
    esprima_StrictVarName: {
      message: 'Variable name may not be eval or arguments in strict mode',
      level: "error"
    },
    esprima_StrictParamName: {
      message: 'Parameter name eval or arguments is not allowed in strict mode',
      level: "error"
    },
    esprima_StrictParamDupe: {
      message: 'Strict mode function may not have duplicate parameter names',
      level: "error"
    },
    esprima_ParameterAfterRestParameter: {
      message: 'Rest parameter must be final parameter of an argument list',
      level: "error"
    },
    esprima_DefaultRestParameter: {
      message: 'Rest parameter can not have a default value',
      level: "error"
    },
    esprima_ElementAfterSpreadElement: {
      message: 'Spread must be the final element of an element list',
      level: "error"
    },
    esprima_ObjectPatternAsRestParameter: {
      message: 'Invalid rest parameter',
      level: "error"
    },
    esprima_ObjectPatternAsSpread: {
      message: 'Invalid spread argument',
      level: "error"
    },
    esprima_StrictFunctionName: {
      message: 'Function name may not be eval or arguments in strict mode',
      level: "error"
    },
    esprima_StrictOctalLiteral: {
      message: 'Octal literals are not allowed in strict mode.',
      level: "error"
    },
    esprima_StrictDelete: {
      message: 'Delete of an unqualified identifier in strict mode.',
      level: "error"
    },
    esprima_StrictDuplicateProperty: {
      message: 'Duplicate data property in object literal not allowed in strict mode',
      level: "error"
    },
    esprima_AccessorDataProperty: {
      message: 'Object literal may not have data and accessor property with the same name',
      level: "error"
    },
    esprima_AccessorGetSet: {
      message: 'Object literal may not have multiple get/set accessors with the same name',
      level: "error"
    },
    esprima_StrictLHSAssignment: {
      message: 'Assignment to eval or arguments is not allowed in strict mode',
      level: "error"
    },
    esprima_StrictLHSPostfix: {
      message: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
      level: "error"
    },
    esprima_StrictLHSPrefix: {
      message: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
      level: "error"
    },
    esprima_StrictReservedWord: {
      message: 'Use of future reserved word in strict mode',
      level: "error"
    },
    esprima_NewlineAfterModule: {
      message: 'Illegal newline after module',
      level: "error"
    },
    esprima_NoFromAfterImport: {
      message: 'Missing from after import',
      level: "error"
    },
    esprima_InvalidModuleSpecifier: {
      message: 'Invalid module specifier',
      level: "error"
    },
    esprima_NestedModule: {
      message: 'Module declaration can not be nested',
      level: "error"
    },
    esprima_NoYieldInGenerator: {
      message: 'Missing yield in generator',
      level: "error"
    },
    esprima_NoUnintializedConst: {
      message: 'Const must be initialized',
      level: "error"
    },
    esprima_ComprehensionRequiresBlock: {
      message: 'Comprehension must have at least one block',
      level: "error"
    },
    esprima_ComprehensionError: {
      message: 'Comprehension Error',
      level: "error"
    },
    esprima_EachNotAllowed: {
      message: 'Each is not supported',
      level: "error"
    }
  };

  ({
    aetherLint: {
      aether_UnexpectedIdentifier: {
        message: 'UnexpectedIdentifier',
        level: 'error'
      },
      aether_MissingVarKeyword: {
        message: 'MissingVarKeyword',
        level: 'error'
      },
      aether_UndefinedVariable: {
        message: 'UndefinedVariable',
        level: 'error'
      },
      aether_MissingThis: {
        message: 'MissingThis',
        level: 'error'
      },
      aether_NoEffect: {
        message: 'NoEffect',
        level: 'warning'
      },
      aether_FalseBlockIndentation: {
        message: 'FalseBlockIndentation',
        level: 'warning'
      },
      aether_UndefinedProperty: {
        message: 'UndefinedProperty',
        level: 'warning'
      },
      aether_InconsistentIndentation: {
        message: 'InconsistentIndentation',
        level: 'info'
      },
      aether_SnakeCase: {
        message: 'SnakeCase',
        level: 'info'
      },
      aether_SingleQuotes: {
        message: 'SingleQuotes',
        level: "ignore"
      },
      aether_DoubleQuotes: {
        message: 'DoubleQuotes',
        level: "ignore"
      },
      aether_CamelCase: {
        message: 'CamelCase',
        level: 'ignore'
      }
    },
    jshint: {
      jshint_E001: {
        message: "Bad option: '{a}'.",
        level: "error"
      },
      jshint_E002: {
        message: "Bad option value.",
        level: "error"
      },
      jshint_E003: {
        message: "Expected a JSON value.",
        level: "error"
      },
      jshint_E004: {
        message: "Input is neither a string nor an array of strings.",
        level: "error"
      },
      jshint_E005: {
        message: "Input is empty.",
        level: "error"
      },
      jshint_E006: {
        message: "Unexpected early end of program.",
        level: "error"
      },
      jshint_E007: {
        message: "Missing \"use strict\" statement.",
        level: "error"
      },
      jshint_E008: {
        message: "Strict violation.",
        level: "error"
      },
      jshint_E009: {
        message: "Option 'validthis' can't be used in a global scope.",
        level: "error"
      },
      jshint_E010: {
        message: "'with' is not allowed in strict mode.",
        level: "error"
      },
      jshint_E011: {
        message: "const '{a}' has already been declared.",
        level: "error"
      },
      jshint_E012: {
        message: "const '{a}' is initialized to 'undefined'.",
        level: "error"
      },
      jshint_E013: {
        message: "Attempting to override '{a}' which is a constant.",
        level: "error"
      },
      jshint_E014: {
        message: "A regular expression literal can be confused with '/='.",
        level: "error"
      },
      jshint_E015: {
        message: "Unclosed regular expression.",
        level: "error"
      },
      jshint_E016: {
        message: "Invalid regular expression.",
        level: "error"
      },
      jshint_E017: {
        message: "Unclosed comment.",
        level: "error"
      },
      jshint_E018: {
        message: "Unbegun comment.",
        level: "error"
      },
      jshint_E019: {
        message: "Unmatched '{a}'.",
        level: "error"
      },
      jshint_E020: {
        message: "Expected '{a}' to match '{b}' from line {c} and instead saw '{d}'.",
        level: "error"
      },
      jshint_E021: {
        message: "Expected '{a}' and instead saw '{b}'.",
        level: "error"
      },
      jshint_E022: {
        message: "Line breaking error '{a}'.",
        level: "error"
      },
      jshint_E023: {
        message: "Missing '{a}'.",
        level: "error"
      },
      jshint_E024: {
        message: "Unexpected '{a}'.",
        level: "error"
      },
      jshint_E025: {
        message: "Missing ':' on a case clause.",
        level: "error"
      },
      jshint_E026: {
        message: "Missing '}' to match '{' from line {a}.",
        level: "error"
      },
      jshint_E027: {
        message: "Missing ']' to match '[' form line {a}.",
        level: "error"
      },
      jshint_E028: {
        message: "Illegal comma.",
        level: "error"
      },
      jshint_E029: {
        message: "Unclosed string.",
        level: "error"
      },
      jshint_E030: {
        message: "Expected an identifier and instead saw '{a}'.",
        level: "error"
      },
      jshint_E031: {
        message: "Bad assignment.",
        level: "error"
      },
      jshint_E032: {
        message: "Expected a small integer or 'false' and instead saw '{a}'.",
        level: "error"
      },
      jshint_E033: {
        message: "Expected an operator and instead saw '{a}'.",
        level: "error"
      },
      jshint_E034: {
        message: "get/set are ES5 features.",
        level: "error"
      },
      jshint_E035: {
        message: "Missing property name.",
        level: "error"
      },
      jshint_E036: {
        message: "Expected to see a statement and instead saw a block.",
        level: "error"
      },
      jshint_E039: {
        message: "Function declarations are not invocable. Wrap the whole function invocation in parens.",
        level: "error"
      },
      jshint_E040: {
        message: "Each value should have its own case label.",
        level: "error"
      },
      jshint_E041: {
        message: "Unrecoverable syntax error.",
        level: "error"
      },
      jshint_E042: {
        message: "Stopping.",
        level: "error"
      },
      jshint_E043: {
        message: "Too many errors.",
        level: "error"
      },
      jshint_E044: {
        message: "'{a}' is already defined and can't be redefined.",
        level: "error"
      },
      jshint_E045: {
        message: "Invalid for each loop.",
        level: "error"
      },
      jshint_E046: {
        message: "A yield statement shall be within a generator function (with syntax: `function*`)",
        level: "error"
      },
      jshint_E047: {
        message: "A generator function shall contain a yield statement.",
        level: "error"
      },
      jshint_E048: {
        message: "Let declaration not directly within block.",
        level: "error"
      },
      jshint_E049: {
        message: "A {a} cannot be named '{b}'.",
        level: "error"
      },
      jshint_E050: {
        message: "Mozilla requires the yield expression to be parenthesized here.",
        level: "error"
      },
      jshint_E051: {
        message: "Regular parameters cannot come after default parameters.",
        level: "error"
      },
      jshint_W001: {
        message: "'hasOwnProperty' is a really bad name.",
        level: "warning"
      },
      jshint_W002: {
        message: "Value of '{a}' may be overwritten in IE 8 and earlier.",
        level: "warning"
      },
      jshint_W003: {
        message: "'{a}' was used before it was defined.",
        level: "warning"
      },
      jshint_W004: {
        message: "'{a}' is already defined.",
        level: "warning"
      },
      jshint_W005: {
        message: "A dot following a number can be confused with a decimal point.",
        level: "warning"
      },
      jshint_W006: {
        message: "Confusing minuses.",
        level: "warning"
      },
      jshint_W007: {
        message: "Confusing pluses.",
        level: "warning"
      },
      jshint_W008: {
        message: "A leading decimal point can be confused with a dot: '{a}'.",
        level: "warning"
      },
      jshint_W009: {
        message: "The array literal notation [] is preferrable.",
        level: "warning"
      },
      jshint_W010: {
        message: "The object literal notation {} is preferrable.",
        level: "warning"
      },
      jshint_W011: {
        message: "Unexpected space after '{a}'.",
        level: "warning"
      },
      jshint_W012: {
        message: "Unexpected space before '{a}'.",
        level: "warning"
      },
      jshint_W013: {
        message: "Missing space after '{a}'.",
        level: "warning"
      },
      jshint_W014: {
        message: "Bad line breaking before '{a}'.",
        level: "warning"
      },
      jshint_W015: {
        message: "Expected '{a}' to have an indentation at {b} instead at {c}.",
        level: "warning"
      },
      jshint_W016: {
        message: "Unexpected use of '{a}'.",
        level: "warning"
      },
      jshint_W017: {
        message: "Bad operand.",
        level: "warning"
      },
      jshint_W018: {
        message: "Confusing use of '{a}'.",
        level: "warning"
      },
      jshint_W019: {
        message: "Use the isNaN function to compare with NaN.",
        level: "warning"
      },
      jshint_W020: {
        message: "Read only.",
        level: "warning"
      },
      jshint_W021: {
        message: "'{a}' is a function.",
        level: "warning"
      },
      jshint_W022: {
        message: "Do not assign to the exception parameter.",
        level: "warning"
      },
      jshint_W023: {
        message: "Expected an identifier in an assignment and instead saw a function invocation.",
        level: "warning"
      },
      jshint_W024: {
        message: "Expected an identifier and instead saw '{a}' (a reserved word).",
        level: "warning"
      },
      jshint_W025: {
        message: "Missing name in function declaration.",
        level: "warning"
      },
      jshint_W026: {
        message: "Inner functions should be listed at the top of the outer function.",
        level: "warning"
      },
      jshint_W027: {
        message: "Unreachable '{a}' after '{b}'.",
        level: "warning"
      },
      jshint_W028: {
        message: "Label '{a}' on {b} statement.",
        level: "warning"
      },
      jshint_W030: {
        message: "Expected an assignment or function call and instead saw an expression.",
        level: "warning"
      },
      jshint_W031: {
        message: "Do not use 'new' for side effects.",
        level: "warning"
      },
      jshint_W032: {
        message: "Unnecessary semicolon.",
        level: "warning"
      },
      jshint_W033: {
        message: "Missing semicolon.",
        level: "warning"
      },
      jshint_W034: {
        message: "Unnecessary directive \"{a}\".",
        level: "warning"
      },
      jshint_W035: {
        message: "Empty block.",
        level: "warning"
      },
      jshint_W036: {
        message: "Unexpected /*member '{a}'.",
        level: "warning"
      },
      jshint_W037: {
        message: "'{a}' is a statement label.",
        level: "warning"
      },
      jshint_W038: {
        message: "'{a}' used out of scope.",
        level: "warning"
      },
      jshint_W039: {
        message: "'{a}' is not allowed.",
        level: "warning"
      },
      jshint_W040: {
        message: "Possible strict violation.",
        level: "warning"
      },
      jshint_W041: {
        message: "Use '{a}' to compare with '{b}'.",
        level: "warning"
      },
      jshint_W042: {
        message: "Avoid EOL escaping.",
        level: "warning"
      },
      jshint_W043: {
        message: "Bad escaping of EOL. Use option multistr if needed.",
        level: "warning"
      },
      jshint_W044: {
        message: "Bad or unnecessary escaping.",
        level: "warning"
      },
      jshint_W045: {
        message: "Bad number '{a}'.",
        level: "warning"
      },
      jshint_W046: {
        message: "Don't use extra leading zeros '{a}'.",
        level: "warning"
      },
      jshint_W047: {
        message: "A trailing decimal point can be confused with a dot: '{a}'.",
        level: "warning"
      },
      jshint_W048: {
        message: "Unexpected control character in regular expression.",
        level: "warning"
      },
      jshint_W049: {
        message: "Unexpected escaped character '{a}' in regular expression.",
        level: "warning"
      },
      jshint_W050: {
        message: "JavaScript URL.",
        level: "warning"
      },
      jshint_W051: {
        message: "Variables should not be deleted.",
        level: "warning"
      },
      jshint_W052: {
        message: "Unexpected '{a}'.",
        level: "warning"
      },
      jshint_W053: {
        message: "Do not use {a} as a constructor.",
        level: "warning"
      },
      jshint_W054: {
        message: "The Function constructor is a form of eval.",
        level: "warning"
      },
      jshint_W055: {
        message: "A constructor name should start with an uppercase letter.",
        level: "warning"
      },
      jshint_W056: {
        message: "Bad constructor.",
        level: "warning"
      },
      jshint_W057: {
        message: "Weird construction. Is 'new' unnecessary?",
        level: "warning"
      },
      jshint_W058: {
        message: "Missing '()' invoking a constructor.",
        level: "warning"
      },
      jshint_W059: {
        message: "Avoid arguments.{a}.",
        level: "warning"
      },
      jshint_W060: {
        message: "document.write can be a form of eval.",
        level: "warning"
      },
      jshint_W061: {
        message: "eval can be harmful.",
        level: "warning"
      },
      jshint_W062: {
        message: "Wrap an immediate function invocation in parens to assist the reader in understanding that the expression is the result of a function, and not the function itself.",
        level: "warning"
      },
      jshint_W063: {
        message: "Math is not a function.",
        level: "warning"
      },
      jshint_W064: {
        message: "Missing 'new' prefix when invoking a constructor.",
        level: "warning"
      },
      jshint_W065: {
        message: "Missing radix parameter.",
        level: "warning"
      },
      jshint_W066: {
        message: "Implied eval. Consider passing a function instead of a string.",
        level: "warning"
      },
      jshint_W067: {
        message: "Bad invocation.",
        level: "warning"
      },
      jshint_W068: {
        message: "Wrapping non-IIFE function literals in parens is unnecessary.",
        level: "warning"
      },
      jshint_W069: {
        message: "['{a}'] is better written in dot notation.",
        level: "warning"
      },
      jshint_W070: {
        message: "Extra comma. (it breaks older versions of IE)",
        level: "warning"
      },
      jshint_W071: {
        message: "This function has too many statements. ({a})",
        level: "warning"
      },
      jshint_W072: {
        message: "This function has too many parameters. ({a})",
        level: "warning"
      },
      jshint_W073: {
        message: "Blocks are nested too deeply. ({a})",
        level: "warning"
      },
      jshint_W074: {
        message: "This function's cyclomatic complexity is too high. ({a})",
        level: "warning"
      },
      jshint_W075: {
        message: "Duplicate key '{a}'.",
        level: "warning"
      },
      jshint_W076: {
        message: "Unexpected parameter '{a}' in get {b} function.",
        level: "warning"
      },
      jshint_W077: {
        message: "Expected a single parameter in set {a} function.",
        level: "warning"
      },
      jshint_W078: {
        message: "Setter is defined without getter.",
        level: "warning"
      },
      jshint_W079: {
        message: "Redefinition of '{a}'.",
        level: "warning"
      },
      jshint_W080: {
        message: "It's not necessary to initialize '{a}' to 'undefined'.",
        level: "warning"
      },
      jshint_W081: {
        message: "Too many var statements.",
        level: "warning"
      },
      jshint_W082: {
        message: "Function declarations should not be placed in blocks. Use a function expression or move the statement to the top of the outer function.",
        level: "warning"
      },
      jshint_W083: {
        message: "Don't make functions within a loop.",
        level: "warning"
      },
      jshint_W084: {
        message: "Expected a conditional expression and instead saw an assignment.",
        level: "warning"
      },
      jshint_W085: {
        message: "Don't use 'with'.",
        level: "warning"
      },
      jshint_W086: {
        message: "Expected a 'break' statement before '{a}'.",
        level: "warning"
      },
      jshint_W087: {
        message: "Forgotten 'debugger' statement?",
        level: "warning"
      },
      jshint_W088: {
        message: "Creating global 'for' variable. Should be 'for (var {a} ...'.",
        level: "warning"
      },
      jshint_W089: {
        message: "The body of a for in should be wrapped in an if statement to filter unwanted properties from the prototype.",
        level: "warning"
      },
      jshint_W090: {
        message: "'{a}' is not a statement label.",
        level: "warning"
      },
      jshint_W091: {
        message: "'{a}' is out of scope.",
        level: "warning"
      },
      jshint_W092: {
        message: "Wrap the /regexp/ literal in parens to disambiguate the slash operator.",
        level: "warning"
      },
      jshint_W093: {
        message: "Did you mean to return a conditional instead of an assignment?",
        level: "warning"
      },
      jshint_W094: {
        message: "Unexpected comma.",
        level: "warning"
      },
      jshint_W095: {
        message: "Expected a string and instead saw {a}.",
        level: "warning"
      },
      jshint_W096: {
        message: "The '{a}' key may produce unexpected results.",
        level: "warning"
      },
      jshint_W097: {
        message: "Use the function form of \"use strict\".",
        level: "warning"
      },
      jshint_W098: {
        message: "'{a}' is defined but never used.",
        level: "warning"
      },
      jshint_W099: {
        message: "Mixed spaces and tabs.",
        level: "warning"
      },
      jshint_W100: {
        message: "This character may get silently deleted by one or more browsers.",
        level: "warning"
      },
      jshint_W101: {
        message: "Line is too long.",
        level: "warning"
      },
      jshint_W102: {
        message: "Trailing whitespace.",
        level: "warning"
      },
      jshint_W103: {
        message: "The '{a}' property is deprecated.",
        level: "warning"
      },
      jshint_W104: {
        message: "'{a}' is only available in JavaScript 1.7.",
        level: "warning"
      },
      jshint_W105: {
        message: "Unexpected {a} in '{b}'.",
        level: "warning"
      },
      jshint_W106: {
        message: "Identifier '{a}' is not in camel case.",
        level: "warning"
      },
      jshint_W107: {
        message: "Script URL.",
        level: "warning"
      },
      jshint_W108: {
        message: "Strings must use doublequote.",
        level: "warning"
      },
      jshint_W109: {
        message: "Strings must use singlequote.",
        level: "warning"
      },
      jshint_W110: {
        message: "Mixed double and single quotes.",
        level: "warning"
      },
      jshint_W112: {
        message: "Unclosed string.",
        level: "warning"
      },
      jshint_W113: {
        message: "Control character in string: {a}.",
        level: "warning"
      },
      jshint_W114: {
        message: "Avoid {a}.",
        level: "warning"
      },
      jshint_W115: {
        message: "Octal literals are not allowed in strict mode.",
        level: "warning"
      },
      jshint_W116: {
        message: "Expected '{a}' and instead saw '{b}'.",
        level: "warning"
      },
      jshint_W117: {
        message: "'{a}' is not defined.",
        level: "warning"
      },
      jshint_W118: {
        message: "'{a}' is only available in Mozilla JavaScript extensions (use moz option).",
        level: "warning"
      },
      jshint_W119: {
        message: "'{a}' is only available in ES6 (use esnext option).",
        level: "warning"
      },
      jshint_W120: {
        message: "You might be leaking a variable ({a}) here.",
        level: "warning"
      },
      jshint_I001: {
        message: "Comma warnings can be turned off with 'laxcomma'.",
        level: "ignore"
      },
      jshint_I002: {
        message: "Reserved words as properties can be used under the 'es5' option.",
        level: "ignore"
      },
      jshint_I003: {
        message: "ES5 option is now set per default",
        level: "ignore"
      }
    }
  });

}).call(this);

},{}],6:[function(require,module,exports){
var global=self;(function() {
  var Aether, _;

  _ = require('lodash');

  if (typeof window !== "undefined" && window !== null) {
    window._ = _;
  }

  if (typeof global !== "undefined" && global !== null) {
    global._ = _;
  }

  if (typeof self !== "undefined" && self !== null) {
    self._ = _;
  }

  Aether = require('../aether');

  describe("Aether", function() {
    return it("doesn't immediately break", function() {
      var aether, code;
      aether = new Aether();
      code = "var x = 3;";
      return expect(aether.canTranspile(code)).toEqual(true);
    });
  });

}).call(this);

},{"../aether":1,"lodash":25}],7:[function(require,module,exports){
var parse = require('esprima').parse;
var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};
var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn);
    for (var i = 0; i < xs.length; i++) {
        fn.call(xs, xs[i], i, xs);
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

module.exports = function (src, opts, fn) {
    if (typeof opts === 'function') {
        fn = opts;
        opts = {};
    }
    if (typeof src === 'object') {
        opts = src;
        src = opts.source;
        delete opts.source;
    }
    src = src === undefined ? opts.source : src;
    opts.range = true;
    if (typeof src !== 'string') src = String(src);
    
    var ast = parse(src, opts);
    
    var result = {
        chunks : src.split(''),
        toString : function () { return result.chunks.join('') },
        inspect : function () { return result.toString() }
    };
    var index = 0;
    
    (function walk (node, parent) {
        insertHelpers(node, parent, result.chunks);
        
        forEach(objectKeys(node), function (key) {
            if (key === 'parent') return;
            
            var child = node[key];
            if (isArray(child)) {
                forEach(child, function (c) {
                    if (c && typeof c.type === 'string') {
                        walk(c, node);
                    }
                });
            }
            else if (child && typeof child.type === 'string') {
                insertHelpers(child, node, result.chunks);
                walk(child, node);
            }
        });
        fn(node);
    })(ast, undefined);
    
    return result;
};
 
function insertHelpers (node, parent, chunks) {
    if (!node.range) return;
    
    node.parent = parent;
    
    node.source = function () {
        return chunks.slice(
            node.range[0], node.range[1]
        ).join('');
    };
    
    if (node.update && typeof node.update === 'object') {
        var prev = node.update;
        forEach(objectKeys(prev), function (key) {
            update[key] = prev[key];
        });
        node.update = update;
    }
    else {
        node.update = update;
    }
    
    function update (s) {
        chunks[node.range[0]] = s;
        for (var i = node.range[0] + 1; i < node.range[1]; i++) {
            chunks[i] = '';
        }
    };
}

},{"esprima":8}],8:[function(require,module,exports){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, generateStatement: true, peek: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        SyntaxTreeDelegate,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        delegate,
        lookahead,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function isDecimalDigit(ch) {
        return (ch >= 48 && ch <= 57);   // 0..9
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === 32) ||  // space
            (ch === 9) ||      // tab
            (ch === 0xB) ||
            (ch === 0xC) ||
            (ch === 0xA0) ||
            (ch >= 0x1680 && '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(String.fromCharCode(ch)) > 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === 10) || (ch === 13) || (ch === 0x2028) || (ch === 0x2029);
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === 36) || (ch === 95) ||  // $ (dollar) and _ (underscore)
            (ch >= 65 && ch <= 90) ||         // A..Z
            (ch >= 97 && ch <= 122) ||        // a..z
            (ch === 92) ||                    // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
    }

    function isIdentifierPart(ch) {
        return (ch === 36) || (ch === 95) ||  // $ (dollar) and _ (underscore)
            (ch >= 65 && ch <= 90) ||         // A..Z
            (ch >= 97 && ch <= 122) ||        // a..z
            (ch >= 48 && ch <= 57) ||         // 0..9
            (ch === 92) ||                    // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        default:
            return false;
        }
    }

    function isStrictModeReservedWord(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        default:
            return false;
        }
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keywordOverride;
        if (typeof extra.isKeyword === 'function') {
            keywordOverride = extra.isKeyword(id);
            if (typeof keywordOverride === 'boolean'
            || typeof keywordOverride === 'string') {
                return keywordOverride;
            }
        }
        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        // 'const' is specialized as Keyword in V8.
        // 'yield' and 'let' are for compatiblity with SpiderMonkey and ES.next.
        // Some others are from future reserved words.

        switch (id.length) {
        case 2:
            return (id === 'if') || (id === 'in') || (id === 'do');
        case 3:
            return (id === 'var') || (id === 'for') || (id === 'new') ||
                (id === 'try') || (id === 'let');
        case 4:
            return (id === 'this') || (id === 'else') || (id === 'case') ||
                (id === 'void') || (id === 'with') || (id === 'enum');
        case 5:
            return (id === 'while') || (id === 'break') || (id === 'catch') ||
                (id === 'throw') || (id === 'const') || (id === 'yield') ||
                (id === 'class') || (id === 'super');
        case 6:
            return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                (id === 'switch') || (id === 'export') || (id === 'import');
        case 7:
            return (id === 'default') || (id === 'finally') || (id === 'extends');
        case 8:
            return (id === 'function') || (id === 'continue') || (id === 'debugger');
        case 10:
            return (id === 'instanceof');
        default:
            return false;
        }
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source.charCodeAt(index);

            if (lineComment) {
                ++index;
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === 13 && source.charCodeAt(index) === 10) {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === 13 && source.charCodeAt(index + 1) === 10) {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source.charCodeAt(index++);
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    // Block comment ends with '*/' (char #42, char #47).
                    if (ch === 42) {
                        ch = source.charCodeAt(index);
                        if (ch === 47) {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === 47) {
                ch = source.charCodeAt(index + 1);
                // Line comment starts with '//' (char #47, char #47).
                if (ch === 47) {
                    index += 2;
                    lineComment = true;
                } else if (ch === 42) {
                    // Block comment starts with '/*' (char #47, char #42).
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch === 13 && source.charCodeAt(index) === 10) {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function getEscapedIdentifier() {
        var ch, id;

        ch = source.charCodeAt(index++);
        id = String.fromCharCode(ch);

        // '\u' (char #92, char #117) denotes an escaped character.
        if (ch === 92) {
            if (source.charCodeAt(index) !== 117) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            ++index;
            ch = scanHexEscape('u');
            if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            id = ch;
        }

        while (index < length) {
            ch = source.charCodeAt(index);
            if (!isIdentifierPart(ch)) {
                break;
            }
            ++index;
            id += String.fromCharCode(ch);

            // '\u' (char #92, char #117) denotes an escaped character.
            if (ch === 92) {
                id = id.substr(0, id.length - 1);
                if (source.charCodeAt(index) !== 117) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
                ++index;
                ch = scanHexEscape('u');
                if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
                id += ch;
            }
        }

        return id;
    }

    function getIdentifier() {
        var start, ch;

        start = index++;
        while (index < length) {
            ch = source.charCodeAt(index);
            if (ch === 92) {
                // Blackslash (char #92) marks Unicode escape sequence.
                index = start;
                return getEscapedIdentifier();
            }
            if (isIdentifierPart(ch)) {
                ++index;
            } else {
                break;
            }
        }

        return source.slice(start, index);
    }

    function scanIdentifier() {
        var start, id, fakeId, type;

        start = index;

        // Backslash (char #92) starts an escaped character.
        id = (source.charCodeAt(index) === 92) ? getEscapedIdentifier() : getIdentifier();

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            type = Token.Identifier;
        } else if (fakeId = isKeyword(id)) {
            if (typeof fakeId === 'string') {
                if (fakeId === 'block') {
                    lookahead = advance();
                    lookahead.keyword = id;
                    return lookahead;
                }
                id = fakeId;
            }
            type = Token.Keyword;
        } else if (id === 'null') {
            type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
        } else {
            type = Token.Identifier;
        }

        return {
            type: type,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }


    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            code = source.charCodeAt(index),
            code2,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        switch (code) {

        // Check for most common single-character punctuators.
        case 46:   // . dot
        case 40:   // ( open bracket
        case 41:   // ) close bracket
        case 59:   // ; semicolon
        case 44:   // , comma
        case 123:  // { open curly brace
        case 125:  // } close curly brace
        case 91:   // [
        case 93:   // ]
        case 58:   // :
        case 63:   // ?
        case 126:  // ~
            ++index;
            return {
                type: Token.Punctuator,
                value: String.fromCharCode(code),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };

        default:
            code2 = source.charCodeAt(index + 1);

            // '=' (char #61) marks an assignment or comparison operator.
            if (code2 === 61) {
                switch (code) {
                case 37:  // %
                case 38:  // &
                case 42:  // *:
                case 43:  // +
                case 45:  // -
                case 47:  // /
                case 60:  // <
                case 62:  // >
                case 94:  // ^
                case 124: // |
                    index += 2;
                    return {
                        type: Token.Punctuator,
                        value: String.fromCharCode(code) + String.fromCharCode(code2),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };

                case 33: // !
                case 61: // =
                    index += 2;

                    // !== and ===
                    if (source.charCodeAt(index) === 61) {
                        ++index;
                    }
                    return {
                        type: Token.Punctuator,
                        value: source.slice(start, index),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                default:
                    break;
                }
            }
            break;
        }

        // Peek more characters.

        ch2 = source[index + 1];
        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Other 2-character punctuators: ++ -- << >> && ||

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            index += 2;
            return {
                type: Token.Punctuator,
                value: ch1 + ch2,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    // 7.8.3 Numeric Literals

    function scanHexLiteral(start) {
        var number = '';

        while (index < length) {
            if (!isHexDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (number.length === 0) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + number, 16),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanOctalLiteral(start) {
        var number = '0' + source[index++];
        while (index < length) {
            if (!isOctalDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(number, 8),
            octal: true,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    ++index;
                    return scanHexLiteral(start);
                }
                if (isOctalDigit(ch)) {
                    return scanOctalLiteral(start);
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (ch && isDecimalDigit(ch.charCodeAt(0))) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === '.') {
            number += source[index++];
            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }
            if (isDecimalDigit(source.charCodeAt(index))) {
                while (isDecimalDigit(source.charCodeAt(index))) {
                    number += source[index++];
                }
            } else {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\v';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        lookahead = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '\\') {
                    ch = source[index++];
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch.charCodeAt(0))) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch.charCodeAt(0))) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch.charCodeAt(0))) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        for (str += '\\u'; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        peek();

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        ch = source.charCodeAt(index);

        // Very common: ( and ) and ;
        if (ch === 40 || ch === 41 || ch === 58) {
            return scanPunctuator();
        }

        // String literal starts with single quote (#39) or double quote (#34).
        if (ch === 39 || ch === 34) {
            return scanStringLiteral();
        }

        if (isIdentifierStart(ch)) {
            return scanIdentifier();
        }

        // Dot (.) char #46 can also start a floating-point number, hence the need
        // to check the next character.
        if (ch === 46) {
            if (isDecimalDigit(source.charCodeAt(index + 1))) {
                return scanNumericLiteral();
            }
            return scanPunctuator();
        }

        if (isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        return scanPunctuator();
    }

    function lex() {
        var token;

        token = lookahead;
        index = token.range[1];
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        lookahead = advance();

        index = token.range[1];
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        return token;
    }

    function peek() {
        var pos, line, start;

        pos = index;
        line = lineNumber;
        start = lineStart;
        lookahead = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;
    }

    SyntaxTreeDelegate = {

        name: 'SyntaxTree',

        postProcess: function (node) {
            return node;
        },

        createArrayExpression: function (elements) {
            return {
                type: Syntax.ArrayExpression,
                elements: elements
            };
        },

        createAssignmentExpression: function (operator, left, right) {
            return {
                type: Syntax.AssignmentExpression,
                operator: operator,
                left: left,
                right: right
            };
        },

        createBinaryExpression: function (operator, left, right) {
            var type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression :
                        Syntax.BinaryExpression;
            return {
                type: type,
                operator: operator,
                left: left,
                right: right
            };
        },

        createBlockStatement: function (body) {
            return {
                type: Syntax.BlockStatement,
                body: body
            };
        },
 
        createBreakStatement: function (label) {
            return {
                type: Syntax.BreakStatement,
                label: label
            };
        },

        createCallExpression: function (callee, args) {
            return {
                type: Syntax.CallExpression,
                callee: callee,
                'arguments': args
            };
        },

        createCatchClause: function (param, body) {
            return {
                type: Syntax.CatchClause,
                param: param,
                body: body
            };
        },

        createConditionalExpression: function (test, consequent, alternate) {
            return {
                type: Syntax.ConditionalExpression,
                test: test,
                consequent: consequent,
                alternate: alternate
            };
        },

        createContinueStatement: function (label) {
            return {
                type: Syntax.ContinueStatement,
                label: label
            };
        },

        createDebuggerStatement: function () {
            return {
                type: Syntax.DebuggerStatement
            };
        },

        createDoWhileStatement: function (body, test) {
            return {
                type: Syntax.DoWhileStatement,
                body: body,
                test: test
            };
        },

        createEmptyStatement: function () {
            return {
                type: Syntax.EmptyStatement
            };
        },

        createExpressionStatement: function (expression) {
            return {
                type: Syntax.ExpressionStatement,
                expression: expression
            };
        },

        createForStatement: function (init, test, update, body) {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        },

        createForInStatement: function (left, right, body) {
            return {
                type: Syntax.ForInStatement,
                left: left,
                right: right,
                body: body,
                each: false
            };
        },

        createFunctionDeclaration: function (id, params, defaults, body) {
            return {
                type: Syntax.FunctionDeclaration,
                id: id,
                params: params,
                defaults: defaults,
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        },

        createFunctionExpression: function (id, params, defaults, body) {
            return {
                type: Syntax.FunctionExpression,
                id: id,
                params: params,
                defaults: defaults,
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        },

        createIdentifier: function (name) {
            return {
                type: Syntax.Identifier,
                name: name
            };
        },

        createIfStatement: function (test, consequent, alternate) {
            return {
                type: Syntax.IfStatement,
                test: test,
                consequent: consequent,
                alternate: alternate
            };
        },

        createLabeledStatement: function (label, body) {
            return {
                type: Syntax.LabeledStatement,
                label: label,
                body: body
            };
        },

        createLiteral: function (token) {
            return {
                type: Syntax.Literal,
                value: token.value,
                raw: source.slice(token.range[0], token.range[1])
            };
        },

        createMemberExpression: function (accessor, object, property) {
            return {
                type: Syntax.MemberExpression,
                computed: accessor === '[',
                object: object,
                property: property
            };
        },

        createNewExpression: function (callee, args) {
            return {
                type: Syntax.NewExpression,
                callee: callee,
                'arguments': args
            };
        },

        createObjectExpression: function (properties) {
            return {
                type: Syntax.ObjectExpression,
                properties: properties
            };
        },

        createPostfixExpression: function (operator, argument) {
            return {
                type: Syntax.UpdateExpression,
                operator: operator,
                argument: argument,
                prefix: false
            };
        },

        createProgram: function (body) {
            return {
                type: Syntax.Program,
                body: body
            };
        },

        createProperty: function (kind, key, value) {
            return {
                type: Syntax.Property,
                key: key,
                value: value,
                kind: kind
            };
        },

        createReturnStatement: function (argument) {
            return {
                type: Syntax.ReturnStatement,
                argument: argument
            };
        },

        createSequenceExpression: function (expressions) {
            return {
                type: Syntax.SequenceExpression,
                expressions: expressions
            };
        },

        createSwitchCase: function (test, consequent) {
            return {
                type: Syntax.SwitchCase,
                test: test,
                consequent: consequent
            };
        },

        createSwitchStatement: function (discriminant, cases) {
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant,
                cases: cases
            };
        },

        createThisExpression: function () {
            return {
                type: Syntax.ThisExpression
            };
        },

        createThrowStatement: function (argument) {
            return {
                type: Syntax.ThrowStatement,
                argument: argument
            };
        },

        createTryStatement: function (block, guardedHandlers, handlers, finalizer) {
            return {
                type: Syntax.TryStatement,
                block: block,
                guardedHandlers: guardedHandlers,
                handlers: handlers,
                finalizer: finalizer
            };
        },

        createUnaryExpression: function (operator, argument) {
            if (operator === '++' || operator === '--') {
                return {
                    type: Syntax.UpdateExpression,
                    operator: operator,
                    argument: argument,
                    prefix: true
                };
            }
            var res = {
                type: Syntax.UnaryExpression,
                operator: operator,
                argument: argument
            };
            if (/^\w/.test(operator)) res.keyword = operator;
            return res;
        },

        createVariableDeclaration: function (declarations, kind) {
            return {
                type: Syntax.VariableDeclaration,
                declarations: declarations,
                kind: kind
            };
        },

        createVariableDeclarator: function (id, init) {
            return {
                type: Syntax.VariableDeclarator,
                id: id,
                init: init
            };
        },

        createWhileStatement: function (test, body) {
            return {
                type: Syntax.WhileStatement,
                test: test,
                body: body
            };
        },

        createWithStatement: function (object, body) {
            return {
                type: Syntax.WithStatement,
                object: object,
                body: body
            };
        }
    };

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    assert(index < args.length, 'Message reference must be in range');
                    return args[index];
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        error.description = msg;
        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
        else return token;
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        return lookahead.type === Token.Punctuator && lookahead.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        return lookahead.type === Token.Keyword && lookahead.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var op;

        if (lookahead.type !== Token.Punctuator) {
            return false;
        }
        op = lookahead.value;
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var line;

        // Catch the very common case first: immediately a semicolon (char #59).
        if (source.charCodeAt(index) === 59) {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        if (lookahead.type !== Token.EOF && !match('}')) {
            throwUnexpected(lookahead);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return delegate.createArrayExpression(elements);
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;
        return delegate.createFunctionExpression(null, param, [], body);
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return delegate.createLiteral(token);
        }

        return delegate.createIdentifier(token.value);
    }

    function parseObjectProperty() {
        var token, key, id, value, param;

        token = lookahead;

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                value = parsePropertyFunction([]);
                return delegate.createProperty('get', key, value);
            }
            if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead;
                if (token.type !== Token.Identifier) {
                    throwUnexpected(lex());
                }
                param = [ parseVariableIdentifier() ];
                expect(')');
                value = parsePropertyFunction(param, token);
                return delegate.createProperty('set', key, value);
            }
            expect(':');
            value = parseAssignmentExpression();
            return delegate.createProperty('init', id, value);
        }
        if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            value = parseAssignmentExpression();
            return delegate.createProperty('init', key, value);
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, key, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;

            key = '$' + name;
            if (Object.prototype.hasOwnProperty.call(map, key)) {
                if (map[key] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[key] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[key] |= kind;
            } else {
                map[key] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return delegate.createObjectExpression(properties);
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var type, token;

        type = lookahead.type;

        if (type === Token.Identifier) {
            return delegate.createIdentifier(lex().value);
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && lookahead.octal) {
                throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
            }
            return delegate.createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return delegate.createThisExpression();
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            token = lex();
            token.value = (token.value === 'true');
            return delegate.createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            token = lex();
            token.value = null;
            return delegate.createLiteral(token);
        }
        
        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return delegate.createLiteral(scanRegExp());
        }
 
        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return delegate.createIdentifier(token.value);
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var callee, args;

        expectKeyword('new');
        callee = parseLeftHandSideExpression();
        args = match('(') ? parseArguments() : [];

        return delegate.createNewExpression(callee, args);
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr, args, property;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                args = parseArguments();
                expr = delegate.createCallExpression(expr, args);
            } else if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
            } else {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr, property;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
            } else {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        if (lookahead.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            token = lex();
            expr = delegate.createPostfixExpression(token.value, expr);
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            return delegate.createUnaryExpression(token.value, expr);
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            token = lex();
            expr = parseUnaryExpression();
            return delegate.createUnaryExpression(token.value, expr);
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            token = lex();
            expr = parseUnaryExpression();
            expr = delegate.createUnaryExpression(token.value, expr);
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        if (extra.isKeyword && lookahead.type === 4 && extra.isKeyword(lookahead.value) === true) {
            token = lex();
            expr = parseUnaryExpression();
            expr = delegate.createUnaryExpression(token.value, expr);
            return expr;
        }

        return parsePostfixExpression();
    }

    function binaryPrecedence(token, allowIn) {
        var prec = 0;

        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return 0;
        }

        switch (token.value) {
        case '||':
            prec = 1;
            break;

        case '&&':
            prec = 2;
            break;

        case '|':
            prec = 3;
            break;

        case '^':
            prec = 4;
            break;

        case '&':
            prec = 5;
            break;

        case '==':
        case '!=':
        case '===':
        case '!==':
            prec = 6;
            break;

        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
            prec = 7;
            break;

        case 'in':
            prec = allowIn ? 7 : 0;
            break;

        case '<<':
        case '>>':
        case '>>>':
            prec = 8;
            break;

        case '+':
        case '-':
            prec = 9;
            break;

        case '*':
        case '/':
        case '%':
            prec = 11;
            break;

        default:
            break;
        }

        return prec;
    }

    // 11.5 Multiplicative Operators
    // 11.6 Additive Operators
    // 11.7 Bitwise Shift Operators
    // 11.8 Relational Operators
    // 11.9 Equality Operators
    // 11.10 Binary Bitwise Operators
    // 11.11 Binary Logical Operators

    function parseBinaryExpression() {
        var expr, token, prec, previousAllowIn, stack, right, operator, left, i;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseUnaryExpression();

        token = lookahead;
        prec = binaryPrecedence(token, previousAllowIn);
        if (prec === 0) {
            return expr;
        }
        token.prec = prec;
        lex();

        stack = [expr, token, parseUnaryExpression()];

        while ((prec = binaryPrecedence(lookahead, previousAllowIn)) > 0) {

            // Reduce: make a binary expression from the three topmost entries.
            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
                right = stack.pop();
                operator = stack.pop().value;
                left = stack.pop();
                stack.push(delegate.createBinaryExpression(operator, left, right));
            }

            // Shift.
            token = lex();
            token.prec = prec;
            stack.push(token);
            stack.push(parseUnaryExpression());
        }

        state.allowIn = previousAllowIn;

        // Final reduce to clean-up the stack.
        i = stack.length - 1;
        expr = stack[i];
        while (i > 1) {
            expr = delegate.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
            i -= 2;
        }
        return expr;
    }


    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent, alternate;

        expr = parseBinaryExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');
            alternate = parseAssignmentExpression();

            expr = delegate.createConditionalExpression(expr, consequent, alternate);
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, left, right;

        token = lookahead;
        left = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(left)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && left.type === Syntax.Identifier && isRestrictedWord(left.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            token = lex();
            right = parseAssignmentExpression();
            return delegate.createAssignmentExpression(token.value, left, right);
        }

        return left;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = delegate.createSequenceExpression([ expr ]);

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        var t = expect('{');

        block = parseStatementList();

        expect('}');

        var db = delegate.createBlockStatement(block);
        if (t.keyword) db.keyword = t.keyword;
        return db;
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return delegate.createIdentifier(token.value);
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return delegate.createVariableDeclarator(id, init);
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return delegate.createVariableDeclaration(declarations, 'var');
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return delegate.createVariableDeclaration(declarations, kind);
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');
        return delegate.createEmptyStatement();
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();
        consumeSemicolon();
        return delegate.createExpressionStatement(expr);
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return delegate.createIfStatement(test, consequent, alternate);
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return delegate.createDoWhileStatement(body, test);
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return delegate.createWhileStatement(test, body);
    }

    function parseForVariableDeclaration() {
        var token = lex(),
            declarations = parseVariableDeclarationList();

        return delegate.createVariableDeclaration(declarations, token.value);
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwError({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return (typeof left === 'undefined') ?
                delegate.createForStatement(init, test, update, body) :
                delegate.createForInStatement(left, right, body);
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var label = null, key;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source.charCodeAt(index) === 59) {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return delegate.createContinueStatement(null);
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return delegate.createContinueStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return delegate.createContinueStatement(label);
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var label = null, key;

        expectKeyword('break');

        // Catch the very common case first: immediately a semicolon (char #59).
        if (source.charCodeAt(index) === 59) {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return delegate.createBreakStatement(null);
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return delegate.createBreakStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return delegate.createBreakStatement(label);
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source.charCodeAt(index) === 32) {
            if (isIdentifierStart(source.charCodeAt(index + 1))) {
                argument = parseExpression();
                consumeSemicolon();
                return delegate.createReturnStatement(argument);
            }
        }

        if (peekLineTerminator()) {
            return delegate.createReturnStatement(null);
        }

        if (!match(';')) {
            if (!match('}') && lookahead.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return delegate.createReturnStatement(argument);
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return delegate.createWithStatement(object, body);
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            consequent.push(statement);
        }

        return delegate.createSwitchCase(test, consequent);
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        if (match('}')) {
            lex();
            return delegate.createSwitchStatement(discriminant);
        }

        cases = [];

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return delegate.createSwitchStatement(discriminant, cases);
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return delegate.createThrowStatement(argument);
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param, body;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead);
        }

        param = parseExpression();
        // 12.14.1
        if (strict && param.type === Syntax.Identifier && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');
        body = parseBlock();
        return delegate.createCatchClause(param, body);
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return delegate.createTryStatement(block, [], handlers, finalizer);
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return delegate.createDebuggerStatement();
    }

    // 12 Statements

    function parseStatement() {
        var type = lookahead.type,
            expr,
            labeledBody,
            key;

        if (type === Token.EOF) {
            throwUnexpected(lookahead);
        }

        if (type === Token.Punctuator) {
            switch (lookahead.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (type === Token.Keyword) {
            switch (lookahead.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            key = '$' + expr.name;
            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[key] = true;
            labeledBody = parseStatement();
            delete state.labelSet[key];
            return delegate.createLabeledStatement(expr, labeledBody);
        }

        consumeSemicolon();

        return delegate.createExpressionStatement(expr);
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            if (lookahead.type !== Token.StringLiteral) {
                break;
            }
            token = lookahead;

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = source.slice(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return delegate.createBlockStatement(sourceElements);
    }

    function parseParams(firstRestricted) {
        var param, params = [], token, stricted, paramSet, key, message;
        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead;
                param = parseVariableIdentifier();
                key = '$' + token.value;
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[key] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return {
            params: params,
            stricted: stricted,
            firstRestricted: firstRestricted,
            message: message
        };
    }

    function parseFunctionDeclaration() {
        var id, params = [], body, token, stricted, tmp, firstRestricted, message, previousStrict;

        expectKeyword('function');
        token = lookahead;
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return delegate.createFunctionDeclaration(id, params, [], body);
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, tmp, params = [], body, previousStrict;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead;
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return delegate.createFunctionExpression(id, params, [], body);
    }

    // 14 Program

    function parseSourceElement() {
        if (lookahead.type === Token.Keyword) {
            switch (lookahead.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(lookahead.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (lookahead.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead;
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = source.slice(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var body;
        strict = false;
        peek();
        body = parseSourceElements();
        return delegate.createProgram(body);
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch.charCodeAt(0))) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch.charCodeAt(0))) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch.charCodeAt(0))) {
                ++index;
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = source.slice(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
                node = delegate.postProcess(node);
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
                node = delegate.postProcess(node);
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr, property;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
                marker.end();
                marker.apply(expr);
            } else {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr, args, property;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                args = parseArguments();
                expr = delegate.createCallExpression(expr, args);
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
                marker.end();
                marker.apply(expr);
            } else {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                        node = delegate.postProcess(node);
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                        node = delegate.postProcess(node);
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBinaryExpression = parseBinaryExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseStatement = parseStatement;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBinaryExpression = wrapTracking(extra.parseBinaryExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseStatement = wrapTracking(extra.parseStatement);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.range || extra.loc) {
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBinaryExpression = extra.parseBinaryExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseStatement = extra.parseStatement;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    // This is used to modify the delegate.

    function extend(object, properties) {
        var entry, result = {};

        for (entry in object) {
            if (object.hasOwnProperty(entry)) {
                result[entry] = object[entry];
            }
        }

        for (entry in properties) {
            if (properties.hasOwnProperty(entry)) {
                result[entry] = properties[entry];
            }
        }

        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        delegate = SyntaxTreeDelegate;
        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.isKeyword = (typeof options.isKeyword === 'function') && options.isKeyword;

            if (extra.loc && options.source !== null && options.source !== undefined) {
                delegate = extend(delegate, {
                    'postProcess': function (node) {
                        node.loc.source = toString(options.source);
                        return node;
                    }
                });
            }

            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json and component.json.
    exports.version = '1.1.0-dev';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],9:[function(require,module,exports){
// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

},{"buffer":13,"util":11}],10:[function(require,module,exports){
var process=require("__browserify_process");if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (typeof emitter._events[type] === 'function')
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

},{"__browserify_process":15}],11:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":10}],12:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],13:[function(require,module,exports){
var assert = require('assert');
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":12,"assert":9,"base64-js":14}],14:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],15:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],16:[function(require,module,exports){
var global=self;/*global window, global*/
var util = require("util")
var assert = require("assert")

var slice = Array.prototype.slice
var console
var times = {}

if (typeof global !== "undefined" && global.console) {
    console = global.console
} else if (typeof window !== "undefined" && window.console) {
    console = window.console
} else {
    console = window.console = {}
}

var functions = [
    [log, "log"]
    , [info, "info"]
    , [warn, "warn"]
    , [error, "error"]
    , [time, "time"]
    , [timeEnd, "timeEnd"]
    , [trace, "trace"]
    , [dir, "dir"]
    , [assert, "assert"]
]

for (var i = 0; i < functions.length; i++) {
    var tuple = functions[i]
    var f = tuple[0]
    var name = tuple[1]

    if (!console[name]) {
        console[name] = f
    }
}

module.exports = console

function log() {}

function info() {
    console.log.apply(console, arguments)
}

function warn() {
    console.log.apply(console, arguments)
}

function error() {
    console.warn.apply(console, arguments)
}

function time(label) {
    times[label] = Date.now()
}

function timeEnd(label) {
    var time = times[label]
    if (!time) {
        throw new Error("No such label: " + label)
    }

    var duration = Date.now() - time
    console.log(label + ": " + duration + "ms")
}

function trace() {
    var err = new Error()
    err.name = "Trace"
    err.message = util.format.apply(null, arguments)
    console.error(err.stack)
}

function dir(object) {
    console.log(util.inspect(object) + "\n")
}

function assert(expression) {
    if (!expression) {
        var arr = slice.call(arguments, 1)
        assert.ok(false, util.format.apply(null, arr))
    }
}

},{"assert":9,"util":11}],17:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],18:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var errors = {
	// JSHint options
	E001: "Bad option: '{a}'.",
	E002: "Bad option value.",

	// JSHint input
	E003: "Expected a JSON value.",
	E004: "Input is neither a string nor an array of strings.",
	E005: "Input is empty.",
	E006: "Unexpected early end of program.",

	// Strict mode
	E007: "Missing \"use strict\" statement.",
	E008: "Strict violation.",
	E009: "Option 'validthis' can't be used in a global scope.",
	E010: "'with' is not allowed in strict mode.",

	// Constants
	E011: "const '{a}' has already been declared.",
	E012: "const '{a}' is initialized to 'undefined'.",
	E013: "Attempting to override '{a}' which is a constant.",

	// Regular expressions
	E014: "A regular expression literal can be confused with '/='.",
	E015: "Unclosed regular expression.",
	E016: "Invalid regular expression.",

	// Tokens
	E017: "Unclosed comment.",
	E018: "Unbegun comment.",
	E019: "Unmatched '{a}'.",
	E020: "Expected '{a}' to match '{b}' from line {c} and instead saw '{d}'.",
	E021: "Expected '{a}' and instead saw '{b}'.",
	E022: "Line breaking error '{a}'.",
	E023: "Missing '{a}'.",
	E024: "Unexpected '{a}'.",
	E025: "Missing ':' on a case clause.",
	E026: "Missing '}' to match '{' from line {a}.",
	E027: "Missing ']' to match '[' form line {a}.",
	E028: "Illegal comma.",
	E029: "Unclosed string.",

	// Everything else
	E030: "Expected an identifier and instead saw '{a}'.",
	E031: "Bad assignment.", // FIXME: Rephrase
	E032: "Expected a small integer or 'false' and instead saw '{a}'.",
	E033: "Expected an operator and instead saw '{a}'.",
	E034: "get/set are ES5 features.",
	E035: "Missing property name.",
	E036: "Expected to see a statement and instead saw a block.",
	E037: null, // Vacant
	E038: null, // Vacant
	E039: "Function declarations are not invocable. Wrap the whole function invocation in parens.",
	E040: "Each value should have its own case label.",
	E041: "Unrecoverable syntax error.",
	E042: "Stopping.",
	E043: "Too many errors.",
	E044: "'{a}' is already defined and can't be redefined.",
	E045: "Invalid for each loop.",
	E046: "A yield statement shall be within a generator function (with syntax: `function*`)",
	E047: "A generator function shall contain a yield statement.",
	E048: "Let declaration not directly within block.",
	E049: "A {a} cannot be named '{b}'.",
	E050: "Mozilla requires the yield expression to be parenthesized here.",
	E051: "Regular parameters cannot come after default parameters."
};

var warnings = {
	W001: "'hasOwnProperty' is a really bad name.",
	W002: "Value of '{a}' may be overwritten in IE 8 and earlier.",
	W003: "'{a}' was used before it was defined.",
	W004: "'{a}' is already defined.",
	W005: "A dot following a number can be confused with a decimal point.",
	W006: "Confusing minuses.",
	W007: "Confusing pluses.",
	W008: "A leading decimal point can be confused with a dot: '{a}'.",
	W009: "The array literal notation [] is preferrable.",
	W010: "The object literal notation {} is preferrable.",
	W011: "Unexpected space after '{a}'.",
	W012: "Unexpected space before '{a}'.",
	W013: "Missing space after '{a}'.",
	W014: "Bad line breaking before '{a}'.",
	W015: "Expected '{a}' to have an indentation at {b} instead at {c}.",
	W016: "Unexpected use of '{a}'.",
	W017: "Bad operand.",
	W018: "Confusing use of '{a}'.",
	W019: "Use the isNaN function to compare with NaN.",
	W020: "Read only.",
	W021: "'{a}' is a function.",
	W022: "Do not assign to the exception parameter.",
	W023: "Expected an identifier in an assignment and instead saw a function invocation.",
	W024: "Expected an identifier and instead saw '{a}' (a reserved word).",
	W025: "Missing name in function declaration.",
	W026: "Inner functions should be listed at the top of the outer function.",
	W027: "Unreachable '{a}' after '{b}'.",
	W028: "Label '{a}' on {b} statement.",
	W030: "Expected an assignment or function call and instead saw an expression.",
	W031: "Do not use 'new' for side effects.",
	W032: "Unnecessary semicolon.",
	W033: "Missing semicolon.",
	W034: "Unnecessary directive \"{a}\".",
	W035: "Empty block.",
	W036: "Unexpected /*member '{a}'.",
	W037: "'{a}' is a statement label.",
	W038: "'{a}' used out of scope.",
	W039: "'{a}' is not allowed.",
	W040: "Possible strict violation.",
	W041: "Use '{a}' to compare with '{b}'.",
	W042: "Avoid EOL escaping.",
	W043: "Bad escaping of EOL. Use option multistr if needed.",
	W044: "Bad or unnecessary escaping.",
	W045: "Bad number '{a}'.",
	W046: "Don't use extra leading zeros '{a}'.",
	W047: "A trailing decimal point can be confused with a dot: '{a}'.",
	W048: "Unexpected control character in regular expression.",
	W049: "Unexpected escaped character '{a}' in regular expression.",
	W050: "JavaScript URL.",
	W051: "Variables should not be deleted.",
	W052: "Unexpected '{a}'.",
	W053: "Do not use {a} as a constructor.",
	W054: "The Function constructor is a form of eval.",
	W055: "A constructor name should start with an uppercase letter.",
	W056: "Bad constructor.",
	W057: "Weird construction. Is 'new' unnecessary?",
	W058: "Missing '()' invoking a constructor.",
	W059: "Avoid arguments.{a}.",
	W060: "document.write can be a form of eval.",
	W061: "eval can be harmful.",
	W062: "Wrap an immediate function invocation in parens " +
		"to assist the reader in understanding that the expression " +
		"is the result of a function, and not the function itself.",
	W063: "Math is not a function.",
	W064: "Missing 'new' prefix when invoking a constructor.",
	W065: "Missing radix parameter.",
	W066: "Implied eval. Consider passing a function instead of a string.",
	W067: "Bad invocation.",
	W068: "Wrapping non-IIFE function literals in parens is unnecessary.",
	W069: "['{a}'] is better written in dot notation.",
	W070: "Extra comma. (it breaks older versions of IE)",
	W071: "This function has too many statements. ({a})",
	W072: "This function has too many parameters. ({a})",
	W073: "Blocks are nested too deeply. ({a})",
	W074: "This function's cyclomatic complexity is too high. ({a})",
	W075: "Duplicate key '{a}'.",
	W076: "Unexpected parameter '{a}' in get {b} function.",
	W077: "Expected a single parameter in set {a} function.",
	W078: "Setter is defined without getter.",
	W079: "Redefinition of '{a}'.",
	W080: "It's not necessary to initialize '{a}' to 'undefined'.",
	W081: "Too many var statements.",
	W082: "Function declarations should not be placed in blocks. " +
		"Use a function expression or move the statement to the top of " +
		"the outer function.",
	W083: "Don't make functions within a loop.",
	W084: "Expected a conditional expression and instead saw an assignment.",
	W085: "Don't use 'with'.",
	W086: "Expected a 'break' statement before '{a}'.",
	W087: "Forgotten 'debugger' statement?",
	W088: "Creating global 'for' variable. Should be 'for (var {a} ...'.",
	W089: "The body of a for in should be wrapped in an if statement to filter " +
		"unwanted properties from the prototype.",
	W090: "'{a}' is not a statement label.",
	W091: "'{a}' is out of scope.",
	W092: "Wrap the /regexp/ literal in parens to disambiguate the slash operator.",
	W093: "Did you mean to return a conditional instead of an assignment?",
	W094: "Unexpected comma.",
	W095: "Expected a string and instead saw {a}.",
	W096: "The '{a}' key may produce unexpected results.",
	W097: "Use the function form of \"use strict\".",
	W098: "'{a}' is defined but never used.",
	W099: "Mixed spaces and tabs.",
	W100: "This character may get silently deleted by one or more browsers.",
	W101: "Line is too long.",
	W102: "Trailing whitespace.",
	W103: "The '{a}' property is deprecated.",
	W104: "'{a}' is only available in JavaScript 1.7.",
	W105: "Unexpected {a} in '{b}'.",
	W106: "Identifier '{a}' is not in camel case.",
	W107: "Script URL.",
	W108: "Strings must use doublequote.",
	W109: "Strings must use singlequote.",
	W110: "Mixed double and single quotes.",
	W112: "Unclosed string.",
	W113: "Control character in string: {a}.",
	W114: "Avoid {a}.",
	W115: "Octal literals are not allowed in strict mode.",
	W116: "Expected '{a}' and instead saw '{b}'.",
	W117: "'{a}' is not defined.",
	W118: "'{a}' is only available in Mozilla JavaScript extensions (use moz option).",
	W119: "'{a}' is only available in ES6 (use esnext option).",
	W120: "You might be leaking a variable ({a}) here."
};

var info = {
	I001: "Comma warnings can be turned off with 'laxcomma'.",
	I002: "Reserved words as properties can be used under the 'es5' option.",
	I003: "ES5 option is now set per default"
};

exports.errors = {};
exports.warnings = {};
exports.info = {};

_.each(errors, function (desc, code) {
	exports.errors[code] = { code: code, desc: desc };
});

_.each(warnings, function (desc, code) {
	exports.warnings[code] = { code: code, desc: desc };
});

_.each(info, function (desc, code) {
	exports.info[code] = { code: code, desc: desc };
});

},{"underscore":17}],19:[function(require,module,exports){
// jshint -W001

"use strict";

// Identifiers provided by the ECMAScript standard.

exports.reservedVars = {
	arguments : false,
	NaN       : false
};

exports.ecmaIdentifiers = {
	Array              : false,
	Boolean            : false,
	Date               : false,
	decodeURI          : false,
	decodeURIComponent : false,
	encodeURI          : false,
	encodeURIComponent : false,
	Error              : false,
	"eval"             : false,
	EvalError          : false,
	Function           : false,
	hasOwnProperty     : false,
	isFinite           : false,
	isNaN              : false,
	JSON               : false,
	Math               : false,
	Map                : false,
	Number             : false,
	Object             : false,
	parseInt           : false,
	parseFloat         : false,
	RangeError         : false,
	ReferenceError     : false,
	RegExp             : false,
	Set                : false,
	String             : false,
	SyntaxError        : false,
	TypeError          : false,
	URIError           : false,
	WeakMap            : false
};

// Global variables commonly provided by a web browser environment.

exports.browser = {
	ArrayBuffer          : false,
	ArrayBufferView      : false,
	Audio                : false,
	Blob                 : false,
	addEventListener     : false,
	applicationCache     : false,
	atob                 : false,
	blur                 : false,
	btoa                 : false,
	clearInterval        : false,
	clearTimeout         : false,
	close                : false,
	closed               : false,
	CustomEvent          : false,
	DataView             : false,
	DOMParser            : false,
	defaultStatus        : false,
	document             : false,
	Element              : false,
	ElementTimeControl   : false,
	event                : false,
	FileReader           : false,
	Float32Array         : false,
	Float64Array         : false,
	FormData             : false,
	focus                : false,
	frames               : false,
	getComputedStyle     : false,
	HTMLElement          : false,
	HTMLAnchorElement    : false,
	HTMLBaseElement      : false,
	HTMLBlockquoteElement: false,
	HTMLBodyElement      : false,
	HTMLBRElement        : false,
	HTMLButtonElement    : false,
	HTMLCanvasElement    : false,
	HTMLDirectoryElement : false,
	HTMLDivElement       : false,
	HTMLDListElement     : false,
	HTMLFieldSetElement  : false,
	HTMLFontElement      : false,
	HTMLFormElement      : false,
	HTMLFrameElement     : false,
	HTMLFrameSetElement  : false,
	HTMLHeadElement      : false,
	HTMLHeadingElement   : false,
	HTMLHRElement        : false,
	HTMLHtmlElement      : false,
	HTMLIFrameElement    : false,
	HTMLImageElement     : false,
	HTMLInputElement     : false,
	HTMLIsIndexElement   : false,
	HTMLLabelElement     : false,
	HTMLLayerElement     : false,
	HTMLLegendElement    : false,
	HTMLLIElement        : false,
	HTMLLinkElement      : false,
	HTMLMapElement       : false,
	HTMLMenuElement      : false,
	HTMLMetaElement      : false,
	HTMLModElement       : false,
	HTMLObjectElement    : false,
	HTMLOListElement     : false,
	HTMLOptGroupElement  : false,
	HTMLOptionElement    : false,
	HTMLParagraphElement : false,
	HTMLParamElement     : false,
	HTMLPreElement       : false,
	HTMLQuoteElement     : false,
	HTMLScriptElement    : false,
	HTMLSelectElement    : false,
	HTMLStyleElement     : false,
	HTMLTableCaptionElement: false,
	HTMLTableCellElement : false,
	HTMLTableColElement  : false,
	HTMLTableElement     : false,
	HTMLTableRowElement  : false,
	HTMLTableSectionElement: false,
	HTMLTextAreaElement  : false,
	HTMLTitleElement     : false,
	HTMLUListElement     : false,
	HTMLVideoElement     : false,
	history              : false,
	Int16Array           : false,
	Int32Array           : false,
	Int8Array            : false,
	Image                : false,
	length               : false,
	localStorage         : false,
	location             : false,
	MessageChannel       : false,
	MessageEvent         : false,
	MessagePort          : false,
	MouseEvent           : false,
	moveBy               : false,
	moveTo               : false,
	MutationObserver     : false,
	name                 : false,
	Node                 : false,
	NodeFilter           : false,
	navigator            : false,
	onbeforeunload       : true,
	onblur               : true,
	onerror              : true,
	onfocus              : true,
	onload               : true,
	onresize             : true,
	onunload             : true,
	open                 : false,
	openDatabase         : false,
	opener               : false,
	Option               : false,
	parent               : false,
	print                : false,
	removeEventListener  : false,
	resizeBy             : false,
	resizeTo             : false,
	screen               : false,
	scroll               : false,
	scrollBy             : false,
	scrollTo             : false,
	sessionStorage       : false,
	setInterval          : false,
	setTimeout           : false,
	SharedWorker         : false,
	status               : false,
	SVGAElement          : false,
	SVGAltGlyphDefElement: false,
	SVGAltGlyphElement   : false,
	SVGAltGlyphItemElement: false,
	SVGAngle             : false,
	SVGAnimateColorElement: false,
	SVGAnimateElement    : false,
	SVGAnimateMotionElement: false,
	SVGAnimateTransformElement: false,
	SVGAnimatedAngle     : false,
	SVGAnimatedBoolean   : false,
	SVGAnimatedEnumeration: false,
	SVGAnimatedInteger   : false,
	SVGAnimatedLength    : false,
	SVGAnimatedLengthList: false,
	SVGAnimatedNumber    : false,
	SVGAnimatedNumberList: false,
	SVGAnimatedPathData  : false,
	SVGAnimatedPoints    : false,
	SVGAnimatedPreserveAspectRatio: false,
	SVGAnimatedRect      : false,
	SVGAnimatedString    : false,
	SVGAnimatedTransformList: false,
	SVGAnimationElement  : false,
	SVGCSSRule           : false,
	SVGCircleElement     : false,
	SVGClipPathElement   : false,
	SVGColor             : false,
	SVGColorProfileElement: false,
	SVGColorProfileRule  : false,
	SVGComponentTransferFunctionElement: false,
	SVGCursorElement     : false,
	SVGDefsElement       : false,
	SVGDescElement       : false,
	SVGDocument          : false,
	SVGElement           : false,
	SVGElementInstance   : false,
	SVGElementInstanceList: false,
	SVGEllipseElement    : false,
	SVGExternalResourcesRequired: false,
	SVGFEBlendElement    : false,
	SVGFEColorMatrixElement: false,
	SVGFEComponentTransferElement: false,
	SVGFECompositeElement: false,
	SVGFEConvolveMatrixElement: false,
	SVGFEDiffuseLightingElement: false,
	SVGFEDisplacementMapElement: false,
	SVGFEDistantLightElement: false,
	SVGFEFloodElement    : false,
	SVGFEFuncAElement    : false,
	SVGFEFuncBElement    : false,
	SVGFEFuncGElement    : false,
	SVGFEFuncRElement    : false,
	SVGFEGaussianBlurElement: false,
	SVGFEImageElement    : false,
	SVGFEMergeElement    : false,
	SVGFEMergeNodeElement: false,
	SVGFEMorphologyElement: false,
	SVGFEOffsetElement   : false,
	SVGFEPointLightElement: false,
	SVGFESpecularLightingElement: false,
	SVGFESpotLightElement: false,
	SVGFETileElement     : false,
	SVGFETurbulenceElement: false,
	SVGFilterElement     : false,
	SVGFilterPrimitiveStandardAttributes: false,
	SVGFitToViewBox      : false,
	SVGFontElement       : false,
	SVGFontFaceElement   : false,
	SVGFontFaceFormatElement: false,
	SVGFontFaceNameElement: false,
	SVGFontFaceSrcElement: false,
	SVGFontFaceUriElement: false,
	SVGForeignObjectElement: false,
	SVGGElement          : false,
	SVGGlyphElement      : false,
	SVGGlyphRefElement   : false,
	SVGGradientElement   : false,
	SVGHKernElement      : false,
	SVGICCColor          : false,
	SVGImageElement      : false,
	SVGLangSpace         : false,
	SVGLength            : false,
	SVGLengthList        : false,
	SVGLineElement       : false,
	SVGLinearGradientElement: false,
	SVGLocatable         : false,
	SVGMPathElement      : false,
	SVGMarkerElement     : false,
	SVGMaskElement       : false,
	SVGMatrix            : false,
	SVGMetadataElement   : false,
	SVGMissingGlyphElement: false,
	SVGNumber            : false,
	SVGNumberList        : false,
	SVGPaint             : false,
	SVGPathElement       : false,
	SVGPathSeg           : false,
	SVGPathSegArcAbs     : false,
	SVGPathSegArcRel     : false,
	SVGPathSegClosePath  : false,
	SVGPathSegCurvetoCubicAbs: false,
	SVGPathSegCurvetoCubicRel: false,
	SVGPathSegCurvetoCubicSmoothAbs: false,
	SVGPathSegCurvetoCubicSmoothRel: false,
	SVGPathSegCurvetoQuadraticAbs: false,
	SVGPathSegCurvetoQuadraticRel: false,
	SVGPathSegCurvetoQuadraticSmoothAbs: false,
	SVGPathSegCurvetoQuadraticSmoothRel: false,
	SVGPathSegLinetoAbs  : false,
	SVGPathSegLinetoHorizontalAbs: false,
	SVGPathSegLinetoHorizontalRel: false,
	SVGPathSegLinetoRel  : false,
	SVGPathSegLinetoVerticalAbs: false,
	SVGPathSegLinetoVerticalRel: false,
	SVGPathSegList       : false,
	SVGPathSegMovetoAbs  : false,
	SVGPathSegMovetoRel  : false,
	SVGPatternElement    : false,
	SVGPoint             : false,
	SVGPointList         : false,
	SVGPolygonElement    : false,
	SVGPolylineElement   : false,
	SVGPreserveAspectRatio: false,
	SVGRadialGradientElement: false,
	SVGRect              : false,
	SVGRectElement       : false,
	SVGRenderingIntent   : false,
	SVGSVGElement        : false,
	SVGScriptElement     : false,
	SVGSetElement        : false,
	SVGStopElement       : false,
	SVGStringList        : false,
	SVGStylable          : false,
	SVGStyleElement      : false,
	SVGSwitchElement     : false,
	SVGSymbolElement     : false,
	SVGTRefElement       : false,
	SVGTSpanElement      : false,
	SVGTests             : false,
	SVGTextContentElement: false,
	SVGTextElement       : false,
	SVGTextPathElement   : false,
	SVGTextPositioningElement: false,
	SVGTitleElement      : false,
	SVGTransform         : false,
	SVGTransformList     : false,
	SVGTransformable     : false,
	SVGURIReference      : false,
	SVGUnitTypes         : false,
	SVGUseElement        : false,
	SVGVKernElement      : false,
	SVGViewElement       : false,
	SVGViewSpec          : false,
	SVGZoomAndPan        : false,
	TimeEvent            : false,
	top                  : false,
	Uint16Array          : false,
	Uint32Array          : false,
	Uint8Array           : false,
	Uint8ClampedArray    : false,
	WebSocket            : false,
	window               : false,
	Worker               : false,
	XMLHttpRequest       : false,
	XMLSerializer        : false,
	XPathEvaluator       : false,
	XPathException       : false,
	XPathExpression      : false,
	XPathNamespace       : false,
	XPathNSResolver      : false,
	XPathResult          : false
};

exports.devel = {
	alert  : false,
	confirm: false,
	console: false,
	Debug  : false,
	opera  : false,
	prompt : false
};

exports.worker = {
	importScripts: true,
	postMessage  : true,
	self         : true
};

// Widely adopted global names that are not part of ECMAScript standard
exports.nonstandard = {
	escape  : false,
	unescape: false
};

// Globals provided by popular JavaScript environments.

exports.couch = {
	"require" : false,
	respond   : false,
	getRow    : false,
	emit      : false,
	send      : false,
	start     : false,
	sum       : false,
	log       : false,
	exports   : false,
	module    : false,
	provides  : false
};

exports.node = {
	__filename    : false,
	__dirname     : false,
	Buffer        : false,
	DataView      : false,
	console       : false,
	exports       : true,  // In Node it is ok to exports = module.exports = foo();
	GLOBAL        : false,
	global        : false,
	module        : false,
	process       : false,
	require       : false,
	setTimeout    : false,
	clearTimeout  : false,
	setInterval   : false,
	clearInterval : false,
	setImmediate  : false, // v0.9.1+
	clearImmediate: false  // v0.9.1+
};

exports.phantom = {
	phantom      : true,
	require      : true,
	WebPage      : true
};

exports.rhino = {
	defineClass  : false,
	deserialize  : false,
	gc           : false,
	help         : false,
	importPackage: false,
	"java"       : false,
	load         : false,
	loadClass    : false,
	print        : false,
	quit         : false,
	readFile     : false,
	readUrl      : false,
	runCommand   : false,
	seal         : false,
	serialize    : false,
	spawn        : false,
	sync         : false,
	toint32      : false,
	version      : false
};

exports.shelljs = {
	target       : false,
	echo         : false,
	exit         : false,
	cd           : false,
	pwd          : false,
	ls           : false,
	find         : false,
	cp           : false,
	rm           : false,
	mv           : false,
	mkdir        : false,
	test         : false,
	cat          : false,
	sed          : false,
	grep         : false,
	which        : false,
	dirs         : false,
	pushd        : false,
	popd         : false,
	env          : false,
	exec         : false,
	chmod        : false,
	config       : false,
	error        : false,
	tempdir      : false
};

exports.wsh = {
	ActiveXObject            : true,
	Enumerator               : true,
	GetObject                : true,
	ScriptEngine             : true,
	ScriptEngineBuildVersion : true,
	ScriptEngineMajorVersion : true,
	ScriptEngineMinorVersion : true,
	VBArray                  : true,
	WSH                      : true,
	WScript                  : true,
	XDomainRequest           : true
};

// Globals provided by popular JavaScript libraries.

exports.dojo = {
	dojo     : false,
	dijit    : false,
	dojox    : false,
	define	 : false,
	"require": false
};

exports.jquery = {
	"$"    : false,
	jQuery : false
};

exports.mootools = {
	"$"           : false,
	"$$"          : false,
	Asset         : false,
	Browser       : false,
	Chain         : false,
	Class         : false,
	Color         : false,
	Cookie        : false,
	Core          : false,
	Document      : false,
	DomReady      : false,
	DOMEvent      : false,
	DOMReady      : false,
	Drag          : false,
	Element       : false,
	Elements      : false,
	Event         : false,
	Events        : false,
	Fx            : false,
	Group         : false,
	Hash          : false,
	HtmlTable     : false,
	Iframe        : false,
	IframeShim    : false,
	InputValidator: false,
	instanceOf    : false,
	Keyboard      : false,
	Locale        : false,
	Mask          : false,
	MooTools      : false,
	Native        : false,
	Options       : false,
	OverText      : false,
	Request       : false,
	Scroller      : false,
	Slick         : false,
	Slider        : false,
	Sortables     : false,
	Spinner       : false,
	Swiff         : false,
	Tips          : false,
	Type          : false,
	typeOf        : false,
	URI           : false,
	Window        : false
};

exports.prototypejs = {
	"$"               : false,
	"$$"              : false,
	"$A"              : false,
	"$F"              : false,
	"$H"              : false,
	"$R"              : false,
	"$break"          : false,
	"$continue"       : false,
	"$w"              : false,
	Abstract          : false,
	Ajax              : false,
	Class             : false,
	Enumerable        : false,
	Element           : false,
	Event             : false,
	Field             : false,
	Form              : false,
	Hash              : false,
	Insertion         : false,
	ObjectRange       : false,
	PeriodicalExecuter: false,
	Position          : false,
	Prototype         : false,
	Selector          : false,
	Template          : false,
	Toggle            : false,
	Try               : false,
	Autocompleter     : false,
	Builder           : false,
	Control           : false,
	Draggable         : false,
	Draggables        : false,
	Droppables        : false,
	Effect            : false,
	Sortable          : false,
	SortableObserver  : false,
	Sound             : false,
	Scriptaculous     : false
};

exports.yui = {
	YUI       : false,
	Y         : false,
	YUI_config: false
};


},{}],20:[function(require,module,exports){
/*!
 * JSHint, by JSHint Community.
 *
 * This file (and this file only) is licensed under the same slightly modified
 * MIT license that JSLint is. It stops evil-doers everywhere:
 *
 *	 Copyright (c) 2002 Douglas Crockford  (www.JSLint.com)
 *
 *	 Permission is hereby granted, free of charge, to any person obtaining
 *	 a copy of this software and associated documentation files (the "Software"),
 *	 to deal in the Software without restriction, including without limitation
 *	 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *	 and/or sell copies of the Software, and to permit persons to whom
 *	 the Software is furnished to do so, subject to the following conditions:
 *
 *	 The above copyright notice and this permission notice shall be included
 *	 in all copies or substantial portions of the Software.
 *
 *	 The Software shall be used for Good, not Evil.
 *
 *	 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *	 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *	 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *	 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *	 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *	 DEALINGS IN THE SOFTWARE.
 *
 */

/*jshint quotmark:double */
/*global console:true */
/*exported console */

var _        = require("underscore");
var events   = require("events");
var vars     = require("../shared/vars.js");
var messages = require("../shared/messages.js");
var Lexer    = require("./lex.js").Lexer;
var reg      = require("./reg.js");
var state    = require("./state.js").state;
var style    = require("./style.js");

// We need this module here because environments such as IE and Rhino
// don't necessarilly expose the 'console' API and browserify uses
// it to log things. It's a sad state of affair, really.
var console = require("console-browserify");

// We build the application inside a function so that we produce only a singleton
// variable. That function will be invoked immediately, and its return value is
// the JSHINT function itself.

var JSHINT = (function () {
	"use strict";

	var anonname, // The guessed name for anonymous functions.
		api, // Extension API

		// These are operators that should not be used with the ! operator.
		bang = {
			"<"  : true,
			"<=" : true,
			"==" : true,
			"===": true,
			"!==": true,
			"!=" : true,
			">"  : true,
			">=" : true,
			"+"  : true,
			"-"  : true,
			"*"  : true,
			"/"  : true,
			"%"  : true
		},

		// These are the JSHint boolean options.
		boolOptions = {
			asi         : true, // if automatic semicolon insertion should be tolerated
			bitwise     : true, // if bitwise operators should not be allowed
			boss        : true, // if advanced usage of assignments should be allowed
			browser     : true, // if the standard browser globals should be predefined
			camelcase   : true, // if identifiers should be required in camel case
			couch       : true, // if CouchDB globals should be predefined
			curly       : true, // if curly braces around all blocks should be required
			debug       : true, // if debugger statements should be allowed
			devel       : true, // if logging globals should be predefined (console, alert, etc.)
			dojo        : true, // if Dojo Toolkit globals should be predefined
			eqeqeq      : true, // if === should be required
			eqnull      : true, // if == null comparisons should be tolerated
			es3         : true, // if ES3 syntax should be allowed
			es5         : true, // if ES5 syntax should be allowed (is now set per default)
			esnext      : true, // if es.next specific syntax should be allowed
			moz         : true, // if mozilla specific syntax should be allowed
			evil        : true, // if eval should be allowed
			expr        : true, // if ExpressionStatement should be allowed as Programs
			forin       : true, // if for in statements must filter
			funcscope   : true, // if only function scope should be used for scope tests
			gcl         : true, // if JSHint should be compatible with Google Closure Linter
			globalstrict: true, // if global "use strict"; should be allowed (also enables 'strict')
			immed       : true, // if immediate invocations must be wrapped in parens
			iterator    : true, // if the `__iterator__` property should be allowed
			jquery      : true, // if jQuery globals should be predefined
			lastsemic   : true, // if semicolons may be ommitted for the trailing
			                    // statements inside of a one-line blocks.
			laxbreak    : true, // if line breaks should not be checked
			laxcomma    : true, // if line breaks should not be checked around commas
			loopfunc    : true, // if functions should be allowed to be defined within
			                    // loops
			mootools    : true, // if MooTools globals should be predefined
			multistr    : true, // allow multiline strings
			newcap      : true, // if constructor names must be capitalized
			noarg       : true, // if arguments.caller and arguments.callee should be
			                    // disallowed
			node        : true, // if the Node.js environment globals should be
			                    // predefined
			noempty     : true, // if empty blocks should be disallowed
			nonew       : true, // if using `new` for side-effects should be disallowed
			nonstandard : true, // if non-standard (but widely adopted) globals should
			                    // be predefined
			nomen       : true, // if names should be checked
			onevar      : true, // if only one var statement per function should be
			                    // allowed
			passfail    : true, // if the scan should stop on first error
			phantom     : true, // if PhantomJS symbols should be allowed
			plusplus    : true, // if increment/decrement should not be allowed
			proto       : true, // if the `__proto__` property should be allowed
			prototypejs : true, // if Prototype and Scriptaculous globals should be
			                    // predefined
			rhino       : true, // if the Rhino environment globals should be predefined
			shelljs     : true, // if ShellJS globals should be predefined
			undef       : true, // if variables should be declared before used
			scripturl   : true, // if script-targeted URLs should be tolerated
			shadow      : true, // if variable shadowing should be tolerated
			smarttabs   : true, // if smarttabs should be tolerated
			                    // (http://www.emacswiki.org/emacs/SmartTabs)
			strict      : true, // require the "use strict"; pragma
			sub         : true, // if all forms of subscript notation are tolerated
			supernew    : true, // if `new function () { ... };` and `new Object;`
			                    // should be tolerated
			trailing    : true, // if trailing whitespace rules apply
			validthis   : true, // if 'this' inside a non-constructor function is valid.
			                    // This is a function scoped option only.
			withstmt    : true, // if with statements should be allowed
			white       : true, // if strict whitespace rules apply
			worker      : true, // if Web Worker script symbols should be allowed
			wsh         : true, // if the Windows Scripting Host environment globals
			                    // should be predefined
			yui         : true, // YUI variables should be predefined

			// Obsolete options
			onecase     : true, // if one case switch statements should be allowed
			regexp      : true, // if the . should not be allowed in regexp literals
			regexdash   : true  // if unescaped first/last dash (-) inside brackets
			                    // should be tolerated
		},

		// These are the JSHint options that can take any value
		// (we use this object to detect invalid options)
		valOptions = {
			maxlen       : false,
			indent       : false,
			maxerr       : false,
			predef       : false,
			quotmark     : false, //'single'|'double'|true
			scope        : false,
			maxstatements: false, // {int} max statements per function
			maxdepth     : false, // {int} max nested block depth per function
			maxparams    : false, // {int} max params per function
			maxcomplexity: false, // {int} max cyclomatic complexity per function
			unused       : true,  // warn if variables are unused. Available options:
			                      //   false    - don't check for unused variables
			                      //   true     - "vars" + check last function param
			                      //   "vars"   - skip checking unused function params
			                      //   "strict" - "vars" + check all function params
			latedef      : false  // warn if the variable is used before its definition
			                      //   false    - don't emit any warnings
			                      //   true     - warn if any variable is used before its definition
			                      //   "nofunc" - warn for any variable but function declarations
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the definition in JSHint is opposite JSLint
		invertedOptions = {
			bitwise : true,
			forin   : true,
			newcap  : true,
			nomen   : true,
			plusplus: true,
			regexp  : true,
			undef   : true,
			white   : true,

			// Inverted and renamed, use JSHint name here
			eqeqeq  : true,
			onevar  : true,
			strict  : true
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the name has been changed but the effect is unchanged
		renamedOptions = {
			eqeq   : "eqeqeq",
			vars   : "onevar",
			windows: "wsh",
			sloppy : "strict"
		},

		declared, // Globals that were declared using /*global ... */ syntax.
		exported, // Variables that are used outside of the current file.

		functionicity = [
			"closure", "exception", "global", "label",
			"outer", "unused", "var"
		],

		funct, // The current function
		functions, // All of the functions

		global, // The global scope
		implied, // Implied globals
		inblock,
		indent,
		lookahead,
		lex,
		member,
		membersOnly,
		noreach,
		predefined,		// Global variables defined by option

		scope,  // The current scope
		stack,
		unuseds,
		urls,
		warnings,

		extraModules = [],
		emitter = new events.EventEmitter();

	function checkOption(name, t) {
		name = name.trim();

		if (/^[+-]W\d{3}$/g.test(name)) {
			return true;
		}

		if (valOptions[name] === undefined && boolOptions[name] === undefined) {
			if (t.type !== "jslint") {
				error("E001", t, name);
				return false;
			}
		}

		return true;
	}

	function isString(obj) {
		return Object.prototype.toString.call(obj) === "[object String]";
	}

	function isIdentifier(tkn, value) {
		if (!tkn)
			return false;

		if (!tkn.identifier || tkn.value !== value)
			return false;

		return true;
	}

	function isReserved(token) {
		if (!token.reserved) {
			return false;
		}
		var meta = token.meta;

		if (meta && meta.isFutureReservedWord && state.option.inES5()) {
			// ES3 FutureReservedWord in an ES5 environment.
			if (!meta.es5) {
				return false;
			}

			// Some ES5 FutureReservedWord identifiers are active only
			// within a strict mode environment.
			if (meta.strictOnly) {
				if (!state.option.strict && !state.directive["use strict"]) {
					return false;
				}
			}

			if (token.isProperty) {
				return false;
			}
		}

		return true;
	}

	function supplant(str, data) {
		return str.replace(/\{([^{}]*)\}/g, function (a, b) {
			var r = data[b];
			return typeof r === "string" || typeof r === "number" ? r : a;
		});
	}

	function combine(t, o) {
		var n;
		for (n in o) {
			if (_.has(o, n) && !_.has(JSHINT.blacklist, n)) {
				t[n] = o[n];
			}
		}
	}

	function updatePredefined() {
		Object.keys(JSHINT.blacklist).forEach(function (key) {
			delete predefined[key];
		});
	}

	function assume() {
		if (state.option.es5) {
			warning("I003");
		}
		if (state.option.couch) {
			combine(predefined, vars.couch);
		}

		if (state.option.rhino) {
			combine(predefined, vars.rhino);
		}

		if (state.option.shelljs) {
			combine(predefined, vars.shelljs);
			combine(predefined, vars.node);
		}

		if (state.option.phantom) {
			combine(predefined, vars.phantom);
		}

		if (state.option.prototypejs) {
			combine(predefined, vars.prototypejs);
		}

		if (state.option.node) {
			combine(predefined, vars.node);
		}

		if (state.option.devel) {
			combine(predefined, vars.devel);
		}

		if (state.option.dojo) {
			combine(predefined, vars.dojo);
		}

		if (state.option.browser) {
			combine(predefined, vars.browser);
		}

		if (state.option.nonstandard) {
			combine(predefined, vars.nonstandard);
		}

		if (state.option.jquery) {
			combine(predefined, vars.jquery);
		}

		if (state.option.mootools) {
			combine(predefined, vars.mootools);
		}

		if (state.option.worker) {
			combine(predefined, vars.worker);
		}

		if (state.option.wsh) {
			combine(predefined, vars.wsh);
		}

		if (state.option.globalstrict && state.option.strict !== false) {
			state.option.strict = true;
		}

		if (state.option.yui) {
			combine(predefined, vars.yui);
		}

		// Let's assume that chronologically ES3 < ES5 < ES6/ESNext < Moz

		state.option.inMoz = function (strict) {
			if (strict) {
				return state.option.moz && !state.option.esnext;
			}
			return state.option.moz;
		};

		state.option.inESNext = function (strict) {
			if (strict) {
				return !state.option.moz && state.option.esnext;
			}
			return state.option.moz || state.option.esnext;
		};

		state.option.inES5 = function (/* strict */) {
			return !state.option.es3;
		};

		state.option.inES3 = function (strict) {
			if (strict) {
				return !state.option.moz && !state.option.esnext && state.option.es3;
			}
			return state.option.es3;
		};
	}

	// Produce an error warning.
	function quit(code, line, chr) {
		var percentage = Math.floor((line / state.lines.length) * 100);
		var message = messages.errors[code].desc;

		throw {
			name: "JSHintError",
			line: line,
			character: chr,
			message: message + " (" + percentage + "% scanned).",
			raw: message,
			code: code
		};
	}

	function isundef(scope, code, token, a) {
		return JSHINT.undefs.push([scope, code, token, a]);
	}

	function warning(code, t, a, b, c, d) {
		var ch, l, w, msg;

		if (/^W\d{3}$/.test(code)) {
			if (state.ignored[code])
				return;

			msg = messages.warnings[code];
		} else if (/E\d{3}/.test(code)) {
			msg = messages.errors[code];
		} else if (/I\d{3}/.test(code)) {
			msg = messages.info[code];
		}

		t = t || state.tokens.next;
		if (t.id === "(end)") {  // `~
			t = state.tokens.curr;
		}

		l = t.line || 0;
		ch = t.from || 0;

		w = {
			id: "(error)",
			raw: msg.desc,
			code: msg.code,
			evidence: state.lines[l - 1] || "",
			line: l,
			character: ch,
			scope: JSHINT.scope,
			a: a,
			b: b,
			c: c,
			d: d
		};

		w.reason = supplant(msg.desc, w);
		JSHINT.errors.push(w);

		if (state.option.passfail) {
			quit("E042", l, ch);
		}

		warnings += 1;
		if (warnings >= state.option.maxerr) {
			quit("E043", l, ch);
		}

		return w;
	}

	function warningAt(m, l, ch, a, b, c, d) {
		return warning(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	function error(m, t, a, b, c, d) {
		warning(m, t, a, b, c, d);
	}

	function errorAt(m, l, ch, a, b, c, d) {
		return error(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	// Tracking of "internal" scripts, like eval containing a static string
	function addInternalSrc(elem, src) {
		var i;
		i = {
			id: "(internal)",
			elem: elem,
			value: src
		};
		JSHINT.internals.push(i);
		return i;
	}

	function addlabel(t, type, tkn, islet) {
		// Define t in the current function in the current scope.
		if (type === "exception") {
			if (_.has(funct["(context)"], t)) {
				if (funct[t] !== true && !state.option.node) {
					warning("W002", state.tokens.next, t);
				}
			}
		}

		if (_.has(funct, t) && !funct["(global)"]) {
			if (funct[t] === true) {
				if (state.option.latedef) {
					if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
							!_.contains([funct[t], type], "unction")) {
						warning("W003", state.tokens.next, t);
					}
				}
			} else {
				if (!state.option.shadow && type !== "exception" ||
							(funct["(blockscope)"].getlabel(t))) {
					warning("W004", state.tokens.next, t);
				}
			}
		}

		// a double definition of a let variable in same block throws a TypeError
		if (funct["(blockscope)"] && funct["(blockscope)"].current.has(t)) {
			error("E044", state.tokens.next, t);
		}

		// if the identifier is from a let, adds it only to the current blockscope
		if (islet) {
			funct["(blockscope)"].current.add(t, type, state.tokens.curr);
		} else {

			funct[t] = type;

			if (tkn) {
				funct["(tokens)"][t] = tkn;
			}

			if (funct["(global)"]) {
				global[t] = funct;
				if (_.has(implied, t)) {
					if (state.option.latedef) {
						if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
								!_.contains([funct[t], type], "unction")) {
							warning("W003", state.tokens.next, t);
						}
					}

					delete implied[t];
				}
			} else {
				scope[t] = funct;
			}
		}
	}

	function doOption() {
		var nt = state.tokens.next;
		var body = nt.body.split(",").map(function (s) { return s.trim(); });
		var predef = {};

		if (nt.type === "globals") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = g[0];
				var val = g[1];

				if (key.charAt(0) === "-") {
					key = key.slice(1);
					val = false;

					JSHINT.blacklist[key] = key;
					updatePredefined();
				} else {
					predef[key] = (val === "true");
				}
			});

			combine(predefined, predef);

			for (var key in predef) {
				if (_.has(predef, key)) {
					declared[key] = nt;
				}
			}
		}

		if (nt.type === "exported") {
			body.forEach(function (e) {
				exported[e] = true;
			});
		}

		if (nt.type === "members") {
			membersOnly = membersOnly || {};

			body.forEach(function (m) {
				var ch1 = m.charAt(0);
				var ch2 = m.charAt(m.length - 1);

				if (ch1 === ch2 && (ch1 === "\"" || ch1 === "'")) {
					m = m
						.substr(1, m.length - 2)
						.replace("\\b", "\b")
						.replace("\\t", "\t")
						.replace("\\n", "\n")
						.replace("\\v", "\v")
						.replace("\\f", "\f")
						.replace("\\r", "\r")
						.replace("\\\\", "\\")
						.replace("\\\"", "\"");
				}

				membersOnly[m] = false;
			});
		}

		var numvals = [
			"maxstatements",
			"maxparams",
			"maxdepth",
			"maxcomplexity",
			"maxerr",
			"maxlen",
			"indent"
		];

		if (nt.type === "jshint" || nt.type === "jslint") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = (g[0] || "").trim();
				var val = (g[1] || "").trim();

				if (!checkOption(key, nt)) {
					return;
				}

				if (numvals.indexOf(key) >= 0) {

					// GH988 - numeric options can be disabled by setting them to `false`
					if (val !== "false") {
						val = +val;

						if (typeof val !== "number" || !isFinite(val) || val <= 0 || Math.floor(val) !== val) {
							error("E032", nt, g[1].trim());
							return;
						}

						if (key === "indent") {
							state.option["(explicitIndent)"] = true;
						}
						state.option[key] = val;
					} else {
						if (key === "indent") {
							state.option["(explicitIndent)"] = false;
						} else {
							state.option[key] = false;
						}
					}

					return;
				}

				if (key === "validthis") {
					// `validthis` is valid only within a function scope.
					if (funct["(global)"]) {
						error("E009");
					} else {
						if (val === "true" || val === "false") {
							state.option.validthis = (val === "true");
						} else {
							error("E002", nt);
						}
					}
					return;
				}

				if (key === "quotmark") {
					switch (val) {
					case "true":
					case "false":
						state.option.quotmark = (val === "true");
						break;
					case "double":
					case "single":
						state.option.quotmark = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "unused") {
					switch (val) {
					case "true":
						state.option.unused = true;
						break;
					case "false":
						state.option.unused = false;
						break;
					case "vars":
					case "strict":
						state.option.unused = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "latedef") {
					switch (val) {
					case "true":
						state.option.latedef = true;
						break;
					case "false":
						state.option.latedef = false;
						break;
					case "nofunc":
						state.option.latedef = "nofunc";
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				var match = /^([+-])(W\d{3})$/g.exec(key);
				if (match) {
					// ignore for -W..., unignore for +W...
					state.ignored[match[2]] = (match[1] === "-");
					return;
				}

				var tn;
				if (val === "true" || val === "false") {
					if (nt.type === "jslint") {
						tn = renamedOptions[key] || key;
						state.option[tn] = (val === "true");

						if (invertedOptions[tn] !== undefined) {
							state.option[tn] = !state.option[tn];
						}
					} else {
						state.option[key] = (val === "true");
					}

					if (key === "newcap") {
						state.option["(explicitNewcap)"] = true;
					}
					return;
				}

				error("E002", nt);
			});

			assume();
		}
	}

	// We need a peek function. If it has an argument, it peeks that much farther
	// ahead. It is used to distinguish
	//	   for ( var i in ...
	// from
	//	   for ( var i = ...

	function peek(p) {
		var i = p || 0, j = 0, t;

		while (j <= i) {
			t = lookahead[j];
			if (!t) {
				t = lookahead[j] = lex.token();
			}
			j += 1;
		}
		return t;
	}

	// Produce the next token. It looks for programming errors.

	function advance(id, t) {
		switch (state.tokens.curr.id) {
		case "(number)":
			if (state.tokens.next.id === ".") {
				warning("W005", state.tokens.curr);
			}
			break;
		case "-":
			if (state.tokens.next.id === "-" || state.tokens.next.id === "--") {
				warning("W006");
			}
			break;
		case "+":
			if (state.tokens.next.id === "+" || state.tokens.next.id === "++") {
				warning("W007");
			}
			break;
		}

		if (state.tokens.curr.type === "(string)" || state.tokens.curr.identifier) {
			anonname = state.tokens.curr.value;
		}

		if (id && state.tokens.next.id !== id) {
			if (t) {
				if (state.tokens.next.id === "(end)") {
					error("E019", t, t.id);
				} else {
					error("E020", state.tokens.next, id, t.id, t.line, state.tokens.next.value);
				}
			} else if (state.tokens.next.type !== "(identifier)" || state.tokens.next.value !== id) {
				warning("W116", state.tokens.next, id, state.tokens.next.value);
			}
		}

		state.tokens.prev = state.tokens.curr;
		state.tokens.curr = state.tokens.next;
		for (;;) {
			state.tokens.next = lookahead.shift() || lex.token();

			if (!state.tokens.next) { // No more tokens left, give up
				quit("E041", state.tokens.curr.line);
			}

			if (state.tokens.next.id === "(end)" || state.tokens.next.id === "(error)") {
				return;
			}

			if (state.tokens.next.check) {
				state.tokens.next.check();
			}

			if (state.tokens.next.isSpecial) {
				doOption();
			} else {
				if (state.tokens.next.id !== "(endline)") {
					break;
				}
			}
		}
	}

	function isInfix(token) {
		return token.infix || (!token.identifier && !!token.led);
	}

	function isEndOfExpr() {
		var curr = state.tokens.curr;
		var next = state.tokens.next;
		if (next.id === ";" || next.id === "}" || next.id === ":") {
			return true;
		}
		if (isInfix(next) === isInfix(curr) || (curr.id === "yield" && state.option.inMoz(true))) {
			return curr.line !== next.line;
		}
		return false;
	}

	// This is the heart of JSHINT, the Pratt parser. In addition to parsing, it
	// is looking for ad hoc lint patterns. We add .fud to Pratt's model, which is
	// like .nud except that it is only used on the first token of a statement.
	// Having .fud makes it much easier to define statement-oriented languages like
	// JavaScript. I retained Pratt's nomenclature.

	// .nud  Null denotation
	// .fud  First null denotation
	// .led  Left denotation
	//  lbp  Left binding power
	//  rbp  Right binding power

	// They are elements of the parsing method called Top Down Operator Precedence.

	function expression(rbp, initial) {
		var left, isArray = false, isObject = false, isLetExpr = false;

		// if current expression is a let expression
		if (!initial && state.tokens.next.value === "let" && peek(0).value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let expressions");
			}
			isLetExpr = true;
			// create a new block scope we use only for the current expression
			funct["(blockscope)"].stack();
			advance("let");
			advance("(");
			state.syntax["let"].fud.call(state.syntax["let"].fud, false);
			advance(")");
		}

		if (state.tokens.next.id === "(end)")
			error("E006", state.tokens.curr);

		advance();

		if (initial) {
			anonname = "anonymous";
			funct["(verb)"] = state.tokens.curr.value;
		}

		if (initial === true && state.tokens.curr.fud) {
			left = state.tokens.curr.fud();
		} else {
			if (state.tokens.curr.nud) {
				left = state.tokens.curr.nud();
			} else {
				error("E030", state.tokens.curr, state.tokens.curr.id);
			}

			while (rbp < state.tokens.next.lbp && !isEndOfExpr()) {
				isArray = state.tokens.curr.value === "Array";
				isObject = state.tokens.curr.value === "Object";

				// #527, new Foo.Array(), Foo.Array(), new Foo.Object(), Foo.Object()
				// Line breaks in IfStatement heads exist to satisfy the checkJSHint
				// "Line too long." error.
				if (left && (left.value || (left.first && left.first.value))) {
					// If the left.value is not "new", or the left.first.value is a "."
					// then safely assume that this is not "new Array()" and possibly
					// not "new Object()"...
					if (left.value !== "new" ||
					  (left.first && left.first.value && left.first.value === ".")) {
						isArray = false;
						// ...In the case of Object, if the left.value and state.tokens.curr.value
						// are not equal, then safely assume that this not "new Object()"
						if (left.value !== state.tokens.curr.value) {
							isObject = false;
						}
					}
				}

				advance();

				if (isArray && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W009", state.tokens.curr);
				}

				if (isObject && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W010", state.tokens.curr);
				}

				if (left && state.tokens.curr.led) {
					left = state.tokens.curr.led(left);
				} else {
					error("E033", state.tokens.curr, state.tokens.curr.id);
				}
			}
		}
		if (isLetExpr) {
			funct["(blockscope)"].unstack();
		}
		return left;
	}


// Functions for conformance of style.

	function adjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white) {
			if (left.character !== right.from && left.line === right.line) {
				left.from += (left.character - left.from);
				warning("W011", left, left.value);
			}
		}
	}

	function nobreak(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && (left.character !== right.from || left.line !== right.line)) {
			warning("W012", right, right.value);
		}
	}

	function nospace(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && !left.comment) {
			if (left.line === right.line) {
				adjacent(left, right);
			}
		}
	}

	function nonadjacent(left, right) {
		if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;

			if (left.value === ";" && right.value === ";") {
				return;
			}

			if (left.line === right.line && left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function nobreaknonadjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (!state.option.laxbreak && left.line !== right.line) {
			warning("W014", right, right.value);
		} else if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;
			if (left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function indentation(bias) {
		if (!state.option.white && !state.option["(explicitIndent)"]) {
			return;
		}

		if (state.tokens.next.id === "(end)") {
			return;
		}

		var i = indent + (bias || 0);
		if (state.tokens.next.from !== i) {
			warning("W015", state.tokens.next, state.tokens.next.value, i, state.tokens.next.from);
		}
	}

	function nolinebreak(t) {
		t = t || state.tokens.curr;
		if (t.line !== state.tokens.next.line) {
			warning("E022", t, t.value);
		}
	}

	function nobreakcomma(left, right) {
		if (left.line !== right.line) {
			if (!state.option.laxcomma) {
				if (comma.first) {
					warning("I001");
					comma.first = false;
				}
				warning("W014", left, right.value);
			}
		} else if (!left.comment && left.character !== right.from && state.option.white) {
			left.from += (left.character - left.from);
			warning("W011", left, left.value);
		}
	}

	function comma(opts) {
		opts = opts || {};

		if (!opts.peek) {
			nobreakcomma(state.tokens.curr, state.tokens.next);
			advance(",");
		} else {
			nobreakcomma(state.tokens.prev, state.tokens.curr);
		}

		// TODO: This is a temporary solution to fight against false-positives in
		// arrays and objects with trailing commas (see GH-363). The best solution
		// would be to extract all whitespace rules out of parser.

		if (state.tokens.next.value !== "]" && state.tokens.next.value !== "}") {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}

		if (state.tokens.next.identifier && !(opts.property && state.option.inES5())) {
			// Keywords that cannot follow a comma operator.
			switch (state.tokens.next.value) {
			case "break":
			case "case":
			case "catch":
			case "continue":
			case "default":
			case "do":
			case "else":
			case "finally":
			case "for":
			case "if":
			case "in":
			case "instanceof":
			case "return":
			case "switch":
			case "throw":
			case "try":
			case "var":
			case "let":
			case "while":
			case "with":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}

		if (state.tokens.next.type === "(punctuator)") {
			switch (state.tokens.next.value) {
			case "}":
			case "]":
			case ",":
				if (opts.allowTrailing) {
					return true;
				}

				/* falls through */
			case ")":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}
		return true;
	}

	// Functional constructors for making the symbols that will be inherited by
	// tokens.

	function symbol(s, p) {
		var x = state.syntax[s];
		if (!x || typeof x !== "object") {
			state.syntax[s] = x = {
				id: s,
				lbp: p,
				value: s
			};
		}
		return x;
	}

	function delim(s) {
		return symbol(s, 0);
	}

	function stmt(s, f) {
		var x = delim(s);
		x.identifier = x.reserved = true;
		x.fud = f;
		return x;
	}

	function blockstmt(s, f) {
		var x = stmt(s, f);
		x.block = true;
		return x;
	}

	function reserveName(x) {
		var c = x.id.charAt(0);
		if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
			x.identifier = x.reserved = true;
		}
		return x;
	}

	function prefix(s, f) {
		var x = symbol(s, 150);
		reserveName(x);
		x.nud = (typeof f === "function") ? f : function () {
			this.right = expression(150);
			this.arity = "unary";
			if (this.id === "++" || this.id === "--") {
				if (state.option.plusplus) {
					warning("W016", this, this.id);
				} else if ((!this.right.identifier || isReserved(this.right)) &&
						this.right.id !== "." && this.right.id !== "[") {
					warning("W017", this);
				}
			}
			return this;
		};
		return x;
	}

	function type(s, f) {
		var x = delim(s);
		x.type = s;
		x.nud = f;
		return x;
	}

	function reserve(name, func) {
		var x = type(name, func);
		x.identifier = true;
		x.reserved = true;
		return x;
	}

	function FutureReservedWord(name, meta) {
		var x = type(name, (meta && meta.nud) || function () {
			return this;
		});

		meta = meta || {};
		meta.isFutureReservedWord = true;

		x.value = name;
		x.identifier = true;
		x.reserved = true;
		x.meta = meta;

		return x;
	}

	function reservevar(s, v) {
		return reserve(s, function () {
			if (typeof v === "function") {
				v(this);
			}
			return this;
		});
	}

	function infix(s, f, p, w) {
		var x = symbol(s, p);
		reserveName(x);
		x.infix = true;
		x.led = function (left) {
			if (!w) {
				nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
			if (s === "in" && left.id === "!") {
				warning("W018", left, "!");
			}
			if (typeof f === "function") {
				return f(left, this);
			} else {
				this.left = left;
				this.right = expression(p);
				return this;
			}
		};
		return x;
	}


	function application(s) {
		var x = symbol(s, 42);

		x.led = function (left) {
			if (!state.option.inESNext()) {
				warning("W104", state.tokens.curr, "arrow function syntax (=>)");
			}

			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);

			this.left = left;
			this.right = doFunction(undefined, undefined, false, left);
			return this;
		};
		return x;
	}

	function relation(s, f) {
		var x = symbol(s, 100);

		x.led = function (left) {
			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			var right = expression(100);

			if (isIdentifier(left, "NaN") || isIdentifier(right, "NaN")) {
				warning("W019", this);
			} else if (f) {
				f.apply(this, [left, right]);
			}

			if (!left || !right) {
				quit("E041", state.tokens.curr.line);
			}

			if (left.id === "!") {
				warning("W018", left, "!");
			}

			if (right.id === "!") {
				warning("W018", right, "!");
			}

			this.left = left;
			this.right = right;
			return this;
		};
		return x;
	}

	function isPoorRelation(node) {
		return node &&
			  ((node.type === "(number)" && +node.value === 0) ||
			   (node.type === "(string)" && node.value === "") ||
			   (node.type === "null" && !state.option.eqnull) ||
				node.type === "true" ||
				node.type === "false" ||
				node.type === "undefined");
	}

	function assignop(s, f, p) {
		var x = infix(s, typeof f === "function" ? f : function (left, that) {
			that.left = left;

			if (left) {
				if (predefined[left.value] === false &&
						scope[left.value]["(global)"] === true) {
					warning("W020", left);
				} else if (left["function"]) {
					warning("W021", left, left.value);
				}

				if (funct[left.value] === "const") {
					error("E013", left, left.value);
				}

				if (left.id === ".") {
					if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}

					that.right = expression(10);
					return that;
				} else if (left.id === "[") {
					if (state.tokens.curr.left.first) {
						state.tokens.curr.left.first.forEach(function (t) {
							if (funct[t.value] === "const") {
								error("E013", t, t.value);
							}
						});
					} else if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}
					that.right = expression(10);
					return that;
				} else if (left.identifier && !isReserved(left)) {
					if (funct[left.value] === "exception") {
						warning("W022", left);
					}
					that.right = expression(10);
					return that;
				}

				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
			}

			error("E031", that);
		}, p);

		x.exps = true;
		x.assign = true;
		return x;
	}


	function bitwise(s, f, p) {
		var x = symbol(s, p);
		reserveName(x);
		x.led = (typeof f === "function") ? f : function (left) {
			if (state.option.bitwise) {
				warning("W016", this, this.id);
			}
			this.left = left;
			this.right = expression(p);
			return this;
		};
		return x;
	}


	function bitwiseassignop(s) {
		return assignop(s, function (left, that) {
			if (state.option.bitwise) {
				warning("W016", that, that.id);
			}
			nonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (left) {
				if (left.id === "." || left.id === "[" ||
						(left.identifier && !isReserved(left))) {
					expression(10);
					return that;
				}
				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
				return that;
			}
			error("E031", that);
		}, 20);
	}


	function suffix(s) {
		var x = symbol(s, 150);

		x.led = function (left) {
			if (state.option.plusplus) {
				warning("W016", this, this.id);
			} else if ((!left.identifier || isReserved(left)) && left.id !== "." && left.id !== "[") {
				warning("W017", this);
			}

			this.left = left;
			return this;
		};
		return x;
	}

	// fnparam means that this identifier is being defined as a function
	// argument (see identifier())
	// prop means that this identifier is that of an object property

	function optionalidentifier(fnparam, prop) {
		if (!state.tokens.next.identifier) {
			return;
		}

		advance();

		var curr = state.tokens.curr;
		var val  = state.tokens.curr.value;

		if (!isReserved(curr)) {
			return val;
		}

		if (prop) {
			if (state.option.inES5()) {
				return val;
			}
		}

		if (fnparam && val === "undefined") {
			return val;
		}

		// Display an info message about reserved words as properties
		// and ES5 but do it only once.
		if (prop && !api.getCache("displayed:I002")) {
			api.setCache("displayed:I002", true);
			warning("I002");
		}

		warning("W024", state.tokens.curr, state.tokens.curr.id);
		return val;
	}

	// fnparam means that this identifier is being defined as a function
	// argument
	// prop means that this identifier is that of an object property
	function identifier(fnparam, prop) {
		var i = optionalidentifier(fnparam, prop);
		if (i) {
			return i;
		}
		if (state.tokens.curr.id === "function" && state.tokens.next.id === "(") {
			warning("W025");
		} else {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
	}


	function reachable(s) {
		var i = 0, t;
		if (state.tokens.next.id !== ";" || noreach) {
			return;
		}
		for (;;) {
			t = peek(i);
			if (t.reach) {
				return;
			}
			if (t.id !== "(endline)") {
				if (t.id === "function") {
					if (!state.option.latedef) {
						break;
					}

					warning("W026", t);
					break;
				}

				warning("W027", t, t.value, s);
				break;
			}
			i += 1;
		}
	}


	function statement(noindent) {
		var values;
		var i = indent, r, s = scope, t = state.tokens.next;

		if (t.id === ";") {
			advance(";");
			return;
		}

		// Is this a labelled statement?
		var res = isReserved(t);

		// We're being more tolerant here: if someone uses
		// a FutureReservedWord as a label, we warn but proceed
		// anyway.

		if (res && t.meta && t.meta.isFutureReservedWord && peek().id === ":") {
			warning("W024", t, t.id);
			res = false;
		}

		// detect a destructuring assignment
		if (_.has(["[", "{"], t.value)) {
			if (lookupBlockType().isDestAssign) {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.curr, "destructuring expression");
				}
				values = destructuringExpression();
				values.forEach(function (tok) {
					isundef(funct, "W117", tok.token, tok.id);
				});
				advance("=");
				destructuringExpressionMatch(values, expression(10, true));
				advance(";");
				return;
			}
		}
		if (t.identifier && !res && peek().id === ":") {
			advance();
			advance(":");
			scope = Object.create(s);
			addlabel(t.value, "label");

			if (!state.tokens.next.labelled && state.tokens.next.value !== "{") {
				warning("W028", state.tokens.next, t.value, state.tokens.next.value);
			}

			state.tokens.next.label = t.value;
			t = state.tokens.next;
		}

		// Is it a lonely block?

		if (t.id === "{") {
			block(true, true);
			return;
		}

		// Parse the statement.

		if (!noindent) {
			indentation();
		}
		r = expression(0, true);

		// Look for the final semicolon.

		if (!t.block) {
			if (!state.option.expr && (!r || !r.exps)) {
				warning("W030", state.tokens.curr);
			} else if (state.option.nonew && r && r.left && r.id === "(" && r.left.id === "new") {
				warning("W031", t);
			}

			if (state.tokens.next.id !== ";") {
				if (!state.option.asi) {
					// If this is the last statement in a block that ends on
					// the same line *and* option lastsemic is on, ignore the warning.
					// Otherwise, complain about missing semicolon.
					if (!state.option.lastsemic || state.tokens.next.id !== "}" ||
						state.tokens.next.line !== state.tokens.curr.line) {
						warningAt("W033", state.tokens.curr.line, state.tokens.curr.character);
					}
				}
			} else {
				adjacent(state.tokens.curr, state.tokens.next);
				advance(";");
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
		}

		// Restore the indentation.

		indent = i;
		scope = s;
		return r;
	}


	function statements(startLine) {
		var a = [], p;

		while (!state.tokens.next.reach && state.tokens.next.id !== "(end)") {
			if (state.tokens.next.id === ";") {
				p = peek();

				if (!p || (p.id !== "(" && p.id !== "[")) {
					warning("W032");
				}

				advance(";");
			} else {
				a.push(statement(startLine === state.tokens.next.line));
			}
		}
		return a;
	}


	/*
	 * read all directives
	 * recognizes a simple form of asi, but always
	 * warns, if it is used
	 */
	function directives() {
		var i, p, pn;

		for (;;) {
			if (state.tokens.next.id === "(string)") {
				p = peek(0);
				if (p.id === "(endline)") {
					i = 1;
					do {
						pn = peek(i);
						i = i + 1;
					} while (pn.id === "(endline)");

					if (pn.id !== ";") {
						if (pn.id !== "(string)" && pn.id !== "(number)" &&
							pn.id !== "(regexp)" && pn.identifier !== true &&
							pn.id !== "}") {
							break;
						}
						warning("W033", state.tokens.next);
					} else {
						p = pn;
					}
				} else if (p.id === "}") {
					// Directive with no other statements, warn about missing semicolon
					warning("W033", p);
				} else if (p.id !== ";") {
					break;
				}

				indentation();
				advance();
				if (state.directive[state.tokens.curr.value]) {
					warning("W034", state.tokens.curr, state.tokens.curr.value);
				}

				if (state.tokens.curr.value === "use strict") {
					if (!state.option["(explicitNewcap)"])
						state.option.newcap = true;
					state.option.undef = true;
				}

				// there's no directive negation, so always set to true
				state.directive[state.tokens.curr.value] = true;

				if (p.id === ";") {
					advance(";");
				}
				continue;
			}
			break;
		}
	}


	/*
	 * Parses a single block. A block is a sequence of statements wrapped in
	 * braces.
	 *
	 * ordinary - true for everything but function bodies and try blocks.
	 * stmt		- true if block can be a single statement (e.g. in if/for/while).
	 * isfunc	- true if block is a function body
	 */
	function block(ordinary, stmt, isfunc, isfatarrow) {
		var a,
			b = inblock,
			old_indent = indent,
			m,
			s = scope,
			t,
			line,
			d;

		inblock = ordinary;

		if (!ordinary || !state.option.funcscope)
			scope = Object.create(scope);

		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;

		var metrics = funct["(metrics)"];
		metrics.nestedBlockDepth += 1;
		metrics.verifyMaxNestedBlockDepthPerFunction();

		if (state.tokens.next.id === "{") {
			advance("{");

			// create a new block scope
			funct["(blockscope)"].stack();

			line = state.tokens.curr.line;
			if (state.tokens.next.id !== "}") {
				indent += state.option.indent;
				while (!ordinary && state.tokens.next.from > indent) {
					indent += state.option.indent;
				}

				if (isfunc) {
					m = {};
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
					directives();

					if (state.option.strict && funct["(context)"]["(global)"]) {
						if (!m["use strict"] && !state.directive["use strict"]) {
							warning("E007");
						}
					}
				}

				a = statements(line);

				metrics.statementCount += a.length;

				if (isfunc) {
					state.directive = m;
				}

				indent -= state.option.indent;
				if (line !== state.tokens.next.line) {
					indentation();
				}
			} else if (line !== state.tokens.next.line) {
				indentation();
			}
			advance("}", t);

			funct["(blockscope)"].unstack();

			indent = old_indent;
		} else if (!ordinary) {
			if (isfunc) {
				m = {};
				if (stmt && !isfatarrow && !state.option.inMoz(true)) {
					error("W118", state.tokens.curr, "function closure expressions");
				}

				if (!stmt) {
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
				}
				expression(10);

				if (state.option.strict && funct["(context)"]["(global)"]) {
					if (!m["use strict"] && !state.directive["use strict"]) {
						warning("E007");
					}
				}
			} else {
				error("E021", state.tokens.next, "{", state.tokens.next.value);
			}
		} else {

			// check to avoid let declaration not within a block
			funct["(nolet)"] = true;

			if (!stmt || state.option.curly) {
				warning("W116", state.tokens.next, "{", state.tokens.next.value);
			}

			noreach = true;
			indent += state.option.indent;
			// test indentation only if statement is in new line
			a = [statement(state.tokens.next.line === state.tokens.curr.line)];
			indent -= state.option.indent;
			noreach = false;

			delete funct["(nolet)"];
		}
		funct["(verb)"] = null;
		if (!ordinary || !state.option.funcscope) scope = s;
		inblock = b;
		if (ordinary && state.option.noempty && (!a || a.length === 0)) {
			warning("W035");
		}
		metrics.nestedBlockDepth -= 1;
		return a;
	}


	function countMember(m) {
		if (membersOnly && typeof membersOnly[m] !== "boolean") {
			warning("W036", state.tokens.curr, m);
		}
		if (typeof member[m] === "number") {
			member[m] += 1;
		} else {
			member[m] = 1;
		}
	}


	function note_implied(tkn) {
		var name = tkn.value, line = tkn.line, a = implied[name];
		if (typeof a === "function") {
			a = false;
		}

		if (!a) {
			a = [line];
			implied[name] = a;
		} else if (a[a.length - 1] !== line) {
			a.push(line);
		}
	}


	// Build the syntax table by declaring the syntactic elements of the language.

	type("(number)", function () {
		return this;
	});

	type("(string)", function () {
		return this;
	});

	state.syntax["(identifier)"] = {
		type: "(identifier)",
		lbp: 0,
		identifier: true,
		nud: function () {
			var v = this.value,
				s = scope[v],
				f;

			if (typeof s === "function") {
				// Protection against accidental inheritance.
				s = undefined;
			} else if (typeof s === "boolean") {
				f = funct;
				funct = functions[0];
				addlabel(v, "var");
				s = funct;
				funct = f;
			}
			var block;
			if (_.has(funct, "(blockscope)")) {
				block = funct["(blockscope)"].getlabel(v);
			}

			// The name is in scope and defined in the current function.
			if (funct === s || block) {
				// Change 'unused' to 'var', and reject labels.
				// the name is in a block scope
				switch (block ? block[v]["(type)"] : funct[v]) {
				case "unused":
					if (block) block[v]["(type)"] = "var";
					else funct[v] = "var";
					break;
				case "unction":
					if (block) block[v]["(type)"] = "function";
					else funct[v] = "function";
					this["function"] = true;
					break;
				case "function":
					this["function"] = true;
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				}
			} else if (funct["(global)"]) {
				// The name is not defined in the function.  If we are in the global
				// scope, then we have an undefined variable.
				//
				// Operators typeof and delete do not raise runtime errors even if
				// the base object of a reference is null so no need to display warning
				// if we're inside of typeof or delete.

				if (typeof predefined[v] !== "boolean") {
					// Attempting to subscript a null reference will throw an
					// error, even within the typeof and delete operators
					if (!(anonname === "typeof" || anonname === "delete") ||
						(state.tokens.next && (state.tokens.next.value === "." ||
							state.tokens.next.value === "["))) {

						// if we're in a list comprehension, variables are declared
						// locally and used before being defined. So we check
						// the presence of the given variable in the comp array
						// before declaring it undefined.

						if (!funct["(comparray)"].check(v)) {
							isundef(funct, "W117", state.tokens.curr, v);
						}
					}
				}

				note_implied(state.tokens.curr);
			} else {
				// If the name is already defined in the current
				// function, but not as outer, then there is a scope error.

				switch (funct[v]) {
				case "closure":
				case "function":
				case "var":
				case "unused":
					warning("W038", state.tokens.curr, v);
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				case "outer":
				case "global":
					break;
				default:
					// If the name is defined in an outer function, make an outer entry,
					// and if it was unused, make it var.
					if (s === true) {
						funct[v] = true;
					} else if (s === null) {
						warning("W039", state.tokens.curr, v);
						note_implied(state.tokens.curr);
					} else if (typeof s !== "object") {
						// Operators typeof and delete do not raise runtime errors even
						// if the base object of a reference is null so no need to
						//
						// display warning if we're inside of typeof or delete.
						// Attempting to subscript a null reference will throw an
						// error, even within the typeof and delete operators
						if (!(anonname === "typeof" || anonname === "delete") ||
							(state.tokens.next &&
								(state.tokens.next.value === "." || state.tokens.next.value === "["))) {

							isundef(funct, "W117", state.tokens.curr, v);
						}
						funct[v] = true;
						note_implied(state.tokens.curr);
					} else {
						switch (s[v]) {
						case "function":
						case "unction":
							this["function"] = true;
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "var":
						case "unused":
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "closure":
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "label":
							warning("W037", state.tokens.curr, v);
						}
					}
				}
			}
			return this;
		},
		led: function () {
			error("E033", state.tokens.next, state.tokens.next.value);
		}
	};

	type("(regexp)", function () {
		return this;
	});

	// ECMAScript parser

	delim("(endline)");
	delim("(begin)");
	delim("(end)").reach = true;
	delim("(error)").reach = true;
	delim("}").reach = true;
	delim(")");
	delim("]");
	delim("\"").reach = true;
	delim("'").reach = true;
	delim(";");
	delim(":").reach = true;
	delim("#");

	reserve("else");
	reserve("case").reach = true;
	reserve("catch");
	reserve("default").reach = true;
	reserve("finally");
	reservevar("arguments", function (x) {
		if (state.directive["use strict"] && funct["(global)"]) {
			warning("E008", x);
		}
	});
	reservevar("eval");
	reservevar("false");
	reservevar("Infinity");
	reservevar("null");
	reservevar("this", function (x) {
		if (state.directive["use strict"] && !state.option.validthis && ((funct["(statement)"] &&
				funct["(name)"].charAt(0) > "Z") || funct["(global)"])) {
			warning("W040", x);
		}
	});
	reservevar("true");
	reservevar("undefined");

	assignop("=", "assign", 20);
	assignop("+=", "assignadd", 20);
	assignop("-=", "assignsub", 20);
	assignop("*=", "assignmult", 20);
	assignop("/=", "assigndiv", 20).nud = function () {
		error("E014");
	};
	assignop("%=", "assignmod", 20);

	bitwiseassignop("&=", "assignbitand", 20);
	bitwiseassignop("|=", "assignbitor", 20);
	bitwiseassignop("^=", "assignbitxor", 20);
	bitwiseassignop("<<=", "assignshiftleft", 20);
	bitwiseassignop(">>=", "assignshiftright", 20);
	bitwiseassignop(">>>=", "assignshiftrightunsigned", 20);
	infix(",", function (left, that) {
		var expr;
		that.exprs = [left];
		if (!comma({peek: true})) {
			return that;
		}
		while (true) {
			if (!(expr = expression(10)))  {
				break;
			}
			that.exprs.push(expr);
			if (state.tokens.next.value !== "," || !comma()) {
				break;
			}
		}
		return that;
	}, 10, true);

	infix("?", function (left, that) {
		increaseComplexityCount();
		that.left = left;
		that.right = expression(10);
		advance(":");
		that["else"] = expression(10);
		return that;
	}, 30);

	var orPrecendence = 40;
	infix("||", function (left, that) {
		increaseComplexityCount();
		that.left = left;
		that.right = expression(orPrecendence);
		return that;
	}, orPrecendence);
	infix("&&", "and", 50);
	bitwise("|", "bitor", 70);
	bitwise("^", "bitxor", 80);
	bitwise("&", "bitand", 90);
	relation("==", function (left, right) {
		var eqnull = state.option.eqnull && (left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq)
			warning("W116", this, "===", "==");
		else if (isPoorRelation(left))
			warning("W041", this, "===", left.value);
		else if (isPoorRelation(right))
			warning("W041", this, "===", right.value);

		return this;
	});
	relation("===");
	relation("!=", function (left, right) {
		var eqnull = state.option.eqnull &&
				(left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq) {
			warning("W116", this, "!==", "!=");
		} else if (isPoorRelation(left)) {
			warning("W041", this, "!==", left.value);
		} else if (isPoorRelation(right)) {
			warning("W041", this, "!==", right.value);
		}
		return this;
	});
	relation("!==");
	relation("<");
	relation(">");
	relation("<=");
	relation(">=");
	bitwise("<<", "shiftleft", 120);
	bitwise(">>", "shiftright", 120);
	bitwise(">>>", "shiftrightunsigned", 120);
	infix("in", "in", 120);
	infix("instanceof", "instanceof", 120);
	infix("+", function (left, that) {
		var right = expression(130);
		if (left && right && left.id === "(string)" && right.id === "(string)") {
			left.value += right.value;
			left.character = right.character;
			if (!state.option.scripturl && reg.javascriptURL.test(left.value)) {
				warning("W050", left);
			}
			return left;
		}
		that.left = left;
		that.right = right;
		return that;
	}, 130);
	prefix("+", "num");
	prefix("+++", function () {
		warning("W007");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("+++", function (left) {
		warning("W007");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("-", "sub", 130);
	prefix("-", "neg");
	prefix("---", function () {
		warning("W006");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("---", function (left) {
		warning("W006");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("*", "mult", 140);
	infix("/", "div", 140);
	infix("%", "mod", 140);

	suffix("++", "postinc");
	prefix("++", "preinc");
	state.syntax["++"].exps = true;

	suffix("--", "postdec");
	prefix("--", "predec");
	state.syntax["--"].exps = true;
	prefix("delete", function () {
		var p = expression(10);
		if (!p || (p.id !== "." && p.id !== "[")) {
			warning("W051");
		}
		this.first = p;
		return this;
	}).exps = true;

	prefix("~", function () {
		if (state.option.bitwise) {
			warning("W052", this, "~");
		}
		expression(150);
		return this;
	});

	prefix("...", function () {
		if (!state.option.inESNext()) {
			warning("W104", this, "spread/rest operator");
		}
		if (!state.tokens.next.identifier) {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
		expression(150);
		return this;
	});

	prefix("!", function () {
		this.right = expression(150);
		this.arity = "unary";

		if (!this.right) { // '!' followed by nothing? Give up.
			quit("E041", this.line || 0);
		}

		if (bang[this.right.id] === true) {
			warning("W018", this, "!");
		}
		return this;
	});

	prefix("typeof", "typeof");
	prefix("new", function () {
		var c = expression(155), i;
		if (c && c.id !== "function") {
			if (c.identifier) {
				c["new"] = true;
				switch (c.value) {
				case "Number":
				case "String":
				case "Boolean":
				case "Math":
				case "JSON":
					warning("W053", state.tokens.prev, c.value);
					break;
				case "Function":
					if (!state.option.evil) {
						warning("W054");
					}
					break;
				case "Date":
				case "RegExp":
					break;
				default:
					if (c.id !== "function") {
						i = c.value.substr(0, 1);
						if (state.option.newcap && (i < "A" || i > "Z") && !_.has(global, c.value)) {
							warning("W055", state.tokens.curr);
						}
					}
				}
			} else {
				if (c.id !== "." && c.id !== "[" && c.id !== "(") {
					warning("W056", state.tokens.curr);
				}
			}
		} else {
			if (!state.option.supernew)
				warning("W057", this);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		if (state.tokens.next.id !== "(" && !state.option.supernew) {
			warning("W058", state.tokens.curr, state.tokens.curr.value);
		}
		this.first = c;
		return this;
	});
	state.syntax["new"].exps = true;

	prefix("void").exps = true;

	infix(".", function (left, that) {
		adjacent(state.tokens.prev, state.tokens.curr);
		nobreak();
		var m = identifier(false, true);

		if (typeof m === "string") {
			countMember(m);
		}

		that.left = left;
		that.right = m;

		if (m && m === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		if (left && left.value === "arguments" && (m === "callee" || m === "caller")) {
			if (state.option.noarg)
				warning("W059", left, m);
			else if (state.directive["use strict"])
				error("E008");
		} else if (!state.option.evil && left && left.value === "document" &&
				(m === "write" || m === "writeln")) {
			warning("W060", left);
		}

		if (!state.option.evil && (m === "eval" || m === "execScript")) {
			warning("W061");
		}

		return that;
	}, 160, true);

	infix("(", function (left, that) {
		if (state.tokens.prev.id !== "}" && state.tokens.prev.id !== ")") {
			nobreak(state.tokens.prev, state.tokens.curr);
		}

		nospace();
		if (state.option.immed && left && !left.immed && left.id === "function") {
			warning("W062");
		}

		var n = 0;
		var p = [];

		if (left) {
			if (left.type === "(identifier)") {
				if (left.value.match(/^[A-Z]([A-Z0-9_$]*[a-z][A-Za-z0-9_$]*)?$/)) {
					if ("Number String Boolean Date Object".indexOf(left.value) === -1) {
						if (left.value === "Math") {
							warning("W063", left);
						} else if (state.option.newcap) {
							warning("W064", left);
						}
					}
				}
			}
		}

		if (state.tokens.next.id !== ")") {
			for (;;) {
				p[p.length] = expression(10);
				n += 1;
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")");
		nospace(state.tokens.prev, state.tokens.curr);

		if (typeof left === "object") {
			if (left.value === "parseInt" && n === 1) {
				warning("W065", state.tokens.curr);
			}
			if (!state.option.evil) {
				if (left.value === "eval" || left.value === "Function" ||
						left.value === "execScript") {
					warning("W061", left);

					if (p[0] && [0].id === "(string)") {
						addInternalSrc(left, p[0].value);
					}
				} else if (p[0] && p[0].id === "(string)" &&
					   (left.value === "setTimeout" ||
						left.value === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);

				// window.setTimeout/setInterval
				} else if (p[0] && p[0].id === "(string)" &&
					   left.value === "." &&
					   left.left.value === "window" &&
					   (left.right === "setTimeout" ||
						left.right === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);
				}
			}
			if (!left.identifier && left.id !== "." && left.id !== "[" &&
					left.id !== "(" && left.id !== "&&" && left.id !== "||" &&
					left.id !== "?") {
				warning("W067", left);
			}
		}

		that.left = left;
		return that;
	}, 155, true).exps = true;

	prefix("(", function () {
		nospace();
		var bracket, brackets = [];
		var pn, pn1, i = 0;
		var ret;

		do {
			pn = peek(i);
			i += 1;
			pn1 = peek(i);
			i += 1;
		} while (pn.value !== ")" && pn1.value !== "=>" && pn1.value !== ";" && pn1.type !== "(end)");

		if (state.tokens.next.id === "function") {
			state.tokens.next.immed = true;
		}

		var exprs = [];

		if (state.tokens.next.id !== ")") {
			for (;;) {
				if (pn1.value === "=>" && state.tokens.next.value === "{") {
					bracket = state.tokens.next;
					bracket.left = destructuringExpression();
					brackets.push(bracket);
					for (var t in bracket.left) {
						exprs.push(bracket.left[t].token);
					}
				} else {
					exprs.push(expression(10));
				}
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")", this);
		nospace(state.tokens.prev, state.tokens.curr);
		if (state.option.immed && exprs[0] && exprs[0].id === "function") {
			if (state.tokens.next.id !== "(" &&
			  (state.tokens.next.id !== "." || (peek().value !== "call" && peek().value !== "apply"))) {
				warning("W068", this);
			}
		}

		if (state.tokens.next.value === "=>") {
			return exprs;
		}
		if (!exprs.length) {
			return;
		}
		if (exprs.length > 1) {
			ret = Object.create(state.syntax[","]);
			ret.exprs = exprs;
		} else {
			ret = exprs[0];
		}
		if (ret) {
			ret.paren = true;
		}
		return ret;
	});

	application("=>");

	infix("[", function (left, that) {
		nobreak(state.tokens.prev, state.tokens.curr);
		nospace();
		var e = expression(10), s;
		if (e && e.type === "(string)") {
			if (!state.option.evil && (e.value === "eval" || e.value === "execScript")) {
				warning("W061", that);
			}

			countMember(e.value);
			if (!state.option.sub && reg.identifier.test(e.value)) {
				s = state.syntax[e.value];
				if (!s || !isReserved(s)) {
					warning("W069", state.tokens.prev, e.value);
				}
			}
		}
		advance("]", that);

		if (e && e.value === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		nospace(state.tokens.prev, state.tokens.curr);
		that.left = left;
		that.right = e;
		return that;
	}, 160, true);

	function comprehensiveArrayExpression() {
		var res = {};
		res.exps = true;
		funct["(comparray)"].stack();

		res.right = expression(10);
		advance("for");
		if (state.tokens.next.value === "each") {
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}
		advance("(");
		funct["(comparray)"].setState("define");
		res.left = expression(10);
		advance(")");
		if (state.tokens.next.value === "if") {
			advance("if");
			advance("(");
			funct["(comparray)"].setState("filter");
			res.filter = expression(10);
			advance(")");
		}
		advance("]");
		funct["(comparray)"].unstack();
		return res;
	}

	prefix("[", function () {
		var blocktype = lookupBlockType(true);
		if (blocktype.isCompArray) {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "array comprehension");
			}
			return comprehensiveArrayExpression();
		} else if (blocktype.isDestAssign && !state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring assignment");
		}
		var b = state.tokens.curr.line !== state.tokens.next.line;
		this.first = [];
		if (b) {
			indent += state.option.indent;
			if (state.tokens.next.from === indent + state.option.indent) {
				indent += state.option.indent;
			}
		}
		while (state.tokens.next.id !== "(end)") {
			while (state.tokens.next.id === ",") {
				if (!state.option.inES5())
					warning("W070");
				advance(",");
			}
			if (state.tokens.next.id === "]") {
				break;
			}
			if (b && state.tokens.curr.line !== state.tokens.next.line) {
				indentation();
			}
			this.first.push(expression(10));
			if (state.tokens.next.id === ",") {
				comma({ allowTrailing: true });
				if (state.tokens.next.id === "]" && !state.option.inES5(true)) {
					warning("W070", state.tokens.curr);
					break;
				}
			} else {
				break;
			}
		}
		if (b) {
			indent -= state.option.indent;
			indentation();
		}
		advance("]", this);
		return this;
	}, 160);


	function property_name() {
		var id = optionalidentifier(false, true);

		if (!id) {
			if (state.tokens.next.id === "(string)") {
				id = state.tokens.next.value;
				advance();
			} else if (state.tokens.next.id === "(number)") {
				id = state.tokens.next.value.toString();
				advance();
			}
		}

		if (id === "hasOwnProperty") {
			warning("W001");
		}

		return id;
	}


	function functionparams(parsed) {
		var curr, next;
		var params = [];
		var ident;
		var tokens = [];
		var t;
		var pastDefault = false;

		if (parsed) {
			if (parsed instanceof Array) {
				for (var i in parsed) {
					curr = parsed[i];
					if (_.contains(["{", "["], curr.id)) {
						for (t in curr.left) {
							t = tokens[t];
							if (t.id) {
								params.push(t.id);
								addlabel(t.id, "unused", t.token);
							}
						}
					} else if (curr.value === "...") {
						if (!state.option.inESNext()) {
							warning("W104", curr, "spread/rest operator");
						}
						continue;
					} else {
						addlabel(curr.value, "unused", curr);
					}
				}
				return params;
			} else {
				if (parsed.identifier === true) {
					addlabel(parsed.value, "unused", parsed);
					return [parsed];
				}
			}
		}

		next = state.tokens.next;

		advance("(");
		nospace();

		if (state.tokens.next.id === ")") {
			advance(")");
			return;
		}

		for (;;) {
			if (_.contains(["{", "["], state.tokens.next.id)) {
				tokens = destructuringExpression();
				for (t in tokens) {
					t = tokens[t];
					if (t.id) {
						params.push(t.id);
						addlabel(t.id, "unused", t.token);
					}
				}
			} else if (state.tokens.next.value === "...") {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.next, "spread/rest operator");
				}
				advance("...");
				nospace();
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			} else {
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			}

			// it is a syntax error to have a regular argument after a default argument
			if (pastDefault) {
				if (state.tokens.next.id !== "=") {
					error("E051", state.tokens.current);
				}
			}
			if (state.tokens.next.id === "=") {
				if (!state.option.inESNext()) {
					warning("W119", state.tokens.next, "default parameters");
				}
				advance("=");
				pastDefault = true;
				expression(10);
			}
			if (state.tokens.next.id === ",") {
				comma();
			} else {
				advance(")", next);
				nospace(state.tokens.prev, state.tokens.curr);
				return params;
			}
		}
	}


	function doFunction(name, statement, generator, fatarrowparams) {
		var f;
		var oldOption = state.option;
		var oldIgnored = state.ignored;
		var oldScope  = scope;

		state.option = Object.create(state.option);
		state.ignored = Object.create(state.ignored);
		scope  = Object.create(scope);

		funct = {
			"(name)"      : name || "\"" + anonname + "\"",
			"(line)"      : state.tokens.next.line,
			"(character)" : state.tokens.next.character,
			"(context)"   : funct,
			"(breakage)"  : 0,
			"(loopage)"   : 0,
			"(metrics)"   : createMetrics(state.tokens.next),
			"(scope)"     : scope,
			"(statement)" : statement,
			"(tokens)"    : {},
			"(blockscope)": funct["(blockscope)"],
			"(comparray)" : funct["(comparray)"]
		};

		if (generator) {
			funct["(generator)"] = true;
		}

		f = funct;
		state.tokens.curr.funct = funct;

		functions.push(funct);

		if (name) {
			addlabel(name, "function");
		}

		funct["(params)"] = functionparams(fatarrowparams);

		funct["(metrics)"].verifyMaxParametersPerFunction(funct["(params)"]);

		block(false, true, true, fatarrowparams ? true:false);

		if (generator && funct["(generator)"] !== "yielded") {
			error("E047", state.tokens.curr);
		}

		funct["(metrics)"].verifyMaxStatementsPerFunction();
		funct["(metrics)"].verifyMaxComplexityPerFunction();
		funct["(unusedOption)"] = state.option.unused;

		scope = oldScope;
		state.option = oldOption;
		state.ignored = oldIgnored;
		funct["(last)"] = state.tokens.curr.line;
		funct["(lastcharacter)"] = state.tokens.curr.character;
		funct = funct["(context)"];

		return f;
	}

	function createMetrics(functionStartToken) {
		return {
			statementCount: 0,
			nestedBlockDepth: -1,
			ComplexityCount: 1,
			verifyMaxStatementsPerFunction: function () {
				if (state.option.maxstatements &&
					this.statementCount > state.option.maxstatements) {
					warning("W071", functionStartToken, this.statementCount);
				}
			},

			verifyMaxParametersPerFunction: function (params) {
				params = params || [];

				if (state.option.maxparams && params.length > state.option.maxparams) {
					warning("W072", functionStartToken, params.length);
				}
			},

			verifyMaxNestedBlockDepthPerFunction: function () {
				if (state.option.maxdepth &&
					this.nestedBlockDepth > 0 &&
					this.nestedBlockDepth === state.option.maxdepth + 1) {
					warning("W073", null, this.nestedBlockDepth);
				}
			},

			verifyMaxComplexityPerFunction: function () {
				var max = state.option.maxcomplexity;
				var cc = this.ComplexityCount;
				if (max && cc > max) {
					warning("W074", functionStartToken, cc);
				}
			}
		};
	}

	function increaseComplexityCount() {
		funct["(metrics)"].ComplexityCount += 1;
	}

	// Parse assignments that were found instead of conditionals.
	// For example: if (a = 1) { ... }

	function checkCondAssignment(expr) {
		var id, paren;
		if (expr) {
			id = expr.id;
			paren = expr.paren;
			if (id === "," && (expr = expr.exprs[expr.exprs.length - 1])) {
				id = expr.id;
				paren = paren || expr.paren;
			}
		}
		switch (id) {
		case "=":
		case "+=":
		case "-=":
		case "*=":
		case "%=":
		case "&=":
		case "|=":
		case "^=":
		case "/=":
			if (!paren && !state.option.boss) {
				warning("W084");
			}
		}
	}


	(function (x) {
		x.nud = function (isclassdef) {
			var b, f, i, p, t, g;
			var props = {}; // All properties, including accessors
			var tag = "";

			function saveProperty(name, tkn) {
				if (props[name] && _.has(props, name))
					warning("W075", state.tokens.next, i);
				else
					props[name] = {};

				props[name].basic = true;
				props[name].basictkn = tkn;
			}

			function saveSetter(name, tkn) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].setter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].setter = true;
				props[name].setterToken = tkn;
			}

			function saveGetter(name) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].getter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].getter = true;
				props[name].getterToken = state.tokens.curr;
			}

			b = state.tokens.curr.line !== state.tokens.next.line;
			if (b) {
				indent += state.option.indent;
				if (state.tokens.next.from === indent + state.option.indent) {
					indent += state.option.indent;
				}
			}

			for (;;) {
				if (state.tokens.next.id === "}") {
					break;
				}

				if (b) {
					indentation();
				}

				if (isclassdef && state.tokens.next.value === "static") {
					advance("static");
					tag = "static ";
				}

				if (state.tokens.next.value === "get" && peek().id !== ":") {
					advance("get");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class getter method", i);
					}

					saveGetter(tag + i);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (p) {
						warning("W076", t, p[0], i);
					}

					adjacent(state.tokens.curr, state.tokens.next);
				} else if (state.tokens.next.value === "set" && peek().id !== ":") {
					advance("set");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class setter method", i);
					}

					saveSetter(tag + i, state.tokens.next);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (!p || p.length !== 1) {
						warning("W077", t, i);
					}
				} else {
					g = false;
					if (state.tokens.next.value === "*" && state.tokens.next.type === "(punctuator)") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.next, "generator functions");
						}
						advance("*");
						g = true;
					}
					i = property_name();
					saveProperty(tag + i, state.tokens.next);

					if (typeof i !== "string") {
						break;
					}

					if (state.tokens.next.value === "(") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.curr, "concise methods");
						}
						doFunction(i, undefined, g);
					} else if (!isclassdef) {
						advance(":");
						nonadjacent(state.tokens.curr, state.tokens.next);
						expression(10);
					}
				}
				// It is a Syntax Error if PropName of MethodDefinition is "prototype".
				if (isclassdef && i === "prototype") {
					error("E049", state.tokens.next, "class method", i);
				}

				countMember(i);
				if (isclassdef) {
					tag = "";
					continue;
				}
				if (state.tokens.next.id === ",") {
					comma({ allowTrailing: true, property: true });
					if (state.tokens.next.id === ",") {
						warning("W070", state.tokens.curr);
					} else if (state.tokens.next.id === "}" && !state.option.inES5(true)) {
						warning("W070", state.tokens.curr);
					}
				} else {
					break;
				}
			}
			if (b) {
				indent -= state.option.indent;
				indentation();
			}
			advance("}", this);

			// Check for lonely setters if in the ES5 mode.
			if (state.option.inES5()) {
				for (var name in props) {
					if (_.has(props, name) && props[name].setter && !props[name].getter) {
						warning("W078", props[name].setterToken);
					}
				}
			}
			return this;
		};
		x.fud = function () {
			error("E036", state.tokens.curr);
		};
	}(delim("{")));

	function destructuringExpression() {
		var id, ids;
		var identifiers = [];
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring expression");
		}
		var nextInnerDE = function () {
			var ident;
			if (_.contains(["[", "{"], state.tokens.next.value)) {
				ids = destructuringExpression();
				for (var id in ids) {
					id = ids[id];
					identifiers.push({ id: id.id, token: id.token });
				}
			} else if (state.tokens.next.value === ",") {
				identifiers.push({ id: null, token: state.tokens.curr });
			} else {
				ident = identifier();
				if (ident)
					identifiers.push({ id: ident, token: state.tokens.curr });
			}
		};
		if (state.tokens.next.value === "[") {
			advance("[");
			nextInnerDE();
			while (state.tokens.next.value !== "]") {
				advance(",");
				nextInnerDE();
			}
			advance("]");
		} else if (state.tokens.next.value === "{") {
			advance("{");
			id = identifier();
			if (state.tokens.next.value === ":") {
				advance(":");
				nextInnerDE();
			} else {
				identifiers.push({ id: id, token: state.tokens.curr });
			}
			while (state.tokens.next.value !== "}") {
				advance(",");
				id = identifier();
				if (state.tokens.next.value === ":") {
					advance(":");
					nextInnerDE();
				} else {
					identifiers.push({ id: id, token: state.tokens.curr });
				}
			}
			advance("}");
		}
		return identifiers;
	}
	function destructuringExpressionMatch(tokens, value) {
		if (value.first) {
			_.zip(tokens, value.first).forEach(function (val) {
				var token = val[0];
				var value = val[1];
				if (token && value) {
					token.first = value;
				} else if (token && token.first && !value) {
					warning("W080", token.first, token.first.value);
				} /* else {
					XXX value is discarded: wouldn't it need a warning ?
				} */
			});
		}
	}

	var conststatement = stmt("const", function (prefix) {
		var tokens, value;
		// state variable to know if it is a lone identifier, or a destructuring statement.
		var lone;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "const");
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "const");
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id !== "=") {
				warning("E012", state.tokens.curr, state.tokens.curr.value);
			}

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	conststatement.exps = true;
	var varstatement = stmt("var", function (prefix) {
		// JavaScript does not have block scope. It only has function scope. So,
		// declaring a variable in a block can have unexpected consequences.
		var tokens, lone, value;

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "unused", t.token);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	varstatement.exps = true;
	var letstatement = stmt("let", function (prefix) {
		var tokens, lone, value, letblock;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "let");
		}

		if (state.tokens.next.value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let block");
			}
			advance("(");
			funct["(blockscope)"].stack();
			letblock = true;
		} else if (funct["(nolet)"]) {
			error("E048", state.tokens.curr);
		}

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr.value } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id && !funct["(nolet)"]) {
					addlabel(t.id, "unused", t.token, true);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					warning("W120", state.tokens.next, state.tokens.next.value);
				}
				value = expression(10);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		if (letblock) {
			advance(")");
			block(true, true);
			this.block = true;
			funct["(blockscope)"].unstack();
		}

		return this;
	});
	letstatement.exps = true;

	blockstmt("class", function () {
		return classdef.call(this, true);
	});

	function classdef(stmt) {
		/*jshint validthis:true */
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "class");
		}
		if (stmt) {
			// BindingIdentifier
			this.name = identifier();
			addlabel(this.name, "unused", state.tokens.curr);
		} else if (state.tokens.next.identifier && state.tokens.next.value !== "extends") {
			// BindingIdentifier(opt)
			this.name = identifier();
		}
		classtail(this);
		return this;
	}

	function classtail(c) {
		var strictness = state.directive["use strict"];

		// ClassHeritage(opt)
		if (state.tokens.next.value === "extends") {
			advance("extends");
			c.heritage = expression(10);
		}

		// A ClassBody is always strict code.
		state.directive["use strict"] = true;
		advance("{");
		// ClassBody(opt)
		c.body = state.syntax["{"].nud(true);
		state.directive["use strict"] = strictness;
	}

	blockstmt("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			advance("*");
			if (state.option.inESNext(true)) {
				generator = true;
			} else {
				warning("W119", state.tokens.curr, "function*");
			}
		}
		if (inblock) {
			warning("W082", state.tokens.curr);

		}
		var i = identifier();
		if (funct[i] === "const") {
			warning("E011", null, i);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		addlabel(i, "unction", state.tokens.curr);

		doFunction(i, { statement: true }, generator);
		if (state.tokens.next.id === "(" && state.tokens.next.line === state.tokens.curr.line) {
			error("E039");
		}
		return this;
	});

	prefix("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			if (!state.option.inESNext()) {
				warning("W119", state.tokens.curr, "function*");
			}
			advance("*");
			generator = true;
		}
		var i = optionalidentifier();
		if (i || state.option.gcl) {
			adjacent(state.tokens.curr, state.tokens.next);
		} else {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}
		doFunction(i, undefined, generator);
		if (!state.option.loopfunc && funct["(loopage)"]) {
			warning("W083");
		}
		return this;
	});

	blockstmt("if", function () {
		var t = state.tokens.next;
		increaseComplexityCount();
		state.condition = true;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		state.condition = false;
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		if (state.tokens.next.id === "else") {
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("else");
			if (state.tokens.next.id === "if" || state.tokens.next.id === "switch") {
				statement(true);
			} else {
				block(true, true);
			}
		}
		return this;
	});

	blockstmt("try", function () {
		var b;

		function doCatch() {
			var oldScope = scope;
			var e;

			advance("catch");
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("(");

			scope = Object.create(oldScope);

			e = state.tokens.next.value;
			if (state.tokens.next.type !== "(identifier)") {
				e = null;
				warning("E030", state.tokens.next, e);
			}

			advance();

			funct = {
				"(name)"     : "(catch)",
				"(line)"     : state.tokens.next.line,
				"(character)": state.tokens.next.character,
				"(context)"  : funct,
				"(breakage)" : funct["(breakage)"],
				"(loopage)"  : funct["(loopage)"],
				"(scope)"    : scope,
				"(statement)": false,
				"(metrics)"  : createMetrics(state.tokens.next),
				"(catch)"    : true,
				"(tokens)"   : {},
				"(blockscope)": funct["(blockscope)"],
				"(comparray)": funct["(comparray)"]
			};

			if (e) {
				addlabel(e, "exception");
			}

			if (state.tokens.next.value === "if") {
				if (!state.option.inMoz(true)) {
					warning("W118", state.tokens.curr, "catch filter");
				}
				advance("if");
				expression(0);
			}

			advance(")");

			state.tokens.curr.funct = funct;
			functions.push(funct);

			block(false);

			scope = oldScope;

			funct["(last)"] = state.tokens.curr.line;
			funct["(lastcharacter)"] = state.tokens.curr.character;
			funct = funct["(context)"];
		}

		block(false);

		while (state.tokens.next.id === "catch") {
			increaseComplexityCount();
			if (b && (!state.option.inMoz(true))) {
				warning("W118", state.tokens.next, "multiple catch blocks");
			}
			doCatch();
			b = true;
		}

		if (state.tokens.next.id === "finally") {
			advance("finally");
			block(false);
			return;
		}

		if (!b) {
			error("E021", state.tokens.next, "catch", state.tokens.next.value);
		}

		return this;
	});

	blockstmt("while", function () {
		var t = state.tokens.next;
		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		funct["(breakage)"] -= 1;
		funct["(loopage)"] -= 1;
		return this;
	}).labelled = true;

	blockstmt("with", function () {
		var t = state.tokens.next;
		if (state.directive["use strict"]) {
			error("E010", state.tokens.curr);
		} else if (!state.option.withstmt) {
			warning("W085", state.tokens.curr);
		}

		advance("(");
		nonadjacent(this, t);
		nospace();
		expression(0);
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);

		return this;
	});

	blockstmt("switch", function () {
		var t = state.tokens.next,
			g = false;
		funct["(breakage)"] += 1;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;
		advance("{");
		nonadjacent(state.tokens.curr, state.tokens.next);
		indent += state.option.indent;
		this.cases = [];

		for (;;) {
			switch (state.tokens.next.id) {
			case "case":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "case":
				case "continue":
				case "return":
				case "switch":
				case "throw":
					break;
				default:
					// You can tell JSHint that you don't use break intentionally by
					// adding a comment /* falls through */ on a line just before
					// the next `case`.
					if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
						warning("W086", state.tokens.curr, "case");
					}
				}
				indentation(-state.option.indent);
				advance("case");
				this.cases.push(expression(20));
				increaseComplexityCount();
				g = true;
				advance(":");
				funct["(verb)"] = "case";
				break;
			case "default":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "continue":
				case "return":
				case "throw":
					break;
				default:
					// Do not display a warning if 'default' is the first statement or if
					// there is a special /* falls through */ comment.
					if (this.cases.length) {
						if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
							warning("W086", state.tokens.curr, "default");
						}
					}
				}
				indentation(-state.option.indent);
				advance("default");
				g = true;
				advance(":");
				break;
			case "}":
				indent -= state.option.indent;
				indentation();
				advance("}", t);
				funct["(breakage)"] -= 1;
				funct["(verb)"] = undefined;
				return;
			case "(end)":
				error("E023", state.tokens.next, "}");
				return;
			default:
				if (g) {
					switch (state.tokens.curr.id) {
					case ",":
						error("E040");
						return;
					case ":":
						g = false;
						statements();
						break;
					default:
						error("E025", state.tokens.curr);
						return;
					}
				} else {
					if (state.tokens.curr.id === ":") {
						advance(":");
						error("E024", state.tokens.curr, ":");
						statements();
					} else {
						error("E021", state.tokens.next, "case", state.tokens.next.value);
						return;
					}
				}
			}
		}
	}).labelled = true;

	stmt("debugger", function () {
		if (!state.option.debug) {
			warning("W087");
		}
		return this;
	}).exps = true;

	(function () {
		var x = stmt("do", function () {
			funct["(breakage)"] += 1;
			funct["(loopage)"] += 1;
			increaseComplexityCount();

			this.first = block(true, true);
			advance("while");
			var t = state.tokens.next;
			nonadjacent(state.tokens.curr, t);
			advance("(");
			nospace();
			checkCondAssignment(expression(0));
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
			return this;
		});
		x.labelled = true;
		x.exps = true;
	}());

	blockstmt("for", function () {
		var s, t = state.tokens.next;
		var letscope = false;
		var foreachtok = null;

		if (t.value === "each") {
			foreachtok = t;
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}

		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();

		// what kind of for(…) statement it is? for(…of…)? for(…in…)? for(…;…;…)?
		var nextop; // contains the token of the "in" or "of" operator
		var i = 0;
		var inof = ["in", "of"];
		do {
			nextop = peek(i);
			++i;
		} while (!_.contains(inof, nextop.value) && nextop.value !== ";" &&
					nextop.type !== "(end)");

		// if we're in a for (… in|of …) statement
		if (_.contains(inof, nextop.value)) {
			if (!state.option.inESNext() && nextop.value === "of") {
				error("W104", nextop, "for of");
			}
			if (state.tokens.next.id === "var") {
				advance("var");
				state.syntax["var"].fud.call(state.syntax["var"].fud, true);
			} else if (state.tokens.next.id === "let") {
				advance("let");
				// create a new block scope
				letscope = true;
				funct["(blockscope)"].stack();
				state.syntax["let"].fud.call(state.syntax["let"].fud, true);
			} else {
				switch (funct[state.tokens.next.value]) {
				case "unused":
					funct[state.tokens.next.value] = "var";
					break;
				case "var":
					break;
				default:
					if (!funct["(blockscope)"].getlabel(state.tokens.next.value))
						warning("W088", state.tokens.next, state.tokens.next.value);
				}
				advance();
			}
			advance(nextop.value);
			expression(20);
			advance(")", t);
			s = block(true, true);
			if (state.option.forin && s && (s.length > 1 || typeof s[0] !== "object" ||
					s[0].value !== "if")) {
				warning("W089", this);
			}
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
		} else {
			if (foreachtok) {
				error("E045", foreachtok);
			}
			if (state.tokens.next.id !== ";") {
				if (state.tokens.next.id === "var") {
					advance("var");
					state.syntax["var"].fud.call(state.syntax["var"].fud);
				} else if (state.tokens.next.id === "let") {
					advance("let");
					// create a new block scope
					letscope = true;
					funct["(blockscope)"].stack();
					state.syntax["let"].fud.call(state.syntax["let"].fud);
				} else {
					for (;;) {
						expression(0, "for");
						if (state.tokens.next.id !== ",") {
							break;
						}
						comma();
					}
				}
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id !== ";") {
				checkCondAssignment(expression(0));
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id === ";") {
				error("E021", state.tokens.next, ")", ";");
			}
			if (state.tokens.next.id !== ")") {
				for (;;) {
					expression(0, "for");
					if (state.tokens.next.id !== ",") {
						break;
					}
					comma();
				}
			}
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			block(true, true);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;

		}
		// unstack loop blockscope
		if (letscope) {
			funct["(blockscope)"].unstack();
		}
		return this;
	}).labelled = true;


	stmt("break", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		}
		reachable("break");
		return this;
	}).exps = true;


	stmt("continue", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		} else if (!funct["(loopage)"]) {
			warning("W052", state.tokens.next, this.value);
		}
		reachable("continue");
		return this;
	}).exps = true;


	stmt("return", function () {
		if (this.line === state.tokens.next.line) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
				nonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(0);

				if (this.first &&
						this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}
		} else {
			if (state.tokens.next.type === "(punctuator)" &&
				["[", "{", "+", "-"].indexOf(state.tokens.next.value) > -1) {
				nolinebreak(this); // always warn (Line breaking error)
			}
		}
		reachable("return");
		return this;
	}).exps = true;

	(function (x) {
		x.exps = true;
		x.lbp = 25;
	}(prefix("yield", function () {
		var prev = state.tokens.prev;
		if (state.option.inESNext(true) && !funct["(generator)"]) {
			error("E046", state.tokens.curr, "yield");
		} else if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "yield");
		}
		funct["(generator)"] = "yielded";
		if (this.line === state.tokens.next.line || !state.option.inMoz(true)) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach && state.tokens.next.nud) {
				nobreaknonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(10);

				if (this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}

			if (state.option.inMoz(true) && state.tokens.next.id !== ")" &&
					(prev.lbp > 30 || (!prev.assign && !isEndOfExpr()) || prev.id === "yield")) {
				error("E050", this);
			}
		} else if (!state.option.asi) {
			nolinebreak(this); // always warn (Line breaking error)
		}
		return this;
	})));


	stmt("throw", function () {
		nolinebreak(this);
		nonadjacent(state.tokens.curr, state.tokens.next);
		this.first = expression(20);
		reachable("throw");
		return this;
	}).exps = true;

	stmt("import", function () {
		if (!state.option.inESNext()) {
			warning("W119", state.tokens.curr, "import");
		}

		if (state.tokens.next.identifier) {
			this.name = identifier();
			addlabel(this.name, "unused", state.tokens.curr);
		} else {
			advance("{");
			for (;;) {
				var importName;
				if (state.tokens.next.type === "default") {
					importName = "default";
					advance("default");
				} else {
					importName = identifier();
				}
				if (state.tokens.next.value === "as") {
					advance("as");
					importName = identifier();
				}
				addlabel(importName, "unused", state.tokens.curr);

				if (state.tokens.next.value === ",") {
					advance(",");
				} else if (state.tokens.next.value === "}") {
					advance("}");
					break;
				} else {
					error("E024", state.tokens.next, state.tokens.next.value);
					break;
				}
			}
		}

		advance("from");
		advance("(string)");
		return this;
	}).exps = true;

	stmt("export", function () {
		if (!state.option.inESNext()) {
			warning("W119", state.tokens.curr, "export");
		}

		if (state.tokens.next.type === "default") {
			advance("default");
			if (state.tokens.next.id === "function" || state.tokens.next.id === "class") {
				this.block = true;
			}
			this.exportee = expression(10);

			return this;
		}

		if (state.tokens.next.value === "{") {
			advance("{");
			for (;;) {
				identifier();

				if (state.tokens.next.value === ",") {
					advance(",");
				} else if (state.tokens.next.value === "}") {
					advance("}");
					break;
				} else {
					error("E024", state.tokens.next, state.tokens.next.value);
					break;
				}
			}
			return this;
		}

		if (state.tokens.next.id === "var") {
			advance("var");
			state.syntax["var"].fud.call(state.syntax["var"].fud);
		} else if (state.tokens.next.id === "let") {
			advance("let");
			state.syntax["let"].fud.call(state.syntax["let"].fud);
		} else if (state.tokens.next.id === "const") {
			advance("const");
			state.syntax["const"].fud.call(state.syntax["const"].fud);
		} else if (state.tokens.next.id === "function") {
			this.block = true;
			advance("function");
			state.syntax["function"].fud();
		} else if (state.tokens.next.id === "class") {
			this.block = true;
			advance("class");
			state.syntax["class"].fud();
		} else {
			error("E024", state.tokens.next, state.tokens.next.value);
		}

		return this;
	}).exps = true;

	// Future Reserved Words

	FutureReservedWord("abstract");
	FutureReservedWord("boolean");
	FutureReservedWord("byte");
	FutureReservedWord("char");
	FutureReservedWord("class", { es5: true, nud: classdef });
	FutureReservedWord("double");
	FutureReservedWord("enum", { es5: true });
	FutureReservedWord("export", { es5: true });
	FutureReservedWord("extends", { es5: true });
	FutureReservedWord("final");
	FutureReservedWord("float");
	FutureReservedWord("goto");
	FutureReservedWord("implements", { es5: true, strictOnly: true });
	FutureReservedWord("import", { es5: true });
	FutureReservedWord("int");
	FutureReservedWord("interface", { es5: true, strictOnly: true });
	FutureReservedWord("long");
	FutureReservedWord("native");
	FutureReservedWord("package", { es5: true, strictOnly: true });
	FutureReservedWord("private", { es5: true, strictOnly: true });
	FutureReservedWord("protected", { es5: true, strictOnly: true });
	FutureReservedWord("public", { es5: true, strictOnly: true });
	FutureReservedWord("short");
	FutureReservedWord("static", { es5: true, strictOnly: true });
	FutureReservedWord("super", { es5: true });
	FutureReservedWord("synchronized");
	FutureReservedWord("throws");
	FutureReservedWord("transient");
	FutureReservedWord("volatile");

	// this function is used to determine wether a squarebracket or a curlybracket
	// expression is a comprehension array, destructuring assignment or a json value.

	var lookupBlockType = function () {
		var pn, pn1;
		var i = 0;
		var bracketStack = 0;
		var ret = {};
		if (_.contains(["[", "{"], state.tokens.curr.value))
			bracketStack += 1;
		if (_.contains(["[", "{"], state.tokens.next.value))
			bracketStack += 1;
		if (_.contains(["]", "}"], state.tokens.next.value))
			bracketStack -= 1;
		do {
			pn = peek(i);
			pn1 = peek(i + 1);
			i = i + 1;
			if (_.contains(["[", "{"], pn.value)) {
				bracketStack += 1;
			} else if (_.contains(["]", "}"], pn.value)) {
				bracketStack -= 1;
			}
			if (pn.identifier && pn.value === "for" && bracketStack === 1) {
				ret.isCompArray = true;
				ret.notJson = true;
				break;
			}
			if (_.contains(["}", "]"], pn.value) && pn1.value === "=") {
				ret.isDestAssign = true;
				ret.notJson = true;
				break;
			}
			if (pn.value === ";") {
				ret.isBlock = true;
				ret.notJson = true;
			}
		} while (bracketStack > 0 && pn.id !== "(end)" && i < 15);
		return ret;
	};

	// Check whether this function has been reached for a destructuring assign with undeclared values
	function destructuringAssignOrJsonValue() {
		// lookup for the assignment (esnext only)
		// if it has semicolons, it is a block, so go parse it as a block
		// or it's not a block, but there are assignments, check for undeclared variables

		var block = lookupBlockType();
		if (block.notJson) {
			if (!state.option.inESNext() && block.isDestAssign) {
				warning("W104", state.tokens.curr, "destructuring assignment");
			}
			statements();
		// otherwise parse json value
		} else {
			state.option.laxbreak = true;
			state.jsonMode = true;
			jsonValue();
		}
	}

	// array comprehension parsing function
	// parses and defines the three states of the list comprehension in order
	// to avoid defining global variables, but keeping them to the list comprehension scope
	// only. The order of the states are as follows:
	//  * "use" which will be the returned iterative part of the list comprehension
	//  * "define" which will define the variables local to the list comprehension
	//  * "filter" which will help filter out values

	var arrayComprehension = function () {
		var CompArray = function () {
			this.mode = "use";
			this.variables = [];
		};
		var _carrays = [];
		var _current;
		function declare(v) {
			var l = _current.variables.filter(function (elt) {
				// if it has, change its undef state
				if (elt.value === v) {
					elt.undef = false;
					return v;
				}
			}).length;
			return l !== 0;
		}
		function use(v) {
			var l = _current.variables.filter(function (elt) {
				// and if it has been defined
				if (elt.value === v && !elt.undef) {
					if (elt.unused === true) {
						elt.unused = false;
					}
					return v;
				}
			}).length;
			// otherwise we warn about it
			return (l === 0);
		}
		return {stack: function () {
					_current = new CompArray();
					_carrays.push(_current);
				},
				unstack: function () {
					_current.variables.filter(function (v) {
						if (v.unused)
							warning("W098", v.token, v.value);
						if (v.undef)
							isundef(v.funct, "W117", v.token, v.value);
					});
					_carrays.splice(_carrays[_carrays.length - 1], 1);
					_current = _carrays[_carrays.length - 1];
				},
				setState: function (s) {
					if (_.contains(["use", "define", "filter"], s))
						_current.mode = s;
				},
				check: function (v) {
					// When we are in "use" state of the list comp, we enqueue that var
					if (_current && _current.mode === "use") {
						_current.variables.push({funct: funct,
													token: state.tokens.curr,
													value: v,
													undef: true,
													unused: false});
						return true;
					// When we are in "define" state of the list comp,
					} else if (_current && _current.mode === "define") {
						// check if the variable has been used previously
						if (!declare(v)) {
							_current.variables.push({funct: funct,
														token: state.tokens.curr,
														value: v,
														undef: false,
														unused: true});
						}
						return true;
					// When we are in "filter" state,
					} else if (_current && _current.mode === "filter") {
						// we check whether current variable has been declared
						if (use(v)) {
							// if not we warn about it
							isundef(funct, "W117", state.tokens.curr, v);
						}
						return true;
					}
					return false;
				}
				};
	};


	// Parse JSON

	function jsonValue() {

		function jsonObject() {
			var o = {}, t = state.tokens.next;
			advance("{");
			if (state.tokens.next.id !== "}") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E026", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "}") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					} else if (state.tokens.next.id !== "(string)") {
						warning("W095", state.tokens.next, state.tokens.next.value);
					}
					if (o[state.tokens.next.value] === true) {
						warning("W075", state.tokens.next, state.tokens.next.value);
					} else if ((state.tokens.next.value === "__proto__" &&
						!state.option.proto) || (state.tokens.next.value === "__iterator__" &&
						!state.option.iterator)) {
						warning("W096", state.tokens.next, state.tokens.next.value);
					} else {
						o[state.tokens.next.value] = true;
					}
					advance();
					advance(":");
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("}");
		}

		function jsonArray() {
			var t = state.tokens.next;
			advance("[");
			if (state.tokens.next.id !== "]") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E027", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "]") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					}
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("]");
		}

		switch (state.tokens.next.id) {
		case "{":
			jsonObject();
			break;
		case "[":
			jsonArray();
			break;
		case "true":
		case "false":
		case "null":
		case "(number)":
		case "(string)":
			advance();
			break;
		case "-":
			advance("-");
			if (state.tokens.curr.character !== state.tokens.next.from) {
				warning("W011", state.tokens.curr);
			}
			adjacent(state.tokens.curr, state.tokens.next);
			advance("(number)");
			break;
		default:
			error("E003", state.tokens.next);
		}
	}

	var blockScope = function () {
		var _current = {};
		var _variables = [_current];

		function _checkBlockLabels() {
			for (var t in _current) {
				if (_current[t]["(type)"] === "unused") {
					if (state.option.unused) {
						var tkn = _current[t]["(token)"];
						var line = tkn.line;
						var chr  = tkn.character;
						warningAt("W098", line, chr, t);
					}
				}
			}
		}

		return {
			stack: function () {
				_current = {};
				_variables.push(_current);
			},

			unstack: function () {
				_checkBlockLabels();
				_variables.splice(_variables.length - 1, 1);
				_current = _.last(_variables);
			},

			getlabel: function (l) {
				for (var i = _variables.length - 1 ; i >= 0; --i) {
					if (_.has(_variables[i], l)) {
						return _variables[i];
					}
				}
			},

			current: {
				has: function (t) {
					return _.has(_current, t);
				},
				add: function (t, type, tok) {
					_current[t] = { "(type)" : type,
									"(token)": tok };
				}
			}
		};
	};

	// The actual JSHINT function itself.
	var itself = function (s, o, g) {
		var i, k, x;
		var optionKeys;
		var newOptionObj = {};
		var newIgnoredObj = {};

		state.reset();

		if (o && o.scope) {
			JSHINT.scope = o.scope;
		} else {
			JSHINT.errors = [];
			JSHINT.undefs = [];
			JSHINT.internals = [];
			JSHINT.blacklist = {};
			JSHINT.scope = "(main)";
		}

		predefined = Object.create(null);
		combine(predefined, vars.ecmaIdentifiers);
		combine(predefined, vars.reservedVars);

		combine(predefined, g || {});

		declared = Object.create(null);
		exported = Object.create(null);

		function each(obj, cb) {
			if (!obj)
				return;

			if (!Array.isArray(obj) && typeof obj === "object")
				obj = Object.keys(obj);

			obj.forEach(cb);
		}

		if (o) {
			each(o.predef || null, function (item) {
				var slice, prop;

				if (item[0] === "-") {
					slice = item.slice(1);
					JSHINT.blacklist[slice] = slice;
				} else {
					prop = Object.getOwnPropertyDescriptor(o.predef, item);
					predefined[item] = prop ? prop.value : false;
				}
			});

			each(o.exported || null, function (item) {
				exported[item] = true;
			});

			delete o.predef;
			delete o.exported;

			optionKeys = Object.keys(o);
			for (x = 0; x < optionKeys.length; x++) {
				if (/^-W\d{3}$/g.test(optionKeys[x])) {
					newIgnoredObj[optionKeys[x].slice(1)] = true;
				} else {
					newOptionObj[optionKeys[x]] = o[optionKeys[x]];

					if (optionKeys[x] === "newcap" && o[optionKeys[x]] === false)
						newOptionObj["(explicitNewcap)"] = true;

					if (optionKeys[x] === "indent")
						newOptionObj["(explicitIndent)"] = o[optionKeys[x]] === false ? false : true;
				}
			}
		}

		state.option = newOptionObj;
		state.ignored = newIgnoredObj;

		state.option.indent = state.option.indent || 4;
		state.option.maxerr = state.option.maxerr || 50;

		indent = 1;
		global = Object.create(predefined);
		scope = global;
		funct = {
			"(global)":   true,
			"(name)":	  "(global)",
			"(scope)":	  scope,
			"(breakage)": 0,
			"(loopage)":  0,
			"(tokens)":   {},
			"(metrics)":   createMetrics(state.tokens.next),
			"(blockscope)": blockScope(),
			"(comparray)": arrayComprehension()
		};
		functions = [funct];
		urls = [];
		stack = null;
		member = {};
		membersOnly = null;
		implied = {};
		inblock = false;
		lookahead = [];
		warnings = 0;
		unuseds = [];

		if (!isString(s) && !Array.isArray(s)) {
			errorAt("E004", 0);
			return false;
		}

		api = {
			get isJSON() {
				return state.jsonMode;
			},

			getOption: function (name) {
				return state.option[name] || null;
			},

			getCache: function (name) {
				return state.cache[name];
			},

			setCache: function (name, value) {
				state.cache[name] = value;
			},

			warn: function (code, data) {
				warningAt.apply(null, [ code, data.line, data.char ].concat(data.data));
			},

			on: function (names, listener) {
				names.split(" ").forEach(function (name) {
					emitter.on(name, listener);
				}.bind(this));
			}
		};

		emitter.removeAllListeners();
		(extraModules || []).forEach(function (func) {
			func(api);
		});

		state.tokens.prev = state.tokens.curr = state.tokens.next = state.syntax["(begin)"];

		lex = new Lexer(s);

		lex.on("warning", function (ev) {
			warningAt.apply(null, [ ev.code, ev.line, ev.character].concat(ev.data));
		});

		lex.on("error", function (ev) {
			errorAt.apply(null, [ ev.code, ev.line, ev.character ].concat(ev.data));
		});

		lex.on("fatal", function (ev) {
			quit("E041", ev.line, ev.from);
		});

		lex.on("Identifier", function (ev) {
			emitter.emit("Identifier", ev);
		});

		lex.on("String", function (ev) {
			emitter.emit("String", ev);
		});

		lex.on("Number", function (ev) {
			emitter.emit("Number", ev);
		});

		lex.start();

		// Check options
		for (var name in o) {
			if (_.has(o, name)) {
				checkOption(name, state.tokens.curr);
			}
		}

		assume();

		// combine the passed globals after we've assumed all our options
		combine(predefined, g || {});

		//reset values
		comma.first = true;

		try {
			advance();
			switch (state.tokens.next.id) {
			case "{":
			case "[":
				destructuringAssignOrJsonValue();
				break;
			default:
				directives();

				if (state.directive["use strict"]) {
					if (!state.option.globalstrict && !state.option.node) {
						warning("W097", state.tokens.prev);
					}
				}

				statements();
			}
			advance((state.tokens.next && state.tokens.next.value !== ".")	? "(end)" : undefined);
			funct["(blockscope)"].unstack();

			var markDefined = function (name, context) {
				do {
					if (typeof context[name] === "string") {
						// JSHINT marks unused variables as 'unused' and
						// unused function declaration as 'unction'. This
						// code changes such instances back 'var' and
						// 'closure' so that the code in JSHINT.data()
						// doesn't think they're unused.

						if (context[name] === "unused")
							context[name] = "var";
						else if (context[name] === "unction")
							context[name] = "closure";

						return true;
					}

					context = context["(context)"];
				} while (context);

				return false;
			};

			var clearImplied = function (name, line) {
				if (!implied[name])
					return;

				var newImplied = [];
				for (var i = 0; i < implied[name].length; i += 1) {
					if (implied[name][i] !== line)
						newImplied.push(implied[name][i]);
				}

				if (newImplied.length === 0)
					delete implied[name];
				else
					implied[name] = newImplied;
			};

			var warnUnused = function (name, tkn, type, unused_opt) {
				var line = tkn.line;
				var chr  = tkn.character;

				if (unused_opt === undefined) {
					unused_opt = state.option.unused;
				}

				if (unused_opt === true) {
					unused_opt = "last-param";
				}

				var warnable_types = {
					"vars": ["var"],
					"last-param": ["var", "param"],
					"strict": ["var", "param", "last-param"]
				};

				if (unused_opt) {
					if (warnable_types[unused_opt] && warnable_types[unused_opt].indexOf(type) !== -1) {
						warningAt("W098", line, chr, name);
					}
				}

				unuseds.push({
					name: name,
					line: line,
					character: chr
				});
			};

			var checkUnused = function (func, key) {
				var type = func[key];
				var tkn = func["(tokens)"][key];

				if (key.charAt(0) === "(")
					return;

				if (type !== "unused" && type !== "unction")
					return;

				// Params are checked separately from other variables.
				if (func["(params)"] && func["(params)"].indexOf(key) !== -1)
					return;

				// Variable is in global scope and defined as exported.
				if (func["(global)"] && _.has(exported, key)) {
					return;
				}

				warnUnused(key, tkn, "var");
			};

			// Check queued 'x is not defined' instances to see if they're still undefined.
			for (i = 0; i < JSHINT.undefs.length; i += 1) {
				k = JSHINT.undefs[i].slice(0);

				if (markDefined(k[2].value, k[0])) {
					clearImplied(k[2].value, k[2].line);
				} else if (state.option.undef) {
					warning.apply(warning, k.slice(1));
				}
			}

			functions.forEach(function (func) {
				if (func["(unusedOption)"] === false) {
					return;
				}

				for (var key in func) {
					if (_.has(func, key)) {
						checkUnused(func, key);
					}
				}

				if (!func["(params)"])
					return;

				var params = func["(params)"].slice();
				var param  = params.pop();
				var type, unused_opt;

				while (param) {
					type = func[param];
					unused_opt = func["(unusedOption)"] || state.option.unused;
					unused_opt = unused_opt === true ? "last-param" : unused_opt;

					// 'undefined' is a special case for (function (window, undefined) { ... })();
					// patterns.

					if (param === "undefined")
						return;

					if (type === "unused" || type === "unction") {
						warnUnused(param, func["(tokens)"][param], "param", func["(unusedOption)"]);
					} else if (unused_opt === "last-param") {
						return;
					}

					param = params.pop();
				}
			});

			for (var key in declared) {
				if (_.has(declared, key) && !_.has(global, key)) {
					warnUnused(key, declared[key], "var");
				}
			}

		} catch (err) {
			if (err && err.name === "JSHintError") {
				var nt = state.tokens.next || {};
				JSHINT.errors.push({
					scope     : "(main)",
					raw       : err.raw,
					code      : err.code,
					reason    : err.message,
					line      : err.line || nt.line,
					character : err.character || nt.from
				}, null);
			} else {
				throw err;
			}
		}

		// Loop over the listed "internals", and check them as well.

		if (JSHINT.scope === "(main)") {
			o = o || {};

			for (i = 0; i < JSHINT.internals.length; i += 1) {
				k = JSHINT.internals[i];
				o.scope = k.elem;
				itself(k.value, o, g);
			}
		}

		return JSHINT.errors.length === 0;
	};

	// Modules.
	itself.addModule = function (func) {
		extraModules.push(func);
	};

	itself.addModule(style.register);

	// Data summary.
	itself.data = function () {
		var data = {
			functions: [],
			options: state.option
		};
		var implieds = [];
		var members = [];
		var fu, f, i, j, n, globals;

		if (itself.errors.length) {
			data.errors = itself.errors;
		}

		if (state.jsonMode) {
			data.json = true;
		}

		for (n in implied) {
			if (_.has(implied, n)) {
				implieds.push({
					name: n,
					line: implied[n]
				});
			}
		}

		if (implieds.length > 0) {
			data.implieds = implieds;
		}

		if (urls.length > 0) {
			data.urls = urls;
		}

		globals = Object.keys(scope);
		if (globals.length > 0) {
			data.globals = globals;
		}

		for (i = 1; i < functions.length; i += 1) {
			f = functions[i];
			fu = {};

			for (j = 0; j < functionicity.length; j += 1) {
				fu[functionicity[j]] = [];
			}

			for (j = 0; j < functionicity.length; j += 1) {
				if (fu[functionicity[j]].length === 0) {
					delete fu[functionicity[j]];
				}
			}

			fu.name = f["(name)"];
			fu.param = f["(params)"];
			fu.line = f["(line)"];
			fu.character = f["(character)"];
			fu.last = f["(last)"];
			fu.lastcharacter = f["(lastcharacter)"];
			data.functions.push(fu);
		}

		if (unuseds.length > 0) {
			data.unused = unuseds;
		}

		members = [];
		for (n in member) {
			if (typeof member[n] === "number") {
				data.member = member;
				break;
			}
		}

		return data;
	};

	itself.jshint = itself;

	return itself;
}());

// Make JSHINT a Node module, if possible.
if (typeof exports === "object" && exports) {
	exports.JSHINT = JSHINT;
}

},{"../shared/messages.js":18,"../shared/vars.js":19,"./lex.js":21,"./reg.js":22,"./state.js":23,"./style.js":24,"console-browserify":16,"events":10,"underscore":17}],21:[function(require,module,exports){
/*
 * Lexical analysis and token construction.
 */

"use strict";

var _      = require("underscore");
var events = require("events");
var reg    = require("./reg.js");
var state  = require("./state.js").state;

// Some of these token types are from JavaScript Parser API
// while others are specific to JSHint parser.
// JS Parser API: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

var Token = {
	Identifier: 1,
	Punctuator: 2,
	NumericLiteral: 3,
	StringLiteral: 4,
	Comment: 5,
	Keyword: 6,
	NullLiteral: 7,
	BooleanLiteral: 8,
	RegExp: 9
};

// This is auto generated from the unicode tables.
// The tables are at:
// http://www.fileformat.info/info/unicode/category/Lu/list.htm
// http://www.fileformat.info/info/unicode/category/Ll/list.htm
// http://www.fileformat.info/info/unicode/category/Lt/list.htm
// http://www.fileformat.info/info/unicode/category/Lm/list.htm
// http://www.fileformat.info/info/unicode/category/Lo/list.htm
// http://www.fileformat.info/info/unicode/category/Nl/list.htm

var unicodeLetterTable = [
	170, 170, 181, 181, 186, 186, 192, 214,
	216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750,
	880, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908,
	910, 929, 931, 1013, 1015, 1153, 1162, 1319, 1329, 1366,
	1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1568, 1610,
	1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775,
	1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957,
	1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069,
	2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2308, 2361,
	2365, 2365, 2384, 2384, 2392, 2401, 2417, 2423, 2425, 2431,
	2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482,
	2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529,
	2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608,
	2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654,
	2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736,
	2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785,
	2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867,
	2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929,
	2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970,
	2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001,
	3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123,
	3125, 3129, 3133, 3133, 3160, 3161, 3168, 3169, 3205, 3212,
	3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261,
	3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344,
	3346, 3386, 3389, 3389, 3406, 3406, 3424, 3425, 3450, 3455,
	3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526,
	3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716,
	3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743,
	3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760,
	3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3805,
	3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138,
	4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198,
	4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4304, 4346,
	4348, 4348, 4352, 4680, 4682, 4685, 4688, 4694, 4696, 4696,
	4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789,
	4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880,
	4882, 4885, 4888, 4954, 4992, 5007, 5024, 5108, 5121, 5740,
	5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900,
	5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000,
	6016, 6067, 6103, 6103, 6108, 6108, 6176, 6263, 6272, 6312,
	6314, 6314, 6320, 6389, 6400, 6428, 6480, 6509, 6512, 6516,
	6528, 6571, 6593, 6599, 6656, 6678, 6688, 6740, 6823, 6823,
	6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7104, 7141,
	7168, 7203, 7245, 7247, 7258, 7293, 7401, 7404, 7406, 7409,
	7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013,
	8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061,
	8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140,
	8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188,
	8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455,
	8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486,
	8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521,
	8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358,
	11360, 11492, 11499, 11502, 11520, 11557, 11568, 11621,
	11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694,
	11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726,
	11728, 11734, 11736, 11742, 11823, 11823, 12293, 12295,
	12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438,
	12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589,
	12593, 12686, 12704, 12730, 12784, 12799, 13312, 13312,
	19893, 19893, 19968, 19968, 40907, 40907, 40960, 42124,
	42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539,
	42560, 42606, 42623, 42647, 42656, 42735, 42775, 42783,
	42786, 42888, 42891, 42894, 42896, 42897, 42912, 42921,
	43002, 43009, 43011, 43013, 43015, 43018, 43020, 43042,
	43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259,
	43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442,
	43471, 43471, 43520, 43560, 43584, 43586, 43588, 43595,
	43616, 43638, 43642, 43642, 43648, 43695, 43697, 43697,
	43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714,
	43739, 43741, 43777, 43782, 43785, 43790, 43793, 43798,
	43808, 43814, 43816, 43822, 43968, 44002, 44032, 44032,
	55203, 55203, 55216, 55238, 55243, 55291, 63744, 64045,
	64048, 64109, 64112, 64217, 64256, 64262, 64275, 64279,
	64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316,
	64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433,
	64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019,
	65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370,
	65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495,
	65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594,
	65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786,
	65856, 65908, 66176, 66204, 66208, 66256, 66304, 66334,
	66352, 66378, 66432, 66461, 66464, 66499, 66504, 66511,
	66513, 66517, 66560, 66717, 67584, 67589, 67592, 67592,
	67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669,
	67840, 67861, 67872, 67897, 68096, 68096, 68112, 68115,
	68117, 68119, 68121, 68147, 68192, 68220, 68352, 68405,
	68416, 68437, 68448, 68466, 68608, 68680, 69635, 69687,
	69763, 69807, 73728, 74606, 74752, 74850, 77824, 78894,
	92160, 92728, 110592, 110593, 119808, 119892, 119894, 119964,
	119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980,
	119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069,
	120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121,
	120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144,
	120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570,
	120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686,
	120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779,
	131072, 131072, 173782, 173782, 173824, 173824, 177972, 177972,
	177984, 177984, 178205, 178205, 194560, 195101
];

var identifierStartTable = [];

for (var i = 0; i < 128; i++) {
	identifierStartTable[i] =
		i === 36 ||           // $
		i >= 65 && i <= 90 || // A-Z
		i === 95 ||           // _
		i >= 97 && i <= 122;  // a-z
}

var identifierPartTable = [];

for (var i = 0; i < 128; i++) {
	identifierPartTable[i] =
		identifierStartTable[i] || // $, _, A-Z, a-z
		i >= 48 && i <= 57;        // 0-9
}

// Object that handles postponed lexing verifications that checks the parsed
// environment state.

function asyncTrigger() {
	var _checks = [];

	return {
		push: function (fn) {
			_checks.push(fn);
		},

		check: function () {
			for (var check = 0; check < _checks.length; ++check) {
				_checks[check]();
			}

			_checks.splice(0, _checks.length);
		}
	};
}

/*
 * Lexer for JSHint.
 *
 * This object does a char-by-char scan of the provided source code
 * and produces a sequence of tokens.
 *
 *   var lex = new Lexer("var i = 0;");
 *   lex.start();
 *   lex.token(); // returns the next token
 *
 * You have to use the token() method to move the lexer forward
 * but you don't have to use its return value to get tokens. In addition
 * to token() method returning the next token, the Lexer object also
 * emits events.
 *
 *   lex.on("Identifier", function (data) {
 *     if (data.name.indexOf("_") >= 0) {
 *       // Produce a warning.
 *     }
 *   });
 *
 * Note that the token() method returns tokens in a JSLint-compatible
 * format while the event emitter uses a slightly modified version of
 * Mozilla's JavaScript Parser API. Eventually, we will move away from
 * JSLint format.
 */
function Lexer(source) {
	var lines = source;

	if (typeof lines === "string") {
		lines = lines
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
			.split("\n");
	}

	// If the first line is a shebang (#!), make it a blank and move on.
	// Shebangs are used by Node scripts.

	if (lines[0] && lines[0].substr(0, 2) === "#!") {
		lines[0] = "";
	}

	this.emitter = new events.EventEmitter();
	this.source = source;
	this.setLines(lines);
	this.prereg = true;

	this.line = 0;
	this.char = 1;
	this.from = 1;
	this.input = "";

	for (var i = 0; i < state.option.indent; i += 1) {
		state.tab += " ";
	}
}

Lexer.prototype = {
	_lines: [],

	getLines: function () {
		this._lines = state.lines;
		return this._lines;
	},

	setLines: function (val) {
		this._lines = val;
		state.lines = this._lines;
	},

	/*
	 * Return the next i character without actually moving the
	 * char pointer.
	 */
	peek: function (i) {
		return this.input.charAt(i || 0);
	},

	/*
	 * Move the char pointer forward i times.
	 */
	skip: function (i) {
		i = i || 1;
		this.char += i;
		this.input = this.input.slice(i);
	},

	/*
	 * Subscribe to a token event. The API for this method is similar
	 * Underscore.js i.e. you can subscribe to multiple events with
	 * one call:
	 *
	 *   lex.on("Identifier Number", function (data) {
	 *     // ...
	 *   });
	 */
	on: function (names, listener) {
		names.split(" ").forEach(function (name) {
			this.emitter.on(name, listener);
		}.bind(this));
	},

	/*
	 * Trigger a token event. All arguments will be passed to each
	 * listener.
	 */
	trigger: function () {
		this.emitter.emit.apply(this.emitter, Array.prototype.slice.call(arguments));
	},

	/*
	 * Postpone a token event. the checking condition is set as
	 * last parameter, and the trigger function is called in a
	 * stored callback. To be later called using the check() function
	 * by the parser. This avoids parser's peek() to give the lexer
	 * a false context.
	 */
	triggerAsync: function (type, args, checks, fn) {
		checks.push(function () {
			if (fn()) {
				this.trigger(type, args);
			}
		}.bind(this));
	},

	/*
	 * Extract a punctuator out of the next sequence of characters
	 * or return 'null' if its not possible.
	 *
	 * This method's implementation was heavily influenced by the
	 * scanPunctuator function in the Esprima parser's source code.
	 */
	scanPunctuator: function () {
		var ch1 = this.peek();
		var ch2, ch3, ch4;

		switch (ch1) {
		// Most common single-character punctuators
		case ".":
			if ((/^[0-9]$/).test(this.peek(1))) {
				return null;
			}
			if (this.peek(1) === "." && this.peek(2) === ".") {
				return {
					type: Token.Punctuator,
					value: "..."
				};
			}
			/* falls through */
		case "(":
		case ")":
		case ";":
		case ",":
		case "{":
		case "}":
		case "[":
		case "]":
		case ":":
		case "~":
		case "?":
			return {
				type: Token.Punctuator,
				value: ch1
			};

		// A pound sign (for Node shebangs)
		case "#":
			return {
				type: Token.Punctuator,
				value: ch1
			};

		// We're at the end of input
		case "":
			return null;
		}

		// Peek more characters

		ch2 = this.peek(1);
		ch3 = this.peek(2);
		ch4 = this.peek(3);

		// 4-character punctuator: >>>=

		if (ch1 === ">" && ch2 === ">" && ch3 === ">" && ch4 === "=") {
			return {
				type: Token.Punctuator,
				value: ">>>="
			};
		}

		// 3-character punctuators: === !== >>> <<= >>=

		if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "==="
			};
		}

		if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "!=="
			};
		}

		if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
			return {
				type: Token.Punctuator,
				value: ">>>"
			};
		}

		if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "<<="
			};
		}

		if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: ">>="
			};
		}

		// Fat arrow punctuator
		if (ch1 === "=" && ch2 === ">") {
			return {
				type: Token.Punctuator,
				value: ch1 + ch2
			};
		}

		// 2-character punctuators: <= >= == != ++ -- << >> && ||
		// += -= *= %= &= |= ^= (but not /=, see below)
		if (ch1 === ch2 && ("+-<>&|".indexOf(ch1) >= 0)) {
			return {
				type: Token.Punctuator,
				value: ch1 + ch2
			};
		}

		if ("<>=!+-*%&|^".indexOf(ch1) >= 0) {
			if (ch2 === "=") {
				return {
					type: Token.Punctuator,
					value: ch1 + ch2
				};
			}

			return {
				type: Token.Punctuator,
				value: ch1
			};
		}

		// Special case: /=. We need to make sure that this is an
		// operator and not a regular expression.

		if (ch1 === "/") {
			if (ch2 === "=" && /\/=(?!(\S*\/[gim]?))/.test(this.input)) {
				// /= is not a part of a regular expression, return it as a
				// punctuator.
				return {
					type: Token.Punctuator,
					value: "/="
				};
			}

			return {
				type: Token.Punctuator,
				value: "/"
			};
		}

		return null;
	},

	/*
	 * Extract a comment out of the next sequence of characters and/or
	 * lines or return 'null' if its not possible. Since comments can
	 * span across multiple lines this method has to move the char
	 * pointer.
	 *
	 * In addition to normal JavaScript comments (// and /*) this method
	 * also recognizes JSHint- and JSLint-specific comments such as
	 * /*jshint, /*jslint, /*globals and so on.
	 */
	scanComments: function () {
		var ch1 = this.peek();
		var ch2 = this.peek(1);
		var rest = this.input.substr(2);
		var startLine = this.line;
		var startChar = this.char;

		// Create a comment token object and make sure it
		// has all the data JSHint needs to work with special
		// comments.

		function commentToken(label, body, opt) {
			var special = ["jshint", "jslint", "members", "member", "globals", "global", "exported"];
			var isSpecial = false;
			var value = label + body;
			var commentType = "plain";
			opt = opt || {};

			if (opt.isMultiline) {
				value += "*/";
			}

			special.forEach(function (str) {
				if (isSpecial) {
					return;
				}

				// Don't recognize any special comments other than jshint for single-line
				// comments. This introduced many problems with legit comments.
				if (label === "//" && str !== "jshint") {
					return;
				}

				if (body.substr(0, str.length) === str) {
					isSpecial = true;
					label = label + str;
					body = body.substr(str.length);
				}

				if (!isSpecial && body.charAt(0) === " " && body.substr(1, str.length) === str) {
					isSpecial = true;
					label = label + " " + str;
					body = body.substr(str.length + 1);
				}

				if (!isSpecial) {
					return;
				}

				switch (str) {
				case "member":
					commentType = "members";
					break;
				case "global":
					commentType = "globals";
					break;
				default:
					commentType = str;
				}
			});

			return {
				type: Token.Comment,
				commentType: commentType,
				value: value,
				body: body,
				isSpecial: isSpecial,
				isMultiline: opt.isMultiline || false,
				isMalformed: opt.isMalformed || false
			};
		}

		// End of unbegun comment. Raise an error and skip that input.
		if (ch1 === "*" && ch2 === "/") {
			this.trigger("error", {
				code: "E018",
				line: startLine,
				character: startChar
			});

			this.skip(2);
			return null;
		}

		// Comments must start either with // or /*
		if (ch1 !== "/" || (ch2 !== "*" && ch2 !== "/")) {
			return null;
		}

		// One-line comment
		if (ch2 === "/") {
			this.skip(this.input.length); // Skip to the EOL.
			return commentToken("//", rest);
		}

		var body = "";

		/* Multi-line comment */
		if (ch2 === "*") {
			this.skip(2);

			while (this.peek() !== "*" || this.peek(1) !== "/") {
				if (this.peek() === "") { // End of Line
					body += "\n";

					// If we hit EOF and our comment is still unclosed,
					// trigger an error and end the comment implicitly.
					if (!this.nextLine()) {
						this.trigger("error", {
							code: "E017",
							line: startLine,
							character: startChar
						});

						return commentToken("/*", body, {
							isMultiline: true,
							isMalformed: true
						});
					}
				} else {
					body += this.peek();
					this.skip();
				}
			}

			this.skip(2);
			return commentToken("/*", body, { isMultiline: true });
		}
	},

	/*
	 * Extract a keyword out of the next sequence of characters or
	 * return 'null' if its not possible.
	 */
	scanKeyword: function () {
		var result = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(this.input);
		var keywords = [
			"if", "in", "do", "var", "for", "new",
			"try", "let", "this", "else", "case",
			"void", "with", "enum", "while", "break",
			"catch", "throw", "const", "yield", "class",
			"super", "return", "typeof", "delete",
			"switch", "export", "import", "default",
			"finally", "extends", "function", "continue",
			"debugger", "instanceof"
		];

		if (result && keywords.indexOf(result[0]) >= 0) {
			return {
				type: Token.Keyword,
				value: result[0]
			};
		}

		return null;
	},

	/*
	 * Extract a JavaScript identifier out of the next sequence of
	 * characters or return 'null' if its not possible. In addition,
	 * to Identifier this method can also produce BooleanLiteral
	 * (true/false) and NullLiteral (null).
	 */
	scanIdentifier: function () {
		var id = "";
		var index = 0;
		var type, char;

		// Detects any character in the Unicode categories "Uppercase
		// letter (Lu)", "Lowercase letter (Ll)", "Titlecase letter
		// (Lt)", "Modifier letter (Lm)", "Other letter (Lo)", or
		// "Letter number (Nl)".
		//
		// Both approach and unicodeLetterTable were borrowed from
		// Google's Traceur.

		function isUnicodeLetter(code) {
			for (var i = 0; i < unicodeLetterTable.length;) {
				if (code < unicodeLetterTable[i++]) {
					return false;
				}

				if (code <= unicodeLetterTable[i++]) {
					return true;
				}
			}

			return false;
		}

		function isHexDigit(str) {
			return (/^[0-9a-fA-F]$/).test(str);
		}

		var readUnicodeEscapeSequence = function () {
			/*jshint validthis:true */
			index += 1;

			if (this.peek(index) !== "u") {
				return null;
			}

			var ch1 = this.peek(index + 1);
			var ch2 = this.peek(index + 2);
			var ch3 = this.peek(index + 3);
			var ch4 = this.peek(index + 4);
			var code;

			if (isHexDigit(ch1) && isHexDigit(ch2) && isHexDigit(ch3) && isHexDigit(ch4)) {
				code = parseInt(ch1 + ch2 + ch3 + ch4, 16);

				if (isUnicodeLetter(code)) {
					index += 5;
					return "\\u" + ch1 + ch2 + ch3 + ch4;
				}

				return null;
			}

			return null;
		}.bind(this);

		var getIdentifierStart = function () {
			/*jshint validthis:true */
			var chr = this.peek(index);
			var code = chr.charCodeAt(0);

			if (code === 92) {
				return readUnicodeEscapeSequence();
			}

			if (code < 128) {
				if (identifierStartTable[code]) {
					index += 1;
					return chr;
				}

				return null;
			}

			if (isUnicodeLetter(code)) {
				index += 1;
				return chr;
			}

			return null;
		}.bind(this);

		var getIdentifierPart = function () {
			/*jshint validthis:true */
			var chr = this.peek(index);
			var code = chr.charCodeAt(0);

			if (code === 92) {
				return readUnicodeEscapeSequence();
			}

			if (code < 128) {
				if (identifierPartTable[code]) {
					index += 1;
					return chr;
				}

				return null;
			}

			if (isUnicodeLetter(code)) {
				index += 1;
				return chr;
			}

			return null;
		}.bind(this);

		char = getIdentifierStart();
		if (char === null) {
			return null;
		}

		id = char;
		for (;;) {
			char = getIdentifierPart();

			if (char === null) {
				break;
			}

			id += char;
		}

		switch (id) {
		case "true":
		case "false":
			type = Token.BooleanLiteral;
			break;
		case "null":
			type = Token.NullLiteral;
			break;
		default:
			type = Token.Identifier;
		}

		return {
			type: type,
			value: id
		};
	},

	/*
	 * Extract a numeric literal out of the next sequence of
	 * characters or return 'null' if its not possible. This method
	 * supports all numeric literals described in section 7.8.3
	 * of the EcmaScript 5 specification.
	 *
	 * This method's implementation was heavily influenced by the
	 * scanNumericLiteral function in the Esprima parser's source code.
	 */
	scanNumericLiteral: function () {
		var index = 0;
		var value = "";
		var length = this.input.length;
		var char = this.peek(index);
		var bad;

		function isDecimalDigit(str) {
			return (/^[0-9]$/).test(str);
		}

		function isOctalDigit(str) {
			return (/^[0-7]$/).test(str);
		}

		function isHexDigit(str) {
			return (/^[0-9a-fA-F]$/).test(str);
		}

		function isIdentifierStart(ch) {
			return (ch === "$") || (ch === "_") || (ch === "\\") ||
				(ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
		}

		// Numbers must start either with a decimal digit or a point.

		if (char !== "." && !isDecimalDigit(char)) {
			return null;
		}

		if (char !== ".") {
			value = this.peek(index);
			index += 1;
			char = this.peek(index);

			if (value === "0") {
				// Base-16 numbers.
				if (char === "x" || char === "X") {
					index += 1;
					value += char;

					while (index < length) {
						char = this.peek(index);
						if (!isHexDigit(char)) {
							break;
						}
						value += char;
						index += 1;
					}

					if (value.length <= 2) { // 0x
						return {
							type: Token.NumericLiteral,
							value: value,
							isMalformed: true
						};
					}

					if (index < length) {
						char = this.peek(index);
						if (isIdentifierStart(char)) {
							return null;
						}
					}

					return {
						type: Token.NumericLiteral,
						value: value,
						base: 16,
						isMalformed: false
					};
				}

				// Base-8 numbers.
				if (isOctalDigit(char)) {
					index += 1;
					value += char;
					bad = false;

					while (index < length) {
						char = this.peek(index);

						// Numbers like '019' (note the 9) are not valid octals
						// but we still parse them and mark as malformed.

						if (isDecimalDigit(char)) {
							bad = true;
						} else if (!isOctalDigit(char)) {
							break;
						}
						value += char;
						index += 1;
					}

					if (index < length) {
						char = this.peek(index);
						if (isIdentifierStart(char)) {
							return null;
						}
					}

					return {
						type: Token.NumericLiteral,
						value: value,
						base: 8,
						isMalformed: false
					};
				}

				// Decimal numbers that start with '0' such as '09' are illegal
				// but we still parse them and return as malformed.

				if (isDecimalDigit(char)) {
					index += 1;
					value += char;
				}
			}

			while (index < length) {
				char = this.peek(index);
				if (!isDecimalDigit(char)) {
					break;
				}
				value += char;
				index += 1;
			}
		}

		// Decimal digits.

		if (char === ".") {
			value += char;
			index += 1;

			while (index < length) {
				char = this.peek(index);
				if (!isDecimalDigit(char)) {
					break;
				}
				value += char;
				index += 1;
			}
		}

		// Exponent part.

		if (char === "e" || char === "E") {
			value += char;
			index += 1;
			char = this.peek(index);

			if (char === "+" || char === "-") {
				value += this.peek(index);
				index += 1;
			}

			char = this.peek(index);
			if (isDecimalDigit(char)) {
				value += char;
				index += 1;

				while (index < length) {
					char = this.peek(index);
					if (!isDecimalDigit(char)) {
						break;
					}
					value += char;
					index += 1;
				}
			} else {
				return null;
			}
		}

		if (index < length) {
			char = this.peek(index);
			if (isIdentifierStart(char)) {
				return null;
			}
		}

		return {
			type: Token.NumericLiteral,
			value: value,
			base: 10,
			isMalformed: !isFinite(value)
		};
	},

	/*
	 * Extract a string out of the next sequence of characters and/or
	 * lines or return 'null' if its not possible. Since strings can
	 * span across multiple lines this method has to move the char
	 * pointer.
	 *
	 * This method recognizes pseudo-multiline JavaScript strings:
	 *
	 *   var str = "hello\
	 *   world";
	 */
	scanStringLiteral: function (checks) {
		/*jshint loopfunc:true */
		var quote = this.peek();

		// String must start with a quote.
		if (quote !== "\"" && quote !== "'") {
			return null;
		}

		// In JSON strings must always use double quotes.
		this.triggerAsync("warning", {
			code: "W108",
			line: this.line,
			character: this.char // +1?
		}, checks, function () { return state.jsonMode && quote !== "\""; });

		var value = "";
		var startLine = this.line;
		var startChar = this.char;
		var allowNewLine = false;

		this.skip();

		while (this.peek() !== quote) {
			while (this.peek() === "") { // End Of Line

				// If an EOL is not preceded by a backslash, show a warning
				// and proceed like it was a legit multi-line string where
				// author simply forgot to escape the newline symbol.
				//
				// Another approach is to implicitly close a string on EOL
				// but it generates too many false positives.

				if (!allowNewLine) {
					this.trigger("warning", {
						code: "W112",
						line: this.line,
						character: this.char
					});
				} else {
					allowNewLine = false;

					// Otherwise show a warning if multistr option was not set.
					// For JSON, show warning no matter what.

					this.triggerAsync("warning", {
						code: "W043",
						line: this.line,
						character: this.char
					}, checks, function () { return !state.option.multistr; });

					this.triggerAsync("warning", {
						code: "W042",
						line: this.line,
						character: this.char
					}, checks, function () { return state.jsonMode && state.option.multistr; });
				}

				// If we get an EOF inside of an unclosed string, show an
				// error and implicitly close it at the EOF point.

				if (!this.nextLine()) {
					this.trigger("error", {
						code: "E029",
						line: startLine,
						character: startChar
					});

					return {
						type: Token.StringLiteral,
						value: value,
						isUnclosed: true,
						quote: quote
					};
				}
			}

			allowNewLine = false;
			var char = this.peek();
			var jump = 1; // A length of a jump, after we're done
			              // parsing this character.

			if (char < " ") {
				// Warn about a control character in a string.
				this.trigger("warning", {
					code: "W113",
					line: this.line,
					character: this.char,
					data: [ "<non-printable>" ]
				});
			}

			// Special treatment for some escaped characters.

			if (char === "\\") {
				this.skip();
				char = this.peek();

				switch (char) {
				case "'":
					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\'" ]
					}, checks, function () {return state.jsonMode; });
					break;
				case "b":
					char = "\b";
					break;
				case "f":
					char = "\f";
					break;
				case "n":
					char = "\n";
					break;
				case "r":
					char = "\r";
					break;
				case "t":
					char = "\t";
					break;
				case "0":
					char = "\0";

					// Octal literals fail in strict mode.
					// Check if the number is between 00 and 07.
					var n = parseInt(this.peek(1), 10);
					this.triggerAsync("warning", {
						code: "W115",
						line: this.line,
						character: this.char
					}, checks,
					function () { return n >= 0 && n <= 7 && state.directive["use strict"]; });
					break;
				case "u":
					char = String.fromCharCode(parseInt(this.input.substr(1, 4), 16));
					jump = 5;
					break;
				case "v":
					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\v" ]
					}, checks, function () { return state.jsonMode; });

					char = "\v";
					break;
				case "x":
					var	x = parseInt(this.input.substr(1, 2), 16);

					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\x-" ]
					}, checks, function () { return state.jsonMode; });

					char = String.fromCharCode(x);
					jump = 3;
					break;
				case "\\":
				case "\"":
				case "/":
					break;
				case "":
					allowNewLine = true;
					char = "";
					break;
				case "!":
					if (value.slice(value.length - 2) === "<") {
						break;
					}

					/*falls through */
				default:
					// Weird escaping.
					this.trigger("warning", {
						code: "W044",
						line: this.line,
						character: this.char
					});
				}
			}

			value += char;
			this.skip(jump);
		}

		this.skip();
		return {
			type: Token.StringLiteral,
			value: value,
			isUnclosed: false,
			quote: quote
		};
	},

	/*
	 * Extract a regular expression out of the next sequence of
	 * characters and/or lines or return 'null' if its not possible.
	 *
	 * This method is platform dependent: it accepts almost any
	 * regular expression values but then tries to compile and run
	 * them using system's RegExp object. This means that there are
	 * rare edge cases where one JavaScript engine complains about
	 * your regular expression while others don't.
	 */
	scanRegExp: function () {
		var index = 0;
		var length = this.input.length;
		var char = this.peek();
		var value = char;
		var body = "";
		var flags = [];
		var malformed = false;
		var isCharSet = false;
		var terminated;

		var scanUnexpectedChars = function () {
			// Unexpected control character
			if (char < " ") {
				malformed = true;
				this.trigger("warning", {
					code: "W048",
					line: this.line,
					character: this.char
				});
			}

			// Unexpected escaped character
			if (char === "<") {
				malformed = true;
				this.trigger("warning", {
					code: "W049",
					line: this.line,
					character: this.char,
					data: [ char ]
				});
			}
		}.bind(this);

		// Regular expressions must start with '/'
		if (!this.prereg || char !== "/") {
			return null;
		}

		index += 1;
		terminated = false;

		// Try to get everything in between slashes. A couple of
		// cases aside (see scanUnexpectedChars) we don't really
		// care whether the resulting expression is valid or not.
		// We will check that later using the RegExp object.

		while (index < length) {
			char = this.peek(index);
			value += char;
			body += char;

			if (isCharSet) {
				if (char === "]") {
					if (this.peek(index - 1) !== "\\" || this.peek(index - 2) === "\\") {
						isCharSet = false;
					}
				}

				if (char === "\\") {
					index += 1;
					char = this.peek(index);
					body += char;
					value += char;

					scanUnexpectedChars();
				}

				index += 1;
				continue;
			}

			if (char === "\\") {
				index += 1;
				char = this.peek(index);
				body += char;
				value += char;

				scanUnexpectedChars();

				if (char === "/") {
					index += 1;
					continue;
				}

				if (char === "[") {
					index += 1;
					continue;
				}
			}

			if (char === "[") {
				isCharSet = true;
				index += 1;
				continue;
			}

			if (char === "/") {
				body = body.substr(0, body.length - 1);
				terminated = true;
				index += 1;
				break;
			}

			index += 1;
		}

		// A regular expression that was never closed is an
		// error from which we cannot recover.

		if (!terminated) {
			this.trigger("error", {
				code: "E015",
				line: this.line,
				character: this.from
			});

			return void this.trigger("fatal", {
				line: this.line,
				from: this.from
			});
		}

		// Parse flags (if any).

		while (index < length) {
			char = this.peek(index);
			if (!/[gim]/.test(char)) {
				break;
			}
			flags.push(char);
			value += char;
			index += 1;
		}

		// Check regular expression for correctness.

		try {
			new RegExp(body, flags.join(""));
		} catch (err) {
			malformed = true;
			this.trigger("error", {
				code: "E016",
				line: this.line,
				character: this.char,
				data: [ err.message ] // Platform dependent!
			});
		}

		return {
			type: Token.RegExp,
			value: value,
			flags: flags,
			isMalformed: malformed
		};
	},

	/*
	 * Scan for any occurence of mixed tabs and spaces. If smarttabs option
	 * is on, ignore tabs followed by spaces.
	 *
	 * Tabs followed by one space followed by a block comment are allowed.
	 */
	scanMixedSpacesAndTabs: function () {
		var at, match;

		if (state.option.smarttabs) {
			// Negative look-behind for "//"
			match = this.input.match(/(\/\/|^\s?\*)? \t/);
			at = match && !match[1] ? 0 : -1;
		} else {
			at = this.input.search(/ \t|\t [^\*]/);
		}

		return at;
	},

	/*
	 * Scan for characters that get silently deleted by one or more browsers.
	 */
	scanUnsafeChars: function () {
		return this.input.search(reg.unsafeChars);
	},

	/*
	 * Produce the next raw token or return 'null' if no tokens can be matched.
	 * This method skips over all space characters.
	 */
	next: function (checks) {
		this.from = this.char;

		// Move to the next non-space character.
		var start;
		if (/\s/.test(this.peek())) {
			start = this.char;

			while (/\s/.test(this.peek())) {
				this.from += 1;
				this.skip();
			}

			if (this.peek() === "") { // EOL
				if (!/^\s*$/.test(this.getLines()[this.line - 1]) && state.option.trailing) {
					this.trigger("warning", { code: "W102", line: this.line, character: start });
				}
			}
		}

		// Methods that work with multi-line structures and move the
		// character pointer.

		var match = this.scanComments() ||
			this.scanStringLiteral(checks);

		if (match) {
			return match;
		}

		// Methods that don't move the character pointer.

		match =
			this.scanRegExp() ||
			this.scanPunctuator() ||
			this.scanKeyword() ||
			this.scanIdentifier() ||
			this.scanNumericLiteral();

		if (match) {
			this.skip(match.value.length);
			return match;
		}

		// No token could be matched, give up.

		return null;
	},

	/*
	 * Switch to the next line and reset all char pointers. Once
	 * switched, this method also checks for mixed spaces and tabs
	 * and other minor warnings.
	 */
	nextLine: function () {
		var char;

		if (this.line >= this.getLines().length) {
			return false;
		}

		this.input = this.getLines()[this.line];
		this.line += 1;
		this.char = 1;
		this.from = 1;

		char = this.scanMixedSpacesAndTabs();
		if (char >= 0) {
			this.trigger("warning", { code: "W099", line: this.line, character: char + 1 });
		}

		this.input = this.input.replace(/\t/g, state.tab);
		char = this.scanUnsafeChars();

		if (char >= 0) {
			this.trigger("warning", { code: "W100", line: this.line, character: char });
		}

		// If there is a limit on line length, warn when lines get too
		// long.

		if (state.option.maxlen && state.option.maxlen < this.input.length) {
			this.trigger("warning", { code: "W101", line: this.line, character: this.input.length });
		}

		return true;
	},

	/*
	 * This is simply a synonym for nextLine() method with a friendlier
	 * public name.
	 */
	start: function () {
		this.nextLine();
	},

	/*
	 * Produce the next token. This function is called by advance() to get
	 * the next token. It retuns a token in a JSLint-compatible format.
	 */
	token: function () {
		/*jshint loopfunc:true */
		var checks = asyncTrigger();
		var token;


		function isReserved(token, isProperty) {
			if (!token.reserved) {
				return false;
			}
			var meta = token.meta;

			if (meta && meta.isFutureReservedWord && state.option.inES5()) {
				// ES3 FutureReservedWord in an ES5 environment.
				if (!meta.es5) {
					return false;
				}

				// Some ES5 FutureReservedWord identifiers are active only
				// within a strict mode environment.
				if (meta.strictOnly) {
					if (!state.option.strict && !state.directive["use strict"]) {
						return false;
					}
				}

				if (isProperty) {
					return false;
				}
			}

			return true;
		}

		// Produce a token object.
		var create = function (type, value, isProperty) {
			/*jshint validthis:true */
			var obj;

			if (type !== "(endline)" && type !== "(end)") {
				this.prereg = false;
			}

			if (type === "(punctuator)") {
				switch (value) {
				case ".":
				case ")":
				case "~":
				case "#":
				case "]":
					this.prereg = false;
					break;
				default:
					this.prereg = true;
				}

				obj = Object.create(state.syntax[value] || state.syntax["(error)"]);
			}

			if (type === "(identifier)") {
				if (value === "return" || value === "case" || value === "typeof") {
					this.prereg = true;
				}

				if (_.has(state.syntax, value)) {
					obj = Object.create(state.syntax[value] || state.syntax["(error)"]);

					// If this can't be a reserved keyword, reset the object.
					if (!isReserved(obj, isProperty && type === "(identifier)")) {
						obj = null;
					}
				}
			}

			if (!obj) {
				obj = Object.create(state.syntax[type]);
			}

			obj.identifier = (type === "(identifier)");
			obj.type = obj.type || type;
			obj.value = value;
			obj.line = this.line;
			obj.character = this.char;
			obj.from = this.from;

			if (isProperty && obj.identifier) {
				obj.isProperty = isProperty;
			}

			obj.check = checks.check;

			return obj;
		}.bind(this);

		for (;;) {
			if (!this.input.length) {
				return create(this.nextLine() ? "(endline)" : "(end)", "");
			}

			token = this.next(checks);

			if (!token) {
				if (this.input.length) {
					// Unexpected character.
					this.trigger("error", {
						code: "E024",
						line: this.line,
						character: this.char,
						data: [ this.peek() ]
					});

					this.input = "";
				}

				continue;
			}

			switch (token.type) {
			case Token.StringLiteral:
				this.triggerAsync("String", {
					line: this.line,
					char: this.char,
					from: this.from,
					value: token.value,
					quote: token.quote
				}, checks, function () { return true; });

				return create("(string)", token.value);
			case Token.Identifier:
				this.trigger("Identifier", {
					line: this.line,
					char: this.char,
					from: this.form,
					name: token.value,
					isProperty: state.tokens.curr.id === "."
				});

				/* falls through */
			case Token.Keyword:
			case Token.NullLiteral:
			case Token.BooleanLiteral:
				return create("(identifier)", token.value, state.tokens.curr.id === ".");

			case Token.NumericLiteral:
				if (token.isMalformed) {
					this.trigger("warning", {
						code: "W045",
						line: this.line,
						character: this.char,
						data: [ token.value ]
					});
				}

				this.triggerAsync("warning", {
					code: "W114",
					line: this.line,
					character: this.char,
					data: [ "0x-" ]
				}, checks, function () { return token.base === 16 && state.jsonMode; });

				this.triggerAsync("warning", {
					code: "W115",
					line: this.line,
					character: this.char
				}, checks, function () {
					return state.directive["use strict"] && token.base === 8; 
				});

				this.trigger("Number", {
					line: this.line,
					char: this.char,
					from: this.from,
					value: token.value,
					base: token.base,
					isMalformed: token.malformed
				});

				return create("(number)", token.value);

			case Token.RegExp:
				return create("(regexp)", token.value);

			case Token.Comment:
				state.tokens.curr.comment = true;

				if (token.isSpecial) {
					return {
						value: token.value,
						body: token.body,
						type: token.commentType,
						isSpecial: token.isSpecial,
						line: this.line,
						character: this.char,
						from: this.from
					};
				}

				break;

			case "":
				break;

			default:
				return create("(punctuator)", token.value);
			}
		}
	}
};

exports.Lexer = Lexer;

},{"./reg.js":22,"./state.js":23,"events":10,"underscore":17}],22:[function(require,module,exports){
/*
 * Regular expressions. Some of these are stupidly long.
 */

/*jshint maxlen:1000 */

"use string";

// Unsafe comment or string (ax)
exports.unsafeString =
	/@cc|<\/?|script|\]\s*\]|<\s*!|&lt/i;

// Unsafe characters that are silently deleted by one or more browsers (cx)
exports.unsafeChars =
	/[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

// Characters in strings that need escaping (nx and nxg)
exports.needEsc =
	/[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

exports.needEscGlobal =
	/[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

// Star slash (lx)
exports.starSlash = /\*\//;

// Identifier (ix)
exports.identifier = /^([a-zA-Z_$][a-zA-Z0-9_$]*)$/;

// JavaScript URL (jx)
exports.javascriptURL = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i;

// Catches /* falls through */ comments (ft)
exports.fallsThrough = /^\s*\/\*\s*falls?\sthrough\s*\*\/\s*$/;

},{}],23:[function(require,module,exports){
"use strict";

var state = {
	syntax: {},

	reset: function () {
		this.tokens = {
			prev: null,
			next: null,
			curr: null
		};

		this.option = {};
		this.ignored = {};
		this.directive = {};
		this.jsonMode = false;
		this.jsonWarnings = [];
		this.lines = [];
		this.tab = "";
		this.cache = {}; // Node.JS doesn't have Map. Sniff.
	}
};

exports.state = state;

},{}],24:[function(require,module,exports){
"use strict";

exports.register = function (linter) {
	// Check for properties named __proto__. This special property was
	// deprecated and then re-introduced for ES6.

	linter.on("Identifier", function style_scanProto(data) {
		if (linter.getOption("proto")) {
			return;
		}

		if (data.name === "__proto__") {
			linter.warn("W103", {
				line: data.line,
				char: data.char,
				data: [ data.name ]
			});
		}
	});

	// Check for properties named __iterator__. This is a special property
	// available only in browsers with JavaScript 1.7 implementation.

	linter.on("Identifier", function style_scanIterator(data) {
		if (linter.getOption("iterator")) {
			return;
		}

		if (data.name === "__iterator__") {
			linter.warn("W104", {
				line: data.line,
				char: data.char,
				data: [ data.name ]
			});
		}
	});

	// Check for dangling underscores.

	linter.on("Identifier", function style_scanDangling(data) {
		if (!linter.getOption("nomen")) {
			return;
		}

		// Underscore.js
		if (data.name === "_") {
			return;
		}

		// In Node, __dirname and __filename should be ignored.
		if (linter.getOption("node")) {
			if (/^(__dirname|__filename)$/.test(data.name) && !data.isProperty) {
				return;
			}
		}

		if (/^(_+.*|.*_+)$/.test(data.name)) {
			linter.warn("W105", {
				line: data.line,
				char: data.from,
				data: [ "dangling '_'", data.name ]
			});
		}
	});

	// Check that all identifiers are using camelCase notation.
	// Exceptions: names like MY_VAR and _myVar.

	linter.on("Identifier", function style_scanCamelCase(data) {
		if (!linter.getOption("camelcase")) {
			return;
		}

		if (data.name.replace(/^_+/, "").indexOf("_") > -1 && !data.name.match(/^[A-Z0-9_]*$/)) {
			linter.warn("W106", {
				line: data.line,
				char: data.from,
				data: [ data.name ]
			});
		}
	});

	// Enforce consistency in style of quoting.

	linter.on("String", function style_scanQuotes(data) {
		var quotmark = linter.getOption("quotmark");
		var code;

		if (!quotmark) {
			return;
		}

		// If quotmark is set to 'single' warn about all double-quotes.

		if (quotmark === "single" && data.quote !== "'") {
			code = "W109";
		}

		// If quotmark is set to 'double' warn about all single-quotes.

		if (quotmark === "double" && data.quote !== "\"") {
			code = "W108";
		}

		// If quotmark is set to true, remember the first quotation style
		// and then warn about all others.

		if (quotmark === true) {
			if (!linter.getCache("quotmark")) {
				linter.setCache("quotmark", data.quote);
			}

			if (linter.getCache("quotmark") !== data.quote) {
				code = "W110";
			}
		}

		if (code) {
			linter.warn(code, {
				line: data.line,
				char: data.char,
			});
		}
	});

	linter.on("Number", function style_scanNumbers(data) {
		if (data.value.charAt(0) === ".") {
			// Warn about a leading decimal point.
			linter.warn("W008", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}

		if (data.value.substr(data.value.length - 1) === ".") {
			// Warn about a trailing decimal point.
			linter.warn("W047", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}

		if (/^00+/.test(data.value)) {
			// Multiple leading zeroes.
			linter.warn("W046", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}
	});

	// Warn about script URLs.

	linter.on("String", function style_scanJavaScriptURLs(data) {
		var re = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i;

		if (linter.getOption("scripturl")) {
			return;
		}

		if (re.test(data.value)) {
			linter.warn("W107", {
				line: data.line,
				char: data.char
			});
		}
	});
};
},{}],25:[function(require,module,exports){
var global=self;/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.4.4 <http://underscorejs.org/>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window) {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used internally to indicate various things */
  var indicatorObject = {};

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-7.8.6
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to detect functions containing a `this` reference */
  var reThis = (reThis = /\bthis\b/) && reThis.test(runInContext) && reThis;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setImmediate', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      errorClass = '[object Error]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && module.exports == freeExports && module;

  /** Detect free variable `global`, from Node.js or Browserified code, and use it as `window` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    window = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * A basic implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} [fromIndex=0] The index to search from.
   * @returns {Number} Returns the index of the matched value or `-1`.
   */
  function basicIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {Mixed} value The value to search for.
   * @returns {Number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value];
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = cache[type] || (cache[type] = {});

    return type == 'object'
      ? (cache[key] && basicIndexOf(cache[key], value) > -1 ? 0 : -1)
      : (cache[key] ? 0 : -1);
  }

  /**
   * Adds a given `value` to the corresponding cache object.
   *
   * @private
   * @param {Mixed} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        if ((typeCache[key] || (typeCache[key] = [])).push(value) == this.array.length) {
          cache[type] = false;
        }
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default `callback` when a given
   * `collection` is a string value.
   *
   * @private
   * @param {String} value The character to inspect.
   * @returns {Number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` values, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ai = a.index,
        bi = b.index;

    a = a.criteria;
    b = b.criteria;

    // ensure a stable sort in V8 and other engines
    // http://code.google.com/p/v8/issues/detail?id=90
    if (a !== b) {
      if (a > b || typeof a == 'undefined') {
        return 1;
      }
      if (a < b || typeof b == 'undefined') {
        return -1;
      }
    }
    return ai < bi ? -1 : 1;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {Null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length;

    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return cache.object === false
      ? (releaseObject(result), null)
      : result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'leading': false,
      'maxWait': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'trailing': false,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * Releases the given `array` back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given `object` back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used, instead of `Array#slice`, to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|String} collection The collection to slice.
   * @param {Number} start The start index.
   * @param {Number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given `context` object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=window] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.com/#x11.1.5.
    context = context ? _.defaults(window.Object(), context, _.pick(window, contextProps)) : window;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype,
        stringProto = String.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(objectProto.valueOf)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        concat = arrayRef.concat,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = reNative.test(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        propertyIsEnumerable = objectProto.propertyIsEnumerable,
        setImmediate = context.setImmediate,
        setTimeout = context.setTimeout,
        toString = objectProto.toString;

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeBind = reNative.test(nativeBind = toString.bind) && nativeBind,
        nativeCreate = reNative.test(nativeCreate =  Object.create) && nativeCreate,
        nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random,
        nativeSlice = arrayRef.slice;

    /** Detect various environments */
    var isIeOpera = reNative.test(context.attachEvent),
        isV8 = nativeBind && !/\n|true/.test(nativeBind + isIeOpera);

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object, which wraps the given `value`, to enable method
     * chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `createCallback`, `debounce`, `defaults`,
     * `defer`, `delay`, `difference`, `filter`, `flatten`, `forEach`, `forIn`,
     * `forOwn`, `functions`, `groupBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `push`, `range`,
     * `reject`, `rest`, `reverse`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`,
     * `tap`, `throttle`, `times`, `toArray`, `transform`, `union`, `uniq`, `unshift`,
     * `unzip`, `values`, `where`, `without`, `wrap`, and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `has`,
     * `identity`, `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`,
     * `isElement`, `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`,
     * `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isRegExp`, `isString`,
     * `isUndefined`, `join`, `lastIndexOf`, `mixin`, `noConflict`, `parseInt`,
     * `pop`, `random`, `reduce`, `reduceRight`, `result`, `shift`, `size`, `some`,
     * `sortedIndex`, `runInContext`, `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * passed, otherwise they return unwrapped values.
     *
     * @name _
     * @constructor
     * @alias chain
     * @category Chaining
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value) {
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if `Function#bind` exists and is inferred to be fast (all but V8).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.fastBind = nativeBind && !isV8;

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type String
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that, when called, invokes `func` with the `this` binding
     * of `thisArg` and prepends any `partialArgs` to the arguments passed to the
     * bound function.
     *
     * @private
     * @param {Function|String} func The function to bind or the method name.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Array} partialArgs An array of arguments to be partially applied.
     * @param {Object} [idicator] Used to indicate binding by key or partially
     *  applying arguments from the right.
     * @returns {Function} Returns the new bound function.
     */
    function createBound(func, thisArg, partialArgs, indicator) {
      var isFunc = isFunction(func),
          isPartial = !partialArgs,
          key = thisArg;

      // juggle arguments
      if (isPartial) {
        var rightIndicator = indicator;
        partialArgs = thisArg;
      }
      else if (!isFunc) {
        if (!indicator) {
          throw new TypeError;
        }
        thisArg = func;
      }

      function bound() {
        // `Function#bind` spec
        // http://es5.github.com/#x15.3.4.5
        var args = arguments,
            thisBinding = isPartial ? this : thisArg;

        if (!isFunc) {
          func = thisArg[key];
        }
        if (partialArgs.length) {
          args = args.length
            ? (args = nativeSlice.call(args), rightIndicator ? args.concat(partialArgs) : partialArgs.concat(args))
            : partialArgs;
        }
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          thisBinding = createObject(func.prototype);

          // mimic the constructor's `return` behavior
          // http://es5.github.com/#x13.2.2
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      return bound;
    }

    /**
     * Creates a new object with the specified `prototype`.
     *
     * @private
     * @param {Object} prototype The prototype object.
     * @returns {Object} Returns the new object.
     */
    function createObject(prototype) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {String} match The matched character to escape.
     * @returns {String} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `basicIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf(array, value, fromIndex) {
      var result = (result = lodash.indexOf) === indexOf ? basicIndexOf : result;
      return result;
    }

    /**
     * Creates a function that juggles arguments, allowing argument overloading
     * for `_.flatten` and `_.uniq`, before passing them to the given `func`.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @returns {Function} Returns the new function.
     */
    function overloadWrapper(func) {
      return function(array, flag, callback, thisArg) {
        // juggle arguments
        if (typeof flag != 'boolean' && flag != null) {
          thisArg = callback;
          callback = !(thisArg && thisArg[flag] === array) ? flag : undefined;
          flag = false;
        }
        if (callback != null) {
          callback = lodash.createCallback(callback, thisArg);
        }
        return func(array, flag, callback, thisArg);
      };
    }

    /**
     * A fallback implementation of `isPlainObject` which checks if a given `value`
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return result === undefined || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {String} match The matched character to unescape.
     * @returns {String} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return toString.call(value) == argsClass;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray;

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     */
    var shimKeys = function (object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;    
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);    
          }
        }    
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (order is not guaranteed)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a `callback` function is passed, it will be executed to produce
     * the assigned values. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'moe' }, { 'age': 40 });
     * // => { 'name': 'moe', 'age': 40 }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var food = { 'name': 'apple' };
     * defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var assign = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = lodash.createCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {    
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];    
        }    
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `deep` is `true`, nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a `callback`
     * function is passed, it will be executed to produce the cloned values. If
     * `callback` returns `undefined`, cloning will be handled by the method instead.
     * The `callback` is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to clone.
     * @param {Boolean} [deep=false] A flag to indicate a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Tracks traversed source objects.
     * @param- {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {Mixed} Returns the cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var shallow = _.clone(stooges);
     * shallow[0] === stooges[0];
     * // => true
     *
     * var deep = _.clone(stooges, true);
     * deep[0] === stooges[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, deep, callback, thisArg, stackA, stackB) {
      var result = value;

      // allows working with "Collections" methods without using their `callback`
      // argument, `index|key`, for this method's `callback`
      if (typeof deep != 'boolean' && deep != null) {
        thisArg = callback;
        callback = deep;
        deep = false;
      }
      if (typeof callback == 'function') {
        callback = (typeof thisArg == 'undefined')
          ? callback
          : lodash.createCallback(callback, thisArg, 1);

        result = callback(result);
        if (typeof result != 'undefined') {
          return result;
        }
        result = value;
      }
      // inspect [[Class]]
      var isObj = isObject(result);
      if (isObj) {
        var className = toString.call(result);
        if (!cloneableClasses[className]) {
          return result;
        }
        var isArr = isArray(result);
      }
      // shallow clone
      if (!isObj || !deep) {
        return isObj
          ? (isArr ? slice(result) : assign({}, result))
          : result;
      }
      var ctor = ctorByClass[className];
      switch (className) {
        case boolClass:
        case dateClass:
          return new ctor(+result);

        case numberClass:
        case stringClass:
          return new ctor(result);

        case regexpClass:
          return ctor(result.source, reFlags.exec(result));
      }
      // check for circular references and return corresponding clone
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == value) {
          return stackB[length];
        }
      }
      // init cloned object
      result = isArr ? ctor(result.length) : {};

      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = clone(objValue, deep, callback, undefined, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * Creates a deep clone of `value`. If a `callback` function is passed,
     * it will be executed to produce the cloned values. If `callback` returns
     * `undefined`, cloning will be handled by the method instead. The `callback`
     * is bound to `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the deep cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var deep = _.cloneDeep(stooges);
     * deep[0] === stooges[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return clone(value, true, callback, thisArg);
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  callback's `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var food = { 'name': 'apple' };
     * _.defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var defaults = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {    
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];    
        }    
        }
      }
      return result
    };

    /**
     * This method is similar to `_.find`, except that it returns the key of the
     * element that passes the callback check, instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the key of the found element, else `undefined`.
     * @example
     *
     * _.findKey({ 'a': 1, 'b': 2, 'c': 3, 'd': 4 }, function(num) {
     *   return num % 2 == 0;
     * });
     * // => 'b'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over `object`'s own and inherited enumerable properties, executing
     * the `callback` for each property. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, key, object). Callbacks may exit iteration
     * early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Dog(name) {
     *   this.name = name;
     * }
     *
     * Dog.prototype.bark = function() {
     *   alert('Woof, woof!');
     * };
     *
     * _.forIn(new Dog('Dagny'), function(value, key) {
     *   alert(key);
     * });
     * // => alerts 'name' and 'bark' (order is not guaranteed)
     */
    var forIn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);    
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;    
        }    
      return result
    };

    /**
     * Iterates over an object's own enumerable properties, executing the `callback`
     * for each property. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
     * returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   alert(key);
     * });
     * // => alerts '0', '1', and 'length' (order is not guaranteed)
     */
    var forOwn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);    
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;    
        }    
      return result
    };

    /**
     * Creates a sorted array of all enumerable properties, own and inherited,
     * of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified object `property` exists and is a direct property,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to check.
     * @param {String} property The property to check for.
     * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, property) {
      return object ? hasOwnProperty.call(object, property) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     *  _.invert({ 'first': 'moe', 'second': 'larry' });
     * // => { 'moe': 'first', 'larry': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false || toString.call(value) == boolClass;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value ? (typeof value == 'object' && toString.call(value) == dateClass) : false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value ? value.nodeType === 1 : false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|String} value The value to inspect.
     * @returns {Boolean} Returns `true`, if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If `callback` is passed, it will be executed to
     * compare values. If `callback` returns `undefined`, comparisons will be handled
     * by the method instead. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} a The value to compare.
     * @param {Mixed} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param- {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
     * @example
     *
     * var moe = { 'name': 'moe', 'age': 40 };
     * var copy = { 'name': 'moe', 'age': 40 };
     *
     * moe == copy;
     * // => false
     *
     * _.isEqual(moe, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      var whereIndicator = callback === indicatorObject;
      if (typeof callback == 'function' && !whereIndicator) {
        callback = lodash.createCallback(callback, thisArg, 2);
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          (!a || (type != 'function' && type != 'object')) &&
          (!b || (otherType != 'function' && otherType != 'object'))) {
        return false;
      }
      // exit early for `null` and `undefined`, avoiding ES3's Function#call behavior
      // http://es5.github.com/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        if (hasOwnProperty.call(a, '__wrapped__ ') || hasOwnProperty.call(b, '__wrapped__')) {
          return isEqual(a.__wrapped__ || a, b.__wrapped__ || b, callback, thisArg, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB && !(
              isFunction(ctorA) && ctorA instanceof ctorA &&
              isFunction(ctorB) && ctorB instanceof ctorB
            )) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        length = a.length;
        size = b.length;

        // compare lengths to determine if a deep comparison is necessary
        result = size == a.length;
        if (!result && !whereIndicator) {
          return result;
        }
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          var index = length,
              value = b[size];

          if (whereIndicator) {
            while (index--) {
              if ((result = isEqual(a[index], value, callback, thisArg, stackA, stackB))) {
                break;
              }
            }
          } else if (!(result = isEqual(a[size], value, callback, thisArg, stackA, stackB))) {
            break;
          }
        }
        return result;
      }
      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
      // which, in this case, is more costly
      forIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          return (result = hasOwnProperty.call(a, key) && isEqual(a[key], value, callback, thisArg, stackA, stackB));
        }
      });

      if (result && !whereIndicator) {
        // ensure both objects have the same number of properties
        forIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            // `size` will be `-1` if `a` has more properties than `b`
            return (result = --size > -1);
          }
        });
      }
      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite`, which will return true for
     * booleans and empty strings. See http://es5.github.com/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.com/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN`, which will return `true` for
     * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' || toString.call(value) == numberClass;
    }

    /**
     * Checks if a given `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     * @example
     *
     * function Stooge(name, age) {
     *   this.name = name;
     *   this.age = age;
     * }
     *
     * _.isPlainObject(new Stooge('moe', 40));
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'name': 'moe', 'age': 40 });
     * // => true
     */
    var isPlainObject = function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = typeof valueOf == 'function' && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/moe/);
     * // => true
     */
    function isRegExp(value) {
      return value ? (typeof value == 'object' && toString.call(value) == regexpClass) : false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('moe');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' || toString.call(value) == stringClass;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined`, into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a `callback` function
     * is passed, it will be executed to produce the merged values of the destination
     * and source properties. If `callback` returns `undefined`, merging will be
     * handled by the method instead. The `callback` is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Object} [deepIndicator] Indicates that `stackA` and `stackB` are
     *  arrays of traversed objects, instead of source objects.
     * @param- {Array} [stackA=[]] Tracks traversed source objects.
     * @param- {Array} [stackB=[]] Associates values with source counterparts.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'stooges': [
     *     { 'name': 'moe' },
     *     { 'name': 'larry' }
     *   ]
     * };
     *
     * var ages = {
     *   'stooges': [
     *     { 'age': 40 },
     *     { 'age': 50 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'stooges': [{ 'name': 'moe', 'age': 40 }, { 'name': 'larry', 'age': 50 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object, source, deepIndicator) {
      var args = arguments,
          index = 0,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      if (deepIndicator === indicatorObject) {
        var callback = args[3],
            stackA = args[4],
            stackB = args[5];
      } else {
        var initedStack = true;
        stackA = getArray();
        stackB = getArray();

        // allows working with `_.reduce` and `_.reduceRight` without
        // using their `callback` arguments, `index|key` and `collection`
        if (typeof deepIndicator != 'number') {
          length = args.length;
        }
        if (length > 3 && typeof args[length - 2] == 'function') {
          callback = lodash.createCallback(args[--length - 1], args[length--], 2);
        } else if (length > 2 && typeof args[length - 1] == 'function') {
          callback = args[--length];
        }
      }
      while (++index < length) {
        (isArray(args[index]) ? forEach : forOwn)(args[index], function(source, key) {
          var found,
              isArr,
              result = source,
              value = object[key];

          if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
            // avoid merging previously merged cyclic sources
            var stackLength = stackA.length;
            while (stackLength--) {
              if ((found = stackA[stackLength] == source)) {
                value = stackB[stackLength];
                break;
              }
            }
            if (!found) {
              var isShallow;
              if (callback) {
                result = callback(value, source);
                if ((isShallow = typeof result != 'undefined')) {
                  value = result;
                }
              }
              if (!isShallow) {
                value = isArr
                  ? (isArray(value) ? value : [])
                  : (isPlainObject(value) ? value : {});
              }
              // add `source` and associated `value` to the stack of traversed objects
              stackA.push(source);
              stackB.push(value);

              // recursively merge objects and arrays (susceptible to call stack limits)
              if (!isShallow) {
                value = merge(value, source, indicatorObject, callback, stackA, stackB);
              }
            }
          }
          else {
            if (callback) {
              result = callback(value, source);
              if (typeof result == 'undefined') {
                result = source;
              }
            }
            if (typeof result != 'undefined') {
              value = result;
            }
          }
          object[key] = value;
        });
      }

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a `callback` function is passed, it will be executed
     * for each property in the `object`, omitting the properties `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked
     * with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|String} callback|[prop1, prop2, ...] The properties to omit
     *  or the function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, 'age');
     * // => { 'name': 'moe' }
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'moe' }
     */
    function omit(object, callback, thisArg) {
      var indexOf = getIndexOf(),
          isFunc = typeof callback == 'function',
          result = {};

      if (isFunc) {
        callback = lodash.createCallback(callback, thisArg);
      } else {
        var props = concat.apply(arrayRef, nativeSlice.call(arguments, 1));
      }
      forIn(object, function(value, key, object) {
        if (isFunc
              ? !callback(value, key, object)
              : indexOf(props, key) < 0
            ) {
          result[key] = value;
        }
      });
      return result;
    }

    /**
     * Creates a two dimensional array of the given object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'moe': 30, 'larry': 40 });
     * // => [['moe', 30], ['larry', 40]] (order is not guaranteed)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of property
     * names. If `callback` is passed, it will be executed for each property in the
     * `object`, picking the properties `callback` returns truthy for. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Array|Function|String} callback|[prop1, prop2, ...] The function called
     *  per iteration or properties to pick, either as individual arguments or arrays.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, 'name');
     * // => { 'name': 'moe' }
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'moe' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce`, this method transforms an `object` to a new
     * `accumulator` object which is the result of running each of its elements
     * through the `callback`, with each `callback` execution potentially mutating
     * the `accumulator` object. The `callback` is bound to `thisArg` and invoked
     * with four arguments; (accumulator, value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] The custom accumulator value.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      callback = lodash.createCallback(callback, thisArg, 4);

      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = createObject(proto);
        }
      }
      (isArr ? forEach : forOwn)(object, function(value, index, object) {
        return callback(accumulator, value, index, object);
      });
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (order is not guaranteed)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Array|Number|String} [index1, index2, ...] The indexes of
     *  `collection` to retrieve, either as individual arguments or arrays.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['moe', 'larry', 'curly'], 0, 2);
     * // => ['moe', 'curly']
     */
    function at(collection) {
      var index = -1,
          props = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
          length = props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given `target` element is present in a `collection` using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Mixed} target The value to check for.
     * @param {Number} [fromIndex=0] The index to search from.
     * @returns {Boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
     * // => true
     *
     * _.contains('curly', 'ur');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (length && typeof length == 'number') {
        result = (isString(collection)
          ? collection.indexOf(target, fromIndex)
          : indexOf(collection, target, fromIndex)
        ) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the given `callback`. The corresponding value of each key
     * is the number of times the key was returned by the `callback`. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    function countBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = String(callback(value, key, collection));
        (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
      });
      return result;
    }

    /**
     * Checks if the `callback` returns a truthy value for **all** elements of a
     * `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if all elements pass the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes'], Boolean);
     * // => false
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(stooges, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(stooges, { 'age': 50 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * the `callback` returns truthy for. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     *
     * // using "_.where" callback shorthand
     * _.filter(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning the first that the `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the found element, else `undefined`.
     * @example
     *
     * _.find([1, 2, 3, 4], function(num) {
     *   return num % 2 == 0;
     * });
     * // => 2
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'banana', 'organic': true,  'type': 'fruit' },
     *   { 'name': 'beet',   'organic': false, 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.find(food, { 'type': 'vegetable' });
     * // => { 'name': 'beet', 'organic': false, 'type': 'vegetable' }
     *
     * // using "_.pluck" callback shorthand
     * _.find(food, 'organic');
     * // => { 'name': 'banana', 'organic': true, 'type': 'fruit' }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * Iterates over a `collection`, executing the `callback` for each element in
     * the `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection). Callbacks may exit iteration early
     * by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|String} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(alert).join(',');
     * // => alerts each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
     * // => alerts each number value (order is not guaranteed)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the `callback`. The corresponding value of each key is
     * an array of elements passed to `callback` that returned the key. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    function groupBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = String(callback(value, key, collection));
        (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
      });
      return result;
    }

    /**
     * Invokes the method named by `methodName` on each element in the `collection`,
     * returning an array of the results of each invoked method. Additional arguments
     * will be passed to each invoked method. If `methodName` is a function, it will
     * be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|String} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = nativeSlice.call(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the `collection`
     * through the `callback`. The `callback` is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (order is not guaranteed)
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(stooges, 'name');
     * // => ['moe', 'larry']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.max(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'larry', 'age': 50 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(stooges, 'age');
     * // => { 'name': 'larry', 'age': 50 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to `thisArg`
     * and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.min(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'moe', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(stooges, 'age');
     * // => { 'name': 'moe', 'age': 40 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the `collection`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {String} property The property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.pluck(stooges, 'name');
     * // => ['moe', 'larry']
     */
    function pluck(collection, property) {
      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = collection[index][property];
        }
      }
      return result || map(collection, property);
    }

    /**
     * Reduces a `collection` to a value which is the accumulated result of running
     * each element in the `collection` through the `callback`, where each successive
     * `callback` execution consumes the return value of the previous execution.
     * If `accumulator` is not passed, the first element of the `collection` will be
     * used as the initial `accumulator` value. The `callback` is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is similar to `_.reduce`, except that it iterates over a
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var iterable = collection,
          length = collection ? collection.length : 0,
          noaccum = arguments.length < 3;

      if (typeof length != 'number') {
        var props = keys(collection);
        length = props.length;
      }
      callback = lodash.createCallback(callback, thisArg, 4);
      forEach(collection, function(value, index, collection) {
        index = props ? props[--length] : --length;
        accumulator = noaccum
          ? (noaccum = false, iterable[index])
          : callback(accumulator, iterable[index], index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter`, this method returns the elements of a
     * `collection` that `callback` does **not** return truthy for.
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that did **not** pass the
     *  callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(food, 'organic');
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     *
     * // using "_.where" callback shorthand
     * _.reject(food, { 'type': 'fruit' });
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Creates an array of shuffled `array` values, using a version of the
     * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = floor(nativeRandom() * (++index + 1));
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to inspect.
     * @returns {Number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('curly');
     * // => 5
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the `callback` returns a truthy value for **any** element of a
     * `collection`. The function returns as soon as it finds passing value, and
     * does not iterate over the entire `collection`. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if any element passes the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(food, 'organic');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(food, { 'type': 'meat' });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in the `collection` through the `callback`. This method
     * performs a stable sort, that is, it will preserve the original sort order of
     * equal elements. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * // using "_.pluck" callback shorthand
     * _.sortBy(['banana', 'strawberry', 'apple'], 'length');
     * // => ['apple', 'banana', 'strawberry']
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      callback = lodash.createCallback(callback, thisArg);
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        object.criteria = callback(value, key, collection);
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * that have the given `properties`. When checking `properties`, this method
     * performs a deep comparison between values to determine if they are equivalent
     * to each other.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Object} properties The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given `properties`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.where(stooges, { 'age': 40 });
     * // => [{ 'name': 'moe', 'age': 40 }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values of `array` removed. The values
     * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array of `array` elements not present in the other arrays
     * using strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Array} [array1, array2, ...] Arrays to check.
     * @returns {Array} Returns a new array of `array` elements not present in the
     *  other arrays.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          seen = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
          result = [];

      var isLarge = length >= largeArraySize && indexOf === basicIndexOf;

      if (isLarge) {
        var cache = createCache(seen);
        if (cache) {
          indexOf = cacheIndexOf;
          seen = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(seen, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(seen);
      }
      return result;
    }

    /**
     * This method is similar to `_.find`, except that it returns the index of
     * the element that passes the callback check, instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the index of the found element, else `-1`.
     * @example
     *
     * _.findIndex(['apple', 'banana', 'beet'], function(food) {
     *   return /^b/.test(food);
     * });
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Gets the first element of the `array`. If a number `n` is passed, the first
     * `n` elements of the `array` are returned. If a `callback` function is passed,
     * elements at the beginning of the array are returned as long as the `callback`
     * returns truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(food, 'organic');
     * // => [{ 'name': 'banana', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.first(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'type': 'fruit' }, { 'name': 'banana', 'type': 'fruit' }]
     */
    function first(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = -1;
          callback = lodash.createCallback(callback, thisArg);
          while (++index < length && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[0];
          }
        }
        return slice(array, 0, nativeMin(nativeMax(0, n), length));
      }
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truthy, `array` will only be flattened a single level. If `callback`
     * is passed, each element of `array` is passed through a `callback` before
     * flattening. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {Boolean} [isShallow=false] A flag to indicate only flattening a single level.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var stooges = [
     *   { 'name': 'curly', 'quotes': ['Oh, a wise guy, eh?', 'Poifect!'] },
     *   { 'name': 'moe', 'quotes': ['Spread out!', 'You knucklehead!'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(stooges, 'quotes');
     * // => ['Oh, a wise guy, eh?', 'Poifect!', 'Spread out!', 'You knucklehead!']
     */
    var flatten = overloadWrapper(function flatten(array, isShallow, callback) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (callback) {
          value = callback(value, index, array);
        }
        // recursively flatten arrays (susceptible to call stack limits)
        if (isArray(value)) {
          push.apply(result, isShallow ? value : flatten(value));
        } else {
          result.push(value);
        }
      }
      return result;
    });

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the `array` is already
     * sorted, passing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Boolean|Number} [fromIndex=0] The index to search from or `true` to
     *  perform a binary search on a sorted `array`.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return array ? basicIndexOf(array, value, fromIndex) : -1;
    }

    /**
     * Gets all but the last element of `array`. If a number `n` is passed, the
     * last `n` elements are excluded from the result. If a `callback` function
     * is passed, elements at the end of the array are excluded from the result
     * as long as the `callback` returns truthy. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(food, 'organic');
     * // => [{ 'name': 'beet',   'organic': false }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.initial(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'banana', 'type': 'fruit' }]
     */
    function initial(array, callback, thisArg) {
      if (!array) {
        return [];
      }
      var n = 0,
          length = array.length;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Computes the intersection of all the passed-in arrays using strict equality
     * for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique elements that are present
     *  in **all** of the arrays.
     * @example
     *
     * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2]
     */
    function intersection(array) {
      var args = arguments,
          argsLength = args.length,
          argsIndex = -1,
          caches = getArray(),
          index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [],
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = args[argsIndex];
        caches[argsIndex] = indexOf === basicIndexOf &&
          (value ? value.length : 0) >= largeArraySize &&
          createCache(argsIndex ? args[argsIndex] : seen);
      }
      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element of the `array`. If a number `n` is passed, the
     * last `n` elements of the `array` are returned. If a `callback` function
     * is passed, elements at the end of the array are returned as long as the
     * `callback` returns truthy. The `callback` is bound to `thisArg` and
     * invoked with three arguments;(value, index, array).
     *
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.last(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.last(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }, { 'name': 'carrot', 'type': 'vegetable' }]
     */
    function last(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = length;
          callback = lodash.createCallback(callback, thisArg);
          while (index-- && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[length - 1];
          }
        }
        return slice(array, nativeMax(0, length - n));
      }
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Number} [fromIndex=array.length-1] The index to search from.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Number} [start=0] The start of the range.
     * @param {Number} end The end of the range.
     * @param {Number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(10);
     * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     *
     * _.range(1, 11);
     * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     *
     * _.range(0, 30, 5);
     * // => [0, 5, 10, 15, 20, 25]
     *
     * _.range(0, -10, -1);
     * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = +step || 1;

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so V8 will avoid the slower "dictionary" mode
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / step)),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * The opposite of `_.initial`, this method gets all but the first value of
     * `array`. If a number `n` is passed, the first `n` values are excluded from
     * the result. If a `callback` function is passed, elements at the beginning
     * of the array are excluded from the result as long as the `callback` returns
     * truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.rest(food, 'organic');
     * // => [{ 'name': 'beet', 'organic': false }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.rest(food, { 'type': 'fruit' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which the `value`
     * should be inserted into `array` in order to maintain the sort order of the
     * sorted `array`. If `callback` is passed, it will be executed for `value` and
     * each element in `array` to compute their sort ranking. The `callback` is
     * bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {Mixed} value The value to evaluate.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Number} Returns the index at which the value should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Computes the union of the passed-in arrays using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique values, in order, that are
     *  present in one or more of the arrays.
     * @example
     *
     * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2, 3, 101, 10]
     */
    function union(array) {
      if (!isArray(array)) {
        arguments[0] = array ? nativeSlice.call(array) : arrayRef;
      }
      return uniq(concat.apply(arrayRef, arguments));
    }

    /**
     * Creates a duplicate-value-free version of the `array` using strict equality
     * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
     * for `isSorted` will run a faster algorithm. If `callback` is passed, each
     * element of `array` is passed through the `callback` before uniqueness is computed.
     * The `callback` is bound to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    var uniq = overloadWrapper(function(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === basicIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        if (cache) {
          indexOf = cacheIndexOf;
          seen = cache;
        } else {
          isLarge = false;
          seen = callback ? seen : (releaseArray(seen), result);
        }
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    });

    /**
     * The inverse of `_.zip`, this method splits groups of elements into arrays
     * composed of elements from each group at their corresponding indexes.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @returns {Array} Returns a new array of the composed arrays.
     * @example
     *
     * _.unzip([['moe', 30, true], ['larry', 40, false]]);
     * // => [['moe', 'larry'], [30, 40], [true, false]];
     */
    function unzip(array) {
      var index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an array with all occurrences of the passed values removed using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {Mixed} [value1, value2, ...] Values to remove.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return difference(array, nativeSlice.call(arguments, 1));
    }

    /**
     * Groups the elements of each array at their corresponding indexes. Useful for
     * separate data sources that are coordinated through matching array indexes.
     * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
     * in a similar fashion.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['moe', 'larry'], [30, 40], [true, false]);
     * // => [['moe', 30, true], ['larry', 40, false]]
     */
    function zip(array) {
      return array ? unzip(arguments) : [];
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Pass either
     * a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`, or
     * two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['moe', 'larry'], [30, 40]);
     * // => { 'moe': 30, 'larry': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * If `n` is greater than `0`, a function is created that is restricted to
     * executing `func`, with the `this` binding and arguments of the created
     * function, only after it is called `n` times. If `n` is less than `1`,
     * `func` is executed immediately, without a `this` binding or additional
     * arguments, and its result is returned.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Number} n The number of times the function must be called before
     * it is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var renderNotes = _.after(notes.length, render);
     * _.forEach(notes, function(note) {
     *   note.asyncSave({ 'success': renderNotes });
     * });
     * // `renderNotes` is run once, after all notes have saved
     */
    function after(n, func) {
      if (n < 1) {
        return func();
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * passed to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'moe' }, 'hi');
     * func();
     * // => 'hi moe'
     */
    function bind(func, thisArg) {
      // use `Function#bind` if it exists and is fast
      // (in V8 `Function#bind` is slower except when partially applied)
      return support.fastBind || (nativeBind && arguments.length > 2)
        ? nativeBind.call.apply(nativeBind, arguments)
        : createBound(func, thisArg, nativeSlice.call(arguments, 2));
    }

    /**
     * Binds methods on `object` to `object`, overwriting the existing method.
     * Method names may be specified as individual arguments or as arrays of method
     * names. If no method names are provided, all the function properties of `object`
     * will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *  'label': 'docs',
     *  'onClick': function() { alert('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => alerts 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? concat.apply(arrayRef, nativeSlice.call(arguments, 1)) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = bind(object[key], object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those passed to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {String} key The key of the method.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'moe',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi moe'
     *
     * object.greet = function(greeting) {
     *   return greeting + ', ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hi, moe!'
     */
    function bindKey(object, key) {
      return createBound(object, key, nativeSlice.call(arguments, 2), indicatorObject);
    }

    /**
     * Creates a function that is the composition of the passed functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} [func1, func2, ...] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var greet = function(name) { return 'hi ' + name; };
     * var exclaim = function(statement) { return statement + '!'; };
     * var welcome = _.compose(exclaim, greet);
     * welcome('moe');
     * // => 'hi moe!'
     */
    function compose() {
      var funcs = arguments;
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name, the created callback will return the property value for a given element.
     * If `func` is an object, the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * Note: All Lo-Dash methods, that accept a `callback` argument, use `_.createCallback`.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} [func=identity] The value to convert to a callback.
     * @param {Mixed} [thisArg] The `this` binding of the created callback.
     * @param {Number} [argCount=3] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(stooges, 'age__gt45');
     * // => [{ 'name': 'larry', 'age': 50 }]
     *
     * // create mixins with support for "_.pluck" and "_.where" callback shorthands
     * _.mixin({
     *   'toLookup': function(collection, callback, thisArg) {
     *     callback = _.createCallback(callback, thisArg);
     *     return _.reduce(collection, function(result, value, index, collection) {
     *       return (result[callback(value, index, collection)] = value, result);
     *     }, {});
     *   }
     * });
     *
     * _.toLookup(stooges, 'name');
     * // => { 'moe': { 'name': 'moe', 'age': 40 }, 'larry': { 'name': 'larry', 'age': 50 } }
     */
    function createCallback(func, thisArg, argCount) {
      if (func == null) {
        return identity;
      }
      var type = typeof func;
      if (type != 'function') {
        if (type != 'object') {
          return function(object) {
            return object[func];
          };
        }
        var props = keys(func);
        return function(object) {
          var length = props.length,
              result = false;
          while (length--) {
            if (!(result = isEqual(object[props[length]], func[props[length]], indicatorObject))) {
              break;
            }
          }
          return result;
        };
      }
      if (typeof thisArg == 'undefined' || (reThis && !reThis.test(fnToString.call(func)))) {
        return func;
      }
      if (argCount === 1) {
        return function(value) {
          return func.call(thisArg, value);
        };
      }
      if (argCount === 2) {
        return function(a, b) {
          return func.call(thisArg, a, b);
        };
      }
      if (argCount === 4) {
        return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return function(value, index, collection) {
        return func.call(thisArg, value, index, collection);
      };
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked. Pass
     * an `options` object to indicate that `func` should be invoked on the leading
     * and/or trailing edge of the `wait` timeout. Subsequent calls to the debounced
     * function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true`, `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {Number} wait The number of milliseconds to delay.
     * @param {Object} options The options object.
     *  [leading=false] A boolean to specify execution on the leading edge of the timeout.
     *  [maxWait] The maximum time `func` is allowed to be delayed before it's called.
     *  [trailing=true] A boolean to specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * var lazyLayout = _.debounce(calculateLayout, 300);
     * jQuery(window).on('resize', lazyLayout);
     *
     * jQuery('#postbox').on('click', _.debounce(sendMail, 200, {
     *   'leading': true,
     *   'trailing': false
     * });
     */
    function debounce(func, wait, options) {
      var args,
          result,
          thisArg,
          callCount = 0,
          lastCalled = 0,
          maxWait = false,
          maxTimeoutId = null,
          timeoutId = null,
          trailing = true;

      function clear() {
        clearTimeout(maxTimeoutId);
        clearTimeout(timeoutId);
        callCount = 0;
        maxTimeoutId = timeoutId = null;
      }

      function delayed() {
        var isCalled = trailing && (!leading || callCount > 1);
        clear();
        if (isCalled) {
          if (maxWait !== false) {
            lastCalled = new Date;
          }
          result = func.apply(thisArg, args);
        }
      }

      function maxDelayed() {
        clear();
        if (trailing || (maxWait !== wait)) {
          lastCalled = new Date;
          result = func.apply(thisArg, args);
        }
      }

      wait = nativeMax(0, wait || 0);
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && nativeMax(wait, options.maxWait || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      return function() {
        args = arguments;
        thisArg = this;
        callCount++;

        // avoid issues with Titanium and `undefined` timeout ids
        // https://github.com/appcelerator/titanium_mobile/blob/3_1_0_GA/android/titanium/src/java/ti/modules/titanium/TitaniumModule.java#L185-L192
        clearTimeout(timeoutId);

        if (maxWait === false) {
          if (leading && callCount < 2) {
            result = func.apply(thisArg, args);
          }
        } else {
          var now = new Date;
          if (!maxTimeoutId && !leading) {
            lastCalled = now;
          }
          var remaining = maxWait - (now - lastCalled);
          if (remaining <= 0) {
            clearTimeout(maxTimeoutId);
            maxTimeoutId = null;
            lastCalled = now;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * _.defer(function() { alert('deferred'); });
     * // returns from the function before `alert` is called
     */
    function defer(func) {
      var args = nativeSlice.call(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }
    // use `setImmediate` if it's available in Node.js
    if (isV8 && freeModule && typeof setImmediate == 'function') {
      defer = bind(setImmediate, context);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {Number} wait The number of milliseconds to delay execution.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * var log = _.bind(console.log, console);
     * _.delay(log, 1000, 'logged later');
     * // => 'logged later' (Appears after one second.)
     */
    function delay(func, wait) {
      var args = nativeSlice.call(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * passed, it will be used to determine the cache key for storing the result
     * based on the arguments passed to the memoized function. By default, the first
     * argument passed to the memoized function is used as the cache key. The `func`
     * is executed with the `this` binding of the memoized function. The result
     * cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     */
    function memoize(func, resolver) {
      function memoized() {
        var cache = memoized.cache,
            key = keyPrefix + (resolver ? resolver.apply(this, arguments) : arguments[0]);

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those passed to the new function. This
     * method is similar to `_.bind`, except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('moe');
     * // => 'hi moe'
     */
    function partial(func) {
      return createBound(func, nativeSlice.call(arguments, 1));
    }

    /**
     * This method is similar to `_.partial`, except that `partial` arguments are
     * appended to those passed to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createBound(func, nativeSlice.call(arguments, 1), null, indicatorObject);
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Pass an `options` object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true`, `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {Number} wait The number of milliseconds to throttle executions to.
     * @param {Object} options The options object.
     *  [leading=true] A boolean to specify execution on the leading edge of the timeout.
     *  [trailing=true] A boolean to specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      options = getObject();
      options.leading = leading;
      options.maxWait = wait;
      options.trailing = trailing;

      var result = debounce(func, wait, options);
      releaseObject(options);
      return result;
    }

    /**
     * Creates a function that passes `value` to the `wrapper` function as its
     * first argument. Additional arguments passed to the function are appended
     * to those passed to the `wrapper` function. The `wrapper` is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var hello = function(name) { return 'hello ' + name; };
     * hello = _.wrap(hello, function(func) {
     *   return 'before, ' + func('moe') + ', after';
     * });
     * hello();
     * // => 'before, hello moe, after'
     */
    function wrap(value, wrapper) {
      return function() {
        var args = [value];
        push.apply(args, arguments);
        return wrapper.apply(this, args);
      };
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to escape.
     * @returns {String} Returns the escaped string.
     * @example
     *
     * _.escape('Moe, Larry & Curly');
     * // => 'Moe, Larry &amp; Curly'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument passed to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Mixed} value Any value.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * var moe = { 'name': 'moe' };
     * moe === _.identity(moe);
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds functions properties of `object` to the `lodash` function and chainable
     * wrapper.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object of function properties to add to `lodash`.
     * @example
     *
     * _.mixin({
     *   'capitalize': function(string) {
     *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     *   }
     * });
     *
     * _.capitalize('moe');
     * // => 'Moe'
     *
     * _('moe').capitalize();
     * // => 'Moe'
     */
    function mixin(object) {
      forEach(functions(object), function(methodName) {
        var func = lodash[methodName] = object[methodName];

        lodash.prototype[methodName] = function() {
          var value = this.__wrapped__,
              args = [value];

          push.apply(args, arguments);
          var result = func.apply(lodash, args);
          return (value && typeof value == 'object' && value === result)
            ? this
            : new lodashWrapper(result);
        };
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * Converts the given `value` into an integer of the specified `radix`.
     * If `radix` is `undefined` or `0`, a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.com/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} value The value to parse.
     * @param {Number} [radix] The radix used to interpret the value to parse.
     * @returns {Number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox and Opera still follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is passed, a number between `0` and the given number will be returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} [min=0] The minimum possible value.
     * @param {Number} [max=1] The maximum possible value.
     * @returns {Number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => a number between 0 and 5
     *
     * _.random(5);
     * // => also a number between 0 and 5
     */
    function random(min, max) {
      if (min == null && max == null) {
        max = 1;
      }
      min = +min || 0;
      if (max == null) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      var rand = nativeRandom();
      return (min % 1 || max % 1)
        ? min + nativeMin(rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1))), max)
        : min + floor(rand * (max - min + 1));
    }

    /**
     * Resolves the value of `property` on `object`. If `property` is a function,
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey, then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {String} property The property to get the value of.
     * @returns {Mixed} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, property) {
      var value = object ? object[property] : undefined;
      return isFunction(value) ? object[property]() : value;
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/#custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} options The options object.
     *  escape - The "escape" delimiter regexp.
     *  evaluate - The "evaluate" delimiter regexp.
     *  interpolate - The "interpolate" delimiter regexp.
     *  sourceURL - The sourceURL of the template's compiled source.
     *  variable - The data object variable name.
     * @returns {Function|String} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'moe' });
     * // => 'hello moe'
     *
     * var list = '<% _.forEach(people, function(name) { %><li><%= name %></li><% }); %>';
     * _.template(list, { 'people': ['moe', 'larry'] });
     * // => '<li>moe</li><li>larry</li>'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'curly' });
     * // => 'hello curly'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + epithet); %>!', { 'epithet': 'stooge' });
     * // => 'hello stooge!'
     *
     * // using custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text || (text = '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging and wrap in a multi-line comment to
      // avoid issues with Narwhal, IE conditional compilation, and the JS engine
      // embedded in Adobe products.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//@ sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source via its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the `callback` function `n` times, returning an array of the results
     * of each `callback` execution. The `callback` is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = lodash.createCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape`, this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to unescape.
     * @returns {String} Returns the unescaped string.
     * @example
     *
     * _.unescape('Moe, Larry &amp; Curly');
     * // => 'Moe, Larry & Curly'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is passed, the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} [prefix] The value to prefix the ID with.
     * @returns {String} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Invokes `interceptor` with the `value` as the first argument, and then
     * returns `value`. The purpose of this method is to "tap into" a method chain,
     * in order to perform operations on intermediate results within the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {Mixed} value The value to pass to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .filter(function(num) { return num % 2 == 0; })
     *  .tap(alert)
     *  .map(function(num) { return num * num; })
     *  .value();
     * // => // [2, 4] (alerted)
     * // => [4, 16]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {String} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {Mixed} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.countBy = countBy;
    lodash.createCallback = createCallback;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forIn = forIn;
    lodash.forOwn = forOwn;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.range = range;
    lodash.reject = reject;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.unzip = unzip;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;

    // add functions to `lodash.prototype`
    mixin(lodash);

    // add Underscore compat
    lodash.chain = lodash;
    lodash.prototype.chain = function() { return this; };

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName] = function() {
          var args = [this.__wrapped__];
          push.apply(args, arguments);
          return func.apply(lodash, args);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(callback, thisArg) {
          var result = func(this.__wrapped__, callback, thisArg);
          return callback == null || (thisArg && typeof callback != 'function')
            ? result
            : new lodashWrapper(result);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type String
     */
    lodash.VERSION = '1.3.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return func.apply(this.__wrapped__, arguments);
      };
    });

    // add `Array` functions that return the wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments));
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && !freeExports.nodeType) {
    // in Node.js or RingoJS v0.8.0+
    if (freeModule) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    window._ = _;
  }
}(this));

},{}]},{},[6])
;