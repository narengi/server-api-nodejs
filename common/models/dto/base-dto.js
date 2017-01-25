//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var underscore = require('underscore');
var loopback = require('loopback');
var app = serverRequire('server');

module.exports = function (BaseDTO) {

    /**
     * Convert an entity to corresponding DTO
     * @param {Model} entity
     * @param {object} EntityType
     * @param {object} options
     * @param {Context} options.ctx The remote method context. For example `ctx.req` is `HttpRequest` or `ctx.result` is the result of the method
     * @returns {object}
     */
    BaseDTO.convert = function (entity, EntityType, options) {
        options = options || {};
        var regEnum = app.RegistrationSourceEnum;
        var requestSource = regEnum.Mobile;
        var currentContext = options.currentContext;

        if (currentContext) {
            requestSource = currentContext.getReqSource();
        }
        if (requestSource.is(regEnum.Mobile)) {
            if (underscore.isFunction(EntityType.convertForMobile))
                return EntityType.convertForMobile(entity, EntityType, options);
            return BaseDTO.convertForMobile(...arguments);
        }
        if (underscore.isFunction(EntityType.convertForWeb))
            return EntityType.convertForWeb(entity, EntityType, options);
        return BaseDTO.convertForWeb(...arguments);
    };

    BaseDTO.convert_internal = function (entity, EntityType, options) {
        options = options || {};

        var keys = underscore.keys(EntityType.definition.properties);
            keys.push('prices');

        if (options.skipId === true) {
            keys = underscore.filter(keys, function (key) {
                return key !== 'id';
            });
        }

        var params = underscore.pick(entity, keys);
        return params;
    };

    BaseDTO.convertForMobile = BaseDTO.convert_internal;
    BaseDTO.convertForWeb = BaseDTO.convertForMobile;

    /**
     * Converts an array of entities to corresponding DTO`s
     * @param {array} entities
     * @param {object} options
     * @returns {Array}
     */
    BaseDTO.ConvertArray = function (entities, options) {
        if (!entities)
            return [];

        options = options || {};

        var self = this;

        return underscore.map(entities, function (entity) {
            return self.Convert(entity, options);
        });
    };
};