import {DataAccessBase} from "./DataAccessBase";
import {xmlSerializer} from "../serializers/xmlSerializer";
import {serializeGeometry} from "../serializers/JsonSerializer";
import {DataOperation} from "../DataOperation";

export class DataAccessService extends DataAccessBase {
    constructor(connector, { serviceName = 'DataAccess' }) {
        super(connector);
        this.init(new Promise(resolve => resolve(serviceName)));
    }

    /**
     * Function for export data from a layer (or filtered data) into one of the following formats: excel, shape, geojson.
     * Returns document identifier. Identifier have to used for download export document
     * @param {Object} properties
     * @param {String} properties.serviceName - name of the service with source geometries
     * @param {String} properties.exportType - type of export expected types: excel, shape, geojson
     * @param {String} [properties.query] - query for data filter. Query example: select {id}, {geometry}, attr1 where attr1 == 'value';
     */
    exportData(properties) {
        let { serviceName, exportType, query, srid } = properties;
        return this.operation('exportData', { serviceName, exportType, query, srid }, false);
    }

    queryById(properties) {
        let { serviceName, objectIds } = properties;
        return this.operation('queryById', { serviceName, objectIds }, true);
    }

    queryByGeometry(properties) {
        let { serviceName, geometry, resolution } = properties;
        let serialized = serializeGeometry(geometry);
        return this.operation('queryByGeometry', { serviceName, geometry: serialized, resolution }, true);
    }

    updateFeatures(properties) {
        let { features, serviceName } = properties;
        let serialized = xmlSerializer.serializeGeometryEdit({ updated: features }, false, true);
        return this.operation('edit', { action: 'edit', edit: serialized, serviceName });
    }

    saveEdit(properties) {
        let { added, updated, serviceName } = properties;
        let serialized = xmlSerializer.serializeGeometryEdit({ added, updated }, false, true);
        return this.operation('edit', { action: 'edit', edit: serialized, serviceName });
    }

    deleteFeatures(properties) {
        let { ids, serviceName } = properties;
        let serialized = xmlSerializer.serializeGeometryEdit({ deleted: ids }, false, true);
        return this.operation('edit', { action: 'edit', edit: serialized, serviceName });
    }

    createFeature(properties) {
        let { serviceName, geometry, attributes = null } = properties;
        let serialized = serializeGeometry(geometry);
        return this.operation('createVisualObject', { geometry: serialized, serviceName, attributes });
    }

    autoComplete(properties) {
        let { serviceName, line, ids } = properties;
        let serialized = serializeGeometry(line);
        return this.operation('autoComplete', { serviceName, line: [serialized], ids });
    }

    reshape(properties) {
        let { serviceName, line, ids } = properties;
        let serialized = serializeGeometry(line);
        return this.operation('reshape', { serviceName, line: [serialized], ids });
    }

    cut(properties) {
        let { serviceName, line, ids } = properties;
        let serialized = serializeGeometry(line);
        return this.operation('cut', { serviceName, line: [serialized], ids });
    }

    projectGeometry(properties) {
        let { features, sourceSr, destinationSr } = properties;
        let geometry = features.map(serializeGeometry);
        return this.operation('gcProject', { sourceGeom: geometry, sourceSr, destSr: destinationSr });
    }

    getScalarValue(properties) {
        let { serviceName, query } = properties;
        return this.operation('selectScalarValue', { serviceName, query });
    }

    copyFeatures(properties) {
        let { sourceServiceName, targetServiceName, objectIds = null } = properties;
        return this.operation('copy', { sourceServiceName, targetServiceName, objectIds });
    }

    aggregate(properties) {
        let { geometrySourceServiceName, dataSourceServiceName, targetServiceName, aggregations } = properties;
        return this.operation('aggregate', { geometrySourceServiceName, dataSourceServiceName, targetServiceName, aggregations });
    }

    batchEdit(properties) {
        let { serviceName, attribute, expression, condition } = properties;
        return this.operation('batchFuncEdit', { serviceName, attribute, expression, condition });
    }

    geocode(properties) {
        let { query, crs, providers } = properties;
        return this.operation('geocode', { query, crs: crs.toString(), providers });
    }

    /**
     * Calculates the buffers and displays them in the controller mapServer
     * @param {Object} properties
     * @param {Number|String[]} properties.distances - an array of buffer radiuses or attribute names, which should be used as a value for radius.
     * @param {Boolean} properties.unionResults - whether to unite buffers into one object.
     * @param {Boolean} properties.subtractObject - whether to subtract the source object from the resulting buffer.
     * @param {Number} [properties.processDelay] - server processes objects in batches of 200. This parameter is a sleep time in ms between batches. Use smaller value for quicker process.
     * @param {Boolean} properties.subtractInnerBuffer - whether to subtract inner buffer from outer buffer. This option has no effect if "unionResult" is true.
     * @param {String} properties.sourceServiceName - name of the service with source geometries
     * @param {String} properties.targetServiceName - name of the service to which to write calculated buffers
     * @param {Function} properties.requested
     * @param {Function} properties.success
     * @param {Function} properties.error
     */
    calculateBuffers(properties) {
        let { distances, unionResults = false, subtractObject = false, processDelay = null, subtractInnerBuffer = false, sourceServiceName, targetServiceName } = properties;
        return this.operation('buffer', { distances, unionResults, subtractInnerBuffer, subtractObject, processDelay, sourceServiceName, targetServiceName });
    }

    /**
     * Build isochrone from the center of every object in the given storage
     * @param {Object} properties
     * @param {Number} properties.duration - time in seconds for isochrone limit
     * @param {String} properties.solver - name of the route builder backend
     * @param {String} properties.sourceServiceName - name of the service of the source geometries
     * @param {String} properties.targetServiceName - name of the service the isochrones will be saved to
     * @param {Number} [properties.resolutionK] - the resolution coefficient of isochrone. 0.1 would mean, that 20x20 grid will be used, 0.5 -> 4x4.
     * @param {Boolean} [properties.uniteResults] - whether to unite the isochrones from different objects
     * @param {Function} properties.requested
     * @param {Function} properties.success
     * @param {Function} properties.error
     */
    buildIsochroneByStorage(properties) {
        let { duration, solver, sourceServiceName, targetServiceName, resolutionK = null, uniteResults = false } = properties;
        return this.operation('isochroneByStorage', { duration, solver, sourceServiceName, targetServiceName, resolutionK, uniteResults });
    }
}