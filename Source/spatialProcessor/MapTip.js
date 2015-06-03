'use strict';

(function() {

    sGis.spatialProcessor.MapTip = function(connector) {
        this._connector = connector;
        this._url = connector.url + 'api/maxtip/';
    };

    sGis.utils.proto.setMethods(sGis.spatialProcessor.MapTip.prototype, {
        getUrl: function(storageId, objectId) {
            return this._url + 'build?storageId=' + storageId + '&id=' + objectId + '&_sb=' + encodeURIComponent(this._connector.sessionId);
        }
    });

})();