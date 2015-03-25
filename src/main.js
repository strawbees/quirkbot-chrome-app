var START_DELIMITER = 250; 
var END_DELIMITER = 255; 
var UUID_DELIMITER = 251; 
var NUMBER_OF_NODES_DELIMITER = 252; 
var NODE_CONTENT_DELIMITER = 253; 
var onSerialReceive = function(message){
	var connection = monitoredConnections[message.connectionId];
	if(!connection)	return;

	var buffer = new Uint8Array(message.data);
	for (var i = 0; i < buffer.length; ++i) {

		// Start recording the buffer if START_DELIMITER is found
		if(!connection.bufferOpen && buffer[i]!= START_DELIMITER)
			continue;		
		connection.bufferOpen = true;
		if(buffer[i] == START_DELIMITER) 
			continue;
		// Stop recording if END_DELIMITER delmiter is found
		if(buffer[i] == END_DELIMITER){
			connection.bufferOpen = false;

			//console.log(connection.buffer );
			// Extract UUID	
			var uuidBufer = [];
			while(connection.buffer[0] != UUID_DELIMITER){
				uuidBufer = uuidBufer.concat(connection.buffer.splice(0,1));
			}
			if(uuidBufer.length != 10){
				// message is invalid!
				console.log('invalid! UUID')
				connection.buffer = [];
				continue;
			}
			connection.buffer.splice(0,1);
			connection.uuid = String.fromCharCode.apply(null,uuidBufer);

			// Extract number of nodes
			var nodesNumBuffer = [];
			while(connection.buffer[0] != NUMBER_OF_NODES_DELIMITER){
				nodesNumBuffer = nodesNumBuffer.concat(connection.buffer.splice(0,1));
			}
			if(nodesNumBuffer.length != 1){
				// message is invalid!
				console.log('invalid! NUM NODES')
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
				console.log('invalid! NODE CONTENT')
				connection.buffer = [];
				continue;
			}

			console.log(connection.uuid, nodesNum, JSON.stringify(nodesContent) );


			connection.buffer = [];
			
			continue;
		}

		connection.buffer.push(buffer[i]);
	}
}

var clearConnections = function(){
	var promise = function(resolve, reject){
		getConnections()
		.then(function(connections){
			var promises = [];
			connections.forEach(function(connection){
				(function(connection){
					promises.push(new Promise(function(resolve, reject){
						disconnect(connection.connectionId)
						.then(resolve)
						.catch(reject)
					}));
				})(connection)
			})
			Promise.all(promises)
			.then(resolve)
			.catch(reject);
		})
		.catch(reject);
	}

	return new Promise(promise);
}
var detectQuirkbots = function(){
	var promise = function(resolve, reject){
		getDevices()
		.then(sortDevicesByPort)
		//.then(filterConnected)
		.then(filterConnections)
		.then(monitorConnections)
		.then(function(){
			// Schedule next detection

		})
		.catch(reject);
	}

	return new Promise(promise);
}

var sortDevicesByPort = function(devices){
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
var filterConnections = function(devices){
	var promise = function(resolve, reject){

		var promises = [];
		devices.forEach(function(device){
			var promise = stablishConnection(device)
			promises.push(promise)				
		})
		Promise.all(promises)
		.then(function(connections){
			resolve(
				connections.filter(function(connection){
					return connection ? true : false;
				})
			)
		})
		.catch(function(){
			resolve([])
		})
	};

	return new Promise(promise);
}
var stablishConnection = function(device){
	var promise = function(resolve, reject){
		connect(
			device.path, 
			{
				bitrate: 9600,
				persistent: true,
				name: device.path
			}
		)
		.then(function(connectionInfo){
			if(connectionInfo){
				resolve({
					connectionInfo: connectionInfo,
					device: device,
					startTime: new Date(),
					buffer: [],
					uuid: ''
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

var monitoredConnections = {};
var monitorConnections = function(connections){
	var promise = function(resolve, reject){

		var promises = [];
		connections.forEach(function(connection){
			var promise = monitorConnection(connection)
			promises.push(promise)				
		})
		
		
		return Promise.all(promises)
	};

	return new Promise(promise);
}

var monitorConnection = function(connection){
	var promise = function(resolve, reject){
		monitoredConnections[connection.connectionInfo.connectionId] = connection;
		resolve(connection);
	};
	return new Promise(promise);
}
// Intilize API ----------------------------------------------------------------
var inited = false;
var init = function() {
	if(inited) return;
	inited = true;

	// Register external API calls
	var api = new ChromeExternalAPIServer();
	api.registerMethod('getDevices', getDevices);
	api.registerMethod('connect', connect);
	api.registerMethod('update', update);
	api.registerMethod('disconnect', disconnect);
	api.registerMethod('setPaused', setPaused);
	api.registerMethod('getInfo', getInfo);
	api.registerMethod('getConnections', getConnections);
	api.registerMethod('send', send);
	api.registerMethod('flush', flush);
	api.registerMethod('getControlSignals', getControlSignals);
	api.registerMethod('setControlSignals', setControlSignals);
	api.registerEvent('onReceive', addReceiveListener, removeReceiveListener);
	api.registerEvent('onReceiveError', addReceiveErrorListener, removeReceiveErrorListener);

	// Start monitoring for Quirkbots
	chrome.serial.onReceive.addListener(onSerialReceive);
	clearConnections()
	.then(detectQuirkbots);



}
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Heartbeat to keep the app alive ---------------------------------------------
chrome.runtime.onMessage.addListener(function(){});
setInterval(function (argument) {
	chrome.runtime.sendMessage(chrome.runtime.id, '', function () {});
}, 5000)
