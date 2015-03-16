var static = require('node-static');
var http = require('http');
var isDist = !(process.argv[2] && process.argv[2] == 'dev');
var root = (isDist) ? './dist' : './';
var port = (isDist) ? process.env.VCAP_APP_PORT || process.env.PORT || 8585 : 8080;
var redirect = (isDist) ? '/main' : '/src/main';

var file = new static.Server(root);

http.createServer(function (request, response) {

	if(request.url == '/'){
		response.writeHead(302,	{Location: redirect});
		response.end();
		return;
	}
	if(request.url.substring(0, 6) == '/ping/'){
		console.log('Ping', Date(), ': ' + decodeURI(request.url.substring(6)));
		response.end();
		return;
	}

	request.addListener('end', function () {
		file.serve(request, response);
	});

	request.resume();
	
}).listen(port);

console.log('Serving '+root+' on port '+port);