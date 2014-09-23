define(
[
	'libs/interact',
	'happy/_libs/mout/string/hyphenate',
	'ui/VisualNodeInput',
	'Definitions',
	'Tree'
],
function (
	interact,
	hyphenate,
	VisualNodeInput,
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

			var title = document.createElement('h5');
			title.classList.add('title');
			title.innerHTML = spec.name;
			container.appendChild(title);

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
			

			if(spec.out){
				var out = document.createElement('div');
				out.classList.add('out');
				out.innerHTML = 'out';

				container.appendChild(out);
			}
			// Mouse events
			container.addEventListener('mouseover', function(){
				container.classList.add('focus');
			})
			container.addEventListener('mouseout', function(){
				container.classList.remove('focus');
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

				// Move to front
				var parentNode = container.parentNode;
				parentNode.removeChild(container);
				parentNode.appendChild(container);
			})
			// Dragging using browser native
			/*if(!treeNode.visualX) treeNode.visualX = 0;
			if(!treeNode.visualY) treeNode.visualY = 0;
			container.draggable = true;	
			container.addEventListener('dragstart', function(e){
 				 e.dataTransfer.setData('text/plain', id);
 				 e.dataTransfer.effectAllowed = 'move';
			});
			container.addEventListener('dragend', function(e){
				treeNode.visualX += e.offsetX;
				treeNode.visualY += e.offsetY - container.offsetHeight;

				if(treeNode.visualX < 0) treeNode.visualX = 0;
				if(treeNode.visualY < 0) treeNode.visualY = 0;
			})*/
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return VisualNode;
});