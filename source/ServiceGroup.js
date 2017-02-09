sGis.module('spatialProcessor.ServiceGroup', [
    'utils',
    'LayerGroup',
    'EventHandler'
], (utils, LayerGroup, EventHandler) => {
    'use strict';

    class ServiceGroup extends EventHandler {
        constructor(name, options = {}) {
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
            container.on('visibilityChange', this._forwardEvent);
            container.on('stateUpdate', this._onStateUpdate);
        }

        _removeListeners(container) {
            container.off('visibilityChange', this._forwardEvent);
            container.off('stateUpdate', this._onStateUpdate);
        }

        _onStateUpdate(e) {
            this._updateChildLayers();
            this._forwardEvent(e);
        }

        removeService(container) {
            let index = this._children.indexOf(container);
            if (index === -1) utils.error('Service is not in the group.');

            this._children.splice(index, 1);
            this._updateChildLayers();
            this._removeListeners(container);
            this.fire('contentChange');
        }

        _updateChildLayers() {
            let layers = this._children.filter(container => container.service && container.service.layer).map(container => container.service.layer);
            layers.forEach((layer, index) => {
                if (this._layer.layers[index] !== layer) this._layer.insertLayer(layer, index);
            });

            while (this._layer.layers.length > layers.length) {
                this._layer.removeLayer(this._layer.layers[this._layer.layers.length-1]);
            }
        }

        getService(serviceName, recurse = true) {
            for (let i = 0; i < this._children.length; i++) {
                if (this._children[i].name === serviceName || this._children[i].localName === serviceName) return this._children[i];
                if (recurse && this._children.service && this._children.service.children) {
                    let found = this._children.service.getService(serviceName, true);
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

        getDisplayedSerivces(recurse) {
            return this.getServices(recurse).filter(s => s.layer && s.isDisplayed && !(s.layer instanceof LayerGroup));
        }
    }

    return ServiceGroup;

});