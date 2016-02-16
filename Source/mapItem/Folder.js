'use strict';

(function() {

    sGis.mapItem.Folder = function(options) {
        this.__initialize(options);
    };

    sGis.mapItem.Folder.prototype = new sGis.MapItem({
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


})();