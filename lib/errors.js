(function() {
  var UserCodeError,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports.UserCodeError = UserCodeError = (function(_super) {
    __extends(UserCodeError, _super);

    UserCodeError.className = "UserCodeError";

    function UserCodeError(message, properties) {
      var key, val,
        _this = this;
      this.message = message;
      UserCodeError.__super__.constructor.call(this, message);
      for (key in properties) {
        if (!__hasProp.call(properties, key)) continue;
        val = properties[key];
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
            matchScore = string_score.score(commonMethod, method, 0.5);
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
