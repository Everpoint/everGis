'use strict';

$(document).ready(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    describe('Spatial Processor utils', function () {
        beforeEach(function() {
            $('#map').width(500).height(500);
        });

        afterEach(function() {
            $('#map').html('').width(0).height(0);;
        });

        describe('sGis.utils.Color', function() {
            describe('initialization', function() {
                it('should create the Color object with specified original color parameter', function() {
                    var color = new sGis.utils.Color('red');
                    expect(color.original).toBe('red');

                    var color1 = new sGis.utils.Color('#ffffff');
                    expect(color1.original).toBe('#ffffff');

                    var color2 = new sGis.utils.Color('notacolor');
                    expect(color2.original).toBe('notacolor');
                });
            });

            describe('#rgb format', function() {
                it('.isValid should be true if colors are symbols [0-9a-f]', function() {
                    var toCheck = ['#000', '#123', '#abc', '#def', '#fff', ' #1f2', '#ABC', '#DEF', '#FFF'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                        if (!color.isValid) debugger;
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['#g00', '#00q', '#-100', '#а11', '#   '];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['#000', '#123', '#abc', '#def', '#fff', ' #1f2', '#ABC', '#DEF', '#FFF'];
                    var correctResult = [0, 17, 170, 221, 255, 17, 170, 221, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['#000', '#123', '#abc', '#def', '#fff', ' #1f2', '#ABC', '#DEF', '#FFF'];
                    var correctResult = [0, 34, 187, 238, 255, 255, 187, 238, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['#000', '#123', '#abc', '#def', '#fff', ' #1f2', '#ABC', '#DEF', '#FFF'];
                    var correctResult = [0, 51, 204, 255, 255, 34,  204, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['#000', '#123', '#abc', '#def', '#fff', ' #1f2', '#ABC', '#DEF', '#FFF'];
                    var correctResult = [255, 255, 255, 255, 255, 255, 255, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('#rrggbb format', function() {
                it('.isValid should be true if colors are symbols [0-9a-f]', function() {
                    var toCheck = ['#000000', '#123456', '#abcdef', '#001122', '#ffffff', ' #11ff22', '#ABCDEF', '#FFFFFF'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['#g00000', '#00000q', '#-10120', '#а11111', '#      '];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['#000000', '#123456', '#abcdef', '#001122', '#ffffff', ' #11ff22', '#ABCDEF', '#FFFFFF'];
                    var correctResult = [0, 18, 171, 0, 255, 17, 171, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['#000000', '#123456', '#abcdef', '#001122', '#ffffff', ' #11ff22', '#ABCDEF', '#FFFFFF'];
                    var correctResult = [0, 52, 205, 17, 255, 255, 205, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['#000000', '#123456', '#abcdef', '#001122', '#ffffff', ' #11ff22', '#ABCDEF', '#FFFFFF'];
                    var correctResult = [0, 86, 239, 34, 255, 34,  239, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['#000000', '#123456', '#abcdef', '#001122', '#ffffff', ' #11ff22', '#ABCDEF', '#FFFFFF'];
                    var correctResult = [255, 255, 255, 255, 255, 255, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('#argb format', function() {
                it('.isValid should be true if colors are symbols [0-9a-f]', function() {
                    var toCheck = ['#0000', '#1123', '#eabc', '#adef', '#ffff', ' #91f2', '#EABC', '#ADEF', '#FFFF'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['#g000', '#000q', '#-100', '#а111', '#    '];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['#0000', '#1123', '#eabc', '#adef', '#ffff', ' #91f2', '#EABC', '#ADEF', '#FFFF'];
                    var correctResult = [0, 17, 170, 221, 255, 17, 170, 221, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['#0000', '#1123', '#eabc', '#adef', '#ffff', ' #91f2', '#EABC', '#ADEF', '#FFFF'];
                    var correctResult = [0, 34, 187, 238, 255, 255, 187, 238, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['#0000', '#1123', '#eabc', '#adef', '#ffff', ' #91f2', '#EABC', '#ADEF', '#FFFF'];
                    var correctResult = [0, 51, 204, 255, 255, 34,  204, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['#0000', '#1123', '#eabc', '#adef', '#ffff', ' #91f2', '#EABC', '#ADEF', '#FFFF'];
                    var correctResult = [0, 17, 238, 170, 255, 153, 238, 170, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('#aarrggbb format', function() {
                it('.isValid should be true if colors are symbols [0-9a-f]', function() {
                    var toCheck = ['#00000000', '#98123456', '#aaabcdef', '#33001122', '#ffffffff', ' #1a11ff22', '#ACABCDEF', '#FFFFFFFF'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['#g0000000', '#0000000q', '#-1012000', '#а1111111', '#        '];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['#00000000', '#98123456', '#aaabcdef', '#33001122', '#ffffffff', ' #1a11ff22', '#ACABCDEF', '#FFFFFFFF'];
                    var correctResult = [0, 18, 171, 0, 255, 17, 171, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['#00000000', '#98123456', '#aaabcdef', '#33001122', '#ffffffff', ' #1a11ff22', '#ACABCDEF', '#FFFFFFFF'];
                    var correctResult = [0, 52, 205, 17, 255, 255, 205, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['#00000000', '#98123456', '#aaabcdef', '#33001122', '#ffffffff', ' #1a11ff22', '#ACABCDEF', '#FFFFFFFF'];
                    var correctResult = [0, 86, 239, 34, 255, 34,  239, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['#00000000', '#98123456', '#aaabcdef', '#33001122', '#ffffffff', ' #1a11ff22', '#ACABCDEF', '#FFFFFFFF'];
                    var correctResult = [0, 152, 170, 51, 255, 26, 172, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('rgb number format', function() {
                it('.isValid should be true if colors are integers between 0 and 255', function() {
                    var toCheck = ['rgb(0,0,0)', 'rgb(10, 20, 30)', 'rgb(300, 400, 555)', 'rgb(   -1,    -50    ,  -10)    ', '   rgb(  255,  255, 255 )'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                        if (!color.isValid) debugger;
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['rgb()', 'rgb (1,50,0)', 'rgb(255,255,100.1)', 'rgb(#1, 1, 1)', 'rgb(a, 1, 1)', 'rgb(1, 1, )', ];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                        if (color.isValid) debugger;
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['rgb(0,0,0)', 'rgb(10, 20, 30)', 'rgb(300, 400, 555)', 'rgb(   -1,    -50    ,  -10)    ', '   rgb(  255,  255, 255 )'];
                    var correctResult = [0, 10, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['rgb(0,0,0)', 'rgb(10, 20, 30)', 'rgb(300, 400, 555)', 'rgb(   -1,    -50    ,  -10)    ', '   rgb(  255,  255, 255 )'];
                    var correctResult = [0, 20, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['rgb(0,0,0)', 'rgb(10, 20, 30)', 'rgb(300, 400, 555)', 'rgb(   -1,    -50    ,  -10)    ', '   rgb(  255,  255, 255 )'];
                    var correctResult = [0, 30, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['rgb(0,0,0)', 'rgb(10, 20, 30)', 'rgb(300, 400, 555)', 'rgb(   -1,    -50    ,  -10)    ', '   rgb(  255,  255, 255 )'];
                    var correctResult = [255, 255, 255, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('rgb percent format', function() {
                it('.isValid should be true if colors are integers between 0 and 255', function() {
                    var toCheck = ['rgb(0%,0%,0%)', 'rgb(10%, 20%, 30%)', 'rgb(105%, 205%, 305%)', 'rgb(   1.2%,    50.5%    ,  0.7%)    ', '   rgb(  -105%,  -155%, -255.5% )'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                        if (!color.isValid) debugger;
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['rgb(10%, 0, 100)', 'rgb(10, 20%, 30)', 'rgb(0%, 10 %, 100%)', 'rgb(a%, 1, 1)', 'rgb(1.1.1%, 1%, 1%)', 'rgb(--1%, 1%, 1%'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                        if (color.isValid) debugger;
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['rgb(0%,0%,0%)', 'rgb(10%, 20%, 30%)', 'rgb(105%, 205%, 305%)', 'rgb(   1.2%,    50.5%    ,  0.7%)    ', '   rgb(  -105%,  -155%, -255.5% )'];
                    var correctResult = [0, 25, 255, 3, 0];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                // todo: there is some issue with rounding, need to study. Maybe use .toFixed?
                xit('should correctly interpret the value of G channel', function() {
                    var toCheck = ['rgb(0%,0%,0%)', 'rgb(10%, 20%, 30%)', 'rgb(105%, 205%, 305%)', 'rgb(   1.2%,    50.5%    ,  0.7%)    ', '   rgb(  -105%,  -155%, -255.5% )'];
                    var correctResult = [0, 51, 255, 129, 0];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['rgb(0%,0%,0%)', 'rgb(10%, 20%, 30%)', 'rgb(105%, 205%, 305%)', 'rgb(   1.2%,    50.5%    ,  0.7%)    ', '   rgb(  -105%,  -155%, -255.5% )'];
                    var correctResult = [0, 76, 255, 1, 0];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['rgb(0%,0%,0%)', 'rgb(10%, 20%, 30%)', 'rgb(105%, 205%, 305%)', 'rgb(   1.2%,    50.5%    ,  0.7%)    ', '   rgb(  -105%,  -155%, -255.5% )'];
                    var correctResult = [255, 255, 255, 255, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('rgba number format', function() {
                it('.isValid should be true if colors are integers between 0 and 255', function() {
                    var toCheck = ['rgba(0,0,0,0)', 'rgba(10, 20, 30, 0.1)', 'rgba(300, 400, 555, 1.1)', 'rgba(   -1,    -50    ,  -10, -1)    ', '   rgba(  255,  255, 255, 1 )'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(true);
                        if (!color.isValid) debugger;
                    }
                });

                it('.isValid should be false if there are other symbols', function() {
                    var toCheck = ['rgba()', 'rgba(10, 20, 300)', 'rgba (1,50,0, 0.1)', 'rgba(255,255,100.1, 0.1)', 'rgba(#1, 1, 1, 0.1)', 'rgb(a, 1, 1, 0.1)'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                        if (color.isValid) debugger;
                    }
                });

                it('should correctly interpret the value of R channel', function() {
                    var toCheck = ['rgba(0,0,0,0)', 'rgba(10, 20, 30, 0.1)', 'rgba(300, 400, 555, 1.1)', 'rgba(   -1,    -50    ,  -10, -1)    ', '   rgba(  255,  255, 255, 1 )'];
                    var correctResult = [0, 10, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.r).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of G channel', function() {
                    var toCheck = ['rgba(0,0,0,0)', 'rgba(10, 20, 30, 0.1)', 'rgba(300, 400, 555, 1.1)', 'rgba(   -1,    -50    ,  -10, -1)    ', '   rgba(  255,  255, 255, 1 )'];
                    var correctResult = [0, 20, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.g).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of B channel', function() {
                    var toCheck = ['rgba(0,0,0,0)', 'rgba(10, 20, 30, 0.1)', 'rgba(300, 400, 555, 1.1)', 'rgba(   -1,    -50    ,  -10, -1)    ', '   rgba(  255,  255, 255, 1 )'];
                    var correctResult = [0, 30, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.b).toBe(correctResult[i]);
                    }
                });

                it('should correctly interpret the value of A channel', function() {
                    var toCheck = ['rgba(0,0,0,0)', 'rgba(10, 20, 30, 0.1)', 'rgba(300, 400, 555, 1.1)', 'rgba(   -1,    -50    ,  -10, -1)    ', '   rgba(  255,  255, 255, 1 )'];
                    var correctResult = [0, 25.5, 255, 0, 255];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.a).toBe(correctResult[i]);
                    }
                });
            });

            describe('color name format', function() {
                it('should interpret correctly the specified css color names', function() {
                    for (var i in sGis.utils.Color.names) {
                        var color = new sGis.utils.Color(i);
                        var hexColor = new sGis.utils.Color('#' + sGis.utils.Color.names[i]);
                        expect(color.channels).toEqual(hexColor.channels);
                    }
                });

                it('should be invalid in case of unknown color', function() {
                    var toCheck = ['', 'zeleniy', '123'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.isValid).toBe(false);
                        if (color.isValid) debugger;
                    }
                });
            });

            describe('.toString() method', function() {
                it('should return color string in rgba format by default', function() {
                    var toCheck = ['red', 'rgb(10, 20, 30)', 'rgba(20, 30, 40, 0.5)', '#123', '#1234', '#123456', '#12345678'];
                    var correctResult = ['rgba(255,0,0,1)', 'rgba(10,20,30,1)', 'rgba(20,30,40,0.5)', 'rgba(17,34,51,1)', 'rgba(34,51,68,0.0666667)', 'rgba(18,52,86,1)', 'rgba(52,86,120,0.0705882)'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.toString()).toBe(correctResult[i]);
                    }
                });

                it('should return color string in #aarrggbb format if hex format is specified', function() {
                    var toCheck = ['red', 'rgb(10, 20, 30)', 'rgba(20, 30, 40, 0.5)', '#123', '#1234', '#123456', '#12345678'];
                    var correctResult = ['#ffff0000', '#ff0a141e', '#7f141e28', '#ff112233', '#11223344', '#ff123456', '#12345678'];
                    for (var i = 0; i < toCheck.length; i++) {
                        var color = new sGis.utils.Color(toCheck[i]);
                        expect(color.toString('hex')).toBe(correctResult[i]);
                    }
                });
            });
        });
    });
});