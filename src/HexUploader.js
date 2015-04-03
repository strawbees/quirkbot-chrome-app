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
		PAGE_SIZE: 128,
		PROGRAM_ADDRESS: 0,
		SOFTWARE_VERSION: 0x56,
		ENTER_PROGRAM_MODE: 0x50, // P
		LEAVE_PROGRAM_MODE: 0x4c,
		SET_ADDRESS: 0x41,
		WRITE: 0x42, // TODO: WRITE_PAGE
		TYPE_FLASH: 0x46,
		EXIT_BOOTLOADER: 0x45,
		CR: 0x0D, // Carriage return
		READ_PAGE: 0x67,
		RESET_BITRATE: 1200,
		UPLOAD_BITRATE: 57600
	}
	
	var init = function(connection, hexString, statusCb){		
		var promise = function(resolve, reject){


			var hexData = new CHROME_ARDUINO_INTEL_HEX(hexString).parse();
			if (hexData == "FAIL") {
				var rejectMessage = {
					file: 'HexUploader',
					step: 'init',
					message: 'Could not parse hexString.',
					payload: hexString
				}
				console.error(rejectMessage)
				reject(rejectMessage)
				return;
			}
			// pad data to correct page size
			pad(hexData, avrProtocol.PAGE_SIZE)

			connection.hexData = hexData;

			run(connection)
			.then(log('Started upload process', true))
			.then(tryToUpload)
			.then(function(){
				delete connection.hexData;
				resolve.apply(null, arguments)
			})
			.catch(function(){
				delete connection.hexData;
				var rejectMessage = {
					file: 'HexUploader',
					step: 'init',
					message: 'Upload failed',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});

		}
		return new Promise(promise);
	}



	// -------------------------------------------------------------------------
	var connectWithParams = function(options){
		return function(connection){
			var promise = function(resolve, reject){
				SerialApi.connect(connection.device.path, options)
				.then(function(connectionInfo){
					if (typeof(connectionInfo) == "undefined" ||
						typeof(connectionInfo.connectionId) == "undefined" ||
						connectionInfo.connectionId == -1){
						var rejectMessage = {
							file: 'HexUploader',
							step: 'connectWithParams',
							message: 'Could not connect',
							payload: connectionInfo
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
					else{
						connection.connectionInfo = connectionInfo;
						resolve(connection);
					}
				})
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'connectWithParams',
						message: 'Could not connect.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			return new Promise(promise);
		}
	}
	var disconnect = function(connection){
		var promise = function(resolve, reject){
			SerialApi.disconnect(connection.connectionInfo.connectionId)
			.then(function(success){
				if(success){
					delete connection.connectionInfo;
					resolve(connection);
				}
				else {
					var rejectMessage = {
						file: 'HexUploader',
						step: 'disconnect',
						message: 'Could not disconnect',
						payload: ''
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				}
			})
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'disconnect',
					message: 'Could not disconnect',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var disconnectAnyway = function(connection){
		var promise = function(resolve, reject){
			if(!connection.connectionInfo){
				resolve(connection);
				return;
			}
			disconnect(connection)
			.then(resolve)
			.catch(resolve)
		}
		return new Promise(promise);
	}
	var send = function(payload){
		return function(connection){
			var promise = function(resolve, reject){
				SerialApi.send(connection.connectionInfo.connectionId, hexToBin(payload))
				.then(function(sendInfo){
					if(sendInfo.error){
						var rejectMessage = {
							file: 'HexUploader',
							step: 'send',
							message: 'Could not send',
							payload: sendInfo
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
					else resolve(connection)
				})
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
						clearTimeout(timer);
						resolve(connection)
					}
					else {
						chrome.serial.onReceive.removeListener(onReceive);
						clearTimeout(timer);
						var rejectMessage = {
							file: 'HexUploader',
							step: 'waitForResponse',
							message: 'Response did not match.',
							payload: buffer
						}
						console.error(rejectMessage)
						reject(rejectMessage);
					}
				}
				chrome.serial.onReceive.addListener(onReceive);
				
				var timer = setTimeout(function(){
					chrome.serial.onReceive.removeListener(onReceive);
					var rejectMessage = {
						file: 'HexUploader',
						step: 'waitForResponse',
						message: 'Response timeout.',
						payload: ''
					}
					console.error(rejectMessage)
					reject(rejectMessage);
				}, timeout)
			}
			return new Promise(promise);
		}
	}
	var writeAndGetResponse = function(payload, response){
		return function(connection){
			var promise = function(resolve, reject){
				
				run(connection)
				.then(send(payload))
				.then(waitForResponse(response))
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'writeAndGetResponse',
						message: 'Could not write and get response.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			return new Promise(promise);
		}
	}
	var waitForDeviceToDisappear = function(connection){
		var promise = function(resolve, reject){
			var count = 0;
			var check = setInterval(function(){
				SerialApi.getDevices()
				.then(function(devices){
					count++;
					var exists = false;
					for (var i = 0; i < devices.length; i++) {
						if(devices[i].path == connection.device.path){
							exists = true;
							break;
						}
					};
					if(!exists){
						clearInterval(check);
						resolve(connection)
					}
					if(count == 10){
						clearInterval(check);
						var rejectMessage = {
							file: 'HexUploader',
							step: 'waitForDeviceToDisappear',
							message: 'Device never disappeared.',
							payload: ''
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
				})

			}, 100)
		}
		return new Promise(promise);
	}
	var waitForDeviceToAppear = function(connection){
		var promise = function(resolve, reject){
			var count = 0;
			var check = setInterval(function(){
				SerialApi.getDevices()
				.then(function(devices){
					count++;
					var exists = false;
					for (var i = 0; i < devices.length; i++) {
						if(devices[i].path == connection.device.path){
							exists = true;
							break;
						}
					};
					if(exists){
						clearInterval(check);
						resolve(connection)
					}
					if(count == 10){
						clearInterval(check);
						var rejectMessage = {
							file: 'HexUploader',
							step: 'waitForDeviceToAppear',
							message: 'Device never appeared.',
							payload: ''
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
				})

			}, 100)
		}
		return new Promise(promise);
	}
	var tryToUpload = function(connection){
		var promise = function(resolve, reject){
			var count = 0;
			var recursiveTry = function(connection){
				run(connection)
				.then(log('Upload try:'+count + '/5', true))
				.then(upload)
				.then(resolve)
				.catch(function(){
					count++;
					if(count == 10){
						var rejectMessage = {
							file: 'HexUploader',
							step: 'tryToUpload',
							message: 'Failed trying to upload 5 times.',
							payload: arguments
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
					else{
						setTimeout(function(){
							recursiveTry(connection)
						}, 500)
					}
				})
			}
			recursiveTry(connection);
			
		}
		return new Promise(promise);
	}
	var upload = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(log('Reseting...', true))
			.then(reset)
			.then(log('Reconnecting...', true))
			.then(openUploadConnection)
			.then(log('Entering program mode...', true))
			.then(enterProgramMode)
			.then(log('Setting programing address...', true))
			.then(setProgrammingAddress)
			.then(log('Write pages...', true))
			.then(writePagesRecursivelly)
			.then(log('Leaving program mode...', true))
			.then(leaveProgramMode)
			.then(log('Exiting bootloader...', true))
			.then(exitBootlader)
			.then(disconnect)
			.then(connectWithParams({bitrate: 115200}))
			.then(delay(100))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'upload',
					message: 'Could not upload.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var reset = function(connection){
		var promise = function(resolve, reject){

			run(connection)
			.then(log('Making sure port is disconnected', true))
			.then(disconnectAnyway)
			.then(delay(100))
			.then(log('Triggering reset by opening and closing a '+avrProtocol.RESET_BITRATE+' baudrate connection', true))
			.then(connectWithParams({bitrate: avrProtocol.RESET_BITRATE}))
			.then(disconnect)
			.then(log('Waiting for device to disappear.', true))
			.then(waitForDeviceToDisappear)
			.then(log('Waiting for device to appear.', true))
			.then(waitForDeviceToAppear)
			.then(log('Reset completed!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'reset',
					message: 'Could not reset.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var openUploadConnection = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(log('Connecting with '+avrProtocol.UPLOAD_BITRATE+' baudrate', true))
			.then(connectWithParams({bitrate: avrProtocol.UPLOAD_BITRATE}))
			.then(delay(500))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'openUploadConnection',
					message: 'Could not open connection.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var enterProgramMode = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(writeAndGetResponse([avrProtocol.ENTER_PROGRAM_MODE], [avrProtocol.CR]))
			.then(log('Entered program mode!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'enterProgramMode',
					message: 'Could not enter program mode.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var leaveProgramMode = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(writeAndGetResponse([avrProtocol.LEAVE_PROGRAM_MODE], [avrProtocol.CR]))
			.then(log('Left program mode!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'leaveProgramMode',
					message: 'Could not leave program mode.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var exitBootlader = function(connection){
		var promise = function(resolve, reject){
			run(connection)
			.then(writeAndGetResponse([avrProtocol.EXIT_BOOTLOADER], [avrProtocol.CR]))
			.then(log('Exited bootloader!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'exitBootlader',
					message: 'Could not leave program mode.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var setProgrammingAddress = function(connection){
		var promise = function(resolve, reject){
			var addressBytes = storeAsTwoBytes(avrProtocol.PROGRAM_ADDRESS);
			run(connection)
			.then(writeAndGetResponse(
				[
					avrProtocol.SET_ADDRESS,
					addressBytes[0],
					addressBytes[1]
				],
				[avrProtocol.CR])
			)
			.then(log('Address set!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'enterProgramMode',
					message: 'Could not enter program mode.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var writePagesRecursivelly = function(connection) {
		var promise = function(resolve, reject){
			var numPages = connection.hexData.length / avrProtocol.PAGE_SIZE;

			var page = 0;
			var write = function(){
				run(connection)
				.then(log('Writing page ' + (page + 1) + '/' + numPages, true))
				.then(writePage(page))
				.then(function() {
					page++;
					if(page == numPages){
						resolve(connection)
					}
					else write();
				})
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'writePagesRecursivelly',
						message: 'Error writing one of the pages.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			write();
			
		}
		return new Promise(promise);
	}
	var writePage = function(pageNo) {
		return function(connection){
			var promise = function(resolve, reject){
				var payload =  connection.hexData.slice(
					pageNo *  avrProtocol.PAGE_SIZE,
					(pageNo + 1) *  avrProtocol.PAGE_SIZE
				);

				var sizeBytes = storeAsTwoBytes(avrProtocol.PAGE_SIZE);

				run(connection)
				.then(
					writeAndGetResponse( 
						[ avrProtocol.WRITE, sizeBytes[0], sizeBytes[1], avrProtocol.TYPE_FLASH ].concat(payload), 
						[ avrProtocol.CR ]
					) 
				)
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'writePage',
						message: 'Error writing page.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});

			}
			return new Promise(promise);
		}
	}
	/*var verifyPagesRecursivelly = function(connection) {
		var promise = function(resolve, reject){
			var numPages = connection.hexData.length / avrProtocol.PAGE_SIZE;

			var page = 0;
			var verify = function(){
				run(connection)
				.then(log('Verifying page ' + page+1 + '/' + numPages, true))
				.then(verifyPage(page))
				.then(function() {
					page++;
					if(page == numPages){
						resolve(connection)
					}
					else verify();
				})
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'verifyPagesRecursivelly',
						message: 'Error verifying one of the pages.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			verify();
			
		}
		return new Promise(promise);
	}
	var verifyPage = function(pageNo) {
		return function(connection){
			var promise = function(resolve, reject){
				var payload =  connection.hexData.slice(
					pageNo *  avrProtocol.PAGE_SIZE,
					(pageNo + 1) *  avrProtocol.PAGE_SIZE
				);

				var sizeBytes = storeAsTwoBytes(avrProtocol.PAGE_SIZE);

				run(connection)
				.then(
					writeAndGetResponse( 
						[ avrProtocol.READ_PAGE, sizeBytes[0], sizeBytes[1], avrProtocol.TYPE_FLASH ], 
						[ avrProtocol.CR ]
					) 
				)
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'verifyPage',
						message: 'Error verifying page.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});

			}
			return new Promise(promise);
		}
	}*/
	// Utils -------------------------------------------------------------------
	var compareArrays = function(a,b){
		if(a.length != b.length) return false;

		for (var i = 0; i < a.length; i++) {
			if(a[i] != b[i])
				return false;
		};

		return true;
	} 
	var binToHex = function(bin) {
		var bufferView = new Uint8Array(bin);
		var hexes = [];
		for (var i = 0; i < bufferView.length; ++i) {
			hexes.push(bufferView[i]);
		}
		return hexes;
	}

	var hexToBin = function(hex) {
		var buffer = new ArrayBuffer(hex.length);
		var bufferView = new Uint8Array(buffer);
		for (var i = 0; i < hex.length; i++) {
			bufferView[i] = hex[i];
		}
		return buffer;
	}
	var storeAsTwoBytes = function(n) {
		var lo = (n & 0x00FF);
		var hi = (n & 0xFF00) >> 8;
		return [hi, lo];
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