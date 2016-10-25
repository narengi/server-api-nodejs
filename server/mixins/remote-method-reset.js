//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var underscore = require('underscore');

module.exports = function(Model, options) {

	/**
	 * Make remote methods inherited from `PersistedModel` as hidden.
	 **/

	Model.disableRemoteMethod("create", true);
	Model.disableRemoteMethod("upsert", true);
	Model.disableRemoteMethod("updateAll", true);
	Model.disableRemoteMethod("find", true);
	Model.disableRemoteMethod("findById", true);
	Model.disableRemoteMethod("findOne", true);
	Model.disableRemoteMethod("deleteById", true);
	Model.disableRemoteMethod("count", true);
	Model.disableRemoteMethod("exists", true);

	Model.disableRemoteMethod('_createChangeStream', true);
	Model.disableRemoteMethod('createChangeStream', true);

	Model.disableRemoteMethod("updateAttributes", false);

	if(options){
		if(options.belongsTo){
			underscore.each(options.belongsTo, function(item, index, list){
				Model.disableRemoteMethod('__get__' + item, false);
			});
		}
		if(options.many){
			underscore.each(options.many, function(item, index, list){
				Model.disableRemoteMethod('__findById__' + item, false);
				Model.disableRemoteMethod('__destroyById__' + item, false);
				Model.disableRemoteMethod('__updateById__' + item, false);
				Model.disableRemoteMethod('__link__' + item, false);
				Model.disableRemoteMethod('__unlink__' + item, false);
				Model.disableRemoteMethod('__create__' + item, false);
				Model.disableRemoteMethod('__get__' + item, false);
				Model.disableRemoteMethod('__delete__' + item, false);
				Model.disableRemoteMethod('__findOne__' + item, false);
				Model.disableRemoteMethod('__count__' + item, false);
			});
		}
		if(options.embedsOne){
			underscore.each(options.embedsOne, function(item, index, list){
				Model.disableRemoteMethod('__get__' + item, false);
				Model.disableRemoteMethod('__create__' + item, false);
				Model.disableRemoteMethod('__update__' + item, false);
				Model.disableRemoteMethod('__destroy__' + item, false);
			});
		}
	}
};