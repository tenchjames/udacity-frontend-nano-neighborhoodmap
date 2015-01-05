module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            build: {
                files: {
                    'dist/js/app.min.js': ['src/js/app.js']
                }
                
            }
        },
        jshint: {
            files: ['src/js/app.js'],
            options: {
                globals: {
                    jQuery: true,
                    console: true,
                    module: true
                }
            }
        },
        cssmin: {
          options: {
            keepSpecialComments: 0
          },
          dist: {
            files: {
              'dist/css/neighborhood.min.css': 'src/css/neighborhood.css'
            }
          }
        },
        htmlmin: {
          dist: {
            options: {
              removeComments: true,
              collapseWhitespace: true
            },
            files: {
              'dist/index.html': 'src/index.html'
            }
          }
        },
        copy: {
            jslibs: {
                cwd: 'src/js/lib/',
                src: '**/*',
                dest: 'dist/js/lib/',
                expand: true
            },
            app: {
                cwd: 'src/js/',
                src: 'app.js',
                dest: 'dist/js/',
                expand: true
            }
        },
        watch: {
            js: {
                files: ['src/js/app.js'],
                tasks: ['jshint', 'uglify', 'copy:app']
            },
            css: {
                files: ['src/css/neighborhood.css'],
                tasks: ['cssmin']
            },
            html: {
                files: ['src/index.html'],
                tasks: ['htmlmin']                
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['jshint', 'uglify', 'cssmin', 'copy', 'htmlmin']);

}