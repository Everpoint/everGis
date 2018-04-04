import {EventHandler} from "sgis/EventHandler";
import {LayerGroup} from "sgis/LayerGroup";
import {error} from "sgis/utils/utils";

export class ServiceGroup extends EventHandler {
    private _name: any;
    private _children: any;
    private alias: any;
    private _isDisplayed: boolean;
    private _layer: LayerGroup;
    private _forwardEvent: any;

    constructor(name, options: any = {}) {
        super();
        this._name = name;
        this._children = options.children || [];

        this.alias = options.alias;

        this._isDisplayed = true;
        this._layer = new LayerGroup();

        this._forwardEvent = this.forwardEvent.bind(this);
        this._onStateUpdate = this._onStateUpdate.bind(this);

        this._children.forEach(container => this._setListeners(container));
    }

    get name() { return this._name}
    get layer() { return this._layer; }

    get children() { return this._children; }

    get isDisplayed() { return this._layer.isDisplayed; }
    set isDisplayed(bool) {
        if (this._layer.isDisplayed !== bool) {
            this._layer.isDisplayed = bool;
            this.fire('visibilityChange');
        }
    }

    insertService(container, index = -1) {
        if (index < 0 || index > this._children.length) index = this._children.length;

        let currIndex = this._children.indexOf(container);
        if (currIndex >= 0) {
            if (currIndex === index || currIndex + 1 === index) return;
            this._children.splice(currIndex, 1);
            if (index > currIndex) index--;
        }

        this._children.splice(index, 0, container);
        this._updateChildLayers();

        if (currIndex === -1) this._setListeners(container);
        this.fire('contentChange');
    }

    _setListeners(container) {
        container.on('stateUpdate contentChange', this._onStateUpdate);
    }

    _removeListeners(container) {
        container.off('stateUpdate contentChange', this._onStateUpdate);
    }

    _onStateUpdate(e) {
        this._updateChildLayers();
        this._forwardEvent(e);
    }

    removeService(container) {
        let index = this._children.indexOf(container);
        if (index === -1) error('Service is not in the group.');

        this._children.splice(index, 1);
        this._updateChildLayers();
        this._removeListeners(container);
        this.fire('contentChange', {deleted: container});
    }

    _updateChildLayers() {
        let layers = this._children
            .filter(container => container.service && container.service.layer)
            .map(container => container.service.layer);

        layers.forEach((layer, index) => {
            if (this._layer.layers[index] !== layer) this._layer.insertLayer(layer, index);
        });

        while (this._layer.layers.length > layers.length) {
            this._layer.removeLayer(this._layer.layers[this._layer.layers.length-1]);
        }
    }

    getService(serviceName, recurse = true) {
        let container = this.getServiceContainer(serviceName, recurse);
        return container && container.service || null;
    }

    getServiceContainer(serviceName, recurse = true) {
        if (!serviceName) return null;

        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].name === serviceName || this._children[i].localName === serviceName) return this._children[i];
            if (recurse && this._children[i].service && this._children[i].service.children) {
                let found = this._children[i].service.getServiceContainer(serviceName, true);
                if (found) return found;
            }
        }

        return null;
    }

    getServices(recurse) {
        let children = [];

        this._children.forEach(c => {
            if (!c.service) return;
            children.push(c.service);
            if (recurse && c.service.getServices) children = children.concat(c.service.getServices(true));
        });

        return children;
    }

    getDisplayedServices(recurse = true) {
        let children = [];

        if (this.isDisplayed) {
            this._children.forEach(c => {
                if (!c.service || !c.service.isDisplayed) return;

                if (recurse && c.service.getServices) {
                    children = children.concat(c.service.getDisplayedServices(true));
                } else {
                    children.push(c.service);
                }
            });
        }

        return children;
    }

    contains(container, recurse = true) {
        let isContain = false;
        this._children.forEach(child => {
            if (child === container ||
                (recurse && child.service && child.service.children && child.service.contains(container))
            ) {
                isContain = true;
            }
        });

        return isContain;
    }

    getParent(container) {
        if (this._children.includes(container)) return this;
        let groups = this.children.filter(x => x.service && x.service instanceof ServiceGroup);
        for (let i = 0; i < groups.length; i++) {
            let parent = groups[i].service.getParent(container);
            if (parent) return parent;
        }
        return null;
    }
}
