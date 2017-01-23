(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["filbert"] = factory();
	else
		root["filbert"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Sk = __webpack_require__(1);
	var transform = __webpack_require__(2);
	var improveError = __webpack_require__(3);

	var defaultOptions = {
		locations: true,
		ranges: true,
		sippets: true,
		filename: 'file.py',
		useLet: false,
		friendlyErrors: true
	};

	function rangeToLoc(x, offsets) {
		var best = -1;
		for ( var i = 0; i < offsets.length; ++i ) {
			if ( offsets[i] > x ) break;
			best = i;
		}
		var off = best >= 0 ? offsets[best] : 0;
		return {line: best+2, column: x - off, pos: x };
	}

	function locToRange(line, col, offsets) {
		var loff = 0;
		if ( line > 2 && (line-2) < offsets.length ) loff = offsets[line-2];
		return loff + col;
	}

	function decorate(n, code, offsets, options) {
		var numrange = locToRange(n.lineno, n.col_offset, offsets);

		var range = [
			numrange === numrange ? numrange : Infinity,
			numrange === numrange ? numrange : -Infinity
		];
		
		if ( n.value ) range[1] += (n.value.length);

		if ( n.children )
		for ( var i = 0; i < n.children.length; ++i ) {
			var r = decorate(n.children[i], code, offsets, options);
			range[0] = Math.min(range[0], r[0]);
			range[1] = Math.max(range[1], r[1]);
		}

		if ( options.ranges ) n.range = range;
		if ( options.locations ) {
			n.loc = {
				start: rangeToLoc(range[0], offsets),
				end: rangeToLoc(range[1], offsets),
			};
		}
		if ( options.snippets ) n.str = code.substring(range[0], range[1]);

		return range;
	}

	function parser(code, options) {
		var lineOffsets = [];
		var idx = -1;
		var parse, ast;
		options = options || {};
		for ( var opt in defaultOptions ) {
			if ( !(opt in options) ) options[opt] = defaultOptions[opt];
		}

		while ( true ) {
			idx = code.indexOf("\n", idx+1);
			if ( idx < 0 ) break;
			lineOffsets.push(idx+1);
		}

		try {
			parse = Sk.parse(options.filename, code);
			decorate(parse.cst, code, lineOffsets, options);
			parse.flags = parse.flags | Sk.Parser.CO_FUTURE_UNICODE_LITERALS; //Enable future unicode literals
			ast = Sk.astFromParse(parse.cst, options.filename, parse.flags);
		} catch ( e ) {
			if ( e.extra && e.extra.node ) decorate(e.extra.node, code, lineOffsets, options);
			improveError(e, options, code);
			if ( e.loc ) {
				e.pos = locToRange(e.loc.line, e.loc.column, lineOffsets);
			}
			throw e;
		}

		//console.log(JSON.stringify(ast, null, "  "));
		var ctx = {varType: (options.useLet ? 'let' : 'var')};
		var js = transform(ast, ctx);
		return js;
	}

	module.exports = {
		parse: parser,
		pythonRuntime: __webpack_require__(4),
		defaultOptions: {runtimeParamName: '__pythonRuntime'}
	};

/***/ },
/* 1 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {
	/* ---- /Users/rob/skulpty/lib/preamble.js ---- */ 

	var goog = {
		global: global
	};

	var COMPILED = false;

	goog.exportSymbol = function() {};
	goog.require = function() {};

	goog.inherits = function(childCtor, parentCtor) {
	  if ( !parentCtor ) throw new Error("Cant inherit from undefined?");
	  /** @constructor */
	  function tempCtor() {};
	  tempCtor.prototype = parentCtor.prototype;
	  childCtor.superClass_ = parentCtor.prototype;
	  childCtor.prototype = new tempCtor();
	  /** @override */
	  childCtor.prototype.constructor = childCtor;
	};

	goog.asserts = {
		assert: function(what, why) {
	        if ( !what ) throw new Error("AssertionFailed:" + why);
	    }
	};

	var Sk = Sk || {};

	Sk.builtin = Sk.builtin  ||  {};

	Sk.builtin.bool = Boolean;
	Sk.builtin.int_ = function Int(x) {
	  this.v = x;
	};

	Sk.builtin.int_.prototype.threshold$ = Infinity;
	Sk.builtin.int_.prototype.valueOf = function() { return this.v.valueOf(); };

	Sk.builtin.tuple = function(x) {
	  this.v = Array.prototype.slice.call(x, 0);
	};
	Sk.builtin.tuple.prototype.sq$length = function() { return this.length; };

	Sk.builtin.float_ = Number;
	Sk.builtin.long = Number;
	Sk.builtin.func = function(fx) { return fx; };


	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/type.js ---- */ 

	if(Sk.builtin === undefined) {
	    Sk.builtin = {};
	}

	/**
	 * Maps Python dunder names to the Skulpt Javascript function names that
	 * implement them.
	 *
	 * Note: __add__, __mul__, and __rmul__ can be used for either numeric or
	 * sequence types. Here, they default to the numeric versions (i.e. nb$add,
	 * nb$multiply, and nb$reflected_multiply). This works because Sk.abstr.binary_op_
	 * checks for the numeric shortcuts and not the sequence shortcuts when computing
	 * a binary operation.
	 *
	 * Because many of these functions are used in contexts in which Skulpt does not
	 * [yet] handle suspensions, the assumption is that they must not suspend. However,
	 * some of these built-in functions are acquiring 'canSuspend' arguments to signal
	 * where this is not the case. These need to be spliced out of the argument list before
	 * it is passed to python. Array values in this map contain [dunderName, argumentIdx],
	 * where argumentIdx specifies the index of the 'canSuspend' boolean argument.
	 *
	 * @type {Object}
	 */
	Sk.dunderToSkulpt = {
	    "__eq__": "ob$eq",
	    "__ne__": "ob$ne",
	    "__lt__": "ob$lt",
	    "__le__": "ob$le",
	    "__gt__": "ob$gt",
	    "__ge__": "ob$ge",
	    "__hash__": "tp$hash",
	    "__abs__": "nb$abs",
	    "__neg__": "nb$negative",
	    "__pos__": "nb$positive",
	    "__int__": "nb$int_",
	    "__long__": "nb$lng",
	    "__float__": "nb$float_",
	    "__add__": "nb$add",
	    "__radd__": "nb$reflected_add",
	    "__sub__": "nb$subtract",
	    "__rsub__": "nb$reflected_subtract",
	    "__mul__": "nb$multiply",
	    "__rmul__": "nb$reflected_multiply",
	    "__div__": "nb$divide",
	    "__rdiv__": "nb$reflected_divide",
	    "__floordiv__": "nb$floor_divide",
	    "__rfloordiv__": "nb$reflected_floor_divide",
	    "__mod__": "nb$remainder",
	    "__rmod__": "nb$reflected_remainder",
	    "__divmod__": "nb$divmod",
	    "__rdivmod__": "nb$reflected_divmod",
	    "__pow__": "nb$power",
	    "__rpow__": "nb$reflected_power",
	    "__contains__": "sq$contains",
	    "__len__": ["sq$length", 0]
	};

	/**
	 *
	 * @constructor
	 *
	 * @param {*} name name or object to get type of, if only one arg
	 *
	 * @param {Sk.builtin.tuple=} bases
	 *
	 * @param {Object=} dict
	 *
	 *
	 * This type represents the type of `type'. *Calling* an instance of
	 * this builtin type named "type" creates class objects. The resulting
	 * class objects will have various tp$xyz attributes on them that allow
	 * for the various operations on that object.
	 *
	 * calling the type or calling an instance of the type? or both?
	 */
	Sk.builtin.type = function (name, bases, dict) {
	    var mro;
	    var obj;
	    var klass;
	    var v;
	    if (bases === undefined && dict === undefined) {
	        // 1 arg version of type()
	        // the argument is an object, not a name and returns a type object
	        obj = name;
	        return obj.ob$type;
	    } else {

	        // argument dict must be of type dict
	        if(dict.tp$name !== "dict") {
	            throw new Sk.builtin.TypeError("type() argument 3 must be dict, not " + Sk.abstr.typeName(dict));
	        }

	        // checks if name must be string
	        if(!Sk.builtin.checkString(name)) {
	            throw new Sk.builtin.TypeError("type() argument 1 must be str, not " + Sk.abstr.typeName(name));
	        }

	        // argument bases must be of type tuple
	        if(bases.tp$name !== "tuple") {
	            throw new Sk.builtin.TypeError("type() argument 2 must be tuple, not " + Sk.abstr.typeName(bases));
	        }

	        // type building version of type

	        // dict is the result of running the classes code object
	        // (basically the dict of functions). those become the prototype
	        // object of the class).
	        /**
	        * @constructor
	        */
	        klass = function (kwdict, varargseq, kws, args, canSuspend) {
	            var init;
	            var self = this;
	            var s;
	            var args_copy;
	            if (!(this instanceof klass)) {
	                return new klass(kwdict, varargseq, kws, args, canSuspend);
	            }

	            args = args || [];
	            self["$d"] = new Sk.builtin.dict([]);
	            self["$d"].mp$ass_subscript(new Sk.builtin.str("__dict__"), self["$d"]);

	            if (klass.prototype.tp$base !== undefined) {
	                if (klass.prototype.tp$base.sk$klass) {
	                    klass.prototype.tp$base.call(this, kwdict, varargseq, kws, args.slice(), canSuspend);
	                } else {
	                    // Call super constructor if subclass of a builtin
	                    args_copy = args.slice();
	                    args_copy.unshift(klass, this);
	                    Sk.abstr.superConstructor.apply(undefined, args_copy);
	                }
	            }

	            init = Sk.builtin.type.typeLookup(self.ob$type, "__init__");
	            if (init !== undefined) {
	                // return should be None or throw a TypeError otherwise
	                args.unshift(self);
	                s = Sk.misceval.applyOrSuspend(init, kwdict, varargseq, kws, args);

	                return (function doSusp(s) {
	                    if (s instanceof Sk.misceval.Suspension) {
	                        // TODO I (Meredydd) don't know whether we are ever called
	                        // from anywhere except Sk.misceval.applyOrSuspend().
	                        // If we're not, we don't need a canSuspend parameter at all.
	                        if (canSuspend) {
	                            return new Sk.misceval.Suspension(doSusp, s);
	                        } else {
	                            return Sk.misceval.retryOptionalSuspensionOrThrow(s);
	                        }
	                    } else {
	                        return self;
	                    }
	                })(s);
	            }

	            return self;
	        };

	        var _name = Sk.ffi.remapToJs(name); // unwrap name string to js for latter use

	        var inheritsFromObject = false, inheritsBuiltin = false;

	        if (bases.v.length === 0 && Sk.python3) {
	            // new style class, inherits from object by default
	            inheritsFromObject = true;
	            Sk.abstr.setUpInheritance(_name, klass, Sk.builtin.object);
	        }

	        var parent, it, firstAncestor, builtin_bases = [];
	        // Set up inheritance from any builtins
	        for (it = bases.tp$iter(), parent = it.tp$iternext(); parent !== undefined; parent = it.tp$iternext()) {
	            if (firstAncestor === undefined) {
	                firstAncestor = parent;
	            }
	            if (parent.prototype instanceof Sk.builtin.object || parent === Sk.builtin.object) {

	                while (parent.sk$klass && parent.prototype.tp$base) {
	                    parent = parent.prototype.tp$base;
	                }

	                if (!parent.sk$klass && builtin_bases.indexOf(parent) < 0) {
	                    builtin_bases.push(parent);
	                }

	                // This class inherits from Sk.builtin.object at some level
	                inheritsFromObject = true;
	            }
	        }

	        if (builtin_bases.length > 1) {
	            throw new Sk.builtin.TypeError("Multiple inheritance with more than one builtin type is unsupported");
	        }

	        // Javascript does not support multiple inheritance, so only the first
	        // base (if any) will directly inherit in Javascript
	        if (firstAncestor !== undefined) {
	            goog.inherits(klass, firstAncestor);

	            if (firstAncestor.prototype instanceof Sk.builtin.object || firstAncestor === Sk.builtin.object) {
	                klass.prototype.tp$base = firstAncestor;
	            }
	        }

	        klass.prototype.tp$name = _name;
	        klass.prototype.ob$type = Sk.builtin.type.makeIntoTypeObj(_name, klass);

	        if (!inheritsFromObject) {
	            // old style class, does not inherit from object
	            klass.prototype.tp$getattr = Sk.builtin.object.prototype.GenericGetAttr;
	            klass.prototype.tp$setattr = Sk.builtin.object.prototype.GenericSetAttr;
	        }

	        // set __module__ if not present (required by direct type(name, bases, dict) calls)
	        var module_lk = new Sk.builtin.str("__module__");
	        if(dict.mp$lookup(module_lk) === undefined) {
	            dict.mp$ass_subscript(module_lk, Sk.globals["__name__"]);
	        }

	        // copy properties into our klass object
	        // uses python iter methods
	        var k;
	        for (it = dict.tp$iter(), k = it.tp$iternext(); k !== undefined; k = it.tp$iternext()) {
	            v = dict.mp$subscript(k);
	            if (v === undefined) {
	                v = null;
	            }
	            klass.prototype[k.v] = v;
	            klass[k.v] = v;
	        }

	        klass["__class__"] = klass;
	        klass["__name__"] = name;
	        klass.sk$klass = true;
	        klass.prototype.tp$descr_get = function () {
	            goog.asserts.fail("in type tp$descr_get");
	        };
	        klass.prototype["$r"] = function () {
	            var cname;
	            var mod;
	            // TODO use Sk.abstr.gattr() here so __repr__ can be dynamically provided (eg by __getattr__())
	            var reprf = this.tp$getattr("__repr__");
	            if (reprf !== undefined && reprf.im_func !== Sk.builtin.object.prototype["__repr__"]) {
	                return Sk.misceval.apply(reprf, undefined, undefined, undefined, []);
	            }

	            if ((klass.prototype.tp$base !== undefined) &&
	                (klass.prototype.tp$base !== Sk.builtin.object) &&
	                (klass.prototype.tp$base.prototype["$r"] !== undefined)) {
	                // If subclass of a builtin which is not object, use that class' repr
	                return klass.prototype.tp$base.prototype["$r"].call(this);
	            } else {
	                // Else, use default repr for a user-defined class instance
	                mod = dict.mp$subscript(module_lk); // lookup __module__
	                cname = "";
	                if (mod) {
	                    cname = mod.v + ".";
	                }
	                return new Sk.builtin.str("<" + cname + _name + " object>");
	            }
	        };
	        klass.prototype.tp$str = function () {
	            // TODO use Sk.abstr.gattr() here so __str__ can be dynamically provided (eg by __getattr__())
	            var strf = this.tp$getattr("__str__");
	            if (strf !== undefined && strf.im_func !== Sk.builtin.object.prototype["__str__"]) {
	                return Sk.misceval.apply(strf, undefined, undefined, undefined, []);
	            }
	            if ((klass.prototype.tp$base !== undefined) &&
	                (klass.prototype.tp$base !== Sk.builtin.object) &&
	                (klass.prototype.tp$base.prototype.tp$str !== undefined)) {
	                // If subclass of a builtin which is not object, use that class' repr
	                return klass.prototype.tp$base.prototype.tp$str.call(this);
	            }
	            return this["$r"]();
	        };
	        klass.prototype.tp$length = function (canSuspend) {
	            var r = Sk.misceval.chain(Sk.abstr.gattr(this, "__len__", canSuspend), function(lenf) {
	                return Sk.misceval.applyOrSuspend(lenf, undefined, undefined, undefined, []);
	            });
	            return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	        };
	        klass.prototype.tp$call = function (args, kw) {
	            return Sk.misceval.chain(Sk.abstr.gattr(this, "__call__", true), function(callf) {
	                return Sk.misceval.applyOrSuspend(callf, undefined, undefined, kw, args);
	            });
	        };
	        klass.prototype.tp$iter = function () {
	            var iterf = Sk.abstr.gattr(this, "__iter__", false);
	            return Sk.misceval.callsim(iterf);
	        };
	        klass.prototype.tp$iternext = function (canSuspend) {
	            var self = this;
	            var r = Sk.misceval.chain(
	                Sk.misceval.tryCatch(function() {
	                    return Sk.abstr.gattr(self, "next", canSuspend);
	                }, function(e) {
	                    if (e instanceof Sk.builtin.AttributeError) {
	                        throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(self) + "' object is not iterable");
	                    } else {
	                        throw e;
	                    }
	                }),
	            function(/** {Object} */ iternextf) {
	                return Sk.misceval.tryCatch(function() {
	                    return Sk.misceval.callsimOrSuspend(iternextf);
	                }, function(e) {
	                    if (e instanceof Sk.builtin.StopIteration) {
	                        return undefined;
	                    } else {
	                        throw e;
	                    }
	                });
	            });

	            return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	        };

	        klass.prototype.tp$getitem = function (key, canSuspend) {
	            var getf = Sk.abstr.gattr(this, "__getitem__", canSuspend), r;
	            if (getf !== undefined) {
	                r = Sk.misceval.applyOrSuspend(getf, undefined, undefined, undefined, [key]);
	                return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	            }
	            throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(this) + "' object does not support indexing");
	        };
	        klass.prototype.tp$setitem = function (key, value, canSuspend) {
	            var setf = Sk.abstr.gattr(this, "__setitem__", canSuspend), r;
	            if (setf !== undefined) {
	                r = Sk.misceval.applyOrSuspend(setf, undefined, undefined, undefined, [key, value]);
	                return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	            }
	            throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(this) + "' object does not support item assignment");
	        };

	        if (bases) {
	            //print("building mro for", name);
	            //for (var i = 0; i < bases.length; ++i)
	            //print("base[" + i + "]=" + bases[i].tp$name);
	            klass["$d"] = new Sk.builtin.dict([]);
	            klass["$d"].mp$ass_subscript(Sk.builtin.type.basesStr_, bases);
	            mro = Sk.builtin.type.buildMRO(klass);
	            klass["$d"].mp$ass_subscript(Sk.builtin.type.mroStr_, mro);
	            klass.tp$mro = mro;
	            //print("mro result", Sk.builtin.repr(mro).v);
	        }

	        // fix for class attributes
	        klass.tp$setattr = Sk.builtin.type.prototype.tp$setattr;

	        var shortcutDunder = function (skulpt_name, magic_name, magic_func, canSuspendIdx) {
	            klass.prototype[skulpt_name] = function () {
	                var args = Array.prototype.slice.call(arguments), canSuspend;
	                args.unshift(magic_func, this);

	                if (canSuspendIdx) {
	                    canSuspend = args[canSuspendIdx+1];
	                    args.splice(canSuspendIdx+1, 1);
	                    if (canSuspend) {
	                        return Sk.misceval.callsimOrSuspend.apply(undefined, args);
	                    }
	                }
	                return Sk.misceval.callsim.apply(undefined, args);
	            };
	        };

	        // Register skulpt shortcuts to magic methods defined by this class.
	        // TODO: This is somewhat problematic, as it means that dynamically defined
	        // methods (eg those returned by __getattr__()) cannot be used by these magic
	        // functions.
	        var dunder, skulpt_name, canSuspendIdx;
	        for (dunder in Sk.dunderToSkulpt) {
	            skulpt_name = Sk.dunderToSkulpt[dunder];
	            if (typeof(skulpt_name) === "string") {
	                canSuspendIdx = null;
	            } else {
	                canSuspendIdx = skulpt_name[1];
	                skulpt_name = skulpt_name[0];
	            }

	            if (klass[dunder]) {
	                // scope workaround
	                shortcutDunder(skulpt_name, dunder, klass[dunder], canSuspendIdx);
	            }
	        }

	        return klass;
	    }

	};

	/**
	 *
	 */
	Sk.builtin.type.makeTypeObj = function (name, newedInstanceOfType) {
	    Sk.builtin.type.makeIntoTypeObj(name, newedInstanceOfType);
	    return newedInstanceOfType;
	};

	Sk.builtin.type.makeIntoTypeObj = function (name, t) {
	    goog.asserts.assert(name !== undefined);
	    goog.asserts.assert(t !== undefined);
	    t.ob$type = Sk.builtin.type;
	    t.tp$name = name;
	    t["$r"] = function () {
	        var ctype;
	        var mod = t.__module__;
	        var cname = "";
	        if (mod) {
	            cname = mod.v + ".";
	        }
	        ctype = "class";
	        if (!mod && !t.sk$klass && !Sk.python3) {
	            ctype = "type";
	        }
	        return new Sk.builtin.str("<" + ctype + " '" + cname + t.tp$name + "'>");
	    };
	    t.tp$str = undefined;
	    t.tp$getattr = Sk.builtin.type.prototype.tp$getattr;
	    t.tp$setattr = Sk.builtin.object.prototype.GenericSetAttr;
	    t.tp$richcompare = Sk.builtin.type.prototype.tp$richcompare;
	    t.sk$type = true;

	    return t;
	};

	Sk.builtin.type.ob$type = Sk.builtin.type;
	Sk.builtin.type.tp$name = "type";
	Sk.builtin.type["$r"] = function () {
	    if(Sk.python3) {
	        return new Sk.builtin.str("<class 'type'>");
	    } else {
	        return new Sk.builtin.str("<type 'type'>");
	    }
	};

	//Sk.builtin.type.prototype.tp$descr_get = function() { print("in type descr_get"); };

	//Sk.builtin.type.prototype.tp$name = "type";

	// basically the same as GenericGetAttr except looks in the proto instead
	Sk.builtin.type.prototype.tp$getattr = function (name) {
	    var res;
	    var tp = this;
	    var descr;
	    var f;

	    if (this["$d"]) {
	        res = this["$d"].mp$lookup(new Sk.builtin.str(name));
	        if (res !== undefined) {
	            return res;
	        }
	    }

	    descr = Sk.builtin.type.typeLookup(tp, name);

	    //print("type.tpgetattr descr", descr, descr.tp$name, descr.func_code, name);
	    if (descr !== undefined && descr !== null && descr.ob$type !== undefined) {
	        f = descr.ob$type.tp$descr_get;
	        // todo;if (f && descr.tp$descr_set) // is a data descriptor if it has a set
	        // return f.call(descr, this, this.ob$type);
	    }

	    if (f) {
	        // non-data descriptor
	        return f.call(descr, null, tp);
	    }

	    if (descr !== undefined) {
	        return descr;
	    }

	    return undefined;
	};

	Sk.builtin.type.prototype.tp$setattr = function (name, value) {
	    // class attributes are direct properties of the object
	    this[name] = value;
	};

	Sk.builtin.type.typeLookup = function (type, name) {
	    var mro = type.tp$mro;
	    var pyname = new Sk.builtin.str(name);
	    var base;
	    var res;
	    var i;

	    // todo; probably should fix this, used for builtin types to get stuff
	    // from prototype
	    if (!mro) {
	        if (type.prototype) {
	            return type.prototype[name];
	        }
	        return undefined;
	    }

	    for (i = 0; i < mro.v.length; ++i) {
	        base = mro.v[i];
	        if (base.hasOwnProperty(name)) {
	            return base[name];
	        }
	        res = base["$d"].mp$lookup(pyname);
	        if (res !== undefined) {
	            return res;
	        }
	        if (base.prototype && base.prototype[name] !== undefined) {
	            return base.prototype[name];
	        }
	    }

	    return undefined;
	};

	Sk.builtin.type.mroMerge_ = function (seqs) {
	    /*
	     var tmp = [];
	     for (var i = 0; i < seqs.length; ++i)
	     {
	     tmp.push(new Sk.builtin.list(seqs[i]));
	     }
	     print(Sk.builtin.repr(new Sk.builtin.list(tmp)).v);
	     */
	    var seq;
	    var i;
	    var next;
	    var k;
	    var sseq;
	    var j;
	    var cand;
	    var cands;
	    var res = [];
	    for (; ;) {
	        for (i = 0; i < seqs.length; ++i) {
	            seq = seqs[i];
	            if (seq.length !== 0) {
	                break;
	            }
	        }
	        if (i === seqs.length) { // all empty
	            return res;
	        }
	        cands = [];
	        for (i = 0; i < seqs.length; ++i) {
	            seq = seqs[i];
	            //print("XXX", Sk.builtin.repr(new Sk.builtin.list(seq)).v);
	            if (seq.length !== 0) {
	                cand = seq[0];
	                //print("CAND", Sk.builtin.repr(cand).v);
	                OUTER:
	                    for (j = 0; j < seqs.length; ++j) {
	                        sseq = seqs[j];
	                        for (k = 1; k < sseq.length; ++k) {
	                            if (sseq[k] === cand) {
	                                break OUTER;
	                            }
	                        }
	                    }

	                // cand is not in any sequences' tail -> constraint-free
	                if (j === seqs.length) {
	                    cands.push(cand);
	                }
	            }
	        }

	        if (cands.length === 0) {
	            throw new Sk.builtin.TypeError("Inconsistent precedences in type hierarchy");
	        }

	        next = cands[0];
	        // append next to result and remove from sequences
	        res.push(next);
	        for (i = 0; i < seqs.length; ++i) {
	            seq = seqs[i];
	            if (seq.length > 0 && seq[0] === next) {
	                seq.splice(0, 1);
	            }
	        }
	    }
	};

	Sk.builtin.type.buildMRO_ = function (klass) {
	    // MERGE(klass + mro(bases) + bases)
	    var i;
	    var bases;
	    var all = [
	        [klass]
	    ];

	    //Sk.debugout("buildMRO for", klass.tp$name);

	    var kbases = klass["$d"].mp$subscript(Sk.builtin.type.basesStr_);
	    for (i = 0; i < kbases.v.length; ++i) {
	        all.push(Sk.builtin.type.buildMRO_(kbases.v[i]));
	    }

	    bases = [];
	    for (i = 0; i < kbases.v.length; ++i) {
	        bases.push(kbases.v[i]);
	    }
	    all.push(bases);

	    return Sk.builtin.type.mroMerge_(all);
	};

	/*
	 * C3 MRO (aka CPL) linearization. Figures out which order to search through
	 * base classes to determine what should override what. C3 does the "right
	 * thing", and it's what Python has used since 2.3.
	 *
	 * Kind of complicated to explain, but not really that complicated in
	 * implementation. Explanations:
	 *
	 * http://people.csail.mit.edu/jrb/goo/manual.43/goomanual_55.html
	 * http://www.python.org/download/releases/2.3/mro/
	 * http://192.220.96.201/dylan/linearization-oopsla96.html
	 *
	 * This implementation is based on a post by Samuele Pedroni on python-dev
	 * (http://mail.python.org/pipermail/python-dev/2002-October/029176.html) when
	 * discussing its addition to Python.
	 */
	Sk.builtin.type.buildMRO = function (klass) {
	    return new Sk.builtin.tuple(Sk.builtin.type.buildMRO_(klass));
	};

	Sk.builtin.type.prototype.tp$richcompare = function (other, op) {
	    var r2;
	    var r1;
	    if (other.ob$type != Sk.builtin.type) {
	        return undefined;
	    }
	    if (!this["$r"] || !other["$r"]) {
	        return undefined;
	    }
	    r1 = new Sk.builtin.str(this["$r"]().v.slice(1,6));
	    r2 = new Sk.builtin.str(other["$r"]().v.slice(1,6));
	    if (this["$r"]().v.slice(1,6) !== "class") {
	        r1 = this["$r"]();
	        r2 = other["$r"]();
	    }
	    return r1.tp$richcompare(r2, op);
	};



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/abstract.js ---- */ 

	/**
	 * @namespace Sk.abstr
	 *
	 */
	Sk.abstr = {};

	//
	// Number
	//

	Sk.abstr.typeName = function (v) {
	    var vtypename;
	    if (v.tp$name !== undefined) {
	        vtypename = v.tp$name;
	    } else {
	        vtypename = "<invalid type>";
	    }
	    return vtypename;
	};

	Sk.abstr.binop_type_error = function (v, w, name) {
	    var vtypename = Sk.abstr.typeName(v),
	        wtypename = Sk.abstr.typeName(w);

	    throw new Sk.builtin.TypeError("unsupported operand type(s) for " + name + ": '" + vtypename + "' and '" + wtypename + "'");
	};

	Sk.abstr.unop_type_error = function (v, name) {
	    var vtypename = Sk.abstr.typeName(v),
	        uop = {
	            "UAdd"  : "+",
	            "USub"  : "-",
	            "Invert": "~"
	        }[name];

	    throw new Sk.builtin.TypeError("bad operand type for unary " + uop + ": '" + vtypename + "'");
	};

	/**
	 * lookup and return the LHS object slot function method.  This coudl be either a builtin slot function or a dunder method defined by the user.
	 * @param obj
	 * @param name
	 * @returns {Object|null|undefined}
	 * @private
	 */
	Sk.abstr.boNameToSlotFuncLhs_ = function (obj, name) {
	    if (obj === null) {
	        return undefined;
	    }

	    switch (name) {
	    case "Add":
	        return obj.nb$add ? obj.nb$add : obj["__add__"];
	    case "Sub":
	        return obj.nb$subtract ? obj.nb$subtract : obj["__sub__"];
	    case "Mult":
	        return obj.nb$multiply ? obj.nb$multiply : obj["__mul__"];
	    case "Div":
	        return obj.nb$divide ? obj.nb$divide : obj["__div__"];
	    case "FloorDiv":
	        return obj.nb$floor_divide ? obj.nb$floor_divide : obj["__floordiv__"];
	    case "Mod":
	        return obj.nb$remainder ? obj.nb$remainder : obj["__mod__"];
	    case "DivMod":
	        return obj.nb$divmod ? obj.nb$divmod : obj["__divmod__"];
	    case "Pow":
	        return obj.nb$power ? obj.nb$power : obj["__pow__"];
	    case "LShift":
	        return obj.nb$lshift ? obj.nb$lshift : obj["__lshift__"];
	    case "RShift":
	        return obj.nb$rshift ? obj.nb$rshift : obj["__rshift__"];
	    case "BitAnd":
	        return obj.nb$and ? obj.nb$and : obj["__and__"];
	    case "BitXor":
	        return obj.nb$xor ? obj.nb$xor : obj["__xor__"];
	    case "BitOr":
	        return obj.nb$or ? obj.nb$or : obj["__or__"];
	    }
	};

	Sk.abstr.boNameToSlotFuncRhs_ = function (obj, name) {
	    if (obj === null) {
	        return undefined;
	    }

	    switch (name) {
	    case "Add":
	        return obj.nb$reflected_add ? obj.nb$reflected_add : obj["__radd__"];
	    case "Sub":
	        return obj.nb$reflected_subtract ? obj.nb$reflected_subtract : obj["__rsub__"];
	    case "Mult":
	        return obj.nb$reflected_multiply ? obj.nb$reflected_multiply : obj["__rmul__"];
	    case "Div":
	        return obj.nb$reflected_divide ? obj.nb$reflected_divide : obj["__rdiv__"];
	    case "FloorDiv":
	        return obj.nb$reflected_floor_divide ? obj.nb$reflected_floor_divide : obj["__rfloordiv__"];
	    case "Mod":
	        return obj.nb$reflected_remainder ? obj.nb$reflected_remainder : obj["__rmod__"];
	    case "DivMod":
	        return obj.nb$reflected_divmod ? obj.nb$reflected_divmod : obj["__rdivmod__"];
	    case "Pow":
	        return obj.nb$reflected_power ? obj.nb$reflected_power : obj["__rpow__"];
	    case "LShift":
	        return obj.nb$reflected_lshift ? obj.nb$reflected_lshift : obj["__rlshift__"];
	    case "RShift":
	        return obj.nb$reflected_rshift ? obj.nb$reflected_rshift : obj["__rrshift__"];
	    case "BitAnd":
	        return obj.nb$reflected_and ? obj.nb$reflected_and : obj["__rand__"];
	    case "BitXor":
	        return obj.nb$reflected_xor ? obj.nb$reflected_xor : obj["__rxor__"];
	    case "BitOr":
	        return obj.nb$reflected_or ? obj.nb$reflected_or : obj["__ror__"];
	    }
	};

	Sk.abstr.iboNameToSlotFunc_ = function (obj, name) {
	    switch (name) {
	    case "Add":
	        return obj.nb$inplace_add ? obj.nb$inplace_add : obj["__iadd__"];
	    case "Sub":
	        return obj.nb$inplace_subtract ? obj.nb$inplace_subtract : obj["__isub__"];
	    case "Mult":
	        return obj.nb$inplace_multiply ? obj.nb$inplace_multiply : obj["__imul__"];
	    case "Div":
	        return obj.nb$inplace_divide ? obj.nb$inplace_divide : obj["__idiv__"];
	    case "FloorDiv":
	        return obj.nb$inplace_floor_divide ? obj.nb$inplace_floor_divide : obj["__ifloordiv__"];
	    case "Mod":
	        return obj.nb$inplace_remainder;
	    case "Pow":
	        return obj.nb$inplace_power;
	    case "LShift":
	        return obj.nb$inplace_lshift ? obj.nb$inplace_lshift : obj["__ilshift__"];
	    case "RShift":
	        return obj.nb$inplace_rshift ? obj.nb$inplace_rshift : obj["__irshift__"];
	    case "BitAnd":
	        return obj.nb$inplace_and;
	    case "BitOr":
	        return obj.nb$inplace_or;
	    case "BitXor":
	        return obj.nb$inplace_xor ? obj.nb$inplace_xor : obj["__ixor__"];
	    }
	};
	Sk.abstr.uoNameToSlotFunc_ = function (obj, name) {
	    if (obj === null) {
	        return undefined;
	    }
	    switch (name) {
	    case "USub":
	        return obj.nb$negative ? obj.nb$negative : obj["__neg__"];
	    case "UAdd":
	        return obj.nb$positive ? obj.nb$positive : obj["__pos__"];
	    case "Invert":
	        return obj.nb$invert ? obj.nb$invert : obj["__invert__"];
	    }
	};

	Sk.abstr.binary_op_ = function (v, w, opname) {
	    var wop;
	    var ret;
	    var vop;

	    // All Python inheritance is now enforced with Javascript inheritance
	    // (see Sk.abstr.setUpInheritance). This checks if w's type is a strict
	    // subclass of v's type
	    var w_is_subclass = w.constructor.prototype instanceof v.constructor;

	    // From the Python 2.7 docs:
	    //
	    // "If the right operand’s type is a subclass of the left operand’s type and
	    // that subclass provides the reflected method for the operation, this
	    // method will be called before the left operand’s non-reflected method.
	    // This behavior allows subclasses to override their ancestors’ operations."
	    //
	    // -- https://docs.python.org/2/reference/datamodel.html#index-92

	    if (w_is_subclass) {
	        wop = Sk.abstr.boNameToSlotFuncRhs_(w, opname);
	        if (wop !== undefined) {
	            if (wop.call) {
	                ret = wop.call(w, v);
	            } else {
	                ret = Sk.misceval.callsim(wop, w, v);
	            }
	            if (ret !== undefined && ret !== Sk.builtin.NotImplemented.NotImplemented$) {
	                return ret;
	            }
	        }
	    }

	    vop = Sk.abstr.boNameToSlotFuncLhs_(v, opname);
	    if (vop !== undefined) {
	        if (vop.call) {
	            ret = vop.call(v, w);
	        } else {
	            ret = Sk.misceval.callsim(vop, v, w);
	        }
	        if (ret !== undefined && ret !== Sk.builtin.NotImplemented.NotImplemented$) {
	            return ret;
	        }
	    }
	    // Don't retry RHS if failed above
	    if (!w_is_subclass) {
	        wop = Sk.abstr.boNameToSlotFuncRhs_(w, opname);
	        if (wop !== undefined) {
	            if (wop.call) {
	                ret = wop.call(w, v);
	            } else {
	                ret = Sk.misceval.callsim(wop, w, v);
	            }
	            if (ret !== undefined && ret !== Sk.builtin.NotImplemented.NotImplemented$) {
	                return ret;
	            }
	        }
	    }
	    Sk.abstr.binop_type_error(v, w, opname);
	};

	Sk.abstr.binary_iop_ = function (v, w, opname) {
	    var wop;
	    var ret;
	    var vop = Sk.abstr.iboNameToSlotFunc_(v, opname);
	    if (vop !== undefined) {
	        if (vop.call) {
	            ret = vop.call(v, w);
	        } else {  // assume that vop is an __xxx__ type method
	            ret = Sk.misceval.callsim(vop, v, w); //  added to be like not-in-place... is this okay?
	        }
	        if (ret !== undefined && ret !== Sk.builtin.NotImplemented.NotImplemented$) {
	            return ret;
	        }
	    }
	    wop = Sk.abstr.iboNameToSlotFunc_(w, opname);
	    if (wop !== undefined) {
	        if (wop.call) {
	            ret = wop.call(w, v);
	        } else { // assume that wop is an __xxx__ type method
	            ret = Sk.misceval.callsim(wop, w, v); //  added to be like not-in-place... is this okay?
	        }
	        if (ret !== undefined && ret !== Sk.builtin.NotImplemented.NotImplemented$) {
	            return ret;
	        }
	    }
	    Sk.abstr.binop_type_error(v, w, opname);
	};
	Sk.abstr.unary_op_ = function (v, opname) {
	    var ret;
	    var vop = Sk.abstr.uoNameToSlotFunc_(v, opname);
	    if (vop !== undefined) {
	        if (vop.call) {
	            ret = vop.call(v);
	        } else {  // assume that vop is an __xxx__ type method
	            ret = Sk.misceval.callsim(vop, v); //  added to be like not-in-place... is this okay?
	        }
	        if (ret !== undefined) {
	            return ret;
	        }
	    }
	    Sk.abstr.unop_type_error(v, opname);
	};

	//
	// handle upconverting a/b from number to long if op causes too big/small a
	// result, or if either of the ops are already longs
	Sk.abstr.numOpAndPromote = function (a, b, opfn) {
	    var tmp;
	    var ans;
	    if (a === null || b === null) {
	        return undefined;
	    }

	    if (typeof a === "number" && typeof b === "number") {
	        ans = opfn(a, b);
	        // todo; handle float   Removed RNL (bugs in lng, and it should be a question of precision, not magnitude -- this was just wrong)
	        if ((ans > Sk.builtin.int_.threshold$ || ans < -Sk.builtin.int_.threshold$) && Math.floor(ans) === ans) {
	            return [Sk.builtin.lng.fromInt$(a), Sk.builtin.lng.fromInt$(b)];
	        } else {
	            return ans;
	        }
	    } else if (a === undefined || b === undefined) {
	        throw new Sk.builtin.NameError("Undefined variable in expression");
	    }

	    if (a.constructor === Sk.builtin.lng) {
	        return [a, b];
	    } else if ((a.constructor === Sk.builtin.int_ ||
	                a.constructor === Sk.builtin.float_) &&
	                b.constructor === Sk.builtin.complex) {
	        // special case of upconverting nmber and complex
	        // can we use here the Sk.builtin.checkComplex() method?
	        tmp = new Sk.builtin.complex(a);
	        return [tmp, b];
	    } else if (a.constructor === Sk.builtin.int_ ||
	               a.constructor === Sk.builtin.float_) {
	        return [a, b];
	    } else if (typeof a === "number") {
	        tmp = Sk.builtin.assk$(a);
	        return [tmp, b];
	    } else {
	        return undefined;
	    }
	};

	Sk.abstr.boNumPromote_ = {
	    "Add"     : function (a, b) {
	        return a + b;
	    },
	    "Sub"     : function (a, b) {
	        return a - b;
	    },
	    "Mult"    : function (a, b) {
	        return a * b;
	    },
	    "Mod"     : function (a, b) {
	        var m;
	        if (b === 0) {
	            throw new Sk.builtin.ZeroDivisionError("division or modulo by zero");
	        }
	        m = a % b;
	        return ((m * b) < 0 ? (m + b) : m);
	    },
	    "Div"     : function (a, b) {
	        if (b === 0) {
	            throw new Sk.builtin.ZeroDivisionError("division or modulo by zero");
	        } else {
	            return a / b;
	        }
	    },
	    "FloorDiv": function (a, b) {
	        if (b === 0) {
	            throw new Sk.builtin.ZeroDivisionError("division or modulo by zero");
	        } else {
	            return Math.floor(a / b);
	        } // todo; wrong? neg?
	    },
	    "Pow"     : Math.pow,
	    "BitAnd"  : function (a, b) {
	        var m = a & b;
	        if (m < 0) {
	            m = m + 4294967296; // convert back to unsigned
	        }
	        return m;
	    },
	    "BitOr"   : function (a, b) {
	        var m = a | b;
	        if (m < 0) {
	            m = m + 4294967296; // convert back to unsigned
	        }
	        return m;
	    },
	    "BitXor"  : function (a, b) {
	        var m = a ^ b;
	        if (m < 0) {
	            m = m + 4294967296; // convert back to unsigned
	        }
	        return m;
	    },
	    "LShift"  : function (a, b) {
	        var m;
	        if (b < 0) {
	            throw new Sk.builtin.ValueError("negative shift count");
	        }
	        m = a << b;
	        if (m > a) {
	            return m;
	        } else {
	            // Fail, this will get recomputed with longs
	            return a * Math.pow(2, b);
	        }
	    },
	    "RShift"  : function (a, b) {
	        var m;
	        if (b < 0) {
	            throw new Sk.builtin.ValueError("negative shift count");
	        }
	        m = a >> b;
	        if ((a > 0) && (m < 0)) {
	            // fix incorrect sign extension
	            m = m & (Math.pow(2, 32 - b) - 1);
	        }
	        return m;
	    }
	};

	Sk.abstr.numberBinOp = function (v, w, op) {
	    var tmp;
	    var numPromoteFunc = Sk.abstr.boNumPromote_[op];
	    if (numPromoteFunc !== undefined) {
	        tmp = Sk.abstr.numOpAndPromote(v, w, numPromoteFunc);
	        if (typeof tmp === "number") {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.int_) {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.float_) {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.lng) {
	            return tmp;
	        } else if (tmp !== undefined) {
	            v = tmp[0];
	            w = tmp[1];
	        }
	    }

	    return Sk.abstr.binary_op_(v, w, op);
	};
	goog.exportSymbol("Sk.abstr.numberBinOp", Sk.abstr.numberBinOp);

	Sk.abstr.numberInplaceBinOp = function (v, w, op) {
	    var tmp;
	    var numPromoteFunc = Sk.abstr.boNumPromote_[op];
	    if (numPromoteFunc !== undefined) {
	        tmp = Sk.abstr.numOpAndPromote(v, w, numPromoteFunc);
	        if (typeof tmp === "number") {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.int_) {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.float_) {
	            return tmp;
	        } else if (tmp !== undefined && tmp.constructor === Sk.builtin.lng) {
	            return tmp;
	        } else if (tmp !== undefined) {
	            v = tmp[0];
	            w = tmp[1];
	        }
	    }

	    return Sk.abstr.binary_iop_(v, w, op);
	};
	goog.exportSymbol("Sk.abstr.numberInplaceBinOp", Sk.abstr.numberInplaceBinOp);

	Sk.abstr.numberUnaryOp = function (v, op) {
	    var value;
	    if (op === "Not") {
	        return Sk.misceval.isTrue(v) ? Sk.builtin.bool.false$ : Sk.builtin.bool.true$;
	    } else if (v instanceof Sk.builtin.bool) {
	        value = Sk.builtin.asnum$(v);
	        if (op === "USub") {
	            return new Sk.builtin.int_(-value);
	        }
	        if (op === "UAdd") {
	            return new Sk.builtin.int_(value);
	        }
	        if (op === "Invert") {
	            return new Sk.builtin.int_(~value);
	        }
	    } else {
	        if (op === "USub" && v.nb$negative) {
	            return v.nb$negative();
	        }
	        if (op === "UAdd" && v.nb$positive) {
	            return v.nb$positive();
	        }
	        if (op === "Invert" && v.nb$invert) {
	            return v.nb$invert();
	        }
	    }

	    return Sk.abstr.unary_op_(v, op);
	};
	goog.exportSymbol("Sk.abstr.numberUnaryOp", Sk.abstr.numberUnaryOp);

	//
	// Sequence
	//

	Sk.abstr.fixSeqIndex_ = function (seq, i) {
	    i = Sk.builtin.asnum$(i);
	    if (i < 0 && seq.sq$length) {
	        i += seq.sq$length();
	    }
	    return i;
	};

	/**
	 * @param {*} seq
	 * @param {*} ob
	 * @param {boolean=} canSuspend
	 */
	Sk.abstr.sequenceContains = function (seq, ob, canSuspend) {
	    var seqtypename;
	    var special;
	    var r;

	    if (seq.sq$contains) {
	        return seq.sq$contains(ob);
	    }

	    /**
	     *  Look for special method and call it, we have to distinguish between built-ins and
	     *  python objects
	     */
	    special = Sk.abstr.lookupSpecial(seq, "__contains__");
	    if (special != null) {
	        // method on builtin, provide this arg
	        return Sk.misceval.isTrue(Sk.misceval.callsim(special, seq, ob));
	    }

	    if (!Sk.builtin.checkIterable(seq)) {
	        seqtypename = Sk.abstr.typeName(seq);
	        throw new Sk.builtin.TypeError("argument of type '" + seqtypename + "' is not iterable");
	    }

	    r = Sk.misceval.iterFor(Sk.abstr.iter(seq), function(i) {
	        if (Sk.misceval.richCompareBool(i, ob, "Eq")) {
	            return new Sk.misceval.Break(true);
	        } else {
	            return false;
	        }
	    }, false);

	    return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	};

	Sk.abstr.sequenceConcat = function (seq1, seq2) {
	    var seq1typename;
	    if (seq1.sq$concat) {
	        return seq1.sq$concat(seq2);
	    }
	    seq1typename = Sk.abstr.typeName(seq1);
	    throw new Sk.builtin.TypeError("'" + seq1typename + "' object can't be concatenated");
	};

	Sk.abstr.sequenceGetIndexOf = function (seq, ob) {
	    var seqtypename;
	    var i, it;
	    var index;
	    if (seq.index) {
	        return Sk.misceval.callsim(seq.index, seq, ob);
	    }
	    if (Sk.builtin.checkIterable(seq)) {
	        index = 0;
	        for (it = Sk.abstr.iter(seq), i = it.tp$iternext();
	             i !== undefined; i = it.tp$iternext()) {
	            if (Sk.misceval.richCompareBool(ob, i, "Eq")) {
	                return new Sk.builtin.int_(index);
	            }
	            index += 1;
	        }
	        throw new Sk.builtin.ValueError("sequence.index(x): x not in sequence");
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("argument of type '" + seqtypename + "' is not iterable");
	};

	Sk.abstr.sequenceGetCountOf = function (seq, ob) {
	    var seqtypename;
	    var i, it;
	    var count;
	    if (seq.count) {
	        return Sk.misceval.callsim(seq.count, seq, ob);
	    }
	    if (Sk.builtin.checkIterable(seq)) {
	        count = 0;
	        for (it = Sk.abstr.iter(seq), i = it.tp$iternext();
	             i !== undefined; i = it.tp$iternext()) {
	            if (Sk.misceval.richCompareBool(ob, i, "Eq")) {
	                count += 1;
	            }
	        }
	        return new Sk.builtin.int_(count);
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("argument of type '" + seqtypename + "' is not iterable");
	};

	Sk.abstr.sequenceGetItem = function (seq, i, canSuspend) {
	    var seqtypename;
	    if (seq.mp$subscript) {
	        return seq.mp$subscript(i);
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("'" + seqtypename + "' object is unsubscriptable");
	};

	Sk.abstr.sequenceSetItem = function (seq, i, x, canSuspend) {
	    var seqtypename;
	    if (seq.mp$ass_subscript) {
	        return seq.mp$ass_subscript(i, x);
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("'" + seqtypename + "' object does not support item assignment");
	};

	Sk.abstr.sequenceDelItem = function (seq, i) {
	    var seqtypename;
	    if (seq.sq$del_item) {
	        i = Sk.abstr.fixSeqIndex_(seq, i);
	        seq.sq$del_item(i);
	        return;
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("'" + seqtypename + "' object does not support item deletion");
	};

	Sk.abstr.sequenceRepeat = function (f, seq, n) {
	    var ntypename;
	    var count;
	    n = Sk.builtin.asnum$(n);
	    count = Sk.misceval.asIndex(n);
	    if (count === undefined) {
	        ntypename = Sk.abstr.typeName(n);
	        throw new Sk.builtin.TypeError("can't multiply sequence by non-int of type '" + ntypename + "'");
	    }
	    return f.call(seq, n);
	};

	Sk.abstr.sequenceGetSlice = function (seq, i1, i2) {
	    var seqtypename;
	    if (seq.sq$slice) {
	        i1 = Sk.abstr.fixSeqIndex_(seq, i1);
	        i2 = Sk.abstr.fixSeqIndex_(seq, i2);
	        return seq.sq$slice(i1, i2);
	    } else if (seq.mp$subscript) {
	        return seq.mp$subscript(new Sk.builtin.slice(i1, i2));
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("'" + seqtypename + "' object is unsliceable");
	};

	Sk.abstr.sequenceDelSlice = function (seq, i1, i2) {
	    var seqtypename;
	    if (seq.sq$del_slice) {
	        i1 = Sk.abstr.fixSeqIndex_(seq, i1);
	        i2 = Sk.abstr.fixSeqIndex_(seq, i2);
	        seq.sq$del_slice(i1, i2);
	        return;
	    }

	    seqtypename = Sk.abstr.typeName(seq);
	    throw new Sk.builtin.TypeError("'" + seqtypename + "' doesn't support slice deletion");
	};

	Sk.abstr.sequenceSetSlice = function (seq, i1, i2, x) {
	    var seqtypename;
	    if (seq.sq$ass_slice) {
	        i1 = Sk.abstr.fixSeqIndex_(seq, i1);
	        i2 = Sk.abstr.fixSeqIndex_(seq, i2);
	        seq.sq$ass_slice(i1, i2, x);
	    } else if (seq.mp$ass_subscript) {
	        seq.mp$ass_subscript(new Sk.builtin.slice(i1, i2), x);
	    } else {
	        seqtypename = Sk.abstr.typeName(seq);
	        throw new Sk.builtin.TypeError("'" + seqtypename + "' object doesn't support slice assignment");
	    }
	};

	// seq - Python object to unpack
	// n   - JavaScript number of items to unpack
	Sk.abstr.sequenceUnpack = function (seq, n) {
	    var res = [];
	    var it, i;

	    if (!Sk.builtin.checkIterable(seq)) {
	        throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(seq) + "' object is not iterable");
	    }

	    for (it = Sk.abstr.iter(seq), i = it.tp$iternext();
	         (i !== undefined) && (res.length < n);
	         i = it.tp$iternext()) {
	        res.push(i);
	    }

	    if (res.length < n) {
	        throw new Sk.builtin.ValueError("need more than " + res.length + " values to unpack");
	    }
	    if (i !== undefined) {
	        throw new Sk.builtin.ValueError("too many values to unpack");
	    }

	    // Return Javascript array of items
	    return res;
	};

	//
	// Object
	//

	Sk.abstr.objectFormat = function (obj, format_spec) {
	    var meth; // PyObject
	    var result; // PyObject

	    // If no format_spec is provided, use an empty string
	    if(format_spec == null) {
	        format_spec = "";
	    }

	    // Find the (unbound!) __format__ method (a borrowed reference)
	    meth = Sk.abstr.lookupSpecial(obj, "__format__");
	    if (meth == null) {
	        throw new Sk.builtin.TypeError("Type " + Sk.abstr.typeName(obj) + "doesn't define __format__");
	    }

	    // And call it
	    result = Sk.misceval.callsim(meth, obj, format_spec);
	    if (!Sk.builtin.checkString(result)) {
	        throw new Sk.builtin.TypeError("__format__ must return a str, not " + Sk.abstr.typeName(result));
	    }

	    return result;
	};

	Sk.abstr.objectAdd = function (a, b) {
	    var btypename;
	    var atypename;
	    if (a.nb$add) {
	        return a.nb$add(b);
	    }

	    atypename = Sk.abstr.typeName(a);
	    btypename = Sk.abstr.typeName(b);
	    throw new Sk.builtin.TypeError("unsupported operand type(s) for +: '" + atypename + "' and '" + btypename + "'");
	};

	// in Python 2.6, this behaviour seems to be defined for numbers and bools (converts bool to int)
	Sk.abstr.objectNegative = function (obj) {
	    var objtypename;
	    var obj_asnum = Sk.builtin.asnum$(obj); // this will also convert bool type to int

	    if (obj instanceof Sk.builtin.bool) {
	        obj = new Sk.builtin.int_(obj_asnum);
	    }

	    if (obj.nb$negative) {
	        return obj.nb$negative();
	    }

	    objtypename = Sk.abstr.typeName(obj);
	    throw new Sk.builtin.TypeError("bad operand type for unary -: '" + objtypename + "'");
	};

	// in Python 2.6, this behaviour seems to be defined for numbers and bools (converts bool to int)
	Sk.abstr.objectPositive = function (obj) {
	    var objtypename = Sk.abstr.typeName(obj);
	    var obj_asnum = Sk.builtin.asnum$(obj); // this will also convert bool type to int

	    if (obj instanceof Sk.builtin.bool) {
	        obj = new Sk.builtin.int_(obj_asnum);
	    }

	    if (obj.nb$negative) {
	        return obj.nb$positive();
	    }

	    throw new Sk.builtin.TypeError("bad operand type for unary +: '" + objtypename + "'");
	};

	Sk.abstr.objectDelItem = function (o, key) {
	    var otypename;
	    var keytypename;
	    var keyValue;
	    if (o !== null) {
	        if (o.mp$del_subscript) {
	            o.mp$del_subscript(key);
	            return;
	        }
	        if (o.sq$ass_item) {
	            keyValue = Sk.misceval.asIndex(key);
	            if (keyValue === undefined) {
	                keytypename = Sk.abstr.typeName(key);
	                throw new Sk.builtin.TypeError("sequence index must be integer, not '" + keytypename + "'");
	            }
	            Sk.abstr.sequenceDelItem(o, keyValue);
	            return;
	        }
	        // if o is a slice do something else...
	    }

	    otypename = Sk.abstr.typeName(o);
	    throw new Sk.builtin.TypeError("'" + otypename + "' object does not support item deletion");
	};
	goog.exportSymbol("Sk.abstr.objectDelItem", Sk.abstr.objectDelItem);

	Sk.abstr.objectGetItem = function (o, key, canSuspend) {
	    var otypename;
	    if (o !== null) {
	        if (o.tp$getitem) {
	            return o.tp$getitem(key, canSuspend);
	        } else if (o.mp$subscript) {
	            return o.mp$subscript(key, canSuspend);
	        } else if (Sk.misceval.isIndex(key) && o.sq$item) {
	            return Sk.abstr.sequenceGetItem(o, Sk.misceval.asIndex(key), canSuspend);
	        }
	    }

	    otypename = Sk.abstr.typeName(o);
	    throw new Sk.builtin.TypeError("'" + otypename + "' does not support indexing");
	};
	goog.exportSymbol("Sk.abstr.objectGetItem", Sk.abstr.objectGetItem);

	Sk.abstr.objectSetItem = function (o, key, v, canSuspend) {
	    var otypename;
	    if (o !== null) {
	        if (o.tp$setitem) {
	            return o.tp$setitem(key, v, canSuspend);
	        } else if (o.mp$ass_subscript) {
	            return o.mp$ass_subscript(key, v, canSuspend);
	        } else if (Sk.misceval.isIndex(key) && o.sq$ass_item) {
	            return Sk.abstr.sequenceSetItem(o, Sk.misceval.asIndex(key), v, canSuspend);
	        }
	    }

	    otypename = Sk.abstr.typeName(o);
	    throw new Sk.builtin.TypeError("'" + otypename + "' does not support item assignment");
	};
	goog.exportSymbol("Sk.abstr.objectSetItem", Sk.abstr.objectSetItem);


	Sk.abstr.gattr = function (obj, nameJS, canSuspend) {
	    var ret, f;
	    var objname = Sk.abstr.typeName(obj);

	    if (obj === null) {
	        throw new Sk.builtin.AttributeError("'" + objname + "' object has no attribute '" + nameJS + "'");
	    }


	    if (obj.tp$getattr !== undefined) {
	        f = obj.tp$getattr("__getattribute__");
	    }

	    if (f !== undefined) {
	        ret = Sk.misceval.callsimOrSuspend(f, new Sk.builtin.str(nameJS));
	    }

	    ret = Sk.misceval.chain(ret, function(ret) {
	        var f;

	        if (ret === undefined && obj.tp$getattr !== undefined) {
	            ret = obj.tp$getattr(nameJS);

	            if (ret === undefined) {
	                f = obj.tp$getattr("__getattr__");

	                if (f !== undefined) {
	                    ret = Sk.misceval.callsimOrSuspend(f, new Sk.builtin.str(nameJS));
	                }
	            }
	        }
	        return ret;
	    }, function(r) {
	        if (r === undefined) {
	            throw new Sk.builtin.AttributeError("'" + objname + "' object has no attribute '" + nameJS + "'");
	        }
	        return r;
	    });

	    return canSuspend ? ret : Sk.misceval.retryOptionalSuspensionOrThrow(ret);
	};
	goog.exportSymbol("Sk.abstr.gattr", Sk.abstr.gattr);

	Sk.abstr.sattr = function (obj, nameJS, data, canSuspend) {
	    var objname = Sk.abstr.typeName(obj), r, setf;

	    if (obj === null) {
	        throw new Sk.builtin.AttributeError("'" + objname + "' object has no attribute '" + nameJS + "'");
	    }

	    if (obj.tp$getattr !== undefined) {
	        setf = obj.tp$getattr("__setattr__");
	        if (setf !== undefined) {
	            r = Sk.misceval.callsimOrSuspend(setf, new Sk.builtin.str(nameJS), data);
	            return canSuspend ? r : Sk.misceval.retryOptionalSuspensionOrThrow(r);
	        }
	    }

	    if (obj.tp$setattr !== undefined) {
	        obj.tp$setattr(nameJS, data);
	    } else {
	        throw new Sk.builtin.AttributeError("'" + objname + "' object has no attribute '" + nameJS + "'");
	    }
	};
	goog.exportSymbol("Sk.abstr.sattr", Sk.abstr.sattr);


	Sk.abstr.iternext = function (it, canSuspend) {
	    return it.tp$iternext(canSuspend);
	};
	goog.exportSymbol("Sk.abstr.iternext", Sk.abstr.iternext);


	/**
	 * Get the iterator for a Python object  This iterator could be one of the following.
	 * This is the preferred mechanism for consistently getting the correct iterator.  You should
	 * not just use tp$iter because that could lead to incorrect behavior of a user created class.
	 *
	 * - tp$iter
	 * - A user defined `__iter__` method
	 * - A user defined `__getitem__` method
	 *
	 * @param obj
	 *
	 * @throws {Sk.builtin.TypeError}
	 * @returns {Object}
	 */

	Sk.abstr.iter = function(obj) {
	    var iter;
	    var getit;
	    var ret;

	    /**
	     * Builds an iterator around classes that have a __getitem__ method.
	     *
	     * @constructor
	     */
	    var seqIter = function (obj) {
	        this.idx = 0;
	        this.myobj = obj;
	        this.getitem = Sk.abstr.lookupSpecial(obj, "__getitem__");
	        this.tp$iternext = function () {
	            var ret;
	            try {
	                ret = Sk.misceval.callsim(this.getitem, this.myobj, Sk.ffi.remapToPy(this.idx));
	            } catch (e) {
	                if (e instanceof Sk.builtin.IndexError || e instanceof Sk.builtin.StopIteration) {
	                    return undefined;
	                } else {
	                    throw e;
	                }
	            }
	            this.idx++;
	            return ret;
	        };
	    };

	    if (obj.tp$getattr) {
	        iter =  Sk.abstr.lookupSpecial(obj,"__iter__");
	        if (iter) {
	            ret = Sk.misceval.callsim(iter, obj);
	            if (ret.tp$iternext) {
	                return ret;
	            }
	        }
	    }
	    if (obj.tp$iter) {
	        try {  // catch and ignore not iterable error here.
	            ret = obj.tp$iter();
	            if (ret.tp$iternext) {
	                return ret;
	            }
	        } catch (e) { }
	    }
	    getit = Sk.abstr.lookupSpecial(obj, "__getitem__");
	    if (getit) {
	        // create internal iterobject if __getitem__
	        return new seqIter(obj);
	    }
	    throw new Sk.builtin.TypeError("'" + Sk.abstr.typeName(obj) + "' object is not iterable");
	};
	goog.exportSymbol("Sk.abstr.iter", Sk.abstr.iter);

	/**
	 * Special method look up. First try getting the method via
	 * internal dict and getattr. If getattr is not present (builtins)
	 * try if method is defined on the object itself
	 *
	 * @returns {null|Object} Return null if not found or the function
	 */
	Sk.abstr.lookupSpecial = function(op, str) {
	    var res;
	    var obtp;
	    if (op.ob$type) {
	        obtp = op.ob$type;
	    } else {
	        return null;
	    }

	    return Sk.builtin.type.typeLookup(obtp, str);
	};
	goog.exportSymbol("Sk.abstr.lookupSpecial", Sk.abstr.lookupSpecial);

	/**
	 * Mark a class as unhashable and prevent its `__hash__` function from being called.
	 * @param  {function(...[?])} thisClass The class to mark as unhashable.
	 * @return {undefined}
	 */
	Sk.abstr.markUnhashable = function (thisClass) {
	    var proto = thisClass.prototype;
	    proto.__hash__ = Sk.builtin.none.none$;
	    proto.tp$hash = Sk.builtin.none.none$;
	};

	/**
	 * Set up inheritance between two Python classes. This allows only for single
	 * inheritance -- multiple inheritance is not supported by Javascript.
	 *
	 * Javascript's inheritance is prototypal. This means that properties must
	 * be defined on the superclass' prototype in order for subclasses to inherit
	 * them.
	 *
	 * ```
	 * Sk.superclass.myProperty                 # will NOT be inherited
	 * Sk.superclass.prototype.myProperty       # will be inherited
	 * ```
	 *
	 * In order for a class to be subclassable, it must (directly or indirectly)
	 * inherit from Sk.builtin.object so that it will be properly initialized in
	 * {@link Sk.doOneTimeInitialization} (in src/import.js). Further, all Python
	 * builtins should inherit from Sk.builtin.object.
	 *
	 * @param {string} childName The Python name of the child (subclass).
	 * @param {function(...[?])} child     The subclass.
	 * @param {function(...[?])} parent    The superclass.
	 * @return {undefined}
	 */
	Sk.abstr.setUpInheritance = function (childName, child, parent) {
	    goog.inherits(child, parent);
	    child.prototype.tp$base = parent;
	    child.prototype.tp$name = childName;
	    child.prototype.ob$type = Sk.builtin.type.makeIntoTypeObj(childName, child);
	};

	/**
	 * Call the super constructor of the provided class, with the object `self` as
	 * the `this` value of that constructor. Any arguments passed to this function
	 * after `self` will be passed as-is to the constructor.
	 *
	 * @param  {function(...[?])} thisClass The subclass.
	 * @param  {Object} self      The instance of the subclas.
	 * @param  {...?} args Arguments to pass to the constructor.
	 * @return {undefined}
	 */
	Sk.abstr.superConstructor = function (thisClass, self, args) {
	    var argumentsForConstructor = Array.prototype.slice.call(arguments, 2);
	    thisClass.prototype.tp$base.apply(self, argumentsForConstructor);
	};



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/object.js ---- */ 

	/**
	 * @constructor
	 * Sk.builtin.object
	 *
	 * @description
	 * Constructor for Python object. All Python classes (builtin and user-defined)
	 * should inherit from this class.
	 *
	 * @return {Sk.builtin.object} Python object
	 */
	Sk.builtin.object = function () {
	    if (!(this instanceof Sk.builtin.object)) {
	        return new Sk.builtin.object();
	    }

	    return this;
	};



	var _tryGetSubscript = function(dict, pyName) {
	    try {
	        return dict.mp$subscript(pyName);
	    } catch (x) {
	        return undefined;
	    }
	};

	/**
	 * @return {undefined}
	 */
	Sk.builtin.object.prototype.GenericGetAttr = function (name) {
	    var res;
	    var f;
	    var descr;
	    var tp;
	    var dict;
	    var pyName = new Sk.builtin.str(name);
	    goog.asserts.assert(typeof name === "string");

	    tp = this.ob$type;
	    goog.asserts.assert(tp !== undefined, "object has no ob$type!");

	    dict = this["$d"] || this.constructor["$d"];

	    // todo; assert? force?
	    if (dict) {
	        if (dict.mp$lookup) {
	            res = dict.mp$lookup(pyName);
	        } else if (dict.mp$subscript) {
	            res = _tryGetSubscript(dict, pyName);
	        } else if (typeof dict === "object") {
	            // todo; definitely the wrong place for this. other custom tp$getattr won't work on object -- bnm -- implemented custom __getattr__ in abstract.js
	            res = dict[name];
	        }
	        if (res !== undefined) {
	            return res;
	        }
	    }

	    descr = Sk.builtin.type.typeLookup(tp, name);

	    // otherwise, look in the type for a descr
	    if (descr !== undefined && descr !== null && descr.ob$type !== undefined) {
	        f = descr.ob$type.tp$descr_get;
	        if (!(f) && descr["__get__"]) {
	            f = descr["__get__"];
	            return Sk.misceval.callsimOrSuspend(f, descr, this, Sk.builtin.none.none$);
	        }
	        // todo;
	        // if (f && descr.tp$descr_set) // is a data descriptor if it has a set
	        // return f.call(descr, this, this.ob$type);

	        if (f) {
	            // non-data descriptor
	            return f.call(descr, this, this.ob$type);
	        }
	    }

	    if (descr !== undefined) {
	        return descr;
	    }

	    return undefined;
	};
	goog.exportSymbol("Sk.builtin.object.prototype.GenericGetAttr", Sk.builtin.object.prototype.GenericGetAttr);

	Sk.builtin.object.prototype.GenericPythonGetAttr = function(self, name) {
	    return Sk.builtin.object.prototype.GenericGetAttr.call(self, name.v);
	};
	goog.exportSymbol("Sk.builtin.object.prototype.GenericPythonGetAttr", Sk.builtin.object.prototype.GenericPythonGetAttr);

	Sk.builtin.object.prototype.GenericSetAttr = function (name, value) {
	    var objname = Sk.abstr.typeName(this);
	    var pyname;
	    var dict;
	    var tp = this.ob$type;
	    var descr;
	    var f;

	    goog.asserts.assert(typeof name === "string");
	    goog.asserts.assert(tp !== undefined, "object has no ob$type!");

	    dict = this["$d"] || this.constructor["$d"];

	    descr = Sk.builtin.type.typeLookup(tp, name);

	    // otherwise, look in the type for a descr
	    if (descr !== undefined && descr !== null && descr.ob$type !== undefined) {
	        //f = descr.ob$type.tp$descr_set;
	        if (descr["__set__"]) {
	            f = descr["__set__"];
	            Sk.misceval.callsimOrSuspend(f, descr, this, value);
	            return;
	        }
	        // todo;
	        //if (f && descr.tp$descr_set) // is a data descriptor if it has a set
	        //return f.call(descr, this, this.ob$type);
	    }

	    if (dict.mp$ass_subscript) {
	        pyname = new Sk.builtin.str(name);

	        if (this instanceof Sk.builtin.object && !(this.ob$type.sk$klass) &&
	            dict.mp$lookup(pyname) === undefined) {
	            // Cannot add new attributes to a builtin object
	            throw new Sk.builtin.AttributeError("'" + objname + "' object has no attribute '" + name + "'");
	        }
	        dict.mp$ass_subscript(new Sk.builtin.str(name), value);
	    } else if (typeof dict === "object") {
	        dict[name] = value;
	    }
	};
	goog.exportSymbol("Sk.builtin.object.prototype.GenericSetAttr", Sk.builtin.object.prototype.GenericSetAttr);

	Sk.builtin.object.prototype.GenericPythonSetAttr = function(self, name, value) {
	    return Sk.builtin.object.prototype.GenericSetAttr.call(self, name.v, value);
	};
	goog.exportSymbol("Sk.builtin.object.prototype.GenericPythonSetAttr", Sk.builtin.object.prototype.GenericPythonSetAttr);

	Sk.builtin.object.prototype.HashNotImplemented = function () {
	    throw new Sk.builtin.TypeError("unhashable type: '" + Sk.abstr.typeName(this) + "'");
	};

	Sk.builtin.object.prototype.tp$getattr = Sk.builtin.object.prototype.GenericGetAttr;
	Sk.builtin.object.prototype.tp$setattr = Sk.builtin.object.prototype.GenericSetAttr;

	// Although actual attribute-getting happens in pure Javascript via tp$getattr, classes
	// overriding __getattr__ etc need to be able to call object.__getattr__ etc from Python
	Sk.builtin.object.prototype["__getattr__"] = Sk.builtin.object.prototype.GenericPythonGetAttr;
	Sk.builtin.object.prototype["__setattr__"] = Sk.builtin.object.prototype.GenericPythonSetAttr;

	/**
	 * The name of this class.
	 * @type {string}
	 */
	Sk.builtin.object.prototype.tp$name = "object";

	/**
	 * The type object of this class.
	 * @type {Sk.builtin.type}
	 */
	Sk.builtin.object.prototype.ob$type = Sk.builtin.type.makeIntoTypeObj("object", Sk.builtin.object);
	Sk.builtin.object.prototype.ob$type.sk$klass = undefined;   // Nonsense for closure compiler

	/** Default implementations of dunder methods found in all Python objects */

	/**
	 * Python wrapper for `__repr__` method.
	 * @name  __repr__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__repr__"] = function (self) {
	    Sk.builtin.pyCheckArgs("__repr__", arguments, 0, 0, false, true);

	    return self["$r"]();
	};

	/**
	 * Python wrapper for `__str__` method.
	 * @name  __str__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__str__"] = function (self) {
	    Sk.builtin.pyCheckArgs("__str__", arguments, 0, 0, false, true);

	    return self["$r"]();
	};

	/**
	 * Python wrapper for `__hash__` method.
	 * @name  __hash__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__hash__"] = function (self) {
	    Sk.builtin.pyCheckArgs("__hash__", arguments, 0, 0, false, true);

	    return self.tp$hash();
	};

	/**
	 * Python wrapper for `__eq__` method.
	 * @name  __eq__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__eq__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__eq__", arguments, 1, 1, false, true);

	    return self.ob$eq(other);
	};

	/**
	 * Python wrapper for `__ne__` method.
	 * @name  __ne__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__ne__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__ne__", arguments, 1, 1, false, true);

	    return self.ob$ne(other);
	};

	/**
	 * Python wrapper for `__lt__` method.
	 * @name  __lt__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__lt__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__lt__", arguments, 1, 1, false, true);

	    return self.ob$lt(other);
	};

	/**
	 * Python wrapper for `__le__` method.
	 * @name  __le__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__le__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__le__", arguments, 1, 1, false, true);

	    return self.ob$le(other);
	};

	/**
	 * Python wrapper for `__gt__` method.
	 * @name  __gt__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__gt__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__gt__", arguments, 1, 1, false, true);

	    return self.ob$gt(other);
	};

	/**
	 * Python wrapper for `__ge__` method.
	 * @name  __ge__
	 * @memberOf Sk.builtin.object.prototype
	 * @instance
	 */
	Sk.builtin.object.prototype["__ge__"] = function (self, other) {
	    Sk.builtin.pyCheckArgs("__ge__", arguments, 1, 1, false, true);

	    return self.ob$ge(other);
	};

	/** Default implementations of Javascript functions used in dunder methods */

	/**
	 * Return the string representation of this instance.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @name  $r
	 * @memberOf Sk.builtin.object.prototype
	 * @return {Sk.builtin.str} The Python string representation of this instance.
	 */
	Sk.builtin.object.prototype["$r"] = function () {
	    return new Sk.builtin.str("<object>");
	};

	Sk.builtin.hashCount = 1;
	Sk.builtin.idCount = 1;

	/**
	 * Return the hash value of this instance.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @return {Sk.builtin.int_} The hash value
	 */
	Sk.builtin.object.prototype.tp$hash = function () {
	    if (!this.$savedHash_) {
	        this.$savedHash_ = new Sk.builtin.int_(Sk.builtin.hashCount++);
	    }

	    return this.$savedHash_;
	};

	/**
	 * Perform equality check between this instance and a Python object (i.e. this == other).
	 *
	 * Implements `__eq__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to check for equality.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if equal, false otherwise
	 */
	Sk.builtin.object.prototype.ob$eq = function (other) {
	    if (this === other) {
	        return Sk.builtin.bool.true$;
	    }

	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	/**
	 * Perform non-equality check between this instance and a Python object (i.e. this != other).
	 *
	 * Implements `__ne__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to check for non-equality.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if not equal, false otherwise
	 */
	Sk.builtin.object.prototype.ob$ne = function (other) {
	    if (this === other) {
	        return Sk.builtin.bool.false$;
	    }

	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	/**
	 * Determine if this instance is less than a Python object (i.e. this < other).
	 *
	 * Implements `__lt__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to compare.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if this < other, false otherwise
	 */
	Sk.builtin.object.prototype.ob$lt = function (other) {
	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	/**
	 * Determine if this instance is less than or equal to a Python object (i.e. this <= other).
	 *
	 * Implements `__le__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to compare.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if this <= other, false otherwise
	 */
	Sk.builtin.object.prototype.ob$le = function (other) {
	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	/**
	 * Determine if this instance is greater than a Python object (i.e. this > other).
	 *
	 * Implements `__gt__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to compare.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if this > other, false otherwise
	 */
	Sk.builtin.object.prototype.ob$gt = function (other) {
	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	/**
	 * Determine if this instance is greater than or equal to a Python object (i.e. this >= other).
	 *
	 * Implements `__ge__` dunder method.
	 *
	 * Javascript function, returns Python object.
	 *
	 * @param  {Object} other The Python object to compare.
	 * @return {(Sk.builtin.bool|Sk.builtin.NotImplemented)} true if this >= other, false otherwise
	 */
	Sk.builtin.object.prototype.ob$ge = function (other) {
	    return Sk.builtin.NotImplemented.NotImplemented$;
	};

	// Wrap the following functions in Sk.builtin.func once that class is initialized
	/**
	 * Array of all the Python functions which are methods of this class.
	 * @type {Array}
	 */
	Sk.builtin.object.pythonFunctions = ["__repr__", "__str__", "__hash__",
	"__eq__", "__ne__", "__lt__", "__le__", "__gt__", "__ge__", "__getattr__", "__setattr__"];

	/**
	 * @constructor
	 * Sk.builtin.none
	 *
	 * @extends {Sk.builtin.object}
	 */
	Sk.builtin.none = function () {
	    this.v = null;
	};
	Sk.abstr.setUpInheritance("NoneType", Sk.builtin.none, Sk.builtin.object);

	/** @override */
	Sk.builtin.none.prototype["$r"] = function () { return new Sk.builtin.str("None"); };

	/** @override */
	Sk.builtin.none.prototype.tp$hash = function () {
	    return new Sk.builtin.int_(0);
	};

	/**
	 * Python None constant.
	 * @type {Sk.builtin.none}
	 */
	Sk.builtin.none.none$ = new Sk.builtin.none();

	/**
	 * @constructor
	 * Sk.builtin.NotImplemented
	 *
	 * @extends {Sk.builtin.object}
	 */
	Sk.builtin.NotImplemented = function() { };
	Sk.abstr.setUpInheritance("NotImplementedType", Sk.builtin.NotImplemented, Sk.builtin.object);

	/** @override */
	Sk.builtin.NotImplemented.prototype["$r"] = function () { return new Sk.builtin.str("NotImplemented"); };

	/**
	 * Python NotImplemented constant.
	 * @type {Sk.builtin.NotImplemented}
	 */
	Sk.builtin.NotImplemented.NotImplemented$ = new Sk.builtin.NotImplemented();

	goog.exportSymbol("Sk.builtin.none", Sk.builtin.none);
	goog.exportSymbol("Sk.builtin.NotImplemented", Sk.builtin.NotImplemented);



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/function.js ---- */ 

	/**
	 * @namespace Sk.builtin
	 */


	/**
	 * Check arguments to Python functions to ensure the correct number of
	 * arguments are passed.
	 *
	 * @param {string} name the name of the function
	 * @param {Object} args the args passed to the function
	 * @param {number} minargs the minimum number of allowable arguments
	 * @param {number=} maxargs optional maximum number of allowable
	 * arguments (default: Infinity)
	 * @param {boolean=} kwargs optional true if kwargs, false otherwise
	 * (default: false)
	 * @param {boolean=} free optional true if free vars, false otherwise
	 * (default: false)
	 */
	Sk.builtin.pyCheckArgs = function (name, args, minargs, maxargs, kwargs, free) {
	    var nargs = args.length;
	    var msg = "";

	    if (maxargs === undefined) {
	        maxargs = Infinity;
	    }
	    if (kwargs) {
	        nargs -= 1;
	    }
	    if (free) {
	        nargs -= 1;
	    }
	    if ((nargs < minargs) || (nargs > maxargs)) {
	        if (minargs === maxargs) {
	            msg = name + "() takes exactly " + minargs + " arguments";
	        } else if (nargs < minargs) {
	            msg = name + "() takes at least " + minargs + " arguments";
	        } else {
	            msg = name + "() takes at most " + maxargs + " arguments";
	        }
	        msg += " (" + nargs + " given)";
	        throw new Sk.builtin.TypeError(msg);
	    }
	};
	goog.exportSymbol("Sk.builtin.pyCheckArgs", Sk.builtin.pyCheckArgs);

	/**
	 * Check type of argument to Python functions.
	 *
	 * @param {string} name the name of the argument
	 * @param {string} exptype string of the expected type name
	 * @param {boolean} check truthy if type check passes, falsy otherwise
	 */
	Sk.builtin.pyCheckType = function (name, exptype, check) {
	    if (!check) {
	        throw new Sk.builtin.TypeError(name + " must be a " + exptype);
	    }
	};
	goog.exportSymbol("Sk.builtin.pyCheckType", Sk.builtin.pyCheckType);

	Sk.builtin.checkSequence = function (arg) {
	    return (arg !== null && arg.mp$subscript !== undefined);
	};
	goog.exportSymbol("Sk.builtin.checkSequence", Sk.builtin.checkSequence);

	/**
	 * Use this to test whether or not a Python object is iterable.  You should **not** rely
	 * on the presence of tp$iter on the object as a good test, as it could be a user defined
	 * class with `__iter__` defined or ``__getitem__``  This tests for all of those cases
	 *
	 * @param arg {Object}   A Python object
	 * @returns {boolean} true if the object is iterable
	 */
	Sk.builtin.checkIterable = function (arg) {
	    var ret = false;
	    if (arg !== null ) {
	        try {
	            ret = Sk.abstr.iter(arg);
	            if (ret) {
	                return true;
	            } else {
	                return false;
	            }
	        } catch (e) {
	            if (e instanceof Sk.builtin.TypeError) {
	                return false;
	            } else {
	                throw e;
	            }
	        }
	    }
	    return ret;
	};
	goog.exportSymbol("Sk.builtin.checkIterable", Sk.builtin.checkIterable);

	Sk.builtin.checkCallable = function (obj) {
	    // takes care of builtin functions and methods, builtins
	    if (typeof obj === "function") {
	        return true;
	    }
	    // takes care of python function, methods and lambdas
	    if (obj instanceof Sk.builtin.func) {
	        return true;
	    }
	    // takes care of instances of methods
	    if (obj instanceof Sk.builtin.method) {
	        return true;
	    }
	    // go up the prototype chain to see if the class has a __call__ method
	    if (Sk.abstr.lookupSpecial(obj, "__call__") !== undefined) {
	        return true;
	    } 
	    return false;
	};

	Sk.builtin.checkNumber = function (arg) {
	    return (arg !== null && (typeof arg === "number" ||
	        arg instanceof Sk.builtin.int_ ||
	        arg instanceof Sk.builtin.float_ ||
	        arg instanceof Sk.builtin.lng));
	};
	goog.exportSymbol("Sk.builtin.checkNumber", Sk.builtin.checkNumber);

	/**
	 * Checks for complex type, delegates to internal method
	 * Most skulpt users would search here!
	 */
	Sk.builtin.checkComplex = function (arg) {
	    return Sk.builtin.complex._complex_check(arg);
	};
	goog.exportSymbol("Sk.builtin.checkComplex", Sk.builtin.checkComplex);

	Sk.builtin.checkInt = function (arg) {
	    return (arg !== null) && ((typeof arg === "number" && arg === (arg | 0)) ||
	        arg instanceof Sk.builtin.int_ ||
	        arg instanceof Sk.builtin.lng);
	};
	goog.exportSymbol("Sk.builtin.checkInt", Sk.builtin.checkInt);

	Sk.builtin.checkFloat = function (arg) {
	    return (arg !== null) && (arg instanceof Sk.builtin.float_);
	};
	goog.exportSymbol("Sk.builtin.checkFloat", Sk.builtin.checkFloat);

	Sk.builtin.checkString = function (arg) {
	    return (arg !== null && arg.__class__ == Sk.builtin.str);
	};
	goog.exportSymbol("Sk.builtin.checkString", Sk.builtin.checkString);

	Sk.builtin.checkClass = function (arg) {
	    return (arg !== null && arg.sk$type);
	};
	goog.exportSymbol("Sk.builtin.checkClass", Sk.builtin.checkClass);

	Sk.builtin.checkBool = function (arg) {
	    return (arg instanceof Sk.builtin.bool);
	};
	goog.exportSymbol("Sk.builtin.checkBool", Sk.builtin.checkBool);

	Sk.builtin.checkNone = function (arg) {
	    return (arg instanceof Sk.builtin.none);
	};
	goog.exportSymbol("Sk.builtin.checkNone", Sk.builtin.checkNone);

	Sk.builtin.checkFunction = function (arg) {
	    return (arg !== null && arg.tp$call !== undefined);
	};
	goog.exportSymbol("Sk.builtin.checkFunction", Sk.builtin.checkFunction);

	/**
	 * @constructor
	 * Sk.builtin.func
	 *
	 * @description
	 * This function converts a Javascript function into a Python object that is callable.  Or just
	 * think of it as a Python function rather than a Javascript function now.  This is an important
	 * distinction in skulpt because once you have Python function you cannot just call it.
	 * You must now use Sk.misceval.callsim to call the Python function.
	 *
	 * @param {Function} code the javascript implementation of this function
	 * @param {Object=} globals the globals where this function was defined.
	 * Can be undefined (which will be stored as null) for builtins. (is
	 * that ok?)
	 * @param {Object=} closure dict of free variables
	 * @param {Object=} closure2 another dict of free variables that will be
	 * merged into 'closure'. there's 2 to simplify generated code (one is $free,
	 * the other is $cell)
	 *
	 * closure is the cell variables from the parent scope that we need to close
	 * over. closure2 is the free variables in the parent scope that we also might
	 * need to access.
	 *
	 * NOTE: co_varnames and co_name are defined by compiled code only, so we have
	 * to access them via dict-style lookup for closure.
	 *
	 */
	Sk.builtin.func = function (code, globals, closure, closure2) {
	    var k;
	    this.func_code = code;
	    this.func_globals = globals || null;
	    if (closure2 !== undefined) {
	        // todo; confirm that modification here can't cause problems
	        for (k in closure2) {
	            closure[k] = closure2[k];
	        }
	    }
	    this.func_closure = closure;
	    return this;
	};
	goog.exportSymbol("Sk.builtin.func", Sk.builtin.func);


	Sk.builtin.func.prototype.tp$name = "function";
	Sk.builtin.func.prototype.tp$descr_get = function (obj, objtype) {
	    goog.asserts.assert(obj !== undefined && objtype !== undefined);
	    if (obj == null) {
	        return this;
	    }
	    return new Sk.builtin.method(this, obj, objtype);
	};
	Sk.builtin.func.prototype.tp$call = function (args, kw) {
	    var j;
	    var i;
	    var numvarnames;
	    var varnames;
	    var kwlen;
	    var kwargsarr;
	    var expectskw;
	    var name;
	    var numargs;

	    // note: functions expect 'this' to be globals to avoid having to
	    // slice/unshift onto the main args
	    if (this.func_closure) {
	        // todo; OK to modify?
	        if (this.func_code["$defaults"] && this.func_code["co_varnames"]) {
	            // Make sure all default arguments are in args before adding closure
	            numargs = args.length;
	            numvarnames = this.func_code["co_varnames"].length;
	            for (i = numargs; i < numvarnames; i++) {
	                args.push(undefined);
	            }
	        }
	        args.push(this.func_closure);
	    }

	    expectskw = this.func_code["co_kwargs"];
	    kwargsarr = [];

	    if (this.func_code["no_kw"] && kw) {
	        name = (this.func_code && this.func_code["co_name"] && this.func_code["co_name"].v) || "<native JS>";
	        throw new Sk.builtin.TypeError(name + "() takes no keyword arguments");
	    }

	    if (kw) {
	        // bind the kw args
	        kwlen = kw.length;
	        varnames = this.func_code["co_varnames"];
	        numvarnames = varnames && varnames.length;
	        for (i = 0; i < kwlen; i += 2) {
	            // todo; make this a dict mapping name to offset
	            for (j = 0; j < numvarnames; ++j) {
	                if (kw[i] === varnames[j]) {
	                    break;
	                }
	            }
	            if (varnames && j !== numvarnames) {
	                if (j in args) {
	                    name = (this.func_code && this.func_code["co_name"] && this.func_code["co_name"].v) || "<native JS>";
	                    throw new Sk.builtin.TypeError(name + "() got multiple values for keyword argument '" + kw[i] + "'");
	                }
	                args[j] = kw[i + 1];
	            } else if (expectskw) {
	                // build kwargs dict
	                kwargsarr.push(new Sk.builtin.str(kw[i]));
	                kwargsarr.push(kw[i + 1]);
	            } else {
	                name = (this.func_code && this.func_code["co_name"] && this.func_code["co_name"].v) || "<native JS>";
	                throw new Sk.builtin.TypeError(name + "() got an unexpected keyword argument '" + kw[i] + "'");
	            }
	        }
	    }
	    if (expectskw) {
	        args.unshift(kwargsarr);
	    }

	    //print(JSON.stringify(args, null, 2));

	    return this.func_code.apply(this.func_globals, args);
	};

	Sk.builtin.func.prototype.tp$getattr = function (key) {
	    return this[key];
	};
	Sk.builtin.func.prototype.tp$setattr = function (key, value) {
	    this[key] = value;
	};

	//todo; investigate why the other doesn't work
	//Sk.builtin.type.makeIntoTypeObj('function', Sk.builtin.func);
	Sk.builtin.func.prototype.ob$type = Sk.builtin.type.makeTypeObj("function", new Sk.builtin.func(null, null));

	Sk.builtin.func.prototype["$r"] = function () {
	    var name = (this.func_code && this.func_code["co_name"] && this.func_code["co_name"].v) || "<native JS>";
	    return new Sk.builtin.str("<function " + name + ">");
	};



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/seqtype.js ---- */ 

	/**
	 * @constructor
	 * Sk.builtin.seqtype
	 *
	 * @description
	 * Abstract class for Python sequence types.
	 *
	 * @extends {Sk.builtin.object}
	 *
	 * @return {undefined} Cannot instantiate a Sk.builtin.seqtype object
	 */
	Sk.builtin.seqtype = function () {

	    throw new Sk.builtin.ExternalError("Cannot instantiate abstract Sk.builtin.seqtype class");

	};

	Sk.abstr.setUpInheritance("SequenceType", Sk.builtin.seqtype, Sk.builtin.object);

	Sk.builtin.seqtype.sk$abstract = true;

	/**
	 * Python wrapper of `__len__` method.
	 *
	 * @name  __len__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__len__"] = new Sk.builtin.func(function (self) {

	    Sk.builtin.pyCheckArgs("__len__", arguments, 0, 0, false, true);

	    return new Sk.builtin.int_(self.sq$length());    

	});

	/**
	 * Python wrapper of `__iter__` method.
	 *
	 * @name  __iter__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__iter__"] = new Sk.builtin.func(function (self) {

	    Sk.builtin.pyCheckArgs("__iter__", arguments, 0, 0, false, true);

	    return self.tp$iter();

	});

	/**
	 * Python wrapper of `__contains__` method.
	 *
	 * @name  __contains__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__contains__"] = new Sk.builtin.func(function (self, item) {

	    Sk.builtin.pyCheckArgs("__contains__", arguments, 1, 1, false, true);

	    if (self.sq$contains(item)) {
	        return Sk.builtin.bool.true$;
	    } else {
	        return Sk.builtin.bool.false$;
	    }

	});

	/**
	 * Python wrapper of `__getitem__` method.
	 *
	 * @name  __getitem__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__getitem__"] = new Sk.builtin.func(function (self, key) {

	    Sk.builtin.pyCheckArgs("__getitem__", arguments, 1, 1, false, true);

	    return self.mp$subscript(key);

	});

	/**
	 * Python wrapper of `__add__` method.
	 *
	 * @name  __add__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__add__"] = new Sk.builtin.func(function (self, other) {

	    Sk.builtin.pyCheckArgs("__add__", arguments, 1, 1, false, true);

	    return self.sq$concat(other);

	});

	/**
	 * Python wrapper of `__mul__` method.
	 *
	 * @name  __mul__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__mul__"] = new Sk.builtin.func(function (self, n) {

	    Sk.builtin.pyCheckArgs("__mul__", arguments, 1, 1, false, true);

	    if (!Sk.misceval.isIndex(n)) {
	        throw new Sk.builtin.TypeError("can't multiply sequence by non-int of type '" + Sk.abstr.typeName(n) + "'");
	    }

	    return self.sq$repeat(n);

	});

	/**
	 * Python wrapper of `__rmul__` method.
	 *
	 * @name  __rmul__
	 * @instance
	 * @memberOf Sk.builtin.seqtype.prototype
	 */
	Sk.builtin.seqtype.prototype["__rmul__"] = new Sk.builtin.func(function (self, n) {

	    Sk.builtin.pyCheckArgs("__rmul__", arguments, 1, 1, false, true);

	    return self.sq$repeat(n);    

	});



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/str.js ---- */ 

	Sk.builtin.interned = {};

	/**
	 * @constructor
	 * @param {*} x
	 * @extends Sk.builtin.object
	 */
	Sk.builtin.str = function (x) {
	    var ret;
	    if (x === undefined) {
	        x = "";
	    }
	    if (x instanceof Sk.builtin.str) {
	        return x;
	    }
	    if (!(this instanceof Sk.builtin.str)) {
	        return new Sk.builtin.str(x);
	    }


	    // convert to js string
	    if (x === true) {
	        ret = "True";
	    } else if (x === false) {
	        ret = "False";
	    } else if ((x === null) || (x instanceof Sk.builtin.none)) {
	        ret = "None";
	    } else if (x instanceof Sk.builtin.bool) {
	        if (x.v) {
	            ret = "True";
	        } else {
	            ret = "False";
	        }
	    } else if (typeof x === "number") {
	        ret = x.toString();
	        if (ret === "Infinity") {
	            ret = "inf";
	        } else if (ret === "-Infinity") {
	            ret = "-inf";
	        }
	    } else if (typeof x === "string") {
	        ret = x;
	    } else if (x.tp$str !== undefined) {
	        ret = x.tp$str();
	        if (!(ret instanceof Sk.builtin.str)) {
	            throw new Sk.builtin.ValueError("__str__ didn't return a str");
	        }
	        return ret;
	    } else {
	        return Sk.misceval.objectRepr(x);
	    }

	    // interning required for strings in py
	    if (Sk.builtin.interned["1" + ret]) {
	        return Sk.builtin.interned["1" + ret];
	    }

	    this.__class__ = Sk.builtin.str;
	    this.v = ret;
	    this["v"] = this.v;
	    Sk.builtin.interned["1" + ret] = this;
	    return this;

	};
	goog.exportSymbol("Sk.builtin.str", Sk.builtin.str);

	Sk.abstr.setUpInheritance("str", Sk.builtin.str, Sk.builtin.seqtype);

	Sk.builtin.str.prototype.mp$subscript = function (index) {
	    var ret;
	    if (Sk.misceval.isIndex(index)) {
	        index = Sk.misceval.asIndex(index);
	        if (index < 0) {
	            index = this.v.length + index;
	        }
	        if (index < 0 || index >= this.v.length) {
	            throw new Sk.builtin.IndexError("string index out of range");
	        }
	        return new Sk.builtin.str(this.v.charAt(index));
	    } else if (index instanceof Sk.builtin.slice) {
	        ret = "";
	        index.sssiter$(this, function (i, wrt) {
	            if (i >= 0 && i < wrt.v.length) {
	                ret += wrt.v.charAt(i);
	            }
	        });
	        return new Sk.builtin.str(ret);
	    } else {
	        throw new Sk.builtin.TypeError("string indices must be integers, not " + Sk.abstr.typeName(index));
	    }
	};

	Sk.builtin.str.prototype.sq$length = function () {
	    return this.v.length;
	};
	Sk.builtin.str.prototype.sq$concat = function (other) {
	    var otypename;
	    if (!other || !Sk.builtin.checkString(other)) {
	        otypename = Sk.abstr.typeName(other);
	        throw new Sk.builtin.TypeError("cannot concatenate 'str' and '" + otypename + "' objects");
	    }
	    return new Sk.builtin.str(this.v + other.v);
	};
	Sk.builtin.str.prototype.nb$add = Sk.builtin.str.prototype.sq$concat;
	Sk.builtin.str.prototype.nb$inplace_add = Sk.builtin.str.prototype.sq$concat;
	Sk.builtin.str.prototype.sq$repeat = function (n) {
	    var i;
	    var ret;

	    if (!Sk.misceval.isIndex(n)) {
	        throw new Sk.builtin.TypeError("can't multiply sequence by non-int of type '" + Sk.abstr.typeName(n) + "'");
	    }

	    n = Sk.misceval.asIndex(n);
	    ret = "";
	    for (i = 0; i < n; ++i) {
	        ret += this.v;
	    }
	    return new Sk.builtin.str(ret);
	};
	Sk.builtin.str.prototype.nb$multiply = Sk.builtin.str.prototype.sq$repeat;
	Sk.builtin.str.prototype.nb$inplace_multiply = Sk.builtin.str.prototype.sq$repeat;
	Sk.builtin.str.prototype.sq$item = function () {
	    goog.asserts.fail();
	};
	Sk.builtin.str.prototype.sq$slice = function (i1, i2) {
	    i1 = Sk.builtin.asnum$(i1);
	    i2 = Sk.builtin.asnum$(i2);
	    if (i1 < 0) {
	        i1 = 0;
	    }
	    return new Sk.builtin.str(this.v.substr(i1, i2 - i1));
	};

	Sk.builtin.str.prototype.sq$contains = function (ob) {
	    if (!(ob instanceof Sk.builtin.str)) {
	        throw new Sk.builtin.TypeError("TypeError: 'In <string> requires string as left operand");
	    }
	    return this.v.indexOf(ob.v) != -1;
	};

	Sk.builtin.str.prototype.__iter__ = new Sk.builtin.func(function (self) {
	    return new Sk.builtin.str_iter_(self);
	});

	Sk.builtin.str.prototype.tp$iter = function () {
	    return new Sk.builtin.str_iter_(this);
	};

	Sk.builtin.str.prototype.tp$richcompare = function (other, op) {
	    if (!(other instanceof Sk.builtin.str)) {
	        return undefined;
	    }

	    switch (op) {
	        case "Lt":
	            return this.v < other.v;
	        case "LtE":
	            return this.v <= other.v;
	        case "Eq":
	            return this.v === other.v;
	        case "NotEq":
	            return this.v !== other.v;
	        case "Gt":
	            return this.v > other.v;
	        case "GtE":
	            return this.v >= other.v;
	        default:
	            goog.asserts.fail();
	    }
	};

	Sk.builtin.str.prototype["$r"] = function () {
	    // single is preferred
	    var ashex;
	    var c;
	    var i;
	    var ret;
	    var len;
	    var quote = "'";
	    //jshint ignore:start
	    if (this.v.indexOf("'") !== -1 && this.v.indexOf('"') === -1) {
	        quote = '"';
	    }
	    //jshint ignore:end
	    len = this.v.length;
	    ret = quote;
	    for (i = 0; i < len; ++i) {
	        c = this.v.charAt(i);
	        if (c === quote || c === "\\") {
	            ret += "\\" + c;
	        } else if (c === "\t") {
	            ret += "\\t";
	        } else if (c === "\n") {
	            ret += "\\n";
	        } else if (c === "\r") {
	            ret += "\\r";
	        } else if (c < " " || c >= 0x7f) {
	            ashex = c.charCodeAt(0).toString(16);
	            if (ashex.length < 2) {
	                ashex = "0" + ashex;
	            }
	            ret += "\\x" + ashex;
	        } else {
	            ret += c;
	        }
	    }
	    ret += quote;
	    return new Sk.builtin.str(ret);
	};


	Sk.builtin.str.re_escape_ = function (s) {
	    var c;
	    var i;
	    var ret = [];
	    var re = /^[A-Za-z0-9]+$/;
	    for (i = 0; i < s.length; ++i) {
	        c = s.charAt(i);

	        if (re.test(c)) {
	            ret.push(c);
	        } else {
	            if (c === "\\000") {
	                ret.push("\\000");
	            } else {
	                ret.push("\\" + c);
	            }
	        }
	    }
	    return ret.join("");
	};

	Sk.builtin.str.prototype["lower"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("lower", arguments, 1, 1);
	    return new Sk.builtin.str(self.v.toLowerCase());
	});

	Sk.builtin.str.prototype["upper"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("upper", arguments, 1, 1);
	    return new Sk.builtin.str(self.v.toUpperCase());
	});

	Sk.builtin.str.prototype["capitalize"] = new Sk.builtin.func(function (self) {
	    var i;
	    var cap;
	    var orig;
	    Sk.builtin.pyCheckArgs("capitalize", arguments, 1, 1);
	    orig = self.v;

	    if (orig.length === 0) {
	        return new Sk.builtin.str("");
	    }
	    cap = orig.charAt(0).toUpperCase();

	    for (i = 1; i < orig.length; i++) {
	        cap += orig.charAt(i).toLowerCase();
	    }
	    return new Sk.builtin.str(cap);
	});

	Sk.builtin.str.prototype["join"] = new Sk.builtin.func(function (self, seq) {
	    var it, i;
	    var arrOfStrs;
	    Sk.builtin.pyCheckArgs("join", arguments, 2, 2);
	    Sk.builtin.pyCheckType("seq", "iterable", Sk.builtin.checkIterable(seq));
	    arrOfStrs = [];
	    for (it = seq.tp$iter(), i = it.tp$iternext(); i !== undefined; i = it.tp$iternext()) {
	        if (i.constructor !== Sk.builtin.str) {
	            throw new Sk.builtin.TypeError("TypeError: sequence item " + arrOfStrs.length + ": expected string, " + typeof i + " found");
	        }
	        arrOfStrs.push(i.v);
	    }
	    return new Sk.builtin.str(arrOfStrs.join(self.v));
	});

	Sk.builtin.str.prototype["split"] = new Sk.builtin.func(function (self, on, howmany) {
	    var splits;
	    var index;
	    var match;
	    var result;
	    var s;
	    var str;
	    var regex;
	    Sk.builtin.pyCheckArgs("split", arguments, 1, 3);
	    if ((on === undefined) || (on instanceof Sk.builtin.none)) {
	        on = null;
	    }
	    if ((on !== null) && !Sk.builtin.checkString(on)) {
	        throw new Sk.builtin.TypeError("expected a string");
	    }
	    if ((on !== null) && on.v === "") {
	        throw new Sk.builtin.ValueError("empty separator");
	    }
	    if ((howmany !== undefined) && !Sk.builtin.checkInt(howmany)) {
	        throw new Sk.builtin.TypeError("an integer is required");
	    }

	    howmany = Sk.builtin.asnum$(howmany);
	    regex = /[\s]+/g;
	    str = self.v;
	    if (on === null) {
	        str = goog.string.trimLeft(str);
	    } else {
	        // Escape special characters in "on" so we can use a regexp
	        s = on.v.replace(/([.*+?=|\\\/()\[\]\{\}^$])/g, "\\$1");
	        regex = new RegExp(s, "g");
	    }

	    // This is almost identical to re.split,
	    // except how the regexp is constructed

	    result = [];
	    index = 0;
	    splits = 0;
	    while ((match = regex.exec(str)) != null) {
	        if (match.index === regex.lastIndex) {
	            // empty match
	            break;
	        }
	        result.push(new Sk.builtin.str(str.substring(index, match.index)));
	        index = regex.lastIndex;
	        splits += 1;
	        if (howmany && (splits >= howmany)) {
	            break;
	        }
	    }
	    str = str.substring(index);
	    if (on !== null || (str.length > 0)) {
	        result.push(new Sk.builtin.str(str));
	    }

	    return new Sk.builtin.list(result);
	});

	Sk.builtin.str.prototype["strip"] = new Sk.builtin.func(function (self, chars) {
	    var regex;
	    var pattern;
	    Sk.builtin.pyCheckArgs("strip", arguments, 1, 2);
	    if ((chars !== undefined) && !Sk.builtin.checkString(chars)) {
	        throw new Sk.builtin.TypeError("strip arg must be None or str");
	    }
	    if (chars === undefined) {
	        pattern = /^\s+|\s+$/g;
	    } else {
	        regex = Sk.builtin.str.re_escape_(chars.v);
	        pattern = new RegExp("^[" + regex + "]+|[" + regex + "]+$", "g");
	    }
	    return new Sk.builtin.str(self.v.replace(pattern, ""));
	});

	Sk.builtin.str.prototype["lstrip"] = new Sk.builtin.func(function (self, chars) {
	    var regex;
	    var pattern;
	    Sk.builtin.pyCheckArgs("lstrip", arguments, 1, 2);
	    if ((chars !== undefined) && !Sk.builtin.checkString(chars)) {
	        throw new Sk.builtin.TypeError("lstrip arg must be None or str");
	    }
	    if (chars === undefined) {
	        pattern = /^\s+/g;
	    } else {
	        regex = Sk.builtin.str.re_escape_(chars.v);
	        pattern = new RegExp("^[" + regex + "]+", "g");
	    }
	    return new Sk.builtin.str(self.v.replace(pattern, ""));
	});

	Sk.builtin.str.prototype["rstrip"] = new Sk.builtin.func(function (self, chars) {
	    var regex;
	    var pattern;
	    Sk.builtin.pyCheckArgs("rstrip", arguments, 1, 2);
	    if ((chars !== undefined) && !Sk.builtin.checkString(chars)) {
	        throw new Sk.builtin.TypeError("rstrip arg must be None or str");
	    }
	    if (chars === undefined) {
	        pattern = /\s+$/g;
	    } else {
	        regex = Sk.builtin.str.re_escape_(chars.v);
	        pattern = new RegExp("[" + regex + "]+$", "g");
	    }
	    return new Sk.builtin.str(self.v.replace(pattern, ""));
	});

	Sk.builtin.str.prototype["partition"] = new Sk.builtin.func(function (self, sep) {
	    var pos;
	    var sepStr;
	    Sk.builtin.pyCheckArgs("partition", arguments, 2, 2);
	    Sk.builtin.pyCheckType("sep", "string", Sk.builtin.checkString(sep));
	    sepStr = new Sk.builtin.str(sep);
	    pos = self.v.indexOf(sepStr.v);
	    if (pos < 0) {
	        return new Sk.builtin.tuple([self, Sk.builtin.str.$emptystr, Sk.builtin.str.$emptystr]);
	    }

	    return new Sk.builtin.tuple([
	        new Sk.builtin.str(self.v.substring(0, pos)),
	        sepStr,
	        new Sk.builtin.str(self.v.substring(pos + sepStr.v.length))]);
	});

	Sk.builtin.str.prototype["rpartition"] = new Sk.builtin.func(function (self, sep) {
	    var pos;
	    var sepStr;
	    Sk.builtin.pyCheckArgs("rpartition", arguments, 2, 2);
	    Sk.builtin.pyCheckType("sep", "string", Sk.builtin.checkString(sep));
	    sepStr = new Sk.builtin.str(sep);
	    pos = self.v.lastIndexOf(sepStr.v);
	    if (pos < 0) {
	        return new Sk.builtin.tuple([Sk.builtin.str.$emptystr, Sk.builtin.str.$emptystr, self]);
	    }

	    return new Sk.builtin.tuple([
	        new Sk.builtin.str(self.v.substring(0, pos)),
	        sepStr,
	        new Sk.builtin.str(self.v.substring(pos + sepStr.v.length))]);
	});

	Sk.builtin.str.prototype["count"] = new Sk.builtin.func(function (self, pat, start, end) {
	    var normaltext;
	    var ctl;
	    var slice;
	    var m;
	    Sk.builtin.pyCheckArgs("count", arguments, 2, 4);
	    if (!Sk.builtin.checkString(pat)) {
	        throw new Sk.builtin.TypeError("expected a character buffer object");
	    }
	    if ((start !== undefined) && !Sk.builtin.checkInt(start)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }
	    if ((end !== undefined) && !Sk.builtin.checkInt(end)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }

	    if (start === undefined) {
	        start = 0;
	    } else {
	        start = Sk.builtin.asnum$(start);
	        start = start >= 0 ? start : self.v.length + start;
	    }

	    if (end === undefined) {
	        end = self.v.length;
	    } else {
	        end = Sk.builtin.asnum$(end);
	        end = end >= 0 ? end : self.v.length + end;
	    }

	    normaltext = pat.v.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	    m = new RegExp(normaltext, "g");
	    slice = self.v.slice(start, end);
	    ctl = slice.match(m);
	    if (!ctl) {
	        return  new Sk.builtin.int_(0);
	    } else {
	        return new Sk.builtin.int_(ctl.length);
	    }

	});

	Sk.builtin.str.prototype["ljust"] = new Sk.builtin.func(function (self, len, fillchar) {
	    var newstr;
	    Sk.builtin.pyCheckArgs("ljust", arguments, 2, 3);
	    if (!Sk.builtin.checkInt(len)) {
	        throw new Sk.builtin.TypeError("integer argument exepcted, got " + Sk.abstr.typeName(len));
	    }
	    if ((fillchar !== undefined) && (!Sk.builtin.checkString(fillchar) || fillchar.v.length !== 1)) {
	        throw new Sk.builtin.TypeError("must be char, not " + Sk.abstr.typeName(fillchar));
	    }
	    if (fillchar === undefined) {
	        fillchar = " ";
	    } else {
	        fillchar = fillchar.v;
	    }
	    len = Sk.builtin.asnum$(len);
	    if (self.v.length >= len) {
	        return self;
	    } else {
	        newstr = Array.prototype.join.call({length: Math.floor(len - self.v.length) + 1}, fillchar);
	        return new Sk.builtin.str(self.v + newstr);
	    }
	});

	Sk.builtin.str.prototype["rjust"] = new Sk.builtin.func(function (self, len, fillchar) {
	    var newstr;
	    Sk.builtin.pyCheckArgs("rjust", arguments, 2, 3);
	    if (!Sk.builtin.checkInt(len)) {
	        throw new Sk.builtin.TypeError("integer argument exepcted, got " + Sk.abstr.typeName(len));
	    }
	    if ((fillchar !== undefined) && (!Sk.builtin.checkString(fillchar) || fillchar.v.length !== 1)) {
	        throw new Sk.builtin.TypeError("must be char, not " + Sk.abstr.typeName(fillchar));
	    }
	    if (fillchar === undefined) {
	        fillchar = " ";
	    } else {
	        fillchar = fillchar.v;
	    }
	    len = Sk.builtin.asnum$(len);
	    if (self.v.length >= len) {
	        return self;
	    } else {
	        newstr = Array.prototype.join.call({length: Math.floor(len - self.v.length) + 1}, fillchar);
	        return new Sk.builtin.str(newstr + self.v);
	    }

	});

	Sk.builtin.str.prototype["center"] = new Sk.builtin.func(function (self, len, fillchar) {
	    var newstr;
	    var newstr1;
	    Sk.builtin.pyCheckArgs("center", arguments, 2, 3);
	    if (!Sk.builtin.checkInt(len)) {
	        throw new Sk.builtin.TypeError("integer argument exepcted, got " + Sk.abstr.typeName(len));
	    }
	    if ((fillchar !== undefined) && (!Sk.builtin.checkString(fillchar) || fillchar.v.length !== 1)) {
	        throw new Sk.builtin.TypeError("must be char, not " + Sk.abstr.typeName(fillchar));
	    }
	    if (fillchar === undefined) {
	        fillchar = " ";
	    } else {
	        fillchar = fillchar.v;
	    }
	    len = Sk.builtin.asnum$(len);
	    if (self.v.length >= len) {
	        return self;
	    } else {
	        newstr1 = Array.prototype.join.call({length: Math.floor((len - self.v.length) / 2) + 1}, fillchar);
	        newstr = newstr1 + self.v + newstr1;
	        if (newstr.length < len) {
	            newstr = newstr + fillchar;
	        }
	        return new Sk.builtin.str(newstr);
	    }

	});

	Sk.builtin.str.prototype["find"] = new Sk.builtin.func(function (self, tgt, start, end) {
	    var idx;
	    Sk.builtin.pyCheckArgs("find", arguments, 2, 4);
	    if (!Sk.builtin.checkString(tgt)) {
	        throw new Sk.builtin.TypeError("expected a character buffer object");
	    }
	    if ((start !== undefined) && !Sk.builtin.checkInt(start)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }
	    if ((end !== undefined) && !Sk.builtin.checkInt(end)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }

	    if (start === undefined) {
	        start = 0;
	    } else {
	        start = Sk.builtin.asnum$(start);
	        start = start >= 0 ? start : self.v.length + start;
	    }

	    if (end === undefined) {
	        end = self.v.length;
	    } else {
	        end = Sk.builtin.asnum$(end);
	        end = end >= 0 ? end : self.v.length + end;
	    }

	    idx = self.v.indexOf(tgt.v, start);
	    idx = ((idx >= start) && (idx < end)) ? idx : -1;

	    return new Sk.builtin.int_(idx);
	});

	Sk.builtin.str.prototype["index"] = new Sk.builtin.func(function (self, tgt, start, end) {
	    var idx;
	    Sk.builtin.pyCheckArgs("index", arguments, 2, 4);
	    idx = Sk.misceval.callsim(self["find"], self, tgt, start, end);
	    if (Sk.builtin.asnum$(idx) === -1) {
	        throw new Sk.builtin.ValueError("substring not found");
	    }
	    return idx;
	});

	Sk.builtin.str.prototype["rfind"] = new Sk.builtin.func(function (self, tgt, start, end) {
	    var idx;
	    Sk.builtin.pyCheckArgs("rfind", arguments, 2, 4);
	    if (!Sk.builtin.checkString(tgt)) {
	        throw new Sk.builtin.TypeError("expected a character buffer object");
	    }
	    if ((start !== undefined) && !Sk.builtin.checkInt(start)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }
	    if ((end !== undefined) && !Sk.builtin.checkInt(end)) {
	        throw new Sk.builtin.TypeError("slice indices must be integers or None or have an __index__ method");
	    }

	    if (start === undefined) {
	        start = 0;
	    } else {
	        start = Sk.builtin.asnum$(start);
	        start = start >= 0 ? start : self.v.length + start;
	    }

	    if (end === undefined) {
	        end = self.v.length;
	    } else {
	        end = Sk.builtin.asnum$(end);
	        end = end >= 0 ? end : self.v.length + end;
	    }

	    idx = self.v.lastIndexOf(tgt.v, end);
	    idx = (idx !== end) ? idx : self.v.lastIndexOf(tgt.v, end - 1);
	    idx = ((idx >= start) && (idx < end)) ? idx : -1;

	    return new Sk.builtin.int_(idx);
	});

	Sk.builtin.str.prototype["rindex"] = new Sk.builtin.func(function (self, tgt, start, end) {
	    var idx;
	    Sk.builtin.pyCheckArgs("rindex", arguments, 2, 4);
	    idx = Sk.misceval.callsim(self["rfind"], self, tgt, start, end);
	    if (Sk.builtin.asnum$(idx) === -1) {
	        throw new Sk.builtin.ValueError("substring not found");
	    }
	    return idx;
	});

	Sk.builtin.str.prototype["startswith"] = new Sk.builtin.func(function (self, tgt) {
	    Sk.builtin.pyCheckArgs("startswith", arguments, 2, 2);
	    Sk.builtin.pyCheckType("tgt", "string", Sk.builtin.checkString(tgt));
	    return new Sk.builtin.bool( self.v.indexOf(tgt.v) === 0);
	});

	// http://stackoverflow.com/questions/280634/endswith-in-javascript
	Sk.builtin.str.prototype["endswith"] = new Sk.builtin.func(function (self, tgt) {
	    Sk.builtin.pyCheckArgs("endswith", arguments, 2, 2);
	    Sk.builtin.pyCheckType("tgt", "string", Sk.builtin.checkString(tgt));
	    return new Sk.builtin.bool( self.v.indexOf(tgt.v, self.v.length - tgt.v.length) !== -1);
	});

	Sk.builtin.str.prototype["replace"] = new Sk.builtin.func(function (self, oldS, newS, count) {
	    var c;
	    var patt;
	    Sk.builtin.pyCheckArgs("replace", arguments, 3, 4);
	    Sk.builtin.pyCheckType("oldS", "string", Sk.builtin.checkString(oldS));
	    Sk.builtin.pyCheckType("newS", "string", Sk.builtin.checkString(newS));
	    if ((count !== undefined) && !Sk.builtin.checkInt(count)) {
	        throw new Sk.builtin.TypeError("integer argument expected, got " +
	            Sk.abstr.typeName(count));
	    }
	    count = Sk.builtin.asnum$(count);
	    patt = new RegExp(Sk.builtin.str.re_escape_(oldS.v), "g");

	    if ((count === undefined) || (count < 0)) {
	        return new Sk.builtin.str(self.v.replace(patt, newS.v));
	    }

	    c = 0;

	    function replacer (match) {
	        c++;
	        if (c <= count) {
	            return newS.v;
	        }
	        return match;
	    }

	    return new Sk.builtin.str(self.v.replace(patt, replacer));
	});

	Sk.builtin.str.prototype["zfill"] = new Sk.builtin.func(function (self, len) {
	    var str = self.v;
	    var ret;
	    var zeroes;
	    var offset;
	    var pad = "";

	    Sk.builtin.pyCheckArgs("zfill", arguments, 2, 2);
	    if (! Sk.builtin.checkInt(len)) {
	        throw new Sk.builtin.TypeError("integer argument exepected, got " + Sk.abstr.typeName(len));
	    }

	    // figure out how many zeroes are needed to make the proper length
	    zeroes = len.v - str.length;
	    // offset by 1 if there is a +/- at the beginning of the string
	    offset = (str[0] === "+" || str[0] === "-") ? 1 : 0;
	    for(var i = 0; i < zeroes; i++){
	        pad += "0";
	    }
	    // combine the string and the zeroes
	    ret = str.substr(0, offset) + pad + str.substr(offset);
	    return new Sk.builtin.str(ret);


	});

	Sk.builtin.str.prototype["isdigit"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isdigit", arguments, 1, 1);
	    return new Sk.builtin.bool( /^\d+$/.test(self.v));
	});

	Sk.builtin.str.prototype["isspace"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isspace", arguments, 1, 1);
	    return new Sk.builtin.bool( /^\s+$/.test(self.v));
	});


	Sk.builtin.str.prototype["expandtabs"] = new Sk.builtin.func(function (self, tabsize) {
	    // var input = self.v;
	    // var expanded = "";
	    // var split;
	    // var spacestr = "";
	    // var spacerem;


	    var spaces;
	    var expanded;

	    Sk.builtin.pyCheckArgs("expandtabs", arguments, 1, 2);


	    if ((tabsize !== undefined) && ! Sk.builtin.checkInt(tabsize)) {
	        throw new Sk.builtin.TypeError("integer argument exepected, got " + Sk.abstr.typeName(tabsize));
	    }
	    if (tabsize === undefined) {
	        tabsize = 8;
	    } else {
	        tabsize = Sk.builtin.asnum$(tabsize);
	    }

	    spaces = (new Array(tabsize + 1)).join(" ");
	    expanded = self.v.replace(/([^\r\n\t]*)\t/g, function(a, b) {
	        return b + spaces.slice(b.length % tabsize);
	    });
	    return new Sk.builtin.str(expanded);
	});

	Sk.builtin.str.prototype["swapcase"] = new Sk.builtin.func(function (self) {
	    var ret;
	    Sk.builtin.pyCheckArgs("swapcase", arguments, 1, 1);


	    ret = self.v.replace(/[a-z]/gi, function(c) {
	        var lc = c.toLowerCase();
	        return lc === c ? c.toUpperCase() : lc;
	    });

	    return new Sk.builtin.str(ret);
	});

	Sk.builtin.str.prototype["splitlines"] = new Sk.builtin.func(function (self, keepends) {
	    var data = self.v;
	    var i = 0;
	    var j = i;
	    var selflen = self.v.length;
	    var strs_w = [];
	    var ch;
	    var eol;
	    var sol = 0;
	    var slice;
	    Sk.builtin.pyCheckArgs("splitlines", arguments, 1, 2);
	    if ((keepends !== undefined) && ! Sk.builtin.checkBool(keepends)) {
	        throw new Sk.builtin.TypeError("boolean argument expected, got " + Sk.abstr.typeName(keepends));
	    }
	    if (keepends === undefined) {
	        keepends = false;
	    } else {
	        keepends = keepends.v;
	    }


	    for (i = 0; i < selflen; i ++) {
	        ch = data.charAt(i);
	        if (data.charAt(i + 1) === "\n" && ch === "\r") {
	            eol = i + 2;
	            slice = data.slice(sol, eol);
	            if (! keepends) {
	                slice = slice.replace(/(\r|\n)/g, "");
	            }
	            strs_w.push(new Sk.builtin.str(slice));
	            sol = eol;
	        } else if ((ch === "\n" && data.charAt(i - 1) !== "\r") || ch === "\r") {
	            eol = i + 1;
	            slice = data.slice(sol, eol);
	            if (! keepends) {
	                slice = slice.replace(/(\r|\n)/g, "");
	            }
	            strs_w.push(new Sk.builtin.str(slice));
	            sol = eol;
	        }

	    }
	    if (sol < selflen) {
	        eol = selflen;
	        slice = data.slice(sol, eol);
	        if (! keepends) {
	            slice = slice.replace(/(\r|\n)/g, "");
	        }
	        strs_w.push(new Sk.builtin.str(slice));
	    }
	    return new Sk.builtin.list(strs_w);
	});

	Sk.builtin.str.prototype["title"] = new Sk.builtin.func(function (self) {
	    var ret;

	    Sk.builtin.pyCheckArgs("title", arguments, 1, 1);

	    ret = self.v.replace(/[a-z][a-z]*/gi, function(str) {
	        return str[0].toUpperCase() + str.substr(1).toLowerCase();
	    });

	    return new Sk.builtin.str(ret);
	});

	Sk.builtin.str.prototype["isalpha"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isalpha", arguments, 1, 1);
	    return new Sk.builtin.bool( self.v.length && goog.string.isAlpha(self.v));
	});

	Sk.builtin.str.prototype["isalnum"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isalnum", arguments, 1, 1);
	    return new Sk.builtin.bool( self.v.length && goog.string.isAlphaNumeric(self.v));
	});

	// does not account for unicode numeric values
	Sk.builtin.str.prototype["isnumeric"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isnumeric", arguments, 1, 1);
	    return new Sk.builtin.bool( self.v.length && goog.string.isNumeric(self.v));
	});

	Sk.builtin.str.prototype["islower"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("islower", arguments, 1, 1);
	    return new Sk.builtin.bool( self.v.length && /[a-z]/.test(self.v) && !/[A-Z]/.test(self.v));
	});

	Sk.builtin.str.prototype["isupper"] = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("isupper", arguments, 1, 1);
	    return new Sk.builtin.bool( self.v.length && !/[a-z]/.test(self.v) && /[A-Z]/.test(self.v));
	});

	Sk.builtin.str.prototype["istitle"] = new Sk.builtin.func(function (self) {
	    // Comparing to str.title() seems the most intuitive thing, but it fails on "",
	    // Other empty-ish strings with no change.
	    var input = self.v;
	    var cased = false;
	    var previous_is_cased = false;
	    var pos;
	    var ch;
	    Sk.builtin.pyCheckArgs("istitle", arguments, 1, 1);
	    for (pos = 0; pos < input.length; pos ++) {
	        ch = input.charAt(pos);
	        if (! /[a-z]/.test(ch) && /[A-Z]/.test(ch)) {
	            if (previous_is_cased) {
	                return new Sk.builtin.bool( false);
	            }
	            previous_is_cased = true;
	            cased = true;
	        } else if (/[a-z]/.test(ch) && ! /[A-Z]/.test(ch)) {
	            if (! previous_is_cased) {
	                return new Sk.builtin.bool( false);
	            }
	            cased = true;
	        } else {
	            previous_is_cased = false;
	        }
	    }
	    return new Sk.builtin.bool( cased);
	});

	Sk.builtin.str.prototype.nb$remainder = function (rhs) {
	    // % format op. rhs can be a value, a tuple, or something with __getitem__ (dict)

	    // From http://docs.python.org/library/stdtypes.html#string-formatting the
	    // format looks like:
	    // 1. The '%' character, which marks the start of the specifier.
	    // 2. Mapping key (optional), consisting of a parenthesised sequence of characters (for example, (somename)).
	    // 3. Conversion flags (optional), which affect the result of some conversion types.
	    // 4. Minimum field width (optional). If specified as an '*' (asterisk), the actual width is read from the next
	    // element of the tuple in values, and the object to convert comes after the minimum field width and optional
	    // precision. 5. Precision (optional), given as a '.' (dot) followed by the precision. If specified as '*' (an
	    // asterisk), the actual width is read from the next element of the tuple in values, and the value to convert comes
	    // after the precision. 6. Length modifier (optional). 7. Conversion type.  length modifier is ignored

	    var ret;
	    var replFunc;
	    var index;
	    var regex;
	    if (rhs.constructor !== Sk.builtin.tuple && (rhs.mp$subscript === undefined || rhs.constructor === Sk.builtin.str)) {
	        rhs = new Sk.builtin.tuple([rhs]);
	    }

	    // general approach is to use a regex that matches the format above, and
	    // do an re.sub with a function as replacement to make the subs.

	    //           1 2222222222222222   33333333   444444444   5555555555555  66666  777777777777777777
	    regex = /%(\([a-zA-Z0-9]+\))?([#0 +\-]+)?(\*|[0-9]+)?(\.(\*|[0-9]+))?[hlL]?([diouxXeEfFgGcrs%])/g;
	    index = 0;
	    replFunc = function (substring, mappingKey, conversionFlags, fieldWidth, precision, precbody, conversionType) {
	        var result;
	        var convName;
	        var convValue;
	        var base;
	        var r;
	        var mk;
	        var value;
	        var handleWidth;
	        var formatNumber;
	        var alternateForm;
	        var precedeWithSign;
	        var blankBeforePositive;
	        var leftAdjust;
	        var zeroPad;
	        var i;
	        fieldWidth = Sk.builtin.asnum$(fieldWidth);
	        precision = Sk.builtin.asnum$(precision);

	        if (mappingKey === undefined || mappingKey === "") {
	            i = index++;
	        } // ff passes '' not undef for some reason

	        if (precision === "") { // ff passes '' here aswell causing problems with G,g, etc.
	            precision = undefined;
	        }

	        zeroPad = false;
	        leftAdjust = false;
	        blankBeforePositive = false;
	        precedeWithSign = false;
	        alternateForm = false;
	        if (conversionFlags) {
	            if (conversionFlags.indexOf("-") !== -1) {
	                leftAdjust = true;
	            } else if (conversionFlags.indexOf("0") !== -1) {
	                zeroPad = true;
	            }

	            if (conversionFlags.indexOf("+") !== -1) {
	                precedeWithSign = true;
	            } else if (conversionFlags.indexOf(" ") !== -1) {
	                blankBeforePositive = true;
	            }

	            alternateForm = conversionFlags.indexOf("#") !== -1;
	        }

	        if (precision) {
	            precision = parseInt(precision.substr(1), 10);
	        }

	        formatNumber = function (n, base) {
	            var precZeroPadded;
	            var prefix;
	            var didSign;
	            var neg;
	            var r;
	            var j;
	            base = Sk.builtin.asnum$(base);
	            neg = false;
	            didSign = false;
	            if (typeof n === "number") {
	                if (n < 0) {
	                    n = -n;
	                    neg = true;
	                }
	                r = n.toString(base);
	            } else if (n instanceof Sk.builtin.float_) {
	                r = n.str$(base, false);
	                if (r.length > 2 && r.substr(-2) === ".0") {
	                    r = r.substr(0, r.length - 2);
	                }
	                neg = n.nb$isnegative();
	            } else if (n instanceof Sk.builtin.int_) {
	                r = n.str$(base, false);
	                neg = n.nb$isnegative();
	            } else if (n instanceof Sk.builtin.lng) {
	                r = n.str$(base, false);
	                neg = n.nb$isnegative();	//	neg = n.size$ < 0;	RNL long.js change
	            }

	            goog.asserts.assert(r !== undefined, "unhandled number format");

	            precZeroPadded = false;

	            if (precision) {
	                //print("r.length",r.length,"precision",precision);
	                for (j = r.length; j < precision; ++j) {
	                    r = "0" + r;
	                    precZeroPadded = true;
	                }
	            }

	            prefix = "";

	            if (neg) {
	                prefix = "-";
	            } else if (precedeWithSign) {
	                prefix = "+" + prefix;
	            } else if (blankBeforePositive) {
	                prefix = " " + prefix;
	            }

	            if (alternateForm) {
	                if (base === 16) {
	                    prefix += "0x";
	                } else if (base === 8 && !precZeroPadded && r !== "0") {
	                    prefix += "0";
	                }
	            }

	            return [prefix, r];
	        };

	        handleWidth = function (args) {
	            var totLen;
	            var prefix = args[0];
	            var r = args[1];
	            var j;
	            if (fieldWidth) {
	                fieldWidth = parseInt(fieldWidth, 10);
	                totLen = r.length + prefix.length;
	                if (zeroPad) {
	                    for (j = totLen; j < fieldWidth; ++j) {
	                        r = "0" + r;
	                    }
	                } else if (leftAdjust) {
	                    for (j = totLen; j < fieldWidth; ++j) {
	                        r = r + " ";
	                    }
	                } else {
	                    for (j = totLen; j < fieldWidth; ++j) {
	                        prefix = " " + prefix;
	                    }
	                }
	            }
	            return prefix + r;
	        };

	        //print("Rhs:",rhs, "ctor", rhs.constructor);
	        if (rhs.constructor === Sk.builtin.tuple) {
	            value = rhs.v[i];
	        } else if (rhs.mp$subscript !== undefined && mappingKey !== undefined) {
	            mk = mappingKey.substring(1, mappingKey.length - 1);
	            //print("mk",mk);
	            value = rhs.mp$subscript(new Sk.builtin.str(mk));
	        } else if (rhs.constructor === Sk.builtin.dict || rhs.constructor === Sk.builtin.list) {
	            // new case where only one argument is provided
	            value = rhs;
	        } else {
	            throw new Sk.builtin.AttributeError(rhs.tp$name + " instance has no attribute 'mp$subscript'");
	        }
	        base = 10;
	        if (conversionType === "d" || conversionType === "i") {
	            return handleWidth(formatNumber(value, 10));
	        } else if (conversionType === "o") {
	            return handleWidth(formatNumber(value, 8));
	        } else if (conversionType === "x") {
	            return handleWidth(formatNumber(value, 16));
	        } else if (conversionType === "X") {
	            return handleWidth(formatNumber(value, 16)).toUpperCase();
	        } else if (conversionType === "f" || conversionType === "F" || conversionType === "e" || conversionType === "E" || conversionType === "g" || conversionType === "G") {
	            convValue = Sk.builtin.asnum$(value);
	            if (typeof convValue === "string") {
	                convValue = Number(convValue);
	            }
	            if (convValue === Infinity) {
	                return "inf";
	            }
	            if (convValue === -Infinity) {
	                return "-inf";
	            }
	            if (isNaN(convValue)) {
	                return "nan";
	            }
	            convName = ["toExponential", "toFixed", "toPrecision"]["efg".indexOf(conversionType.toLowerCase())];
	            if (precision === undefined || precision === "") {
	                if (conversionType === "e" || conversionType === "E") {
	                    precision = 6;
	                } else if (conversionType === "f" || conversionType === "F") {
	                    precision = 7;
	                }
	            }
	            result = (convValue)[convName](precision); // possible loose of negative zero sign

	            // apply sign to negative zeros, floats only!
	            if(Sk.builtin.checkFloat(value)) {
	                if(convValue === 0 && 1/convValue === -Infinity) {
	                    result = "-" + result; // add sign for zero
	                }
	            }

	            if ("EFG".indexOf(conversionType) !== -1) {
	                result = result.toUpperCase();
	            }
	            return handleWidth(["", result]);
	        } else if (conversionType === "c") {
	            if (typeof value === "number") {
	                return String.fromCharCode(value);
	            } else if (value instanceof Sk.builtin.int_) {
	                return String.fromCharCode(value.v);
	            } else if (value instanceof Sk.builtin.float_) {
	                return String.fromCharCode(value.v);
	            } else if (value instanceof Sk.builtin.lng) {
	                return String.fromCharCode(value.str$(10, false)[0]);
	            } else if (value.constructor === Sk.builtin.str) {
	                return value.v.substr(0, 1);
	            } else {
	                throw new Sk.builtin.TypeError("an integer is required");
	            }
	        } else if (conversionType === "r") {
	            r = Sk.builtin.repr(value);
	            if (precision) {
	                return r.v.substr(0, precision);
	            }
	            return r.v;
	        } else if (conversionType === "s") {
	            r = new Sk.builtin.str(value);
	            if (precision) {
	                return r.v.substr(0, precision);
	            }
	            if(fieldWidth) {
	                r.v = handleWidth([" ", r.v]);
	            }
	            return r.v;
	        } else if (conversionType === "%") {
	            return "%";
	        }
	    };

	    ret = this.v.replace(regex, replFunc);
	    return new Sk.builtin.str(ret);
	};

	/**
	 * @constructor
	 * @param {Object} obj
	 */
	Sk.builtin.str_iter_ = function (obj) {
	    if (!(this instanceof Sk.builtin.str_iter_)) {
	        return new Sk.builtin.str_iter_(obj);
	    }
	    this.$index = 0;
	    this.$obj = obj.v.slice();
	    this.sq$length = this.$obj.length;
	    this.tp$iter = this;
	    this.tp$iternext = function () {
	        if (this.$index >= this.sq$length) {
	            return undefined;
	        }
	        return new Sk.builtin.str(this.$obj.substr(this.$index++, 1));
	    };
	    this.$r = function () {
	        return new Sk.builtin.str("iterator");
	    };
	    return this;
	};

	Sk.abstr.setUpInheritance("iterator", Sk.builtin.str_iter_, Sk.builtin.object);

	Sk.builtin.str_iter_.prototype.__class__ = Sk.builtin.str_iter_;

	Sk.builtin.str_iter_.prototype.__iter__ = new Sk.builtin.func(function (self) {
	    Sk.builtin.pyCheckArgs("__iter__", arguments, 0, 0, true, false);
	    return self;
	});

	Sk.builtin.str_iter_.prototype["next"] = new Sk.builtin.func(function (self) {
	    var ret = self.tp$iternext();
	    if (ret === undefined) {
	        throw new Sk.builtin.StopIteration();
	    }
	    return ret;
	});



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/tokenize.js ---- */ 

	/*
	 * This is a port of tokenize.py by Ka-Ping Yee.
	 *
	 * each call to readline should return one line of input as a string, or
	 * undefined if it's finished.
	 *
	 * callback is called for each token with 5 args:
	 * 1. the token type
	 * 2. the token string
	 * 3. [ start_row, start_col ]
	 * 4. [ end_row, end_col ]
	 * 5. logical line where the token was found, including continuation lines
	 *
	 * callback can return true to abort.
	 *
	 */

	/**
	 * @constructor
	 */
	Sk.Tokenizer = function (filename, interactive, callback) {
	    this.filename = filename;
	    this.callback = callback;
	    this.lnum = 0;
	    this.parenlev = 0;
	    this.parenstack = [];
	    this.continued = false;
	    this.namechars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
	    this.numchars = "0123456789";
	    this.contstr = "";
	    this.needcont = false;
	    this.contline = undefined;
	    this.indents = [0];
	    this.endprog = /.*/;
	    this.strstart = [-1, -1];
	    this.interactive = interactive;
	    this.doneFunc = function () {
	        var i;
	        for (i = 1; i < this.indents.length; ++i) // pop remaining indent levels
	        {
	            if (this.callback(Sk.Tokenizer.Tokens.T_DEDENT, "", [this.lnum, 0], [this.lnum, 0], "")) {
	                return "done";
	            }
	        }
	        if (this.callback(Sk.Tokenizer.Tokens.T_ENDMARKER, "", [this.lnum, 0], [this.lnum, 0], "")) {
	            return "done";
	        }

	        return "failed";
	    };

	};

	/**
	 * @enum {number}
	 */
	Sk.Tokenizer.Tokens = {
	    T_ENDMARKER       : 0,
	    T_NAME            : 1,
	    T_NUMBER          : 2,
	    T_STRING          : 3,
	    T_NEWLINE         : 4,
	    T_INDENT          : 5,
	    T_DEDENT          : 6,
	    T_LPAR            : 7,
	    T_RPAR            : 8,
	    T_LSQB            : 9,
	    T_RSQB            : 10,
	    T_COLON           : 11,
	    T_COMMA           : 12,
	    T_SEMI            : 13,
	    T_PLUS            : 14,
	    T_MINUS           : 15,
	    T_STAR            : 16,
	    T_SLASH           : 17,
	    T_VBAR            : 18,
	    T_AMPER           : 19,
	    T_LESS            : 20,
	    T_GREATER         : 21,
	    T_EQUAL           : 22,
	    T_DOT             : 23,
	    T_PERCENT         : 24,
	    T_BACKQUOTE       : 25,
	    T_LBRACE          : 26,
	    T_RBRACE          : 27,
	    T_EQEQUAL         : 28,
	    T_NOTEQUAL        : 29,
	    T_LESSEQUAL       : 30,
	    T_GREATEREQUAL    : 31,
	    T_TILDE           : 32,
	    T_CIRCUMFLEX      : 33,
	    T_LEFTSHIFT       : 34,
	    T_RIGHTSHIFT      : 35,
	    T_DOUBLESTAR      : 36,
	    T_PLUSEQUAL       : 37,
	    T_MINEQUAL        : 38,
	    T_STAREQUAL       : 39,
	    T_SLASHEQUAL      : 40,
	    T_PERCENTEQUAL    : 41,
	    T_AMPEREQUAL      : 42,
	    T_VBAREQUAL       : 43,
	    T_CIRCUMFLEXEQUAL : 44,
	    T_LEFTSHIFTEQUAL  : 45,
	    T_RIGHTSHIFTEQUAL : 46,
	    T_DOUBLESTAREQUAL : 47,
	    T_DOUBLESLASH     : 48,
	    T_DOUBLESLASHEQUAL: 49,
	    T_AT              : 50,
	    T_OP              : 51,
	    T_COMMENT         : 52,
	    T_NL              : 53,
	    T_RARROW          : 54,
	    T_ERRORTOKEN      : 55,
	    T_N_TOKENS        : 56,
	    T_NT_OFFSET       : 256
	};

	/** @param {...*} x */
	function group (x) {
	    var args = Array.prototype.slice.call(arguments);
	    return "(" + args.join("|") + ")";
	}

	/** @param {...*} x */
	function any (x) {
	    return group.apply(null, arguments) + "*";
	}

	/** @param {...*} x */
	function maybe (x) {
	    return group.apply(null, arguments) + "?";
	}

	/* we have to use string and ctor to be able to build patterns up. + on /.../
	 * does something strange. */
	var Whitespace = "[ \\f\\t]*";
	var Comment_ = "#[^\\r\\n]*";
	var Ident = "[a-zA-Z_]\\w*";

	var Binnumber = "0[bB][01]*";
	var Hexnumber = "0[xX][\\da-fA-F]*[lL]?";
	var Octnumber = "0[oO]?[0-7]*[lL]?";
	var Decnumber = "[1-9]\\d*[lL]?";
	var Intnumber = group(Binnumber, Hexnumber, Octnumber, Decnumber);

	var Exponent = "[eE][-+]?\\d+";
	var Pointfloat = group("\\d+\\.\\d*", "\\.\\d+") + maybe(Exponent);
	var Expfloat = "\\d+" + Exponent;
	var Floatnumber = group(Pointfloat, Expfloat);
	var Imagnumber = group("\\d+[jJ]", Floatnumber + "[jJ]");
	var Number_ = group(Imagnumber, Floatnumber, Intnumber);

	// tail end of ' string
	var Single = "^[^'\\\\]*(?:\\\\.[^'\\\\]*)*'";
	// tail end of " string
	var Double_ = '^[^"\\\\]*(?:\\\\.[^"\\\\]*)*"';
	// tail end of ''' string
	var Single3 = "[^'\\\\]*(?:(?:\\\\.|'(?!''))[^'\\\\]*)*'''";
	// tail end of """ string
	var Double3 = '[^"\\\\]*(?:(?:\\\\.|"(?!""))[^"\\\\]*)*"""';
	var Triple = group("[ubUB]?[rR]?'''", '[ubUB]?[rR]?"""');
	var String_ = group("[uU]?[rR]?'[^\\n'\\\\]*(?:\\\\.[^\\n'\\\\]*)*'",
	    '[uU]?[rR]?"[^\\n"\\\\]*(?:\\\\.[^\\n"\\\\]*)*"');

	// Because of leftmost-then-longest match semantics, be sure to put the
	// longest operators first (e.g., if = came before ==, == would get
	// recognized as two instances of =).
	var Operator = group("\\*\\*=?", ">>=?", "<<=?", "<>", "!=",
	    "//=?", "->",
	    "[+\\-*/%&|^=<>]=?",
	    "~");

	var Bracket = "[\\][(){}]";
	var Special = group("\\r?\\n", "[:;.,`@]");
	var Funny = group(Operator, Bracket, Special);

	var ContStr = group("[uUbB]?[rR]?'[^\\n'\\\\]*(?:\\\\.[^\\n'\\\\]*)*" +
	        group("'", "\\\\\\r?\\n"),
	        "[uUbB]?[rR]?\"[^\\n\"\\\\]*(?:\\\\.[^\\n\"\\\\]*)*" +
	        group("\"", "\\\\\\r?\\n"));
	var PseudoExtras = group("\\\\\\r?\\n", Comment_, Triple);
	// Need to prefix with "^" as we only want to match what's next
	var PseudoToken = "^" + group(PseudoExtras, Number_, Funny, ContStr, Ident);


	var triple_quoted = {
	    "'''"  : true, '"""': true,
	    "r'''" : true, 'r"""': true, "R'''": true, 'R"""': true,
	    "u'''" : true, 'u"""': true, "U'''": true, 'U"""': true,
	    "b'''" : true, 'b"""': true, "B'''": true, 'B"""': true,
	    "ur'''": true, 'ur"""': true, "Ur'''": true, 'Ur"""': true,
	    "uR'''": true, 'uR"""': true, "UR'''": true, 'UR"""': true,
	    "br'''": true, 'br"""': true, "Br'''": true, 'Br"""': true,
	    "bR'''": true, 'bR"""': true, "BR'''": true, 'BR"""': true
	};

	var single_quoted = {
	    "'"  : true, '"': true,
	    "r'" : true, 'r"': true, "R'": true, 'R"': true,
	    "u'" : true, 'u"': true, "U'": true, 'U"': true,
	    "b'" : true, 'b"': true, "B'": true, 'B"': true,
	    "ur'": true, 'ur"': true, "Ur'": true, 'Ur"': true,
	    "uR'": true, 'uR"': true, "UR'": true, 'UR"': true,
	    "br'": true, 'br"': true, "Br'": true, 'Br"': true,
	    "bR'": true, 'bR"': true, "BR'": true, 'BR"': true
	};

	// hack to make closure keep those objects. not sure what a better way is.
	(function () {
	    var k;
	    for (k in triple_quoted) {
	    }
	    for (k in single_quoted) {
	    }
	}());


	var tabsize = 8;

	function contains (a, obj) {
	    var i = a.length;
	    while (i--) {
	        if (a[i] === obj) {
	            return true;
	        }
	    }
	    return false;
	}

	function rstrip (input, what) {
	    var i;
	    for (i = input.length; i > 0; --i) {
	        if (what.indexOf(input.charAt(i - 1)) === -1) {
	            break;
	        }
	    }
	    return input.substring(0, i);
	}

	Sk.Tokenizer.prototype.generateTokens = function (line) {
	    var nl_pos;
	    var newl;
	    var initial;
	    var token;
	    var epos;
	    var spos;
	    var start;
	    var pseudomatch;
	    var capos;
	    var comment_token;
	    var endmatch, pos, column, end, max;


	    // bnm - Move these definitions in this function otherwise test state is preserved between
	    // calls on single3prog and double3prog causing weird errors with having multiple instances
	    // of triple quoted strings in the same program.

	    var pseudoprog = new RegExp(PseudoToken);
	    var single3prog = new RegExp(Single3, "g");
	    var double3prog = new RegExp(Double3, "g");

	    var endprogs = {     "'": new RegExp(Single, "g"), "\"": new RegExp(Double_, "g"),
	        "'''"               : single3prog, '"""': double3prog,
	        "r'''"              : single3prog, 'r"""': double3prog,
	        "u'''"              : single3prog, 'u"""': double3prog,
	        "b'''"              : single3prog, 'b"""': double3prog,
	        "ur'''"             : single3prog, 'ur"""': double3prog,
	        "br'''"             : single3prog, 'br"""': double3prog,
	        "R'''"              : single3prog, 'R"""': double3prog,
	        "U'''"              : single3prog, 'U"""': double3prog,
	        "B'''"              : single3prog, 'B"""': double3prog,
	        "uR'''"             : single3prog, 'uR"""': double3prog,
	        "Ur'''"             : single3prog, 'Ur"""': double3prog,
	        "UR'''"             : single3prog, 'UR"""': double3prog,
	        "bR'''"             : single3prog, 'bR"""': double3prog,
	        "Br'''"             : single3prog, 'Br"""': double3prog,
	        "BR'''"             : single3prog, 'BR"""': double3prog,
	        'r'                 : null, 'R': null,
	        'u'                 : null, 'U': null,
	        'b'                 : null, 'B': null
	    };


	    if (!line) {
	        line = '';
	    }
	    //print("LINE:'"+line+"'");

	    this.lnum += 1;
	    pos = 0;
	    max = line.length;

	    if (this.contstr.length > 0) {
	        if (!line) {
	            throw new Sk.builtin.SyntaxError("EOF in multi-line string", this.filename, this.strstart[0], this.strstart[1], {
	                kind: "STRING_EOF",
	                line: this.contline
	            });
	        }
	        this.endprog.lastIndex = 0;
	        endmatch = this.endprog.test(line);
	        if (endmatch) {
	            pos = end = this.endprog.lastIndex;
	            if (this.callback(Sk.Tokenizer.Tokens.T_STRING, this.contstr + line.substring(0, end),
	                this.strstart, [this.lnum, end], this.contline + line)) {
	                return 'done';
	            }
	            this.contstr = '';
	            this.needcont = false;
	            this.contline = undefined;
	        }
	        else if (this.needcont && line.substring(line.length - 2) !== "\\\n" && line.substring(line.length - 3) !== "\\\r\n") {
	            if (this.callback(Sk.Tokenizer.Tokens.T_ERRORTOKEN, this.contstr + line,
	                this.strstart, [this.lnum, line.length], this.contline)) {
	                return 'done';
	            }
	            this.contstr = '';
	            this.contline = undefined;
	            return false;
	        }
	        else {
	            this.contstr += line;
	            this.contline = this.contline + line;
	            return false;
	        }
	    }
	    else if (this.parenlev === 0 && !this.continued) {
	        if (!line) {
	            return this.doneFunc();
	        }
	        column = 0;
	        while (pos < max) {
	            if (line.charAt(pos) === ' ') {
	                column += 1;
	            }
	            else if (line.charAt(pos) === '\t') {
	                column = (column / tabsize + 1) * tabsize;
	            }
	            else if (line.charAt(pos) === '\f') {
	                column = 0;
	            }
	            else {
	                break;
	            }
	            pos = pos + 1;
	        }
	        if (pos === max) {
	            return this.doneFunc();
	        }

	        if ("#\r\n".indexOf(line.charAt(pos)) !== -1) // skip comments or blank lines
	        {
	            if (line.charAt(pos) === '#') {
	                comment_token = rstrip(line.substring(pos), '\r\n');
	                nl_pos = pos + comment_token.length;
	                if (this.callback(Sk.Tokenizer.Tokens.T_COMMENT, comment_token,
	                    [this.lnum, pos], [this.lnum, pos + comment_token.length], line)) {
	                    return 'done';
	                }
	                //print("HERE:1");
	                if (this.callback(Sk.Tokenizer.Tokens.T_NL, line.substring(nl_pos),
	                    [this.lnum, nl_pos], [this.lnum, line.length], line)) {
	                    return 'done';
	                }
	                return false;
	            }
	            else {
	                //print("HERE:2");
	                if (this.callback(Sk.Tokenizer.Tokens.T_NL, line.substring(pos),
	                    [this.lnum, pos], [this.lnum, line.length], line)) {
	                    return 'done';
	                }
	                if (!this.interactive) {
	                    return false;
	                }
	            }
	        }

	        if (column > this.indents[this.indents.length - 1]) // count indents or dedents
	        {
	            this.indents.push(column);
	            if (this.callback(Sk.Tokenizer.Tokens.T_INDENT, line.substring(0, pos), [this.lnum, 0], [this.lnum, pos], line)) {
	                return 'done';
	            }
	        }
	        while (column < this.indents[this.indents.length - 1]) {
	            if (!contains(this.indents, column)) {
	                throw new Sk.builtin.IndentationError("unindent does not match any outer indentation level",
	                    this.filename, this.lnum, pos, line);
	            }
	            this.indents.splice(this.indents.length - 1, 1);
	            //print("dedent here");
	            if (this.callback(Sk.Tokenizer.Tokens.T_DEDENT, '', [this.lnum, pos], [this.lnum, pos], line)) {
	                return 'done';
	            }
	        }
	    }
	    else // continued statement
	    {
	        if (!line) {
	            throw new Sk.builtin.SyntaxError("EOF in multi-line statement", this.filename, this.lnum, 0, {
	                kind: 'STATEMENT_EOF',
	                parenlev: this.parenlev,
	                parenstack: this.parenstack
	            });
	        }
	        this.continued = false;
	    }

	    while (pos < max) {
	        //print("pos:"+pos+":"+max);
	        // js regexes don't return any info about matches, other than the
	        // content. we'd like to put a \w+ before pseudomatch, but then we
	        // can't get any data
	        capos = line.charAt(pos);
	        while (capos === ' ' || capos === '\f' || capos === '\t') {
	            pos += 1;
	            capos = line.charAt(pos);
	        }
	        pseudoprog.lastIndex = 0;
	        pseudomatch = pseudoprog.exec(line.substring(pos));
	        if (pseudomatch) {
	            start = pos;
	            end = start + pseudomatch[1].length;
	            spos = [this.lnum, start];
	            epos = [this.lnum, end];
	            pos = end;
	            token = line.substring(start, end);
	            initial = line.charAt(start);
	            //Sk.debugout("token:",token, "initial:",initial, start, end);
	            if (this.numchars.indexOf(initial) !== -1 || (initial === '.' && token !== '.')) {
	                if (this.callback(Sk.Tokenizer.Tokens.T_NUMBER, token, spos, epos, line)) {
	                    return 'done';
	                }
	            }
	            else if (initial === '\r' || initial === '\n') {
	                newl = Sk.Tokenizer.Tokens.T_NEWLINE;
	                //print("HERE:3");
	                if (this.parenlev > 0) {
	                    newl = Sk.Tokenizer.Tokens.T_NL;
	                }
	                if (this.callback(newl, token, spos, epos, line)) {
	                    return 'done';
	                }
	            }
	            else if (initial === '#') {
	                if (this.callback(Sk.Tokenizer.Tokens.T_COMMENT, token, spos, epos, line)) {
	                    return 'done';
	                }
	            }
	            else if (triple_quoted.hasOwnProperty(token)) {
	                this.endprog = endprogs[token];
	                this.endprog.lastIndex = 0;
	                endmatch = this.endprog.test(line.substring(pos));
	                if (endmatch) {
	                    pos = this.endprog.lastIndex + pos;
	                    token = line.substring(start, pos);
	                    if (this.callback(Sk.Tokenizer.Tokens.T_STRING, token, spos, [this.lnum, pos], line)) {
	                        return 'done';
	                    }
	                }
	                else {
	                    this.strstart = [this.lnum, start];
	                    this.contstr = line.substring(start);
	                    this.contline = line;
	                    return false;
	                }
	            }
	            else if (single_quoted.hasOwnProperty(initial) ||
	                single_quoted.hasOwnProperty(token.substring(0, 2)) ||
	                single_quoted.hasOwnProperty(token.substring(0, 3))) {
	                if (token[token.length - 1] === '\n') {
	                    this.strstart = [this.lnum, start];
	                    this.endprog = endprogs[initial] || endprogs[token[1]] || endprogs[token[2]];
	                    this.contstr = line.substring(start);
	                    this.needcont = true;
	                    this.contline = line;
	                    //print("i, t1, t2", initial, token[1], token[2]);
	                    //print("ep, cs", this.endprog, this.contstr);
	                    return false;
	                }
	                else {
	                    if (this.callback(Sk.Tokenizer.Tokens.T_STRING, token, spos, epos, line)) {
	                        return 'done';
	                    }
	                }
	            }
	            else if (this.namechars.indexOf(initial) !== -1) {
	                if (this.callback(Sk.Tokenizer.Tokens.T_NAME, token, spos, epos, line)) {
	                    return 'done';
	                }
	            }
	            else if (initial === '\\') {
	                //print("HERE:4");
	                if (this.callback(Sk.Tokenizer.Tokens.T_NL, token, spos, [this.lnum, pos], line)) {
	                    return 'done';
	                }
	                this.continued = true;
	            }
	            else {
	                if ('([{'.indexOf(initial) !== -1) {
	                    this.parenlev += 1;
	                    this.parenstack.push([initial, this.lnum, pos]);
	                }
	                else if (')]}'.indexOf(initial) !== -1) {
	                    this.parenlev -= 1;
	                    this.parenstack.pop();
	                }
	                if (this.callback(Sk.Tokenizer.Tokens.T_OP, token, spos, epos, line)) {
	                    return 'done';
	                }
	            }
	        }
	        else {
	            if (this.callback(Sk.Tokenizer.Tokens.T_ERRORTOKEN, line.charAt(pos),
	                [this.lnum, pos], [this.lnum, pos + 1], line)) {
	                return 'done';
	            }
	            pos += 1;
	        }
	    }

	    return false;
	};

	Sk.Tokenizer.tokenNames = {
	    0  : 'T_ENDMARKER', 1: 'T_NAME', 2: 'T_NUMBER', 3: 'T_STRING', 4: 'T_NEWLINE',
	    5  : 'T_INDENT', 6: 'T_DEDENT', 7: 'T_LPAR', 8: 'T_RPAR', 9: 'T_LSQB',
	    10 : 'T_RSQB', 11: 'T_COLON', 12: 'T_COMMA', 13: 'T_SEMI', 14: 'T_PLUS',
	    15 : 'T_MINUS', 16: 'T_STAR', 17: 'T_SLASH', 18: 'T_VBAR', 19: 'T_AMPER',
	    20 : 'T_LESS', 21: 'T_GREATER', 22: 'T_EQUAL', 23: 'T_DOT', 24: 'T_PERCENT',
	    25 : 'T_BACKQUOTE', 26: 'T_LBRACE', 27: 'T_RBRACE', 28: 'T_EQEQUAL', 29: 'T_NOTEQUAL',
	    30 : 'T_LESSEQUAL', 31: 'T_GREATEREQUAL', 32: 'T_TILDE', 33: 'T_CIRCUMFLEX', 34: 'T_LEFTSHIFT',
	    35 : 'T_RIGHTSHIFT', 36: 'T_DOUBLESTAR', 37: 'T_PLUSEQUAL', 38: 'T_MINEQUAL', 39: 'T_STAREQUAL',
	    40 : 'T_SLASHEQUAL', 41: 'T_PERCENTEQUAL', 42: 'T_AMPEREQUAL', 43: 'T_VBAREQUAL', 44: 'T_CIRCUMFLEXEQUAL',
	    45 : 'T_LEFTSHIFTEQUAL', 46: 'T_RIGHTSHIFTEQUAL', 47: 'T_DOUBLESTAREQUAL', 48: 'T_DOUBLESLASH', 49: 'T_DOUBLESLASHEQUAL',
	    50 : 'T_AT', 51: 'T_OP', 52: 'T_COMMENT', 53: 'T_NL', 54: 'T_RARROW',
	    55 : 'T_ERRORTOKEN', 56: 'T_N_TOKENS',
	    256: 'T_NT_OFFSET'
	};

	goog.exportSymbol("Sk.Tokenizer", Sk.Tokenizer);
	goog.exportSymbol("Sk.Tokenizer.prototype.generateTokens", Sk.Tokenizer.prototype.generateTokens);
	goog.exportSymbol("Sk.Tokenizer.tokenNames", Sk.Tokenizer.tokenNames);



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/gen/parse_tables.js ---- */ 

	// generated by pgen/main.py
	Sk.OpMap = {
	"(": Sk.Tokenizer.Tokens.T_LPAR,
	")": Sk.Tokenizer.Tokens.T_RPAR,
	"[": Sk.Tokenizer.Tokens.T_LSQB,
	"]": Sk.Tokenizer.Tokens.T_RSQB,
	":": Sk.Tokenizer.Tokens.T_COLON,
	",": Sk.Tokenizer.Tokens.T_COMMA,
	";": Sk.Tokenizer.Tokens.T_SEMI,
	"+": Sk.Tokenizer.Tokens.T_PLUS,
	"-": Sk.Tokenizer.Tokens.T_MINUS,
	"*": Sk.Tokenizer.Tokens.T_STAR,
	"/": Sk.Tokenizer.Tokens.T_SLASH,
	"|": Sk.Tokenizer.Tokens.T_VBAR,
	"&": Sk.Tokenizer.Tokens.T_AMPER,
	"<": Sk.Tokenizer.Tokens.T_LESS,
	">": Sk.Tokenizer.Tokens.T_GREATER,
	"=": Sk.Tokenizer.Tokens.T_EQUAL,
	".": Sk.Tokenizer.Tokens.T_DOT,
	"%": Sk.Tokenizer.Tokens.T_PERCENT,
	"`": Sk.Tokenizer.Tokens.T_BACKQUOTE,
	"{": Sk.Tokenizer.Tokens.T_LBRACE,
	"}": Sk.Tokenizer.Tokens.T_RBRACE,
	"@": Sk.Tokenizer.Tokens.T_AT,
	"==": Sk.Tokenizer.Tokens.T_EQEQUAL,
	"!=": Sk.Tokenizer.Tokens.T_NOTEQUAL,
	"<>": Sk.Tokenizer.Tokens.T_NOTEQUAL,
	"<=": Sk.Tokenizer.Tokens.T_LESSEQUAL,
	">=": Sk.Tokenizer.Tokens.T_GREATEREQUAL,
	"~": Sk.Tokenizer.Tokens.T_TILDE,
	"^": Sk.Tokenizer.Tokens.T_CIRCUMFLEX,
	"<<": Sk.Tokenizer.Tokens.T_LEFTSHIFT,
	">>": Sk.Tokenizer.Tokens.T_RIGHTSHIFT,
	"**": Sk.Tokenizer.Tokens.T_DOUBLESTAR,
	"+=": Sk.Tokenizer.Tokens.T_PLUSEQUAL,
	"-=": Sk.Tokenizer.Tokens.T_MINEQUAL,
	"*=": Sk.Tokenizer.Tokens.T_STAREQUAL,
	"/=": Sk.Tokenizer.Tokens.T_SLASHEQUAL,
	"%=": Sk.Tokenizer.Tokens.T_PERCENTEQUAL,
	"&=": Sk.Tokenizer.Tokens.T_AMPEREQUAL,
	"|=": Sk.Tokenizer.Tokens.T_VBAREQUAL,
	"^=": Sk.Tokenizer.Tokens.T_CIRCUMFLEXEQUAL,
	"<<=": Sk.Tokenizer.Tokens.T_LEFTSHIFTEQUAL,
	">>=": Sk.Tokenizer.Tokens.T_RIGHTSHIFTEQUAL,
	"**=": Sk.Tokenizer.Tokens.T_DOUBLESTAREQUAL,
	"//": Sk.Tokenizer.Tokens.T_DOUBLESLASH,
	"//=": Sk.Tokenizer.Tokens.T_DOUBLESLASHEQUAL,
	"->": Sk.Tokenizer.Tokens.T_RARROW
	};
	Sk.ParseTables = {
	sym:
	{and_expr: 257,
	 and_test: 258,
	 arglist: 259,
	 argument: 260,
	 arith_expr: 261,
	 assert_stmt: 262,
	 atom: 263,
	 augassign: 264,
	 break_stmt: 265,
	 classdef: 266,
	 comp_for: 267,
	 comp_if: 268,
	 comp_iter: 269,
	 comp_op: 270,
	 comparison: 271,
	 compound_stmt: 272,
	 continue_stmt: 273,
	 debugger_stmt: 274,
	 decorated: 275,
	 decorator: 276,
	 decorators: 277,
	 del_stmt: 278,
	 dictorsetmaker: 279,
	 dotted_as_name: 280,
	 dotted_as_names: 281,
	 dotted_name: 282,
	 encoding_decl: 283,
	 eval_input: 284,
	 except_clause: 285,
	 exec_stmt: 286,
	 expr: 287,
	 expr_stmt: 288,
	 exprlist: 289,
	 factor: 290,
	 file_input: 291,
	 flow_stmt: 292,
	 for_stmt: 293,
	 fpdef: 294,
	 fplist: 295,
	 funcdef: 296,
	 global_stmt: 297,
	 if_stmt: 298,
	 import_as_name: 299,
	 import_as_names: 300,
	 import_from: 301,
	 import_name: 302,
	 import_stmt: 303,
	 lambdef: 304,
	 list_for: 305,
	 list_if: 306,
	 list_iter: 307,
	 listmaker: 308,
	 not_test: 309,
	 old_lambdef: 310,
	 old_test: 311,
	 or_test: 312,
	 parameters: 313,
	 pass_stmt: 314,
	 power: 315,
	 print_stmt: 316,
	 raise_stmt: 317,
	 return_stmt: 318,
	 shift_expr: 319,
	 simple_stmt: 320,
	 single_input: 256,
	 sliceop: 321,
	 small_stmt: 322,
	 stmt: 323,
	 subscript: 324,
	 subscriptlist: 325,
	 suite: 326,
	 term: 327,
	 test: 328,
	 testlist: 329,
	 testlist1: 330,
	 testlist_comp: 331,
	 testlist_safe: 332,
	 trailer: 333,
	 try_stmt: 334,
	 varargslist: 335,
	 while_stmt: 336,
	 with_item: 337,
	 with_stmt: 338,
	 xor_expr: 339,
	 yield_expr: 340,
	 yield_stmt: 341},
	number2symbol:
	{256: 'single_input',
	 257: 'and_expr',
	 258: 'and_test',
	 259: 'arglist',
	 260: 'argument',
	 261: 'arith_expr',
	 262: 'assert_stmt',
	 263: 'atom',
	 264: 'augassign',
	 265: 'break_stmt',
	 266: 'classdef',
	 267: 'comp_for',
	 268: 'comp_if',
	 269: 'comp_iter',
	 270: 'comp_op',
	 271: 'comparison',
	 272: 'compound_stmt',
	 273: 'continue_stmt',
	 274: 'debugger_stmt',
	 275: 'decorated',
	 276: 'decorator',
	 277: 'decorators',
	 278: 'del_stmt',
	 279: 'dictorsetmaker',
	 280: 'dotted_as_name',
	 281: 'dotted_as_names',
	 282: 'dotted_name',
	 283: 'encoding_decl',
	 284: 'eval_input',
	 285: 'except_clause',
	 286: 'exec_stmt',
	 287: 'expr',
	 288: 'expr_stmt',
	 289: 'exprlist',
	 290: 'factor',
	 291: 'file_input',
	 292: 'flow_stmt',
	 293: 'for_stmt',
	 294: 'fpdef',
	 295: 'fplist',
	 296: 'funcdef',
	 297: 'global_stmt',
	 298: 'if_stmt',
	 299: 'import_as_name',
	 300: 'import_as_names',
	 301: 'import_from',
	 302: 'import_name',
	 303: 'import_stmt',
	 304: 'lambdef',
	 305: 'list_for',
	 306: 'list_if',
	 307: 'list_iter',
	 308: 'listmaker',
	 309: 'not_test',
	 310: 'old_lambdef',
	 311: 'old_test',
	 312: 'or_test',
	 313: 'parameters',
	 314: 'pass_stmt',
	 315: 'power',
	 316: 'print_stmt',
	 317: 'raise_stmt',
	 318: 'return_stmt',
	 319: 'shift_expr',
	 320: 'simple_stmt',
	 321: 'sliceop',
	 322: 'small_stmt',
	 323: 'stmt',
	 324: 'subscript',
	 325: 'subscriptlist',
	 326: 'suite',
	 327: 'term',
	 328: 'test',
	 329: 'testlist',
	 330: 'testlist1',
	 331: 'testlist_comp',
	 332: 'testlist_safe',
	 333: 'trailer',
	 334: 'try_stmt',
	 335: 'varargslist',
	 336: 'while_stmt',
	 337: 'with_item',
	 338: 'with_stmt',
	 339: 'xor_expr',
	 340: 'yield_expr',
	 341: 'yield_stmt'},
	dfas:
	{256: [[[[1, 1], [2, 1], [3, 2]], [[0, 1]], [[2, 1]]],
	       {2: 1,
	        4: 1,
	        5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        10: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        16: 1,
	        17: 1,
	        18: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        29: 1,
	        30: 1,
	        31: 1,
	        32: 1,
	        33: 1,
	        34: 1,
	        35: 1,
	        36: 1,
	        37: 1}],
	 257: [[[[38, 1]], [[39, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 258: [[[[40, 1]], [[41, 0], [0, 1]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 259: [[[[42, 1], [43, 2], [44, 3]],
	        [[45, 4]],
	        [[46, 5], [0, 2]],
	        [[45, 6]],
	        [[46, 7], [0, 4]],
	        [[42, 1], [43, 2], [44, 3], [0, 5]],
	        [[0, 6]],
	        [[43, 4], [44, 3]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1,
	        42: 1,
	        44: 1}],
	 260: [[[[45, 1]], [[47, 2], [48, 3], [0, 1]], [[45, 3]], [[0, 3]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 261: [[[[49, 1]], [[26, 0], [37, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 262: [[[[21, 1]], [[45, 2]], [[46, 3], [0, 2]], [[45, 4]], [[0, 4]]],
	       {21: 1}],
	 263: [[[[19, 1], [8, 2], [9, 5], [30, 4], [14, 3], [15, 6], [22, 2]],
	        [[19, 1], [0, 1]],
	        [[0, 2]],
	        [[50, 7], [51, 2]],
	        [[52, 2], [53, 8], [54, 8]],
	        [[55, 2], [56, 9]],
	        [[57, 10]],
	        [[51, 2]],
	        [[52, 2]],
	        [[55, 2]],
	        [[15, 2]]],
	       {8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 30: 1}],
	 264: [[[[58, 1],
	         [59, 1],
	         [60, 1],
	         [61, 1],
	         [62, 1],
	         [63, 1],
	         [64, 1],
	         [65, 1],
	         [66, 1],
	         [67, 1],
	         [68, 1],
	         [69, 1]],
	        [[0, 1]]],
	       {58: 1,
	        59: 1,
	        60: 1,
	        61: 1,
	        62: 1,
	        63: 1,
	        64: 1,
	        65: 1,
	        66: 1,
	        67: 1,
	        68: 1,
	        69: 1}],
	 265: [[[[33, 1]], [[0, 1]]], {33: 1}],
	 266: [[[[10, 1]],
	        [[22, 2]],
	        [[70, 3], [30, 4]],
	        [[71, 5]],
	        [[52, 6], [72, 7]],
	        [[0, 5]],
	        [[70, 3]],
	        [[52, 6]]],
	       {10: 1}],
	 267: [[[[29, 1]],
	        [[73, 2]],
	        [[74, 3]],
	        [[75, 4]],
	        [[76, 5], [0, 4]],
	        [[0, 5]]],
	       {29: 1}],
	 268: [[[[32, 1]], [[77, 2]], [[76, 3], [0, 2]], [[0, 3]]], {32: 1}],
	 269: [[[[78, 1], [48, 1]], [[0, 1]]], {29: 1, 32: 1}],
	 270: [[[[79, 1],
	         [80, 1],
	         [7, 2],
	         [81, 1],
	         [79, 1],
	         [74, 1],
	         [82, 1],
	         [83, 3],
	         [84, 1],
	         [85, 1]],
	        [[0, 1]],
	        [[74, 1]],
	        [[7, 1], [0, 3]]],
	       {7: 1, 74: 1, 79: 1, 80: 1, 81: 1, 82: 1, 83: 1, 84: 1, 85: 1}],
	 271: [[[[86, 1]], [[87, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 272: [[[[88, 1],
	         [89, 1],
	         [90, 1],
	         [91, 1],
	         [92, 1],
	         [93, 1],
	         [94, 1],
	         [95, 1]],
	        [[0, 1]]],
	       {4: 1, 10: 1, 16: 1, 18: 1, 29: 1, 32: 1, 35: 1, 36: 1}],
	 273: [[[[34, 1]], [[0, 1]]], {34: 1}],
	 274: [[[[13, 1]], [[0, 1]]], {13: 1}],
	 275: [[[[96, 1]], [[94, 2], [91, 2]], [[0, 2]]], {35: 1}],
	 276: [[[[35, 1]],
	        [[97, 2]],
	        [[2, 4], [30, 3]],
	        [[52, 5], [98, 6]],
	        [[0, 4]],
	        [[2, 4]],
	        [[52, 5]]],
	       {35: 1}],
	 277: [[[[99, 1]], [[99, 1], [0, 1]]], {35: 1}],
	 278: [[[[23, 1]], [[73, 2]], [[0, 2]]], {23: 1}],
	 279: [[[[45, 1]],
	        [[70, 2], [48, 3], [46, 4], [0, 1]],
	        [[45, 5]],
	        [[0, 3]],
	        [[45, 6], [0, 4]],
	        [[48, 3], [46, 7], [0, 5]],
	        [[46, 4], [0, 6]],
	        [[45, 8], [0, 7]],
	        [[70, 9]],
	        [[45, 10]],
	        [[46, 7], [0, 10]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 280: [[[[97, 1]], [[100, 2], [0, 1]], [[22, 3]], [[0, 3]]], {22: 1}],
	 281: [[[[101, 1]], [[46, 0], [0, 1]]], {22: 1}],
	 282: [[[[22, 1]], [[102, 0], [0, 1]]], {22: 1}],
	 283: [[[[22, 1]], [[0, 1]]], {22: 1}],
	 284: [[[[72, 1]], [[2, 1], [103, 2]], [[0, 2]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 285: [[[[104, 1]],
	        [[45, 2], [0, 1]],
	        [[100, 3], [46, 3], [0, 2]],
	        [[45, 4]],
	        [[0, 4]]],
	       {104: 1}],
	 286: [[[[17, 1]],
	        [[86, 2]],
	        [[74, 3], [0, 2]],
	        [[45, 4]],
	        [[46, 5], [0, 4]],
	        [[45, 6]],
	        [[0, 6]]],
	       {17: 1}],
	 287: [[[[105, 1]], [[106, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 288: [[[[72, 1]],
	        [[107, 2], [47, 3], [0, 1]],
	        [[72, 4], [53, 4]],
	        [[72, 5], [53, 5]],
	        [[0, 4]],
	        [[47, 3], [0, 5]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 289: [[[[86, 1]], [[46, 2], [0, 1]], [[86, 1], [0, 2]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 290: [[[[37, 2], [26, 2], [6, 2], [108, 1]], [[0, 1]], [[109, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 291: [[[[2, 0], [103, 1], [110, 0]], [[0, 1]]],
	       {2: 1,
	        4: 1,
	        5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        10: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        16: 1,
	        17: 1,
	        18: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        29: 1,
	        30: 1,
	        31: 1,
	        32: 1,
	        33: 1,
	        34: 1,
	        35: 1,
	        36: 1,
	        37: 1,
	        103: 1}],
	 292: [[[[111, 1], [112, 1], [113, 1], [114, 1], [115, 1]], [[0, 1]]],
	       {5: 1, 20: 1, 27: 1, 33: 1, 34: 1}],
	 293: [[[[29, 1]],
	        [[73, 2]],
	        [[74, 3]],
	        [[72, 4]],
	        [[70, 5]],
	        [[71, 6]],
	        [[116, 7], [0, 6]],
	        [[70, 8]],
	        [[71, 9]],
	        [[0, 9]]],
	       {29: 1}],
	 294: [[[[30, 1], [22, 2]], [[117, 3]], [[0, 2]], [[52, 2]]], {22: 1, 30: 1}],
	 295: [[[[118, 1]], [[46, 2], [0, 1]], [[118, 1], [0, 2]]], {22: 1, 30: 1}],
	 296: [[[[4, 1]], [[22, 2]], [[119, 3]], [[70, 4]], [[71, 5]], [[0, 5]]],
	       {4: 1}],
	 297: [[[[28, 1]], [[22, 2]], [[46, 1], [0, 2]]], {28: 1}],
	 298: [[[[32, 1]],
	        [[45, 2]],
	        [[70, 3]],
	        [[71, 4]],
	        [[116, 5], [120, 1], [0, 4]],
	        [[70, 6]],
	        [[71, 7]],
	        [[0, 7]]],
	       {32: 1}],
	 299: [[[[22, 1]], [[100, 2], [0, 1]], [[22, 3]], [[0, 3]]], {22: 1}],
	 300: [[[[121, 1]], [[46, 2], [0, 1]], [[121, 1], [0, 2]]], {22: 1}],
	 301: [[[[31, 1]],
	        [[97, 2], [102, 3]],
	        [[25, 4]],
	        [[97, 2], [25, 4], [102, 3]],
	        [[122, 5], [42, 5], [30, 6]],
	        [[0, 5]],
	        [[122, 7]],
	        [[52, 5]]],
	       {31: 1}],
	 302: [[[[25, 1]], [[123, 2]], [[0, 2]]], {25: 1}],
	 303: [[[[124, 1], [125, 1]], [[0, 1]]], {25: 1, 31: 1}],
	 304: [[[[11, 1]], [[70, 2], [126, 3]], [[45, 4]], [[70, 2]], [[0, 4]]],
	       {11: 1}],
	 305: [[[[29, 1]],
	        [[73, 2]],
	        [[74, 3]],
	        [[127, 4]],
	        [[128, 5], [0, 4]],
	        [[0, 5]]],
	       {29: 1}],
	 306: [[[[32, 1]], [[77, 2]], [[128, 3], [0, 2]], [[0, 3]]], {32: 1}],
	 307: [[[[129, 1], [130, 1]], [[0, 1]]], {29: 1, 32: 1}],
	 308: [[[[45, 1]],
	        [[129, 2], [46, 3], [0, 1]],
	        [[0, 2]],
	        [[45, 4], [0, 3]],
	        [[46, 3], [0, 4]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 309: [[[[7, 1], [131, 2]], [[40, 2]], [[0, 2]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 310: [[[[11, 1]], [[70, 2], [126, 3]], [[77, 4]], [[70, 2]], [[0, 4]]],
	       {11: 1}],
	 311: [[[[132, 1], [75, 1]], [[0, 1]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 312: [[[[133, 1]], [[134, 0], [0, 1]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 313: [[[[30, 1]], [[52, 2], [126, 3]], [[0, 2]], [[52, 2]]], {30: 1}],
	 314: [[[[24, 1]], [[0, 1]]], {24: 1}],
	 315: [[[[135, 1]], [[44, 2], [136, 1], [0, 1]], [[109, 3]], [[0, 3]]],
	       {8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 30: 1}],
	 316: [[[[12, 1]],
	        [[45, 2], [137, 3], [0, 1]],
	        [[46, 4], [0, 2]],
	        [[45, 5]],
	        [[45, 2], [0, 4]],
	        [[46, 6], [0, 5]],
	        [[45, 7]],
	        [[46, 8], [0, 7]],
	        [[45, 7], [0, 8]]],
	       {12: 1}],
	 317: [[[[5, 1]],
	        [[45, 2], [0, 1]],
	        [[46, 3], [0, 2]],
	        [[45, 4]],
	        [[46, 5], [0, 4]],
	        [[45, 6]],
	        [[0, 6]]],
	       {5: 1}],
	 318: [[[[20, 1]], [[72, 2], [0, 1]], [[0, 2]]], {20: 1}],
	 319: [[[[138, 1]], [[139, 0], [137, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 320: [[[[140, 1]], [[2, 2], [141, 3]], [[0, 2]], [[140, 1], [2, 2]]],
	       {5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        17: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        30: 1,
	        31: 1,
	        33: 1,
	        34: 1,
	        37: 1}],
	 321: [[[[70, 1]], [[45, 2], [0, 1]], [[0, 2]]], {70: 1}],
	 322: [[[[142, 1],
	         [143, 1],
	         [144, 1],
	         [145, 1],
	         [146, 1],
	         [147, 1],
	         [148, 1],
	         [149, 1],
	         [150, 1],
	         [151, 1]],
	        [[0, 1]]],
	       {5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        17: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        30: 1,
	        31: 1,
	        33: 1,
	        34: 1,
	        37: 1}],
	 323: [[[[1, 1], [3, 1]], [[0, 1]]],
	       {4: 1,
	        5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        10: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        16: 1,
	        17: 1,
	        18: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        29: 1,
	        30: 1,
	        31: 1,
	        32: 1,
	        33: 1,
	        34: 1,
	        35: 1,
	        36: 1,
	        37: 1}],
	 324: [[[[45, 1], [70, 2], [102, 3]],
	        [[70, 2], [0, 1]],
	        [[45, 4], [152, 5], [0, 2]],
	        [[102, 6]],
	        [[152, 5], [0, 4]],
	        [[0, 5]],
	        [[102, 5]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1,
	        70: 1,
	        102: 1}],
	 325: [[[[153, 1]], [[46, 2], [0, 1]], [[153, 1], [0, 2]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1,
	        70: 1,
	        102: 1}],
	 326: [[[[1, 1], [2, 2]],
	        [[0, 1]],
	        [[154, 3]],
	        [[110, 4]],
	        [[155, 1], [110, 4]]],
	       {2: 1,
	        5: 1,
	        6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        12: 1,
	        13: 1,
	        14: 1,
	        15: 1,
	        17: 1,
	        19: 1,
	        20: 1,
	        21: 1,
	        22: 1,
	        23: 1,
	        24: 1,
	        25: 1,
	        26: 1,
	        27: 1,
	        28: 1,
	        30: 1,
	        31: 1,
	        33: 1,
	        34: 1,
	        37: 1}],
	 327: [[[[109, 1]], [[156, 0], [42, 0], [157, 0], [158, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 328: [[[[75, 1], [159, 2]],
	        [[32, 3], [0, 1]],
	        [[0, 2]],
	        [[75, 4]],
	        [[116, 5]],
	        [[45, 2]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 329: [[[[45, 1]], [[46, 2], [0, 1]], [[45, 1], [0, 2]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 330: [[[[45, 1]], [[46, 0], [0, 1]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 331: [[[[45, 1]],
	        [[48, 2], [46, 3], [0, 1]],
	        [[0, 2]],
	        [[45, 4], [0, 3]],
	        [[46, 3], [0, 4]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 332: [[[[77, 1]],
	        [[46, 2], [0, 1]],
	        [[77, 3]],
	        [[46, 4], [0, 3]],
	        [[77, 3], [0, 4]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 333: [[[[30, 1], [102, 2], [14, 3]],
	        [[52, 4], [98, 5]],
	        [[22, 4]],
	        [[160, 6]],
	        [[0, 4]],
	        [[52, 4]],
	        [[51, 4]]],
	       {14: 1, 30: 1, 102: 1}],
	 334: [[[[16, 1]],
	        [[70, 2]],
	        [[71, 3]],
	        [[161, 4], [162, 5]],
	        [[70, 6]],
	        [[70, 7]],
	        [[71, 8]],
	        [[71, 9]],
	        [[161, 4], [116, 10], [162, 5], [0, 8]],
	        [[0, 9]],
	        [[70, 11]],
	        [[71, 12]],
	        [[162, 5], [0, 12]]],
	       {16: 1}],
	 335: [[[[42, 1], [118, 2], [44, 3]],
	        [[22, 4]],
	        [[47, 5], [46, 6], [0, 2]],
	        [[22, 7]],
	        [[46, 8], [0, 4]],
	        [[45, 9]],
	        [[42, 1], [118, 2], [44, 3], [0, 6]],
	        [[0, 7]],
	        [[44, 3]],
	        [[46, 6], [0, 9]]],
	       {22: 1, 30: 1, 42: 1, 44: 1}],
	 336: [[[[18, 1]],
	        [[45, 2]],
	        [[70, 3]],
	        [[71, 4]],
	        [[116, 5], [0, 4]],
	        [[70, 6]],
	        [[71, 7]],
	        [[0, 7]]],
	       {18: 1}],
	 337: [[[[45, 1]], [[100, 2], [0, 1]], [[86, 3]], [[0, 3]]],
	       {6: 1,
	        7: 1,
	        8: 1,
	        9: 1,
	        11: 1,
	        14: 1,
	        15: 1,
	        19: 1,
	        22: 1,
	        26: 1,
	        30: 1,
	        37: 1}],
	 338: [[[[36, 1]], [[163, 2]], [[70, 3], [46, 1]], [[71, 4]], [[0, 4]]],
	       {36: 1}],
	 339: [[[[164, 1]], [[165, 0], [0, 1]]],
	       {6: 1, 8: 1, 9: 1, 14: 1, 15: 1, 19: 1, 22: 1, 26: 1, 30: 1, 37: 1}],
	 340: [[[[27, 1]], [[72, 2], [0, 1]], [[0, 2]]], {27: 1}],
	 341: [[[[53, 1]], [[0, 1]]], {27: 1}]},
	states:
	[[[[1, 1], [2, 1], [3, 2]], [[0, 1]], [[2, 1]]],
	 [[[38, 1]], [[39, 0], [0, 1]]],
	 [[[40, 1]], [[41, 0], [0, 1]]],
	 [[[42, 1], [43, 2], [44, 3]],
	  [[45, 4]],
	  [[46, 5], [0, 2]],
	  [[45, 6]],
	  [[46, 7], [0, 4]],
	  [[42, 1], [43, 2], [44, 3], [0, 5]],
	  [[0, 6]],
	  [[43, 4], [44, 3]]],
	 [[[45, 1]], [[47, 2], [48, 3], [0, 1]], [[45, 3]], [[0, 3]]],
	 [[[49, 1]], [[26, 0], [37, 0], [0, 1]]],
	 [[[21, 1]], [[45, 2]], [[46, 3], [0, 2]], [[45, 4]], [[0, 4]]],
	 [[[19, 1], [8, 2], [9, 5], [30, 4], [14, 3], [15, 6], [22, 2]],
	  [[19, 1], [0, 1]],
	  [[0, 2]],
	  [[50, 7], [51, 2]],
	  [[52, 2], [53, 8], [54, 8]],
	  [[55, 2], [56, 9]],
	  [[57, 10]],
	  [[51, 2]],
	  [[52, 2]],
	  [[55, 2]],
	  [[15, 2]]],
	 [[[58, 1],
	   [59, 1],
	   [60, 1],
	   [61, 1],
	   [62, 1],
	   [63, 1],
	   [64, 1],
	   [65, 1],
	   [66, 1],
	   [67, 1],
	   [68, 1],
	   [69, 1]],
	  [[0, 1]]],
	 [[[33, 1]], [[0, 1]]],
	 [[[10, 1]],
	  [[22, 2]],
	  [[70, 3], [30, 4]],
	  [[71, 5]],
	  [[52, 6], [72, 7]],
	  [[0, 5]],
	  [[70, 3]],
	  [[52, 6]]],
	 [[[29, 1]], [[73, 2]], [[74, 3]], [[75, 4]], [[76, 5], [0, 4]], [[0, 5]]],
	 [[[32, 1]], [[77, 2]], [[76, 3], [0, 2]], [[0, 3]]],
	 [[[78, 1], [48, 1]], [[0, 1]]],
	 [[[79, 1],
	   [80, 1],
	   [7, 2],
	   [81, 1],
	   [79, 1],
	   [74, 1],
	   [82, 1],
	   [83, 3],
	   [84, 1],
	   [85, 1]],
	  [[0, 1]],
	  [[74, 1]],
	  [[7, 1], [0, 3]]],
	 [[[86, 1]], [[87, 0], [0, 1]]],
	 [[[88, 1], [89, 1], [90, 1], [91, 1], [92, 1], [93, 1], [94, 1], [95, 1]],
	  [[0, 1]]],
	 [[[34, 1]], [[0, 1]]],
	 [[[13, 1]], [[0, 1]]],
	 [[[96, 1]], [[94, 2], [91, 2]], [[0, 2]]],
	 [[[35, 1]],
	  [[97, 2]],
	  [[2, 4], [30, 3]],
	  [[52, 5], [98, 6]],
	  [[0, 4]],
	  [[2, 4]],
	  [[52, 5]]],
	 [[[99, 1]], [[99, 1], [0, 1]]],
	 [[[23, 1]], [[73, 2]], [[0, 2]]],
	 [[[45, 1]],
	  [[70, 2], [48, 3], [46, 4], [0, 1]],
	  [[45, 5]],
	  [[0, 3]],
	  [[45, 6], [0, 4]],
	  [[48, 3], [46, 7], [0, 5]],
	  [[46, 4], [0, 6]],
	  [[45, 8], [0, 7]],
	  [[70, 9]],
	  [[45, 10]],
	  [[46, 7], [0, 10]]],
	 [[[97, 1]], [[100, 2], [0, 1]], [[22, 3]], [[0, 3]]],
	 [[[101, 1]], [[46, 0], [0, 1]]],
	 [[[22, 1]], [[102, 0], [0, 1]]],
	 [[[22, 1]], [[0, 1]]],
	 [[[72, 1]], [[2, 1], [103, 2]], [[0, 2]]],
	 [[[104, 1]],
	  [[45, 2], [0, 1]],
	  [[100, 3], [46, 3], [0, 2]],
	  [[45, 4]],
	  [[0, 4]]],
	 [[[17, 1]],
	  [[86, 2]],
	  [[74, 3], [0, 2]],
	  [[45, 4]],
	  [[46, 5], [0, 4]],
	  [[45, 6]],
	  [[0, 6]]],
	 [[[105, 1]], [[106, 0], [0, 1]]],
	 [[[72, 1]],
	  [[107, 2], [47, 3], [0, 1]],
	  [[72, 4], [53, 4]],
	  [[72, 5], [53, 5]],
	  [[0, 4]],
	  [[47, 3], [0, 5]]],
	 [[[86, 1]], [[46, 2], [0, 1]], [[86, 1], [0, 2]]],
	 [[[37, 2], [26, 2], [6, 2], [108, 1]], [[0, 1]], [[109, 1]]],
	 [[[2, 0], [103, 1], [110, 0]], [[0, 1]]],
	 [[[111, 1], [112, 1], [113, 1], [114, 1], [115, 1]], [[0, 1]]],
	 [[[29, 1]],
	  [[73, 2]],
	  [[74, 3]],
	  [[72, 4]],
	  [[70, 5]],
	  [[71, 6]],
	  [[116, 7], [0, 6]],
	  [[70, 8]],
	  [[71, 9]],
	  [[0, 9]]],
	 [[[30, 1], [22, 2]], [[117, 3]], [[0, 2]], [[52, 2]]],
	 [[[118, 1]], [[46, 2], [0, 1]], [[118, 1], [0, 2]]],
	 [[[4, 1]], [[22, 2]], [[119, 3]], [[70, 4]], [[71, 5]], [[0, 5]]],
	 [[[28, 1]], [[22, 2]], [[46, 1], [0, 2]]],
	 [[[32, 1]],
	  [[45, 2]],
	  [[70, 3]],
	  [[71, 4]],
	  [[116, 5], [120, 1], [0, 4]],
	  [[70, 6]],
	  [[71, 7]],
	  [[0, 7]]],
	 [[[22, 1]], [[100, 2], [0, 1]], [[22, 3]], [[0, 3]]],
	 [[[121, 1]], [[46, 2], [0, 1]], [[121, 1], [0, 2]]],
	 [[[31, 1]],
	  [[97, 2], [102, 3]],
	  [[25, 4]],
	  [[97, 2], [25, 4], [102, 3]],
	  [[122, 5], [42, 5], [30, 6]],
	  [[0, 5]],
	  [[122, 7]],
	  [[52, 5]]],
	 [[[25, 1]], [[123, 2]], [[0, 2]]],
	 [[[124, 1], [125, 1]], [[0, 1]]],
	 [[[11, 1]], [[70, 2], [126, 3]], [[45, 4]], [[70, 2]], [[0, 4]]],
	 [[[29, 1]], [[73, 2]], [[74, 3]], [[127, 4]], [[128, 5], [0, 4]], [[0, 5]]],
	 [[[32, 1]], [[77, 2]], [[128, 3], [0, 2]], [[0, 3]]],
	 [[[129, 1], [130, 1]], [[0, 1]]],
	 [[[45, 1]],
	  [[129, 2], [46, 3], [0, 1]],
	  [[0, 2]],
	  [[45, 4], [0, 3]],
	  [[46, 3], [0, 4]]],
	 [[[7, 1], [131, 2]], [[40, 2]], [[0, 2]]],
	 [[[11, 1]], [[70, 2], [126, 3]], [[77, 4]], [[70, 2]], [[0, 4]]],
	 [[[132, 1], [75, 1]], [[0, 1]]],
	 [[[133, 1]], [[134, 0], [0, 1]]],
	 [[[30, 1]], [[52, 2], [126, 3]], [[0, 2]], [[52, 2]]],
	 [[[24, 1]], [[0, 1]]],
	 [[[135, 1]], [[44, 2], [136, 1], [0, 1]], [[109, 3]], [[0, 3]]],
	 [[[12, 1]],
	  [[45, 2], [137, 3], [0, 1]],
	  [[46, 4], [0, 2]],
	  [[45, 5]],
	  [[45, 2], [0, 4]],
	  [[46, 6], [0, 5]],
	  [[45, 7]],
	  [[46, 8], [0, 7]],
	  [[45, 7], [0, 8]]],
	 [[[5, 1]],
	  [[45, 2], [0, 1]],
	  [[46, 3], [0, 2]],
	  [[45, 4]],
	  [[46, 5], [0, 4]],
	  [[45, 6]],
	  [[0, 6]]],
	 [[[20, 1]], [[72, 2], [0, 1]], [[0, 2]]],
	 [[[138, 1]], [[139, 0], [137, 0], [0, 1]]],
	 [[[140, 1]], [[2, 2], [141, 3]], [[0, 2]], [[140, 1], [2, 2]]],
	 [[[70, 1]], [[45, 2], [0, 1]], [[0, 2]]],
	 [[[142, 1],
	   [143, 1],
	   [144, 1],
	   [145, 1],
	   [146, 1],
	   [147, 1],
	   [148, 1],
	   [149, 1],
	   [150, 1],
	   [151, 1]],
	  [[0, 1]]],
	 [[[1, 1], [3, 1]], [[0, 1]]],
	 [[[45, 1], [70, 2], [102, 3]],
	  [[70, 2], [0, 1]],
	  [[45, 4], [152, 5], [0, 2]],
	  [[102, 6]],
	  [[152, 5], [0, 4]],
	  [[0, 5]],
	  [[102, 5]]],
	 [[[153, 1]], [[46, 2], [0, 1]], [[153, 1], [0, 2]]],
	 [[[1, 1], [2, 2]], [[0, 1]], [[154, 3]], [[110, 4]], [[155, 1], [110, 4]]],
	 [[[109, 1]], [[156, 0], [42, 0], [157, 0], [158, 0], [0, 1]]],
	 [[[75, 1], [159, 2]],
	  [[32, 3], [0, 1]],
	  [[0, 2]],
	  [[75, 4]],
	  [[116, 5]],
	  [[45, 2]]],
	 [[[45, 1]], [[46, 2], [0, 1]], [[45, 1], [0, 2]]],
	 [[[45, 1]], [[46, 0], [0, 1]]],
	 [[[45, 1]],
	  [[48, 2], [46, 3], [0, 1]],
	  [[0, 2]],
	  [[45, 4], [0, 3]],
	  [[46, 3], [0, 4]]],
	 [[[77, 1]],
	  [[46, 2], [0, 1]],
	  [[77, 3]],
	  [[46, 4], [0, 3]],
	  [[77, 3], [0, 4]]],
	 [[[30, 1], [102, 2], [14, 3]],
	  [[52, 4], [98, 5]],
	  [[22, 4]],
	  [[160, 6]],
	  [[0, 4]],
	  [[52, 4]],
	  [[51, 4]]],
	 [[[16, 1]],
	  [[70, 2]],
	  [[71, 3]],
	  [[161, 4], [162, 5]],
	  [[70, 6]],
	  [[70, 7]],
	  [[71, 8]],
	  [[71, 9]],
	  [[161, 4], [116, 10], [162, 5], [0, 8]],
	  [[0, 9]],
	  [[70, 11]],
	  [[71, 12]],
	  [[162, 5], [0, 12]]],
	 [[[42, 1], [118, 2], [44, 3]],
	  [[22, 4]],
	  [[47, 5], [46, 6], [0, 2]],
	  [[22, 7]],
	  [[46, 8], [0, 4]],
	  [[45, 9]],
	  [[42, 1], [118, 2], [44, 3], [0, 6]],
	  [[0, 7]],
	  [[44, 3]],
	  [[46, 6], [0, 9]]],
	 [[[18, 1]],
	  [[45, 2]],
	  [[70, 3]],
	  [[71, 4]],
	  [[116, 5], [0, 4]],
	  [[70, 6]],
	  [[71, 7]],
	  [[0, 7]]],
	 [[[45, 1]], [[100, 2], [0, 1]], [[86, 3]], [[0, 3]]],
	 [[[36, 1]], [[163, 2]], [[70, 3], [46, 1]], [[71, 4]], [[0, 4]]],
	 [[[164, 1]], [[165, 0], [0, 1]]],
	 [[[27, 1]], [[72, 2], [0, 1]], [[0, 2]]],
	 [[[53, 1]], [[0, 1]]]],
	labels:
	[[0, 'EMPTY'],
	 [320, null],
	 [4, null],
	 [272, null],
	 [1, 'def'],
	 [1, 'raise'],
	 [32, null],
	 [1, 'not'],
	 [2, null],
	 [26, null],
	 [1, 'class'],
	 [1, 'lambda'],
	 [1, 'print'],
	 [1, 'debugger'],
	 [9, null],
	 [25, null],
	 [1, 'try'],
	 [1, 'exec'],
	 [1, 'while'],
	 [3, null],
	 [1, 'return'],
	 [1, 'assert'],
	 [1, null],
	 [1, 'del'],
	 [1, 'pass'],
	 [1, 'import'],
	 [15, null],
	 [1, 'yield'],
	 [1, 'global'],
	 [1, 'for'],
	 [7, null],
	 [1, 'from'],
	 [1, 'if'],
	 [1, 'break'],
	 [1, 'continue'],
	 [50, null],
	 [1, 'with'],
	 [14, null],
	 [319, null],
	 [19, null],
	 [309, null],
	 [1, 'and'],
	 [16, null],
	 [260, null],
	 [36, null],
	 [328, null],
	 [12, null],
	 [22, null],
	 [267, null],
	 [327, null],
	 [308, null],
	 [10, null],
	 [8, null],
	 [340, null],
	 [331, null],
	 [27, null],
	 [279, null],
	 [330, null],
	 [46, null],
	 [39, null],
	 [41, null],
	 [47, null],
	 [42, null],
	 [43, null],
	 [37, null],
	 [44, null],
	 [49, null],
	 [45, null],
	 [38, null],
	 [40, null],
	 [11, null],
	 [326, null],
	 [329, null],
	 [289, null],
	 [1, 'in'],
	 [312, null],
	 [269, null],
	 [311, null],
	 [268, null],
	 [29, null],
	 [21, null],
	 [28, null],
	 [30, null],
	 [1, 'is'],
	 [31, null],
	 [20, null],
	 [287, null],
	 [270, null],
	 [334, null],
	 [298, null],
	 [293, null],
	 [266, null],
	 [338, null],
	 [336, null],
	 [296, null],
	 [275, null],
	 [277, null],
	 [282, null],
	 [259, null],
	 [276, null],
	 [1, 'as'],
	 [280, null],
	 [23, null],
	 [0, null],
	 [1, 'except'],
	 [339, null],
	 [18, null],
	 [264, null],
	 [315, null],
	 [290, null],
	 [323, null],
	 [265, null],
	 [273, null],
	 [317, null],
	 [318, null],
	 [341, null],
	 [1, 'else'],
	 [295, null],
	 [294, null],
	 [313, null],
	 [1, 'elif'],
	 [299, null],
	 [300, null],
	 [281, null],
	 [302, null],
	 [301, null],
	 [335, null],
	 [332, null],
	 [307, null],
	 [305, null],
	 [306, null],
	 [271, null],
	 [310, null],
	 [258, null],
	 [1, 'or'],
	 [263, null],
	 [333, null],
	 [35, null],
	 [261, null],
	 [34, null],
	 [322, null],
	 [13, null],
	 [292, null],
	 [278, null],
	 [288, null],
	 [314, null],
	 [316, null],
	 [262, null],
	 [286, null],
	 [297, null],
	 [303, null],
	 [274, null],
	 [321, null],
	 [324, null],
	 [5, null],
	 [6, null],
	 [48, null],
	 [17, null],
	 [24, null],
	 [304, null],
	 [325, null],
	 [285, null],
	 [1, 'finally'],
	 [337, null],
	 [257, null],
	 [33, null]],
	keywords:
	{'and': 41,
	 'as': 100,
	 'assert': 21,
	 'break': 33,
	 'class': 10,
	 'continue': 34,
	 'debugger': 13,
	 'def': 4,
	 'del': 23,
	 'elif': 120,
	 'else': 116,
	 'except': 104,
	 'exec': 17,
	 'finally': 162,
	 'for': 29,
	 'from': 31,
	 'global': 28,
	 'if': 32,
	 'import': 25,
	 'in': 74,
	 'is': 83,
	 'lambda': 11,
	 'not': 7,
	 'or': 134,
	 'pass': 24,
	 'print': 12,
	 'raise': 5,
	 'return': 20,
	 'try': 16,
	 'while': 18,
	 'with': 36,
	 'yield': 27},
	tokens:
	{0: 103,
	 1: 22,
	 2: 8,
	 3: 19,
	 4: 2,
	 5: 154,
	 6: 155,
	 7: 30,
	 8: 52,
	 9: 14,
	 10: 51,
	 11: 70,
	 12: 46,
	 13: 141,
	 14: 37,
	 15: 26,
	 16: 42,
	 17: 157,
	 18: 106,
	 19: 39,
	 20: 85,
	 21: 80,
	 22: 47,
	 23: 102,
	 24: 158,
	 25: 15,
	 26: 9,
	 27: 55,
	 28: 81,
	 29: 79,
	 30: 82,
	 31: 84,
	 32: 6,
	 33: 165,
	 34: 139,
	 35: 137,
	 36: 44,
	 37: 64,
	 38: 68,
	 39: 59,
	 40: 69,
	 41: 60,
	 42: 62,
	 43: 63,
	 44: 65,
	 45: 67,
	 46: 58,
	 47: 61,
	 48: 156,
	 49: 66,
	 50: 35},
	start: 256
	};



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/parser.js ---- */ 

	// low level parser to a concrete syntax tree, derived from cpython's lib2to3

	/**
	 *
	 * @constructor
	 * @param {Object} grammar
	 *
	 * p = new Parser(grammar);
	 * p.setup([start]);
	 * foreach input token:
	 *     if p.addtoken(...):
	 *         break
	 * root = p.rootnode
	 *
	 * can throw SyntaxError
	 */
	function Parser (filename, grammar) {
	    this.filename = filename;
	    this.grammar = grammar;
	    this.p_flags = 0;
	    return this;
	}

	// all possible parser flags
	Parser.FUTURE_PRINT_FUNCTION = "print_function";
	Parser.FUTURE_UNICODE_LITERALS = "unicode_literals";
	Parser.FUTURE_DIVISION = "division";
	Parser.FUTURE_ABSOLUTE_IMPORT = "absolute_import";
	Parser.FUTURE_WITH_STATEMENT = "with_statement";
	Parser.FUTURE_NESTED_SCOPES = "nested_scopes";
	Parser.FUTURE_GENERATORS = "generators";
	Parser.CO_FUTURE_PRINT_FUNCTION = 0x10000;
	Parser.CO_FUTURE_UNICODE_LITERALS = 0x20000;
	Parser.CO_FUTURE_DIVISON = 0x2000;
	Parser.CO_FUTURE_ABSOLUTE_IMPORT = 0x4000;
	Parser.CO_FUTURE_WITH_STATEMENT = 0x8000;

	Parser.prototype.setup = function (start) {
	    var stackentry;
	    var newnode;
	    start = start || this.grammar.start;
	    //print("START:"+start);

	    newnode =
	    {
	        type    : start,
	        value   : null,
	        context : null,
	        children: []
	    };
	    stackentry =
	    {
	        dfa  : this.grammar.dfas[start],
	        state: 0,
	        node : newnode
	    };
	    this.stack = [stackentry];
	    this.used_names = {};
	};

	function findInDfa (a, obj) {
	    var i = a.length;
	    while (i--) {
	        if (a[i][0] === obj[0] && a[i][1] === obj[1]) {
	            return true;
	        }
	    }
	    return false;
	}


	// Add a token; return true if we're done
	Parser.prototype.addtoken = function (type, value, context) {
	    var errline;
	    var itsfirst;
	    var itsdfa;
	    var state;
	    var v;
	    var t;
	    var newstate;
	    var i;
	    var a;
	    var arcs;
	    var first;
	    var states;
	    var tp;
	    var ilabel = this.classify(type, value, context);
	    //print("ilabel:"+ilabel);

	    OUTERWHILE:
	    while (true) {
	        tp = this.stack[this.stack.length - 1];
	        states = tp.dfa[0];
	        first = tp.dfa[1];
	        arcs = states[tp.state];

	        // look for a state with this label
	        for (a = 0; a < arcs.length; ++a) {
	            i = arcs[a][0];
	            newstate = arcs[a][1];
	            t = this.grammar.labels[i][0];
	            v = this.grammar.labels[i][1];
	            if (ilabel === i) {
	                // look it up in the list of labels
	                goog.asserts.assert(t < 256);
	                // shift a token; we're done with it
	                this.shift(type, value, newstate, context);
	                // pop while we are in an accept-only state
	                state = newstate;
	                //print("before:"+JSON.stringify(states[state]) + ":state:"+state+":"+JSON.stringify(states[state]));
	                /* jshint ignore:start */
	                while (states[state].length === 1
	                    && states[state][0][0] === 0
	                    && states[state][0][1] === state) {
	                    // states[state] == [(0, state)])
	                    this.pop();
	                    //print("in after pop:"+JSON.stringify(states[state]) + ":state:"+state+":"+JSON.stringify(states[state]));
	                    if (this.stack.length === 0) {
	                        // done!
	                        return true;
	                    }
	                    tp = this.stack[this.stack.length - 1];
	                    state = tp.state;
	                    states = tp.dfa[0];
	                    first = tp.dfa[1];
	                    //print(JSON.stringify(states), JSON.stringify(first));
	                    //print("bottom:"+JSON.stringify(states[state]) + ":state:"+state+":"+JSON.stringify(states[state]));
	                }
	                /* jshint ignore:end */
	                // done with this token
	                //print("DONE, return false");
	                return false;
	            } else if (t >= 256) {
	                itsdfa = this.grammar.dfas[t];
	                itsfirst = itsdfa[1];
	                if (itsfirst.hasOwnProperty(ilabel)) {
	                    // push a symbol
	                    this.push(t, this.grammar.dfas[t], newstate, context);
	                    continue OUTERWHILE;
	                }
	            }
	        }

	        //print("findInDfa: " + JSON.stringify(arcs)+" vs. " + tp.state);
	        if (findInDfa(arcs, [0, tp.state])) {
	            // an accepting state, pop it and try somethign else
	            //print("WAA");
	            this.pop();
	            if (this.stack.length === 0) {
	                throw new Sk.builtin.SyntaxError("too much input", this.filename);
	            }
	        } else {
	            // no transition
	            errline = context[0][0];

	            var that = this;
	            var ar = arcs.map(function(a) {
	                var i = a[0];
	                var t = that.grammar.labels[i][0];
	                return Sk.nameForToken(t);
	            });
	            var extra = {
	                kind: "DAG_MISS",
	                expected: ar,
	                found: Sk.nameForToken(type),
	                found_val: value,
	                inside: Sk.nameForToken(tp.node.type),
	                node: tp.node,
	                parent: this.stack.length > 1 ? this.stack[this.stack.length - 2].node : undefined
	            };
	            var reason = "expected " + ar.join(', ') + " but found " + extra.found + " while parsing " + extra.inside;

	            throw new Sk.builtin.SyntaxError(reason, this.filename, errline, context, extra);
	        }
	    }
	};

	// turn a token into a label
	Parser.prototype.classify = function (type, value, context) {
	    var ilabel;
	    if (type === Sk.Tokenizer.Tokens.T_NAME) {
	        this.used_names[value] = true;
	        ilabel = this.grammar.keywords.hasOwnProperty(value) && this.grammar.keywords[value];

	        /* Check for handling print as an builtin function */
	        if(value === "print" && (this.p_flags & Parser.CO_FUTURE_PRINT_FUNCTION || Sk.python3 === true)) {
	            ilabel = false; // ilabel determines if the value is a keyword
	        }

	        if (ilabel) {
	            //print("is keyword");
	            return ilabel;
	        }
	    }
	    ilabel = this.grammar.tokens.hasOwnProperty(type) && this.grammar.tokens[type];
	    if (!ilabel) {
	        // throw new Sk.builtin.SyntaxError("bad token", type, value, context);
	        // Questionable modification to put line number in position 2
	        // like everywhere else and filename in position 1.
	        var extra = {
	            kind: "CLASSIFY",
	            type: type,
	            value: value
	        };
	        throw new Sk.builtin.SyntaxError("bad token", this.filename, context[0][0], context, extra);
	    }
	    return ilabel;
	};

	// shift a token
	Parser.prototype.shift = function (type, value, newstate, context) {
	    var dfa = this.stack[this.stack.length - 1].dfa;
	    var state = this.stack[this.stack.length - 1].state;
	    var node = this.stack[this.stack.length - 1].node;
	    //print("context", context);
	    var newnode = {
	        type      : type,
	        value     : value,
	        lineno    : context[0][0],         // throwing away end here to match cpython
	        col_offset: context[0][1],
	        children  : null
	    };
	    if (newnode) {
	        node.children.push(newnode);
	    }
	    this.stack[this.stack.length - 1] = {
	        dfa  : dfa,
	        state: newstate,
	        node : node
	    };
	};

	// push a nonterminal
	Parser.prototype.push = function (type, newdfa, newstate, context) {
	    var dfa = this.stack[this.stack.length - 1].dfa;
	    var node = this.stack[this.stack.length - 1].node;
	    var newnode = {
	        type      : type,
	        value     : null,
	        lineno    : context[0][0],      // throwing away end here to match cpython
	        col_offset: context[0][1],
	        children  : []
	    };
	    this.stack[this.stack.length - 1] = {
	        dfa  : dfa,
	        state: newstate,
	        node : node
	    };
	    this.stack.push({
	        dfa  : newdfa,
	        state: 0,
	        node : newnode
	    });
	};

	//var ac = 0;
	//var bc = 0;

	// pop a nonterminal
	Parser.prototype.pop = function () {
	    var node;
	    var pop = this.stack.pop();
	    var newnode = pop.node;
	    //print("POP");
	    if (newnode) {
	        //print("A", ac++, newnode.type);
	        //print("stacklen:"+this.stack.length);
	        if (this.stack.length !== 0) {
	            //print("B", bc++);
	            node = this.stack[this.stack.length - 1].node;
	            node.children.push(newnode);
	        } else {
	            //print("C");
	            this.rootnode = newnode;
	            this.rootnode.used_names = this.used_names;
	        }
	    }
	};

	/**
	 * parser for interactive input. returns a function that should be called with
	 * lines of input as they are entered. the function will return false
	 * until the input is complete, when it will return the rootnode of the parse.
	 *
	 * @param {string} filename
	 * @param {string=} style root of parse tree (optional)
	 */
	function makeParser (filename, style) {
	    var tokenizer;
	    var T_OP;
	    var T_NL;
	    var T_COMMENT;
	    var prefix;
	    var column;
	    var lineno;
	    var p;
	    if (style === undefined) {
	        style = "file_input";
	    }
	    p = new Parser(filename, Sk.ParseTables);
	    // for closure's benefit
	    if (style === "file_input") {
	        p.setup(Sk.ParseTables.sym.file_input);
	    } else {
	        goog.asserts.fail("todo;");
	    }
	    lineno = 1;
	    column = 0;
	    prefix = "";
	    T_COMMENT = Sk.Tokenizer.Tokens.T_COMMENT;
	    T_NL = Sk.Tokenizer.Tokens.T_NL;
	    T_OP = Sk.Tokenizer.Tokens.T_OP;
	    tokenizer = new Sk.Tokenizer(filename, style === "single_input", function (type, value, start, end, line) {
	        var s_lineno = start[0];
	        var s_column = start[1];
	        /*
	         if (s_lineno !== lineno && s_column !== column)
	         {
	         // todo; update prefix and line/col
	         }
	         */
	        if (type === T_COMMENT || type === T_NL) {
	            prefix += value;
	            lineno = end[0];
	            column = end[1];
	            if (value[value.length - 1] === "\n") {
	                lineno += 1;
	                column = 0;
	            }
	            //print("  not calling addtoken");
	            return undefined;
	        }
	        if (type === T_OP) {
	            type = Sk.OpMap[value];
	        }
	        if (p.addtoken(type, value, [start, end, line])) {
	            return true;
	        }
	    });

	    // create parser function
	    var parseFunc = function (line) {
	        var ret = tokenizer.generateTokens(line);
	        //print("tok:"+ret);
	        if (ret) {
	            if (ret !== "done") {
	                throw new Sk.builtin.SyntaxError("incomplete input", this.filename);
	            }
	            return p.rootnode;
	        }
	        return false;
	    };

	    // set flags, and return
	    parseFunc.p_flags = p.p_flags;
	    return parseFunc;
	}

	Sk.parse = function parse (filename, input) {
	    var i;
	    var ret;
	    var lines;
	    var parseFunc = makeParser(filename);
	    if (input.substr(input.length - 1, 1) !== "\n") {
	        input += "\n";
	    }
	    //print("input:"+input);
	    lines = input.split("\n");
	    for (i = 0; i < lines.length; ++i) {
	        ret = parseFunc(lines[i] + ((i === lines.length - 1) ? "" : "\n"));
	    }

	    /*
	     * Small adjustments here in order to return th flags and the cst
	     */
	    return {"cst": ret, "flags": parseFunc.p_flags};
	};

	Sk.parseTreeDump = function parseTreeDump (n, indent) {
	    //return JSON.stringify(n, null, 2);
	    var i;
	    var ret;
	    indent = indent || "";
	    ret = "";
	    ret += indent;
	    if (n.type >= 256) { // non-term
	        ret += Sk.ParseTables.number2symbol[n.type] + "\n";
	        for (i = 0; i < n.children.length; ++i) {
	            ret += Sk.parseTreeDump(n.children[i], indent + "  ");
	        }
	    } else {
	        ret += Sk.Tokenizer.tokenNames[n.type] + ": " + new Sk.builtin.str(n.value)["$r"]().v + "\n";
	    }
	    return ret;
	};


	goog.exportSymbol("Sk.parse", Sk.parse);
	goog.exportSymbol("Sk.parseTreeDump", Sk.parseTreeDump);



	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/gen/astnodes.js ---- */ 

	/* File automatically generated by ./asdl_js.py. */

	/* ----- expr_context ----- */
	/** @constructor */
	function Load() {}
	/** @constructor */
	function Store() {}
	/** @constructor */
	function Del() {}
	/** @constructor */
	function AugLoad() {}
	/** @constructor */
	function AugStore() {}
	/** @constructor */
	function Param() {}

	/* ----- boolop ----- */
	/** @constructor */
	function And() {}
	/** @constructor */
	function Or() {}

	/* ----- operator ----- */
	/** @constructor */
	function Add() {}
	/** @constructor */
	function Sub() {}
	/** @constructor */
	function Mult() {}
	/** @constructor */
	function Div() {}
	/** @constructor */
	function Mod() {}
	/** @constructor */
	function Pow() {}
	/** @constructor */
	function LShift() {}
	/** @constructor */
	function RShift() {}
	/** @constructor */
	function BitOr() {}
	/** @constructor */
	function BitXor() {}
	/** @constructor */
	function BitAnd() {}
	/** @constructor */
	function FloorDiv() {}

	/* ----- unaryop ----- */
	/** @constructor */
	function Invert() {}
	/** @constructor */
	function Not() {}
	/** @constructor */
	function UAdd() {}
	/** @constructor */
	function USub() {}

	/* ----- cmpop ----- */
	/** @constructor */
	function Eq() {}
	/** @constructor */
	function NotEq() {}
	/** @constructor */
	function Lt() {}
	/** @constructor */
	function LtE() {}
	/** @constructor */
	function Gt() {}
	/** @constructor */
	function GtE() {}
	/** @constructor */
	function Is() {}
	/** @constructor */
	function IsNot() {}
	/** @constructor */
	function In_() {}
	/** @constructor */
	function NotIn() {}







	/* ---------------------- */
	/* constructors for nodes */
	/* ---------------------- */





	/** @constructor */
	function Module(/* {asdl_seq *} */ body)
	{
	    this.body = body;
	    return this;
	}

	/** @constructor */
	function Interactive(/* {asdl_seq *} */ body)
	{
	    this.body = body;
	    return this;
	}

	/** @constructor */
	function Expression(/* {expr_ty} */ body)
	{
	    goog.asserts.assert(body !== null && body !== undefined);
	    this.body = body;
	    return this;
	}

	/** @constructor */
	function Suite(/* {asdl_seq *} */ body)
	{
	    this.body = body;
	    return this;
	}

	/** @constructor */
	function FunctionDef(/* {identifier} */ name, /* {arguments__ty} */ args, /*
	                          {asdl_seq *} */ body, /* {asdl_seq *} */
	                          decorator_list, /* {int} */ lineno, /* {int} */
	                          col_offset)
	{
	    goog.asserts.assert(name !== null && name !== undefined);
	    goog.asserts.assert(args !== null && args !== undefined);
	    this.name = name;
	    this.args = args;
	    this.body = body;
	    this.decorator_list = decorator_list;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function ClassDef(/* {identifier} */ name, /* {asdl_seq *} */ bases, /*
	                       {asdl_seq *} */ body, /* {asdl_seq *} */ decorator_list,
	                       /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(name !== null && name !== undefined);
	    this.name = name;
	    this.bases = bases;
	    this.body = body;
	    this.decorator_list = decorator_list;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Return_(/* {expr_ty} */ value, /* {int} */ lineno, /* {int} */
	                      col_offset)
	{
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Delete_(/* {asdl_seq *} */ targets, /* {int} */ lineno, /* {int} */
	                      col_offset)
	{
	    this.targets = targets;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Assign(/* {asdl_seq *} */ targets, /* {expr_ty} */ value, /* {int} */
	                     lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.targets = targets;
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function AugAssign(/* {expr_ty} */ target, /* {operator_ty} */ op, /* {expr_ty}
	                        */ value, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(target !== null && target !== undefined);
	    goog.asserts.assert(op !== null && op !== undefined);
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.target = target;
	    this.op = op;
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Print(/* {expr_ty} */ dest, /* {asdl_seq *} */ values, /* {bool} */
	                    nl, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.dest = dest;
	    this.values = values;
	    this.nl = nl;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function For_(/* {expr_ty} */ target, /* {expr_ty} */ iter, /* {asdl_seq *} */
	                   body, /* {asdl_seq *} */ orelse, /* {int} */ lineno, /*
	                   {int} */ col_offset)
	{
	    goog.asserts.assert(target !== null && target !== undefined);
	    goog.asserts.assert(iter !== null && iter !== undefined);
	    this.target = target;
	    this.iter = iter;
	    this.body = body;
	    this.orelse = orelse;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function While_(/* {expr_ty} */ test, /* {asdl_seq *} */ body, /* {asdl_seq *}
	                     */ orelse, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(test !== null && test !== undefined);
	    this.test = test;
	    this.body = body;
	    this.orelse = orelse;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function If_(/* {expr_ty} */ test, /* {asdl_seq *} */ body, /* {asdl_seq *} */
	                  orelse, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(test !== null && test !== undefined);
	    this.test = test;
	    this.body = body;
	    this.orelse = orelse;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function With_(/* {expr_ty} */ context_expr, /* {expr_ty} */ optional_vars, /*
	                    {asdl_seq *} */ body, /* {int} */ lineno, /* {int} */
	                    col_offset)
	{
	    goog.asserts.assert(context_expr !== null && context_expr !== undefined);
	    this.context_expr = context_expr;
	    this.optional_vars = optional_vars;
	    this.body = body;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Raise(/* {expr_ty} */ type, /* {expr_ty} */ inst, /* {expr_ty} */
	                    tback, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.type = type;
	    this.inst = inst;
	    this.tback = tback;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function TryExcept(/* {asdl_seq *} */ body, /* {asdl_seq *} */ handlers, /*
	                        {asdl_seq *} */ orelse, /* {int} */ lineno, /* {int} */
	                        col_offset)
	{
	    this.body = body;
	    this.handlers = handlers;
	    this.orelse = orelse;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function TryFinally(/* {asdl_seq *} */ body, /* {asdl_seq *} */ finalbody, /*
	                         {int} */ lineno, /* {int} */ col_offset)
	{
	    this.body = body;
	    this.finalbody = finalbody;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Assert(/* {expr_ty} */ test, /* {expr_ty} */ msg, /* {int} */ lineno,
	                     /* {int} */ col_offset)
	{
	    goog.asserts.assert(test !== null && test !== undefined);
	    this.test = test;
	    this.msg = msg;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Import_(/* {asdl_seq *} */ names, /* {int} */ lineno, /* {int} */
	                      col_offset)
	{
	    this.names = names;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function ImportFrom(/* {identifier} */ module, /* {asdl_seq *} */ names, /*
	                         {int} */ level, /* {int} */ lineno, /* {int} */
	                         col_offset)
	{
	    goog.asserts.assert(module !== null && module !== undefined);
	    this.module = module;
	    this.names = names;
	    this.level = level;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Exec(/* {expr_ty} */ body, /* {expr_ty} */ globals, /* {expr_ty} */
	                   locals, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(body !== null && body !== undefined);
	    this.body = body;
	    this.globals = globals;
	    this.locals = locals;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Global(/* {asdl_seq *} */ names, /* {int} */ lineno, /* {int} */
	                     col_offset)
	{
	    this.names = names;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Expr(/* {expr_ty} */ value, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Pass(/* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Break_(/* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Continue_(/* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Debugger_(/* {int} */ lineno, /* {int} */ col_offset)
	{
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function BoolOp(/* {boolop_ty} */ op, /* {asdl_seq *} */ values, /* {int} */
	                     lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(op !== null && op !== undefined);
	    this.op = op;
	    this.values = values;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function BinOp(/* {expr_ty} */ left, /* {operator_ty} */ op, /* {expr_ty} */
	                    right, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(left !== null && left !== undefined);
	    goog.asserts.assert(op !== null && op !== undefined);
	    goog.asserts.assert(right !== null && right !== undefined);
	    this.left = left;
	    this.op = op;
	    this.right = right;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function UnaryOp(/* {unaryop_ty} */ op, /* {expr_ty} */ operand, /* {int} */
	                      lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(op !== null && op !== undefined);
	    goog.asserts.assert(operand !== null && operand !== undefined);
	    this.op = op;
	    this.operand = operand;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Lambda(/* {arguments__ty} */ args, /* {expr_ty} */ body, /* {int} */
	                     lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(args !== null && args !== undefined);
	    goog.asserts.assert(body !== null && body !== undefined);
	    this.args = args;
	    this.body = body;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function IfExp(/* {expr_ty} */ test, /* {expr_ty} */ body, /* {expr_ty} */
	                    orelse, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(test !== null && test !== undefined);
	    goog.asserts.assert(body !== null && body !== undefined);
	    goog.asserts.assert(orelse !== null && orelse !== undefined);
	    this.test = test;
	    this.body = body;
	    this.orelse = orelse;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Dict(/* {asdl_seq *} */ keys, /* {asdl_seq *} */ values, /* {int} */
	                   lineno, /* {int} */ col_offset)
	{
	    this.keys = keys;
	    this.values = values;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Set(/* {asdl_seq *} */ elts, /* {int} */ lineno, /* {int} */
	                  col_offset)
	{
	    this.elts = elts;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function ListComp(/* {expr_ty} */ elt, /* {asdl_seq *} */ generators, /* {int}
	                       */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(elt !== null && elt !== undefined);
	    this.elt = elt;
	    this.generators = generators;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function SetComp(/* {expr_ty} */ elt, /* {asdl_seq *} */ generators, /* {int}
	                      */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(elt !== null && elt !== undefined);
	    this.elt = elt;
	    this.generators = generators;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function DictComp(/* {expr_ty} */ key, /* {expr_ty} */ value, /* {asdl_seq *}
	                       */ generators, /* {int} */ lineno, /* {int} */
	                       col_offset)
	{
	    goog.asserts.assert(key !== null && key !== undefined);
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.key = key;
	    this.value = value;
	    this.generators = generators;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function GeneratorExp(/* {expr_ty} */ elt, /* {asdl_seq *} */ generators, /*
	                           {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(elt !== null && elt !== undefined);
	    this.elt = elt;
	    this.generators = generators;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Yield(/* {expr_ty} */ value, /* {int} */ lineno, /* {int} */
	                    col_offset)
	{
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Compare(/* {expr_ty} */ left, /* {asdl_int_seq *} */ ops, /* {asdl_seq
	                      *} */ comparators, /* {int} */ lineno, /* {int} */
	                      col_offset)
	{
	    goog.asserts.assert(left !== null && left !== undefined);
	    this.left = left;
	    this.ops = ops;
	    this.comparators = comparators;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Call(/* {expr_ty} */ func, /* {asdl_seq *} */ args, /* {asdl_seq *} */
	                   keywords, /* {expr_ty} */ starargs, /* {expr_ty} */ kwargs,
	                   /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(func !== null && func !== undefined);
	    this.func = func;
	    this.args = args;
	    this.keywords = keywords;
	    this.starargs = starargs;
	    this.kwargs = kwargs;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Repr(/* {expr_ty} */ value, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.value = value;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Num(/* {object} */ n, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(n !== null && n !== undefined);
	    this.n = n;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Str(/* {string} */ s, /* {int} */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(s !== null && s !== undefined);
	    this.s = s;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Attribute(/* {expr_ty} */ value, /* {identifier} */ attr, /*
	                        {expr_context_ty} */ ctx, /* {int} */ lineno, /* {int}
	                        */ col_offset)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    goog.asserts.assert(attr !== null && attr !== undefined);
	    goog.asserts.assert(ctx !== null && ctx !== undefined);
	    this.value = value;
	    this.attr = attr;
	    this.ctx = ctx;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Subscript(/* {expr_ty} */ value, /* {slice_ty} */ slice, /*
	                        {expr_context_ty} */ ctx, /* {int} */ lineno, /* {int}
	                        */ col_offset)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    goog.asserts.assert(slice !== null && slice !== undefined);
	    goog.asserts.assert(ctx !== null && ctx !== undefined);
	    this.value = value;
	    this.slice = slice;
	    this.ctx = ctx;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Name(/* {identifier} */ id, /* {expr_context_ty} */ ctx, /* {int} */
	                   lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(id !== null && id !== undefined);
	    goog.asserts.assert(ctx !== null && ctx !== undefined);
	    this.id = id;
	    this.ctx = ctx;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function List(/* {asdl_seq *} */ elts, /* {expr_context_ty} */ ctx, /* {int} */
	                   lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(ctx !== null && ctx !== undefined);
	    this.elts = elts;
	    this.ctx = ctx;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Tuple(/* {asdl_seq *} */ elts, /* {expr_context_ty} */ ctx, /* {int}
	                    */ lineno, /* {int} */ col_offset)
	{
	    goog.asserts.assert(ctx !== null && ctx !== undefined);
	    this.elts = elts;
	    this.ctx = ctx;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function Ellipsis()
	{
	    return this;
	}

	/** @constructor */
	function Slice(/* {expr_ty} */ lower, /* {expr_ty} */ upper, /* {expr_ty} */
	                    step)
	{
	    this.lower = lower;
	    this.upper = upper;
	    this.step = step;
	    return this;
	}

	/** @constructor */
	function ExtSlice(/* {asdl_seq *} */ dims)
	{
	    this.dims = dims;
	    return this;
	}

	/** @constructor */
	function Index(/* {expr_ty} */ value)
	{
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.value = value;
	    return this;
	}

	/** @constructor */
	function comprehension(/* {expr_ty} */ target, /* {expr_ty} */ iter, /*
	                            {asdl_seq *} */ ifs)
	{
	    goog.asserts.assert(target !== null && target !== undefined);
	    goog.asserts.assert(iter !== null && iter !== undefined);
	    this.target = target;
	    this.iter = iter;
	    this.ifs = ifs;
	    return this;
	}

	/** @constructor */
	function ExceptHandler(/* {expr_ty} */ type, /* {expr_ty} */ name, /* {asdl_seq
	                            *} */ body, /* {int} */ lineno, /* {int} */
	                            col_offset)
	{
	    this.type = type;
	    this.name = name;
	    this.body = body;
	    this.lineno = lineno;
	    this.col_offset = col_offset;
	    return this;
	}

	/** @constructor */
	function arguments_(/* {asdl_seq *} */ args, /* {identifier} */ vararg, /*
	                         {identifier} */ kwarg, /* {asdl_seq *} */ defaults)
	{
	    this.args = args;
	    this.vararg = vararg;
	    this.kwarg = kwarg;
	    this.defaults = defaults;
	    return this;
	}

	/** @constructor */
	function keyword(/* {identifier} */ arg, /* {expr_ty} */ value)
	{
	    goog.asserts.assert(arg !== null && arg !== undefined);
	    goog.asserts.assert(value !== null && value !== undefined);
	    this.arg = arg;
	    this.value = value;
	    return this;
	}

	/** @constructor */
	function alias(/* {identifier} */ name, /* {identifier} */ asname)
	{
	    goog.asserts.assert(name !== null && name !== undefined);
	    this.name = name;
	    this.asname = asname;
	    return this;
	}


	Module.prototype._astname = "Module";
	Module.prototype._fields = [
	    "body", function(n) { return n.body; }
	];
	Interactive.prototype._astname = "Interactive";
	Interactive.prototype._fields = [
	    "body", function(n) { return n.body; }
	];
	Expression.prototype._astname = "Expression";
	Expression.prototype._fields = [
	    "body", function(n) { return n.body; }
	];
	Suite.prototype._astname = "Suite";
	Suite.prototype._fields = [
	    "body", function(n) { return n.body; }
	];
	FunctionDef.prototype._astname = "FunctionDef";
	FunctionDef.prototype._fields = [
	    "name", function(n) { return n.name; },
	    "args", function(n) { return n.args; },
	    "body", function(n) { return n.body; },
	    "decorator_list", function(n) { return n.decorator_list; }
	];
	ClassDef.prototype._astname = "ClassDef";
	ClassDef.prototype._fields = [
	    "name", function(n) { return n.name; },
	    "bases", function(n) { return n.bases; },
	    "body", function(n) { return n.body; },
	    "decorator_list", function(n) { return n.decorator_list; }
	];
	Return_.prototype._astname = "Return";
	Return_.prototype._fields = [
	    "value", function(n) { return n.value; }
	];
	Delete_.prototype._astname = "Delete";
	Delete_.prototype._fields = [
	    "targets", function(n) { return n.targets; }
	];
	Assign.prototype._astname = "Assign";
	Assign.prototype._fields = [
	    "targets", function(n) { return n.targets; },
	    "value", function(n) { return n.value; }
	];
	AugAssign.prototype._astname = "AugAssign";
	AugAssign.prototype._fields = [
	    "target", function(n) { return n.target; },
	    "op", function(n) { return n.op; },
	    "value", function(n) { return n.value; }
	];
	Print.prototype._astname = "Print";
	Print.prototype._fields = [
	    "dest", function(n) { return n.dest; },
	    "values", function(n) { return n.values; },
	    "nl", function(n) { return n.nl; }
	];
	For_.prototype._astname = "For";
	For_.prototype._fields = [
	    "target", function(n) { return n.target; },
	    "iter", function(n) { return n.iter; },
	    "body", function(n) { return n.body; },
	    "orelse", function(n) { return n.orelse; }
	];
	While_.prototype._astname = "While";
	While_.prototype._fields = [
	    "test", function(n) { return n.test; },
	    "body", function(n) { return n.body; },
	    "orelse", function(n) { return n.orelse; }
	];
	If_.prototype._astname = "If";
	If_.prototype._fields = [
	    "test", function(n) { return n.test; },
	    "body", function(n) { return n.body; },
	    "orelse", function(n) { return n.orelse; }
	];
	With_.prototype._astname = "With";
	With_.prototype._fields = [
	    "context_expr", function(n) { return n.context_expr; },
	    "optional_vars", function(n) { return n.optional_vars; },
	    "body", function(n) { return n.body; }
	];
	Raise.prototype._astname = "Raise";
	Raise.prototype._fields = [
	    "type", function(n) { return n.type; },
	    "inst", function(n) { return n.inst; },
	    "tback", function(n) { return n.tback; }
	];
	TryExcept.prototype._astname = "TryExcept";
	TryExcept.prototype._fields = [
	    "body", function(n) { return n.body; },
	    "handlers", function(n) { return n.handlers; },
	    "orelse", function(n) { return n.orelse; }
	];
	TryFinally.prototype._astname = "TryFinally";
	TryFinally.prototype._fields = [
	    "body", function(n) { return n.body; },
	    "finalbody", function(n) { return n.finalbody; }
	];
	Assert.prototype._astname = "Assert";
	Assert.prototype._fields = [
	    "test", function(n) { return n.test; },
	    "msg", function(n) { return n.msg; }
	];
	Import_.prototype._astname = "Import";
	Import_.prototype._fields = [
	    "names", function(n) { return n.names; }
	];
	ImportFrom.prototype._astname = "ImportFrom";
	ImportFrom.prototype._fields = [
	    "module", function(n) { return n.module; },
	    "names", function(n) { return n.names; },
	    "level", function(n) { return n.level; }
	];
	Exec.prototype._astname = "Exec";
	Exec.prototype._fields = [
	    "body", function(n) { return n.body; },
	    "globals", function(n) { return n.globals; },
	    "locals", function(n) { return n.locals; }
	];
	Global.prototype._astname = "Global";
	Global.prototype._fields = [
	    "names", function(n) { return n.names; }
	];
	Expr.prototype._astname = "Expr";
	Expr.prototype._fields = [
	    "value", function(n) { return n.value; }
	];
	Pass.prototype._astname = "Pass";
	Pass.prototype._fields = [
	];
	Break_.prototype._astname = "Break";
	Break_.prototype._fields = [
	];
	Continue_.prototype._astname = "Continue";
	Continue_.prototype._fields = [
	];
	Debugger_.prototype._astname = "Debugger";
	Debugger_.prototype._fields = [
	];
	BoolOp.prototype._astname = "BoolOp";
	BoolOp.prototype._fields = [
	    "op", function(n) { return n.op; },
	    "values", function(n) { return n.values; }
	];
	BinOp.prototype._astname = "BinOp";
	BinOp.prototype._fields = [
	    "left", function(n) { return n.left; },
	    "op", function(n) { return n.op; },
	    "right", function(n) { return n.right; }
	];
	UnaryOp.prototype._astname = "UnaryOp";
	UnaryOp.prototype._fields = [
	    "op", function(n) { return n.op; },
	    "operand", function(n) { return n.operand; }
	];
	Lambda.prototype._astname = "Lambda";
	Lambda.prototype._fields = [
	    "args", function(n) { return n.args; },
	    "body", function(n) { return n.body; }
	];
	IfExp.prototype._astname = "IfExp";
	IfExp.prototype._fields = [
	    "test", function(n) { return n.test; },
	    "body", function(n) { return n.body; },
	    "orelse", function(n) { return n.orelse; }
	];
	Dict.prototype._astname = "Dict";
	Dict.prototype._fields = [
	    "keys", function(n) { return n.keys; },
	    "values", function(n) { return n.values; }
	];
	Set.prototype._astname = "Set";
	Set.prototype._fields = [
	    "elts", function(n) { return n.elts; }
	];
	ListComp.prototype._astname = "ListComp";
	ListComp.prototype._fields = [
	    "elt", function(n) { return n.elt; },
	    "generators", function(n) { return n.generators; }
	];
	SetComp.prototype._astname = "SetComp";
	SetComp.prototype._fields = [
	    "elt", function(n) { return n.elt; },
	    "generators", function(n) { return n.generators; }
	];
	DictComp.prototype._astname = "DictComp";
	DictComp.prototype._fields = [
	    "key", function(n) { return n.key; },
	    "value", function(n) { return n.value; },
	    "generators", function(n) { return n.generators; }
	];
	GeneratorExp.prototype._astname = "GeneratorExp";
	GeneratorExp.prototype._fields = [
	    "elt", function(n) { return n.elt; },
	    "generators", function(n) { return n.generators; }
	];
	Yield.prototype._astname = "Yield";
	Yield.prototype._fields = [
	    "value", function(n) { return n.value; }
	];
	Compare.prototype._astname = "Compare";
	Compare.prototype._fields = [
	    "left", function(n) { return n.left; },
	    "ops", function(n) { return n.ops; },
	    "comparators", function(n) { return n.comparators; }
	];
	Call.prototype._astname = "Call";
	Call.prototype._fields = [
	    "func", function(n) { return n.func; },
	    "args", function(n) { return n.args; },
	    "keywords", function(n) { return n.keywords; },
	    "starargs", function(n) { return n.starargs; },
	    "kwargs", function(n) { return n.kwargs; }
	];
	Repr.prototype._astname = "Repr";
	Repr.prototype._fields = [
	    "value", function(n) { return n.value; }
	];
	Num.prototype._astname = "Num";
	Num.prototype._fields = [
	    "n", function(n) { return n.n; }
	];
	Str.prototype._astname = "Str";
	Str.prototype._fields = [
	    "s", function(n) { return n.s; }
	];
	Attribute.prototype._astname = "Attribute";
	Attribute.prototype._fields = [
	    "value", function(n) { return n.value; },
	    "attr", function(n) { return n.attr; },
	    "ctx", function(n) { return n.ctx; }
	];
	Subscript.prototype._astname = "Subscript";
	Subscript.prototype._fields = [
	    "value", function(n) { return n.value; },
	    "slice", function(n) { return n.slice; },
	    "ctx", function(n) { return n.ctx; }
	];
	Name.prototype._astname = "Name";
	Name.prototype._fields = [
	    "id", function(n) { return n.id; },
	    "ctx", function(n) { return n.ctx; }
	];
	List.prototype._astname = "List";
	List.prototype._fields = [
	    "elts", function(n) { return n.elts; },
	    "ctx", function(n) { return n.ctx; }
	];
	Tuple.prototype._astname = "Tuple";
	Tuple.prototype._fields = [
	    "elts", function(n) { return n.elts; },
	    "ctx", function(n) { return n.ctx; }
	];
	Load.prototype._astname = "Load";
	Load.prototype._isenum = true;
	Store.prototype._astname = "Store";
	Store.prototype._isenum = true;
	Del.prototype._astname = "Del";
	Del.prototype._isenum = true;
	AugLoad.prototype._astname = "AugLoad";
	AugLoad.prototype._isenum = true;
	AugStore.prototype._astname = "AugStore";
	AugStore.prototype._isenum = true;
	Param.prototype._astname = "Param";
	Param.prototype._isenum = true;
	Ellipsis.prototype._astname = "Ellipsis";
	Ellipsis.prototype._fields = [
	];
	Slice.prototype._astname = "Slice";
	Slice.prototype._fields = [
	    "lower", function(n) { return n.lower; },
	    "upper", function(n) { return n.upper; },
	    "step", function(n) { return n.step; }
	];
	ExtSlice.prototype._astname = "ExtSlice";
	ExtSlice.prototype._fields = [
	    "dims", function(n) { return n.dims; }
	];
	Index.prototype._astname = "Index";
	Index.prototype._fields = [
	    "value", function(n) { return n.value; }
	];
	And.prototype._astname = "And";
	And.prototype._isenum = true;
	Or.prototype._astname = "Or";
	Or.prototype._isenum = true;
	Add.prototype._astname = "Add";
	Add.prototype._isenum = true;
	Sub.prototype._astname = "Sub";
	Sub.prototype._isenum = true;
	Mult.prototype._astname = "Mult";
	Mult.prototype._isenum = true;
	Div.prototype._astname = "Div";
	Div.prototype._isenum = true;
	Mod.prototype._astname = "Mod";
	Mod.prototype._isenum = true;
	Pow.prototype._astname = "Pow";
	Pow.prototype._isenum = true;
	LShift.prototype._astname = "LShift";
	LShift.prototype._isenum = true;
	RShift.prototype._astname = "RShift";
	RShift.prototype._isenum = true;
	BitOr.prototype._astname = "BitOr";
	BitOr.prototype._isenum = true;
	BitXor.prototype._astname = "BitXor";
	BitXor.prototype._isenum = true;
	BitAnd.prototype._astname = "BitAnd";
	BitAnd.prototype._isenum = true;
	FloorDiv.prototype._astname = "FloorDiv";
	FloorDiv.prototype._isenum = true;
	Invert.prototype._astname = "Invert";
	Invert.prototype._isenum = true;
	Not.prototype._astname = "Not";
	Not.prototype._isenum = true;
	UAdd.prototype._astname = "UAdd";
	UAdd.prototype._isenum = true;
	USub.prototype._astname = "USub";
	USub.prototype._isenum = true;
	Eq.prototype._astname = "Eq";
	Eq.prototype._isenum = true;
	NotEq.prototype._astname = "NotEq";
	NotEq.prototype._isenum = true;
	Lt.prototype._astname = "Lt";
	Lt.prototype._isenum = true;
	LtE.prototype._astname = "LtE";
	LtE.prototype._isenum = true;
	Gt.prototype._astname = "Gt";
	Gt.prototype._isenum = true;
	GtE.prototype._astname = "GtE";
	GtE.prototype._isenum = true;
	Is.prototype._astname = "Is";
	Is.prototype._isenum = true;
	IsNot.prototype._astname = "IsNot";
	IsNot.prototype._isenum = true;
	In_.prototype._astname = "In";
	In_.prototype._isenum = true;
	NotIn.prototype._astname = "NotIn";
	NotIn.prototype._isenum = true;
	comprehension.prototype._astname = "comprehension";
	comprehension.prototype._fields = [
	    "target", function(n) { return n.target; },
	    "iter", function(n) { return n.iter; },
	    "ifs", function(n) { return n.ifs; }
	];
	ExceptHandler.prototype._astname = "ExceptHandler";
	ExceptHandler.prototype._fields = [
	    "type", function(n) { return n.type; },
	    "name", function(n) { return n.name; },
	    "body", function(n) { return n.body; }
	];
	arguments_.prototype._astname = "arguments";
	arguments_.prototype._fields = [
	    "args", function(n) { return n.args; },
	    "vararg", function(n) { return n.vararg; },
	    "kwarg", function(n) { return n.kwarg; },
	    "defaults", function(n) { return n.defaults; }
	];
	keyword.prototype._astname = "keyword";
	keyword.prototype._fields = [
	    "arg", function(n) { return n.arg; },
	    "value", function(n) { return n.value; }
	];
	alias.prototype._astname = "alias";
	alias.prototype._fields = [
	    "name", function(n) { return n.name; },
	    "asname", function(n) { return n.asname; }
	];




	/* ---- /Users/rob/skulpty/lib/../node_modules/skulpt/src/ast.js ---- */ 

	//
	// This is pretty much a straight port of ast.c from CPython 2.6.5.
	//
	// The previous version was easier to work with and more JS-ish, but having a
	// somewhat different ast structure than cpython makes testing more difficult.
	//
	// This way, we can use a dump from the ast module on any arbitrary python
	// code and know that we're the same up to ast level, at least.
	//

	var SYM = Sk.ParseTables.sym;
	var TOK = Sk.Tokenizer.Tokens;
	var COMP_GENEXP = 0;
	var COMP_SETCOMP = 1;

	/** @constructor */
	function Compiling (encoding, filename, c_flags) {
	    this.c_encoding = encoding;
	    this.c_filename = filename;
	    this.c_flags = c_flags || 0;
	}

	/**
	 * @return {number}
	 */
	function NCH (n) {
	    goog.asserts.assert(n !== undefined);
	    if (n.children === null) {
	        return 0;
	    }
	    return n.children.length;
	}

	function CHILD (n, i) {
	    goog.asserts.assert(n !== undefined);
	    goog.asserts.assert(i !== undefined);
	    return n.children[i];
	}

	function REQ (n, type) {
	    goog.asserts.assert(n.type === type, "node wasn't expected type");
	}

	function strobj (s) {
	    goog.asserts.assert(typeof s === "string", "expecting string, got " + (typeof s));
	    return new Sk.builtin.str(s);
	}

	/** @return {number} */
	function numStmts (n) {
	    var ch;
	    var i;
	    var cnt;
	    switch (n.type) {
	        case SYM.single_input:
	            if (CHILD(n, 0).type === TOK.T_NEWLINE) {
	                return 0;
	            }
	            else {
	                return numStmts(CHILD(n, 0));
	            }
	        case SYM.file_input:
	            cnt = 0;
	            for (i = 0; i < NCH(n); ++i) {
	                ch = CHILD(n, i);
	                if (ch.type === SYM.stmt) {
	                    cnt += numStmts(ch);
	                }
	            }
	            return cnt;
	        case SYM.stmt:
	            return numStmts(CHILD(n, 0));
	        case SYM.compound_stmt:
	            return 1;
	        case SYM.simple_stmt:
	            return Math.floor(NCH(n) / 2); // div 2 is to remove count of ;s
	        case SYM.suite:
	            if (NCH(n) === 1) {
	                return numStmts(CHILD(n, 0));
	            }
	            else {
	                cnt = 0;
	                for (i = 2; i < NCH(n) - 1; ++i) {
	                    cnt += numStmts(CHILD(n, i));
	                }
	                return cnt;
	            }
	            break;
	        default:
	            goog.asserts.fail("Non-statement found");
	    }
	    return 0;
	}

	function forbiddenCheck (c, n, x, lineno) {
	    if (x === "None") {
	        throw new Sk.builtin.SyntaxError("assignment to None", c.c_filename, lineno, [], {node: n});
	    }
	    if (x === "True" || x === "False") {
	        throw new Sk.builtin.SyntaxError("assignment to True or False is forbidden", c.c_filename, lineno, [], {node: n});
	    }
	}

	/**
	 * Set the context ctx for e, recursively traversing e.
	 *
	 * Only sets context for expr kinds that can appear in assignment context as
	 * per the asdl file.
	 */
	function setContext (c, e, ctx, n) {
	    var i;
	    var exprName;
	    var s;
	    goog.asserts.assert(ctx !== AugStore && ctx !== AugLoad);
	    s = null;
	    exprName = null;

	    switch (e.constructor) {
	        case Attribute:
	        case Name:
	            if (ctx === Store) {
	                forbiddenCheck(c, n, e.attr, n.lineno);
	            }
	            e.ctx = ctx;
	            break;
	        case Subscript:
	            e.ctx = ctx;
	            break;
	        case List:
	            e.ctx = ctx;
	            s = e.elts;
	            break;
	        case Tuple:
	            if (e.elts.length === 0) {
	                throw new Sk.builtin.SyntaxError("can't assign to ()", c.c_filename, n.lineno, ctx, {node: n});
	            }
	            e.ctx = ctx;
	            s = e.elts;
	            break;
	        case Lambda:
	            exprName = "lambda";
	            break;
	        case Call:
	            exprName = "function call";
	            break;
	        case BoolOp:
	        case BinOp:
	        case UnaryOp:
	            exprName = "operator";
	            break;
	        case GeneratorExp:
	            exprName = "generator expression";
	            break;
	        case Yield:
	            exprName = "yield expression";
	            break;
	        case ListComp:
	            exprName = "list comprehension";
	            break;
	        case SetComp:
	            exprName = "set comprehension";
	            break;
	        case DictComp:
	            exprName = "dict comprehension";
	            break;
	        case Dict:
	        case Set:
	        case Num:
	        case Str:
	            exprName = "literal";
	            break;
	        case Compare:
	            exprName = "comparison";
	            break;
	        case Repr:
	            exprName = "repr";
	            break;
	        case IfExp:
	            exprName = "conditional expression";
	            break;
	        default:
	            goog.asserts.fail("unhandled expression in assignment");
	    }
	    if (exprName) {
	        throw new Sk.builtin.SyntaxError("can't " + (ctx === Store ? "assign to" : "delete") + " " + exprName, c.c_filename, n.lineno, [], {node: n});
	    }

	    if (s) {
	        for (i = 0; i < s.length; ++i) {
	            setContext(c, s[i], ctx, n);
	        }
	    }
	}

	var operatorMap = {};
	(function () {
	    operatorMap[TOK.T_VBAR] = BitOr;
	    operatorMap[TOK.T_CIRCUMFLEX] = BitXor;
	    operatorMap[TOK.T_AMPER] = BitAnd;
	    operatorMap[TOK.T_LEFTSHIFT] = LShift;
	    operatorMap[TOK.T_RIGHTSHIFT] = RShift;
	    operatorMap[TOK.T_PLUS] = Add;
	    operatorMap[TOK.T_MINUS] = Sub;
	    operatorMap[TOK.T_STAR] = Mult;
	    operatorMap[TOK.T_SLASH] = Div;
	    operatorMap[TOK.T_DOUBLESLASH] = FloorDiv;
	    operatorMap[TOK.T_PERCENT] = Mod;
	}());

	function getOperator (n) {
	    goog.asserts.assert(operatorMap[n.type] !== undefined);
	    return operatorMap[n.type];
	}

	function astForCompOp (c, n) {
	    /* comp_op: '<'|'>'|'=='|'>='|'<='|'<>'|'!='|'in'|'not' 'in'|'is'
	     |'is' 'not'
	     */
	    REQ(n, SYM.comp_op);
	    if (NCH(n) === 1) {
	        n = CHILD(n, 0);
	        switch (n.type) {
	            case TOK.T_LESS:
	                return Lt;
	            case TOK.T_GREATER:
	                return Gt;
	            case TOK.T_EQEQUAL:
	                return Eq;
	            case TOK.T_LESSEQUAL:
	                return LtE;
	            case TOK.T_GREATEREQUAL:
	                return GtE;
	            case TOK.T_NOTEQUAL:
	                return NotEq;
	            case TOK.T_NAME:
	                if (n.value === "in") {
	                    return In_;
	                }
	                if (n.value === "is") {
	                    return Is;
	                }
	        }
	    }
	    else if (NCH(n) === 2) {
	        if (CHILD(n, 0).type === TOK.T_NAME) {
	            if (CHILD(n, 1).value === "in") {
	                return NotIn;
	            }
	            if (CHILD(n, 0).value === "is") {
	                return IsNot;
	            }
	        }
	    }
	    goog.asserts.fail("invalid comp_op");
	}

	function seqForTestlist (c, n) {
	    /* testlist: test (',' test)* [','] */
	    var i;
	    var seq = [];
	    goog.asserts.assert(n.type === SYM.testlist ||
	        n.type === SYM.listmaker ||
	        n.type === SYM.testlist_comp ||
	        n.type === SYM.testlist_safe ||
	        n.type === SYM.testlist1);
	    for (i = 0; i < NCH(n); i += 2) {
	        goog.asserts.assert(CHILD(n, i).type === SYM.test || CHILD(n, i).type === SYM.old_test);
	        seq[i / 2] = astForExpr(c, CHILD(n, i));
	    }
	    return seq;
	}

	function astForSuite (c, n) {
	    /* suite: simple_stmt | NEWLINE INDENT stmt+ DEDENT */
	    var j;
	    var num;
	    var i;
	    var end;
	    var ch;
	    var pos;
	    var seq;
	    REQ(n, SYM.suite);
	    seq = [];
	    pos = 0;
	    if (CHILD(n, 0).type === SYM.simple_stmt) {
	        n = CHILD(n, 0);
	        /* simple_stmt always ends with an NEWLINE and may have a trailing
	         * SEMI. */
	        end = NCH(n) - 1;
	        if (CHILD(n, end - 1).type === TOK.T_SEMI) {
	            end -= 1;
	        }
	        for (i = 0; i < end; i += 2) // by 2 to skip ;
	        {
	            seq[pos++] = astForStmt(c, CHILD(n, i));
	        }
	    }
	    else {
	        for (i = 2; i < NCH(n) - 1; ++i) {
	            ch = CHILD(n, i);
	            REQ(ch, SYM.stmt);
	            num = numStmts(ch);
	            if (num === 1) {
	                // small_stmt or compound_stmt w/ only 1 child
	                seq[pos++] = astForStmt(c, ch);
	            }
	            else {
	                ch = CHILD(ch, 0);
	                REQ(ch, SYM.simple_stmt);
	                for (j = 0; j < NCH(ch); j += 2) {
	                    if (NCH(CHILD(ch, j)) === 0) {
	                        goog.asserts.assert(j + 1 === NCH(ch));
	                        break;
	                    }
	                    seq[pos++] = astForStmt(c, CHILD(ch, j));
	                }
	            }
	        }
	    }
	    goog.asserts.assert(pos === numStmts(n));
	    return seq;
	}

	function astForExceptClause (c, exc, body) {
	    /* except_clause: 'except' [test [(',' | 'as') test]] */
	    var e;
	    REQ(exc, SYM.except_clause);
	    REQ(body, SYM.suite);
	    if (NCH(exc) === 1) {
	        return new ExceptHandler(null, null, astForSuite(c, body), exc.lineno, exc.col_offset);
	    }
	    else if (NCH(exc) === 2) {
	        return new ExceptHandler(astForExpr(c, CHILD(exc, 1)), null, astForSuite(c, body), exc.lineno, exc.col_offset);
	    }
	    else if (NCH(exc) === 4) {
	        e = astForExpr(c, CHILD(exc, 3));
	        setContext(c, e, Store, CHILD(exc, 3));
	        return new ExceptHandler(astForExpr(c, CHILD(exc, 1)), e, astForSuite(c, body), exc.lineno, exc.col_offset);
	    }
	    goog.asserts.fail("wrong number of children for except clause");
	}

	function astForTryStmt (c, n) {
	    var exceptSt;
	    var i;
	    var handlers;
	    var nc = NCH(n);
	    var nexcept = (nc - 3) / 3;
	    var body, orelse = [],
	        finally_ = null;

	    REQ(n, SYM.try_stmt);
	    body = astForSuite(c, CHILD(n, 2));
	    if (CHILD(n, nc - 3).type === TOK.T_NAME) {
	        if (CHILD(n, nc - 3).value === "finally") {
	            if (nc >= 9 && CHILD(n, nc - 6).type === TOK.T_NAME) {
	                /* we can assume it's an "else",
	                 because nc >= 9 for try-else-finally and
	                 it would otherwise have a type of except_clause */
	                orelse = astForSuite(c, CHILD(n, nc - 4));
	                nexcept--;
	            }

	            finally_ = astForSuite(c, CHILD(n, nc - 1));
	            nexcept--;
	        }
	        else {
	            /* we can assume it's an "else",
	             otherwise it would have a type of except_clause */
	            orelse = astForSuite(c, CHILD(n, nc - 1));
	            nexcept--;
	        }
	    }
	    else if (CHILD(n, nc - 3).type !== SYM.except_clause) {
	        throw new Sk.builtin.SyntaxError("malformed 'try' statement", c.c_filename, n.lineno);
	    }

	    if (nexcept > 0) {
	        handlers = [];
	        for (i = 0; i < nexcept; ++i) {
	            handlers[i] = astForExceptClause(c, CHILD(n, 3 + i * 3), CHILD(n, 5 + i * 3));
	        }
	        exceptSt = new TryExcept(body, handlers, orelse, n.lineno, n.col_offset);

	        if (!finally_) {
	            return exceptSt;
	        }

	        /* if a 'finally' is present too, we nest the TryExcept within a
	         TryFinally to emulate try ... except ... finally */
	        body = [exceptSt];
	    }

	    goog.asserts.assert(finally_ !== null);
	    return new TryFinally(body, finally_, n.lineno, n.col_offset);
	}


	function astForDottedName (c, n) {
	    var i;
	    var e;
	    var id;
	    var col_offset;
	    var lineno;
	    REQ(n, SYM.dotted_name);
	    lineno = n.lineno;
	    col_offset = n.col_offset;
	    id = strobj(CHILD(n, 0).value);
	    e = new Name(id, Load, lineno, col_offset);
	    for (i = 2; i < NCH(n); i += 2) {
	        id = strobj(CHILD(n, i).value);
	        e = new Attribute(e, id, Load, lineno, col_offset);
	    }
	    return e;
	}

	function astForDecorator (c, n) {
	    /* decorator: '@' dotted_name [ '(' [arglist] ')' ] NEWLINE */
	    var nameExpr;
	    REQ(n, SYM.decorator);
	    REQ(CHILD(n, 0), TOK.T_AT);
	    REQ(CHILD(n, NCH(n) - 1), TOK.T_NEWLINE);
	    nameExpr = astForDottedName(c, CHILD(n, 1));
	    if (NCH(n) === 3) // no args
	    {
	        return nameExpr;
	    }
	    else if (NCH(n) === 5) // call with no args
	    {
	        return new Call(nameExpr, [], [], null, null, n.lineno, n.col_offset);
	    }
	    else {
	        return astForCall(c, CHILD(n, 3), nameExpr);
	    }
	}

	function astForDecorators (c, n) {
	    var i;
	    var decoratorSeq;
	    REQ(n, SYM.decorators);
	    decoratorSeq = [];
	    for (i = 0; i < NCH(n); ++i) {
	        decoratorSeq[i] = astForDecorator(c, CHILD(n, i));
	    }
	    return decoratorSeq;
	}

	function astForDecorated (c, n) {
	    var thing;
	    var decoratorSeq;
	    REQ(n, SYM.decorated);
	    decoratorSeq = astForDecorators(c, CHILD(n, 0));
	    goog.asserts.assert(CHILD(n, 1).type === SYM.funcdef || CHILD(n, 1).type === SYM.classdef);

	    thing = null;
	    if (CHILD(n, 1).type === SYM.funcdef) {
	        thing = astForFuncdef(c, CHILD(n, 1), decoratorSeq);
	    }
	    else if (CHILD(n, 1) === SYM.classdef) {
	        thing = astForClassdef(c, CHILD(n, 1), decoratorSeq);
	    }
	    if (thing) {
	        thing.lineno = n.lineno;
	        thing.col_offset = n.col_offset;
	    }
	    return thing;
	}

	//note: with statements need to be updated to 2.7
	//see: ast.c lines: 3127 -> 3185

	function astForWithVar (c, n) {
	    REQ(n, SYM.with_item);
	    return astForExpr(c, CHILD(n, 1));
	}

	function astForWithStmt (c, n) {
	    /* with_stmt: 'with' test [ with_var ] ':' suite */
	    var optionalVars;
	    var contextExpr;
	    var suiteIndex = 3; // skip with, test, :
	    goog.asserts.assert(n.type === SYM.with_stmt);
	    contextExpr = astForExpr(c, CHILD(n, 1));
	    if (CHILD(n, 2).type === SYM.with_item) {
	        optionalVars = astForWithVar(c, CHILD(n, 2));
	        setContext(c, optionalVars, Store, n);
	        suiteIndex = 4;
	    }
	    return new With_(contextExpr, optionalVars, astForSuite(c, CHILD(n, suiteIndex)), n.lineno, n.col_offset);
	}

	function astForExecStmt (c, n) {
	    var expr1, globals = null, locals = null;
	    var nchildren = NCH(n);
	    goog.asserts.assert(nchildren === 2 || nchildren === 4 || nchildren === 6);

	    /* exec_stmt: 'exec' expr ['in' test [',' test]] */
	    REQ(n, SYM.exec_stmt);
	    expr1 = astForExpr(c, CHILD(n, 1));
	    if (nchildren >= 4) {
	        globals = astForExpr(c, CHILD(n, 3));
	    }
	    if (nchildren === 6) {
	        locals = astForExpr(c, CHILD(n, 5));
	    }
	    return new Exec(expr1, globals, locals, n.lineno, n.col_offset);
	}

	function astForIfStmt (c, n) {
	    /* if_stmt: 'if' test ':' suite ('elif' test ':' suite)*
	     ['else' ':' suite]
	     */
	    var off;
	    var i;
	    var orelse;
	    var hasElse;
	    var nElif;
	    var decider;
	    var s;
	    REQ(n, SYM.if_stmt);
	    if (NCH(n) === 4) {
	        return new If_(
	            astForExpr(c, CHILD(n, 1)),
	            astForSuite(c, CHILD(n, 3)),
	            [], n.lineno, n.col_offset);
	    }

	    s = CHILD(n, 4).value;
	    decider = s.charAt(2); // elSe or elIf
	    if (decider === "s") {
	        return new If_(
	            astForExpr(c, CHILD(n, 1)),
	            astForSuite(c, CHILD(n, 3)),
	            astForSuite(c, CHILD(n, 6)),
	            n.lineno, n.col_offset);
	    }
	    else if (decider === "i") {
	        nElif = NCH(n) - 4;
	        hasElse = false;
	        orelse = [];

	        /* must reference the child nElif+1 since 'else' token is third, not
	         * fourth child from the end. */
	        if (CHILD(n, nElif + 1).type === TOK.T_NAME &&
	            CHILD(n, nElif + 1).value.charAt(2) === "s") {
	            hasElse = true;
	            nElif -= 3;
	        }
	        nElif /= 4;

	        if (hasElse) {
	            orelse = [
	                new If_(
	                    astForExpr(c, CHILD(n, NCH(n) - 6)),
	                    astForSuite(c, CHILD(n, NCH(n) - 4)),
	                    astForSuite(c, CHILD(n, NCH(n) - 1)),
	                    CHILD(n, NCH(n) - 6).lineno,
	                    CHILD(n, NCH(n) - 6).col_offset)];
	            nElif--;
	        }

	        for (i = 0; i < nElif; ++i) {
	            off = 5 + (nElif - i - 1) * 4;
	            orelse = [
	                new If_(
	                    astForExpr(c, CHILD(n, off)),
	                    astForSuite(c, CHILD(n, off + 2)),
	                    orelse,
	                    CHILD(n, off).lineno,
	                    CHILD(n, off).col_offset)];
	        }
	        return new If_(
	            astForExpr(c, CHILD(n, 1)),
	            astForSuite(c, CHILD(n, 3)),
	            orelse, n.lineno, n.col_offset);
	    }

	    goog.asserts.fail("unexpected token in 'if' statement");
	}

	function astForExprlist (c, n, context) {
	    var e;
	    var i;
	    var seq;
	    REQ(n, SYM.exprlist);
	    seq = [];
	    for (i = 0; i < NCH(n); i += 2) {
	        e = astForExpr(c, CHILD(n, i));
	        seq[i / 2] = e;
	        if (context) {
	            setContext(c, e, context, CHILD(n, i));
	        }
	    }
	    return seq;
	}

	function astForDelStmt (c, n) {
	    /* del_stmt: 'del' exprlist */
	    REQ(n, SYM.del_stmt);
	    return new Delete_(astForExprlist(c, CHILD(n, 1), Del), n.lineno, n.col_offset);
	}

	function astForGlobalStmt (c, n) {
	    /* global_stmt: 'global' NAME (',' NAME)* */
	    var i;
	    var s = [];
	    REQ(n, SYM.global_stmt);
	    for (i = 1; i < NCH(n); i += 2) {
	        s[(i - 1) / 2] = strobj(CHILD(n, i).value);
	    }
	    return new Global(s, n.lineno, n.col_offset);
	}

	function astForAssertStmt (c, n) {
	    /* assert_stmt: 'assert' test [',' test] */
	    REQ(n, SYM.assert_stmt);
	    if (NCH(n) === 2) {
	        return new Assert(astForExpr(c, CHILD(n, 1)), null, n.lineno, n.col_offset);
	    }
	    else if (NCH(n) === 4) {
	        return new Assert(astForExpr(c, CHILD(n, 1)), astForExpr(c, CHILD(n, 3)), n.lineno, n.col_offset);
	    }
	    goog.asserts.fail("improper number of parts to assert stmt");
	}

	function aliasForImportName (c, n) {
	    /*
	     import_as_name: NAME ['as' NAME]
	     dotted_as_name: dotted_name ['as' NAME]
	     dotted_name: NAME ('.' NAME)*
	     */

	    var i;
	    var a;
	    var name;
	    var str;
	    loop: while (true) {
	        switch (n.type) {
	            case SYM.import_as_name:
	                str = null;
	                name = strobj(CHILD(n, 0).value);
	                if (NCH(n) === 3) {
	                    str = CHILD(n, 2).value;
	                }
	                return new alias(name, str == null ? null : strobj(str));
	            case SYM.dotted_as_name:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue loop;
	                }
	                else {
	                    a = aliasForImportName(c, CHILD(n, 0));
	                    goog.asserts.assert(!a.asname);
	                    a.asname = strobj(CHILD(n, 2).value);
	                    return a;
	                }
	                break;
	            case SYM.dotted_name:
	                if (NCH(n) === 1) {
	                    return new alias(strobj(CHILD(n, 0).value), null);
	                }
	                else {
	                    // create a string of the form a.b.c
	                    str = "";
	                    for (i = 0; i < NCH(n); i += 2) {
	                        str += CHILD(n, i).value + ".";
	                    }
	                    return new alias(strobj(str.substr(0, str.length - 1)), null);
	                }
	                break;
	            case TOK.T_STAR:
	                return new alias(strobj("*"), null);
	            default:
	                throw new Sk.builtin.SyntaxError("unexpected import name", c.c_filename, n.lineno);
	        }
	        break;
	    }
	}

	function astForImportStmt (c, n) {
	    /*
	     import_stmt: import_name | import_from
	     import_name: 'import' dotted_as_names
	     import_from: 'from' ('.'* dotted_name | '.') 'import'
	     ('*' | '(' import_as_names ')' | import_as_names)
	     */
	    var modname;
	    var idx;
	    var nchildren;
	    var ndots;
	    var mod;
	    var i;
	    var aliases;
	    var col_offset;
	    var lineno;
	    REQ(n, SYM.import_stmt);
	    lineno = n.lineno;
	    col_offset = n.col_offset;
	    n = CHILD(n, 0);
	    if (n.type === SYM.import_name) {
	        n = CHILD(n, 1);
	        REQ(n, SYM.dotted_as_names);
	        aliases = [];
	        for (i = 0; i < NCH(n); i += 2) {
	            aliases[i / 2] = aliasForImportName(c, CHILD(n, i));
	        }
	        return new Import_(aliases, lineno, col_offset);
	    }
	    else if (n.type === SYM.import_from) {
	        mod = null;
	        ndots = 0;

	        for (idx = 1; idx < NCH(n); ++idx) {
	            if (CHILD(n, idx).type === SYM.dotted_name) {
	                mod = aliasForImportName(c, CHILD(n, idx));
	                idx++;
	                break;
	            }
	            else if (CHILD(n, idx).type !== TOK.T_DOT) {
	                break;
	            }
	            ndots++;
	        }
	        ++idx; // skip the import keyword
	        switch (CHILD(n, idx).type) {
	            case TOK.T_STAR:
	                // from ... import
	                n = CHILD(n, idx);
	                nchildren = 1;
	                break;
	            case TOK.T_LPAR:
	                // from ... import (x, y, z)
	                n = CHILD(n, idx + 1);
	                nchildren = NCH(n);
	                break;
	            case SYM.import_as_names:
	                // from ... import x, y, z
	                n = CHILD(n, idx);
	                nchildren = NCH(n);
	                if (nchildren % 2 === 0) {
	                    throw new Sk.builtin.SyntaxError("trailing comma not allowed without surrounding parentheses", c.c_filename, n.lineno);
	                }
	                break;
	            default:
	                throw new Sk.builtin.SyntaxError("Unexpected node-type in from-import", c.c_filename, n.lineno);
	        }
	        aliases = [];
	        if (n.type === TOK.T_STAR) {
	            aliases[0] = aliasForImportName(c, n);
	        }
	        else {
	            for (i = 0; i < NCH(n); i += 2) {
	                aliases[i / 2] = aliasForImportName(c, CHILD(n, i));
	            }
	        }
	        modname = mod ? mod.name.v : "";
	        return new ImportFrom(strobj(modname), aliases, ndots, lineno, col_offset);
	    }
	    throw new Sk.builtin.SyntaxError("unknown import statement", c.c_filename, n.lineno);
	}

	function astForTestlistComp(c, n) {
	    /* testlist_comp: test ( comp_for | (',' test)* [','] ) */
	    /* argument: test [comp_for] */
	    goog.asserts.assert(n.type === SYM.testlist_comp || n.type === SYM.argument);
	    if (NCH(n) > 1 && CHILD(n, 1).type === SYM.comp_for) {
	        return astForGenExpr(c, n);
	    }
	    return astForTestlist(c, n);
	}

	function astForListcomp (c, n) {
	    /* listmaker: test ( list_for | (',' test)* [','] )
	     list_for: 'for' exprlist 'in' testlist_safe [list_iter]
	     list_iter: list_for | list_if
	     list_if: 'if' test [list_iter]
	     testlist_safe: test [(',' test)+ [',']]
	     */

	    function countListFors (c, n) {
	        var nfors = 0;
	        var ch = CHILD(n, 1);
	        count_list_for: while (true) {
	            nfors++;
	            REQ(ch, SYM.list_for);
	            if (NCH(ch) === 5) {
	                ch = CHILD(ch, 4);
	            }
	            else {
	                return nfors;
	            }
	            count_list_iter: while (true) {
	                REQ(ch, SYM.list_iter);
	                ch = CHILD(ch, 0);
	                if (ch.type === SYM.list_for) {
	                    continue count_list_for;
	                }
	                else if (ch.type === SYM.list_if) {
	                    if (NCH(ch) === 3) {
	                        ch = CHILD(ch, 2);
	                        continue count_list_iter;
	                    }
	                    else {
	                        return nfors;
	                    }
	                }
	                break;
	            }
	            break;
	        }
	    }

	    function countListIfs (c, n) {
	        var nifs = 0;
	        while (true) {
	            REQ(n, SYM.list_iter);
	            if (CHILD(n, 0).type === SYM.list_for) {
	                return nifs;
	            }
	            n = CHILD(n, 0);
	            REQ(n, SYM.list_if);
	            nifs++;
	            if (NCH(n) == 2) {
	                return nifs;
	            }
	            n = CHILD(n, 2);
	        }
	    }

	    var j;
	    var ifs;
	    var nifs;
	    var lc;
	    var expression;
	    var t;
	    var forch;
	    var i;
	    var ch;
	    var listcomps;
	    var nfors;
	    var elt;
	    REQ(n, SYM.listmaker);
	    goog.asserts.assert(NCH(n) > 1);
	    elt = astForExpr(c, CHILD(n, 0));
	    nfors = countListFors(c, n);
	    listcomps = [];
	    ch = CHILD(n, 1);
	    for (i = 0; i < nfors; ++i) {
	        REQ(ch, SYM.list_for);
	        forch = CHILD(ch, 1);
	        t = astForExprlist(c, forch, Store);
	        expression = astForTestlist(c, CHILD(ch, 3));
	        if (NCH(forch) === 1) {
	            lc = new comprehension(t[0], expression, []);
	        }
	        else {
	            lc = new comprehension(new Tuple(t, Store, ch.lineno, ch.col_offset), expression, []);
	        }

	        if (NCH(ch) === 5) {
	            ch = CHILD(ch, 4);
	            nifs = countListIfs(c, ch);
	            ifs = [];
	            for (j = 0; j < nifs; ++j) {
	                REQ(ch, SYM.list_iter);
	                ch = CHILD(ch, 0);
	                REQ(ch, SYM.list_if);
	                ifs[j] = astForExpr(c, CHILD(ch, 1));
	                if (NCH(ch) === 3) {
	                    ch = CHILD(ch, 2);
	                }
	            }
	            if (ch.type === SYM.list_iter) {
	                ch = CHILD(ch, 0);
	            }
	            lc.ifs = ifs;
	        }
	        listcomps[i] = lc;
	    }
	    return new ListComp(elt, listcomps, n.lineno, n.col_offset);
	}

	function astForFactor (c, n) {
	    /* some random peephole thing that cpy does */
	    var expression;
	    var pnum;
	    var patom;
	    var ppower;
	    var pfactor;
	    if (CHILD(n, 0).type === TOK.T_MINUS && NCH(n) === 2) {
	        pfactor = CHILD(n, 1);
	        if (pfactor.type === SYM.factor && NCH(pfactor) === 1) {
	            ppower = CHILD(pfactor, 0);
	            if (ppower.type === SYM.power && NCH(ppower) === 1) {
	                patom = CHILD(ppower, 0);
	                if (patom.type === SYM.atom) {
	                    pnum = CHILD(patom, 0);
	                    if (pnum.type === TOK.T_NUMBER) {
	                        pnum.value = "-" + pnum.value;
	                        return astForAtom(c, patom);
	                    }
	                }
	            }
	        }
	    }

	    expression = astForExpr(c, CHILD(n, 1));
	    switch (CHILD(n, 0).type) {
	        case TOK.T_PLUS:
	            return new UnaryOp(UAdd, expression, n.lineno, n.col_offset);
	        case TOK.T_MINUS:
	            return new UnaryOp(USub, expression, n.lineno, n.col_offset);
	        case TOK.T_TILDE:
	            return new UnaryOp(Invert, expression, n.lineno, n.col_offset);
	    }

	    goog.asserts.fail("unhandled factor");
	}

	function astForForStmt (c, n) {
	    /* for_stmt: 'for' exprlist 'in' testlist ':' suite ['else' ':' suite] */
	    var target;
	    var _target;
	    var nodeTarget;
	    var seq = [];
	    REQ(n, SYM.for_stmt);
	    if (NCH(n) === 9) {
	        seq = astForSuite(c, CHILD(n, 8));
	    }
	    nodeTarget = CHILD(n, 1);
	    _target = astForExprlist(c, nodeTarget, Store);
	    if (NCH(nodeTarget) === 1) {
	        target = _target[0];
	    }
	    else {
	        target = new Tuple(_target, Store, n.lineno, n.col_offset);
	    }

	    return new For_(target,
	        astForTestlist(c, CHILD(n, 3)),
	        astForSuite(c, CHILD(n, 5)),
	        seq, n.lineno, n.col_offset);
	}

	function astForCall (c, n, func) {
	    /*
	      arglist: (argument ',')* (argument [',']| '*' test [',' '**' test]
	               | '**' test)
	      argument: test [comp_for] | test '=' test       # Really [keyword '='] test
	    */
	    var tmp;
	    var k;
	    var key;
	    var e;
	    var kwarg;
	    var vararg;
	    var keywords;
	    var args;
	    var ch;
	    var i;
	    var ngens;
	    var nkeywords;
	    var nargs;

	    REQ(n, SYM.arglist);
	    nargs = 0;
	    nkeywords = 0;
	    ngens = 0;
	    for (i = 0; i < NCH(n); i++) {
	        ch = CHILD(n, i);
	        if (ch.type === SYM.argument) {
	            if (NCH(ch) === 1) {
	                nargs++;
	            }
	            else if (CHILD(ch, 1).type === SYM.comp_for) {
	                ngens++;
	            }
	            else {
	                nkeywords++;
	            }
	        }
	    }
	    if (ngens > 1 || (ngens && (nargs || nkeywords))) {
	        throw new Sk.builtin.SyntaxError("Generator expression must be parenthesized if not sole argument", c.c_filename, n.lineno);
	    }
	    if (nargs + nkeywords + ngens > 255) {
	        throw new Sk.builtin.SyntaxError("more than 255 arguments", c.c_filename, n.lineno);
	    }
	    args = [];
	    keywords = [];
	    nargs = 0;
	    nkeywords = 0;
	    vararg = null;
	    kwarg = null;
	    for (i = 0; i < NCH(n); i++) {
	        ch = CHILD(n, i);
	        if (ch.type === SYM.argument) {
	            if (NCH(ch) === 1) {
	                if (nkeywords) {
	                    throw new Sk.builtin.SyntaxError("non-keyword arg after keyword arg", c.c_filename, n.lineno);
	                }
	                if (vararg) {
	                    throw new Sk.builtin.SyntaxError("only named arguments may follow *expression", c.c_filename, n.lineno);
	                }
	                args[nargs++] = astForExpr(c, CHILD(ch, 0));
	            }
	            else if (CHILD(ch, 1).type === SYM.comp_for) {
	                args[nargs++] = astForGenExpr(c, ch);
	            }
	            else {
	                e = astForExpr(c, CHILD(ch, 0));
	                if (e.constructor === Lambda) {
	                    throw new Sk.builtin.SyntaxError("lambda cannot contain assignment", c.c_filename, n.lineno);
	                }
	                else if (e.constructor !== Name) {
	                    throw new Sk.builtin.SyntaxError("keyword can't be an expression", c.c_filename, n.lineno);
	                }
	                key = e.id;
	                forbiddenCheck(c, CHILD(ch, 0), key, n.lineno);
	                for (k = 0; k < nkeywords; ++k) {
	                    tmp = keywords[k].arg;
	                    if (tmp === key) {
	                        throw new Sk.builtin.SyntaxError("keyword argument repeated", c.c_filename, n.lineno);
	                    }
	                }
	                keywords[nkeywords++] = new keyword(key, astForExpr(c, CHILD(ch, 2)));
	            }
	        }
	        else if (ch.type === TOK.T_STAR) {
	            vararg = astForExpr(c, CHILD(n, ++i));
	        }
	        else if (ch.type === TOK.T_DOUBLESTAR) {
	            kwarg = astForExpr(c, CHILD(n, ++i));
	        }
	    }
	    return new Call(func, args, keywords, vararg, kwarg, func.lineno, func.col_offset);
	}

	function astForTrailer (c, n, leftExpr) {
	    /* trailer: '(' [arglist] ')' | '[' subscriptlist ']' | '.' NAME 
	     subscriptlist: subscript (',' subscript)* [',']
	     subscript: '.' '.' '.' | test | [test] ':' [test] [sliceop]
	     */
	    var e;
	    var elts;
	    var slc;
	    var j;
	    var slices;
	    var simple;
	    REQ(n, SYM.trailer);
	    if (CHILD(n, 0).type === TOK.T_LPAR) {
	        if (NCH(n) === 2) {
	            return new Call(leftExpr, [], [], null, null, n.lineno, n.col_offset);
	        }
	        else {
	            return astForCall(c, CHILD(n, 1), leftExpr);
	        }
	    }
	    else if (CHILD(n, 0).type === TOK.T_DOT) {
	        return new Attribute(leftExpr, strobj(CHILD(n, 1).value), Load, n.lineno, n.col_offset);
	    }
	    else {
	        REQ(CHILD(n, 0), TOK.T_LSQB);
	        REQ(CHILD(n, 2), TOK.T_RSQB);
	        n = CHILD(n, 1);
	        if (NCH(n) === 1) {
	            return new Subscript(leftExpr, astForSlice(c, CHILD(n, 0)), Load, n.lineno, n.col_offset);
	        }
	        else {
	            /* The grammar is ambiguous here. The ambiguity is resolved 
	             by treating the sequence as a tuple literal if there are
	             no slice features.
	             */
	            simple = true;
	            slices = [];
	            for (j = 0; j < NCH(n); j += 2) {
	                slc = astForSlice(c, CHILD(n, j));
	                if (slc.constructor !== Index) {
	                    simple = false;
	                }
	                slices[j / 2] = slc;
	            }
	            if (!simple) {
	                return new Subscript(leftExpr, new ExtSlice(slices), Load, n.lineno, n.col_offset);
	            }
	            elts = [];
	            for (j = 0; j < slices.length; ++j) {
	                slc = slices[j];
	                goog.asserts.assert(slc.constructor === Index && slc.value !== null && slc.value !== undefined);
	                elts[j] = slc.value;
	            }
	            e = new Tuple(elts, Load, n.lineno, n.col_offset);
	            return new Subscript(leftExpr, new Index(e), Load, n.lineno, n.col_offset);
	        }
	    }
	}

	function astForFlowStmt (c, n) {
	    /*
	     flow_stmt: break_stmt | continue_stmt | return_stmt | raise_stmt
	     | yield_stmt
	     break_stmt: 'break'
	     continue_stmt: 'continue'
	     return_stmt: 'return' [testlist]
	     yield_stmt: yield_expr
	     yield_expr: 'yield' testlist
	     raise_stmt: 'raise' [test [',' test [',' test]]]
	     */
	    var ch;
	    REQ(n, SYM.flow_stmt);
	    ch = CHILD(n, 0);
	    switch (ch.type) {
	        case SYM.break_stmt:
	            return new Break_(n.lineno, n.col_offset);
	        case SYM.continue_stmt:
	            return new Continue_(n.lineno, n.col_offset);
	        case SYM.yield_stmt:
	            return new Expr(astForExpr(c, CHILD(ch, 0)), n.lineno, n.col_offset);
	        case SYM.return_stmt:
	            if (NCH(ch) === 1) {
	                return new Return_(null, n.lineno, n.col_offset);
	            }
	            else {
	                return new Return_(astForTestlist(c, CHILD(ch, 1)), n.lineno, n.col_offset);
	            }
	            break;
	        case SYM.raise_stmt:
	            if (NCH(ch) === 1) {
	                return new Raise(null, null, null, n.lineno, n.col_offset);
	            }
	            else if (NCH(ch) === 2) {
	                return new Raise(astForExpr(c, CHILD(ch, 1)), null, null, n.lineno, n.col_offset);
	            }
	            else if (NCH(ch) === 4) {
	                return new Raise(
	                    astForExpr(c, CHILD(ch, 1)),
	                    astForExpr(c, CHILD(ch, 3)),
	                    null, n.lineno, n.col_offset);
	            }
	            else if (NCH(ch) === 6) {
	                return new Raise(
	                    astForExpr(c, CHILD(ch, 1)),
	                    astForExpr(c, CHILD(ch, 3)),
	                    astForExpr(c, CHILD(ch, 5)),
	                    n.lineno, n.col_offset);
	            }
	            break;
	        default:
	            goog.asserts.fail("unexpected flow_stmt");
	    }
	    goog.asserts.fail("unhandled flow statement");
	}

	function astForArguments (c, n) {
	    /* parameters: '(' [varargslist] ')'
	     varargslist: (fpdef ['=' test] ',')* ('*' NAME [',' '**' NAME]
	     | '**' NAME) | fpdef ['=' test] (',' fpdef ['=' test])* [',']
	     */
	    var parenthesized;
	    var id;
	    var complexArgs;
	    var k;
	    var j;
	    var i;
	    var foundDefault;
	    var defaults;
	    var args;
	    var ch;
	    var vararg = null;
	    var kwarg = null;
	    if (n.type === SYM.parameters) {
	        if (NCH(n) === 2) // () as arglist
	        {
	            return new arguments_([], null, null, []);
	        }
	        n = CHILD(n, 1);
	    }
	    REQ(n, SYM.varargslist);

	    args = [];
	    defaults = [];

	    /* fpdef: NAME | '(' fplist ')'
	     fplist: fpdef (',' fpdef)* [',']
	     */
	    foundDefault = false;
	    i = 0;
	    j = 0; // index for defaults
	    k = 0; // index for args
	    while (i < NCH(n)) {
	        ch = CHILD(n, i);
	        switch (ch.type) {
	            case SYM.fpdef:
	                complexArgs = 0;
	                parenthesized = 0;
	                handle_fpdef: while (true) {
	                    if (i + 1 < NCH(n) && CHILD(n, i + 1).type === TOK.T_EQUAL) {
	                        defaults[j++] = astForExpr(c, CHILD(n, i + 2));
	                        i += 2;
	                        foundDefault = true;
	                    }
	                    else if (foundDefault) {
	                        /* def f((x)=4): pass should raise an error.
	                         def f((x, (y))): pass will just incur the tuple unpacking warning. */
	                        if (parenthesized && !complexArgs) {
	                            throw new Sk.builtin.SyntaxError("parenthesized arg with default", c.c_filename, n.lineno);
	                        }
	                        throw new Sk.builtin.SyntaxError("non-default argument follows default argument", c.c_filename, n.lineno);
	                    }

	                    if (NCH(ch) === 3) {
	                        ch = CHILD(ch, 1);
	                        // def foo((x)): is not complex, special case.
	                        if (NCH(ch) !== 1) {
	                            throw new Sk.builtin.SyntaxError("tuple parameter unpacking has been removed", c.c_filename, n.lineno);
	                        }
	                        else {
	                            /* def foo((x)): setup for checking NAME below. */
	                            /* Loop because there can be many parens and tuple
	                             unpacking mixed in. */
	                            parenthesized = true;
	                            ch = CHILD(ch, 0);
	                            goog.asserts.assert(ch.type === SYM.fpdef);
	                            continue handle_fpdef;
	                        }
	                    }
	                    if (CHILD(ch, 0).type === TOK.T_NAME) {
	                        forbiddenCheck(c, n, CHILD(ch, 0).value, n.lineno);
	                        id = strobj(CHILD(ch, 0).value);
	                        args[k++] = new Name(id, Param, ch.lineno, ch.col_offset);
	                    }
	                    i += 2;
	                    if (parenthesized) {
	                        throw new Sk.builtin.SyntaxError("parenthesized argument names are invalid", c.c_filename, n.lineno);
	                    }
	                    break;
	                }
	                break;
	            case TOK.T_STAR:
	                forbiddenCheck(c, CHILD(n, i + 1), CHILD(n, i + 1).value, n.lineno);
	                vararg = strobj(CHILD(n, i + 1).value);
	                i += 3;
	                break;
	            case TOK.T_DOUBLESTAR:
	                forbiddenCheck(c, CHILD(n, i + 1), CHILD(n, i + 1).value, n.lineno);
	                kwarg = strobj(CHILD(n, i + 1).value);
	                i += 3;
	                break;
	            default:
	                goog.asserts.fail("unexpected node in varargslist");
	        }
	    }
	    return new arguments_(args, vararg, kwarg, defaults);
	}

	function astForFuncdef (c, n, decoratorSeq) {
	    /* funcdef: 'def' NAME parameters ':' suite */
	    var body;
	    var args;
	    var name;
	    REQ(n, SYM.funcdef);
	    name = strobj(CHILD(n, 1).value);
	    forbiddenCheck(c, CHILD(n, 1), CHILD(n, 1).value, n.lineno);
	    args = astForArguments(c, CHILD(n, 2));
	    body = astForSuite(c, CHILD(n, 4));
	    return new FunctionDef(name, args, body, decoratorSeq, n.lineno, n.col_offset);
	}

	function astForClassBases (c, n) {
	    /* testlist: test (',' test)* [','] */
	    goog.asserts.assert(NCH(n) > 0);
	    REQ(n, SYM.testlist);
	    if (NCH(n) === 1) {
	        return [ astForExpr(c, CHILD(n, 0)) ];
	    }
	    return seqForTestlist(c, n);
	}

	function astForClassdef (c, n, decoratorSeq) {
	    /* classdef: 'class' NAME ['(' testlist ')'] ':' suite */
	    var s;
	    var bases;
	    var classname;
	    REQ(n, SYM.classdef);
	    forbiddenCheck(c, n, CHILD(n, 1).value, n.lineno);
	    classname = strobj(CHILD(n, 1).value);
	    if (NCH(n) === 4) {
	        return new ClassDef(classname, [], astForSuite(c, CHILD(n, 3)), decoratorSeq, n.lineno, n.col_offset);
	    }
	    if (CHILD(n, 3).type === TOK.T_RPAR) {
	        return new ClassDef(classname, [], astForSuite(c, CHILD(n, 5)), decoratorSeq, n.lineno, n.col_offset);
	    }

	    bases = astForClassBases(c, CHILD(n, 3));
	    s = astForSuite(c, CHILD(n, 6));
	    return new ClassDef(classname, bases, s, decoratorSeq, n.lineno, n.col_offset);
	}

	function astForLambdef (c, n) {
	    /* lambdef: 'lambda' [varargslist] ':' test */
	    var args;
	    var expression;
	    if (NCH(n) === 3) {
	        args = new arguments_([], null, null, []);
	        expression = astForExpr(c, CHILD(n, 2));
	    }
	    else {
	        args = astForArguments(c, CHILD(n, 1));
	        expression = astForExpr(c, CHILD(n, 3));
	    }
	    return new Lambda(args, expression, n.lineno, n.col_offset);
	}

	function astForComprehension(c, n) {
	    /* testlist_comp: test ( comp_for | (',' test)* [','] )
	       argument: test [comp_for] | test '=' test       # Really [keyword '='] test */
	    
	    var j;
	    var ifs;
	    var nifs;
	    var ge;
	    var expression;
	    var t;
	    var forch;
	    var i;
	    var ch;
	    var genexps;
	    var nfors;
	    var elt;
	    var comps;
	    var comp;

	    function countCompFors(c, n) {
	        var nfors = 0;
	        count_comp_for: while (true) {
	            nfors++;
	            REQ(n, SYM.comp_for);
	            if (NCH(n) === 5) {
	                n = CHILD(n, 4);
	            } else {
	                return nfors;
	            }
	            count_comp_iter: while (true) {
	                REQ(n, SYM.comp_iter);
	                n = CHILD(n, 0);
	                if (n.type === SYM.comp_for) {
	                    continue count_comp_for;
	                } else if (n.type === SYM.comp_if) {
	                    if (NCH(n) === 3) {
	                        n = CHILD(n, 2);
	                        continue count_comp_iter;
	                    } else {
	                        return nfors;
	                    }
	                }
	                break;
	            }
	            break;
	        }
	        goog.asserts.fail("logic error in countCompFors");
	    }

	    function countCompIfs(c, n) {
	        var nifs = 0;
	        while (true) {
	            REQ(n, SYM.comp_iter);
	            if (CHILD(n, 0).type === SYM.comp_for) {
	                return nifs;
	            }
	            n = CHILD(n, 0);
	            REQ(n, SYM.comp_if);
	            nifs++;
	            if (NCH(n) == 2) {
	                return nifs;
	            }
	            n = CHILD(n, 2);
	        }
	    }

	    nfors = countCompFors(c, n);
	    comps = [];
	    for (i = 0; i < nfors; ++i) {
	        REQ(n, SYM.comp_for);
	        forch = CHILD(n, 1);
	        t = astForExprlist(c, forch, Store);
	        expression = astForExpr(c, CHILD(n, 3));
	        if (NCH(forch) === 1) {
	            comp = new comprehension(t[0], expression, []);
	        } else {
	            comp = new comprehension(new Tuple(t, Store, n.lineno, n.col_offset), expression, []);
	        }
	        if (NCH(n) === 5) {
	            n = CHILD(n, 4);
	            nifs = countCompIfs(c, n);
	            ifs = [];
	            for (j = 0; j < nifs; ++j) {
	                REQ(n, SYM.comp_iter);
	                n = CHILD(n, 0);
	                REQ(n, SYM.comp_if);
	                expression = astForExpr(c, CHILD(n, 1));
	                ifs[j] = expression;
	                if (NCH(n) === 3) {
	                    n = CHILD(n, 2);
	                }
	            }
	            if (n.type === SYM.comp_iter) {
	                n = CHILD(n, 0);
	            }
	            comp.ifs = ifs;
	        }
	        comps[i] = comp;
	    }
	    return comps;
	}

	function astForIterComp(c, n, type) {
	    var elt, comps;
	    goog.asserts.assert(NCH(n) > 1);
	    elt = astForExpr(c, CHILD(n, 0));
	    comps = astForComprehension(c, CHILD(n, 1));
	    if (type === COMP_GENEXP) {
	        return new GeneratorExp(elt, comps, n.lineno, n.col_offset);
	    } else if (type === COMP_SETCOMP) {
	        return new SetComp(elt, comps, n.lineno, n.col_offset);
	    }
	}

	function astForDictComp(c, n) {
	    var key, value;
	    var comps = [];
	    goog.asserts.assert(NCH(n) > 3);
	    REQ(CHILD(n, 1), TOK.T_COLON);
	    key = astForExpr(c, CHILD(n, 0));
	    value = astForExpr(c, CHILD(n, 2));
	    comps = astForComprehension(c, CHILD(n, 3));
	    return new DictComp(key, value, comps, n.lineno, n.col_offset);
	}

	function astForGenExpr(c, n) {
	    goog.asserts.assert(n.type === SYM.testlist_comp || n.type === SYM.argument);
	    return astForIterComp(c, n, COMP_GENEXP);
	}

	function astForSetComp(c, n) {
	    goog.asserts.assert(n.type === SYM.dictorsetmaker);
	    return astForIterComp(c, n, COMP_SETCOMP);
	}

	function astForWhileStmt (c, n) {
	    /* while_stmt: 'while' test ':' suite ['else' ':' suite] */
	    REQ(n, SYM.while_stmt);
	    if (NCH(n) === 4) {
	        return new While_(astForExpr(c, CHILD(n, 1)), astForSuite(c, CHILD(n, 3)), [], n.lineno, n.col_offset);
	    }
	    else if (NCH(n) === 7) {
	        return new While_(astForExpr(c, CHILD(n, 1)), astForSuite(c, CHILD(n, 3)), astForSuite(c, CHILD(n, 6)), n.lineno, n.col_offset);
	    }
	    goog.asserts.fail("wrong number of tokens for 'while' stmt");
	}

	function astForAugassign (c, n) {
	    REQ(n, SYM.augassign);
	    n = CHILD(n, 0);
	    switch (n.value.charAt(0)) {
	        case "+":
	            return Add;
	        case "-":
	            return Sub;
	        case "/":
	            if (n.value.charAt(1) === "/") {
	                return FloorDiv;
	            }
	            return Div;
	        case "%":
	            return Mod;
	        case "<":
	            return LShift;
	        case ">":
	            return RShift;
	        case "&":
	            return BitAnd;
	        case "^":
	            return BitXor;
	        case "|":
	            return BitOr;
	        case "*":
	            if (n.value.charAt(1) === "*") {
	                return Pow;
	            }
	            return Mult;
	        default:
	            goog.asserts.fail("invalid augassign");
	    }
	}

	function astForBinop (c, n) {
	    /* Must account for a sequence of expressions.
	     How should A op B op C by represented?
	     BinOp(BinOp(A, op, B), op, C).
	     */
	    var tmp;
	    var newoperator;
	    var nextOper;
	    var i;
	    var result = new BinOp(
	        astForExpr(c, CHILD(n, 0)),
	        getOperator(CHILD(n, 1)),
	        astForExpr(c, CHILD(n, 2)),
	        n.lineno, n.col_offset);
	    var nops = (NCH(n) - 1) / 2;
	    for (i = 1; i < nops; ++i) {
	        nextOper = CHILD(n, i * 2 + 1);
	        newoperator = getOperator(nextOper);
	        tmp = astForExpr(c, CHILD(n, i * 2 + 2));
	        result = new BinOp(result, newoperator, tmp, nextOper.lineno, nextOper.col_offset);
	    }
	    return result;

	}


	function astForTestlist(c, n) {
	    /* this doesn't show up in Grammar.txt never did: testlist_gexp: test (',' test)* [','] */
	    /* testlist_comp: test (',' test)* [','] */
	    /* testlist: test (',' test)* [','] */
	    /* testlist_safe: test (',' test)+ [','] */
	    /* testlist1: test (',' test)* */
	    goog.asserts.assert(NCH(n) > 0);
	    if (n.type === SYM.testlist_comp) {
	        if (NCH(n) > 1) {
	            goog.asserts.assert(CHILD(n, 1).type !== SYM.comp_for);
	        }
	    }
	    else {
	        goog.asserts.assert(n.type === SYM.testlist || n.type === SYM.testlist_safe || n.type === SYM.testlist1);
	    }

	    if (NCH(n) === 1) {
	        return astForExpr(c, CHILD(n, 0));
	    }
	    else {
	        return new Tuple(seqForTestlist(c, n), Load, n.lineno, n.col_offset);
	    }

	}

	function astForExprStmt (c, n) {
	    var expression;
	    var value;
	    var e;
	    var i;
	    var targets;
	    var expr2;
	    var varName;
	    var expr1;
	    var ch;
	    REQ(n, SYM.expr_stmt);
	    /* expr_stmt: testlist (augassign (yield_expr|testlist) 
	     | ('=' (yield_expr|testlist))*)
	     testlist: test (',' test)* [',']
	     augassign: '+=' | '-=' | '*=' | '/=' | '%=' | '&=' | '|=' | '^='
	     | '<<=' | '>>=' | '**=' | '//='
	     test: ... here starts the operator precendence dance
	     */
	    if (NCH(n) === 1) {
	        return new Expr(astForTestlist(c, CHILD(n, 0)), n.lineno, n.col_offset);
	    }
	    else if (CHILD(n, 1).type === SYM.augassign) {
	        ch = CHILD(n, 0);
	        expr1 = astForTestlist(c, ch);
	        switch (expr1.constructor) {
	            case GeneratorExp:
	                throw new Sk.builtin.SyntaxError("augmented assignment to generator expression not possible", c.c_filename, n.lineno);
	            case Yield:
	                throw new Sk.builtin.SyntaxError("augmented assignment to yield expression not possible", c.c_filename, n.lineno);
	            case Name:
	                varName = expr1.id;
	                forbiddenCheck(c, ch, varName, n.lineno);
	                break;
	            case Attribute:
	            case Subscript:
	                break;
	            default:
	                throw new Sk.builtin.SyntaxError("illegal expression for augmented assignment", c.c_filename, n.lineno);
	        }
	        setContext(c, expr1, Store, ch);

	        ch = CHILD(n, 2);
	        if (ch.type === SYM.testlist) {
	            expr2 = astForTestlist(c, ch);
	        }
	        else {
	            expr2 = astForExpr(c, ch);
	        }

	        return new AugAssign(expr1, astForAugassign(c, CHILD(n, 1)), expr2, n.lineno, n.col_offset);
	    }
	    else {
	        // normal assignment
	        REQ(CHILD(n, 1), TOK.T_EQUAL);
	        targets = [];
	        for (i = 0; i < NCH(n) - 2; i += 2) {
	            ch = CHILD(n, i);
	            if (ch.type === SYM.yield_expr) {
	                throw new Sk.builtin.SyntaxError("assignment to yield expression not possible", c.c_filename, n.lineno);
	            }
	            e = astForTestlist(c, ch);
	            setContext(c, e, Store, CHILD(n, i));
	            targets[i / 2] = e;
	        }
	        value = CHILD(n, NCH(n) - 1);
	        if (value.type === SYM.testlist) {
	            expression = astForTestlist(c, value);
	        }
	        else {
	            expression = astForExpr(c, value);
	        }
	        return new Assign(targets, expression, n.lineno, n.col_offset);
	    }
	}

	function astForIfexpr (c, n) {
	    /* test: or_test 'if' or_test 'else' test */
	    goog.asserts.assert(NCH(n) === 5);
	    return new IfExp(
	        astForExpr(c, CHILD(n, 2)),
	        astForExpr(c, CHILD(n, 0)),
	        astForExpr(c, CHILD(n, 4)),
	        n.lineno, n.col_offset);
	}

	/**
	 * s is a python-style string literal, including quote characters and u/r/b
	 * prefixes. Returns decoded string object.
	 */
	function parsestr (c, s) {
	    var encodeUtf8 = function (s) {
	        return unescape(encodeURIComponent(s));
	    };
	    var decodeUtf8 = function (s) {
	        return decodeURIComponent(escape(s));
	    };
	    var decodeEscape = function (s, quote) {
	        var d3;
	        var d2;
	        var d1;
	        var d0;
	        var c;
	        var i;
	        var len = s.length;
	        var ret = "";
	        for (i = 0; i < len; ++i) {
	            c = s.charAt(i);
	            if (c === "\\") {
	                ++i;
	                c = s.charAt(i);
	                if (c === "n") {
	                    ret += "\n";
	                }
	                else if (c === "\\") {
	                    ret += "\\";
	                }
	                else if (c === "t") {
	                    ret += "\t";
	                }
	                else if (c === "r") {
	                    ret += "\r";
	                }
	                else if (c === "b") {
	                    ret += "\b";
	                }
	                else if (c === "f") {
	                    ret += "\f";
	                }
	                else if (c === "v") {
	                    ret += "\v";
	                }
	                else if (c === "0") {
	                    ret += "\0";
	                }
	                else if (c === '"') {
	                    ret += '"';
	                }
	                else if (c === '\'') {
	                    ret += '\'';
	                }
	                else if (c === "\n") /* escaped newline, join lines */ {
	                }
	                else if (c === "x") {
	                    d0 = s.charAt(++i);
	                    d1 = s.charAt(++i);
	                    ret += String.fromCharCode(parseInt(d0 + d1, 16));
	                }
	                else if (c === "u" || c === "U") {
	                    d0 = s.charAt(++i);
	                    d1 = s.charAt(++i);
	                    d2 = s.charAt(++i);
	                    d3 = s.charAt(++i);
	                    ret += String.fromCharCode(parseInt(d0 + d1, 16), parseInt(d2 + d3, 16));
	                }
	                else {
	                    // Leave it alone
	                    ret += "\\" + c;
	                    // goog.asserts.fail("unhandled escape: '" + c.charCodeAt(0) + "'");
	                }
	            }
	            else {
	                ret += c;
	            }
	        }
	        return ret;
	    };

	    //print("parsestr", s);

	    var quote = s.charAt(0);
	    var rawmode = false;
	    var unicode = false;

	    // treats every sequence as unicodes even if they are not treated with uU prefix
	    // kinda hacking though working for most purposes
	    if((c.c_flags & Parser.CO_FUTURE_UNICODE_LITERALS || Sk.python3 === true)) {
	        unicode = true;
	    }

	    if (quote === "u" || quote === "U") {
	        s = s.substr(1);
	        quote = s.charAt(0);
	        unicode = true;
	    }
	    else if (quote === "r" || quote === "R") {
	        s = s.substr(1);
	        quote = s.charAt(0);
	        rawmode = true;
	    }
	    goog.asserts.assert(quote !== "b" && quote !== "B", "todo; haven't done b'' strings yet");

	    goog.asserts.assert(quote === "'" || quote === '"' && s.charAt(s.length - 1) === quote);
	    s = s.substr(1, s.length - 2);
	    if (unicode) {
	        s = encodeUtf8(s);
	    }

	    if (s.length >= 4 && s.charAt(0) === quote && s.charAt(1) === quote) {
	        goog.asserts.assert(s.charAt(s.length - 1) === quote && s.charAt(s.length - 2) === quote);
	        s = s.substr(2, s.length - 4);
	    }

	    if (rawmode || s.indexOf("\\") === -1) {
	        return strobj(decodeUtf8(s));
	    }
	    return strobj(decodeEscape(s, quote));
	}

	function parsestrplus (c, n) {
	    var i;
	    var ret;
	    REQ(CHILD(n, 0), TOK.T_STRING);
	    ret = new Sk.builtin.str("");
	    for (i = 0; i < NCH(n); ++i) {
	        try {
	            ret = ret.sq$concat(parsestr(c, CHILD(n, i).value));
	        } catch (x) {
	            throw new Sk.builtin.SyntaxError("invalid string (possibly contains a unicode character)", c.c_filename, CHILD(n, i).lineno);
	        }
	    }
	    return ret;
	}

	function parsenumber (c, s, lineno) {
	    var neg;
	    var val;
	    var tmp;
	    var end = s.charAt(s.length - 1);

	    // call internal complex type constructor for complex strings
	    if (end === "j" || end === "J") {
	        return Sk.builtin.complex.complex_subtype_from_string(s);
	    }

	    // Handle longs
	    if (end === "l" || end === "L") {
	        return Sk.longFromStr(s.substr(0, s.length - 1), 0);
	    }

	    // todo; we don't currently distinguish between int and float so
	    // str is wrong for these.
	    if (s.indexOf(".") !== -1) {
	        return new Sk.builtin.float_(parseFloat(s));
	    }

	    // Handle integers of various bases
	    tmp = s;
	    neg = false;
	    if (s.charAt(0) === "-") {
	        tmp = s.substr(1);
	        neg = true;
	    }

	    if (tmp.charAt(0) === "0" && (tmp.charAt(1) === "x" || tmp.charAt(1) === "X")) {
	        // Hex
	        tmp = tmp.substring(2);
	        val = parseInt(tmp, 16);
	    } else if ((s.indexOf("e") !== -1) || (s.indexOf("E") !== -1)) {
	        // Float with exponent (needed to make sure e/E wasn't hex first)
	        return new Sk.builtin.float_(parseFloat(s));
	    } else if (tmp.charAt(0) === "0" && (tmp.charAt(1) === "b" || tmp.charAt(1) === "B")) {
	        // Binary
	        tmp = tmp.substring(2);
	        val = parseInt(tmp, 2);
	    } else if (tmp.charAt(0) === "0") {
	        if (tmp === "0") {
	            // Zero
	            val = 0;
	        } else {
	            // Octal
	            tmp = tmp.substring(1);
	            if ((tmp.charAt(0) === "o") || (tmp.charAt(0) === "O")) {
	                tmp = tmp.substring(1);
	            }
	            val = parseInt(tmp, 8);
	        }
	    }
	    else {
	        // Decimal
	        val = parseInt(tmp, 10);
	    }

	    // Convert to long
	    if (val > Sk.builtin.int_.threshold$ &&
	        Math.floor(val) === val &&
	        (s.indexOf("e") === -1 && s.indexOf("E") === -1)) {
	        return Sk.longFromStr(s, 0);
	    }

	    // Small enough, return parsed number
	    if (neg) {
	        return new Sk.builtin.int_(-val);
	    } else {
	        return new Sk.builtin.int_(val);
	    }
	}

	function astForSlice (c, n) {
	    var n2;
	    var step;
	    var upper;
	    var lower;
	    var ch;
	    REQ(n, SYM.subscript);

	    /*
	     subscript: '.' '.' '.' | test | [test] ':' [test] [sliceop]
	     sliceop: ':' [test]
	     */
	    ch = CHILD(n, 0);
	    lower = null;
	    upper = null;
	    step = null;
	    if (ch.type === TOK.T_DOT) {
	        return new Ellipsis();
	    }
	    if (NCH(n) === 1 && ch.type === SYM.test) {
	        return new Index(astForExpr(c, ch));
	    }
	    if (ch.type === SYM.test) {
	        lower = astForExpr(c, ch);
	    }
	    if (ch.type === TOK.T_COLON) {
	        if (NCH(n) > 1) {
	            n2 = CHILD(n, 1);
	            if (n2.type === SYM.test) {
	                upper = astForExpr(c, n2);
	            }
	        }
	    }
	    else if (NCH(n) > 2) {
	        n2 = CHILD(n, 2);
	        if (n2.type === SYM.test) {
	            upper = astForExpr(c, n2);
	        }
	    }

	    ch = CHILD(n, NCH(n) - 1);
	    if (ch.type === SYM.sliceop) {
	        if (NCH(ch) === 1) {
	            ch = CHILD(ch, 0);
	            step = new Name(strobj("None"), Load, ch.lineno, ch.col_offset);
	        }
	        else {
	            ch = CHILD(ch, 1);
	            if (ch.type === SYM.test) {
	                step = astForExpr(c, ch);
	            }
	        }
	    }
	    return new Slice(lower, upper, step);
	}

	function astForAtom(c, n) {
	    /* atom: ('(' [yield_expr|testlist_comp] ')' |
	       '[' [listmaker] ']' |
	       '{' [dictorsetmaker] '}' |
	       '`' testlist1 '`' |
	       NAME | NUMBER | STRING+)
	    */
	    var i;
	    var values;
	    var keys;
	    var size;
	    var ch = CHILD(n, 0);
	    var elts;
	    switch (ch.type) {
	        case TOK.T_NAME:
	            // All names start in Load context, but may be changed later
	            return new Name(strobj(ch.value), Load, n.lineno, n.col_offset);
	        case TOK.T_STRING:
	            return new Str(parsestrplus(c, n), n.lineno, n.col_offset);
	        case TOK.T_NUMBER:
	            return new Num(parsenumber(c, ch.value, n.lineno), n.lineno, n.col_offset);
	        case TOK.T_LPAR: // various uses for parens
	            ch = CHILD(n, 1);
	            if (ch.type === TOK.T_RPAR) {
	                return new Tuple([], Load, n.lineno, n.col_offset);
	            }
	            if (ch.type === SYM.yield_expr) {
	                return astForExpr(c, ch);
	            }
	            //            if (NCH(ch) > 1 && CHILD(ch, 1).type === SYM.comp_for) {
	            //                return astForComprehension(c, ch);
	            //            }
	            return astForTestlistComp(c, ch);
	        case TOK.T_LSQB: // list or listcomp
	            ch = CHILD(n, 1);
	            if (ch.type === TOK.T_RSQB) {
	                return new List([], Load, n.lineno, n.col_offset);
	            }
	            REQ(ch, SYM.listmaker);
	            if (NCH(ch) === 1 || CHILD(ch, 1).type === TOK.T_COMMA) {
	                return new List(seqForTestlist(c, ch), Load, n.lineno, n.col_offset);
	            } 
	            return astForListcomp(c, ch);
	            
	        case TOK.T_LBRACE:
	            /* dictorsetmaker: 
	             *     (test ':' test (comp_for : (',' test ':' test)* [','])) |
	             *     (test (comp_for | (',' test)* [',']))
	             */
	            keys = [];
	            values = [];
	            ch = CHILD(n, 1);
	            if (n.type === TOK.T_RBRACE) {
	                //it's an empty dict
	                return new Dict([], null, n.lineno, n.col_offset);
	            } 
	            else if (NCH(ch) === 1 || (NCH(ch) !== 0 && CHILD(ch, 1).type === TOK.T_COMMA)) {
	                //it's a simple set
	                elts = [];
	                size = Math.floor((NCH(ch) + 1) / 2);
	                for (i = 0; i < NCH(ch); i += 2) {
	                    var expression = astForExpr(c, CHILD(ch, i));
	                    elts[i / 2] = expression;
	                }
	                return new Set(elts, n.lineno, n.col_offset);
	            } 
	            else if (NCH(ch) !== 0 && CHILD(ch, 1).type == SYM.comp_for) {
	                //it's a set comprehension
	                return astForSetComp(c, ch);
	            } 
	            else if (NCH(ch) > 3 && CHILD(ch, 3).type === SYM.comp_for) {
	                //it's a dict compr. I think.
	                return astForDictComp(c, ch);
	            } 
	            else {
	                size = Math.floor((NCH(ch) + 1) / 4); // + 1 for no trailing comma case
	                for (i = 0; i < NCH(ch); i += 4) {
	                    keys[i / 4] = astForExpr(c, CHILD(ch, i));
	                    values[i / 4] = astForExpr(c, CHILD(ch, i + 2));
	                }
	                return new Dict(keys, values, n.lineno, n.col_offset);
	            }
	        case TOK.T_BACKQUOTE:
	            //throw new Sk.builtin.SyntaxError("backquote not supported, use repr()", c.c_filename, n.lineno);
	            return new Repr(astForTestlist(c, CHILD(n, 1)), n.lineno, n.col_offset);
	        default:
	            goog.asserts.fail("unhandled atom", ch.type);

	    }
	}

	function astForPower (c, n) {
	    /* power: atom trailer* ('**' factor)*
	     */
	    var f;
	    var tmp;
	    var ch;
	    var i;
	    var e;
	    REQ(n, SYM.power);
	    e = astForAtom(c, CHILD(n, 0));
	    if (NCH(n) === 1) {
	        return e;
	    }
	    for (i = 1; i < NCH(n); ++i) {
	        ch = CHILD(n, i);
	        if (ch.type !== SYM.trailer) {
	            break;
	        }
	        tmp = astForTrailer(c, ch, e);
	        tmp.lineno = e.lineno;
	        tmp.col_offset = e.col_offset;
	        e = tmp;
	    }
	    if (CHILD(n, NCH(n) - 1).type === SYM.factor) {
	        f = astForExpr(c, CHILD(n, NCH(n) - 1));
	        e = new BinOp(e, Pow, f, n.lineno, n.col_offset);
	    }
	    return e;
	}

	function astForExpr (c, n) {
	    /* handle the full range of simple expressions
	     test: or_test ['if' or_test 'else' test] | lambdef
	     or_test: and_test ('or' and_test)*
	     and_test: not_test ('and' not_test)*
	     not_test: 'not' not_test | comparison
	     comparison: expr (comp_op expr)*
	     expr: xor_expr ('|' xor_expr)*
	     xor_expr: and_expr ('^' and_expr)*
	     and_expr: shift_expr ('&' shift_expr)*
	     shift_expr: arith_expr (('<<'|'>>') arith_expr)*
	     arith_expr: term (('+'|'-') term)*
	     term: factor (('*'|'/'|'%'|'//') factor)*
	     factor: ('+'|'-'|'~') factor | power
	     power: atom trailer* ('**' factor)*

	     As well as modified versions that exist for backward compatibility,
	     to explicitly allow:
	     [ x for x in lambda: 0, lambda: 1 ]
	     (which would be ambiguous without these extra rules)

	     old_test: or_test | old_lambdef
	     old_lambdef: 'lambda' [vararglist] ':' old_test

	     */

	    var exp;
	    var cmps;
	    var ops;
	    var i;
	    var seq;
	    LOOP: while (true) {
	        switch (n.type) {
	            case SYM.test:
	            case SYM.old_test:
	                if (CHILD(n, 0).type === SYM.lambdef || CHILD(n, 0).type === SYM.old_lambdef) {
	                    return astForLambdef(c, CHILD(n, 0));
	                }
	                else if (NCH(n) > 1) {
	                    return astForIfexpr(c, n);
	                }
	            // fallthrough
	            case SYM.or_test:
	            case SYM.and_test:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue LOOP;
	                }
	                seq = [];
	                for (i = 0; i < NCH(n); i += 2) {
	                    seq[i / 2] = astForExpr(c, CHILD(n, i));
	                }
	                if (CHILD(n, 1).value === "and") {
	                    return new BoolOp(And, seq, n.lineno, n.col_offset);
	                }
	                goog.asserts.assert(CHILD(n, 1).value === "or");
	                return new BoolOp(Or, seq, n.lineno, n.col_offset);
	            case SYM.not_test:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue LOOP;
	                }
	                else {
	                    return new UnaryOp(Not, astForExpr(c, CHILD(n, 1)), n.lineno, n.col_offset);
	                }
	                break;
	            case SYM.comparison:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue LOOP;
	                }
	                else {
	                    ops = [];
	                    cmps = [];
	                    for (i = 1; i < NCH(n); i += 2) {
	                        ops[(i - 1) / 2] = astForCompOp(c, CHILD(n, i));
	                        cmps[(i - 1) / 2] = astForExpr(c, CHILD(n, i + 1));
	                    }
	                    return new Compare(astForExpr(c, CHILD(n, 0)), ops, cmps, n.lineno, n.col_offset);
	                }
	                break;
	            case SYM.expr:
	            case SYM.xor_expr:
	            case SYM.and_expr:
	            case SYM.shift_expr:
	            case SYM.arith_expr:
	            case SYM.term:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue LOOP;
	                }
	                return astForBinop(c, n);
	            case SYM.yield_expr:
	                exp = null;
	                if (NCH(n) === 2) {
	                    exp = astForTestlist(c, CHILD(n, 1));
	                }
	                return new Yield(exp, n.lineno, n.col_offset);
	            case SYM.factor:
	                if (NCH(n) === 1) {
	                    n = CHILD(n, 0);
	                    continue LOOP;
	                }
	                return astForFactor(c, n);
	            case SYM.power:
	                return astForPower(c, n);
	            default:
	                goog.asserts.fail("unhandled expr", "n.type: %d", n.type);
	        }
	        break;
	    }
	}

	function astForPrintStmt (c, n) {
	    /* print_stmt: 'print' ( [ test (',' test)* [','] ]
	     | '>>' test [ (',' test)+ [','] ] )
	     */
	    var nl;
	    var i, j;
	    var seq;
	    var start = 1;
	    var dest = null;
	    REQ(n, SYM.print_stmt);
	    if (NCH(n) >= 2 && CHILD(n, 1).type === TOK.T_RIGHTSHIFT) {
	        dest = astForExpr(c, CHILD(n, 2));
	        start = 4;
	    }
	    seq = [];
	    for (i = start, j = 0; i < NCH(n); i += 2, ++j) {
	        seq[j] = astForExpr(c, CHILD(n, i));
	    }
	    nl = (CHILD(n, NCH(n) - 1)).type === TOK.T_COMMA ? false : true;
	    return new Print(dest, seq, nl, n.lineno, n.col_offset);
	}

	function astForStmt (c, n) {
	    var ch;
	    if (n.type === SYM.stmt) {
	        goog.asserts.assert(NCH(n) === 1);
	        n = CHILD(n, 0);
	    }
	    if (n.type === SYM.simple_stmt) {
	        goog.asserts.assert(numStmts(n) === 1);
	        n = CHILD(n, 0);
	    }
	    if (n.type === SYM.small_stmt) {
	        REQ(n, SYM.small_stmt);
	        n = CHILD(n, 0);
	        /* small_stmt: expr_stmt | print_stmt  | del_stmt | pass_stmt
	         | flow_stmt | import_stmt | global_stmt | exec_stmt
	         | assert_stmt
	         */
	        switch (n.type) {
	            case SYM.expr_stmt:
	                return astForExprStmt(c, n);
	            case SYM.print_stmt:
	                return astForPrintStmt(c, n);
	            case SYM.del_stmt:
	                return astForDelStmt(c, n);
	            case SYM.pass_stmt:
	                return new Pass(n.lineno, n.col_offset);
	            case SYM.flow_stmt:
	                return astForFlowStmt(c, n);
	            case SYM.import_stmt:
	                return astForImportStmt(c, n);
	            case SYM.global_stmt:
	                return astForGlobalStmt(c, n);
	            case SYM.exec_stmt:
	                return astForExecStmt(c, n);
	            case SYM.assert_stmt:
	                return astForAssertStmt(c, n);
	            case SYM.debugger_stmt:
	                return new Debugger_(n.lineno, n.col_offset);
	            default:
	                goog.asserts.fail("unhandled small_stmt");
	        }
	    }
	    else {
	        /* compound_stmt: if_stmt | while_stmt | for_stmt | try_stmt
	         | funcdef | classdef | decorated
	         */
	        ch = CHILD(n, 0);
	        REQ(n, SYM.compound_stmt);
	        switch (ch.type) {
	            case SYM.if_stmt:
	                return astForIfStmt(c, ch);
	            case SYM.while_stmt:
	                return astForWhileStmt(c, ch);
	            case SYM.for_stmt:
	                return astForForStmt(c, ch);
	            case SYM.try_stmt:
	                return astForTryStmt(c, ch);
	            case SYM.with_stmt:
	                return astForWithStmt(c, ch);
	            case SYM.funcdef:
	                return astForFuncdef(c, ch, []);
	            case SYM.classdef:
	                return astForClassdef(c, ch, []);
	            case SYM.decorated:
	                return astForDecorated(c, ch);
	            default:
	                goog.asserts.assert("unhandled compound_stmt");
	        }
	    }
	}

	Sk.astFromParse = function (n, filename, c_flags) {
	    var j;
	    var num;
	    var ch;
	    var i;
	    var c = new Compiling("utf-8", filename, c_flags);
	    var stmts = [];
	    var k = 0;
	    switch (n.type) {
	        case SYM.file_input:
	            for (i = 0; i < NCH(n) - 1; ++i) {
	                ch = CHILD(n, i);
	                if (n.type === TOK.T_NEWLINE) {
	                    continue;
	                }
	                REQ(ch, SYM.stmt);
	                num = numStmts(ch);
	                if (num === 1) {
	                    stmts[k++] = astForStmt(c, ch);
	                }
	                else {
	                    ch = CHILD(ch, 0);
	                    REQ(ch, SYM.simple_stmt);
	                    for (j = 0; j < num; ++j) {
	                        stmts[k++] = astForStmt(c, CHILD(ch, j * 2));
	                    }
	                }
	            }
	            return new Module(stmts);
	        case SYM.eval_input:
	            goog.asserts.fail("todo;");
	        case SYM.single_input:
	            goog.asserts.fail("todo;");
	        default:
	            goog.asserts.fail("todo;");
	    }
	};

	Sk.astDump = function (node) {
	    var spaces = function (n) // todo; blurgh
	    {
	        var i;
	        var ret = "";
	        for (i = 0; i < n; ++i) {
	            ret += " ";
	        }
	        return ret;
	    };

	    var _format = function (node, indent) {
	        var ret;
	        var elemsstr;
	        var x;
	        var elems;
	        var fieldstr;
	        var field;
	        var attrs;
	        var fieldlen;
	        var b;
	        var a;
	        var i;
	        var fields;
	        var namelen;
	        if (node === null) {
	            return indent + "None";
	        }
	        else if (node.prototype && node.prototype._astname !== undefined && node.prototype._isenum) {
	            return indent + node.prototype._astname + "()";
	        }
	        else if (node._astname !== undefined) {
	            namelen = spaces(node._astname.length + 1);
	            fields = [];
	            for (i = 0; i < node._fields.length; i += 2) // iter_fields
	            {
	                a = node._fields[i]; // field name
	                b = node._fields[i + 1](node); // field getter func
	                fieldlen = spaces(a.length + 1);
	                fields.push([a, _format(b, indent + namelen + fieldlen)]);
	            }
	            attrs = [];
	            for (i = 0; i < fields.length; ++i) {
	                field = fields[i];
	                attrs.push(field[0] + "=" + field[1].replace(/^\s+/, ""));
	            }
	            fieldstr = attrs.join(",\n" + indent + namelen);
	            return indent + node._astname + "(" + fieldstr + ")";
	        }
	        else if (goog.isArrayLike(node)) {
	            //Sk.debugout("arr", node.length);
	            elems = [];
	            for (i = 0; i < node.length; ++i) {
	                x = node[i];
	                elems.push(_format(x, indent + " "));
	            }
	            elemsstr = elems.join(",\n");
	            return indent + "[" + elemsstr.replace(/^\s+/, "") + "]";
	        }
	        else {
	            if (node === true) {
	                ret = "True";
	            }
	            else if (node === false) {
	                ret = "False";
	            }
	            else if (node instanceof Sk.builtin.lng) {
	                ret = node.tp$str().v;
	            }
	            else if (node instanceof Sk.builtin.str) {
	                ret = node["$r"]().v;
	            }
	            else {
	                ret = "" + node;
	            }
	            return indent + ret;
	        }
	    };

	    return _format(node, "");
	};

	goog.exportSymbol("Sk.astFromParse", Sk.astFromParse);
	goog.exportSymbol("Sk.astDump", Sk.astDump);



	/* ---- /Users/rob/skulpty/lib/afterword.js ---- */ 

	function wrapAstThing(fx, argpos, debug) {
		argpos = argpos || 2;
		return function(x) {
			var n = arguments[argpos-1];
			var result = fx.apply(undefined, arguments);
			result.range = n.range;
			result.str = n.str;
			result.loc = n.loc;
			if ( debug ) {
				console.log(n);
				console.log(result);
			}
			return result;
		};
	}

	astForAtom = wrapAstThing(astForAtom);
	astForCompOp = wrapAstThing(astForCompOp);
	astForSuite = wrapAstThing(astForSuite);
	astForExceptClause = wrapAstThing(astForExceptClause);
	astForDottedName = wrapAstThing(astForDottedName);
	astForDecorator = wrapAstThing(astForDecorator);
	astForDecorators = wrapAstThing(astForDecorators);
	astForDecorated = wrapAstThing(astForDecorated);
	astForWithVar = wrapAstThing(astForWithVar);
	astForWithStmt = wrapAstThing(astForWithStmt);
	astForExecStmt = wrapAstThing(astForExecStmt);
	astForIfStmt = wrapAstThing(astForIfStmt);
	astForExprlist = wrapAstThing(astForExprlist);
	astForDelStmt = wrapAstThing(astForDelStmt);
	astForGlobalStmt = wrapAstThing(astForGlobalStmt);
	astForAssertStmt = wrapAstThing(astForAssertStmt);
	astForImportStmt = wrapAstThing(astForImportStmt);
	astForTestlistComp = wrapAstThing(astForTestlistComp);
	astForListcomp = wrapAstThing(astForListcomp);
	astForFactor = wrapAstThing(astForFactor);
	astForForStmt = wrapAstThing(astForForStmt);
	astForTrailer = wrapAstThing(astForTrailer);
	astForFlowStmt = wrapAstThing(astForFlowStmt);
	astForArguments = wrapAstThing(astForArguments);
	astForFuncdef = wrapAstThing(astForFuncdef);
	astForClassBases = wrapAstThing(astForClassBases);
	astForClassdef = wrapAstThing(astForClassdef);
	astForLambdef = wrapAstThing(astForLambdef);
	astForComprehension = wrapAstThing(astForComprehension);
	astForIterComp = wrapAstThing(astForIterComp);
	astForDictComp = wrapAstThing(astForDictComp);
	astForGenExpr = wrapAstThing(astForGenExpr);
	astForSetComp = wrapAstThing(astForSetComp);
	astForWhileStmt = wrapAstThing(astForWhileStmt);
	astForAugassign = wrapAstThing(astForAugassign);
	astForBinop = wrapAstThing(astForBinop);
	astForTestlist = wrapAstThing(astForTestlist);
	astForExprStmt = wrapAstThing(astForExprStmt);
	astForIfexpr = wrapAstThing(astForIfexpr);
	astForExpr = wrapAstThing(astForExpr);
	Sk.astFromParse = wrapAstThing(Sk.astFromParse, 1);

	Sk.nameForToken = function(v) {
		if ( typeof v === "string" ) return v;
		for ( var name in Sk.Tokenizer.Tokens ) {
			if ( Sk.Tokenizer.Tokens[name] == v ) return name;
		}
		if ( v in Sk.ParseTables.number2symbol ) {
			return Sk.ParseTables.number2symbol[v];
		}

		return '???:' + v;
	};

	//Sk.python3 = true;
	Sk.Parser = Parser;
	Sk.builtin.str.prototype.valueOf = function() { return this.v; };
	Sk.builtin.str.prototype.toString = function() { return this.v; };

	Sk.builtin.SyntaxError = function(str, file, line, ctx, extra) {
		var err = new SyntaxError(str, file, line);
		err.context = ctx;
		err.extra = extra;
		err.line = line;
		return err;
	};

	Sk.builtin.IndentationError = function(str, file, line, row, extra) {
		var err = new SyntaxError('Indentation Error: ' + str, file, line);
		err.context = [[line, row], [line, row]];
		err.extra = {
		};
		err.line = line;
		return err;
	};


	module.exports = Sk;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';

	var isArray = Array.isArray;

	//TODO: Find a way to not have to do this.
	function getOpName(op) {
		if (op.prototype._astname) {
			return op.prototype._astname;
		}
		throw new Error("Coudlnt decode operator name for: " + (op.name || op.toString()));
	}

	function abort(why) {
		console.log(new Error("ABORT:" + why).stack);
		throw new Error(why);
	}

	function isExpression(n) {
		return /Expression$/.test(n.type);
	}

	var idx = 0;
	function createTempName(hint) {
		return '__temp$' + hint + '$' + idx++;
	}

	function ensureStatement(s) {
		var f = s;
		if ( !isArray(s) ) f = [f];
		for ( var i = 0; i < f.length; ++i ) {
			var v = f[i];
			if ( isExpression(v) ) {
				f[i] = {type: "ExpressionStatement", expression: v};
			}
		}

		if ( isArray(s) ) return s;
		else return f[0];
	}

	function ident(n) {
		return {type: "Identifier", name: n.valueOf()};
	}

	function member(o, p) {
		return {
			type: "MemberExpression",
			object: o,
			property: p,
			computed: false
		};
	}

	function literal(v) {
		if ( typeof v === 'object' ) v = v.valueOf();

		if ( typeof v === 'number' && (1 / v !== 1 / Math.abs(v)) ) {
			return {type: "UnaryExpression", argument: literal(-v), operator: '-' };
		}

		return {type: "Literal", value: v, raw: JSON.stringify(v)};
	}

	function binOp(left, op, right) {
		return {
			type: "BinaryExpression",
			left: left,
			right: right,
			operator: op
		};
	}

	function logicOp(left, op, right) {
		return {
			type: "LogicalExpression",
			left: left,
			right: right,
			operator: op
		};
	}

	function ternary(cond, a, b) {
		return {
			type: "ConditionalExpression",
			test: cond,
			consequent: a,
			alternate: b
		};
	}

	function var_(name, init) {
		return {
			type: "VariableDeclaration",
			kind: 'var',
			declarations: [{
				type: "VariableDeclarator",
				id: name,
				init: init ? init : undefined
			}]
		};
	}

	function transform(node, ctx) {
		//console.log(node.lineno, node.col_offset);
		var result = dispatch(node, ctx);
		if ( node.range ) result.range = [node.range[0], node.range[1]];
		if ( node.loc ) result.loc = node.loc;
		result.str = node.str;
		return result;
	}

	function dispatch(node, ctx) {
		if ( !ctx.locals ) ctx.locals = Object.create(null);

		if ( !node ) {
			console.log("WAT!", new Error().stack);
			throw new Error("What?");
		}
		if ( isArray(node) ) {
			var body = [];
			for ( var i = 0; i < node.length; ++i ) {
				var r = transform(node[i], ctx);
				if ( isArray(r) ) body.push.apply(body, r);
				else body.push(r);
			}
			return body;
		}
		switch (node._astname) {
			case 'Attribute': return transformAttribute(node, ctx);
			case 'Assign': return transformAssign(node, ctx);
			case 'AugAssign': return transformAugAssign(node, ctx);
			case 'BinOp': return transformBinOp(node, ctx);
			case 'BoolOp': return transformBoolOp(node, ctx);
			case 'Break': return transformBreak(node, ctx);
			case 'Call': return transformCall(node, ctx);
			case 'ClassDef': return transformClassDef(node, ctx);
			case 'Continue': return tranformContinue(node, ctx);
			case 'Compare': return transformCompare(node, ctx);
			case 'Dict': return transformDict(node, ctx);
			case 'Delete': return transformDel(node, ctx);
			case 'Expr': return transformExpr(node, ctx);
			case 'For': return transformFor(node, ctx);
			case 'FunctionDef': return transformFunctionDef(node, ctx);
			case 'GeneratorExp': return transformListComp(node, ctx); //TODO: Make this seperate
			case 'Global': return transformGlobal(node, ctx);
			case 'If': return transformIf(node, ctx);
			case 'Import': return NoOp();
			case 'Lambda': return transformLambda(node, ctx);
			case 'List': return transformList(node, ctx);
			case 'ListComp': return transformListComp(node, ctx);
			case 'Module': return transformModule(node, ctx);
			case 'Name': return transformName(node, ctx);
			case 'Print': return transformPrint(node, ctx);
			case 'Return': return transformReturn(node, ctx);
			case 'Str': return transformStr(node, ctx);
			case 'Subscript': return transformSubscript(node, ctx);
			case 'Tuple': return transformTuple(node, ctx);
			case 'Num': return transformNum(node, ctx);
			case 'Pass': return transformPass(node, ctx);
			case 'UnaryOp': return transformUnaryOp(node, ctx);
			case 'While': return transformWhile(node, ctx);
			default:
				console.log("Dont know how to transform: " + node._astname);
				console.log(JSON.stringify(node, null, '  '));
				throw new Error("Dont know how to transform: " + node._astname);
		}
	}

	function NoOp() { return []; }



	function makeVariableName(name) {
		var parts = Array.isArray(name) ? name : name.split(/\./g);
		if ( parts.length === 1 ) return ident(name);
		var prop = parts.pop();
		return member(makeVariableName(parts), ident(prop));
	}

	function transformAttribute(node, ctx) {
		var n = node.attr;
		if ( n._astname ) n = transform(n, ctx);
		else n = {type: 'Identifier', name: n.valueOf()};
		return member(transform(node.value, ctx), n);
	}

	function transformAugAssign(node, ctx) {
		//TODO: We need to not inject left into the code twice
		//as it could have side effects.
		var right = transform(node.value, ctx);
		var left = transform(node.target, ctx);
		var tn = createTempName("left");
		var opName = getOpName(node.op);
		return [
			var_(ident(tn), left),
			ensureStatement({
				type: "AssignmentExpression",
				operator: '=',
				left: left,
				right: createBinOp(left, opName, right)
			})
		];
	}

	function transformAssign(node, ctx) {

		var results = [];
		for ( var i = 0; i < node.targets.length; ++i ) {
			var left = node.targets[i];
			if ( ctx.writeTarget ) {
				left = member(ctx.writeTarget, transform(left,ctx));
			}
			results.push.apply(results,createTupleUnpackingAssign(left, transform(node.value, ctx), ctx));
		
		}
		if ( results.length == 1 ) return results[0];
		return {type: "BlockStatement", body: results}; 
	}

	function createBinOp(left, op, right) {

		if ( op === 'FloorDiv' ) {
			return {
				type: "CallExpression",
				callee: makeVariableName('Math.floor'),
				arguments: [{
					type: "BinaryExpression",
					left: left,
					right: right,
					operator: '/'
				}]
			};
		}

		var fxOps = {
			"Add": "__pythonRuntime.ops.add",
			"Mult": "__pythonRuntime.ops.multiply",
			"Pow": "Math.pow"
		};

		if ( op in fxOps  ) {
			var call = {
				type: "CallExpression",
				callee: makeVariableName(fxOps[op]),
				arguments: [left, right]
			};
			return call;
		}

		var operators = {
			"Add": "+",
			"Sub": "-",
			"Mod": "%",
			"Div": "/",
			"BitAnd": "&",
			"BitOr": "|",
			'BitXor': '^',
			"LShift": "<<",
			"RShift": ">>"

		};

		if ( !(op in operators) ) abort("Unknown binary operator: " + op);

		return binOp(left, operators[op], right);
	}

	function transformBinOp(node, ctx) {
		var left = transform(node.left, ctx);
		var right = transform(node.right, ctx);
		return createBinOp(left, getOpName(node.op), right);
	}

	function transformBoolOp(node, ctx) {
		var fvals = new Array(node.values.length);
		for ( var i = 0; i < node.values.length; ++i ) {
			fvals[i] = transform(node.values[i], ctx);
		}
		var opName = getOpName(node.op);
		var operators = {
			'And': '&&',
			'Or': '||'
		};

		if ( !(opName in operators ) ) abort("Unknown bool opeartor: " + opName);
		var opstr = operators[opName];

		var result = fvals.pop();
		while ( fvals.length > 0 ) {
			result = logicOp(fvals.pop(), opstr, result);
		}


		//TODO: Support || as well?
		return result;
	}

	function transformBreak(node, ctx) {
		return {type: "BreakStatement"};
	}

	function transformCall(node, ctx) {
		var builtins = ['len'];
		if ( node.func._astname == 'Name' ) {
			switch ( node.func.id.v ) {
				case 'len':
					return {
						type: "MemberExpression",
						object: transform(node.args[0], ctx),
						property: {type: "Identifier", name: "length"}
					};
				case 'all': case 'ord':
				case 'sum': case 'any':
				case 'str': case 'chr':
				case 'ascii': case 'divmod':
				case 'range': case 'enumerate':
				case 'round': case 'filter':
				case 'abs': case 'float':
				case 'int': case 'hex':
				case 'tuple': case  'map':
				case 'bool': case 'max':
				case 'sorted': case 'min':
				case 'list': case 'oct':
				case 'pow': case  'reversed':
				case 'repr':
					return {
						type: 'CallExpression',
						callee: makeVariableName('__pythonRuntime.functions.' + node.func.id.v),
						arguments: transform(node.args, ctx)
					};
				case 'dict':
					var args = [];
					for ( var i = 0; i < node.keywords.length; ++i ) {
						args.push({
							type: "ArrayExpression",
							elements: [
								literal(node.keywords[i].arg.v),
								transform(node.keywords[i].value, ctx)
							]
						});
					}
					return {
						type: "NewExpression",
						callee: makeVariableName('__pythonRuntime.objects.dict'),
						arguments: args
					};

			}
		}

		var args = transform(node.args, ctx);

		if ( node.keywords.length > 0 ) {
			var paramsDict = {
				type: "ObjectExpression",
				properties: [{
					type: "Property",
					key: ident("__kwp"),
					value: literal(true)
				}]
			};

			for ( var i = 0; i < node.keywords.length; ++i ) {
				var k = node.keywords[i];
				paramsDict.properties.push({
					type: "Property",
					key: ident(k.arg.v),
					value: transform(k.value, ctx)
				});
			}

			var extraArg = {
				type: "CallExpression",
				callee: makeVariableName('__pythonRuntime.utils.createParamsObj'),
				arguments: [paramsDict]
			};

			args.push(extraArg);
		}

		return {
			type: "CallExpression",
			callee: transform(node.func, ctx),
			arguments: args
		};
	}

	function transformClassDef(node, ctx) {
		var body = [];
		var proto = member(ident(node.name), ident('prototype'));
		var nctx = {
			writeTarget: proto,
			inClass: true,
			locals: Object.create(null)
		};

		if ( node.bases.length > 1 ) alert("Multiple base classes not supported.");

		var base = (node.bases.length > 0) ? transform(node.bases[0], ctx) : undefined;

		var ctorBody = [];
		ctorBody.push({
			type: "VariableDeclaration",
			kind: 'var',
			declarations: [{
				type: "VariableDeclarator",
				id: ident('that'),
				init: {type: "ThisExpression"}
			}]
		});

		ctorBody.push({
			type: "IfStatement",
			test: {
				type:"UnaryExpression",
				argument: binOp(ident('that'), "instanceof", ident(node.name)),
				operator: "!"
			},
			consequent: ensureStatement({
				type: "AssignmentExpression",
				left: ident('that'),
				right: {
					type:  "CallExpression",
					callee: makeVariableName('Object.create'),
					arguments: [ proto ]
				},
				operator: '='
			})
		});

		ctorBody.push({
			type: "IfStatement",
			test: {
				type: "CallExpression",
				callee: member(proto, ident('hasOwnProperty')),
				arguments: [literal('__init__')]
			},
			consequent: ensureStatement({
				type: "CallExpression",
				callee: member(member(proto, ident('__init__')), ident('apply')),
				arguments: [ident('that'), ident('arguments')]
			})
		});

		if ( base ) {
			ctorBody.push(ensureStatement({
				type: "CallExpression",
				callee: {
					type: "MemberExpression",
					object: base,
					property: ident('apply'),
					computed: false
				},
				arguments: [ident('that'), ident('arguments')]
			}));
		}

		ctorBody.push({
			type: "ReturnStatement",
			argument: ident('that')
		});


		body.push({
			type: "FunctionDeclaration",
			id: ident(node.name),
			params: [],
			body: {type: "BlockStatement", body:ctorBody}
		});

		if ( base ) {
			body.push({
				type: "AssignmentExpression",
				left: proto,
				right: {
					type:  "CallExpression",
					callee: makeVariableName('Object.create'),
					arguments: [ member(base, ident('prototype')) ]
				},
				operator: "="
			});
		}

		body = body.concat(transform(node.body, nctx));

		body.push({
			type: "ReturnStatement",
			argument: ident(node.name)
		});

		return {
			"type": "VariableDeclaration",
			"declarations": [
			{
			  "type": "VariableDeclarator",
			  "id": ident(node.name),
			  "init": {
			  	type: "CallExpression",
			  	callee: {
			  		type: "FunctionExpression",
			  		params: [],
			  		body: {type: "BlockStatement", body: ensureStatement(body)}
			  	},
			  	arguments: []
			  }
			}],
			"kind": ctx.varType || 'var'
		};
	}


	function tranformContinue(node, ctx) {
		return {type: "ContinueStatement"};
	}

	function makeCop(left, op, right) {

		var fxOps = {
			"In_": "in",
			"In": "in",
			"NotIn": "in"
		};
		var opName = getOpName(op);
		if ( opName in fxOps  ) {
			var call = {
				type: "CallExpression",
				callee: makeVariableName("__pythonRuntime.ops." + fxOps[opName]),
				arguments: [left, right]
			};

			if ( opName == "NotIn" ) {
				return {
					type: "UnaryExpression",
					argument: call,
					operator: "!"
				};
			} else {
				return call;	
			} 
		}

		
		var operators = {
			"Eq": "===",
			"NotEq": "!==",
			"LtE": "<=",
			"Lt": "<",
			"GtE": ">=",
			"Gt": ">",
			"Is": "===",
			"IsNot": "!=="
		};
		
		if ( !(opName in operators) ) abort("Unsuported Compare operator: " + opName);
		return binOp(left, operators[opName], right);
	}

	function transformCompare(node, ctx) {
		var left = transform(node.left, ctx);
		var result;

		for ( var i = 0; i < node.comparators.length; ++i ) {
			var right = transform(node.comparators[i], ctx);
			var cop = makeCop(left, node.ops[i], right);
			if ( result ) {
				result = binOp(result, '&&', cop);
			} else {
				result = cop;
			}
			left = right;
		}

		

		return result;
		
	}

	function transformDel(node, ctx) {
		var result = [];
		for ( var i = 0; i < node.targets.length; ++i ) {
			var st = node.targets[i];
			var partial = transform(st, ctx);
			result.push({
				type: "AssignmentExpression",
				operator: "=",
				left: partial,
				right: {
					type: "UnaryExpression",
					argument: literal(0),
					operator: 'void',
					prefix: true
				}
			});
		}
		return ensureStatement({
			type: "SequenceExpression",
			expressions: result
		});
	}

	function transformDict(node, ctx) {
		var args = [];
		for ( var i = 0; i < node.keys.length; ++i ) {
			args.push({
				type: "ArrayExpression",
				elements: [
					transform(node.keys[i], ctx),
					transform(node.values[i], ctx)
				]
			});
		}
		return {
			type: "NewExpression",
			callee: makeVariableName("__pythonRuntime.objects.dict"),
			arguments: args
		};
	}

	function transformExpr(node, ctx) {
		return {
			type: "ExpressionStatement",
			expression: transform(node.value, ctx)
		};
	}

	function assignPossiblyWithDeclaration(target, value, ctx) {
		var left = target._astname ? transform(target, ctx) : target;
		var varible;

		if ( left.type === "Identifier" ) varible = left.name;

		if ( !varible || !ctx || !ctx.locals || ctx.locals[varible] ) {
			return {type: "ExpressionStatement", expression: {
				type: "AssignmentExpression",
				operator: "=",
				left: left,
				right: value
			}};
		}

		ctx.locals[varible] = true;

		return {
			type: "VariableDeclaration",
			declarations: [{
				type: "VariableDeclarator",
				id: left,
				init: value
			}],
			kind: ctx.varType || 'var'
		};
	}

	function createTupleUnpackingAssign(target, value, ctx) {

		if ( target._astname === 'Tuple' ) {
			var result = [];
			var tn = createTempName("right");
			result.push({
				type: "VariableDeclaration",
				kind: "var",
				declarations: [{
					type: "VariableDeclarator",
					id: ident(tn),
					init: value
				}]
			});
			for ( var i = 0; i < target.elts.length; ++i ) {
				result.push.apply(result,createTupleUnpackingAssign(
					target.elts[i],
					{type: "MemberExpression", object: ident(tn), property: literal(i),  computed: true}
				,ctx));
			}
			return result;
		}

		return [assignPossiblyWithDeclaration(target, value, ctx)];
	}

	function createForLoop(iident, tident, iter, target, body, ctx) {

		body = createTupleUnpackingAssign(
			target, 
			{type: "MemberExpression", object: tident, property: iident, computed: true},
			ctx
		).concat(body);

		var riter = ternary(
			{type: "CallExpression", callee: makeVariableName("Array.isArray"), arguments:[iter]},
			iter,
			{type: "CallExpression", callee: makeVariableName("Object.keys"), arguments:[iter]}
		);

		return {
			type: "ForStatement",
			init: {
				"type": "VariableDeclaration",
				"declarations": [
				{
				  "type": "VariableDeclarator",
				  "id": iident,
				  "init": literal(0)
				},
				{
				  "type": "VariableDeclarator",
				  "id": tident,
				  "init": riter
				}],
				"kind": ctx.varType
			},
			test: binOp(iident, '<', {
				type: "MemberExpression", object: tident, property: {type: "Identifier", name: "length"}
			}),
			update: {
				"type": "UpdateExpression",
				"operator": "++",
				"prefix": true,
				"argument": iident
			},
			body: {type: "BlockStatement", body: body}
		};
	}

	function transformFor(node, ctx) {
		var name = createTempName('idx');
		var iident = ident(name);
		var tname = createTempName('target');
		var tident = {type: "Identifier", name: tname};
		var iter = transform(node.iter, ctx);
		var body = ensureStatement(transform(node.body, ctx));

		if ( node.orelse && node.orelse.length > 0 ) abort("else: for-else statement unsupported.");
		return createForLoop(iident, tident, iter, node.target, body, ctx);
	}

	function prepareFunctionBody(node, ctx) {
		var args = node.args.args.slice(0);
		if  ( ctx.inClass ) {
			//TODO: Make sure it's named self, maybe?
			args.shift();
		}
		var hasAnyArguments = args.length > 0 || node.args.vararg || node.args.kwarg;
		var nctx = {
			locals: Object.create(null),
			varType: ctx.varType
		};
		var body = ensureStatement(transform(node.body, nctx));
		var premble = [];

		if ( ctx.inClass ) {
			premble.push({
				"type": "VariableDeclaration",
				"declarations": [{
					"type": "VariableDeclarator",
					"id": ident('self'),
					"init": {type: "ThisExpression"}
				}],
				"kind": "var"
			});
		}

		if ( hasAnyArguments ) {
			
			var hasParams = createTempName('hasParams');
			var param0 = createTempName('param0');
			var realArgCount = createTempName('realArgCount');
			var argLen = makeVariableName('arguments.length');
			var argN = {type: "MemberExpression", object: ident('arguments'), property: binOp(argLen, '-', literal(1)), computed: true};
			var argNKeywords = {type: "MemberExpression", object: argN, property: ident('keywords'), computed: false};

			premble.push({
				"type": "VariableDeclaration",
				"declarations": [
				{
				  "type": "VariableDeclarator",
				  "id": ident(hasParams),
				  "init": logicOp(binOp(argLen, '>', literal(0)), '&&', logicOp(argN, '&&', argNKeywords))
				}],
				"kind":  "var"
			});

			var main = [];
			main.push({
				"type": "VariableDeclaration",
				"declarations": [{
					"type": "VariableDeclarator",
					"id": ident(param0),
					"init": ternary(ident(hasParams), argNKeywords, {type: "ObjectExpression", properties: []})
				},{
					"type": "VariableDeclarator",
					"id": ident(realArgCount),
					"init": binOp(argLen, '-', ternary(ident(hasParams), literal(1), literal(0)))
				}],
				"kind": "var"
			});

			for ( var i = 0; i < args.length; ++i ) {
				var a = node.args.args[i];
				var didx = i - (node.args.args.length - node.args.defaults.length);
				var def = didx >= 0 ? transform(node.args.defaults[didx], ctx) : ident('undefined');

				main.push({
					type: "IfStatement",
					test: binOp(ident(realArgCount), '<', literal(i+1)),
					consequent: ensureStatement({
						type: "AssignmentExpression",
						operator: "=",
						left: ident(a.id),
						right: ternary(
							binOp(literal(a.id), 'in', ident(param0)),
							{type: "MemberExpression", object: ident(param0), property: ident(a.id), computed: false},
							def
						)
					})
				});
			}

			if ( node.args.vararg ) {
				main.push({
					"type": "VariableDeclaration",
					"declarations": [{
						"type": "VariableDeclarator",
						"id": ident(node.args.vararg),
						"init": {
							type: "CallExpression",
							callee: makeVariableName("Array.prototype.slice.call"),
							arguments: [ident('arguments'), literal(node.args.args.length), hasAnyArguments ? ident(realArgCount) : undefined]
						}
					}],
					"kind": "var"
				});
			}

			if ( node.args.kwarg ) {
				for ( var i = 0; i < node.args.args.length; ++i ) {
					main.push(ensureStatement({
						type: "UnaryExpression",
						operator: "delete",
						argument: {
							type: "MemberExpression",
							object: ident(param0),
							property: ident(node.args.args[i].id),
							computed: false
						}
					}));
				}
				main.push({
					"type": "VariableDeclaration",
					"declarations": [{
						"type": "VariableDeclarator",
						"id": ident(node.args.kwarg),
						"init": ident(param0)
					}],
					"kind": "var"
				});
			}

			premble = premble.concat(main); //TODO: If we dont have defauts, we can guard this with __hasParams	
		}


		body = premble.concat(body);
		var params = transform(args, ctx);
		return {
			premble: premble,
			body: body,
			params: params
		};

	}

	function transformFunctionDef(node, ctx) {
		var data = prepareFunctionBody(node, ctx);



		if ( ctx.writeTarget ) {
			return ensureStatement({
				type: "AssignmentExpression",
				left: {type: "MemberExpression", object: ctx.writeTarget, property: ident(node.name)},
				right: {
					type: "FunctionExpression",
					name: ident(node.name),
					params: data.params,
					body: {type: "BlockStatement", body: data.body}
				},
				operator: '='
			});
		} else {
			return {
				type: "FunctionDeclaration",
				id: {type: "Identifier", name: node.name.v},
				params: data.params,
				body: {type: "BlockStatement", body: data.body}
			};
		}
	}

	function transformGlobal(node, ctx) {
		for ( var i = 0; i < node.names.length; ++i ) {
			ctx.locals[node.names[i].v] = true;
		}
		return [];
	}

	function transformIf(node, ctx) {
		var body = ensureStatement(transform(node.body, ctx));
		return {
			type: "IfStatement",
			test: transform(node.test, ctx),
			consequent: {type: "BlockStatement", body: body},
			alternate: (node.orelse && node.orelse.length > 0) ? {type: "BlockStatement", body: ensureStatement(transform(node.orelse, ctx))} : undefined
		};
	}

	function transformLambda(node, ctx) {
		var data = prepareFunctionBody(node, ctx);
		
		//TODO: This is pretty sketchy.
		var last = data.body[data.body.length - 1];
		data.body[data.body.length - 1] = {type: "ReturnStatement", argument: last.expression};

		return {
			type: "FunctionExpression",
			params: data.params,
			body: {type: "BlockStatement", body: data.body}
		};
	}

	function transformList(node, ctx) {
		var call = {
			type: "CallExpression",
			callee: makeVariableName("__pythonRuntime.objects.list"),
			arguments: transform(node.elts, ctx)
		};
		return call;
	}

	function transformListComp(node, ctx) {	
		var body = [];
		var aggrigator = createTempName('result');

		body.push({
			"type": "VariableDeclaration",
			"declarations": [{
				"type": "VariableDeclarator",
				"id": ident(aggrigator),
				"init": {
					type: "NewExpression",
					callee: makeVariableName('__pythonRuntime.objects.list'),
					arguments: []
				}
			}],
			"kind": "var"
		});

		var insideBody = [];

		insideBody.push(ensureStatement({
			type: "CallExpression",
			callee: {type: "MemberExpression", object: ident(aggrigator), property: ident('push'), computed: false},
			arguments: [transform(node.elt, ctx)]
		}));

		//if ( node.generators.length !== 1 ) abort("Unsuported number of generators");
		var gen = node.generators[0];

		for ( var g = node.generators.length - 1; g >= 0; --g ) {
			var idxName = createTempName('idx');
			var listName = createTempName("list" + g);
			var iterName = createTempName('iter');
			var gen = node.generators[g];
			for ( var i = 0; i < gen.ifs.length; ++i ) {
				insideBody.unshift({
					type: "IfStatement",
					test: {type: "UnaryExpression", argument: transform(gen.ifs[i], ctx), operator: "!"},
					consequent: {type: "ContinueStatement"}
				});
			}

			insideBody = [
				{
					type: "VariableDeclaration",
					kind: "var",
					declarations: [{
						type: "VariableDeclarator",
						id: ident(listName),
						init: transform(gen.iter, ctx)
					}]
				},
				createForLoop(ident(idxName), ident(iterName), ident(listName), gen.target, insideBody, ctx)
			];
		}

		body.push.apply(body, insideBody);
		body.push({
			type: "ReturnStatement",
			argument: ident(aggrigator)
		});

		var expr = {
			type: "FunctionExpression",
			params: [],
			body: {type: "BlockStatement", body: body}
		};

		return {
			type: "CallExpression",
			callee: expr,
			arguments: []
		};
	}

	function transformModule(node, ctx) {
		return {
			type: "Program",
			body: ensureStatement(transform(node.body, ctx))
		};
	}

	function transformName(node, ctx) {
		if ( node.id.v === 'True' ) return {type: "Literal", value: true, raw: "true"};
		if ( node.id.v === 'False' ) return {type: "Literal", value: false, raw: "false"};
		if ( node.id.v === 'None' ) return {type: "Literal", value: null, raw: "null"};

		if ( node.id.v === 'random' ) return makeVariableName('__pythonRuntime.imports.random');
		return ident(node.id);
	}

	function transformNum(node, ctx) {
		return literal(node.n);
	}

	function transformPrint(node, ctx) {
		return {
			type: "CallExpression",
			callee: makeVariableName("console.log"),
			arguments: transform(node.values, ctx)
		};
	}

	function transformReturn(node, ctx) {
		return {
			type: "ReturnStatement",
			argument: node.value ? transform(node.value, ctx) : undefined
		};
	}

	function transformStr(node, ctx) {
		return literal(node.s.valueOf());
	}

	function transformTuple(node, ctx) {
		var call = {
			type: "CallExpression",
			callee: makeVariableName("__pythonRuntime.objects.tuple"),
			arguments: transform(node.elts, ctx)
		};
		return call;
	}

	function transformSubscript(node, ctx) {
		//TODO: Do silly pythonic list offset logic
		var val = transform(node.value, ctx);
		if ( node.slice.value ) {
			var lu = transform(node.slice.value, ctx);
			lu = {
				type: "CallExpression",
				callee: makeVariableName("__pythonRuntime.ops.subscriptIndex"),
				arguments: [val, lu]
			};
			return {
				type: "MemberExpression",
				computed: true,
				object: val,
				property: lu
			};
		}

		return {
			type: "CallExpression",
			callee: makeVariableName('__pythonRuntime.internal.slice'),
			arguments:[
				val,
				node.slice.lower ? transform(node.slice.lower, ctx) : ident('undefined'),
				node.slice.upper ? transform(node.slice.upper, ctx) : ident('undefined'),
				node.slice.step ? transform(node.slice.step, ctx) : ident('undefined'),
			]
		};
	}

	function transformPass(node, ctx) {
		return {type: "EmptyStatement"};
	}

	function transformUnaryOp(node, ctx) {
		var argument = transform(node.operand, ctx);

		var fxOps = {
			"Add": "add",
			"Mult": "multiply",
		};
		var opName = getOpName(node.op);

		if ( opName in fxOps  ) {
			var call = {
				type: "CallExpression",
				callee: makeVariableName("__pythonRuntime.ops." + fxOps[opName]),
				arguments: [argument]
			};
			return call;
		}

		var operators = {
			"Not": "!",
			"USub": "-",
			"Invert": "~"
		};

		if ( !(opName in operators) ) abort("Unknown unary operator: " + opName);

		return {
			type: "UnaryExpression",
			argument: argument,
			operator: operators[opName]
		};
		
	}

	function transformWhile(node, ctx) {
		if ( node.orelse && node.orelse.length > 0 ) abort("else: statement for while unsupported.");
		return {
			type: "WhileStatement",
			test: transform(node.test, ctx),
			body: {type: "BlockStatement", body: ensureStatement(transform(node.body, ctx))}
		};	
	}

	module.exports = transform;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Sk = __webpack_require__(1);

	function splat(e) {
		console.log("GOT ERROR!");
		console.log(e, e.extra);
		console.log(JSON.stringify(e.extra.node, function(k,  o) {
			if ( k == 'type' ) return Sk.nameForToken(o);
			else if ( k == 'children' ) return o;
			else if ( k ===  '' ) return o;
			else if ( !isNaN(parseInt(k)) ) return o;
			else return undefined;
		}, '  '));
	}

	function improveError(e, options, code) {
		var r;
		if ( e.context && e.context.length >0 ) {
			r = e.context[0];	
		}

		if ( e.extra && e.extra.node ) {
			if ( !r ) {
				r = [e.extra.node.loc.start.line,e.extra.node.loc.start.column];
			}
		}

		if ( r ) {
			setErrorPos(e, r[0], r[1]);
		}

		if ( options.friendlyErrors && e.extra ) {
			e.message = makeErrorFriendly(e, code);
		}
	}

	function setErrorPos(e, line, col) {
		e.loc = {line: line, column: col};
		e.line = line;
		e.column = col;
	}

	function friendlyString(s) {
		switch (s) {
		case 'if_stmt': return 'if statement';
		case 'while_stmt': return 'while statement';
		case 'funcdef': return 'function';
		default: return '?' + s + '?';
		} 
	}

	function nodeToType(n) {
		var type = Sk.nameForToken(n.type);
		if ( type === 'suite' ) return nodeToType(n.children[0]);
		return friendlyString(type);
	}

	function makeErrorFriendly(e, code) {
		//console.log("EX", e.message, e.extra);
		if ( e.extra.kind == "DAG_MISS" ) {
			if ( e.extra.expected.indexOf('T_COLON') !== -1 ) {
				//We might be missing a colon.
				var after = (e.context && e.context[2] ? e.context[2] : e.extra.found_val).replace(/\s+$/,'');
				var lc = e.extra.node.children[e.extra.node.children.length-1];
				if ( lc.value === 'else' ) after = 'else';

				if ( e.extra.found == 'T_SEMI' ) {
					return "Replace the `;` at the end of `" + after + "` with a `:`";
				} else if ( e.extra.found == 'T_NEWLINE' ) {
					return "Need a `:` on the end of the line following `" + after + "`.";
				} else if ( e.extra.found == 'T_NAME' ) {
					return "Need a `:` after `" + after + "`.";
				} else if ( e.extra.found == 'T_EQUAL' ) {
					return "Can't assign to a variable within the condition of an " + friendlyString(e.extra.inside) + ".  Did you mean to use `==` instead of `=`?";
				}
			}

			if ( e.extra.expected.indexOf('T_DEDENT') !== -1 ) {
				if ( e.extra.found_val.toLowerCase() === 'else' ) {
					return "`else` needs to line up with its `if`.";
				} else {
					return "Indentation error.";
				}
			}

			if ( e.extra.expected.indexOf('T_INDENT') !== -1 ) {
				var lc = e.extra.parent || e.extra.node;
				var name  = nodeToType(lc);
				if ( name === 'if statement' ) {
					//Scan for the most recent part of the ifstatement.
					for ( var i = 0; i < lc.children.length; ++i ) {
						if ( ["if", "elif", "else"].indexOf(lc.children[i].value) !== -1 ) {
							name = lc.children[i].value + ' statement';
						}
					}
				}
				if ( lc.value === 'else' ) name = 'else statement';
				return 'Empty ' + name + '. Put 4 spaces in front of statements inside the ' + name + '.';
			}

			if ( e.extra.found === 'T_NAME' ) {
				switch ( e.extra.found_val ) {
					case 'else':
					case 'elif':
						return '`' + e.extra.found_val + '` must be paired with an `if`';
					case 'elseif':
						return '`elseif` should be shortened to `elif`';
				} 
			}

			if ( e.extra.found === 'T_AMPER' && e.extra.inside == 'and_expr' ) {
				return 'Python uses the word `and` instead of `&&` for boolean AND expressions.';
			}


			if ( e.extra.inside === 'trailer' ) {
				//We are parsing either an arglist or a subscript.
				if ( e.extra.expected.indexOf('T_RPAR') === 0 ) {
					//Expected ), must be a arglsit;
					if ( e.line > e.extra.node.lineno ) {
						//Our arglist is incomplete, and we have made it to the next line,.
						//Likely they just forgot to close their ()'s
						setErrorPos(e, e.extra.node.lineno, e.extra.node.col_offset);
						var t = e.extra.node.loc;
						e.context = [
							[t.start.line,t.start.column],
							[t.end.line,t.end.column]
						];
						return 'Unclosed `(` in function arguments.' + e.extra.node.lineno;

					}
					return 'Function calls paramaters must be seperated by `,`s';
				}
			}

			if ( e.extra.found === 'T_INDENT' ) {
				if ( e.extra.expected.indexOf('stmt') !== -1 ) {
					return 'Too much indentation at the beginning of this line.';
				}
			}

			if ( e.extra.expected.indexOf('subscriptlist') === 0 ) {
				return "Malformed subscript";
			}

			if ( e.extra.expected.indexOf('T_NEWLINE') !== -1 ) {
				var n = e.extra.node;
				
				if ( e.extra.node.children[0] ) {
					var n = e.extra.node.children[0];
					var previousType = Sk.nameForToken(n.type);
				
					if ( previousType == 'small_stmt' ) {
						while ( n.children && n.children.length == 1 ) n = n.children[0];
						var what = code.substring(n.range[0], n.range[1]);
						return 'If you want to call `' + what +'` as function, you need `()`\'s';
					}
				}
			}

			return 'Unexpected token: ' + e.message;
		} else if ( e.extra.kind == "CLASSIFY" ) {
			if ( e.extra.value === '"' ) return 'Unterminated string. Add a matching `"` at the end of your string.';
			return 'Unterminated `' + e.extra.value + '`';
		} else if ( e.extra.kind == "STRING_EOF" ) {
			return 'Unterminated muti-line string. Add a matching `"""` at the end of your string.';
		} else if ( e.extra.kind == "STATEMENT_EOF" ) {
			if ( e.extra.parenlev > 0 ) {
				var top = e.extra.parenstack[e.extra.parenstack.length-1];
				var kind = top[0];
				var types = '([{';
				var pair = ')]}';
				var close = pair[types.indexOf(kind)];
				setErrorPos(e, top[1], top[2]-1);
				return 'Unmatched `' + kind + '`.  Every opening `' + kind + '` needs a closing `' + close + '` to match it.';
			}
			return e.message;
		}

		return e.message;
		
		
	}

	module.exports = improveError;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	(function (root, factory) {
	  'use strict';
	  if(true)
	    module.exports = factory();
	  else if(typeof define === 'function' && define.amd)
	    define([], factory);
	  else if(typeof exports === 'object')
	    exports["__pythonRuntime"] = factory();
	  else
	    root["__pythonRuntime"] = factory();
	}(this, function() {
	  'use strict';
	  var pythonRuntime = {
	    internal: {
	      // Only used within runtime
	      isSeq: function (a) { return a && (a._type === "list" || a._type === "tuple"); },
	      slice: function (obj, start, end, step) {
	        var slice;
	        if ( typeof obj === 'string' ) slice = function(x,y) { return obj.substring(x,y); }
	        else slice = obj.slice.bind(obj);

	        if (step == null || step === 0) step = 1; // TODO: step === 0 is a runtime error
	        if (start == null) {
	          if (step < 0) start = obj.length - 1;
	          else start = 0;
	        } else if (start < 0) start += obj.length;
	        if (end == null) {
	          if (step < 0) end = -1;
	          else end = obj.length;
	        } else if (end < 0) end += obj.length;

	        var ret = new pythonRuntime.objects.list(), tmp, i;
	        if (step < 0) {
	          tmp = slice(end + 1, start + 1);
	          for (i = tmp.length - 1; i >= 0; i += step) ret.append(tmp[i]);
	        } else {
	          tmp = slice(start, end);
	          if (step === 1 && typeof tmp !== 'string') ret = pythonRuntime.utils.createList(tmp);
	          else for (i = 0; i < tmp.length; i += step) ret.append(tmp[i]);
	        }
	        if ( typeof obj === 'string' ) return ret.join('');
	        return ret;
	      },
	      isJSArray: Array.isArray || function(obj) {
	        return toString.call(obj) === '[object Array]';
	      }
	    },

	    utils: {
	      createDict: function () {
	        var ret = new pythonRuntime.objects.dict();
	        if (arguments.length === 1 && arguments[0] instanceof Object)
	          for (var k in arguments[0]) ret[k] = arguments[0][k];
	        else
	          throw TypeError("createDict expects a single JavaScript object");
	        return ret;
	      },
	      createParamsObj: function () {
	        // In: expr, expr, ..., {id:expr, __kwp:true}, {id:expr, __kwp:true}, ...
	        // Out: {formals:[expr, expr, ...], keywords:{id:expr, id:expr, ...}}
	        var params = { formals: new pythonRuntime.objects.list(), keywords: new PythonDict() };
	        for (var i = 0; i < arguments.length; i++) {
	          if (arguments[i] && arguments[i].__kwp === true) {
	            for (var k in arguments[i])
	              if (k !== '__kwp') params.keywords[k] = arguments[i][k];
	          }
	          else params.formals.push(arguments[i]);
	        }
	        return params;
	      },
	      convertToList: function (list) {
	        Object.defineProperties(list, pythonRuntime.utils.listPropertyDescriptor);
	        return list;
	      },
	      convertToDict: function (dict) {
	        Object.defineProperties(dict, pythonRuntime.utils.dictPropertyDescriptor);
	        return dict;
	      }, 
	      listPropertyDescriptor: {
	          "_type": {
	            get: function () { return 'list'; },
	            enumerable: false
	          },
	          "_isPython": {
	            get: function () { return true; },
	            enumerable: false
	          },
	          "append": {
	            value: function (x) {
	              this.push(x);
	            },
	            enumerable: false
	          },
	          "clear": {
	            value: function () {
	              this.splice(0, this.length);
	            },
	            enumerable: false
	          },
	          "copy": {
	            value: function () {
	              return this.slice(0);
	            },
	            enumerable: false
	          },
	          "count": {
	            value: function (x) {
	              var c = 0;
	              for (var i = 0; i < this.length; i++)
	                if (this[i] === x) c++;
	              return c;
	            },
	            enumerable: false
	          },
	          "equals": {
	            value: function (x) {
	              try {
	                if (this.length !== x.length) return false;
	                for (var i = 0; i < this.length; i++) {
	                  if (this[i].hasOwnProperty("equals")) {
	                    if (!this[i].equals(x[i])) return false;
	                  } else if (this[i] !== x[i]) return false;
	                }
	                return true;
	              }
	              catch (e) { }
	              return false;
	            },
	            enumerable: false
	          },
	          "extend": {
	            value: function (L) {
	              for (var i = 0; i < L.length; i++) this.push(L[i]);
	            },
	            enumerable: false
	          },
	          "index": {
	            value: function (x) {
	              return this.indexOf(x);
	            },
	            enumerable: false
	          },
	          "indexOf": {
	            value: function (x, fromIndex) {
	              try {
	                for (var i = fromIndex ? fromIndex : 0; i < this.length; i++) {
	                  if (this[i].hasOwnProperty("equals")) {
	                    if (this[i].equals(x)) return i;
	                  } else if (this[i] === x) return i;
	                }
	              }
	              catch (e) { }
	              return -1;
	            },
	            enumerable: false
	          },
	          "insert": {
	            value: function (i, x) {
	              this.splice(i, 0, x);
	            },
	            enumerable: false
	          },
	          "pop": {
	            value: function (i) {
	              if (arguments.length<1) i = this.length - 1;
	              var item = this[i];
	              this.splice(i, 1);
	              return item;
	            },
	            enumerable: false
	          },
	          "_pySlice": {
	            value: function (start, end, step) {
	              return pythonRuntime.internal.slice(this, start, end, step);
	            },
	            enumerable: false
	          },
	          "remove": {
	            value: function (x) {
	              this.splice(this.indexOf(x), 1);
	            },
	            enumerable: false
	          },
	          "sort": {
	            value: function(x, reverse) {
	              var list2 = this.slice(0);
	              var apply_key = function(a, numerical) {
	                var list3 = list2.map(x);
	                // construct a dict that maps the listay before and after the map
	                var mapping = {}
	                for(var i in list3) mapping[list3[i]] = list2[i];
	                if(numerical)
	                  list3.sort(function(a, b) { return a - b; });
	                else
	                  list3.sort()
	                for(var i in a) a[i] = mapping[list3[i]];
	              }
	              for(var i in this) {
	                if(typeof this[i] !== 'number' || !isFinite(this[i])) {
	                  if(typeof x != 'undefined') {
	                    apply_key(this, false);
	                  }
	                  else {
	                    list2.sort();
	                    for (var j in this) this[j] = list2[j];
	                  }
	                  if(reverse)
	                    this.reverse();
	                  return;
	                }
	              }
	              if(typeof x != 'undefined') {
	                apply_key(this, true);
	              }
	              else {
	                list2.sort(function(a, b) { return a - b; });
	                for(var i in this) this[i] = list2[i];
	              }
	              if(reverse)
	                this.reverse();
	            },
	            enumerable: false
	          },
	          "toString": {
	            value: function () {
	              return '[' + this.join(', ') + ']';
	            },
	            enumerable: false
	          }
	      },
	      createList: function () {
	        var ret = new pythonRuntime.objects.list();
	        if (arguments.length === 1 && arguments[0] instanceof Array)
	          for (var i in arguments[0]) ret.push(arguments[0][i]);
	        else
	          for (var i in arguments) ret.push(arguments[i]);
	        return ret;
	      },
	      dictPropertyDescriptor: {
	        "_type": {
	          get: function () { return 'dict';},
	          enumerable: false
	        },
	        "_isPython": {
	          get: function () { return true; },
	          enumerable: false
	        },
	        "items": {
	          value: function () {
	            var items = new pythonRuntime.objects.list();
	            for (var k in this) items.append(new pythonRuntime.objects.tuple(k, this[k]));
	            return items;
	          },
	          enumerable: false
	        },
	        "length": {
	          get: function () {
	            return Object.keys(this).length;
	          },
	          enumerable: false
	        },
	        "clear": {
	          value: function () {
	            for (var i in this) delete this[i];
	          },
	          enumerable: false
	        },
	        "get": {
	          value: function (key, def) {
	            if (key in this) return this[key];
	            else if (def !== undefined) return def;
	            return null;
	          },
	          enumerable: false
	        },
	        "keys": {
	          value: function () {
	            return Object.keys(this);
	          },
	          enumerable: false
	        },
	        "pop": {
	          value: function (key, def) {
	            var value;
	            if (key in this) {
	              value = this[key];
	              delete this[key];
	            } else if (def !== undefined) value = def;
	            else return new Error("KeyError");
	            return value;
	          },
	          enumerable: false
	        }, "values": {
	          value: function () {
	            var values = new pythonRuntime.objects.list();
	            for (var key in this) values.append(this[key]);
	            return values;
	          },
	          enumerable: false
	        }
	      }
	    },
	    ops: {
	      add: function (a, b) {
	        if (typeof a === 'object' && pythonRuntime.internal.isSeq(a) && pythonRuntime.internal.isSeq(b)) {
	          if (a._type !== b._type)
	            throw TypeError("can only concatenate " + a._type + " (not '" + b._type + "') to " + a._type);
	          var ret;
	          if (a._type === 'list') ret = new pythonRuntime.objects.list();
	          else if (a._type === 'tuple') ret = new pythonRuntime.objects.tuple();
	          if (ret) {
	            for (var i = 0; i < a.length; i++) ret.push(a[i]);
	            for (var i = 0; i < b.length; i++) ret.push(b[i]);
	            return ret;
	          }
	        }
	        return a + b;
	      },
	      in: function (a, b, n) {
	        var r = b.hasOwnProperty('indexOf') ? b.indexOf(a) >= 0 : a in b;
	        return n ? !r : r;
	      },
	      multiply: function (a, b) {
	        // TODO: non-sequence operand must be an integer
	        if ( typeof a === 'object' ) {
	          if (pythonRuntime.internal.isSeq(a) && !isNaN(parseInt(b))) {
	            var ret;
	            if (a._type === 'list') ret = new pythonRuntime.objects.list();
	            else if (a._type === 'tuple') ret = new pythonRuntime.objects.tuple();
	            if (ret) {
	              for (var i = 0; i < b; i++)
	                for (var j = 0; j < a.length; j++) ret.push(a[j]);
	              return ret;
	            }
	          } else if (pythonRuntime.internal.isSeq(b) && !isNaN(parseInt(a))) {
	            var ret;
	            if (b._type === 'list') ret = new pythonRuntime.objects.list();
	            else if (b._type === 'tuple') ret = new pythonRuntime.objects.tuple();
	            if (ret) {
	              for (var i = 0; i < a; i++)
	                for (var j = 0; j < b.length; j++) ret.push(b[j]);
	              return ret;
	            }
	          }
	        }
	        return a * b;
	      },
	      subscriptIndex: function (o, i) {
	        if ( i >= 0 ) return i;
	        if ( pythonRuntime.internal.isSeq(o) ) return o.length + i;
	        if ( pythonRuntime.internal.isJSArray(o) ) return o.length + i;
	        if ( typeof o === "string" ) return o.length + i;
	        return i;
	      }
	    },

	    objects: {
	      dict: function () {
	        var obj = new PythonDict();
	        for (var i = 0; i < arguments.length; ++i ) obj[arguments[i][0]] = arguments[i][1];
	        return obj;
	      },
	      list: function () {
	        var arr = [];
	        arr.push.apply(arr, arguments);
	        pythonRuntime.utils.convertToList(arr);
	        return arr;
	      },
	      tuple: function () {
	        var arr = [];
	        arr.push.apply(arr, arguments);
	        Object.defineProperty(arr, "_type",
	        {
	          get: function () { return 'tuple'; },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "_isPython",
	        {
	          get: function () { return true; },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "count",
	        {
	          value: function (x) {
	            var c = 0;
	            for (var i = 0; i < this.length; i++)
	              if (this[i] === x) c++;
	            return c;
	          },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "equals",
	        {
	          value: function (x) {
	            try {
	              if (this.length !== x.length) return false;
	              for (var i = 0; i < this.length; i++) {
	                if (this[i].hasOwnProperty("equals")) {
	                  if (!this[i].equals(x[i])) return false;
	                } else if (this[i] !== x[i]) return false;
	              }
	              return true;
	            }
	            catch (e) { }
	            return false;
	          },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "index",
	        {
	          value: function (x) {
	            return this.indexOf(x);
	          },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "indexOf",
	        {
	          value: function (x, fromIndex) {
	            try {
	              for (var i = fromIndex ? fromIndex : 0; i < this.length; i++) {
	                if (this[i].hasOwnProperty("equals")) {
	                  if (this[i].equals(x)) return i;
	                } else if (this[i] === x) return i;
	              }
	            }
	            catch (e) { }
	            return -1;
	          },
	          enumerable: false
	        });
	        Object.defineProperty(arr, "_pySlice",
	        {
	          value: function (start, end, step) { 
	            return pythonRuntime.internal.slice(this, start, end, step);
	          },
	            enumerable: false
	        });
	        Object.defineProperty(arr, "toString",
	        {
	          value: function () {
	            var s = '(' + this.join(', ');
	            if (this.length === 1) s += ',';
	            s += ')';
	            return s;
	          },
	          enumerable: false
	        });
	        return arr;
	      }
	    },

	    // Python built-in functions

	    functions: {
	      abs: function(x) {
	        return Math.abs(x);
	      },
	      all: function(iterable) {
	        for (var i in iterable) if (pythonRuntime.functions.bool(iterable[i]) !== true) return false;
	        return true;
	      },
	      any: function(iterable) {
	        for (var i in iterable) if (pythonRuntime.functions.bool(iterable[i]) === true) return true;
	        return false;
	      },
	      ascii: function(obj) {
	        var s = pythonRuntime.functions.repr(obj),
	            asc = "",
	            code;
	        for (var i = 0; i < s.length; i++) {
	          code = s.charCodeAt(i);
	          if (code <= 127) asc += s[i];
	          else if (code <= 0xFF) asc += "\\x" + code.toString(16);
	          else if (0xD800 <= code && code <= 0xDBFF) { // UCS-2 for the astral chars
	            // if (i+1 >= s.length) throw "High surrogate not followed by low surrogate"; // Is this needed?
	            code = ((code-0xD800)*0x400)+(s.charCodeAt(++i)-0xDC00)+0x10000;
	            asc += "\\U" + ("000"+code.toString(16)).slice(-8);
	          } else if (code <= 0xFFFF) asc += "\\u" + ("0"+code.toString(16)).slice(-4);
	          else if (code <= 0x10FFFF) asc += "\\U" + ("000"+code.toString(16)).slice(-8);
	          else; // Invalid value, should probably throw something. It should never get here though as strings shouldn't contain them in the first place
	        }
	        return asc;
	      },
	      bool: function(x) {
	        return !(x === undefined || // No argument
	                 x === null || // None
	                 x === false || // False
	                 x === 0 || // Zero
	                 x.length === 0 || // Empty Sequence
	                 // TODO: Empty Mapping, needs more support for python mappings first
	                 (x.__bool__ !== undefined && x.__bool__() === false) || // If it has bool conversion defined
	                 (x.__len__ !== undefined && (x.__len__() === false || x.__len__() === 0))); // If it has length conversion defined
	      },
	      chr: function(i) {
	        return String.fromCharCode(i); // TODO: Error code for not 0 <= i <= 1114111
	      },
	      divmod: function(a, b) {
	        return pythonRuntime.objects.tuple(Math.floor(a/b), a%b);
	      },
	      enumerate: function(iterable, start) {
	        start = start || 0;
	        var ret = new pythonRuntime.objects.list();
	        for (var i in iterable) ret.push(new pythonRuntime.objects.tuple(start++, iterable[i]));
	        return ret;
	      },
	      filter: function(fn, iterable) {
	        fn = fn || function () { return true; };
	        var ret = new pythonRuntime.objects.list();
	        for (var i in iterable) if (fn(iterable[i])) ret.push(iterable[i]);
	        return ret;
	      },
	      float: function(x) {
	        if (x === undefined) return 0.0;
	        else if (typeof x == "string") { // TODO: Fix type check
	          x = x.trim().toLowerCase();
	          if ((/^[+-]?inf(inity)?$/i).exec(x) !== null) return Infinity*(x[0]==="-"?-1:1);
	          else if ((/^nan$/i).exec(x) !== null) return NaN;
	          else return parseFloat(x);
	        } else if (typeof x == "number") { // TODO: Fix type check
	          return x; // TODO: Get python types working right so we can return an actual float
	        } else {
	          if (x.__float__ !== undefined) return x.__float__();
	          else return null; // TODO: Throw TypeError: float() argument must be a string or a number, not '<type of x>'
	        }
	      },
	      hex: function(x) {
	        return x.toString(16);
	      },
	      int: function (s) {
	        return parseInt(s);
	      },
	      len: function (o) {
	        return o.length;
	      },
	      list: function (iterable) {
	        var ret = new pythonRuntime.objects.list();
	        if ( arguments.length == 0 ) return ret;
	        if ( arguments.length > 1 ) throw new TypeError('list() takes at most 1 argument (' + arguments.length + ' given)');
	        if (iterable instanceof Array) for (var i in iterable) ret.push(iterable[i]);
	        else for (var i in iterable) ret.push(i);
	        return ret;
	      },
	      map: function(fn, iterable) {
	        // TODO: support additional iterables passed
	        var ret = new pythonRuntime.objects.list();
	        for (var i in iterable) ret.push(fn(iterable[i]));
	        return ret;
	      },
	      max: function(arg1, arg2) {
	        // TODO: support optional keyword-only arguments
	        // TODO: empty iterable raises Python ValueError
	        if (!arg2) { // iterable
	          var max = null;
	          for (var i in arg1) if (max === null || arg1[i] > max) max = arg1[i];
	          return max;
	        } else return arg1 >= arg2 ? arg1 : arg2;
	      },
	      min: function(arg1, arg2) {
	        // TODO: support optional keyword-only arguments
	        // TODO: empty iterable raises Python ValueError
	        if (!arg2) { // iterable
	          var max = null;
	          for (var i in arg1) if (max === null || arg1[i] < max) max = arg1[i];
	          return max;
	        } else return arg1 <= arg2 ? arg1 : arg2;
	      },
	      oct: function(x) {
	        return x.toString(8);
	      },
	      ord: function(c) {
	        return c.charCodeAt(0);
	      },
	      pow: function(x, y, z) {
	        return z ? Math.pow(x, y) % z : Math.pow(x, y);
	      },
	      print: function () {
	        var s = "";
	        for (var i = 0; i < arguments.length; i++)
	          s += i === 0 ? arguments[i] : " " + arguments[i];
	        console.log(s);
	      },
	      range: function (start, stop, step) {
	        if (stop === undefined) {
	          stop = start;
	          start = 0;
	          step = 1;
	        }
	        else if (step === undefined) step = 1;
	        var len = ~~((stop - start) / step); //~~ is a fast floor
	        if ( len < 0 ) return pythonRuntime.utils.convertToList([]);
	        var r = new Array(len);
	        var element = 0;

	        var i = start;
	        while (i < stop && step > 0 || i > stop && step < 0) {
	          r[element++] = i;
	          i += step;
	        }

	        pythonRuntime.utils.convertToList(r);
	        return r;
	      },
	      repr: function (obj) {
	        if (typeof obj === 'string') return "'" + obj + "'"; // TODO: Patch until typesystem comes up.
	        if (obj.__repr__ !== undefined) return obj.__repr__();
	        else if (obj.__class__ !== undefined && obj.__class__.module !== undefined && obj.__class__.__name__) {
	          return '<'+obj.__class__.__module__+'.'+obj.__class__.__name__+' object>';
	        } else return obj.toString(); // Raise a please report warning here, we should never reach this piece of code
	      },
	      reversed: function (seq) {
	        var ret = new pythonRuntime.objects.list();
	        for (var i in seq) ret.push(seq[i]);
	        return ret.reverse();
	      },
	      round: function (num, ndigits) {
	        if (ndigits) {
	          var scale = Math.pow(10, ndigits);
	          return Math.round(num * scale) / scale;
	        }
	        return Math.round(num);
	      },
	      sorted: function (iterable, key, reverse) {
	        var ret = new pythonRuntime.objects.list();
	        for (var i in iterable) ret.push(iterable[i]);
	        if(key) ret.sort(key); else ret.sort();
	        if (reverse) ret.reverse();
	        return ret;
	      },
	      str: function (obj) {
	        return obj.toString();
	      },
	      sum: function (iterable, start) {
	        // TODO: start can't be a string
	        var ret = start || 0;
	        for (var i in iterable) ret += iterable[i];
	        return ret;
	      },
	      tuple: function (iterable) {
	        var ret = new pythonRuntime.objects.tuple();
	        for (var i in iterable) ret.push(iterable[i]);
	        return ret;
	      }
	    },

	    // Python imports
	    // TODO: from x import y, z

	    imports: {
	      random: {
	        random: function () { return Math.random(); }
	      }
	    }
	  };

	  function PythonDict() {

	  }

	  Object.defineProperties(PythonDict.prototype, pythonRuntime.utils.dictPropertyDescriptor);
	  return pythonRuntime;
	}));



/***/ }
/******/ ])
});
;
},{}],2:[function(require,module,exports){
window.aetherFilbert = require('skulpty');
window.aetherFilbertLoose = require('skulpty');

},{"skulpty":1}]},{},[2]);