import {ViewableController} from "./controllers/ViewableController";
import {LayerGroup} from "sgis/LayerGroup";
import {error} from "sgis/utils/utils";

let registry = {};

export class ControllerManager {
    private _controllers: any;
    private _connector: any;
    private _map: any;
    private _layerGroup: LayerGroup;

    constructor(connector, map) {
        this._controllers = {};
        this._connector = connector;
        this._map = map;

        this._layerGroup = new LayerGroup();
        this._map.addLayer(this._layerGroup);
    }

    static registerController(name, constructor) {
        if (registry[name]) error('Conflicting controller registration: ' + name);
        registry[name] = constructor;
    }

    getController(name) {
        if (!this._controllers[name]) this._controllers[name] = this.createController(name);
        return this._controllers[name];
    }

    createController(name) {
        if (!registry[name]) error('Unknown controller: ' + name);
        let controller = new registry[name](this._connector, {map: this._map});

        if (controller instanceof ViewableController) {
            controller.updateView().then(() => {
                this._layerGroup.addLayer(controller.service.layer);
            });
        }

        return controller;
    }
}
