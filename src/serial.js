// API -------------------------------------------------------------------------
var SerialApi = {};
// METHODS
SerialApi.getDevices = function(){
	var promise = function(resolve, reject){
		try{
			chrome.serial.getDevices(
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getDevices'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'getDevices',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.connect = function (path, options) {
	var promise = function(resolve, reject){
		try{
			options.name = options.name || path;
			chrome.serial.connect(
				path,
				options,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'connect'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'connect',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.update = function (connectionId, options) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.update(
				connectionId, 
				options, 
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'update'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'update',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.disconnect = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.disconnect(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'disconnect'
				)
			);			
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'disconnect',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.setPaused = function (connectionId, paused) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setPaused(
				connectionId,
				paused,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'setPaused'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'setPaused',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.getInfo = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getInfo(
				connectionId, 
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getInfo'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'getInfo',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.getConnections = function () {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getConnections(
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getConnections'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'getConnections',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.send = function (connectionId, data) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.send(
				connectionId, 
				data,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'send'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'send',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.flush = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.flush(
				connectionId, 
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'flush'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'flush',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.getControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getControlSignals(
				connectionId, 
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getControlSignals'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'getControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.setControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setControlSignals(
				connectionId, 
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'setControlSignals'
				)
			);
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
// LISTENERS
SerialApi.onReceiveListeners = [];
SerialApi.addReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener = {
				fn: function (message) {
					message.data = SerialApi.binaryToString(message.data); 
					listener(message);
				},
				listener : listener
			}
			SerialApi.onReceiveListeners.push(wrapperListener);
			chrome.serial.onReceive.addListener(wrapperListener.fn);
			resolve(wrapperListener.fn)
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'addReceiveListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.removeReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener;
			SerialApi.onReceiveListeners.forEach(function (_wrapperListener, index) {
				if(wrapperListener) return;
				if(_wrapperListener.listener == listener){
					wrapperListener = _wrapperListener;
					SerialApi.onReceiveListeners.splice(index, 1);
				}
			})
			chrome.serial.onReceive.removeListener(wrapperListener.fn);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'removeReceiveListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}

SerialApi.addReceiveErrorListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.onReceiveError.addListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
SerialApi.removeReceiveErrorListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.onReceiveError.removeListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'Serial',
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
// UTILS -----------------------------------------------------------------------
SerialApi.checkRuntimeError = function(resolve, reject, rejectStep){
	return function(){
		if(chrome.runtime.lastError){
			reject({
				file: 'Serial',
				step: 'checkRuntimeError -> ' + rejectStep,
				message: chrome.runtime.lastError.message
			});
		}
		else{
			resolve.apply(this, arguments)
		}
	};	
}
SerialApi.stringToBinary = function(s) {
	var binary = new ArrayBuffer(s.length);
	var buffer = new Uint8Array(binary);
	for (var i = 0; i < s.length; i++) {
		buffer[i] = s.charCodeAt(i);
	}
	return binary;
}
SerialApi.binaryToString = function(binary) {
	var buffer = new Uint8Array(binary);
	var chars = [];
	for (var i = 0; i < buffer.length; ++i) {
		chars.push(buffer[i]);
	}
	return String.fromCharCode.apply(null, chars);
}