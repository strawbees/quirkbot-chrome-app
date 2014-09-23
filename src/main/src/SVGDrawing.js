define(
[
	'libs/svg',
	'happy/utils/DOM'
],
function (
	SVG,
	DOM
){
	"use strict";
	
	var dom = new DOM();

	var SvgDrawing = function(){
		var self = this,
		svg,
		element;

		var init = function(domElementId){
			element = document.getElementById(domElementId);
			var size = dom.measure(element);
			svg = SVG(domElementId).size(size.width, size.height);
		}
		var resize = function(){
			if(!element) return;
			var size = dom.measure(element);
			svg.size(size.width, size.height);
		}
		var getSvg =  function(){
			return svg;
		}

		Object.defineProperty(self, 'init', {
			value: init
		});
		Object.defineProperty(self, 'resize', {
			value: resize
		});
		Object.defineProperty(self, 'svg', {
			get: getSvg
		});

	}

	var svgDrawing = new SvgDrawing();

	return svgDrawing;
});