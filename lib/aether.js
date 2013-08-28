(function() {
  var Aether, acorn_loose, defaults, escodegen, esprima, execution, jshint, morph, normalizer, optionsValidator, problems, traceur, transforms, _, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;

  _ = (_ref = (_ref1 = (_ref2 = typeof window !== "undefined" && window !== null ? window._ : void 0) != null ? _ref2 : typeof self !== "undefined" && self !== null ? self._ : void 0) != null ? _ref1 : typeof global !== "undefined" && global !== null ? global._ : void 0) != null ? _ref : require('lodash');

  traceur = (_ref3 = (_ref4 = (_ref5 = typeof window !== "undefined" && window !== null ? window.traceur : void 0) != null ? _ref5 : typeof self !== "undefined" && self !== null ? self.traceur : void 0) != null ? _ref4 : typeof global !== "undefined" && global !== null ? global.traceur : void 0) != null ? _ref3 : require('traceur');

  esprima = require('esprima');

  acorn_loose = require('acorn/acorn_loose');

  jshint = require('jshint').JSHINT;

  normalizer = require('JS_WALA/normalizer/lib/normalizer');

  escodegen = require('escodegen');

  defaults = require('./defaults');

  problems = require('./problems');

  execution = require('./execution');

  morph = require('./morph');

  transforms = require('./transforms');

  optionsValidator = require('./validators/options');

  module.exports = Aether = (function() {
    Aether.defaults = defaults;

    Aether.problems = problems;

    Aether.execution = execution;

    function Aether(options) {
      var optionsValidation;
      this.originalOptions = _.cloneDeep(options);
      if (options == null) {
        options = {};
      }
      if (options.problems == null) {
        options.problems = {};
      }
      if (!options.excludeDefaultProblems) {
        options.problems = _.merge(_.cloneDeep(Aether.problems.problems), options.problems);
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
      this.pure = this.purifyCode(this.raw);
      return this.pure;
    };

    Aether.prototype.addProblem = function(problem, problems) {
      if (problems == null) {
        problems = null;
      }
      if (problem.level === "ignore") {
        return;
      }
      (problems != null ? problems : this.problems)[problem.level + "s"].push(problem);
      return problem;
    };

    Aether.prototype.wrap = function(rawCode) {
      if (this.wrappedCodePrefix == null) {
        this.wrappedCodePrefix = "function " + (this.options.functionName || 'foo') + "(" + (this.options.functionParameters.join(', ')) + ") {\n\"use strict\";\n";
      }
      if (this.wrappedCodeSuffix == null) {
        this.wrappedCodeSuffix = "\n}";
      }
      return this.wrappedCodePrefix + rawCode + this.wrappedCodeSuffix;
    };

    Aether.prototype.lint = function(rawCode) {
      var error, g, jshintGlobals, jshintOptions, jshintSuccess, lintProblems, wrappedCode, _i, _len, _ref6;
      wrappedCode = this.wrap(rawCode);
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
      jshintSuccess = jshint(wrappedCode, jshintOptions, jshintGlobals);
      _ref6 = jshint.errors;
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        error = _ref6[_i];
        this.addProblem(new problems.TranspileProblem(this, 'jshint', error.code, error, {}, wrappedCode, this.wrappedCodePrefix), lintProblems);
      }
      return lintProblems;
    };

    Aether.prototype.createFunction = function() {
      var dummyContext, wrapper;
      wrapper = new Function(['_aether'], this.pure);
      dummyContext = {
        Math: Math
      };
      wrapper.call(dummyContext, this);
      return dummyContext[this.options.functionName || 'foo'];
    };

    Aether.prototype.createMethod = function() {
      var func;
      func = this.createFunction();
      if (this.options.thisValue) {
        func = _.bind(func, this.options.thisValue);
      }
      return func;
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

    Aether.prototype.walk = function(node, fn) {
      var child, grandchild, key, _i, _len, _results;
      _results = [];
      for (key in node) {
        child = node[key];
        if (_.isArray(child)) {
          for (_i = 0, _len = child.length; _i < _len; _i++) {
            grandchild = child[_i];
            if (_.isString(grandchild != null ? grandchild.type : void 0)) {
              this.walk(grandchild, fn);
            }
          }
        } else if (_.isString(child != null ? child.type : void 0)) {
          this.walk(child, fn);
        }
        _results.push(fn(child));
      }
      return _results;
    };

    Aether.prototype.traceurify = function(code) {
      var compiler, opts, project, reporter, sourceFile, tree, trees;
      project = new traceur.semantics.symbols.Project('codecombat');
      reporter = new traceur.util.ErrorReporter();
      compiler = new traceur.codegeneration.Compiler(reporter, project);
      sourceFile = new traceur.syntax.SourceFile("randotron_" + Math.random(), code);
      project.addFile(sourceFile);
      trees = compiler.compile_();
      if (reporter.hadError()) {
        console.log("traceur had error trying to compile");
      }
      tree = trees.values()[0];
      opts = {
        showLineNumbers: false
      };
      tree.generatedSource = traceur.outputgeneration.TreeWriter.write(tree, opts);
      return tree.generatedSource;
    };

    Aether.prototype.transform = function(code, transforms, parser, withAST) {
      var options, parse, t, transformedAST, transformedCode, _ref6;
      if (parser == null) {
        parser = "esprima";
      }
      if (withAST == null) {
        withAST = false;
      }
      transformedCode = morph(code, (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = transforms.length; _i < _len; _i++) {
          t = transforms[_i];
          _results.push(_.bind(t, this));
        }
        return _results;
      }).call(this), parser);
      if (!withAST) {
        return transformedCode;
      }
      _ref6 = (function() {
        switch (parser) {
          case "esprima":
            return [
              esprima.parse, {
                loc: true,
                range: true,
                raw: true,
                comment: true,
                tolerant: true
              }
            ];
          case "acorn_loose":
            return [
              acorn_loose.parse_dammit, {
                locations: true,
                tabSize: 4,
                ecmaVersion: 5
              }
            ];
        }
      })(), parse = _ref6[0], options = _ref6[1];
      transformedAST = parse(transformedCode, options);
      return [transformedCode, transformedAST];
    };

    Aether.prototype.purifyCode = function(rawCode) {
      var error, instrumentedCode, normalized, normalizedAST, normalizedCode, normalizedNodeIndex, normalizedSourceMap, originalNodeRanges, postNormalizationTransforms, preNormalizationTransforms, preprocessedCode, problem, traceuredCode, transformedAST, transformedCode, wrappedCode, _ref6, _ref7, _ref8;
      preprocessedCode = this.checkCommonMistakes(rawCode);
      wrappedCode = this.wrap(preprocessedCode);
      this.vars = {};
      originalNodeRanges = [];
      preNormalizationTransforms = [transforms.makeGatherNodeRanges(originalNodeRanges, this.wrappedCodePrefix), transforms.makeCheckThisKeywords(this.options.global), transforms.checkIncompleteMembers];
      try {
        _ref6 = this.transform(wrappedCode, preNormalizationTransforms, "esprima", true), transformedCode = _ref6[0], transformedAST = _ref6[1];
      } catch (_error) {
        error = _error;
        problem = new problems.TranspileProblem(this, 'esprima', error.id, error, {}, wrappedCode, '');
        this.addProblem(problem);
        originalNodeRanges.splice();
        _ref7 = this.transform(wrappedCode, preNormalizationTransforms, "acorn_loose", true), transformedCode = _ref7[0], transformedAST = _ref7[1];
      }
      normalizedAST = normalizer.normalize(transformedAST);
      normalizedNodeIndex = [];
      this.walk(normalizedAST, function(node) {
        var pos, _ref8;
        if (!(pos = node != null ? (_ref8 = node.attr) != null ? _ref8.pos : void 0 : void 0)) {
          return;
        }
        node.loc = {
          start: {
            line: 1,
            column: normalizedNodeIndex.length
          },
          end: {
            line: 1,
            column: normalizedNodeIndex.length + 1
          }
        };
        return normalizedNodeIndex.push(node);
      });
      normalized = escodegen.generate(normalizedAST, {
        sourceMap: this.options.functionName || 'foo',
        sourceMapWithCode: true
      });
      normalizedCode = normalized.code;
      normalizedSourceMap = normalized.map;
      postNormalizationTransforms = [];
      if ((_ref8 = this.options.thisValue) != null ? _ref8.validateReturn : void 0) {
        postNormalizationTransforms.unshift(transforms.validateReturns);
      }
      if (this.options.yieldConditionally) {
        postNormalizationTransforms.unshift(transforms.yieldConditionally);
      }
      if (this.options.yieldAutomatically) {
        postNormalizationTransforms.unshift(transforms.yieldAutomatically);
      }
      if (this.options.includeMetrics || this.options.includeFlow) {
        postNormalizationTransforms.unshift(transforms.makeInstrumentStatements());
      }
      postNormalizationTransforms.unshift(transforms.makeFindOriginalNodes(originalNodeRanges, this.wrappedCodePrefix, wrappedCode, normalizedSourceMap, normalizedNodeIndex));
      instrumentedCode = this.transform(normalizedCode, postNormalizationTransforms);
      traceuredCode = this.traceurify("return " + instrumentedCode);
      if (false) {
        console.log("---NODE RANGES---:\n" + _.map(originalNodeRanges, function(n) {
          return "" + n.originalRange.start + " - " + n.originalRange.end + "\t" + (n.originalSource.replace(/\n/g, '↵'));
        }).join('\n'));
        console.log("---RAW CODE----: " + (rawCode.split('\n').length) + "\n", {
          code: rawCode
        });
        console.log("---WRAPPED-----: " + (wrappedCode.split('\n').length) + "\n", {
          code: wrappedCode
        });
        console.log("---TRANSFORMED-: " + (transformedCode.split('\n').length) + "\n", {
          code: transformedCode
        });
        console.log("---NORMALIZED--: " + (normalizedCode.split('\n').length) + "\n", {
          code: normalizedCode
        });
        console.log("---INSTRUMENTED: " + (instrumentedCode.split('\n').length) + "\n", {
          code: "return " + instrumentedCode
        });
        console.log("---TRACEURED---: " + (traceuredCode.split('\n').length) + "\n", {
          code: traceuredCode
        });
      }
      return traceuredCode;
    };

    Aether.prototype.getLineNumberForPlannedMethod = function(plannedMethod, numMethodsSeen) {
      var j, lineNumber, method, methods, n, _i, _j, _len, _len1, _ref6;
      n = 0;
      _ref6 = [];
      for (lineNumber = _i = 0, _len = _ref6.length; _i < _len; lineNumber = ++_i) {
        methods = _ref6[lineNumber];
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

    Aether.getFunctionBody = function(func) {
      var indent, line, lines, source;
      source = _.isString(func) ? func : func.toString();
      source = source.substring(source.indexOf('{') + 1, source.lastIndexOf('}')).trim();
      lines = source.split(/\r?\n/);
      indent = lines.length ? lines[0].length - lines[0].replace(/^ +/, '').length : 0;
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

    /* Flow -- put somewhere else?*/


    Aether.prototype.logStatement = function(start, end, source) {
      var m, rangeID, _base;
      rangeID = start + '-' + end;
      m = (_base = this.metrics)[rangeID] != null ? (_base = this.metrics)[rangeID] : _base[rangeID] = {};
      if (m.executions == null) {
        m.executions = 0;
      }
      ++m.executions;
      return console.log("Logged", rangeID, source);
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
