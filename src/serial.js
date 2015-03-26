// API -------------------------------------------------------------------------
var serialApi = {};
// METHODS
serialApi.getDevices = function(){
	var promise = function(resolve, reject){
		try{
			chrome.serial.getDevices(
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'getDevices'
				)
			);
		}
		catch(e){
			reject({
				step: 'getDevices',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.connect = function (path, options) {
	var promise = function(resolve, reject){
		try{
			options.name = options.name || path;
			chrome.serial.connect(
				path,
				options,
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'connect'
				)
			);
		}
		catch(e){
			reject({
				step: 'connect',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.update = function (connectionId, options) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.update(
				connectionId, 
				options, 
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'update'
				)
			);
		}
		catch(e){
			reject({
				step: 'update',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.disconnect = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.disconnect(
				connectionId,
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'disconnect'
				)
			);			
		}
		catch(e){
			reject({
				step: 'disconnect',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.setPaused = function (connectionId, paused) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setPaused(
				connectionId,
				paused,
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'setPaused'
				)
			);
		}
		catch(e){
			reject({
				step: 'setPaused',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.getInfo = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getInfo(
				connectionId, 
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'getInfo'
				)
			);
		}
		catch(e){
			reject({
				step: 'getInfo',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.getConnections = function () {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getConnections(
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'getConnections'
				)
			);
		}
		catch(e){
			reject({
				step: 'getConnections',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.send = function (connectionId, data) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.send(
				connectionId, 
				data,
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'send'
				)
			);
		}
		catch(e){
			reject({
				step: 'send',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.flush = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.flush(
				connectionId, 
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'flush'
				)
			);
		}
		catch(e){
			reject({
				step: 'flush',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.getControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getControlSignals(
				connectionId, 
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'getControlSignals'
				)
			);
		}
		catch(e){
			reject({
				step: 'getControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.setControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setControlSignals(
				connectionId, 
				serialApi.checkRuntimeError(
					resolve,
					reject,
					'setControlSignals'
				)
			);
		}
		catch(e){
			reject({
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
// LISTENERS
serialApi.onReceiveListeners = [];
serialApi.addReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener = {
				fn: function (message) {
					message.data = serialApi.binaryToString(message.data); 
					listener(message);
				},
				listener : listener
			}
			serialApi.onReceiveListeners.push(wrapperListener);
			chrome.serial.onReceive.addListener(wrapperListener.fn);
			resolve(wrapperListener.fn)
		}
		catch(e){
			reject({
				step: 'addReceiveListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.removeReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener;
			serialApi.onReceiveListeners.forEach(function (_wrapperListener, index) {
				if(wrapperListener) return;
				if(_wrapperListener.listener == listener){
					wrapperListener = _wrapperListener;
					serialApi.onReceiveListeners.splice(index, 1);
				}
			})
			chrome.serial.onReceive.removeListener(wrapperListener.fn);
			resolve(listener)
		}
		catch(e){
			reject({
				step: 'removeReceiveListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}

serialApi.addReceiveErrorListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.onReceiveError.addListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
serialApi.removeReceiveErrorListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.onReceiveError.removeListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
// UTILS -----------------------------------------------------------------------
serialApi.checkRuntimeError = function(resolve, reject, rejectStep){
	return function(){
		if(chrome.runtime.lastError){
			reject({
				step: rejectStep,
				message: chrome.runtime.lastError.message
			});
		}
		else{
			resolve.apply(this, arguments)
		}
	};	
}
serialApi.stringToBinary = function(s) {
	var binary = new ArrayBuffer(s.length);
	var buffer = new Uint8Array(binary);
	for (var i = 0; i < s.length; i++) {
		buffer[i] = s.charCodeAt(i);
	}
	return binary;
}
serialApi.binaryToString = function(binary) {
	var buffer = new Uint8Array(binary);
	var chars = [];
	for (var i = 0; i < buffer.length; ++i) {
		chars.push(buffer[i]);
	}
	return String.fromCharCode.apply(null, chars);
}

// Register for external access ------------------------------------------------
/*var serialApiInited = false;
var initSerialApi = function() {
	if(serialApiInited) return;
	serialApiInited = true;

	// Register external API calls
	var api = new ChromeExternalAPIServer();
	api.registerMethod('getDevices', serialApi.getDevices);
	api.registerMethod('connect', serialApi.connect);
	api.registerMethod('update', serialApi.update);
	api.registerMethod('disconnect', serialApi.disconnect);
	api.registerMethod('setPaused', serialApi.setPaused);
	api.registerMethod('getInfo', serialApi.getInfo);
	api.registerMethod('getConnections', serialApi.getConnections);
	api.registerMethod('send', serialApi.send);
	api.registerMethod('flush', serialApi.flush);
	api.registerMethod('getControlSignals', serialApi.getControlSignals);
	api.registerMethod('setControlSignals', serialApi.setControlSignals);
	api.registerEvent('onReceive', serialApi.addReceiveListener, serialApi.removeReceiveListener);
	api.registerEvent('onReceiveError', serialApi.addReceiveErrorListener, serialApi.removeReceiveErrorListener);
}
chrome.runtime.onInstalled.addListener(initSerialApi);
chrome.runtime.onStartup.addListener(initSerialApi);*/