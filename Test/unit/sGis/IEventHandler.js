'use strict';

$(function() {
    describe('IEventHandler', function () {
        var object;
        var f = function() {};
        beforeEach(function () {
            object = {};
            utils.mixin(object, sGis.IEventHandler.prototype);
        });

        describe('methods', function () {
            describe('.addListener()', function() {
                it('should add the listener', function () {
                    object.addListener('hello', f);

                    expect(object.hasListeners('hello')).toBe(true);
                });

                it('should distinguish event types and namespaces', function () {
                    object.addListener('event.namespace', f);
                    expect(object.hasListeners('event')).toBe(true);
                    expect(object.hasListeners('namespace')).toBe(false);

                    object.addListener('event1 .namespace1 .namespace2', f);
                    expect(object.hasListeners('event1')).toBe(true);
                    expect(object.hasListeners('namespace1')).toBe(false);
                });

                it('should set the handler for different events if several event names are provided', function() {
                    object.addListener('event event1', f);

                    expect(object.hasListeners('event')).toBe(true);
                    expect(object.hasListeners('event1')).toBe(true);
                });

                it('should get event names and namespaces in any order', function() {
                    object.addListener('event.ns event1 .ns2 event2', f);

                    expect(object.hasListeners('event')).toBe(true);
                    expect(object.hasListeners('event1')).toBe(true);
                    expect(object.hasListeners('event2')).toBe(true);
                    expect(object.hasListeners('ns')).toBe(false);
                    expect(object.hasListeners('ns2')).toBe(false);
                });

                it('should throw an exception if event name is not a valid string', function() {
                    expect(function() { object.addListener(undefined, f); }).toThrow();
                    expect(function() { object.addListener(null, f); }).toThrow();
                    expect(function() { object.addListener(1, f); }).toThrow();
                    expect(function() { object.addListener(['a'], f); }).toThrow();
                    expect(function() { object.addListener({a:'a'}, f); }).toThrow();
                    expect(function() { object.addListener('', f); }).toThrow();
                    expect(function() { object.addListener('.ns', f); }).toThrow();
                });

                it('should throw an exception if the handler is not a function', function() {
                    expect(function() { object.addListner('a'); }).toThrow();
                    expect(function() { object.addListner('a', 1); }).toThrow();
                    expect(function() { object.addListner('a', 'Function'); }).toThrow();
                    expect(function() { object.addListner('a', {}); }).toThrow();
                    expect(function() { object.addListner('a', []); }).toThrow();
                });
            });

            describe('.addListner()', function() {
                it('should be alias for .addListener', function() {
                    expect(object.addListner).toBe(object.addListener);
                });
            });

            describe('.on()', function() {
                it('should be alias for .addListener', function() {
                    expect(object.on).toBe(object.addListener);
                });
            });

            describe('.removeListener()', function() {
                it('.removeListener() should remove the listener from the object', function () {
                    var fired = false,
                        handler = function () {
                            fired = true;
                        };
                    object.addListener('hello', handler);

                    object.removeListener('hello', handler);
                    expect(object.hasListeners('hello')).toBeFalsy();

                    object.fire('hello');
                    expect(fired).toBeFalsy();
                });

                it('.removeListener() should remove all the listeners of the specified namespace', function () {
                    var fired = false,
                        handler = function () {
                            fired = true;
                        };

                    object.addListener('type.namespace', handler);
                    expect(object.hasListeners('type')).toBeTruthy();

                    object.removeListener('.namespace', handler);
                    expect(object.hasListeners('type')).toBeFalsy();

                    object.addListener('type .namespace', function () {
                    });
                    object.addListener('type1 .namespace', function () {
                    });
                    object.addListener('type2 .namespace1', function () {
                    });

                    object.removeListener('.namespace');

                    expect(object.hasListeners('type')).toBeFalsy();
                    expect(object.hasListeners('type1')).toBeFalsy();
                    expect(object.hasListeners('type2')).toBeTruthy();
                });

                it('.removeListener() should remove all listeners if the handler and namespace are not specified', function () {
                    object.addListener('type1', function () {
                    });
                    object.addListener('type1.namespace', function () {
                    });
                    object.addListener('type2', function () {
                    });

                    object.removeListener('type1');
                    expect(object.hasListeners('type1')).toBeFalsy();
                });
            });

            describe('.removeListner()', function() {
                it('should be alias for .removeListener', function() {
                    expect(object.removeListner).toBe(object.removeListener);
                });
            });

            describe('.off()', function() {
                it('should be alias for .removeListener', function() {
                    expect(object.off).toBe(object.removeListener);
                });
            });

            it('.hasListeners() should return true if at least one handler is specified for the event', function () {
                expect(function () {
                    object.hasListeners();
                }).toThrow();
                expect(function () {
                    object.hasListeners(1);
                }).toThrow();
                expect(function () {
                    object.hasListeners([]);
                }).toThrow();
                expect(function () {
                    object.hasListeners({});
                }).toThrow();

                var handler = function () {
                    },
                    handler2 = function () {
                    };

                expect(object.hasListeners('event')).toBeFalsy();

                object.addListener('event', handler);
                expect(object.hasListeners('event')).toBeTruthy();
                object.addListener('event', handler2);
                expect(object.hasListeners('event')).toBeTruthy();

                object.removeListener('event', handler);
                expect(object.hasListeners('event')).toBeTruthy();
                object.removeListener('event', handler2);
                expect(object.hasListeners('event')).toBeFalsy();

                object.addListener('anotherEvent', handler);
                expect(object.hasListeners('event')).toBeFalsy();

                object.removeListener('anotherEvent');
                expect(object.hasListeners('anotherEvent')).toBeFalsy();
            });

            it('.hasListener() should return true only if the handler is attached to the object', function () {
                var handler = function () {
                };
                expect(object.hasListener('event', handler)).toBeFalsy();

                object.addListener('event', handler);
                expect(object.hasListener('event', handler)).toBeTruthy();

                object.removeListener('event', handler);
                expect(object.hasListener('event', handler)).toBeFalsy();

                var handler2 = function () {
                };
                object.addListener('event', handler);
                expect(object.hasListener('event', handler2)).toBeFalsy();

                object.addListener('event', handler2);
                expect(object.hasListener('event', handler)).toBeTruthy();
                expect(object.hasListener('event', handler2)).toBeTruthy();

                object.removeListener('event', handler);
                expect(object.hasListener('event', handler)).toBeFalsy();
                expect(object.hasListener('event', handler2)).toBeTruthy();

                object.removeListener('event');
            });

            describe('.hasListner()', function() {
                it('should be alias for .hasListener', function() {
                    expect(object.hasListner).toBe(object.hasListener);
                });
            });

            describe('.fire()', function() {
                var fired1, fired2, f1, f2;
                beforeEach(function() {
                    fired1 = false;
                    fired2 = false;
                    f1 = function() { fired1 = true; };
                    f2 = function() { fired2 = true; };
                });

                it('should call the event handler', function() {
                    object.on('event', f1);
                    object.fire('event');

                    expect(fired1).toBe(true);
                    expect(fired2).toBe(false);
                });

                it('should call all handlers for the given event', function() {
                    object.on('event', f1);
                    object.on('event', f2);

                    object.fire('event');
                    expect(fired1).toBe(true);
                    expect(fired2).toBe(true);
                });

                it('should not call handlers of hte different events', function() {
                    object.on('event', f1);
                    object.on('event1', f2);

                    object.fire('event1');
                    expect(fired1).toBe(false);
                    expect(fired2).toBe(true);
                });

                it('should call handlers in the order they were added', function() {
                    var rightOrder = false;
                    var f3 = function() {
                        if (fired1 && !fired2) rightOrder = true;
                    };

                    object.on('event', f1);
                    object.on('event', f3);
                    object.on('event', f2);

                    object.fire('event');
                    expect(rightOrder).toBe(true);
                });

                it('should call the same handler for each time it was added', function() {
                    var counter = 0;
                    var f3 = function() { counter++; };

                    object.on('event', f3);
                    object.on('event', f1);
                    object.on('event', f3);
                    object.on('event', f3);
                    object.fire('event');

                    expect(counter).toBe(3);
                });

                it('should throw an exception if no event type is given', function() {
                    object.on('event', f1);
                    expect(function() { object.fire(); }).toThrow();
                    expect(function() { object.fire(1); }).toThrow();
                    expect(function() { object.fire([]); }).toThrow();
                    expect(function() { object.fire({}); }).toThrow();
                    expect(function() { object.fire(null); }).toThrow();
                    expect(function() { object.fire('.ns'); }).toThrow();
                });

                it('should throw an exception if more then one event type is given', function() {
                    object.on('event', f1);
                    expect(function() { object.fire('event event1'); }).toThrow();
                });

                it('should ignore the namespaces in the description', function() {
                    object.on('event.ns', f1);
                    object.on('event.ns1', f2);

                    object.fire('event.ns1');
                    expect(fired1).toBe(true);
                    expect(fired2).toBe(true);
                });

                it('should call the handle in the source object context', function() {
                    var correct = false;
                    var f3 = function() {
                        correct = this === object;
                    };
                    object.on('event', f3);
                    object.fire('event');

                    expect(correct).toBe(true);
                });
            });
        });
    });
});