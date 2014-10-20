define(
[
	'Cloud',
	'EventsManager'
],
function (
	Cloud,
	EventsManager
){
	"use strict";

	var eventsManager = new EventsManager();

	var Authentication = function(){
		var
		self = this,
		container;

		var init = function() {
			container = document.createElement('div');
			container.classList.add('ui-authentication');

			var inner =  document.createElement('div');
			inner.classList.add('inner');
			container.appendChild(inner);

			var heading = document.createElement('h1');
			heading.classList.add('heading');
			heading.innerHTML = 'Quirkbot';
			inner.appendChild(heading);

			setupLogin(inner);
			setupRegister(inner);

			
			if(Cloud.user) hide();
			else show();
			eventsManager.add(Cloud.loggedIn, hide);
			eventsManager.add(Cloud.loggedOut, show);
		}

		var setupLogin = function(container){
			var wrapper = document.createElement('div');
			wrapper.classList.add('wrapper');
			wrapper.classList.add('login');
			container.appendChild(wrapper);

			var title = document.createElement('h3');
			title.classList.add('title');
			title.innerHTML = 'Log in';
			wrapper.appendChild(title);

			var message = document.createElement('div');
			message.classList.add('message');
			wrapper.appendChild(message);

			var user = document.createElement('input');
			user.classList.add('user');
			user.type = 'text';
			user.placeholder = 'E-mail';
			wrapper.appendChild(user);

			var password = document.createElement('input');
			password.classList.add('password');
			password.type = 'password';
			password.placeholder = 'Password';
			wrapper.appendChild(password);

			var button = document.createElement('a');
			button.href = '#';
			button.classList.add('button');
			button.innerHTML = 'Log in';
			wrapper.appendChild(button);

			var onSubmit = function(){
				message.classList.add('error');
				if(!user.value){
					message.innerHTML = 'Username missing.'
					return;
				}
				else if(!password.value){
					message.innerHTML = 'Password missing.'
					return;
				}

				message.classList.remove('error');
				message.innerHTML = 'Loading...';

				Cloud.logIn(user.value, password.value)
				.then(function(user){
					message.innerHTML = '';
					console.log(user)
				})
				.catch(function(error){
					message.classList.add('error');
					// error.message is not very descriptive
					message.innerHTML = 'Invalid username or password.'
				})
			}

			eventsManager.addEventListener(button, 'click', onSubmit);
			eventsManager.addEventListener(wrapper, 'keypress', function(e){
				if (e.keyCode == 13) {
					onSubmit();
					return false;
				}	
			});


		}

		var setupRegister = function(container){
			var wrapper = document.createElement('div');
			wrapper.classList.add('wrapper');
			wrapper.classList.add('signup');
			container.appendChild(wrapper);

			var title = document.createElement('h3');
			title.classList.add('title');
			title.innerHTML = 'Registration';
			wrapper.appendChild(title);

			var message = document.createElement('div');
			message.classList.add('message');
			wrapper.appendChild(message);

			var email = document.createElement('input');
			email.classList.add('email');
			email.type = 'email';
			email.placeholder = 'E-mail';
			wrapper.appendChild(email);

			var password = document.createElement('input');
			password.classList.add('password');
			password.type = 'password';
			password.placeholder = 'Password';
			wrapper.appendChild(password);

			var confirmPassword = document.createElement('input');
			confirmPassword.classList.add('password');
			confirmPassword.type = 'password';
			confirmPassword.placeholder = 'Confirm Password';
			wrapper.appendChild(confirmPassword);

			var button = document.createElement('a');
			button.href = '#';
			button.classList.add('button');
			button.innerHTML = 'Register';
			wrapper.appendChild(button);

			var onSubmit = function(){
				message.classList.add('error');

				if(!email.value){
					message.innerHTML = 'E-mail missing.'
					return;
				}
				else if(!password.value){
					message.innerHTML = 'Password missing.'
					return;
				}
				else if(password.value !== confirmPassword.value){
					message.innerHTML = 'Password missmatch.'
					return;
				}

				message.classList.remove('error');
				message.innerHTML = 'Loading...';

				Cloud.signUp(email.value, email.value, password.value)
				.then(function(user){
					console.log(user)
					message.innerHTML = '';
				})
				.catch(function(error){
					message.classList.add('error');
					message.innerHTML = error.message;
				})

			};

			eventsManager.addEventListener(button, 'click', onSubmit);
			eventsManager.addEventListener(wrapper, 'keypress', function(e){
				if (e.keyCode == 13) {
					onSubmit();
					return false;
				}	
			});

		}

		var update = function(){
	
		}
		var show = function(){
			container.style.display = '';
		}
		var hide = function(){
			container.style.display = 'none';
		}

		Object.defineProperty(self, 'show', {
			value: show
		});
		Object.defineProperty(self, 'hide', {
			value: hide
		});
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});


		init();
	}

	return Authentication;
});