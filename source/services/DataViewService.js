sGis.module('sp.services.DataViewService', [
    'sp.utils',
    'sp.services.MapService',
    'sp.ClusterLayer',
    'sp.services.ServiceContainer',
    'sp.DataFilter',
    'sp.layers.DataViewLayer'
], (utils, MapService, ClusterLayer, ServiceContainer, DataFilter, DataViewLayer) => {

    'use strict';

    class DataViewService extends MapService {
        constructor(name, connector, serviceInfo) {
            super(name, connector, serviceInfo);
            if (serviceInfo.dataFilter) this._dataFilter = this._originalFilter = DataFilter.deserialize(serviceInfo.dataFilter);
            this._setLayer();
            if (connector.sessionId) this._subscribeForNotifications()
        }

        _setLayer() {
            this._layer = new DataViewLayer(this);
        }

        get dataSource() {
            return this._serviceInfo.dataSourceServiceName;
        }
        
        get dataSourceInfo() {
            return this._serviceInfo.sourceServiceInfo;
        }
        
        get isEditable() {
            return this.serviceInfo.isEditable;
        }
        get isFilterable() { return this.serviceInfo.capabilities && this.serviceInfo.capabilities.indexOf('setTempDataFilter') !== -1; }

        get dataFilter() { return this._dataFilter; }
        get tempFilterApplied() { return this._dataFilter !== this._originalFilter; }

        setDataFilter(filter) {
            this._dataFilter = filter;

            let serialized = filter.serialize();
            let promise = utils.ajaxp({
                url: `${this.url}setTempDataFilter?_sb=${this.connector.sessionId}`,
                type: 'POST',
                data: 'filterDescription=' + encodeURIComponent(JSON.stringify(serialized))
            });

            this.fire('dataFilterChange');

            return promise;
        }
        
        get customFilter() { return this._customFilter; }

        get filter() { return this.customFilter || this.serviceInfo.filter; }
        set filter(filter) {
            this.setCustomFilter(filter);
        }

        /**
         * @deprecated
         */
        setCustomFilter(filter) {
            this._customFilter = filter;
            return utils.ajaxp({
                url: `${this.url}setTempDataFilter?_sb=${this.connector.sessionId}`,
                type: 'POST',
                data: 'filterDescription=' + encodeURIComponent(JSON.stringify(filter))
            });
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

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'DataView' && serviceInfo.capabilities.indexOf('tile') === -1 || serviceInfo.serviceType === 'DataSourceService', DataViewService);

    return DataViewService;

});