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
        }

        _getSessionTokenIfExists(){
            return (this._connector.sessionId ? '?_sb=' + this._connector.sessionId : '');
        }

        url(){
           return  this._connector.url + this._name + '/'
        }

        upload(fileName, file){

            var data = new FormData();
            data.append('file', file);

            if(!fileName || !file){
                utils.error('Invalid parameters');
            }

            let self = this;

            return utils.ajaxp({

                url: this.url() + 'upload' + this._getSessionTokenIfExists() +  '&fileName=' + fileName,
                type: 'POST',
                data: data,
                processData: false,
                contentType: 'super-binary',
                dataType : 'json'

            }).then(response => {
                let respObject = JSON.parse(response[0]);
                if (respObject.success){
                    return self.url() + 'download/' + fileName + self._getSessionTokenIfExists();
                } else if(respObject.error){
                    utils.error(String.raw(respObject.error.message));
                } else {
                    utils.error("Unknown error")
                }
            }).catch(error=>{
                utils.error(error)
            });
        }


        delete(fileName){
            if(fileName){
                utils.ajax({url: this.url() + "delete" + this._getSessionTokenIfExists() +  '&fileName=' + fileName});
            }
        }

        describe(searchPattern, startFrom, take, orderBy){
             return utils.ajaxp({

                 url: this.url() + "describe" + this._getSessionTokenIfExists() + this.__hasSearchPattern(searchPattern) + this.__hasTakeLimit(take) + this.__hasOrderBy(orderBy) + this.__hasLimitFrom(startFrom)

                }).then(response => {
                        let respObject = JSON.parse(response[0]);

                        if(respObject.filesInfo){
                            return respObject.filesInfo;
                        } else if(respObject.error){
                            utils.error(respObject.error.message);
                        } else {
                            utils.error(String.raw('Unknown error'))
                        }
                });
        }

        __hasOrderBy(orderBy){
            return orderBy ? "&orderBy=" + orderBy : ''
        }

        __hasLimitFrom(startFrom){
            return startFrom ? "&startFrom=" + startFrom : '';
        }

        __hasTakeLimit(take){
            return take ? "&take=" + take : '';
        }

        __hasSearchPattern(searchPattern){
            return searchPattern ? "&fileName=" + searchPattern : '';
        }

    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType == 'StaticStorage', StaticSourceService);

    return StaticSourceService

})