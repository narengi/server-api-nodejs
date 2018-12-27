//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function(grunt) {
    grunt.initConfig({
        jsdoc : {
            dist : {
                src: ['server/**/*.js', 'common/**/*.js', 'server/lib/messaging', 'server/lib/utils', '!server/lib/*/node_modules/**'],
                options: {
                    destination: 'doc',
                    template : "node_modules/ink-docstrap/template",
                    configure : "node_modules/ink-docstrap/template/jsdoc.conf.json"
                }
            }
        },
        watch: {
            files: ['server/**/*.js', 'common/**/*.js'],
            tasks: ['jsdoc']
        }
    });

    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['jsdoc']);
};