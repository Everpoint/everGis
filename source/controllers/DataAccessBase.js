sGis.module('sp.controllers.DataAccessBase', [
    'EventHandler',
    'sp.DataOperation',
    'sp.serializers.xmlSerializer'
], function(EventHandler, DataOperation, xmlSerializer) {
    'use strict';

    class DataAccessBase extends EventHandler {
        constructor(connector) {
            super();
            this._connector = connector;
        }

        get name() { return this._name; }
        get connector() { return this._connector; }

        init(initializationPromise) {
            this.initializationPromise = initializationPromise.then(name => this._name = name);
        }

        operation(operationName, params, expectsFeatures = false) {
            let operation = new DataOperation(this._connector, this, operationName, params);
            if (expectsFeatures) {
                return operation.internalThen(response => xmlSerializer.deserializeFeatures(response));
            }
            return operation;
        }
    }

    return DataAccessBase;

});