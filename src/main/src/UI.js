define(
[	
	'ui/Menu',
	'ui/Authentication',
	'ui/DefinitionList',
	'ui/VisualEditor',
	'ui/CodeEditor',
	'ui/SerialMonitor'
],
function (
	Menu,
	Authentication,
	DefinitionList,
	VisualEditor,
	CodeEditor,
	SerialMonitor
){
	"use strict";

	var UI = function(){
		var self = this,
		menu,
		authentication,
		definitionList,
		visualEditor,
		codeEditor,
		serialMonitor;

		var init = function(container){
			menu = new Menu();
			authentication = new Authentication();
			definitionList = new DefinitionList();
			visualEditor = new VisualEditor();
			codeEditor = new CodeEditor();
			serialMonitor = new SerialMonitor();

			container.appendChild(menu.container);
			container.appendChild(authentication.container);
			container.appendChild(definitionList.container);
			container.appendChild(visualEditor.container);
			container.appendChild(codeEditor.container);
			container.appendChild(serialMonitor.container);

			// Tab controle
			visualEditor.hide();
			codeEditor.hide();
			serialMonitor.hide();
			
			var currentTab;
			menu.tabChanged.add(function(tab){
				if(currentTab){
					currentTab.hide();
				}
				switch(tab){
					case 'visual':
						currentTab = visualEditor;
						break;
					case 'code':
						currentTab = codeEditor;
						break;
					case 'serial':
						currentTab = serialMonitor;
						break;
				}
				currentTab.show();
			})
		}

		Object.defineProperty(self, 'init', {
			value: init
		});
		Object.defineProperty(self, 'menu', {
			get: function(){ return menu; }
		});
		Object.defineProperty(self, 'authentication', {
			get: function(){ return authentication; }
		});
		Object.defineProperty(self, 'definitionList', {
			get: function(){ return definitionList; }
		});
		Object.defineProperty(self, 'visualEditor', {
			get: function(){ return visualEditor; }
		});
		Object.defineProperty(self, 'codeEditor', {
			get: function(){ return codeEditor; }
		});
		Object.defineProperty(self, 'serialMonitor', {
			get: function(){ return serialMonitor; }
		});
	}

	var ui = new UI();

	return ui;
});