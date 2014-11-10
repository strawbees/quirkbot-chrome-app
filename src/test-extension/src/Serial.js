define(
[
	
],
function (

){
	"use strict";

	var EXTENSION_CALL_STACK = {};
	
	window.addEventListener("message", function(event) {
		// avoid recursive loop
		if(event.data._fromPage) return;
		console.log('page response', event.data)

		if (!EXTENSION_CALL_STACK[event.data.id]) return;

		EXTENSION_CALL_STACK[event.data.id](event.data)
		delete EXTENSION_CALL_STACK[event.data.id];
	}, false);

	var generateGuid = (function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
		}
		return function() {
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
		};
	})();

	var generateExtensionCall = function(callName){
		console.log('generateExtensionCall', callName)
		var call = function(){
			var callArguments = Array.prototype.slice.call(arguments, 0);

			var promise = new Promise(function(resolve, reject){
				var callId = generateGuid();

				EXTENSION_CALL_STACK[callId] = function(response){
					console.log('call stack handler', response)
					if(response.error){
						reject(response.error)
					}
					else {
						console.log('call stack handler success', response.arguments)
						resolve.apply(this, response.arguments)
					}
				}	
				
				var message = {
					_fromPage : true,
					id: callId,
					name: callName,
					arguments: callArguments
				};
				console.log('call', callName, message)
				window.postMessage(message, "*");
			});

			return promise;
		}
		return call;
		
	}	
	

	
	var Serial = function(){
		var self = this;

		/*portsUpdated,
		boardConnected,
		boardDisconnected,
		messageReceived,

		requestPorts,
		sendMessage,*/

		var echo = generateExtensionCall('echo');
		var getDevices = generateExtensionCall('getDevices');
		var testInvalidError = generateExtensionCall('this call do not exist');

		var init = function(){
			//var test = generateExtensionCall();
			
			echo('hello', 'world')
			.then(function(message){
				console.log('Success!', message)
				return getDevices()
			})
			.then(function(devices){
				console.log('Success!', devices)
				return testInvalidError()
			})
			.catch(function(error){
				console.error('Error!',error)
			})

		}

		init()

		
	}
	var serial = new Serial();
	return serial;
});