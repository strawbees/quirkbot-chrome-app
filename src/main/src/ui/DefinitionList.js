define(
[
	'ui/DefinitionItem',
	'Definitions'
],
function (
	DefinitionItem,
	DEFINITIONS
){
	"use strict";

	var DefinitionList = function(){
		var
		self = this,
		container;

		var init = function() {
			container = document.createElement('div');
			container.classList.add('ui-definition-list');

			var keys = Object.keys(DEFINITIONS.data);
			keys.sort(sortByName);
			//keys.sort(sortByFlow);
			//keys.sort(sortByGroup);

			var groups = {};
			keys.forEach(function(key) {
				var type = DEFINITIONS.data[key];

				if(!Array.isArray(type.groups) || !type.groups.length){
					type.groups = ['Other'];
				}

				type.groups.forEach(function(group){
					if(!groups[group]){
						var groupContainer = document.createElement('div');
						groupContainer.classList.add('definition-group');
						groupContainer.dataset.expanded = true;
						container.appendChild(groupContainer);

						var label = document.createElement('div');
						label.innerHTML = group;
						label.classList.add('label');
						groupContainer.appendChild(label);

						label.addEventListener('click', function(){
							if(groupContainer.dataset.expanded){
								delete groupContainer.dataset.expanded;
							}
							else{
								groupContainer.dataset.expanded = true;
							}
						});

						var inner = document.createElement('div');
						inner.classList.add('inner');
						groupContainer.appendChild(inner);


						groups[group] = {
							container: groupContainer,
							label: label,
							inner: inner
						};				
					}

					var item = new DefinitionItem(type);
					groups[group].inner.appendChild(item.container);
				})
			});
		}

		var sortByName = function(a,b){
			var typeA = DEFINITIONS.data[a];
			var typeB = DEFINITIONS.data[b];

			if(typeA.name < typeB.name) return -1;
			else if(typeA.name > typeB.name) return 1;
			else 0;
			
			return 0;
		}
		var sortByGroup = function(a,b){
			var typeA = DEFINITIONS.data[a];
			var typeB = DEFINITIONS.data[b];

			if(typeA.group < typeB.group) return -1;
			else if(typeA.group > typeB.group) return 1;
			else 0;
			
			return 0;
		}
		var sortByFlow = function(a,b){
			var typeA = DEFINITIONS.data[a];
			var typeB = DEFINITIONS.data[b];

			if(typeA.out && typeB.out){
				if(a < b) return -1;
				else if(a > b) return 1;
			}
			
			if (typeA.out) return -1;
			else if (typeB.out) return 1;
			
			return 0;
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return DefinitionList;
});