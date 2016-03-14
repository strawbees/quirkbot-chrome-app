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
 * Gives a warning in case the current release you are building overwrites an
 * existing release.
 */
gulp.task('check-release-overwrite', [], function () {
	var manifest = JSON.parse(fs.readFileSync(path.resolve('manifest.json')).toString());
	if(manifest.version == PACKAGE.version){
		return gulp.src('')
		.pipe($.prompt.confirm(`There is already a release with the version ${PACKAGE.version}. Do you want to overwrite it (Y)?\n (If you want to create a new release, answer (N) and updated the version in package.json first)`))
	}

});


/**
 * Bundles the source code into a versioned zip file
 */
gulp.task('bundle', ['check-release-overwrite','clean'], function (cb){
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
 * Generate the new manifest entry on the package index
 */
gulp.task('build', ['bundle'], function (cb) {

	// Create generate the library properties file
	var manifest = fs.readFileSync('manifest.template.json').toString()
	.split('{{VERSION}}').join(PACKAGE.version)

	// Save the new properties
	fs.writeFileSync('manifest.json',manifest);

	cb();
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

