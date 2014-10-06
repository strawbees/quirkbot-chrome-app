define(
[
	'happy/_libs/signals',
	'EventsManager'
],
function (
	Signal,
	EventsManager
){
	"use strict";

	var Menu = function(){
		var
		self = this,
		tabChanged,
		container;

		var eventsManager = new EventsManager();

		var init = function() {
			container = document.createElement('div');
			container.classList.add('menu');

			var tabs = document.createElement('div');
			tabs.classList.add('tabs');
			container.appendChild(tabs);

			var visualInput = document.createElement('input');
			visualInput.name = 'tab';
			visualInput.type = 'radio';
			visualInput.value = 'visual';
			visualInput.classList.add('tab');
			visualInput.classList.add('visual');
			
			eventsManager.addEventListener(visualInput, 'click', function(){
				tabChanged.dispatch(visualInput.value);
			});
			tabs.appendChild(visualInput);
	
			var codeInput = document.createElement('input');
			codeInput.name = 'tab';
			codeInput.type = 'radio';
			codeInput.value = 'code';
			codeInput.classList.add('tab');
			codeInput.classList.add('code');
			eventsManager.addEventListener(codeInput, 'click', function(){
				tabChanged.dispatch(codeInput.value);
			});
			tabs.appendChild(codeInput);
		
			var serialInput = document.createElement('input');
			serialInput.name = 'tab';
			serialInput.type = 'radio';
			serialInput.value = 'serial';
			serialInput.classList.add('tab');
			serialInput.classList.add('serial');
			eventsManager.addEventListener(serialInput, 'click', function(){
				tabChanged.dispatch(serialInput.value);
			});
			tabs.appendChild(serialInput);

			tabChanged = new Signal();

			// select last opened tab	
			setTimeout(function(){
				var saved = localStorage.getItem('QuirkbotCurrentTab') || 'visual';
				var input;
				switch(saved){
					case 'visual':
						input = visualInput;
						break;
					case 'code':
						input = codeInput;
						break;
					case 'serial':
						input = serialInput;
						break;
				}

				input.checked = true;
				tabChanged.dispatch(saved);
			},0); // in a timeout, so it runs in the next tick

			// Save selected tab on local storage
			eventsManager.add(tabChanged, function(tab){
				localStorage.setItem("QuirkbotCurrentTab", tab);
			})

		}


		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});
		Object.defineProperty(self, 'tabChanged', {
			get: function(){ return tabChanged; }
		});

		init();
	}

	return Menu;
});