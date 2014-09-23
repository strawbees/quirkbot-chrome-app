define(
[
	'Tree'
],
function (
	TREE
){
	"use strict";

	var DefinitionItem = function(spec){
		var
		self = this,
		container,
		selected;

		var init = function() {

			container = document.createElement('div');
			container.classList.add('definition-item');

			var title = document.createElement('h5');
			title.classList.add('title');
			title.innerHTML = spec.name;
			container.appendChild(title);

			title.addEventListener('click', function(){
				selected = !selected;
				if(selected)container.classList.add('expanded');
				else container.classList.remove('expanded');
			});

			var insert = document.createElement('button');
			insert.classList.add('insert');
			insert.innerHTML = '+';
			insert.addEventListener('click', function(){
				var id = TREE.generateSafeNodeId(spec.name);
				TREE.data[id] = {type: spec.type};
			});
			container.appendChild(insert);

			var description = document.createElement('div');
			description.classList.add('description');
			description.innerHTML = spec.description;
			container.appendChild(description);
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return DefinitionItem;
});