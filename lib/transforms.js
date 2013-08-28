(function() {
  var S, SourceMap, checkIncompleteMembers, esprima, getLineNumberForNode, makeCheckThisKeywords, makeFindOriginalNodes, makeGatherNodeRanges, makeInstrumentCalls, makeInstrumentStatements, possiblyGeneratorifyAncestorFunction, problems, statements, validateReturns, yieldAutomatically, yieldConditionally,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  problems = require('./problems');

  esprima = require('esprima');

  SourceMap = require('source-map');

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

  module.exports.makeGatherNodeRanges = makeGatherNodeRanges = function(nodeRanges, codePrefix) {
    return function(node) {
      node.originalRange = {
        start: node.range[0] - codePrefix.length,
        end: node.range[1] - codePrefix.length
      };
      node.originalSource = node.source();
      return nodeRanges.push(node);
    };
  };

  module.exports.makeCheckThisKeywords = makeCheckThisKeywords = function(global) {
    var vars;
    vars = {};
    return function(node) {
      var problem, v;
      if (node.type === S.VariableDeclarator) {
        return vars[node.id] = true;
      } else if (node.type === S.CallExpression) {
        v = node.callee.name;
        if (v && !vars[v] && !global[v]) {
          problem = new problems.TranspileProblem(this, 'aether', 'MissingThis', {}, '', '');
          problem.message = "Missing `this.` keyword; should be `this." + v + "`.";
          problem.hint = "There is no function `" + v + "`, but `this` has a method `" + v + "`.";
          this.addProblem(problem);
          if (!this.options.requiresThis) {
            return node.update("this." + (node.source()));
          }
        }
      }
    };
  };

  module.exports.validateReturns = validateReturns = function(node) {
    var _ref;
    if (node.type === S.ReturnStatement && !node.argument) {
      return node.update(node.source().replace("return;", "return this.validateReturn('" + this.options.functionName + "', null);"));
    } else if (((_ref = node.parent) != null ? _ref.type : void 0) === S.ReturnStatement) {
      return node.update("this.validateReturn('" + this.options.functionName + "', (" + (node.source()) + "))");
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
          if (_ref = exp.property.name, __indexOf.call(problems.commonMethods, _ref) >= 0) {
            m += " It needs parentheses: " + exp.property.name + "()";
          }
        }
        error = new Error(m);
        return error.lineNumber = lineNumber + 2;
      }
    }
  };

  module.exports.makeFindOriginalNodes = makeFindOriginalNodes = function(originalNodes, codePrefix, wrappedCode, normalizedSourceMap, normalizedNodeIndex) {
    var normalizedPosToOriginalNode, smc;
    normalizedPosToOriginalNode = function(pos) {
      var end, node, start, _i, _len;
      start = pos.start_offset - codePrefix.length;
      end = pos.end_offset - codePrefix.length;
      for (_i = 0, _len = originalNodes.length; _i < _len; _i++) {
        node = originalNodes[_i];
        if (start === node.originalRange.start && end === node.originalRange.end) {
          return node;
        }
      }
      return null;
    };
    smc = new SourceMap.SourceMapConsumer(normalizedSourceMap.toString());
    return function(node) {
      var mapped, normalizedNode;
      if (!(mapped = smc.originalPositionFor({
        line: node.loc.start.line,
        column: node.loc.start.column
      }))) {
        return;
      }
      if (!(normalizedNode = normalizedNodeIndex[mapped.column])) {
        return;
      }
      return node.originalNode = normalizedPosToOriginalNode(normalizedNode.attr.pos);
    };
  };

  possiblyGeneratorifyAncestorFunction = function(node) {
    while (node.type !== S.FunctionExpression) {
      node = node.parent;
    }
    return node.mustBecomeGeneratorFunction = true;
  };

  module.exports.yieldConditionally = yieldConditionally = function(node) {
    var _ref;
    if (node.type === S.ExpressionStatement && ((_ref = node.expression.right) != null ? _ref.type : void 0) === S.CallExpression) {
      node.update("" + (node.source()) + " if (this._shouldYield) { var _yieldValue = this._shouldYield; this._shouldYield = false; yield _yieldValue; }");
      node.yields = true;
      return possiblyGeneratorifyAncestorFunction(node);
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

  module.exports.makeInstrumentStatements = makeInstrumentStatements = function() {
    return function(node) {
      var nFunctionParents, p, range, safeSource, source, _ref, _ref1;
      if (!(node.originalNode && node.originalNode.originalRange.start >= 0)) {
        return;
      }
      if (_ref = node.type, __indexOf.call(statements, _ref) < 0) {
        return;
      }
      if ((_ref1 = node.originalNode.type) === S.ThisExpression || _ref1 === S.Identifier || _ref1 === S.Literal) {
        return;
      }
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
      range = [node.originalNode.originalRange.start, node.originalNode.originalRange.end];
      source = node.originalNode.originalSource;
      safeSource = source.replace(/\"/g, '\\"').replace(/\n/g, '\\n');
      return node.update("" + (node.source()) + " _aether.logStatement(" + range[0] + ", " + range[1] + ", \"" + safeSource + "\");");
    };
  };

  module.exports.makeInstrumentCalls = makeInstrumentCalls = function() {
    return function(node) {
      if (node.type === S.ReturnStatement) {
        node.update("_aether.logCallEnd(); " + (node.source()));
      }
      if (!(node.originalNode && node.originalNode.originalRange.start < 0)) {
        return;
      }
      if (!(node.type === S.ExpressionStatement && node.originalNode.value === "use strict")) {
        return;
      }
      return node.update("" + (node.source()) + " _aether.logCallStart();");
    };
  };

}).call(this);
