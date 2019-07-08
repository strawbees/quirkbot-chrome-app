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
		SYNC: 27,
		ENTER_BOOTLOADER: 0xb,
		SOFTWARE_IDENTIFIER: 0x53, // S
		ENTER_PROGRAM_MODE: 0x50, // P
		LEAVE_PROGRAM_MODE: 0x4c, // L
		SET_ADDRESS: 0x41, // A
		WRITE: 0x42, // B
		TYPE_FLASH: 0x46, // F
		EXIT_BOOTLOADER: 0x45, // E
		CR: 0x0D, // Carriage return
		RESET_BITRATE: 1200,
		UPLOAD_BITRATE: 57600,
		COMMUNICATION_BITRATE: 115200
	}

	/**
	 * Uploads a hex string to a link.
	 * It will try to put the device in bootloader mode, then try to upload the
	 * hex, and finally try to restablish communication with the device.
	 **/
	var uploadHex = function(link, hexString){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Started upload process', true))
			.then(addHexDataToLink(hexString))
			.then(Utils.log('HEX-UPLOADER: Trying to enter the bootloader mode and write data...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: enterBootaloderModeAndWriteData', enterBootaloderModeAndWriteData, 2,100))
			.then(Utils.log('HEX-UPLOADER: Trying to exit the bootloader mode and re-establish communication...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: exitBootaloderModeAndRestablishCommunication', exitBootaloderModeAndRestablishCommunication, 1))
			.then(Utils.log('HEX-UPLOADER: Upload Process Completed!', true))
			.then(removeHexDataFromLink)
			.then(resolve)
			.catch(function(error){
				// As the first batch of Quirkbots had the same product id for
				// both the program and the bootloader, we do a check here to
				// verify if the upload failed because of that. If it did, we
				// try to re-upload with a slitly different process, that will
				// not assume the board is on bootloader mode.
				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Verifying if upload failed because of an old Quirkbot...', true))
				.then(verifyOldQuirkbotError(error))
				.then(Utils.log('HEX-UPLOADER: Confirmed that upload failed because of an old Quirkbot!', true))
				.then(Utils.log('HEX-UPLOADER: Starting upload process again...', true))
				.then(addHexDataToLink(hexString))
				.then(Utils.log('HEX-UPLOADER: Trying to enter the bootloader mode and write data...', true))
				.then(Utils.tryToExecute('HEX-UPLOADER: enterBootaloderModeAndWriteDataWithoutInitialVerification', enterBootaloderModeAndWriteDataWithoutInitialVerification, 2,100))
				.then(Utils.log('HEX-UPLOADER: Trying to exit the bootloader mode and re-establish communication...', true))
				.then(Utils.tryToExecute('HEX-UPLOADER: exitBootaloderModeAndRestablishCommunication', exitBootaloderModeAndRestablishCommunication, 1))
				.then(Utils.log('HEX-UPLOADER: Upload Process Completed!', true))
				.then(removeHexDataFromLink)
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'uploadHex',
						message: 'Upload failed',
						payload: arguments
					}
					console.error(rejectMessage);

					Utils.run(link)
					.then(removeHexDataFromLink)
					.then(function () {
						reject(rejectMessage)
					})
					.catch(function () {
						reject(rejectMessage)
					});
				});

			});

		}
		return new Promise(promise);
	}
	// -------------------------------------------------------------------------
	var addHexDataToLink = function(hexString){
		return function(link){
			var promise = function(resolve, reject){
				var hexData = new CHROME_ARDUINO_INTEL_HEX(hexString).parse();
				if (hexData == "FAIL") {
					var rejectMessage = {
						file: 'HexUploader',
						step: 'addHexDataToLink',
						message: 'Could not parse hexString.',
						payload: hexString
					}
					console.error(rejectMessage)
					reject(rejectMessage)
					return;
				}
				// pad data to correct page size
				Utils.pad(hexData, avrProtocol.PAGE_SIZE)

				link.hexData = hexData;
				link.lastSuccessfulPage = 0;
				resolve(link)
			}
			return new Promise(promise);
		}
	}
	var removeHexDataFromLink = function(link){
		var promise = function(resolve, reject){
			delete link.hexData;
			delete link.lastSuccessfulPage;
			resolve(link)
		}
		return new Promise(promise);

	}
	var connectWithParams = function(options){
		return function(link){
			var promise = function(resolve, reject){
				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Connecting with params to port '+link.device.path+' ...', true))
				.then(function() {
					return SerialApi.connect(link.device.path, options);
				})
				.then(function(connection){
					if (typeof(connection) == "undefined" ||
						typeof(connection.connectionId) == "undefined" ||
						connection.connectionId == -1){
						var rejectMessage = {
							file: 'HexUploader',
							step: 'connectWithParams',
							message: 'Could not connect',
							payload: connection
						}
						console.error(rejectMessage)
						reject(rejectMessage)
					}
					else{
						link.connection = connection;
						Utils.run(link)
						.then(Utils.log('HEX-UPLOADER: Connected!', true))
						.then(resolve(link));
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
	var forceDisconnect = function(link){
		var promise = function(resolve, reject){
			// Get a list of all the possible connections associated with the link
			SerialApi.getConnections()
			.then(function(connections) {
				// Filter the ones that are on the same port as the current connection
				var filteredConnections = connections.filter(function (connection) {
					return connection.name == link.device.path;
				});
				// Add the current link connection, if needed
				if(link.connection){
					var linkConnectionAlreadyAdded = false;
					filteredConnections.forEach(function (connection) {
						if(connection.connectionId == link.connection.connectionId){
							linkConnectionAlreadyAdded = true;
						}
					})
					if(!linkConnectionAlreadyAdded){
						filteredConnections.push(link.connection);
					}
				}


				return filteredConnections;
			})
			// Disconnected all connections, resolving even if there is an error
			.then(function(connections) {
				return Promise.all(connections.map(function (connection) {
					return new Promise(function(resolve, reject){
						Utils.run()
						.then(Utils.log('HEX-UPLOADER: Desconnecting port ' + connection.name, true))
						.then(function(){
							return SerialApi.disconnect(connection.connectionId);
						})
						.then(Utils.log('HEX-UPLOADER: Disconnected!', true))
						.then(resolve)
						.catch(resolve);
					});
				}));
			})
			// Resolve and pass along the link
			.then(function() {
				delete link.connection;
				resolve(link);
			})
			// We shouldn't ever get an error here, so it's good to report it
			// anyway, so you can verify what is going on.
			.catch(function() {
				var rejectMessage = {
					file: 'HexUploader',
					step: 'forceDisconnectPort',
					message: 'Failed to disconnect port.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var send = function(payload){
		return function(link){
			var promise = function(resolve, reject){
				SerialApi.send(link.connection.connectionId, Utils.hexToBin(payload))
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
					else resolve(link)
				})
				.catch(function () {
					var rejectMessage = {
						file: 'HexUploader',
						step: 'send',
						message: 'SerialApi.send rejected.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				})
			}
			return new Promise(promise);
		}
	}
	var waitForResponse = function(response){
		var timeout = 500;
		return function(link){
			var promise = function(resolve, reject){
				var onReceive = function(message){
					if(message.connectionId != link.connection.connectionId)
						return;

					var buffer = new Uint8Array(message.data);

					if(Utils.compareArrays(buffer, response)){
						chrome.serial.onReceive.removeListener(onReceive);
						clearTimeout(timer);
						resolve(link)
					}
					else {
						chrome.serial.onReceive.removeListener(onReceive);
						clearTimeout(timer);

						// for a more useful error message, we convert the
						// buffer to string, but first it needs to be a norma
						// array not a Uint8Array.
						var bufferAsNormalArray = Array.prototype.slice.call(buffer);
						bufferAsNormalArray.length === buffer.length;
						bufferAsNormalArray.constructor === Array;
						var rejectMessage = {
							file: 'HexUploader',
							step: 'waitForResponse',
							message: 'Response did not match.',
							payload: [{
								char: [buffer, response],
								string: [bufferAsNormalArray.map(String.fromCharCode), response.map(String.fromCharCode)]
							}]
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
		return function(link){
			var promise = function(resolve, reject){
				Utils.run(link)
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
	var hopefullyWaitForDeviceRefresh = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Hopefully waiting device refresh...', true))
			//.then(Utils.log('HEX-UPLOADER: Waiting for same device to disappear.', true))
			//.then(waitForSameDeviceToDisappear)
			.then(Utils.log('HEX-UPLOADER: Waiting for a new device to appear.', true))
			.then(waitForNewDeviceToAppear(5000))
			.then(Utils.log('HEX-UPLOADER: Device has refreshed.', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'hopefullyWaitForDeviceRefresh',
					message: 'Could not detect a device reset.',
					payload: arguments
				}
				console.error(rejectMessage)

				if(link.device.originalPath){
					var original = link.device.path;
					link.device.path = link.device.originalPath;
					link.device.originalPath = original;

				}

				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Device did not refresh, resolving anyway...', true))
				.then(resolve)
			});
		}
		return new Promise(promise);
	}
	var waitForNewDeviceToAppear = function(timeout, tick){
		tick = tick || 200;
		timeout = timeout || 6000;
		var maxCount = timeout / tick;
		return function(link){
			var promise = function(resolve, reject){
				SerialApi.getDevices()
				.then(filterDevicesByUSBDescriptors)
				.then(filterMacTty)
				.then(function(intialDevices){
					var count = 0;
					var countAndScheduleCheck = function() {
						count++;
						if(count >= maxCount){
							var rejectMessage = {
								file: 'HexUploader',
								step: 'waitForNewDeviceToAppear',
								message: 'Device never appeared.',
								payload: ''
							}
							console.error(rejectMessage)

							reject(rejectMessage)
						}
						else{
							setTimeout(check, tick);
						}
					}
					var check = function(){
						SerialApi.getDevices()
						.then(filterDevicesByUSBDescriptors)
						.then(filterMacTty)
						.then(function(devices){

							console.log('HEX-UPLOADER: Waiting devices...', count, Utils.mapProperty(intialDevices, 'path'), Utils.mapProperty(devices, 'path'));
							if(devices.length <= intialDevices.length){
								var disappeared = Utils.objectArrayDiffByKey(intialDevices, devices, 'path');
								if(disappeared.length){
									disappeared = disappeared[0];
									console.log('HEX-UPLOADER: A device disappeared:', disappeared);
									//intialDevices = devices;
									for (var i = intialDevices.length-1; i >= 0; i--) {
										if(intialDevices[i].path == disappeared.path){
											intialDevices.splice(i, 1);
										}
									}
								}

							}

							if(devices.length >= intialDevices.length){
								var appeared = Utils.objectArrayDiffByKey(devices, intialDevices, 'path');
								if(appeared.length){
									appeared = appeared[0];
									console.log('HEX-UPLOADER: A device appeared:', appeared);
									link.device = appeared;
									link.device.originalPath = link.device.path;
									resolve(link);
									return;
								}
							}
							countAndScheduleCheck();
						})
						.catch(countAndScheduleCheck);
					}
					check();
				})
				.catch(function() {
					var rejectMessage = {
						file: 'HexUploader',
						step: 'waitForNewDeviceToAppear',
						message: 'Error getting list of devices.',
						payload: arguments
					}
					console.error(rejectMessage);
					reject(rejectMessage);
				})

			}
			return new Promise(promise);
		}
	}
	var enterBootaloderModeAndWriteData = function(link, hexString){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Ensure board is on Bootloader mode...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: guaranteeEnterBootaloderMode', guaranteeEnterBootaloderMode, 1, 100))
			.then(Utils.log('HEX-UPLOADER: Trying to writeData...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: writeData', writeData, 10, 10))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'enterBootaloderModeAndWriteData',
					message: 'Failed to enter bootloader and write data',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});

		}
		return new Promise(promise);
	}
	var enterBootaloderModeAndWriteDataWithoutInitialVerification = function(link, hexString){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Ensure board is on Bootloader mode...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: guaranteeEnterBootaloderModeWithoutInitialVerification', guaranteeEnterBootaloderModeWithoutInitialVerification, 1, 100))
			.then(Utils.log('HEX-UPLOADER: Trying to writeData...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: writeData', writeData, 10, 10))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'enterBootaloderModeAndWriteDataWithoutInitialVerification',
					message: 'Failed to enter bootloader and write data',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});

		}
		return new Promise(promise);
	}
	var guaranteeEnterBootaloderMode = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(forceDisconnect)
			.then(Utils.log('HEX-UPLOADER: Making sure the connection is open.', true))
			.then(ensureOpenConnection(openUploadConnection))
			.then(Utils.log('HEX-UPLOADER: Verifying if Quirkbot is on bootloader mode...', true))
			.then(verifyBootloaderMode)
			.then(Utils.log('HEX-UPLOADER: Bootloader verified!', true))
			.then(resolve)
			.catch(function(){
				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Quirkbot is NOT on bootloader mode.', true))
				.then(Utils.log('HEX-UPLOADER: Trying to enter booloader mode...', true))
				.then(Utils.tryToExecute('HEX-UPLOADER: enterBootaloderMode', enterBootaloderMode, 2, 100))
				.then(Utils.log('HEX-UPLOADER: Trying to open a connection with the Bootloader...', true))
				.then(Utils.tryToExecute('HEX-UPLOADER: openUploadConnection', openUploadConnection, 2, 500))
				.then(Utils.log('HEX-UPLOADER: Verifying if Quirkbot is on bootloader mode...', true))
				.then(verifyBootloaderMode)
				.then(Utils.log('HEX-UPLOADER: Bootloader verified!', true))
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'guaranteeEnterBootaloderMode',
						message: 'Could not guarantee bootloader mode.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			});
		}
		return new Promise(promise);
	}
	var guaranteeEnterBootaloderModeWithoutInitialVerification = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Trying to enter booloader mode...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: enterBootaloderMode', enterBootaloderMode, 2, 100))
			.then(Utils.log('HEX-UPLOADER: Trying to open a connection with the Bootloader...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: openUploadConnection', openUploadConnection, 2, 500))
			.then(Utils.log('HEX-UPLOADER: Verifying if Quirkbot is on bootloader mode...', true))
			.then(verifyBootloaderMode)
			.then(Utils.log('HEX-UPLOADER: Bootloader verified!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'guaranteeEnterBootaloderModeWithoutInitialVerification',
					message: 'Could not guarantee bootloader mode (without initial verification).',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var verifyBootloaderMode = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Verifying bootloader by usb descriptors', true))
			.then(function(link){
				if(!link || !link.device || !link.device.productId){
					throw new Error('Product id not avaiable');
				}
				switch (link.device.productId) {
					case 0xF006:
					case 0xF005:
						return link;
					default:
						throw new Error('Product id does not match official ids');
				}
			})
			.then(Utils.log('HEX-UPLOADER: Verified by usb descriptors!', true))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'verifyBootloaderMode',
					message: 'Could not verify bootloader mode.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
				/*Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Descriptors verification failed!', true))
				.then(Utils.log('HEX-UPLOADER: Verifying bootloader by identifier "QUIRKBO"', true))
				.then(checkSoftware('QUIRKBO'))
				.then(Utils.log('HEX-UPLOADER: Verified by identifier!', true))
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'verifyBootloaderMode',
						message: 'Could not verify bootloader mode.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});*/
			});
		}
		return new Promise(promise);
	}
	var enterBootaloderMode = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Bootloader soft trigger.', true))
			.then(bootloaderSoftTrigger)
			.then(Utils.log('HEX-UPLOADER: Wait device refresh.', true))
			.then(waitForNewDeviceToAppear(3500))
			.then(resolve)
			.catch(function(){
				// If the soft trigger desn't work, try the connect/disconnect trigger
				var rejectMessage = {
					file: 'HexUploader',
					step: 'enterBootaloderMode -> soft trigger',
					message: 'Soft trigger did not work.',
					payload: arguments
				}
				console.error(rejectMessage)

				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Bootloader trigger.', true))
				.then(bootloaderTrigger)
				.then(Utils.log('HEX-UPLOADER: Wait device refresh.', true))
				.then(waitForNewDeviceToAppear(6000))
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'enterBootaloderMode -> trigger',
						message: 'Could not enter bootloader mode.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			});
		}
		return new Promise(promise);
	}
	var bootloaderSoftTrigger = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Sending ENTER_BOOTLOADER command.', true))
			.then(send([avrProtocol.ENTER_BOOTLOADER]))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'bootloaderSoftTrigger',
					message: 'Could not soft trigger bootloaer.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var bootloaderTrigger = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Making sure port is disconnected', true))
			.then(forceDisconnect)
			.then(Utils.delay(100))
			.then(Utils.log('HEX-UPLOADER: Triggering reset by opening and closing a '+avrProtocol.RESET_BITRATE+' baudrate connection...', true))
			.then(function(link){
				// Noticed on Windows 10 that chrome.serial.connect reported a
				// connection error, but the board would go on bootloader anyway.
				// Since the point of this connection is just to trigger the booloader
				// we will ignore errors and resolve anyway
				return new Promise(function(resolve, reject) {
					Utils.run(link)
					.then(Utils.log('HEX-UPLOADER: connecting (ignore connection error)...', true))
					.then(connectWithParams({
						bitrate: avrProtocol.RESET_BITRATE
					}))
					.then(resolve)
					.catch(function () {
						resolve(link)
					});
				});
			}) 
			.then(Utils.delay(100))
			.then(Utils.log('HEX-UPLOADER: disconnecting...', true))
			.then(forceDisconnect)
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'bootloaderTrigger',
					message: 'Could not trigger bootloaer.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var writeData = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Setting programing address...', true))
			.then(setProgrammingAddress)
			.then(Utils.log('HEX-UPLOADER: Write pages...', true))
			.then(writePagesRecursivelly)
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'writeData',
					message: 'Could not write data.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var ensureOpenConnection = function(openConnectionRoutine){
		return function (link) {

			var promise = function(resolve, reject){
				// If the connection looks healty, resolve early
				if(link.connection && link.connection.bitrate){
					Utils.run(link)
					.then(Utils.log('HEX-UPLOADER: Connection is open...', true))
					.then(resolve);

					return;
				}

				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Connection was down, opening again...', true))
				.then(openConnectionRoutine)
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'ensureOpenConnection',
						message: 'Could ensure an open connection.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			return new Promise(promise);
		}
	}
	var openUploadConnection = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(forceDisconnect)
			.then(Utils.delay(500))
			.then(Utils.log('HEX-UPLOADER: Connecting with '+avrProtocol.UPLOAD_BITRATE+' baudrate', true))
			.then(connectWithParams({
				bitrate: avrProtocol.UPLOAD_BITRATE
			}))
			//.then(Utils.delay(500))
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
	var openCommunicationConnection = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(forceDisconnect)
			.then(Utils.delay(500))
			.then(Utils.log('HEX-UPLOADER: Connecting with '+avrProtocol.COMMUNICATION_BITRATE+' baudrate', true))
			.then(connectWithParams({
				bitrate: avrProtocol.COMMUNICATION_BITRATE
			}))
			//.then(Utils.delay(500))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'openCommunicationConnection',
					message: 'Could not open connection.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var checkSoftware = function(identifier){
		return function (link) {
			var identifierChars = identifier.split('').map(function(s){
				return s.charCodeAt(0);
			})
			var promise = function(resolve, reject){
				Utils.run(link)
				.then(writeAndGetResponse([avrProtocol.SOFTWARE_IDENTIFIER], identifierChars))
				.then(Utils.log('HEX-UPLOADER: Software match!', true))
				.then(resolve)
				.catch(function(){
					var rejectMessage = {
						file: 'HexUploader',
						step: 'checkSoftware',
						message: 'Could check software.',
						payload: arguments
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				});
			}
			return new Promise(promise);
		}
	}
	var exitBootaloderModeAndRestablishCommunication = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(Utils.log('HEX-UPLOADER: Trying to issue command to exit bootloader...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: exitBootlader', exitBootlader, 5, 200))
			.then(Utils.log('HEX-UPLOADER: Wait device refresh.', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: hopefullyWaitForDeviceRefresh', hopefullyWaitForDeviceRefresh, 1))
			.then(Utils.log('HEX-UPLOADER: Trying to open the communication connection...', true))
			.then(Utils.tryToExecute('HEX-UPLOADER: openCommunicationConnection', openCommunicationConnection, 5, 200))
			.then(resolve)
			.catch(function(){
				var rejectMessage = {
					file: 'HexUploader',
					step: 'exitBootaloderModeAndRestablishCommunication',
					message: 'Could not exit bootloader mode and re-establish communication.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	var exitBootlader = function(link){
		var promise = function(resolve, reject){
			Utils.run(link)
			.then(writeAndGetResponse([avrProtocol.EXIT_BOOTLOADER], [avrProtocol.CR]))
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
	var setProgrammingAddress = function(link){
		var promise = function(resolve, reject){
			var address = link.lastSuccessfulPage * (avrProtocol.PAGE_SIZE / 2);
			var addressBytes = Utils.storeAsTwoBytes(address);
			Utils.run(link)
			.then(writeAndGetResponse(
				[
					avrProtocol.SET_ADDRESS,
					addressBytes[0],
					addressBytes[1]
				],
				[avrProtocol.CR])
			)
			.then(Utils.log('HEX-UPLOADER: Address set!', true))
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
	var writePagesRecursivelly = function(link) {
		var promise = function(resolve, reject){
			var numPages = link.hexData.length / avrProtocol.PAGE_SIZE;

			var page = link.lastSuccessfulPage || 0 ;
			var write = function(){
				Utils.run(link)
				.then(Utils.log('HEX-UPLOADER: Writing page ' + (page + 1) + '/' + numPages, true))
				.then(writePage(page))
				.then(function() {
					page++;
					link.lastSuccessfulPage = page;
					if(page == numPages){
						resolve(link)
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
		return function(link){
			var promise = function(resolve, reject){
				var payload =  link.hexData.slice(
					pageNo *  avrProtocol.PAGE_SIZE,
					(pageNo + 1) *  avrProtocol.PAGE_SIZE
				);

				var sizeBytes = Utils.storeAsTwoBytes(avrProtocol.PAGE_SIZE);

				Utils.run(link)
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
	// Utils -------------------------------------------------------------------
	var filterDevicesByUSBDescriptors = function(devices){
		var promise = function(resolve, reject){
			devices = devices.filter(function(device){
				if(device.displayName && device.displayName.indexOf('Quirkbot') != -1){
					return true;
				}
				if(device.productId && device.productId === 0xF004){
					return true;
				}
				if(device.productId && device.productId === 0xF005){
					return true;
				}
				if(device.productId && device.productId === 0xF006){
					return true;
				}
				if(device.vendorId && device.vendorId === 0x2886){
					return true;
				}
				return false;
			});
			resolve(devices)
		}
		return new Promise(promise);
	}
	var filterMacTty = function(devices){
		var promise = function(resolve, reject){
			var compoundDevices = {};
			devices.forEach(function(device, index){
				var parts = device.path.split('.');
				var name = parts[parts.length - 1];
				if(!compoundDevices[name]){
					compoundDevices[name] =  {};
				};
				var compound = compoundDevices[name];
				if(device.path.indexOf('tty.') !== -1){
					compound.tty = device;
				}
				else if(device.path.indexOf('cu.') !== -1){
					compound.cu = device;
				}
			});
			Object.keys(compoundDevices).forEach(function(name) {
				var compound = compoundDevices[name];
				if(typeof compound.tty !== 'undefined' && typeof compound.cu !== 'undefined'){
					devices.splice(devices.indexOf(compound.tty), 1);
				}
			})
			resolve(devices)
		}
		return new Promise(promise);
	}
	var earlyRejectOnWrongSoftware = function (error) {
		return new Promise(function(resolve, reject){
			if(error.step == 'upload' && error.payload && error.payload.length){
				if(error.payload[0].step == 'checkSoftware'){
					reject(error);
					return;
				}
			}
			resolve();
		});
	}
	var verifyOldQuirkbotError = function (error) {
		return function (link) {
			var promise = function(resolve, reject){
				if(link && link.device && link.device.productId != 0xF005){
					reject('Product id is not 0xF005.')
				}
				var chain = getErrorStepChain(error);
				if(chain.length < 3){
					console.log(chain)
					reject('Error chain is shorter than 3 steps.');
				}
				if(chain.pop() === 'waitForResponse'
					&& chain.pop() === 'writeAndGetResponse'
					&& chain.pop() === 'enterProgramMode'){
					resolve(link);
				}
				reject('Error chain does not end in "enterProgramMode", "writeAndGetResponse", "waitForResponse".');
			}
			return new Promise(promise);
		}

	}
	var getErrorStepChain = function (error, chain) {
		chain = chain || [];
		if(error && error.step){
			chain.push(error.step);
		}
		if(error.payload && error.payload.length){
			return getErrorStepChain(error.payload[0], chain);
		}
		return chain;
	}
	var getDeepestErrorPayload = function (error) {
		if(error.payload && error.payload.length){
			return getDeepestErrorPayload(error.payload[0]);
		}
		return error;
	}
	// -------------------------------------------------------------------------
	// External API ------------------------------------------------------------
	// -------------------------------------------------------------------------
	Object.defineProperty(self, 'uploadHex', {
		value: uploadHex
	});
	Object.defineProperty(self, 'checkSoftware', {
		value: checkSoftware
	});
	Object.defineProperty(self, 'verifyBootloaderMode', {
		value: verifyBootloaderMode
	});

}
window.HexUploader = HexUploader
