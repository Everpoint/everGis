sGis.module('SpatialProcessor', [
    'utils',
    'Point',
    'Map',
    'painter.DomPainter',
    'spatialProcessor.Connector',
    'spatialProcessor.LayerManager',
    'spatialProcessor.DataAccessService',
    'EventHandler',
    'spatialProcessor.ControllerManager',
    'spatialProcessor.Project',
    'spatialProcessor.services.MapService'
], function(utils, Point, Map, DomRenderer, Connector, LayerManager, DataAccessService, EventHandler, ControllerManager, Project, MapService) {
    'use strict';
    
    class SpatialProcessor {
        constructor(properties) {
            if (properties.sessionId) {
                this._connector = new Connector(properties.url, properties.sessionId);
            } else {
                this._connector = new Connector(properties.url, properties.login, properties.password);
            }

            this._map = new Map({position: properties.position, resolution: properties.resolution});
            this.api = this._connector.api;
            this._painter = new DomRenderer(this._map, {wrapper: properties.mapWrapper});
            this.layerManager = new LayerManager(this.connector, this.map, this.api, this._painter);
            this.controllerManager = new ControllerManager(this.connector, this.map);
            this._login = properties.login;

            this.project = new Project(this.api);

            if (this._connector.sessionId || !properties.login) {
                this._init(properties);
            } else {
                this._connector.once('sessionInitialized', this._init.bind(this, properties));
            }

            this._dataAccessService = new DataAccessService(this._connector, 'DataAccess');
        }

        _init(properties) {
            this.layerManager.init(properties.services);

            this.project.setContext('map', this._map);
            this.project.setContext('layerManager', this.layerManager);

            if (properties.projectName) {
                this.project.load(properties.projectName);
            }
        }

        kill() {
            if (this._connector) this._connector.cancelNotificationRequest();
            this._map.wrapper = null;
        }

        get map() { return this._map; }
        get painter() { return this._painter; }
        get login() { return this._login; }
        get connector() { return this._connector; }
        get dataAccessService() { return this._dataAccessService; }
    }

    Project.registerCustomDataItem('map', ({map}) => {
        if (!map) return;
        return { position: map.position, resolution: map.resolution, crsCode: MapService.serializeCrs(map.crs) };
    }, ({position, resolution, crsCode}, {map}) => {
        if (!map) return;
        if (crsCode) map.crs = MapService.parseCrs(crsCode);
        if (position) map.position = position;
        if (resolution) map.resolution = resolution;
    });

    SpatialProcessor.version = "0.2.2";
    SpatialProcessor.releaseDate = "21.12.2016";

    return SpatialProcessor;
    
});
