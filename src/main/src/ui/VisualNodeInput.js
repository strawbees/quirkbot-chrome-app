define(
[
	'libs/interact',
	'Tree',
	'Definitions',
	'SVGDrawing',
	'EventsManager'
],
function (
	interact,
	TREE,
	DEFINITIONS,
	SVGDrawing,
	EventsManager
){
	"use strict";

	var VisualNodeInput = function(id, nodeId, placeholder){
		var
		self = this,
		container,
		interactable,
		svgLine;

		var eventsManager = new EventsManager();

		var init = function() {
			var spec = DEFINITIONS.data[TREE.data[nodeId].type];

			container = document.createElement('div');
			container.classList.add('visual-node-input');
			container.classList.add(id);
			container.classList.add('placeholder');

			var label = document.createElement('label');
			label.classList.add('label');
			container.appendChild(label);	

			var input = document.createElement('input');
			input.type = 'text';
			input.classList.add('input');
			label.appendChild(input);

			var inputMirror = document.createElement('div');
			inputMirror.classList.add('input-mirror');
			label.appendChild(inputMirror);
			inputMirror.innerHTML = placeholder;	

			var text = document.createElement('div');
			text.classList.add('text');
			text.innerHTML = id;
			label.appendChild(text);

			svgLine = SVGDrawing.svg.line(0, 0, 100, 100).stroke({ width: 1 });

			// Allow for drag and dropping of outputs
			interactable = interact(inputMirror)
			.dropzone(true)
			.on('drop', function (event) {
				setConnectionValue(event.relatedTarget.dataset.connectionInfo);
			});

			// Monitor text changes in field
			eventsManager.addEventListener(input, 'change', function(){
				setConnectionValue(input.value);
			});
			eventsManager.add(TREE.connectionRemoved, function(data){
				if(data.to != nodeId+'.'+id) return;
				input.value = '';				
				inputMirror.innerHTML = placeholder;
				container.classList.add('placeholder');
				
			});
			eventsManager.add(TREE.connectionAdded, function(data){
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
			});
		
		}

		var setConnectionValue = function(value){
			if(!TREE.data[nodeId].inputs){
				TREE.data[nodeId].inputs = {};
			}

			if(value){
				TREE.data[nodeId].inputs[id] = value;
			}
			else{
				delete TREE.data[nodeId].inputs[id];
			}
		}

		var destroy = function(){
			interactable.unset();
			eventsManager.destroy();
			svgLine.remove();
		}


		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});
		Object.defineProperty(self, 'destroy', {
			value: destroy
		});

		init();
	}

	return VisualNodeInput;
});