define(
[
	'ChromeExtensionAPIClient'
],
function (
	ChromeExtensionAPIClient
){
	"use strict";

	var Serial = function(){
		var self = this,
		adapter;

		

		var init = function(){
			// Create the serial adapter
			var methods = [];
			var events = ["quirkbotsChange"];
			
			adapter = {}

			// Google Chrome
			if(typeof chrome !== 'undefined'){
				//var api = new ChromeExtensionAPIClient('lgjmgejpijgfefnfbkdjoepoebaeafin')
				var api = new ChromeExtensionAPIClient('hmopjkdaifcnbhfgilhelghojhmabbhm');
				for (var i = 0; i < methods.length; i++) {
					adapter[methods[i]] = api.generateMethod(methods[i]);
				};
				for (var i = 0; i < events.length; i++) {
					adapter[events[i]] = api.generateEvent(events[i]);
				};
			}
			
			adapter.quirkbotsChange.add(onQuirkbotsChange);

		}

		var onQuirkbotsChange = function (quirkbots) {
			console.log(quirkbots);
		}


		init()

		
	}
	var serial = new Serial();
	return serial;
});