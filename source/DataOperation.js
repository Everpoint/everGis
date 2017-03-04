sGis.module('sp.DataOperation', [
    'sp.utils',
    'EventHandler'
], (utils, EventHandler) => {

    'use strict';

    class DataOperation {
        constructor(connector, controller, operationName, properties) {
            this._promise = new Promise((resolve, reject) => {
                controller.initializationPromise.then(() => {
                    let url  = `${connector.url}${controller.name}/${operationName}`;
                    let params = Object.assign({'_sb': connector.sid}, properties);
                    let paramsStrings = Object.keys(params).filter(key => params[key] !== null && params[key] !== undefined).map(key => {
                        let value = params[key] instanceof Object ? JSON.stringify(params[key]) : params[key];
                        if (typeof value === 'string') value = encodeURIComponent(value);
                        return `${key}=${value}`;
                    });

                    this.resolve = resolve;
                    this.reject = reject;

                    utils.ajaxp({
                        url,
                        type: 'POST',
                        data: paramsStrings.join('&')
                    }).then(data => {
                        let response = parseOperationResponse(data[0]);
                        if (!response || response.status !== 'success') reject(`Unexpected response from server for ${this._controller.name}/${this._operationName} operation`);
                        this.id = response.operationId;
                        connector.registerOperation(response.operationId, this._finalHandler.bind(this), this._progressHandler.bind(this));
                        this.fire('requested');
                    }).catch(response => {
                        reject(response);
                    });
                }).catch(() => {
                    reject(`Controller ${controller.type} failed to initialize. Operation ${operationName} is cancelled.`);
                });
            });

            this._controller = controller;
            this._operationName = operationName;
        }

        then(func) {
            return this._promise.then(func);
        }

        catch() {
            return this._promise.catch(func);
        }

        _finalHandler({ operation, content }) {
            if (operation.status === 'Success') {
                this.resolve(content);
            } else {
                this.reject(`Operation ${this._operationName} failed`);
            }
        }

        _progressHandler(data) {
            this.fire('progressUpdate', { progress: data.content });
        }
    }

    utils.mixin(DataOperation.prototype, EventHandler.prototype);

    function parseOperationResponse(data) {
        if (data.charAt(0) === '{') {
            return parseOperationError(data);
        } else {
            return parseOperationSuccess(data);
        }
    }

    function parseOperationError(data) {
        let response;
        try {
            response = JSON.parse(data);
        } catch (e) {
            response = data;
        } finally {
            response.status = 'error';
        }
        return response;
    }

    function parseOperationSuccess(data) {
        let parser = new DOMParser(),
            xml = parser.parseFromString(data, 'text/xml'),
            attributes = xml.getElementsByTagName('Defered')[0].attributes,
            initDataNode = xml.getElementsByTagName('InitializationData')[0],
            response = {
                status: 'success'
            };

        for (let i in attributes) {
            if (attributes[i].nodeName === 'Id') {
                response.operationId = attributes[i].nodeValue;
            } else if (attributes[i].nodeName === 'Name') {
                response.operationName = attributes[i].nodeValue;
            }
        }

        if (initDataNode) {
            response.initializationData = JSON.parse(initDataNode.childNodes[0].nodeValue);
        }

        return response;
    }

    return DataOperation;

});