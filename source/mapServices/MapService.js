sGis.module('spatialProcessor.MapService', [
    'utils',
    'CRS'
], (utils, CRS) => {

    'use strict';

    let submodules = {};
    
    class MapService {
        constructor(connector, name, serviceInfo) {
            this._connector = connector;
            this._name = name;
            this.serviceInfo = serviceInfo;
        }
        
        static initialize(connector, name) {
            let url = connector.url + name + '/?_sb=' + connector.sessionId;
            return utils.ajaxp({url: url})
                .then(([response]) => {
                    try {
                        var serviceInfo = utils.parseJSON(response);
                        if (serviceInfo.capabilities && serviceInfo.capabilities.indexOf('tile') >= 0) {
                            return new submodules.TileService(connector, name, serviceInfo);
                        } else {
                            return new submodules.DataViewService(connector, name, serviceInfo);
                        }
                    } catch (e) {
                        throw new Error('Failed to initialize service ' + name);
                    }
                });
        }
        
        static register(name, module) {
            submodules[name] = module;
        }

        get url() {
            return this._connector.url + this._name + '/';
        }
        
        get serviceInfo() { return this._serviceInfo; }
        set serviceInfo(val) {
            if (val.spatialReference && crsMapping[val.spatialReference.wkid]) {
                this._crs = crsMapping[val.spatialReference.wkid];
            } else if (val.spatialReference && val.spatialReference.wkid === 0) {
                this._crs = null;
            } else {
                this._crs = new sGis.Crs({description: val.spatialReference});
            }
            
            this._serviceInfo = val;
        }
        
        get crs() { return this._crs; }
        get layer() { return this._layer; }
        get connector() { return this._connector; }
        get name() { return this._name; }
        
        get isDisplayed() { return this._isDisplayed; }
        set isDisplayed(bool) { 
            this._isDisplayed = bool;
            if (this.layer) this.layer.isDisplayed = bool;
        }
    }

    MapService.prototype._isDisplayed = true;
    
    let crsMapping = {
        '102100': CRS.webMercator,
        '102113': CRS.webMercator,
        '667': CRS.ellipticalMercator
    };

    return MapService;

});