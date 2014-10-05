define(
[
	'happy/_libs/signals',
],
function (
	Signal
){
	"use strict";

	var Menu = function(){
		var
		self = this,
		container;

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
			visualInput.checked = true;
			tabs.appendChild(visualInput);
	
			var codeInput = document.createElement('input');
			codeInput.name = 'tab';
			codeInput.type = 'radio';
			codeInput.value = 'code';
			codeInput.classList.add('tab');
			codeInput.classList.add('code');
			tabs.appendChild(codeInput);
		
			var serialInput = document.createElement('input');
			serialInput.name = 'tab';
			serialInput.type = 'radio';
			serialInput.value = 'serial';
			serialInput.classList.add('tab');
			serialInput.classList.add('serial');
			tabs.appendChild(serialInput);
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return Menu;
});