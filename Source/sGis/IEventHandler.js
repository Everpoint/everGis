'use strict';

(function() {

    sGis.IEventHandler = function() {};

    /**
     * Provides methods for handling events.
     * @mixin
     */

    sGis.IEventHandler.prototype = {
        forwardEvent: function(sGisEvent) {
            if (this._prohibitedEvents && this._prohibitedEvents.indexOf(sGisEvent.eventType) !== -1) return;
            var eventType = sGisEvent.eventType;
            if (this._eventHandlers && this._eventHandlers[eventType]) {
                var handlerList = utils.copyArray(this._eventHandlers[eventType]); //This is needed in case one of the handlers is deleted in the process of handling
                for (var i = 0, len = handlerList.length; i < len; i++) {
                    handlerList[i].handler.call(this, sGisEvent);
                    if (sGisEvent._cancelPropagation) break;
                }
            }

            if (sGisEvent._cancelDefault) {
                if (sGisEvent.browserEvent) {
                    sGisEvent.browserEvent.preventDefault();
                }
                return;
            }

            if (this._defaultHandlers && this._defaultHandlers[eventType] !== undefined) {
                this._defaultHandlers[eventType].call(this, sGisEvent);
            }
        },

        fire: function(eventType, parameters) {
            if (this._prohibitedEvents && this._prohibitedEvents.indexOf(eventType) !== -1) return;

            var sGisEvent = {};
            if (parameters) utils.mixin(sGisEvent, parameters);

            sGisEvent.sourceObject = this;
            sGisEvent.eventType = eventType;
            sGisEvent.stopPropagation = function() {sGisEvent._cancelPropagation = true;};
            sGisEvent.preventDefault = function() {sGisEvent._cancelDefault = true;};

            this.forwardEvent(sGisEvent);
        },

        addListner: function(type, handler) {
            if (!(handler instanceof Function)) utils.error('Function is expected but got ' + handler + ' instead');
            if (!utils.isString(type)) utils.error('String is expected but got ' + type + ' instead');

            var types = getTypes(type),
                namespaces = getNamespaces(type);

            if (!this._eventHandlers) this._eventHandlers = {};

            for (var i in types) {
                if (!this._eventHandlers[types[i]]) this._eventHandlers[types[i]] = [];
                if (this.hasListner(types[i], handler)) {
                    this._eventHandlers[types[i]].namespaces = utils.merge(this._eventHandlers[types[i]].namespaces, namespaces);
                } else {
                    this._eventHandlers[types[i]].push({handler: handler, namespaces: namespaces});
                }
            }
        },

        removeListner: function(type, handler) {
            if (!this._eventHandlers) return;

            var types = getTypes(type),
                namespaces = getNamespaces(type);

            if (types.length === 0) {
                for (var i in this._eventHandlers) {
                    types.push(i);
                }
            }

            for (var i in types) {
                if (this._eventHandlers[types[i]]) {
                    for (var j = this._eventHandlers[types[i]].length-1; j >=0; j--) {
                        if ((namespaces === null || namespaces.length === 0 || namespacesIntersect(this._eventHandlers[types[i]][j].namespaces, namespaces)) &&
                            (!handler || this._eventHandlers[types[i]][j].handler === handler)) {
                            this._eventHandlers[types[i]].splice(j, 1);
                        }
                    }
                }
            }
        },

        addListners: function(handlers) {
            for (var type in handlers) {
                this.addListner(type, handlers[type]);
            }
        },

        prohibitEvent: function(type) {
            if (!this._prohibitedEvents) this._prohibitedEvents = [];
            this._prohibitedEvents.push(type);
        },

        allowEvent: function(type) {
            if (!this._prohibitedEvents) return;
            var index = this._prohibitedEvents.indexOf(type);
            if (index !== -1) this._prohibitedEvents.splice(index, 1);
        },

        hasListner: function(type, handler) {
            if (!utils.isString(type) || !utils.isFunction(handler)) utils.error('Expected the name of the event and handler function, but got (' + type + ', ' + handler + ') instead');

            if (this._eventHandlers && this._eventHandlers[type]) {
                for (var i in this._eventHandlers[type]) {
                    if (this._eventHandlers[type][i].handler === handler) return true;
                }
            }

            return false;
        },

        hasListners: function(type) {
            if (!utils.isString(type)) utils.error('Expected the name of the event, but got ' + type + ' instead');
            return this._eventHandlers && this._eventHandlers[type] && this._eventHandlers[type].length > 0;
        },

        getHandlers: function(type) {
            if (!utils.isString(type)) utils.error('Expected the name of the event, but got ' + type + ' instead');
            if (this._eventHandlers && this._eventHandlers[type]) {
                return this._eventHandlers[type];
            }
            return [];
        }

    };

    function getTypes(string) {
        var names = string.match(/\.[A-Za-z0-9_-]+|[A-Za-z0-9_-]+/g),
            types = [];
        for (var i in names) {
            if (names[i].charAt(0) !== '.') types.push(names[i]);
        }
        return types;
    }

    function getNamespaces(string) {
        return string.match(/\.[A-Za-z0-9_-]+/g) || [];
    }

    function namespacesIntersect(namespaces1, namespaces2) {
        for (var i in namespaces1) {
            if (namespaces2.indexOf(namespaces1[i]) !== -1) return true;
        }
        return false;
    }

})();