var server = require('http-server');
var isDist = !(process.argv[2] && process.argv[2] == 'dev');
var root = (isDist) ? './dist' : './';
var port = (isDist) ? process.env.VCAP_APP_PORT || process.env.PORT || 8585 : 8080;
var redirect = (isDist) ? '/main' : '/src/main';

server.createServer({
	root : root,
	before: [
		function (request, response) {
			if(request.url == '/'){
				response.writeHead(302,	{Location: redirect});
				return response.end();

			}
			if(request.url.substring(0, 6) == '/ping/'){
				console.log('Ping', Date(), ': ' + decodeURI(request.url.substring(6)));
				return response.end();
			}
			response.emit('next');
		}
	]

}).listen(port);

console.log('Serving '+root+' on port '+port);