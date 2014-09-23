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
			container.classList.add('visual-editor');

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
			//TREE.nodeRemoved.add(onNodeRemoved);
			/*tree.connectionAdded.add(function (value) {
				console.log('connectionAdded', value)
			});
			tree.connectionRemoved.add(function (value) {
				console.log('connectionRemoved', value)
			});*/
		}

		var onNodeAdded = function(id){
			var node = new VisualNode(id);
			container.appendChild(node.container);
		}

		Object.defineProperty(self, 'container', {
			get: function(){ return container; }
		});

		init();
	}

	return VisualEditor;
});