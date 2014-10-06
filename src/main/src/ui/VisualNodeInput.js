define(
[
	'require',
	'happy/utils/DOM',
	'libs/interact',
	'CSSData',
	'Tree',
	'Definitions',
	'SVGDrawing',
	'EventsManager',
],
function (
	require,
	DOM,
	interact,
	CSSData,
	TREE,
	DEFINITIONS,
	SVGDrawing,
	EventsManager
){

	"use strict";

	var dom = new DOM();

	var VisualNodeInput = function(textLabel, id, nodeId, placeholder, visualNode){
		var
		self = this,
		container,
		label,
		input,
		inputMirror,
		text,
		interactable,
		line,
		connectedOutput;

		var eventsManager = new EventsManager();

		var init = function() {
			var spec = DEFINITIONS.data[TREE.data[nodeId].type];

			container = document.createElement('div');
			container.classList.add('visual-node-input');
			container.classList.add(id);
			container.classList.add('placeholder');

			label = document.createElement('label');
			label.classList.add('label');
			container.appendChild(label);	

			input = document.createElement('input');
			input.type = 'text';
			input.classList.add('input');
			label.appendChild(input);

			inputMirror = document.createElement('div');
			inputMirror.classList.add('input-mirror');
			label.appendChild(inputMirror);
			inputMirror.innerHTML = placeholder;	

			text = document.createElement('div');
			text.classList.add('text');
			text.innerHTML = textLabel;
			label.appendChild(text);

			// Create the line that will be drawn between connectors
			line = SVGDrawing.two.makeLine(0, 0, 0, 0);
			line.linewidth = CSSData.get('linkLineWidth', 1);
			line.stroke = CSSData.get('linkLineColor', 'black');

			// Allow for drag and dropping of outputs
			interactable = interact(inputMirror)
			.dropzone(true)
			.on('drop', function (event) {
				setConnectionValue(event.relatedTarget.dataset.connectionInfo);
			});

			// Monitor text changes in field
			eventsManager.addEventListener(input, 'focus', function(){
				input.select();
			});
			eventsManager.addEventListener(input, 'change', function(){
				setConnectionValue(input.value);
			});
			eventsManager.add(TREE.connectionRemoved, function(data){
				if(data.to != nodeId+'.'+id) return;
				input.value = '';				
				inputMirror.innerHTML = placeholder;
				container.classList.add('placeholder');
				container.classList.remove('connected-to-output');
				connectedOutput = null;
				update();
				
			});
			eventsManager.add(TREE.connectionAdded, function(data){
				proccessIncomingConnection(data)
			});
		
		}

		var proccessIncomingConnection = function(data){
			if(data.to != nodeId+'.'+id) return;
			input.value = data.from;
			
			if(!data.from){
				inputMirror.innerHTML = placeholder;
				container.classList.add('placeholder');
			}
			else{
				// Check if incomming connectin belongs to a node
				var from = data.from.split('.');
				if(from.length == 2
					&& TREE.data[from[0]]
					&& from[1] == 'out'
					&& DEFINITIONS.data[TREE.data[from[0]].type].out

				){
					connectedOutput = visualNode.editor.nodes[from[0]].outputObjects[from[1]];

					inputMirror.innerHTML = data.from;
					container.classList.add('connected-to-output');
				}
				else{
					connectedOutput = null;
					inputMirror.innerHTML = data.from;
					container.classList.remove('connected-to-output');
					
				}
				update();
				container.classList.remove('placeholder');

				
			}
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

		var update = function(){
			if(!connectedOutput) return drawLine(0,0,0,0);

			var editorPosition = dom.calculatePosition(visualNode.editor.container);
			
			var inputPosition =	dom.calculatePosition(container);
			var inputSize =	dom.measure(container);
			var outputPosition = dom.calculatePosition(connectedOutput.container);
			var outputSize = dom.measure(connectedOutput.container);

			var inputX = inputPosition.x - editorPosition.x;
			var inputY = (inputPosition.y + inputSize.height * 0.5) - editorPosition.y;

			var outputX = outputPosition.x - editorPosition.x;
			var outputY = (outputPosition.y + outputSize.height * 0.5) - editorPosition.y;
			
			drawLine(outputX, outputY, inputX, inputY);
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
		Object.defineProperty(self, 'proccessIncomingConnection', {
			value: proccessIncomingConnection
		});
		Object.defineProperty(self, 'destroy', {
			value: destroy
		});
		Object.defineProperty(self, 'update', {
			value: update
		});


		init();
	}

	return VisualNodeInput;
});