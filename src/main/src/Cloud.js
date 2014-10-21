define(
[
	'happy/_libs/signals',
	'libs/parse',
	'Promise'
],
function (
	Signal,
	Network,
	Promise
){
	"use strict";


	Parse.initialize(
		"oSSqARDBD4wxYVkkDSCwZNufdtl3D1h6peWmHEWG",
		"uouLxvF7McUHQGMuTev72aC88LtGfNIuQYiqrfzh"
	);

	var Program = Parse.Object.extend("Program", {
		defaults: {
			name: "Untitled Program",
			tree: ''
		},

		initialize: function() {
			if (!this.get("name")) {
				this.set({"name": this.defaults.name});
			}
		}
	});

	var ProgramList = Parse.Collection.extend({
		model: Program,

		nextOrder: function() {
			if (!this.length) return 1;
			return this.last().get('order') + 1;
		},

		comparator: function(todo) {
			return todo.get('order');
		}
	});

	var Cloud = function(){
		var
		self = this,
		loggedIn,
		loggedOut;

		var init = function(){
			loggedIn = new Signal();
			loggedOut = new Signal();

		
			setTimeout(function(){
				if(getUser()){
					loggedIn.dispatch(Parse.User.current());
				}
				else {
					loggedOut.dispatch();
				}
			},100);			
		}

		
		var signUp = function (email, username, password) {
			return new Promise(function(resolve, reject){
				Parse.User.signUp(
					username,
					password, 
					{ 
						email : email,
						ACL: new Parse.ACL()
					}, 
					{
						success: function(user) {
							resolve(user)
							loggedIn.dispatch(user);
						},

						error: function(user, error) {
							reject(error)
						}
				});
			});
		}

		var logIn = function (username, password) {
			return new Promise(function(resolve, reject){
				Parse.User.logIn(
					username,
					password,  
					{
						success: function(user) {
							resolve(user)
							loggedIn.dispatch(user);
						},

						error: function(user, error) {
							reject(error)
						}
				});
			});
		}

		var logOut = function () {
			if (Parse.User.current()) {
				Parse.User.logOut();
			}
		}

		var saveProgram = function(id, data){

		}
		var loadProgram = function(id){

		}
		var createProgram = function(name){

		}
		var deleteProgram = function(id){
			
		}


		var getUser = function () {
			return true;
			return Parse.User.current();
		}


		Object.defineProperty(self, 'signUp', {
			value: signUp
		});
		Object.defineProperty(self, 'logIn', {
			value: logIn
		});
		Object.defineProperty(self, 'logOut', {
			value: logOut
		});
		Object.defineProperty(self, 'user', {
			get: getUser
		});
		Object.defineProperty(self, 'loggedIn', {
			get: function(){ return loggedIn; }
		});
		Object.defineProperty(self, 'loggedOut', {
			get: function(){ return loggedOut; }
		});

		init();
	}

	var cloud = new Cloud();

	return cloud;
});