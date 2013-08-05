[![build status](https://secure.travis-ci.org/vojtajina/grunt-coffeelint.png)](http://travis-ci.org/vojtajina/grunt-coffeelint)
# grunt-coffeelint

**Lint your CoffeeScript by [CoffeeLint].**

## Installation

Install npm package, next to your project's `Gruntfile.js` file:

    npm install grunt-coffeelint

Add this line to your project's `Gruntfile.js`:

    grunt.loadNpmTasks('grunt-coffeelint');


## Configuration

`coffeelint` is a multitask, so you can use it similary to `lint`, `watch` etc...

````javascript
grunt.initConfig({
    ...
    coffeelint: {
      app: ['app/*.coffee', 'scripts/*.coffee']
      }
    },
    ...
});
````

### Options per target

````javascript
grunt.initConfig({
    ...
    coffeelint: {
      app: ['app/*.coffee', 'scripts/*.coffee'],
      tests: {
        files: {
          src: ['tests/*.coffee']
        },
        options: {
          'no_trailing_whitespace': {
            'level': 'error'
          }
        }
      }
    },
    ...
});
````

### Global - default options

````javascript
grunt.initConfig({
    ...
    coffeelint: {
      options: {
        'no_trailing_whitespace': {
          'level': 'error'
        }
      }
    },
    ...
});
````

For available options see [example configuration] or [coffeelint homepage].


[CoffeeLint]: http://www.coffeelint.org/
[coffeelint homepage]: http://www.coffeelint.org/
[example configuration]: https://raw.github.com/clutchski/coffeelint/master/examples/coffeelint.json
