![aether logo](http://i.imgur.com/uf36eRD.jpg)
======
[![Build Status](https://travis-ci.org/nwinter/aether.png)](https://travis-ci.org/nwinter/aether)

## Purpose
Aether aims to make it easy for people to learn and write JavaScript and CoffeeScript by helping them catch and fix bugs, 
letting them see and more easily understand the execution of their program [(like Brett Victor commanded!)](http://youtu.be/PUv66718DII?t=17m25s), 
and giving them tips on how they can improve their code. [CodeCombat](http://codecombat.com/) is behind it.

## Get in touch
You can use the [GitHub issues](https://github.com/nwinter/aether/issues), the [Discourse forum](http://discourse.codecombat.com/), the [Google Group](https://groups.google.com/forum/#!forum/aether-dev), the [HipChat](http://www.hipchat.com/g3plnOKqa), or [email](mailto:nick@codecombat.com) [Nick](http://www.nickwinter.net/).

## What is it?
It's a JavaScript library (written in CoffeeScript) that takes user code as input; does computer-sciencey transpilation things to it with the help of [JSHint](http://jshint.com/), [Esprima](http://esprima.org/), [JS_WALA](https://github.com/wala/JS_WALA), [escodegen](https://github.com/Constellation/escodegen), and [traceur](https://github.com/google/traceur-compiler); and gives you:

1. *incomplete* **Linting** with totally configurable error/warning/info messages. Instead of `"Warning: Line 2: Missing semicolon."`, you could make Aether say, `"Error: You need a semicolon here on line 2 after 'this.explode()' to end the statement."`, or `"fyi: might want a ; here amiga"`, or nothing at all. Aether does spellchecking based on what properties should exist, too: `Should be 'destroy', not 'destory'.`

1. *incomplete* **Transformation** like with [node-falafel](https://github.com/substack/node-falafel), but even easier, because your source transformation plugins can run either before or after the [AST](http://en.wikipedia.org/wiki/Abstract_syntax_tree) is normalized with [JS_WALA](https://github.com/wala/JS_WALA).

1. *incomplete* **Sandboxing** so that you can actually run user code in the browser without worrying if the world will end. Well, not actually. [That](http://www.adsafe.org/) is [hard](http://seclab.stanford.edu/websec/jsPapers/w2sp.pdf); one should at least use a web worker. But good enough to foil most hacking attempts.

1. *planned* **Instrumentation** so that when the code is run, you'll know everything that happened. Count statements executed, step through the flow of execution, retrieve past variable states, and even pause and resume execution whenever you want. Pause after every statement? Sure!

1. *planned* **Style analysis**: metrics on things like what kind of indentation and bracket style the code uses, whether it uses recursion or regular expressions, etc.

1. *planned* **Autocompletion** suggestions based on unfinished code.

1. *planned* **Visualization** of the program's execution. (Well, maybe. We haven't started that part yet; we might not do it.)

1. *planned* **Other goodies**! You can let your users code in [ES6](http://www.slideshare.net/domenicdenicola/es6-the-awesome-parts) now and hopefully [CoffeeScript](https://github.com/michaelficarra/CoffeeScriptRedux) soon.

### Development Status
Pre-alpha! Watch out! We've converted the dev version of [CodeCombat](http://codecombat.com/) to use it, but there are many bugs and missing pieces. If you'd be interested in Aether were it solid and finished, *please* tell us so we can get an idea of where else it might be useful and how it should work.

### How to Use It
In the browser, grab [build/aether.js](https://github.com/nwinter/aether/blob/master/build/aether.js) or [build/aether.min.js](https://github.com/nwinter/aether/blob/master/build/aether.min.js). Or in node, add `"aether": "https://github.com/nwinter/aether/tarball/master"` to your `dependencies` in `package.json` and then `npm install`. (This may not work yet.) Then, in your code:

```javascript
var Aether = require('aether');  // It's a node/browserify module, so use node-style CommonJS requires: http://addyosmani.com/writing-modular-js/
var aether = new Aether();
aether.lint(someGnarlyUserCode);
aether.problems.warnings;
    [{ranges: [[[15, 15], [15, 22]]], id: 'aether_MissingThis', message: 'Missing `this.` keyword; should be `this.getEnemies`.' hint: 'There is no function `getEnemys`, but `this` has a method `getEnemies`.', level: "warning"}]
aether.transpile(someGnarlyUserCode);
var gnarlyFunc = aether.createFunction();
gnarlyFunc();
// At any point, you can check aether.problems, aether.style, aether.flow, aether.metrics, etc.
// See more examples in the tests: https://github.com/nwinter/aether/tree/master/test
// Or planned examples in the plan: https://github.com/nwinter/aether/blob/master/plan.md
```

In the browser, it currently depends on [lodash](http://lodash.com/) or [underscore](http://underscorejs.org/). We test in Chrome and node, and it will probably work in other modern browsers.

## Functionality
Because we're developing exploratively, here are some **not-up-to-date** details on what it does and how. See also [plan.md](https://github.com/nwinter/aether/blob/master/plan.md) for also outdated sample-code brainstorming on the API.

### Compilation
Aether can determine whether a given piece of code compiles.
#### Successful Compilation
If compilation is successful, Aether will compare the generated AST to the last AST generated by the user to avoid unnecessary computation.

#### Unsuccessful Compilation
##### Syntax Errors
Aether should return a list of syntax errors and warnings coupled with the line and column information.
##### Additional Errors and Error Modification
Aether should allow custom errors and modification of errors generated by the parser.

For example, spell checking could be ran at compile time (and configured at runtime), and detailed compile errors thrown. 

In addition, validation of method arguments and return values should be performed, catching many imminent runtime errors.

By giving the user more detailed errors than those generated by the parser, a gentler educational experience can be provided.

##### Syntax manipulation
On certain errors, Aether should manipulate the syntax to conform and throw a warning instead. For instance, if the user forgets a "this." while calling a method, it should be corrected, and the user educated about the mistake they made.

### Strict compilation
The code shall be compiled with the "use strict;" option to prevent the user from breaking the code with unsafe actions, such as accessing the global object, as well as catch some runtime errors before they happen.

## Runtime Error Detection
The code should catch common runtime errors as they happen, and instead of crashing, present configurable error messages that match up to the original, not compiled, source code.

### Instrumentation
Aether should provide advanced code instrumentation features. 

#### Performance
Aether should report:
* How many times each function was called
* How many statements were executed
	* Assign a cost to each statement for more detailed performance metrics
* How deeply nested the execution was
* How much time was spent in execution

#### Style
Aether should report:
* SLOC
* Whether the code takes advantage of languages features such as objects, arrays, strings, regex, the Math library, recursion, functions, function passing, loops (including type), classes, etc. to provide a detailed picture of code complexity and style
* The user's style choices such as:
	* The user's variable naming style
	* Bracket positions

#### Flow
Aether should generate all of the info needed to step forwards and backwards (or to an arbitrary point) in code execution

#### Context
Aether should generate the values of any variables accessible to the function for each executed statement, so the user may see and understand how they change through the execution of the program.

### Piecewise Execution
Automatic continuations should be generated so that functions can be branched arbitrarily during execution 

### Sandboxing
Aether should have complete control over the context and scope of code execution to prevent users from hacking out. Ideally, the main thread should be made safe, but if not, web workers should be safe.

#### Infinite Loop Prevention
Aether will terminate execution of code after a configurable amount of statements or execution time. 

#### Read-only objects
Aether will prevent users from making changes to read-only objects in the context.

#### Variable persistence
Aether will preserve local variables and non-read-only changes from execution to execution to enable stepping backwards and forwards, as well as more advanced "undo" features.

### Visualization
A nice feature for Aether would be code visualization, for instance a rendering of the AST in graph form.

### Customizability
Aether will be highly customizable and configurable in order to facilitate use by other projects.

## License
[The MIT License (MIT)](https://github.com/nwinter/aether/blob/master/LICENSE)

We'll probably also have a simple [CLA](http://en.wikipedia.org/wiki/Contributor_License_Agreement) soon because Michael's roommate is a lawyer.