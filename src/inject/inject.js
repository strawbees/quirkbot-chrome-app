// Brodacast calls from webpage <-> content script

window.addEventListener("message", function(event) {
	// avoid recursive loop
	if(event.data._fromExtension) return;
	// Security
	if (event.source != window) return;	
	// Id is mandatory
	if (!event.data.id) return;
	
	console.log('content on message', event.data)
	var port = chrome.runtime.connect();
	port.onMessage.addListener(function(message){
		port.disconnect();
		if(message.arguments && typeof message.arguments == 'object'){
			message.arguments = Object.keys(message.arguments).map(function(key) {
				return message.arguments[key]
			});
		}
		
		console.log('content sendMessage response', message)
		
		var response = message;
		response._fromExtension = true;
		response.id = event.data.id;

		window.postMessage(response, '*')
	});
	port.postMessage(event.data);

}, false);