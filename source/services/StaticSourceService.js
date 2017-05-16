sGis.module('sp.services.StaticSourceService', [
    'sp.utils',
    'sp.services.ServiceContainer',
    'EventHandler'
], (utils, ServiceContainer, EventHandler) => {

    'use strict';

    class StaticSourceService extends EventHandler {
        constructor(name, connector, serviceInfo) {
            super();

            this._seviceInfo = serviceInfo;
            this._connector = connector;
            this._name = name;
            this._url = `${this._connector.url + this._name}/`;
        }

        get url(){
           return this._url
        }
    
        /**
         * Get url path to file by filename
         * @param {string} fileName
         * @return {string}
         */
        getSourceUrl(fileName) {
            if(!fileName){
                utils.error('Invalid parameters');
            }
            
            return `${this.url}/${fileName}?_sb=${this._connector.sessionId}`
        }

        upload(fileName, file){

            if(!fileName || !file){
                utils.error('Invalid parameters');
            }

            var data = new FormData();
            data.append('file', file);

            let self = this;
            return utils.ajaxp({

                url: `${this._url}upload?fileName=${fileName}${this._connector.sessionSuffix}`,
                type: 'POST',
                data: data,
                contentType: 'super-binary',
            }).then(response => {
                let respObject = JSON.parse(response[0]);
                if (respObject.success){
                    return `${ self._url}download/${fileName}${self._connector.sessionSuffix}`;
                } else if(respObject.error){
                    utils.error(respObject.error.message);
                } else {
                    utils.error(response[0]);
                }
            }).catch(error=>{
                utils.error(error)
            });
        }

        delete(fileName){

            if(!fileName){
               utils.error("File name not set");
            }

            return utils.ajaxp({url:`${this._url}delete?fileName=${fileName}${this._connector.sessionSuffix}`}).then(response=>{
                let respObject = JSON.parse(response[0]);
                if(respObject.success){
                    return respObject.success
                } else if(respObject.error){
                    utils.error(respObject.error.message);
                } else {
                    utils.error(response[0]);
                }
            }).catch(error=>{
                utils.error(error)
            });
        }

        describe({ fileName = null, startFrom = null, take = null, orderBy = null}){

            let params = Object.assign(arguments[0], {_sb: this._connector.sessionId});
            let paramsString = Object.keys(params).filter(key => params[key] !== null && params[key] !== undefined).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');

            return utils.ajaxp({

                 url:`${this._url}describe?${paramsString ? this._url + paramsString : this._url}`

                }).then(response => {
                        let respObject = JSON.parse(response[0]);

                        if(respObject.filesInfo){
                            return respObject.filesInfo;
                        } else if(respObject.error){
                            utils.error(respObject.error.message);
                        } else {
                            utils.error(response[0]);
                        }
                });
        }
    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType == 'StaticStorage', StaticSourceService);

    return StaticSourceService

})