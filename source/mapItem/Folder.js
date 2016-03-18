sGis.module('mapItem.Folder', [
    'MapItem'
], function(MapItem) {
    'use strict';

    var Folder = function(options) {
        this.__initialize(options);
    };

    Folder.prototype = new sGis.MapItem({
        isValidChild: function(child) {
            return child instanceof sGis.MapItem;
        },


        _defaultHandlers: {
            addChild: function(sGisEvent) {

            },

            removeChild: function(sGisEvent) {

            },

            childOrderChange: function(sGisEvent) {

            }
        }
    });
    
    return Folder;

});
