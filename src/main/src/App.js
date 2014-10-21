define(
[
	'happy/app/BaseApp',
	'libs/parse',
	'Tree',
	'Definitions',
	'SVGDrawing',
	'UI',
	'happy/_libs/signals'
],
function (
	BaseApp,
	Parse,
	TREE,
	DEFINITIONS,
	SVGDrawing,
	UI,
	Signal
){
	"use strict";


	var s = new Signal();
	var App = function(){
		var 
		self = this;

	
		self.setup = function(){
					
			window.TREE = TREE;

			self.container.classList.add('loading');

			DEFINITIONS.load(self.container.dataset.indexPath 
				|| 'nodes/index.json')
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
			UI.init(self.container);
			SVGDrawing.init(UI.visualEditor.container);
			UI.menu.tabChanged.add(function(tab){		
				self.onResize(self.size);
			})
		}

		self.onResize = function(size){
			SVGDrawing.resize();
		}
		self.update = function(){
			SVGDrawing.update();
		}

		var logError = function (error) {
			if(error.stack) console.error(error.stack);
			else console.error(error);
		}

		
	}
	App.prototype = new BaseApp();
	return App;
});