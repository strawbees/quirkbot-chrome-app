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

	var VisualNodeOutput = function(id, nodeId, visualNode){
		var
		self = this,
		container,
		connectedInputs,
		interactable;

		var eventsManager = new EventsManager();

		var init = function() {
			var spec = DEFINITIONS.data[TREE.data[nodeId].type];

			container = document.createElement('div');
			container.classList.add('visual-node-output');
			container.classList.add(id);
			container.classList.add('placeholder');
			
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
								
			
			// Enable Dragging
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
			});

			// Keep track of connections
			connectedInputs = {};
			eventsManager.add(TREE.connectionAdded, function(data){
				if(data.from != nodeId+'.'+id) return;
				var to = data.to.split('.');
	
				connectedInputs[data.to] = 
					visualNode.editor.nodes[to[0]].inputObjects[to[1]];
				
				container.classList.add('connected-to-input');
				container.classList.remove('placeholder');
			});
			eventsManager.add(TREE.connectionRemoved, function(data){
				if(data.from != nodeId + '.' + id) return;
				delete connectedInputs[data.to];

				if(!Object.keys(connectedInputs).length){
					container.classList.remove('connected-to-input');
					container.classList.add('placeholder');
				}
			});
		
		}

		var destroy = function(){
			eventsManager.destroy();
			interactable.unset();
		}

		var update = function(){
			Object.keys(connectedInputs).forEach(function(id){
				connectedInputs[id].update();
			});
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});
		Object.defineProperty(self, 'destroy', {
			value: destroy
		});
		Object.defineProperty(self, 'update', {
			value: update
		});

		init();
	}

	return VisualNodeOutput;
});