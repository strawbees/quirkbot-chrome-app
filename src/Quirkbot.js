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
	// all current quirkbot connections
	var connectionsStash = [];
	// statuses on how many times a device was monitored or if it is doing a reset
	var devicesMonitorStatus = {};
	// Listerner pool for model change events
	var modelChangeListeners = [];
	// Main data model, holds all information about all quirkbots
	var model = {
		platform: {},
		quirkbots : []
	};

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
			upload
		);
		api.registerEvent(
			'modelChange',
			addModelChangeListener,
			removeModelChangeListener
		);

		// Add a listener to all incoming serial messages
		chrome.serial.onReceive.addListener(onSerialReceive);

		// Clear any existing connection and start monitoring Quirkbots
		closeAllSerialConnections()
		.then(continuouslyMonitorQuirkbots);

		// Start resting Quirkbots that have failed to connect several times
		//run()
		//.then(continuouslyResetQuirkbots);

		// Keep sending data to the connections
		//continuouslySendDataToConnections();

		// Determine Platform
		chrome.runtime.getPlatformInfo(function(info) {
			model.platform = info;
		});

		// Dipatch events everytime the model changes
		Object.observe(model, dispatchModelChangeEvent);
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
	var upload = function(quirkbotUuid, hexString){
		var promise = function(resolve, reject){

			var connection;
			for (var i = 0; i < connectionsStash.length; i++) {
				if(connectionsStash[i].quirkbot.uuid == quirkbotUuid){
					connection = connectionsStash[i];
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
			var hexUploader = new HexUploader();

			hexUploader.uploadHex(connection, hexString)
			.then(function(){
				quirkbot.upload.pending = false;
				quirkbot.upload.success = true;
				resolve(quirkbot);

			})
			.catch(function(){
				quirkbot.upload.pending = false;
				quirkbot.upload.fail = true;

				var rejectMessage = {
					file: 'Quirkbot',
					step: 'upload',
					message: 'HexUploader failed.',
					payload: arguments
				}
				console.error(rejectMessage)
				reject(rejectMessage)
			})


		}
		return new Promise(promise);
	}
	// Serial monitoring -------------------------------------------------------
	var onSerialReceive = function(message){
		var connection;
		for (var i = 0; i < connectionsStash.length; i++) {
			if(typeof connectionsStash[i].connectionInfo === 'undefined'){
				continue;
			}
			if(connectionsStash[i].connectionInfo.connectionId == message.connectionId){
				connection = connectionsStash[i];
			}
		};
		if(!connection)	return;

		// do nothing if there is a upload going on


		if(connection.quirkbot.upload.pending) return;

		var buffer = new Uint8Array(message.data);
		for (var i = 0; i < buffer.length; ++i) {

			// Start recording the buffer if REPORT_START_DELIMITER is found
			if(!connection.bufferOpen && buffer[i] !== REPORT_START_DELIMITER)
				continue;

			connection.bufferOpen = true;


			if(buffer[i] === REPORT_START_DELIMITER)
				continue;
			// Stop recording if END_DELIMITER delmiter is found
			if(buffer[i] === END_DELIMITER){
				connection.bufferOpen = false;

				// Extract UUID
				var uuidBufer = [];
				var uuid;
				if(connection.buffer.indexOf(UUID_DELIMITER) !== -1){
					while(connection.buffer[0] !== UUID_DELIMITER){
						uuidBufer = uuidBufer.concat(connection.buffer.splice(0,1));
					}
				}
				if(uuidBufer.length && uuidBufer.length != QB_UUID_SIZE){
					// It's ok to not have any UUID (uuidBufer.length == 0)
					// But it's not ok if size is different (uuidBufer.length != QB_UUID_SIZE)
					//console.log('invalid! UUID');
					connection.buffer = [];
					continue;
				}
				connection.buffer.splice(0,1);
				if(uuidBufer.length){
					uuid = String.fromCharCode.apply(null,uuidBufer);
				}


				// Extract number of nodes
				var nodesNumBuffer = [];
				if(connection.buffer.indexOf(NUMBER_OF_NODES_DELIMITER) !== -1){
					while(connection.buffer[0] !== NUMBER_OF_NODES_DELIMITER){
						nodesNumBuffer = nodesNumBuffer.concat(connection.buffer.splice(0,1));
					}
				}
				if(nodesNumBuffer.length != 1){
					// message is invalid!
					//console.log('invalid! NUM NODES')
					connection.buffer = [];
					continue;
				}
				var nodesNum = nodesNumBuffer[0];
				connection.buffer.splice(0,1);

				// Extract number of nodes content
				var nodes = []
				while(connection.buffer.length){
					var nodesBuffer = [];
					if(connection.buffer.indexOf(NODE_CONTENT_DELIMITER) !== -1){
						while(connection.buffer[0] !== NODE_CONTENT_DELIMITER){
							nodesBuffer = nodesBuffer.concat(connection.buffer.splice(0,1));
						}
					}
						nodes.push(nodesBuffer);
					connection.buffer.splice(0,1);
				}


				if(nodes.length != nodesNum){
					// message is invalid!
					//console.log('invalid! NODE CONTENT')
					connection.buffer = [];
					continue;
				}

				connection.buffer = [];

				// If we got here, we got a complete message!

				if(uuid) connection.quirkbot.uuid = uuid;
				connection.quirkbot.nodes = nodes;

				continue;
			}

			connection.buffer.push(buffer[i]);
		}
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
		// Figure out which connections have detected quirkbots
		var connectionsWithQuirkbot = connectionsStash.filter(function(connection){
			// Remove all mutation observers
			Object.unobserve(connection.quirkbot, dispatchModelChangeEvent)
			Object.unobserve(connection.quirkbot.upload, dispatchModelChangeEvent)
			// Return true only for detected quirkbots
			return connection.detected;
		})
		model.quirkbots = connectionsWithQuirkbot.map(function(connection){
			// Add mutation observers to detected quirkbots
			Object.observe(connection.quirkbot, dispatchModelChangeEvent)
			Object.observe(connection.quirkbot.upload, dispatchModelChangeEvent)
			return connection.quirkbot;
		})
	}
	var _stringifiedModel;
	var dispatchModelChangeEvent = function(){
		// Make sure to only dispatch is there is a change in the model.
		var stringified = JSON.stringify(model);
		if(stringified === _stringifiedModel){
			return;
		}
		_stringifiedModel = stringified;
		var parsedModel = JSON.parse(_stringifiedModel);
		modelChangeListeners.forEach(function(listener){
			listener(parsedModel);
		});
	}
	// Close all serial connections --------------------------------------------
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
					connectionsStash = []
					resolve();
				})
				.catch(function(error){
					console.error(
						'Error clearing existing connections, resolving anyway.',
						error
					);
					connectionsStash = []
					resolve();
				});
			})
			.catch(function(error){
				console.error(
					'Error clearing existing connections, resolving anyway.',
					error
				);
				connectionsStash = []
				resolve();
			});
		}

		return new Promise(promise);
	}
	// Send Data to connections ------------------------------------------------
	var continuouslySendDataToConnections = function(){
		var promise = function(resolve, reject){
			checkIfExtensionIsActive()
			.then(function(){

				run()
				.then(sendDataToConnections)
				.then(delay(100))
				// recurse...
				.then(continuouslySendDataToConnections)
				.catch(function(error){
					console.log(
						'Quirkbot data send routine was rejected, rescheduling now.',
						error
					);
					run()
					.then(delay(100))
					.then(continuouslySendDataToConnections)
				});
				resolve();
			})
			.catch(function(error){
				console.log('The extension is iddle, rescheduling now.', error );
				run()
				.then(delay(5000))
				.then(continuouslySendDataToConnections)
			})
		}
		return new Promise(promise);
	}
	var sendDataToConnections = function(){
		var promise = function(resolve, reject){

			var promises = connectionsStash.map(function(connection) {
				return sendDataToSingleConnection(connection)
			});
			Promise.all(promises)
			.then(resolve)
			.catch(reject)
		};
		return new Promise(promise);
	}
	var sendDataToSingleConnection = function(connection){
		var promise = function(resolve, reject){
			if(!connection || !connection.connectionInfo || !connection.connectionInfo.connectionId){
				return resolve(connection)
			}
			if(connection.quirkbot && connection.quirkbot.detected && connection.quirkbot.upload.pending){
				return resolve(connection)
			}
			SerialApi.send(connection.connectionInfo.connectionId, SerialApi.stringToBinary('q'))
			.then(function() {
				resolve(connection);
			})
			.catch(function() {
				resolve(connection);
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
			.then(log('MONITOR: Start monitor routine', true))
			.then(removeLostConnections)
			.then(log('MONITOR: removeLostConnections'))
			.then(fetchDevices)
			.then(log('MONITOR: fetchDevices'))
			.then(filterDevicesByUSBDescriptors)
			.then(log('MONITOR: filterDevicesByUSBDescriptors'))
			.then(filterMacTty)
			.then(log('MONITOR: filterMacTty'))
			.then(filterDevicesWithTooManyFailedAttempts)
			.then(log('MONITOR: filterDevicesWithTooManyFailedAttempts'))
			.then(filterDevicesAlreadyInStash)
			.then(log('MONITOR: filterDevicesAlreadyInStash'))
			.then(flagPossibleLinuxPermissionProblem)
			.then(log('MONITOR: flagPossibleLinuxPermissionProblem', true))
			.then(stablishConnections)
			.then(log('MONITOR: stablishConnections'))
			.then(filterUnsuccessfullConnections)
			.then(log('MONITOR: filterUnsuccessfullConnections'))
			.then(monitorConnections)
			.then(log('MONITOR: monitorConnections'))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	var checkIfExtensionIsActive = function(){
		var promise = function(resolve, reject){
			if(Date.now() - pingTime < 3000){
				resolve();
			}
			else {
				var rejectMessage = {
					file: 'Quirkbot',
					step: 'checkIfExtensionIsActive',
					message: 'Extension is iddle',
					payload: ''
				}
				reject(rejectMessage)
				return;
			}
		};
		return new Promise(promise);
	}
	var removeLostConnections = function(){
		var promise = function (resolve, reject) {
			var promises = [];
			for (var i = connectionsStash.length - 1; i >= 0; i--) {
				(function(index) {
					var connection = connectionsStash[i];
					var promise = function(resolve, reject) {
						// If there is an upload pending, resolve early
						if(connection.quirkbot.upload.pending){
							resolve();
							return;
						}
						SerialApi.getControlSignals(connection.connectionInfo.connectionId)
						// If we are able to get the control signals, assume connection is healty
						.then(resolve)
						// If we can't get the control signals, assume the connection was lost
						.catch(function() {
							var rejectMessage = {
								file: 'Quirkbot',
								step: 'removeLostConnections',
								message: 'Could not get control signals of one of the connections.',
								payload: arguments
							}
							console.error('MONITOR:', rejectMessage)
							// If not, remove that connection from the stash
							console.log('%cMONITOR: Disconnected!', 'color: red', connection);
							connectionsStash.splice(index, 1);
							manageQuirkbotsInModel();

							run(connection)
							.then(closeSingleConnection)
							.then(resolve)
							.catch(resolve)
						})
					}
					promises.push(new Promise(promise));
				})(i);
			}
			Promise.all(promises)
			.then(function () {
				resolve();
			})
			.catch(function () {
				resolve();
			})

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
				if(device.productId && device.productId === 0xF005){
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
			if(connectionsStash.length || (totalTty && !failedTty) ){
				delete model.platform.serialPermissionError;
				dispatchModelChangeEvent();
			}
			else if(failedTty && model.platform.os == 'linux'){
				model.platform.serialPermissionError = true;
				dispatchModelChangeEvent();
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
	var filterDevicesAlreadyInStash = function(devices){
		var promise = function(resolve, reject){
			devices = devices.filter(function(device){
				for (var i = 0; i < connectionsStash.length; i++) {
					var connection = connectionsStash[i];

					if(connection.device.path == device.path){
						return false;
					}
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
				// Increment the failed attempt counter
				devicesMonitorStatus[device.path].failedAttempts++;
				resolve();
			}
			SerialApi.connect(
				device.path,
				{
					bitrate: 115200,
					persistent: true,
					name: device.path
				}
			)
			.then(function(connectionInfo){
				if(connectionInfo){
					resolve({
						connectionInfo: connectionInfo,
						device: device,
						buffer: [],
						quirkbot : {
							connectedAt: Date.now(),
							uuid: '',
							nodes : [],
							upload: {}
						}
					})
				}
				else unsucessfullResolve();
			})
			.catch(function(error){
				unsucessfullResolve();
			})
		};

		return new Promise(promise);
	}
	var filterUnsuccessfullConnections = function(connections){
		var promise = function(resolve, reject){
			connections = connections.filter(function(connection){
				return connection ? true : false;
			})
			resolve(connections);
		};

		return new Promise(promise);
	}
	var monitorConnections = function(connections){
		var promise = function(resolve, reject){

			var promises = [];
			connections.forEach(function(connection){
				var promise = new Promise(function(resolve, reject){
					monitorSingleConnection(connection)
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
	var monitorSingleConnection = function(connection){
		var promise = function(resolve, reject){
			// Since we are not doing the serial check anymore, just assume the connection is good
			run(connection)
			.then(handleFoundQuirkbot)
			.then(resolve)
			.catch(function() {
				resolve(connection);
			});

		};
		return new Promise(promise);
	}
	var handleFoundQuirkbot = function(connection){
		var promise = function(resolve, reject){
			connectionsStash.push(connection);

			// Quirkbot detected!
			connection.detected = true;
			console.log('%cMONITOR: Connected!\n','color:green', connection);

			// Reset the failed attempt counter
			devicesMonitorStatus[connection.device.path].failedAttempts = 0;

			// Manage quirkbots in strucure
			manageQuirkbotsInModel();

			// Resolve
			resolve(connection);
		}
		return new Promise(promise);
	}
	var closeSingleConnection = function(connection){
		var promise = function(resolve, reject){
			SerialApi.disconnect(connection.connectionInfo.connectionId)
			.then(function(success){
				if(success){
					delete connection.connectionInfo;
					resolve(connection);
				}
				else {
					var rejectMessage = {
						file: 'Quirkbot',
						step: 'closeSingleConnection',
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
					step: 'closeSingleConnection',
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
