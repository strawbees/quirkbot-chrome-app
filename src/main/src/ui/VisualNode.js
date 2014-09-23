define(
[
	'libs/interact',
	'happy/_libs/mout/string/hyphenate',
	'ui/VisualNodeInput',
	'ui/VisualNodeOutput',
	'Definitions',
	'Tree'
],
function (
	interact,
	hyphenate,
	VisualNodeInput,
	VisualNodeOutput,
	DEFINITIONS,
	TREE
){
	"use strict";

	var VisualNode = function(id){
		var
		self = this,
		container;

		var init = function() {
			var treeNode = TREE.data[id];
			var spec = DEFINITIONS.data[treeNode.type];

			container = document.createElement('div');
			container.classList.add('visual-node');
			container.classList.add(hyphenate(spec.name));
			if(spec.in)
				container.classList.add('in');
			if(spec.out)
				container.classList.add('out');
			if(spec.collection)
				container.classList.add('collection');
		

			var draggableLayer = document.createElement('div');
			draggableLayer.classList.add('draggable-layer');
			container.appendChild(draggableLayer);

			var deleteButton = document.createElement('button');
			deleteButton.classList.add('delete');
			deleteButton.innerHTML = '';
			container.appendChild(deleteButton);

			var inputs = document.createElement('div');
			inputs.classList.add('inputs');
			container.appendChild(inputs);

			if(spec.inputs){
				Object.keys(spec.inputs).forEach(function(inputId){
					var input = new VisualNodeInput(
						inputId,
						id,
						spec.inputs[inputId]
					);
					inputs.appendChild(input.container);
				});
			}
			if(spec.collection){
				/*spec.inputs.forEach(function(name){
					var input = document.createElement('div');
					input.classList.add('input');
					input.innerHTML = name;

					inputs.appendChild(input);
				});*/
			}
			var title = document.createElement('h5');
			title.classList.add('title');
			title.innerHTML = spec.name;
			container.appendChild(title);

			var outputs = document.createElement('div');
			outputs.classList.add('outputs');
			container.appendChild(outputs);

			if(spec.out){
				var output = new VisualNodeOutput(
					'out',
					id
				);
				outputs.appendChild(output.container);
			}
			// Mouse events
			container.addEventListener('mouseover', function(){
				container.classList.add('focus');
			})
			container.addEventListener('mouseout', function(){
				container.classList.remove('focus');
			})
			container.addEventListener('click', function(){
				moveToFront()
			})

			// Deleting
			deleteButton.addEventListener('click', function(){
				delete TREE.data[id];
			});
			TREE.nodeRemoved.add(function(_id){
				if(id != _id) return;
				container.parentNode.removeChild(container);
			});
			
			// Dragging			
			if(!treeNode.visualX) treeNode.visualX = 0;
			if(!treeNode.visualY) treeNode.visualY = 0;
			interact(container)
			.draggable({
				onstart:function(event){
					moveToFront();
				},
				onmove: function (event) {
					var target = event.target;
					treeNode.visualX += event.dx;
					treeNode.visualY += event.dy;
				},
				onend: function (event) {}
			})
			.restrict({
				drag: 'parent',
				endOnly: true,
				elementRect: { top: 0, left: 0, bottom: 0, right: 0 }
			});
			TREE.nodePositionUpdated.add(function(_id, x, y){
				if(id != _id) return;
				
				container.style.left = x + 'px';
				container.style.top = y + 'px';

			})
		}

		var moveToFront = function(){
			var parentNode = container.parentNode;
			parentNode.removeChild(container);
			parentNode.appendChild(container);
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return VisualNode;
});