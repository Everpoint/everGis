import {ViewableController} from "./ViewableController";
import {serializeGeometry} from "../serializers/JsonSerializer";
import {DataOperation} from "../DataOperation";

export class ObjectSelector extends ViewableController {
    private map: any;

    constructor(connector, properties) {
        super('objectSelector', connector, properties);
        this.map = properties.map;
        this._setNotificationListener();
    }

    _setNotificationListener() {
        this.connector.addObjectSelectorListener(data => {
            this.fire('update', { data });
        });
    }

    select(properties) {
        let { geometry, mode = 0, services } = properties;
        let serialized = serializeGeometry(geometry);

        return this.operation('select', { geom: serialized, res: this.map && this.map.resolution, mode, services, sr: this.map && this.map.crs.toString() });
    }

    pickByGeometry(properties) {
        let { geometry, services } = properties;
        let serialized = serializeGeometry(geometry);

        return this.operation('pick', { geom: serialized, res: this.map && this.map.resolution, services, sr: this.map && this.map.crs.toString() }, true);
    }

    pickById(properties) {
        let { ids, serviceName, mode = 0 } = properties;
        return this.operation('pickById', { ids: [{ ServiceName: serviceName, ObjectIds: ids }], mode }, true);
    }

    /**
     * Selection of objects by the geometry in specified storage
     * @param {Object} properties
     * @param {String} properties.geometryStorageId - storage id with the geometry to be used for selection
     * @param {String[]} [properties.searchStorageIds] - the list of storage is, in which search will be performed
     * @param {Number} [properties.mode} - mode of search. 0 - clear search tree before search, 1 - add to selection, 2 - remove from selection
     * @param {String} [properties.operation] - "contains" to find only objects, completely contained by search geometry.
     */
    selectByStorage(properties) {
        let { geometryService, services, mode = 0, operation = null } = properties;
        return this.operation('selectByStorage', { geometryService, res: this.map && this.map.resolution, services, mode, operation });
    }

    search(properties) {
        let { string, services } = properties;
        return this.operation('search', {query: string, services});
    }

    clear() {
        return this.operation('clear', {});
    }
}
