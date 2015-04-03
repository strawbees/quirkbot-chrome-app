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
			var events = ["structureChange"];
			
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
			
			adapter.structureChange.add(onStructureChange)
			.then(function(a){
				console.log(a)
			})
			.catch(function(error){
				console.error('Problem adding event');
				console.log(error)
			});

		}

		var onStructureChange = function (structure) {
			console.log(structure);
		}


		init()

		
	}
	var serial = new Serial();
	return serial;
});