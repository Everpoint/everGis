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

                it('should understand the namespaces', function () {
                    object.addListener('event.namespace', f);
                    expect(object.hasListeners('event')).toBe(true);
                    expect(object.hasListeners('namespace')).toBe(false);

                    object.addListener('event1 .namespace1 .namespace2', f);
                    expect(object.hasListeners('event1')).toBe(true);
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
            });

            describe('.addListner()', function() {
                it('should be alias for .addListener', function() {
                    expect(object.addListner).toBe(object.addListener);
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
                    object.addListener('type2 .namespece1', function () {
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
        });
    });
});