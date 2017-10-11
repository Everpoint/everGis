import {browser} from "sgis/dist/utils/utils";

export const parseXmlJsonNode = function(node) {
    var string = '';
    for (var i = 0, len = node.childNodes.length; i < len; i++) {
        string += node.childNodes[i].nodeValue;
    }
    return parseJSON(string);
};

export const parseJSON = function(string) {
    try {
        var json = JSON.parse(string);
    } catch (e) {
        var changed = string.replace(/\\"/g, '\\"').replace(/NaN/g, '"NaN"').replace(/:-Infinity/g, ':"-Infinity"').replace(/:Infinity/g, ':"Infinity"');
        json = JSON.parse(changed);
    }
    return json;
};

export const message = function(mes) {
    if (window.console) {
        console.log(mes);
    }
};

declare var XDomainRequest;

export const ajax = function(properties) {
    var requestType = properties.type ? properties.type : 'GET';
    if (properties.cache === false) properties.url += '&ts=' + new Date().getTime();
    if (browser === 'MSIE 9') {
        var xdr = new XDomainRequest();
        xdr.onload = function() {
            if (properties.success) properties.success(xdr.responseText);
        };
        xdr.onerror = function() {if (properties.error) properties.error(xdr.responseText);};
        xdr.onprogress = function() {};
        xdr.timeout = 30000;
        xdr.open(requestType, properties.url);
        xdr.send(properties.data ? properties.data : null);
    } else {
        var XMLHttpRequest = (<any>window).XMLHttpRequest || (<any>window).ActiveXObject && function() {return new ActiveXObject('Msxml2.XMLHTTP');},
            xhr = new XMLHttpRequest();

        xhr.open(requestType, properties.url);

        if (properties.contentType) xhr.setRequestHeader('Content-Type', properties.contentType);

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (properties.success) properties.success(xhr.responseText, xhr.statusText);
                } else {
                    if (properties.error) properties.error(xhr.responseText, xhr.statusText);
                }
            }
        };
        xhr.timeout = 30000;
        xhr.send(properties.data ? properties.data : null);

        return xhr;
    }
};

export const ajaxp = function(properties) {
    return new Promise((resolve, reject) => {
        var prop = {
            success: (response, status) => { resolve([response, status, reject]); },
            error: (response, status) => { reject([response, status, reject]); }
        };
        prop = Object.assign(prop, properties);
        ajax(prop);
    });
};

export const arrayMove = function (array, from, to) {
    const newArray = array.slice();
    newArray.splice((to < 0 ? newArray.length + to : to), 0, newArray.splice(from, 1)[0]);
    return newArray;
};
