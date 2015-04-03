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
		container;

		var init = function() {

			container = document.createElement('div');
			container.classList.add('definition-item');

			var insert = document.createElement('div');
			insert.classList.add('insert');
			insert.addEventListener('click', function(){
				var id = TREE.generateSafeNodeId(spec.name);
				TREE.data[id] = {type: spec.type};
			});
			container.appendChild(insert);

			var title = document.createElement('h5');
			title.classList.add('title');
			title.innerHTML = spec.name;
			container.appendChild(title);

			title.addEventListener('click', function(){
				if(container.dataset.expanded){
					delete container.dataset.expanded;
				}
				else{
					container.dataset.expanded = true;
				}
			});

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