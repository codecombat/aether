## Sample code

Let me try to write out some code that would use aether so I can get a better sense of how the API would work, which can then inform how the modules should be set up. Here's realistic source code example for `getNearestEnemy` including defining functions, syntax errors, syntax warnings, comments, typos, inconsistent `this` usage, recursion, a loop, bad style, weird indentation, using methods that don't exist, runtime errors, disallowed code, statements that have no effect, incomplete typing, try/catch... more?

```javascript
function distance_squared(from, target) {  // no camelCase
    if(from.pos)
        return distance_squared(from.pos, target);  // |from| as Thang
        if(target.pos)  // weird indentation
            return distance_squared(from, target.pos);  // |target| as Thang
    var dx = target.x - from.x; var dy = target.y - from.y;  // bad style: two statements, one line
    return dx * dx + dy dy;  // syntax error
}

var enemies = getEnemys();  // missing this, also typo in method
var nearestEnemy = null  // missing semicolon
nearestDistance = 9001;  // missing var
for(var enemy in enemies) {  // style: somehow warn user that JS loops don't really work like this on arrays?
//for(var i = 0; i < enemies.length; ++i) {  // (better method of looping an array)
    var enemy = enemies[i];
    var distance = distance_squared(this, enemy);
    if(distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemyy;  // typo in local variable
    }
  // } missing curly brace
this.markForDeath(nearestEnemy);  // no markForDeath method available in this challenge
this.say(nearestEnemy.id, you are going down!);  // missing string quotes, also will have runtime error when nearestEnemy is still null
nearestEnemy.health = -9001;  // disallowed
window.alert("pwn!");  // nope
try {
    this.die();  // die() is not available, but they are going to handle it, so perhaps it shouldn't be an error?
}
catch (error) {
    this.say("Couldn't shuffle mortal coil.");
}
this.  // clearly not done typing
this.explode;  // doesn't do anything because the function isn't called
96;  // no effect
return nearestEnemy;
```

## Configuration

```javascript
// Syntax highlighting won't work for coffeescript, alas

Aether.defaults;
// ->
{
    thisValue: {},
    global: {Math: Math, parseInt: parseInt, parseFloat: parseFloat, eval: eval, isNaN: isNaN, escape: escape, unescape: unescape},  // TOOD: could also do like JSHint and provide easy support for various environments' globals
    executionCosts: {
        Aether.execution.assignment: 2,  // enumerated in Aether.execution? ... somewhere
        Aether.execution.addition: 1,
        Aether.execution.subtraction: 1,
        Aether.execution.multiplication: 3,
        Aether.execution.division: 5,
        // ... many more
    }
    language: "javascript",
    languageVersion: "ES5",
    functionName: "foo",  // in case we need it for error messages
    functionParameters: [],  // or something like ["target"]
    yieldAutomatically: false,  // horrible name... we could have it auto-insert yields after every statement
    yieldConditionally: false,  // also bad name, but what it would do is make it yield whenever this._shouldYield is true (and clear it)
}

Aether.problems.problems;
// ->
{
    // Look at jshint's warnings for many, many ideas: http://jshint.com/docs/options
    // And there are others in the Closure compiler: https://developers.google.com/closure/compiler/docs/error-ref
    // And maybe some more here: https://gist.github.com/textarcana/3375708#file_js_code_sniffs.md
    // More: https://github.com/mdevils/node-jscs/blob/master/lib/checker.js
    // More: https://github.com/nzakas/eslint/tree/master/lib/rules
    
    // TODO: the values here should be something else... since "message" needs to be a function, and what about "hint", etc?
    unknown_Unknown: {message: "Unknown problem.", level: "error"}

    // Errors: things that will error out and thus prevent us from compiling the code (syntax errors, missing variables, typos)
    aether_UnexpectedIdentifier: 'error',
    aether_MissingVarKeyword: 'error',
    aether_UndefinedVariable: 'error',
    aether_MissingThis: 'error',
    // ... many more errors ...
    
    // Warnings: things that we think might cause runtime errors or bugs, but aren't sure (statements that don't do anything, variables which are defined and not used, weird operator precedence issues, etc.)
    aether_NoEffect: 'warning',
    aether_FalseBlockIndentation: 'warning',
    aether_UndefinedProperty: 'warning',
    // ... many more warnings ...
    
    // Info: things that are usually bad code (missing semicolons, bad indentation, multiple statements on a line, for..in loops where we think they're doing arrays, really long lines, bad_case_conventions)
    aether_InconsistentIndentation: 'info',
    aether_SnakeCase: 'info',
    // ... many more infos ...
    
    aether_SingleQuotes: "ignore",
    aether_DoubleQuotes: "ignore"
    aether_CamelCase: 'ignore',
    // ... many more problems ignored by default ...
    
    // Based on Esprima Harmony's error messages, which track V8's
    // https://github.com/ariya/esprima/blob/harmony/esprima.js#L194
    esprima_UnexpectedToken: {message: 'Unexpected token %0', level: "error"}
    esprima_UnexpectedNumber: {message: 'Unexpected number', level: "error"}
    esprima_UnexpectedString: {message: 'Unexpected string', level: "error"}
    // ... many more Esprima problem messages ...
    
    // JSHint's error and warning messages
    // https://github.com/jshint/jshint/blob/master/src/messages.js
    jshint_E001: {message: "Bad option: '{a}'.", level: "error"}
    jshint_E002: {message: "Bad option value.", level: "error"}
    // ... many more JSHint problem messages ...

    // ... ESLint ones...
}


// Example custom analyzer
var infiniteLoopAnalyzer = function() {
    var problems = [];
    for(var statement in this.ast.statements) {  // I don't know
        if(obviouslyInInfiniteLoop(statement))
            problems.push({ranges: [statement.range], id: "custom_InfiniteLoop", message: "That's an infinite loop!", hint: "No way are we falling for that one, Wizard!"});
        if(maybeInInfiniteLoop(statement))
            problems.push({ranges: [statement.range], id: "custom_StrangeLoop", message: "That's a strange loop!", hint: "Are you sure " + statement.source + " will end?"});        
    }
    return problems;
};
infiniteLoopAnalyzer.problems = {
    custom_InfiniteLoop: {level: "warning"},
    custom_StrangeLoop: {level: "info"}
};

// Example configuration of a new Aether instance aether
var options = {
    "this": {pos: <Vector: 15, 30>, health: 15, target: null, say: <function>, explode: <function>, getEnemies: <function>},  // read-only somehow?
    global: _.extend(Aether.defaults.global, {console: _.pick(console, "log")}),  // also read-only
    analyzers: [infiniteLoopAnalyzer],
    problems: {
        aether_UndefinedProperty: {level: 'error'},
        aether_InconsistentIndentation: {level: 'warning'},
        aether_MissingThis: {level: 'warning'},
        aether_NoEffect: {level: 'ignore'},
        custom_InfiniteLoop: {level: "error"},
        custom_StrangeLoop: {level: "warning", message: "Strange loop is strange!!!"}
    },
    executionCosts: {
        Aether.execution.subtraction: 2,
        "getEnemies": 30  // how should we specify costs for custom functions?
    }
    languageVersion: "ES5",
    functionName: "getNearestEnemies",
    yieldConditionally: true
};
aether = new Aether(options);
```

## Transpilation

```javascript
// `raw` is the string containing the code above

// Quick heuristics: can this code be run, or will it produce a compilation error?
aether.canTranspile(raw);  // -> true
aether.canTranspile(raw, true);  // -> false  (more thorough check using linters)

// Barring things like comments and whitespace and such, are the ASTs going to be different? (oldAether being a previously compiled instance)
// TODO: is oldAether the most interesting way to do this, or should the same aether instance be reused somehow?
aether.hasChangedSignificantly(raw, oldAether);  // -> false

// Is the code exactly the same?
aether.hasChanged(raw, oldAether);  // -> true

// Transpile it. Even if it can't transpile, it will give syntax errors and warnings and such.
aether.transpile(raw);

aether.problems.errors;  // I'll pretend that the plan.md line numbers are the actual raw line numbers.
// We couldn't show all of these at one because we'll probably get hung up on missing curly braces or whatever, but eventually as they fixed things they'd see them.
// ->
[
    {ranges: [[[6, 20], [6, 25]]], id: 'aether_UnexpectedIdentifier', message: 'Missing operator or function call between `dy` and `dy`.', hint: 'How does `dy` relate to `dy`? `dy + dy`? `dy(dy)`? Or maybe a string: "dy dy"?', level: "error"},
    {ranges: [[[15, 1], [15, 16]]], id: 'aether_MissingVarKeyword', message: 'Missing `var` keyword when defining near variable `nearestDistance`.', hint: 'Try `var nearestDistance = 9001;`. New variables need the `var` keyword.', level: "error"},
    {ranges: [[[24, 24], [24, 30]]], id: 'aether_UndefinedVariable', message: 'No variable `enemyy`. Did you mean `enemy`?' hint: '`enemyy is not defined yet, so `nearestEnemy = enemyy` would throw an error.', level: "error"},
    {ranges: [[[15, 15], [15, 22]]], id: 'aether_UndefinedProperty', message: 'No method `getEnemyys`. Did you mean `getEnemies`?' hint: '`this` has no method `getEnemys()`, so `this.getEnemys()` would throw an error.', level: "error"}
    // ... many more errors
]

aether.problems.warnings;
// ->
[
    {ranges: [[[4, 4], [4, 8]], [[5, 8], [5, 12]]], id: 'aether_FalseBlockIndentation', message: "Block indentation problem. `if` missing braces { }?", hint: "These lines will not be a part of the `if(from.pos)` condition:\n`if(target.pos)  // weird indentation\n    return distanceSquared(from, target.pos);  // |target| as Thang`", level: "warning"},
    {ranges: [[[15, 15], [15, 22]]], id: 'aether_MissingThis', message: 'Missing `this.` keyword; should be `this.getEnemies`.' hint: 'There is no function `getEnemys`, but `this` has a method `getEnemies`.', level: "warning"}  // ideally this and the Undefined property problem would interact, since it's the one that knows that they mean getEnemies.
    // ... many more warnings
]

aether.problems.info;
// ->
[
    {ranges: [[[6, 10], [6, 25]]], type: 'aether_SnakeCase', message: '`distanceSquared` is better than `distance_squared`.', hint: "JavaScript convention is lower camelCase, not snake_case. (Upper CamelCase for classes.)", level: "info"}
    // ... many more infos
]

// Or, just run the linting without transpiling:
problems = aether.lint(raw);  // problems should be same as above, but not assigned to aether

// Or, to get all the problems flattened (after transpiling):
allProblems = aether.getAllProblems();  // [firstError, secondError, ..., firstWarning, ..., firstInfo, ...]

aether.style;
// -> (after having transpiled)
{
    loc: 35,
    sloc: 28,
    statements: 29,
    score: 0.64,  // or something
    conceptsUsed: {
        recursion: true,
        objects: false,
        arrays: false,
        strings: true,
        Math: false,
        //functions: true,
        anonymousFunctions: false,
        ifStatements: true,
        elseStatements: true,
        switchStatements: false,
        forLoops: true,
        whileLoops: false,
        doWhileLoops: false,
        classes: false,
        regularExpressions: false,
        ternaryOperators: false,
        undefined: false,
        null: false,
        NaN: false
        // ... many more
    },
    identifiers: {
        variableNames: ["dx", "dy", "enemies", "nearestEnemy", "nearestDistance", "enemy"],  // names of variables used, perhaps will contain function parameters, properties of non 'this' objects
        functionNames: ["distance_squared"],  // names of functions used
        propertyNames: []  // properties of 'this' objects
    }
    // what else?
}

aether.raw;  // -> original raw input code
aether.pure;  // -> purified and instrumented code for actually running. Good name?

var serialized = aether.serialize();  // convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such
aether = Aether.deserialize(serialized);  // ... and back
```

## Running

There are two main modes. The first is that we expect to fully execute the method every time it's called. That's relatively easy:

```javascript
// Simplified example--latest version of this is implemented in coco/app/lib/world/systems/programming.coffee
tharin = world.getThangByID("Tharin");
tharin.replaceMethodCode = function(methodName, code) {
    // replaceMethodCode does some extra stuff, whatever
    method = this.programmableMethods[methodName];
    method.source = code;
    var inner = new Function(method.parameters.join(', '), code);
    var outer = function() {
        // I currently have no idea what I'm doing with the createUserContext method.
        // What I need to be able to do is to give the user code an execution context that controls which copies they can read and write.
        // Should this be done in aether or outside of it? How should I be doing it at all?
        var userContext = this.createUserContext();
        
        // Then we call the function with that context and the original arguments, but with error handling.
        try {
            var result = inner.call(userContext, arguments);
        }
        catch(error) {
            this.erroredOut = this.errorsOut = true;
            if(!(error instanceof Aether.errors.UserCodeError))  // If not aready handled in another aetherified method...
                error = world.userCodeMap[methodName].purifyError(error);  // ... then fill in the context and attach to our list of errors.
            if(error.methodName === methodName)
                this.replaceMethodCode(methodName, '');  // from now on, this method will be a no-op
            throw error;  // We'll have to be able serialize this error across a worker
        }
        // Then we update this with any allowed changes they made to the context.
        this.updateFromUserContext(userContext);
        // You can see how all of this currently works in CodeCombat: app/lib/world/systems/programming.coffee.
    }
    this.createMethodChain(methodName).user = outer;  // Pretty much like: this[methodName] = outer
};

tharin.replaceMethodCode("chooseAction", world.userCodeMap['Tharin']['chooseAction'].pure);
tharin.replaceMethodCode("getNearestEnemy", world.userCodeMap['Tharin']['getNearestEnemy'].pure);
for(var frameIndex = 0; frameIndex < world.totalFrames; ++frameIndex) {
    // world does some stuff, whatever
    // at some point on most frames, we will call the aetherified code for chooseAction, which will in turn call that for getNearestEnemy
    if(tharin.canAct())
        tharin.chooseAction();
}
```

But then there's the method where we can run the method in chunks, essentially with coroutines (or continuations, or generators, or what-have-you). There are two ways to do this. The first is to use **yield**, which isn't really implemented yet (it's in the latest node, a different version of it is in Firefox, Esprima can parse it, and there's a recent pull request to CoffeeScript to generate it, but that's about it). The second is to use a shim that simulates it, like Google Traceur (or we could try to roll our own). I'll just imagine that it works in the next example, since that would be oh-so-sweet.

```javascript
var planCode = "
    for(var i = 0; i < 5; ++i)
        this.attack(this.getNearestEnemy());  // attack calls setTarget() and setAction('attack'), here five times
    this.setTargetPos(50, 30);  // Should not trigger a yield
    this.setAction('move');  // Should
    this.jump();  // Also should
    // And now we're done; no more yields
";

tharin.replaceMethodCode("plan", world.userCodeMap['Tharin']['plan'].pure);
tharin.replaceMethodCode("getNearestEnemy", world.userCodeMap['Tharin']['getNearestEnemy'].pure);
for(var frameIndex = 0; frameIndex < world.totalFrames; ++frameIndex) {
    if(tharin.canAct())
        tharin.chooseAction();  // Same as before, but see how chooseAction is implemented below...
}
tharin.chooseAction = function() {
    if(this.planFinished) {
        this.setAction('idle');
        return;
    }
    // Every `setAction()` method call in the user's code should trigger a yield, whereas everything else should run normally
    if(!this.planGenerator)
        this.planGenerator = this.plan();
    var next = this.planGenerator.next();  // This just set the action; cool!
    if(next.done)
        this.planFinished = true;
}
```

Then the open question is, how do we make it so that **aether** inserts yields on all `setAction()` calls, even when they can be nested inside other methods? I can make `setAction()` indicate that the thang wants to yield if the Thang is a planner--that would be outside the **aether** code, but **aether** could have an optional configuration for checking the execution context (this) after every statement to see if it should yield. Yeah, that oughtta do it:

```javascript
function setAction(action) {
    this.action = action;
    if(this.plan)
        this._shouldYield = true;
}
```

## Runtime Errors

Ideally runtime errors have the same interface as transpile errors. The World generation error handler could catch the UserCodeErrors generated above. When an Aether instance creates a UserCodeError, it adds it to its list of errors, so to grab all the errors, we just go through each Aether instance and get the error list--which will, I think, always just have zero or one error in each of the aethers for our purposes, since we don't continue to run the aetherified code after an error. But other people might run it more than once.

Each error should also contain the callNumber and statementNumber for when it happened, as well as preserving the userInfo of any errors that were passed into the UserCodeError.

Note: the error handling is still in flux, but I'm thinking of having Aether.problems.UserCodeProblem (which would easily serialize to the static analysis error objects seen above), and also Aether.problems.RuntimeError, which would inherit from UserCodeProblem and add things like callNumber, statementNumber, and userInfo.

```javascript
var serialized = world.serialize();  // also serializes all the aethers in the userCodeMap, which serializes their errors
// ... web worker transfer
var world = World.deserialize(serialized);  // and we're back

var allErrors = [];
for(var thangID in world.userCodeMap)
    for(var methodName in world.userCodeMap[thangID]) {
        var aether = world.userCodeMap[thangID][methodName];
        allErrors.push(aether.errors...);
    }
allErrors;
// ->
[
    {ranges: [[[22, 1], [22, 13]], [[15, 1], [15, 18]], [[18, 1], [18, 14]]], id: 'ArgumentError', message: '`getNearestEnemy()` should return a `Thang` or `null`, not a string (`"Goreball"`).', hint: 'You returned `nearestEnemy`, which had value `"Goreball"`. Check lines 15 and 18 for mistakes setting `nearestEnemy`.', level: "error", callNumber: 118, statementNumber: 25, userInfo: {frameNumber: 25} }
]
```

Okay, but how did we define the return type validation and custom error message generation so that **aether** knew what to do? ... maybe we used JSDoc comments if we wanted that.


## Flow Analysis

What I mean is that after it has run, we'll want to be able to look at the metrics (statements executed, runtime, etc.) and also to be able to ask it what all the state was for a particular run during a particular statement (so we can step through and show values and such).

```javascript
var aether = world.userCodeMap['Tharin']['getNearestEnemy'];
// We already checked the errors; now let's check the metrics, then we'll look at the state.

// TODO: need better names for all of these
aether.metrics;
// ->
{
    timesExecuted: 60,
    statementsExecuted: 1459,
    timeSpent: 4.253, // time in ms
    executionCost: 2329, // some statements cost more than 1
    maxDepth: 4 // 4 nested levels deep
}

// Now, for watching the state... I guess we'll have something like this, but actually efficient
for(var callNumber in aether.flow.states) {
    var callState = aether.flow.states[callNumber];
    for(var statementNumber in callStates) {
        var state = callStates[statementNumber];
        state; // -> example state below (inside the for-loop)
        // TODO: how do we indicate nested, shadowed variables' values? Or do we use ranges as keys, rather than the original variable names?
        {
            executionRange: [[23, 9], [23, 36]],
            variables: {
                "this": {/*... object containg all the accessible properties and their values, or maybe in our case, we replace it with the full Thang values?*/},
                "distanceSquared": {type: 'function', value: "<function>"},
                "enemies": {type: 'array', value: ["Brack", "Grul'thock", "Weeb"]},
                "nearestEnemy": {type: 'Thang', value: 'Brack'},
                "nearestDistance": {type: 'number', value: 32.42},
                "enemy": {type: 'Thang', value: "Grul'thock"},
                "distance": {type: 'number', value: 25.63}
            }
        }
    }
}


```
## Visualization
As well as the visualizations for code execution, it might be nice to turn the AST into a graph using something like Viz.js
```javascript
aether.visualization.graph();  // Generates AST graph in browser to help user debug.
```