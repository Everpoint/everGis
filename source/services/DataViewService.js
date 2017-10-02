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
            if (connector.sessionId) this.subscribeForNotifications()
        }

        kill() {
            if (this.connector.sessionId) this.unsubscribeFromNotifications();
            if (this.tempFilterApplied) this.setDataFilter(null, false);
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

        get dataFilter() { return this._dataFilter || this._originalFilter; }
        get tempFilterApplied() { return this._dataFilter && this._dataFilter !== this._originalFilter; }

        setDataFilter(filter, updateLegend = true) {
            this._dataFilter = filter;

            let data = filter ? 'filterDescription=' + encodeURIComponent(JSON.stringify(filter.serialize())) : '';
            let promise = utils.ajaxp({
                url: `${this.url}setTempDataFilter?_sb=${this.connector.sessionId}`,
                type: 'POST',
                data: data
            });

            if (updateLegend) promise.then(() => this.updateLegend());

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
            this._dataFilter = null;
            this._customFilter = filter;
            return utils.ajaxp({
                url: `${this.url}setTempDataFilter?_sb=${this.connector.sessionId}`,
                type: 'POST',
                data: 'filterDescription=' + encodeURIComponent(JSON.stringify(filter))
            }).then(() => this.updateLegend());
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