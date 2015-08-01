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
	// status on how many times a device was monitored
	var devicesMonitorStatus = {};
	// Listerner pool for model change events
	var modelChangeListeners = [];
	// Main data model, holds all information about all quirkbots
	var model = {
		quirkbots : []
	};

	ENABLE_LOG = true;

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
			quirkbot.upload.progress = 0;
			quirkbot.upload.pending = true;


			var hexUploader = new HexUploader();

			hexUploader.uploadHex(connection, hexString)
			.then(function(){
				quirkbot.upload.pending = false;
				quirkbot.upload.success = true;
				quirkbot.updatedAt = Date.now()
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
			if(!connection.bufferOpen && buffer[i]!= REPORT_START_DELIMITER)
				continue;

			connection.bufferOpen = true;


			if(buffer[i] == REPORT_START_DELIMITER)
				continue;
			// Stop recording if END_DELIMITER delmiter is found
			if(buffer[i] == END_DELIMITER){
				connection.bufferOpen = false;

				// Extract UUID
				var uuidBufer = [];
				var uuid;
				while(connection.buffer[0] != UUID_DELIMITER){
					uuidBufer = uuidBufer.concat(connection.buffer.splice(0,1));
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
				while(connection.buffer[0] != NUMBER_OF_NODES_DELIMITER){
					nodesNumBuffer = nodesNumBuffer.concat(connection.buffer.splice(0,1));
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
					while(connection.buffer[0] != NODE_CONTENT_DELIMITER){
						nodesBuffer = nodesBuffer.concat(connection.buffer.splice(0,1));
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
				connection.quirkbot.updatedAt = Date.now();

				continue;
			}

			connection.buffer.push(buffer[i]);
		}
	}

	// Model -------------------------------------------------------------------
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
	var dispatchModelChangeEvent = function(){
		modelChangeListeners.forEach(function(listener){
			listener(model);
		});
	}

	// Level 0 processes -------------------------------------------------------
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
	// Level 1 processes -------------------------------------------------------
	var monitorQuirkbots = function(){
		var promise = function(resolve, reject){
			run()
			.then(log('Start monitor routine', true))
			.then(removeLostConnections)
			.then(log('removeLostConnections'))
			.then(fetchDevices)
			.then(log('fetchDevices'))
			.then(filterDevicesByUnusualPorts)
			.then(log('filterDevicesByUnusualPorts'))
			.then(filterUnixTty)
			.then(log('filterUnixTty'))
			.then(filterDevicesWithTooManyFailedAttempts)
			.then(log('filterDevicesWithTooManyFailedAttempts'))
			.then(filterDevicesAlreadyInStash)
			.then(log('filterDevicesAlreadyInStash'))
			.then(stablishConnections)
			.then(log('stablishConnections'))
			.then(filterUnsuccessfullConnections)
			.then(log('filterUnsuccessfullConnections'))
			.then(monitorConnections)
			.then(log('monitorConnections'))
			.then(resolve)
			.catch(reject);
		}
		return new Promise(promise);
	}
	// Level 2 processes -------------------------------------------------------
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
		var promise = function(resolve, reject){

			var promises = [];
			for (var i = connectionsStash.length - 1; i >= 0; i--) {
				var connection = connectionsStash[i];

				// Ignore if there is an upload going on
				if(connection.quirkbot.upload.pending) continue;

				// Ignore if there was a recent upate
				if(Date.now() - connection.quirkbot.updatedAt < 200) continue;

				console.log('%cLOST CONNECTION', 'color: red');
				console.log(JSON.stringify(connection, null, '\t'));
				console.log('%c----------', 'color: red');

				connectionsStash.splice(i, 1);


				// Manage quirkbots in model
				manageQuirkbotsInModel();


				var promise = new Promise(function(resolve, reject){
					if(!connection.connectionInfo){
						resolve();
						return;
					}
					SerialApi.disconnect(connection.connectionInfo.connectionId)
					.then(resolve)
					.catch(resolve)
				});

			}
			Promise.all(promises)
			.then(resolve)
			.catch(resolve)
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
							failedAttempts : 0
						}
					}

					// if there were more than 10 failed attempts, reset the counter
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
	var filterDevicesByUnusualPorts = function(devices){
		var filters = [
			'Bluetooth'
		]
		var promise = function(resolve, reject){
			devices = devices.filter(function(device){

				for (var i = 0; i < filters.length; i++) {
					var filter = filters[i];
					if(device.path.indexOf(filter) != -1)
						return false;
				};
				return true;
			})

			resolve(devices)
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
	var sortDevicesByCommonArduinoPorts = function(devices){
		var filters = [
			'cu.usb', 'COM3', 'COM4', 'tty'
		]
		var promise = function(resolve, reject){
			devices.sort(function(a,b){
				var aMatchIndex = 100;
				var bMatchIndex = 100;
				filters.forEach(function(filter, index){
					if(aMatchIndex != 100) return;

					if(a.path.indexOf(filter) != -1){
						aMatchIndex = index;
					}
				})
				filters.forEach(function(filter, index){
					if(bMatchIndex != 100) return;
					if(b.path.indexOf(filter) != -1){
						bMatchIndex = index;
					}
				})

				if(aMatchIndex == bMatchIndex) return 0;
				return (aMatchIndex < bMatchIndex) ? -1 : 1
			})

			resolve(devices)
		}

		return new Promise(promise);
	}
	var filterUnixTty = function(devices){
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
					//.then(log('MQ: monitorConnections: monitorSingleConnection'))
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
// Level 3 processes -------------------------------------------------------
	var stablishSingleConnection = function(device){
		var promise = function(resolve, reject){
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
				else {
					// Increment the failed attempt counter
					devicesMonitorStatus[device.path].failedAttempts++;
					resolve();
				}
			})
			.catch(function(){
				// Increment the failed attempt counter
				devicesMonitorStatus[device.path].failedAttempts++;
				resolve()
			})
		};

		return new Promise(promise);
	}
	var monitorSingleConnection = function(connection){
		var promise = function(resolve, reject){
			connectionsStash.push(connection);

			run()
			.then(delay(1000))
			.then(function(){
				if(Date.now() - connection.quirkbot.updatedAt < 200){
					// Quirkbot detected!
					connection.detected = true;
					console.log('%cCONNECTION', 'color: green');
					console.log(JSON.stringify(connection, null, '\t'));
					console.log('%c----------', 'color: green');

					// Reset the failed attempt counter
					devicesMonitorStatus[connection.device.path].failedAttempts = 0;

					// Manage quirkbots in strucure
					manageQuirkbotsInModel();

					resolve(connection);
				}
				else{
					// No quirkbot here, close connection and remove from monitor
					// stack.
					for (var i = connectionsStash.length - 1; i >= 0; i--) {
						if(connectionsStash[i] == connection){
							connectionsStash.splice(i, 1);
							break;
						}
					};

					// Increment the failed attempt counter
					devicesMonitorStatus[connection.device.path].failedAttempts++;

					SerialApi.disconnect(connection.connectionInfo.connectionId)
					.then(function(){
						resolve(connection);
					})
					.catch(function(){
						resolve(connection);
					})
				}

			});
		};
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
