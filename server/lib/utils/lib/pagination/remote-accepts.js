'use strict'

const _ = require('lodash');

class RemoteAccepts {

	analyzeRequest (ctx) {
		
		const Req = ctx.req,
			Qry = Req.query,
			Typ = 'normal',
			Res = {
				perpage: 10,
				page: 1,
				time: null,
				after: null,
				before: null
			};

		// Get Res Keys from Query
		_.each(_.keys(Res), (key) => {
			let valType = Object.prototype.toString.call(Res[key]);
				valType = valType.substr(valType.indexOf(' ') + 1, 3).toLowerCase().trim();
			if (_.has(Qry, key)) {
				switch (valType) {
					case 'str': 
						Res[key] = (Qry[key].trim().length > 0) ? Qry[key].trim() : Res[key]; 
						break;
					case 'num': 
						Res[key] = Number(Qry[key]) > 0 ? Number(Qry[key]) : Res[key]; 
						break;
					default:
						Res[key] = true;
				}
			} else {
				Res[key] = false;
			}
		});

		if (Res.time) {
			// have to implement in future
		} else {
			Res.limit = Res.perpage > 0 && Res.perpage <= 25 ? Res.perpage : 10;
			Res.skip = (Res.page - 1) * Res.limit;
			delete Res.perpage;
			delete Res.page;
			delete Res.time;
			delete Res.after;
			delete Res.before;
			if (Res.skip < 0) {
				delete Res.skip;
			}
		}

		return Res;
	}

}


module.exports = new RemoteAccepts();