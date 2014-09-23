define(
[
	'libs/interact',
	'Tree',
	'Definitions'
],
function (
	interact,
	TREE,
	DEFINITIONS
){
	"use strict";

	var VisualNodeInput = function(id, nodeId, placeholder){
		var
		self = this,
		container;

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

			// Allow for drag and dropping of outputs
			interact(inputMirror)
			.dropzone(true)
			.on('drop', function (event) {
				TREE.data[nodeId].inputs[id] =
					event.relatedTarget.dataset.connectionInfo;
			});

			// Monitor text changes in field
			input.addEventListener('change', function(e){
				if(!TREE.data[nodeId].inputs){
					TREE.data[nodeId].inputs = {};
				}

				if(input.value){
					TREE.data[nodeId].inputs[id] = input.value;
				}
				else{
					delete TREE.data[nodeId].inputs[id];
				}
				
			});
			TREE.connectionRemoved.add(function(data){
				if(data.to != nodeId+'.'+id) return;
				input.value = '';				
				inputMirror.innerHTML = placeholder;
				container.classList.add('placeholder');
				
			});
			TREE.connectionAdded.add(function(data){
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


		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return VisualNodeInput;
});