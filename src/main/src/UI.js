define(
[	
	'ui/DefinitionList',
	'ui/VisualEditor'
],
function (
	DefinitionList,
	VisualEditor
){
	"use strict";

	var UI = function(){
		var self = this,
		definitionList,
		visualEditor;

		var init = function(){
			definitionList = new DefinitionList();
			visualEditor = new VisualEditor();
		}

		Object.defineProperty(self, 'init', {
			value: init
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