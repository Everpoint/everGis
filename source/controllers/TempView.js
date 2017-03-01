sGis.module('sp.controllers.TempView', [
    'sp.controllers.ViewableController',
    'sp.ControllerManager',
    'sp.services.ServiceContainer'
], function(ViewableController, ControllerManager, ServiceContainer) {
    'use strict';

    class TempView extends ViewableController {
        constructor(connector, localName) {
            super('tempView', connector);
            this._localName = localName;
        }

        resetView(properties) {
            let { sourceServiceName } = properties;
            return this.operation('resetView', { sourceServiceName }).then(this.updateView.bind(this));
        }
    }

    ControllerManager.registerController('tempView', TempView);

    return TempView;

});
