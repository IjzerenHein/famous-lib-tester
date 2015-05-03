/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    browserify: {
      dist: {
        files: {
          './browserify/dist/bundle.js': ['./browserify/main.js']
        },
        options: {
          transform: ['aliasify', 'deamdify']
        }
      }
    },
    exec: {
      'clean-webpack': 'rm -rf ./webpack/dist',
      'clean-browserify': 'rm -rf ./browserify/dist',
      'build-webpack': {
        cwd: './webpack',
        command: 'webpack'
      },
      'open-webpack': 'open webpack/dist/index.html',
      'open-browserify': 'open browserify/index.html',
      'open-globals': 'open globals/index.html',
      'open-requirejs': 'open requirejs/index.html'
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-browserify');

  // Default task.
  grunt.registerTask('clean', ['exec:clean-webpack', 'exec:clean-browserify']);
  grunt.registerTask('build', ['exec:build-webpack', 'browserify']);
  grunt.registerTask('open', ['exec:open-requirejs', 'exec:open-globals', 'exec:open-webpack', 'exec:open-browserify']);
  grunt.registerTask('default', ['clean', 'build', 'open']);
};
