(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Filbert is a Python parser written in JavaScript.
//
// Filbert was written by Matt Lott and released under an MIT
// license. It was adatped from [Acorn](https://github.com/marijnh/acorn.git)
// by Marijn Haverbeke.
//
// Git repository for Filbert are available at
//
//     https://github.com/differentmatt/filbert.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/differentmatt/filbert/issues

(function(root, mod) {
  if (typeof exports == "object" && typeof module == "object") return mod(exports); // CommonJS
  if (typeof define == "function" && define.amd) return define(["exports"], mod); // AMD
  mod(root.filbert || (root.filbert = {})); // Plain browser env
})(this, function(exports) {
  "use strict";

  exports.version = "0.5.1";

  // The main exported interface (under `self.filbert` when in the
  // browser) is a `parse` function that takes a code string and
  // returns an abstract syntax tree as specified by [Mozilla parser
  // API][api].
  //
  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

  var options, input, inputLen, sourceFile, nc;

  exports.parse = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();
    nc = getNodeCreator(startNode, startNodeFrom, finishNode, unpackTuple);
    return parseTopLevel(options.program);
  };

  // A second optional argument can be given to further configure
  // the parser process. These options are recognized:

  var defaultOptions = exports.defaultOptions = {
    // `languageVersion` indicates the Python version to parse. It
    // is not currently in use, but will support 2 or 3 eventually.
    languageVersion: 3,
    // When `allowTrailingCommas` is false, the parser will not allow
    // trailing commas in array and object literals.
    allowTrailingCommas: true,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onComment` option, which will
    // cause Filbert to call that function with `(text, start,
    // end)` parameters whenever a comment is skipped.
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments. Note that you are not allowed to call the
    // parser from the callback-that will corrupt its internal state.
    onComment: null,
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `locations` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null,
    // This value, if given, is stored in every node, whether
    // `locations` is on or off.
    directSourceFile: null,
    // Python runtime library object name
    runtimeParamName: "__pythonRuntime"
  };

  function setOptions(opts) {
    options = opts || {};
    for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
      options[opt] = defaultOptions[opt];
    sourceFile = options.sourceFile || null;
  }

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  var getLineInfo = exports.getLineInfo = function(input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreak.lastIndex = cur;
      var match = lineBreak.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else break;
    }
    return {line: line, column: offset - cur};
  };

  // Filbert is organized as a tokenizer and a recursive-descent parser.
  // The `tokenize` export provides an interface to the tokenizer.
  // Because the tokenizer is optimized for being efficiently used by
  // the Filbert parser itself, this interface is somewhat crude and not
  // very modular. Performing another parse or call to `tokenize` will
  // reset the internal state, and invalidate existing tokenizers.

  exports.tokenize = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();

    var t = {};
    function getToken(forceRegexp) {
      lastEnd = tokEnd;
      readToken(forceRegexp);
      t.start = tokStart; t.end = tokEnd;
      t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
      t.type = tokType; t.value = tokVal;
      return t;
    }
    getToken.jumpTo = function(pos, reAllowed) {
      tokPos = pos;
      if (options.locations) {
        tokCurLine = 1;
        tokLineStart = lineBreak.lastIndex = 0;
        var match;
        while ((match = lineBreak.exec(input)) && match.index < pos) {
          ++tokCurLine;
          tokLineStart = match.index + match[0].length;
        }
      }
      tokRegexpAllowed = reAllowed;
      skipSpace();
    };
    return getToken;
  };

  // State is kept in (closure-)global variables. We already saw the
  // `options`, `input`, and `inputLen` variables above.

  // The current position of the tokenizer in the input.

  var tokPos;

  // The start and end offsets of the current token.

  var tokStart, tokEnd;

  // When `options.locations` is true, these hold objects
  // containing the tokens start and end line/column pairs.

  var tokStartLoc, tokEndLoc;

  // The type and value of the current token. Token types are objects,
  // named by variables against which they can be compared, and
  // holding properties that describe them (indicating, for example,
  // the precedence of an infix operator, and the original name of a
  // keyword token). The kind of value that's held in `tokVal` depends
  // on the type of the token. For literals, it is the literal value,
  // for operators, the operator name, and so on.

  var tokType, tokVal;

  // Interal state for the tokenizer. To distinguish between division
  // operators and regular expressions, it remembers whether the last
  // token was one that is allowed to be followed by an expression.
  // (If it is, a slash is probably a regexp, if it isn't it's a
  // division operator. See the `parseStatement` function for a
  // caveat.)

  var tokRegexpAllowed;

  // When `options.locations` is true, these are used to keep
  // track of the current line, and know when a new line has been
  // entered.

  var tokCurLine, tokLineStart;

  // These store the position of the previous token, which is useful
  // when finishing a node and assigning its `end` position.

  var lastStart, lastEnd, lastEndLoc;

  // This is the parser's state. `inFunction` is used to reject
  // `return` statements outside of functions, `strict` indicates
  // whether strict mode is on, and `bracketNesting` tracks the level
  // of nesting within brackets for implicit lint continuation.

  var inFunction, strict, bracketNesting;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  function raise(pos, message) {
    var loc = getLineInfo(input, pos);
    var err = new SyntaxError(message);
    err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
    throw err;
  }

  // Reused empty array added for node fields that are always empty.

  var empty = [];

  // Used for name collision avoidance whend adding extra AST identifiers

  var newAstIdCount = 0;

  var indentHist = exports.indentHist = {
    // Current indentation stack
    indent: [],

    // Number of dedent tokens left (i.e. if tokType == _dedent, dedentCount > 0)
    // Multiple dedent tokens are read in at once, but processed individually in readToken()
    dedentCount: 0,

    init: function () { this.indent = []; this.dedentCount = 0; },
    count: function () { return this.indent.length; },
    len: function (i) { 
      if (typeof i === 'undefined' || i >= this.indent.length) i = this.indent.length - 1;
      return this.indent[i].length; 
    },
    isIndent: function(s) {
      return this.indent.length === 0 || s.length > this.len();
    },
    isDedent: function(s) {
      return this.indent.length > 0 && s.length < this.len();
    },
    addIndent: function (s) { this.indent.push(s); },
    addDedent: function (s) {
      this.dedentCount = 0;
      for (var i = this.indent.length - 1; i >= 0 && s.length < this.indent[i].length; --i)
        ++this.dedentCount;
    },
    updateDedent: function () { this.dedentCount = this.count(); },
    pop: function () {
      --this.dedentCount;
      this.indent.pop();
    },
    undoIndent: function () { this.pop(); }
  };

  // ## Scope

  // Collection of namespaces saved as a stack
  // A namespace is a mapping of identifiers to 3 types: variables, functions, classes
  // A namespace also knows whether it is for global, class, or function
  // A new namespace is pushed at function and class start, and popped at their end
  // Starts with a global namespace on the stack
  // E.g. scope.namespaces ~ [{type: 'g', map:{x: 'v', MyClass: 'c'} }, ...]

  // TODO: Not tracking built-in namespace
  
  var scope = exports.scope = {
    namespaces: [],
    init: function () { this.namespaces = [{ type: 'g', map: {} }]; },
    current: function(offset) { 
      offset = offset || 0;
      return this.namespaces[this.namespaces.length - offset - 1];
    },
    startClass: function (id) {
      this.current().map[id] = 'c';
      this.namespaces.push({ type: 'c', map: {}, className: id });
    },
    startFn: function (id) {
      this.current().map[id] = 'f';
      this.namespaces.push({ type: 'f', map: {}, fnName: id });
    },
    end: function () { this.namespaces.pop(); },
    addVar: function (id) { this.current().map[id] = 'v'; },
    exists: function (id) { return this.current().map.hasOwnProperty(id); },
    isClass: function () { return this.current().type === 'c'; },
    isUserFunction: function(name) {
      // Loose match (i.e. order ignored)
      // TODO: does not identify user-defined class methods
      for (var i = this.namespaces.length - 1; i >= 0; i--)
        for (var key in this.namespaces[i].map)
          if (key === name && this.namespaces[i].map[key] === 'f')
            return true;
      return false;
    },
    isParentClass: function() { return this.current(1).type === 'c'; },
    isNewObj: function (id) {
      for (var i = this.namespaces.length - 1; i >= 0; i--)
        if (this.namespaces[i].map[id] === 'c') return true;
        else if (this.namespaces[i].map[id] === 'f') break;
      return false;
    },
    getParentClassName: function () { return this.current(1).className; },
    getThisReplace: function () { return this.current().thisReplace; },
    setThisReplace: function (s) { this.current().thisReplace = s; }
  };
  

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // These are the general types. The `type` property is only used to
  // make them recognizeable when debugging.

  var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
  var _name = {type: "name"}, _eof = {type: "eof"};
  var _newline = {type: "newline"}, _indent = {type: "indent"}, _dedent = {type: "dedent"};

  // Keyword tokens. The `keyword` property (also used in keyword-like
  // operators) indicates that the token originated from an
  // identifier-like word, which is used when parsing property names.
  //
  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  
  var _dict = { keyword: "dict" };  // TODO: not a keyword
  var _as = { keyword: "as" }, _assert = { keyword: "assert" }, _break = { keyword: "break" };
  var _class = { keyword: "class" }, _continue = { keyword: "continue" };
  var _def = { keyword: "def" }, _del = { keyword: "del" };
  var _elif = { keyword: "elif", beforeExpr: true }, _else = { keyword: "else", beforeExpr: true };
  var _except = { keyword: "except", beforeExpr: true }, _finally = {keyword: "finally"};
  var _for = { keyword: "for" }, _from = { keyword: "from" }, _global = { keyword: "global" };
  var _if = { keyword: "if" }, _import = { keyword: "import" };
  var _lambda = {keyword: "lambda"}, _nonlocal = {keyword: "nonlocal"};
  var _pass = { keyword: "pass" }, _raise = {keyword: "raise"};
  var _return = { keyword: "return", beforeExpr: true }, _try = { keyword: "try" };
  var _while = {keyword: "while"}, _with = {keyword: "with"}, _yield = {keyword: "yield"};

  // The keywords that denote values.

  var _none = {keyword: "None", atomValue: null}, _true = {keyword: "True", atomValue: true};
  var _false = {keyword: "False", atomValue: false};

  // Some keywords are treated as regular operators. `in` sometimes
  // (when parsing `for`) needs to be tested against specifically, so
  // we assign a variable name to it for quick comparing.
  // 'prec' is the operator precedence'

  var _or = { keyword: "or", prec: 1, beforeExpr: true, rep: "||" };
  var _and = { keyword: "and", prec: 2, beforeExpr: true, rep: "&&" };
  var _not = { keyword: "not", prec: 3, prefix: true, beforeExpr: true, rep: "!" };
  var _in = { keyword: "in", prec: 4, beforeExpr: true };
  var _is = { keyword: "is", prec: 4, beforeExpr: true };

  // Map keyword names to token types.

  var keywordTypes = {
    "dict": _dict,
    "False": _false, "None": _none, "True": _true, "and": _and, "as": _as, 
    "break": _break, "class": _class, "continue": _continue, "def": _def, "del": _del,
    "elif": _elif, "else": _else, "except": _except, "finally": _finally, "for": _for,
    "from": _from, "global": _global, "if": _if, "import": _import, "in": _in, "is": _is, 
    "lambda": _lambda, "nonlocal": _nonlocal, "not": _not, "or": _or, 
    "pass": _pass, "raise": _raise, "return": _return, "try": _try, "while": _while, 
    "with": _with, "yield": _yield
  };

  // Punctuation token types. Again, the `type` property is purely for debugging.

  var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
  var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
  var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
  var _colon = { type: ":", beforeExpr: true }, _dot = { type: "." }, _question = { type: "?", beforeExpr: true };
  
  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `prec` specifies the precedence of this operator.
  //
  // `prefix` marks the operator as a prefix unary operator. 
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  var _slash = { prec: 10, beforeExpr: true }, _eq = { isAssign: true, beforeExpr: true };
  var _assign = {isAssign: true, beforeExpr: true};
  var _equality = { prec: 4, beforeExpr: true };
  var _relational = {prec: 4, beforeExpr: true };
  var _bitwiseOR = { prec: 5, beforeExpr: true };
  var _bitwiseXOR = { prec: 6, beforeExpr: true };
  var _bitwiseAND = { prec: 7, beforeExpr: true };
  var _bitShift = { prec: 8, beforeExpr: true };
  var _plusMin = { prec: 9, beforeExpr: true };
  var _multiplyModulo = { prec: 10, beforeExpr: true };
  var _floorDiv = { prec: 10, beforeExpr: true };
  var _posNegNot = { prec: 11, prefix: true, beforeExpr: true };
  var _bitwiseNOT = { prec: 11, prefix: true, beforeExpr: true };
  var _exponentiation = { prec: 12, beforeExpr: true };

  // Provide access to the token types for external users of the
  // tokenizer.

  exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                      parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                      dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,
                      num: _num, regexp: _regexp, string: _string,
                      newline: _newline, indent: _indent, dedent: _dedent,
                      exponentiation: _exponentiation, floorDiv: _floorDiv, plusMin: _plusMin,
                      posNegNot: _posNegNot, multiplyModulo: _multiplyModulo
  };
  for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

  // This is a trick taken from Esprima. It turns out that, on
  // non-Chrome browsers, to check whether a string is in a set, a
  // predicate containing a big ugly `switch` statement is faster than
  // a regular expression, and on Chrome the two are about on par.
  // This function uses `eval` (non-lexical) to produce such a
  // predicate from a space-separated string of words.
  //
  // It starts by sorting the words by length.

  function makePredicate(words) {
    words = words.split(" ");
    var f = "", cats = [];
    out: for (var i = 0; i < words.length; ++i) {
      for (var j = 0; j < cats.length; ++j)
        if (cats[j][0].length == words[i].length) {
          cats[j].push(words[i]);
          continue out;
        }
      cats.push([words[i]]);
    }
    function compareTo(arr) {
      if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
      f += "switch(str){";
      for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
      f += "return true}return false;";
    }

    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.

    if (cats.length > 3) {
      cats.sort(function(a, b) {return b.length - a.length;});
      f += "switch(str.length){";
      for (var i = 0; i < cats.length; ++i) {
        var cat = cats[i];
        f += "case " + cat[0].length + ":";
        compareTo(cat);
      }
      f += "}";

      // Otherwise, simply generate a flat `switch` statement.

    } else {
      compareTo(words);
    }
    return new Function("str", f);
  }

  // The forbidden variable names

  var isStrictBadIdWord = makePredicate("eval arguments");

  // Keywords
  // TODO: dict isn't a keyword, it's a builtin

  var isKeyword = makePredicate("dict False None True and as assert break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield");

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.

  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  // Whether a single character denotes a newline.

  var newline = /[\n\r\u2028\u2029]/;

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

  // Test whether a given character code starts an identifier.

  var isIdentifierStart = exports.isIdentifierStart = function(code) {
    if (code < 65) return code === 36;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  };

  // Test whether a given character is part of an identifier.

  var isIdentifierChar = exports.isIdentifierChar = function(code) {
    if (code < 48) return code === 36;
    if (code < 58) return true;
    if (code < 65) return false;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  };

  // ## Tokenizer

  // These are used when `options.locations` is on, for the
  // `tokStartLoc` and `tokEndLoc` properties.

  function Position() {
    this.line = tokCurLine;
    this.column = tokPos - tokLineStart;
  }

  // Reset the token state. Used at the start of a parse.

  function initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    indentHist.init();
    newAstIdCount = 0;
    scope.init();
  }

  // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
  // `tokRegexpAllowed`, and skips the space after the token, so that
  // the next one's `tokStart` will point at the right position.

  function finishToken(type, val) {
    tokEnd = tokPos;
    if (options.locations) tokEndLoc = new Position;
    tokType = type;
    if (type === _parenL || type === _braceL || type === _bracketL) ++bracketNesting;
    if (type === _parenR || type === _braceR || type === _bracketR) --bracketNesting;
    if (type !== _newline) skipSpace();
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
  }

  function skipLine() {
    var ch = input.charCodeAt(++tokPos);
    while (tokPos < inputLen && !isNewline(ch)) {
      ++tokPos;
      ch = input.charCodeAt(tokPos);
    }
  }

  function skipLineComment() {
    var start = tokPos;
    var startLoc = options.onComment && options.locations && new Position;
    skipLine();
    if (options.onComment)
      options.onComment(input.slice(start + 1, tokPos), start, tokPos,
                        startLoc, options.locations && new Position);
  }

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  function skipSpace() {
    while (tokPos < inputLen) {
      var ch = input.charCodeAt(tokPos);
      if (ch === 35) skipLineComment();
      else if (ch === 92) {
        ++tokPos;
        if (isNewline(input.charCodeAt(tokPos))) {
          if (input.charCodeAt(tokPos) === 13 && input.charCodeAt(tokPos+1) === 10) ++tokPos;
          ++tokPos;
          if (options.location) { tokLineStart = tokPos; ++tokCurLine; }
        } else {
          raise(tokPos, "Unexpected character after line continuation character");
        }
      }
      else if (isSpace(ch)) ++tokPos;
      else if (bracketNesting > 0 && isNewline(ch)) {
        if (ch === 13 && input.charCodeAt(tokPos+1) === 10) ++tokPos;
        ++tokPos;
        if (options.location) { tokLineStart = tokPos; ++tokCurLine; }
      }
      else break;
    }
  }

  function isSpace(ch) {
    if (ch === 32 || // ' '
      ch === 9 || ch === 11 || ch === 12 ||
      ch === 160 || // '\xa0'
      ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
      return true;
    }
    return false;
  }

  function isNewline(ch) {
    if (ch === 10 || ch === 13 ||
      ch === 8232 || ch === 8233) {
      return true;
    }
    return false;
  }

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  // The `forceRegexp` parameter is used in the one case where the
  // `tokRegexpAllowed` trick does not work. See `parseStatement`.

  function readToken_dot() {
    var next = input.charCodeAt(tokPos + 1);
    if (next >= 48 && next <= 57) return readNumber(true);
    ++tokPos;
    return finishToken(_dot);
  }

  function readToken_slash() { // '/'
    if (tokRegexpAllowed) { ++tokPos; return readRegexp(); }
    var next = input.charCodeAt(tokPos + 1);
    if (next === 47) return finishOp(_floorDiv, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_slash, 1);
  }

  function readToken_mult_modulo(code) { // '*%'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 42 && next === code) return finishOp(_exponentiation, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_multiplyModulo, 1);
  }
  
  function readToken_pipe_amp(code) { // '|&'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
  }

  function readToken_caret() { // '^'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_bitwiseXOR, 1);
  }

  function readToken_plus_min(code) { // '+-'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_plusMin, 1);
  }

  function readToken_lt_gt(code) { // '<>'
    var next = input.charCodeAt(tokPos + 1);
    var size = 1;
    if (next === code) {
      size = 2;
      if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
      return finishOp(_bitShift, size);
    }
    if (next === 61) size = 2;
    return finishOp(_relational, size);
  }

  function readToken_eq_excl(code) { // '=!'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_equality, 2);
    return finishOp(_eq, 1);
  }

  // Parse indentation
  // Possible output: _indent, _dedent, _eof, readToken()
  // TODO: disallow unequal indents of same length (e.g. nested if/else block)

  function readToken_indent() {
    // Read indent, skip empty lines and comments
    var indent = "";
    var indentPos = tokPos;
    var ch, next;
    while (indentPos < inputLen) {
      ch = input.charCodeAt(indentPos);
      if (isSpace(ch)) {
        indent += String.fromCharCode(ch);
        ++indentPos;
      } else if (isNewline(ch)) { // newline
        indent = "";
        if (ch === 13 && input.charCodeAt(indentPos + 1) === 10) ++indentPos;
        ++indentPos;
        tokPos = indentPos;
        if (options.locations) {
          tokLineStart = indentPos;
          ++tokCurLine;
        }
      } else if (ch === 35) { // '#'
        do {
          next = input.charCodeAt(++indentPos);
        } while (indentPos < inputLen && next !== 10);
        // TODO: call onComment
      } else {
        break;
      }
    }

    // Determine token type based on indent found versus indentation history
    var type;
    if (indent.length > 0) {
      if (indentHist.isIndent(indent)) {
        type = _indent;
        if (indentHist.count() >= 1) tokStart += indentHist.len(indentHist.count() - 1);
        indentHist.addIndent(indent);
      } else if (indentHist.isDedent(indent)) {
        type = _dedent;
        indentHist.addDedent(indent);
        var nextDedent = indentHist.count() - indentHist.dedentCount;
        if (nextDedent >= 2) {
          tokStart += indentHist.len(nextDedent) - indentHist.len(nextDedent - 1);
        }
      } else {
        tokPos += indent.length;
      }
    } else if (indentPos >= inputLen) {
      type = _eof;
    } else if (indentHist.count() > 0) {
      type = _dedent;
      indentHist.updateDedent();
    }

    switch (type) {
      case _indent: case _dedent: return finishOp(type, indentPos - ++tokPos);
      case _eof:
        tokPos = inputLen;
        if (options.locations) tokStartLoc = new Position;
        return finishOp(type, 0);
      default:
        tokType = null;
        return readToken();
    }
  }

  function getTokenFromCode(code) {
    switch(code) {

    case 13: case 10: case 8232: case 8233:
      ++tokPos;
      if (code === 13 && input.charCodeAt(tokPos) === 10) ++tokPos;
      if (options.locations) {
        ++tokCurLine;
        tokLineStart = tokPos;
      }
      return finishToken(_newline);

    case 35: // '#'
      skipLineComment();
      return readToken();

      // The interpretation of a dot depends on whether it is followed
      // by a digit.
    case 46: // '.'
      return readToken_dot();

      // Punctuation tokens.
    case 40: ++tokPos; return finishToken(_parenL);
    case 41: ++tokPos; return finishToken(_parenR);
    case 59: ++tokPos; return finishToken(_semi);
    case 44: ++tokPos; return finishToken(_comma);
    case 91: ++tokPos; return finishToken(_bracketL);
    case 93: ++tokPos; return finishToken(_bracketR);
    case 123: ++tokPos; return finishToken(_braceL);
    case 125: ++tokPos; return finishToken(_braceR);
    case 58: ++tokPos; return finishToken(_colon);
    case 63: ++tokPos; return finishToken(_question);

      // '0x' is a hexadecimal number.
    case 48: // '0'
      var next = input.charCodeAt(tokPos + 1);
      if (next === 120 || next === 88) return readHexNumber();
      // Anything else beginning with a digit is an integer, octal
      // number, or float.
    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
      return readNumber(false);

      // Quotes produce strings.
    case 34: case 39: // '"', "'"
      return readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47: // '/'
      return readToken_slash(code);

    case 42: case 37: // '*%'
      return readToken_mult_modulo(code);

    case 124: case 38: // '|&'
      return readToken_pipe_amp(code);

    case 94: // '^'
      return readToken_caret();

    case 43: case 45: // '+-'
      return readToken_plus_min(code);

    case 60: case 62: // '<>'
      return readToken_lt_gt(code);

    case 61: case 33: // '=!'
      return readToken_eq_excl(code);

    case 126: // '~'
      return finishOp(_bitwiseNOT, 1);
    }

    return false;
  }

  function readToken(forceRegexp) {
    if (tokType === _dedent) {
      indentHist.pop();
      if (indentHist.dedentCount > 0) return;
    }

    if (!forceRegexp) tokStart = tokPos;
    else tokPos = tokStart + 1;
    if (options.locations) tokStartLoc = new Position;
    if (forceRegexp) return readRegexp();
    if (tokPos >= inputLen) return finishToken(_eof);
    if (tokType === _newline) return readToken_indent();

    var code = input.charCodeAt(tokPos);
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

    var tok = getTokenFromCode(code);

    if (tok === false) {
      // If we are here, we either found a non-ASCII identifier
      // character, or something that's entirely disallowed.
      var ch = String.fromCharCode(code);
      if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
      raise(tokPos, "Unexpected character '" + ch + "'");
    }
    return tok;
  }

  function finishOp(type, size) {
    var str = input.slice(tokPos, tokPos + size);
    tokPos += size;
    finishToken(type, str);
  }

  // Parse a regular expression. Some context-awareness is necessary,
  // since a '/' inside a '[]' set does not end the expression.

  function readRegexp() {
    var content = "", escaped, inClass, start = tokPos, value;
    for (;;) {
      if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
      var ch = input.charAt(tokPos);
      if (newline.test(ch)) raise(start, "Unterminated regular expression");
      if (!escaped) {
        if (ch === "[") inClass = true;
        else if (ch === "]" && inClass) inClass = false;
        else if (ch === "/" && !inClass) break;
        escaped = ch === "\\";
      } else escaped = false;
      ++tokPos;
    }
    content = input.slice(start, tokPos);
    ++tokPos;
    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    var mods = readWord1();
    if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regular expression flag");
    try {
      value = new RegExp(content, mods);
    } catch (e) {
      if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message);
      raise(e);
    }
    return finishToken(_regexp, value);
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  function readInt(radix, len) {
    var start = tokPos, total = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
      var code = input.charCodeAt(tokPos), val;
      if (code >= 97) val = code - 97 + 10; // a
      else if (code >= 65) val = code - 65 + 10; // A
      else if (code >= 48 && code <= 57) val = code - 48; // 0-9
      else val = Infinity;
      if (val >= radix) break;
      ++tokPos;
      total = total * radix + val;
    }
    if (tokPos === start || len != null && tokPos - start !== len) return null;

    return total;
  }

  function readHexNumber() {
    tokPos += 2; // 0x
    var val = readInt(16);
    if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
    return finishToken(_num, val);
  }

  // Read an integer, octal integer, or floating-point number.

  function readNumber(startsWithDot) {
    var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
    if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
    if (input.charCodeAt(tokPos) === 46) {
      ++tokPos;
      readInt(10);
      isFloat = true;
    }
    var next = input.charCodeAt(tokPos);
    if (next === 69 || next === 101) { // 'eE'
      next = input.charCodeAt(++tokPos);
      if (next === 43 || next === 45) ++tokPos; // '+-'
      if (readInt(10) === null) raise(start, "Invalid number");
      isFloat = true;
    }
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

    var str = input.slice(start, tokPos), val;
    if (isFloat) val = parseFloat(str);
    else if (!octal || str.length === 1) val = parseInt(str, 10);
    else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
    else val = parseInt(str, 8);
    return finishToken(_num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  function readString(quote) {
    tokPos++;
    var ch = input.charCodeAt(tokPos);
    var tripleQuoted = false;
    if (ch === quote && input.charCodeAt(tokPos+1) === quote) {
      tripleQuoted = true;
      tokPos += 2;
    }
    var out = "";
    for (;;) {
      if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
      var ch = input.charCodeAt(tokPos);
      if (ch === quote) {
        if (tripleQuoted) {
          if (input.charCodeAt(tokPos+1) === quote &&
              input.charCodeAt(tokPos+2) === quote) {
            tokPos += 3;
            return finishToken(_string, out);
          }
        } else {
          ++tokPos;
          return finishToken(_string, out);
        }
      }
      if (ch === 92) { // '\'
        ch = input.charCodeAt(++tokPos);
        var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
        if (octal) octal = octal[0];
        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
        if (octal === "0") octal = null;
        ++tokPos;
        if (octal) {
          if (strict) raise(tokPos - 2, "Octal literal in strict mode");
          out += String.fromCharCode(parseInt(octal, 8));
          tokPos += octal.length - 1;
        } else {
          switch (ch) {
          case 110: out += "\n"; break; // 'n' -> '\n'
          case 114: out += "\r"; break; // 'r' -> '\r'
          case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
          case 117: out += String.fromCharCode(readHexChar(4)); break; // 'u'
          case 85: // 'U'
            ch = readHexChar(8);
            if (ch < 0xFFFF && (ch < 0xD800 || 0xDBFF < ch)) out += String.fromCharCode(ch); // If it's UTF-16
            else { // If we need UCS-2
              ch -= 0x10000;
              out += String.fromCharCode((ch>>10)+0xd800)+String.fromCharCode((ch%0x400)+0xdc00);
            }
            break;
          case 116: out += "\t"; break; // 't' -> '\t'
          case 98: out += "\b"; break; // 'b' -> '\b'
          case 118: out += "\u000b"; break; // 'v' -> '\u000b'
          case 102: out += "\f"; break; // 'f' -> '\f'
          case 48: out += "\0"; break; // 0 -> '\0'
          case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
          case 10: // ' \n'
            if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
            break;
          default: out += '\\' + String.fromCharCode(ch); break; // Python doesn't remove slashes on failed escapes
          }
        }
      } else {
        if (isNewline(ch)) {
          if (tripleQuoted) {
            out += String.fromCharCode(ch);
            ++tokPos;
            if (ch === 13 && input.charCodeAt(tokPos) === 10) {
              ++tokPos;
              out += "\n";
            }
            if (options.location) { tokLineStart = tokPos; ++tokCurLine; }
          } else raise(tokStart, "Unterminated string constant");
        } else {
          out += String.fromCharCode(ch); // '\'
          ++tokPos;
        }
      }
    }
  }

  // Used to read character escape sequences ('\x', '\u', '\U').

  function readHexChar(len) {
    var n = readInt(16, len);
    if (n === null) raise(tokStart, "Bad character escape sequence");
    return n;
  }

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.

  var containsEsc;

  // Read an identifier, and return it as a string. Sets `containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Only builds up the word character-by-character when it actually
  // containeds an escape, as a micro-optimization.

  function readWord1() {
    containsEsc = false;
    var word, first = true, start = tokPos;
    for (;;) {
      var ch = input.charCodeAt(tokPos);
      if (isIdentifierChar(ch)) {
        if (containsEsc) word += input.charAt(tokPos);
        ++tokPos;
      } else if (ch === 92) { // "\"
        if (!containsEsc) word = input.slice(start, tokPos);
        containsEsc = true;
        if (input.charCodeAt(++tokPos) != 117) // "u"
          raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
        ++tokPos;
        var esc = readHexChar(4);
        var escStr = String.fromCharCode(esc);
        if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
          raise(tokPos - 4, "Invalid Unicode escape");
        word += escStr;
      } else {
        break;
      }
      first = false;
    }
    return containsEsc ? word : input.slice(start, tokPos);
  }

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  function readWord() {
    var word = readWord1();
    var type = _name;
    if (!containsEsc && isKeyword(word))
      type = keywordTypes[word];
    return finishToken(type, word);
  }

  // ## Parser

  // A recursive descent parser operates by defining functions for all
  // syntactic elements, and recursively calling those, each function
  // advancing the input stream and returning an AST node. Precedence
  // of constructs (for example, the fact that `!x[1]` means `!(x[1])`
  // instead of `(!x)[1]` is handled by the fact that the parser
  // function that parses unary prefix operators is called first, and
  // in turn calls the function that parses `[]` subscripts - that
  // way, it'll receive the node for `x[1]` already parsed, and wraps
  // *that* in the unary operator node.
  //
  // Acorn uses an [operator precedence parser][opp] to handle binary
  // operator precedence, because it is much more compact than using
  // the technique outlined above, which uses different, nesting
  // functions to specify precedence, for all of the ten binary
  // precedence levels that JavaScript defines.
  //
  // [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

  // ### Parser utilities

  // Continue to the next token.

  function next() {
    lastStart = tokStart;
    lastEnd = tokEnd;
    lastEndLoc = tokEndLoc;
    readToken();
  }

  // Enter strict mode. Re-reads the next token to please pedantic
  // tests ("use strict"; 010; -- should fail).

  function setStrict(strct) {
    strict = strct;
    tokPos = tokStart;
    if (options.locations) {
      while (tokPos < tokLineStart) {
        tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
        --tokCurLine;
      }
    }
    skipSpace();
    readToken();
  }

  // Start an AST node, attaching a start offset.

  function Node() {
    this.type = null;
  }

  exports.Node = Node;

  function SourceLocation() {
    this.start = tokStartLoc;
    this.end = null;
    if (sourceFile !== null) this.source = sourceFile;
  }

  function startNode() {
    var node = new Node();
    if (options.locations)
      node.loc = new SourceLocation();
    if (options.directSourceFile)
      node.sourceFile = options.directSourceFile;
    if (options.ranges)
      node.range = [tokStart, 0];
    return node;
  }

  // Finish an AST node, adding `type` and `end` properties.

  function finishNode(node, type) {
    node.type = type;
    if (options.locations)
      node.loc.end = lastEndLoc;
    if (options.ranges)
      node.range[1] = lastEnd;
    return node;
  }

  // Start a node whose start offset information should be based on
  // the start of another node. For example, a binary operator node is
  // only started after its left-hand side has already been parsed.

  function startNodeFrom(other) {
    var node = new Node();
    if (options.locations) {
      node.loc = new SourceLocation();
      node.loc.start = other.loc.start;
    }
    if (options.ranges)
      node.range = [other.range[0], 0];

    return node;
  }

  // ## Node creation utilities

  var getNodeCreator = exports.getNodeCreator = function(startNode, startNodeFrom, finishNode, unpackTuple) {

    return {

      // Finish a node whose end offset information should be based on
      // the end of another node.  For example, createNode* functions
      // are used to create extra AST nodes which may be based on a single
      // parsed user code node.

      finishNodeFrom: function (endNode, node, type) {
        node.type = type;
        if (options.locations) node.loc.end = endNode.loc.end;
        if (options.ranges) node.range[1] = endNode.range[1];
        return node;
      },

      // Create an AST node using start offsets

      createNodeFrom: function (startNode, type, props) {
        var node = startNodeFrom(startNode);
        for (var prop in props) node[prop] = props[prop];
        return finishNode(node, type);
      },

      // Create an AST node using start and end offsets

      createNodeSpan: function (startNode, endNode, type, props) {
        var node = startNodeFrom(startNode);
        for (var prop in props) node[prop] = props[prop];
        return this.finishNodeFrom(endNode, node, type);
      },

      createGeneratedNodeSpan: function (startNode, endNode, type, props) {
        var node = startNodeFrom(startNode);
        for (var prop in props) node[prop] = props[prop];
        node.userCode = false;
        return this.finishNodeFrom(endNode, node, type);
      },

      // while (__formalsIndex < __params.formals.length) {
      //   <argsId>.push(__params.formals[__formalsIndex++]); }
      createNodeArgsWhileConsequent: function (argsId, s) {
        var __paramsFormals = this.createNodeMembIds(argsId, '__params' + s, 'formals');
        var __formalsIndexId = this.createGeneratedNodeSpan(argsId, argsId, "Identifier", { name: '__formalsIndex' + s });
        return this.createGeneratedNodeSpan(argsId, argsId, "WhileStatement", {
          test: this.createGeneratedNodeSpan(argsId, argsId, "BinaryExpression", {
            operator: '<', left: __formalsIndexId,
            right: this.createGeneratedNodeSpan(argsId, argsId, "MemberExpression", {
              computed: false, object: __paramsFormals,
              property: this.createGeneratedNodeSpan(argsId, argsId, "Identifier", { name: 'length' })
            })
          }),
          body: this.createGeneratedNodeSpan(argsId, argsId, "BlockStatement", {
            body: [this.createGeneratedNodeSpan(argsId, argsId, "ExpressionStatement", {
              expression: this.createGeneratedNodeSpan(argsId, argsId, "CallExpression", {
                callee: this.createNodeMembIds(argsId, argsId.name, 'push'),
                arguments: [this.createGeneratedNodeSpan(argsId, argsId, "MemberExpression", {
                  computed: true, object: __paramsFormals,
                  property: this.createGeneratedNodeSpan(argsId, argsId, "UpdateExpression", {
                    operator: '++', prefix: false, argument: __formalsIndexId
                  })
                })]
              })
            })]
          })
        });
      },

      // { while (__formalsIndex < __args.length) {
      //   <argsId>.push(__args[__formalsIndex++]); }}
      createNodeArgsAlternate: function (argsId, s) {
        var __args = '__args' + s;
        var __formalsIndexId = this.createGeneratedNodeSpan(argsId, argsId, "Identifier", { name: '__formalsIndex' + s });
        return this.createGeneratedNodeSpan(argsId, argsId, "BlockStatement", {
          body: [this.createGeneratedNodeSpan(argsId, argsId, "WhileStatement", {
            test: this.createGeneratedNodeSpan(argsId, argsId, "BinaryExpression", {
              operator: '<', left: __formalsIndexId,
              right: this.createNodeMembIds(argsId, __args, 'length')
            }),
            body: this.createGeneratedNodeSpan(argsId, argsId, "BlockStatement", {
              body: [this.createGeneratedNodeSpan(argsId, argsId, "ExpressionStatement", {
                expression: this.createGeneratedNodeSpan(argsId, argsId, "CallExpression", {
                  callee: this.createNodeMembIds(argsId, argsId.name, 'push'),
                  arguments: [this.createGeneratedNodeSpan(argsId, argsId, "MemberExpression", {
                    computed: true,
                    object: this.createGeneratedNodeSpan(argsId, argsId, "Identifier", { name: __args }),
                    property: this.createGeneratedNodeSpan(argsId, argsId, "UpdateExpression", {
                      operator: '++', prefix: false, argument: __formalsIndexId
                    })
                  })]
                })
              })]
            })
          })]
        });
      },

      // return (function() {<body>}).call(this);
      createNodeFnBodyIife: function (body) {
        var iifeBody = this.createGeneratedNodeSpan(body, body, "FunctionExpression", {
          params: [], defaults: [], body: body, generator: false, expression: false
        });
        var iifeCall = this.createGeneratedNodeSpan(body, body, "CallExpression", {
          callee: this.createGeneratedNodeSpan(body, body, "MemberExpression", {
            computed: false, object: iifeBody,
            property: this.createGeneratedNodeSpan(body, body, "Identifier", { name: 'call' })
          }),
          arguments: [this.createGeneratedNodeSpan(body, body, "ThisExpression")]
        });
        return this.createGeneratedNodeSpan(body, body, "ReturnStatement", { argument: iifeCall });
      },

      // E.g. Math.pow(2, 3)

      createNodeMemberCall: function (node, object, property, args) {
        var objId = this.createNodeFrom(node, "Identifier", { name: object });
        var propId = this.createNodeFrom(node, "Identifier", { name: property });
        var member = this.createNodeFrom(node, "MemberExpression", { object: objId, property: propId, computed: false });
        node.callee = member;
        node.arguments = args;
        return finishNode(node, "CallExpression");
      },

      // o.p
      createNodeMembIds: function(r, o, p) {
        return this.createNodeSpan(r, r, "MemberExpression", {
          computed: false,
          object: this.createNodeSpan(r, r, "Identifier", { name: o }),
          property: this.createNodeSpan(r, r, "Identifier", { name: p })
        })
      },

      // o[p]
      createNodeMembIdLit: function(r, o, p) {
        return this.createNodeSpan(r, r, "MemberExpression", {
          computed: true,
          object: this.createNodeSpan(r, r, "Identifier", { name: o }),
          property: this.createNodeSpan(r, r, "Literal", { value: p })
        })
      },

      // E.g. pyRuntime.ops.add

      createNodeOpsCallee: function (node, fnName) {
        var runtimeId = this.createGeneratedNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
        var opsId = this.createGeneratedNodeSpan(node, node, "Identifier", { name: "ops" });
        var addId = this.createGeneratedNodeSpan(node, node, "Identifier", { name: fnName });
        var opsMember = this.createGeneratedNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: opsId, computed: false });
        return this.createGeneratedNodeSpan(node, node, "MemberExpression", { object: opsMember, property: addId, computed: false });
      },

      // var __params = arguments.length === 1 && arguments[0].formals && arguments[0].keywords ? arguments[0] : null;
      createNodeParamsCheck: function (r, s) {
        var __paramsId = this.createNodeSpan(r, r, "Identifier", { name: '__params' + s });
        var arguments0 = this.createNodeMembIdLit(r, 'arguments', 0);
        var checks = this.createNodeSpan(r, r, "ConditionalExpression", {
          test: this.createNodeSpan(r, r, "LogicalExpression", {
            operator: '&&',
            left: this.createNodeSpan(r, r, "LogicalExpression", {
              operator: '&&',
              left: this.createNodeSpan(r, r, "BinaryExpression", {
                operator: '===',
                left: this.createNodeMembIds(r, 'arguments', 'length'),
                right: this.createNodeSpan(r, r, "Literal", { value: 1 })
              }),
              right: this.createNodeSpan(r, r, "MemberExpression", {
                computed: false, object: arguments0,
                property: this.createNodeSpan(r, r, "Identifier", { name: 'formals' }),
              })
            }),
            right: this.createNodeSpan(r, r, "MemberExpression", {
              computed: false, object: arguments0,
              property: this.createNodeSpan(r, r, "Identifier", { name: 'keywords' }),
            })
          }),
          consequent: arguments0,
          alternate: this.createNodeSpan(r, r, "Literal", { value: null })
        });
        return this.createGeneratedVarDeclFromId(r, __paramsId, checks);
      },

      // function __getParam(v, d) {
      //   var r = d;
      //   if (__params) {
      //     if (__formalsIndex < __params.formals.length) {
      //       r = __params.formals[__formalsIndex++];
      //     } else if (v in __params.keywords) {
      //       r = __params.keywords[v];
      //       delete __params.keywords[v];
      //     }
      //   } else if (__formalsIndex < __args.length) {
      //     r = __args[__formalsIndex++];
      //   }
      //   return r;
      // }
      createNodeGetParamFn: function (r, s) {
        var dId = this.createNodeSpan(r, r, "Identifier", { name: 'd' });
        var vId = this.createNodeSpan(r, r, "Identifier", { name: 'v' });
        var rId = this.createNodeSpan(r, r, "Identifier", { name: 'r' });
        var __formalsIndexId = this.createNodeSpan(r, r, "Identifier", { name: '__formalsIndex' + s });
        var __params = '__params' + s;
        var __getParam = '__getParam' + s;
        var __args = '__args' + s;
        var __paramsFormals = this.createNodeMembIds(r, __params, 'formals');
        var __paramsKeywords = this.createNodeMembIds(r, __params, 'keywords')
        var __paramsKeywordsV = this.createNodeSpan(r, r, "MemberExpression", { computed: true, property: vId, object: __paramsKeywords });
        return this.createGeneratedNodeSpan(r, r, "FunctionDeclaration", {
          id: this.createNodeSpan(r, r, "Identifier", { name: __getParam }),
          params: [vId, dId],
          defaults: [],
          body: this.createNodeSpan(r, r, "BlockStatement", {
            body: [this.createGeneratedVarDeclFromId(r, rId, dId),
              this.createGeneratedNodeSpan(r, r, "IfStatement", {
                test: this.createNodeSpan(r, r, "Identifier", { name: __params }),
                consequent: this.createNodeSpan(r, r, "BlockStatement", {
                  body: [this.createGeneratedNodeSpan(r, r, "IfStatement", {
                    test: this.createNodeSpan(r, r, "BinaryExpression", {
                      operator: '<', left: __formalsIndexId,
                      right: this.createNodeSpan(r, r, "MemberExpression", {
                        computed: false, object: __paramsFormals,
                        property: this.createNodeSpan(r, r, "Identifier", { name: 'length' })
                      })
                    }),
                    consequent: this.createNodeSpan(r, r, "BlockStatement", {
                      body: [this.createGeneratedNodeSpan(r, r, "ExpressionStatement", {
                        expression: this.createGeneratedNodeSpan(r, r, "AssignmentExpression", {
                          operator: '=', left: rId,
                          right: this.createNodeSpan(r, r, "MemberExpression", {
                            computed: true, object: __paramsFormals,
                            property: this.createNodeSpan(r, r, "UpdateExpression", {
                              operator: '++', argument: __formalsIndexId, prefix: false
                            })
                          })
                        })
                      })]
                    }),
                    alternate: this.createGeneratedNodeSpan(r, r, "IfStatement", {
                      test: this.createNodeSpan(r, r, "BinaryExpression", {
                        operator: 'in', left: vId, right: __paramsKeywords,
                      }),
                      consequent: this.createNodeSpan(r, r, "BlockStatement", {
                        body: [this.createGeneratedNodeSpan(r, r, "ExpressionStatement", {
                          expression: this.createGeneratedNodeSpan(r, r, "AssignmentExpression", {
                            operator: '=', left: rId, right: __paramsKeywordsV
                          })
                        }),
                        this.createGeneratedNodeSpan(r, r, "ExpressionStatement", {
                          expression: this.createNodeSpan(r, r, "UnaryExpression", {
                            operator: 'delete', prefix: true, argument: __paramsKeywordsV
                          })
                        })]
                      }),
                      alternate: null
                    })
                  })]
                }),
                alternate: this.createGeneratedNodeSpan(r, r, "IfStatement", {
                  test: this.createGeneratedNodeSpan(r, r, "BinaryExpression", {
                    operator: '<', left: __formalsIndexId,
                    right: this.createNodeMembIds(r, __args, 'length'),
                  }),
                  consequent: this.createGeneratedNodeSpan(r, r, "BlockStatement", {
                    body: [this.createGeneratedNodeSpan(r, r, "ExpressionStatement", {
                      expression: this.createGeneratedNodeSpan(r, r, "AssignmentExpression", {
                        operator: '=', left: rId,
                        right: this.createGeneratedNodeSpan(r, r, "MemberExpression", {
                          computed: true,
                          object: this.createGeneratedNodeSpan(r, r, "Identifier", { name: __args }),
                          property: this.createGeneratedNodeSpan(r, r, "UpdateExpression", {
                            operator: '++', argument: __formalsIndexId, prefix: false
                          })
                        })
                      })
                    })]
                  }),
                  alternate: null
                })
              }),
              this.createGeneratedNodeSpan(r, r, "ReturnStatement", { argument: rId })]
          }),
          rest: null, generator: false, expression: false
        });
      },

      // E.g. pyRuntime.utils.add

      createNodeRuntimeCall: function (r, mod, fn, args) {
        return this.createNodeSpan(r, r, "CallExpression", {
          callee: this.createNodeSpan(r, r, "MemberExpression", {
            computed: false,
            object: this.createNodeMembIds(r, options.runtimeParamName,  mod),
            property: this.createNodeSpan(r, r, "Identifier", { name: fn })
          }),
          arguments: args
        });
      },

      // Used to convert 'id = init' to 'var id = init'

      createVarDeclFromId: function (refNode, id, init) {
        var decl = startNodeFrom(refNode);
        decl.id = id;
        decl.init = init;
        this.finishNodeFrom(refNode, decl, "VariableDeclarator");
        var declDecl = startNodeFrom(refNode);
        declDecl.kind = "var";
        declDecl.declarations = [decl];
        return this.finishNodeFrom(refNode, declDecl, "VariableDeclaration");
      },

      createGeneratedVarDeclFromId: function (refNode, id, init) {
        var decl = startNodeFrom(refNode);
        decl.id = id;
        decl.init = init;
        this.finishNodeFrom(refNode, decl, "VariableDeclarator");
        var declDecl = startNodeFrom(refNode);
        declDecl.kind = "var";
        declDecl.declarations = [decl];
        declDecl.userCode = false;
        return this.finishNodeFrom(refNode, declDecl, "VariableDeclaration");
      },

      createClass: function(container, ctorNode, classParams, classBodyRefNode, classBlock) {
        // Helper to identify class methods which were parsed onto the class prototype

        function getPrototype(stmt) {
          if (stmt.expression && stmt.expression.left && stmt.expression.left.object &&
            stmt.expression.left.object.property && stmt.expression.left.object.property.name === "prototype")
            return stmt.expression.left.property.name;
          return null;
        }

        // Start building class constructor

        var ctorBlock = startNodeFrom(classBlock);
        ctorBlock.body = [];

        // Add parent class constructor call

        if (classParams.length === 1) {
          var objId = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "Identifier", { name: classParams[0].name });
          var propertyId = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "Identifier", { name: "call" });
          var calleeMember = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "MemberExpression", { object: objId, property: propertyId, computed: false });
          var thisExpr = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "ThisExpression");
          var callExpr = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "CallExpression", { callee: calleeMember, arguments: [thisExpr] });
          var superExpr = this.createNodeSpan(classBodyRefNode, classBodyRefNode, "ExpressionStatement", { expression: callExpr });
          ctorBlock.body.push(superExpr);
        }

        // Add non-function statements and contents of special '__init__' method

        for (var i in classBlock.body) {
          var stmt = classBlock.body[i];
          var prototype = getPrototype(stmt);
          if (!prototype) {
            ctorBlock.body.push(stmt);
          }
          else if (prototype === "__init__") {
            for (var j in stmt.expression.right.body.body)
              ctorBlock.body.push(stmt.expression.right.body.body[j]);
            ctorNode.params = stmt.expression.right.params;
          }
        }

        // Finish class constructor

        ctorNode.body = finishNode(ctorBlock, "BlockStatement");
        finishNode(ctorNode, "FunctionDeclaration");
        container.body.push(ctorNode);

        // Add inheritance via 'MyClass.prototype = Object.create(ParentClass.prototype)'

        if (classParams.length === 1) {
          var childClassId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: ctorNode.id.name });
          var childPrototypeId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: "prototype" });
          var childPrototypeMember = this.createNodeSpan(ctorNode, ctorNode, "MemberExpression", { object: childClassId, property: childPrototypeId, computed: false });
          var parentClassId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: classParams[0].name });
          var parentPrototypeId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: "prototype" });
          var parentPrototypeMember = this.createNodeSpan(ctorNode, ctorNode, "MemberExpression", { object: parentClassId, property: parentPrototypeId, computed: false });
          var objClassId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: "Object" });
          var objCreateId = this.createNodeSpan(ctorNode, ctorNode, "Identifier", { name: "create" });
          var objPropertyMember = this.createNodeSpan(ctorNode, ctorNode, "MemberExpression", { object: objClassId, property: objCreateId, computed: false });
          var callExpr = this.createNodeSpan(ctorNode, ctorNode, "CallExpression", { callee: objPropertyMember, arguments: [parentPrototypeMember] });
          var assignExpr = this.createNodeSpan(ctorNode, ctorNode, "AssignmentExpression", { left: childPrototypeMember, operator: "=", right: callExpr });
          var inheritanceExpr = this.createNodeSpan(ctorNode, ctorNode, "ExpressionStatement", { expression: assignExpr });
          container.body.push(inheritanceExpr);
        }

        // Add class methods, which are already prototype assignments

        for (var i in classBlock.body) {
          var stmt = classBlock.body[i];
          var prototype = getPrototype(stmt);
          if (prototype && prototype !== "__init__")
            container.body.push(stmt);
        }

        return finishNode(container, "BlockStatement");
      },

      // Create for loop
      // 
      // Problem:
      // 1. JavaScript for/in loop iterates on properties, which are the indexes for an Array
      //    Python iterates on the list items themselves, not indexes
      // 2. JavaScript for/in does not necessarily iterate in order
      // Solution:
      // Generate extra AST to do the right thing at runtime
      // JavaScript for/in is used for dictionaries
      // If iterating through an ordered sequence, return something like: 
      // { var __right = right; 
      //    if (__right instanceof Array) { 
      //      for(var __index=0; __index < __right.length; __index++) {
      //        i = __right[__index]; 
      //        ...
      //      } 
      //    } else { 
      //      for(i in __right){...} 
      //    }
      // }
      // When the loop target is a Tuple, it is unpacked into each for body in the example above.
      // E.g. 'for k, v in __right: total += v' becomes:
      // for (var __tmp in __right) {
      //    k = __tmp[0];
      //    v = __tmp[1];
      //    total += v;
      // }

      // TODO: for/in on a string should go through items, not indexes. String obj and string literal.

      createFor: function (node, init, tupleArgs, right, body) {
        var forOrderedBody = body;
        var forInBody = JSON.parse(JSON.stringify(forOrderedBody));

        var tmpVarSuffix = newAstIdCount++;

        var arrayId = this.createNodeSpan(node, node, "Identifier", { name: "Array" });
        var lengthId = this.createNodeSpan(init, init, "Identifier", { name: "length" });
        var zeroLit = this.createNodeSpan(init, init, "Literal", { value: 0 });

        // var __rightN = right

        var rightId = this.createNodeSpan(right, right, "Identifier", { name: "__filbertRight" + tmpVarSuffix });
        var rightAssign = this.createVarDeclFromId(right, rightId, right);

        // for(;;) and for(in) loops

        var forRightId = this.createNodeSpan(init, init, "Identifier", { name: "__filbertRight" + tmpVarSuffix });

        // for (var __indexN; __indexN < __rightN.length; ++__indexN)

        var forOrderedIndexId = this.createNodeSpan(init, init, "Identifier", { name: "__filbertIndex" + tmpVarSuffix });
        var forOrderedIndexDeclr = this.createNodeSpan(init, init, "VariableDeclarator", { id: forOrderedIndexId, init: zeroLit });
        var forOrderedIndexDecln = this.createNodeSpan(init, init, "VariableDeclaration", { declarations: [forOrderedIndexDeclr], kind: "var" });
        var forOrderedTestMember = this.createNodeSpan(init, init, "MemberExpression", { object: forRightId, property: lengthId, computed: false });
        var forOrderedTestBinop = this.createNodeSpan(init, init, "BinaryExpression", { left: forOrderedIndexId, operator: "<", right: forOrderedTestMember });
        var forOrderedUpdate = this.createNodeSpan(init, init, "UpdateExpression", { operator: "++", prefix: true, argument: forOrderedIndexId });
        var forOrderedMember = this.createNodeSpan(init, init, "MemberExpression", { object: forRightId, property: forOrderedIndexId, computed: true });

        if (tupleArgs) {
          var varStmts = unpackTuple(tupleArgs, forOrderedMember);
          for (var i = varStmts.length - 1; i >= 0; i--) forOrderedBody.body.unshift(varStmts[i]);
        }
        else {
          if (init.type === "Identifier" && !scope.exists(init.name)) {
            scope.addVar(init.name);
            forOrderedBody.body.unshift(this.createVarDeclFromId(init, init, forOrderedMember));
          } else {
            var forOrderedInit = this.createNodeSpan(init, init, "AssignmentExpression", { operator: "=", left: init, right: forOrderedMember });
            var forOrderedInitStmt = this.createNodeSpan(init, init, "ExpressionStatement", { expression: forOrderedInit });
            forOrderedBody.body.unshift(forOrderedInitStmt);
          }
        }

        var forOrdered = this.createNodeSpan(node, node, "ForStatement", { init: forOrderedIndexDecln, test: forOrderedTestBinop, update: forOrderedUpdate, body: forOrderedBody });
        var forOrderedBlock = this.createNodeSpan(node, node, "BlockStatement", { body: [forOrdered] });

        // for (init in __rightN)

        var forInLeft = init;
        if (tupleArgs) {
          var varStmts = unpackTuple(tupleArgs, right);
          forInLeft = varStmts[0];
          for (var i = varStmts.length - 1; i > 0; i--) forInBody.body.unshift(varStmts[i]);
        }
        else if (init.type === "Identifier" && !scope.exists(init.name)) {
          scope.addVar(init.name);
          forInLeft = this.createVarDeclFromId(init, init, null);
        }
        var forIn = this.createNodeSpan(node, node, "ForInStatement", { left: forInLeft, right: forRightId, body: forInBody });
        var forInBlock = this.createNodeSpan(node, node, "BlockStatement", { body: [forIn] });

        // if ordered sequence then forOrdered else forIn

        var ifRightId = this.createNodeSpan(node, node, "Identifier", { name: "__filbertRight" + tmpVarSuffix });
        var ifTest = this.createNodeSpan(node, node, "BinaryExpression", { left: ifRightId, operator: "instanceof", right: arrayId });
        var ifStmt = this.createNodeSpan(node, node, "IfStatement", { test: ifTest, consequent: forOrderedBlock, alternate: forInBlock });

        node.body = [rightAssign, ifStmt];

        return node;
      },

      // expr => __tmpList.push(expr);

      createListCompPush: function (expr, tmpVarSuffix) {
        var exprPushTmpListId = this.createNodeSpan(expr, expr, "Identifier", { name: "__tmpList" + tmpVarSuffix });
        var exprPushId = this.createNodeSpan(expr, expr, "Identifier", { name: "push" });
        var exprMember = this.createNodeSpan(expr, expr, "MemberExpression", { object: exprPushTmpListId, property: exprPushId, computed: false });
        var exprCall = this.createNodeSpan(expr, expr, "CallExpression", { callee: exprMember, arguments: [expr] });
        return this.createNodeSpan(expr, expr, "ExpressionStatement", { expression: exprCall });
      },

      //  (function() {
      //    var _list = [];
      //    ...
      //    body
      //    return _list;
      //  }());

      createListCompIife: function (node, body, tmpVarSuffix) {
        var iifeRuntimeId = this.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
        var iifeObjectsId = this.createNodeSpan(node, node, "Identifier", { name: "objects" });
        var iifeObjMember = this.createNodeSpan(node, node, "MemberExpression", { object: iifeRuntimeId, property: iifeObjectsId, computed: false });
        var iifeListId = this.createNodeSpan(node, node, "Identifier", { name: "list" });
        var iifeListMember = this.createNodeSpan(node, node, "MemberExpression", { object: iifeObjMember, property: iifeListId, computed: false });
        var iifeNewExpr = this.createNodeSpan(node, node, "NewExpression", { callee: iifeListMember, arguments: [] });
        var iifeListId = this.createNodeSpan(node, node, "Identifier", { name: "__tmpList" + tmpVarSuffix });
        var iifeListDecl = this.createVarDeclFromId(node, iifeListId, iifeNewExpr);

        var iifeReturnListId = this.createNodeSpan(node, node, "Identifier", { name: "__tmpList" + tmpVarSuffix });
        var iifeReturn = this.createNodeSpan(node, node, "ReturnStatement", { argument: iifeReturnListId });

        var iifeBlock = this.createNodeSpan(node, node, "BlockStatement", { body: [iifeListDecl, body, iifeReturn] });
        var fnExpr = this.createNodeSpan(node, node, "FunctionExpression", { params: [], defaults: [], body: iifeBlock, generator: false, expression: false });

        return this.createNodeSpan(node, node, "CallExpression", { callee: fnExpr, arguments: [] });
      }
    };
  };

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  function eat(type) {
    if (tokType === type) {
      next();
      return true;
    }
  }

  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error.

  function expect(type) {
    if (tokType === type) next();
    else unexpected();
  }

  // Raise an unexpected token error.

  function unexpected() {
    raise(tokStart, "Unexpected token");
  }

  // Verify that a node is an lval - something that can be assigned
  // to.

  function checkLVal(expr) {
    if (expr.type !== "Identifier" && expr.type !== "MemberExpression")
      raise(expr.start, "Assigning to rvalue");
    if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name))
      raise(expr.start, "Assigning to " + expr.name + " in strict mode");
  }

  // Get args for a new tuple expression

  function getTupleArgs(expr) {
    if (expr.callee && expr.callee.object && expr.callee.object.object &&
      expr.callee.object.object.name === options.runtimeParamName &&
      expr.callee.property && expr.callee.property.name === "tuple")
      return expr.arguments;
    return null;
  }

  // Unpack an lvalue tuple into indivual variable assignments
  // 'arg0, arg1 = right' becomes:
  // var tmp = right
  // arg0 = tmp[0]
  // arg1 = tmp[1]
  // ...

  function unpackTuple(tupleArgs, right) {
    if (!tupleArgs || tupleArgs.length < 1) unexpected();

    var varStmts = [];

    // var tmp = right

    var tmpId = nc.createNodeSpan(right, right, "Identifier", { name: "__filbertTmp" + newAstIdCount++ });
    var tmpDecl = nc.createVarDeclFromId(right, tmpId, right);
    varStmts.push(tmpDecl);

    // argN = tmp[N]

    for (var i = 0; i < tupleArgs.length; i++) {
      var lval = tupleArgs[i];
      var subTupleArgs = getTupleArgs(lval);
      if (subTupleArgs) {
        var subLit = nc.createNodeSpan(right, right, "Literal", { value: i });
        var subRight = nc.createNodeSpan(right, right, "MemberExpression", { object: tmpId, property: subLit, computed: true });
        var subStmts = unpackTuple(subTupleArgs, subRight);
        for (var j = 0; j < subStmts.length; j++) varStmts.push(subStmts[j]);
      } else {
        checkLVal(lval);
        var indexId = nc.createNodeSpan(right, right, "Literal", { value: i });
        var init = nc.createNodeSpan(right, right, "MemberExpression", { object: tmpId, property: indexId, computed: true });
        if (lval.type === "Identifier" && !scope.exists(lval.name)) {
          scope.addVar(lval.name);
          var varDecl = nc.createVarDeclFromId(lval, lval, init);
          varStmts.push(varDecl);
        }
        else {
          var node = startNodeFrom(lval);
          node.left = lval;
          node.operator = "=";
          node.right = init;
          finishNode(node, "AssignmentExpression");
          varStmts.push(nc.createNodeFrom(node, "ExpressionStatement", { expression: node }));
        }
      }
    }

    return varStmts;
  }

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  function parseTopLevel(program) {
    lastStart = lastEnd = tokPos;
    if (options.locations) lastEndLoc = new Position;
    inFunction = strict = null;
    bracketNesting = 0;
    readToken();
    var node = program || startNode();
    if (!program) node.body = [];
    while (tokType !== _eof) {
      var stmt = parseStatement();
      if (stmt) node.body.push(stmt);
    }
    return finishNode(node, "Program");
  }

  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo);`, where looking at the previous token
  // does not help.

  function parseStatement() {
    if (tokType === _slash || tokType === _assign && tokVal == "/=")
      readToken(true);

    var starttype = tokType, node = startNode();

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {

    case _break:
      next();
      return finishNode(node, "BreakStatement");

    case _continue:
      next();
      return finishNode(node, "ContinueStatement");

    case _class:
      next();
      return parseClass(node);

    case _def:
      next();
      return parseFunction(node);

    case _for:
      next();
      return parseFor(node);

    case _from: // Skipping from and import statements for now
      skipLine();
      next();
      return parseStatement();

    case _if: case _elif:
      next();
      if (tokType === _parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      expect(_colon);
      node.consequent = parseSuite();
      if (tokType === _elif)
        node.alternate = parseStatement();
      else
        node.alternate = eat(_else) && eat(_colon) ? parseSuite() : null;
      return finishNode(node, "IfStatement");

    case _import: // Skipping from and import statements for now
      skipLine();
      next();
      return parseStatement();

    case _newline:
      // TODO: parseStatement() should probably eat it's own newline
      next();
      return null;

    case _pass:
      next();
      return finishNode(node, "EmptyStatement");

    case _return:
      if (!inFunction && !options.allowReturnOutsideFunction)
        raise(tokStart, "'return' outside of function");
      next();
      if (tokType ===_newline || tokType === _eof) node.argument = null;
      else { node.argument = parseExpression();}
      return finishNode(node, "ReturnStatement");

    case _try: // TODO, and remove parseBlock
      next();
      node.block = parseBlock();
      node.handler = null;
      if (tokType === _catch) {
        var clause = startNode();
        next();
        expect(_parenL);
        clause.param = parseIdent();
        if (strict && isStrictBadIdWord(clause.param.name))
          raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
        expect(_parenR);
        clause.guard = null;
        clause.body = parseBlock();
        node.handler = finishNode(clause, "CatchClause");
      }
      node.guardedHandlers = empty;
      node.finalizer = eat(_finally) ? parseBlock() : null;
      if (!node.handler && !node.finalizer)
        raise(node.start, "Missing catch or finally clause");
      return finishNode(node, "TryStatement");

    case _while:
      next();
      if (tokType === _parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      expect(_colon);
      node.body = parseSuite();
      return finishNode(node, "WhileStatement");

    case _with: // TODO
      if (strict) raise(tokStart, "'with' in strict mode");
      next();
      node.object = parseParenExpression();
      node.body = parseStatement();
      return finishNode(node, "WithStatement");

    case _semi:
      next();
      return finishNode(node, "EmptyStatement");

      // Assume it's an ExpressionStatement. If an assign has been 
      // converted to a variable declaration, pass it up as is.

    default:
      var expr = parseExpression();
      if (tokType !== _semi && tokType !== _newline && tokType !== _eof) unexpected();
      if (expr.type === "VariableDeclaration" || expr.type === "BlockStatement") {
        return expr;
      } else {
        node.expression = expr;
        return finishNode(node, "ExpressionStatement");
      }
    }
  }

  // Parse indent-enclosed block of statements

  function parseBlock() {
    var node = startNode();
    node.body = [];
    while (tokType !== _dedent && tokType !== _eof) {
      var stmt = parseStatement();
      if (stmt) node.body.push(stmt);
    }
    if (tokType === _dedent) next();
    return finishNode(node, "BlockStatement");
  }

  // Parse 'suite' from Python grammar spec
  // Will replace parseBlock eventually

  function parseSuite() {
    // NOTE: This is not strictly valid Python for this to be an empty block
    var node = startNode();
    node.body = [];
    if (eat(_newline)) {
      if (tokType === _indent) {
        expect(_indent);
        while (!eat(_dedent) && !eat(_eof)) {
          var stmt = parseStatement();
          if (stmt) node.body.push(stmt);
        }
      }
    } else if (tokType !== _eof) {
      node.body.push(parseStatement());
      next();
    }
    return finishNode(node, "BlockStatement");
  }

  // Parse for/in loop

  function parseFor(node) {
    var init = parseExpression(false, true);
    var tupleArgs = getTupleArgs(init);
    if (!tupleArgs) checkLVal(init);
    expect(_in);
    var right = parseExpression();
    expect(_colon);
    var body = parseSuite();
    finishNode(node, "BlockStatement");
    return nc.createFor(node, init, tupleArgs, right, body);
  }

  // ### Expression parsing

  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function(s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.

  // Parse a full expression. The arguments are used to forbid comma
  // sequences (in argument lists, array literals, or object literals)
  // or the `in` operator (in for loops initalization expressions).

  function parseExpression(noComma, noIn) {
    return parseMaybeAssign(noIn);
  }

  // Used for constructs like `switch` and `if` that insist on
  // parentheses around their expression.

  function parseParenExpression() {
    expect(_parenL);
    var val = parseExpression();
    expect(_parenR);
    return val;
  }

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.
  // Add 'this.' to assignments in a class constructor.
  // Convert identifier assignment to variable declaration if the
  // identifier doesn't exist in this namespace yet.

  function parseMaybeAssign(noIn) {
    var left = parseMaybeTuple(noIn);
    if (tokType.isAssign) {
      var tupleArgs = getTupleArgs(left);
      if (tupleArgs) {
        next();
        var right = parseMaybeTuple(noIn);
        var blockNode = startNodeFrom(left);
        blockNode.body = unpackTuple(tupleArgs, right);
        return finishNode(blockNode, "BlockStatement");
      }

      if (scope.isClass()) {
        var thisExpr = nc.createNodeFrom(left, "ThisExpression");
        left = nc.createNodeFrom(left, "MemberExpression", { object: thisExpr, property: left });
      }

      var node = startNodeFrom(left);
      node.operator = tokVal;
      node.left = left;
      next();
      node.right = parseMaybeTuple(noIn);
      checkLVal(left);

      if (node.operator === '+=' || node.operator === '*=') {
        var right = nc.createNodeSpan(node.right, node.right, "CallExpression");
        right.callee = nc.createNodeOpsCallee(right, node.operator === '+=' ? "add" : "multiply");
        right.arguments = [left, node.right];
        node.right = right;
        node.operator = '=';
      }

      if (left.type === "Identifier" && !scope.exists(left.name)) {
        if (!node.operator || node.operator.length > 1) unexpected();
        scope.addVar(left.name);
        return nc.createVarDeclFromId(node.left, node.left, node.right);
      }
      return finishNode(node, "AssignmentExpression");
    }
    return left;
  }

  // Parse a tuple

  function parseMaybeTuple(noIn) {
    var expr = parseExprOps(noIn);
    if (tokType === _comma) {
      return parseTuple(noIn, expr);
    }
    return expr;
  }

  // Start the precedence parser.

  function parseExprOps(noIn) {
    return parseExprOp(parseMaybeUnary(noIn), -1, noIn);
  }

  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.
  // Exponentiation is evaluated right-to-left, so 'prec >= minPrec'
  // Exponentiation operator 'x**y' is replaced with 'Math.pow(x, y)'
  // Floor division operator 'x//y' is replaced with 'Math.floor(x/y)'
  // 'in' and 'not in' implemented via indexOf()

  function parseExprOp(left, minPrec, noIn) {
    var node, exprNode, right, op = tokType, val = tokVal;
    var prec = op === _not ? _in.prec : op.prec;
    if (op === _exponentiation && prec >= minPrec) {
      node = startNodeFrom(left);
      next();
      right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
      exprNode = nc.createNodeMemberCall(node, "Math", "pow", [left, right]);
      return parseExprOp(exprNode, minPrec, noIn);
    } else if (prec != null && (!noIn || op !== _in)) {
      if (prec > minPrec) {
        next();
        node = startNodeFrom(left);
        if (op === _floorDiv) {
          right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
          finishNode(node);
          var binExpr = nc.createNodeSpan(node, node, "BinaryExpression", { left: left, operator: '/', right: right });
          exprNode = nc.createNodeMemberCall(node, "Math", "floor", [binExpr]);
        } else if (op === _in || op === _not) {
          if (op === _in || eat(_in)) {
            right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
            finishNode(node);
            var notLit = nc.createNodeSpan(node, node, "Literal", { value: op === _not });
            exprNode = nc.createNodeRuntimeCall(node, 'ops', 'in', [left, right, notLit]);
          } else raise(tokPos, "Expected 'not in' comparison operator");
        } else if (op === _plusMin && val === '+' || op === _multiplyModulo && val === '*') {
          node.arguments = [left];
          node.arguments.push(parseExprOp(parseMaybeUnary(noIn), prec, noIn));
          finishNode(node, "CallExpression");
          node.callee = nc.createNodeOpsCallee(node, op === _plusMin ? "add" : "multiply");
          exprNode = node;
        } else {
          if (op === _is) {
            if (eat(_not)) node.operator = "!==";
            else node.operator = "===";
          } else node.operator = op.rep != null ? op.rep : val;
          node.left = left;
          node.right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
          exprNode = finishNode(node, (op === _or || op === _and) ? "LogicalExpression" : "BinaryExpression");
        }
        return parseExprOp(exprNode, minPrec, noIn);
      }
    }
    return left;
  }

  // Parse unary operators.
  // '-+' are prefixes here, with different precedence.

  function parseMaybeUnary(noIn) {
    if (tokType.prefix || tokType === _plusMin) {
      var prec = tokType === _plusMin ? _posNegNot.prec : tokType.prec;
      var node = startNode();
      node.operator = tokType.rep != null ? tokType.rep : tokVal;
      node.prefix = true;
      tokRegexpAllowed = true;
      next();
      node.argument = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
      return finishNode(node, "UnaryExpression");
    }
    return parseSubscripts(parseExprAtom());
  }

  // Parse call, dot, and `[]`-subscript expressions.

  function parseSubscripts(base, noCalls) {
    var node = startNodeFrom(base);
    if (eat(_dot)) {
      var id = parseIdent(true);
      if (pythonRuntime.imports[base.name] && pythonRuntime.imports[base.name][id.name]) {
        // Calling a Python import function
        // TODO: Unpack parameters into JavaScript-friendly parameters
        var runtimeId = nc.createNodeSpan(base, base, "Identifier", { name: options.runtimeParamName });
        var importsId = nc.createNodeSpan(base, base, "Identifier", { name: "imports" });
        var runtimeMember = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeId, property: importsId, computed: false });
        node.object = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeMember, property: base, computed: false });
      } else if (base.name && base.name === scope.getThisReplace()) {
        node.object = nc.createNodeSpan(base, base, "ThisExpression");
      } else node.object = base;
      node.property = id;
      node.computed = false;
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (eat(_bracketL)) {
      var expr, isSlice = false;
      if (eat(_colon)) isSlice = true;
      else expr = parseExpression();
      if (!isSlice && eat(_colon)) isSlice = true;
      if (isSlice) return parseSlice(node, base, expr, noCalls);
      var subscriptCall = nc.createNodeSpan(expr, expr, "CallExpression");
      subscriptCall.callee = nc.createNodeOpsCallee(expr, "subscriptIndex");
      subscriptCall.arguments = [base, expr];
      node.object = base;
      node.property = subscriptCall;
      node.computed = true;
      expect(_bracketR);
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (!noCalls && eat(_parenL)) {
      if (scope.isUserFunction(base.name)) {
        // Unpack parameters into JavaScript-friendly parameters, further processed at runtime
        var createParamsCall = nc.createNodeRuntimeCall(node, 'utils', 'createParamsObj', parseParamsList());
        node.arguments = [createParamsCall];
      } else node.arguments = parseExprList(_parenR, false);
      if (scope.isNewObj(base.name)) finishNode(node, "NewExpression");
      else finishNode(node, "CallExpression");
      if (pythonRuntime.functions[base.name]) {
        // Calling a Python built-in function
        // TODO: Unpack parameters into JavaScript-friendly parameters
        if (base.type !== "Identifier") unexpected();
        var runtimeId = nc.createNodeSpan(base, base, "Identifier", { name: options.runtimeParamName });
        var functionsId = nc.createNodeSpan(base, base, "Identifier", { name: "functions" });
        var runtimeMember = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeId, property: functionsId, computed: false });
        node.callee = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeMember, property: base, computed: false });
      } else node.callee = base;
      return parseSubscripts(node, noCalls);
    }
    return base;
  }

  function parseSlice(node, base, start, noCalls) {
    var end, step;
    if (!start) start = nc.createNodeFrom(node, "Literal", { value: null });
    if (tokType === _bracketR || eat(_colon)) {
      end = nc.createNodeFrom(node, "Literal", { value: null });
    } else {
      end = parseExpression();
      if (tokType !== _bracketR) expect(_colon);
    }
    if (tokType === _bracketR) step = nc.createNodeFrom(node, "Literal", { value: null });
    else step = parseExpression();
    expect(_bracketR);

    node.arguments = [start, end, step];
    var sliceId = nc.createNodeFrom(base, "Identifier", { name: "_pySlice" });
    var memberExpr = nc.createNodeSpan(base, base, "MemberExpression", { object: base, property: sliceId, computed: false });
    node.callee = memberExpr;
    return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
  }

  // Parse an atomic expression - either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  function parseExprAtom() {
    switch (tokType) {

    case _dict:
      next();
      return parseDict(_parenR);

    case _name:
      return parseIdent();

    case _num: case _string: case _regexp:
      var node = startNode();
      node.value = tokVal;
      node.raw = input.slice(tokStart, tokEnd);
      next();
      return finishNode(node, "Literal");

    case _none: case _true: case _false:
      var node = startNode();
      node.value = tokType.atomValue;
      node.raw = tokType.keyword;
      next();
      return finishNode(node, "Literal");

    case _parenL:
      var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;
      next();
      if (tokType === _parenR) {
        // Empty tuple
        var node = parseTuple(false);
        eat(_parenR);
        return node;
      }
      var val = parseMaybeTuple(false);
      if (options.locations) {
        val.loc.start = tokStartLoc1;
        val.loc.end = tokEndLoc;
      }
      if (options.ranges)
        val.range = [tokStart1, tokEnd];
      expect(_parenR);
      return val;

    case _bracketL:
      return parseList();

    case _braceL:
      return parseDict(_braceR);

    case _indent:
      raise(tokStart, "Unexpected indent");

    default:
      unexpected();
    }
  }

  // Parse list

  // Custom list object is used to simulate native Python list
  // E.g. Python '[]' becomes JavaScript 'new __pythonRuntime.objects.list();'
  // If list comprehension, build something like this:
  //(function() {
  //  var _list = [];
  //  ...
  //  _list.push(expr);
  //  return _list;
  //}());

  function parseList() {
    var node = startNode();
    node.arguments = [];
    next();

    if (!eat(_bracketR)) {
      var expr = parseExprOps(false);
      if (tokType === _for || tokType === _if) {

        // List comprehension
        var tmpVarSuffix = newAstIdCount++;
        expr = nc.createListCompPush(expr, tmpVarSuffix);
        var body = parseCompIter(expr, true);
        finishNode(node);
        return nc.createListCompIife(node, body, tmpVarSuffix);

      } else if (eat(_comma)) {
        node.arguments = [expr].concat(parseExprList(_bracketR, true, false));
      }
      else {
        expect(_bracketR);
        node.arguments = [expr];
      }
    }

    finishNode(node, "NewExpression");
    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "list" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });
    return node;
  }

  // Parse a comp_iter from Python language grammar
  // Used to build list comprehensions
  // 'expr' is the body to be used after unrolling the ifs and fors

  function parseCompIter(expr, first) {
    if (first && tokType !== _for) unexpected();
    if (eat(_bracketR)) return expr;
    var node = startNode();
    if (eat(_for)) {
      var init = parseExpression(false, true);
      var tupleArgs = getTupleArgs(init);
      if (!tupleArgs) checkLVal(init);
      expect(_in);
      var right = parseExpression();
      var body = parseCompIter(expr, false);
      var block = nc.createNodeSpan(body, body, "BlockStatement", { body: [body] });
      finishNode(node, "BlockStatement");
      return nc.createFor(node, init, tupleArgs, right, block);
    } else if (eat(_if)) {
      if (tokType === _parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      node.consequent = parseCompIter(expr, false);
      return finishNode(node, "IfStatement");
    } else unexpected();
  }

  // Parse class

  function parseClass(ctorNode) {
    // Container for class constructor and prototype functions
    var container = startNodeFrom(ctorNode);
    container.body = [];

    // Parse class signature
    ctorNode.id = parseIdent();
    ctorNode.params = [];
    var classParams = [];
    if (eat(_parenL)) {
      var first = true;
      while (!eat(_parenR)) {
        if (!first) expect(_comma); else first = false;
        classParams.push(parseIdent());
      }
    }
    if (classParams.length > 1) raise(tokPos, "Multiple inheritance not supported");
    expect(_colon);

    // Start new namespace for class body
    scope.startClass(ctorNode.id.name);

    // Save a reference for source ranges
    var classBodyRefNode = finishNode(startNode());

    // Parse class body
    var classBlock = parseSuite();

    // Generate additional AST to implement class
    var classStmt = nc.createClass(container, ctorNode, classParams, classBodyRefNode, classBlock);

    scope.end();

    return classStmt;
  }

  // Parse dictionary
  // Custom dict object used to simulate native Python dict
  // E.g. "{'k1':'v1', 'k2':'v2'}" becomes "new __pythonRuntime.objects.dict(['k1', 'v1'], ['k2', 'v2']);"

  function parseDict(tokClose) {
    var node = startNode(), first = true, key, value;
    node.arguments = [];
    next();
    while (!eat(tokClose)) {
      if (!first) {
        expect(_comma);
      } else first = false;

      if (tokClose === _braceR) {
        key = parsePropertyName();
        expect(_colon);
        value = parseExprOps(false);
      } else if (tokClose === _parenR) {
        var keyId = parseIdent(true);
        key = startNodeFrom(keyId);
        key.value = keyId.name;
        finishNode(key, "Literal");
        expect(_eq);
        value = parseExprOps(false);
      } else unexpected();
      node.arguments.push(nc.createNodeSpan(key, value, "ArrayExpression", { elements: [key, value] }));
    }
    finishNode(node, "NewExpression");

    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "dict" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });

    return node;
  }

  function parsePropertyName() {
    if (tokType === _num || tokType === _string) return parseExprAtom();
    return parseIdent(true);
  }

  function parseFunction(node) {
    // TODO: The node creation utilities used here are tightly coupled (e.g. variable names)

    var suffix = newAstIdCount++;
    node.id = parseIdent();
    node.params = [];

    // Parse parameters

    var formals = [];     // In order, maybe with default value
    var argsId = null;    // *args
    var kwargsId = null;  // **kwargs
    var defaultsFound = false;
    var first = true;
    expect(_parenL);
    while (!eat(_parenR)) {
      if (!first) expect(_comma); else first = false;
      if (tokVal === '*') {
        if (kwargsId) raise(tokPos, "invalid syntax");
        next(); argsId = parseIdent();
      } else if (tokVal === '**') {
        next(); kwargsId = parseIdent();
      } else {
        if (kwargsId) raise(tokPos, "invalid syntax");
        var paramId = parseIdent();
        if (eat(_eq)) {
          formals.push({ id: paramId, expr: parseExprOps(false) });
          defaultsFound = true;
        } else {
          if (defaultsFound) raise(tokPos, "non-default argument follows default argument");
          if (argsId) raise(tokPos, "missing required keyword-only argument");
          formals.push({ id: paramId, expr: null });
        }
      }
    }
    expect(_colon);

    // Start a new scope with regard to the `inFunction`
    // flag (restore them to their old value afterwards).
    // `inFunction` used to throw syntax error for stray `return`
    var oldInFunc = inFunction = true;

    scope.startFn(node.id.name);

    // If class method, remove class instance var from params and save for 'this' replacement
    if (scope.isParentClass()) {
      var selfId = formals.shift();
      scope.setThisReplace(selfId.id.name);
    }

    var body = parseSuite();
    node.body = nc.createNodeSpan(body, body, "BlockStatement", { body: [] });

    // Add runtime parameter processing
    // The caller may pass a complex parameter object as a single parameter like this:
    // {formals:[<expr>, <expr>, ...], keywords:{<id>:<expr>, <id>:<expr>, ...}}

    if (formals.length > 0 || argsId || kwargsId) {
      // var __params = arguments.length === 1 && arguments[0].formals && arguments[0].keywords ? arguments[0] : null;
      node.body.body.push(nc.createNodeParamsCheck(node.id, suffix));

      // var __formalsIndex = 0;
      node.body.body.push(nc.createGeneratedVarDeclFromId(node.id,
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: '__formalsIndex' + suffix }),
        nc.createNodeSpan(node.id, node.id, "Literal", { value: 0 })));

      // var __args = arguments;
      node.body.body.push(nc.createGeneratedVarDeclFromId(node.id,
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: '__args' + suffix }),
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: 'arguments' })));
    }

    if (formals.length > 0) {
      // function __getParam(v, d) {
      //   var r = d;
      //   if (__params) {
      //     if (__formalsIndex < __params.formals.length) {
      //       r = __params.formals[__formalsIndex++];
      //     } else if (v in __params.keywords) {
      //       r = __params.keywords[v];
      //       delete __params.keywords[v];
      //     }
      //   } else if (__formalsIndex < __args.length) {
      //     r = __args[__formalsIndex++];
      //   }
      //   return r;
      // }
      node.body.body.push(nc.createNodeGetParamFn(node.id, suffix));

      for (var i = 0; i < formals.length; i++) {
        // var <param> = __getParam('<param>', <optional default>);
        var __getParamCall = nc.createNodeSpan(formals[i].id, formals[i].id, "CallExpression", {
          callee: nc.createNodeSpan(formals[i].id, formals[i].id, "Identifier", { name: '__getParam' + suffix }),
          arguments: [nc.createNodeSpan(formals[i].id, formals[i].id, "Literal", { value: formals[i].id.name })]
        });
        if (formals[i].expr) __getParamCall.arguments.push(formals[i].expr);
        node.body.body.push(nc.createGeneratedVarDeclFromId(formals[i].id, formals[i].id, __getParamCall));
      }
    }
    
    var refNode = argsId || kwargsId;
    if (refNode) {
      if (argsId) {
        // var <args> = [];
        var argsAssign = nc.createGeneratedVarDeclFromId(argsId, argsId, nc.createNodeSpan(argsId, argsId, "ArrayExpression", { elements: [] }));
        node.body.body.push(argsAssign);
      }
      if (kwargsId) {
        // var <kwargs> = {};
        var kwargsAssign = nc.createGeneratedVarDeclFromId(kwargsId, kwargsId, nc.createNodeSpan(kwargsId, kwargsId, "ObjectExpression", { properties: [] }));
        node.body.body.push(kwargsAssign);
      }
      // if (__params) {}
      var argsIf = nc.createNodeSpan(refNode, refNode, "IfStatement", {
        test: nc.createNodeSpan(refNode, refNode, "Identifier", { name: '__params' + suffix }),
        consequent: nc.createNodeSpan(refNode, refNode, "BlockStatement", { body: [] })})
      if (argsId) {
        // while (__formalsIndex < __params.formals.length) {
        //   <argsId>.push(__params.formals[__formalsIndex++]); }
        argsIf.consequent.body.push(nc.createNodeArgsWhileConsequent(argsId, suffix));
        // { while (__formalsIndex < __args.length) {
        //   <argsId>.push(__args[__formalsIndex++]); }}
        argsIf.alternate = nc.createNodeArgsAlternate(argsId, suffix);
      }
      if (kwargsId) {
        // <kwargs> = __params.keywords
        argsIf.consequent.body.push(nc.createNodeSpan(kwargsId, kwargsId, "ExpressionStatement", {
          expression: nc.createNodeSpan(kwargsId, kwargsId, "AssignmentExpression", {
            operator: '=', left: kwargsId, right: nc.createNodeMembIds(kwargsId, '__params' + suffix, 'keywords'),
          })
        }));
      }
      node.body.body.push(argsIf);
    }

    // Convert original body to 'return (function() {<body>}).call(this);'
    node.body.body.push(nc.createNodeFnBodyIife(body));

    inFunction = oldInFunc;

    // Verify that argument names are not repeated
    for (var i = 0; i < formals.length; ++i) {
      for (var j = 0; j < i; ++j) if (formals[i].id.name === formals[j].id.name)
        raise(formals[i].id.start, "Argument name clash");
    }

    // If class method, replace with prototype function literals
    var retNode;
    if (scope.isParentClass()) {
      finishNode(node);
      var classId = nc.createNodeSpan(node, node, "Identifier", { name: scope.getParentClassName() });
      var prototypeId = nc.createNodeSpan(node, node, "Identifier", { name: "prototype" });
      var functionId = node.id;
      var prototypeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: classId, property: prototypeId, computed: false });
      var functionMember = nc.createNodeSpan(node, node, "MemberExpression", { object: prototypeMember, property: functionId, computed: false });
      var functionExpr = nc.createNodeSpan(node, node, "FunctionExpression", { body: node.body, params: node.params });
      var assignExpr = nc.createNodeSpan(node, node, "AssignmentExpression", { left: functionMember, operator: "=", right: functionExpr });
      retNode = nc.createNodeSpan(node, node, "ExpressionStatement", { expression: assignExpr });
    } else retNode = finishNode(node, "FunctionDeclaration");

    scope.end();

    return retNode;
  }

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  function parseExprList(close, allowTrailingComma, allowEmpty) {
    var elts = [], first = true;
    while (!eat(close)) {
      if (!first) {
        expect(_comma);
        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
      } else first = false;

      if (allowEmpty && tokType === _comma) elts.push(null);
      else elts.push(parseExprOps(false));
    }
    return elts;
  }

  function parseParamsList() {
    // In: expr, expr, ..., id=expr, id=expr, ...
    // Out: expr, expr, ..., {id:expr, __kwp:true}, {id:expr, __kwp:true}, ...
    var elts = [], first = true;
    while (!eat(_parenR)) {
      if (!first) expect(_comma);
      else first = false;
      var expr = parseExprOps(false);
      if (eat(_eq)) {
        var right = parseExprOps(false);
        var kwId = nc.createNodeSpan(expr, right, "Identifier", {name:"__kwp"});
        var kwLit = nc.createNodeSpan(expr, right, "Literal", {value:true});
        var left = nc.createNodeSpan(expr, right, "ObjectExpression", { properties: [] });
        left.properties.push({ type: "Property", key: expr, value: right, kind: "init" });
        left.properties.push({ type: "Property", key: kwId, value: kwLit, kind: "init" });
        expr = left;
      }
      elts.push(expr);
    }
    return elts;
  }

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  // TODO: liberal?

  function parseIdent(liberal) {
    var node = startNode();
    if (liberal) liberal = false;
    if (tokType === _name) {
      if (!liberal && strict && input.slice(tokStart, tokEnd).indexOf("\\") == -1)
        raise(tokStart, "The keyword '" + tokVal + "' is reserved");
      node.name = tokVal;
    } else if (liberal && tokType.keyword) {
      node.name = tokType.keyword;
    } else {
      unexpected();
    }
    tokRegexpAllowed = false;
    next();
    return finishNode(node, "Identifier");
  }

  function parseTuple(noIn, expr) {
    var node = expr ? startNodeFrom(expr) : startNode();
    node.arguments = expr ? [expr] : [];

    // Tuple with single element has special trailing comma: t = 'hi',
    // Look ahead and eat comma in this scenario
    if (tokType === _comma) {
      var oldPos = tokPos; skipSpace();
      var newPos = tokPos; tokPos = oldPos;
      if (newPos >= inputLen || input[newPos] === ';' || input[newPos] === ')' || newline.test(input[newPos]))
        eat(_comma);
    }

    while (eat(_comma)) {
      node.arguments.push(parseExprOps(noIn));
    }
    finishNode(node, "NewExpression");

    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "tuple" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });

    return node;
  }


  // ## Python runtime library

  var pythonRuntime = exports.pythonRuntime = {

    // Shim JavaScript objects that impersonate Python equivalents

    // TODO: use 'type' or isSequence instead of 'instanceof Array' to id these

    internal: {
      // Only used within runtime
      isSeq: function (a) { return a && (a._type === "list" || a._type === "tuple"); },
      slice: function (obj, start, end, step) {
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
          tmp = obj.slice(end + 1, start + 1);
          for (i = tmp.length - 1; i >= 0; i += step) ret.append(tmp[i]);
        } else {
          tmp = obj.slice(start, end);
          if (step === 1) ret = pythonRuntime.utils.createList(tmp);
          else for (i = 0; i < tmp.length; i += step) ret.append(tmp[i]);
        }
        return ret;
      },
      isJSArray: Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
      }
    },

    utils: {
      convertToDict: function (dict) {
        if (!dict.hasOwnProperty("_type")) {
          Object.defineProperty(dict, "_type",
          {
            get: function () { return 'dict';},
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("_isPython")) {
          Object.defineProperty(dict, "_isPython",
          {
            get: function () { return true; },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("items")) {
          Object.defineProperty(dict, "items",
          {
            value: function () {
              var items = new pythonRuntime.objects.list();
              for (var k in this) items.append(new pythonRuntime.objects.tuple(k, this[k]));
              return items;
            },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("length")) {
          Object.defineProperty(dict, "length",
          {
            get: function () {
              return Object.keys(this).length;
            },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("clear")) {
          Object.defineProperty(dict, "clear",
          {
            value: function () {
              for (var i in this) delete this[i];
            },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("get")) {
          Object.defineProperty(dict, "get",
          {
            value: function (key, def) {
              if (key in this) return this[key];
              else if (def !== undefined) return def;
              return null;
            },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("keys")) {
          Object.defineProperty(dict, "keys",
          {
            value: function () {
              return Object.keys(this);
            },
            enumerable: false
          });
        }
        if (!dict.hasOwnProperty("pop")) {
          Object.defineProperty(dict, "pop",
          {
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
          });
        }
        if (!dict.hasOwnProperty("values")) {
          Object.defineProperty(dict, "values",
          {
            value: function () {
              var values = new pythonRuntime.objects.list();
              for (var key in this) values.append(this[key]);
              return values;
            },
            enumerable: false
          });
        }
      },
      createDict: function () {
        var ret = new pythonRuntime.objects.dict();
        if (arguments.length === 1 && arguments[0] instanceof Object)
          for (var k in arguments[0]) ret[k] = arguments[0][k];
        else
          throw TypeError("createDict expects a single JavaScript object")
        return ret;
      },
      createParamsObj: function () {
        // In: expr, expr, ..., {id:expr, __kwp:true}, {id:expr, __kwp:true}, ...
        // Out: {formals:[expr, expr, ...], keywords:{id:expr, id:expr, ...}}
        var params = { formals: new pythonRuntime.objects.list(), keywords: new pythonRuntime.objects.dict() };
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
        if (!list.hasOwnProperty("_type")) {
          Object.defineProperty(list, "_type",
          {
            get: function () { return 'list'; },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("_isPython")) {
          Object.defineProperty(list, "_isPython",
          {
            get: function () { return true; },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("append")) {
          Object.defineProperty(list, "append",
          {
            value: function (x) {
              this.push(x);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("clear")) {
          Object.defineProperty(list, "clear",
          {
            value: function () {
              this.splice(0, this.length);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("copy")) {
          Object.defineProperty(list, "copy",
          {
            value: function () {
              return this.slice(0);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("count")) {
          Object.defineProperty(list, "count",
          {
            value: function (x) {
              var c = 0;
              for (var i = 0; i < this.length; i++)
                if (this[i] === x) c++;
              return c;
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("equals")) {
          Object.defineProperty(list, "equals",
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
        }
        if (!list.hasOwnProperty("extend")) {
          Object.defineProperty(list, "extend",
          {
            value: function (L) {
              for (var i = 0; i < L.length; i++) this.push(L[i]);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("index")) {
          Object.defineProperty(list, "index",
          {
            value: function (x) {
              return this.indexOf(x);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("indexOf")) {
          Object.defineProperty(list, "indexOf",
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
        }
        if (!list.hasOwnProperty("insert")) {
          Object.defineProperty(list, "insert",
          {
            value: function (i, x) {
              this.splice(i, 0, x);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("pop")) {
          Object.defineProperty(list, "pop",
          {
            value: function (i) {
              if (!i)
                i = this.length - 1;
              var item = this[i];
              this.splice(i, 1);
              return item;
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("_pySlice")) {
          Object.defineProperty(list, "_pySlice",
          {
            value: function (start, end, step) {
              return pythonRuntime.internal.slice(this, start, end, step);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("remove")) {
          Object.defineProperty(list, "remove",
          {
            value: function (x) {
              this.splice(this.indexOf(x), 1);
            },
            enumerable: false
          });
        }
        if (!list.hasOwnProperty("sort")) {
          Object.defineProperty(list, "sort",
          {
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
          });
        }
        if (!list.hasOwnProperty("toString")) {
          Object.defineProperty(list, "toString",
          {
            value: function () {
              return '[' + this.join(', ') + ']';
            },
            enumerable: false
          });
        }
      },
      createList: function () {
        var ret = new pythonRuntime.objects.list();
        if (arguments.length === 1 && arguments[0] instanceof Array)
          for (var i in arguments[0]) ret.push(arguments[0][i]);
        else
          for (var i in arguments) ret.push(arguments[i]);
        return ret;
      }
    },

    ops: {
      add: function (a, b) {
        if (pythonRuntime.internal.isSeq(a) && pythonRuntime.internal.isSeq(b)) {
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
        if (pythonRuntime.internal.isSeq(a) && !isNaN(parseInt(b))) {
          var ret;
          if (a._type === 'list') ret = new pythonRuntime.objects.list();
          else if (a._type === 'tuple') ret = new pythonRuntime.objects.tuple();
          if (ret) {
            for (var i = 0; i < b; i++)
              for (var j = 0; j < a.length; j++) ret.push(a[j]);
            return ret;
          }
        }
        else if (pythonRuntime.internal.isSeq(b) && !isNaN(parseInt(a))) {
          var ret;
          if (b._type === 'list') ret = new pythonRuntime.objects.list();
          else if (b._type === 'tuple') ret = new pythonRuntime.objects.tuple();
          if (ret) {
            for (var i = 0; i < a; i++)
              for (var j = 0; j < b.length; j++) ret.push(b[j]);
            return ret;
          }
        }
        return a * b;
      },
      subscriptIndex: function (o, i) {
        if (pythonRuntime.internal.isSeq(o) && i < 0) return o.length + i;
        if (pythonRuntime.internal.isJSArray(o) && i < 0 ) return o.length + i;
        if ( typeof o === "string" && i < 0 ) return o.length + i;
        return i;
      }
    },

    objects: {
      dict: function () {
        var obj = {};
        for (var i in arguments) obj[arguments[i][0]] = arguments[i][1];
        pythonRuntime.utils.convertToDict(obj);
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
        var r = new pythonRuntime.objects.list();
        if (start < stop && step > 0 || start > stop && step < 0) {
          var i = start;
          while (i < stop && step > 0 || i > stop && step < 0) {
            r.append(i);
            i += step;
          }
        }
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
});

},{}],2:[function(require,module,exports){
// Filbert: Loose parser
//
// This module provides an alternative parser (`parse_dammit`) that
// exposes that same interface as `parse`, but will try to parse
// anything as Python, repairing syntax errors the best it can.
// There are circumstances in which it will raise an error and give
// up, but they are very rare. The resulting AST will be a mostly
// valid JavaScript AST (as per the [Mozilla parser API][api], except
// that:
//
// - Return outside functions is allowed
//
// - Bogus Identifier nodes with a name of `"✖"` are inserted whenever
//   the parser got too confused to return anything meaningful.
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
//
// The expected use for this is to *first* try `filbert.parse`, and only
// if that fails switch to `parse_dammit`. The loose parser might
// parse badly indented code incorrectly, so **don't** use it as
// your default parser.
//
// Quite a lot of filbert.js is duplicated here. The alternative was to
// add a *lot* of extra cruft to that file, making it less readable
// and slower. Copying and editing the code allowed invasive changes and 
// simplifications without creating a complicated tangle.

(function(root, mod) {
  if (typeof exports == "object" && typeof module == "object") return mod(exports, require("./filbert")); // CommonJS
  if (typeof define == "function" && define.amd) return define(["exports", "./filbert_loose"], mod); // AMD
  mod(root.filbert_loose || (root.filbert_loose = {}), root.filbert); // Plain browser env
})(this, function(exports, filbert) {
  "use strict";

  var tt = filbert.tokTypes;
  var scope = filbert.scope;
  var indentHist = filbert.indentHist;

  var options, input, inputLen, fetchToken, nc;

  exports.parse_dammit = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    if (!options.tabSize) options.tabSize = 4;
    fetchToken = filbert.tokenize(inpt, options);
    ahead.length = 0;
    newAstIdCount = 0;
    scope.init();
    nc = filbert.getNodeCreator(startNode, startNodeFrom, finishNode, unpackTuple);
    next();
    return parseTopLevel();
  };

  function setOptions(opts) {
    options = opts || {};
    for (var opt in filbert.defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
      options[opt] = filbert.defaultOptions[opt];
    sourceFile = options.sourceFile || null;
  }

  var lastEnd, token = {start: 0, end: 0}, ahead = [];
  var lastEndLoc, sourceFile;

  var newAstIdCount = 0;

  function next() {
    lastEnd = token.end;
    if (options.locations) lastEndLoc = token.endLoc;

    if (ahead.length) token = ahead.shift();
    else token = readToken();
  }

  function readToken() {
    for (;;) {
      try {
        return fetchToken();
      } catch(e) {
        if (!(e instanceof SyntaxError)) throw e;

        // Try to skip some text, based on the error message, and then continue
        var msg = e.message, pos = e.raisedAt, replace = true;
        if (/unterminated/i.test(msg)) {
          pos = lineEnd(e.pos);
          if (/string/.test(msg)) {
            replace = {start: e.pos, end: pos, type: tt.string, value: input.slice(e.pos + 1, pos)};
          } else if (/regular expr/i.test(msg)) {
            var re = input.slice(e.pos, pos);
            try { re = new RegExp(re); } catch(e) {}
            replace = {start: e.pos, end: pos, type: tt.regexp, value: re};
          } else {
            replace = false;
          }
        } else if (/invalid (unicode|regexp|number)|expecting unicode|octal literal|is reserved|directly after number/i.test(msg)) {
          while (pos < input.length && !isSpace(input.charCodeAt(pos)) && !isNewline(input.charCodeAt(pos))) ++pos;
        } else if (/character escape|expected hexadecimal/i.test(msg)) {
          while (pos < input.length) {
            var ch = input.charCodeAt(pos++);
            if (ch === 34 || ch === 39 || isNewline(ch)) break;
          }
        } else if (/unexpected character/i.test(msg)) {
          pos++;
          replace = false;
        } else if (/regular expression/i.test(msg)) {
          replace = true;
        } else {
          throw e;
        }
        resetTo(pos);
        if (replace === true) replace = {start: pos, end: pos, type: tt.name, value: "✖"};
        if (replace) {
          if (options.locations) {
            replace.startLoc = filbert.getLineInfo(input, replace.start);
            replace.endLoc = filbert.getLineInfo(input, replace.end);
          }
          return replace;
        }
      }
    }
  }

  function resetTo(pos) {
    var ch = input.charAt(pos - 1);
    var reAllowed = !ch || /[\[\{\(,;:?\/*=+\-~!|&%^<>]/.test(ch) ||
      /[enwfd]/.test(ch) && /\b(keywords|case|else|return|throw|new|in|(instance|type)of|delete|void)$/.test(input.slice(pos - 10, pos));
    fetchToken.jumpTo(pos, reAllowed);
  }

  function copyToken(token) {
    var copy = {start: token.start, end: token.end, type: token.type, value: token.value};
    if (options.locations) {
      copy.startLoc = token.startLoc;
      copy.endLoc = token.endLoc;
    }
    return copy;
  }

  function lookAhead(n) {
    // Copy token objects, because fetchToken will overwrite the one
    // it returns, and in this case we still need it
    if (!ahead.length)
      token = copyToken(token);
    while (n > ahead.length)
      ahead.push(copyToken(readToken()));
    return ahead[n-1];
  }

  var newline = /[\n\r\u2028\u2029]/;
  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

  function isNewline(ch) {
    return ch === 10 || ch === 13 || ch === 8232 || ch === 8329;
  }
  
  function isSpace(ch) {
    return ch === 9 || ch === 11 || ch === 12 ||
      ch === 32 || // ' '
      ch === 35 || // '#'
      ch === 160 || // '\xa0'
      ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch));
  }
  
  function lineEnd(pos) {
    while (pos < input.length && !isNewline(input.charCodeAt(pos))) ++pos;
    return pos;
  }

  function skipLine() {
    fetchToken.jumpTo(lineEnd(token.start), false);
  }

  function Node(start) {
    this.type = null;
  }
  Node.prototype = filbert.Node.prototype;

  function SourceLocation(start) {
    this.start = start || token.startLoc || {line: 1, column: 0};
    this.end = null;
    if (sourceFile !== null) this.source = sourceFile;
  }

  function startNode() {
    var node = new Node(token.start);
    if (options.locations)
      node.loc = new SourceLocation();
    if (options.directSourceFile)
      node.sourceFile = options.directSourceFile;
    if (options.ranges)
      node.range = [token.start, 0];
    return node;
  }

  function startNodeFrom(other) {
    var node = new Node(other.start);
    if (options.locations)
      node.loc = new SourceLocation(other.loc.start);
    if (options.ranges)
      node.range = [other.range[0], 0];
    return node;
  }

  function finishNode(node, type) {
    node.type = type;
    if (options.locations)
      node.loc.end = lastEndLoc;
    if (options.ranges)
      node.range[1] = lastEnd;
    return node;
  }

  function getDummyLoc() {
    if (options.locations) {
      var loc = new SourceLocation();
      loc.end = loc.start;
      return loc;
    }
  }

  var dummyCount = 0
  function dummyIdent() {
    var dummy = new Node(token.start);
    dummy.type = "Identifier";
    dummy.end = token.start;
    dummy.name = "dummy" + dummyCount++;
    dummy.loc = getDummyLoc();
    return dummy;
  }
  function isDummy(node) { return node.name && node.name.indexOf("dummy") === 0; }

  function eat(type) {
    if (token.type === type) {
      next();
      return true;
    }
  }

  function expect(type) {
    if (eat(type)) return true;
    if (lookAhead(1).type == type) {
      next(); next();
      return true;
    }
    if (lookAhead(2).type == type) {
      next(); next(); next();
      return true;
    }
  }

  function checkLVal(expr) {
    if (expr.type === "Identifier" || expr.type === "MemberExpression") return expr;
    return dummyIdent();
  }

  // Get args for a new tuple expression

  function getTupleArgs(expr) {
    if (expr.callee && expr.callee.object && expr.callee.object.object &&
      expr.callee.object.object.name === options.runtimeParamName &&
      expr.callee.property && expr.callee.property.name === "tuple")
      return expr.arguments;
    return null;
  }

  // Unpack an lvalue tuple into indivual variable assignments
  // 'arg0, arg1 = right' becomes:
  // var tmp = right
  // arg0 = tmp[0]
  // arg1 = tmp[1]
  // ...

  function unpackTuple(tupleArgs, right) {
    var varStmts = [];

    // var tmp = right

    var tmpId = nc.createNodeSpan(right, right, "Identifier", { name: "__filbertTmp" + newAstIdCount++ });
    var tmpDecl = nc.createVarDeclFromId(right, tmpId, right);
    varStmts.push(tmpDecl);

    // argN = tmp[N]

    if (tupleArgs && tupleArgs.length > 0) {
      for (var i = 0; i < tupleArgs.length; i++) {
        var lval = tupleArgs[i];
        var subTupleArgs = getTupleArgs(lval);
        if (subTupleArgs) {
          var subLit = nc.createNodeSpan(right, right, "Literal", { value: i });
          var subRight = nc.createNodeSpan(right, right, "MemberExpression", { object: tmpId, property: subLit, computed: true });
          var subStmts = unpackTuple(subTupleArgs, subRight);
          for (var j = 0; j < subStmts.length; j++) varStmts.push(subStmts[j]);
        } else {
          checkLVal(lval);
          var indexId = nc.createNodeSpan(right, right, "Literal", { value: i });
          var init = nc.createNodeSpan(right, right, "MemberExpression", { object: tmpId, property: indexId, computed: true });
          if (lval.type === "Identifier" && !scope.exists(lval.name)) {
            scope.addVar(lval.name);
            var varDecl = nc.createVarDeclFromId(lval, lval, init);
            varStmts.push(varDecl);
          }
          else {
            var node = startNodeFrom(lval);
            node.left = lval;
            node.operator = "=";
            node.right = init;
            finishNode(node, "AssignmentExpression");
            varStmts.push(nc.createNodeFrom(node, "ExpressionStatement", { expression: node }));
          }
        }
      }
    }

    return varStmts;
  }

  // ### Statement parsing

  function parseTopLevel() {
    var node = startNode();
    node.body = [];
    while (token.type !== tt.eof) {
      var stmt = parseStatement();
      if (stmt) node.body.push(stmt);
    }
    return finishNode(node, "Program");
  }

  function parseStatement() {
    var starttype = token.type, node = startNode();

    switch (starttype) {

    case tt._break:
      next();
      return finishNode(node, "BreakStatement");

    case tt._continue:
      next();
      return finishNode(node, "ContinueStatement");

    case tt._class:
      next();
      return parseClass(node);

    case tt._def:
      next();
      return parseFunction(node);

    case tt._for:
      next();
      return parseFor(node);

    case tt._from: // Skipping from and import statements for now
      skipLine();
      next();
      return parseStatement();

    case tt._if: case tt._elif:
      next();
      if (token.type === tt.parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      expect(tt.colon);
      node.consequent = parseSuite();
      if (token.type === tt._elif)
        node.alternate = parseStatement();
      else
        node.alternate = eat(tt._else) && eat(tt.colon) ? parseSuite() : null;
      return finishNode(node, "IfStatement");

    case tt._import: // Skipping from and import statements for now
      skipLine();
      next();
      return parseStatement();

    case tt.newline:
      // TODO: parseStatement() should probably eat it's own newline
      next();
      return null;

    case tt._pass:
      next();
      return finishNode(node, "EmptyStatement");

    case tt._return:
      next();
      if (token.type === tt.newline || token.type === tt.eof) node.argument = null;
      else { node.argument = parseExpression(); }
      return finishNode(node, "ReturnStatement"); 

    case tt._while:
      next();
      if (token.type === tt.parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      expect(tt.colon);
      node.body = parseSuite();
      return finishNode(node, "WhileStatement");

    case tt.semi:
      next();
      return finishNode(node, "EmptyStatement");

    case tt.indent:
      // Unexpected indent, let's ignore it
      indentHist.undoIndent();
      next();
      return parseStatement();

    default:
      var expr = parseExpression();
      if (isDummy(expr)) {
        next();
        if (token.type === tt.eof) return finishNode(node, "EmptyStatement");
        return parseStatement();
      } else if (expr.type === "VariableDeclaration" || expr.type === "BlockStatement") {
        return expr;
      } else {
        node.expression = expr;
        return finishNode(node, "ExpressionStatement");
      }
    }
  }

  function parseSuite() {
    var node = startNode();
    node.body = [];
    if (eat(tt.newline)) {
      eat(tt.indent);
      while (!eat(tt.dedent) && token.type !== tt.eof) {
        var stmt = parseStatement();
        if (stmt) node.body.push(stmt);
      }
    } else {
      node.body.push(parseStatement());
      next();
    }
    return finishNode(node, "BlockStatement");
  }

  function parseFor(node) {
    var init = parseExpression(false, true);
    var tupleArgs = getTupleArgs(init);
    if (!tupleArgs) checkLVal(init);
    expect(tt._in);
    var right = parseExpression();
    expect(tt.colon);
    var body = parseSuite();
    finishNode(node, "BlockStatement");
    return nc.createFor(node, init, tupleArgs, right, body);
  }

  // ### Expression parsing

  function parseExpression(noComma, noIn) {
    return parseMaybeAssign(noIn);
  }

  function parseParenExpression() {
    expect(tt.parenL);
    var val = parseExpression();
    expect(tt.parenR);
    return val;
  }

  function parseMaybeAssign(noIn) {
    var left = parseMaybeTuple(noIn);
    if (token.type.isAssign) {
      var tupleArgs = getTupleArgs(left);
      if (tupleArgs) {
        next();
        var right = parseMaybeTuple(noIn);
        var blockNode = startNodeFrom(left);
        blockNode.body = unpackTuple(tupleArgs, right);
        return finishNode(blockNode, "BlockStatement");
      }

      if (scope.isClass()) {
        var thisExpr = nc.createNodeFrom(left, "ThisExpression");
        left = nc.createNodeFrom(left, "MemberExpression", { object: thisExpr, property: left });
      }

      var node = startNodeFrom(left);
      node.operator = token.value;
      node.left = checkLVal(left);
      next();
      node.right = parseMaybeTuple(noIn);

      if (node.operator === '+=' || node.operator === '*=') {
        var right = nc.createNodeSpan(node.right, node.right, "CallExpression");
        right.callee = nc.createNodeOpsCallee(right, node.operator === '+=' ? "add" : "multiply");
        right.arguments = [left, node.right];
        node.right = right;
        node.operator = '=';
      }

      if (left.type === "Identifier" && !scope.exists(left.name)) {
        scope.addVar(left.name);
        return nc.createVarDeclFromId(node.left, node.left, node.right);
      }

      return finishNode(node, "AssignmentExpression");
    }
    return left;
  }

  function parseMaybeTuple(noIn) {
    var expr = parseExprOps(noIn);
    if (token.type === tt.comma) {
      return parseTuple(noIn, expr);
    }
    return expr;
  }

  function parseExprOps(noIn) {
    return parseExprOp(parseMaybeUnary(noIn), -1, noIn);
  }

  function parseExprOp(left, minPrec, noIn) {
    var node, exprNode, right, op = token.type, val = token.value;
    var prec = op === tt._not ? tt._in.prec : op.prec;
    if (op === tt.exponentiation && prec >= minPrec) {
      node = startNodeFrom(left);
      next();
      right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
      exprNode = nc.createNodeMemberCall(node, "Math", "pow", [left, right]);
      return parseExprOp(exprNode, minPrec, noIn);
    } else if (prec != null && (!noIn || op !== tt._in)) {
      if (prec > minPrec) {
        next();
        node = startNodeFrom(left);
        if (op === tt.floorDiv) {
          right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
          finishNode(node);
          var binExpr = nc.createNodeSpan(node, node, "BinaryExpression", { left: left, operator: '/', right: right });
          exprNode = nc.createNodeMemberCall(node, "Math", "floor", [binExpr]);
        } else if (op === tt._in || op === tt._not) {
          if (op === tt._in || eat(tt._in)) {
            right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
            finishNode(node);
            var notLit = nc.createNodeSpan(node, node, "Literal", { value: op === tt._not });
            exprNode = nc.createNodeRuntimeCall(node, 'ops', 'in', [left, right, notLit]);
          } else exprNode = dummyIdent();
        } else if (op === tt.plusMin && val === '+' || op === tt.multiplyModulo && val === '*') {
          node.arguments = [left];
          node.arguments.push(parseExprOp(parseMaybeUnary(noIn), prec, noIn));
          finishNode(node, "CallExpression");
          node.callee = nc.createNodeOpsCallee(node, op === tt.plusMin ? "add" : "multiply");
          exprNode = node;
        } else {
          if (op === tt._is) {
            if (eat(tt._not)) node.operator = "!==";
            else node.operator = "===";
          } else node.operator = op.rep != null ? op.rep : val;

          // Accept '===' as '=='
          if (input[token.start - 1] === '=' && input[token.start - 2] === '=') next();

          node.left = left;
          node.right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
          exprNode = finishNode(node, (op === tt._or || op === tt._and) ? "LogicalExpression" : "BinaryExpression");
        }
        return parseExprOp(exprNode, minPrec, noIn);
      }
    }
    return left;
  }

  function parseMaybeUnary(noIn) {
    if (token.type.prefix || token.type === tt.plusMin) {
      var prec = token.type === tt.plusMin ? tt.posNegNot.prec : token.type.prec;
      var node = startNode();
      node.operator = token.type.rep != null ? token.type.rep : token.value;
      node.prefix = true;
      next();
      node.argument = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
      return finishNode(node, "UnaryExpression");
    }
    return parseSubscripts(parseExprAtom(), false);
  }

  function parseSubscripts(base, noCalls) {
    var node = startNodeFrom(base);
    if (eat(tt.dot)) {
      var id = parseIdent(true);
      if (filbert.pythonRuntime.imports[base.name] && filbert.pythonRuntime.imports[base.name][id.name]) {
        // Calling a Python import function
        var runtimeId = nc.createNodeSpan(base, base, "Identifier", { name: options.runtimeParamName });
        var importsId = nc.createNodeSpan(base, base, "Identifier", { name: "imports" });
        var runtimeMember = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeId, property: importsId, computed: false });
        node.object = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeMember, property: base, computed: false });
      } else if (base.name && base.name === scope.getThisReplace()) {
        node.object = nc.createNodeSpan(base, base, "ThisExpression");
      } else node.object = base;
      node.property = id;
      node.computed = false;
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (eat(tt.bracketL)) {
      var expr, isSlice = false;
      if (eat(tt.colon)) isSlice = true;
      else expr = parseExpression();
      if (!isSlice && eat(tt.colon)) isSlice = true;
      if (isSlice) return parseSlice(node, base, expr, noCalls);
      var subscriptCall = nc.createNodeSpan(expr, expr, "CallExpression");
      subscriptCall.callee = nc.createNodeOpsCallee(expr, "subscriptIndex");
      subscriptCall.arguments = [base, expr];
      node.object = base;
      node.property = subscriptCall;
      node.computed = true;
      expect(tt.bracketR);
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (!noCalls && eat(tt.parenL)) {
      if (scope.isUserFunction(base.name)) {
        // Unpack parameters into JavaScript-friendly parameters, further processed at runtime
        var createParamsCall = nc.createNodeRuntimeCall(node, 'utils', 'createParamsObj', parseParamsList());
        node.arguments = [createParamsCall];
      } else node.arguments = parseExprList(tt.parenR, false);
      
      if (scope.isNewObj(base.name)) finishNode(node, "NewExpression");
      else finishNode(node, "CallExpression");
      if (filbert.pythonRuntime.functions[base.name]) {
        // Calling a Python built-in function
        var runtimeId = nc.createNodeSpan(base, base, "Identifier", { name: options.runtimeParamName });
        var functionsId = nc.createNodeSpan(base, base, "Identifier", { name: "functions" });
        var runtimeMember = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeId, property: functionsId, computed: false });
        node.callee = nc.createNodeSpan(base, base, "MemberExpression", { object: runtimeMember, property: base, computed: false });
      } else node.callee = base;
      return parseSubscripts(node, noCalls);
    }
    return base;
  }

  function parseSlice(node, base, start, noCalls) {
    var end, step;
    if (!start) start = nc.createNodeFrom(node, "Literal", { value: null });
    if (token.type === tt.bracketR || eat(tt.colon)) {
      end = nc.createNodeFrom(node, "Literal", { value: null });
    } else {
      end = parseExpression();
      if (token.type !== tt.bracketR) expect(tt.colon);
    }
    if (token.type === tt.bracketR) step = nc.createNodeFrom(node, "Literal", { value: null });
    else step = parseExpression();
    expect(tt.bracketR);

    node.arguments = [start, end, step];
    var sliceId = nc.createNodeFrom(base, "Identifier", { name: "_pySlice" });
    var memberExpr = nc.createNodeSpan(base, base, "MemberExpression", { object: base, property: sliceId, computed: false });
    node.callee = memberExpr;
    return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
  }

  function parseExprAtom() {
    switch (token.type) {

    case tt._dict:
      next();
      return parseDict(tt.parenR);

    case tt.name:
      return parseIdent();

    case tt.num: case tt.string: case tt.regexp:
      var node = startNode();
      node.value = token.value;
      node.raw = input.slice(token.start, token.end);
      next();
      return finishNode(node, "Literal");

    case tt._None: case tt._True: case tt._False:
      var node = startNode();
      node.value = token.type.atomValue;
      node.raw = token.type.keyword;
      next();
      return finishNode(node, "Literal");

    case tt.parenL:
      var tokStartLoc1 = token.startLoc, tokStart1 = token.start;
      next();
      if (token.type === tt.parenR) {
        var node = parseTuple(true);
        eat(tt.parenR);
        return node;
      }
      var val = parseMaybeTuple(true);
      if (options.locations) {
        val.loc.start = tokStartLoc1;
        val.loc.end = token.endLoc;
      }
      if (options.ranges)
        val.range = [tokStart1, token.end];
      expect(tt.parenR);
      return val;

    case tt.bracketL:
      return parseList();

    case tt.braceL:
      return parseDict(tt.braceR);

    default:
      return dummyIdent();
    }
  }

  // Parse list

  // Custom list object is used to simulate native Python list
  // E.g. Python '[]' becomes JavaScript 'new __pythonRuntime.objects.list();'
  // If list comprehension, build something like this:
  //(function() {
  //  var _list = [];
  //  ...
  //  _list.push(expr);
  //  return _list;
  //}());

  function parseList() {
    var node = startNode();
    node.arguments = [];
    next();

    if (!eat(tt.bracketR)) {
      var expr = parseExprOps(false);
      if (token.type === tt._for || token.type === tt._if) {

        // List comprehension
        var tmpVarSuffix = newAstIdCount++;
        expr = nc.createListCompPush(expr, tmpVarSuffix);
        var body = parseCompIter(expr, true);
        finishNode(node);
        return nc.createListCompIife(node, body, tmpVarSuffix);

      } else if (eat(tt.comma)) {
        node.arguments = [expr].concat(parseExprList(tt.bracketR, true, false));
      }
      else {
        expect(tt.bracketR);
        node.arguments = [expr];
      }
    }

    finishNode(node, "NewExpression");
    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "list" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });
    return node;
  }

  // Parse a comp_iter from Python language grammar
  // 'expr' is the body to be used after unrolling the ifs and fors

  function parseCompIter(expr, first) {
    if (first && token.type !== tt._for) return dummyIdent();
    if (eat(tt.bracketR)) return expr;
    var node = startNode();
    if (eat(tt._for)) {
      var init = parseExpression(false, true);
      var tupleArgs = getTupleArgs(init);
      if (!tupleArgs) checkLVal(init);
      expect(tt._in);
      var right = parseExpression();
      var body = parseCompIter(expr, false);
      var block = nc.createNodeSpan(body, body, "BlockStatement", { body: [body] });
      finishNode(node, "BlockStatement");
      return nc.createFor(node, init, tupleArgs, right, block);
    } else if (eat(tt._if)) {
      if (token.type === tt.parenL) node.test = parseParenExpression();
      else node.test = parseExpression();
      node.consequent = parseCompIter(expr, false);
      return finishNode(node, "IfStatement");
    } else return dummyIdent();
  }

  // Parse class

  function parseClass(ctorNode) {
    // Container for class constructor and prototype functions
    var container = startNodeFrom(ctorNode);
    container.body = [];

    // Parse class signature
    ctorNode.id = parseIdent();
    ctorNode.params = [];
    var classParams = [];
    if (eat(tt.parenL)) {
      var first = true;
      while (!eat(tt.parenR) && token.type !== tt.eof) {
        if (!first) expect(tt.comma); else first = false;
        classParams.push(parseIdent());
      }
    }
    expect(tt.colon);

    // Start new namespace for class body
    scope.startClass(ctorNode.id.name);

    // Save a reference for source ranges
    var classBodyRefNode = finishNode(startNode());

    // Parse class body
    var classBlock = parseSuite();

    // Generate additional AST to implement class
    var classStmt = nc.createClass(container, ctorNode, classParams, classBodyRefNode, classBlock);

    scope.end();

    return classStmt;
  }

  // Parse dictionary
  // Custom dict object used to simulate native Python dict
  // E.g. "{'k1':'v1', 'k2':'v2'}" becomes "new __pythonRuntime.objects.dict(['k1', 'v1'], ['k2', 'v2']);"

  function parseDict(tokClose) {
    var node = startNode(), first = true, key, value;
    node.arguments = [];
    next();
    while (!eat(tokClose) && !eat(tt.newline) && token.type !== tt.eof) {
      if (!first) {
        expect(tt.comma);
      } else first = false;

      if (tokClose === tt.braceR) {
        key = parsePropertyName();
        expect(tt.colon);
        value = parseExprOps(false);
      } else if (tokClose === tt.parenR) {
        var keyId = parseIdent(true);
        key = startNodeFrom(keyId);
        key.value = keyId.name;
        finishNode(key, "Literal");
        expect(tt.eq);
        value = parseExprOps(false);
      }
      node.arguments.push(nc.createNodeSpan(key, value, "ArrayExpression", { elements: [key, value] }));
    }
    finishNode(node, "NewExpression");

    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "dict" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });

    return node;
  }

  function parsePropertyName() {
    if (token.type === tt.num || token.type === tt.string) return parseExprAtom();
    if (token.type === tt.name || token.type.keyword) return parseIdent();
  }

  function parseIdent() {
    var node = startNode();
    node.name = token.type === tt.name ? token.value : token.type.keyword;
    if (!node.name) node = dummyIdent();
    next();
    return finishNode(node, "Identifier");
  }

  function parseFunction(node) {
    var suffix = newAstIdCount++;
    node.id = parseIdent();
    node.params = [];

    // Parse parameters

    var formals = [];     // In order, maybe with default value
    var argsId = null;    // *args
    var kwargsId = null;  // **kwargs
    var first = true;
    expect(tt.parenL);
    while (!eat(tt.parenR) && token.type !== tt.eof) {
      if (!first) expect(tt.comma); else first = false;
      if (token.value === '*') {
        next(); argsId = parseIdent();
      } else if (token.value === '**') {
        next(); kwargsId = parseIdent();
      } else {
        var paramId = parseIdent();
        if (eat(tt.eq))
          formals.push({ id: paramId, expr: parseExprOps(false) });
        else
          formals.push({ id: paramId, expr: null });
      }
    }
    expect(tt.colon);

    scope.startFn(node.id.name);

    // If class method, remove class instance var from params and save for 'this' replacement
    if (scope.isParentClass()) {
      var selfId = formals.shift();
      scope.setThisReplace(selfId.id.name);
    }

    var body = parseSuite();
    node.body = nc.createNodeSpan(body, body, "BlockStatement", { body: [] });

    // Add runtime parameter processing

    if (formals.length > 0 || argsId || kwargsId) {
      node.body.body.push(nc.createNodeParamsCheck(node.id, suffix));
      node.body.body.push(nc.createVarDeclFromId(node.id,
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: '__formalsIndex' + suffix }),
        nc.createNodeSpan(node.id, node.id, "Literal", { value: 0 })));
      node.body.body.push(nc.createVarDeclFromId(node.id,
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: '__args' + suffix }),
        nc.createNodeSpan(node.id, node.id, "Identifier", { name: 'arguments' })));
    }
    if (formals.length > 0) {
      node.body.body.push(nc.createNodeGetParamFn(node.id, suffix));
      for (var i = 0; i < formals.length; i++) {
        var __getParamCall = nc.createNodeSpan(formals[i].id, formals[i].id, "CallExpression", {
          callee: nc.createNodeSpan(formals[i].id, formals[i].id, "Identifier", { name: '__getParam' + suffix }),
          arguments: [nc.createNodeSpan(formals[i].id, formals[i].id, "Literal", { value: formals[i].id.name })]
        });
        if (formals[i].expr) __getParamCall.arguments.push(formals[i].expr);
        node.body.body.push(nc.createVarDeclFromId(formals[i].id, formals[i].id, __getParamCall));
      }
    }
    var refNode = argsId || kwargsId;
    if (refNode) {
      if (argsId) {
        var argsAssign = nc.createVarDeclFromId(argsId, argsId, nc.createNodeSpan(argsId, argsId, "ArrayExpression", { elements: [] }));
        node.body.body.push(argsAssign);
      }
      if (kwargsId) {
        var kwargsAssign = nc.createVarDeclFromId(kwargsId, kwargsId, nc.createNodeSpan(kwargsId, kwargsId, "ObjectExpression", { properties: [] }));
        node.body.body.push(kwargsAssign);
      }
      var argsIf = nc.createNodeSpan(refNode, refNode, "IfStatement", {
        test: nc.createNodeSpan(refNode, refNode, "Identifier", { name: '__params' + suffix }),
        consequent: nc.createNodeSpan(refNode, refNode, "BlockStatement", { body: [] })
      })
      if (argsId) {
        argsIf.consequent.body.push(nc.createNodeArgsWhileConsequent(argsId, suffix));
        argsIf.alternate = nc.createNodeArgsAlternate(argsId);
      }
      if (kwargsId) {
        argsIf.consequent.body.push(nc.createNodeSpan(kwargsId, kwargsId, "ExpressionStatement", {
          expression: nc.createNodeSpan(kwargsId, kwargsId, "AssignmentExpression", {
            operator: '=', left: kwargsId, right: nc.createNodeMembIds(kwargsId, '__params' + suffix, 'keywords'),
          })
        }));
      }
      node.body.body.push(argsIf);
    }
    node.body.body.push(nc.createNodeFnBodyIife(body));

    // If class method, replace with prototype function literals
    var retNode;
    if (scope.isParentClass()) {
      finishNode(node);
      var classId = nc.createNodeSpan(node, node, "Identifier", { name: scope.getParentClassName() });
      var prototypeId = nc.createNodeSpan(node, node, "Identifier", { name: "prototype" });
      var functionId = node.id;
      var prototypeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: classId, property: prototypeId, computed: false });
      var functionMember = nc.createNodeSpan(node, node, "MemberExpression", { object: prototypeMember, property: functionId, computed: false });
      var functionExpr = nc.createNodeSpan(node, node, "FunctionExpression", { body: node.body, params: node.params });
      var assignExpr = nc.createNodeSpan(node, node, "AssignmentExpression", { left: functionMember, operator: "=", right: functionExpr });
      retNode = nc.createNodeSpan(node, node, "ExpressionStatement", { expression: assignExpr });
    } else retNode = finishNode(node, "FunctionDeclaration");

    scope.end();

    return retNode;
  }

  function parseExprList(close) {
    var elts = [];
    while (!eat(close) && !eat(tt.newline) && token.type !== tt.eof) {
      var elt = parseExprOps(false);
      if (isDummy(elt)) {
        next();
      } else {
        elts.push(elt);
      }
      while (eat(tt.comma)) {}
    }
    return elts;
  }

  function parseParamsList() {
    var elts = [], first = true;
    while (!eat(tt.parenR) && !eat(tt.newline) && token.type !== tt.eof) {
      if (!first) expect(tt.comma);
      else first = false;
      var expr = parseExprOps(false);
      if (eat(tt.eq)) {
        var right = parseExprOps(false);
        var kwId = nc.createNodeSpan(expr, right, "Identifier", { name: "__kwp" });
        var kwLit = nc.createNodeSpan(expr, right, "Literal", { value: true });
        var left = nc.createNodeSpan(expr, right, "ObjectExpression", { properties: [] });
        left.properties.push({ type: "Property", key: expr, value: right, kind: "init" });
        left.properties.push({ type: "Property", key: kwId, value: kwLit, kind: "init" });
        expr = left;
      }
      elts.push(expr);
    }
    return elts;
  }

  function parseTuple(noIn, expr) {
    var node = expr ? startNodeFrom(expr) : startNode();
    node.arguments = expr ? [expr] : [];

    // Tuple with single element has special trailing comma: t = 'hi',
    // Look ahead and eat comma in this scenario
    if (token.type === tt.comma) {
      var pos = token.start + 1;
      while (isSpace(input.charCodeAt(pos))) ++pos;
      if (pos >= inputLen || input[pos] === ';' || input[pos] === ')' || isNewline(input.charCodeAt(pos)))
        eat(tt.comma);
    }

    while (eat(tt.comma)) {
      node.arguments.push(parseExprOps(noIn));
    }
    finishNode(node, "NewExpression");

    var runtimeId = nc.createNodeSpan(node, node, "Identifier", { name: options.runtimeParamName });
    var objectsId = nc.createNodeSpan(node, node, "Identifier", { name: "objects" });
    var runtimeMember = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeId, property: objectsId, computed: false });
    var listId = nc.createNodeSpan(node, node, "Identifier", { name: "tuple" });
    node.callee = nc.createNodeSpan(node, node, "MemberExpression", { object: runtimeMember, property: listId, computed: false });

    return node;
  }
});

},{"./filbert":1}],3:[function(require,module,exports){
window.aetherFilbert = require('filbert');
window.aetherFilbertLoose = require('filbert/filbert_loose');

},{"filbert":1,"filbert/filbert_loose":2}]},{},[3]);