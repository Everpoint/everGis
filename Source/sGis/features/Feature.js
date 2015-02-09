'use strict';

(function() {

    sGis.feature = {};

    sGis.Feature = function(extention) {
        for (var key in extention) {
            this[key] = extention[key];
        }
    };

    sGis.Feature.prototype = {
        _bbox: null,
        _attributes: null,
        _crs: sGis.CRS.geo,
        _hidden: false,

        render: function(resolution, crs) {
            if (this._hidden) {
                return [];
            } else {
                return this._symbol.renderFunction.call(this, resolution, crs);
            }
        },

        hide: function() {
            this._hidden = true;
        },

        show: function() {
            this._hidden = false;
        },

        __initialize: function(options) {
            if (options && options.id) {
                this.id = options.id;
                delete options.id;
            } else {
                this._id = utils.getGuid();
            }

            if (options && options.symbol) {
                this.symbol = options.symbol;
                delete options.symbol;
            } else if (this._defaultSymbol) {
                this.symbol = this._defaultSymbol;
            }

            utils.init(this, options);
        }
    };

    Object.defineProperties(sGis.Feature.prototype, {
        id: {
            get: function() {
                return this._id;
            },

            set: function(id) {
                this._id = id;
            }
        },

        attributes: {
            get: function() {
                return this._attributes;
            },

            set: function(attributes) {
                this._attributes = attributes;
            }
        },

        crs: {
            get: function() {
                return this._crs;
            }
        },

        symbol: {
            get: function() {
                return this._symbol;
            },

            set: function(symbol) {
                if (!(symbol instanceof sGis.Symbol)) utils.error('sGis.Symbol instance is expected but got ' + symbol + ' instead');
                if (symbol.type !==  this.type) utils.error('sGis.feature.Point object requere symbol of the type "' + this.type + '" but got ' + symbol.type + ' instead');

                this._symbol = symbol;
                this._style = {defaults: symbol.defaults};
                for (var i in symbol.style) {
                    Object.defineProperty(this._style, i, {
                        get: symbol.style[i].get,
                        set: symbol.style[i].set
                    });
                }
            }
        },

        style: {
            get: function() {
                return this._style;
            },

            set: function(style) {
                if (!(style instanceof Object)) utils.error('Object is expected but got ' + style + ' instead');
                for (var i in style) {
                    this._style[i] = style[i];
                }
            }
        },

        hidden: {
            get: function() {
                return this._hidden;
            },
            set: function(bool) {
                if (bool === true) {
                    this.hide();
                } else if (bool === false) {
                    this.show();
                } else {
                    utils.error('Boolean is expected but got ' + bool + ' instead');
                }
            }
        }
    });

    utils.mixin(sGis.Feature.prototype, sGis.IEventHandler.prototype);

    var id = 0;

    sGis.Feature.getNewId = function() {
        return utils.getGuid();
    };

})();