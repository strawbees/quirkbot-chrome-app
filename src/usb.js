// API -------------------------------------------------------------------------
var USBApi = {};
// METHODS
USBApi.getDevices = function(options){
	var promise = function(resolve, reject){
		try{
			chrome.usb.getDevices(
				options,
				USBApi.checkRuntimeError(
					resolve,
					reject,
					'getDevices'
				)
			);
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'getDevices',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
USBApi.getUserSelectedDevices = function(options){
	var promise = function(resolve, reject){
		try{
			chrome.usb.getUserSelectedDevices(
				options,
				USBApi.checkRuntimeError(
					resolve,
					reject,
					'getUserSelectedDevices'
				)
			);
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'getUserSelectedDevices',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
USBApi.findDevices = function(options){
	var promise = function(resolve, reject){
		try{
			chrome.usb.findDevices(
				options,
				USBApi.checkRuntimeError(
					resolve,
					reject,
					'findDevices'
				)
			);
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'findDevices',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
// LISTENERS
USBApi.addDeviceAddedListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.usb.onDeviceAdded.addListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'addDeviceAddedListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
USBApi.removeDeviceAddedListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.usb.onDeviceAdded.removeListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'removeDeviceAddedListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
USBApi.addDeviceRemovedListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.usb.onDeviceRemoved.addListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'addDeviceRemovedListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}
USBApi.removeDeviceRemovedListener = function (listener) {
	var promise = function(resolve, reject){
		try{
			chrome.usb.onDeviceRemoved.removeListener(listener);
			resolve(listener)
		}
		catch(e){
			reject({
				file: 'USB',
				step: 'removeDeviceRemovedListener',
				message: e.toString()
			});
		};
	};
	return new Promise(promise);
}

// UTILS -----------------------------------------------------------------------
USBApi.checkRuntimeError = function(resolve, reject, rejectStep){
	return function(){
		if(chrome.runtime.lastError){
			reject({
				file: 'USB',
				step: 'checkRuntimeError -> ' + rejectStep,
				message: chrome.runtime.lastError.message
			});
		}
		else{
			resolve.apply(this, arguments)
		}
	};
}
