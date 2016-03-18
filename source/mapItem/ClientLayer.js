sGis.module('mapItem.ClientLayer', [
    'utils',
    'MapItem'
], function(utils, MapItem) {
    'use strict';

    var ClientLayer = function(controller, properties) {
        this.controller = controller;
        this.__initialize(properties);

        this.controller.mapServer.on('legendUpdate', this._onLegendUpdate.bind(this))
    };

    ClientLayer.prototype = new sGis.MapItem({
        _onLegendUpdate: function() {
            this.fire('legendUpdate');
        }
    });

    Object.defineProperties(ClientLayer.prototype, {
        controller: {
            get: function() {
                return this._controller;
            },
            set: function(controller) {
                if (!(controller instanceof sGis.spatialProcessor.controller.ClientLayer)) sGis.utils.error('sGis.spatialProcessor.controller.ClientLayer instance is expected but got ' + controller + ' instead');
                this._controller = controller;
            }
        },

        mapServer: {
            get: function() {
                return this._controller.mapServer;
            }
        },

        legend: {
            get: function() {
                return this._controller.mapServer.legend && this._controller.mapServer.legend[0] && this._controller.mapServer.legend[0].legend
            }
        },

        isActive: {
            get: function() {
                return this._active;
            },
            set: function(bool) {
                if (bool) {
                    this._controller.show();
                    this.fire('activate');
                } else {
                    this._controller.hide();
                    this.fire('deactivate');
                }
            }
        },

        layerInfo: {
            get: function() {
                return this._controller.mapServer.layerInfo[0].LayerInfo;
            }
        },

        storageId: {
            get: function() {
                return this.layerInfo.storageId;
            }
        },

        serverOperations: {
            get: function() {
                return [{ FullName: this.controller.mapServer.fullName, Identity: 0, Operation: 'sm' }];
            }
        },

        isEditable: {
            get: function() {
                return true;
            }
        },

        resolutionLimits: {
            get: function() { return this.mapServer.layer.resolutionLimits},
            set: function(limits) { this.mapServer.layer.resolutionLimits = limits; }
        },

        isDisplayed: {
            get: function() {
                if (this.mapServer.map) {
                    var currResolution = this.mapServer.map.resolution;
                    var isInLimits = (this.resolutionLimits[0] < 0 || currResolution > this.resolutionLimits[0]) && (this.resolutionLimits[1] < 0 || currResolution < this.resolutionLimits[1]);
                }

                return isInLimits && this._active && !this._suppressed;
            }
        }
    });
    
    return ClientLayer;
    
});


(function() {


})();