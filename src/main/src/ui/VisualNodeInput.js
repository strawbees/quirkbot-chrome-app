define(
[
	'require',
	'happy/utils/DOM',
	'libs/interact',
	'Tree',
	'Definitions',
	'SVGDrawing',
	'EventsManager',
],
function (
	require,
	DOM,
	interact,
	TREE,
	DEFINITIONS,
	SVGDrawing,
	EventsManager
){

	"use strict";

	var dom = new DOM();

	var VisualNodeInput = function(id, nodeId, placeholder, visualNode){
		var
		self = this,
		container,
		interactable,
		line;

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

			// Create the line that will be drawn between connectors
			line = SVGDrawing.two.makeLine(0, 0, 0, 0);

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
				drawLine(0,0,0,0);
				
			});
			eventsManager.add(TREE.connectionAdded, function(data){
				if(data.to != nodeId+'.'+id) return;
				input.value = data.from;
				
				if(!data.from){
					inputMirror.innerHTML = placeholder;
					container.classList.add('placeholder');
				}
				else{
					// Check if incomming connectin belongs to a node
					var fromArray = data.from.split('.');
					if(fromArray.length == 2
						&& TREE.data[fromArray[0]]
						&& fromArray[1] == 'out'
						&& DEFINITIONS.data[TREE.data[fromArray[0]].type].out

					){
			
						var editorPosition =
							dom.calculatePosition(visualNode.editor.container);
						
						var inputPosition =
							dom.calculatePosition(container);
						var outputPosition =
							dom.calculatePosition(
								visualNode.editor.nodes[fromArray[0]].output.container
							);

						var inputX = inputPosition.x - editorPosition.x;
						var inputY = inputPosition.y - editorPosition.y;

						var outputX = outputPosition.x - editorPosition.x;
						var outputY = outputPosition.y - editorPosition.y;

						drawLine(outputX, outputY, inputX, inputY);
	

						inputMirror.innerHTML = data.from;
						container.classList.add('connected-to-output');
					}
					else{
						drawLine(0,0,0,0);

						inputMirror.innerHTML = data.from;
						container.classList.remove('connected-to-output');
						
					}
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

		var drawLine = function(x1,y1,x2,y2){
			line.vertices[0].x = x1;
			line.vertices[0].y = y1;
			line.vertices[1].x = x2;
			line.vertices[1].y = y2;
		}

		var destroy = function(){
			interactable.unset();
			eventsManager.destroy();
			line.remove();
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