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
		api;

		/*portsUpdated,
		boardConnected,
		boardDisconnected,
		messageReceived,

		requestPorts,
		sendMessage,*/

		

		var init = function(){
			var api = new ChromeExtensionAPIClient('hmopjkdaifcnbhfgilhelghojhmabbhm')

			var echo = api.generateCall('echo');
			var getDevices = api.generateCall('getDevices');
			var connectToDevice = api.generateCall('connectToDevice');
			var testInvalidError = api.generateCall('this call do not exist');
			
			echo('hello', 'world')
			.then(function(message){
				console.log(message)
				return getDevices()
			})
			.then(function(devices){
				console.log(devices)
				var promises = []

				return testInvalidError()
			})
			.catch(function(error){
				console.error(error)
			})

		}

		init()

		
	}
	var serial = new Serial();
	return serial;
});