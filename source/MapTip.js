sGis.module('spatialProcessor.MapTip', [
    'utils.proto'
], function(proto) {
    'use strict';

    var MapTip = function(connector) {
        this._connector = connector;
        this._url = connector.url + 'api/maxtip/';
    };

    sGis.utils.proto.setMethods(MapTip.prototype, {
        getUrl: function(storageId, objectId) {
            return this._url + 'build?storageId=' + storageId + '&id=' + objectId + '&_sb=' + this._connector.sessionId;
        }
    });

    return MapTip;
    
});
