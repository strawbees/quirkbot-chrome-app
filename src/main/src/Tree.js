define(
[
	'happy/_libs/mout/string/camelCase',
	'happy/_libs/signals',
	'happy/utils/Vendor'
],
function (
	camelCase,
	Signal,
	Vendor
){
	"use strict";

	var vendor = new Vendor();
	var requestAnimationFrame = vendor.validateMethod('requestAnimationFrame');

	var Tree = function(){
		var
		self = this,
		data = {},
		clone = {},
		nodeAdded,
		nodeRemoved,
		connectionAdded,
		connectionRemoved,
		nodePositionUpdated,
		allowUpdate;

		var init = function() {
			nodeAdded = new Signal();
			nodeRemoved = new Signal();
			connectionAdded = new Signal();
			connectionRemoved = new Signal();
			nodePositionUpdated = new Signal();

			nodeAdded.add(save);
			nodeRemoved.add(save);
			connectionAdded.add(save);
			connectionRemoved.add(save);
			nodePositionUpdated.add(save);

			update();
		}
		var update = function() {
			requestAnimationFrame(update)
			
			for(var node in data){
				if( typeof(data[node]) === 'undefined' || !data[node] ){
					delete data[node];
					continue;
				}

				// A new node has been created
				if(!clone[node]){ 
					nodeAdded.dispatch(node);
					nodePositionUpdated.dispatch(
						node,
						data[node]._x,
						data[node]._y
					);
				}
				else{
					// The node position has been updated
					if(data[node]._x != clone[node]._x
						|| data[node]._y != clone[node]._y){
						nodePositionUpdated.dispatch(
							node,
							data[node]._x,
							data[node]._y
						);
					}
				}
			}
			for(var node in clone){
				if( typeof(clone[node]) === 'undefined' || !clone[node] ){
					delete clone[node];
					continue;
				}
				// A node has been removed...
				if(!data[node]){
					//... so every connection from it's inputs is also
					for(var connection in clone[node].inputs){
						connectionRemoved.dispatch({ 
							to: node + '.' + connection, 
							from: clone[node].inputs[connection]
						});
					}

					// Check if the node output was connected to any input
					for(var _node in data){
						for(var connection in data[_node].inputs){
							var from = data[_node].inputs[connection];
							if(from	== node + '.out'){
								delete  data[_node].inputs[connection];
								connectionRemoved.dispatch({ 
									to: _node + '.' + connection, 
									from: node + '.out'
								});
							}
						}
					}
					nodeRemoved.dispatch(node);
				}
			}

			for(var node in data){
					
				if(!clone[node]){
					for(var connection in data[node].inputs){
						connectionAdded.dispatch({ 
							to: node + '.' + connection, 
							from: data[node].inputs[connection]
						});
					}
				}
				else{

					
					for(var connection in data[node].inputs){
						if(!clone[node].inputs) clone[node].inputs = {};
						if(!clone[node].inputs[connection]){
							connectionAdded.dispatch({ 
								to: node + '.' + connection, 
								from: data[node].inputs[connection]
							});

						}
						else {
							if(JSON.stringify(clone[node].inputs[connection])
								!= JSON.stringify(data[node].inputs[connection])){
								connectionRemoved.dispatch({ 
									to: node + '.' + connection, 
									from: clone[node].inputs[connection]
								});
								connectionAdded.dispatch({ 
									to: node + '.' + connection, 
									from: data[node].inputs[connection]
								});
							}
						}

					}
					for(var connection in clone[node].inputs){
						if(!data[node].inputs) data[node].inputs = {};
						if(!data[node].inputs[connection]){
							connectionRemoved.dispatch({ 
								to: node + '.' + connection, 
								from: clone[node].inputs[connection]
							});
						}
					}
				}
			}
			clone = JSON.parse(JSON.stringify(data));
		}

		var generateSafeNodeId = function(original){
			var base = camelCase(original);
			var name = base;
			var count = 1;
			while(data[name]){
				count++;
				name = base + count;
			}

			return (count>1) ? name: base;
		};

		var save = function(){
			sessionStorage.setItem("QuirkbotAutoSaveTree", JSON.stringify(data));
		}
		var load = function(){
			var saved = sessionStorage.getItem('QuirkbotAutoSaveTree');
			data = (saved) ? JSON.parse(saved) : {};
		}

		var getData = function() {
			return data;
		}
		var setData = function(value) {
			if(value)
				data = value;
		}
		var getNodeAdded = function() {
			return nodeAdded;
		}
		var getNodeRemoved = function() {
			return nodeRemoved;
		}
		var getConnectionAdded = function() {
			return connectionAdded;
		}
		var getConnectionRemoved = function() {
			return connectionRemoved;
		}
		var getNodePositionUpdated = function() {
			return nodePositionUpdated;
		}
		Object.defineProperty(self, 'data', {
			get: getData,
			set: setData
		});
		Object.defineProperty(self, 'nodeAdded', {
			get: getNodeAdded
		});
		Object.defineProperty(self, 'nodeRemoved', {
			get: getNodeRemoved
		});
		Object.defineProperty(self, 'connectionAdded', {
			get: getConnectionAdded
		});
		Object.defineProperty(self, 'connectionRemoved', {
			get: getConnectionRemoved
		});
		Object.defineProperty(self, 'nodePositionUpdated', {
			get: getNodePositionUpdated
		});
		Object.defineProperty(self, 'generateSafeNodeId', {
			value: generateSafeNodeId
		});
		Object.defineProperty(self, 'save', {
			value: save
		});
		Object.defineProperty(self, 'load', {
			value: load
		});

		init();
	}

	var tree = new Tree();

	return tree;
});