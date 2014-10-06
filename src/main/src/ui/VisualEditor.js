define(
[
	'ui/VisualNode',
	'Tree'
],
function (
	VisualNode,
	TREE
){
	"use strict";

	var VisualEditor = function(){
		var
		self = this,
		container,
		nodes;

		var init = function() {
			container = document.createElement('div');
			container.classList.add('ui-visual-editor');

			/*document.addEventListener('keydown', function(e){
				console.log(e)
				if(e.keyCode != 46 && e.keyCode != 8) return;
				e.preventDefault();

				Object.keys(nodes).forEach(function(id){
					if(!nodes[id].selected) return;
					delete TREE.data[id];
				});
			
			}) */

			nodes = {};

			TREE.nodeAdded.add(onNodeAdded);
			TREE.nodeRemoved.add(onNodeRemoved);

			hide();
		}

		var onNodeAdded = function(id){
			nodes[id] = new VisualNode(id, self);
			container.appendChild(nodes[id].container);
		}
		var onNodeRemoved = function(id){
			delete nodes[id];
		}


		var update = function(){
			Object.keys(nodes).forEach(function(id){
				nodes[id].update();
			})
		}

		var show = function(){
			container.style.display = 'block';
			update();
		}
		var hide = function(){
			container.style.display = 'none';
		}

		Object.defineProperty(self, 'show', {
			value: show
		});
		Object.defineProperty(self, 'hide', {
			value: hide
		});
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});
		Object.defineProperty(self, 'nodes', {
			get: function(){ return nodes; }
		});

		init();
	}

	return VisualEditor;
});