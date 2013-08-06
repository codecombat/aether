(function() {
  var helloWorld;

  helloWorld = require('../helloWorld');

  describe("Hello World", function() {
    return it("says hello", function() {
      return expect(helloWorld()).toEqual("Hello World");
    });
  });

}).call(this);
