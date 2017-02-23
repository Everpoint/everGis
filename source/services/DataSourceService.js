sGis.module('sp.services.DataSourceService', [
    'EventHandler',
    'sp.controller.TempView',
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
            this._initializationPromise = new Promise((resolve, reject) => {
                this._tempViewController = new TempView(this._connector, this.name);
                this._tempViewController.resetView({
                    sourceServiceName: this._name,
                    success: () => {
                        this._setForwardListeners();
                        resolve();
                    },
                    error: (error) => {
                        reject(error);
                    }
                });

                this._tempViewController.on('viewUpdate', () => {
                    resolve();
                });

                this._tempViewController.on('initError', () => {
                    reject('TempView controller initialization failed.');
                });
            });
        }

        get initializationPromise() { return this._initializationPromise; }

        get name() { return this._name; }
        get alias() { return this.serviceInfo && this.serviceInfo.alias; }
        get description() { return this.serviceInfo && this.serviceInfo.description; }
        get view() { return this._tempViewController.mapService; }
        get viewContainer() { return this._tempViewController.container; }

        get isDisplayed() { return this.view && this.view.isDisplayed; }
        set isDisplayed(bool) { if (this.view) this.view.isDisplayed = bool; }

        _setForwardListeners() {
            this._tempViewController.mapService.on('visibilityChange legendUpdate', this.forwardEvent.bind(this));
        }

        get crs() { return this.view && this.view.crs; }
        get layer() { return this.view && this.view.layer; }
        get hasLegend() { return this.view && this.view.hasLegend; }
        updateLegend() { this.view && this.view.updateLegend(); }
        get attributesDefinition() { return this.view && this.view.attributesDefinition; }

        setMeta() { return this.view && this.view.setMeta.apply(this.view, arguments); }
        getMeta() { return this.view && this.view.getMeta.apply(this.view, arguments); }

        get geometryType() { return this.view && this.view.geometryType; }
        get permissions() { return this.view && this.view.permissions; }

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