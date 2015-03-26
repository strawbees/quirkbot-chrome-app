// Serial monitoring -----------------------------------------------------------
var QB_UUID_SIZE = 16;
var REPORT_START_DELIMITER = 250; 
var END_DELIMITER = 255; 
var UUID_DELIMITER = 251; 
var NUMBER_OF_NODES_DELIMITER = 252; 
var NODE_CONTENT_DELIMITER = 253; 

var onSerialReceive = function(message){
	var connection = connectionsStash[message.connectionId];
	if(!connection)	return;


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
				connection.quirkbot.uuid = String.fromCharCode.apply(null,uuidBufer);
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
			var nodesContent = []
			while(connection.buffer.length){
				var nodeContentBuffer = [];
				while(connection.buffer[0] != NODE_CONTENT_DELIMITER){
					nodeContentBuffer = nodeContentBuffer.concat(connection.buffer.splice(0,1));
				}
				nodesContent.push(nodeContentBuffer);
				connection.buffer.splice(0,1);
			}
			

			if(nodesContent.length != nodesNum){
				// message is invalid!
				//console.log('invalid! NODE CONTENT')
				connection.buffer = [];
				continue;
			}

			connection.buffer = [];

			// If we got here, we got a complete message!
			connection.quirkbot.nodes = nodesContent;
			connection.quirkbot.updated = Date.now();
			
			// fire event
			dispatchQuirkbotsChangeEvent();
			continue;	
		}

		connection.buffer.push(buffer[i]);
	}
}

// Connection stash ------------------------------------------------------------
var connectionsStash = {};
var quirkbotsChangeListeners = [];
var addQuirkbotsChangeListener = function (listener) {
	var promise = function(resolve, reject){
		var exists = false;
	
		for (var i = quirkbotsChangeListeners.length - 1; i >= 0; i--) {
			if(quirkbotsChangeListeners[i] == listener){
				quirkbotsChangeListeners.splice(index, 1);
				exists = true;
				break;
			}
		};
		if(!exists)
			quirkbotsChangeListeners.push(listener);

		resolve(listener);
	};
	return new Promise(promise);
}
var removeQuirkbotsChangeListener = function (listener) {
	var promise = function(resolve, reject){
		for (var i = quirkbotsChangeListeners.length - 1; i >= 0; i--) {
			if(quirkbotsChangeListeners[i] == listener){
				quirkbotsChangeListeners.splice(i, 1);
				break;
			}
		};
		resolve(listener);
	};
	return new Promise(promise);
}
var dispatchQuirkbotsChangeEvent = function(){
	if(!quirkbotsChangeListeners.length) return;

	var connectionIdsWithQuirkbot = Object.keys(connectionsStash).filter(function(connectionId){
		return connectionsStash[connectionId].detected;
	})
	var quirkbots = connectionIdsWithQuirkbot.map(function(connectionId){
		return connectionsStash[connectionId].quirkbot;
	})

	quirkbotsChangeListeners.forEach(function(listener){	
		listener(quirkbots)
	});
}

// Process entry point ---------------------------------------------------------
var inited = false;
var init = function() {
	if(inited) return;
	inited = true;

	// Add a listener to all incoming serial messages
	chrome.serial.onReceive.addListener(onSerialReceive);
	
	// Clear any existing connection and start monitoring Quirkbots
	closeAllSerialConnections()
	.then(continuouslyDetectQuirkbots);
}
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Level 0 processes -----------------------------------------------------------
var closeAllSerialConnections = function(){
	var promise = function(resolve, reject){
		serialApi.getConnections()
		.then(function(connections){
			var promises = [];
			connections.forEach(function(connection){
				(function(connection){
					promises.push(new Promise(function(resolve, reject){
						serialApi.disconnect(connection.connectionId)
						.then(resolve)
						.catch(reject)
					}));
				})(connection)
			})
			Promise.all(promises)
			.then(resolve)
			.catch(function(error){
				console.error(
					'Error clearing existing connections, resolving anyway.', 
					error
				);
				resolve();
			});
		})
		.catch(function(error){
			console.error(
				'Error clearing existing connections, resolving anyway.', 
				error
			);
			resolve();
		});
	}

	return new Promise(promise);
}
var continuouslyDetectQuirkbots = function(){
	var promise = function(resolve, reject){
		monitorQuirkbots()
		.then(function(){
			setTimeout(continuouslyDetectQuirkbots, 2000);
		})
		.catch(function(error){
			console.error(
				'Error in Quirbot monitor routine, rescheduling anyway.', 
				error
			);
			setTimeout(continuouslyDetectQuirkbots, 2000);
		});
		resolve();
	}

	return new Promise(promise);
}
// Level 1 processes -----------------------------------------------------------
var monitorQuirkbots = function(){
	var promise = function(resolve, reject){
		removeLostConnections()
		.then(serialApi.getDevices)	
		.then(filterDevicesByUnusualPorts)
		.then(sortDevicesByCommonArduinoPorts)
		.then(filterDevicesAlreadyInStash)
		.then(stablishConnections)
		.then(filterUnsuccessfullConnections)
		.then(monitorConnections)
		.then(resolve)
		.catch(reject);
	}
	return new Promise(promise);
}
// Level 2 processes -----------------------------------------------------------
var removeLostConnections = function(){
	var promise = function(resolve, reject){

		var promises = [];
		for(var connectionId in connectionsStash){
			
			var connection = connectionsStash[connectionId];
			
			if(Date.now() - connection.quirkbot.updated < 200) continue;

			console.log('disconnected', connection);
			delete connectionsStash[connectionId];
			
			// fire event
			dispatchQuirkbotsChangeEvent();

			var promise = new Promise(function(resolve, reject){				
				serialApi.disconnect(connectionId)
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
var filterDevicesAlreadyInStash = function(devices){
	var promise = function(resolve, reject){
		devices = devices.filter(function(device){
			for(var connectionId in connectionsStash){
				var connection = connectionsStash[connectionId];
				
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
			var promise = stablishSingleConnection(device)
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
			var promise = monitorSingleConnection(connection)
			promises.push(promise)				
		})

		Promise.all(promises)
		.then(resolve)
		.catch(reject)
	};

	return new Promise(promise);
}
// Level 3 processes -----------------------------------------------------------
var stablishSingleConnection = function(device){
	var promise = function(resolve, reject){
		serialApi.connect(
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
						connected: Date.now(),
						uuid: '',
						nodes : []
					}
				})
			}
			else resolve();
		})
		.catch(function(){
			resolve()
		})
	};

	return new Promise(promise);
}
var monitorSingleConnection = function(connection){
	var promise = function(resolve, reject){
		connectionsStash[connection.connectionInfo.connectionId] = connection;
		setTimeout(function(){
			if(Date.now() - connection.quirkbot.updated < 200){
				// Quirkbot detected!
				connection.detected = true;
				console.log('connected', connection)

				// fire event
				dispatchQuirkbotsChangeEvent();

				resolve(connection);
			}
			else{
				// No quirbot here, close connection and remove from monitor
				// stack.
				delete connectionsStash[connection.connectionInfo.connectionId];
				
				// fire event
				dispatchQuirkbotsChangeEvent();

				serialApi.disconnect(connection.connectionInfo.connectionId)
				.then(function(){
					resolve(connection);
				})
				.catch(function(){
					resolve(connection);
				})
			}
			
		}, 2000);	
	};
	return new Promise(promise);
}

// Intilize External API -------------------------------------------------------
var quirkbotApiInited = false;
var initQuirkbotApi = function() {
	if(quirkbotApiInited) return;
	quirkbotApiInited = true;

	// Register external API calls
	var api = new ChromeExternalAPIServer();
	api.registerEvent(
		'quirkbotsChange',
		addQuirkbotsChangeListener,
		removeQuirkbotsChangeListener
	);
}
chrome.runtime.onInstalled.addListener(initQuirkbotApi);
chrome.runtime.onStartup.addListener(initQuirkbotApi);