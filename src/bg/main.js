var echo = function(){
	var args = Array.prototype.slice.call(arguments, 0);
	var promise = function(resolve, reject){

		resolve.apply(window, args);
	};
	return new Promise(promise);
}

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

chrome.runtime.onInstalled.addListener(function(){
	var api = new ChromeExternalAPIServer();
	api.registerCall('echo', echo);
	api.registerCall('getDevices', getDevices);
});