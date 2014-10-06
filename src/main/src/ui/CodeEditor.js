define(
[
	'Tree'
],
function (
	TREE
){
	"use strict";

	var CodeEditor = function(){
		var
		self = this,
		container,
		nodes;

		var init = function() {
			container = document.createElement('div');
			container.classList.add('code-editor');

			hide();
		}

		var update = function(){
	
		}
		var show = function(){
			container.style.display = 'block';
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

	return CodeEditor;
});