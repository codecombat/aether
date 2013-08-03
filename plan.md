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

Aether.defaults
// ->
{
    "this": {},
    global: {Math: Math, parseInt: parseInt, parseFloat: parseFloat, eval: eval, isNaN: isNaN, escape: escape, unescape: unescape},
    levels: {
        // Look at jshint's warnings for many, many ideas: http://jshint.com/docs/options
        
        // Errors: things that will error out and thus prevent us from compiling the code (syntax errors, missing variables, typos)
        Aether.problems.unexpectedIdentifier: 'error',
        Aether.problems.missingVarKeyword: 'error',
        Aether.problems.undefinedVariable: 'error',
        Aether.problems.missingThis: 'error',
        // ... many more errors ...
        
        // Warnings: things that we think might cause runtime errors or bugs, but aren't sure (statements that don't do anything, variables which are defined and not used, weird operator precedence issues, etc.)
        Aether.problems.noEffect: 'warning',
        Aether.problems.falseBlockIndentation: 'warning',
        Aether.problems.undefinedProperty: 'warning',
        // ... many more warnings ...
        
        // Info: things that are usually bad code (missing semicolons, bad indentation, multiple statements on a line, for..in loops where we think they're doing arrays, really long lines, bad_case_conventions)
        Aether.problems.inconsistentIndentation: 'info',
        Aether.problems.snakeCase: 'info',
        // ... many more infos ...
        
        Aether.problems.singleQuotes: "ignore",
        Aether.problems.doubleQuotes: "ignore"
        Aether.problems.camelCase: 'ignore',
        // ... many more problems ignored by default ...
    },
    language: "javascript",
    languageVersion: "1.5"
}

// Example custom analyzer
var infiniteLoopAnalyzer = function() {
    var problems = [];
    for(var statement in this.ast.statements) {  // I don't know
        if(obviouslyInInfiniteLoop(statement))
            problems.push({ranges: [statement.range], type: "Infinite loop", message: "That's an infinite loop!", hint: "No way are we falling for that one, Wizard!"});
        if(maybeInInfiniteLoop(statement))
            problems.push({ranges: [statement.range], type: "Strange loop", message: "That's a strange loop!", hint: "Are you sure " + statement.source + " will end?"});        
    }
    return problems;
};
infiniteLoopAnalyzer.problems = {
    infiniteLoop: "Infinite loop",
    strangeLoop: "Strange loop"
};
infiniteLoopAnalyzer.levels = {
    infiniteLoopAnalyzer.infiniteLoop: "warning",
    infiniteLoopAnalyzer.strangeLoop: "info"
};

// Example configuration of a new Aether instance aether
var options = {
    "this": {pos: <Vector: 15, 30>, health: 15, target: null, say: <function>, explode: <function>, getEnemies: <function>},  // read-only somehow?
    global: _.extend(Aether.defaults.global, {console: _.pick(console, "log")}),  // also read-only
    analyzers: [infiniteLoopAnalyzer],
    levels: {
        Aether.problems.undefinedProperty: 'error',
        Aether.problems.inconsistentIndentation: 'warning',
        Aether.problems.missingThis: 'warning',
        Aether.problems.noEffect: 'ignore',
        "Infinite loop": "error",
        "Strange loop": "warning"
    },
    languageVersion: "1.8"
};
aether = new Aether(options);
```

## Compilation

```javascript
// `raw` is the string containing the code above

// Quick heuristics: can this code be run, or will it produce a compilation error?
aether.canCompile(raw);  // -> false

// Barring things like comments and whitespace and such, are the ASTs going to be different? (oldAether being a previously compiled instance)
aether.hasChangedSignificantly(raw, oldAether);  // -> false

// Is the code exactly the same?
aether.hasChanged(raw, oldAether);  // -> true

// Compile it. Even if it can't compile, it will give syntax errors and warnings and such.
aether.compile(raw);

aether.problems.errors;  // I'll pretend that the plan.md line numbers are the actual raw line numbers.
// We couldn't show all of these at one because we'll probably get hung up on missing curly braces or whatever, but eventually as they fixed things they'd see them.
// ->
[
    {ranges: [[[6, 20], [6, 25]]], type: 'Unexpected identifier', message: 'Missing operator or function call between `dy` and `dy`.', hint: 'How does `dy` relate to `dy`? `dy + dy`? `dy(dy)`? Or maybe a string: "dy dy"?' }
    {ranges: [[[15, 1], [15, 16]]], type: 'Missing var keyword', message: 'Missing `var` keyword when defining near variable `nearestDistance`.', hint: 'Try `var nearestDistance = 9001;`. New variables need the `var` keyword.'}
    {ranges: [[[24, 24], [24, 30]]], type: 'Undefined variable', message: 'No variable `enemyy`. Did you mean `enemy`?' hint: '`enemyy is not defined yet, so `nearestEnemy = enemyy` would throw an error.'}
    {ranges: [[[15, 15], [15, 22]]], type: 'Undefined property', message: 'No method `getEnemyys`. Did you mean `getEnemies`?' hint: '`this` has no method `getEnemys()`, so `this.getEnemys()` would throw an error.'}
    // ... many more errors
]

aether.problems.warnings;
// ->
[
    {ranges: [[[4, 4], [4, 8]], [[5, 8], [5, 12]]], type: 'False block indentation', message: "Block indentation problem. `if` missing braces { }?", hint: "These lines will not be a part of the `if(from.pos)` condition:\n`if(target.pos)  // weird indentation\n    return distanceSquared(from, target.pos);  // |target| as Thang`" },
    {ranges: [[[15, 15], [15, 22]]], type: 'Missing this', message: 'Missing `this.` keyword; should be `this.getEnemies`.' hint: 'There is no function `getEnemys`, but `this` has a method `getEnemies`.'}  // ideally this and the Undefined property problem would interact, since it's the one that knows that they mean getEnemies.
    // ... many more warnings
]

aether.problems.info;
// ->
[
    {ranges: [[[6, 10], [6, 25]]], type: 'Snake case', message: '`distanceSquared` is better than `distance_squared`.', hint: "JavaScript convention is lower camelCase, not snake_case. (Upper CamelCase for classes.)"}
    // ... many more infos
]

aether.style;
// ->
{
    loc: 35,
    sloc: 28,
    statements: 29,
    conceptsUsed: {
        recursion: true,
        objects: false,
        arrays: false,
        strings: true,
        Math: false,
        functions: true,
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
    // variables used?
    // functions declared?
    // properties used? (of this)
    // what else?
}

aether.raw;  // -> original raw input code
aether.pure;  // -> purified and instrumented code for actually running. Good name?

var serialized = aether.serialize();  // convert to JSON so we can pass it across web workers and HTTP requests and store it in databases and such
aether = Aether.deserialize(serialized);  // ... and back
```

## Running

**TODO**: figure out what kind of API we want here

## Runtime Errors

**TODO**

## Flow Analysis

**TODO**: What I mean is that after it has run, we'll want to be able to look at the metrics (statements executed, runtime, etc.) and also to be able to ask it what all the state was for a particular run during a particular statement (so we can step through and show values and such).















