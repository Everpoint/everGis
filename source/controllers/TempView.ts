import {ViewableController} from "./ViewableController";

export class TempView extends ViewableController {
    private _localName: any;

    constructor(connector, localName) {
        super('tempView', connector);
        this._localName = localName;
    }

    resetView(properties) {
        let { sourceServiceName } = properties;
        return this.operation('resetView', { sourceServiceName }).then(this.updateView.bind(this));
    }
}

ControllerManager.registerController('tempView', TempView);
