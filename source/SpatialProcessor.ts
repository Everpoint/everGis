import {Connector} from "./Connector";
import {LayerManager} from "./LayerManager";
import {ControllerManager} from "./ControllerManager";
import {Project} from "./Project";
import {DataAccessService} from "./controllers/DataAccessService";
import {ServiceContainer} from "./services/ServiceContainer";
import {MapService} from "./services/MapService";
import {TileService} from "./services/TileService";
import {Map} from "@evergis/sgis/Map"
import {DomPainter} from "@evergis/sgis/painters/DomPainter/DomPainter";

export class SpatialProcessor {
    _baseServiceContainer: ServiceContainer;
    _dataAccessService: DataAccessService;
    project: Project;
    _login: any;
    layerManager: LayerManager;
    _painter: DomPainter;
    private _connector: Connector;
    private _map: Map;
    private api: any;
    private controllerManager: ControllerManager;
    /**
     * @constructor
     * @param {Object} properties
     * @param {String} [properties.sessionId]
     * @param {String} properties.url
     * @param {String} [properties.login]
     * @param {String} [properties.password]
     * @param {Position} [properties.position]
     * @param {Number} [properties.resolution]
     * @param {String} [properties.mapWrapper]
     * @param {String[]} [properties.services]
     * @param {String} [properties.projectName]
     * @param {String} [properties.baseService]
     * @param {sGis.IPoint} [properties.centerPoint]
     */
    constructor(properties) {
        let { sessionId, url, login, password, position, resolution, mapWrapper, services, projectName, baseService, centerPoint, authServiceUrl } = properties;

        if (!authServiceUrl) authServiceUrl = this._guessAuthServiceUrl(url);

        if (sessionId) {
            this._connector = new Connector(url, authServiceUrl, {sessionId});
        } else {
            this._connector = new Connector(url, authServiceUrl, {login, password});
        }

        this._map = new Map();
        this._painter = new DomPainter(this._map);

        if (!baseService) this._initMapParams({ position, resolution, mapWrapper, centerPoint });

        this.api = this._connector.api;
        this.layerManager = new LayerManager(this.connector, this.map);
        this.controllerManager = new ControllerManager(this.connector, this.map);
        this._login = properties.login;

        this.project = new Project(this.api);

        if (this._connector.sessionId || !login) {
            this._init({ services, projectName, baseService, position, resolution, mapWrapper, centerPoint });
        } else {
            this._connector.once('sessionInitialized', this._init.bind(this, { services, projectName, baseService, position, resolution, mapWrapper, centerPoint }));
        }

        this._dataAccessService = new DataAccessService(this._connector, { serviceName: 'DataAccess' });
    }

    _init({ services, projectName, baseService, position, resolution, mapWrapper, centerPoint }) {
        if (baseService) {
            this._baseServiceContainer = new ServiceContainer(this._connector, baseService, {});
            this._baseServiceContainer.init();
            this._baseServiceContainer.once('stateUpdate', this._onBaseServiceInit.bind(this, { position, resolution, mapWrapper, centerPoint }));
        }

        this.layerManager.init(services);

        this.project.setContext('map', this._map);
        this.project.setContext('layerManager', this.layerManager);

        if (projectName) {
            this.project.load(projectName);
        }
    }

    kill() {
        if (this._connector) this._connector.cancelNotificationRequest();
        this._painter.wrapper = null;
    }

    get map() { return this._map; }
    get painter() { return this._painter; }
    get login() { return this._login; }
    get connector() { return this._connector; }
    get dataAccessService() { return this._dataAccessService; }

    _initMapParams({ position, resolution, mapWrapper, centerPoint }) {
        if (position) {
            this._map.position = position;
        } else if (centerPoint) {
            this._map.centerPoint = centerPoint;
        }

        if (resolution) this._map.resolution = resolution;
        if (mapWrapper) this._painter.wrapper = mapWrapper;
    }

    get baseService() { return this._baseServiceContainer && this._baseServiceContainer.service; }

    _onBaseServiceInit(params) {
        if (!this._baseServiceContainer.service) {
            console.error('Base service initialization failed. Error: ' + this._baseServiceContainer.error);
        } else if (!(this._baseServiceContainer.service instanceof TileService)) {
            console.error('Base service must be a tile service, but loaded service does not support tile rendering.');
        } else {
            this._map.crs = this.baseService.crs;
            this._map.tileScheme = this.baseService.tileScheme;
            this._map.insertLayer(this.baseService.layer, 0);
        }

        this._initMapParams(params);
    }

    _guessAuthServiceUrl(spUrl) {
        return spUrl.replace('SpatialProcessor/IIS/', 'Strategis.Server.Authorization/Authorize.svc/Login');
    }
}

Project.registerCustomDataItem('map', ({map}) => {
    if (!map) return;
    return { position: map.position, resolution: map.resolution, crsCode: map.crs.toString() };
}, ({position, resolution, crsCode}, {map}) => {
    if (!map) return;
    if (crsCode) map.crs = MapService.parseCrs(crsCode);
    if (position) map.position = position;
    if (resolution) map.resolution = resolution;
});
