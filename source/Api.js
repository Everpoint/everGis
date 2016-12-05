sGis.module('spatialProcessor.Api', [
    'utils',
], function(utils) {

    'use strict';

    class Api {
        constructor(connector, adminUrl) {
            this._connector = connector;
            this._url = connector.url + 'api/';
            this.adminUrl = adminUrl || connector.url + 'Admin/';

            this._frame = document.createElement('iframe');
            this._frame.style.display = 'none';
            this._frame.id = 'sGis-downloadFrame';
            document.body.appendChild(this._frame);
        }

        get url() { return this._url; }

        downloadBinary(id, name) {
            name = name || 'sp_binary_file';
            this.downloadFile(this._getOperationUrl('page/getBinary/' + name, {id: id}));
        }

        getServiceCatalog(properties) {
            return this._operation('serviceCatalog/list', {
                filter: properties.filter,
                jsfilter: properties.jsfilter,
                serviceTypes: ['DataView', 'LayerGroup']
            });
        }

        getEfsFileUrl(path) {
            return this._getOperationUrl('efs/file', {path: path});
        }

        /**
         *
         * @param {Object} options
         * @param {String} options.path
         * @param {String} options.type - possible values: Json, Text
         * @param {Function} [options.success]
         * @param {Function} [options.error]
         */
        getEfsFile(options) {
            this._operation('efs/file', {path: options.path, media_type: options.type, success: options.success, error: options.error});
        }

        getJsonFile(options) {
            this.getEfsFile({path: options.path, type: 'Json', success: successHandler, error: options.error});

            function successHandler(response) {
                try {
                    var data = JSON.parse(response);
                    if (options.success) options.success(data);
                } catch (e) {
                    if (options.error) options.error(e);
                }
            }
        }

        getTextFile(options) {
            this.getEfsFile({path: options.path, type: 'Text', success: options.success, error: options.error});
        }

        getEfsObjects(options) {
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
        }

        getEfsFiles(options) {
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
        }

        getUserSettings(options) {
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
        }

        saveUserSettings(settings, options) {
            var data = JSON.stringify(settings);
            this._operation('workspace/settings/save', options, data);
        }

        downloadFile(url) {
            this._frame.src = url;
        }
        
        operation(name, parameters, data) {
            return this._operation(name, parameters, data);
        }

        _operation(name, parameters, data, admin) {
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
        }

        _getOperationUrl(name, parameters, admin) {
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
        }

        setDataFilter(serviceName, filterDescription) {
            return this._operation('storage/meta/set', {
                type: 'dataFilter',
                serviceName: serviceName
            }, filterDescription);
        }

        symbolize(options) {
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
        }

        getJsonLog(options) {
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
        }

        setStorageLabels(storageId, description) {
            this.setStorageMeta('labeling', storageId, description);
        }

        setStorageMeta(type, storageId, description) {
            this._operation('storage/meta/set', {storageId: storageId, type: type}, JSON.stringify(description));
        }

        _publishService(type, params) {
            if (!params.Name) throw new Error("Name is not set");
            if (params.Name.length > 63) throw new Error("Name is not long. It cannot be longer then 63 symbols.");

            return this._operation('admin/Services/Create', {serviceType: type}, JSON.stringify(params));
        }

        publishDataView({name, alias, description, isShared, preview, dataSourceName, attributeDefinition}) {
            return this._publishService('DataView', {
                Name: name,
                Alias: alias,
                Description: description,
                IsShared: isShared,
                Preview: preview,
                DataSourceName: dataSourceName,
                AttributesDefinition: attributeDefinition
            });
        }

        publishDataSource({name, alias, description, isShared, srid, geometryType, attributeDefinition}) {
            return this._publishService('DataSourceService', {
                Name: name,
                Alias: alias,
                Description: description,
                IsShared: isShared,
                AttributesDefinition: attributeDefinition,
                Srid: srid,
                GeometryType: geometryType
            });
        }

        publishServiceGroup({name, alias, description, isShared, children, preview}) {
            return this._publishService('LayerGroup', {
                Name: name,
                Alias: alias,
                Description: description,
                IsShared: isShared,
                Preview: preview,
                Children: children
            });
        }

        publishLayer({name, alias, description, isShared, preview, attributeDefinition, srid, geometryType}) {
            let dataSourceName = `${name}_source`;
            if (dataSourceName.length > 63) dataSourceName = dataSourceName.substr(dataSourceName.length - 62);

            return this.publishDataSource({name: dataSourceName, isShared, srid, geometryType, attributeDefinition})
                .then((response) => {
                    if (!response || !response.Success) throw new Error("Failed to publish service " + name);
                    return this.publishDataView({name, alias, description, isShared, preview, dataSourceName, attributeDefinition});
                });
        }

        deleteService(description) {
            return this._operation('admin/Services/Delete', { success: description.success, error: description.error, serviceName: description.serviceName }, JSON.stringify([description.serviceName]));
        }

        deleteServices(description) {
            return this._operation('admin/Services/Delete', {}, JSON.stringify(description.names));
        }

        /**
         * @param {Object} options
         * @param {String} options.serviceName - name of the service to update
         * @param {String} [options.description] - new description of the service
         * @param {String} [options.alias] - new alias of the service
         * @param {Boolean} [options.isShared]
         * @param {Object} [options.attributesDefinition]
         * @returns {*}
         */
        changeDataSourceConfiguration(options) {
            var props = {
                Description: options.description,
                Alias: options.alias,
                IsShared: options.isShared,
                AttributesDefinition: options.attributesDefinition
            };

            return this._operation('admin/Services/Update', { name: options.serviceName }, JSON.stringify(props));
        }

        /**
         * @param {Object} options
         * @param {String} options.serviceName - name of the service to update
         * @param {String} [options.description] - new description of the service
         * @param {String} [options.alias] - new alias of the service
         * @param {Boolean} [options.isShared]
         * @param {Object} [options.filter]
         * @param {String} [options.preview]
         * @param {String} [options.dataSourceServiceName]
         * @param {String} [options.attributesDefinition]
         * @returns {*}
         */
        changeDataViewConfiguration(options) {
            var props = {
                Description: options.description,
                Alias: options.alias,
                IsShared: options.isShared,
                Filter: options.filter,
                Preview: options.preview,
                DataSourceServiceName: options.dataSourceServiceName,
                AttributesDefinition: options.attributesDefinition
            };

            return this._operation('admin/Services/Update', { name: options.serviceName }, JSON.stringify(props));
        }

        changeServiceGroupConfiguration({name, alias, description, isShared, children, preview}) {
            return this._operation('admin/Services/Update', { name: name }, JSON.stringify({
                Alias: alias,
                Description: description,
                IsShared: isShared,
                Preview: preview,
                Children: children
            }));
        }

        getObjects({serviceName, startIndex, count, getAttributes, getGeometry, srid, condition, orderBy}) {
            const params = {
                serviceName,
                startIndex,
                count,
                getAttributes,
                getGeometry,
                srid,
                condition,
                orderBy
            };

            return this._operation('data/get', params);
        }

        getFunctionList({ targetServiceName }) {
            return this._operation('functions/list', { targetServiceName });
        }

        validateExpression({ targetServiceName, expression, resultType }) {
            return this._operation('functions/validateExpression', { targetServiceName, expression, resultType });
        }
    }

    return Api;

});
