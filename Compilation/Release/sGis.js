'use strict';

(function() {
    
window.sGis = {};

sGis.extend = function(Child, Parent) {
    var F = function() {};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
};

sGis.browser = (function() {
    var ua= navigator.userAgent,
    tem, 
    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE '+(tem[1] || '');
    }
    if (M[1] === 'Chrome') {
        tem= ua.match(/\bOPR\/(\d+)/);
        if (tem != null) return 'Opera ' + tem[1];
    }
    M = M[2] ? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
})();

sGis.isTouch = 'ontouchstart' in document.documentElement;

})();(function() {
    
sGis.geotools = {};

sGis.geotools.distance = function(a, b) {
    if (a.crs.from) {
        var p1 = a.projectTo(sGis.CRS.geo),
            p2 = b.projectTo(sGis.CRS.geo),
            d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(toRadians((p2.y - p1.y) / 2)), 2) + Math.cos(toRadians(p1.y)) * Math.cos(toRadians(p2.y)) * Math.pow(Math.sin(toRadians((p2.x - p1.x) / 2)), 2))),
            R = 6372795,
            l = d * R;
    } else {
        var l = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }

    return l;
};

function toRadians(degree) {
    return degree * Math.PI / 180;
}

sGis.geotools.length = function(geometry, crs) {
    var coord = geometry instanceof sGis.feature.Polyline ? geometry.coordinates : geometry;
    crs = geometry instanceof sGis.feature.Polyline ? geometry.crs : crs ? crs : sGis.CRS.geo;
    
    var tempFeature = new sGis.feature.Polyline(coord, {crs: crs}),
        length = 0;
    
    if (crs.from) {
        var projected = tempFeature.projectTo(sGis.CRS.CylindicalEqualArea).coordinates;
    } else {
        projected = tempFeature.coordinates;
    }

    if (geometry instanceof sGis.feature.Polygon) projected.push(projected[0]);

    for (var ring = 0, l = projected.length; ring < l; ring++) {
        for (var i = 0, m = projected[ring].length - 1; i < m; i++) {
            length += sGis.geotools.distance(new sGis.Point(projected[ring][i][0], projected[ring][i][1], crs), new sGis.Point(projected[ring][i + 1][0], projected[ring][i + 1][1], crs));
        }
    }
    
    return length;
};

sGis.geotools.area = function(geometry, crs) {
    var coord = geometry instanceof sGis.feature.Polyline ? geometry.coordinates : geometry;
    crs = geometry instanceof sGis.feature.Polyline ? geometry.crs : crs ? crs : sGis.CRS.geo;
    
    var tempFeature = new sGis.feature.Polyline(coord, {crs: crs}),
        area = 0;
        
    
    if (crs.from) {
        var projected = tempFeature.projectTo(sGis.CRS.CylindicalEqualArea).coordinates;
    } else {
        projected = tempFeature.coordinates;
    }

    for (var ring = 0, l = projected.length; ring < l; ring++) {
        area += polygonArea(projected[ring]);
    }
    return area;        
};

function polygonArea(coord) {
    coord = coord.concat([coord[0]]);
    
    var area = 0;
    for (var i = 0, l = coord.length - 1; i < l; i++) {
        area += (coord[i][0] + coord[i+1][0]) * (coord[i][1] - coord[i + 1][1]);
    }
    return Math.abs(area / 2);
}

sGis.geotools.pointToLineProjection = function(point, line) {
    if (line[0][0] === line[1][0]) {
        return [line[0][0], point[1]];
    } else if (line[0][1] === line[1][1]) {
        return [point[0], line[0][1]];
    } else {
        var lx = line[1][0] - line[0][0],
            ly = line[1][1] - line[0][1],
            dx = line[0][0] - point[0],
            dy = line[0][1] - point[1],
            t = - (dx * lx + dy * ly) / (lx * lx + ly * ly),
            x = line[0][0] + t * lx,
            y = line[0][1] + t * ly;
        return [x, y];
    }
};

})();'use strict';

var Event = (function() {

  var guid = 0;
    
  function fixEvent(event) {
	event = event || window.event;
  
    if ( event.isFixed ) {
      return event;
    }
    event.isFixed = true;
  
    event.preventDefault = event.preventDefault || function(){this.returnValue = false;};
    event.stopPropagation = event.stopPropagation || function(){this.cancelBubble = true;};
    
    if (!event.target) {
        event.target = event.srcElement;
    }
    
    if (!event.currentTarget) {
        event.currentTarget = event.srcElement;
    }
  
    if (event.relatedTarget === undefined && event.fromElement) {
        event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;
    }
  
    if ( event.pageX == null && event.clientX != null ) {
        var html = document.documentElement, body = document.body;
        event.pageX = event.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0);
        event.pageY = event.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0);
    }
  
    if ( !event.which && event.button ) {
        event.which = (event.button & 1 ? 1 : ( event.button & 2 ? 3 : ( event.button & 4 ? 2 : 0 ) ));
    }
	
	return event;
  }  
  
  /* Вызывается в контексте элемента всегда this = element */
  function commonHandle(event) {
    event = fixEvent(event);
    
    var handlers = this.events[event.type];

	for ( var g in handlers ) {
      var handler = handlers[g];

      var ret = handler.call(this, event);
      if ( ret === false ) {
          event.preventDefault();
          event.stopPropagation();
      }
    }
  }
  
  function getWheelEventType() {
    if (document.addEventListener) {
        if ('onwheel' in document) {
            return 'wheel';
        } else if ('onmousewheel' in document) {
            return 'mousewheel';
        } else {
            return 'MozMousePixelScroll';
        }
    }
  }
  
  return {
    add: function(elem, type, handler) {
      if (elem.setInterval && ( elem != window && !elem.frameElement ) ) {
        elem = window;
      }
      
      if (type === 'wheel') type = getWheelEventType();
      
      if (!handler.guid) {
        handler.guid = ++guid;
      }
      
      if (!elem.events) {
        elem.events = {};
        elem.handle = function(event) {
            if (typeof Event !== "undefined") {
                return commonHandle.call(elem, event);
            }
        };
      }
	  
      if (!elem.events[type]) {
        elem.events[type] = {};     
      
        if (elem.addEventListener) {
            elem.addEventListener(type, elem.handle, false);
        } else if (elem.attachEvent) {
          elem.attachEvent("on" + type, elem.handle);
        } 
      }
      
      elem.events[type][handler.guid] = handler;

      return handler;
    },
    
    remove: function(elem, type, handler) {
      var handlers = elem.events && elem.events[type];
      
      if (!handlers) return;
      
      if (!handler) {
            for ( var handle in handlers ) {
                delete elem.events[type][handle];
            }
            return;
      }

      
      delete handlers[handler.guid];
      
      for(var any in handlers) return 
	  if (elem.removeEventListener) {
		elem.removeEventListener(type, elem.handle, false);
          } else if (elem.detachEvent) {
		elem.detachEvent("on" + type, elem.handle);
            }
		
	  delete elem.events[type];
	
	  
	  for (var any in elem.events) return;
	  try {
	    delete elem.handle;
	    delete elem.events ;
	  } catch(e) { // IE
	    elem.removeAttribute("handle");
	    elem.removeAttribute("events");
	  }
    } 
  };
}());

function getWheelDirection(e) {
    var wheelData = (e.detail ? e.detail *  -1 : e.wheelDelta / 40) || (e.deltaY * -1);
    if (wheelData > 0) {
        wheelData = 1;
    } else if (wheelData < 0){
        wheelData = -1;
    }
    return wheelData;
}

function getMouseOffset(target, e) {
    var docPos = getPosition(target);
    return {x: e.pageX - docPos.x, y: e.pageY - docPos.y};
}

function getPosition(e) {
    var clientRect = e.getBoundingClientRect(),
        x = (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
        y = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;            
    return {x: clientRect.left + x, y: clientRect.top + y};
}'use strict';

(function() {
    
var MAX_BUFFERS = 5,
    MAX_BUFFER_SIZE = 100;

window.utils = {
    objectBuffers: [],
    getObjectBuffer: function(bufferType) {
        if (utils.objectBuffers.length === 0) {
            var returnBuffer = new utils.ObjectBuffer(bufferType);
        } else {
            for (var i in utils.objectBuffers) {
                if (utils.objectBuffers[i].type === bufferType) {
                    var returnBuffer = utils.objectBuffers[i];
                    utils.objectBuffers = utils.objectBuffers.slice(0, i).concat(utils.objectBuffers.slice(i+1));
                    return returnBuffer;
                }
            }
            var returnBuffer = utils.objectBuffers.shift();
        }
        returnBuffer._free = false;
        return returnBuffer;
    },
    
    freeObjectBuffer: function(buffer) {
        utils.objectBuffers.push(buffer);
        buffer._free = true;
        if (utils.objectBuffer.length > MAX_BUFFERS) {
            utils.objectBuffer.shift();
        }
    }
};

utils.ObjectBuffer = function(bufferType) {
    Object.defineProperty(this, 'type', {configurable: false,
                                         enumerable: true,
                                         writable: false,
                                         value: bufferType});
    this._objects = [];
};

utils.ObjectBuffer.prototype.getElement = function() {
    if (this._objects.length > 0) {
        return this._objects.pop();
    } else {
        return getNewElement(this.type);
    }
};

utils.ObjectBuffer.prototype.putElement = function(elem) {
    if (this.type === getElemType(elem)) {
        this._objects.push(elem);
        if (!this._free && this._objects.length > MAX_BUFFER_SIZE) {
            this._objects.slice(this._objects.length - MAX_BUFFER_SIZE);
        }
    } else {
        error('The buffer of type ' + this.type + ' cannot contain elemenents of type ' + getElemType(elem));
    }
};

function getElemType(elem) {
    if (!(elem instanceof Object)) {
        error('Object buffer can contain only objects, but ' + typeof elem + ' is recieved');
    } else if (elem.tagName) {
        return elem.tagName.toLowerCase();
    }
}

function getNewElement(type) {
    return document.createElement(type);
}

utils.normolize = function(number) {
    return Math.abs(number - Math.round(number)) < 0.001 ? Math.round(number) : number;
};

Event.add(document, 'DOMContentLoaded', setCssRules);

function setCssRules() {
    utils.css = {
        transition: document.body.style.transition !== undefined ? {func: 'transition', rule: 'transition'} : 
                    document.body.style.webkitTransition !== undefined ? {func: 'webkitTransition', rule: '-webkit-transition'} : 
                    document.body.style.msTransition !== undefined ? {func: 'msTransition', rule: '-ms-transition'} :
                    document.body.style.OTransition !== undefined ? {func: 'OTransition', rule: '-o-transition'} :
                    null,
        transform:  document.body.style.transform !== undefined ? {func: 'transform', rule: 'transform'} : 
                    document.body.style.webkitTransform !== undefined ? {func: 'webkitTransform', rule: '-webkit-transform'} : 
                    document.body.style.OTransform !== undefined ? {func: 'OTransform', rule: '-o-transform'} : 
                    document.body.style.msTransform !== undefined ? {func: 'msTransform', rule: '-ms-ransform'} : null,
        transformOrigin: document.body.style.transformOrigin !== undefined ? {func: 'transformOrigin', rule: 'transform-origin'} : 
                    document.body.style.webkitTransformOrigin !== undefined ? {func: 'webkitTransformOrigin', rule: '-webkit-transform-origin'} : 
                    document.body.style.OTransformOrigin !== undefined ? {func: 'OTransformOrigin', rule: '-o-transform-origin'} : 
                    document.body.style.msTransformOrigin !== undefined ? {func: 'msTransformOrigin', rule: '-ms-ransform-origin'} : null
    };
}

utils.requestAnimationFrame = function(callback, element) {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    
    if (requestAnimationFrame) {
        requestAnimationFrame(callback, element); 
    } else {
         setTimeout(function() {
             callback();
         }, 1000/30);
    }
};

utils.initializeOptions = function(object, options) {
    for (var key in options) {
        if (object['_'+key] !== undefined && options[key] !== undefined) {
            object['_'+key] = options[key];
        }
    }    
};


var idCounter = 1;
utils.getNewId = function() {
    return idCounter++;
};

utils.mixin = function(target, source) {
    for (var key in source) {
        if (!target[key]) target[key] = source[key];
    }
};

utils.softEquals = function(a, b) {
    return (Math.abs(a - b) < 0.000001 * a);
};

utils.error = function error(message) {
    if (sGis.onerror) {
        sGis.onerror(message);
    } else {
        throw new Error(message);
    }
};

utils.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
};

utils.isNumber = function(n) {
    return !utils.isArray(n) && !isNaN(parseFloat(n)) && isFinite(n);
};

utils.isInteger = function(n) {
    return utils.isNumber(n) && Math.round(n) === n;
};

utils.isString = function(s) {
    return typeof s === 'string';
};

utils.isFunction = function(f) {
    return f instanceof Function;
};

utils.isNode = function(o) {
    return !!o.nodeType;
};

utils.validateString = function(s) {
    if (!utils.isString(s)) utils.error('String is expected but got ' + s + ' instead');
};

utils.validateValue = function(v, allowed) {
    if (allowed.indexOf(v) === -1) utils.error('Invalid value of the argument: ' + v);
};

utils.validateNumber = function(n) {
    if (!utils.isNumber(n)) utils.error('Number is expected but got ' + n + ' instead');
};

utils.validatePositiveNumber = function(n) {
    if (!utils.isNumber(n) || n <= 0) utils.error('Positive number is expected but got ' + n + ' instead');
};

utils.validateBool = function(b) {
    if (b !== true && b !== false) utils.error('Boolean is expected but got ' + b + ' instead');
};

utils.max = function(arr) {
    return Math.max.apply(null, arr);
};

utils.min = function(arr) {
    return Math.min.apply(null, arr);
};


utils.extendCoordinates = function(coord, center) {
    var extended = [];
    for (var i = 0, l = coord.length; i < l; i++) {
        extended[i] = [coord[i][0] - center[0], coord[i][1] - center[1], 1];
    }
    return extended;
};

utils.collapseCoordinates = function(extended, center) {
    var coord = [];
    for (var i = 0, l = extended.length; i < l; i++) {
        coord[i] = [extended[i][0] + center[0], extended[i][1] + center[1]];
    }
    return coord;
};


utils.simplify = function(points, tolerance) {
    var result = [];
    
    for (var ring = 0, l = points.length; ring < l; ring++) {
        var simplified = [points[ring][0]];
        for (var i = 1, len = points[ring].length - 1; i < len; i++) {
            if (points[ring][i].length === 0 || simplified[simplified.length - 1].length === 0 || Math.abs(points[ring][i][0] - simplified[simplified.length - 1][0]) > tolerance || Math.abs(points[ring][i][1] - simplified[simplified.length - 1][1]) > tolerance) {
                simplified.push(points[ring][i]);
            }
        }
        if (simplified[simplified.length - 1] !== points[ring][points[ring].length - 1]) simplified.push(points[ring][points[ring].length - 1]);
        result[ring] = simplified;
    }

    return result;
};

utils.getGuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
};

utils.init = function(object, options) {
    for (var i in options) {
        if (object[i] !== undefined && options[i] !== undefined) {
            try {
                object[i] = options[i];
            } catch (e) {
                if (!(e instanceof TypeError)) throw e;
            }
        }
    }
};

utils.parseXmlJsonNode = function(node) {
    var string = '';
    for (var i = 0, len = node.childNodes.length; i < len; i++) {
        string += node.childNodes[i].nodeValue;
    }
    return utils.parseJSON(string);
};

utils.parseJSON = function(string) {
    try {
        var json = JSON.parse(string);
    } catch (e) {
        var changed = string.replace(/\\"/g, '\\"').replace(/NaN/g, '"NaN"').replace(/:-Infinity/g, ':"-Infinity"').replace(/:Infinity/g, ':"Infinity"');
        json = JSON.parse(changed);
    }
    return json;
};

utils.html = function(element, html) {
    try {
        element.innerHTML = html;
    } catch(e) {
        var tempElement = document.createElement('div');
        tempElement.innerHTML = html;
        for (var i = tempElement.childNodes.length - 1; i >=0; i--) {
            element.insertBefore(tempElement.childNodes[i], tempElement.childNodes[i+1]);
        }
    }
};

utils.merge = function(arr1, arr2) {
    var result = [].concat(arr1);
    for (var i = 0; i < arr2.length; i++) {
        if (result.indexOf(arr2[i]) === -1) result.push(arr2[i]);
    }
    return result;
};

utils.ajax = function(properties) {
    var requestType = properties.type ? properties.type : 'GET';
    if (properties.cache === false) properties.url += '&ts=' + new Date().getTime();
    if (sGis.browser === 'MSIE 9') {
        var xdr = new XDomainRequest();
        xdr.onload = function() {
            if (properties.success) properties.success(xdr.responseText);
        };
        xdr.onerror = function() {if (properties.error) properties.error(xdr.responseText);};
        xdr.onprogress = function() {};
        xdr.open(requestType, properties.url);
        xdr.send(properties.data ? properties.data : null);    
    } else {
        var XMLHttpRequest = window.XMLHttpRequest || window.ActiveXObject && function() {return new ActiveXObject('Msxml2.XMLHTTP');},
            xhr = new XMLHttpRequest();

        xhr.open(requestType, properties.url);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (properties.success) properties.success(xhr.responseText, xhr.statusText);
                } else {
                    if (properties.error) properties.error(xhr.responseText, xhr.statusText);
                }
            }
        };
        xhr.send(properties.data ? properties.data : null);

        return xhr;
    }
};

utils.copyArray = function(arr) {
    var copy = [];
    for (var i = 0, l = arr.length; i < l; i++) {
        if (utils.isArray(arr[i])) {
            copy[i] = utils.copyArray(arr[i]);
        } else {
            copy[i] = arr[i];
        }
    }
    return copy;
};

utils.getColorObject = function(color) {
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgb(255, 255, 255)';
    ctx.rect(0,0,1,1);
    ctx.stroke();
    
    ctx.strokeStyle = color;
    ctx.rect(0,0,1,1);
    ctx.stroke();
    
    var data = ctx.getImageData(0,0,1,1).data;
    
    return {r: data[0], g: data[1], b: data[2], a: data[3]};
};

/*
 * Copyright (c) 2010 Nick Galbreath
 * http://code.google.com/p/stringencoders/source/browse/#svn/trunk/javascript
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/* base64 encode/decode compatible with window.btoa/atob
 *
 * window.atob/btoa is a Firefox extension to convert binary data (the "b")
 * to base64 (ascii, the "a").
 *
 * It is also found in Safari and Chrome.  It is not available in IE.
 */
/*
 * The original spec's for atob/btoa are a bit lacking
 * https://developer.mozilla.org/en/DOM/window.atob
 * https://developer.mozilla.org/en/DOM/window.btoa
 *
 * window.btoa and base64.encode takes a string where charCodeAt is [0,255]
 * If any character is not [0,255], then an DOMException(5) is thrown.
 *
 * window.atob and base64.decode take a base64-encoded string
 * If the input length is not a multiple of 4, or contains invalid characters
 *   then an DOMException(5) is thrown.
 */
var base64 = {};
base64.PADCHAR = '=';
base64.ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

base64.makeDOMException = function() {
    // sadly in FF,Safari,Chrome you can't make a DOMException
    var e, tmp;

    try {
        return new DOMException(DOMException.INVALID_CHARACTER_ERR);
    } catch (tmp) {
        // not available, just passback a duck-typed equiv
        // https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Error
        // https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Error/prototype
        var ex = new Error("DOM Exception 5");

        // ex.number and ex.description is IE-specific.
        ex.code = ex.number = 5;
        ex.name = ex.description = "INVALID_CHARACTER_ERR";

        // Safari/Chrome output format
        ex.toString = function() { return 'Error: ' + ex.name + ': ' + ex.message; };
        return ex;
    }
};

base64.getbyte64 = function(s,i) {
    // This is oddly fast, except on Chrome/V8.
    //  Minimal or no improvement in performance by using a
    //   object with properties mapping chars to value (eg. 'A': 0)
    var idx = base64.ALPHA.indexOf(s.charAt(i));
    if (idx === -1) {
        throw base64.makeDOMException();
    }
    return idx;
};

base64.decode = function(s) {
    // convert to string
    s = '' + s;
    var getbyte64 = base64.getbyte64;
    var pads, i, b10;
    var imax = s.length;
    if (imax === 0) {
        return s;
    }

    if (imax % 4 !== 0) {
        throw base64.makeDOMException();
    }

    pads = 0;
    if (s.charAt(imax - 1) === base64.PADCHAR) {
        pads = 1;
        if (s.charAt(imax - 2) === base64.PADCHAR) {
            pads = 2;
        }
        // either way, we want to ignore this last block
        imax -= 4;
    }

    var x = [];
    for (i = 0; i < imax; i += 4) {
        b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12) |
            (getbyte64(s,i+2) << 6) | getbyte64(s,i+3);
        x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff, b10 & 0xff));
    }

    switch (pads) {
    case 1:
        b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12) | (getbyte64(s,i+2) << 6);
        x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff));
        break;
    case 2:
        b10 = (getbyte64(s,i) << 18) | (getbyte64(s,i+1) << 12);
        x.push(String.fromCharCode(b10 >> 16));
        break;
    }
    return x.join('');
};

base64.getbyte = function(s,i) {
    var x = s.charCodeAt(i);
    if (x > 255) {
        throw base64.makeDOMException();
    }
    return x;
};

base64.encode = function(s) {
    if (arguments.length !== 1) {
        throw new SyntaxError("Not enough arguments");
    }
    var padchar = base64.PADCHAR;
    var alpha   = base64.ALPHA;
    var getbyte = base64.getbyte;

    var i, b10;
    var x = [];

    // convert to string
    s = '' + s;

    var imax = s.length - s.length % 3;

    if (s.length === 0) {
        return s;
    }
    for (i = 0; i < imax; i += 3) {
        b10 = (getbyte(s,i) << 16) | (getbyte(s,i+1) << 8) | getbyte(s,i+2);
        x.push(alpha.charAt(b10 >> 18));
        x.push(alpha.charAt((b10 >> 12) & 0x3F));
        x.push(alpha.charAt((b10 >> 6) & 0x3f));
        x.push(alpha.charAt(b10 & 0x3f));
    }
    switch (s.length - imax) {
    case 1:
        b10 = getbyte(s,i) << 16;
        x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
               padchar + padchar);
        break;
    case 2:
        b10 = (getbyte(s,i) << 16) | (getbyte(s,i+1) << 8);
        x.push(alpha.charAt(b10 >> 18) + alpha.charAt((b10 >> 12) & 0x3F) +
               alpha.charAt((b10 >> 6) & 0x3f) + padchar);
        break;
    }
    return x.join('');
};

if (!window.btoa) window.btoa = base64.encode;
if (!window.atob) window.atob = base64.decode;

/*
 * MATH
 */


utils.multiplyMatrix = function(a, b) {
    var c = [];
    for (var i = 0, m = a.length; i < m; i++) {
        c[i] = [];
        for (var j = 0, q = b[0].length; j < q; j++) {
            c[i][j] = 0;
            for (var r = 0, n = b.length; r < n; r++) {
                c[i][j] += a[i][r] * b[r][j];
            }
        }
    }
    
    return c;
};

if (!Object.defineProperty) {
    Object.defineProperty = function(obj, key, desc) {
        if (desc.value) {
            obj[key] = desc.value;
        } else {
            if (desc.get) {
                obj.__defineGetter__(key, desc.get);
            }
            if (desc.set) {
                obj.__defineSetter__(key, desc.set);
            }
        }
    };
}

if (!Object.defineProperties) {
    Object.defineProperties = function(obj, desc) {
        for (var key in desc) {
            Object.defineProperty(obj, key, desc[key]);
        }
    };
}

utils.message = function(mes) {
    if (window.console) {
        console.log(mes);
    }
};

utils.getUnique = function(arr) {
    var result = [];
    for (var i = 0, len = arr.length; i < len; i++) {
        if (result.indexOf(arr[i]) === -1) result.push(arr[i]);
    }
    return result;
};

})();'use strict';

(function() {
    
sGis.Crs = function(options) {
    for (var i in options) {
        this[i] = options[i];
    }
};

sGis.Crs.prototype = {
    getWkidString: function() {
        if (this.ESRIcode) {
            return {wkid: this.ESRIcode};
        } else if (this.description) {
            return this.description;
        }
    }
};
    
sGis.CRS = {
    plain: new sGis.Crs({}),
    
    geo: new sGis.Crs({
        from: function(xCrs, yCrs) {
            return {x: xCrs, y: yCrs};
        },
        to: function(xGeo, yGeo) {
            return {x: xGeo, y: yGeo};
        }
    }),
    webMercator: new sGis.Crs({
        defaultBbox: {
            minX: -20037508.342789244,
            maxX: 20037508.342789244,
            maxY: 20037508.342789244,
            minY: -20037508.342789244
        },
        ESRIcode: 102113,
        EPSGcode: 3857,
        from: function(xCrs, yCrs) {
            var a = 6378137,
                rLat = Math.PI / 2 - 2 * Math.atan(Math.exp(-yCrs/a)),
                rLong = xCrs / a,
                lon = toDeg(rLong),
                lat = toDeg(rLat);
            return {x: lon, y: lat, lon: lon, lat: lat};            
        },
        to: function(xGeo, yGeo) {
            var a = 6378137,
                rLat = toRad(yGeo),
                rLon = toRad(xGeo),
                X = a * rLon,
                Y = a * Math.log(Math.tan(Math.PI / 4 + rLat / 2));
            return {x: X, y: Y};            
        }
    }),
    ellipticalMercator: new sGis.Crs({
        defaultBbox: {
            minX: -20037508.342789244,
            maxX: 20037508.342789244,
            maxY: 20037508.34278924,
            minY: -20037508.34278924
        },
        ESRIcode: 54004,
        EPSGcode: 3395,
        from: function(xCrs, yCrs) {
            var a = 6378137,
                b = 6356752.3142,
                f = (a-b) / a,
                e = Math.sqrt(1 - b*b/a/a),
                eh = e/2,
                pih = Math.PI/2,
                ts = Math.exp(-yCrs/a),
                phi = pih - 2 * Math.atan(ts),
                i = 0,
                dphi = 1;
                
            while (Math.abs(dphi) > 0.000000001 && i++ < 15) {
                var con = e * Math.sin(phi);
                dphi = pih - 2 * Math.atan(ts * Math.pow((1 - con) / (1 + con), eh)) - phi;
                phi += dphi;
            };
            
            var rLong = xCrs / a,
                rLat = phi,
                lon = toDeg(rLong),
                lat = toDeg(rLat);
                
            return {x: lon, y: lat, lon: lon, lat: lat};            
        },
        to: function(xGeo, yGeo) {
            var rLat = toRad(yGeo),
                rLon = toRad(xGeo),
                a = 6378137,
                b = 6356752.3142,
                f = (a-b) / a,
                e = Math.sqrt(2 * f - f * f),
                X = a * rLon,
                Y = a * Math.log(Math.tan(Math.PI / 4 + rLat / 2) * Math.pow((1 - e * Math.sin(rLat)) / (1 + e * Math.sin(rLat)), (e/2)));

            return {x: X, y: Y};            
        }
    }),
    
    moscowBessel: new sGis.Crs({
        description: {"wkt":"PROJCS[\"Moscow_bessel\",GEOGCS[\"GCS_Bessel_1841\",DATUM[\"D_Bessel_1841\",SPHEROID[\"Bessel_1841\",6377397.155,299.1528128]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"False_Easting\",0.0],PARAMETER[\"False_Northing\",0.0],PARAMETER[\"Central_Meridian\",37.5],PARAMETER[\"Scale_Factor\",1.0],PARAMETER[\"Latitude_Of_Origin\",55.66666666666666],UNIT[\"Meter\",1.0]]"}
    })
};
    
//http://mathworld.wolfram.com/AlbersEqual-AreaConicProjection.html    
    
sGis.CRS.AlbertsEqualArea = function(lat0, lon0, stLat1, stLat2) {
    this._lat0 = toRad(lat0);
    this._lon0 = toRad(lon0);
    this._stLat1 = toRad(stLat1);
    this._stLat2 = toRad(stLat2);
    this._n = (Math.sin(this._stLat1) + Math.sin(this._stLat2)) / 2;
    this._c = Math.pow(Math.cos(this._stLat1), 2) + 2 * this._n * Math.sin(this._stLat1);
    this._ro0 = Math.sqrt(this._c - 2 * this._n * Math.sin(this._lat0)) / this._n;
    this._R = 6372795;
};
    
sGis.CRS.AlbertsEqualArea.prototype = new sGis.Crs({
    to: function(lon, lat) {
        var rlon = toRad(lon),
            rlat = toRad(lat),
            th = this._n * (rlon - this._lon0),
            ro = Math.sqrt(this._c - 2 * this._n * Math.sin(rlat)) / this._n,
            x = ro * Math.sin(th) * this._R,
            y = this._ro0 - ro * Math.cos(th) * this._R;
            
        return {x: x, y: y};
    },
    
    from: function(x, y) {
        var xRad = x / this._R,
            yRad = y / this._R,
//            ro = Math.sqrt(xRad*xRad + Math.pow((this._ro0 - yRad),2)),
            th = Math.atan(xRad / (this._ro0 - yRad)),
            ro = xRad / Math.sin(th),
            rlat = Math.asin((this._c - ro*ro * this._n * this._n) / 2 / this._n),
            rlon = this._lon0 + th / this._n,
            
            lat = toDeg(rlat),
            lon = toDeg(rlon);
            
        return {x: lon, y: lat, lon: lon, lat: lat};
    }
});

function toRad(d) {
    return d * Math.PI / 180;
}

function toDeg(r) {
    return r * 180 / Math.PI;
}
    
sGis.CRS.CylindicalEqualArea = new sGis.CRS.AlbertsEqualArea(0, 180, 60, 50);
    
})();
'use strict';

(function() {
    
sGis.IEventHandler = function() {};

sGis.IEventHandler.prototype = {
    forwardEvent: function(sGisEvent) {
        if (this._prohibitedEvents && this._prohibitedEvents.indexOf(sGisEvent.eventType) !== -1) return;
        var eventType = sGisEvent.eventType;
        if (this._eventHandlers && this._eventHandlers[eventType]) {
            var handlerList = utils.copyArray(this._eventHandlers[eventType]); //This is needed in case one of the handlers is deleted in the process of handling
            for (var i = 0, len = handlerList.length; i < len; i++) {
                handlerList[i].handler.call(this, sGisEvent);
                if (sGisEvent._cancelPropagation) break;
            }
        }
        
        if (this._defaultHandlers && this._defaultHandlers[eventType] !== undefined && !sGisEvent._cancelDefault) {
            this._defaultHandlers[eventType].call(this, sGisEvent);
        }
    },
    
    fire: function(eventType, parameters) {
        if (this._prohibitedEvents && this._prohibitedEvents.indexOf(eventType) !== -1) return;
        
        var sGisEvent = {};
        if (parameters) utils.mixin(sGisEvent, parameters);
        
        sGisEvent.sourceObject = this;
        sGisEvent.eventType = eventType;
        sGisEvent.stopPropagation = function() {sGisEvent._cancelPropagation = true;};
        sGisEvent.preventDefault = function() {sGisEvent._cancelDefault = true;};
        
        this.forwardEvent(sGisEvent);
    },
    
    addListner: function(type, handler) {
        if (!(handler instanceof Function)) utils.error('Function is expected but got ' + handler + ' instead');
        if (!utils.isString(type)) utils.error('String is expected but got ' + type + ' instead');
        
        var types = getTypes(type),
            namespaces = getNamespaces(type);
        
        if (!this._eventHandlers) this._eventHandlers = {};
        
        for (var i in types) {
            if (!this._eventHandlers[types[i]]) this._eventHandlers[types[i]] = [];
            if (this.hasListner(types[i], handler)) {
                this._eventHandlers[types[i]].namespaces = utils.merge(this._eventHandlers[types[i]].namespaces, namespaces);
            } else {
                this._eventHandlers[types[i]].push({handler: handler, namespaces: namespaces});
            }
        }
    },
    
    removeListner: function(type, handler) {
        if (!this._eventHandlers) return;
        
        var types = getTypes(type),
            namespaces = getNamespaces(type);
    
        if (types.length === 0) {
            for (var i in this._eventHandlers) {
                types.push(i);
            }
        }
        
        for (var i in types) {
            if (this._eventHandlers[types[i]]) {
                for (var j = this._eventHandlers[types[i]].length-1; j >=0; j--) {
                    if ((namespaces === null || namespaces.length === 0 || namespacesIntersect(this._eventHandlers[types[i]][j].namespaces, namespaces)) && 
                            (!handler || this._eventHandlers[types[i]][j].handler === handler)) {
                        this._eventHandlers[types[i]].splice(j, 1);
                    }
                }
            }
        }
    },
    
    addListners: function(handlers) {
        for (var type in handlers) {
            this.addListner(type, handlers[type]);
        }
    },
    
    prohibitEvent: function(type) {
        if (!this._prohibitedEvents) this._prohibitedEvents = [];
        this._prohibitedEvents.push(type);
    },
    
    allowEvent: function(type) {
        if (!this._prohibitedEvents) return;
        var index = this._prohibitedEvents.indexOf(type);
        if (index !== -1) this._prohibitedEvents.splice(index, 1);
    },
    
    hasListner: function(type, handler) {
        if (!utils.isString(type) || !utils.isFunction(handler)) utils.error('Expected the name of the event and handler function, but got (' + type + ', ' + handler + ') instead');
        
        if (this._eventHandlers && this._eventHandlers[type]) {
            for (var i in this._eventHandlers[type]) {
                if (this._eventHandlers[type][i].handler === handler) return true;
            }
        }
        
        return false;
    },
    
    hasListners: function(type) {
        if (!utils.isString(type)) utils.error('Expected the name of the event, but got ' + type + ' instead');
        return this._eventHandlers && this._eventHandlers[type] && this._eventHandlers[type].length > 0;
    },
    
    getHandlers: function(type) {
        if (!utils.isString(type)) utils.error('Expected the name of the event, but got ' + type + ' instead');
        if (this._eventHandlers && this._eventHandlers[type]) {
            return this._eventHandlers[type];
        }
        return [];
    }
    
};

function getTypes(string) {
    var names = string.match(/\.[A-Za-z0-9_-]+|[A-Za-z0-9_-]+/g),
        types = [];
    for (var i in names) {
        if (names[i].charAt(0) !== '.') types.push(names[i]);
    }
    return types;
}

function getNamespaces(string) {
    return string.match(/\.[A-Za-z0-9_-]+/g) || [];
}

function namespacesIntersect(namespaces1, namespaces2) {
    for (var i in namespaces1) {
        if (namespaces2.indexOf(namespaces1[i]) !== -1) return true;
    }
    return false;
}
    
})();'use strict';

(function() {
    
sGis.Point = function(x, y, crs) {
    if (!utils.isNumber(x) || !utils.isNumber(y)) utils.error('Coordinates are expected but (' + x + ', ' + y + ') is received instead');
    
    if (crs && !(crs instanceof sGis.Crs)) utils.error('CRS is not a child of sGis.Crs');

    if (!crs || crs === sGis.CRS.geo) {
        this.x = y;
        this.y = x;
        this.crs = sGis.CRS.geo;
    } else {
        this.x = x;
        this.y = y;
        this.crs = crs;
    }
};

sGis.Point.prototype = {
    projectTo: function(newCrs) {
        if (!(newCrs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + newCrs + ' instead');
        if (newCrs !== this.crs) {
            var positionGeo = this.crs.from(this.x, this.y),
                positionCrs = newCrs.to(positionGeo.x, positionGeo.y);
        } else {
            positionCrs = {x: this.x, y: this.y};
        }
        if (newCrs !== sGis.CRS.geo) {
            return new sGis.Point(positionCrs.x, positionCrs.y, newCrs);
        } else {
            return new sGis.Point(positionCrs.y, positionCrs.x, newCrs);
        }
    },

    setCoordinates: function(x, y, crs) {
        if (!crs || crs === this.crs) {
            this.x = x;
            this.y = y;
        } else {
            var newPoint = new sGis.Point(x, y, crs);
            newPoint = newPoint.projectTo(this.crs);
            this.x = newPoint.x;
            this.y = newPoint.y;
        }
    },
    
    clone: function() {
        return this.projectTo(this.crs);
    },
    
    getCoordinates: function() {
        if (this.crs === sGis.CRS.geo) {
            return [this.y, this.x];
        } else {
            return [this.x, this.y];
        }
    }
};

Object.defineProperties(sGis.Point.prototype, {
    coordinates: {
        get: function() {
            return this.getCoordinates();
        },
        
        set: function(coordinates) {
            this.setCoordinates(coordinates);
        }
    }
});

sGis.Bbox = function(point1, point2, crs) {
    this._crs = crs || point1.crs || point2.crs || sGis.CRS.geo;
    this.p = [];
    this.p1 = point1;
    this.p2 = point2;
};

sGis.Bbox.prototype = {
    projectTo: function(crs) {
        return new sGis.Bbox(this.p[0].projectTo(crs), this.p[1].projectTo(crs));
    },
    
    equals: function(bbox) {
        return this.p[0].x === bbox.p[0].x &&
               this.p[0].y === bbox.p[0].y &&
               this.p[1].x === bbox.p[1].x &&
               this.p[1].y === bbox.p[1].y &&
               this.p[0].crs === bbox.p[0].crs;
    },
    
    setEqual: function(bbox) {
        this.p[0] = bbox.p[0].clone();
        this.p[1] = bbox.p[1].clone();
        this._crs = bbox.crs;
    },
    
    intersects: function(bbox) {
        var proj = bbox.projectTo(this.p[0].crs);
        return this.xMax > proj.xMin && this.xMin < proj.xMax && this.yMax > proj.yMin && this.yMin < proj.yMax;
    },
    
    __setPoint: function(index, point) {
        if (point instanceof sGis.Point) {
            this.p[index] = point.projectTo(this._crs);
        } else if (utils.isArray(point)) {
            this.p[index] = new sGis.Point(point[0], point[1], this.crs);
        } else {
            utils.error('Point is expected but got ' + point + ' instead');
        }
    }
};

Object.defineProperties(sGis.Bbox.prototype, {
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            this.setEqual(this.projectTo(crs));
        } 
    },
    
    xMax: {
        get: function() {
            return Math.max(this.p1.x, this.p2.x);
        },
        
        set: function(value) {
            if (!utils.isNumber(value)) utils.error('Number is expected but got ' + value + ' instead');
            if (value < this.xMin) utils.error('Max value cannot be lower than the min value');
            if (this.p1.x > this.p2.x) {
                this.p1.x = value;
            } else {
                this.p2.x = value;
            }
        }
    },
    
    yMax: {
        get: function() {
            return Math.max(this.p1.y, this.p2.y);
        },
        
        set: function(value) {
            if (!utils.isNumber(value)) utils.error('Number is expected but got ' + value + ' instead');
            if (value < this.yMin) utils.error('Max value cannot be lower than the min value');
            if (this.p1.y > this.p2.y) {
                this.p1.y = value;
            } else {
                this.p2.y = value;
            }
        }
    },
    
    xMin: {
        get: function() {
            return Math.min(this.p1.x, this.p2.x);
        },
        
        set: function(value) {
            if (!utils.isNumber(value)) utils.error('Number is expected but got ' + value + ' instead');
            if (value > this.xMax) utils.error('Min value cannot be higher than the max value');
            if (this.p1.x > this.p2.x) {
                this.p2.x = value;
            } else {
                this.p1.x = value;
            }
        }
    },
    
    yMin: {
        get: function() {
            return Math.min(this.p1.y, this.p2.y);
        },
        
        set: function(value) {
            if (!utils.isNumber(value)) utils.error('Number is expected but got ' + value + ' instead');
            if (value > this.yMax) utils.error('Min value cannot be higher than the max value');
            if (this.p1.y > this.p2.y) {
                this.p2.y = value;
            } else {
                this.p1.y = value;
            }
        }
    },

    width: {
        get: function() {
            return this.xMax - this.xMin;
        }
    },

    height: {
        get: function() {
            return this.yMax - this.yMin;
        }
    },
    
    p1: {
        get: function() {
            return this.p[0];
        },
        
        set: function(point) {
            this.__setPoint(0, point);
        }
    },
    
    p2: {
        get: function() {
            return this.p[1];
        },
        
        set: function(point) {
            this.__setPoint(1, point);
        }
    }
});

sGis.geom = {};

sGis.geom.Point = function(coordinates, attributes) {
    this.setCoordinates(coordinates);
    
    if (attributes && attributes.color) this.color = attributes.color;
    if (attributes && attributes.size) this.size = attributes.size;
};

sGis.geom.Point.prototype = {
    _color: 'black',
    _size: 5,
    
    getCoordinates: function() {
        return [].concat(this._coord);
    },
    
    setCoordinates: function(coordinates) {
        if (!utils.isArray(coordinates) || coordinates.length !== 2 || !utils.isNumber(coordinates[0]) || !utils.isNumber(coordinates[1])) {
            utils.error('Coordinates in format [x, y] are expected, but got ' + coordinates + ' instead');
        }

        this._coord = coordinates;        
    },
    
    clone: function() {
        var point = new sGis.geom.Point(this.getCoordinates()),
            keys = Object.keys(this);
        for (var i in keys) {
            point[keys[i]] = this[keys[i]];
        }
        return point;
    },
    
    contains: function(position) {
        var dx = position.x - this._coord[0],
            dy = position.y - this._coord[1],
            distance2 = dx * dx + dy * dy;
        return Math.sqrt(distance2) < this._size / 2 + 2;
    }
};

Object.defineProperties(sGis.geom.Point.prototype, {
    size: {
        get: function() {
            return this._size;
        },
        
        set: function(size) {
            if (!utils.isNumber(size) || size <= 0) error('Expected positive number but got ' + size + ' instead');
            this._size = size;            
        }
    },
    
    color: {
        get: function() {
            return this._color;
        },
        
        set: function(color) {
            if (!utils.isString(color)) utils.error('Expected a string but got ' + color + 'instead');
            this._color = color;            
        }
    }
});

sGis.geom.Polyline = function(coordinates, options) {
    utils.init(this, options);
    
    this._coordinates = [[]];
    if (coordinates) this.coordinates = coordinates;
};

sGis.geom.Polyline.prototype = {
    _color: 'black',
    _width: 1,
    
    addPoint: function(point, ring) {
        if (!isValidPoint(point)) utils.error('Array of 2 coordinates is expected but got ' + point + ' instead');
        var ringAdj = ring || 0;
        this.setPoint(ringAdj, this._coordinates[ringAdj].length, point);
    },
    
    clone: function() {
        return new sGis.geom.Polyline(this._coordinates, {color: this._color, width: this._width});
    },
    
    contains: function(a, b) {
        var position = b && isValidPoint([a, b]) ? [a, b] : utils.isArray(a) && isValidPoint(a) ? a : a.x && a.y ? [a.x, a.y] : utils.error('Point coordinates are expecred but got ' + a + ' instead'),
            coordinates = this._coordinates;
    
        for (var ring = 0, l = coordinates.length; ring < l; ring++) {
            for (var i = 1, m = coordinates[ring].length; i < m; i++) {
                if (pointToLineDistance(position, [coordinates[ring][i-1], coordinates[ring][i]]) < this._width / 2 + 2) return [ring, i - 1];
            }
        }
        return false;
    },
    
    getRing: function(index) {
        return this._coordinates[index] ? utils.copyArray(this._coordinates[index]) : undefined;
    },
    
    setRing: function(n, coordinates) {
        if (!utils.isArray(coordinates)) utils.error('Array is expected but got ' + coordinates + ' instead');
        if (!utils.isNumber(n)) utils.error('Number is expected for the ring index but got ' + n + ' instead');
        
        if (n > this._coordinates.length) n = this._coordinates.length;
        
        this._coordinates[n] = [];
        for (var i = 0, l = coordinates.length; i < l; i++) {
            this.setPoint(n, i, coordinates[i]);
        }
    },
    
    getPoint: function(ring, index) {
        return this._coordinates[ring] && this._coordinates[ring][index] ? [].concat(this._coordinates[ring][index]) : undefined;
    },
    
    setPoint: function(ring, n, point) {
        if (!isValidPoint(point)) utils.error('Array of 2 coordinates is expected but got ' + point + ' instead');
        if (this._coordinates[ring] === undefined) utils.error('The ring with index ' + ring + ' does not exist in the geometry');
        if (!utils.isNumber(n)) utils.error('Number is expected for the point index but got ' + n + ' instead');
        
        this._coordinates[ring][n] = [].concat(point);
    }
};

Object.defineProperties(sGis.geom.Polyline.prototype, {
    color: {
        get: function() {
            return this._color;
        },
        
        set: function(color) {
            if (!utils.isString(color)) utils.error('Unexpected value of color: ' + color);
            this._color = color;
        }
    },
    
    width: {
        get: function() {
            return this._width;
        },
        
        set: function(width) {
            if (!utils.isNumber(width) || width < 0) utils.error('Unexpected value of width: ' + width);
            this._width = width;            
        }
    },
    
    coordinates: {
        get: function() {
            return utils.copyArray(this._coordinates);
        },
        set: function(coordinates) {
            if (!utils.isArray(coordinates)) utils.error('Array is expected but got ' + coordinates + ' instead');
            
            if (!utils.isArray(coordinates[0]) || !utils.isArray(coordinates[0][0])) {
                this.setRing(0, coordinates);
            } else {
                for (var i = 0, l = coordinates.length; i < l; i++) {
                    this.setRing(i, coordinates[i]);
                }
            }
        }
    }
});

function isValidPoint(point) {
    return utils.isArray(point) & utils.isNumber(point[0]) && utils.isNumber(point[1]);
}

function pointToLineDistance(point, line) {
    var lx = line[1][0] - line[0][0],
        ly = line[1][1] - line[0][1],
        dx = line[0][0] - point[0],
        dy = line[0][1] - point[1],
        t = 0 - (dx * lx + dy * ly) / (lx * lx + ly * ly);
        
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var distance = Math.sqrt(Math.pow(lx * t + dx, 2) + Math.pow(ly * t + dy, 2)); 

    return distance;
}

sGis.geom.Polygon = function(coordinates, options) {
    utils.init(this, options);
    
    this._coordinates = [[]];
    if (coordinates) this.coordinates = coordinates;
};

sGis.geom.Polygon.prototype = new sGis.geom.Polyline();

Object.defineProperties(sGis.geom.Polygon.prototype, {
    _fillStyle: {
        value: 'color',
        writable: true
    },
    
    _fillColor: {
        value: 'transparent',
        writable: true
    },
    
    _fillImage: {
        value: null,
        writable: true
    },
    
    clone: {
        value: function() {
            return new sGis.geom.Polygon(this._coordinates, {color: this._color, width: this._width, fillColor: this._fillColor});
        }
    },
    
    contains: {
        value: function(a, b) {
            var position = b && isValidPoint([a, b]) ? [a, b] : utils.isArray(a) && isValidPoint(a) ? a : a.x && a.y ? [a.x, a.y] : utils.error('Point coordinates are expecred but got ' + a + ' instead'),
                coordinates = this._coordinates,
                intersectionCount = 0;

            for (var ring = 0, l = coordinates.length; ring < l; ring++) {
                var points = coordinates[ring],
                    prevD = points[0][0] > position[0],
                    prevH = points[0][1] > position[1];

                points[points.length] = points[0]; // to include the line between the first and the last points

                for (var i = 1; i < points.length; i ++) {
                    if (pointToLineDistance(position, [points[i-1], points[i]]) < this._width / 2 + 2) {
                        return true;
                    }

                    var D = points[i][0] > position[0],
                        H = points[i][1] > position[1];

                    if (H !== prevH //othervise line does not intersect horizontal line
                        && (D > 0 || prevD > 0) //line is to the left from the point, but we look to the right
                       ) {
                        if (points[i-1][1] !== position[1]) {
                            if (intersects([[points[i][0], points[i][1]], [points[i-1][0], points[i-1][1]]], [position, [Math.max(points[i][0], points[i-1][0]), position[1]]])) {
                                intersectionCount++;
                            }
                        }

                    }
                    prevD = D;
                    prevH = H;
                }                
            }

            return intersectionCount % 2 === 1;
        }
    },    
    
    fillStyle: {
        get: function() {
            return this._fillStyle;
        },
        
        set: function(style) {
            if (style === 'color') {
                this._fillStyle = 'color';
            } else if (style === 'image') {
                this._fillStyle = 'image';
            } else {
                utils.error('Unknown fill style: ' + style);
            }
        }
    },
    
    fillColor: {
        get: function() {
            return this._fillColor;
        },
        
        set: function(color) {
            if (!utils.isString(color)) utils.error('Color string is expected, but got ' + color + ' instead');
            this._fillColor = color;            
        }
    },
    
    fillImage: {
        get: function() {
            return this._fillImage;
        },
        
        set: function(image) {
            if (!(image instanceof Image)) utils.error('Image is expected but got ' + image + ' istead');
            this._fillImage = image;
        }
    }
});

function intersects(line1, line2) {
    if (line1[0][0] === line1[1][0]) {
        return line1[0][0] > line2[0][0];
    } else {
        var k = (line1[0][1] - line1[1][1]) / (line1[0][0] - line1[1][0]),
            b = line1[0][1] - k * line1[0][0],
            x = (line2[0][1] - b) / k;
    
        return x > line2[0][0];
    }
}

})();'use strict';

(function() {

var FADEIN_TIME = 200,
    ANIMATION_TIME = 300;

utils.Painter = function(map) {
    this._map = map;
    this._layerData = {};
    this._objectBuffers = {};
    
    this._layers = {};

    var bbox = map.bbox,
        wrapper = map.layerWrapper;

    wrapper.bbox = bbox.projectTo(bbox.p[0].crs);
    wrapper.transform = {x: 0, y: 0, sx: 1, sy: 1};
    
    this._oldWrappers = [];
    
    var layers = map.layers;
    this.addLayers(layers);
    
    var self = this;
    this._defaultHandlers = {};
    for (var i in this._listensFor) {
        map.addListner(this._listensFor[i], function(sGisEvent) {
            handleEvent(sGisEvent, self, sGisEvent.position);
        });
    }
    this.update();
};

utils.Painter.prototype = {
    // The list of events that will be transfered to the features
    _listensFor: ['click', 'dblclick', 'dragStart', 'mousemove'],
    
    update: function() {
        if (this._activeWrapper) this._oldWrappers.push(this._activeWrapper);
        this._activeWrapper = getNewWrapper(this);

        var layers = this._map.layers;
        for (var i = layers.length - 1; i >=0; i--) {
            if (this._layerData[layers[i].id]) {
                moveObjectsToActiveWrapper(this._layerData[layers[i].id].displayedObjects, this);
                if (this._layerData[layers[i].id].canvas) {
                    this._layerData[layers[i].id].canvas.bbox = this._map.bbox;
                    moveObjectsToActiveWrapper([this._layerData[layers[i].id].canvas], this);
                }
            }
            
            this.updateLayer(layers[i]);

            var layerData = this._layerData[layers[i].id];
        
            if (layerData.zIndex !== i * 2) setZIndex(layerData, i * 2);
            layerData.zIndex = i * 2;
        }
        this._map.layerWrapper.appendChild(this._activeWrapper);
        this.redraw();
    },

    redraw: function() {
        var wrapper = this._activeWrapper,
            mapBbox = this._map.bbox,
            tMatrix = getTransformationMatrix(mapBbox, wrapper.bbox),
            resolution = this._map.resolution,
            tx = tMatrix.tx / resolution,
            ty = tMatrix.ty / resolution;

        if (sGis.browser === 'MSIE 9' || sGis.browser.indexOf('Opera') === 0) {
            var translate = 'translate('+tx+'px, '+ty+'px)';
        } else {
            translate = 'translate3d('+tx+'px, '+ty+'px, 0px)';
        }

        wrapper.style[utils.css.transform.func] = translate + ' scale('+tMatrix.sx+', '+tMatrix.sy+')';
        wrapper.transform = {x: tx, y: ty, sx: tMatrix.sx, sy: tMatrix.sy};
    },

    updateLayer: function(layer) {
        var bbox = this._map.bbox,
            layerData = this._layerData[layer.id];

        if (layer.delayedUpdate && !isFullyDrawn(layerData)) {
            layerData.scheduledUpdate = true;
            return;
        } else {
            layerData.scheduledUpdate = false;
        }

        var layerObjectsDesc = layer.getObjectArray(bbox, this._map.resolution);

        freeUndisplayedObjects(layerData.displayedObjects, bbox, this._objectBuffers);
        layerData.needAnimate = layer.needAnimate;
        layerData.opacity = layer.opacity;
        setDisplayedObjects(layerObjectsDesc, layerData, this);
        layerData.neededObjectList = layerObjectsDesc;
        adjustZlevels(layerData);
        if (Object.keys(layerObjectsDesc).length === 0) freeUnusedObjects(this);
    },

    redrawLayer: function(layerId) {

    },

    addLayer: function(layer){
        this._layerData[layer.id] = {
            toDrawOnCanvas: [],
            zIndex: this._map.layers.length * 2,
            displayedObjects: {},
            nodes: {}
        };
        
        setEmptyEventListners(this._listensFor, this._layerData[layer.id]);
        
        var painter = this;
        layer.addListner('propertyChange', function(sGisEvent) {
            if (sGisEvent.property === 'opacity') {
                painter.changeLayerOpacity(sGisEvent.layer);
            } else {
                painter.updateLayer(layer);
            }
        });
    },
    
    addLayers: function(layers) {
        for (var i in layers) {
            this.addLayer(layers[i]);
        }
    },
    
    changeLayerOpacity: function(layer) {
        var displayedObjects = this._layerData[layer.id].displayedObjects,
            opacity = layer.opacity;
        for (var i in displayedObjects) {
            if (displayedObjects[i].style) displayedObjects[i].style.opacity = opacity;
        }
    },
    
    removeLayer: function(layerId) {
        var layerData = this._layerData[layerId];
        for (var i in layerData.displayedObjects) {
            freeObject(layerData.displayedObjects[i], this._objectBuffers);
        }
        if (layerData.canvas) {
            layerData.canvas.parentNode.removeChild(layerData.canvas);
        }
        
        delete this._layerData[layerId];
    },

    animateTo: function(newBbox, callback) {
        var startTime = new Date(),
            endTime = new Date(startTime.getTime() + ANIMATION_TIME);

        this._animation = {
            startTime: startTime,
            endTime: endTime,
            targetBbox: newBbox,
            callback: callback
        };

        utils.requestAnimationFrame((function(painter) {return function() {showNextAnimationFrame(painter);};})(this));
    },

    cancelAnimation: function() {
        if (this._animation) {
            delete this._animation;
            this._map.fire('bboxChange', {map: this._map});
        }
    }
};

utils.mixin(utils.Painter.prototype, sGis.IEventHandler.prototype);

function setZIndex(layerData, zIndex) {
    for (var i in layerData.displayedObjects) {
        layerData.displayedObjects[i].style.zIndex = zIndex;
    }
    for (var i in layerData.nodes) {
        layerData.nodes[i].style.zIndex = zIndex;
    }
    if (layerData.canvas) layerData.canvas.style.zIndex = zIndex;
    layerData.zIndex = zIndex;
}

function moveObjectsToActiveWrapper(objects, painter) {
    for (var i in objects) {
        if (objects[i].parentNode) {
            objects[i].parentNode.removeChild(objects[i]);

            try {
                objects[i].style[utils.css.transform.func] = getObjectTransform(objects[i], painter);
                painter._activeWrapper.appendChild(objects[i]);
            } catch (e) {

            }
        }
    }
}

function getNewWrapper(painter) {
    var wrapper = document.createElement('div');
    wrapper.bbox = painter._map.bbox.projectTo(painter._map.bbox.p[0].crs);
    wrapper.transform = {x: 0, y: 0, sx: 1, sy: 1};
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style[utils.css.transformOrigin.func] = 'left top';
    wrapper.style.position = 'absolute';
    return wrapper;
}

function adjustZlevels(layerData) {
    for (var i in layerData.displayedObjects) {
        if (!layerData.neededObjectList[i] && layerData.displayedObjects[i].style.zIndex === '' + layerData.zIndex) {
            layerData.displayedObjects[i].style.zIndex = layerData.zIndex - 1;
        } else if (layerData.neededObjectList[i] && layerData.displayedObjects[i].style.zIndex !== '' + layerData.zIndex) {
            layerData.displayedObjects[i].style.zIndex = layerData.zIndex;
        }
    }
}

function showNextAnimationFrame(painter) {
    if (!painter._animation) {
        return;
    }

    var time = new Date(),
        k = (time - painter._animation.startTime) / (painter._animation.endTime - painter._animation.startTime);

    if (painter._animation.endTime - time <= 0) {
        if (painter._animation.callback) painter._animation.callback();
        var map = painter._map,
            targetBbox = painter._animation.targetBbox;
        delete painter._animation;

        map.prohibitEvent('bboxChange');
        map.__setBbox(targetBbox.p[0], targetBbox.p[1]);
        map.allowEvent('bboxChange');
        map.fire('animationEnd', {map: map});
        map.fire('bboxChangeEnd');
    } else {
        var bbox = painter._map.bbox,
            targetBbox = painter._animation.targetBbox,
            startPoint = new sGis.Point(bbox.p[0].x + (targetBbox.p[0].x - bbox.p[0].x) * k, bbox.p[0].y + (targetBbox.p[0].y - bbox.p[0].y) * k, bbox.p[0].crs),
            endPoint = new sGis.Point(bbox.p[1].x + (targetBbox.p[1].x - bbox.p[1].x) * k, bbox.p[1].y + (targetBbox.p[1].y - bbox.p[1].y) * k, bbox.p[1].crs);

        painter._map.prohibitEvent('bboxChange');
        painter._map.__setBbox(startPoint, endPoint);
        painter._map.allowEvent('bboxChange');
        
        painter.redraw();
        painter._map.fire('animationFrame', {targetBbox: targetBbox, animationRate: k});
        utils.requestAnimationFrame((function(painter) {return function() {showNextAnimationFrame(painter);};})(painter));
    }
}

function getTransformationMatrix(outerBbox, innerBbox) {
    var width = innerBbox.p[1].x - innerBbox.p[0].x,
        height = innerBbox.p[1].y - innerBbox.p[0].y,
        sx = utils.normolize(width/(outerBbox.p[1].x - outerBbox.p[0].x)),
        sy = utils.normolize(height/(outerBbox.p[1].y - outerBbox.p[0].y)),
        tx = utils.normolize(innerBbox.p[0].x - outerBbox.p[0].x),
        ty = utils.normolize(-innerBbox.p[1].y + outerBbox.p[1].y);

    return {tx: tx, ty: ty, sx: sx, sy: sy, width: width, height: height};
}

function setDisplayedObjects(objectsDesc, layerData, painter) {
    layerData.toDrawOnCanvas = [];
    
    for (var i in objectsDesc) {
        if (objectsDesc[i].type === 'img') {
            if (layerData.displayedObjects[i]) {

            } else {
                layerData.displayedObjects[i] = getImage(objectsDesc[i], layerData, painter);
            }
        } else if (objectsDesc[i] instanceof sGis.Feature) {
            layerData.toDrawOnCanvas.push(objectsDesc[i]);
        }
    }

    setEmptyEventListners(painter._listensFor, layerData);
    if (layerData.toDrawOnCanvas.length > 0) {
        draw(layerData, painter);
        layerData.canvas.bbox = painter._map.bbox;
        layerData.canvas.style[utils.css.transform.func] = getObjectTransform(layerData.canvas, painter);
        layerData.canvas.style.visibility = 'visible';
        if (!layerData.canvas.parentNode) painter._activeWrapper.insertBefore(layerData.canvas, painter._activeWrapper.firstChild);
    } else if (layerData.canvas) {
        layerData.canvas.style.visibility = 'hidden';
        removeDivs(layerData, painter._activeWrapper);

    }
}

function setEmptyEventListners(listensFor, layerData) {
    layerData.objectIndex = new sGis.Rbush();
    layerData.eventListners = {};
    for (var i in listensFor) {
        layerData.eventListners[listensFor[i]] = [];
    }
}

function getObjectTransform(object, painter) {
    if (!painter._map.wrapper) return;
    var wrapper = painter._activeWrapper,
        startPosition = painter._map.getPxPosition(object.bbox.p[0]),
        endPosition = painter._map.getPxPosition(object.bbox.p[1]),
        sx = utils.normolize((endPosition.x - startPosition.x) / (object.naturalWidth || object.width) / wrapper.transform.sx),
        sy = utils.normolize((startPosition.y - endPosition.y) / (object.naturalHeight || object.height) / wrapper.transform.sy),
        tx = Math.round((startPosition.x - wrapper.transform.x) / wrapper.transform.sx),
        ty = Math.round((endPosition.y - wrapper.transform.y) / wrapper.transform.sy);

    if (sGis.browser.indexOf('Chrome') !== 0 && sGis.browser !== 'MSIE 9' && sGis.browser.indexOf('Opera') !== 0) {
        var transform = 'translate3d('+tx+'px, '+ty+'px, 0px) scale('+sx.toPrecision(6) +', '+sy.toPrecision(6)+')';
    } else {
        transform = 'translate('+tx+'px, '+ty+'px) scale('+sx +', '+sy +')';
    }

    return transform;
}

function showImage(image, painter) {
    utils.requestAnimationFrame(function() {
        if (painter._animation) {
            
        }
        
        image.width = image.naturalWidth;
        image.height = image.naturalHeight;
        
        try {
            image.style[utils.css.transform.func] = getObjectTransform(image, painter);
            image.style[utils.css.transformOrigin.func] = 'left top';
            image.style.visibility = 'visible';
            painter._activeWrapper.appendChild(image);

            if (image.needAnimate) image.style.transition = 'opacity ' + FADEIN_TIME / 1000 + 's linear';
            if (!image.error) setTimeout(function() {
                image.style.opacity = image.opacity;
                freeUnusedObjects(painter);        
            }, 100);
        } catch (e) {
        
        }
    });
}

function getImage(objectDesc, layerData, painter) {
    var type = 'img';
    if (!painter._objectBuffers[type]) painter._objectBuffers[type] = utils.getObjectBuffer(type);

    var img = painter._objectBuffers[type].getElement();
    img.type = type;
    img.style.position = 'absolute';
    img.style.visibility = 'hidden';
    img.style.opacity = 0;
    img.style.zIndex = layerData.zIndex;
    img.style.transition = '';

    img.bbox = objectDesc.bbox.projectTo(painter._map.crs);
    img.opacity = layerData.opacity;
    img.needAnimate = layerData.needAnimate && img.opacity === 1;

    if (img.src === objectDesc.src) {
        showImage(img, painter);
    } else {
        Event.add(img, 'load', function(event) {
            event.target.error = false;
            showImage(event.target, painter);
        });

        Event.add(img, 'error', function(event) {
            event.target.error = true;
            //showImage(event.target, painter);
        });

        img.src = objectDesc.src;
    }

    return img;
}

function freeObject(object, buffers) {
    object.style.transition = '';
    object.style.opacity = 0;
    if (object.parentNode) object.parentNode.removeChild(object);
    buffers[object.type].putElement(object);
    object.style.visibility = 'hidden';
    Event.remove(object, 'load');
}

function freeUndisplayedObjects(objects, bbox, objectBuffers) {
    for (var i in objects) {
        if (objects[i].bbox.p[1].x < bbox.p[0].x || objects[i].bbox.p[0].x > bbox.p[1].x ||
            objects[i].bbox.p[1].y < bbox.p[0].y || objects[i].bbox.p[0].y > bbox.p[1].y) {

            freeObject(objects[i], objectBuffers);
            delete objects[i];
        }
    }
}

// TODO: I am ashamed of writing this function. It should be completely erased and a new better one should take its place
function freeUnusedObjects(painter) {
    var layers = painter._map.layers;
    for (var i in layers) {
        var layerData = painter._layerData[layers[i].id];
        if (isFullyDrawn(layerData)){
            var delay = layerData.opacity === 1 ? layerData.needAnimate * FADEIN_TIME : 0;
            clearTimeout(layerData.deletionTimer);

            if (delay === 0) {
                for (var j in layerData.displayedObjects) {
                    if (!layerData.neededObjectList[j]) {
                        freeObject(layerData.displayedObjects[j], painter._objectBuffers);
                        delete layerData.displayedObjects[j];
                    }
                }
                
                for (var j in painter._oldWrappers) {
                    if (painter._oldWrappers[j].childNodes.length === 0) {
                        painter._oldWrappers[j].parentNode.removeChild(painter._oldWrappers[j]);
                        painter._oldWrappers.splice(j, 1);
                    }
                }
            } else {
                layerData.deletionTimer = setTimeout((function(layerData) {return function() {
                    for (var j in layerData.displayedObjects) {
                        if (!layerData.neededObjectList[j]) {
                            freeObject(layerData.displayedObjects[j], painter._objectBuffers);
                            delete layerData.displayedObjects[j];
                        }
                    }

                    for (var j in painter._oldWrappers) {
                        if (painter._oldWrappers[j].childNodes.length === 0) {
                            painter._oldWrappers[j].parentNode.removeChild(painter._oldWrappers[j]);
                            painter._oldWrappers.splice(j, 1);
                        }
                    }
                };})(layerData), delay);
            }

            if (layerData.scheduledUpdate) painter.updateLayer(layers[i]);
        }
    }
}

function isFullyDrawn(layerData) {
    var fullyDrawn = true;
    for (var i in layerData.displayedObjects) {
        if (layerData.displayedObjects[i].style.visibility === 'hidden') fullyDrawn = false;
    }
    return fullyDrawn;
}

function draw(layerData, painter) {
    if (!layerData.canvas) {
        layerData.canvas = getNewCanvas(painter);
        layerData.canvas.style.zIndex = layerData.zIndex;
    } else {
        layerData.canvas.width = painter._map.width;
        layerData.canvas.height = painter._map.height;
        layerData.canvas.bbox = painter._map.bbox;
    }
    var ctx = layerData.canvas.getContext('2d');
    removeDivs(layerData, painter._activeWrapper);
    ctx.globalAlpha = layerData.opacity;

    var resolution = painter._map.resolution,
        bbox = painter._map.bbox,
        offset = {x: bbox.p[0].x / resolution, y: - bbox.p[1].y / resolution};

    for (var i in layerData.toDrawOnCanvas) {
        var geometry = layerData.toDrawOnCanvas[i].render(resolution, painter._map.crs),
            div = null,
            innerCanvas = null,
            innerCtx = null;
        
        if (geometry.length > 0 && isMixed(geometry)) {
            div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.zIndex = layerData.zIndex;
            
            innerCanvas = getNewCanvas(painter);
            innerCanvas.style.visibility = 'visible';
            innerCanvas.position = [innerCanvas.bbox.p[0].x / painter._map.resolution, -innerCanvas.bbox.p[1].y / painter._map.resolution];
            innerCanvas.style[utils.css.transform.func] = getDivTransform(innerCanvas, painter);
            innerCanvas.style.pointerEvents = 'none';
            
            div.appendChild(innerCanvas);
            layerData.nodes[i] = div;
            
            painter._activeWrapper.appendChild(div);
            
            var innerCtx = innerCanvas.getContext('2d');
        }
        
        for (var j in geometry) {
            var coordinates = null;
            if (geometry[j] instanceof sGis.geom.Point) {
                drawPoint(geometry[j], offset, innerCtx || ctx, painter);
                var halfSize = geometry[j].size / 2;
                var coord = geometry[j].getCoordinates();
                coordinates = [coord[0] - halfSize, coord[1] - halfSize, coord[0] + halfSize, coord[1] + halfSize];
            } else if (geometry[j] instanceof sGis.geom.Polyline || geometry[j] instanceof sGis.geom.Polygon) {
                drawPolyline(geometry[j], offset, innerCtx || ctx, painter);
                var coord = geometry[j].coordinates;
                var bbox = [Infinity, Infinity, -Infinity, -Infinity];
                for (var ring = 0, len = coord.length; ring < len; ring++) {
                    for (var k = 0, length = coord[ring].length; k < length; k++) {
                        for (var l = 0; l < 2; l++) {
                            bbox[l] = Math.min(bbox[l], coord[ring][k][l]);
                            bbox[2 + l] = Math.max(bbox[2 + l], coord[ring][k][l]);
                        }
                    }
                }
                coordinates = bbox;
            } else if (sGis.browser.indexOf('Opera') !== 0 && geometry[j] instanceof Image || geometry[j] instanceof HTMLImageElement) {
                drawImage(geometry[j], offset, innerCtx || ctx, painter);
                coordinates = geometry[j].position.concat([geometry[j].position[0] + geometry[j].width, geometry[j].position[1] + geometry[j].height]);
            } else if (geometry[j].nodeName === 'DIV') {
                var id = layerData.toDrawOnCanvas[i].id;
                if (!layerData.nodes[id]) {
                    layerData.nodes[id] = geometry[j];
                    showDiv(geometry[j], layerData, painter, div);
                }
            }

            var indexObject = coordinates;
            if (indexObject) {
                indexObject.feature = layerData.toDrawOnCanvas[i];
                indexObject.geometry = geometry[j];
                layerData.objectIndex.insert(indexObject);
            }

            for (var eventType in layerData.eventListners) {
                if (layerData.toDrawOnCanvas[i].hasListners(eventType)) {
                    layerData.eventListners[eventType].push({geometry: geometry[j], feature: layerData.toDrawOnCanvas[i]});
                }
            }
        }
    }
}

function isMixed(geometry) {
    var isNode = geometry[0].nodeName === 'DIV';
    for (var i = 1, l = geometry.length; i < l; i++) {
        if ((geometry[i].nodeName === 'DIV') ^ isNode) return true;
    }
    return false;
}

function removeDivs(layerData) {
    
    for (var i in layerData.nodes) {
        var wrapper = layerData.nodes[i].parentNode;
        wrapper.removeChild(layerData.nodes[i]);
    }
    layerData.nodes = {};
}

function showDiv(div, layerData, painter, wrapper) {
    if (!wrapper) wrapper = painter._activeWrapper;
    
    div.style[utils.css.transform.func] = getDivTransform(div, painter);
    div.style.zIndex = layerData.zIndex;
    wrapper.appendChild(div);    
}

function getDivTransform(div, painter) {
    var map = painter._map,
        resolution = map.resolution,
        offset = {x: map.bbox.p[0].x / resolution, y: - map.bbox.p[1].y / resolution},
        wrapper = painter._activeWrapper,
        tx = Math.round((div.position[0] - offset.x - wrapper.transform.x) / wrapper.transform.sx),
        ty = Math.round((div.position[1] - offset.y - wrapper.transform.y) / wrapper.transform.sy);

    if (sGis.browser.indexOf('Chrome') !== 0 && sGis.browser !== 'MSIE 9' && sGis.browser.indexOf('Opera') !== 0) {
        var transform = 'translate3d('+tx+'px, '+ty+'px, 0px) scale(1, 1)';
    } else {
        transform = 'translate('+tx+'px, '+ty+'px) scale(1, 1)';
    }
    
    return transform;
}

function drawImage(image, offset, ctx, painter) {
    var position = image.position;
    
    ctx.drawImage(image, position[0] - offset.x, position[1] - offset.y, image.width, image.height);
}

function drawPolyline(polyline, offset, ctx, painter) {
    var points = polyline.coordinates;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = polyline.width;
    ctx.strokeStyle = polyline.color;
    
    for (var ring = 0, l = points.length; ring < l; ring++) {
        ctx.moveTo(points[ring][0][0] - offset.x, points[ring][0][1] - offset.y);
        for (var i = 1; i < points[ring].length; i++) {
            if (points[ring][i].length === 2) {
                ctx.lineTo(points[ring][i][0] - offset.x, points[ring][i][1] - offset.y);
            } else {
                ctx.closePath();
                i++;
                ctx.moveTo(points[ring][i][0] - offset.x, points[ring][i][1] - offset.y);
            }
        }

        if (polyline instanceof sGis.geom.Polygon) {
            ctx.closePath();
        }
    }
    
    if (polyline instanceof sGis.geom.Polygon) {
        if (polyline.fillStyle === 'color') {
            ctx.fillStyle = polyline.fillColor;
        } else if (polyline.fillStyle === 'image') {
            var pattern = ctx.createPattern(polyline.fillImage, 'repeat');
            ctx.fillStyle = pattern;
            
            var patternOffsetX = (points[0][0][0] - offset.x) % polyline.fillImage.width,
                patternOffsetY = (points[0][0][1] - offset.y) % polyline.fillImage.height;
            ctx.translate(patternOffsetX, patternOffsetY);
        }
        ctx.fill();        
    }

    ctx.stroke();
    
    if (patternOffsetX || patternOffsetY) {
        ctx.translate(-patternOffsetX, -patternOffsetY);
    }
}

function getNewCanvas(painter) {
    var canvas = document.createElement('canvas');
    canvas.width = painter._map.width;
    canvas.height = painter._map.height;
    canvas.style.position = 'absolute';
    canvas.bbox = painter._map.bbox;
    canvas.style.visibility = 'hidden';

    return canvas;
}

function drawPoint(point, offset, ctx, painter) {
    var coordinates = point.getCoordinates(),
        x = coordinates[0] - offset.x,
        y = coordinates[1] - offset.y;
    
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.strokeStyle = point.color;
    ctx.lineWidth = point.size;
    ctx.moveTo(x, y);
    ctx.lineTo(x+0.5, y);
    ctx.stroke();
}

var DIST_MARGIN = 2;
var mouseOverFeature = null;
function handleEvent(sGisEvent, painter, position) {
    var point = sGisEvent.point || painter._map.getPointFromPxPosition(sGisEvent.mouseOffset.x, sGisEvent.mouseOffset.y);
    if (!position) {
        position = { x: point.x / painter._map.resolution, y: -point.y / painter._map.resolution };
    }
    var square = [position.x - DIST_MARGIN, position.y - DIST_MARGIN, position.x + DIST_MARGIN, position.y + DIST_MARGIN];
    var eventObj = { point: point, position: position, mouseOffset: sGisEvent.mouseOffset };

    var layers = painter._map.layers;
    for (var i = layers.length - 1; i >= 0; i--) {
        var layerData = painter._layerData[layers[i].id];

        var closeObjects = layerData.objectIndex.search(square);
        closeObjects.sort(sortIndexResult);
        for (var j = closeObjects.length - 1; j >= 0; j--) {
            var feature = closeObjects[j].feature;
            var needHandleMousemove = sGisEvent.eventType === 'mousemove' && (feature.hasListners('mouseout') || feature.hasListners('mouseover'));
            if (feature.hasListners(sGisEvent.eventType) || needHandleMousemove) {
                var geometry = closeObjects[j].geometry;
                if (geometry instanceof HTMLElement) {
                    var intersectionType;
                    intersectionType = geometry.position[0] < position.x && (geometry.position[0] + geometry.width) > position.x &&
                                       geometry.position[1] < position.y && (geometry.position[1] + geometry.height) > position.y;
                } else {
                    intersectionType = geometry.contains(position);
                }        
            
                if (intersectionType !== false) {
                    if (sGisEvent.eventType === 'mousemove') {
                        
                        if (mouseOverFeature && mouseOverFeature !== feature) {
                            mouseOverFeature.fire('mouseout', eventObj);
                        }
                        mouseOverFeature = feature;
                        feature.fire('mouseover', eventObj);
                    }
                    sGisEvent.intersectionType = intersectionType;
                    feature.forwardEvent(sGisEvent);
                    return;
                }
            }
        }
    }

    if (sGisEvent.eventType === 'mousemove' && mouseOverFeature) {
        mouseOverFeature.fire('mouseout', eventObj);
        mouseOverFeature = null;
    }


    function sortIndexResult(a, b) {
        return layerData.toDrawOnCanvas.indexOf(a.feature) > layerData.toDrawOnCanvas.indexOf(b.feature) ? 1 : -1;
    }
}



})();'use strict';

(function() {

sGis.Layer = function(extention) {
    for (var key in extention) {
        this[key] = extention[key];
    }
};

sGis.Layer.prototype = {
    _display: true,
    _opacity: 1.0,
    _needAnimate: sGis.browser.indexOf('Chrome') === 0 ? false : true,
    _name: null,
    _delayedUpdate: false,
    
    __initialize: function() {
        this._id = utils.getGuid();
    },
    
    show: function() {
        this._display = true;
        this.fire('propertyChange', {property: 'display'});
    },
    
    hide: function() {
        this._display = false;
        this.fire('propertyChange', {property: 'display'});
    }
};

Object.defineProperties(sGis.Layer.prototype, {
    id: {
        get: function() {
            return this._id;
        }
    },
    
    opacity: {
        get: function() {
            return this._opacity;
        },
        
        set: function(opacity) {
            if (!utils.isNumber(opacity)) error('Expected a number but got "' + opacity + '" instead');
            opacity = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;
            this._opacity = opacity;
            this.fire('propertyChange', {property: 'opacity'});
        }
    },
    
    name: {
        get: function() {
            return this._name ? this._name : this._id;
        },
        
        set: function(name) {
            if (!utils.isString(name)) utils.error('String is expected but got ' + name + ' instead');
            this._name = name;
            this.fire('propertyChange', {property: 'name'});
        }
    },
    
    needAnimate: {
        get: function() {
            return this._needAnimate;
        },
        
        set: function(bool) {
            this._needAnimate = bool;
        }
    },
    
    isDisplayed: {
        get: function() {
            return this._display;
        },
        
        set: function(bool) {
            if (bool === true) {
                this.show();
            } else if (bool === false) {
                this.hide();
            } else {
                utils.error('Boolean is expected but got ' + bool + ' instead');
            }
        }
    },
    
    delayedUpdate: {
         get: function() {
             return this._delayedUpdate;
         },
         
         set: function(bool) {
             this._delayedUpdate = bool;
         }
    }
});

utils.mixin(sGis.Layer.prototype, sGis.IEventHandler.prototype);

})();'use strict';

(function() {

sGis.LayerGroup = function(layers) {
    this.layers = layers || [];
};

sGis.LayerGroup.prototype = {
    addLayer: function(layer) {
        if (!(layer instanceof sGis.Layer) && !(layer instanceof sGis.LayerGroup)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
        if (layer === this) utils.error('Cannot add self to the group');
        if (this._layers.indexOf(layer) !== -1) {
            utils.error('Cannot add layer to the group: the layer is already in the group');
        } else {
            for (var i = 0, l = this._layers.length; i < l; i++) {
                if (this._layers[i] instanceof sGis.LayerGroup && this._layers[i].contains(layer) || layer instanceof sGis.LayerGroup && layer.contains(this._layers[i])) {
                    utils.error('Cannot add layer to the group: the layer is already in the group');
                }
            }
            
            this._layers.push(layer);
            this.fire('layerAdd', {layer: layer});
        }
    },
    
    removeLayer: function(layer, recurse) {
        if (!(layer instanceof sGis.Layer) && !(layer instanceof sGis.LayerGroup)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
        var index = this._layers.indexOf(layer);
        if (index !== -1) {
            this._layers.splice(index, 1);
            this.fire('layerRemove', {layer: layer});
            return;
        } else if (recurse) {
            for (var i = 0, l = this._layers.length; i < l; i++) {
                if (this._layers[i] instanceof sGis.LayerGroup && this._layers[i].contains(layer)) {
                    this._layers[i].removeLayer(layer, true);
                    return;
                }
            }
        }

        utils.error('The layer is not in the group');
    },
    
    contains: function(layer) {
        if (!(layer instanceof sGis.Layer) && !(layer instanceof sGis.LayerGroup)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
        
        for (var i = 0, l = this._layers.length; i < l; i++) {
            if (this._layers[i] instanceof sGis.LayerGroup && this._layers[i].contains(layer) || this._layers[i] === layer) {
                return true;
            }
        }
        return false;
    },
    
    indexOf: function(layer) {
        if (!(layer instanceof sGis.Layer) && !(layer instanceof sGis.LayerGroup)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
        
        return this._layers.indexOf(layer);
    },
    
    insertLayer: function(layer, index) {
        if (!(layer instanceof sGis.Layer) && !(layer instanceof sGis.LayerGroup)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
        if (!utils.isInteger(index)) utils.error('Integer is expected but got ' + index + ' instead');
        
        var length = this._layers.length;
        index = index > length ? length : index < 0 && index < -length ? -length : index;
        if (index < 0) index = length + index;
        
        var currIndex = this._layers.indexOf(layer);
        
        if (currIndex === -1) {
            this.prohibitEvent('layerAdd');
            this.addLayer(layer);
            this.allowEvent('layerAdd');
            currIndex = this._layers.length - 1;
            var added = true;
        }
        
        this._layers.splice(currIndex, 1);
        this._layers.splice(index, 0, layer);
        if (added) this.fire('layerAdd', {layer: layer});
    }
};

utils.mixin(sGis.LayerGroup.prototype, sGis.IEventHandler.prototype);

Object.defineProperties(sGis.LayerGroup.prototype, {
    layers: {
        get: function() {
            return [].concat(this._layers);
        },
        
        set: function(layers) {
            if (!utils.isArray(layers)) utils.error('Array is expected but got ' + layers + ' instead');
            this._layers = [];
            for (var i = 0, l = layers.length; i < l; i++) {
                this.addLayer(layers[i]);
            }
        }
    }
});
    
})();

'use strict';

(function() {

sGis.Map = function(options) {
    if (options && options.crs) initializeCrs(this, options.crs);
    utils.init(this, options);
    this._layerGroup = new sGis.LayerGroup(options ? options.layers : undefined);
};

sGis.Map.prototype = {
    _crs: sGis.CRS.webMercator,
    _animate: true,
    _position: new sGis.Point(55.755831, 37.617673).projectTo(sGis.CRS.webMercator),
    _resolution: 611.4962262812505 / 2,
    _wrapper: null,
    _autoUpdateSize: true,

    /**
     * Sets the size of map equal to size of its wrapper
     */
    updateSize: function() {
        var resolution = this.resolution,
            bbox = this.bbox,
            width = this._parent.clientWidth,
            height = this._parent.clientHeight;
        
        if (!width || ! height) return;
        
        this._wrapper.style.height = this._layerWrapper.style.height = height + 'px';
        this._wrapper.style.width = this._layerWrapper.style.width = width + 'px';
        
        if (bbox) {
            var p1 = new sGis.Point(bbox.p[0].x, bbox.p[1].y - this.height * resolution, this.crs),
                p2 = new sGis.Point(bbox.p[0].x + this.width * resolution, bbox.p[1].y, this.crs);
            this.__setBbox(p1, p2);
            this.forceUpdate();
        }
    },
    
    /**
     * Sets the bounding box (extent) of the map to the rectangle, limited by start and end points
     * @param {sGis.Point} startPoint
     * @param {sGis.Point} endPoint
     */
    __setBbox: function(startPoint, endPoint) {
        this._bbox = new sGis.Bbox(startPoint, endPoint);
        this.fire('bboxChange', {map: this});
    },
    
    /**
     * Adds a layer to the map
     * @param {sGis.Layer} layer
     */
    addLayer: function(layer) {
        this._layerGroup.addLayer(layer);

        if (this._painter) {
            this._painter.addLayer(layer);
        }
        
        this.fire('layerAdd', {layer: layer});
    },
    
    /**
     * Removes the layer from the map
     * @param {sGis.Layer} layer
     */
    removeLayer: function(layer) {
        this._layerGroup.removeLayer(layer);
        if (this._painter) this._painter.removeLayer(layer.id);
        this.fire('layerRemove', {layer: layer});
    },
    
    /**
     * Moves the map bounding box by the given number of pixels
     * @param {int} dx - Offset along X axis in pixels, positive direction is right
     * @param {int} dy - Offset along Y axis in pisels, positive direction is down
     */
    move: function(dx, dy) {
        for (var i in this._bbox.p) {
            this._bbox.p[i].x += dx;
            this._bbox.p[i].y += dy;
        }
        adjustCoordinates();
        this.fire('bboxChange', {map: this});
    },
    
    /**
     * Changes the scle of map by scalingK
     * @param {float} scalingK - Koefficient of scaling (Ex. 5 -> 5 times zoom in)
     * @param {sGis.Point} basePoint - /optional/ Base point of zooming
     */
    changeScale: function(scalingK, basePoint) {
        var resolution = this.resolution;
        this.setResolution(resolution * scalingK, basePoint);
    },
    
    /**
     * Changes the scle of map by scalingK with animation
     * @param {float} scalingK - Koefficient of scaling (Ex. 5 -> 5 times zoom in)
     * @param {sGis.Point} basePoint - /optional/ Base point of zooming
     */
    animateChangeScale: function(scalingK, basePoint) {
        if (this._animationTargetResolution) {
            var resolution = this._animationTargetResolution;
        } else {
            resolution = this.resolution;
        }
        this.animateSetResolution(resolution * scalingK, basePoint);
    },

    zoom: function(k, basePoint) {
        var tileScheme = this.tileScheme;
        var currResolution = this.resolution;
        var resolution;
        if (tileScheme) {
            for (var i in tileScheme.matrix) {
                var ratio = currResolution / tileScheme.matrix[i].resolution;
                if (ratio > 0.9) {
                    var newLevel = parseInt(i) + k;
                    while (!tileScheme.matrix[newLevel]) {
                        newLevel += k > 0 ? -1 : 1;
                    }
                    resolution = tileScheme.matrix[newLevel].resolution;
                    break;
                }
            }
        } else {
            resolution = currResolution * Math.pow(2, -k);
        }

        this.animateSetResolution(resolution, basePoint);
    },

    adjustResolution: function() {
        var resolution = this.resolution;
        var newResolution = this.getAdjustedResolution(resolution);
        var ratio = newResolution / resolution;
        if (ratio > 1.1 || ratio < 0.9) {
            this.animateSetResolution(newResolution);
            return true;
        } else if (ratio > 1.0001 || ratio < 0.9999) {
            this.setResolution(newResolution);
            return false;
        }
    },

    getAdjustedResolution: function(resolution) {
        var tileScheme = this.tileScheme;
        if (tileScheme) {
            var minDifference = Infinity;
            var index;
            for (var i in tileScheme.matrix) {
                var difference = Math.abs(resolution - tileScheme.matrix[i].resolution);
                if (difference < minDifference) {
                    minDifference = difference;
                    index = i;
                }
            }
            return tileScheme.matrix[index].resolution;
        } else {
            return resolution;
        }
    },

    /**
     * Sets new resolution to the map with animation
     * @param {float} resolution 
     * @param {sGis.Point} basePoint - /optional/ Base point of zooming
     * @returns {undefined}
     */
    animateSetResolution: function(resolution, basePoint) {      
        var bbox = getScaledBbox(this, resolution, basePoint);
        this._painter.animateTo(bbox);
        this.fire('animationStart', {targetBbox: bbox});
        this._resolutionChanged = true;
    },
    
    /**
     * Sets new resolution to the map
     * @param {float} resolution
     * @param {sGis.Point} basePoint - /optional/ Base point of zooming
     */
    setResolution: function(resolution, basePoint) {
        var bbox = getScaledBbox(this, resolution, basePoint);
        this.__setBbox(bbox.p[0], bbox.p[1]);
        this._resolutionChanged = true;
    },
    
    /**
     * Returns the pixel offset of the point from the left top corner of the map
     * @param {type} point
     * @returns {object} - {x: X offset, y: Y offset}
     */
    getPxPosition: function(point) {
        var p = point instanceof sGis.Point ? point.projectTo(this.crs) : {x: point[0], y: point[1]},
            resolution = this.resolution,
            bbox = this.bbox;
        var pxPosition = {
                x: (p.x - bbox.p[0].x) / resolution,
                y: (bbox.p[1].y - p.y) / resolution
            };
        return pxPosition;
    },
    
    /**
     * Returns a new point, that corresponds to the specified position on the screen
     * @param {int} x - X offset from the map left side
     * @param {int} y - Y offset from the map top side
     * @returns {sGis.Point}
     */
    getPointFromPxPosition: function(x, y) {
        var resolution = this.resolution,
            bbox = this.bbox;
        return new sGis.Point(
            bbox.p[0].x + x * resolution,
            bbox.p[1].y - y * resolution,
            this.crs
        );
    },
    
    /**
     * If map is in process of animation, the 'animationEnd' event is not fired
     */
    cancelAnimation: function() {
        this._cancelAnimation = true;
        this._painter.cancelAnimation();
    },
    
    /**
     * Updates the display of the map
     */
    update: function() {
        var map = this;
        if (!this._updateTimer) {
            if (map._painter) map._painter.update();
            this._updateTimer = setTimeout((function(map) {return function() {
                if (map._painter && map._needUpdate) map._painter.update();
                map._updateTimer = null;
                map._needUpdate = false;
            };
            })(this), 300);
        } else {
            map._needUpdate = true;
        }
    },
    
    forceUpdate: function() {
        this._painter.update();
    },
    
    /**
     * Updates the specified layer
     * @param {sGis.Layer} layer
     */
    redrawLayer: function(layer) {
        if (this._painter) this._painter.updateLayer(layer);
    },

    moveLayerToIndex: function(layer, index) {
        var add = !this._layerGroup.contains(layer);
        this._layerGroup.insertLayer(layer, index);
        if (add) {
            if (this._painter) this._painter.addLayer(layer);
            this.fire('layerAdd', {layer: layer});
        }
        this.fire('layerOrderChange', {layer: layer});
    },
    
    /**
     * Returns the order of the layer on the map
     * @param {type} layer
     * @returns {int}
     */
    getLayerIndex: function(layer) {
        return this._layerGroup.indexOf(layer);
    },
    
    _defaultHandlers: {
        bboxChange: function(mapEvent) {
            var map = mapEvent.map,
                layers = map.layers;
            if (layers && layers.length > 0) {
                map.cancelAnimation();
                map._painter.redraw();
                
                var animationStarted = map.adjustResolution();
                
                if (animationStarted) return;
                for (var i in layers) {
                    if (!layers[i].delayedUpdate) {
                        map._painter.updateLayer(layers[i]);
                    }
                }
            }

            var CHANGE_END_DELAY = 300;
            if (map._changeTimer) clearTimeout(map._changeTimer);
            map._changeTimer = setTimeout((function(map) {return function() {
                    map.fire('bboxChangeEnd', {map: map});
                    map._changeTimer = null;
            };})(map), CHANGE_END_DELAY);        
        },

        bboxChangeEnd: function(mapEvent) {
            var layers = this.layers;
            if (layers.length > 0) {
                if (this._resolutionChanged) {
                    this._painter.update();
                    this._resolutionChanged = false;
                } else {
                    for (var i in layers) {
                        if (layers[i].delayedUpdate) this._painter.updateLayer(layers[i]);
                    }
                }
            }
        },

        animationEnd: function(mapEvent) {
            var map = mapEvent.map;
            delete map._animationTargetResolution;
        },

        click: function(sGisEvent) {

        },

        dblclick: function(sGisEvent) {
            var center = this.getPointFromPxPosition(sGisEvent.mouseOffset.x, sGisEvent.mouseOffset.y),
                resolution = this.resolution,
                width = this.width,
                height = this.height,
                startPoint = new sGis.Point(center.x - width * resolution / 8, center.y - height * resolution / 8, center.crs),
                endPoint = new sGis.Point(center.x + width * resolution / 8, center.y + height * resolution / 8, center.crs),
                newBbox = new sGis.Bbox(startPoint, endPoint);

            this._painter.animateTo(newBbox);
            this._resolutionChanged = true;
        },

        mousemove: function(sGisEvent) {

        },
        
        mouseout: function(sGisEvent) {

        },

        layerAdd: function(sGisEvent) {
            this.update();
        },

        layerRemove: function(sGisEvent) {

        },
        
        layerOrderChange: function(sGisEvent) {
            this.update();
        },
        
        dragStart: function(sGisEvent) {
            this._draggingObject = sGisEvent.draggingObject || this;
        },
        
        drag: function(sGisEvent) {
            this.move(sGisEvent.offset.x, sGisEvent.offset.y);
        },
        
        dragEnd: function(sGisEvent) {
            this._draggingObject = null;
        },

        contextmenu: function(sGisEvent) {
            
        }
    }
};

Object.defineProperties(sGis.Map.prototype, {
    bbox: {
        get: function() {
            if (this._wrapper) {
                if (!this._bbox) {
                    return undefined;
                } else if (this._bbox.p[0].crs !== this.crs && (!this._bbox.p[0].crs.from || !this.crs.from)) {
                    this._bbox = new sGis.Bbox(new sGis.Point(0 - this.width / 2, 0 - this.height / 2, this.crs), new sGis.Point(this.width / 2, this.height / 2, this.crs));
                    return this._bbox;
                } else {
                    return this._bbox.projectTo(this.crs);
                }
            } else {
                return undefined;
            }
        }
    },
    
    layers: {
        get: function() {
            if (this._layerGroup) {
                return this._layerGroup.layers;
            } else {
                return [];
            }
        },
        
        set: function(layers) {
            var layers = this.layers;
            for (var i = 0; i < layers.length; i++) {
                this.removeLayer(layers[i]);
            }
            for (i = 0; i < layers.length; i++) {
                this.addLayer(layers[i]);
            }
        } 
    },
    
    crs: {
        get: function() {
            return this._crs;
        },
        set: function(crs) {
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            
            var currentCrs = this._crs;
            this._crs = crs;
            
            if (currentCrs !== crs && (!currentCrs.to || !crs.to)) {
                this.position = new sGis.Point(0, 0, crs);
            } else {
                this.position = this.position.projectTo(crs);
            }
        }
    },

    layerWrapper: {
        get: function() {
            return this._layerWrapper;
        }
    },
    
    resolution: {
        get: function() {
            if (this.bbox) {
                var bbox = this.bbox;
                return (bbox.p[1].x - bbox.p[0].x) / this.width || this._resolution;
            } else {
                return this._resolution;
            }
        },
        
        set: function(resolution) {
            if (!utils.isNumber(resolution) || resolution <= 0) utils.error('Positive number is expected but got ' + resolution + ' instead');
            
            if (this.wrapper) {
                this.setResolution(resolution);
            } else {
                this._resolution = resolution;
            }
        }
    },
    
    height: {
        get: function() {
            return this._wrapper ? this._wrapper.clientHeight || this._wrapper.offsetWidth : undefined;
        }
    },
    
    width: {
        get: function() {
            return this._wrapper ? this._wrapper.clientWidth || this._wrapper.offsetWidth : undefined;
        }
    },
    
    wrapper: {
        get: function() {
            return this._wrapper;
        },
        
        set: function(wrapperId) {
            if (!utils.isString(wrapperId) && wrapperId !== null) utils.error('String or null value expected but got ' + wrapperId + ' instead');
            if (this._wrapper) {
                this._parent.removeChild(this._wrapper);
            }
            if (wrapperId !== null) {
                setDOMstructure(wrapperId, this);
                this.updateSize();

                if (this._position) {
                    this.prohibitEvent('bboxChange');
                    this.position = this._position;
                    this.allowEvent('bboxChange');
                    delete this._position;
                    delete this._resolution;
                }

                this._painter = new utils.Painter(this);
                setEventHandlers(this);
                
                this.fire('wrapperSet');
            } else {
                this._wrapper = null;
                delete this._layerWrapper;
                delete this._parent;
                delete this._painter;
            }
        }
    },
    
    position: {
        get: function() {
            if (this.bbox) {
                var bbox = this.bbox;
                return new sGis.Point(
                    (bbox.p[1].x + bbox.p[0].x) / 2,
                    (bbox.p[1].y + bbox.p[0].y) / 2,
                    this.crs
                );
            } else {
                return this._position.projectTo(this.crs);
            }
        },
        
        set: function(position) {
            if (this.wrapper) {
                var height = this.height,
                    width = this.width,
                    crs = this.crs,
                    center = position.projectTo(crs),
                    startPoint = new sGis.Point(center.x - width / 2 * this.resolution, center.y - height / 2 * this.resolution, crs),
                    endPoint = new sGis.Point(center.x + width / 2 * this.resolution, center.y + height / 2 * this.resolution, crs);
                this.__setBbox(startPoint, endPoint);
            } else {
                this._position = position.projectTo(this.crs);
                this._resolution = this.resolution;
            }            
        }
    },

    tileScheme: {
        get: function() {
            var layers = this.layers;
            var tileScheme = null;
            for (var i = 0, len = layers.length; i < len; i++) {
                if (layers[i] instanceof sGis.TileLayer) {
                    tileScheme = layers[i].tileScheme;
                    break;
                }
            }
            return tileScheme;
        }
    }
});

utils.mixin(sGis.Map.prototype, sGis.IEventHandler.prototype);

function initializeCrs(map, crs) {
    if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
    map._crs = crs;
    if (!crs.from) {
        map._position = new sGis.Point(0, 0, crs);
    } else {
        map._position = map._position.projectTo(crs);
    }
}

function setDOMstructure(parentId, map) {
    var parent = document.getElementById(parentId);
    if (!parent) utils.error('The element with ID "' + parentId + '" could not be found. Cannot create a Map object');
    
    var wrapper = document.createElement('div');
    wrapper.className = 'sGis-mapWrapper';
    wrapper.id = 'mapWrapper';
    wrapper.map = map;
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    parent.appendChild(wrapper);
    parent.map = map;
    
    var layerWrapper = document.createElement('div');
    layerWrapper.className = 'sGis-layerWrapper';
    layerWrapper.style.position = 'absolute';
    wrapper.appendChild(layerWrapper);
    
    map._parent = parent;
    map._wrapper = wrapper;
    map._eventWrapper = parent;
    map._layerWrapper = layerWrapper;
}

function getScaledBbox(map, resolution, basePoint) {
    var crs = map.crs;
   
    basePoint = basePoint ? basePoint.projectTo(crs) : map.position;
    
    var currResolution = map.resolution,
        scalingK = resolution / currResolution,
        bbox = map.bbox,
        startPoint = new sGis.Point(
                basePoint.x - (basePoint.x - bbox.p[0].x) * scalingK,
                basePoint.y - (basePoint.y - bbox.p[0].y) * scalingK,
                crs
            ),
        endPoint = new sGis.Point(
                basePoint.x + (bbox.p[1].x - basePoint.x) * scalingK,
                basePoint.y + (bbox.p[1].y - basePoint.y) * scalingK,
                crs
            );
    return new sGis.Bbox(startPoint, endPoint, crs);
}

function setEventHandlers(map) {
    Event.add(map._eventWrapper, 'mousedown', onmousedown);
    Event.add(map._eventWrapper, 'wheel', onwheel);
    Event.add(map._eventWrapper, 'touchstart', ontouchstart);
    Event.add(map._eventWrapper, 'touchmove', ontouchmove);
    Event.add(map._eventWrapper, 'touchend', ontouchend);
    Event.add(map._eventWrapper, 'click', onclick);
    Event.add(map._eventWrapper, 'dblclick', ondblclick);
    Event.add(map._eventWrapper, 'mousemove', onmousemove);
    Event.add(map._eventWrapper, 'mouseout', onmouseout);
    Event.add(map._eventWrapper, 'contextmenu', oncontextmenu);
    Event.add(document, 'keydown', function(event) { map.fire('keydown', { browserEvent: event }); });
    Event.add(document, 'keypress', function(event) {
        map.fire('keypress', {browserEvent: event});
    });
    Event.add(document, 'keyup', function(event) {map.fire('keyup', {browserEvent: event});});
    Event.add(window, 'resize', function() {
        if (map._autoUpdateSize && (map._parent.clientHight !== map._wrapper.clientHeight || map._parent.clientWidth !== map._wrapper.clientWidth) ) {
            map.updateSize();
        }
    });
    
}

function onmouseout(event) {
    var map = event.currentTarget.map,
        offset = getMouseOffset(event.currentTarget, event),
        point = map.getPointFromPxPosition(offset.x, offset.y);
    
    event.currentTarget.map.fire('mouseout', {position: offset, point: point});
}

function onmousemove(event) {
    event.currentTarget.map.fire('mousemove', {map: event.currentTarget.map, mouseOffset: getMouseOffset(event.currentTarget, event), ctrlKey: event.ctrlKey});
}

var touchHandler = {scaleChanged: false};

function ontouchstart(event) {
    if (!event.currentTarget.dragPrevPosition) event.currentTarget.dragPrevPosition = {};
    for (var i in event.changedTouches) {
        var touch = event.changedTouches[i];
        event.currentTarget.dragPrevPosition[touch.identifier] = {x: touch.pageX, y: touch.pageY};
        event.currentTarget._lastDrag = {x: 0, y: 0};
    }
}

function ontouchmove(event) {
    var map = event.currentTarget.map;
    if (event.touches.length === 1 && event.currentTarget._lastDrag) {
        var touch = event.targetTouches[0],
            dxPx = event.currentTarget.dragPrevPosition[touch.identifier].x - touch.pageX,
            dyPx = event.currentTarget.dragPrevPosition[touch.identifier].y - touch.pageY,
            resolution = map.resolution,
            touchOffset = getMouseOffset(event.currentTarget, touch),
            point = map.getPointFromPxPosition(touchOffset.x, touchOffset.y),
            position = {x: point.x / resolution, y: 0 - point.y / resolution};

        if (event.currentTarget._lastDrag.x === 0 && event.currentTarget._lastDrag.y === 0) {
            map.fire('dragStart', {point: point, position: position, offset: {xPx: dxPx, yPx: dyPx, x: event.currentTarget._lastDrag.x, y: event.currentTarget._lastDrag.y}});
        }

        map._lastDrag = {x: dxPx * resolution, y: 0 - dyPx * resolution};
//        map.move(map._lastDrag.x, map._lastDrag.y);
        map._draggingObject.fire('drag', {point: point, position: position, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}});
        
        event.currentTarget.dragPrevPosition[touch.identifier].x = touch.pageX;
        event.currentTarget.dragPrevPosition[touch.identifier].y = touch.pageY;
    } else if (event.touches.length === 2) {
        map._lastDrag = null;
        touchHandler.scaleChanged = true;
        var touch1 = event.touches[0],
            touch2 = event.touches[1];
    
        touch1.prevPosition = event.currentTarget.dragPrevPosition[touch1.identifier];
        touch2.prevPosition = event.currentTarget.dragPrevPosition[touch2.identifier];
        
        var x11 = touch1.prevPosition.x,
            x12 = touch1.pageX,
            x21 = touch2.prevPosition.x,
            x22 = touch2.pageX,
            baseX = (x11 - x12 - x21 + x22) === 0 ? (x11 + x21) / 2 : (x11*x22 - x12*x21) / (x11 - x12 - x21 + x22),
            y11 = touch1.prevPosition.y,
            y12 = touch1.pageY,
            y21 = touch2.prevPosition.y,
            y22 = touch2.pageY,
            baseY = (y11 - y12 - y21 + y22) === 0 ? (y11 + y21) / 2 : (y11*y22 - y12*y21) / (y11 - y12 - y21 + y22),
            len1 = Math.sqrt(Math.pow(x11 - x21, 2) + Math.pow(y11 - y21, 2)),
            len2 = Math.sqrt(Math.pow(x12 - x22, 2) + Math.pow(y12 - y22, 2));
        
        map.prohibitEvent('bboxChange');
        map.changeScale(len1/len2, map.getPointFromPxPosition(baseX, baseY));
        map.allowEvent('bboxChange');
        
        map._painter.redraw();

        event.currentTarget.dragPrevPosition[touch1.identifier].x = touch1.pageX;
        event.currentTarget.dragPrevPosition[touch1.identifier].y = touch1.pageY;
        event.currentTarget.dragPrevPosition[touch2.identifier].x = touch2.pageX;
        event.currentTarget.dragPrevPosition[touch2.identifier].y = touch2.pageY;
    }
    event.preventDefault();
}

function ontouchend(event) {
    for (var i in event.changedTouches) {
        delete event.currentTarget.dragPrevPosition[event.changedTouches[i].identifier];
    }

    event.currentTarget._lastDrag = null;

    var map = event.currentTarget.map;
    if (touchHandler.scaleChanged) {
        map.fire('bboxChange', {map: map});
        touchHandler.scaleChanged = false;
    } else {
        map.fire('dragEnd');
    }
}

function onclick(event) {
    if (mouseHandler.clickCatcher && !isFormElement(event.target)) {
        var map = event.currentTarget.map,
            mouseOffset = getMouseOffset(event.currentTarget, event),
            point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
            position = {x: point.x / map.resolution, y: - point.y / map.resolution};
        map.fire('click', {map: map, mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position});
    }
}

function oncontextmenu(event) {
    var map = event.currentTarget.map,
        mouseOffset = getMouseOffset(event.currentTarget, event),
        point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
        position = { x: point.x / map.resolution, y: -point.y / map.resolution };
    map.fire('contextmenu', { mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position });
    //event.preventDefault();
}

function ondblclick(event) {
    if (!isFormElement(event.target)) {
        mouseHandler.clickCatcher = null;
        var map = event.currentTarget.map,
            mouseOffset = getMouseOffset(event.target, event),
            point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
            position = {x: point.x / map.resolution, y: - point.y / map.resolution};    
        map.fire('dblclick', {map: map, mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position});
    }
}

function onwheel(event) {
    var map = event.currentTarget.map,
        wheelDirection = getWheelDirection(event),
        mouseOffset = getMouseOffset(event.currentTarget, event);
    
    map.zoom(wheelDirection, map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y));

    event.preventDefault();
    return false;
}

var mouseHandler = {
    dragPosition: null,
    activeObject: null,
    clickCatcher: null
};

function onmousedown(event) {
    if (!isFormElement(event.target)) {
        mouseHandler.clickCatcher = true;
        if (event.which === 1) {
            mouseHandler.dragPosition = getMouseOffset(event.currentTarget, event);
            mouseHandler.activeObject = event.currentTarget.map;

            Event.add(document, 'mousemove', onDocumentMousemove);
            Event.add(document, 'mouseup', onDocumentMouseup);

            document.ondragstart = function() {return false;};
            document.body.onselectstart = function() {return false;};
        }
        return false;
    }
}

function onDocumentMousemove(event) {
    var map = mouseHandler.activeObject,    
        mousePosition = getMouseOffset(map._wrapper, event),
        dxPx = mouseHandler.dragPosition.x - mousePosition.x,
        dyPx = mouseHandler.dragPosition.y - mousePosition.y,
        resolution = map.resolution,
        point = map.getPointFromPxPosition(mousePosition.x, mousePosition.y),
        position = {x: point.x / resolution, y: - point.y / resolution};        
    
    if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2 || !mouseHandler.clickCatcher) {
        map._lastDrag = {x: dxPx * resolution, y: 0 - dyPx * resolution};
        
        if (mouseHandler.clickCatcher) {
            mouseHandler.clickCatcher = null;
            map.fire('dragStart', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}});
        }
        
//        map.move(map._lastDrag.x, map._lastDrag.y);

        mouseHandler.dragPosition = mousePosition;
        map._draggingObject.fire('drag', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}});
    }
}

function onDocumentMouseup(event) {
    var map = mouseHandler.activeObject;
    Event.remove(document, 'mousemove', onDocumentMousemove);
    Event.remove(document, 'mouseup', onDocumentMouseup);
    document.ondragstart = null;
    document.body.onselectstart = null;
    
    if (mouseHandler.activeObject._draggingObject) mouseHandler.activeObject._draggingObject.fire('dragEnd');
    
    map._draggingObject = null;
    map._lastDrag = null;
    
    mouseHandler.activeObject._draggingObject = null;
    mouseHandler.activeObject = null;
}

function adjustCoordinates(map) {

}

function isFormElement(e) {
    var formElements = ['BUTTON', 'INPUT', 'LABEL', 'OPTION', 'SELECT', 'TEXTAREA'];
    for (var i in formElements) {
        if (e.tagName === formElements[i]) return true;
    }
    return false;
}

})();
'use strict';

(function() {

var standardTileScheme = (function() {
    var scheme = {
        tileWidth: 256,
        tileHeight: 256,
        dpi: 96,
        origin: {
            x: -20037508.342787,
            y: 20037508.342787
        },
        matrix: {
            '0': {
                resolution: 156543.03392800014,
                scale: 591657527.591555
            }
        }
    };
    
    for (var i = 1; i < 20; i ++) {
        scheme.matrix[i] = {
            resolution: scheme.matrix[i-1].resolution / 2,
            scale: scheme.matrix[i-1].scale / 2
        };
    }
    
    return scheme;
})();


sGis.TileLayer = function(tileSource, options) {
    if (!tileSource || !utils.isString(tileSource)) utils.error('URL string is expected but got ' + tileSource + ' instead');
    this.__initialize();
    utils.init(this, options);
    
    this._source = tileSource;
    this._tiles = [];
};

sGis.TileLayer.prototype = new sGis.Layer({
    _tileScheme: standardTileScheme,
    _crs: sGis.CRS.webMercator,
    _cycleX: true,
    _cycleY: false,
    
    getTileUrl: function(xIndex, yIndex, scale) {
        var url = this._source;
        return url.replace('{x}', xIndex).replace('{y}', yIndex).replace('{z}', scale);
    },
    
    getObjectArray: function(bbox, resolution) {
        if (!this._display || bbox.p[0].crs !== this.crs && (!bbox.p[0].crs.from || !this.crs.from)) return {};
        var scale = getScaleLevel(this, resolution),
            baseBbox = {
                minX: this._tileScheme.origin.x,
                maxY: this._tileScheme.origin.y,
                maxX: this._tileScheme.origin.x + this._tileScheme.tileWidth * this._tileScheme.matrix[0].resolution,
                minY: this._tileScheme.origin.y - this._tileScheme.tileHeight * this._tileScheme.matrix[0].resolution
            };

        var tiles = this._tiles,
            layerCrs = this.crs,
            objArray = {},
            scaleAdj = 2 << (scale - 1);

        bbox = bbox.projectTo(layerCrs);

        var layerResolution = getResolution(this, scale),
            xStartIndex = Math.floor((bbox.p[0].x - baseBbox.minX) / this.tileWidth / layerResolution),
            xEndIndex = Math.ceil((bbox.p[1].x - baseBbox.minX) / this.tileWidth / layerResolution),
            yStartIndex = Math.floor((baseBbox.maxY - bbox.p[1].y) / this.tileHeight / layerResolution),
            yEndIndex = Math.ceil((baseBbox.maxY - bbox.p[0].y) / this.tileHeight / layerResolution);

        if (!tiles[scale]) tiles[scale] = [];

        for (var xIndex = xStartIndex; xIndex < xEndIndex; xIndex++) {
            var xIndexAdj = xIndex;
            if (this._cycleX && xIndexAdj < 0) xIndexAdj = xIndexAdj % scaleAdj + scaleAdj;
            if (this._cycleX && xIndexAdj >= scaleAdj) xIndexAdj = xIndexAdj % scaleAdj;

            if (!tiles[scale][xIndex]) tiles[scale][xIndex] = [];

            for (var yIndex = yStartIndex; yIndex < yEndIndex; yIndex++) {
                if (this._cycleY && yIndex >= Math.pow(2, scale) || yIndex <0) continue;

                if (!tiles[scale][xIndex][yIndex]) {
                    tiles[scale][xIndex][yIndex] = {
                        type: this.getObjectType(),
                        src: this.getTileUrl(xIndexAdj, yIndex, scale),
                        bbox: getTileBoundingBox(scale, xIndex, yIndex, this)
                    };
                }
                objArray[getTileId(xIndex, yIndex, scale)] = tiles[scale][xIndex][yIndex];
            }
        }
        return objArray;
    },

    getObjectType: function() {
        return 'img';
    }
});

Object.defineProperties(sGis.TileLayer.prototype, {
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            this._crs = crs;
        }
    },
    
    tileWidth: {
        get: function() {
            return this._tileScheme.tileWidth;
        }
    },
    
    tileHeight: {
        get: function() {
            return this._tileScheme.tileHeight;
        }
    },
    
    tileScheme: {
        get: function() {
            return this._tileScheme;
        },
        
        set: function(scheme) {
            if (!(scheme instanceof Object)) utils.error('Object is expected but got ' + scheme + ' instead');
            this._tileScheme = scheme;
        }
    },

    cycleX: {
        get: function() {
            return this._cycleX;
        },
        set: function(bool) {
            this._cycleX = bool;
        }
    },

    cycleY: {
        get: function() {
            return this._cycleY;
        },
        set: function(bool) {
            this._cycleY = bool;
        }
    }
});

function getScaleLevel(layer, resolution) {
    for (var i in layer._tileScheme.matrix) {
        if (resolution > layer._tileScheme.matrix[i].resolution && !utils.softEquals(resolution, layer._tileScheme.matrix[i].resolution)) return i === "0" ? 0 : i - 1;
    }
    return i;
}

function getResolution(layer, scale) {
    return layer._tileScheme.matrix[scale].resolution;
};

function getTileId(x, y, scale) {
    return scale + '/' + x + '/' + y;
}

function getTileBoundingBox(scale, xIndex, yIndex, layer) {
    var resolution = getResolution(layer, scale),
        startPoint = new sGis.Point(xIndex * layer.tileWidth * resolution + layer.tileScheme.origin.x, -(yIndex + 1) * layer.tileHeight * resolution + layer.tileScheme.origin.y, layer.crs),
        endPoint = new sGis.Point((xIndex + 1) * layer.tileWidth * resolution + layer.tileScheme.origin.x, -yIndex * layer.tileHeight * resolution + layer.tileScheme.origin.y, layer.crs);

    return new sGis.Bbox(startPoint, endPoint);
}

})();'use strict';

(function() {

sGis.DynamicLayer = function(extention) {
    if (!extention.getImageUrl) utils.error('sGis.DynamicLayer child class must include .getImageUrl(bbox, resolution) method');
    for (var key in extention) {
        this[key] = extention[key];
    }
};

sGis.DynamicLayer.prototype = new sGis.Layer({
    _layers: [],
    _delayedUpdate: true,
    _crs: null,
    
    getObjectArray: function(bbox, resolution) {
        if (!this._display) return {};
        var url = this.getImageUrl(bbox, resolution),
            returnObj = {};
    
        if (url) {
            returnObj[url] = {
                type: 'img',
                src: url,
                bbox: bbox
            };
        }
        
        return returnObj;
    },
    
    getObjectType: function() {
        return 'img';
    },
    
    showSubLayer: function(id) {
        if (this._serverConnector) {
            this._serverConnector.showLayer(id);
        }
    },
    
    hideSubLayer: function(id) {
        if (this._serverConnector) {
            this._serverConnector.hideLayer(id);
        }
    },
    
    showLayers: function(layerArray) {
        if (layerArray) this._layers = layerArray;
    },
    
    getDisplayedLayers: function() {
        return this._layers;
    }
});

Object.defineProperties(sGis.DynamicLayer.prototype, {
    layers: {
        get: function() {
            return this._layers;
        },
        set: function(layers) {
            if (!utils.isArray(layers)) utils.error('Array is expected but got ' + layers + ' instead');
            this._layers = layers;
        }
    },
    
    crs: {
        get: function() {
            return this._crs;
        },
        set: function(crs) {
            if (crs && !(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            this._crs = crs;
        }
    }
});

})();'use strict';

(function() {
    
sGis.FeatureLayer = function(options) {
    utils.initializeOptions(this, options);
    this.__initialize();
    
    this._features = [];
    if (options && options.features) this.add(options.features);
};

sGis.FeatureLayer.prototype = new sGis.Layer({
    _delayedUpdate: true,
    
    getObjectArray: function(bbox, resolution) {
        if (!bbox || !(bbox instanceof sGis.Bbox) || !resolution || parseFloat(resolution) === NaN) utils.error('Expected (bbox, resolution), but got (' + bbox + ', ' + resolution + 'instead');
        if (!this._display) return {};
        var obj = [];
        for (var i in this._features) {
            if (this._features[i].crs !== bbox.p[0].crs && !(this._features[i].crs.to && bbox.p[0].crs.to)) continue;
            var featureBbox = this._features[i].bbox;
            if (!featureBbox || bbox.intersects(featureBbox)) obj.push(this._features[i]);
        }
        return obj;
    },
    
    add: function(features) {
        if (features instanceof sGis.Feature) {
            this._features.push(features);
            this.fire('featureAdd', {feature: features});
        } else if (utils.isArray(features)) {
            for (var i in features) {
                this.add(features[i]);
            }
        } else {
            utils.error('sGis.Feature instance or their array is expected but got ' + features + 'instead');
        }
    },
    
    remove: function(feature) {
        if (!(feature instanceof sGis.Feature)) utils.error('sGis.Feature instance is expected but got ' + feature + 'instead');
        var index = this._features.indexOf(feature);
        if (index === -1) utils.error('The feature does not belong to the layer');
        this._features.splice(index, 1);
        this.fire('featureRemove', {feature: feature});
    }
});

Object.defineProperties(sGis.FeatureLayer.prototype, {
    features: {
        get: function() {
            return [].concat(this._features);
        },
        
        set: function(features) {
            this._features = features;
        }
    }
});
    
})();
'use strict';

(function() {
    
sGis.ESRIDynamicLayer = function(source, options) {
    if (!source) {
        error('The source of dynamic service is not specified');
    }
    
    this.__initialize();
    
    utils.init(this, options);
    this._source = source;
};

sGis.ESRIDynamicLayer.prototype = new sGis.DynamicLayer({
    _additionalParameters: null,
    
    getImageUrl: function(bbox, resolution) {
        var imgWidth = Math.round((bbox.p[1].x - bbox.p[0].x) / resolution),
            imgHeight = Math.round((bbox.p[1].y - bbox.p[0].y) / resolution),
            layersString = getLayersString(this.getDisplayedLayers()),
            sr = encodeURIComponent(bbox.p[0].crs.ESRIcode || bbox.p[0].crs.description),
            layerDefs = this._layerDefs ? '&layerDefs=' + encodeURIComponent(this._layerDefs) + '&' : '',
            
            url = this._source + 'export?' +
                'dpi=96&' +
                'transparent=true&' +
                'format=png8&' +
                'bbox='+
                    bbox.p[0].x + '%2C' +
                    bbox.p[0].y + '%2C' +
                    bbox.p[1].x + '%2C' +
                    bbox.p[1].y + '&' +
                'bboxSR=' + sr + '&' +
                'imageSR=' + sr + '&' +
                'size=' + imgWidth + '%2C' + imgHeight + '&' +
                layersString + '&' +
                layerDefs +
                'f=image';
        
        if (this._forceUpdate) {
            url += '&ts=' + new Date().valueOf();
        }
        
        if (this._additionalParameters) {
            url += '&' + this._additionalParameters;
        }

        return url;
    },
    
    forceUpdate: function() {
        this._forceUpdate = true;
    }
});

Object.defineProperties(sGis.ESRIDynamicLayer.prototype, {
    layerDefinitions: {
        set: function(layerDefs) {
            this._layerDefs = layerDefs;
            this.fire('propertyChange', {property: 'layerDefinitions'});
        }
    },
    
    additionalParameters: {
        get: function() {
            return this._additionalParameters;
        },
        
        set: function(param) {
            this._additionalParameters = param;
        }
    }
});
    
function getLayersString(layers) {
    if (layers.length === 0) return '';
    return 'layers=show:' + layers.join('%2C') + '&';
}
    
})();
'use strict';

(function() {
    
sGis.decorations = {};
    
sGis.decorations.Scale = function(map, options) {
    utils.init(this, options);
    this._map  = map;
    this.updateDisplay();
};

sGis.decorations.Scale.prototype = {
    _plusImageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAk0lEQVR4nO2XsQ2EMAxFHycKJrkSxvAETMkEGeMob5KUVFBQGCdCcvN/G8d6kuWnBJIztF4opXyBzSlZzewf7Te2AgATMD+ch/PpAHg1AhCAAAQwwKXXqMEeVQxEVVxPFW/4em2JB3fPnj4CAQggHeBcw5UkD/S8CWfg55QsZrZH+6WPQAACEIAAej6nFfBMV1uaHQE1GEAKbB76AAAAAElFTkSuQmCC',
    _minusImageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFpJREFUeNrs2LENwDAIAEETZTaGZjmsrODGQrkv6E+igejuNblnDQ8AAAAAAAAAAAAA4L+A9xtVNe4sy8ywQgAAAAAAALcLz10AAAAAAAAAAAAAAACAs7YAAwDJuQpbR1QAogAAAABJRU5ErkJggg==',
    _xAlign: 'left',
    _yAlign: 'top',
    _xOffset: 32,
    _yOffset: 32,
    _width: 32,
    _height: 32,
    _horizontal: false,
    _css: 'sGis-decorations-button',
    _plusCss: '',
    _minusCss: '',
    
    updateDisplay: function() {
        if (this._buttons) {
            this._map.wrapper.removeChild(this._buttons.plus);
            this._map.wrapper.removeChild(this._buttons.minus);
        }
        
        var buttons = {
            plus: getButton(this._plusImageSrc, this, this._plusCss),
            minus: getButton(this._minusImageSrc, this, this._minusCss)
        };
        
        if (this._horizontal) {
            var but = this._xAlign === 'right' ? 'plus' : 'minus';
            buttons[but].style[this._xAlign] = this._xOffset + this._width + 4 + 'px';
        } else {
            var but = this._yAlign === 'bottom' ? 'plus' : 'minus';
            buttons[but].style[this._yAlign] = this._yOffset + this._height + 4 + 'px';
        }
        
        var map = this._map;
        buttons.plus.onclick = function(e) {
            map.animateChangeScale(0.5);
            e.stopPropagation();
        };
        buttons.minus.onclick = function(e) {
            map.animateChangeScale(2);
            e.stopPropagation();
        };

        buttons.plus.ondblclick = function(e) {
            e.stopPropagation();
        };
        buttons.minus.ondblclick = function(e) {
            e.stopPropagation();
        };
        
        if (map.wrapper) {
            map.wrapper.appendChild(buttons.plus);
            map.wrapper.appendChild(buttons.minus);
        } else {
            map.addListner('wrapperSet', function() {
                map.wrapper.appendChild(buttons.plus);
                map.wrapper.appendChild(buttons.minus);
            });
        }
    }
};

Object.defineProperties(sGis.decorations.Scale.prototype, {
    map: {
        get: function() {
            return this._map;
        }
    },
    
    plusImageSrc: {
        get: function() {
            return this._plusImageSrc;
        },
        set: function(src) {
            utils.validateString(src);
            this._plusImageSrc = src;
        }
    },
    
    minusImageSrc: {
        get: function() {
            return this._minusImageSrc;
        },
        set: function(src) {
            utils.validateString(src);
            this._minusImageSrc = src;
        }
    },
    
    xAlign: {
        get: function() {
            return this._xAlign;
        },
        set: function(align) {
            utils.validateValue(align, ['left', 'right']);
            this._xAlign = align;
        }
    },
    
    yAlign: {
        get: function() {
            return this._yAlign;
        },
        set: function(align) {
            utils.validateValue(align, ['top', 'bottom']);
            this._yAlign = align;
        }
    },
    
    xOffset: {
        get: function() {
            return this._xOffset;
        },
        set: function(offset) {
            utils.validateNumber(offset);
            this._xOffset = offset;
        }
    },
    
    yOffset: {
        get: function() {
            return this._yOffset;
        },
        set: function(offset) {
            utils.validateNumber(offset);
            this._yOffset = offset;
        }
    },
    
    width: {
        get: function() {
            return this._width;
        },
        set: function(width) {
            utils.validatePositiveNumber(width);
            this._width = width;
        }
    },
    
    height: {
        get: function() {
            return this._height;
        },
        set: function(height) {
            utils.validatePositiveNumber(height);
            this._height = height;
        }
    },
    
    horizontal: {
        get: function() {
            return this._horizontal;
        },
        set: function(bool) {
            utils.validateBool(bool);
            this._horizontal = bool;
        }
    },
    
    css: {
        get: function() {
            return this._css;
        },
        set: function(css) {
            utils.validateString(css);
            this._css = css;
        }
    },

    plusCss: {
        get: function() {
            return this._plusCss;
        },
        set: function(css) {
            utils.validateString(css);
            this._plusCss = css;
        }
    },

    minusCss: {
        get: function() {
            return this._minusCss;
        },
        set: function(css) {
            utils.validateString(css);
            this._minusCss = css;
        }
    }
});

function getButton(src, control, css) {
    var button = document.createElement('div');
    button.className = control.css + ' ' + css;
    button.style[control.xAlign] = control.xOffset + 'px';
    button.style[control.yAlign] = control.yOffset + 'px';
    button.style.width = control.width + 'px';
    button.style.height = control.height + 'px';
    button.style.position = 'absolute';
    button.style.backgroundSize = '100%';
    if (src) {
        button.style.backgroundImage = 'url(' + src + ')';
    }
    
    return button;
}
    
var defaultCss = '.sGis-decorations-button {border: 1px solid gray; background-color: #F0F0F0; border-radius: 5px; font-size: 32px; text-align: center;cursor: pointer;} .sGis-decorations-button:hover {background-color: #E0E0E0;}',
    buttonStyle = document.createElement('style');
buttonStyle.type = 'text/css';
if (buttonStyle.styleSheet) {
    buttonStyle.styleSheet.cssText = defaultCss;
} else {
    buttonStyle.appendChild(document.createTextNode(defaultCss));
}

document.head.appendChild(buttonStyle);

})();(function() {
    
sGis.Symbol = function(options) {
    for (var i in options) {
        this[i] = options[i];
    }
};

sGis.Symbol.prototype = {
    setDefaults: function(style) {
        this.defaults = {};
        for (var i in this.style) {
            Object.defineProperty(this.defaults, i, {
                get: this.style[i].get,
                set: this.style[i].set
            });
            this.defaults[i] = style && style[i] ? style[i] : this.style[i].defaultValue;
        }
    }
};

Object.defineProperties(sGis.Symbol.prototype, {

});

sGis.symbol = {
    point: {
        Point: function(style) {
            this.setDefaults(style);
        },
        
        Image: function(style) {
            this.setDefaults(style);
        },
        
        Square: function(style) {
            this.setDefaults(style);
        }
    }
};

sGis.symbol.point.Point.prototype = new sGis.Symbol({
    type: 'point',
    style: {
        size: {
            defaultValue: 10,
            get: function() {
                return this._size || this.defaults.size;
            },
            
            set: function(size) {
                if (!utils.isNumber(size) || size <=0) utils.error('Positive number is expected but got ' + size + ' instead');
                this._size = size;
            }
        },
        
        color: {
            defaultValue: 'black',
            get: function() {
                return this._color || this.defaults.color;
            },
            
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._color = color;
            }
        },
        
        offset: {
            defaultValue: {x: 0, y: 0},
            get: function() {
                return this._offset || this.defaults.offset;
            },
            set: function(point) {
                if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                this._offset = point;
            }
        }        
    },
    renderFunction: function(resolution, crs) {
        var feature = this.projectTo(crs),
            pxPosition = [feature._point[0] / resolution + this.style.offset.x, - feature._point[1] / resolution + this.style.offset.y];

        var point = new sGis.geom.Point(pxPosition, {color: this.style.color, size: this.style.size});
        return [point];        
    }
});

sGis.symbol.point.Image.prototype = new sGis.Symbol({
    type: 'point',
    style: {
        source: {
            defaultValue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAN5QTFRFAAAAAAAAAAAAAAAAji4jiCwhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKg4KJgwJxEAw20o040Up41hE5EYq5Ugs5kov50wx6E406GNR6GNS6GZV6GpY6G1c6G9f6HBg6HNj6HZm6Hlq6VA26X1t6YBx6Yd56lI56oN16ot96o6A6pGE61Q765WI65mN7J2R7KCV7VY+7aWa7lhA7qme7q2j71pC77Ko8FxF8Lat8Lqx8V5H8mBK8r+38sS982JM9GRO9WZR9mhT+GtW+W1Y+m9b+3Fd/HNf/XVi+RwEUgAAABF0Uk5TAAYHERYXHB0eIiM3OD1JSlRYXujgAAABPUlEQVQ4y2WS2ULCMBBFE0qxlWIdwI19EZBFFhFEUHBX/v+HTJtOmAnnqTn3hodwhYiQAFIwuJGw2/EGNxK2hcKW36AmDZuCYkNvUOPC+iJmjQ3JjITVZcJKNyzjwPIKWeobVDjCycLiGlmAlOyYdYTM5GB+g8yBHXKZ6CdVY3aL5PPmc6Zz3ZjeHTHFXDcm9xaTQ64b4wfGmOa6MXokjHiuG8Mnw9DOVcOHwbNhAL6Vq/frvRB6x/vovzL69j66bxZd2khD5/2IzqHhQvsDKRbNZxsbLrQ+kRawQ7Ko5hfShPMzdoz30fhG6hCe+jmoG9GIF1X7SahB6KWiNyUmXlT1N6Ya5frVjUkWVflTVHQuqDGLKu/3ZcyJIYsqlQ55ZMLIsEXRXBkvVIYuKhvQXIiUFwQndFGOY/+9aP4B2y1gaNteoqgAAAAASUVORK5CYII=',
            get: function() {
                return this._source || this.defaults.source;
            },
            set: function(source) {
                if (!utils.isString(source)) utils.error('String is expected but got ' + source + ' instead');
                
                this._image = new Image();
                this._image.src = source;
                this._source = source;
            }
        },
        
        size: {
            defaultValue: 32,
            get: function() {
                return this._size || this.defaults.size;
            },
            
            set: function(size) {
                if (!utils.isNumber(size) || size <= 0) utils.error('Positive number is expected but got ' + size + ' instead');
                
                this._size = size;
            }
        },
        
        anchorPoint: {
            defaultValue: {x: 16, y: 16},
            get: function() {
                return this._anchorPoint || this.defaults.anchorPoint;
            },
            set: function(point) {
                if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                this._anchorPoint = point;
            }
        },
        
        color: {
            defaultValue: 'black',
            get: function() {
                return this._color || this.defaults.color;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._color = color;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        var feature = this.projectTo(crs),
            pxPosition = [feature._point[0] / resolution, - feature._point[1] / resolution],
            imageCache = this.style._image || this.style.defaults._image;

        if (imageCache.complete) {
            var image = new Image();
            image.src = this.style.source;

            var k = this.style.size / image.width;
            image.width = this.style.size;
            image.height = this.style.size / imageCache.width * imageCache.height;
            image.position = [pxPosition[0] - this.style.anchorPoint.x * k, pxPosition[1] - this.style.anchorPoint.y * k];
            return [image];
        } else {
            var point = new sGis.geom.Point(pxPosition, {color: this.style.color, size: this.style.size});
            return [point];
        }
    }
});

sGis.symbol.point.Square.prototype = new sGis.Symbol({
    type: 'point',
    style: {
        size: {
            defaultValue: 10,
            get: function() {
                return this._size || this.defaults.size;
            },
            set: function(size) {
                if (!utils.isNumber(size) || size <=0) utils.error('Positive number is expected but got ' + size + ' instead');
                this._size = size;
            }
        },
        
        strokeWidth: {
            defaultValue: 2,
            get: function() {
                return this._strokeWidth || this.defaults.strokeWidth;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                this._strokeWidth = width;
            }
        },
        
        strokeColor: {
            defaultValue: 'black',
            get: function() {
                return this._strokeColor || this.defaults.strokeColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._strokeColor = color;
            }
        },
        
        fillColor: {
            defaultValue: 'transparent',
            get: function() {
                return this._fillColor || this.defaults.fillColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._fillColor = color;
            }
        },

        offset: {
            defaultValue: {x: 0, y: 0},
            get: function() {
                return this._offset || this.defaults.offset;
            },
            set: function(point) {
                if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                this._offset = point;
            }
        }        
    },
    
    renderFunction: function(resolution, crs) {
        var feature = this.projectTo(crs),
            pxPosition = [feature._point[0] / resolution, - feature._point[1] / resolution],
            halfSize = this.style.size / 2,
            offset = this.style.offset,
            coordinates = [
                [pxPosition[0] - halfSize + offset.x, pxPosition[1] - halfSize + offset.y],
                [pxPosition[0] - halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                [pxPosition[0] + halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                [pxPosition[0] + halfSize + offset.x, pxPosition[1] - halfSize + offset.y]
            ];
    
        return [new sGis.geom.Polygon(coordinates, {fillColor: this.style.fillColor, color: this.style.strokeColor, width: this.style.strokeWidth})];
    }
});

sGis.symbol.polyline = {
    Simple: function(style) {
        this.setDefaults(style);
    }
};

sGis.symbol.polyline.Simple.prototype = new sGis.Symbol({
    type: 'polyline',
    style: {
        strokeWidth: {
            defaultValue: 1,
            get: function() {
                return this._strokeWidth || this.defaults.strokeWidth;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                this._strokeWidth = width;
            }
        },
        strokeColor: {
            defaultValue: 'black',
            get: function() {
                return this._strokeColor || this.defaults.strokeColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._strokeColor = color;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

        return [new sGis.geom.Polyline(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth})];        
    }
});

sGis.symbol.polygon = {
    Simple: function(style) {
        this.setDefaults(style);
    },
    BrushFill: function(style) {
        this.setDefaults(style);
    }
};

var defaultBrush = [[255,255,  0,  0,  0,   0,  0,  0,  0,  0],
                    [255,255,255,  0,  0,   0,  0,  0,  0,  0],
                    [255,255,255,255,  0,   0,  0,  0,  0,  0],
                    [  0,255,255,255,255,   0,  0,  0,  0,  0],
                    [  0,  0,255,255,255, 255,  0,  0,  0,  0],
                    [  0,  0,  0,255,255, 255,255,  0,  0,  0],
                    [  0,  0,  0,  0,255, 255,255,255,  0,  0],
                    [  0,  0,  0,  0,  0, 255,255,255,255,  0],
                    [  0,  0,  0,  0,  0,   0,255,255,255,255],
                    [  0,  0,  0,  0,  0,   0,  0,255,255,255]];
                
sGis.symbol.polygon.Simple.prototype = new sGis.Symbol({
    type: 'polygon',
    style: {
        strokeWidth: {
            defaultValue: 1,
            get: function() {
                return this._strokeWidth || this.defaults.strokeWidth;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                this._strokeWidth = width;
            }
        },
        strokeColor: {
            defaultValue: 'black',
            get: function() {
                return this._strokeColor || this.defaults.strokeColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._strokeColor = color;
            }
        },
        fillColor: {
            defaultValue: 'transparent',
            get: function() {
                return this._fillColor || this.defaults.fillColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._fillColor = color;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

        return [new sGis.geom.Polygon(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth, fillColor: this.style.fillColor})];        
    }
});

sGis.symbol.polygon.BrushFill.prototype = new sGis.Symbol({
    type: 'polygon',
    style: {
        strokeWidth: {
            defaultValue: 1,
            get: function() {
                return this._strokeWidth || this.defaults.strokeWidth;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                this._strokeWidth = width;
            }
        },
        strokeColor: {
            defaultValue: 'black',
            get: function() {
                return this._strokeColor || this.defaults.strokeColor;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._strokeColor = color;
            }
        },
        fillBrush: {
            defaultValue: defaultBrush,
            get: function() {
                return utils.copyArray(this._fillBrush || this.defaults.fillBrush);
            },
            set: function(brush) {
                if (!utils.isArray(brush)) utils.error('Array is expected but got ' + brush + ' instead');
                this._fillBrush = utils.copyArray(brush);
                this._imageSrc = getBrushImage(this);
                if (!this._image) this._image = new Image();
                this._image.src = this._imageSrc;
            }
        },
        fillForeground: {
            defaultValue: 'black',
            get: function() {
                return this._fillForeground || this.defaults.fillForeground;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._fillForeground = color;
                this._imageSrc = getBrushImage(this);                
                if (!this._image) this._image = new Image();
                this._image.src = this._imageSrc;
            }
        },
        fillBackground: {
            defaultValue: 'transparent',
            get: function() {
                return this._fillBackground || this.defaults.fillBackground;
            },
            set: function(color) {
                if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                this._fillBackground = color;
                this._imageSrc = getBrushImage(this);                
                if (!this._image) this._image = new Image();
                this._image.src = this._imageSrc;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

        return [new sGis.geom.Polygon(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth, fillStyle: 'image', fillImage: this.style._image || this.style.defaults._image})];         
    }
});

function getPolylineRenderedCoordinates(feature, resolution, crs) {
    if (!feature._cache[resolution]) {
        var projected = feature.projectTo(crs).coordinates;

        for (var ring = 0, l = projected.length; ring < l; ring++) {
            for (var i = 0, m = projected[ring].length; i < m; i++) {
                projected[ring][i][0] /= resolution;
                projected[ring][i][1] /= -resolution;
            }
        }

        var simpl = utils.simplify(projected, 0.5);
        feature._cache[resolution] = simpl;
    } else {
        simpl = feature._cache[resolution];
    }
    return simpl;
}

function getBrushImage(style) {
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        brush = style.fillBrush,
        foreground = utils.getColorObject(style.fillForeground),
        background = utils.getColorObject(style.fillBackground),
        alphaNormalizer = 65025;

    canvas.height = brush.length;
    canvas.width = brush[0].length;

    for (var i = 0, l = brush.length; i < l; i++) {
        for (var j = 0, m = brush[i].length; j < m; j++) {
            var srcA = brush[i][j] * foreground.a / alphaNormalizer,
                dstA = background.a / 255 * (1 - srcA),
                a = + Math.min(1, (srcA + dstA)).toFixed(2),
                r = Math.round(Math.min(255, background.r * dstA + foreground.r * srcA)),
                g = Math.round(Math.min(255, background.g * dstA + foreground.g * srcA)),
                b = Math.round(Math.min(255, background.b * dstA + foreground.b * srcA));
        
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
            ctx.fillRect(j,i,1,1);
        }
    }
    
    return canvas.toDataURL();
}

sGis.symbol.label = {
    Label: function(style) {
        this.setDefaults(style);
    }
};

sGis.symbol.label.Label.prototype = new sGis.Symbol({
    type: 'label',
    style: {
        width: {
            defaultValue: 200,
            get: function() {
                return this._width || this.defaults.width;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width <= 0) utils.error('Positive number is expected but got ' + width + ' instead');
                this._width = width;
            }
        },
        
        height: {
            defaultValue: 20,
            get: function() {
                return this._height || this.defaults.height;
            },
            set: function(height) {
                if (!utils.isNumber(height) || height <=0) utils.error('Positive number is expected but got ' + height + ' instead');
                this._height = height;
            }
        },
        
        offset: {
            defaultValue: {x: -100, y: -10},
            get: function() {
                return this._offset || this.defaults.offset;
            },
            set: function(offset) {
                if (!offset || !utils.isNumber(offset.x) || !utils.isNumber(offset.y)) utils.error('{x, y} is expected but got ' + offset + ' instead');
                this._offset = offset;
            }
        },
        
        align: {
            defaultValue: 'center',
            get: function() {
                return this._align || this.defaults.align;
            },
            set: function(align) {
                if (!utils.isString(align)) utils.error('String is expected but got ' + align + ' instead');
                this._align = align;
            }
        },
        
        css: {
            defaultValue: '',
            get: function() {
                return this._css === undefined ? this.defaults.css : this._css;
            },
            set: function(css) {
                if (!utils.isString(css)) utils.error('String is expected but got ' + css + ' instead');
                this._css = css;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        var div = document.createElement('div');
        div.className = this.style.css;
        div.appendChild(this.content);
        div.style.position = 'absolute';
        div.style.height = this.style.height + 'px';
        div.style.width = this.style.width + 'px';
        
        var point = this.point.projectTo(crs);
        div.position = [point.x / resolution + this.style.offset.x, - point.y / resolution + this.style.offset.y];
        div.style.pointerEvents = 'none';
        div.style.cursor = 'inherit';
        div.style.textAlign = this.style.align;
        
        return [div];
    }
});

})();(function() {

sGis.symbol.maptip = {
    Simple: function(style) {
        this.setDefaults(style);
    }
};

sGis.symbol.maptip.Simple.prototype = new sGis.Symbol({
    type: 'maptip',
    style: {
        width: {
            defaultValue: 200,
            get: function() {
                return this._width || this.defaults.width;
            },
            set: function(width) {
                if (!utils.isNumber(width) || width <=0) utils.error('Positive number is expected but got ' + width + ' instead');
                this._width = width;
                this._changed = true;                
            }
        },
        
        height: {
            defaultValue: 200,
            get: function() {
                return this._height || this.defaults.height;
            },
            set: function(height) {
                if (!utils.isNumber(height) || height <= 0) utils.error('Positive number is expected but got ' + height + ' instead');
                this._height  = height;
                this._changed = true;                
            }
        },
        
        offset: {
            defaultValue: {x: -100, y: -220},
            get: function() {
                return this._offset || this.defaults.offset;
            },
            set: function(offset) {
                if (!offset || !utils.isNumber(offset.x) || !utils.isNumber(offset.y)) utils.error('{x, y} is expected but got ' + offset + ' instead');
                this._offset = offset;
                this._changed = true;
            }
        }
    },
    renderFunction: function(resolution, crs) {
        if (this.style._changed) {
            this._cache = {};
            this.style._changed = false;
        }
        
        var point = this.position.projectTo(crs),
            position = [point.x / resolution, - point.y / resolution];
    
        if (!this._cache[resolution]) {
            var baloonCoordinates = getBaloonCoordinates(this, position);

            this._cache[resolution] = new sGis.geom.Polygon(baloonCoordinates, {fillColor: 'white'});
        }
        
        var div = document.createElement('div'),
            divPosition = [position[0] + this.style.offset.x, position[1] + this.style.offset.y]; 
    
        if (utils.isNode(this.content)) {
            div.appendChild(this.content);
        } else {
            utils.html(div, this.content);
        }
        div.style.position = 'absolute';
        div.style.height = this.style.height + 'px';
        div.style.width = this.style.width + 'px';
        div.style.backgroundColor = 'white';
        div.style.overflow = 'auto';
        div.position = divPosition;        
        
        return [this._cache[resolution], div];
    }
});

function getBaloonCoordinates(feature, position) {
    var baloonSquare = getBaloonSquare(feature, position);
    
    if (isInside(position, baloonSquare)) return baloonSquare;
    
    var tailBase = getTailBasePoint(position, baloonSquare),
        startIndex = tailBase.index,
        tailBaseLine = getTailBaseLine(tailBase, baloonSquare),
        contour = [position, tailBaseLine[0]];

    if (!isOnTheLine(tailBaseLine[0], [baloonSquare[startIndex], baloonSquare[(startIndex + 1) % 4]])) startIndex++;
    for (var i = 1; i <= 4; i++) {
        contour.push(baloonSquare[(startIndex + i) % 4]);
        if (isOnTheLine(tailBaseLine[1], [baloonSquare[(startIndex + i) % 4], baloonSquare[(startIndex + i + 1) % 4]])) break;
    }

    contour.push(tailBaseLine[1]);
    return contour;
}

function getTailBaseLine(tailBase, baloonSquare) {
    var point = tailBase.point,
        index = tailBase.index,
        square = baloonSquare.concat([baloonSquare[0]]),
        side = index % 2,
        opSide = (side + 1) % 2,
        direction = index < 2 ? 1 : -1,
        length = 10,
        d1 = (square[index + 1][side] - point[side]) * direction,
        d2 = (point[side] - square[index][side]) * direction,
        baseLine = [[], []];

    if (d1 >= length) {
        baseLine[0][side] = point[side] + length * direction;
        baseLine[0][opSide] = point[opSide];
    } else {
        var k = index === 1 || index === 3 ? -1 : 1;
        baseLine[0][opSide] = point[opSide] + (length - d1) * direction * k;
        baseLine[0][side] = square[index + 1][side];
    }
    
    if (d2 >= length) {
        baseLine[1][side] = point[side] - length * direction;
        baseLine[1][opSide] = point[opSide];
    } else {
        var k = index === 0 || index === 2 ? -1 : 1;
        baseLine[1][opSide] = point[opSide] - (length - d2) * direction * k;
        baseLine[1][side] = square[index][side];
    }
    
    return baseLine;
}

function getBaloonSquare(feature, position) {
    var offset = feature.style.offset,
        x = position[0] + offset.x,
        y = position[1] + offset.y,
        width = feature.style.width,
        height = feature.style.height,
        square = [
            [x - 1, y - 1],
            [x + width + 1, y - 1],
            [x + width + 1, y + height + 1],
            [x - 1, y + height + 1]
        ];
    return square;
}

function isInside(position, square) {
    return position[0] >= square[0][0] &&
           position[0] <= square[2][0] &&
           position[1] >= square[0][1] &&
           position[1] <= square[2][1];
}

function getTailBasePoint(position, baloonSquare) {
    var square = baloonSquare.concat([baloonSquare[0]]),
        center = [(square[0][0] + square[2][0]) / 2, (square[0][1] + square[2][1]) / 2];
    for (var i = 0; i < 4; i++) {
        var side = (i + 1) % 2,
            direction = i === 1 || i === 2 ? 1 : -1;
        if (position[side] * direction > square[i][side] * direction) {
            var intersectionPoint = getIntersectionPoint([position, center], [square[i], square[i + 1]]);
            if (isOnTheLine(intersectionPoint, [square[i], square[i + 1]])) return {point: intersectionPoint, index: i};
        }
    }
}

function isOnTheLine(point, line) {
    var x1 = Math.min(line[0][0], line[1][0]),
        x2 = Math.max(line[0][0], line[1][0]),
        y1 = Math.min(line[0][1], line[1][1]),
        y2 = Math.max(line[0][1], line[1][1]);
    return point[0] >= (x1 - 0.1) && point[0] <= (x2 + 0.1) && point[1] >= (y1 - 0.1) && point[1] <= (y2 + 0.1);
}

function getIntersectionPoint(a, b) {
    var dx1 = a[0][0] - a[1][0],
        dx2 = b[0][0] - b[1][0],
        dy1 = a[0][1] - a[1][1],
        dy2 = b[0][1] - b[1][1],
        da = (a[0][0] * a[1][1] - a[0][1] * a[1][0]),
        db = (b[0][0] * b[1][1] - b[0][1] * b[1][0]),
        devisor = (dx1 * dy2 - dy1 * dx2),
        x = (da * dx2 - dx1 * db) / devisor,
        y = (da * dy2 - dy1 * db) / devisor;
    
    return [x, y];
}

})();'use strict';

(function() {
    
sGis.feature = {};
    
sGis.Feature = function(extention) {
    for (var key in extention) {
        this[key] = extention[key];
    }    
};

sGis.Feature.prototype = {
    _bbox: null,
    _attributes: null,
    _crs: sGis.CRS.geo,
    _hidden: false,
    
    render: function(resolution, crs) {
        if (this._hidden) {
            return [];
        } else {
            return this._symbol.renderFunction.call(this, resolution, crs);
        }
    },
    
    hide: function() {
        this._hidden = true;
    },
    
    show: function() {
        this._hidden = false;
    },
    
    __initialize: function(options) {
        if (options && options.id) {
            this.id = options.id;
            delete options.id;
        } else {
            this._id = utils.getGuid();
        }
        
        if (options && options.symbol) {
            this.symbol = options.symbol;
            delete options.symbol;
        } else {
            this.symbol = new this._defaultSymbol();
        }

        utils.init(this, options);
    }
};

Object.defineProperties(sGis.Feature.prototype, {
    id: {
        get: function() {
            return this._id;
        },
        
        set: function(id) {
            this._id = id;
        }
    },
    
    attributes: {
        get: function() {
            return this._attributes;
        },
        
        set: function(attributes) {
            this._attributes = attributes;
        }
    },
    
    crs: {
        get: function() {
            return this._crs;
        }
    },
    
    symbol: {
        get: function() {
            return this._symbol;
        },
        
        set: function(symbol) {
            if (!(symbol instanceof sGis.Symbol)) utils.error('sGis.Symbol instance is expected but got ' + symbol + ' instead');
            if (symbol.type !==  this.type) utils.error('sGis.feature.Point object requere symbol of the type "' + this.type + '" but got ' + symbol.type + ' instead');
            
            this._symbol = symbol;
            this._style = {defaults: symbol.defaults};
            for (var i in symbol.style) {
                Object.defineProperty(this._style, i, {
                    get: symbol.style[i].get,
                    set: symbol.style[i].set
                });
            }
        }
    },
    
    style: {
        get: function() {
            return this._style;
        },
        
        set: function(style) {
            if (!(style instanceof Object)) utils.error('Object is expected but got ' + style + ' instead');
            for (var i in style) {
                this._style[i] = style[i];
            }
        }
    },
    
    hidden: {
        get: function() {
            return this._hidden;
        },
        set: function(bool) {
            if (bool === true) {
                this.hide();
            } else if (bool === false) {
                this.show();
            } else {
                utils.error('Boolean is expected but got ' + bool + ' instead');
            }
        }
    }
});

utils.mixin(sGis.Feature.prototype, sGis.IEventHandler.prototype);

var id = 0;
    
sGis.Feature.getNewId = function() {
    return utils.getGuid();
};
    
})();
'use strict';

(function () {

sGis.feature.Point = function (point, options) {
    this.__initialize(options);
    if (!point) utils.error('The point position is not specified');
    
    this._point = point;
};

sGis.feature.Point.prototype = new sGis.Feature({
    _defaultSymbol: sGis.symbol.point.Point,
    _crs: sGis.CRS.geo,
    
    projectTo: function(crs) {
        var point = new sGis.Point(this._point[0], this._point[1], this._crs),
            projected = point.projectTo(crs),
            coordinates = crs === sGis.CRS.geo ? [projected.y, projected.x] : [projected.x, projected.y];
        
        var response = new sGis.feature.Point(coordinates, {crs: crs});
        if (this._color) response._color = this._color;
        if (this._size) response._size = this._size;
        
        return response;
    },
    
    clone: function() {
        return this.projectTo(this._crs);
    }
});

Object.defineProperties(sGis.feature.Point.prototype, {
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            this._crs = crs;
        }
    },
    
    bbox: {
        get: function() {
            var point = new sGis.Point(this._point[0], this._point[1], this._crs);
            return new sGis.Bbox(point, point);
        }
    },
    
    size: {
        get: function() {
            return this._style.size;
        },
        
        set: function(size) {
            this._style.size = size;
        }
    },
    
    color: {
        get: function() {
            return this._style.color;
        },
        
        set: function(color) {
            this._style.color = color;
        }
    },
    
    x: {
        get: function() {
            return this.crs === sGis.CRS.geo ? this._point[1] : this._point[0];
        },
        
        set: function(x) {
            var index = this.crs === sGis.CRS.geo ? 1 : 0;
            this._point[index] = x;
        }
    },
    
    y: {
        get: function() {
            return this.crs === sGis.CRS.geo ? this._point[0] : this._point[1];
        },
        
        set: function(y) {
            var index = this.crs === sGis.CRS.geo ? 0 : 1;
            this._point[index] = y;
        }        
    },
    
    coordinates: {
        get: function() {
            return this._point;
        },
        
        set: function(coordinates) {
            if (!utils.isArray(coordinates) || !utils.isNumber(coordinates[0]) || !utils.isNumber(coordinates[1])) utils.error('[x, y] is expected but got ' + coordinates + ' instead');
            this._point = coordinates;
        }
    },
    
    type: {
        value: 'point'
    }
});

})();'use strict';

(function() {
    
sGis.feature.Polyline = function(coordinates, options) {
    this.__initialize(options);
    
    this._coordinates = [[]];
    if (coordinates) this.coordinates = coordinates;
};

sGis.feature.Polyline.prototype = new sGis.Feature({
    _defaultSymbol: sGis.symbol.polyline.Simple,
    _cache: {},
    
    addPoint: function(point, ring) {
        ring = ring || 0;
        if (!this._coordinates[ring]) utils.error('The ring with index ' + ring + ' does not exist in feature');
        this.setPoint(ring, this._coordinates[ring].length, point);
    },
    
    removePoint: function(ring, index) {
        if (!this._coordinates[ring]) utils.error('The ring with index ' + ring + ' does not exist in the feature');
        if (!this._coordinates[ring][index]) utils.error('The point with specified index ' + index + ' does not exist in the feature');
        this._coordinates[ring].splice(index, 1);
        if (this._coordinates[ring].length === 0) {
            this._coordinates.splice(ring, 1);
        }
        this._cache = {};
        this._bbox = null;
    },
    
    clone: function() {
        return new sGis.feature.Polyline(this._coordinates, {crs: this._crs, color: this._color, width: this._width});
    },
    
    projectTo: function(crs) {
        var projected = this.clone();
        projected.crs = crs;
        return projected;
    },
    
    setRing: function(n, coordinates) {
        if (!utils.isInteger(n) || n < 0) utils.error('Positive integer is expected for index but got ' + n + ' instead');
        if (!utils.isArray(coordinates)) utils.error('Array is expected but got ' + coordinates + ' instead');
        
        if (n > this._coordinates.length) n = this._coordinates.length;
        this._coordinates[n] = [];
        for (var i = 0, l = coordinates.length; i < l; i++) {
            this.setPoint(n, i, coordinates[i]);
        }
    },
    
    setPoint: function(ring, n, point) {
        if (!isValidPoint(point)) utils.error('Point is expected but got ' + point + ' instead');
        if (!this._coordinates[ring]) utils.error('The ring with index ' + ring + ' does not exist');
        if (!utils.isInteger(n) || n < 0) utils.error('Positive integer is expected for index but got ' + n + ' instead');
        
        if (n > this._coordinates[ring].length) n = this._coordinates[ring].length;
        if (point instanceof sGis.Point) {
            var projected = point.projectTo(this.crs);
            this._coordinates[ring][n] = this.crs === sGis.CRS.geo ? [projected.y, projected.x] : [projected.x, projected.y];
        } else {
            this._coordinates[ring][n] = point;
        }
        this._bbox = null;
        this._cache = {};
    },
    
    insertPoint: function(ring, n, point) {
        if (!isValidPoint(point)) utils.error('Point is expected but got ' + point + ' instead');
        if (!this._coordinates[ring]) utils.error('The ring with index ' + ring + ' does not exist');
        if (!utils.isInteger(n) || n < 0) utils.error('Positive integer is expected for index but got ' + n + ' instead');
        
        this._coordinates[ring].splice(n, 0, [0, 0]);
        this.setPoint(ring, n, point);
    },
    
    transform: function(matrix, center) {
        if (center instanceof sGis.Point || center instanceof sGis.feature.Point) {
            var basePoint = center.projectTo(this.crs),
                base = [basePoint.x, basePoint.y];
        } else if (utils.isArray(center) && utils.isNumber(center[0]) && utils.isNumber(center[1])) {
            base = [parseFloat(center[0]), parseFloat(center[1])];
        } else if (center === undefined) {
            base = this.centroid;
        } else {
            utils.error('Unknown format of center point: ' + center);
        }
        var coord = this.coordinates,
            result = [];
        for (var ring = 0, l = coord.length; ring < l; ring++) {
            var extended = extendCoordinates(coord[ring], base),
                transformed = utils.multiplyMatrix(extended, matrix);
            result[ring] = collapseCoordinates(transformed, base);
        }
    
        this.coordinates = result;
    },
    
    rotate: function(angle, center) {
        if (!utils.isNumber(angle)) utils.error('Number is expected but got ' + angle + ' instead');
        
        var sin = Math.sin(angle),
            cos = Math.cos(angle);
        
        this.transform([[cos, sin, 0], [-sin, cos, 0], [0, 0, 1]], center);
    },
    
    scale: function(scale, center) {
        if (utils.isNumber(scale)) {
            scale = [scale, scale];
        } else if (!utils.isArray(scale)) {
            utils.error('Number or array is expected but got ' + scale + ' instead');
        }
        this.transform([[parseFloat(scale[0]), 0, 0], [0, parseFloat(scale[1]), 0], [0, 0, 1]], center);
    }
});

function extendCoordinates(coord, center) {
    var extended = [];
    for (var i = 0, l = coord.length; i < l; i++) {
        extended[i] = [coord[i][0] - center[0], coord[i][1] - center[1], 1];
    }
    return extended;
}

function collapseCoordinates(extended, center) {
    var coord = [];
    for (var i = 0, l = extended.length; i < l; i++) {
        coord[i] = [extended[i][0] + center[0], extended[i][1] + center[1]];
    }
    return coord;
}

Object.defineProperties(sGis.feature.Polyline.prototype, {
    coordinates: {
        get: function() {
            return utils.copyArray(this._coordinates);
        },
        set: function(coordinates) {
            if (!utils.isArray(coordinates)) utils.error('Array is expected but got ' + coordinates + ' instead');
            
            if (!utils.isArray(coordinates[0]) || utils.isNumber(coordinates[0][0])) {
                // One ring is specified
                this.setRing(0, coordinates);
            } else {
                // Array of rings is specified
                for (var ring = 0, l = coordinates.length; ring < l; ring++) {
                    this.setRing(ring, coordinates[ring]);
                }
            }
        }
    },
    
    bbox: {
        get: function() {
            if (!this._bbox) {
                var point1 = [this._coordinates[0][0][0], this._coordinates[0][0][1]],
                    point2 = [this._coordinates[0][0][0], this._coordinates[0][0][1]];
                for (var ring = 0, l = this._coordinates.length; ring < l; ring++) {
                    for (var i = 0, m = this._coordinates[ring].length; i < m; i++) {
                        if (point1[0] > this._coordinates[ring][i][0]) point1[0] = this._coordinates[ring][i][0];
                        if (point1[1] > this._coordinates[ring][i][1]) point1[1] = this._coordinates[ring][i][1];
                        if (point2[0] < this._coordinates[ring][i][0]) point2[0] = this._coordinates[ring][i][0];
                        if (point2[1] < this._coordinates[ring][i][1]) point2[1] = this._coordinates[ring][i][1];                        
                    }
                }
                this._bbox = new sGis.Bbox(new sGis.Point(point1[0], point1[1], this._crs), new sGis.Point(point2[0], point2[1], this._crs));
            }
            return this._bbox;
        }
    },
    
    type: {
        value: 'polyline'
    },
    
    width: {
        get: function() {
            return this._style.strokeWidth;
        },
        
        set: function(width) {
            this._style.strokeWidth = width;
        }
    },
    
    color: {
        get: function() {
            return this._style.strokeColor;
        },
        
        set: function(color) {
            this._style.strokeColor = color;
        }
    },
    
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            if (crs === this.crs) return;
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            
            if (this._coordinates) {
                for (var ring = 0, l = this._coordinates.length; ring < l; ring++) {
                    for (var i = 0, m = this._coordinates[ring].length; i < m; i++) {
                        var coord = this._coordinates[ring][i],
                            point = new sGis.Point(coord[0], coord[1], this.crs),
                            projected = point.projectTo(crs);

                        this._coordinates[ring][i] = [projected.x, projected.y];
                    }
                }
            }
            
            this._crs = crs;
            this._cache = {};
            this._bbox = [];
        }
    },
    
    centroid: {
        get: function() {
            var bbox = this.bbox,
                x = (bbox.p[0].x + bbox.p[1].x) / 2,
                y = (bbox.p[0].y + bbox.p[1].y) / 2;
            
            return [x, y];
        }
    }
});

function isValidPoint(point) {
    return utils.isArray(point) && utils.isNumber(point[0]) && utils.isNumber(point[1]) || (point instanceof sGis.Point);
}
    
})();
'use strict';

(function() {
    
sGis.feature.Polygon = function(coordinates, options) {
    this.__initialize(options);
    
    this._coordinates = [[]];
    if (coordinates) this.coordinates = coordinates;
};

sGis.feature.Polygon.prototype = new sGis.feature.Polyline();

Object.defineProperties(sGis.feature.Polygon.prototype, {
    _defaultSymbol: {
        value: sGis.symbol.polygon.Simple
    },
    
    _fillColor: {
        value: sGis.geom.Polygon.prototype._fillColor,
        writable: true
    },
    
    type: {
        value: 'polygon'
    },
    
    fillColor: {
        get: function() {
            return this._style.fillColor;
        },
        
        set: function(color) {
            this._style.fillColor = color;
        }
    }
});
    
})();
(function() {

var defaultDiv = document.createElement('div');
defaultDiv.innerHTML = 'New label';
defaultDiv.style.textAlign = 'center';

sGis.feature.Label = function(position, options) {
    this.__initialize(options);
    this.coordinates = position;
};

sGis.feature.Label.prototype = new sGis.Feature({
    _defaultSymbol: sGis.symbol.label.Label,
    _content: defaultDiv.cloneNode(true),
    _crs: sGis.CRS.geo,
    
    render: function(resolution, crs) {
        return this._symbol.renderFunction.call(this, resolution, crs);
    }
});

Object.defineProperties(sGis.feature.Label.prototype, {
    coordinates: {
        get: function() {
            return this._point.getCoordinates();
        },
        
        set: function(point) {
            if (point instanceof sGis.Point) {
                this._point = point.projectTo(this._crs);
            } else if (utils.isArray(point)) {
                this._point = new sGis.Point(point[0], point[1], this._crs);
            } else {
                utils.error('Coordinates are expected but got ' + point + ' instead');
            }
        }
    },
    
    point: {
        get: function() {
            return this._point.clone();
        }
    },
    
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            if (this._point) this._point = this._point.projectTo(crs);
            this._crs = crs;
        }
    },
    
    content: {
        get: function() {
            return this._content;
        },
        
        set: function(content) {
            if (utils.isString(content)) {
                var node = document.createTextNode(content);
                this._content = node;
            } else if (utils.isNode) {
                this._content = content;
            } else {
                utils.error('DOM node is expected but got ' + content + ' instead');
            }
        }
    },
    
    type: {
        value: 'label'
    }
});

})();(function() {

var defaultContent = document.createElement('div');
defaultContent.innerHTML = 'New maptip';

sGis.feature.Maptip = function(position, options) {
    this.__initialize(options);
    this.position = position;
};

sGis.feature.Maptip.prototype = new sGis.Feature({
    _defaultSymbol: sGis.symbol.maptip.Simple,
    _content: defaultContent
});

Object.defineProperties(sGis.feature.Maptip.prototype, {
    position: {
        get: function() {
            return this._position.clone();
        },
        set: function(position) {
            if (position instanceof sGis.Point) {
                this._position = position.projectTo(this._crs);
            } else if (utils.isArray(position) && utils.isNumber(position[0]) && utils.isNumber(position[1])) {
                this._position = new sGis.Point(position[0], position[1], this._crs);
            } else {
                utils.error('Point is expected but got ' + position + ' instead');
            }
            this._cache = {};
        }
    },
    
    content: {
        get: function() {
            return this._content;
        },
        set: function(content) {
            this._content = content;
            this._cache = {};
        }
    },
    
    crs: {
        get: function() {
            return this._crs;
        },
        
        set: function(crs) {
            if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
            this._crs = crs;
            this._point = this._point.projectTo(crs);
            this._cache = {};
        }
    },
    
    type: {
        get: function() {
            return 'maptip';
        }
    }
});
    
})();(function() {
    
sGis.PointGroup = function(points) {
    this._points = [];
    this.points = points;
};

sGis.PointGroup.prototype = {
    addPoint: function(point) {
        if (!(point instanceof sGis.feature.Point)) utils.error('sGis.feature.Point instance is expected but got ' + point + ' instead');
        this._points.push(point);
    },
    
    removePoint: function(point) {
        var index = this._points.indexOf(point);
        if (index === -1) {
            utils.error('The point is not in the group');
        }
        
        this._points.splice(index, 1);
    },
    
    transform: function(matrix, center) {
        if (center instanceof sGis.Point || center instanceof sGis.feature.Point) {
            var basePoint = center.projectTo(this.crs),
                base = [basePoint.x, basePoint.y];
        } else if (utils.isArray(center) && utils.isNumber(center[0]) && utils.isNumber(center[1])) {
            base = [parseFloat(center[0]), parseFloat(center[1])];
        } else if (center === undefined) {
            base = this.centroid;
        } else {
            utils.error('Unknown format of center point: ' + center);
        }
        var coord = this.coordinates,
            extended = utils.extendCoordinates(coord, base),
            transformed = utils.multiplyMatrix(extended, matrix),
            result = utils.collapseCoordinates(transformed, base);
    
        this.coordinates = result;
    },
    
    rotate: function(angle, center) {
        if (!utils.isNumber(angle)) utils.error('Number is expected but got ' + angle + ' instead');
        
        var sin = Math.sin(angle),
            cos = Math.cos(angle);
        
        this.transform([[cos, sin, 0], [-sin, cos, 0], [0, 0, 1]], center);
    },
    
    scale: function(scale, center) {
        if (utils.isNumber(scale)) {
            scale = [scale, scale];
        } else if (!utils.isArray(scale)) {
            utils.error('Number or array is expected but got ' + scale + ' instead');
        }
        this.transform([[parseFloat(scale[0]), 0, 0], [0, parseFloat(scale[1]), 0], [0, 0, 1]], center);
    }
};

Object.defineProperties(sGis.PointGroup.prototype, {
    points: {
        get: function() {
            return [].concat(this._points);
        },
        
        set: function(points) {
            this._points = [];
            for (var i = 0, l = points.length; i < l; i++) {
               this.addPoint(points[i]);
            }
        }
    },
    
    coordinates: {
        get: function() {
            var coord = [],
                crs = this.crs;
            for (var i = 0, len = this._points.length; i < len; i++) {
                var point = this._points[i] === crs ? this._points[i] : this._points[i].projectTo(crs);
                coord.push(point.coordinates);
            }
            return coord;
        },
        
        set: function(coordinates) {
            var crs = this.crs;
            if (!crs) utils.error('Cannot assing coordinates to empty group');
            
            for (var i = 0, len = coordinates.length; i < len; i++) {
                if (!this._points[i]) this._points[i] = this._points[0].clone();
                this._points[i].coordinates = coordinates[i];
            }
            
            if (this._points.length > len) {
                this._points = this._points.slice(0, len);
            }
        }
    },
    
    crs: {
        get: function() {
            if (this._points.length > 0) {
                return this._points[0].crs;
            } else {
                return undefined;
            }
        }
    },
    
    bbox: {
        get: function() {
            var len = this._points.length;
            if (len > 0) {
                var xArray = [],
                    yArray = [],
                    crs = this._points[0].crs;
                for (var i = 0; i < len; i++) {
                    xArray.push(this._points[i].x);
                    yArray.push(this._points[i].y);
                }
                
                var xmin = utils.min(xArray),
                    xmax = utils.max(xArray),
                    ymin = utils.min(yArray),
                    ymax = utils.max(yArray);
            
                return new sGis.Bbox(new sGis.Point(xmin, ymin, crs), new sGis.Point(xmax, ymax, crs));
            } else {
                return undefined;
            }
        }
    },
    
    centroid: {
        get: function() {
                        var len = this._points.length;
            if (len > 0) {
                var x = 0,
                    y = 0,
                    crs = this._points[0].crs;
                for (var i = 0; i < len; i++) {
                    var projected = this._points[i].projectTo(crs);
                    x += projected.x;
                    y += projected.y;
                }
                
                return [x, y];
            } else {
                return undefined;
            }
        }
    }
});



})();

'use strict';

(function() {

sGis.controls = {};

sGis.Control = function(extention) {
    for (var key in extention) {
        this[key] = extention[key];
    }    
};

sGis.Control.prototype = {
    _activeLayer: null,
    
    activate: function() {
        if (!this._active) {
            this._setActiveStatus(true);
        }
    },
    
    deactivate: function() {
        if (this._active) {
            this._setActiveStatus(false);
            if (this._selfActiveLayer) {
                this._map.removeLayer(this._activeLayer);
                this._activeLayer = null;
                this._selfActiveLayer = false;
            }
        }
    }
};

Object.defineProperties(sGis.Control.prototype, {
    activeLayer: {
        get: function() {
            if (this._activeLayer) {
                return this._activeLayer;
            } else {
                var layer = new sGis.FeatureLayer();
                this._map.addLayer(layer);
                this._activeLayer = layer;
                return layer;
            }
        },

        set: function(layer) {
            if (!(layer instanceof sGis.FeatureLayer)) utils.error('Expected sGis.FeatureLayer instance but got ' + layer + ' instead');
            if (this.isActive) utils.error('Cannot set active layer for an acitve control');
            if (this._map && this._map.getLayerIndex(layer) === -1) utils.error('The layer does not belong to control\'s map');
            this._activeLayer = layer;
        }
    },

    isActive: {
        get: function() {
            return this._active;
        },

        set: function(bool) {
            if (bool === true) {
                this.activate();
            } else if (bool === false) {
                this.deactivate();
            } else {
                utils.error('Boolean is expected but got ' + bool + ' instead');
            }
        }
    },

    map: {
        get: function() {
            return this._map;
        }
    }
});

utils.mixin(sGis.Control.prototype, sGis.IEventHandler.prototype);

})();

'use strict';

(function() {

sGis.controls.Point = function(map, options) {
    if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
    this._map = map;
    
    if (options && options.activeLayer) this.activeLayer = options.activeLayer;
    this._prototype = new sGis.feature.Point([0, 0], {style: options.style, symbol: options.symbol});
    
    utils.initializeOptions(this, options);
    
    this._active = false;
    
    var self = this;
    
    this._addPoint = function(sGisEvent) {
        var pxPosition = sGisEvent.mouseOffset,
            point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y),
            feature = new sGis.feature.Point(point.getCoordinates(), {crs: self._map.crs, symbol: self._prototype.symbol, style: self._prototype.style}),
            activeLayer = self.activeLayer;

        activeLayer.add(feature);
        self._map.redrawLayer(activeLayer);
        
        self.fire('drawingFinish', {geom: feature});
        sGisEvent.stopPropagation();
        sGisEvent.preventDefault();
    };
};

sGis.controls.Point.prototype = new sGis.Control({
    _setActiveStatus: function(isActive) {
        if (isActive) {
            this._map.addListner('click.sGis-point', this._addPoint);
        } else {
            this._map.removeListner('click.sGis-point', this._addPoint);
        }
        this._active = isActive;
    }
});

Object.defineProperties(sGis.controls.Point.prototype, {
    style: {
        get: function() {
            return this._prototype.style;
        },
        set: function(style) {
            this._prototype.style = style;
        }
    },
    
    symbol: {
        get: function() {
            return this._prototype.symbol;
        },
        set: function(symbol) {
            this._prototype.symbol = symbol;
        }
    }
});

})();

'use strict';

(function() {

sGis.controls.Polyline = function(map, options) {
    if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
    this._map = map;

    options = options || {};
    if (options.activeLayer) this.activeLayer = options.activeLayer;
    this._prototype = new sGis.feature.Polyline([[]], {symbol: options.symbol, style: options.style});

    utils.initializeOptions(this, options);
    
    this._active = false;
    var self = this;
    
    this._clickHandler = function(sGisEvent) {
        setTimeout(function() {
            if (Date.now() - self._dblClickTime < 30) return;
            var pxPosition = sGisEvent.mouseOffset,
                point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

            if (self._activeFeature) {
                self._activeFeature.addPoint(point);
                self.fire('pointAdd');
            } else {
                self._activeFeature = createNewPolyline(self.activeLayer, point, {style: self._prototype.style, symbol: self._prototype.symbol, crs: self._map.crs});
                self._map.addListner('mousemove.sGis-polyline', self._mousemoveHandler);
                self._map.addListner('dblclick.sGis-polyline', self._dblclickHandler);

                self._activeFeature.prohibitEvent('click');

                self.fire('drawingBegin');
                self.fire('pointAdd');
            }

            self._map.redrawLayer(self.activeLayer);
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();            
        }, 10);
    };
    
    this._mousemoveHandler = function(sGisEvent) {
        var pxPosition = sGisEvent.mouseOffset,
            point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

        self._activeFeature.removePoint(0, self._activeFeature.coordinates[0].length - 1);
        self._activeFeature.addPoint(point);
        
        self._map.redrawLayer(self.activeLayer);
    };
    
    this._dblclickHandler = function(sGisEvent) {
        finishDrawing(self);
        sGisEvent.preventDefault();
        self._dblClickTime = Date.now();
    };
};

sGis.controls.Polyline.prototype = new sGis.Control({
    _setActiveStatus: function(isActive) {
        if (isActive) {
            this._map.addListner('click.sGis-polyline', this._clickHandler);
        } else {
            if (this._activeFeature) finishDrawing(this);
            this._map.removeListner('click.sGis-polyline', this._clickHandler);
        }
        this._active = isActive;        
    }
});

Object.defineProperties(sGis.controls.Polyline.prototype, {
    style: {
        get: function() {
            return this._prototype.style;
        },
        set: function(style) {
            this._prototype.style = style;
        }
    },
    
    symbol: {
        get: function() {
            return this._prototype.symbol;
        },
        set: function(symbol) {
            this._prototype.symbol = symbol;
        }
    },
    
    activeFeature: {
        get: function() {
            return this._activeFeature;
        }
    }
});

function createNewPolyline(layer, point, options) {
    var polyline = new sGis.feature.Polyline([[point.x, point.y], [point.x, point.y]], options);
    layer.add(polyline);
    return polyline;
}

function finishDrawing(control) {
    if (control._activeFeature.coordinates[0].length < 3) {
        control.activeLayer.remove(control._activeFeature);
    } else {
        control._activeFeature.removePoint(0, control._activeFeature.coordinates[0].length - 1);
    }    
    
    var geom = control._activeFeature;
    
    control._map.removeListner('mousemove.sGis-polyline');
    control._map.removeListner('dblclick.sGis-polyline');
    
    control._activeFeature.allowEvent('click');
    
    control._activeFeature = null;

    control._map.redrawLayer(control.activeLayer);
    control.fire('drawingFinish', {geom: geom});
}

})();



'use strict';

(function() {

sGis.controls.Polygon = function(map, options) {
    if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
    this._map = map;

    options = options || {};
    if (options.activeLayer) this.activeLayer = options.activeLayer;
    this._prototype = new sGis.feature.Polygon([[]], {style: options.style, symbol: options.symol});
    

    utils.init(this, options);
    
    this._active = false;
    var self = this;
    
    this._clickHandler = function(sGisEvent) {
        setTimeout(function() {
            if (Date.now() - self._dblClickTime < 30) return;
            var pxPosition = sGisEvent.mouseOffset,
                point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

            if (self._activeFeature) {
                self._activeFeature.addPoint(point, self._activeFeature.coordinates.length - 1);
                if (sGisEvent.ctrlKey) {
                    self._activeFeature.setRing(self._activeFeature.coordinates.length, [point]);
                }
                self.fire('pointAdd');
            } else {
                self._activeFeature = createNewPolygon(self.activeLayer, point, {style: self._prototype.style, symbol: self._prototype.symbol, crs: self._map.crs});
                self._map.addListner('mousemove.sGis-polygon', self._mousemoveHandler);
                self._map.addListner('dblclick.sGis-polygon', self._dblclickHandler);

                self._activeFeature.prohibitEvent('click');

                self.fire('drawingBegin');
                self.fire('pointAdd');
            }

            self._map.redrawLayer(self.activeLayer);
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        }, 10);
    };
    
    this._mousemoveHandler = function(sGisEvent) {
        var pxPosition = sGisEvent.mouseOffset,
            point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y),
            ring = self._activeFeature.coordinates.length - 1;

        self._activeFeature.removePoint(ring, self._activeFeature.coordinates[ring].length - 1);
        
        if (self._activeFeature.coordinates.length > ring) {
            self._activeFeature.addPoint(point, ring);
        } else {
            self._activeFeature.setRing(ring, [point]);
        }
        
        self._map.redrawLayer(self.activeLayer);
    };
    
    this._dblclickHandler = function(sGisEvent) {
        finishDrawing(self);
        sGisEvent.preventDefault();
        self._dblClickTime = Date.now();
    };
};

sGis.controls.Polygon.prototype = new sGis.Control({
    _setActiveStatus: function(isActive) {
        if (isActive) {
            this._map.addListner('click.sGis-polygon', this._clickHandler);
        } else {
            if (this._activeFeature) finishDrawing(this);
            this._map.removeListner('click.sGis-polygon');
        }
        this._active = isActive;        
    }
});

Object.defineProperties(sGis.controls.Polygon.prototype, {
    style: {
        get: function() {
            return this._prototype.style;
        },
        set: function(style) {
            this._prototype.style = style;
        }
    },
    
    symbol: {
        get: function() {
            return this._prototype.symbol;
        },
        set: function(symbol) {
            this._prototype.symbol = symbol;
        }
    },
    
    activeFeature: {
        get: function() {
            return this._activeFeature;
        }
    }
});

function createNewPolygon(layer, point, options) {
    var polygon = new sGis.feature.Polygon([[point.x, point.y], [point.x, point.y]], options);
    layer.add(polygon);
    return polygon;
}

function finishDrawing(control) {
    if (control._activeFeature.coordinates[0].length < 3) {
        control.activeLayer.remove(control._activeFeature);
    } else {
        control._activeFeature.removePoint(0, control._activeFeature.coordinates[0].length - 1);
    }    
    
    var geom = control._activeFeature;
    
    control._activeFeature.allowEvent('click');

    control._map.removeListner('mousemove.sGis-polygon');
    control._map.removeListner('dblclick.sGis-polygon');
    control._activeFeature = null;

    control._map.redrawLayer(control.activeLayer);
    control.fire('drawingFinish', {geom: geom});
}

})();



'use strict';

(function() {

sGis.controls.Editor = function(map, options) {
    this._map = map;
    if (options && options.activeLayer) this.activeLayer = options.activeLayer;
    
    utils.init(this, options);
};

sGis.controls.Editor.prototype = new sGis.Control({
    _allowDeletion: true,
    
    activate: function() {
        var features = this.activeLayer.features;
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            feature.addListner('click.sGis-editor', selectFeature);
        }
        this.activeLayer.addListner('featureAdd.sGis-editor', function(sGisEvent) {
            sGisEvent.feature.addListner('click.sGis-editor', selectFeature);
        });
        this.activeLayer.addListner('featureRemove.sGis-editor', function(sGisEvent) {
            sGisEvent.feature.removeListner('.sGis-editor');
        });

        this._active = true;
        
        var self = this;
        function selectFeature(sGisEvent) {
            self.selectFeature(this);
            
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        }
    },
    
    deactivate: function() {
        if (this._active) {
            if (this._selectedFeature) {
                this._map.removeLayer(this._tempLayer);
                this._map.removeListner('.sGis-editor');

                this.fire('featureDeselect', {feature: this._selectedFeature});
                this._selectedFeature = null;
            }

            var features = this._activeLayer.features;
            for (var i = 0; i < features.length; i++) {
                features[i].removeListner('.sGis-editor');
            }
            this._activeLayer.removeListner('.sGis-editor');

            this._active = false;
        }
    },

    selectFeature: function(feature) {
        if (this._selectedFeature) this.deselectFeature();

        var tempLayer = new sGis.FeatureLayer(),
            tempLayerIndex = this._map.getLayerIndex(this.activeLayer) + 1;

        this._tempLayer = tempLayer;
        var tempFeature = createTempFeature[feature.type](feature, this);

        tempLayer.add(tempFeature);

        this._map.prohibitEvent('layerAdd');
        this._map.moveLayerToIndex(tempLayer, tempLayerIndex);
        this._map.allowEvent('layerAdd');

        feature.removeListner('click.sGis-editor');
        feature.addListner('click.sGis-editor', doNothing);

        var self = this;

        this._tempLayer = tempLayer;
        this._selectedFeature = feature;
        this._map.addListner('click.sGis-editor', function(sGisEvent) {
            self.deselectFeature();
        });
        this._map.addListner('keydown.sGis-editor', onkeydown);
        this._map.addListner('layerRemove.sGis-editor', function(sGisEvent) {
            if (sGisEvent.layer === self.activeLayer) {
                self.deselectFeature();
                self._activeLayer = null;
            }
        });

        this.fire('featureSelect', {feature: feature});

        function onkeydown(sGisEvent) {
            var event = sGisEvent.browserEvent;
            if (event.which === 27) {
                self.deselectFeature();
            } else if (event.which === 46) {
                removeActiveFeature(self);
            }
        }
    },

    deselectFeature: function() {
        var feature = this._selectedFeature,
            self = this;

        this._map.removeLayer(this._tempLayer);
        this._map.removeListner('.sGis-editor');
        feature.removeListner('.sGis-editor');
        feature.addListner('click.sGis-editor', function(sGisEvent) {
            self.selectFeature(feature);
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        });
        
        this._selectedFeature = null;

        this.fire('featureDeselect', {feature: feature});
    }
});

Object.defineProperties(sGis.controls.Editor.prototype, {
    activeFeature: {
        get: function() {
            return this._selectedFeature;
        }
    },
    
    allowDeletion: {
        get: function() {
            return this._allowDeletion;
        },
        set: function(bool) {
            this._allowDeletion = bool;
        }
    }
});

function doNothing(sGisEvent) {
    sGisEvent.stopPropagation();
    sGisEvent.preventDefault();
}

var createTempFeature = {
    point: function(point,editor) {
        var tempPoint = new sGis.feature.Point(point.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y], {
            crs: point.crs,
            color: 'rgb(248,129,181)',
            size: parseInt(point.size) + 5,
            image: point.image ? point.image : '',
            anchorPoint: point.anchorPoint
        });
        
        tempPoint.addListner('click', doNothing);
        tempPoint.addListner('dragStart', pointDragStart);
        tempPoint.addListner('drag', dragPoint);
        return tempPoint;
        
        function dragPoint(sGisEvent) {
            if (this.crs === editor._map.crs) {
                point.x = this.x -= sGisEvent.offset.x;
                point.y = this.y -= sGisEvent.offset.y;
            } else {
                var tempFeature = this.projectTo(editor._map.crs);
                tempFeature.x -= sGisEvent.offset.x;
                tempFeature.y -= sGisEvent.offset.y;
                
                var projected = tempFeature.projectTo(this.crs);
                point.x = this.x = projected.x;
                point.y = this.y = projected.y;
            }
            
            editor._map.redrawLayer(editor._activeLayer);
            editor._map.redrawLayer(editor._tempLayer);

            editor.fire('featureMove', {feature: point});
        }
        
    },
    polyline: function(polyline, editor) {
        var points = polyline.coordinates,
            tempPolyline = new sGis.feature.Polyline(points, {
            crs: polyline.crs,
            color: 'rgb(248, 129, 181)',
            width: parseInt(polyline.width) + 1
        }),
            features = [tempPolyline];

        features = features.concat(getControlPoints(tempPolyline, editor));
        tempPolyline.addListner('click', addControlPoint);
        tempPolyline.addListner('dragStart',  function(sGisEvent) {
            sGisEvent.draggingObject = this;
        });
        tempPolyline.addListner('drag', function(sGisEvent) {
            movePolyline(this, sGisEvent.offset, editor);
        });
        
        return features;
        
        function addControlPoint(sGisEvent) {
            var index = sGisEvent.intersectionType,
                point = sGisEvent.point.projectTo(polyline.crs);            
            
            polyline.insertPoint(index[0], index[1] + 1, polyline.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y]);
            updateTempFeature(editor);
            
            updateTempFeature(editor);
            
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();

            editor.fire('featurePointAdd', {feature: polyline});
        }
    },
    polygon: function(polygon, editor) {
        
        var points = polygon.coordinates;
        
        for (var ring = 0, l = points.length; ring < l; ring++) {
            points[ring].push(points[ring][0]);
        }

        var tempPolyline = new sGis.feature.Polyline(points, {
            crs: polygon.crs,
            color: 'rgb(248, 129, 181)',
            width: parseInt(polygon.width) + 1
        }),
            features = [tempPolyline];

        features = features.concat(getControlPoints(tempPolyline, editor, true));
        tempPolyline.addListner('click', addControlPoint);
        tempPolyline.addListner('dragStart',  function(sGisEvent) {
            sGisEvent.draggingObject = this;
        });
        tempPolyline.addListner('drag', function(sGisEvent) {
            movePolyline(this, sGisEvent.offset, editor);
        });
        
        if (!polygon.hasListners('dragStart')) {
            polygon.addListner('dragStart.sGis-editor', function(sGisEvent) {
                sGisEvent.draggingObject = this;
            });
            polygon.addListner('drag.sGis-editor', function(sGisEvent) {
                movePolyline(editor._tempLayer.features[0], sGisEvent.offset, editor);
            });
        }
        
        return features;
        
        function addControlPoint(sGisEvent) {
            var index = sGisEvent.intersectionType;
            
            var point = sGisEvent.point.projectTo(polygon.crs);
            
            polygon.insertPoint(index[0], index[1] + 1, polygon.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y]);
            updateTempFeature(editor);
            
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();

            editor.fire('featurePointAdd', {feature: polygon, pointIndex: index + 1});
        }        
    }
};

function movePolyline(feature, offset, editor) {
    var tempFeature = feature.projectTo(editor._map.crs),
        coordinates = tempFeature.coordinates;
    for (var ring = 0, l = coordinates.length; ring < l; ring++) {
        for (var i = 0, m = coordinates[ring].length; i < m; i++) {
            coordinates[ring][i] = [coordinates[ring][i][0] - offset.x, coordinates[ring][i][1] - offset.y];
        }
    }
    
    tempFeature.coordinates = coordinates;
    
    feature.coordinates = tempFeature.projectTo(feature.crs).coordinates;
    
    if (editor._selectedFeature.type === 'polygon') {
        var tempCoord = feature.coordinates;
        for (var i = 0, len = tempCoord.length; i < len; i++) {
            tempCoord[i].pop();
        }
        editor._selectedFeature.coordinates = tempCoord;
    } else {
        editor._selectedFeature.coordinates = feature.coordinates;
    }
    
    updateTempFeature(editor);
    editor.fire('featureMove', { feature: editor._selectedFeature });
}

function getControlPoints(feature, editor, isPolygon) {
    var coordinates = feature.coordinates,
        controlPoints = [];

    if (isPolygon) {
        for (var ring = 0, l = coordinates.length; ring < l; ring++) {
            coordinates[ring].pop();
        }
    }    
    
    for (var ring = 0, l = coordinates.length; ring < l; ring++) {
        for (var i = 0, m = coordinates[ring].length; i < m; i++) {
            var point = new sGis.feature.Point(coordinates[ring][i], {
                crs: feature.crs,
                color: 'rgb(173, 90, 126)',
                size: Math.max(12, parseInt(feature.width) + 4)
            }); 

            point.indexInPolyline = {ring: ring, i: i};
            controlPoints.push(point);

            point.addListner('click', doNothing);
            point.addListner('dragStart', pointDragStart);
            point.addListner('drag', dragControlPoint);
            point.addListner('dblclick', removeControlPoint);
        }
    }
    
    controlPoints = controlPoints.concat(getScalingControls(feature, controlPoints, editor));

    return controlPoints;

    function dragControlPoint(sGisEvent) {
        if (this.crs === editor._map.crs) {
            this.x -= sGisEvent.offset.x;
            this.y -= sGisEvent.offset.y;
            
            var coordinates = [this.x, this.y];
        } else {
            var tempFeature = this.projectTo(editor._map.crs);
            tempFeature.x -= sGisEvent.offset.x;
            tempFeature.y -= sGisEvent.offset.y;

            var projected = tempFeature.projectTo(this.crs);
            this.x = projected.x;
            this.y = projected.y;
            
            coordinates = [this.y, this.x];
        }
        
        var ring = this.indexInPolyline.ring;
        
        feature.setPoint(ring, this.indexInPolyline.i, coordinates);
        if (isPolygon && this.indexInPolyline.i === 0) {
            feature.setPoint(ring, feature.coordinates[ring].length - 1, coordinates);
        }
        editor._selectedFeature.setPoint(this.indexInPolyline.ring, this.indexInPolyline.i, coordinates);
        
        updateScalingControls(feature, editor);

        editor._map.redrawLayer(editor._activeLayer);
        editor._map.redrawLayer(editor._tempLayer);

        editor.fire('featurePointChange', {feature: editor._selectedFeature, pointIndex: this.indexInPolyline});
    }

    function removeControlPoint(sGisEvent) {
        if (coordinates[this.indexInPolyline.ring].length > 2) {
            editor._selectedFeature.removePoint(this.indexInPolyline.ring, this.indexInPolyline.i);
            updateTempFeature(editor);

            editor.fire('featurePointRemove', {feature: editor._selectedFeature, pointIndex: this.indexInPolyline});
        } else {
            removeActiveFeature(editor);
        }

        sGisEvent.stopPropagation();
        sGisEvent.preventDefault();
    }
}

function updateScalingControls(feature, editor) {
    var featureList = editor._tempLayer.features.slice(0, -9),
        scalingControls = getScalingControls(feature, featureList.slice(1), editor);
    editor._tempLayer.features = featureList.concat(scalingControls);    
}

function getScalingControls(feature, controlPoints, editor) {
    var bbox = feature.bbox,
        scalingControls = [],
        midX = (bbox.p[0].x + bbox.p[1].x) / 2,
        midY = (bbox.p[0].y + bbox.p[1].y) / 2,
        symbol = new sGis.symbol.point.Square({size: 7, strokeWidth: 3}),
        coord = [
            [[bbox.p[0].x, bbox.p[0].y], [bbox.p[0].x, midY], [bbox.p[0].x, bbox.p[1].y]],
            [[midX, bbox.p[0].y], [midX, midY], [midX, bbox.p[1].y]],
            [[bbox.p[1].x, bbox.p[0].y], [bbox.p[1].x, midY], [bbox.p[1].x, bbox.p[1].y]]
        ];
    
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (i !== 1 || j !== 1) {
                var point = new sGis.feature.Point(coord[i][j], {crs: feature.crs, symbol: symbol, style: {offset: {x: (i - 1) * 10, y: (1 - j) * 10}}});
                point.scaleX = i !== 1;
                point.scaleY = j !== 1;
                
                point.addListner('dragStart', startDrag);
                point.addListner('drag', scalingDrag);
                
                scalingControls.push(point);
            }
        }
    }
    
    var rotationControl = new sGis.feature.Point([midX, bbox.p[1].y], {crs: feature.crs, style: {offset: {x: 0, y: -25}}});
    rotationControl.addListner('dragStart', rotationStart);
    rotationControl.addListner('drag', rotationDrag);
    rotationControl.addListner('dragEnd', rotationEnd);
    
    scalingControls.push(rotationControl);
    
    var pointGroup = new sGis.PointGroup(controlPoints.concat(scalingControls));
    
    return scalingControls;
    
    
    function startDrag(sGisEvent) {
        sGisEvent.draggingObject = this;
    }
    
    function scalingDrag(sGisEvent) {
        var basePoint = scalingControls[7 - scalingControls.indexOf(this)];
        if (this.scaleX && this.scaleY) {
            var scalingPoint = sGisEvent.point.coordinates;
        } else {
            var scalingPoint = sGis.geotools.pointToLineProjection(sGisEvent.point.coordinates, [this.coordinates, basePoint.coordinates]);
        }
        
        var kx = (basePoint.x - scalingPoint[0]) / (basePoint.x - this.x) || 1,
            ky = (basePoint.y - scalingPoint[1]) / (basePoint.y - this.y) || 1;
    
        pointGroup.scale([kx, ky], basePoint);
        feature.scale([kx, ky], basePoint);
        updateFeatureCoordinates(editor._selectedFeature, feature);
        
        editor._map.redrawLayer(editor._tempLayer);
        editor._map.redrawLayer(editor._activeLayer);
    }
    
    function rotationStart(sGisEvent) {
        sGisEvent.draggingObject = this;
        this.rotationBase = feature.centroid;
        editor.fire('rotationStart', sGisEvent);
    }
    
    function rotationDrag(sGisEvent) {
        var alpha1 = this.x === this.rotationBase[0] ? Math.PI / 2 : Math.atan2(this.y - this.rotationBase[1], this.x - this.rotationBase[0]),
            alpha2 = sGisEvent.point.x === this.rotationBase[0] ? Math.PI / 2 : Math.atan2(sGisEvent.point.y - this.rotationBase[1], sGisEvent.point.x - this.rotationBase[0]),
            angle = alpha2 - alpha1;
        
        pointGroup.rotate(angle, this.rotationBase);
        feature.rotate(angle, this.rotationBase);
        updateFeatureCoordinates(editor._selectedFeature, feature);
        updateScalingControls(feature, editor);
        
        sGisEvent.angle = alpha2 - Math.PI / 2;
        editor.fire('rotation', sGisEvent);

        editor._map.redrawLayer(editor._tempLayer);
        editor._map.redrawLayer(editor._activeLayer);
    }
    
    function rotationEnd(sGisEvent) {
        editor.fire('rotationEnd', sGisEvent);
    }
}

function updateFeatureCoordinates(feature, tempFeature) {
    if (feature.coordinates[0].length === tempFeature.coordinates[0].length) {
        feature.coordinates = tempFeature.coordinates;
    } else {
        var coord = [];
        for (var i = 0, len = tempFeature.coordinates.length; i < len; i++) {
            coord[i] = tempFeature.coordinates[i].slice(0, -1);
        }
        feature.coordinates = coord;
    }    
}

function removeActiveFeature(editor) {
    if (editor._allowDeletion) {
        var features = editor._tempLayer.features,
            feature = editor._selectedFeature;
        editor._activeLayer.remove(feature);
        for (var i in features) {
            editor._tempLayer.remove(features[i]);
        }
        editor._map.redrawLayer(editor._activeLayer);
        editor._map.redrawLayer(editor._tempLayer);

        editor._map.removeListner('.sGis-editor');

        editor.fire('featureRemove', {feature: feature});
    }
}

function updateTempFeature(editor) {
    var features = editor._tempLayer.features;
    for (var i in features) {
        editor._tempLayer.remove(features[i]);
    }


    var feature = editor._selectedFeature,
        updatedFeatures = createTempFeature[feature.type](feature, editor);
    editor._tempLayer.add(updatedFeatures);

    editor._map.redrawLayer(editor._activeLayer);
    editor._map.redrawLayer(editor._tempLayer);
}

function pointDragStart(sGisEvent) {
    sGisEvent.draggingObject = this;
    sGisEvent.stopPropagation();    
}

})();