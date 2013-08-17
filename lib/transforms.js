(function() {
  var S, checkIncompleteMembers, checkThisKeywords, esprima, gatherLineNumbers, getLineNumberForNode, instrumentStatements, possiblyGeneratorifyAncestorFunction, problems, statements, validateReturns, yieldAutomatically, yieldConditionally,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  problems = require('./problems');

  esprima = require('esprima');

  S = esprima.Syntax;

  statements = [S.EmptyStatement, S.ExpressionStatement, S.BreakStatement, S.ContinueStatement, S.DebuggerStatement, S.DoWhileStatement, S.ForStatement, S.FunctionDeclaration, S.ClassDeclaration, S.IfStatement, S.ReturnStatement, S.SwitchStatement, S.ThrowStatement, S.TryStatement, S.VariableStatement, S.WhileStatement, S.WithStatement];

  getLineNumberForNode = function(node) {
    var fullSource, i, line, parent, _i, _ref;
    parent = node;
    while (parent.type !== S.Program) {
      parent = parent.parent;
    }
    fullSource = parent.source();
    line = -2;
    for (i = _i = 0, _ref = node.range[0]; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (fullSource[i] === '\n') {
        ++line;
      }
    }
    return line;
  };

  module.exports.checkThisKeywords = checkThisKeywords = function(node) {
    var error, problem, v;
    if (node.type === S.VariableDeclarator) {
      return this.vars[node.id] = true;
    } else if (node.type === S.CallExpression) {
      v = node.callee.name;
      if (v && !this.vars[v] && !this.options.global[v]) {
        error = {
          id: "MissingThis",
          message: "Missing `this.` keyword; should be `this." + v + "`.",
          hint: "There is no function `" + v + "`, but `this` has a method `" + v + "`."
        };
        problem = new problems.UserCodeProblem(error, this.raw, this, 'aether', '');
        this.addProblem(problem);
        if (!this.options.requiresThis) {
          return node.update("this." + (node.source()));
        }
      }
    }
  };

  module.exports.validateReturns = validateReturns = function(node) {
    var _ref;
    if (node.type === S.ReturnStatement && !node.argument) {
      return node.update("return this.validateReturn('" + this.options.functionName + "', null);");
    } else if (((_ref = node.parent) != null ? _ref.type : void 0) === S.ReturnStatement) {
      return node.update("this.validateReturn('" + this.options.functionName + "', (" + (node.source()) + "))");
    }
  };

  module.exports.gatherLineNumbers = gatherLineNumbers = function(node) {
    var exp, lineNumber, name;
    if (node.type === S.ExpressionStatement) {
      lineNumber = getLineNumberForNode(node);
      exp = node.expression;
      if (exp.type === S.CallExpression) {
        if (exp.callee.type === S.MemberExpression) {
          name = exp.callee.property.name;
        } else if (exp.callee.type === S.Identifier) {
          name = exp.callee.name;
        } else if (typeof $ !== "undefined" && $ !== null) {
          console.log("How is this CallExpression being handled?", node, node.source(), exp.callee, exp.callee.source());
        }
        if (this.methodLineNumbers.length > lineNumber) {
          return this.methodLineNumbers[lineNumber].push(name);
        } else {
          return console.log("More lines than we can actually handle:", lineNumber, name, "of", this.methodLineNumbers.length, "lines");
        }
      }
    }
  };

  module.exports.checkIncompleteMembers = checkIncompleteMembers = function(node) {
    var error, exp, lineNumber, m, _ref;
    if (node.type === 'ExpressionStatement') {
      lineNumber = getLineNumberForNode(node);
      exp = node.expression;
      if (exp.type === 'MemberExpression') {
        if (exp.property.name === "IncompleteThisReference") {
          m = "this.what? (Check available spells below.)";
        } else {
          m = "" + (exp.source()) + " has no effect.";
          if (_ref = exp.property.name, __indexOf.call(errors.commonMethods, _ref) >= 0) {
            m += " It needs parentheses: " + exp.property.name + "()";
          }
        }
        error = new Error(m);
        error.lineNumber = lineNumber + 2;
        throw error;
      }
    }
  };

  possiblyGeneratorifyAncestorFunction = function(node) {
    while (node.type !== S.FunctionExpression) {
      node = node.parent;
    }
    return node.mustBecomeGeneratorFunction = true;
  };

  module.exports.yieldConditionally = yieldConditionally = function(node) {
    var grandparent, _ref;
    grandparent = (_ref = node.parent) != null ? _ref.parent : void 0;
    if (node.type === S.CallExpression && (grandparent != null ? grandparent.type : void 0) === S.ExpressionStatement) {
      grandparent.update("" + (grandparent.source()) + " if (this._shouldYield) { var __yieldValue = this._shouldYield; this._shouldYield = false; yield __yieldValue; }");
      grandparent.yields = true;
      return possiblyGeneratorifyAncestorFunction(grandparent);
    } else if (node.mustBecomeGeneratorFunction) {
      return node.update(node.source().replace(/^function \(/, 'function* ('));
    }
  };

  module.exports.yieldAutomatically = yieldAutomatically = function(node) {
    var nFunctionParents, p, _ref;
    if (_ref = node.type, __indexOf.call(statements, _ref) >= 0) {
      nFunctionParents = 0;
      p = node.parent;
      while (p) {
        if (p.type === S.FunctionExpression) {
          ++nFunctionParents;
        }
        p = p.parent;
      }
      if (!(nFunctionParents > 1)) {
        return;
      }
      node.update("" + (node.source()) + " yield 'waiting...';");
      node.yields = true;
      return possiblyGeneratorifyAncestorFunction(node);
    } else if (node.mustBecomeGeneratorFunction) {
      return node.update(node.source().replace(/^function \(/, 'function* ('));
    }
  };

  module.exports.instrumentStatements = instrumentStatements = function(node) {};

}).call(this);
