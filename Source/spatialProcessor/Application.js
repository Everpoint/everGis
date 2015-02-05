'use strict';

(function() {

    window.everGis = {
//    _serverUrl: 'http://194.187.206.128:20888/services/spatialprocessor/',
//    _serverUrl: 'http://192.168.13.64/spatialprocessor/',   // http://192.168.13.64/Strategis.JsClient/ApiLogin.aspx?authId=505741D8-C667-440D-9CA0-32FD1FF6AF88&userName=new&password=new
//    _serverUrl: 'http://chuck-pc/SpatialProcessor/',
//    _serverUrl: 'http://dev2.everpoint.ru/EverGIS/SpatialProcessor/IIS/',
//    _serverUrl: 'http://dev1.everpoint.ru/EverGIS/SpatialProcessor/IIS/',
        _mapItems: new sGis.mapItem.Folder(),
        _maps: [],
        _onDOMReady: [],
        _mapServices: [],
        _controllers: [],

        addMapItem: function(mapItem) {
            this._mapItems.addChild(mapItem);
        },

        addMapItems: function(mapItems) {
            this._mapItems.addChildren(mapItems);
        },

        removeMapItem: function(mapItem) {
            this._mapItems.removeChild(mapItem);
        },

        getMapItemList: function() {
            return this._mapItems.getChildren(true);
        },

        map: function(id) {
            var map = new sGis.Map();
            this._maps.push(map);

            this.onDOMReady = function() {
                map.wrapper = id;
            };

            return map;
        },

        folder: function(properties) {
            var folder = new sGis.mapItem.Folder({name: properties.name, parent: properties.parent || this._mapItems, active: properties.active});
            return folder;
        },

        mapServer: function(name, properties) {
            var mapServer = new sGis.spatialProcessor.MapServer(name, this._serverConnector, {map: properties.map, opacity: properties.opacity, display: properties.display}),
                self = this,
                mapItem = new sGis.mapItem.MapServer(mapServer, {active: properties.display});
            if (properties.folder) {
                properties.folder.addChild(mapItem);
            } else {
                this._mapItems.addChild(mapItem);
            }

            mapServer.addListner('initialize', function() {
                var index = mapItem.parent.getChildIndex(mapItem);
                mapItem.parent.moveChildToIndex(mapItem, index === -1 ? 0 : index);
            });

            return mapServer;
        },

        removeMapServer: function(mapServer) {
            if (!(mapServer instanceof sGis.spatialProcessor.MapServer)) utils.error('sGis.spatialProcessor instance is expected but got ' + mapServer + ' instead');
            var mapItems = this.mapItems;
            for (var i in mapItems) {
                if (mapItems[i].layer && mapItems[i].layer === mapServer) this.removeMapItem(mapItems[i]);
            }

            mapServer.map = null;
        },

        controller: function(type, options) {
            if (!options) options = {};
            if (type in sGis.spatialProcessor.controllerList) {
                if (this._maps[0]) options.map = this._maps[0];
                var controller = new sGis.spatialProcessor.controllerList[type](this._serverConnector, options);
                this._controllers.push(controller);
                return controller;
            } else {
                utils.error('Requested unknows type of controlller: ' + type);
            }
        },

        connect: function(url, login, password) {
            this._serverConnector = new sGis.spatialProcessor.Connector(url, this._mapItems, login, password);

            everGis._serverConnector.addListner('sessionInitialized', function() {
                isInitialized = true;
                for (var i in everGis._onInitialized) {
                    everGis._onInitialized[i]();
                }
            });
        }
    };

    Object.defineProperties(everGis, {
        serverConnector: {
            get: function() {
                return this._serverConnector;
            }
        },

        serverUrl: {
            get: function() {
                return this._url;
            }
        },

        mapItems: {
            get: function() {
                return this._mapItems.getChildren();
            },

            set: function(mapItems) {
                this._mapItems.removeChildren();
                this._mapItems.addChildren(mapItems);
            }
        },

        rootMapItem: {
            get: function() {
                return this._mapItems;
            }
        },

        sessionId: {
            get: function() {
                return this._serverConnector.sessionId;
            }
        },

        onDOMReady: {
            set: function(callback) {
                if (!(callback instanceof Function)) utils.error('Function is expected but got ' + callback + ' instead');
                if (!isDOMReady) {
                    this._onDOMReady.push(callback);
                } else {
                    callback();
                }
            }
        },

        onInitialized: {
            set: function(callback) {
                if (!(callback instanceof Function)) utils.error('Function is expected but got ' + callback + ' instead');
                if (isInitialized) {
                    callback();
                } else {
                    this._onInitialized.push(callback);
                }
            }
        }
    });

    var isInitialized = false;

//everGis._serverConnector = new sGis.spatialProcessor.Connector(everGis._serverUrl, 'z', 'z');


    var isDOMReady = false;

    Event.add(document, 'DOMContentLoaded', function() {
        isDOMReady = true;
        for (var i in everGis._onDOMReady) {
            everGis._onDOMReady[i]();
        }
    });

    sGis.spatialProcessor.controllerList = {
        'identify': sGis.spatialProcessor.controller.Identify,
        'superSearch': sGis.spatialProcessor.controller.SuperSearch,
        'ditIntegration': sGis.spatialProcessor.controller.DitIntegration,
        'clientLayer': sGis.spatialProcessor.controller.ClientLayer
    };

})();