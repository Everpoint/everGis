'use strict';

$(document).ready(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    /*
     * Utils module tests
     */
    
    describe('utils', function() {
        describe('isArray', function() {
            it('should correctly destinguish array from not array', function() {
                expect(utils.isArray([])).toBeTruthy();
                expect(utils.isArray([1, 2])).toBeTruthy();
                expect(utils.isArray(['a', 'b'])).toBeTruthy();
                expect(utils.isArray([{hello: 'hello'}])).toBeTruthy();
                expect(utils.isArray([[[]]])).toBeTruthy();
                expect(utils.isArray([[], []])).toBeTruthy();
                expect(utils.isArray(1)).toBeFalsy();
                expect(utils.isArray('abc')).toBeFalsy();
                expect(utils.isArray({})).toBeFalsy();
                expect(utils.isArray(null)).toBeFalsy();
                expect(utils.isArray(undefined)).toBeFalsy();
                expect(utils.isArray(NaN)).toBeFalsy();
            });
        });
        
        describe('isString', function() {
            it('should correctly distinguish string from not string', function() {
                expect(utils.isString('hello')).toBeTruthy();
                expect(utils.isString('')).toBeTruthy();
                expect(utils.isString('123')).toBeTruthy();
                expect(utils.isString(123)).toBeFalsy();
                expect(utils.isString([])).toBeFalsy();
                expect(utils.isString(['absc'])).toBeFalsy();
                expect(utils.isString({})).toBeFalsy();
                expect(utils.isString(null)).toBeFalsy();
                expect(utils.isString()).toBeFalsy();
            });
        });

        describe('.copyObject()', function() {
            it('should copy all keys of the object and their values', function() {
                var obj = {a: undefined, b: null, c: 1, d: 'a', e: [1, 2], f: {a: 1, b: {c: 1, d: 2}}};
                var copy = utils.copyObject(obj);
                expect(obj).toEqual(copy);
                expect(copy).not.toBe(obj);
            });

            it('should copy Functions as Functions', function() {
                var obj = {a: function() {}};
                var copy = utils.copyObject(obj);
                expect(copy.a).toBe(obj.a);
            });
        });
    });

    /*
    * IEventHandler module
    */

    describe('IEventHandler', function() {
        var object;
        beforeEach(function() {
            object = {};
            utils.mixin(object, sGis.IEventHandler.prototype);
        });
        
        describe('methods', function() {
            it('.addListner() should add the listner, fire should activate it', function() {
                var fired = false;
                object.addListner('hello', function() {
                    fired = true;
                });
                
                expect(fired).toBeFalsy();
                object.fire('hello');
                expect(fired).toBeTruthy();
            });
            
            it('.addListners() should understand the namespaces', function() {
                var handler = function() {};
                
                object.addListner('event.namespace', handler);
                expect(object.hasListners('event')).toBeTruthy();
                
                object.addListner('event1 .namespace1 .namespace2', handler);
                expect(object.hasListners('event1')).toBeTruthy();
            });
            
            it('.removeListner() should remove the listener from the object', function() {
                var fired = false,
                handler = function() {
                    fired = true;
                };
                object.addListner('hello', handler);
                
                object.removeListner('hello', handler);
                expect(object.hasListners('hello')).toBeFalsy();
                
                object.fire('hello');
                expect(fired).toBeFalsy();
            });
            
            it('.removeListner() should remove all the listeners of the specified namespace', function() {
                var fired = false,
                    handler = function() {
                        fired = true;
                    };
                    
                object.addListner('type.namespace', handler);
                expect(object.hasListners('type')).toBeTruthy();
                
                object.removeListner('.namespace', handler);
                expect(object.hasListners('type')).toBeFalsy();
                
                object.addListner('type .namespace', function() {});
                object.addListner('type1 .namespace', function() {});
                object.addListner('type2 .namespece1', function() {});
                
                object.removeListner('.namespace');
                
                expect(object.hasListners('type')).toBeFalsy();
                expect(object.hasListners('type1')).toBeFalsy();
                expect(object.hasListners('type2')).toBeTruthy();
            });
            
            it('.removeListner() should remove all listeners if the handler and namespace are not specified', function() {
                object.addListner('type1', function() {});
                object.addListner('type1.namespace', function() {});
                object.addListner('type2', function() {});
                
                object.removeListner('type1');
                expect(object.hasListners('type1')).toBeFalsy();
            });
            
            it('.hasListners() should return true if at least one handler is specified for the event', function() {
                expect(function() {object.hasListners();}).toThrow();
                expect(function() {object.hasListners(1);}).toThrow();
                expect(function() {object.hasListners([]);}).toThrow();
                expect(function() {object.hasListners({});}).toThrow();

                var handler = function() {},
                    handler2 = function() {};
                
                expect(object.hasListners('event')).toBeFalsy();
                
                object.addListner('event', handler);
                expect(object.hasListners('event')).toBeTruthy();
                object.addListner('event', handler2);
                expect(object.hasListners('event')).toBeTruthy();
                
                object.removeListner('event', handler);
                expect(object.hasListners('event')).toBeTruthy();
                object.removeListner('event', handler2);
                expect(object.hasListners('event')).toBeFalsy();
                
                object.addListner('anotherEvent', handler);
                expect(object.hasListners('event')).toBeFalsy();
                
                object.removeListner('anotherEvent');
                expect(object.hasListners('anotherEvent')).toBeFalsy();
            });
            
            it('.hasListner() should return true only if the handler is attached to the object', function() {
                var handler = function() {};
                expect(object.hasListner('event', handler)).toBeFalsy();
                
                object.addListner('event', handler);
                expect(object.hasListner('event', handler)).toBeTruthy();

                object.removeListner('event', handler);
                expect(object.hasListner('event', handler)).toBeFalsy();
                
                var handler2 = function() {};
                object.addListner('event', handler);
                expect(object.hasListner('event', handler2)).toBeFalsy();
                
                object.addListner('event', handler2);
                expect(object.hasListner('event', handler)).toBeTruthy();
                expect(object.hasListner('event', handler2)).toBeTruthy();
                
                object.removeListner('event', handler);
                expect(object.hasListner('event', handler)).toBeFalsy();
                expect(object.hasListner('event', handler2)).toBeTruthy();
                
                object.removeListner('event');
            });
        });
    });
});