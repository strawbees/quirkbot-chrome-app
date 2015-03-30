(function (){
"use strict";

var HexUploader = function(){
	var self = this;

	var errors = {
		INVALID_HEX: 'INVALID_HEX',
		CONNECTION_ERROR: 'CONNECTION_ERROR',
		UNHANDLED: 'UNHANDLED'
	}
	
	var init = function(connection, hexString, statusCb){
		var pad = function(data, pageSize) {
			while (data.length % pageSize != 0) {
				data.push(0);
			}
			return data;
		}
		
		var promise = function(resolve, reject){


			var hexData = new CHROME_ARDUINO_INTEL_HEX(hexString).parse();
			if (hexData == "FAIL") {
				reject({
					error: errors.INVALID_HEX,
					message: 'Hex is invalid.'
				});
				return;
			}

			var boardObj = CHROME_ARDUINO_AVR109.NewAvr109Board(chrome.serial, 128);
			if (!boardObj.status.ok()) {
				reject({
					error: errors.UNHANDLED,
					message: "Couldn't create AVR109 Board: " + boardObj.status.toString()
				});
				return;
			}
			
			var board = boardObj.board;
			console.log('connectionId', connection)
			//SerialApi.disconnect(connection.connectionInfo.connectionId)
			//.then(delay(2000))
			//.then(function(diconnected){
				board.connect(connection.device.path, function(status) {
					if (status.ok()) {
						board.writeFlash(0, pad(hexData, 128), function(status) {
							// parse final status
							var blob = {
								message :  status.toString()
							}
							if(status.ok()){
								resolve(blob);
							}
							else{
								blob.error = errors.UNHANDLED
								reject(blob);
							}
						});
					} else {

						reject({
							error: errors.CONNECTION_ERROR,
							message: "AVR connection error: " + status.toString()
						});
						return;
					}
				});
			//})
			



		}
		return new Promise(promise);
	}

	var delay = function(millis){
		return function(){
			var payload = arguments;
			var promise = function(resolve, reject){
				setTimeout(function(){
					resolve.apply(null, payload);
				}, millis)
			}
			return new Promise(promise);
		}
	}

	Object.defineProperty(self, 'init', {
		value: init
	});
}

if(typeof define !== 'undefined'){
	define([], function(){
		return HexUploader;
	});
}
else if (typeof exports !== 'undefined'){
	exports.HexUploader = HexUploader;
}
else window.HexUploader = HexUploader;

})();