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
			var constants = [
				'A0','A1','A2','A3','A4','A6','A7','A8','A9','A10', 'A11',
				
				'BP1','BP2','BP3','BP4','BP5','BP6',
				
				'LM','RM','LE','RE',
				'LL','RL','RA','H','LA',
				'LLF','RLF','RAF','HF','LAF',
				'LLB','RLB','RAB','HB','LAB',

				'WAVE_SINE','WAVE_SQUARE','WAVE_TRIANGLE','WAVE_PULSE','WAVE_RAMP_UP','WAVE_RAMP_DOWN',
				
				'KEY_0','KEY_1','KEY_2','KEY_3','KEY_4','KEY_5','KEY_6','KEY_7','KEY_8','KEY_9','KEY_A','KEY_B','KEY_C','KEY_D','KEY_E','KEY_F','KEY_G','KEY_H','KEY_I','KEY_J','KEY_K','KEY_L','KEY_M','KEY_N','KEY_O','KEY_P','KEY_Q','KEY_R','KEY_S','KEY_T','KEY_U','KEY_V','KEY_W','KEY_X','KEY_Y','KEY_Z','KEY_LEFT_CTRL','KEY_LEFT_SHIFT','KEY_LEFT_ALT','KEY_LEFT_GUI','KEY_RIGHT_CTRL','KEY_RIGHT_SHIFT','KEY_RIGHT_ALT','KEY_RIGHT_GUI','KEY_UP','KEY_DOWN','KEY_LEFT','KEY_RIGHT','KEY_BACKSPACE','KEY_TAB','KEY_RETURN','KEY_ESC','KEY_INSERT','KEY_DELETE','KEY_PAGE_UP','KEY_PAGE_DOWN','KEY_HOME','KEY_END','KEY_CAPS_LOCK','KEY_F1','KEY_F2','KEY_F3','KEY_F4','KEY_F5','KEY_F6','KEY_F7','KEY_F8','KEY_F9','KEY_F10','KEY_F11','KEY_F12','KEY_SPACE','KEY_EXCLAMATION_POINT','KEY_DOUBLE_QUOTES','KEY_NUMBER_SIGN','KEY_DOLLAR_SIGN','KEY_PERCENT_SIGN','KEY_AMPERSAND','KEY_SINGLE_QUOTE','KEY_OPENING_PARENTHESIS','KEY_CLOSING_PARENTHESIS','KEY_ASTERISK','KEY_PLUS_SIGN','KEY_COMMA','KEY_MINUS_SIGN','KEY_PERIOD','KEY_SLASH','KEY_COLON','KEY_SEMICOLON','KEY_LESS_THAN_SIGN','KEY_EQUAL_SIGN','KEY_GREATER_THAN_SIGN','KEY_QUESTION_MARK','KEY_AT_SYMBOL','KEY_OPENING_BRACKET','KEY_BACKSLASH','KEY_CLOSING_BRACKET','KEY_CARET','KEY_UNDERSCORE','KEY_GRAVE_ACCENT','KEY_OPENING_BRACE','KEY_VERTICAL_BAR','KEY_CLOSING_BRACE','KEY_TILDE',

				'NO_NOTE','NOTE_B0','NOTE_C1','NOTE_CS1','NOTE_D1','NOTE_DS1','NOTE_E1','NOTE_F1','NOTE_FS1','NOTE_G1','NOTE_GS1','NOTE_A1','NOTE_AS1','NOTE_B1','NOTE_C2','NOTE_CS2','NOTE_D2','NOTE_DS2','NOTE_E2','NOTE_F2','NOTE_FS2','NOTE_G2','NOTE_GS2','NOTE_A2','NOTE_AS2','NOTE_B2','NOTE_C3','NOTE_CS3','NOTE_D3','NOTE_DS3','NOTE_E3','NOTE_F3','NOTE_FS3','NOTE_G3','NOTE_GS3','NOTE_A3','NOTE_AS3','NOTE_B3','NOTE_C4','NOTE_CS4','NOTE_D4','NOTE_DS4','NOTE_E4','NOTE_F4','NOTE_FS4','NOTE_G4','NOTE_GS4','NOTE_A4','NOTE_AS4','NOTE_B4','NOTE_C5','NOTE_CS5','NOTE_D5','NOTE_DS5','NOTE_E5','NOTE_F5','NOTE_FS5','NOTE_G5','NOTE_GS5','NOTE_A5','NOTE_AS5','NOTE_B5','NOTE_C6','NOTE_CS6','NOTE_D6','NOTE_DS6','NOTE_E6','NOTE_F6','NOTE_FS6','NOTE_G6','NOTE_GS6','NOTE_A6','NOTE_AS6','NOTE_B6','NOTE_C7','NOTE_CS7','NOTE_D7','NOTE_DS7','NOTE_E7','NOTE_F7','NOTE_FS7','NOTE_G7','NOTE_GS7','NOTE_A7','NOTE_AS7','NOTE_B7','NOTE_C8','NOTE_CS8','NOTE_D8','NOTE_DS8 '

			]
			if(constants.indexOf(connection) != -1) return true;
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
			if (document.selection) {
				var range = document.body.createTextRange();
				range.moveToElementText(container);
				range.select();
			} else if (window.getSelection) {
				var range = document.createRange();
				range.selectNode(container);
				window.getSelection().addRange(range);
			}
		}
		var hide = function(){
			container.style.display = 'none';
			if (document.selection) {
				document.selection.empty()
			}
			else if(window.getSelection){
				window.getSelection().removeAllRanges()
			}
			
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