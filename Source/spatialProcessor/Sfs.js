'use strict';

(function() {

    sGis.spatialProcessor.Sfs = function(spatialProcessor, serviceName) {
        if (!(spatialProcessor instanceof sGis.spatialProcessor.Connector)) utils.error('sGis.spatialProcessor.Connector instance is expected but got ' + spatialProcessor + ' instead');

        this._spatialProcessor = spatialProcessor;
        this._serviceName = serviceName;
    };

    sGis.spatialProcessor.Sfs.prototype = {
        list: function(properties) {
            var successHandler = properties.success;
            properties.success = function(response) {
                if (successHandler) {
                    var list = utils.parseJSON(response);
                    successHandler(list);
                }
            };

            this.__operation('list', properties);
        },

        download: function(properties) {
            this.__operation('download', properties);
        },

        getTemplate: function(properties) {
            var successHandler = properties.success;
            properties.success = function(response) {
                try {
                    for (var i = response.length - 1; i >= 0; i--) {
                        if (response.charCodeAt(i) === 0) {
                            response = response.slice(0, i);
                        }
                    }

                    var asset = utils.parseJSON(response);
                    var template = new sGis.spatialProcessor.Template(asset, properties.path);
                    if (successHandler) {
                        successHandler(template);
                    }
                } catch(e) {
                    if (properties.error) properties.error('Could not read the template');
                }
            };

            this.download(properties);
        },

        getTemplates: function(properties) {
            var path = properties.path;
            var self = this;
            this.list({
                path: path,
                success: function(list) {
                    var templates = [];
                    var requestCount = 0;
                    var responseCount = 0;
                    for (var i = 0; i < list.length; i++) {
                        if (list[i].Type === 1 && list[i].Name.split('.').pop() === 'asset') {
                            requestCount++;
                            self.getTemplate({
                                path: list[i].Path,
                                error: function() {
                                    responseCount++;
                                    if (responseCount === requestCount && properties.success) {
                                        properties.success(templates);
                                    }
                                },
                                success: function(template) {
                                    templates.push(template);
                                    responseCount++;
                                    if (responseCount === requestCount && properties.success) {
                                        properties.success(templates);
                                    }
                                }
                            });
                        }
                    }
                },
                error: properties.error,
                requested: properties.requested
            });
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
                    url: self._spatialProcessor.url + self._serviceName + '/?operation=' + operation + '&path=' + encodeURIComponent(properties.path) + '&_sb=' + self._spatialProcessor.sessionId,
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

})();