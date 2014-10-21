define(
[
	'Tree',
	'Definitions'
],
function (
	TREE,
	DEFINITIONS
){
	"use strict";

	var CodeEditor = function(){
		var
		self = this,
		container,
		data;

		var init = function() {
			container = document.createElement('pre');
			container.classList.add('ui-code-editor');

			hide();
		}

		var generateIncludes = function(data){
			var text  = '';
			//text += '// Include the Quirbot library';
			//text += generateNewLine();
			text += '#include "Quirkbot.h"';
			text += generateNewLine();
			return text;
		}
		var generateDeclares = function(data){
			var text = '';
			//text += '// Declare all the nodes we are going to use';
			//text += generateNewLine();

			var instances = Object.keys(data);
			instances.sort(nodeSort);
			instances.forEach(function(instance){
				var type = DEFINITIONS.data[data[instance].type].type;
				
				text += type + ' ' + instance + ';';
				text += generateNewLine();
			})
			return text;
		}

		var generateConnections = function(data){
			var text = '';
			var instances = Object.keys(data);
			instances.sort(nodeSort);
			instances.forEach(function(instance){
				var connectionText = generateSingleConnection(instance, data);

				if(connectionText){
					text += connectionText;

					if(instances.lastIndexOf(instance) != instances.length-1 ){
						text += generateNewLine();
					}
					
				}
				
			})
			return text;
		}
		var generateSingleConnection = function(instance, data){
			var text = '';
			
			var node = data[instance];

			if(node.inputs){
				var inputIds = Object.keys(node.inputs);
				inputIds.sort(inputSort);
				
				inputIds.forEach(function(inputId){
					var connection = node.inputs[inputId];
					text += generateTabSpace();

					if(isCollectionItem(inputId)){
						if(isPrimitive(connection)){
							text += generateCollectionPrimitiveConnection(instance, inputId, connection);
						}
						else{
							text += generateCollectionOutputConnection(instance, inputId, connection);
						}
					}
					else{
						if(isPrimitive(connection)){
							text += generatePrimitiveConnection(instance, inputId, connection);
						}
						else{
							text += generateOutputConnection(instance, inputId, connection);
						}
					}			

					text += generateNewLine();

				});
			}

			if(node.outputArray){
				var outputConnections = node.outputArray;
				//outputIds.sort(inputSort);
				
				outputConnections.forEach(function(connection){
					var outputId = 'out';
					text += generateTabSpace();

					
					if(isPrimitive(connection)){
						text += generatePrimitiveConnection(instance, outputId, connection);
					}
					else{
						text += generateOutputConnection(instance, outputId, connection);
					}
								

					text += generateNewLine();

				});
			}
			
			
		
			return text;
		}

		var generateFunctionOpenning = function(){
			var text = '';
			text += 'void start(){';
			text += generateNewLine();

			return text;
		}
		var generateFunctionClosing = function(){
			var text = '';
			text += '}';

			return text;
		}

		var generateNewLine = function(){
			return "\n";
		}
		var generateTabSpace = function(){
			return '    ';
		}

		var generatePrimitiveConnection = function(instance, inputId, connection){	
			return instance + '.' + inputId + ' = ' + connection + ';';
		}
		var generateOutputConnection = function(instance, inputId, connection){
			return instance + '.' + inputId + '.connect(' + connection + ');';
		}
		var generateCollectionPrimitiveConnection = function(instance, inputId, connection){	
			var index = getCollectionItemIndex(inputId);
			return instance + '[' + index + '] = ' + connection + ';';
		}
		var generateCollectionOutputConnection = function(instance, inputId, connection){
			var index = getCollectionItemIndex(inputId);
			return instance + '[' + index + '].connect(' + connection + ');';
		}


		var isCollectionItem = function(inputId){
			var regex = /^items\[([0-9]+)\]$/g;
			var regexArray = regex.exec(inputId);
			return (regexArray !== null);
		}
		var getCollectionItemIndex = function(inputId){
			var regex = /^items\[([0-9]+)\]$/g;
			var regexArray = regex.exec(inputId);
			var inputIndex = parseInt(regexArray[1]);
			return inputIndex;
		}
		var isPrimitive = function(connection){
			return (connection - parseFloat( connection ) + 1) >= 0;
		}

		var nodeSort = function(a,b){
			var nodeA = data[a];
			var nodeB = data[b];
			var typeA = DEFINITIONS.data[nodeA.type];
			var typeB = DEFINITIONS.data[nodeB.type];


			if(typeA.out && typeB.out){
				if(nodeA.type < nodeB.type) return -1;
				else if(nodeA.type > nodeB.type) return 1;
			}
			
			if (typeA.out) return -1;
			else if (typeB.out) return 1;
			
			return 0;

	
		}

		var inputSort = function(a,b){
			var aIsCollectionItem = isCollectionItem(a);
			var bIsCollectionItem = isCollectionItem(b);

			if(aIsCollectionItem && bIsCollectionItem){
				var aIndex = getCollectionItemIndex(a);
				var bIndex = getCollectionItemIndex(b);


				if(aIndex < bIndex) return -1;
				else if( aIndex == bIndex) return 0;
				else return 1;
			}
			else if(aIsCollectionItem) return 1;
			else if(bIsCollectionItem) return -1;

			return 0;
		}

		var convertInputsToOutpus = function(data){
			Object.keys(data).forEach(function(instance){
				var node = data[instance];
				if(!node.inputs) return;
				Object.keys(node.inputs).forEach(function(inputId){
					var connection = node.inputs[inputId];
					if(isPrimitive(connection)) return;
					if(isCollectionItem(inputId)) return;
					var connectionArray = connection.split('.');
					if(!connectionArray || connectionArray.length != 2) return;

					var referenceNode = data[connectionArray[0]];
					if(!referenceNode.outputArray){
						referenceNode.outputArray = [];
					}
					referenceNode.outputArray.push(instance + '.' + inputId);
					delete node.inputs[inputId];
				});
			});
			return data;
		}

		var update = function(){
			data = JSON.parse(JSON.stringify(TREE.data));
			data = convertInputsToOutpus(data);

			var text = generateIncludes(data);
			text += generateNewLine();

			text += generateDeclares(data);
			text += generateNewLine();

			text += generateFunctionOpenning();
			text += generateConnections(data);
			text += generateFunctionClosing();


			container.innerHTML = text;
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


		init();
	}

	return CodeEditor;
});