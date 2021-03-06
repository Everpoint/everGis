import {EventHandler} from "@evergis/sgis/EventHandler";
import {Api} from "./Api";
import {ajax, message} from "./utils";
import {error} from "@evergis/sgis/utils/utils";
import {xmlSerializer} from "./serializers/xmlSerializer";

export interface Credentials {
    login?: string;
    password?: string;
    sessionId?: string;
}

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
    initializationPromise: Promise<string>;
    _sessionId: string;
    private _latestOperationNotification: any;
    private _login: any;

    constructor(url, authServiceUrl, credentials?: Credentials) {
        super();

        this._url = url;
        this.apiLoginUrl = authServiceUrl;

        this._notificationListners = {};
        this._objectSelectorListeners = [];
        this._operationList = {};
        // this._rootMapItem = rootMapItem;
        this._failedNotificationRequests = 0;

        if (credentials) {
          this.initializeSession(credentials);
        }

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

    initializeSession({login, password, sessionId}: Credentials) {
        this.initializationPromise = new Promise((resolve, reject) => {
            var self = this;
            if (login && password) {
                let url = this.apiLoginUrl.replace('{login}', login).replace('{password}', password) + '&format=json&ts=' + Date.now();

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

        return this.initializationPromise;
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
    var print = (<any>window).print;
    (<any>window).print = function() {
        connector.cancelNotificationRequest();
        print();
        connector.requestNotifications();
    };
}
