(function (){
	"use strict";
	
	var ChromeExtensionAPIClient = function(extensionId){
		var self = this,
		listeners = {};

		var generateCall = function(callName){
			var call = function(){
				var callArguments = Array.prototype.slice.call(arguments, 0);

				var promise = new Promise(function(resolve, reject){
					
					var message = {
						name: callName,
						arguments: callArguments
					};

					var port = chrome.runtime.connect(extensionId);
					port.onMessage.addListener(function(response){
						port.disconnect();
						if(response.error){
							reject(response.error)
						}
						else {
							var args = [];
							Object.keys(response.arguments).forEach(function(index){
								args.push(response.arguments[index]);
							})
							resolve.apply(this, args);
						}
						
					});
					port.postMessage(message)

				});

				return promise;
			}
			return call;
		}

		/*var addListener = function(eventName, callback){
			if(typeof callback !== 'function') return;
			if(!listeners[eventName]) listeners[eventName] = [];
			
			var exists = false;
			listeners[eventName].forEach(function(registeredCallback){
				if(registeredCallback == callback){
					exists = true;
					return;
				}
			})

			if(exists) return;
			listeners[eventName].push(callback);
		}
		var removeListener = function(eventName, callback){
			if(!listeners[eventName]) return;
			listeners[eventName].forEach(function(registeredCallback, index){
				if(registeredCallback == callback){
					removed = listeners[eventName].splice(index, 1);
					return;
				}
			})
		}*/

		Object.defineProperty(self, 'generateCall', {
			value: generateCall
		});
	}

	if(typeof define !== 'undefined'){
		define([], function(){
			return ChromeExtensionAPIClient;
		});
	}
	else if (typeof exports !== 'undefined'){
		exports.ChromeExtensionAPIClient = ChromeExtensionAPIClient;
	}
	else window.ChromeExtensionAPIClient = ChromeExtensionAPIClient;
})();