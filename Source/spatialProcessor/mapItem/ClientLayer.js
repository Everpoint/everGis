'use strict';

(function() {

    sGis.mapItem.ClientLayer = function(controller, properties) {
        this.controller = controller;
        this.__initialize(properties);
    };

    sGis.mapItem.ClientLayer.prototype = new sGis.MapItem({

    });

    Object.defineProperties(sGis.mapItem.ClientLayer.prototype, {
        controller: {
            get: function() {
                return this._controller;
            },
            set: function(controller) {
                if (!(controller instanceof sGis.spatialProcessor.controller.ClientLayer)) utils.error('sGis.spatialProcessor.controller.ClientLayer instance is expected but got ' + controller + ' instead');
                this._controller = controller;
            }
        },

        mapServer: {
            get: function() {
                return this._controller.mapServer;
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
        }
    });

})();