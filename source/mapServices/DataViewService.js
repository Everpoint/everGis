sGis.module('spatialProcessor.mapService.DataViewService', [
    'DynamicLayer',
    'spatialProcessor.MapService',
    'spatialProcessor.ClusterLayer'
], (DynamicLayer, MapService, ClusterLayer) => {

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
        
        get isEditable() { return !!this.dataSource; }
        get isFilterable() { return !!this.dataSource; }

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

        get filter() { return this.customFilter || this.serviceInfo.filter; }
        set filter(filter) {
            this.setCustomFilter(filter);
        }

        setCustomFilter(filter) {
            this._customFilter = filter;
            return this.connector.api.setDataFilter(this.name, JSON.stringify(filter));
        }
        
        get allowsClustering() { return true; }
        
        get showAsClusters() { return this._showAsClusters; }
        set showAsClusters(bool) {
            bool = !!bool;
            if (bool === this._showAsClusters) return;
            
            this.clusterLayer.isDisplayed = this.dynamicLayer.isDisplayed = this._isDisplayed;
            this._showAsClusters = bool;
            this.fire('layerChange', { prevLayer: bool ? this.dynamicLayer : this.clusterLayer });
        }
        
        get clusterLayer() {
            if (!this._clusterLayer) this._setClusterLayer();
            return this._clusterLayer;
        }
        
        get layer() { return this._showAsClusters ? this.clusterLayer : this.dynamicLayer; }
        get dynamicLayer() { return this._layer; }
        
        _setClusterLayer() {
            this._clusterLayer = new ClusterLayer(this.url, this.connector.sessionId);
        }
    }
    
    DataViewService.prototype._showAsClusters = false;

    MapService.register('DataViewService', DataViewService);

    return DataViewService;

});