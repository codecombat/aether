(function() {
  console.log("hi");

}).call(this);

(function() {
  window.helloWorld = function() {
    return "Hello World";
  };

}).call(this);
