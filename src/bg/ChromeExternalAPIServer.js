(function (){
	"use strict";

	var ChromeExternalAPIServer = function(){
		var self = this,
		api = {};

		var registerCall = function(key, call){
			api[key] = call;
		}
		var validateCall = function(callName, callArguments){
			var promise = function(resolve, reject){
				try{
					api[callName].apply(window, callArguments)
					.then(resolve)
					.catch(reject);
				}
				catch(e){
					reject({
						step: 'validateAction',
						originalError: e.toString(),
						message: 'Action "' + callName + '" is invalid.'
					});
				}
				

			};
			return new Promise(promise);
		}

		chrome.runtime.onConnectExternal.addListener(function(port) {
			port.onMessage.addListener(function(message) {

				var response = {
					success: true
				}
				validateCall(message.name, message.arguments)
				.then(function(){
					response.success = true;
					response.arguments = arguments;
					port.postMessage(response);
					port.disconnect();
				})
				.catch(function(error){
					response.success = false;
					response.error = error;
					port.postMessage(response);
					port.disconnect();
				})	
			});
		});

		Object.defineProperty(self, 'registerCall', {
			value: registerCall
		});
	}

	if(typeof define !== 'undefined'){
		define([], function(){
			return ChromeExternalAPIServer;
		});
	}
	else if (typeof exports !== 'undefined'){
		exports.ChromeExternalAPIServer = ChromeExternalAPIServer;
	}
	else window.ChromeExternalAPIServer = ChromeExternalAPIServer;
})();