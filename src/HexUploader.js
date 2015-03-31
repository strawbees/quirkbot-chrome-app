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
			
			run(connection)
			.then(log('KICK BOOTLOADER'))
			.then(disconnect)
			.then(log('KB: disconnect'))
			.then(delay(100))
			.then(connectWithParams({bitrate: 1200}))
			.then(log('KB: connectWithParams'))
			.then(delay(100))
			.then(disconnect)
			.then(log('KB: disconnect'))			
			.then(delay(1000))
			.then(connectWithParams({bitrate: 57600}))
			.then(log('KB: connectWithParams'))
			.then(log('KB: Doing upload....'))
			.then(delay(5000))
			.then(disconnect)
			.then(log('KB: disconnect'))
			.then(connectWithParams({bitrate: 115200}))
			.then(delay(5000))
			.then(resolve)
			.catch(reject)
			/*.then(function(diconnected){
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
			})*/



		}
		return new Promise(promise);
	}



	// -------------------------------------------------------------------------

	var disconnect = function(connection){
		var promise = function(resolve, reject){
			SerialApi.disconnect(connection.connectionInfo.connectionId)
			.then(function(success){
				if(success){
					delete connection.connectionInfo;
					resolve(connection);
				}
				else reject('Could not disconnect', connection)
			})
			.catch(reject);
		}
		return new Promise(promise);
	}
	var connectWithParams = function(options){
		return function(connection){
			var promise = function(resolve, reject){
			SerialApi.connect(connection.device.path, options)
			.then(function(connectionInfo){
				if (typeof(connectionInfo) == "undefined" ||
					typeof(connectionInfo.connectionId) == "undefined" ||
					connectionInfo.connectionId == -1){
					reject('Could not connect.', connection)
				}
				else{
					connection.connectionInfo = connectionInfo;
					resolve(connection);
				}
			})
			.catch(reject);
			}
			return new Promise(promise);
		}
		
	}
	// -------------------------------------------------------------------------

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