import {ControllerManager} from "../ControllerManager";
import {Controller} from "./Controller";
import {DataOperation} from "../DataOperation";

export class ImportData extends Controller {
    constructor(connector, properties) {
        super('importData', connector, properties);
    }

    load(properties) {
        let { fileId, configuration } = properties;
        return this.operation('load', { uploadSlot: fileId, configuration });
    }

    import(properties) {
        let { serviceName, attributeMapping, configuration } = properties;
        return this.operation('import', {serviceName, attributeMapping, configuration});
    }
}

ControllerManager.registerController('importData', ImportData);
