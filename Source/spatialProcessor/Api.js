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
            this._downloadFile(this._getOperationUrl('page/getBinary/' + name, {id: id}));
        },

        getServiceCatalog: function(properties) {
            this._operation('serviceCatalog/list', {
                filter: utils.isString(properties.filter) ? properties.filter : undefined,
                jsfilter: properties.filter instanceof Object ? properties.filter : undefined,
                success: function(response) {
                    try {
                        var list = JSON.parse(response);
                    } catch (e) {
                        if (properties.error) properties.error(e);
                    }
                    if (properties.success) properties.success(list);
                },
                error: properties.error
            });
        },

        getEfsFileUrl: function(path) {
            return this._getOperationUrl('efs/fiqle', {path: path});
        },

        /**
         *
         * @param {Object} options
         * @param {String} options.path
         * @param {String} options.type - possible values: Json, Text
         * @param {Function} [options.success]
         * @param {Function} [options.error]
         */
        getEfsFile: function(options) {
            this._operation('efs/file', {path: options.path, media_type: options.type, success: options.success, error: options.error});
        },

        getJsonFile: function(options) {
            this.getEfsFile({path: options.path, type: 'Json', success: successHandler, error: options.error});

            function successHandler(response) {
                try {
                    var data = JSON.parse(response);
                    if (options.success) options.success(data);
                } catch (e) {
                    if (options.error) options.error(e);
                }
            }
        },

        getTextFile: function(options) {
            this.getEfsFile({path: options.path, type: 'Text', success: options.success, error: options.error});
        },

        getEfsObjects: function(options) {
            this._operation('efs/objects', {path: options.path, success: successHandler, error: options.error});

            function successHandler(response) {
                try {
                    var data = utils.parseJSON(response);
                } catch (e) {
                    if (options.error) options.error('Server responded with: ' + response);
                }

                if (data.Success === true) {
                    if (options.success) options.success(data.Items);
                } else if (data.Error) {
                    if (options.error) options.error(data);
                }
            }
        },

        getEfsFiles: function(options) {
            var pathList = {Items: options.paths};
            var string = JSON.stringify(pathList);

            this._operation('efs/files', {success: successHandler, error: options.error}, string);

            function successHandler(response) {
                try {
                    var data = utils.parseJSON(response);
                } catch (e) {
                    if (options.error) options.error('Server responded with: ' + response);
                }

                if (data.Error) {
                    if (options.error) options.error(data);
                } else {
                    if (options.success) options.success(data);
                }
            }
        },

        getUserSettings: function(options) {
            this._operation('workspace/settings/load', {
                success:function(data) {
                    if (options.success) {
                        try {
                            var settings = JSON.parse(data);
                            options.success(settings);
                        } catch (e) {
                            if (options.error) options.error('Failed to load user settings, unexpected response from server: ' + data);
                        }
                    }
                }
            });
        },

        saveUserSettings: function(settings, options) {
            var data = JSON.stringify(settings);
            this._operation('workspace/settings/save', options, data);
        },

        _downloadFile: function(url) {
            this._frame.src = url;
        },

        _operation: function(name, parameters, data) {
            utils.ajax({
                url: this._getOperationUrl(name, parameters),
                type: data ? 'POST' : 'GET',
                data: data,
                success: parameters.success,
                error: parameters.error
            });
        },

        _getOperationUrl: function(name, parameters) {
            var textParam = '';
            var keys = Object.keys(parameters);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] === 'success' || keys[i] === 'error' || parameters[keys[i]] === undefined) continue;
                textParam += '&' + keys[i] + '=';

                if (parameters[keys[i]] instanceof Object) {
                    textParam += encodeURIComponent(JSON.stringify(parameters[keys[i]]));
                } else {
                    textParam += encodeURIComponent(parameters[keys[i]]);
                }
            }

            textParam = textParam.substr(1);

            return this._url + name + '?' + textParam + '&_sb' + (this._connector.sessionId ? '&_sb=' + this._connector.sessionId : '');
        },

        symbolize: function(options) {
            this._operation('storage/meta/set', {
                storageId: options.storageId,
                type: 'rendering',
                success: successHandler,
                error: options.error
            }, options.data);

            function successHandler(response) {
                try {
                    var data = utils.parseJSON(response);
                } catch (e) {
                    if (options.error) options.error('Server responded with: ' + response);
                }

                if (data.Error) {
                    if (options.error) options.error(data);
                } else {
                    if (options.success) options.success(data);
                }
            }
        }
    });



    sGis.spatialProcessor.Api = Api;

})();