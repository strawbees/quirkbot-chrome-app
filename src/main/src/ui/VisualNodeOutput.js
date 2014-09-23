define(
[
	'libs/interact',
	'Tree',
	'Definitions',
	'EventsManager'
],
function (
	interact,
	TREE,
	DEFINITIONS,
	EventsManager
){
	"use strict";

	var VisualNodeOutput = function(id, nodeId){
		var
		self = this,
		container,
		interactable;

		var eventsManager = new EventsManager();

		var init = function() {
			var spec = DEFINITIONS.data[TREE.data[nodeId].type];

			container = document.createElement('div');
			container.classList.add('visual-node-output');
			container.classList.add(id);
			container.classList.add('placeholder');
			container.classList.add('dragging');

			var label = document.createElement('label');
			label.classList.add('label');
			container.appendChild(label);

			var text = document.createElement('div');
			text.classList.add('text');
			text.innerHTML = id;
			label.appendChild(text);

			var connector = document.createElement('div');
			connector.classList.add('input-mirror');
			label.appendChild(connector);
			connector.innerHTML = '&nbsp';

			var draggableConnector = document.createElement('div');
			draggableConnector.classList.add('input-mirror');
			draggableConnector.classList.add('draggable-input-mirror');
			draggableConnector.dataset.connectionInfo = nodeId + '.' + id;
			label.appendChild(draggableConnector);
			draggableConnector.innerHTML = '&nbsp';
								
			

			var x = 0; 
			var y = 0; 
			interactable = interact(draggableConnector)
			.draggable({
				onstart: function (event) {
					container.classList.add('dragging');
				},
				onmove: function (event) {
					x += event.dx;
					y += event.dy;
					connector.style.webkitTransform =
					connector.style.transform =
						'translate(' + x + 'px, ' + y + 'px)';
				},
				onend: function (event) {
					container.classList.remove('dragging');
					x = 0;
					y = 0;
					connector.style.webkitTransform =
					connector.style.transform =
						'translate(' + x + 'px, ' + y + 'px)';
				}
			})
			/*.restrict({
				drag: 'parent',
				endOnly: true,
				elementRect: { top: 0, left: 0, bottom: 0, right: 0 }
			});*/
			/*TREE.nodePositionUpdated.add(function(_id, x, y){
				if(id != _id) return;
				
				container.style.left = x + 'px';
				container.style.top = y + 'px';

				// Move to front
				var parentNode = container.parentNode;
				parentNode.removeChild(container);
				parentNode.appendChild(container);
			})*/

			/*TREE.connectionAdded.add(function(data){
				if(data.to != nodeId+'.'+id) return;
				input.value = data.from;
				
				if(!data.from){
					inputMirror.innerHTML = placeholder;
					container.classList.add('placeholder');
				}
				else{
					inputMirror.innerHTML = data.from;
					container.classList.remove('placeholder');
				}
			});*/
		
		}

		var destroy = function(){
			eventsManager.destroy();
			interactable.unset();
		}


		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});
		Object.defineProperty(self, 'destroy', {
			value: destroy
		});

		init();
	}

	return VisualNodeOutput;
});