'use strict'

class RemoteAccepts {

	analyzeRequest (ctx) {
		
		const Req = ctx.req,
			Qry = Req.query,
			Res = {};

		return Res;
	}

}


module.exports = new RemoteAccepts();