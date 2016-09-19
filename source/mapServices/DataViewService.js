sGis.module('spatialProcessor.mapService.DataViewService', [
    'DynamicLayer',
    'spatialProcessor.MapService'
], (DynamicLayer, MapService) => {

    'use strict';

    class DataViewService extends MapService {
        constructor(connector, name, serviceInfo) {
            super(connector, name, serviceInfo);
            this._setLayer();
        }

        _setLayer() {
            this._layer = new DynamicLayer(this.getImageUrl.bind(this), { crs: this.crs, isDisplayed: this.isDisplayed });
        }

        get dataSource() {
            return this._serviceInfo.dataSourceServiceName;
        }
        
        get isEditable() { return this.dataSource !== undefined; }

        getImageUrl(bbox, resolution) {
            var imgWidth = Math.round((bbox.xMax - bbox.xMin) / resolution);
            var imgHeight = Math.round((bbox.yMax - bbox.yMin) / resolution);
            var sr = encodeURIComponent(bbox.crs.wkid || JSON.stringify(bbox.crs.description));

            return this.url + 'export?' +
                'dpi=96&' +
                'transparent=true&' +
                'bbox=' +
                bbox.xMin + '%2C' +
                bbox.yMin + '%2C' +
                bbox.xMax + '%2C' +
                bbox.yMax + '&' +
                'bboxSR=' + sr + '&' +
                'imageSR=' + sr + '&' +
                'size=' + imgWidth + '%2C' + imgHeight + '&' +
                'f=image&_sb=' + this.connector.sessionId;
        }
        
        get customFilter() { return this._customFilter; }

        setCustomFilter(filter) {
            this._customFilter = filter;
            return this.connector.api.setDataFilter(this.name, JSON.stringify(filter));
        }
    }

    MapService.register('DataViewService', DataViewService);

    return DataViewService;

});