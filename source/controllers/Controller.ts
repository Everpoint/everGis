import {DataAccessBase} from "./DataAccessBase";
import {ajaxp} from "../utils";

export class Controller extends DataAccessBase {
    controllerServiceName = 'ControllerService';
    private _type: any;
    private _initData: any;
    private _id: any;

    constructor(type, connector, properties = {}) {
        super(connector);
        Object.assign(this, properties);

        this._type = type;
        this._initialize();
    }

    _initialize() {
        if (this.connector.sessionId) {
            this.init(this._createController());
            return;
        }

        this.init(new Promise((resolve, reject) => {
            this.connector.on('sessionInitialized', () => {
                this._createController().then(resolve).catch(reject);
            });
        }));
    }

    _createController() {
        return ajaxp({
            url: `${this._connector.url}${this.controllerServiceName}/?_sb=${this._connector.sessionId}`,
            type: 'POST',
            data: `create=${this._type}`
        }).then(([response, status, reject]) => {
            this._initData = JSON.parse(response);
            let ServiceId = this._initData.ServiceId;
            if (!ServiceId) throw new Error('Server did not return controller id');
            this._id = ServiceId;

            return this.name;
        })
    }

    get name() { return `${this.controllerServiceName}/${this._id}`; }
    get type() { return this._type; }
    get initData() { return this._initData; }

    remove() {
        Promise.reject(this.initializationPromise);
        if (!this._id) return;

        return ajaxp({
            url: `${this._connector.url}${this.controllerServiceName}/?_sb=${this._connector.sessionId}`,
            type: 'POST',
            data: `delete=${this._id}`
        });
    }
}
