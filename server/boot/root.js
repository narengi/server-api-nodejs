module.exports = function(server) {
	// Install a `/` route that returns server status
	var router = server.loopback.Router();
	router.get('/', server.loopback.status());
	router.post('/', server.loopback.status());
	server.use(router);
    server.setMaxListeners(128);
};