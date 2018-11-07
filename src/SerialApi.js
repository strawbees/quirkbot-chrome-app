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
/**
* Chrome 62 introduced a bug that causes serial.getConnections to not fire
* it's callback in case all connections have been closed. This is a workaround
* to keep it working, by trying to allways have an open connection.
* Bug fix is on it's way:
* https://chromium-review.googlesource.com/c/chromium/src/+/741522
**/
SerialApi._safeGetConnectionsDummyConnections = []
SerialApi._filterOutDummyConnections = connections => {
	return connections.filter(connection =>
		!SerialApi._safeGetConnectionsDummyConnections.filter(c =>
			c.connectionId === connection.connectionId
		).length
	)
}
SerialApi.safeGetConnections = async () => {
	try {
		// Try first, if it works, good, move on.
		const possibleConnections = await SerialApi.getConnections()
		console.log(possibleConnections)
		// But filter them, in case they are one of the dummy connections
		const connections = SerialApi._filterOutDummyConnections(possibleConnections)
		return connections
	} catch (e) {}

	// If it doesn't work, check if there are any connections on the
	// _safeGetConnectionsDummyConnections stash, and if so, clear them.
	if (SerialApi._safeGetConnectionsDummyConnections.length) {
		for (connection of SerialApi._safeGetConnectionsDummyConnections) {
			try {
				await SerialApi.disconnect(connection.connectionId)
			} catch (e) {}
		}
	}
	SerialApi._safeGetConnectionsDummyConnections = []
	// Create new dummy connections, based on the current devices
	let devices = await SerialApi.getDevices()
	// If the device is clearly a Quirkbot, we can filter it
	devices = devices.filter(device => {
		if(device.displayName && device.displayName.indexOf('Quirkbot') != -1){
			return false
		}
		if(device.productId && device.productId === 0xF004){
			return false
		}
		if(device.productId && device.productId === 0xF005){
			return false
		}
		if(device.vendorId && device.vendorId === 0x2886){
			return false
		}
		return true
	})

	for (device of devices) {
		try {
			const connection = await SerialApi.connect(device.path)
			SerialApi._safeGetConnectionsDummyConnections.push(connection)
		} catch (e) {}
	}

	// If there are no dummy connections just return early, with an empty array
	if(!SerialApi._safeGetConnectionsDummyConnections.length) {
		return []
	}


	// A small delay seems to be necessary
	await delay(400)()

	// Finally get the connections
	const possibleConnections = await SerialApi.getConnections()

	// But filter them, in case they are one of the dummy connections
	const connections = SerialApi._filterOutDummyConnections(possibleConnections)
	return connections
}
SerialApi.safeConnect = async (path, options) => {
	// On windows it seems that if you try to connect to a port that is already
	// connected, it will fail. And this will be a problem because of our dummy
	// connections...
	// So first try to connect normally
	//try {
	//	const connection = await SerialApi.connect(path, options)
	//	return connection
	//} catch (e) {}

	// If that doesn't work, check if the path matches any of the dummy
	// connections
	SerialApi._safeGetConnectionsDummyConnections
	console.log()
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
