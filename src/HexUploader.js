(function (){
"use strict";

var HexUploader = function(){
	var self = this;

	var errors = {
		INVALID_HEX: 'INVALID_HEX',
		CONNECTION_ERROR: 'CONNECTION_ERROR',
		UNHANDLED: 'UNHANDLED'
	}

	var avrProtocol = {
		SOFTWARE_VERSION: 0x56,
		ENTER_PROGRAM_MODE: 0x50, // P
		LEAVE_PROGRAM_MODE: 0x4c,
		SET_ADDRESS: 0x41,
		WRITE: 0x42, // TODO: WRITE_PAGE
		TYPE_FLASH: 0x46,
		EXIT_BOOTLOADER: 0x45,
		CR: 0x0D, // Carriage return
		READ_PAGE: 0x67,

		MAGIC_BITRATE: 1200
	}
	
	var init = function(connection, hexString, statusCb){		
		var promise = function(resolve, reject){


			var hexData = new CHROME_ARDUINO_INTEL_HEX(hexString).parse();
			if (hexData == "FAIL") {
				reject({
					error: errors.INVALID_HEX,
					message: 'Hex is invalid.'
				});
				return;
			}
			// pad data to correct page size
			pad(hexData, 128)

			
			run(connection)
			.then(reset)
			.then(enterProgramMode)
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
	var send = function(payload){
		return function(connection){
			var promise = function(resolve, reject){
				SerialApi.send(connection.connectionInfo.connectionId, hexToBin(payload))
				.then(function(sendInfo){
					if(sendInfo.error){
						reject(connection)
					}
					else resolve(connection)
				})
			}
			return new Promise(promise);
		}
	}
	var disconnectAnyway = function(connection){
		var promise = function(resolve, reject){
			disconnect(connection)
			.then(resolve)
			.catch(resolve)
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

	var waitForResponse = function(response, timeout){
		timeout = timeout || 200;
		return function(connection){
			var promise = function(resolve, reject){
				var onReceive = function(message){
					if(message.connectionId != connection.connectionInfo.connectionId)
						return;

					var buffer = new Uint8Array(message.data);

					if(compareArrays(buffer, response)){
						console.log('response', response)
						resolve(connection)
					}
					else {
						clearTimeout(timer);
						reject(connection);
					}
				}
				chrome.serial.onReceive.addListener(onReceive);
				
				var timer = setTimeout(function(){
					chrome.serial.onReceive.removeListener(onReceive);
					reject(connection);
				}, timeout)
			}
			return new Promise(promise);
		}
	}
	var reset = function(connection){
		var promise = function(resolve, reject){

			disconnectAnyway(connection)
			.then(delay(1000))
			.then(connectWithParams({bitrate: 1200}))
			.then(delay(100))
			.then(disconnect)		
			.then(delay(1000))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}

	var writeAndGetResponse = function(payload, response){
		return function(connection){
			var promise = function(resolve, reject){
				
				run(connection)
				.then(send(payload))
				.then(waitForResponse(response))
				.then(resolve)
				.catch(reject)
			}
			return new Promise(promise);
		}
	}
	var enterProgramMode = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(connectWithParams({bitrate: 57600}))
			.then(delay(500))
			.then(writeAndGetResponse([avrProtocol.ENTER_PROGRAM_MODE], [avrProtocol.CR]))
			.then(resolve)
			.catch(reject)
		}
		return new Promise(promise);
	}
	// Utils -------------------------------------------------------------------
	function compareArrays(a,b){
		if(a.length != b.length) return false;

		for (var i = 0; i < a.length; i++) {
			if(a[i] != b[i])
				return false;
		};

		return true;
	} 
	function binToHex(bin) {
		var bufferView = new Uint8Array(bin);
		var hexes = [];
		for (var i = 0; i < bufferView.length; ++i) {
			hexes.push(bufferView[i]);
		}
		return hexes;
	}

	function hexToBin(hex) {
		var buffer = new ArrayBuffer(hex.length);
		var bufferView = new Uint8Array(buffer);
		for (var i = 0; i < hex.length; i++) {
			bufferView[i] = hex[i];
		}
		return buffer;
	}
	var pad = function(data, pageSize) {
		while (data.length % pageSize != 0) {
			data.push(0);
		}
		return data;
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