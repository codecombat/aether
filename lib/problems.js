(function() {
  var RuntimeProblem, TranspileProblem, UserCodeProblem, commonMethods, problems,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports.UserCodeProblem = UserCodeProblem = (function() {
    function UserCodeProblem(aether, reporter, kind) {
      var config, _ref;
      if (reporter == null) {
        reporter = 'unknown';
      }
      if (kind == null) {
        kind = "Unknown";
      }
      this.id = reporter + "_" + kind;
      config = (_ref = aether.options.problems[this.id]) != null ? _ref : {
        message: "Unknown problem",
        level: "error"
      };
      this.message = config.message;
      this.hint = config.hint;
      this.level = config.level;
    }

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

  module.exports.TranspileProblem = TranspileProblem = (function(_super) {
    __extends(TranspileProblem, _super);

    function TranspileProblem(aether, reporter, kind, error, userInfo, code, codePrefix) {
      var endCol, line, lineOffset, originalLines, startCol;
      this.userInfo = userInfo;
      if (code == null) {
        code = '';
      }
      if (codePrefix == null) {
        codePrefix = "function wrapped() {\n\"use strict\";\n";
      }
      TranspileProblem.__super__.constructor.call(this, aether, reporter, kind);
      this.type = 'transpile';
      if (this.userInfo == null) {
        this.userInfo = {};
      }
      if (code == null) {
        code = this.raw;
      }
      originalLines = code.slice(codePrefix.length).split('\n');
      lineOffset = codePrefix.split('\n').length - 1;
      switch (reporter) {
        case 'jshint':
          this.message = error.reason;
          line = error.line - codePrefix.split('\n').length;
          if (line >= 0) {
            startCol = originalLines[line].indexOf(error.evidence);
            endCol = startCol + error.evidence.length;
            this.ranges = [[[line, startCol], [line, endCol]]];
          } else {
            this.ranges = [[[0, 0], [originalLines.length - 1, originalLines[originalLines.length - 1].length - 1]]];
          }
          break;
        case 'esprima':
          this.message = error.message;
          this.ranges = [[[error.lineNumber - 1 - lineOffset, error.column - 1], [error.lineNumber - 1 - lineOffset, error.column]]];
          break;
        case 'aether':
          if (error.message) {
            this.message = error.message;
          }
          break;
        default:
          console.log("Unhandled UserCodeProblem reporter", reporter);
          if (error.message) {
            this.message = error.message;
          }
      }
    }

    return TranspileProblem;

  })(UserCodeProblem);

  module.exports.RuntimeProblem = RuntimeProblem = (function(_super) {
    __extends(RuntimeProblem, _super);

    function RuntimeProblem(aether, error, userInfo) {
      var kind, lineNumber,
        _this = this;
      this.userInfo = userInfo;
      kind = error.name;
      RuntimeProblem.__super__.constructor.call(this, aether, 'runtime', kind);
      this.type = 'runtime';
      if (this.userInfo == null) {
        this.userInfo = {};
      }
      this.message = RuntimeError.explainErrorMessage(error);
      this.ranges = [RuntimeProblem.getAnonymousErrorRange(error)];
      if (this.ranges) {
        lineNumber = this.ranges[0][0][0];
        if (this.message.search(/^Line \d+/) !== -1) {
          this.message = this.message.replace(/^Line \d+/, function(match, n) {
            return "Line " + lineNumber;
          });
        } else {
          this.message = "Line " + lineNumber + ": " + this.message;
        }
      }
    }

    RuntimeProblem.getAnonymousErrorRange = function(error) {
      var chromeVersion, column, i, line, lineNumber, lines, stack, _i, _len, _ref, _ref1, _ref2;
      if (error.lineNumber) {
        return [[error.lineNumber, error.column], [error.lineNumber, error.column + 1]];
      }
      stack = error.stack;
      if (!stack) {
        return null;
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
        return [[lineNumber, column], [lineNumber, column + 1]];
      }
      return null;
    };

    RuntimeProblem.explainErrorMessage = function(error) {
      var closestMatch, closestMatchScore, commonMethod, explained, m, matchScore, method, missingMethodMatch, _i, _len, _ref, _ref1;
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
      }
      return m;
    };

    return RuntimeProblem;

  })(UserCodeProblem);

  module.exports.commonMethods = commonMethods = ['moveRight', 'moveLeft', 'moveUp', 'moveDown', 'attackNearbyEnemy', 'say', 'move', 'attackNearestEnemy', 'shootAt', 'rotateTo', 'shoot', 'distance', 'getNearestEnemy', 'getEnemies', 'attack', 'setAction', 'setTarget', 'getFriends', 'patrol'];

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
    },
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
      message: 'Missing `this.` keyword.',
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
    },
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
  };

}).call(this);
