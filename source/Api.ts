import {ajaxp, parseJSON} from "./utils";
import {Crs, geo, wgs84} from "@evergis/sgis/Crs";
import {serializeGeometry} from "./serializers/JsonSerializer";
import {deserializeFeature} from "./serializers/JsonSerializer";
import {Point} from "@evergis/sgis/Point";
import {error} from "@evergis/sgis/utils/utils";

export type ServiceType =  "DataView" |
    "DataSourceService" |
    "LayerGroup" |
    "UserProject" |
    "CompositeService"

export interface GetResourcesParams {
  startFrom?: number;
  take?: number;
  filter?: string;
  orderBy?: string[];
  owner?: string;
  filterByFavorites?: boolean;
  filterByOwner?: boolean;
  serviceTypes?: ServiceType[];
}

export class Api {
    _frame: HTMLIFrameElement;
    _connector: any;
    private _url: string;
    private adminUrl: any;

    constructor(connector, adminUrl = null) {
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
            serviceTypes: properties.serviceTypes,
            owners: properties.owners,
            startFrom: properties.startFrom,
            take: properties.take
        });
    }

    getResources(properties: GetResourcesParams) {
        return this._operation('catalog', {
            startFrom: properties.startFrom,
            take: properties.take,
            filter: properties.filter,
            orderBy: properties.orderBy,
            owner: properties.owner,
            filterByFavorites: properties.filterByFavorites,
            filterByOwner: properties.filterByOwner,
            serviceTypes: properties.serviceTypes
        });
    }

    getFavorites(properties) {
        return this._operation('favorites', {
            startFrom: properties.startFrom,
            take: properties.take,
            filter: properties.filter,
        });
    }

    addFavorites(data: string[]) {
        return this._operation('favorites/add', {}, JSON.stringify(data));
    }

    removeFavorites(data: string[]) {
        return this._operation('favorites/remove', {}, JSON.stringify(data));
    }

    deleteProjects(data: string[]) {
        return this._operation('projects/batchRemove',{}, JSON.stringify(data))
    }

    loadProject(name) {
        return this._operation('projects/load', { name: name })
    }

    createResource(params, data) {
        return this._operation('admin/services/create', params, JSON.stringify(data))
    }

    updateResource(params, data) {
        return this._operation('admin/services/update', params, JSON.stringify(data))
    }

    removeResource(data: string[]) {
        return this._operation('admin/services/batchRemove', {}, JSON.stringify(data))
    }

    downloadFile(url) {
        this._frame.src = url;
    }

    operation(name, parameters, data) {
        return this._operation(name, parameters, data);
    }

    _operation(name, parameters, data = null, admin = false) {
        return ajaxp({
                    url: this._getOperationUrl(name, parameters, admin),
                    type: data ? 'POST' : 'GET',
                    data: data,
                    contentType: admin ? 'application/json' : ''
                }).then(([response]) => {
                    try {
                        var data = parseJSON(response);
                    } catch (e) {
                        throw Error('cannot parse response')
                    }

                    if (data.Success === false) throw Error(data.Message);
                    if (data.Error) throw Error(JSON.stringify(data.Error));
                    return data;
                });
    }

    _getOperationUrl(name, parameters, admin = false) {
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
        return this._operation('storage/meta/set', {
            storageId: options.storageId,
            type: options.type,
            success: successHandler,
            error: options.error
        }, options.data);

        function successHandler(response) {
            try {
                var data = parseJSON(response);
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
        return this._operation('logger/json', {
            logLevel: 3,
            success: successHandler,
            error: options.error
        }, options.data);

        function successHandler(response) {
            try {
                var data = parseJSON(response);
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
        return this.setStorageMeta('labeling', storageId, description);
    }

    setStorageMeta(type, storageId, description) {
        return this._operation('storage/meta/set', {storageId: storageId, type: type}, JSON.stringify(description));
    }

    _publishService(type, params) {
        if (!params.Name) throw new Error("Name is not set");
        if (params.Name.length > 63) throw new Error("Name is not long. It cannot be longer then 63 symbols.");

        return this._operation('admin/Services/Create', {serviceType: type}, JSON.stringify(params));
    }

    publishDataView({name, alias = null, description = null, filter, isShared = false, preview = null, dataSourceName, attributeDefinition, customMapTipHtml = null, cacheSizeLimit = null}) {
        return this._publishService('DataView', {
            Name: name,
            Alias: alias,
            Description: description,
            IsShared: isShared,
            Preview: preview,
            Filter: filter,
            DataSourceName: dataSourceName,
            AttributesDefinition: attributeDefinition,
            CustomMapTipHtml: customMapTipHtml,
            CacheSizeLimit: cacheSizeLimit || undefined,
        });
    }

    publishDataSource({name, alias = null, description = null, preview = null, isShared = false, filter = null, srid, geometryType, attributeDefinition, customMapTipHtml = null}) {
        return this._publishService('DataSourceService', {
            Name: name,
            Alias: alias,
            Description: description,
            IsShared: isShared,
            Preview: preview,
            AttributesDefinition: attributeDefinition,
            Filter: filter,
            Srid: srid,
            GeometryType: geometryType,
            CustomMapTipHtml: customMapTipHtml
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
            AttributesDefinition: options.attributesDefinition,
            CustomMapTipHtml: options.customMapTipHtml,
            Filter: options.filter
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
            AttributesDefinition: options.attributesDefinition,
            CustomMapTipHtml: options.customMapTipHtml
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

    pickByGeometry({ services, geometry, resolution}) {
        return this._operation('data/pickByGeometry', { services, geom: JSON.stringify(serializeGeometry(geometry)), res: resolution}).then(response => {
            return response.map(x => deserializeFeature(x, geometry.crs));
        });
    }

    getFunctionList({ targetServiceName }) {
        return this._operation('functions/list', { targetServiceName });
    }

    validateExpression({ targetServiceName, expression, resultType }) {
        return this._operation('functions/validateExpression', { targetServiceName, expression, resultType });
    }

    getServiceDependencies ({name}) {
        return this._operation('serviceCatalog/dependencies', {name})
    }

    /**
     * Given an address returns coordinates of points that correspond to that address.
     * @param {String} query
     * @param {String[]} providers
     * @param {sGis.Crs} [crs=sGis.CRS.wgs84]
     * @returns {Promise.<AddressSearchResult[]>}
     */
    geocode(query, providers, crs = wgs84) {
        let requestCRS = crs === geo ? wgs84 : crs;

        let sr = requestCRS.toString();
        return this._operation('geocode', {sr, providers: JSON.stringify(providers), query }).then((response) => {
            if (!Array.isArray(response)) error('Search failed');

            return response.map(item => {
                if (crs === geo) {
                    let position = <[number, number]>[item.Geometry[1], item.Geometry[0]];
                    return { address: item.Address, source: item.Source, score: item.Score, position: position, point: new Point(position, crs)};
                } else {
                    return { address: item.Address, source: item.Source, score: item.Score, position: item.Geometry, point: new Point(item.Geometry, crs)};
                }
            });
        });
    }
}
