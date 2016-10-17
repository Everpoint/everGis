sGis.module('spatialProcessor.Api', [
    'utils',
    'utils.proto'
], function(utils, proto) {
    'use strict';

    var Api = function(connector, adminUrl) {
        this._connector = connector;
        this._url = connector.url + 'api/';
        this.adminUrl = adminUrl || connector.url + 'Admin/';

        this._frame = document.createElement('iframe');
        this._frame.style.display = 'none';
        this._frame.id = 'sGis-downloadFrame';
        document.body.appendChild(this._frame);
    };

    sGis.utils.proto.setProperties(Api.prototype, {
        adminUrl: null,
        url: {default: null}
    });

    sGis.utils.proto.setMethods(Api.prototype, {
        downloadBinary: function(id, name) {
            name = name || 'sp_binary_file';
            this.downloadFile(this._getOperationUrl('page/getBinary/' + name, {id: id}));
        },

        getServiceCatalog: function(properties) {
            return this._operation('serviceCatalog/list', {
                filter: properties.filter,
                jsfilter: properties.jsfilter
            });
        },

        getEfsFileUrl: function(path) {
            return this._getOperationUrl('efs/file', {path: path});
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
                    var data = sGis.utils.parseJSON(response);
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
                    var data = sGis.utils.parseJSON(response);
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

        downloadFile: function(url) {
            this._frame.src = url;
        },
        
        operation: function(name, parameters, data) {
            return this._operation(name, parameters, data);
        },

        _operation: function(name, parameters, data, admin) {
            return sGis.utils.ajaxp({
                        url: this._getOperationUrl(name, parameters, admin),
                        type: data ? 'POST' : 'GET',
                        data: data,
                        contentType: admin ? 'application/json' : ''
                    }).then(([response]) => {
                        try {
                            var data = sGis.utils.parseJSON(response);
                        } catch (e) {
                            throw Error('cannot parse response')
                        }

                        if (data.Error) throw Error(JSON.stringify(data.Error));
                        return data;
                    });
        },

        _getOperationUrl: function(name, parameters, admin) {
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

            if (this._connector.sessionId) {
                if (textParam.length > 0) textParam += '&';
                textParam += '_sb=' + this._connector.sessionId;
            }

            return (admin ? this.adminUrl : this._url) + name + '?' + textParam;
        },

        setDataFilter: function(serviceName, filterDescription) {
            return this._operation('storage/meta/set', {
                type: 'dataFilter',
                serviceName: serviceName
            }, filterDescription);
        },

        symbolize: function(options) {
            this._operation('storage/meta/set', {
                storageId: options.storageId,
                type: options.type,
                success: successHandler,
                error: options.error
            }, options.data);

            function successHandler(response) {
                try {
                    var data = sGis.utils.parseJSON(response);
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

        getJsonLog: function(options) {
            this._operation('logger/json', {
                logLevel: 3,
                success: successHandler,
                error: options.error
            }, options.data);

            function successHandler(response) {
                try {
                    var data = sGis.utils.parseJSON(response);
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

        setStorageLabels: function(storageId, description) {
            this.setStorageMeta('labeling', storageId, description);
        },

        setStorageMeta: function(type, storageId, description) {
            this._operation('storage/meta/set', {storageId: storageId, type: type}, JSON.stringify(description));
        },

        publishLayer: function(description) {
            var props = {
                Style: description.style,
                Description: description.description,
                Alias: description.alias,
                Name: description.name,
                IsShared: description.isShared,
                Preview: description.preview,
                DataSourceServiceName: description.dataSourceServiceName,
                CreateDataSource: true,

                GeometryType: description.geometryType,
                AttributesDefinition: description.attributeDefinition,
                Srid: description.srid
            };

            return this._operation('admin/configuration/Create', {}, JSON.stringify(props));
        },

        deleteService: function(description) {
            return this._operation('admin/configuration/Delete', { success: description.success, error: description.error, serviceName: description.serviceName }, JSON.stringify([description.serviceName]));
        },

        deleteServices: function(description) {
            return this._operation('admin/configuration/Delete', {}, JSON.stringify(description.names));
        },

        /**
         * @param {Object} options
         * @param {String} options.serviceName - name of the service to update
         * @param {String} [options.description] - new description of the service
         * @param {String} [options.alias] - new alias of the service
         * @param {Boolean} [options.isShared]
         * @param {Object} [options.attributesDefinition]
         * @returns {*}
         */
        changeDataSourceConfiguration: function(options) {
            var props = {
                Description: options.description,
                Alias: options.alias,
                IsShared: options.isShared,
                AttributesDefinition: options.attributesDefinition
            };

            return this._operation('admin/configuration/Update', { name: options.serviceName }, JSON.stringify(props));
        },

        /**
         * @param {Object} options
         * @param {String} options.serviceName - name of the service to update
         * @param {String} [options.description] - new description of the service
         * @param {String} [options.alias] - new alias of the service
         * @param {Boolean} [options.isShared]
         * @param {Object} [options.filter]
         * @param {String} [options.preview]
         * @param {String} [options.dataSourceServiceName]
         * @returns {*}
         */
        changeDataViewConfiguration: function(options) {
            var props = {
                Description: options.description,
                Alias: options.alias,
                IsShared: options.isShared,
                Filter: options.filter,
                Preview: options.preview,
                DataSourceServiceName: description.dataSourceServiceName
            };

            return this._operation('admin/configuration/Update', { name: options.serviceName }, JSON.stringify(props));
        }

        
    });

    return Api;

});
