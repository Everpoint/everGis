import {EventHandler} from "@evergis/sgis/EventHandler";
import {ajaxp, parseJSON} from "../utils";
import {Crs, ellipticalMercator, geo, webMercator, wgs84} from "@evergis/sgis/Crs";
import {Bbox} from "@evergis/sgis/Bbox";
import {error} from "@evergis/sgis/utils/utils";

export class MapService extends EventHandler {
    _fullExtent: any;
    legend: any;
    _isDisplayed: any;
    _crs: any;
    _layer: any;
    private _meta: {};
    private _connector: any;
    private _name: any;
    protected _serviceInfo: any;

    constructor(name, connector, serviceInfo) {
        super();
        this._connector = connector;
        this._meta = {};
        this._name = name;
        this.serviceInfo = serviceInfo;
    }

    subscribeForNotifications() {
        ajaxp({url: this.url + 'subscribe?_sb=' + this._connector.sessionId})
            .then(() => {
                this._connector.addNotificationListner('dynamic layer', this._name, this._redraw.bind(this));
                this._connector.addNotificationListner('symbols', this._name, this.updateLegend.bind(this));
            });
    }

    unsubscribeFromNotifications() {
        ajaxp({ url: `${this.url}subscribe?_sb=${this._connector.sessionId}`})
            .then(() => {
                this._connector.removeNotificationListner('dynamic layer', this._name, this._redraw.bind(this));
                this._connector.removeNotificationListner('symbols', this._name, this.updateLegend.bind(this));
            });
    }

    _redraw() {
        if (this._layer) {
            this._layer.forceUpdate();
            this._layer.redraw();
        }
    }

    get url() {
        return this._connector.url + this._name + '/';
    }

    get serviceInfo() { return this._serviceInfo; }
    set serviceInfo(val) {
        this._crs = MapService.parseCrs(val.spatialReference);
        this._serviceInfo = val;
    }

    get crs() { return this._crs; }
    get layer() { return this._layer; }
    get connector() { return this._connector; }
    get name() { return this._name; }
    get alias() { return this.serviceInfo && this.serviceInfo.alias; }
    get description() { return this.serviceInfo && this.serviceInfo.description; }

    get isDisplayed() { return this._isDisplayed; }
    set isDisplayed(bool) {
        if (this._isDisplayed !== bool) {
            this._isDisplayed = bool;
            if (this.layer) this.layer.isDisplayed = bool;
            this.fire('visibilityChange');
        }
    }

    get hasLegend() { return this.serviceInfo && this.serviceInfo.capabilities && this.serviceInfo.capabilities.indexOf('legend') >= 0; }

    updateLegend() {
        if (this.hasLegend) return this._requestLegend().then(legend => {
            try {
                this.legend = parseJSON(legend[0]);
            } catch (e) {
                this.legend = [];
            }
            this.fire('legendUpdate');
        });

        return new Promise((resolve, reject) => {
            reject("The service does not support legend rendering.");
        });
    }

    _requestLegend() {
        return ajaxp({ url: this.url + 'legend' + (this._connector.sessionId ? '?_sb=' + this._connector.sessionId : '') });
    }

    get attributesDefinition() {
        return this.serviceInfo && this.serviceInfo.attributesDefinition;
    }

    setMeta(key, value) {
        this._meta[key] = value;
    }

    getMeta(key) {
        return this._meta[key];
    }

    get meta() { return this._meta; }
    set meta(meta) { this._meta = meta; }

    get geometryType() { return this.serviceInfo.geometryType; }

    get permissions() { return this.serviceInfo.permissions; }

    static parseCrs(desc) {
        if (desc && crsMapping[desc]) {
            return crsMapping[desc];
        } else if (desc && desc.wkid && crsMapping[desc.wkid]) {
            return crsMapping[desc.wkid];
        } else if (desc && desc.wkid === 0) {
            return null;
        } else {
            return new Crs(desc);
        }
    }

    get fullExtent() {
        if (this._fullExtent) return this._fullExtent;

        if (!this.serviceInfo.fullExtent || this.serviceInfo.fullExtent.xmin === this.serviceInfo.fullExtent.xmax) return null;
        return new Bbox([this.serviceInfo.fullExtent.xmin, this.serviceInfo.fullExtent.ymin], [this.serviceInfo.fullExtent.xmax, this.serviceInfo.fullExtent.ymax], this.crs);
    }

    get initialExtent() {
        if (!this.serviceInfo.initialExtent || this.serviceInfo.initialExtent.xmin === this.serviceInfo.initialExtent.xmax) return null;
        return new Bbox([this.serviceInfo.initialExtent.xmin, this.serviceInfo.initialExtent.ymin], [this.serviceInfo.initialExtent.xmax, this.serviceInfo.initialExtent.ymax], this.crs);
    }

    updateExtent() {
        if (this.serviceInfo.capabilities.indexOf('extent') >= 0) {
            return ajaxp({ url: this.url + 'extent' + (this._connector.sessionId ? '?_sb=' + this._connector.sessionId : '') })
                .then(response => {
                    try {
                        let ext = JSON.parse(response[0]);
                        if (ext.XMin !== undefined && ext.XMin !== ext.XMax) {
                            this._fullExtent = new Bbox([ext.XMin, ext.YMin], [ext.XMax, ext.YMax], this.crs);
                        } else {
                            this._fullExtent = null;
                        }
                    } catch (e) {}
                });
        }

        return new Promise(resolve => resolve());
    }

    get initializationPromise() { return null; }

    getFeatures({condition, offset, limit, orderBy, srid, attributesFilter, getAttributes, getGeometry, getAttributesDefinition, getTotalCount, overrideFilterCondition}) {
        if (this.serviceInfo.capabilities.indexOf('get') < 0) error(new Error("The service is not a feature service"));

        let params = {
            condition,
            offset,
            limit,
            orderBy,
            srid,
            overrideFilterCondition,
            attributesFilter: attributesFilter && JSON.stringify(attributesFilter) || null,
            getAttributes,
            getGeometry,
            getAttributesDefinition,
            getTotalCount,
            _sb: this.connector.sid
        };
        let paramsString = Object.keys(params).filter(key => params[key] !== undefined && params[key] !== null).map(key => `${key}=${encodeURIComponent(params[key].toString())}`).join('&');
        let url = `${this.url}get?${paramsString}`;

        return ajaxp({url})
            .then(([response, status]) => {
                if (status !== 'OK') throw new Error("Failed to get data from server.");

                let parsed;
                try {
                    parsed = parseJSON(response);
                } catch (e) {
                    throw new Error("Invalid response from server: " + response);
                }

                if (!parsed.success) throw new Error("Operation failed");

                let data = parsed.data;
                if (getAttributes !== false) {
                    this.attributesDefinition.attributes.forEach(attrDef => {
                        if (attrDef.type === 'DateTime' || attrDef.type === 'System.DateTime') {
                            data.features.forEach(f => {
                                if (f.attributes[attrDef.name]) f.attributes[attrDef.name] = new Date(f.attributes[attrDef.name]);
                            });
                        }
                    });
                }
                return data;
            });
    }
}

MapService.prototype._isDisplayed = true;

let crsMapping = {
    '102100': webMercator,
    '102113': webMercator,
    '3857': webMercator,
    '3395': ellipticalMercator,
    '84': wgs84,
    '4326': geo
};
