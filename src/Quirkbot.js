(function (){
"use strict";

var QuirkbotChromeExtension = function(){
	var self = this;

	var QB_UUID_SIZE = 16;
	var REPORT_START_DELIMITER = 250;
	var END_DELIMITER = 255;
	var UUID_DELIMITER = 251;
	var NUMBER_OF_NODES_DELIMITER = 252;
	var NODE_CONTENT_DELIMITER = 253;

	// Stores the time the extension started to run
	var startTime = 0;
	// stores the last time the extension was pinged
	var pingTime = 0;
	// all current quirkbot links
	var linkStash = [];
	// statuses on how many times a device was monitored or if it is doing a reset
	var devicesMonitorStatus = {};
	// Global flag if there is an upload going on
	var uploadPending = false;
	// Listener pool for model change events
	var modelChangeListeners = [];
	// Main data model, holds all information about all quirkbots
	var model = {
		platform: {},
		quirkbots : []
	};
	var _stringifiedModel;

	// Process entry point -----------------------------------------------------
	var init = function() {
		// Store the start time
		startTime = Date.now();

		// Register external API calls
		var api = new ChromeExternalAPIServer();
		api.registerMethod(
			'ping',
			ping
		);
		api.registerMethod(
			'getModel',
			getModel
		);
		api.registerMethod(
			'upload',
			uploadController
		);
		api.registerEvent(
			'modelChange',
			addModelChangeListener,
			removeModelChangeListener
		);

		// Add a listener to all incoming serial messages
		chrome.serial.onReceive.addListener(onSerialReceive);
		chrome.serial.onReceiveError.addListener(function () {
			console.error('onReceiveError', arguments)
		});

		// Clear any existing link and start monitoring Quirkbots
		closeAllSerialConnections()
		.then(continuouslyMonitorQuirkbots);

		// Start resting Quirkbots that have failed to connect several times
		//run()
		//.then(continuouslyResetQuirkbots);

		// Keep sending data to the links
		//continuouslySendDataToLinks();

		// Determine Platform
		chrome.runtime.getPlatformInfo(function(info) {
			model.platform = info;
		});

		// Interval that broadcasts changes in the model (introduced as an
		// interval after the deprecation of Object.observe)
		recursivellydispatchModelChangeEvent();

	}
	// Ping --------------------------------------------------------------------
	var ping = function(){
		var promise = function(resolve, reject){
			// Only respond if the extesion has ran for a little while, this
			// will allow clients to understand there was a diconnection in case
			// the extension was reloaded
			pingTime = Date.now();

			if(pingTime - startTime < 5000){
				reject('The ping was rejected because the extension is starting up. Try again shortly.')
			}
			else resolve('pong')
		}
		return new Promise(promise);
	}
	// Upload ------------------------------------------------------------------

	var uploadController = function(quirkbotUuid, hexString){
		var promise = function(resolve, reject){
			uploadPending = true;
			upload(quirkbotUuid, hexString)
			.then(function() {
				uploadPending = false;
				resolve.apply(this, arguments)
			})
			.catch(function() {
				uploadPending = false;
				reject.apply(this, arguments)
			})
		};
		return new Promise(promise);
	}
	var upload = function(quirkbotUuid, hexString){
		var promise = function(resolve, reject){

			var link;
			for (var i = 0; i < linkStash.length; i++) {
				if(linkStash[i].quirkbot.uuid == quirkbotUuid){
					link = linkStash[i];
				}
			};

			var quirkbot;
			for (var i = 0; i < model.quirkbots.length; i++) {
				if(model.quirkbots[i].uuid == quirkbotUuid){
					quirkbot = model.quirkbots[i];
					break;
				}
			};

			if(!quirkbot){
				// Invalid UUID
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'upload',
					message: 'Invalid UUID',
					payload: ''
				}
				console.error(rejectMessage)
				reject(rejectMessage)
				return;
			}

			if(!hexString){
				// Invalid UUID
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'upload',
					message: 'No Hex String',
					payload: ''
				}
				console.error(rejectMessage)
				reject(rejectMessage)
				return;
			}

			if(quirkbot.upload.pending){
				// There is already an upload going on...
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'upload',
					message: 'Already uploading',
					payload: ''
				}
				console.error(rejectMessage)
				reject(rejectMessage)
				return;
			}

			//------------------------------------------------------------------
			quirkbot.upload.pending = true;
			quirkbot.upload.success = false;
			quirkbot.upload.fail = false;

			var hexUploader = new HexUploader();

			hexUploader.uploadHex(link, hexString)
			.then(function(){
				detectBootloaderMode(link);
				quirkbot.upload.pending = false;
				quirkbot.upload.success = true;
				quirkbot.upload.fail = false;

				resolve(quirkbot);
			})
			.catch(function(){
				detectBootloaderMode(link);
				quirkbot.upload.pending = false;
				quirkbot.upload.fail = true;
				quirkbot.upload.success = false;

				var rejectMessage = {
					file: 'Quirkbot',
					step: 'upload',
					message: 'HexUploader failed.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	// Serial monitoring -------------------------------------------------------
	var onSerialReceive = function(message){

		var link;
		for (var i = 0; i < linkStash.length; i++) {
			if(typeof linkStash[i].connection === 'undefined'){
				continue;
			}
			if(linkStash[i].connection.connectionId == message.connectionId){
				link = linkStash[i];
			}
		};
		if(!link)	return;

		// do nothing if there is a upload going on
		if(link.quirkbot.upload.pending) return;

		var buffer = new Uint8Array(message.data);

		for (var i = 0; i < buffer.length; i++) {

			// Start recording the buffer if REPORT_START_DELIMITER is found
			if(!link.bufferOpen && buffer[i] !== REPORT_START_DELIMITER)
				continue;

			link.bufferOpen = true;


			if(buffer[i] === REPORT_START_DELIMITER){
				link.buffer = [];
				continue;
			}

			// Stop recording if END_DELIMITER delmiter is found
			if(buffer[i] === END_DELIMITER){
				link.bufferOpen = false;

				// Extract UUID
				var uuidBuffer = [];
				var uuid;
				if(link.buffer.indexOf(UUID_DELIMITER) !== -1){
					safeWhile(
						function () {
							return link.buffer[0] !== UUID_DELIMITER;
						},
						function () {
							uuidBuffer = uuidBuffer.concat(link.buffer.splice(0,1));
						},
						function () {
							uuidBuffer = [];
						}
					);

				}

				if(uuidBuffer.length && uuidBuffer.length != QB_UUID_SIZE){
					// It's ok to not have any UUID (uuidBuffer.length == 0)
					// But it's not ok if size is different (uuidBuffer.length != QB_UUID_SIZE)
					console.log('invalid! UUID');
					link.buffer = [];
					continue;
				}

				link.buffer.splice(0,1);
				if(uuidBuffer.length){
					uuid = String.fromCharCode.apply(null,uuidBuffer);
				}


				// Extract number of nodes
				var nodesNumBuffer = [];
				if(link.buffer.indexOf(NUMBER_OF_NODES_DELIMITER) !== -1){
					safeWhile(
						function () {
							return link.buffer[0] !== NUMBER_OF_NODES_DELIMITER
						},
						function () {
							nodesNumBuffer = nodesNumBuffer.concat(link.buffer.splice(0,1));
						},
						function () {
							nodesNumBuffer = [];
						}
					);
				}
				if(nodesNumBuffer.length != 1){
					// message is invalid!
					console.log('invalid! NUM NODES')
					link.buffer = [];
					continue;
				}
				var nodesNum = nodesNumBuffer[0];
				link.buffer.splice(0,1);

				// Extract number of nodes content
				var nodes = []

				safeWhile(
					function () {
						return link.buffer.length
					},
					function () {
						var nodesBuffer = [];
						if(link.buffer.indexOf(NODE_CONTENT_DELIMITER) !== -1){
							safeWhile(
								function () {
									return link.buffer[0] !== NODE_CONTENT_DELIMITER;
								},
								function () {
									nodesBuffer = nodesBuffer.concat(link.buffer.splice(0,1));
								},
								function () {
									nodesBuffer = [];
								}
							);
						}
						nodes.push(nodesBuffer);
						link.buffer.splice(0,1);
					},
					function () {
						nodes = [];
					}
				);


				if(nodes.length != nodesNum){
					// message is invalid!
					console.log('invalid! NODE CONTENT')
					link.buffer = [];
					continue;
				}

				link.buffer = [];

				// If we got here, we got a complete message!

				if(uuid && uuid.length == QB_UUID_SIZE) {
					// Validate the uuid - values lower than 0x30 are ignored
 					var uuidBackup = link.quirkbot.uuid;
					link.quirkbot.uuid = "";
					for (var j = 0; j < uuid.length; j++) {
						if(uuid.charCodeAt(j) >= 0x30){
							link.quirkbot.uuid += uuid[j];
						}
						else{
							link.quirkbot.uuid += uuidBackup[j];
						}
					}

				}
				link.quirkbot.nodes = nodes;

				continue;
			}

			link.buffer.push(buffer[i]);
		}

		delete link.parsingBuffer;
	}
	// Model -------------------------------------------------------------------
	var getModel = function(){
		var promise = function(resolve, reject){
			resolve(model);
		}
		return new Promise(promise);
	}
	var addModelChangeListener = function (listener) {
		var promise = function(resolve, reject){
			var exists = false;
			for (var i = modelChangeListeners.length - 1; i >= 0; i--) {
				if(modelChangeListeners[i] == listener){
					modelChangeListeners.splice(index, 1);
					exists = true;
					break;
				}
			};
			if(!exists)
				modelChangeListeners.push(listener);

			resolve(listener);
		};
		return new Promise(promise);
	}
	var removeModelChangeListener = function (listener) {
		var promise = function(resolve, reject){
			for (var i = modelChangeListeners.length - 1; i >= 0; i--) {
				if(modelChangeListeners[i] == listener){
					modelChangeListeners.splice(i, 1);
					break;
				}
			};
			resolve(listener);
		};
		return new Promise(promise);
	}
	var manageQuirkbotsInModel = function(){
		// Figure out which links have detected quirkbots
		var linksWithQuirkbot = linkStash.filter(function(link){
			// Return true only for detected quirkbots
			return link.detected;
		});
		model.quirkbots = linksWithQuirkbot.map(function(link){
			return link.quirkbot;
		});
	}
	var recursivellydispatchModelChangeEvent = function(){
		// Make sure to only dispatch is there is a change in the model.
		var stringified = JSON.stringify(model);
		if(stringified !== _stringifiedModel){
			_stringifiedModel = stringified;
			modelChangeListeners.forEach(function(listener){
				listener(model);
			});
		}


		checkIfExtensionIsActive()
		.then(delay(30))
		.then(recursivellydispatchModelChangeEvent)
		.catch(function(){
			run()
			.then(delay(3000))
			.then(recursivellydispatchModelChangeEvent);
		})
	}
	// Close all serial links --------------------------------------------
	var closeAllSerialConnections = function(){
		var promise = function(resolve, reject){
			SerialApi.getConnections()
			.then(function(connections){
				var promises = [];
				connections.forEach(function(connection){
					(function(connection){
						promises.push(new Promise(function(resolve, reject){
							SerialApi.disconnect(connection.connectionId)
							.then(resolve)
							.catch(reject)
						}));
					})(connection)
				})
				Promise.all(promises)
				.then(function(){
					linkStash = []
					resolve();
				})
				.catch(function(error){
					console.error(
						'Error clearing existing connections, resolving anyway.',
						error
					);
					linkStash = []
					resolve();
				});
			})
			.catch(function(error){
				console.error(
					'Error clearing existing connections, resolving anyway.',
					error
				);
				linkStash = []
				resolve();
			});
		}

		return new Promise(promise);
	}
	// Send Data to links ------------------------------------------------
	var continuouslySendDataToLinks = function(){
		var promise = function(resolve, reject){
			checkIfExtensionIsActive()
			.then(function(){

				run()
				.then(sendDataToLinks)
				.then(delay(100))
				// recurse...
				.then(continuouslySendDataToLinks)
				.catch(function(error){
					console.log(
						'Quirkbot data send routine was rejected, rescheduling now.',
						error
					);
					run()
					.then(delay(100))
					.then(continuouslySendDataToLinks)
				});
				resolve();
			})
			.catch(function(error){
				console.log('The extension is iddle, rescheduling now.', error );
				run()
				.then(delay(5000))
				.then(continuouslySendDataToLinks)
			})
		}
		return new Promise(promise);
	}
	var sendDataToLinks = function(){
		var promise = function(resolve, reject){

			var promises = linkStash.map(function(link) {
				return sendDataToSingleLink(link)
			});
			Promise.all(promises)
			.then(resolve)
			.catch(reject)
		};
		return new Promise(promise);
	}
	var sendDataToSingleLink = function(link){
		var promise = function(resolve, reject){
			if(!link || !link.connection || !link.connection.connectionId){
				return resolve(link)
			}
			if(link.quirkbot && link.quirkbot.detected && link.quirkbot.upload.pending){
				return resolve(link)
			}
			SerialApi.send(link.connection.connectionId, SerialApi.stringToBinary('q'))
			.then(function() {
				resolve(link);
			})
			.catch(function() {
				resolve(link);
			})
		};
		return new Promise(promise);
	}
	// Monitor Quirkbots -------------------------------------------------------
	var continuouslyMonitorQuirkbots = function(){
		var hold = 2000;
		var iddleHold = 5000;
		var promise = function(resolve, reject){
			checkIfExtensionIsActive()
			.then(function(){
				run()
				.then(monitorQuirkbots)
				.then(delay(hold))
				// recurse...
				.then(continuouslyMonitorQuirkbots)
				.catch(function(error){
					console.log(
						'Quirkbot monitor routine was rejected, rescheduling now.',
						error
					);
					run()
					.then(delay(hold))
					.then(continuouslyMonitorQuirkbots)
				});
				resolve();
			})
			.catch(function(error){
				console.log('The extension is iddle, rescheduling now.', error );
				run()
				.then(closeAllSerialConnections)
				.then(delay(iddleHold))
				.then(continuouslyMonitorQuirkbots)
			})
		}

		return new Promise(promise);
	}
	var monitorQuirkbots = function(){
		var promise = function(resolve, reject){
			run()
			.then(cleanConnections)
			.then(log('MONITOR: Checking if upload is not pending...', true))
			.then(checkIfUploadIsNotPending)
			.then(handleDevices)
			.then(stablishAndMonitorConnections)
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	var cleanConnections = function(){
		var promise = function(resolve, reject){
			run()
			.then(log('MONITOR: Cleaning connections...', true))
			.then(disconnectDeadConnections)
			.then(log('MONITOR: disconnectDeadConnections'))
			.then(disconnectConnectionsOnDeadDevices)
			.then(log('MONITOR: disconnectConnectionsOnDeadDevices'))
			.then(disconnectConnectionsNotOnStack)
			.then(log('MONITOR: disconnectConnectionsNotOnStack'))
			.then(removeLostLinksFromStash)
			.then(log('MONITOR: removeLostLinksFromStash', true))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	var handleDevices = function(){
		var promise = function(resolve, reject){
			run()
			.then(log('MONITOR: Monitoring devices...', true))
			.then(fetchDevices)
			.then(log('MONITOR: fetchDevices'))
			.then(filterDevicesByUSBDescriptors)
			.then(log('MONITOR: filterDevicesByUSBDescriptors'))
			.then(filterDevicesDoublePortsOnMac)
			.then(log('MONITOR: filterDevicesDoublePortsOnMac'))
			//.then(filterDevicesWithTooManyFailedAttempts)
			//.then(log('MONITOR: filterDevicesWithTooManyFailedAttempts'))
			.then(filterDevicesAlreadyInStash)
			.then(log('MONITOR: filterDevicesAlreadyInStash'))
			.then(flagPossibleLinuxPermissionProblem)
			.then(log('MONITOR: flagPossibleLinuxPermissionProblem', true))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	var stablishAndMonitorConnections = function(devices){
		var promise = function(resolve, reject){
			run(devices)
			.then(log('MONITOR: Monitoring connections...', true))
			.then(stablishConnections)
			.then(log('MONITOR: stablishConnections'))
			.then(filterUnsuccessfullConnections)
			.then(log('MONITOR: filterUnsuccessfullConnections'))
			.then(monitorLinks)
			.then(log('MONITOR: monitorLinks'))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	var checkIfExtensionIsActive = function(){
		var promise = function(resolve, reject){
			run()
			.then(function() {
				if(Date.now() - pingTime > 5000){
					throw 'Last ping was more than 5 seconds ago.'
				}
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'checkIfExtensionIsActive',
					message: 'Extension is no active',
					payload: arguments
				}
				reject(rejectMessage)
			});
		};
		return new Promise(promise);
	}
	var checkIfUploadIsNotPending = function(){
		var promise = function(resolve, reject){
			run()
			.then(function() {
				if(uploadPending){
					throw 'uploadPending is false'
				}
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'checkIfUploadNotPending',
					message: 'Upload is pending',
					payload: arguments
				}
				reject(rejectMessage)
			});
		};
		return new Promise(promise);
	}
	var disconnectDeadConnections = function(){
		var promise = function (resolve, reject) {
			// To figure out wich connections are dead, try to get the
			// control signals of each of them.
			SerialApi.getConnections()
			.then(function(connections) {
				return Promise.all(connections.map(function (connection) {
					return new Promise(function(resolve, reject) {
						// Resolve early if the connection has not bitrate
						if(!connection.bitrate){
							resolve(connection);
							return;
						}
						SerialApi.getControlSignals(connection.connectionId)
						.then(function() {
							SerialApi.update(connection.connectionId, {
								bitrate: connection.bitrate
							})
							.then(function() {
								resolve();
							})
							.catch(function() {
								console.log('aaa', arguments)
								resolve(connection);
							})
						})
						.catch(function() {
							resolve(connection);
						})
					})
				}));
			})
			// Filter only the dead connections
			.then(function(connections) {
				return connections.filter(function (connections) {
					return connections ? true : false;
				});
			})
			// Disconnect all of them
			.then(function(connections) {
				return Promise.all(connections.map(function (connection) {
					return SerialApi.disconnect(connection.connectionId)
				}))
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'disconnectDeadConnections',
					message: 'Error trying to disconnect ports. Resolving anyway',
					payload: arguments
				}
				console.error('MONITOR:', rejectMessage);
				resolve();
			});

		};
		return new Promise(promise);
	}
	var disconnectConnectionsOnDeadDevices = function(){
		var promise = function (resolve, reject) {
			// Get a lost of connections and devices
			var devices;
			SerialApi.getDevices()
			.then(function(_devices) {
				devices = _devices;
				return SerialApi.getConnections();
			})
			// Match the connections with the device list, include it if the
			// device looks dead
			.then(function(connections) {
				return connections.filter(function (connection) {
					var dead = false;
					devices.forEach(function(device) {
						if(device.path == connection.name){
							if(device.displayName && device.displayName.indexOf('Quirkbot') != -1){
								return;
							}
							if(device.productId && device.productId === 0xF004){
								return;
							}
							if(device.productId && device.productId === 0xF005){
								return;
							}
							if(device.vendorId && device.vendorId === 0x2886){
								return;
							}
							dead = true;
						}
					})
					return dead;
				});
			})
			// Disconnect all of them
			.then(function(connections) {
				return Promise.all(connections.map(function (connection) {
					return SerialApi.disconnect(connection.connectionId)
				}))
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'disconnectConnectionsOnDeadDevices',
					message: 'Error trying to disconnect ports. Resolving anyway',
					payload: arguments
				}
				console.error('MONITOR:', rejectMessage);
				resolve();
			});

		};
		return new Promise(promise);
	}
	var disconnectConnectionsNotOnStack = function(){
		var promise = function (resolve, reject) {
			SerialApi.getConnections()
			.then(function(connections) {
				var notOnStack = connections.filter(function (connection) {
					var exists = false;
					linkStash.forEach(function(link) {
						if(link.connection && link.connection.connectionId == connection.connectionId){
							exists = true;
						}
					})
					return !exists;
				});
				return Promise.all(notOnStack.map(function (connection) {
					return SerialApi.disconnect(connection.connectionId)
				}))
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'disconnectConnectionsNotOnStack',
					message: 'Error trying to disconnect ports. Resolving anyway',
					payload: arguments
				}
				console.error('MONITOR:', rejectMessage);
				resolve();
			});

		};
		return new Promise(promise);
	}
	var removeLostLinksFromStash = function(){
		var promise = function (resolve, reject) {
			// Get a fresh list of connections
			SerialApi.getConnections()
			.then(function(connections) {
				// Update the connection of the links
				linkStash.forEach(function(link){
					var matchingConnections = connections.filter(function(connection){
						return connection.connectionId == link.connection.connectionId;
					});
					if(!matchingConnections.length){
						delete link.connection;
						return;
					}
					link.connection = matchingConnections[0];
				});

				// Figure out wich links where lost
				var lostLinks = linkStash.filter(function(link){
					// Ignore links with a pending upload
					if(link.quirkbot.upload.pending){
						return false;
					}
					// Add links with no connection, or with an invalid collection
					if(!link.connection || !link.connection.bitrate){
						return true;
					}
				});

				// Remove the lost links from the stash
				lostLinks.forEach(function(link){
					var index = linkStash.indexOf(link);
					if(index == -1){
						return;
					}
					console.log('%cMONITOR: Disconnected!', 'color: red', link);
					linkStash.splice(index, 1);
				});

				// Update the model
				manageQuirkbotsInModel();

				// Never reject
				resolve();
			})
			.then(resolve)
			.catch(function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'removeLostLinksFromStash',
					message: 'Error trying to get connection list. Resolving anyway',
					payload: arguments
				}
				console.error('MONITOR:', rejectMessage);
				resolve();
			});


		};
		return new Promise(promise);
	}
	var fetchDevices = function(){
		var promise = function(resolve, reject){

			SerialApi.getDevices()
			.then(function(devices){
				// Check if there devices have been plugged / removed
				devices.forEach(function(device){
					if(!devicesMonitorStatus[device.path]){
						devicesMonitorStatus[device.path] = {
							failedAttempts : 0,
							doingReset : false
						}
					}

					// if there were more than 20 failed attempts, reset the counter
					if(devicesMonitorStatus[device.path].failedAttempts > 20)
						devicesMonitorStatus[device.path].failedAttempts = 0;
				})
				Object.keys(devicesMonitorStatus).forEach(function(path){
					var exists = false;
					devices.forEach(function(device){
						if(device.path == path){
							exists = true;
						}
					})
					if(!exists){
						delete devicesMonitorStatus[path];
					}
				})
				resolve(devices);
			})
			.catch(reject)
		};
		return new Promise(promise);
	}
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
	var flagPossibleLinuxPermissionProblem = function(devices){
		var promise = function(resolve, reject){
			var totalTty = 0;
			var failedTty = 0;
			devices.forEach(function(device){
				if(device.path.indexOf('tty') !== -1){
					totalTty++;
					if(devicesMonitorStatus[device.path].failedAttempts >= 2){
						failedTty++;
					}
				}
			});
			// Flag possible permission problem
			if(linkStash.length || (totalTty && !failedTty) ){
				delete model.platform.serialPermissionError;
			}
			else if(failedTty && model.platform.os == 'linux'){
				model.platform.serialPermissionError = true;
			}
			resolve(devices);
		}

		return new Promise(promise);
	}
	var filterDevicesWithTooManyFailedAttempts = function(devices){
		var promise = function(resolve, reject){
			devices = devices.filter(function(device){
				if(devicesMonitorStatus[device.path].failedAttempts < 3){
					return true;
				}
				else{
					// Faling this test also increase the fail attempts
					devicesMonitorStatus[device.path].failedAttempts++;
				}
			})
			resolve(devices)
		}

		return new Promise(promise);
	}
	var filterDevicesDoublePortsOnMac = function(devices){
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
	var filterDevicesAlreadyInStash = function(devices){
		var promise = function(resolve, reject){
			devices = devices.filter(function(device){
				for (var i = 0; i < linkStash.length; i++) {
					var link = linkStash[i];
					if(link.device.path == device.path || link.device.originalPath == device.path ){
						return false;
					}
					console.log('aaaa', link, device)
				}

				return true;
			})
			resolve(devices)
		}
		return new Promise(promise);
	}
	var stablishConnections = function(devices){
		var promise = function(resolve, reject){

			var promises = [];
			devices.forEach(function(device){
				var promise = new Promise(function(resolve, reject){
					stablishSingleConnection(device)
					.then(resolve)
					.catch(reject)
				})
				promises.push(promise)
			})
			Promise.all(promises)
			.then(resolve)
			.catch(function(){
				resolve([])
			})
		};

		return new Promise(promise);
	}
	var stablishSingleConnection = function(device){
		var promise = function(resolve, reject){
			var unsucessfullResolve = function () {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'stablishSingleConnection',
					message: 'Could not stablish connection, but resolving anyway.',
					payload: arguments
				}
				console.error(rejectMessage)

				// Increment the failed attempt counter
				devicesMonitorStatus[device.path].failedAttempts++;
				resolve();
			}
			SerialApi.connect(
				device.path,
				{
					bitrate: 115200
				}
			)
			.then(function(connection){
				if(connection){
					resolve({
						connection: connection,
						device: device,
						buffer: [],
						quirkbot : {
							interface: 'serial',
							connectedAt: Date.now(),
							uuid: '****TEMP' + Math.random().toFixed(8).substr(2),
							nodes : [],
							upload: {}
						}
					})
				}
				else unsucessfullResolve('No connection');
			})
			.catch(unsucessfullResolve)
		};

		return new Promise(promise);
	}
	var filterUnsuccessfullConnections = function(links){
		var promise = function(resolve, reject){
			links = links.filter(function(link){
				return link ? true : false;
			})
			resolve(links);
		};

		return new Promise(promise);
	}
	var monitorLinks = function(links){
		var promise = function(resolve, reject){

			var promises = [];
			links.forEach(function(link){
				var promise = new Promise(function(resolve, reject){
					monitorSingleLink(link)
					.then(resolve)
					.catch(reject)
				})
				promises.push(promise)
			})


			Promise.all(promises)
			.then(resolve)
			.catch(reject)
		};

		return new Promise(promise);
	}
	var monitorSingleLink = function(link){
		var promise = function(resolve, reject){
			run(link)
			// We can now check if the board is on bootloader mode.
			.then(detectBootloaderMode)
			// If we got here, we assume the link is stablished.
			.then(handleFoundQuirkbot)
			.then(resolve)
			.catch(function() {
				resolve(link);
			});

		};
		return new Promise(promise);
	}
	var detectBootloaderMode = function(link){
		var promise = function(resolve, reject){
			var hexUploader = new HexUploader();
			run(link)
			.then(hexUploader.verifyBootloaderMode)
			.then(function(link) {
				link.quirkbot.bootloader = true;
				resolve(link)
			})
			.catch(function(error) {
				link.quirkbot.bootloader = false;
				resolve(link)
			});
		}
		return new Promise(promise);
	}
	var handleFoundQuirkbot = function(link){
		var promise = function(resolve, reject){
			linkStash.push(link);

			// Quirkbot detected!
			link.detected = true;
			console.log('%cMONITOR: Connected!\n','color:green', link);

			// Reset the failed attempt counter
			devicesMonitorStatus[link.device.path].failedAttempts = 0;

			// Manage quirkbots in strucure
			manageQuirkbotsInModel();

			// Resolve
			resolve(link);
		}
		return new Promise(promise);
	}
	var closeSingleLink = function(link){
		var promise = function(resolve, reject){
			SerialApi.disconnect(link.connection.connectionId)
			.then(function(success){
				if(success){
					delete link.connection;
					resolve(link);
				}
				else {
					var rejectMessage = {
						file: 'Quirkbot',
						step: 'closeSingleLink',
						message: 'Could not disconnect',
						payload: ''
					}
					console.error(rejectMessage)
					reject(rejectMessage)
				}
			})
			.catch(function(){
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'closeSingleLink',
					message: 'Could not disconnect',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			});
		}
		return new Promise(promise);
	}
	// API ---------------------------------------------------------------------
	Object.defineProperty(self, 'init', {
		value: init
	});
}

if(typeof define !== 'undefined'){
	define([], function(){
		return QuirkbotChromeExtension;
	});
}
else if (typeof exports !== 'undefined'){
	exports.QuirkbotChromeExtension = QuirkbotChromeExtension;
}
else window.QuirkbotChromeExtension = QuirkbotChromeExtension;

})();
