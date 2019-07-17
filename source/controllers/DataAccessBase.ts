import {EventHandler} from "@evergis/sgis/es/EventHandler";
import {DataOperation} from "../DataOperation";
import {xmlSerializer} from "../serializers/xmlSerializer";

export class DataAccessBase extends EventHandler {
    _name: any;
    protected _connector: any;
    initializationPromise: any;

    constructor(connector) {
        super();
        this._connector = connector;
    }

    get name() { return this._name; }
    get connector() { return this._connector; }

    init(initializationPromise) {
        this.initializationPromise = initializationPromise.then(name => this._name = name);
    }

    operation(operationName, params, expectsFeatures = false) {
        let operation = new DataOperation(this._connector, this, operationName, params);
        if (expectsFeatures) {
            return operation.internalThen(response => xmlSerializer.deserializeFeatures(response));
        }
        return operation;
    }
}
