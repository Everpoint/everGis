sGis.module('sp.ControllerManager', [
    'utils'
], (utils) => {
    
    let registry = {};
    
    class ControllerManager {
        constructor(connector, map) {
            this._controllers = {};
            this._connector = connector;
            this._map = map;
        }
        
        static registerController(name, constructor) {
            if (registry[name]) utils.error('Conflicting controller registration: ' + name);
            registry[name] = constructor;
        }
        
        getController(name) {
            if (!this._controllers[name]) this._controllers[name] = this.createController(name);
            return this._controllers[name];
        }
        
        createController(name) {
            if (!registry[name]) utils.error('Unknown controller: ' + name);
            return new registry[name](this._connector, {map: this._map});
        }
    }
    
    return ControllerManager;
    
});