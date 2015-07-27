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
        downloadBinary: function(id) {
            this._downloadFile(this._url + 'page/getBinary?id=' + encodeURIComponent(id) + '&_sb=' + this._connector.sessionId);
        },

        _downloadFile: function(url) {
            this._frame.src = url;
        }
    });

    sGis.spatialProcessor.Api = Api;

})();