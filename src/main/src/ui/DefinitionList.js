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

			Object.keys(DEFINITIONS.data).forEach(function(key) {
				var item = new DefinitionItem(DEFINITIONS.data[key]);
				container.appendChild(item.container);
			});
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return DefinitionList;
});