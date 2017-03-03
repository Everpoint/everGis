sGis.module('sp.services.DataSourceService', [
    'EventHandler',
    'sp.controllers.TempView',
    'sp.services.ServiceContainer'
], (EventHandler, TempView, ServiceContainer) => {

    'use strict';

    class DataSourceService extends EventHandler {
        constructor(name, connector, serviceInfo) {
            super();

            this._name = name;
            this._connector = connector;
            this._serviceInfo = serviceInfo;

            this._initialize();
        }

        _initialize() {
            this._tempViewController = new TempView(this._connector, this.name);
            this._tempViewController.resetView({ sourceServiceName: this._name }).then(() => {
                this._setForwardListeners();
                this.fire('stateUpdate');
            });
        }

        get initializationPromise() { return this._initializationPromise; }

        get name() { return this._name; }
        get alias() { return this.serviceInfo && this.serviceInfo.alias; }
        get description() { return this.serviceInfo && this.serviceInfo.description; }
        get view() { return this._tempViewController.service; }

        get isDisplayed() { return this.view && this.view.isDisplayed; }
        set isDisplayed(bool) { if (this.view) this.view.isDisplayed = bool; }

        _setForwardListeners() {
            this._tempViewController.service.on('visibilityChange legendUpdate layerChange', this.forwardEvent.bind(this));
        }

        get crs() { return this.view && this.view.crs; }
        get layer() { return this.view && this.view.layer; }
        get hasLegend() { return this.view && this.view.hasLegend; }
        updateLegend() { this.view && this.view.updateLegend(); }
        get attributesDefinition() { return this.view && this.view.attributesDefinition; }

        setMeta() { return this.view && this.view.setMeta.apply(this.view, arguments); }
        getMeta() { return this.view && this.view.getMeta.apply(this.view, arguments); }

        get geometryType() { return this.view && this.view.geometryType; }

        get fullExtent() { return this.view && this.view.fullExtent; }
        get initialExtent() { return this.view && this.view.initialExtent; }

        get serviceInfo() { return this._serviceInfo; }
        get isEditable() { return this.view.isEditable; }
        get isFilterable() { return this.view && this.view.isFilterable; }

        get filter() { return this.view && this.view.filter; }
        set filter(filter) { this.view.filter = filter; }

        setCustomFilter() { return this.view.setCustomFilter.apply(this.view, arguments); }

        updateExtent() { return this.view && this.view.updateExtent(); }

        get localName() { return this.view && this.view.name; }

        get permissions() { return this.serviceInfo.permissions; }
    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'DataSourceService', DataSourceService);

    return DataSourceService;

});