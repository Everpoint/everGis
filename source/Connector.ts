import {EventHandler} from "sgis/dist/EventHandler";
import {Api} from "./Api";
import {ajax, message} from "./utils";
import {error} from "sgis/dist/utils/utils";
import {xmlSerializer} from "./serializers/xmlSerializer";

export class Connector extends EventHandler {
    api: Api;
    _notificationRequestObject: any;
    _failedNotificationRequests: number;
    _url: any;

    private _notificationListners: any;
    private _objectSelectorListeners: any;
    private _operationList: any;

    apiLoginUrl: string;
    _aborted: any;
    private initializationPromise: Promise<any>;
    _sessionId: string;
    private _latestOperationNotification: any;
    private _login: any;

    constructor(url, authServiceUrl, {login, password, sessionId}: any) {
        super();

        this._url = url;
        this.apiLoginUrl = authServiceUrl;

        this._notificationListners = {};
        this._objectSelectorListeners = [];
        this._operationList = {};
        // this._rootMapItem = rootMapItem;
        this._failedNotificationRequests = 0;

        this.initializeSession({login, password, sessionId});

        this.api = new Api(this);
    }

    addNotificationListner(tag, string, callback) {
        if (!this._notificationListners[tag]) this._notificationListners[tag] = {};
        this._notificationListners[tag][string] = callback;
    }

    removeNotificationListner(tag, string) {
        if (this._notificationListners[tag] && this._notificationListners[tag][string]) delete this._notificationListners[string];
    };

    addObjectSelectorListener(f) {
        this._objectSelectorListeners.push(f);
    }

    removeObjectSelectorListener(f) {
        var index = this._objectSelectorListeners.indexOf(f);
        if (index !== -1) this._objectSelectorListeners.splice(index, 1);
    }

    initializeSession({login, password, sessionId}) {
        this.initializationPromise = new Promise((resolve, reject) => {
            var self = this;
            if (login && password) {
                var spUrl = this._url.substr(-4, 4) === 'IIS/' ? this._url.substr(0, this._url.length - 4) : this._url,
                    url = this.apiLoginUrl.replace(/%sp%/, spUrl) + '?userName=' + login + '&password=' + encodeURIComponent(password) + '&ts=' + new Date().getTime();
                ajax({
                    url: url,
                    success: function (data, textStatus) {
                        if (data === '') {
                            message('Could not get session ID');
                        } else {
                            var response = JSON.parse(data);

                            if (response.Success && response.Message) {
                                initialize(response.Message);

                                self.fire('sessionInitialized');
                            } else {
                                reject('Could not get session. Server responded with: ' + data);
                                error('Could not get session. Server responded with: ' + data);
                            }
                        }
                    },

                    error: function () {
                        message('Could not get session ID');
                        reject('Could not get session ID');
                    }
                });
            } else {
                initialize(sessionId);
            }

            function initialize(id) {
                self._sessionId = encodeURIComponent(id);

                if (id) self.requestNotifications();

                escapePrintMethod(self);
                resolve(id);
            }
        });
    }

    requestNotifications() {
        this._aborted = false;
        var self = this,
            xhr = ajax({
                url: self._url + 'ClientNotification/?f=json&_sb=' + self._sessionId + '&ts=' + new Date().getTime(),
                success: function (stringData, textStatus) {
                    try {
                        var data = JSON.parse(stringData);
                    } catch (e) {
                        self.connectionLostError();
                        return;
                    }
                    if (data && data.Notifications) {
                        for (var i in data.Notifications) {
                            if (notificationProcessors[data.Notifications[i].tag]) {
                                notificationProcessors[data.Notifications[i].tag](self, data.Notifications[i].data, data.Notifications[i].type);
                            } else {
                                message(data.Notifications[i].tag);
                            }
                        }
                        // if (self._synchronized !== false) {
                        self.requestNotifications();
                        // } else {
                        //     self.addListener('synchronize.self', function() {self.removeListener('.self'); self.requestNotifications();});
                        // }

                        self._failedNotificationRequests = 0;
                    } else {
                        self.connectionLostError();
                    }
                },
                error: function (stringData, textStatus) {
                    if (self._aborted) return;
                    self._failedNotificationRequests += 1;
                    if (self._failedNotificationRequests > 5) {
                        self.connectionLostError();
                    } else {
                        setTimeout(self.requestNotifications.bind(self), self._failedNotificationRequests * 1000);
                    }
                }
            });
        this._notificationRequestObject = xhr;
    }

    connectionLostError() {
        this.fire('connectionLost');
        error('The connection to the server is lost');
    }

    cancelNotificationRequest() {
        this._aborted = true;
        if (this._notificationRequestObject) this._notificationRequestObject.abort();
    }

    registerOperation(operationId, callback, progressCallback) {
        if (this._latestOperationNotification && (this._latestOperationNotification.operation.id === operationId)) {
            callback(this._latestOperationNotification);
            this._latestOperationNotification = null;
        } else {
            this._operationList[operationId] = {finalCallback: callback, progressCallback: progressCallback};
        }
    }

    get sid() {
        return decodeURIComponent(this.sessionId);
    }

    get sessionId() {
        return this._sessionId;
    }

    get sessionSuffix() {
        return this._sessionId ? '&_sb=' + this._sessionId : '';
    }

    get url() {
        return this._url;
    }

    get synchronized() {
        return true;
    }

    get login() {
        return this._login;
    }
}
let notificationProcessors = {
    'dynamic layer': function(connector, data, type) {
        if (connector._notificationListners['dynamic layer'] && connector._notificationListners['dynamic layer'][data]) {
            connector._notificationListners['dynamic layer'][data]();
        }
    },

    'DAS': function(connector, data, type) {
        var response = xmlSerializer.deserialize(data);
        if (connector._operationList[response.operation.id]) {
            if ( response.operation.status === 'Running') {
                if (connector._operationList[response.operation.id].progressCallback) connector._operationList[response.operation.id].progressCallback(response);
            } else {
                connector._operationList[response.operation.id].finalCallback(response);
                delete connector._operationList[response.operation.id];
            }
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
        if (connector._notificationListners['symbols'] && connector._notificationListners['symbols'][data]) {
            connector._notificationListners['symbols'][data]();
        }
    }
};

function escapePrintMethod(connector) {
    var print = window.print;
    window.print = function() {
        connector.cancelNotificationRequest();
        print();
        connector.requestNotifications();
    };
}
