


// API -------------------------------------------------------------------------
// METHODS
var getDevices = function(){
	var promise = function(resolve, reject){
		try{
			chrome.serial.getDevices(resolve);
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
			chrome.serial.connect(path, options, resolve);
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
			chrome.serial.update(connectionId, options, resolve);
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
			chrome.serial.disconnect(connectionId, resolve);
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
			chrome.serial.setPaused(connectionId, paused, resolve);
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
			chrome.serial.getInfo(connectionId, resolve);
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
			chrome.serial.getConnections(resolve);
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
			chrome.serial.send(connectionId, data, resolve);
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
			chrome.serial.flush(connectionId, resolve);
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
			chrome.serial.getControlSignals(connectionId, resolve);
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
			chrome.serial.setControlSignals(connectionId, resolve);
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
					console.log('we hoo', message)
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
var log = function () {
	console.log(arguments)
	var string = '';
	for (var i = 0; i < arguments.length; i++) {
		string += JSON.stringify(arguments[i]) + ' - ';
	};
	var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", 'http://quirkbot.dev:8080/ping/' + encodeURI(string), true );
    xmlHttp.send( null );
}

// Intilize API ----------------------------------------------------------------
var inited = false;
var init = function() {
	if(inited) return;

	inited = true;
	var api = new ChromeExternalAPIServer();
	api.registerMethod('getDevices', getDevices);
	api.registerMethod('connect', connect);
	api.registerMethod('update', update);
	api.registerMethod('disconnect', disconnect);
	api.registerMethod('setPaused', setPaused);
	api.registerMethod('getInfo', getInfo);
	api.registerMethod('getConnections', getConnections);
	api.registerMethod('send', send);
	api.registerMethod('flush', flush);
	api.registerMethod('getControlSignals', getControlSignals);
	api.registerMethod('setControlSignals', setControlSignals);
	api.registerEvent('onReceive', addReceiveListener, removeReceiveListener);
	api.registerEvent('onReceiveError', addReceiveErrorListener, removeReceiveErrorListener);
}
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Heartbeat to keep the app alive ---------------------------------------------
chrome.runtime.onMessage.addListener(function(){});
setInterval(function (argument) {
	chrome.runtime.sendMessage(chrome.runtime.id, '', function () {});
}, 5000)



/*
chrome.runtime.onStartup.addListener(function(details){ 
	log(details, 'onStartup')});
chrome.runtime.onInstalled.addListener(function(details){
	log(details, 'onInstalled')});
chrome.runtime.onSuspend.addListener(function(details){ 
	log(details, 'onSuspend');

	chrome.runtime.reload() });
chrome.runtime.onSuspendCanceled.addListener(function(details){ 
	log(details, 'onSuspendCanceled')});
chrome.runtime.onUpdateAvailable.addListener(function(details){
	log(details, 'onUpdateAvailable')});
chrome.runtime.onBrowserUpdateAvailable.addListener(function(details){
	log(details, 'onBrowserUpdateAvailable')});
chrome.runtime.onConnect.addListener(function(details){
	log(details, 'onConnect')});
chrome.runtime.onConnectExternal.addListener(function(details){
	log(details, 'onConnectExternal')});
chrome.runtime.onMessage.addListener(function(details){
	log(details, 'onMessage')});
chrome.runtime.onMessageExternal.addListener(function(details){
	log(details, 'onMessageExternal')});
chrome.runtime.onRestartRequired.addListener(function(details){
	log(details, 'onRestartRequired')});

*/