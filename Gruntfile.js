module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'build/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    coffeelint: {
        app: ['src/*.coffee']
    },
    jasmine: {
      aetherTests: {
        src: ['build/*.js'],
        options: {
          specs: ['test/*Spec.js']
        }
      }
    },
    coffee: {
        compile: {
            files: {
              'build/aether.js' : ['src/*.coffee'] //multiple files will be concat'd
          }
        }
      }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['coffeelint','coffee','jasmine','uglify']);

};