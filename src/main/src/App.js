define(
[
	'happy/app/BaseApp',
	'ui/DefinitionList',
	'ui/VisualEditor',
	'Tree',
	'Definitions'
],
function (
	BaseApp,
	DefinitionList,
	VisualEditor,
	TREE,
	DEFINITIONS
){
	"use strict";

	var App = function(){
		var 
		self = this,
		uiMenu,
		uiDefinitions,
		uiVisualEditor,
		uiCodeEditor;

	
		self.setup = function(){	
			self.container.classList.add('loading');

			DEFINITIONS.load(self.container.dataset.indexPath || 'nodes/index.json')
			.then(function () {
				self.container.classList.remove('loading');
				createUI();
				TREE.load(); 

			})
			.catch(function(error) {
				self.container.classList.remove('loading');
				logError(error);
			});
			
		}

		var createUI = function(){
			//uiMenu = new Menu();
			//self.container.appendChild(uiMenu.container);

			uiDefinitions = new DefinitionList();
			self.container.appendChild(uiDefinitions.container);

			uiVisualEditor = new VisualEditor();
			self.container.appendChild(uiVisualEditor.container);

			//uiCodeEditor = new CodeEditor();
			//self.container.appendChild(uiCodeEditor.container);

		}

		var logError = function (error) {
			if(error.stack) console.error(error.stack);
			else console.error(error);
		}

		
	}
	App.prototype = new BaseApp();
	return App;
});