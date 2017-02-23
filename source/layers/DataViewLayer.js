sGis.module('sp.layers.DataViewLayer', [
    'Layer',
    'sp.ClusterLayer',
    'DynamicLayer',
    'sp.ClusterSymbol'
], (Layer, ClusterLayer, DynamicLayer, ClusterSymbol) => {

    'use strict';

    class DataViewLayer extends Layer {
        constructor(service) {
            super();
            this._service = service;

            this._dynamicLayer = new DynamicLayer(this.getImageUrl.bind(this), { crs: service.crs });

            service.on('dataFilterChange', this._updateDataFilter.bind(this));
            this._updateDataFilter();

            this.redraw = this.redraw.bind(this);
        }

        _updateDataFilter() {
            this._resolutionGroups = [];
            let filter = this._service.dataFilter;

            if (filter) this._fillResolutionGroups(filter);
        }

        _fillResolutionGroups(filter) {
            if (filter.childFilters && filter.childFilters.length > 0) {
                filter.childFilters.forEach(x => this._fillResolutionGroups(x));
                return;
            }

            if (filter.symbol && filter.symbol instanceof ClusterSymbol) {
                let layer = new ClusterLayer(this._service.url, this._service.connector.sessionId, filter.symbol);
                layer.aggregationParameters = [{ filters: filter.condition, aggregations: filter.aggregations && filter.aggregations.join(',')}];
                layer.algorithm = 'adjustedGrid';
                layer.on('propertyChange', () => {
                    this.redraw();
                });
                this._resolutionGroups.push({ minResolution: filter.minResolution, maxResolution: filter.maxResolution, layer: layer });
            } else {
                this._resolutionGroups.push({ minResolution: filter.minResolution, maxResolution: filter.maxResolution, layer: this._dynamicLayer });
            }
        }

        getFeatures(bbox, resolution) {
            if (!this.checkVisibility(resolution)) return [];

            let dynamicLayerUsed = false;
            let features = [];
            this._resolutionGroups.forEach(group => {
                if (group.minResolution > 0 && group.minResolution > resolution || group.maxResolution > 0 && group.maxResolution < resolution) return;
                if (group.layer === this._dynamicLayer && dynamicLayerUsed) return;

                features = features.concat(group.layer.getFeatures(bbox, resolution));
            });

            return features;
        }

        getImageUrl(bbox, resolution) {
            let imgWidth = Math.round((bbox.xMax - bbox.xMin) / resolution);
            let imgHeight = Math.round((bbox.yMax - bbox.yMin) / resolution);
            let sr = encodeURIComponent(bbox.crs.wkid || JSON.stringify(bbox.crs.description));

            return this._service.url + 'export?' +
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
                'f=image' + this._service.connector.sessionSuffix;
        }

        get opacity() { return this._dynamicLayer.opacity; }
        set opacity(opacity) {
            this._dynamicLayer.opacity = opacity;
        }

        forceUpdate() { this._dynamicLayer.forceUpdate(); }
    }

    DataViewLayer.prototype.delayedUpdate = true;

    return DataViewLayer;

});