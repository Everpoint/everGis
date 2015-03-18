'use strict';

(function() {

    /**
     * Provides methods for handling events.
     * @mixin
     */

    sGis.IEventHandler = {
        forwardEvent: function(sGisEvent) {
            if (this._prohibitedEvents && this._prohibitedEvents.indexOf(sGisEvent.eventType) !== -1) return;
            var eventType = sGisEvent.eventType;
            if (this._eventHandlers && this._eventHandlers[eventType]) {
                var handlerList = utils.copyArray(this._eventHandlers[eventType]); //This is needed in case one of the handlers is deleted in the process of handling
                for (var i = 0, len = handlerList.length; i < len; i++) {
                    if (handlerList[i].oneTime) {
                        var currentIndex = this._eventHandlers[eventType].indexOf(handlerList[i]);
                        this._eventHandlers[eventType].splice(currentIndex, 1);
                    }
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

            var types = getTypes(eventType);
            if (types.length !== 1) utils.error('Exactly on type of event can be fired at a time, but ' + types.length + ' is given');

            sGisEvent.sourceObject = this;
            sGisEvent.eventType = types[0];
            sGisEvent.stopPropagation = function() {sGisEvent._cancelPropagation = true;};
            sGisEvent.preventDefault = function() {sGisEvent._cancelDefault = true;};

            this.forwardEvent(sGisEvent);
        },

        addListener: function(type, handler) {
            if (!(handler instanceof Function)) utils.error('Function is expected but got ' + handler + ' instead');
            if (!utils.isString(type)) utils.error('String is expected but got ' + type + ' instead');

            var types = getTypes(type);
            if (types.length < 1) utils.error('No event type is specified');

            var namespaces = getNamespaces(type);

            if (!this._eventHandlers) this._eventHandlers = {};

            for (var i = 0; i < types.length; i++) {
                if (!this._eventHandlers[types[i]]) this._eventHandlers[types[i]] = [];
                this._eventHandlers[types[i]].push({handler: handler, namespaces: namespaces});
            }
        },

        once: function(type, handler) {
            if (!(handler instanceof Function)) utils.error('Function is expected but got ' + handler + ' instead');
            if (!utils.isString(type)) utils.error('String is expected but got ' + type + ' instead');

            var types = getTypes(type);
            if (types.length !== 1) utils.error('Only one event type can be specified with .once() method');
            var namespaces = getNamespaces(type);

            if (!this._eventHandlers) this._eventHandlers = [];
            if (!this._eventHandlers[types[0]]) this._eventHandlers[types[0]] = [];
            this._eventHandlers[types[0]].push({handler: handler, namespaces: namespaces, oneTime: true});
        },

        removeListener: function(type, handler) {
            if (!utils.isString(type)) utils.error('Expected the name of the event and handler function, but got (' + type + ', ' + handler + ') instead');

            var types = getTypes(type);
            var namespaces = getNamespaces(type);

            if (namespaces.length === 0) {
                if (types.length === 0) utils.error('At least one event type or namespace must be specified');
                if (!handler) utils.error('To remove all listeners of the given type use the .removeAllListeners() method');
            }

            if (!this._eventHandlers) return;
            if (types.length === 0) types = Object.keys(this._eventHandlers);

            for (var i = 0; i < types.length; i++) {
                if (this._eventHandlers[types[i]]) {
                    for (var j = this._eventHandlers[types[i]].length-1; j >=0; j--) {
                        if ((namespaces === null || namespaces.length === 0 || utils.arrayIntersect(this._eventHandlers[types[i]][j].namespaces, namespaces)) &&
                            (!handler || this._eventHandlers[types[i]][j].handler === handler)) {
                            this._eventHandlers[types[i]].splice(j, 1);
                        }
                    }
                }
            }
        },

        addListeners: function(handlers) {
            var types = Object.keys(handlers);
            for (var i = 0; i < types.length; i++) {
                this.addListener(types[i], handlers[types[i]]);
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

        hasListener: function(type, handler) {
            if (!utils.isString(type) || !utils.isFunction(handler)) utils.error('Expected the name of the event and handler function, but got (' + type + ', ' + handler + ') instead');

            if (this._eventHandlers && this._eventHandlers[type]) {
                for (var i = 0; i < this._eventHandlers[type].length; i++) {
                    if (this._eventHandlers[type][i].handler === handler) return true;
                }
            }

            return false;
        },

        hasListeners: function(description) {
            if (!utils.isString(description)) utils.error('Expected the name of the event, but got ' + description + ' instead');
            if (!this._eventHandlers) return false;

            var types = getTypes(description);
            var namespaces = getNamespaces(description);

            if (types.length === 0) types = Object.keys(this._eventHandlers);

            for (var i = 0; i < types.length; i++) {
                if (this._eventHandlers[types[i]] && this._eventHandlers[types[i]].length > 0) {
                    if (namespaces.length > 0) {
                        for (var j = 0; j < this._eventHandlers[types[i]].length; j++) {
                            if (utils.arrayIntersect(this._eventHandlers[types[i]][j].namespaces, namespaces)) {
                                return true;
                            }
                        }
                    } else {
                        return true;
                    }
                }
            }
            return false;
        },

        getHandlers: function(type) {
            if (!utils.isString(type)) utils.error('Expected the name of the event, but got ' + type + ' instead');
            if (this._eventHandlers && this._eventHandlers[type]) {
                return this._eventHandlers[type];
            }
            return [];
        }

    };

    /**
     * @alias sGis.IEventHandler.prototype.addListener
     */
    sGis.IEventHandler.on = sGis.IEventHandler.addListener;

    /**
     * @alias sGis.IEventHandler.prototype.removeListener
     */
    sGis.IEventHandler.off = sGis.IEventHandler.removeListener;


    // Deprecated names
    sGis.IEventHandler.addListner = sGis.IEventHandler.addListener;
    sGis.IEventHandler.addListners = sGis.IEventHandler.addListeners;
    sGis.IEventHandler.removeListner = sGis.IEventHandler.removeListener;
    sGis.IEventHandler.hasListner = sGis.IEventHandler.hasListener;
    sGis.IEventHandler.hasListners = sGis.IEventHandler.hasListeners;


    function getTypes(string) {
        var names = string.match(/\.[A-Za-z0-9_-]+|[A-Za-z0-9_-]+/g),
            types = [];
        for (var i = 0; i < names.length; i++) {
            if (names[i].charAt(0) !== '.') types.push(names[i]);
        }
        return types;
    }

    function getNamespaces(string) {
        return string.match(/\.[A-Za-z0-9_-]+/g) || [];
    }

})();