// API -------------------------------------------------------------------------
// METHODS
var getDevices = function(){
	var promise = function(resolve, reject){
		try{
			chrome.serial.getDevices(
				checkRuntimeError(
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
var connect = function (path, options) {
	var promise = function(resolve, reject){
		try{
			options.name = options.name || path;
			chrome.serial.connect(
				path,
				options,
				checkRuntimeError(
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
var update = function (connectionId, options) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.update(
				connectionId, 
				options, 
				checkRuntimeError(
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
var disconnect = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.disconnect(
				connectionId,
				checkRuntimeError(
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
var setPaused = function (connectionId, paused) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setPaused(
				connectionId,
				paused,
				checkRuntimeError(
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
var getInfo = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getInfo(
				connectionId, 
				checkRuntimeError(
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
var getConnections = function () {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getConnections(
				checkRuntimeError(
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
var send = function (connectionId, data) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.send(
				connectionId, 
				data,
				checkRuntimeError(
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
var flush = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.flush(
				connectionId, 
				checkRuntimeError(
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
var getControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.getControlSignals(
				connectionId, 
				checkRuntimeError(
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
var setControlSignals = function (connectionId) {
	var promise = function(resolve, reject){
		try{
			chrome.serial.setControlSignals(
				connectionId, 
				checkRuntimeError(
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
var onReceiveListeners = [];
var addReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener = {
				fn: function (message) {
					message.data = binaryToString(message.data); 
					listener(message);
				},
				listener : listener
			}
			onReceiveListeners.push(wrapperListener);
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
var removeReceiveListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			var wrapperListener;
			onReceiveListeners.forEach(function (_wrapperListener, index) {
				if(wrapperListener) return;
				if(_wrapperListener.listener == listener){
					wrapperListener = _wrapperListener;
					onReceiveListeners.splice(index, 1);
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
var addReceiveErrorListener = function (listener) {
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
var removeReceiveErrorListener = function (listener) {
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
var checkRuntimeError = function(resolve, reject, rejectStep){
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
function stringToBinary(s) {
	var binary = new ArrayBuffer(s.length);
	var buffer = new Uint8Array(binary);
	for (var i = 0; i < s.length; i++) {
		buffer[i] = s.charCodeAt(i);
	}
	return binary;
}
function binaryToString(binary) {
	var buffer = new Uint8Array(binary);
	var chars = [];
	for (var i = 0; i < buffer.length; ++i) {
		chars.push(buffer[i]);
	}
	return String.fromCharCode.apply(null, chars);
}
