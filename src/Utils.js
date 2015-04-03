var run = function(){
	var payload = arguments;
	return new Promise(function(resolve){
		resolve.apply(null, payload);
	});
}
var ENABLE_LOG = true;
var log = function(label, ignorePayload){
	var fn =  function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			if(ENABLE_LOG){
				console.log('%c'+label, 'font-weight: bold')
				if(!ignorePayload){
					for (var i = 0; i < payload.length; i++) {
						console.log(JSON.stringify(payload[i],  null, "\t"))
					};
				}
			}
			resolve.apply(null, payload);
		}
		return new Promise(promise);
	}

	return fn;
}
var delay = function(millis){
	return function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			setTimeout(function(){
				resolve.apply(null, payload);
			}, millis)
		}
		return new Promise(promise);
	}
}