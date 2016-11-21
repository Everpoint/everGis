sGis.module('spatialProcessor.ServiceGroup', [
    'utils',
    'spatialProcessor.utils'
], (utils) => {
    'use strict';

    class ServiceGroup {
        constructor(serviceInfo) {
            this._serviceInfo = serviceInfo;
        }

        static initialize(connector, name) {
            let url = connector.url + name + '/?_sb=' + connector.sessionId;
            return utils.ajaxp({url: url})
                .then(([response]) => {
                    try {
                        var serviceInfo = utils.parseJSON(response);
                    } catch (e) {
                        throw new Error('Failed to initialize service group ' + name);
                    }

                    if (serviceInfo.error) throw new Error(serviceInfo.error);
                    if (serviceInfo.serviceType !== "LayerGroup") throw new Error('Invalid service type: ' + serviceInfo.serviceType);

                    return new ServiceGroup(serviceInfo);
                });

        }

        get childrenNames() { return this._serviceInfo.contents; }
    }

    return ServiceGroup;

});