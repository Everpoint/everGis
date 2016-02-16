'use strict';

(function() {

sGis.spatialProcessor.ClusteringService = function(serverConnector, name, options) {
    this._serverConnector = serverConnector;
    this._url = serverConnector.url + name + '/';
    this._id = sGis.utils.getGuid();

    sGis.utils.init(this, options);
};

sGis.spatialProcessor.ClusteringService.prototype = {
    _map: null,
    _layer: null,
    _storageId: null,
    _click: null,
    _minSize: 6,
    _maxSize: 31,

    getClusters: function(options) {
        // options: {storageId, bbox, resolution, [success, requested, error]}
        var bbox = options.bbox,
            bboxString = [bbox.p[0].x, bbox.p[0].y, bbox.p[1].x, bbox.p[1].y].join(','),
            sizeString = Math.round(bbox.width / options.resolution) + ',' + Math.round(bbox.height / options.resolution);

        sGis.utils.ajax({
            url: this._url + options.storageId + '/?bbox=' + encodeURIComponent(bboxString) + '&size=' + encodeURIComponent(sizeString) + '&_sb=' + this._serverConnector.sessionId,
            cache: false,
            success: function(response) {
                var clusters = sGis.utils.parseJSON(response);
                if (options.success) options.success(clusters);
            },
            requested: options.requested,
            error: options.error
        });
    },

    updateClusters: function() {
        if (this._layer && this._map && this._storageId) {
            var self = this;
            this.getClusters({
                storageId: this._storageId,
                bbox: this._map.bbox,
                resolution: this._map.resolution,
                success: function(clusters) {
                    self._layer.features = [];

                    var maxSize = 15;
                    clusters.forEach(function(cluster) {
                        maxSize = Math.max(cluster.Items.length, maxSize);
                    });

                    clusters.forEach(function(cluster) {
                        var size = self._minSize + Math.round((self._maxSize - self._minSize) * (cluster.Items.length / maxSize));
                        var point = new sGis.feature.Point([cluster.X, cluster.Y], { crs: self._map.crs, size: size, color: 'red' });
                        point.items = cluster.Items;
                        if (self._click) point.addListener('click', self._click);
                        self._layer.add(point);
                    });

                    self._map.redrawLayer(self._layer);
                }
            });
        }
    }
};

Object.defineProperties(sGis.spatialProcessor.ClusteringService.prototype, {
    map: {
        get: function() {
            return this._map;
        },
        set: function(map) {
            if (!(map instanceof sGis.Map)) sGis.utils.error('sGis.Map instance is expected but got ' + map + ' instead');

            if (this._map) {
                this._map.removeListener('.sGis-clusteringService-' + this._id);
                if (this._layer) this._map.removeLayer(this._layer);
            }

            if (this._layer && map.getLayerIndex(this._layer === -1)) map.addLayer(this._layer);

            var self = this;
            map.addListener('bboxChangeEnd.sGis-clusteringService-' + this._id, function() {
                self.updateClusters();
            });
            this._map = map;
        }
    },

    layer: {
        get: function() {
            return this._layer;
        },
        set: function(layer) {
            if (!(layer instanceof sGis.FeatureLayer)) sGis.utils.error('sGis.FeatureLayer instance is expected but got ' + layer + ' instead');

            if (this._map) {
                if (this._layer) {
                    this._map.removeLayer(this._layer);
                }
                if (this._map.getLayerIndex(layer) === -1) {
                    this._map.addLayer(layer);
                }
            }

            this._layer = layer;
            this.updateClusters();
        }
    },

    storageId: {
        get: function() {
            return this._storageId;
        },
        set: function(id) {
            if (!sGis.utils.isString(id)) sGis.utils.error('String is expected but got ' + id + ' instead');

            this._storageId = id;
            this.updateClusters();
        }
    },

    click: {
        get: function() {
            return this._click;
        },
        set: function(handler) {
            if (!(handler instanceof Function)) sGis.utils.error('Function is expected but got ' + handler + ' instead');
            this._click = handler;
        }
    }
});

})();