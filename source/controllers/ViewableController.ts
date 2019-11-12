import {Controller} from "./Controller";
import {ServiceContainer} from "../services/ServiceContainer";

export class ViewableController extends Controller {
    private _service: any;

    constructor(type, connector, properties = null) {
        super(type, connector, properties);
        this.initializationPromise.then(this._checkInitialization.bind(this));
    }

    _checkInitialization() {
        if (!this.initData.DataViewServiceName) throw new Error(`Controller ${this.type} initialization failed: server did not return view name.`);
    }

    updateView() {
        return new Promise((resolve, reject) => {
            this.initializationPromise.then(() => {
                let viewName = this.initData.DataViewServiceName;
                let container = new ServiceContainer(this.connector, viewName, {});
                container.init();

                container.once('stateUpdate', () => {
                    if (container.service && container.service.layer) {
                        this._service = container.service;
                        resolve();
                    } else {
                        reject(`Controller ${this.type} update failed: failed to update view.`);
                    }
                });
            });
        });
    }

    get service() { return this._service; }
}
