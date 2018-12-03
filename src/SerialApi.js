// API -------------------------------------------------------------------------
var SerialApi = {};


/** Queue Call
 *  This contraption allows you to make sure you will never make more tha one
 *  call to the chrome.serial api at the same time (decided to do this after
 *  observing really weird bugs on Chromebook).
 */
SerialApi._callQueue = [];
SerialApi._callQueueIdFactory = 0;
SerialApi._queueCallBusy = false;
SerialApi._tickCallQueue = function() {
	if(SerialApi._queueCallBusy || !SerialApi._callQueue.length){
		return;
	}
	SerialApi._queueCallBusy = true;
	var call = SerialApi._callQueue[0];

	call.fn()
	// Call always resolves (no need for catch)
	.then(function() {
		SerialApi._queueCallBusy = false;
		SerialApi._callQueue.shift();
		SerialApi._tickCallQueue();
	});
}
SerialApi._queueCall = function(call) {
	return new Promise(function(resolve, reject){
		SerialApi._callQueue.push(
			{
				id: SerialApi._callQueueIdFactory++,
				fn: function() {
					return new Promise(function(alwaysResolve) {
						new Promise(call)
						.then(function() {
							resolve.apply(this, arguments);
							alwaysResolve();
						})
						.catch(function() {
							reject.apply(this, arguments);
							alwaysResolve();
						})
					});
				}
			}
		);
		SerialApi._tickCallQueue();
	});
}


// METHODS ---------------------------------------------------------------------
SerialApi.getDevices = function(){
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'getDevices',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.getDevices(
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getDevices',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'getDevices',
				message: e.toString()
			});
		};
	});
}
SerialApi.connect = function (path, options) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'connect',
				message: 'Timeout'
			});
		}, 2000);
		try{
			options = options || {};
			options.name = options.name || path;
			chrome.serial.connect(
				path,
				options,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'connect',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'connect',
				message: e.toString()
			});
		};
	});
}
SerialApi.update = function (connectionId, options) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'update',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.update(
				connectionId,
				options,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'update',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'update',
				message: e.toString()
			});
		};
	});
}
SerialApi.disconnect = function (connectionId) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'disconnect',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.disconnect(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'disconnect',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'disconnect',
				message: e.toString()
			});
		};
	});
}
SerialApi.setPaused = function (connectionId, paused) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'setPaused',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.setPaused(
				connectionId,
				paused,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'setPaused',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'setPaused',
				message: e.toString()
			});
		};
	});
}
SerialApi.getInfo = function (connectionId) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'getInfo',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.getInfo(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getInfo',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'getInfo',
				message: e.toString()
			});
		};
	});
}
SerialApi.getConnections = function () {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'getConnections',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.getConnections(
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getConnections',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'getConnections',
				message: e.toString()
			});
		};
	});
}
SerialApi.send = function (connectionId, data) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'send',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.send(
				connectionId,
				data,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'send',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'send',
				message: e.toString()
			});
		};
	});
}
SerialApi.flush = function (connectionId) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'flush',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.flush(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'flush',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'flush',
				message: e.toString()
			});
		};
	});
}
SerialApi.getControlSignals = function (connectionId) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'getControlSignals',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.getControlSignals(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'getControlSignals',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'getControlSignals',
				message: e.toString()
			});
		};
	});
}
SerialApi.setControlSignals = function (connectionId) {
	return SerialApi._queueCall(function(resolve, reject){
		var timer = setTimeout(function (argument) {
			reject({
				file: 'Serial',
				step: 'setControlSignals',
				message: 'Timeout'
			});
		}, 500);
		try{
			chrome.serial.setControlSignals(
				connectionId,
				SerialApi.checkRuntimeError(
					resolve,
					reject,
					'setControlSignals',
					timer
				)
			);
		}
		catch(e){
			clearTimeout(timer);
			reject({
				file: 'Serial',
				step: 'setControlSignals',
				message: e.toString()
			});
		};
	});
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
SerialApi.checkRuntimeError = function(resolve, reject, rejectStep, timer){
	return function(){
		clearTimeout(timer);

		if(chrome.runtime.lastError){
			reject({
				file: 'Serial',
				step: 'checkRuntimeError -> ' + rejectStep,
				message: chrome.runtime.lastError.message,
				payload: arguments
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
window.SerialApi = SerialApi
