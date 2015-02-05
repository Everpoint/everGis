'use strict';

(function() {

    sGis.utils.validate = {
        'function': function (obj) {
            if (!sGis.utils.is.function(obj)) valError('Function', obj);
        },
        number: function(obj) {
            if (!sGis.utils.is.number(obj)) valError('Number', obj);
        },
        string: function(obj) {
            if (!sGis.utils.is.string(obj)) valError('String', obj);
        },
        array: function(obj) {
            if (!sGis.utils.is.array(obj)) valError('Array', obj);
        }
    };

    sGis.utils.is = {
        'function': function(obj) {
            return obj instanceof Function;
        },
        number: function(n) {
            return !utils.isArray(n) && !isNaN(parseFloat(n)) && isFinite(n);
        },
        string: function(s) {
            return typeof s === 'string';
        },
        array: function(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }
    };

    function valError(type, obj) {
        utils.error(type + ' is expected but got ' + obj + ' instead');
    }

})();