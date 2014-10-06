define(
[	
	'ui/Menu',
	'ui/DefinitionList',
	'ui/VisualEditor',
	'ui/CodeEditor',
	'ui/SerialMonitor'
],
function (
	Menu,
	DefinitionList,
	VisualEditor,
	CodeEditor,
	SerialMonitor
){
	"use strict";

	var UI = function(){
		var self = this,
		menu,
		definitionList,
		visualEditor,
		codeEditor,
		serialMonitor;

		var init = function(){
			menu = new Menu();
			definitionList = new DefinitionList();
			visualEditor = new VisualEditor();
			codeEditor = new CodeEditor();
			serialMonitor = new SerialMonitor();
		}

		Object.defineProperty(self, 'init', {
			value: init
		});
		Object.defineProperty(self, 'menu', {
			get: function(){ return menu; }
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