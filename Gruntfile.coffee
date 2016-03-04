module.exports = (grunt) ->

  # Project configuration.
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    uglify:
      options:
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'

      build:
        src: 'build/<%= pkg.name %>.js'
        dest: 'build/<%= pkg.name %>.min.js'

      parsers:
        files: [
          {src: 'build/python.js', dest: 'build/python.min.js'}
          {src: 'build/clojure.js', dest: 'build/clojure.min.js'}
          {src: 'build/lua.js', dest: 'build/lua.min.js'}
          {src: 'build/io.js', dest: 'build/io.min.js'}
          {src: 'build/coffeescript.js', dest: 'build/coffeescript.min.js'}
          {src: 'build/javascript.js', dest: 'build/javascript.min.js'}
          {src: 'build/java.js', dest: 'build/java.min.js'}
        ]

    coffeelint:
      app: ['src/*.coffee', 'test/*.coffee', 'dev/*.coffee']
      options:
        no_trailing_whitespace:
          # PyCharm can't just autostrip for .coffee, needed for .jade
          level: 'ignore'
        max_line_length:
          level: 'ignore'
        line_endings:
          value: "unix"
          level: "error"

    watch:
      files: ['src/**/*', 'test/**/*.coffee', 'dev/**/*.coffee']
      tasks: ['coffeelint', 'coffee', 'browserify', 'concat', 'jasmine_node']
      options:
        spawn: true
        interrupt: true
        atBegin: true
        livereload: true

    #jasmine:
    #  aetherTests:
    #    src: ['build/<%= pkg.name %>.js']
    #    options:
    #      specs: ['']

    jasmine_node:
      run:
        spec: "lib/test/"
      runCoverage:
        spec: "coverage/instrument/lib/test"
      env:
        NODE_PATH: "lib"
      executable: './node_modules/.bin/jasmine_node'

    coffee:
      compile:
        files: [
            expand: true         # Enable dynamic expansion.
            cwd: 'src/'          # Src matches are relative to this path.
            src: ['**/*.coffee'] # Actual pattern(s) to match.
            dest: 'lib/'         # Destination path prefix.
            ext: '.js'           # Dest filepaths will have this extension.
          ,
            expand: true         # Enable dynamic expansion.
            cwd: 'test/'         # Src matches are relative to this path.
            src: ['**/*.coffee'] # Actual pattern(s) to match.
            dest: 'lib/test/'    # Destination path prefix.
            ext: '.js'           # Dest filepaths will have this extension.
          ]
      dev:
        files:
          'build/dev/index.js': 'dev/index.coffee'

    browserify:
      src:
        src: ['lib/<%= pkg.name %>.js']
        dest: 'build/<%= pkg.name %>.js'
        options:
          #standalone: "Aether"  # can't figure out how to get this to work
          ignore: ['lodash', 'traceur', 'closer', 'filbert',
            'filbert/filbert_loose', 'lua2js', 'iota-compiler',
            'coffee-script-redux', 'jshint', 'cashew-js',
            'esper.js']
      parsers:
        files: [
          {src: 'parsers/python.js', dest: 'build/python.js'}
          {src: 'parsers/clojure.js', dest: 'build/clojure.js'}
          {src: 'parsers/lua.js', dest: 'build/lua.js'}
          {src: 'parsers/io.js', dest: 'build/io.js'}
          {src: 'parsers/coffeescript.js', dest: 'build/coffeescript.js'}
          {src: 'parsers/javascript.js', dest: 'build/javascript.js'}
          {src: 'parsers/java.js', dest: 'build/java.js'}
        ]
      # We're not using jasmine but now jasmine_node,
      # so we don't need to browserify the tests
      #test:
      #  src: ['lib/test/*.js']
      #  dest: 'build/test/<%= pkg.name %>_specs.js'

    concat:
      build:
        src: ['node_modules/traceur/bin/traceur.js', 'build/<%= pkg.name %>.js']
        dest: 'build/<%= pkg.name %>.js'

    'string-replace':
      build:
        files:
          'build/<%= pkg.name %>.js': 'build/<%= pkg.name %>.js'
        options:
          replacements: [
            {pattern: /\$defineProperty\(Object, 'assign', method\(assign\)\);/, replacement: "//$defineProperty(Object, 'assign', method(assign));  // This polyfill interferes with Facebook's JS SDK and isn't needed for our use case anyway."}
          ]

    "gh-pages":
      options:
        base: 'build'
      src: ['**/*']

    push:
      options:
        files: ['package.json', 'bower.json']
        updateConfigs: ['pkg']
        commitMessage: 'Release %VERSION%'
        commitFiles: ['-a']
        tagName: '%VERSION%'
        npm: true

    jade:
      dev:
        options:
          pretty: true
          data: '<%= pkg %>'
        files:
          'build/index.html': ['dev/index.jade']

    sass:
      dev:
        options:
          trace: true
          # no need to depend on sass gem 3.3.0 before it's out
          #sourcemap: true
          unixNewlines: true
          noCache: true
        files:
          'build/dev/index.css': ['dev/index.sass']

    instrument:
      files: "lib/**/*.js"
      options:
        lazy: true
        basePath: "coverage/instrument"

    copy:
      jstests:
        src: "test/java_milestones_spec.ec5"
        dest: "lib/test/java_milestones_spec.js"
      tests:
        expand: true
        flatten: true
        src: "lib/test/**/*"
        dest: "coverage/instrument/lib/test/"

    storeCoverage:
      options:
        dir: "coverage/reports"

    makeReport:
      src: "coverage/reports/**/*.json"
      options:
        type: "lcov"
        dir: "coverage/reports"
        print: "detail"

  # Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  #grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-newer'
  grunt.loadNpmTasks 'grunt-jasmine-node'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-string-replace'
  grunt.loadNpmTasks 'grunt-notify'
  grunt.loadNpmTasks 'grunt-gh-pages'
  grunt.loadNpmTasks 'grunt-push-release'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-sass'
  grunt.loadNpmTasks 'grunt-istanbul'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  # Default task(s).
  grunt.registerTask 'default', ['coffeelint', 'coffee', 'browserify', 'concat',
    'string-replace', 'copy:jstests', 'jasmine_node:run', 'jade', 'sass'] #, 'uglify']
  grunt.registerTask 'travis', ['coffeelint', 'coffee', 'copy:jstests', 'jasmine_node:run']
  grunt.registerTask 'test', ['newer:coffee', 'copy:jstests', 'jasmine_node:run']
  grunt.registerTask 'coverage', ['coffee', 'instrument', 'copy:tests',
    'jasmine_node:runCoverage', 'storeCoverage', 'makeReport']
  grunt.registerTask 'build', ['coffeelint', 'coffee', 'browserify:src',
    'concat', 'string-replace', 'jade', 'sass', 'uglify:build']
  grunt.registerTask 'parsers', ['browserify:parsers', 'uglify:parsers']

  # Run a single test with `grunt spec:filename`.
  # For example, `grunt spec:io` will run tests in io_spec.coffee
  grunt.registerTask 'spec', 'Run jasmine_node test on a specified file', (filename) ->
    grunt.task.run 'newer:coffee'
    grunt.config.set 'jasmine_node.match', filename
    grunt.config.set 'jasmine_node.matchAll', false
    grunt.config.set 'jasmine_node.specNameMatcher', '_spec'
    grunt.task.run 'jasmine_node:run'
