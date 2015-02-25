'use strict';

(function() {

    sGis.utils.svg = {
        ns: 'http://www.w3.org/2000/svg',

        base: function(properties) {
            var svg = document.createElementNS(this.ns, 'svg');
            setAttributes(svg, properties);

            return svg;
        },

        path: function(properties) {

            var path = document.createElementNS(this.ns, 'path');
            var svgAttributes = setAttributes(path, properties);
            var svg = this.base(svgAttributes);
            svg.appendChild(path);

            return svg;
        },

        circle: function(properties) {
            var circle = document.createElementNS(this.ns, 'circle');
            var svgAttributes = setAttributes(circle, properties);
            var svg = this.base(svgAttributes);

            svg.appendChild(circle);

            return svg;
        }
    };

    var svgAttributes = ['width', 'height', 'viewBox'];
    function setAttributes(element, attributes) {
        var isSvg = element instanceof SVGSVGElement;
        var notSet = {};
        for (var i in attributes) {
            if (attributes.hasOwnProperty(i)) {
                if (!isSvg && svgAttributes.indexOf(i) !== -1) {
                    notSet[i] = attributes[i];
                    continue;
                }

                if (i === 'stroke' || i === 'fill') {
                    var color = new sGis.utils.Color(attributes[i]);
                    if (color.a < 255 || color.format === 'rgba') {
                        element.setAttribute(i, color.toString('rgb'));
                        if (color.a < 255) element.setAttribute(i + '-opacity', color.a / 255);
                        continue;
                    }
                }
                element.setAttribute(i, attributes[i]);
            }
        }

        return notSet;
    }

})();