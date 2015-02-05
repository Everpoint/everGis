'use strict';

(function() {

    sGis.spatialProcessor.Sfs = function(spatialProcessor) {
        if (!(spatialProcessor instanceof sGis.spatialProcessor.Connector)) utils.error('sGis.spatialProcessor.Connector instance is expected but got ' + spatialProcessor + ' instead');

        this._spatialProcessor = spatialProcessor;
    };

    sGis.spatialProcessor.Sfs.prototype = {
        getFolderList: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                var response = JSON.parse(data);
                if (utils.isArray(response)) {
                    success(response);
                } else if (properties.error) {
                    if (response.Message) {
                        properties.error(response.Message);
                    } else {
                        properties.error('Could not get folder list from server');
                    }
                }
            };
            this.__operation('listDirectories', properties);
        },

        getFileList: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                var response = JSON.parse(data);
                if (utils.isArray(response)) {
                    success(response);
                } else if (properties.error) {
                    if (response.Message) {
                        properties.error(response.Message);
                    } else {
                        properties.error('Could not get file list from server');
                    }
                }
            };
            this.__operation('listFiles', properties);
        },

        getTemplate: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                try {
                    var asset = decodeTemplate(data);
                    utils.message(JSON.stringify(asset));
                } catch(e) {
                    if (properties.error) properties.error('Could not decode the template data: ' + data);
                    return;
                }

                if (asset.ServerBuilder) {
                    asset.ServerBuilder = asset.ServerBuilder.replace(/\r/g, '').replace(/\t/g, '').replace(/,\]/g, ']');
                    try {
                        asset.ServerBuilder = JSON.parse(asset.ServerBuilder);
                    } catch(e) {
                        utils.message('Unsupported format of ServerBuilder');
                        asset.ServerBuilder = null;
                    }
                }

                if (asset.JsonVisualDefinition) {
                    asset.JsonVisualDefinition = sGis.spatialProcessor.parseXML(asset.JsonVisualDefinition);
                    var template = new sGis.spatialProcessor.Template(asset);
                }

                success(template || asset);
            };
            this.__operation('read', properties);
        },

        __operation: function(operation, properties) {
            var self = this;

            if (this._spatialProcessor.sessionId) {
                requestOperation();
            } else {
                this._spatialProcessor.addListner('sessionInitialized.sfs', requestOperation);
            }

            function requestOperation() {
                self._spatialProcessor.removeListner('.sfs');
                utils.ajax({
                    url: self._spatialProcessor.url + 'sfs/?operation=' + operation + '&path=' + encodeURIComponent(properties.path) + '&_sb=' + self._spatialProcessor.sessionId,
                    error: function(data) {
                        if (properties.error) properties.error(data);
                    },
                    success: function(data) {
                        if (properties.success) properties.success(data);
                    }
                });
            }
        }
    };

    function decodeTemplate(base64string) {
        var string = decodeURIComponent(escape(atob(JSON.parse(base64string))));

        for (var i = string.length - 1; i >= 0; i--) {
            if (string.charCodeAt(i) !== 0) {
                return utils.parseJSON(string.substr(0, i + 1));
            }
        }
    }

})();