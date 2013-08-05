module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    coffeelint: {
      // global options
      options: {
        indentation: {
          value: 4,
          level: 'warn'
        }
      },

      // a target that overrides default options
      one: {
        files: {
          src: ['test/fixtures/*.coffee']
        },
        options: {
          indentation: {
            value: 2,
            level: 'warn'
          },
          'no_trailing_semicolons': {
            level: 'warn'
          }
        }
      },

      // a simple target
      two: ['test/fixtures/correct.coffee', 'test/fixtures/some.coffee']
    }
  });

  // Load local tasks.
  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-bump');

  // Default task.
  grunt.registerTask('default', 'coffeelint');

  grunt.registerTask('release', 'Bump version, push to NPM.', function(type) {
    grunt.task.run([
      'bump:' + (type || 'patch'),
      'npm-publish'
    ]);
  });
};
