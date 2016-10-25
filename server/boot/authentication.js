module.exports = function enableAuthentication(server) {
	/**
	 * This should not be called. Because we replace own mehanism
	 **/
	//server.enableAuth();
	server.enableCustomAuth();
};