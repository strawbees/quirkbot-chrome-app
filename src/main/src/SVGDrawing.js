define(
[
	'libs/two',
	'happy/utils/DOM'
],
function (
	Two,
	DOM
){
	"use strict";
	
	var dom = new DOM();

	var SvgDrawing = function(){
		var self = this,
		two,
		element;

		var init = function(_element){
			element = _element;
			var size = dom.measure(element);
			two = new Two({ 
				width: size.width, 
				height: size.height 
			});
			two.appendTo(element);
			
		}
		var resize = function(){
			if(!element) return;
			var size = dom.measure(element);

			two.width = size.width;
			two.height = size.height;
			update();
		}
		var update = function(){
			if(!two) return;
			two.update();
		}

		Object.defineProperty(self, 'init', {
			value: init
		});
		Object.defineProperty(self, 'resize', {
			value: resize
		});
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'two', {
			get: function(){return two;}
		});

	}

	var svgDrawing = new SvgDrawing();

	return svgDrawing;
});