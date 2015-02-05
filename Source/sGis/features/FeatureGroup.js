'use strict';

(function() {

sGis.FeatureGroup = function(options) {
    this._features = [];
    this._cache = {};
    utils.init(this, options);
};

sGis.FeatureGroup.prototype = {
    _crs: sGis.CRS.geo,

    add: function(feature) {
        if (utils.isArray(feature)) {
            feature.forEach(this.add, this);
        } else {
            if (!(feature instanceof sGis.Feature)) utils.error('sGis.Feature instance is expected but got ' + feature + ' instead');
            this._features.push(feature.projectTo(this._crs));
            this._cache = {};
        }
    }
};

Object.defineProperties(sGis.FeatureGroup.prototype, {
    features: {
        get: function() {
            return this._features;
        },

        set: function(features) {
            this._features = [];
            this.add(features);
        }
    },

    crs: {
        get: function() {
            return this._crs;
        },

        set: function(crs) {
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            this._features.forEach(function(feature, i, array) {
                array[i] = feature.projectTo(crs);
            });
            this._crs = crs;
            this._cache = {};
        }
    },

    bbox: {
        get: function() {
            if (this._cache.bbox) return this._cache.bbox;
            if (this._features.length > 0) {
                var bbox = this._features[0].bbox;
                for (var i = 1, len = this._features.length; i < len; i++) {
                    var currBbox = this._features[i].bbox;
                    bbox.xMin = Math.min(bbox.xMin, currBbox.xMin);
                    bbox.yMin = Math.min(bbox.yMin, currBbox.yMin);
                    bbox.xMax = Math.max(bbox.xMax, currBbox.xMax);
                    bbox.yMax = Math.max(bbox.yMax, currBbox.yMax);
                }
                
                this._cache.bbox = bbox;
                return bbox;
            } else {
                return null;
            }   
        }
    },

    centroid: {
        get: function() {
            var bbox = this.bbox;
            var x = (bbox.p[0].x + bbox.p[1].x) / 2;
            var y = (bbox.p[0].y + bbox.p[1].y) / 2;
            return [x, y];
        }
    }
});

})();