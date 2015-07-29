(function() {

    var Api = function(connector) {
        this._connector = connector;
        this._url = connector.url + 'api/';

        this._frame = document.createElement('iframe');
        this._frame.style.display = 'none';
        this._frame.id = 'sGis-downloadFrame';
        document.body.appendChild(this._frame);
    };

    sGis.utils.proto.setMethods(Api.prototype, {
        downloadBinary: function(id, name) {
            name = name || 'sp_binary_file';
            this._downloadFile(this._url + 'page/getBinary/' + name + '?id=' + encodeURIComponent(id) + '&_sb=' + this._connector.sessionId);
        },

        _downloadFile: function(url) {
            this._frame.src = url;
        },

        getServiceCatalog: function(properties) {
            if (properties && properties.filter) {
                if (utils.isString(properties.filter)) {
                    var filter = 'filter=' + properties.filter;
                } else {
                    filter = 'jsfilter=' + encodeURIComponent(JSON.stringify(properties.filter));
                }
            } else {
                filter = '';
            }
            this._requestOperation('serviceCatalog/list', {
                filter: filter,
                success: function(response) {
                    try {
                        var list = JSON.parse(response);
                    } catch (e) {
                        if (properties.error) properties.error(e);
                    }
                    if (properties.success) properties.success(list);
                },
                error: properties.error});
        },

        _requestOperation: function(name, parameters) {
            utils.ajax({
                url: this._url + name + '?' + parameters.filter + '&_sb=' + this._connector.sessionId,
                error: parameters.error,
                success: parameters.success
            });
        }
    });

    sGis.spatialProcessor.Api = Api;

})();