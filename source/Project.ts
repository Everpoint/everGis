import {error, getGuid} from "sgis/utils/utils";

export class Project {
    _context: {};
    _data: {};
    _api: any;
    _name: string;
    alias = null;
    description = null;

    private _isLoading: boolean;
    private _isLoaded: boolean;

    constructor(api) {
        this._name = getGuid();

        this._api = api;
        this._data = {};
        this._context = {};
        this._isLoading = false;
    }

    load(name) {
        this._isLoading = true;
        return this._api.operation('projects/load', { name: name })
            .then((response) => {
                this._isLoading = false;
                this._name = name;
                this.alias = response.alias;
                this.description = response.description;

                this._isLoaded = true;
                this._data = JSON.parse(response.data) || {};

                this.apply();
            })
            .catch(() => {
                this._isLoading = false;
            });
    }

    get isLoading() { return this._isLoading; }

    setContext(key, context) {
        if (this._context[key]) error('Context conflict: ' + key);
        this._context[key] = context;
    }

    apply() {
        Object.keys(dataRegister).forEach(this.applyKey, this);
    }

    applyKey(key) {
        if (dataRegister[key]) dataRegister[key].apply(this._data[key], this._context);
    }

    getStoredValue(key) {
        return this._data[key];
    }

    update() {
        this._data = {};
        Object.keys(dataRegister).forEach(key => {
            this._data[key] = dataRegister[key].update(this._context);
        });
    }

    save(isShared) {
        let operation = this._isLoaded ? 'projects/update' : 'projects/create';
        return this._api.operation(operation, {
            name: this.name,
            alias: this.alias,
            description: this.description,
            isShared: !!isShared
        }, JSON.stringify(this._data));
    }

    get name() { return this._name; }

    static registerCustomDataItem(key, updateHandler, applyHandler) {
        if (dataRegister[key]) error('Custom data key conflict: ' + key);
        dataRegister[key] = { update: updateHandler, apply: applyHandler };
    }
}

const dataRegister = {};
