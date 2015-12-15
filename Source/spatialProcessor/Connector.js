'use strict';

(function() {
    sGis.spatialProcessor = {};

    sGis.spatialProcessor.Connector = function(url, rootMapItem, login, password) {
        if (!utils.isString(url) || !utils.isString(login) || !(rootMapItem instanceof sGis.MapItem)) utils.error('Incorrect parameters for Spatial Processor initialization');

        this._url = url;
        this._notificationListners = {};
        this._objectSelectorListeners = [];
        this._operationList = {};
        this._rootMapItem = rootMapItem;
        this._failedNotificationRequests = 0;

        this.initializeSession(login, password);
    };

    sGis.spatialProcessor.Connector.prototype = {
        _synchronizationTimer: null,

        apiLoginUrl: '%sp%Strategis.JsClient/ApiLogin.aspx',

        addNotificationListner: function(tag, string, callback) {
            if (!this._notificationListners[tag]) this._notificationListners[tag] = {};
            this._notificationListners[tag][string] = callback;
        },

        removeNotificationListner: function(tag, string) {
            if (this._notificationListners[tag] && this._notificationListners[tag][string]) delete this._notificationListners[string];
        },

        addObjectSelectorListener: function(f) {
            this._objectSelectorListeners.push(f);
        },

        removeObjectSelectorListener: function(f) {
            var index = this._objectSelectorListeners.indexOf(f);
            if (index !== -1) this._objectSelectorListeners.splice(index, 1);
        },

        initializeSession: function(login, password) {
            var self = this;
            if (password) {
                var spUrl = this._url.substr(-4, 4) === 'IIS/' ? this._url.substr(0, this._url.length - 4) : this._url,
                    url = this.apiLoginUrl.replace(/%sp%/, spUrl) + '?authId=855102B4-0CF7-4F59-A4AF-29C4AEE1A537&userName=' + login + '&password=' + encodeURIComponent(password) + '&ts=' + new Date().getTime();
                utils.ajax({
                    url: url,
                    success: function(data, textStatus) {
                        if (data === '') {
                            utils.message('Could not get session ID');
                        } else {
                            var id = JSON.parse(data).token;

                            if (utils.isString(id)) {
                                initialize(id);

                                self.fire('sessionInitialized');
                            } else {
                                utils.error('Could not get session. Server responded with: ' + data);
                            }
                        }
                    },

                    error: function() {
                        utils.message('Could not get session ID');
                    }
                });
            } else {
                initialize(login);
            }

            function initialize(id) {
                setListners(self, self._rootMapItem);
                self._sessionId = encodeURIComponent(id);
                self.synchronize();
                self.requestNotifications();

                escapePrintMethod(self);
            }
        },

        synchronize: function() {
            var self = this;
            this._synchronized = false;
            if (this._synchronizationTimer === undefined) {

                var mapItems = this._rootMapItem.getChildren(true),
                    structure = {Structure: []};

                for (var i in mapItems) {
                    structure.Structure.push(getMapItemDescription(mapItems[i], false));
                }

                structure.Structure.push(getMapItemDescription(this._rootMapItem, true));

                var self = this,
                    data = 'f=json&data=' + encodeURIComponent(JSON.stringify(structure));


                utils.ajax({
                    type: 'POST',
                    url: this._url + 'MapItemStates/?_sb=' + this._sessionId,
                    data: data,
                    success: function(data) {
                        if (data !== 'true') {
                            self._synchronized = false;
                        } else {
                            if (!self._synchronizationTimer) {
                                self._synchronized = true;
                                self.fire('synchronize');
                            }
                        }
                    },
                    error: function() {
                        debugger;
                    }
                });
                this._synchronizationTimer = null;
            } else if (this._synchronizationTimer === null) {
                this._synchronizationTimer = setTimeout(function() {
                    self._synchronizationTimer = undefined;
                    self.synchronize();
                }, 500);
            }
        },

        requestNotifications: function() {
            this._aborted = false;
            var self = this,
                xhr = utils.ajax({
                    url: self._url + 'ClientNotification/?f=json&_sb=' + self._sessionId + '&ts=' + new Date().getTime(),
                    success: function(stringData, textStatus) {
                        try {
                            var data = JSON.parse(stringData);
                        } catch (e) {
                            utils.message('Connection to the server is lost...');
                            return;
                        }
                        if (data && data.Notifications) {
                            for (var i in data.Notifications) {
                                if (sGis.spatialProcessor.processNotification[data.Notifications[i].tag]) {
                                    sGis.spatialProcessor.processNotification[data.Notifications[i].tag](self, data.Notifications[i].data, data.Notifications[i].type);
                                } else {
                                    utils.message(data.Notifications[i].tag);
                                }
                            }
                            if (self._synchronized !== false) {
                                self.requestNotifications();
                            } else {
                                self.addListener('synchronize.self', function() {self.removeListener('.self'); self.requestNotifications();});
                            }

                            self._failedNotificationRequests = 0;
                        } else {
                            utils.error('Unexpected notification response from the server: ' + stringData);
                        }
                    },
                    error: function(stringData, textStatus) {
                        if (self._aborted) return;
                        self._failedNotificationRequests += 1;
                        if (self._failedNotificationRequests > 5) {
                            sGis.utils.error('The connection to the server is lost');
                        } else {
                            setTimeout(self.requestNotifications.bind(self), self._failedNotificationRequests * 1000);
                        }
                    }
                });
            this._notificationRequestObject = xhr;
        },

        cancelNotificationRequest: function() {
            this._aborted = true;
            if (this._notificationRequestObject) this._notificationRequestObject.abort();
        },

        getMapItemById: function(id) {
            var mapItems = this._rootMapItem.getChildren(true);
            for (var i in mapItems) {
                if (mapItems[i].id === id) {
                    return mapItems[i];
                }
            }
        },

        registerOperation: function(operationId, callback) {
            if (this._latestOperationNotification && (this._latestOperationNotification.operation.id === operationId)) {
                callback(this._latestOperationNotification);
                this._latestOperationNotification = null;
            } else {
                this._operationList[operationId] = callback;
            }
        },

        getServiceList: function(callback) {
            utils.ajax({
                url: this._url + '?f=json&_sb=' + this._sessionId,
                success: function(data) {
                    try {
                        var response = JSON.parse(data);
                    } catch(e) {
                        response = data;
                    }
                    callback(response);
                },
                error: function(data) {
                    callback(data);
                }
            });
        }
    };

    Object.defineProperties(sGis.spatialProcessor.Connector.prototype, {
        sessionId: {
            get: function() {
                return this._sessionId;
            }
        },

        url: {
            get: function() {
                return this._url;
            }
        },

        synchronized: {
            get: function() {
                return this._synchronized;
            }
        },

        login: {
            get: function() {
                return this._login;
            }
        }
    });

    sGis.utils.proto.setMethods(sGis.spatialProcessor.Connector.prototype, sGis.IEventHandler);

    sGis.spatialProcessor.processNotification = {
        'dynamic layer': function(connector, data, type) {
            if (connector._notificationListners['dynamic layer'][data]) {
                connector._notificationListners['dynamic layer'][data]();
            }
        },

        'DAS': function(connector, data, type) {
            var response = sGis.spatialProcessor.parseXML(data);
            if (connector._operationList[response.operation.id]) {
                connector._operationList[response.operation.id](response);
                delete connector._operationList[response.operation.id];
            } else {
                connector._latestOperationNotification = response;
            }
        },

        'trolling': function(connector, data, type) {
            for (var i = 0; i < connector._objectSelectorListeners.length; i++) {
                connector._objectSelectorListeners[i](data);
            }
        },

        'symbols': function(connector, data, type) {
            if (connector._notificationListners['symbols'][data]) {
                connector._notificationListners['symbols'][data]();
            }
        }
    };

    function setListners(connector, mapItem) {
        var handler = function() { connector.synchronize(); };
        var childAddHandler = function(sGisEvent) {
            setListners(connector, sGisEvent.child);
            connector.synchronize();
        };
        var childRemoveHandler = function(sGisEvent) {
            sGisEvent.child.removeListener('.sGis-connector');
            connector.synchronize();
        };

        if (!mapItem.hasListener('addChild', childAddHandler)) {
            mapItem.addListeners({
                'addChild.sGis-connector': childAddHandler,
                'removeChild.sGis-connector': childRemoveHandler,
                'propertyChange.sGis-connector': handler,
                'childOrderChange.sGis-connector': handler,
                'serviceInfoUpate.sGis-connector': handler,
                'activate.sGis-connector': handler,
                'deactivate.sGis-connector': handler
            });
        }

        var children = mapItem.children;
        if (children) {
            for (var i = 0, len = children.length; i < len; i++) {
                setListners(connector, children[i]);
            }
        }
    }

    function getMapItemDescription(mapItem, isRoot) {
        var description = {
            Id: mapItem.id,
            IsVisible: mapItem.isActive,
            Name: mapItem.name,
            IsRoot: isRoot,
            Operations: mapItem.serverOperations,
            Children: []
        };
        //TODO: mapItem does not have opacity any more
        if (mapItem.getOpacity) {
            description.Opacity = mapItem.getOpacity();
        } else {
            description.Opacity = 1.0;
        }

        if (mapItem.getChildren) {
            var children = mapItem.getChildren();
            if (utils.isArray(children)) {
                for (var i in children) {
                    description.Children.push(children[i].id);
                }
            }
        }

        return description;
    }

    function escapePrintMethod(connector) {
        var print = window.print;
        window.print = function() {
            connector.cancelNotificationRequest();
            print();
            connector.requestNotifications();
        };
    }

})();