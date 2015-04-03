/**
 * CSSData
 *
 * This class will create a bridge between CSS and JS, what will come in handy
 * to for example, expose LESS varibles to your script.
 *
 * It works by creating an invisible dom element (*)div#cssdata, that will have it's
 * (**)style.fontFamily filled via CSS. We then can access that property via 
 * window.getComputedStyle (use a pollyfill if needed), and parse the result to
 * JSON.
 *
 *
 * 
 * Sample usage
 *		
 *		css:
 *			#cssdata{ font-family: {"foo":"bar"}';
 *
 *		js:
 *			console.log(CSSDATA.get('foo')); // outputs 'bar'
 *
 *
 *
 * Notes
 *
 *		(*)		The reason to crete a new element and not use a pseudo element like
 *				body::before, is because older browsers can't access pseudo elements
 *				via Javascript.
 *
 *		(**)	The reason to use .fontFamily instead of .content because it also takes
 *				a string and some browsers don't read .content via Javascript.
 *
 *
 **/

(function (){
	"use strict";

	var getComputedStyle = window.getComputedStyle || function(el) {
		this.el = el;
		this.getPropertyValue = function(prop) {
			var re = /(\-([a-z]){1})/g;
			if (re.test(prop)) {
				prop = prop.replace(re, function () {
					return arguments[2].toUpperCase();
				});
			}
			return el.currentStyle[prop] ? el.currentStyle[prop] : null;
		};
		return this;
	};

	var node = document.createElement('div');
	node.id = "cssdata";
	node.style.display = 'none';
	document.body.appendChild(node);


	var data;
	try{
		var contentString = getComputedStyle(node).fontFamily;
		data = JSON.parse(contentString.substring(1, contentString.length -1 ));	

	}
	catch(e){
		data = {};
	}

	var CSSData = function(){
		var self = this;
		var get = function(key, defaultValue){
			var value = data[key];
			return (typeof value === 'undefined') ? defaultValue : value;
		}
		Object.defineProperty(self, 'get', {
			value: get
		});
	}

	var CSSDATA = new CSSData();



	if(typeof define !== 'undefined'){
		define([], function(){
			return CSSDATA;
		});
	}
	else if (typeof exports !== 'undefined'){
		exports.get = CSSDATA.get;
	}
	else window.CSSDATA = CSSDATA;
})();