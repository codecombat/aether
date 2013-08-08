(function() {
  var validation,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  module.exports = validation = {
    checkOptions: function(options) {
      var allowedLanguages, _ref;
      allowedLanguages = ["javascript"];
      if (options.language && (_ref = options.language, __indexOf.call(allowedLanguages, _ref) < 0)) {
        throw new Error("Language specified in options is not allowed");
      }
    }
  };

}).call(this);
