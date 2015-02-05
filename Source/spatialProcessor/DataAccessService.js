(function() {

/**
 * Object for interactions with SpatialProcessor Data Access Service
 * @param {sGis.spatialProcessor.Connector} serverConnector
 * @param {String} name - name of the service on server
 * @constructor
 */
sGis.spatialProcessor.DataAccessService = function(serverConnector, name) {
    this._sp = serverConnector;
    this._spatialProcessor = serverConnector;

    this._url = this._spatialProcessor.url;
    this._id = name;

    this._operationQueue = [];
};

    //TODO: this operations should be united with controller operations
sGis.spatialProcessor.DataAccessService.prototype = {
    __operation: sGis.spatialProcessor.Controller.prototype.__operation,
    query: sGis.spatialProcessor.Controller.prototype.query,
    save: sGis.spatialProcessor.Controller.prototype.save,
    createObject: sGis.spatialProcessor.Controller.prototype.createObject,
    autoComplete: sGis.spatialProcessor.Controller.prototype.autoComplete,
    reshape: sGis.spatialProcessor.Controller.prototype.reshape,
    cut: sGis.spatialProcessor.Controller.prototype.cut
};

Object.defineProperties(sGis.spatialProcessor.DataAccessService.prototype, {
    
});

})();