require(
[
	'App',
	'happy/app/Runner'
],
function (
	App,
	Runner
){
	"use strict";

	var app = new App();
	app.container = document.body;
	var runner = new Runner(app);
});