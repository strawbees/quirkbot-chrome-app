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
		adapter,
		openConnection;

		/*
		quirkbotConnected
		quirkbotDisconnected
		program(quirkbot, statusCallbak)
		send(quirkbot)
		monitor(quirkbot, callback)
		*/

		

		var init = function(){
			// Create the serial adapter
			var methods = [
				"getDevices",
				"connect",
				"update",
				"disconnect",
				"setPaused",
				"getInfo",
				"getConnections",
				"send",
				"flush",
				"getControlSignals",
				"setControlSignals"
			];
			var events = [
				"onReceive",
				"onReceiveError"
			];

			
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
			
			adapter.onReceive.add(onReceive);
			adapter.onReceiveError.add(onReceiveError);


			adapter.getDevices()
			.then(function(devices){
				console.log(devices)
				return adapter.connect(devices[4].path, {bitrate: 9600})
			})
			.then(function(connection){
				openConnection = connection;
				setTimeout(function(){
					adapter.disconnect(connection.connectionId)
					adapter.onReceive.remove(onReceive);
				}, 5000)
			})
			.catch(function (error) {
				console.error(error);
			})



		}

		var onReceive = function (argument) {
			console.log('onReceive', JSON.stringify(argument))
		}
		var onReceiveError = function (argument) {
			console.log('onReceiveError', argument)
		}

		init()

		
	}
	var serial = new Serial();
	return serial;
});