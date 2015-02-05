(function() {

    sGis.geom.Arc = function(center, options) {
        utils.init(this, options);

        this.center = center;
    };

    sGis.geom.Arc.prototype = {
        _radius: 5,
        _strokeColor: 'black',
        _strokeWidth: 1,
        _fillColor: 'transparent',

        contains: function(position) {
            var dx = position.x - this._center[0],
                dy = position.y - this._center[1],
                distance2 = dx * dx + dy * dy;
            return Math.sqrt(distance2) < this._radius + 2;
        }
    };

    Object.defineProperties(sGis.geom.Arc.prototype, {
        center: {
            get: function() {
                return this._center;
            },
            set: function(coordinates) {
                this._center = coordinates;
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },
            set: function(r) {
                this._radius = r;
            }
        },

        strokeColor: {
            get: function() {
                return this._strokeColor;
            },
            set: function(color) {
                this._strokeColor = color;
            }
        },

        strokeWidth: {
            get: function() {
                return this._strokeWidth;
            },
            set: function(w) {
                this._strokeWidth = w;
            }
        },

        fillColor: {
            get: function() {
                return this._fillColor;
            },
            set: function(color) {
                this._fillColor = color;
            }
        }
    });

})();