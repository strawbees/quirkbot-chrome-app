'use strict';

var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var argv = require('yargs').default('environment', 'stage').argv;
var $ = require('gulp-load-plugins')();
var merge = require('merge-stream');
var runSequence = require('run-sequence');

var RELEASE_NAME = 'quirkbot-chrome-app';
var PACKAGE = JSON.parse(fs.readFileSync('package.json'));
var ZIP_FILENAME = `${RELEASE_NAME}-${PACKAGE.version}.zip`;


/**
 * Cleans all the generated files
 */
gulp.task('clean', function () {
	return gulp.src([
		RELEASE_NAME,
		RELEASE_NAME + '-*.zip',
		'quirkbot.zip'
	])
	.pipe($.clean());
});

/**
 * Generate the "platform" entry on the package index
 */
gulp.task('build', ['clean'], function (cb) {
	var exec = require('child_process').exec;

	exec(
		`sh build-release.sh`
		+ ` && mv quirkbot.zip ${ZIP_FILENAME}`,
		(error, stdout, stderr) => {
			console.log(stderr)
			cb();
		}
	);
});


/**
 * Builds and publish to s3
 */
gulp.task('s3', ['build'], function () {
	var aws = JSON.parse(fs.readFileSync(path.join('aws-config', `${argv.environment}.json`)));

	return gulp.src([
		ZIP_FILENAME
	])
	.pipe($.s3(aws, {
		uploadPath: 'downloads/'
	}));
});


/**
 * Deploys the release. Asks for confirmation if deploying to production
 */
gulp.task('confirm-deploy', [], function () {
	if(argv.environment == 'production'){
		return gulp.src('')
		.pipe($.prompt.confirm('You are about to deploy TO PRODUCTION! Are you sure you want to continue)'))
		.pipe($.prompt.confirm('Really sure?!'))
	}

});
gulp.task('deploy', function (cb) {
	runSequence(
		'confirm-deploy',
		's3',
	cb);
});


