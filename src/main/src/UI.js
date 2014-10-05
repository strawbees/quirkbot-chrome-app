define(
[	
	'ui/Menu',
	'ui/DefinitionList',
	'ui/VisualEditor'
],
function (
	Menu,
	DefinitionList,
	VisualEditor
){
	"use strict";

	var UI = function(){
		var self = this,
		menu,
		definitionList,
		visualEditor;

		var init = function(){
			menu = new Menu();
			definitionList = new DefinitionList();
			visualEditor = new VisualEditor();
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
	}

	var ui = new UI();

	return ui;
});