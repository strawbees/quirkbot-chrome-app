define(
[
	'happy/app/BaseApp',
	'Serial'
],
function (
	BaseApp,
	Serial
){
	"use strict";

	var App = function(){
		var 
		self = this;

	
		self.setup = function(){
		}
		
	}
	App.prototype = new BaseApp();
	return App;
});