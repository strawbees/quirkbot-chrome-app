module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify')

  grunt.initConfig({
    browserify: {
      options: {
        debug: true
      },
      module: {
        files: {
          '../src/chrome-arduino.js': ['./src/*.js']
        }
      },
    }
  })

  grunt.registerTask('default', ['browserify'])
}
