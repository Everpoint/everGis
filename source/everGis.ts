import {SpatialProcessor} from "./SpatialProcessor";
import {Connector} from "./Connector";
import {ControllerManager} from "./ControllerManager";
import {Api} from "./Api";
import {DataFilter, Labeling} from "./DataFilter";
import {DataOperation} from "./DataOperation";
import {LayerManager} from "./LayerManager";
import {Printer} from "./Printer";
import {Project} from "./Project";
import {ServiceGroup} from "./ServiceGroup";
import * as spUtils from "./utils";
import {MapService} from "./services/MapService";
import {DataViewService} from "./services/DataViewService";
import {ServiceContainer} from "./services/ServiceContainer";
import {ServiceGroupService} from "./services/ServiceGroupService";
import {StaticSourceService} from "./services/StaticSourceService";
import {TileService} from "./services/TileService";
import {ClusterLayer, ClusterSymbol} from "./layers/ClusterLayer";
import {DataViewLayer} from "./layers/DataViewLayer";
import {Controller} from "./controllers/Controller";
import {DataAccessBase} from "./controllers/DataAccessBase";
import {DataAccessService} from "./controllers/DataAccessService";
import {ImportData} from "./controllers/ImportData";
import {ObjectSelector} from "./controllers/ObjectSelector";
import {TempView} from "./controllers/TempView";
import {ViewableController} from "./controllers/ViewableController";
import {SpDynamicLayer} from "./layers/SpDynamicLayer";
import {ServiceSnappingProvider} from "./ServiceSnappingProvider";

const sp = {
    SpatialProcessor: SpatialProcessor,
    Connector: Connector,
    ControllerManager: ControllerManager,
    Api: Api,
    DataFilter: DataFilter,
    Labeling: Labeling,
    DataOperation: DataOperation,
    LayerManager: LayerManager,
    Printer: Printer,
    Project: Project,
    ServiceGroup: ServiceGroup,
    utils: spUtils,
    services: {
        MapService: MapService,
        DataViewService: DataViewService,
        ServiceContainer: ServiceContainer,
        ServiceGroupService: ServiceGroupService,
        StaticSourceService: StaticSourceService,
        TileService: TileService
    },
    ClusterLayer: ClusterLayer,
    ClusterSymbol: ClusterSymbol,
    layers: {
        DataViewLayer: DataViewLayer,
        SpDynamicLayer: SpDynamicLayer
    },
    controllers: {
        Controller: Controller,
        DataAccessBase: DataAccessBase,
        DataAccessService: DataAccessService,
        ImportData: ImportData,
        ObjectSelector: ObjectSelector,
        TempView: TempView,
        ViewableController: ViewableController
    },
    ServiceSnappingProvider: ServiceSnappingProvider,
    version: "0.4.1",
    releaseDate: "11.07.2018"
};

export default {sp};
