'use strict';

$(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    describe('sGis.utils.proto', function () {
        var Class, obj;
        beforeEach(function() {
            Class = function() {};
            Class.prototype = {};

            obj = new Class();
        });

        describe('.setProperties()', function() {
            it('should set default values of the specified properties', function() {
                sGis.utils.proto.setProperties(Class.prototype, {prop: null, text: 'a', number: 1});

                expect(obj.prop).toBe(null);
                expect(obj.text).toBe('a');
                expect(obj.number).toBe(1);
            });

            it('should set the properties through values', function() {
                sGis.utils.proto.setProperties(Class.prototype, {prop: null, text: 'a', number: 1});

                var prop = Object.getOwnPropertyDescriptor(Class.prototype, 'prop');
                var text = Object.getOwnPropertyDescriptor(Class.prototype, 'text');
                var number = Object.getOwnPropertyDescriptor(Class.prototype, 'number');
                expect(prop.value).toBeDefined();
                expect(text.value).toBeDefined();
                expect(number.value).toBeDefined();
            });

            it('should set the enumerable external properties and not enumerable internal', function() {
                sGis.utils.proto.setProperties(Class.prototype, {prop: null, text: 'a', number: 1});

                var keys = [];
                for (var i in obj) {
                    keys.push(i);
                }
                expect(keys).toEqual(['prop', 'text', 'number']);
            });

            describe('default', function() {
                it('should set default value if specified as object property', function() {
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc'}});

                    expect(obj.prop).toBe('abc');
                });

                it('should set the false default values except undefined', function() {
                    sGis.utils.proto.setProperties(Class.prototype, {a: {default: false}, b: {default: null}, c: {default: NaN}});

                    expect(obj.a).toBe(false);
                    expect(obj.b).toBe(null);
                    expect(isNaN(obj.c)).toBe(true);
                });
            });

            describe('get', function() {
                it('should set the getter function', function() {
                    var called = false;
                    var getter = function() {called = true; return this._prop};
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', get: getter}});

                    expect(called).toBe(false);
                    var value = obj.prop;
                    expect(value).toBe('abc');
                    expect(called).toBe(true);
                });

                it('should return the result of the getter function if there is', function() {
                    var getter = function() {return 0;};
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', get: getter}});

                    var value = obj.prop;
                    expect(value).toBe(0);
                    expect(obj._prop).toBe('abc');
                });

                it('should set no getter function if null is given', function() {
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', get: null}});
                    var descriptor = Object.getOwnPropertyDescriptor(Class.prototype, 'prop');

                    expect(descriptor.get).not.toBeDefined();
                    expect(descriptor.set).toBeDefined();
                });

                it('should be called in the context of the object', function() {
                    var context;
                    var getter = function() {context = this};
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', get: getter}});

                    obj.prop;
                    expect(context).toBe(obj);
                });
            });

            describe('set', function() {
                it('should set the setter function', function () {
                    var called = false;
                    var setter = function (val) {
                        called = true;
                        this._prop = val;
                    };
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', set: setter}});

                    expect(called).toBe(false);
                    obj.prop = 1;
                    expect(called).toBe(true);
                    expect(obj.prop).toBe(1);
                });

                it('should be called with one argument - new value', function () {
                    var val;
                    var setter = function (val) {
                        this._prop = {len: arguments.length, val: val};
                    };
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', set: setter}});

                    expect(obj.prop).toBe('abc');
                    obj.prop = 1;
                    expect(obj.prop).toEqual({len: 1, val: 1});
                });

                it('should not set the setter, if null is given', function() {
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', set: null}});
                    var descriptor = Object.getOwnPropertyDescriptor(Class.prototype, 'prop');

                    expect(descriptor.set).not.toBeDefined();
                    expect(descriptor.get).toBeDefined();
                });

                it('should be called in the context of the object', function() {
                    var context;
                    var setter = function() {context = this};
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: 'abc', set: setter}});

                    obj.prop = 1;
                    expect(context).toBe(obj);
                });
            });

            describe('type', function() {
                it('should set the instanceof check if constructor function is given', function() {
                    var point = new sGis.feature.Point([0,0]);
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: point, type: sGis.Feature}});

                    expect(function() { obj.prop = 1; }).toThrow();
                    expect(function() { obj.prop = 'abc'; }).toThrow();
                    expect(function() { obj.prop = {}; }).toThrow();

                    expect(obj.prop).toBe(point);

                    var polygon = new sGis.feature.Polygon([[0,0]]);
                    expect(function() { obj.prop = polygon; }).not.toThrow();
                    expect(obj.prop).toBe(polygon);
                });

                it('should work with specified setter function', function() {
                    var point = new sGis.feature.Point([0,0]);
                    var called = false;
                    var setter = function(val) {called = true; this._prop = val};

                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: point, type: sGis.Feature, set: setter}});
                    expect(function() { obj.prop = 1; }).toThrow();

                    expect(called).toBe(false);
                    obj.prop = new sGis.feature.Polygon([[]]);
                    expect(called).toBe(true);
                });

                it('should allow null value for any type', function() {
                    var point = new sGis.feature.Point([0,0]);
                    sGis.utils.proto.setProperties(Class.prototype, {prop: {default: point, type: sGis.Feature}});
                    expect(function() { obj.prop = null; }).not.toThrow();
                    expect(obj.prop).toBe(null);
                });
            });
        });
    });
});