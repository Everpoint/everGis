'use strict';

(function() {

/**
 *
 * @namespace
 */
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

})();'use strict';

(function() {
    
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

/**
 * Checks if a point is located inside a polygon.
 * @param {Number[]} polygon - coordinates of polygon in format [[[x11, y11], [x12, y12], ...], [x21, y21], [x22, y22], ...], ...]. If there is only one counter outer array can be ommited.
 * @param {[Number, Number]} point - coordinates of the point [x, y]
 * @param {Number} [tolerance=0] - the tolerance of check. If the point is out of the polygon, but is closer then tolerance, the returned result will be true.
 * @returns {boolean}
 */
sGis.geotools.contains = function(polygon, point, tolerance) {
    sGis.utils.validate.array(polygon[0]);
    sGis.utils.validate.array(point);
    tolerance = tolerance || 0;
    var intersectionCount = 0;

    var polygonCoord = polygon[0][0][0] === undefined ? [polygon] : polygon;
    for (var ring = 0, l = polygonCoord.length; ring < l; ring++) {
        var points = polygonCoord[ring].concat([polygonCoord[ring][0]]),
            prevD = points[0][0] > point[0],
            prevH = points[0][1] > point[1];

        for (var i = 1; i < points.length; i++) {
            if (sGis.geotools.pointToLineDistance(point, [points[i - 1], points[i]]) <= tolerance) {
                return true;
            }

            var D = points[i][0] > point[0],
                H = points[i][1] > point[1];

            if (H !== prevH //otherwise line does not intersect horizontal line
                && (D > 0 || prevD > 0) //line is to the left from the point, but we look to the right
            ) {
                if (!(point[1] === points[i][1] && point[1] === points[i-1][1])) { //checks if line is horizontal and has same Y with point
                    if (sGis.geotools.intersects([[points[i][0], points[i][1]], [points[i - 1][0], points[i - 1][1]]], [point, [Math.max(points[i][0], points[i - 1][0]), point[1]]])) {
                        intersectionCount++;
                    }
                }
            }
            prevD = D;
            prevH = H;
        }
        if (intersectionCount % 2 === 1) return true;
    }

    return false;
};

sGis.geotools.pointToLineDistance = function(point, line) {
    var lx = line[1][0] - line[0][0],
        ly = line[1][1] - line[0][1],
        dx = line[0][0] - point[0],
        dy = line[0][1] - point[1],
        t = 0 - (dx * lx + dy * ly) / (lx * lx + ly * ly);

    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.sqrt(Math.pow(lx * t + dx, 2) + Math.pow(ly * t + dy, 2));
};

sGis.geotools.intersects = function(line1, line2) {
    if (line1[0][0] === line1[1][0]) {
        return line1[0][0] > line2[0][0];
    } else {
        var k = (line1[0][1] - line1[1][1]) / (line1[0][0] - line1[1][0]),
            b = line1[0][1] - k * line1[0][0],
            x = (line2[0][1] - b) / k;

        return x > line2[0][0];
    }
};

})();/*
 (c) 2013, Vladimir Agafonkin
 RBush, a JavaScript library for high-performance 2D spatial indexing of points and rectangles.
 https://github.com/mourner/rbush
*/

(function() {
    'use strict';

    function rbush(maxEntries, format) {

        // jshint newcap: false, validthis: true
        if (!(this instanceof rbush)) return new rbush(maxEntries, format);

        // max entries in a node is 9 by default; min node fill is 40% for best performance
        this._maxEntries = Math.max(4, maxEntries || 9);
        this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

        if (format) {
            this._initFormat(format);
        }

        this.clear();
    }

    rbush.prototype = {

        all: function() {
            return this._all(this.data, []);
        },

        search: function(bbox) {

            var node = this.data,
                result = [],
                toBBox = this.toBBox;

            if (!intersects(bbox, node.bbox)) return result;

            var nodesToSearch = [],
                i, len, child, childBBox;

            while (node) {
                for (i = 0, len = node.children.length; i < len; i++) {

                    child = node.children[i];
                    childBBox = node.leaf ? toBBox(child) : child.bbox;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf) result.push(child);
                        else if (contains(bbox, childBBox)) this._all(child, result);
                        else nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return result;
        },

        load: function(data) {
            if (!(data && data.length)) return this;

            if (data.length < this._minEntries) {
                for (var i = 0, len = data.length; i < len; i++) {
                    this.insert(data[i]);
                }
                return this;
            }

            // recursively build the tree with the given data from stratch using OMT algorithm
            var node = this._build(data.slice(), 0, data.length - 1, 0);

            if (!this.data.children.length) {
                // save as is if tree is empty
                this.data = node;

            } else if (this.data.height === node.height) {
                // split root if trees have the same height
                this._splitRoot(this.data, node);

            } else {
                if (this.data.height < node.height) {
                    // swap trees if inserted one is bigger
                    var tmpNode = this.data;
                    this.data = node;
                    node = tmpNode;
                }

                // insert the small tree into the large tree at appropriate level
                this._insert(node, this.data.height - node.height - 1, true);
            }

            return this;
        },

        insert: function(item) {
            if (item) this._insert(item, this.data.height - 1);
            return this;
        },

        clear: function() {
            this.data = {
                children: [],
                height: 1,
                bbox: empty(),
                leaf: true
            };
            return this;
        },

        remove: function(item) {
            if (!item) return this;

            var node = this.data,
                bbox = this.toBBox(item),
                path = [],
                indexes = [],
                i, parent, index, goingUp;

            // depth-first iterative tree traversal
            while (node || path.length) {

                if (!node) { // go up
                    node = path.pop();
                    parent = path[path.length - 1];
                    i = indexes.pop();
                    goingUp = true;
                }

                if (node.leaf) { // check current node
                    index = node.children.indexOf(item);

                    if (index !== -1) {
                        // item found, remove the item and condense tree upwards
                        node.children.splice(index, 1);
                        path.push(node);
                        this._condense(path);
                        return this;
                    }
                }

                if (!goingUp && !node.leaf && contains(node.bbox, bbox)) { // go down
                    path.push(node);
                    indexes.push(i);
                    i = 0;
                    parent = node;
                    node = node.children[0];

                } else if (parent) { // go right
                    i++;
                    node = parent.children[i];
                    goingUp = false;

                } else node = null; // nothing found
            }

            return this;
        },

        toBBox: function(item) { return item; },

        compareMinX: function(a, b) { return a[0] - b[0]; },
        compareMinY: function(a, b) { return a[1] - b[1]; },

        toJSON: function() { return this.data; },

        fromJSON: function(data) {
            this.data = data;
            return this;
        },

        _all: function(node, result) {
            var nodesToSearch = [];
            while (node) {
                if (node.leaf) result.push.apply(result, node.children);
                else nodesToSearch.push.apply(nodesToSearch, node.children);

                node = nodesToSearch.pop();
            }
            return result;
        },

        _build: function(items, left, right, height) {

            var N = right - left + 1,
                M = this._maxEntries,
                node;

            if (N <= M) {
                // reached leaf level; return leaf
                node = {
                    children: items.slice(left, right + 1),
                    height: 1,
                    bbox: null,
                    leaf: true
                };
                calcBBox(node, this.toBBox);
                return node;
            }

            if (!height) {
                // target height of the bulk-loaded tree
                height = Math.ceil(Math.log(N) / Math.log(M));

                // target number of root entries to maximize storage utilization
                M = Math.ceil(N / Math.pow(M, height - 1));
            }

            // TODO eliminate recursion?

            node = {
                children: [],
                height: height,
                bbox: null
            };

            // split the items into M mostly square tiles

            var N2 = Math.ceil(N / M),
                N1 = N2 * Math.ceil(Math.sqrt(M)),
                i, j, right2, right3;

            multiSelect(items, left, right, N1, this.compareMinX);

            for (i = left; i <= right; i += N1) {

                right2 = Math.min(i + N1 - 1, right);

                multiSelect(items, i, right2, N2, this.compareMinY);

                for (j = i; j <= right2; j += N2) {

                    right3 = Math.min(j + N2 - 1, right2);

                    // pack each entry recursively
                    node.children.push(this._build(items, j, right3, height - 1));
                }
            }

            calcBBox(node, this.toBBox);

            return node;
        },

        _chooseSubtree: function(bbox, node, level, path) {

            var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

            while (true) {
                path.push(node);

                if (node.leaf || path.length - 1 === level) break;

                minArea = minEnlargement = Infinity;

                for (i = 0, len = node.children.length; i < len; i++) {
                    child = node.children[i];
                    area = bboxArea(child.bbox);
                    enlargement = enlargedArea(bbox, child.bbox) - area;

                    // choose entry with the least area enlargement
                    if (enlargement < minEnlargement) {
                        minEnlargement = enlargement;
                        minArea = area < minArea ? area : minArea;
                        targetNode = child;

                    } else if (enlargement === minEnlargement) {
                        // otherwise choose one with the smallest area
                        if (area < minArea) {
                            minArea = area;
                            targetNode = child;
                        }
                    }
                }

                node = targetNode;
            }

            return node;
        },

        _insert: function(item, level, isNode) {

            var toBBox = this.toBBox,
                bbox = isNode ? item.bbox : toBBox(item),
                insertPath = [];

            // find the best node for accommodating the item, saving all nodes along the path too
            var node = this._chooseSubtree(bbox, this.data, level, insertPath);

            // put the item into the node
            node.children.push(item);
            extend(node.bbox, bbox);

            // split on node overflow; propagate upwards if necessary
            while (level >= 0) {
                if (insertPath[level].children.length > this._maxEntries) {
                    this._split(insertPath, level);
                    level--;
                } else break;
            }

            // adjust bboxes along the insertion path
            this._adjustParentBBoxes(bbox, insertPath, level);
        },

        // split overflowed node into two
        _split: function(insertPath, level) {

            var node = insertPath[level],
                M = node.children.length,
                m = this._minEntries;

            this._chooseSplitAxis(node, m, M);

            var newNode = {
                children: node.children.splice(this._chooseSplitIndex(node, m, M)),
                height: node.height
            };

            if (node.leaf) newNode.leaf = true;

            calcBBox(node, this.toBBox);
            calcBBox(newNode, this.toBBox);

            if (level) insertPath[level - 1].children.push(newNode);
            else this._splitRoot(node, newNode);
        },

        _splitRoot: function(node, newNode) {
            // split root node
            this.data = {
                children: [node, newNode],
                height: node.height + 1
            };
            calcBBox(this.data, this.toBBox);
        },

        _chooseSplitIndex: function(node, m, M) {

            var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

            minOverlap = minArea = Infinity;

            for (i = m; i <= M - m; i++) {
                bbox1 = distBBox(node, 0, i, this.toBBox);
                bbox2 = distBBox(node, i, M, this.toBBox);

                overlap = intersectionArea(bbox1, bbox2);
                area = bboxArea(bbox1) + bboxArea(bbox2);

                // choose distribution with minimum overlap
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    index = i;

                    minArea = area < minArea ? area : minArea;

                } else if (overlap === minOverlap) {
                    // otherwise choose distribution with minimum area
                    if (area < minArea) {
                        minArea = area;
                        index = i;
                    }
                }
            }

            return index;
        },

        // sorts node children by the best axis for split
        _chooseSplitAxis: function(node, m, M) {

            var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
                compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
                xMargin = this._allDistMargin(node, m, M, compareMinX),
                yMargin = this._allDistMargin(node, m, M, compareMinY);

            // if total distributions margin value is minimal for x, sort by minX,
            // otherwise it's already sorted by minY
            if (xMargin < yMargin) node.children.sort(compareMinX);
        },

        // total margin of all possible split distributions where each node is at least m full
        _allDistMargin: function(node, m, M, compare) {

            node.children.sort(compare);

            var toBBox = this.toBBox,
                leftBBox = distBBox(node, 0, m, toBBox),
                rightBBox = distBBox(node, M - m, M, toBBox),
                margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
                i, child;

            for (i = m; i < M - m; i++) {
                child = node.children[i];
                extend(leftBBox, node.leaf ? toBBox(child) : child.bbox);
                margin += bboxMargin(leftBBox);
            }

            for (i = M - m - 1; i >= m; i--) {
                child = node.children[i];
                extend(rightBBox, node.leaf ? toBBox(child) : child.bbox);
                margin += bboxMargin(rightBBox);
            }

            return margin;
        },

        _adjustParentBBoxes: function(bbox, path, level) {
            // adjust bboxes along the given tree path
            for (var i = level; i >= 0; i--) {
                extend(path[i].bbox, bbox);
            }
        },

        _condense: function(path) {
            // go through the path, removing empty nodes and updating bboxes
            for (var i = path.length - 1, siblings; i >= 0; i--) {
                if (path[i].children.length === 0) {
                    if (i > 0) {
                        siblings = path[i - 1].children;
                        siblings.splice(siblings.indexOf(path[i]), 1);

                    } else this.clear();

                } else calcBBox(path[i], this.toBBox);
            }
        },

        _initFormat: function(format) {
            // data format (minX, minY, maxX, maxY accessors)

            // uses eval-type function compilation instead of just accepting a toBBox function
            // because the algorithms are very sensitive to sorting functions performance,
            // so they should be dead simple and without inner calls

            // jshint evil: true

            var compareArr = ['return a', ' - b', ';'];

            this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
            this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

            this.toBBox = new Function('a', 'return [a' + format.join(', a') + '];');
        }
    };


    // calculate node's bbox from bboxes of its children
    function calcBBox(node, toBBox) {
        node.bbox = distBBox(node, 0, node.children.length, toBBox);
    }

    // min bounding rectangle of node children from k to p-1
    function distBBox(node, k, p, toBBox) {
        var bbox = empty();

        for (var i = k, child; i < p; i++) {
            child = node.children[i];
            extend(bbox, node.leaf ? toBBox(child) : child.bbox);
        }

        return bbox;
    }

    function empty() { return [Infinity, Infinity, -Infinity, -Infinity]; }

    function extend(a, b) {
        a[0] = Math.min(a[0], b[0]);
        a[1] = Math.min(a[1], b[1]);
        a[2] = Math.max(a[2], b[2]);
        a[3] = Math.max(a[3], b[3]);
        return a;
    }

    function compareNodeMinX(a, b) { return a.bbox[0] - b.bbox[0]; }
    function compareNodeMinY(a, b) { return a.bbox[1] - b.bbox[1]; }

    function bboxArea(a) { return (a[2] - a[0]) * (a[3] - a[1]); }
    function bboxMargin(a) { return (a[2] - a[0]) + (a[3] - a[1]); }

    function enlargedArea(a, b) {
        return (Math.max(b[2], a[2]) - Math.min(b[0], a[0])) *
               (Math.max(b[3], a[3]) - Math.min(b[1], a[1]));
    }

    function intersectionArea(a, b) {
        var minX = Math.max(a[0], b[0]),
            minY = Math.max(a[1], b[1]),
            maxX = Math.min(a[2], b[2]),
            maxY = Math.min(a[3], b[3]);

        return Math.max(0, maxX - minX) *
               Math.max(0, maxY - minY);
    }

    function contains(a, b) {
        return a[0] <= b[0] &&
               a[1] <= b[1] &&
               b[2] <= a[2] &&
               b[3] <= a[3];
    }

    function intersects(a, b) {
        return b[0] <= a[2] &&
               b[1] <= a[3] &&
               b[2] >= a[0] &&
               b[3] >= a[1];
    }

    // sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
    // combines selection algorithm with binary divide & conquer approach

    function multiSelect(arr, left, right, n, compare) {
        var stack = [left, right],
            mid;

        while (stack.length) {
            right = stack.pop();
            left = stack.pop();

            if (right - left <= n) continue;

            mid = left + Math.ceil((right - left) / n / 2) * n;
            select(arr, left, right, mid, compare);

            stack.push(left, mid, mid, right);
        }
    }

    // sort array between left and right (inclusive) so that the smallest k elements come first (unordered)
    function select(arr, left, right, k, compare) {
        var n, i, z, s, sd, newLeft, newRight, t, j;

        while (right > left) {
            if (right - left > 600) {
                n = right - left + 1;
                i = k - left + 1;
                z = Math.log(n);
                s = 0.5 * Math.exp(2 * z / 3);
                sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (i - n / 2 < 0 ? -1 : 1);
                newLeft = Math.max(left, Math.floor(k - i * s / n + sd));
                newRight = Math.min(right, Math.floor(k + (n - i) * s / n + sd));
                select(arr, newLeft, newRight, k, compare);
            }

            t = arr[k];
            i = left;
            j = right;

            swap(arr, left, k);
            if (compare(arr[right], t) > 0) swap(arr, left, right);

            while (i < j) {
                swap(arr, i, j);
                i++;
                j--;
                while (compare(arr[i], t) < 0) i++;
                while (compare(arr[j], t) > 0) j--;
            }

            if (compare(arr[left], t) === 0) swap(arr, left, j);
            else {
                j++;
                swap(arr, j, right);
            }

            if (j <= k) left = j + 1;
            if (k <= j) right = j - 1;
        }
    }

    function swap(arr, i, j) {
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }


    //// export as AMD/CommonJS module or global variable
    //if (typeof define === 'function' && define.amd) define(function() { return rbush; });
    //else if (typeof module !== 'undefined') module.exports = rbush;
    //else if (typeof self !== 'undefined') self.rbush = rbush;
    //else window.rbush = rbush;

    sGis.Rbush = rbush;

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

    utils.isImage = function(o) {
        return sGis.browser.indexOf('Opera') !== 0 && o instanceof Image || o instanceof HTMLImageElement
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
                    if (!(e instanceof TypeError)) utils.error(e);
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
            xdr.timeout = 30000;
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
            xhr.timeout = 30000;
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

    //TODO: this will not copy the inner arrays properly
    utils.copyObject = function(obj) {
        if (obj instanceof Array) {
            return utils.copyArray(obj);
        } else if (obj instanceof Object) {
            var copy = {};
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                copy[keys[i]] = utils.copyObject(obj[keys[i]]);
            }
            return copy;
        } else {
            return obj;
        }
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

    /**
     * @namespace
     */
    sGis.utils = {

        /**
         * If the handler sGis.onerror is set, calls this handler with 'message' parameter. Otherwise throws an exception with 'message' description
         * @param message
         */
        error: function(message) {
            if (sGis.onerror) {
                sGis.onerror(message);
            } else {
                throw new Error(message);
            }
        },

        /**
         * Sets the values of the properties in 'options' to the 'object'. Calls sGis.utils.error() in case of exception
         * @param {Object} object
         * @param {Object} options
         */
        init: function(object, options) {
            for (var i in options) {
                if (options[i] !== undefined) {
                    try {
                        object[i] = options[i];
                    } catch (e) {
                        if (!(e instanceof TypeError)) sGis.utils.error(e);
                    }
                }
            }
        },

        /**
         * Return offset (in pixels) of the cursor relative to the target node
         * @param {HTMLElement} target
         * @param event - mouse event object
         * @returns {{x: number, y: number}}
         */
        getMouseOffset: function(target, event) {
            var docPos = getPosition(target);
            return {x: event.pageX - docPos.x, y: event.pageY - docPos.y};
        },

        /**
         * Returns position of element relative to the left top window corner
         * @param {HTMLElement} element
         * @returns {{x: number, y: number}} - position of element relative to the left top window corner
         */
        getPosition: function(element) {
            var clientRect = element.getBoundingClientRect(),
                x = (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
                y = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
            return {x: clientRect.left + x, y: clientRect.top + y};
        }
    };

})();'use strict';

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

})();'use strict';

(function() {

    sGis.IEventHandler = function() {};

    /**
     * Provides methods for handling events.
     * @mixin
     */

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

        clone: function() {
            return this.projectTo(this.crs);
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

})();'use strict';

(function() {

    /**
     * Painter object
     * @param {sGis.Map} map for the painter to draw
     * @constructor
     */
    utils.Painter = function(map) {
        this._map = map;
        this._mapWrapper = map.layerWrapper;
        this._layerData = {};
        this._bbox = map.bbox;
        this._id = utils.getGuid();

        var self = this;
        this._map.addListner('bboxChange', function() {
            self._bboxChanged = true;

            var layers = this.layers;
            for (var i = 0, len = layers.length; i < len; i++) {
                if (!layers[i].delayedUpdate && self._layerData[layers[i].id]) self._layerData[layers[i].id].needUpdate = true;
            }
        });

        this._map.addListner('bboxChangeEnd', function() {
            var layers = self.layers;
            for (var i = 0, len = layers.length; i < len; i++) {
                if (layers[i].delayedUpdate && self._layerData[layers[i].id]) self._layerData[layers[i].id].needUpdate = true;
            }
        });

        this._map.addListner(this._listensFor.join(' ') + '.sGis-painter-' + this._id, function(sGisEvent) {
            self._handleEvent(sGisEvent);
        });

        this._map.addListner('layerOrderChange layerRemove', function() {
            self._updateLayerOrder();
        });

        this._needUpdate = true;

        this._repaint();
    };

    utils.Painter.prototype = {
        ignoreEvents: false,

        _container: undefined,
        _oldContainer: undefined,
        _useTranslate3d: sGis.browser.indexOf('Chrome') !== 0 && sGis.browser !== 'MSIE 9' && sGis.browser.indexOf('Opera') !== 0,
        _updateAllowed: true,
        _listensFor: ['click', 'dblclick', 'dragStart', 'mousemove'],

        prohibitUpdate: function() {
            this._updateAllowed = false;
        },

        allowUpdate: function() {
            this._updateAllowed = true;
        },

        redrawLayer: function(layer) {
            if (this._layerData[layer.id]) this._layerData[layer.id].needUpdate = true;
        },

        forceUpdate: function() {
            this._needUpdate = true;
        },

        _updateLayerOrder: function() {
            var layers = this.layers;
            var ids = [];
            for (var i = 0, len = layers.length; i < len; i ++) {
                var layerData = this._layerData[layers[i].id];
                if (layerData) {
                    if (layerData.zIndex !== i * 2) {
                        this._changeLayerZIndex(layers[i], i * 2);
                    }
                }
                ids.push(layers[i].id);
            }

            for (var id in this._layerData) {
                if (ids.indexOf(id) === -1) {
                    this._removeLayer(id);
                }
            }
        },

        _removeLayer: function(id) {
            var layerData = this._layerData[id];
            for (var i in layerData.displayedObjects) {
                for (var j in layerData.displayedObjects[i]) {
                    var object = layerData.displayedObjects[i][j];
                    if (object.node && object.node.parentNode) {
                        object.node.parentNode.removeChild(object.node);
                        object.node.onload = null;
                    }
                }
            }

            if (layerData.canvas && layerData.canvas.parentNode) {
                layerData.canvas.parentNode.removeChild(layerData.canvas);
            }

            delete this._layerData[id];
        },

        _changeLayerZIndex: function(layer, zIndex) {
            var layerData = this._layerData[layer.id];
            for (var i = 0, len = layerData.displayedFeatures.length; i < len; i++) {
                if (layerData.subContainers[layerData.displayedFeatures[i].id]) {
                    layerData.subContainers[layerData.displayedFeatures[i].id].container.style.zIndex = zIndex;
                }
                var displayedObjects = layerData.displayedObjects[layerData.displayedFeatures[i].id];
                if (displayedObjects) {
                    for (var j = 0, length = displayedObjects.length; j < length; j++) {
                        if (displayedObjects[j].node) {
                            displayedObjects[j].node.style.zIndex = zIndex;
                        }
                    }
                }
            }

            if (layerData.canvas) {
                layerData.canvas.style.zIndex = zIndex - 1;
            }
            layerData.zIndex = zIndex;
        },

        _repaint: function() {
            if (this._needUpdate && this._updateAllowed) {
                this._setNewContainer();
                this._needUpdate = false;
            } else if (this._bboxChanged) {
                if (this._container) this._setContainerTransform(this._container);
                if (this._oldContainer) this._setContainerTransform(this._oldContainer);
                this._bboxChanged = false;
            }

            var layers = this.layers;
            for (var i = layers.length - 1; i >= 0; i--) {
                if (!this._layerData[layers[i].id]) this._setLayerData(layers[i]);
                if (this._layerData[layers[i].id].needUpdate && this._updateAllowed) this._updateLayer(layers[i]);
            }

            utils.requestAnimationFrame(this._repaint.bind(this));
        },

        _setLayerData: function(layer) {
            this._layerData[layer.id] = {
                displayedFeatures: [],
                displayedObjects: {},
                loadingFeatureIds: [],
                forDeletion: [],
                needUpdate: true,
                subContainers: {},
                zIndex: this.layers.indexOf(layer) * 2
            };

            var self = this;
            layer.addListner('propertyChange.sGis-painter-' + this._id, function() {
                self._layerData[layer.id].needUpdate = true;
            });
        },

        _setNewContainer: function() {
            if (this._oldContainer) this._removeOldContainer();
            if (this._container) this._oldContainer = this._container;

            var container = document.createElement('div');
            container.style.width = '100%';
            container.style.height = '100%';
            container.width = this._map.width;
            container.height = this._map.height;
            container.style[utils.css.transformOrigin.func] = 'left top';
            container.style.position = 'absolute';
            container.bbox = this._map.bbox;
            this._setContainerTransform(container);

            this._mapWrapper.appendChild(container, this._oldContainer);
            this._container = container;
        },

        _setContainerTransform: function(container) {
            if (container.bbox.crs !== this._map.crs) {
                if (container.bbox.crs.from && this._map.crs.to) {
                    container.bbox.crs = container.bbox.projectTo(this._map.crs);
                } else {
                    this._setNewContainer();
                    var layers = this.layers;
                    for (var i = 0, len = layers.length; i < len; i++) {
                        this._removeLayerFromOldContainer(layers[i]);
                    }
                    return;
                }
            }

            var scale = this._setNodeTransform(container, this._map);
            if (container === this._container && scale !== 1) this._needUpdate = true;
        },

        _setNodeTransform: function(node, container) {
            var nodeBbox = node.bbox;
            var containerBbox = container.bbox;

            var containerResolution = container.resolution;

            if (nodeBbox) {
                if (nodeBbox.crs !== containerBbox.crs) {
                    nodeBbox = nodeBbox.projectTo(containerBbox.crs);
                }

                var nodeResolution = node.resolution || node.width ? nodeBbox.width / node.width : containerResolution;

                var sx = utils.normolize(nodeResolution / containerResolution);
                var sy = sx;

                var tx = utils.normolize((nodeBbox.p[0].x - containerBbox.p[0].x) / containerResolution);
                var ty = utils.normolize((-nodeBbox.p[1].y + containerBbox.p[1].y) / containerResolution);
            } else {
                var sx = 1,
                    sy = 1;

                var tx = Math.round(node.position[0] - containerBbox.p[0].x / containerResolution);
                var ty = Math.round(node.position[1] + containerBbox.p[1].y / containerResolution);
            }

            if (this._useTranslate3d) {
                node.style[utils.css.transform.func] = 'translate3d(' + tx + 'px, ' + ty + 'px, 0px) scale(' + sx.toPrecision(6) + ', ' + sy.toPrecision(6) + ')';
            } else {
                node.style[utils.css.transform.func] = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + sx.toPrecision(6) + ', ' + sy.toPrecision(6) + ')';
            }

            if (!node.resolution) node.resolution = nodeResolution;

            return sx;
        },

        _removeOldContainer: function() {
            var layers = this.layers;
            for (var i = 0; i < layers.length; i++) {
                this._moveLayerToCurrentWrapper(layers[i]);
            }

            this._mapWrapper.removeChild(this._oldContainer);
            this._oldContainer = null;
        },

        _updateLayer: function(layer) {
            var bbox = this._map.bbox;
            var resolution = this._map.resolution;
            var features = layer.getFeatures(bbox, resolution);
            var layerData = this._layerData[layer.id];
            var displayedFeatures = layerData.displayedFeatures.slice();

            for (var i = 0, len = displayedFeatures.length; i < len; i++) {
                if (features.indexOf(displayedFeatures[i]) === -1) {
                    this._removeFeature(displayedFeatures[i], layer);
                }
            }

            if (layerData.canvas) this._resetCanvas(layerData);


            for (var i = 0, len = features.length; i < len; i++) {
                var loadingIndex = layerData.loadingFeatureIds.indexOf(features[i].id);
                if (loadingIndex === -1) {
                    this._drawFeature(features[i], layer);
                }
            }

            if (layerData.forDeletion.length > 0 && this._fullyDrawn(layer)) {
                this._removeLayerFromOldContainer(layer);
            }

            if (layerData.canvas && layerData.canvas.isUsed) {
                this._container.appendChild(layerData.canvas);
            }

            layerData.needUpdate = false;
        },

        _removeFeature: function(feature, layer) {
            var layerData = this._layerData[layer.id];
            var index = layerData.displayedFeatures.indexOf(feature);
            if (layerData.displayedObjects[feature.id]) {
                for (var i = 0, len = layerData.displayedObjects[feature.id].length; i < len; i++) {
                    var node = layerData.displayedObjects[feature.id][i].node;
                    if (node && node.parentNode) {
                        if (node.parentNode === this._container || !layerData.displayedObjects[feature.id][i].persistent) {
                            node.parentNode.removeChild(node);
                        } else {
                            layerData.forDeletion.push(node);
                        }
                    } else {
                        this._removeFromLoadingList(feature, layer);
                    }
                }

                if (layerData.subContainers[feature.id]) {
                    if (layerData.subContainers[feature.id].container.parentNode) layerData.subContainers[feature.id].container.parentNode.removeChild(layerData.subContainers[feature.id].container);
                    delete layerData.subContainers[feature.id];
                }
                delete layerData.displayedObjects[feature.id];
            }

            layerData.displayedFeatures.splice(index, 1);
        },

        _removeFromLoadingList: function(feature, layer) {
            var layerData = this._layerData[layer.id];
            var loadingIndex = layerData.loadingFeatureIds.indexOf(feature.id);
            if (loadingIndex !== -1) layerData.loadingFeatureIds.splice(loadingIndex, 1);
        },

        _fullyDrawn: function(layer) {
            var layerData = this._layerData[layer.id];
            var fullyDrawn = true;
            for (var i = 0, len = layerData.displayedFeatures.length; i < len; i++) {
                if (!layerData.displayedObjects[layerData.displayedFeatures[i].id]) {
                    fullyDrawn = false;
                }
            }

            return fullyDrawn;
        },

        _removeLayerFromOldContainer: function(layer) {
            var self = this;
            setTimeout(function() {
                var layerData = self._layerData[layer.id];
                var forDeletion = layerData.forDeletion.slice();
                for (var i = 0, len = forDeletion.length; i < len; i++) {
                    if (forDeletion[i].parentNode) forDeletion[i].parentNode.removeChild(forDeletion[i]);
                }

                layerData.forDeletion = [];

                if (self._oldContainer && self._oldContainer.childNodes.length === 0) {
                    self._removeOldContainer();
                }
            }, layer.transitionTime || 0);
        },

        _drawFeature: function(feature, layer) {
            var render = feature.render(this._map.resolution, this._map.crs);
            var displayedObjects = this._layerData[layer.id].displayedObjects[feature.id];
            if (displayedObjects === render) {
                //TODO
                return;
            }

            var isMixed = false;
            for (var i = 1, len = render.length; i < len; i++) {
                if (toDrawOnCanvas(render[i]) !== toDrawOnCanvas(render[0])) {
                    isMixed = true;
                    break;
                }
            }

            if (this._layerData[layer.id].displayedFeatures.indexOf(feature) === -1) this._layerData[layer.id].displayedFeatures.push(feature);

            if (isMixed) {
                this._drawMixedRender(render, feature, layer);
            } else if (render.length > 0) {
                if (this._layerData[layer.id].subContainers[feature.id]) {
                    this._removeSubContainer(layer, feature);
                }

                if (toDrawOnCanvas(render[0])) {
                    this._drawGeometry(render, feature, layer);
                } else {
                    this._drawNodes(render, feature, layer);
                }
            } else {
                this._removeFeature(feature, layer);
            }
        },

        _drawNodes: function(render, feature, layer) {
            var layerData = this._layerData[layer.id];
            var displayedObjects = layerData.displayedObjects[feature.id] || [];

            var displayed = false;
            for (var i = 0, len = render.length; i < len; i++) {
                if (displayedObjects.indexOf(render[i]) === -1) {
                    displayed = this._drawNode(render[i], feature, layer);
                }
            }

            if (displayed) {
                displayedObjects = layerData.displayedObjects[feature.id];
                if (displayedObjects) {
                    while (displayedObjects.length > 0) {
                        if (displayedObjects[0].node.parentNode) displayedObjects[0].node.parentNode.removeChild(displayedObjects[0].node);
                        displayedObjects.splice(0, 1);
                    }
                }
                layerData.displayedObjects[feature.id] = render;
            }

            layerData.needUpdate = false;
        },

        _drawNode: function(render, feature, layer, container) {
            var layerData = this._layerData[layer.id];
            var self = this;
            if (utils.isImage(render.node) && !render.node.complete) {
                layerData.loadingFeatureIds.push(feature.id);
                render.node.onload = function() {
                    self._removeFromLoadingList(feature, layer);
                    layerData.needUpdate = true;
                };
                render.node.onerror = function() {
                    render.error = true;
                    self._removeFromLoadingList(feature, layer);
                };
            } else {
                if (!render.error) {
                    this._displayNode(render, feature, layer, container);
                    return true;
                }
            }
        },

        _displayNode: function(render, feature, layer, container) {
            var layerData = this._layerData[layer.id];
            container = container || this._container;
            if (layerData.displayedFeatures.indexOf(feature) !== -1 && (render.node.position || render.node.bbox.crs === this._container.bbox.crs || render.node.bbox.crs.from && this._container.bbox.crs.to)) {
                this._resolveLayerOverlay(layer);
                this._setNodeStyles(render.node, layer);
                this._setNodeTransform(render.node, this._container);
                container.appendChild(render.node);
                if (render.onAfterDisplay) render.onAfterDisplay();
                layerData.currentContainer = this._container;

                var forDeletionIndex = layerData.forDeletion.indexOf(render.node);
                if (forDeletionIndex !== -1) {
                    layerData.forDeletion.splice(forDeletionIndex, 1);
                }
            }
        },

        _resolveLayerOverlay: function(layer) {
            var layers = this.layers;
            var index = layers.indexOf(layer);
            for (var i = index + 1, len = layers.length; i < len; i++) {
                this._moveLayerToCurrentWrapper(layers[i]);
            }
        },

        _moveLayerToCurrentWrapper: function(layer) {
            var layerData = this._layerData[layer.id];
            if (!layerData) return;
            for (var i = 0, length = layerData.displayedFeatures.length; i < length; i++) {
                var subContainer = layerData.subContainers[layerData.displayedFeatures[i].id];
                if (subContainer) {
                    if (subContainer.container.parentNode && subContainer.container.parentNode !== this._container) {
                        subContainer.container.parentNode.removeChild(subContainer.container);
                        this._setNodeTransform(subContainer.canvas, this._container);
                        this._container.appendChild(subContainer.container);
                    }
                }
                var objects = layerData.displayedObjects[layerData.displayedFeatures[i].id];
                if (objects) {
                    for (var j = 0, len = objects.length; j < len; j++) {
                        if (objects[j].node && objects[j].node.parentNode && objects[j].node.parentNode !== this._container) {
                            objects[j].node.parentNode.removeChild(objects[j].node);
                            this._displayNode(objects[j], layerData.displayedFeatures[i], layer, subContainer && subContainer.container);
                        }
                    }
                }
            }

            var canvas = layerData.canvas;
            if (canvas && canvas.parentNode && canvas.parentNode !== this._container) {
                canvas.parentNode.removeChild(canvas);
                this._setNodeTransform(canvas, this._container);
                this._container.appendChild(canvas);
            }
        },

        _drawGeometry: function(render, feature, layer) {
            var layerData = this._layerData[layer.id];
            var ctx;
            if (layerData.subContainers[feature.id]) {
                ctx = layerData.subContainers[feature.id].ctx;
            } else {
                if (!layerData.canvas) this._setNewCanvas(layerData);
                ctx = layerData.ctx;
                layerData.canvas.isUsed = true;
            }

            for (var i = 0, len = render.length; i < len; i++) {
                this._drawElement(render[i], ctx);
            }

            layerData.displayedObjects[feature.id] = render;
        },

        _setNewCanvas: function(layerData) {
            var canvas = document.createElement('canvas');
            canvas.width = this._map.width;
            canvas.height = this._map.height;
            canvas.style.zIndex = layerData.zIndex - 1;
            canvas.style.position = 'absolute';
            canvas.style.transformOrigin = 'left top';
            canvas.style.pointerEvents = 'none';

            layerData.canvas = canvas;

            layerData.ctx = canvas.getContext('2d');
            this._setCanvasOrigin(layerData);
        },

        _resetCanvas: function(layerData) {
            if (layerData.canvas.parentNode) {
                layerData.canvas.parentNode.removeChild(layerData.canvas);
            }
            layerData.canvas.width = this._map.width;
            layerData.canvas.height = this._map.height;
            this._setCanvasOrigin(layerData);
            layerData.canvas.isUsed = false;
        },

        _setCanvasOrigin: function(layerData) {
            var bbox = this._map.bbox;
            var resolution = this._map.resolution;
            var xOrigin = bbox.p[0].x / resolution;
            var yOrigin = -bbox.p[1].y / resolution;
            layerData.ctx.translate(-xOrigin, -yOrigin);
            layerData.canvas.bbox = bbox;

            this._setNodeTransform(layerData.canvas, this._container);
        },

        _drawElement: function(geometry, ctx) {
            if (geometry instanceof sGis.geom.Polyline) {
                this._drawPolyline(geometry, ctx);
            } else if (geometry instanceof sGis.geom.Arc) {
                this._drawArc(geometry, ctx);
            } else if (geometry.node && utils.isImage(geometry.node) && geometry.node.position) {
                this._drawImage(geometry.node, ctx);
            }
        },

        _drawImage: function(image, ctx) {
            ctx.drawImage(image, image.position[0], image.position[1], image.width, image.height);
        },

        _drawPolyline: function(geometry, ctx) {
            var coordinates = geometry.coordinates;

            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = geometry.width;
            ctx.strokeStyle = geometry.color;

            for (var ring = 0, ringsCount = coordinates.length; ring < ringsCount; ring++) {
                ctx.moveTo(coordinates[ring][0][0], coordinates[ring][0][1]);
                for (var i = 1, len = coordinates[ring].length; i < len; i++) {
                    ctx.lineTo(coordinates[ring][i][0], coordinates[ring][i][1]);
                }

                if (geometry instanceof sGis.geom.Polygon) {
                    ctx.closePath();
                }
            }

            if (geometry instanceof sGis.geom.Polygon) {
                if (geometry.fillStyle === 'color') {
                    ctx.fillStyle = geometry.fillColor;
                } else if (geometry.fillStyle === 'image') {
                    ctx.fillStyle = ctx.createPattern(geometry.fillImage, 'repeat');

                    var patternOffsetX = (coordinates[0][0][0]) % geometry.fillImage.width,
                        patternOffsetY = (coordinates[0][0][1]) % geometry.fillImage.height;
                    ctx.translate(patternOffsetX, patternOffsetY);
                }
                ctx.fill();

                if (patternOffsetX) {
                    ctx.translate(-patternOffsetX, -patternOffsetY);
                }
            }

            ctx.stroke();
        },

        _drawArc: function(arc, ctx) {
            var center = arc.center;

            ctx.beginPath();
            ctx.lineWidth = arc.strokeWidth;
            ctx.strokeStyle = arc.strokeColor;
            ctx.fillStyle = arc.fillColor;

            ctx.arc(center[0], center[1], arc.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        },

        _drawMixedRender: function(render, feature, layer) {
            var layerData = this._layerData[layer.id];
            var subContainer = layerData.subContainers[feature.id];
            if (subContainer) {
                this._resetCanvas(subContainer);
                subContainer.container.innerHTML = '';

                if (subContainer.container.parentNode !== this._container) {
                    this._container.appendChild(subContainer.container);
                }
            } else {
                layerData.subContainers[feature.id] = {};
                subContainer = layerData.subContainers[feature.id];
                subContainer.container = document.createElement('div');
                this._setNodeStyles(subContainer.container, layer);
                this._setNewCanvas(subContainer);
                subContainer.canvas.style.zIndex = -1;

                this._container.appendChild(subContainer.container);
            }

            var geometry = [];
            for (var i = 0, len = render.length; i < len; i++) {
                if (render[i].node && !render[i].node.parent) {
                    this._drawNode(render[i], feature, layer, subContainer.container);
                } else {
                    geometry.push(render[i]);
                }
            }
            this._drawGeometry(geometry, feature, layer, subContainer.canvas);
            subContainer.container.appendChild(subContainer.canvas);

            layerData.displayedObjects[feature.id] = render;
        },

        _removeSubContainer: function(layer, feature) {
            var layerData = this._layerData[layer.id];
            var subContainer = layerData.subContainers[feature.id];
            if (subContainer.container.parentNode) {
                subContainer.container.parentNode.removeChild(subContainer.container);
            }

            delete layerData.displayedObjects[feature.id];
            delete layerData.subContainers[feature.id];
        },

        _setNodeStyles: function(node, layer) {
            node.style[utils.css.transformOrigin.func] = 'left top';
            node.style.position = 'absolute';
            node.style.zIndex = this._layerData[layer.id].zIndex;
        },

        _handleEvent: function(sGisEvent) {
            if (this.ignoreEvents) return;

            var layers = this.layers;
            var position = sGisEvent.position;

            var eventObject = {
                point: sGisEvent.point,
                position: position,
                mouseOffset: sGisEvent.mouseOffset,
                browserEvent: sGisEvent.browserEvent
            };

            for (var i = layers.length - 1; i > 0; i--) {
                if (!this._layerData[layers[i].id]) continue;

                var displayedFeatures = this._layerData[layers[i].id].displayedFeatures;
                for (var j = displayedFeatures.length - 1; j >= 0; j--) {
                    if (displayedFeatures[j].hasListners(sGisEvent.eventType) || sGisEvent.eventType === 'mousemove' && (displayedFeatures[j].hasListners('mouseout') || displayedFeatures[j].hasListners('mouseover'))) {
                        var objects = this._layerData[layers[i].id].displayedObjects[displayedFeatures[j].id];
                        if (objects) {
                            for (var k = objects.length - 1; k >= 0; k--) {
                                var intersectionType = contains(objects[k], position);

                                if (intersectionType) {
                                    sGisEvent.intersectionType = intersectionType;
                                    displayedFeatures[j].forwardEvent(sGisEvent);

                                    if (sGisEvent.eventType === 'mousemove' && this._mouseOverFeature !== displayedFeatures[j]) {
                                        if (this._mouseOverFeature) this._mouseOverFeature.fire('mouseout', eventObject);

                                        this._mouseOverFeature = displayedFeatures[j];
                                        this._mouseOverFeature.fire('mouseover', eventObject);
                                    }

                                    return;
                                }
                            }
                        }
                    }
                }
            }

            if (sGisEvent.eventType === 'mousemove' && this._mouseOverFeature) {
                this._mouseOverFeature.fire('mouseout', eventObject);
                this._mouseOverFeature = null;
            }
        }
    };


    function contains(geometry, position) {
        var intersectionType;
        if (geometry.node) {
            var geometryPosition = geometry.position || [geometry.bbox.width / geometry.resolution, geometry.bbox.height / geometry.resolution];
            var width = geometry.node.width || geometry.node.clientWidth;
            var height = geometry.node.height || geometry.node.clientHeight;
            intersectionType = geometryPosition[0] < position.x && (geometryPosition[0] + width) > position.x &&
            geometryPosition[1] < position.y && (geometryPosition[1] + height) > position.y;
        } else {
            intersectionType = geometry.contains(position);
        }

        return intersectionType;
    }


    Object.defineProperties(utils.Painter.prototype, {
        layers: {
            get: function() {
                return this._map.layers;
            }
        }
    });

    utils.mixin(utils.Painter.prototype, sGis.IEventHandler.prototype);

    function toDrawOnCanvas(object) {
        return !object.node || object.renderToCanvas;
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

})();'use strict';

(function() {

    /**
     *
     * @mixes sGis.IEventHandler.prototype
     * @param {Object} options
     * @param {sGis.Crs} [options.crs=sGis.CRS.webMercator] - setting a crs that cannot be converted into WGS resets default values of position to [0, 0].
     * @param {sGis.Point|sGis.feature.Point|Array} [options.position] - the start position of the map. If the array is specified as [x, y], it should be in map crs. By default center it is of Moscow.
     * @param {Number} [options.resolution=305.74811] - initial resolution of the map
     * @param {HTMLElement} [options.wrapper] - DOM container that will contain the map. It should be block element. If not specified, the map will not be displayed.
     * @param {sGis.Layer} [options.layers[]] - the list of layers that will be initially on the map. The first in the list will be displayed at the bottom.
     * @constructor
     */

    sGis.Map = function(options) {
        if (options && options.crs) initializeCrs(this, options.crs);
        utils.init(this, options);
        this._layerGroup = new sGis.LayerGroup(options ? options.layers : undefined);
    };

    sGis.Map.prototype = {
        _crs: sGis.CRS.webMercator,
        _position: new sGis.Point(55.755831, 37.617673).projectTo(sGis.CRS.webMercator),
        _resolution: 611.4962262812505 / 2,
        _wrapper: null,
        _autoUpdateSize: true,

        /**
         * Sets the size of map equal to size of its wrapper
         * TODO: need to get reed of this function
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
            this.fire('layerAdd', {layer: layer});
        },

        /**
         * Removes the layer from the map
         * @param {sGis.Layer} layer
         */
        removeLayer: function(layer) {
            this._layerGroup.removeLayer(layer);
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

            if (this._animationTarget) {
                var currResolution = this._animationTarget.width / this.width;
            } else {
                currResolution = this.resolution;
            }

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
                if (!resolution) resolution = tileScheme.matrix[i] && tileScheme.matrix[i].resolution || currResolution;
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
            this._animateTo(bbox);
            this.fire('animationStart', {targetBbox: bbox});
            this._resolutionChanged = true;
        },

        _animationTime: 300,

        _animateTo: function(targetBbox) {
            this.stopAnimation();

            var originalBbox = this.bbox;
            var startTime = Date.now();
            this._painter.prohibitUpdate();
            this._animationStopped = false;
            this._animationTarget = targetBbox;

            var self = this;
            this._animationTimer = setInterval(function() {
                var time = Date.now() - startTime;
                if (time >= self._animationTime || self._animationStopped) {
                    self._bbox = targetBbox;
                    self.stopAnimation();
                    self.fire('animationEnd');
                } else {
                    var x1 = self._easeFunction(time, originalBbox.p[0].x, targetBbox.p[0].x - originalBbox.p[0].x, self._animationTime);
                    var y1 = self._easeFunction(time, originalBbox.p[0].y, targetBbox.p[0].y - originalBbox.p[0].y, self._animationTime);
                    var x2 = self._easeFunction(time, originalBbox.p[1].x, targetBbox.p[1].x - originalBbox.p[1].x, self._animationTime);
                    var y2 = self._easeFunction(time, originalBbox.p[1].y, targetBbox.p[1].y - originalBbox.p[1].y, self._animationTime);
                    var bbox = new sGis.Bbox(new sGis.Point(x1, y1, self.crs), new sGis.Point(x2, y2, self.crs));

                    self._bbox = bbox;
                }
                self.fire('bboxChange');
            }, 1000 / 60);
        },

        stopAnimation: function() {
            this._animationStopped = true;
            this._animationTarget = null;
            this._painter.allowUpdate();
            clearInterval(this._animationTimer);
        },

        _easeFunction: function(t, b, c, d) {
            return b + c * t / d;
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
            //this._painter.cancelAnimation();
        },

        update: function() {

        },

        forceUpdate: function() {
            this.painter.forceUpdate();
        },

        /**
         * Updates the specified layer
         * @param {sGis.Layer} layer
         */
        redrawLayer: function(layer) {
            if (this._painter) this._painter.redrawLayer(layer);
        },

        /**
         * Changes order of layers, moves layer to the specified index
         * @param layer
         * @param index
         */
        moveLayerToIndex: function(layer, index) {
            var add = !this._layerGroup.contains(layer);
            this._layerGroup.insertLayer(layer, index);
            if (add) {
                this.fire('layerAdd', {layer: layer});
            }
            this.fire('layerOrderChange', {layer: layer});
        },

        moveLayerToTop: function(layer) {
            this.moveLayerToIndex(layer, Number.MAX_VALUE);
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
                var map = this;
                var CHANGE_END_DELAY = 300;
                if (map._changeTimer) clearTimeout(map._changeTimer);
                map._changeTimer = setTimeout((function(map) {return function() {
                    map.fire('bboxChangeEnd', {map: map});
                    map._changeTimer = null;
                };})(map), CHANGE_END_DELAY);
            },

            bboxChangeEnd: function(mapEvent) {

            },

            animationStart: function(sGisEvent) {

            },

            animationEnd: function(mapEvent) {

            },

            click: function(sGisEvent) {

            },

            dblclick: function(sGisEvent) {
                this.zoom(2, sGisEvent.point);
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
        },

        maxResolution: {
            get: function() {
                var tileScheme = this.tileScheme;
                if (tileScheme) {
                    return tileScheme.matrix[0].resolution;
                }
            }
        },

        minResolution: {
            get: function() {
                var tileScheme = this.tileScheme;
                if (tileScheme) {
                    var minResolution = Infinity;
                    for (var i in tileScheme.matrix) {
                        minResolution = Math.min(minResolution, tileScheme.matrix[i].resolution);
                    }

                    return minResolution;
                }
            }
        },

        painter: {
            get: function() {
                return this._painter;
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
        var mouseOffset = getMouseOffset(event.currentTarget, event);
        var map = event.currentTarget.map;
        var point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y);
        var resolution = map.resolution;
        var position = {x: point.x / resolution, y: -point.y / resolution};
        event.currentTarget.map.fire('mousemove', {map: map, mouseOffset: mouseOffset, point: point, position: position, ctrlKey: event.ctrlKey});
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
            map._draggingObject.fire('drag', {point: point, position: position, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}});

            event.currentTarget.dragPrevPosition[touch.identifier].x = touch.pageX;
            event.currentTarget.dragPrevPosition[touch.identifier].y = touch.pageY;
        } else if (event.touches.length === 2) {
            map._painter.prohibitUpdate();
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

            map.changeScale(len1/len2, map.getPointFromPxPosition(baseX, baseY));

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
            map.adjustResolution();
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
                mouseOffset = getMouseOffset(event.currentTarget, event),
                point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
                position = {x: point.x / map.resolution, y: - point.y / map.resolution};
            map.fire('dblclick', {map: map, mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position});
        }
    }

    var wheelTimer = 0;
    var minDelay = 50;
    function onwheel(event) {
        var time = Date.now();
        if (time - wheelTimer > minDelay) {
            wheelTimer = time;
            var map = event.currentTarget.map,
                wheelDirection = getWheelDirection(event),
                mouseOffset = getMouseOffset(event.currentTarget, event);

            map.zoom(wheelDirection, map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y));
        }
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
                map.fire('dragStart', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}, browserEvent: event});
            }

//        map.move(map._lastDrag.x, map._lastDrag.y);

            mouseHandler.dragPosition = mousePosition;
            map._draggingObject.fire('drag', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}, browserEvent: event});
        }
    }

    function onDocumentMouseup(event) {
        var map = mouseHandler.activeObject;
        Event.remove(document, 'mousemove', onDocumentMousemove);
        Event.remove(document, 'mouseup', onDocumentMouseup);
        document.ondragstart = null;
        document.body.onselectstart = null;

        if (mouseHandler.activeObject._draggingObject) mouseHandler.activeObject._draggingObject.fire('dragEnd', {browserEvent: event});

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

})();'use strict';

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

        for (var i = 1; i < 18; i ++) {
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
        this._cache = [];
    };

    sGis.TileLayer.prototype = new sGis.Layer({
        _tileScheme: standardTileScheme,
        _crs: sGis.CRS.webMercator,
        _cycleX: true,
        _cycleY: false,
        _cacheSize: 256,
        _transitionTime: sGis.browser.indexOf('Chrome') === 0 ? 0 : 200,

        getTileUrl: function(xIndex, yIndex, scale) {
            var url = this._source;
            return url.replace('{x}', xIndex).replace('{y}', yIndex).replace('{z}', scale);
        },



        getFeatures: function(bbox, resolution) {
            if (!(bbox instanceof sGis.Bbox)) utils.error('sGis.Bbox instance is expected but got ' + bbox + ' instead');
            if (!resolution) utils.error('Obligatory parameter resolution is omitted');

            if (!this._display || bbox.p[0].crs !== this.crs && (!bbox.p[0].crs.from || !this.crs.from)) return [];
            var scale = getScaleLevel(this, resolution),
                baseBbox = {
                    minX: this._tileScheme.origin.x,
                    maxY: this._tileScheme.origin.y,
                    maxX: this._tileScheme.origin.x + this._tileScheme.tileWidth * this._tileScheme.matrix[0].resolution,
                    minY: this._tileScheme.origin.y - this._tileScheme.tileHeight * this._tileScheme.matrix[0].resolution
                };

            var tiles = this._tiles,
                layerCrs = this.crs,
                features = [],
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
                if (this._cycleX && xIndexAdj < 0) xIndexAdj = scaleAdj === 0 ? 0 : xIndexAdj % scaleAdj + scaleAdj;
                if (this._cycleX && xIndexAdj >= scaleAdj) xIndexAdj = scaleAdj === 0 ? 0 : xIndexAdj % scaleAdj;

                if (!tiles[scale][xIndex]) tiles[scale][xIndex] = [];

                for (var yIndex = yStartIndex; yIndex < yEndIndex; yIndex++) {
                    var yIndexAdj= yIndex;
                    if (this._cycleY && yIndexAdj < 0) yIndexAdj = scaleAdj === 0 ? 0 : yIndexAdj % scaleAdj + scaleAdj;
                    if (this._cycleY && yIndexAdj >= scaleAdj) yIndexAdj = scaleAdj === 0 ? 0 : yIndexAdj % scaleAdj;

                    if (!tiles[scale][xIndex][yIndex]) {
                        var imageBbox = getTileBoundingBox(scale, xIndex, yIndex, this);
                        var tileUrl = this.getTileUrl(xIndexAdj, yIndexAdj, scale);
                        tiles[scale][xIndex][yIndex] = new sGis.feature.Image(imageBbox, { src: tileUrl, style: { transitionTime: this._transitionTime, renderToCanvas: false }, opacity: this.opacity });
                        this._cache.push(scale + ',' + xIndex + ',' + yIndex);
                    }
                    features.push(tiles[scale][xIndex][yIndex]);

                }
            }

            this._cutCache();
            return features;
        },

        getObjectType: function() {
            return 'img';
        },

        _cutCache: function() {
            while (this._cache.length > this._cacheSize) {
                var indexes = this._cache[0].split(',');
                delete this._tiles[indexes[0]][indexes[1]][indexes[2]];
                this._cache.shift();
            }
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
        },

        transitionTime: {
            get: function() {
                return this._transitionTime;
            },
            set: function(time) {
                this._transitionTime = time;
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
        _transitionTime: sGis.browser.indexOf('Chrome') === 0 ? 0 : 200,

        getFeatures: function(bbox, resolution) {
            if (!this._display) return [];
            if (!this._features) this._createFeature(bbox);
            var width  = bbox.width / resolution;
            var height = bbox.height / resolution;
            if (this._forceUpdate || !this._features[0].bbox.equals(bbox) || this._features[0].width !== width || this._features[0].height !== height || this._features[0].opacity !== this.opacity) {
                var url = this.getImageUrl(bbox, resolution);
                this._features[0].src = url;
                this._features[0].bbox = bbox;
                this._features[0].width = bbox.width / resolution;
                this._features[0].height = bbox.height / resolution;
                this._features[0].opacity = this.opacity;
            }

            return this._features;
        },

        _createFeature: function(bbox) {
            var feature = new sGis.feature.Image(bbox, { style: { transitionTime: this._transitionTime, renderToCanvas: false }});
            this._features = [feature];
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

        getFeatures: function(bbox, resolution) {
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
        },

        has: function(feature) {
            return this._features.indexOf(feature) !== -1;
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

})();'use strict';

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
                this._forceUpdate = false;
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

})();'use strict';

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

})();'use strict';

(function() {

    sGis.decorations.ScaleSlider = function(map, options) {
        this._map = map;
        this._createGrid();
        this._createSlider();

        sGis.utils.init(this, options);
        this.updateDisplay();
    };

    sGis.decorations.ScaleSlider.prototype = {
        _gridCss: 'sGis-decorations-scaleSlider-grid',
        _gridWidth: 8,
        _gridHeight: 120,
        _gridTop: 50,
        _gridLeft: 50,
        _sliderCss: 'sGis-decorations-scaleSlider-slider',
        _sliderWidth: 25,
        _sliderHeight: 10,
        _eventNamespace: '.sGis-decorations-scaleSlider',

        updateDisplay: function() {
            var wrapper = this._map.wrapper;
            if (wrapper) {
                wrapper.appendChild(this._grid);
                wrapper.appendChild(this._slider);
            }
        },

        _createGrid: function() {
            var grid = document.createElement('div');
            grid.style.position = 'absolute';
            grid.style.width = this._gridWidth + 'px';
            grid.style.height = this._gridHeight + 'px';
            grid.style.top = this._gridTop + 'px';
            grid.style.left = this._gridLeft + 'px';
            grid.className = this._gridCss;

            this._grid = grid;
        },

        _createSlider: function() {
            var slider = document.createElement('div');

            slider.style.position = 'absolute';
            slider.style.width = this._sliderWidth + 'px';
            slider.style.height = this._sliderHeight + 'px';
            slider.style.top = this._getSliderPosition() +  'px';
            slider.style.left = this._getSliderLeft() + 'px';
            slider.className = this._sliderCss;

            this._slider = slider;
            this._setSliderEvents();
        },

        _getSliderLeft: function() {
            return this._gridLeft + (this._gridWidth - this._sliderWidth) / 2;
        },

        _getSliderPosition: function() {
            var height = this._gridHeight - this._sliderHeight;
            var maxResolution = this._map.maxResolution;
            var minResolution = this._map.minResolution;
            var curResolution = this._map.resolution;

            var offset = height * Math.log2(curResolution / minResolution) / Math.log2(maxResolution / minResolution) ;
            if (sGis.utils.is.number(offset)) {
                return offset + this._gridTop;
            } else {
                return this._gridTop;
            }
        },

        _setSliderEvents: function() {
            var self = this;
            this._map.addListner('dragStart' + this._eventNamespace, function(sGisEvent) {
                if (sGisEvent.browserEvent.target === self._slider) {
                    sGisEvent.draggingObject = self;
                    self._map.painter.prohibitUpdate();
                    sGisEvent.stopPropagation();
                }
            });

            this._map.addListner('layerAdd layerRemove bboxChangeEnd', this._updateSliderPosition.bind(this));
        },

        _updateSliderPosition: function() {
            this._slider.style.top = this._getSliderPosition() + 'px';
        },

        _moveSlider: function(delta) {
            var offset = parseInt(this._slider.style.top) - this._gridTop;
            offset -= delta;
            if (offset < 0) {
                offset = 0;
            } else if (offset > this._gridHeight - this._sliderHeight) {
                offset = this._gridHeight - this._sliderHeight;
            }

            this._slider.style.top = this._gridTop + offset + 'px';

            var height = this._gridHeight - this._sliderHeight;
            var maxResolution = this._map.maxResolution;
            var minResolution = this._map.minResolution;

            var resolution = minResolution * Math.pow(2, offset * Math.log2(maxResolution / minResolution) / height);
            this._map.resolution = resolution;
        },

        _defaultHandlers: {
            drag: function(sGisEvent) {
                this._moveSlider(sGisEvent.offset.yPx);
            },

            dragEnd: function() {
                this._map.painter.allowUpdate();
                this._map.adjustResolution();
            }
        }
    };

    Object.defineProperties(sGis.decorations.ScaleSlider.prototype, {
        map: {
            get: function() {
                return this._map;
            }
        },

        gridCss: {
            get: function() {
                return this._gridCss;
            },
            set: function(css) {
                sGis.utils.validate.string(css);
                this._gridCss = css;
                this._grid.className = css;
            }
        },

        gridWidth: {
            get: function() {
                return this._gridWidth;
            },
            set: function(w) {
                sGis.utils.validate.number(w);
                this._gridWidth = w;

                this._grid.style.width = w + 'px';
            }
        },

        gridHeight: {
            get: function() {
                return this._gridHeight;
            },
            set: function(h) {
                sGis.utils.validate.number(h);
                this._gridHeight = h;

                this._grid.style.height = h + 'px';
            }
        },

        gridTop: {
            get: function() {
                return this._gridTop;
            },
            set: function(n) {
                sGis.utils.validate.number(n);
                this._gridTop = n;
                this._grid.style.top = n + 'px';
            }
        },

        gridLeft: {
            get: function() {
                return this._gridLeft;
            },
            set: function(n) {
                sGis.utils.validate.number(n);
                this._gridLeft = n;
                this._grid.style.left = n + 'px';
            }
        },

        sliderCss: {
            get: function() {
                return this._sliderCss;
            },
            set: function(css) {
                sGis.utils.validate.string(css);
                this._sliderCss = css;
                this._slider.className = css;
            }
        },

        sliderWidth: {
            get: function() {
                return this._sliderWidth;
            },
            set: function(w) {
                sGis.utils.validate.number(w);
                this._sliderWidth = w;

                this._slider.style.width = w + 'px';
                this._slider.style.left = this._getSliderLeft() + 'px';
            }
        },

        sliderHeight: {
            get: function() {
                return this._sliderHeight;
            },
            set: function(h) {
                sGis.utils.validate.number(h);
                this._sliderHeight = h;

                this._slider.style.height = h + 'px';
            }
        }
    });

    utils.mixin(sGis.decorations.ScaleSlider.prototype, sGis.IEventHandler.prototype);

    var defaultCss = '.sGis-decorations-scaleSlider-grid {' +
            'border: 1px solid gray; ' +
            'background-color: #CCCCCC; ' +
            'border-radius: 5px;} ' +
            '.sGis-decorations-scaleSlider-slider {' +
            'border: 1px solid gray;' +
            'background-color: white;' +
            'border-radius: 5px;' +
            'cursor: pointer;}',
        styles = document.createElement('style');
    styles.type = 'text/css';
    if (styles.styleSheet) {
        styles.styleSheet.cssText = defaultCss;
    } else {
        styles.appendChild(document.createTextNode(defaultCss));
    }

    document.head.appendChild(styles);

})();(function() {

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
                if (!utils.isNumber(size) || size <= 0) utils.error('Expected positive number but got ' + size + ' instead');
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

})();(function() {

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

})();(function() {

    sGis.geom.Polygon = function (coordinates, options) {
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
            value: function () {
                return new sGis.geom.Polygon(this._coordinates, {
                    color: this._color,
                    width: this._width,
                    fillColor: this._fillColor
                });
            }
        },

        contains: {
            value: function (a, b) {
                var position = b && isValidPoint([a, b]) ? [a, b] : utils.isArray(a) && isValidPoint(a) ? a : a.x && a.y ? [a.x, a.y] : utils.error('Point coordinates are expecred but got ' + a + ' instead'),
                    coordinates = this._coordinates;

                return sGis.geotools.contains(coordinates, position, this.width / 2 + 2);
            }
        },

        fillStyle: {
            get: function () {
                return this._fillStyle;
            },

            set: function (style) {
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
            get: function () {
                return this._fillColor;
            },

            set: function (color) {
                if (!utils.isString(color)) utils.error('Color string is expected, but got ' + color + ' instead');
                this._fillColor = color;
            }
        },

        fillImage: {
            get: function () {
                return this._fillImage;
            },

            set: function (image) {
                if (!(image instanceof Image)) utils.error('Image is expected but got ' + image + ' istead');
                this._fillImage = image;
            }
        }
    });

    function isValidPoint(point) {
        return utils.isArray(point) & utils.isNumber(point[0]) && utils.isNumber(point[1]);
    }

})();(function() {

    sGis.geom.Arc = function(center, options) {
        utils.init(this, options);

        this.center = center;
    };

    sGis.geom.Arc.prototype = {
        _radius: 5,
        _strokeColor: 'black',
        _strokeWidth: 1,
        _fillColor: 'transparent',

        contains: function(position) {
            var dx = position.x - this._center[0],
                dy = position.y - this._center[1],
                distance2 = dx * dx + dy * dy;
            return Math.sqrt(distance2) < this._radius + 2;
        }
    };

    Object.defineProperties(sGis.geom.Arc.prototype, {
        center: {
            get: function() {
                return this._center;
            },
            set: function(coordinates) {
                this._center = coordinates;
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },
            set: function(r) {
                this._radius = r;
            }
        },

        strokeColor: {
            get: function() {
                return this._strokeColor;
            },
            set: function(color) {
                this._strokeColor = color;
            }
        },

        strokeWidth: {
            get: function() {
                return this._strokeWidth;
            },
            set: function(w) {
                this._strokeWidth = w;
            }
        },

        fillColor: {
            get: function() {
                return this._fillColor;
            },
            set: function(color) {
                this._fillColor = color;
            }
        }
    });

})();(function() {

    sGis.symbol = {};

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
            if (!this._cache || !utils.softEquals(resolution, this._cache[0].resolution)) {
                var div = document.createElement('div');
                div.className = this.style.css;
                div.appendChild(this.content);
                div.style.position = 'absolute';
                div.style.height = this.style.height + 'px';
                div.style.width = this.style.width + 'px';

                var point = this.point.projectTo(crs);
                div.position = [point.x / resolution + this.style.offset.x, -point.y / resolution + this.style.offset.y];
                div.style.pointerEvents = 'none';
                div.style.cursor = 'inherit';
                div.style.textAlign = this.style.align;

                this._cache = [{node: div, position: div.position, resolution: resolution}];
            }

            return this._cache;
        }
    });

    sGis.symbol.image = {
        Image: function(style) {
            this.setDefaults(style)
        }
    };

    sGis.symbol.image.Image.prototype = new sGis.Symbol({
        type: 'image',
        style: {
            transitionTime: {
                defaultValue: 0,
                get: function() {
                    return this._transitionTime;
                },
                set: function(t) {
                    this._transitionTime = t;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            if (!this._cache) {
                var image = new Image();
                image.src = this.src;
                image.width = this.width;
                image.height = this.height;

                image.bbox = this.bbox;
                this._cache = [{
                    node: image,
                    bbox: this.bbox,
                    persistent: true
                }];

                if (this.style.transitionTime > 0) {
                    image.style.opacity = 0;
                    image.style.transition = 'opacity ' + this.style.transitionTime / 1000 + 's linear';

                    var self = this;
                    this._cache[0].onAfterDisplay = function() {
                        setTimeout(function() { image.style.opacity = self.opacity; }, 0);
                    }
                } else {
                    image.style.opacity = this.opacity;
                }
            }
            return this._cache;
        }
    });

})();(function() {

    sGis.symbol.point = {
        Point: function(style) {
            this.setDefaults(style);
        },

        Image: function(style) {
            this.setDefaults(style);
        },

        Square: function(style) {
            this.setDefaults(style);
        },

        MaskedImage: function(style) {
            this.setDefaults(style);
        }
    };

    sGis.symbol.point.MaskedImage.prototype = new sGis.Symbol({
        type: 'point',
        style: {
            size: {
                defaultValue: 32,
                get: function() {
                    return this._size || this.defaults.size;
                },
                set: function(size) {
                    if (!utils.isNumber(size) || size <= 0) utils.error('Positive')
                }
            }
        }
    });

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

            strokeWidth: {
                defaultValue: 1,
                get: function() {
                    return this._strokeWidth === undefined ?  this.defaults.strokeWidth : this._strokeWidth;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width < 0) utils.error('Positive number is expected but got ' + width + ' instead');
                    this._strokeWidth = width;
                }
            },

            strokeColor: {
                defaultValue: 'transparent',
                get: function() {
                    return this._strokeColor || this.defaults.strokeColor;
                },

                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._strokeColor = color;
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

            var point = new sGis.geom.Arc(pxPosition, {fillColor: this.style.color, strokeColor: this.style.strokeColor, strokeWidth: this.style.strokeWidth, radius: this.style.size / 2});
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
            },

            renderToCanvas: {
                defaultValue: true,
                get: function() {
                    return this._renderToCanvas || this.defaults.renderToCanvas;
                },
                set: function(renderToCanvas) {
                    this._renderToCanvas = renderToCanvas;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            // TODO: the result of this function must be cached!
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

                var render = {
                    node: image,
                    position: image.position,
                    persistent: true,
                    renderToCanvas: this.style.renderToCanvas
                };
                return [render];
            } else {
                return [];
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

})();(function() {

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

    //TODO: this is duplicate function with Polygon

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

})();(function() {

    sGis.symbol.polygon = {
        Simple: function(style) {
            this.setDefaults(style);
        },
        BrushFill: function(style) {
            this.setDefaults(style);
        },
        ImageFill: function(style) {
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

    sGis.symbol.polygon.ImageFill.prototype = new sGis.Symbol({
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
            fillImage: {
                defaultValue: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
                get: function() {
                    return this._src;
                },
                set: function(src) {
                    if (!utils.isString(src)) utils.error('String is expected but got ' + src + ' instead');
                    this._src = src;
                    if (!this._image) this._image = new Image();
                    this._image.src = this._src;
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

            var divRender = {
                node: div,
                position: position
            }

            return [this._cache[resolution], divRender];
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
            } else if (this._defaultSymbol) {
                this.symbol = this._defaultSymbol;
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

})();'use strict';

(function () {

    sGis.feature.Point = function (point, options) {
        this.__initialize(options);
        if (!point) utils.error('The point position is not specified');

        this._point = point;
    };

    sGis.feature.Point.prototype = new sGis.Feature({
        _defaultSymbol: new sGis.symbol.point.Point(),
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
        _defaultSymbol: new sGis.symbol.polyline.Simple(),
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
            return new sGis.feature.Polyline(this._coordinates, {crs: this._crs, color: this._color, width: this._width, style: this.style, symbol: this.symbol});
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
                this._bbox = null;
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

})();'use strict';

(function() {

    sGis.feature.Polygon = function(coordinates, options) {
        this.__initialize(options);

        this._coordinates = [[]];
        if (coordinates) this.coordinates = coordinates;
    };

    sGis.feature.Polygon.prototype = new sGis.feature.Polyline();

    Object.defineProperties(sGis.feature.Polygon.prototype, {
        _defaultSymbol: {
            value: new sGis.symbol.polygon.Simple()
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
        },

        clone: {
            value: function() {
                return new sGis.feature.Polygon(this._coordinates, {
                    crs: this._crs,
                    color: this._color,
                    width: this._width,
                    fillColor: this.fillColor,
                    style: this.style,
                    symbol: this.symbol
                });
            }
        },

        /**
         * Checks if the point is inside the polygon
         * @param {sGis.Point|sGis.feature.Point|Array} point - The point to check. Coordinates can be given in [x, y] format (must be in polygon crs)
         * @return {Boolean}
         */
        contains: {
            value: function(point) {
                var pointCoordinates;
                if (point instanceof sGis.Point || point instanceof sGis.feature.Point) {
                    pointCoordinates = point.projectTo(this.crs).coordinates;
                } else if (sGis.utils.is.array(point)) {
                    pointCoordinates = point;
                } else {
                    utils.error('Invalid format of the point');
                }

                return sGis.geotools.contains(this.coordinates, pointCoordinates);
            }
        }
    });

})();(function() {

    var defaultDiv = document.createElement('div');
    defaultDiv.innerHTML = 'New label';
    defaultDiv.style.textAlign = 'center';

    sGis.feature.Label = function(position, options) {
        this.__initialize(options);
        this.coordinates = position;

        this._resetCache();
    };

    sGis.feature.Label.prototype = new sGis.Feature({
        _defaultSymbol: new sGis.symbol.label.Label(),
        _content: defaultDiv.cloneNode(true),
        _crs: sGis.CRS.geo,

        render: function(resolution, crs) {
            return this._symbol.renderFunction.call(this, resolution, crs);
        },

        _resetCache: function() {
            this._cache = null;
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
                this._resetCache();
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
                this._resetCache();
            }
        },

        type: {
            value: 'label'
        },

        bbox: {
            get: function() {
                return new sGis.Bbox(this._point, this._point);
            }
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
        _defaultSymbol: new sGis.symbol.maptip.Simple(),
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

})();'use strict';

(function() {

    sGis.feature.Image = function(bbox, properties) {
        this.__initialize(properties);
        this.bbox = bbox;
    };

    sGis.feature.Image.prototype = new sGis.Feature({
        _src: null,
        _crs: null,
        _width: 256,
        _height: 256,
        _opacity: 1,
        _defaultSymbol: new sGis.symbol.image.Image()
    });

    Object.defineProperties(sGis.feature.Image.prototype, {
        type: {
            value: 'image'
        },

        src: {
            get: function() {
                return this._src;
            },
            set: function(source) {
                if (!utils.isString(source) && source !== null) utils.error('String is expected but got ' + source + ' instead');
                if (this._src !== source) {
                    this._src = source;
                    this._cache = null;
                }
            }
        },

        bbox: {
            get: function() {
                return this._bbox.projectTo(this.crs);
            },
            set: function(bbox) {
                var adjBbox;
                if (bbox instanceof sGis.Bbox) {
                    if (this._crs) {
                        adjBbox = bbox.projectTo(this._crs);
                    } else {
                        adjBbox = bbox;
                        this._crs = bbox.crs;
                    }
                } else {
                    adjBbox = new sGis.Bbox(bbox[0], bbox[1], this._crs || sGis.CRS.geo);
                }
                if (!this._bbox || !this._bbox.equals(adjBbox)) {
                    this._bbox = adjBbox;
                    this._cache = null;
                }
            }
        },

        crs: {
            get: function() {
                return this._bbox && this._bbox.crs || this._crs;
            },
            set: function(crs) {
                if (this._crs !== crs) {
                    if (this._bbox) {
                        this._bbox.crs = crs;
                    }
                    this._crs = crs;
                    this._cache = null;
                }
            }
        },

        cache: {
            get: function() {
                return this._cache;
            }
        },

        width: {
            get: function() {
                return this._width;
            },
            set: function(width) {
                if (this._width !== width) {
                    this._width = width;
                    this._cache = null;
                }
            }
        },
        height: {
            get: function() {
                return this._height;
            },
            set: function(height) {
                if (this._height !== height) {
                    this._height = height;
                    this._cache = null;
                }
            }
        },
        opacity: {
            get: function() {
                return this._opacity;
            },
            set: function(opacity) {
                if (this._opacity !== opacity) {
                    this._opacity = opacity;
                    this._cache = null;
                }
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



})();'use strict';

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

})();'use strict';

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

})();'use strict';

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
            }, 10);

            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
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
        },

        cancelDrawing: function() {
            if (this._activeFeature) {
                this._activeFeature.coordinates = [[[0, 0]]];
                finishDrawing(this);
            }
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
            var geom = control._activeFeature;
        }

        control._map.removeListner('mousemove.sGis-polyline');
        control._map.removeListner('dblclick.sGis-polyline');

        control._activeFeature.allowEvent('click');

        control._activeFeature = null;

        control._map.redrawLayer(control.activeLayer);
        if (geom) control.fire('drawingFinish', {geom: geom});
    }

})();+'use strict';

(function() {

sGis.controls.Polygon = function(map, options) {
    if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
    this._map = map;

    options = options || {};
    if (options.activeLayer) this.activeLayer = options.activeLayer;
    this._prototype = new sGis.feature.Polygon([[]], {style: options.style, symbol: options.symbol});
    

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
                    self.startNewRing();
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
    },

    cancelDrawing: function() {
        if (this._activeFeature) {
            this._activeFeature.coordinates = [[[0, 0]]];
            this.prohibitEvent('drawingFinish');
            finishDrawing(this);
            this.allowEvent('drawingFinish');
        }
    },

    startNewRing: function() {
        var coordinates = this._activeFeature.coordinates;
        var ringIndex = coordinates.length;
        var point = coordinates.pop().pop();
        this._activeFeature.setRing(ringIndex, [point]);
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
        },

        set: function(feature) {
            if (!(feature instanceof sGis.feature.Polygon)) utils.error('sGis.feature.Polygon instance is expected but got ' + feature + ' instead');
            if (this._activeFeature) {
                if (feature === this._activeFeature) return;
                this.canceDrawing();
            }

            this._activeFeature = feature;
            this._map.addListner('mousemove.sGis-polygon', this._mousemoveHandler);
            this._map.addListner('dblclick.sGis-polygon', this._dblclickHandler);

            this._activeFeature.prohibitEvent('click');

            this.activate();
        }
    }
});

function createNewPolygon(layer, point, options) {
    var polygon = new sGis.feature.Polygon([[point.x, point.y], [point.x, point.y]], options);
    layer.add(polygon);
    return polygon;
}

function finishDrawing(control) {
    var ring = control._activeFeature.coordinates.length - 1;
    if (control._activeFeature.coordinates[ring].length < 3) {
        control.activeLayer.remove(control._activeFeature);
    } else {
        control._activeFeature.removePoint(ring, control._activeFeature.coordinates[ring].length - 1);
        var geom = control._activeFeature;
    }

    control._activeFeature.allowEvent('click');

    control._map.removeListner('mousemove.sGis-polygon');
    control._map.removeListner('dblclick.sGis-polygon');
    control._activeFeature = null;

    control._map.redrawLayer(control.activeLayer);
    if (geom) control.fire('drawingFinish', {geom: geom});
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
            feature.addListner('click.sGis-editor', doNothing.bind(this));

            var self = this;

            this._tempLayer = tempLayer;
            this._selectedFeature = feature;
            this._map.addListner('click.sGis-editor', function(sGisEvent) {
                if (!self._deselectProhibited) self.deselectFeature();
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
                if (self._ignoreEvents) return;
                var event = sGisEvent.browserEvent;
                if (event.which === 27) {
                    if (!self._deselectProhibited) self.deselectFeature();
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
        },

        prohibitDeselect: function() {
            this._deselectProhibited = true;
        },

        allowDeselect: function() {
            this._deselectProhibited = false;
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
        },

        ignoreEvents: {
            get: function() {
                return this._ignoreEvents;
            },
            set: function(bool) {
                this._ignoreEvents = bool;
            }
        }
    });

    function doNothing(sGisEvent) {
        if (this._ignoreEvents) return;
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

            tempPoint.addListner('click', doNothing.bind(editor));
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
                if (editor._ignoreEvents) return;
                sGisEvent.draggingObject = this;
            });
            tempPolyline.addListner('drag', function(sGisEvent) {
                if (editor.ignoreEvents) return;
                movePolyline(this, sGisEvent.offset, editor);
            });

            if (!polygon.hasListners('dragStart')) {
                polygon.addListner('dragStart.sGis-editor', function(sGisEvent) {
                    if (editor._ignoreEvents) return;
                    sGisEvent.draggingObject = this;
                });
                polygon.addListner('drag.sGis-editor', function(sGisEvent) {
                    if (editor._ignoreEvents) return;
                    movePolyline(editor._tempLayer.features[0], sGisEvent.offset, editor);
                });
            }

            return features;

            function addControlPoint(sGisEvent) {
                if (editor._ignoreEvents) return;
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

                point.addListner('click', doNothing.bind(editor));
                point.addListner('dragStart', pointDragStart);
                point.addListner('drag', dragControlPoint);
                point.addListner('dblclick', removeControlPoint);
            }
        }

        controlPoints = controlPoints.concat(getScalingControls(feature, controlPoints, editor));

        return controlPoints;

        function dragControlPoint(sGisEvent) {
            if (editor._ignoreEvents) return;
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
            if (editor._ignoreEvents) return;
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
            if (editor._ignoreEvents) return;
            sGisEvent.draggingObject = this;
        }

        function scalingDrag(sGisEvent) {
            if (editor._ignoreEvents) return;
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
            if (editor._ignoreEvents) return;
            sGisEvent.draggingObject = this;
            this.rotationBase = feature.centroid;
            editor.fire('rotationStart', sGisEvent);
        }

        function rotationDrag(sGisEvent) {
            if (editor._ignoreEvents) return;
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

})();(function() {

    sGis.controls.BaseLayerSwitch = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        utils.init(this, options);
        this._container = this._getNewControlContainer();

        this._layerDescriptions = [];
        if (options && options.layerDescriptions) this.layerDescriptions = options.layerDescriptions;
    };

    sGis.controls.BaseLayerSwitch.prototype = new sGis.Control({
        _xAlign: 'right',
        _yAlign: 'bottom',
        _xOffset: 32,
        _yOffset: 32,
        _width: 64,
        _height: 64,
        _inactiveWidth: 56,
        _inactiveHeight: 56,
        _margin: 8,
        _css: 'sGis-control-baseLayerSwitch',
        _cssActive: 'sGis-control-baseLayerSwitch-active',

        addLayer: function(layer, imageSrc) {
            if (!(layer instanceof sGis.Layer)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
            if (!layer.tileScheme) utils.error('A layer without tile cscheme cannot be interpreted as base layer');
            if (this.getLayerIndex(layer) !== -1) utils.error('The layer is already in the list');

            this._layerDescriptions.push({ layer: layer, imageSrc: imageSrc });
            this._addLayerToImageBox(layer);

            if (this._map.getLayerIndex(layer) !== -1) {
                this.activeLayer = layer;
            }
        },

        removeLayer: function(layer) {
            if (this._activeLayer === layer) {
                if (this._layerDescriptions.length === 1) {
                    this.deactivate();
                } else {
                    var layerIndex = this.getLayerIndex(layer);
                    this.activeLayer = this._layerDescriptions[layerIndex === 0 ? 1 : layerIndex - 1];
                }
            }

            this._removeLayerFromImageBox(layer);
            this._layerDescriptions.splice(this.getLayerIndex(layer), 1);
        },

        _addLayerToImageBox: function(layer) {
            if (!this._inactiveLayerBox) {
                this._inactiveLayerBox = this._getNewInactiveLayerBox();
                this._container.appendChild(this._inactiveLayerBox);
            }

            var index = this.getLayerIndex(layer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(layer);
            }

            if (index < this._inactiveLayerBox.children.length) {
                this._inactiveLayerBox.insertBefore(this._layerDescriptions[index].image, this._inactiveLayerBox.children[index]);
            } else {
                this._inactiveLayerBox.appendChild(this._layerDescriptions[index].image);
            }

            this._updateImagePositions();
        },

        _updateImagePositions: function() {
            var top = this._height - this._inactiveHeight;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                this._layerDescriptions[i].image.style.top = top + 'px';
                this._layerDescriptions[i].image.style.left = i * (this._inactiveWidth + this._margin) + 'px';
            }
        },

        _getLayerImageObject: function(layer) {
            var image = new Image();
            image.width = this._inactiveWidth;
            image.height = this._inactiveHeight;
            image.src = this._layerDescriptions[this.getLayerIndex(layer)].imageSrc;
            image.style.marginRight = this._margin + 'px';
            image.className = this._css;
            image.style.position = 'absolute';

            var self = this;
            image.onclick = function(event) {
                if (self.activeLayer !== layer) {
                    self.activeLayer = layer;
                    event.stopPropagation();
                }
            }

            return image;
        },

        _getNewInactiveLayerBox: function() {
            var box = document.createElement('div');
            box.style.width = '0px';
            box.style.height = this._height + 10 + 'px';

            box.style[utils.css.transition.func] = 'width 0.5s';
            box.style.overflow = 'hidden';
            box.style.position = 'absolute';
            box.style[this._xAlign] = this.width + 'px';

            return box;
        },

        _removeLayerFromImageBox: function(layer) {
            this._inactiveLayerBox.removeChild(this._layerDescriptions[this.getLayerIndex(layer)].image);
        },

        getLayerIndex: function(layer) {
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                if (this._layerDescriptions[i].layer === layer) return i;
            }
            return -1;
        },

        _setActiveStatus: function(active) {
            if (active) {
                this._map.wrapper.appendChild(this._container);
                this._active = true;
            } else {
                this._map.wrapper.removeChild(this._container);
                this._active = false;
            }
        },

        _setActiveLayerImage: function() {
            if (!this._activeLayerImageContainer) {
                this._activeLayerImageContainer = this._getNewActiveLayerImageContainer();
                this._container.appendChild(this._activeLayerImageContainer);
            }

            if (this._activeLayerImageContainer.children.length > 0) {
                this._activeLayerImageContainer.removeChild(this._activeLayerImageContainer.children[0]);
            }

            var index = this.getLayerIndex(this._activeLayer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(this._activeLayer);
            }

            this._activeLayerImageContainer.style.backgroundImage = 'url(' + this._layerDescriptions[index].image.src + ')';
        },

        _getNewActiveLayerImageContainer: function() {
            var container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.width = this._width + 'px';
            container.style.height = this._height + 'px';
            container.style.cursor = 'pointer';
            container.style.border = '1px solid black';
            container.style.backgroundSize = '100%';

            var self = this;
            Event.add(container, 'click', function(event) {
                if (self._inactiveLayerBox.style.width === '0px') {
                    self._showInactiveLayerBox();
                } else {
                    self._hideInactiveLayerBox();
                }
                event.stopPropagation();
            });

            return container;
        },

        _getNewControlContainer: function() {
            var container = document.createElement('div');
            container.style.position = 'absolute';

            container.style[this._xAlign] = this._xOffset + 'px';
            container.style[this._yAlign] = this._yOffset + 'px';

            container.style.width = this._width + 'px';
            container.style.height = this._height + 'px';

            Event.add(container, 'dblclick', function(event) {
                event.stopPropagation();
            });

            return container;
        },

        _showInactiveLayerBox: function() {
            var layerCount = this._layerDescriptions.length;
            this._inactiveLayerBox.style.width = (this._inactiveWidth + this._margin + 2) * layerCount + 'px';
        },

        _hideInactiveLayerBox: function() {
            this._inactiveLayerBox.style.width = '0px';
        },

        _updateInactiveLayersDecoration: function() {
            var activeLayer = this.activeLayer;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                var image = this._layerDescriptions[i].image;
                var index = image.className.indexOf(this._cssActive);
                var isActive = this.activeLayer === this._layerDescriptions[i].layer;

                if (index === -1 && isActive) {
                    image.className += ' ' + this._cssActive;
                } else if (index !== -1 && !isActive) {
                    image.className = image.className.substr(0, index - 1) + image.className.substr(index + this._cssActive.length);
                }
            }
        }
    });

    Object.defineProperties(sGis.controls.BaseLayerSwitch.prototype, {
        layerDescriptions: {
            get: function() {
                return this._layerDescriptions;
            },
            set: function(descriptions) {
                if (this._layerDescriptions.length > 0) {
                    for (var i = 0, len = this._layerDescriptions; i < len; i++) {
                        this.removeLayer(this._layerDescriptions[i]);
                    }
                }
                for (var i = 0, len = descriptions.length; i < len; i++) {
                    this.addLayer(descriptions[i].layer, descriptions[i].imageSrc);
                }
            }
        },

        activeLayer: {
            get: function() {
                return this._activeLayer;
            },
            set: function(layer) {
                if (layer !== this._activeLayer) {
                    var indexInList = this.getLayerIndex(layer),
                        indexOnMap = 0;
                    if (indexInList === -1) utils.error('The layer is not in the list');

                    if (this._activeLayer) {
                        indexOnMap = this._map.getLayerIndex(this._activeLayer);
                        this._map.removeLayer(this._activeLayer);
                    }

                    this._map.moveLayerToIndex(layer, indexOnMap);
                    this._activeLayer = layer;

                    this._setActiveLayerImage();
                    this._updateInactiveLayersDecoration();

                    this.fire('activeLayerChange');
                }
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

        css: {
            get: function() {
                return this._css;
            },
            set: function(css) {
                utils.validateString(css);
                this._css = css;
            }
        },

        inactiveWidth: {
            get: function() {
                return this._inactiveWidth;
            },
            set: function(width) {
                utils.validatePositiveNumber(width);
                this._inactiveWidth = width;
            }
        },

        inactiveHeight: {
            get: function() {
                return this._inactiveHeight;
            },
            set: function(height) {
                utils.validatePositiveNumber(height);
                this._inactiveHeight = height;
            }
        }
    });

    var defaultCss = '.sGis-control-baseLayerSwitch {cursor: pointer; border: 1px solid gray;} .sGis-control-baseLayerSwitch-active {border: 2px solid DarkViolet;}',
        buttonStyle = document.createElement('style');
    buttonStyle.type = 'text/css';
    if (buttonStyle.styleSheet) {
        buttonStyle.styleSheet.cssText = defaultCss;
    } else {
        buttonStyle.appendChild(document.createTextNode(defaultCss));
    }

    document.head.appendChild(buttonStyle);

})();(function() {

    sGis.controls.Area = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        utils.init(this, options);

        this._polygonControl = new sGis.controls.Polygon(map, { activeLayer: options && options.activeLayer, style: { strokeWidth: 2, strokeColor: 'red', fillColor: 'rgba(100, 100, 100, 0.5)' } });

        this._polygonControl.addListner('drawingBegin', function() {
            if (this.activeLayer.features.length > 1) this.activeLayer.features = [this.activeLayer.features[this.activeLayer.features.length - 1]];

            var feature = this._activeLayer.features[this._activeLayer.features.length - 1],
                label = new sGis.feature.Label(feature.centroid, { content: '', crs: feature.crs, style: { css: 'sGis-distanceLabel', offset: { x: -50, y: -10 }, width: 120 } });

            this.activeLayer.add(label);

            map.addListner('mousemove.areaMeasureControl', function() {
                label.coordinates = feature.centroid;
                label.content = formatNumber(sGis.geotools.area(feature));
            });
        });

        this._polygonControl.addListner('drawingFinish', function() {
            map.removeListner('mousemove.areaMeasureControl');
        });
    };

    sGis.controls.Area.prototype = new sGis.Control({
        _setActiveStatus: function(bool) {
            this._polygonControl.isActive = bool;
            this._active = bool;

            if (!bool) {
                this._polygonControl.activeLayer.features = [];
                this._map.redrawLayer(this._polygonControl.activeLayer);
            }
        }
    });

    function formatNumber(n) {
        var s;
        if (n < 10000) {
            s = '' + n.toFixed(2) + 'м²';
        } else if (n < 10000000) {
            s = '' + (n / 10000).toFixed(2) + 'га';
        } else {
            s = '' + (n / 1000000).toFixed(2) + 'км²';
            if (s.length > 10) {
                for (var i = s.length - 9; i > 0; i -= 3) {
                    s = s.substr(0, i) + ' ' + s.substr(i);
                }
            }
        }
        return s.replace('.', ',');
    }

})();(function() {

    sGis.controls.Distance = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        utils.init(this, options);

        this._polylineControl = new sGis.controls.Polyline(map, { activeLayer: options && options.activeLayer, style: {strokeWidth: 2, strokeColor: 'red'} });

        this._polylineControl.addListner('drawingBegin', function() {
            if (this.activeLayer.features.length > 1) this.activeLayer.features = [this.activeLayer.features[this.activeLayer.features.length - 1]];

            var feature = this.activeLayer.features[this.activeLayer.features.length - 1],
                coord = feature.coordinates[0],
                label = new sGis.feature.Label(coord[1], { content: '', style: { offset: { x: 2, y: -22 }, css: 'sGis-distanceLabel', width: 100 }, crs: map.crs });

            this.activeLayer.add(label);

            map.addListner('mousemove.distanceMeasureControl', function() {
                label.coordinates = feature.coordinates[0][feature.coordinates[0].length - 1];
                label.content = formatNumber(sGis.geotools.length(feature));
            });
        });

        this._polylineControl.addListner('drawingFinish', function() {
            map.removeListner('mousemove.distanceMeasureControl');
        });
    };

    sGis.controls.Distance.prototype = new sGis.Control({
        _setActiveStatus: function(bool) {
            this._polylineControl.isActive = bool;
            this._active = bool;

            if (!bool) {
                this._polylineControl.activeLayer.features = [];
                this._map.redrawLayer(this._polylineControl.activeLayer);
            }
        }
    });

    function formatNumber(n) {
        var s;
        if (n > 10000) {
            s = '' + (n / 1000).toFixed(2) + 'км';
        } else {
            s = '' + n.toFixed(2) + 'м';
        }
        return s.replace('.', ',');
    }

    function addStyleSheet() {
        var styleSheet = document.createElement('style');
        styleSheet.type = 'text/css';
        styleSheet.innerHTML = '.sGis-distanceLabel {font-family: "PT Sans",Tahoma; font-size: 15px; background-color: rgba(200, 200, 255, 0.8);border: 1px solid black;border-radius: 5px; color: black;}';
        document.head.appendChild(styleSheet);
    }

    addStyleSheet();

})();(function() {

    sGis.controls.Rectangle = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        options = options || {};

        if (options.activeLayer) this.activeLayer = options.activeLayer;
    };

    sGis.controls.Rectangle.prototype = new sGis.Control({
        _setActiveStatus: function(active) {
            var self = this;
            if (active) {
                this._map.addListner('dragStart.sGis-RectangleControl', function(sGisEvent) {
                    self._startDrawing(sGisEvent.point);

                    this.addListner('drag.sGis-RectangleControl', function(sGisEvent) {
                        self._updateRectangle(sGisEvent.point);
                        sGisEvent.stopPropagation();
                        sGisEvent.preventDefault();
                    });

                    this.addListner('dragEnd.sGis-RectangleControl', function() {
                        var feature = self._activeFeature;
                        this.removeListner('drag dragEnd.sGis-RectangleControl');
                        this._activeFeature = null;
                        self.fire('drawingFinish', { geom: feature });
                    });

                    self.fire('drawingStart', { geom: self._activeFeature });
                });

                this._active = true;
            } else {
                this._map.removeListner('.sGis-RectangleControl');
                this._active = false;
            }
        },

        _startDrawing: function(point) {
            var coord = point.getCoordinates(),
                rect = new sGis.feature.Polygon([coord, coord, coord, coord], { crs: point.crs });

            this.activeLayer.add(rect);
            this._activeFeature = rect;

            this._map.redrawLayer(this.activeLayer);
        },

        _updateRectangle: function(newPoint) {
            var coord = this._activeFeature.coordinates[0],
                pointCoord = newPoint.getCoordinates();

            coord = [coord[0], [coord[1][0], pointCoord[1]], pointCoord, [pointCoord[0], coord[3][1]]];

            this._activeFeature.coordinates = coord;
            this._map.redrawLayer(this.activeLayer);
        }
    });



})();'use strict';

(function() {
    sGis.spatialProcessor = {};

    sGis.spatialProcessor.Connector = function(url, rootMapItem, login, password) {
        if (!utils.isString(url) || !utils.isString(login) || !(rootMapItem instanceof sGis.MapItem)) utils.error('Incorrect parameters for Spatial Processor initialization');

        this._url = url;
        this._notificationListners = {};
        this._operationList = {};
        this._rootMapItem = rootMapItem;
        this._failedNotificationRequests = 0;

        this.initializeSession(login, password);
    };

    sGis.spatialProcessor.Connector.prototype = {
        _synchronizationTimer: null,

        apiLoginUrl: '%sp%Strategis.JsClient/ApiLogin.aspx',

        addNotificationListner: function(string, callback) {
            this._notificationListners[string] = callback;
        },

        removeNotificationListner: function(string) {
            if (this._notificationListners[string]) delete this._notificationListners[string];
        },

        initializeSession: function(login, password) {
            var self = this;
            if (password) {
                var spUrl = this._url.substr(-4, 4) === 'IIS/' ? this._url.substr(0, this._url.length - 4) : this._url,
                    url = this.apiLoginUrl.replace(/%sp%/, spUrl) + '?authId=505741D8-C667-440D-9CA0-32FD1FF6AF88&userName=' + login + '&password=' + password + '&ts=' + new Date().getTime();
                utils.ajax({
                    url: url,
                    success: function(data, textStatus) {
                        if (data === '') {
                            utils.message('Could not get session ID');
                        } else {
                            var id = JSON.parse(data).token;

                            if (utils.isString(id)) {
                                initialize(id);

                                self.fire('sessionInitialized');
                            } else {
                                utils.error('Could not get session. Server responded with: ' + data);
                            }
                        }
                    },

                    error: function() {
                        utils.message('Could not get session ID');
                    }
                });
            } else {
                initialize(login);
            }

            function initialize(id) {
                setListners(self, self._rootMapItem);
                self._sessionId = encodeURIComponent(id);
                self.synchronize();
                self.requestNotifications();

                escapePrintMethod(self);
            }
        },

//    initializeSession: function() {
//        var self = this;
//        utils.ajax({
//            url: this._url + '_startSession?f=json',
//            success: function(data, textStatus) {
//                if (data === '') {
//                    utils.message('Could not get session ID');
//                } else {
//                    var id = /"(.*)"/.exec(data)[1];
//                    self._sessionId = encodeURIComponent(id);
//                    self.synchronize();
//                    self.requestNotifications();
//                    
//                    escapePrintMethod(self);
//                    
//                    self.fire('sessionInitialized');
//                }
//            },
//            
//            error: function() {
//                utils.message('Could not get session ID');
//            }
//        });
//    },

        synchronize: function() {
            var self = this;
            this._synchronized = false;
            if (this._synchronizationTimer === undefined) {

                var mapItems = this._rootMapItem.getChildren(true),
                    structure = {Structure: []};

                for (var i in mapItems) {
                    structure.Structure.push(getMapItemDescription(mapItems[i], false));
                }

                structure.Structure.push(getMapItemDescription(this._rootMapItem, true));

                var self = this,
                    data = 'f=json&data=' + encodeURIComponent(JSON.stringify(structure));


                utils.ajax({
                    type: 'POST',
                    url: this._url + 'MapItemStates/?_sb=' + this._sessionId,
                    data: data,
                    success: function(data) {
                        if (data !== 'true') {
                            self._synchronized = false;
                        } else {
                            if (!self._synchronizationTimer) {
                                self._synchronized = true;
                                self.fire('synchronize');
                            }
                        }
                    },
                    error: function() {
                        debugger;
                    }
                });
                this._synchronizationTimer = null;
            } else if (this._synchronizationTimer === null) {
                this._synchronizationTimer = setTimeout(function() {
                    self._synchronizationTimer = undefined;
                    self.synchronize();
                }, 500);
            }
        },

        requestNotifications: function() {
            var self = this,
                xhr = utils.ajax({
                    url: self._url + 'ClientNotification/?f=json&_sb=' + self._sessionId + '&ts=' + new Date().getTime(),
                    success: function(stringData, textStatus) {
                        try {
                            var data = JSON.parse(stringData);
                        } catch (e) {
                            utils.message('Connection to the server is lost...');
                            return;
                        }
                        if (data && data.Notifications) {
                            for (var i in data.Notifications) {
                                if (sGis.spatialProcessor.processNotification[data.Notifications[i].tag]) {
                                    sGis.spatialProcessor.processNotification[data.Notifications[i].tag](self, data.Notifications[i].data, data.Notifications[i].type);
                                } else {
                                    utils.message(data.Notifications[i].tag);
                                }
                            }
                            if (self._synchronized !== false) {
                                self.requestNotifications();
                            } else {
                                self.addListner('synchronize.self', function() {self.removeListner('.self'); self.requestNotifications();});
                            }

                            self._failedNotificationRequests = 0;
                        } else {
                            utils.error('Unexpected notification response from the server: ' + stringData);
                        }
                    },
                    error: function(stringData, textStatus) {
                        self._failedNotificationRequests += 1;
                        if (self._failedNotificationRequests > 5) {
                            sGis.utils.error('The connection to the server is lost');
                        } else {
                            setTimeout(self.requestNotifications.bind(self), self._failedNotificationRequests * 1000);
                        }
                    }
                });
            this._notificationRequestObject = xhr;
        },

        cancelNotificationRequest: function() {
            this._notificationRequestObject.abort();
        },

        getMapItemById: function(id) {
            var mapItems = this._rootMapItem.getChildren(true);
            for (var i in mapItems) {
                if (mapItems[i].id === id) {
                    return mapItems[i];
                }
            }
        },

        registerOperation: function(operationId, callback) {
            if (this._latestOperationNotification && (this._latestOperationNotification.operation.id === operationId)) {
                callback(this._latestOperationNotification);
                this._latestOperationNotification = null;
            } else {
                this._operationList[operationId] = callback;
            }
        },

        getServiceList: function(callback) {
            utils.ajax({
                url: this._url + '?f=json&_sb=' + this._sessionId,
                success: function(data) {
                    try {
                        var response = JSON.parse(data);
                    } catch(e) {
                        response = data;
                    }
                    callback(response);
                },
                error: function(data) {
                    callback(data);
                }
            });
        }
    };

    Object.defineProperties(sGis.spatialProcessor.Connector.prototype, {
        sessionId: {
            get: function() {
                return this._sessionId;
            }
        },

        url: {
            get: function() {
                return this._url;
            }
        },

        synchronized: {
            get: function() {
                return this._synchronized;
            }
        }
    });

    utils.mixin(sGis.spatialProcessor.Connector.prototype, sGis.IEventHandler.prototype);

    sGis.spatialProcessor.processNotification = {
        'dynamic layer': function(connector, data, type) {
            if (connector._notificationListners[data]) {
                connector._notificationListners[data]();
            }
        },

        'DAS': function(connector, data, type) {
            var response = sGis.spatialProcessor.parseXML(data);
            if (connector._operationList[response.operation.id]) {
                connector._operationList[response.operation.id](response);
                delete connector._operationList[response.operation.id];
            } else {
                connector._latestOperationNotification = response;
            }
        }
    };

    function setListners(connector, mapItem) {
        var handler = function() { connector.synchronize(); };
        var childAddHandler = function(sGisEvent) {
            setListners(connector, sGisEvent.child);
            connector.synchronize();
        };
        var childRemoveHandler = function(sGisEvent) {
            sGisEvent.child.removeListner('.sGis-connector');
            connector.synchronize();
        };

        if (!mapItem.hasListner('addChild', childAddHandler)) {
            mapItem.addListners({
                'addChild.sGis-connector': childAddHandler,
                'removeChild.sGis-connector': childRemoveHandler,
                'propertyChange.sGis-connector': handler,
                'childOrderChange.sGis-connector': handler,
                'serviceInfoUpate.sGis-connector': handler,
                'activate.sGis-connector': handler,
                'deactivate.sGis-connector': handler
            });
        }

        var children = mapItem.children;
        if (children) {
            for (var i = 0, len = children.length; i < len; i++) {
                setListners(connector, children[i]);
            }
        }
    }

    function getMapItemDescription(mapItem, isRoot) {
        var description = {
            Id: mapItem.id,
            IsVisible: mapItem.isActive,
            Name: mapItem.name,
            IsRoot: isRoot,
            Operations: mapItem.serverOperations,
            Children: []
        };
        //TODO: mapItem does not have opacity any more
        if (mapItem.getOpacity) {
            description.Opacity = mapItem.getOpacity();
        } else {
            description.Opacity = 1.0;
        }

        if (mapItem.getChildren) {
            var children = mapItem.getChildren();
            if (utils.isArray(children)) {
                for (var i in children) {
                    description.Children.push(children[i].id);
                }
            }
        }

        return description;
    }

    function escapePrintMethod(connector) {
        var print = window.print;
        window.print = function() {
            connector.cancelNotificationRequest();
            print();
            connector.requestNotifications();
        };
    }

})();'use strict';
(function() {
    sGis.utils.Color = function(string) {
        this._original = string;
        this._color = string.trim();
        this._setChannels();
    };

    sGis.utils.Color.prototype = {
        _setChannels: function() {
            var format = this.format;
            if (format && formats[format]) {
                this._channels = formats[format](this._color);
            } else {
                this._channels = {};
            }
        },
        toString: function(format) {
            if (format === 'hex') {
                return '#' + decToHex(this.a) + decToHex(this.r) + decToHex(this.g) + decToHex(this.b);
            } else {
                return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + (this.a / 255).toFixed(7).replace(/\.*0+$/, '') + ')';
            }
        }
    };

    function decToHex(dec) {
        var hex = Math.floor(dec).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }

    Object.defineProperties(sGis.utils.Color.prototype, {
        original: {
            get: function() {
                return this._original;
            }
        },

        isValid: {
            get: function() {
                return !!(utils.isNumber(this._channels.a) && utils.isNumber(this._channels.r) && utils.isNumber(this._channels.g) && utils.isNumber(this._channels.b));
            }
        },

        format: {
            get: function() {
                if (this._color.substr(0, 1) === '#' && this._color.search(/[^#0-9a-fA-F]/) === -1) {
                    if (this._color.length === 4) {
                        return 'hex3';
                    } else if (this._color.length === 7) {
                        return 'hex6';
                    } else if (this._color.length === 5) {
                        return 'hex4';
                    } else if (this._color.length === 9) {
                        return 'hex8';
                    }
                } else if (this._color.substr(0, 4) === 'rgb(') {
                    return 'rgb';
                } else if (this._color.substr(0, 5) === 'rgba(') {
                    return 'rgba';
                } else if (this._color in sGis.utils.Color.names) {
                    return 'name';
                }
            }
        },
        r: {
            get: function() {
                return this._channels.r;
            }
        },
        g: {
            get: function() {
                return this._channels.g;
            }
        },
        b: {
            get: function() {
                return this._channels.b;
            }
        },
        a: {
            get: function() {
                return this._channels.a;
            }
        },
        channels: {
            get: function() {
                return {
                    a: this._channels.a,
                    r: this._channels.r,
                    g: this._channels.g,
                    b: this._channels.b
                }
            }
        }
    });

    var formats = {
        hex3: function(string) {
            return {
                r: parseInt(string.substr(1,1) + string.substr(1,1), 16),
                g: parseInt(string.substr(2,1) + string.substr(2,1), 16),
                b: parseInt(string.substr(3,1) + string.substr(3,1), 16),
                a: 255
            }
        },
        hex6: function(string) {
            return {
                r: parseInt(string.substr(1,2), 16),
                g: parseInt(string.substr(3,2), 16),
                b: parseInt(string.substr(5,2), 16),
                a: 255
            }
        },
        hex4: function(string) {
            return {
                r: parseInt(string.substr(2,1) + string.substr(2,1), 16),
                g: parseInt(string.substr(3,1) + string.substr(3,1), 16),
                b: parseInt(string.substr(4,1) + string.substr(4,1), 16),
                a: parseInt(string.substr(1,1) + string.substr(1,1), 16)
            }
        },
        hex8: function(string) {
            return {
                r: parseInt(string.substr(3,2), 16),
                g: parseInt(string.substr(5,2), 16),
                b: parseInt(string.substr(7,2), 16),
                a:  parseInt(string.substr(1,2), 16)
            }
        },
        rgb: function(string) {
            var percents = string.match(/%/g);
            if (!percents || percents.length === 3) {
                var channels = string.substring(string.search(/\(/) + 1, string.length - 1).split(',');
                for (var i = 0; i < 3; i++) {
                    if (channels[i]) {
                        channels[i] = channels[i].trim();
                        var percent = channels[i].match(/[\.\d\-]+%/);
                        if (percent) {
                            var points = channels[i].match(/\./g);
                            channels[i] = channels[i].search(/[^\d\.\-%]/) === -1 && (!points || points.length < 2) ? parseFloat(percent[0]) : NaN;
                            if (channels[i] < 0) {
                                channels[i] = 0;
                            } else if (channels[i] > 100) {
                                channels[i] = 100;
                            }
                            channels[i] = Math.floor(channels[i] * 255  / 100);
                        } else {
                            channels[i] = channels[i] && (channels[i].match(/[^ \-0-9]/) === null) && channels[i].match(/[0-9]+/g).length === 1 ? parseInt(channels[i]) : NaN;
                            if (channels[i] < 0) {
                                channels[i] = 0;
                            } else if (channels[i] > 255) {
                                channels[i] = 255;
                            }
                        }
                    }
                }
            } else {
                channels = [];
            }
            return {
                r: channels[0],
                g: channels[1],
                b: channels[2],
                a: 255
            };
        },

        rgba: function(string) {
            var channels = formats.rgb(string);
            channels.a = undefined;

            var match = string.match(/[\-0-9\.]+/g);
            if (match && match[3]) {
                var points = match[3].match(/\./g);
                if (!points || points.length === 1) {
                    channels.a = parseFloat(match[3]);
                    if (channels.a < 0) {
                        channels.a = 0;
                    } else if (channels.a > 1) {
                        channels.a = 1;
                    }
                    channels.a *= 255;
                }
            }
            return channels;
        },
        name: function(string) {
            var color = new sGis.utils.Color('#' + sGis.utils.Color.names[string]);
            return color.channels;
        }
    };


    // Big List of Colors
// ------------------
// <http://www.w3.org/TR/css3-color/#svg-color>
   sGis.utils.Color.names = {
        aliceblue: "f0f8ff",
        antiquewhite: "faebd7",
        aqua: "0ff",
        aquamarine: "7fffd4",
        azure: "f0ffff",
        beige: "f5f5dc",
        bisque: "ffe4c4",
        black: "000",
        blanchedalmond: "ffebcd",
        blue: "00f",
        blueviolet: "8a2be2",
        brown: "a52a2a",
        burlywood: "deb887",
        burntsienna: "ea7e5d",
        cadetblue: "5f9ea0",
        chartreuse: "7fff00",
        chocolate: "d2691e",
        coral: "ff7f50",
        cornflowerblue: "6495ed",
        cornsilk: "fff8dc",
        crimson: "dc143c",
        cyan: "0ff",
        darkblue: "00008b",
        darkcyan: "008b8b",
        darkgoldenrod: "b8860b",
        darkgray: "a9a9a9",
        darkgreen: "006400",
        darkgrey: "a9a9a9",
        darkkhaki: "bdb76b",
        darkmagenta: "8b008b",
        darkolivegreen: "556b2f",
        darkorange: "ff8c00",
        darkorchid: "9932cc",
        darkred: "8b0000",
        darksalmon: "e9967a",
        darkseagreen: "8fbc8f",
        darkslateblue: "483d8b",
        darkslategray: "2f4f4f",
        darkslategrey: "2f4f4f",
        darkturquoise: "00ced1",
        darkviolet: "9400d3",
        deeppink: "ff1493",
        deepskyblue: "00bfff",
        dimgray: "696969",
        dimgrey: "696969",
        dodgerblue: "1e90ff",
        firebrick: "b22222",
        floralwhite: "fffaf0",
        forestgreen: "228b22",
        fuchsia: "f0f",
        gainsboro: "dcdcdc",
        ghostwhite: "f8f8ff",
        gold: "ffd700",
        goldenrod: "daa520",
        gray: "808080",
        green: "008000",
        greenyellow: "adff2f",
        grey: "808080",
        honeydew: "f0fff0",
        hotpink: "ff69b4",
        indianred: "cd5c5c",
        indigo: "4b0082",
        ivory: "fffff0",
        khaki: "f0e68c",
        lavender: "e6e6fa",
        lavenderblush: "fff0f5",
        lawngreen: "7cfc00",
        lemonchiffon: "fffacd",
        lightblue: "add8e6",
        lightcoral: "f08080",
        lightcyan: "e0ffff",
        lightgoldenrodyellow: "fafad2",
        lightgray: "d3d3d3",
        lightgreen: "90ee90",
        lightgrey: "d3d3d3",
        lightpink: "ffb6c1",
        lightsalmon: "ffa07a",
        lightseagreen: "20b2aa",
        lightskyblue: "87cefa",
        lightslategray: "789",
        lightslategrey: "789",
        lightsteelblue: "b0c4de",
        lightyellow: "ffffe0",
        lime: "0f0",
        limegreen: "32cd32",
        linen: "faf0e6",
        magenta: "f0f",
        maroon: "800000",
        mediumaquamarine: "66cdaa",
        mediumblue: "0000cd",
        mediumorchid: "ba55d3",
        mediumpurple: "9370db",
        mediumseagreen: "3cb371",
        mediumslateblue: "7b68ee",
        mediumspringgreen: "00fa9a",
        mediumturquoise: "48d1cc",
        mediumvioletred: "c71585",
        midnightblue: "191970",
        mintcream: "f5fffa",
        mistyrose: "ffe4e1",
        moccasin: "ffe4b5",
        navajowhite: "ffdead",
        navy: "000080",
        oldlace: "fdf5e6",
        olive: "808000",
        olivedrab: "6b8e23",
        orange: "ffa500",
        orangered: "ff4500",
        orchid: "da70d6",
        palegoldenrod: "eee8aa",
        palegreen: "98fb98",
        paleturquoise: "afeeee",
        palevioletred: "db7093",
        papayawhip: "ffefd5",
        peachpuff: "ffdab9",
        peru: "cd853f",
        pink: "ffc0cb",
        plum: "dda0dd",
        powderblue: "b0e0e6",
        purple: "800080",
        rebeccapurple: "663399",
        red: "f00",
        rosybrown: "bc8f8f",
        royalblue: "4169e1",
        saddlebrown: "8b4513",
        salmon: "fa8072",
        sandybrown: "f4a460",
        seagreen: "2e8b57",
        seashell: "fff5ee",
        sienna: "a0522d",
        silver: "c0c0c0",
        skyblue: "87ceeb",
        slateblue: "6a5acd",
        slategray: "708090",
        slategrey: "708090",
        snow: "fffafa",
        springgreen: "00ff7f",
        steelblue: "4682b4",
        tan: "d2b48c",
        teal: "008080",
        thistle: "d8bfd8",
        tomato: "ff6347",
        turquoise: "40e0d0",
        violet: "ee82ee",
        wheat: "f5deb3",
        white: "fff",
        whitesmoke: "f5f5f5",
        yellow: "ff0",
        yellowgreen: "9acd32",
        transparent: 'rgba(0,0,0,0)'
    };

})();'use strict';

(function() {

    sGis.spatialProcessor.MapServer = function(name, serverConnector, options) {
        this.__initialize(name, serverConnector, options);
    };

    sGis.spatialProcessor.MapServer.prototype = {
        _map: null,
        _opacity: 1,
        _display: true,
        _activeLayers: null,

        __initialize: function(name, serverConnector, options) {
            var self = this;

            if (!serverConnector.sessionId) {
                serverConnector.addListner('sessionInitialized.mapServer-' + name, function() {
                    serverConnector.removeListner('sessionInitialized.mapServer-' + name);
                    self.__initialize(name, serverConnector, options);
                });
                return;
            }

            this._name = name;
            this._url = serverConnector.url + name + '/';
            this._serviceInfo = {};
            this._legend = [];
            this._serverConnector = serverConnector;

            if (options) {
                for (var i in options) {
                    if (this[i] !== undefined && options[i] !== undefined) this[i] = options[i];
                }
            }

            this._xhr = utils.ajax({
                url: this._url + 'MapServer/PackedInfo?f=json&_sb=' + this._serverConnector.sessionId,
                cache: false,
                success: function(data, textStatus) {
                    delete self._xhr;
                    var parsedResponse = utils.parseJSON(data);

                    if (!parsedResponse.ServiceInfo) {
                        utils.message('Could not initialize service: server responded with error "' + (parsedResponse.error && parsedResponse.error.message || 'Unknown error') + '"');
                    } else {
                        self._serviceInfo = parsedResponse.ServiceInfo;
                        self._layerInfo = parsedResponse.LayersInfo;
                        if (self.isEverGis) {
                            self._clientLayerController = new sGis.spatialProcessor.controller.ClientLayer(self._serverConnector, { serviceName: self._name, map: self._map });
                            self._clientLayerController.addListner('initialize.sGis-mapServer', function() {
                                this.removeListner('.sGis-mapServer');
                                self._clientLayerController.mapServer.addListner('legendUpdate', function() {
                                    self.fire('legendUpdate');
                                });
                                self._initialized = true;
                                self.fire('initialize');
                            });
                        } else {
                            self.__createLayer();
                            self.__requestLegend();
                            self._serverConnector.addNotificationListner(self._serviceInfo.fullName, function() {
                                self._layer.forceUpdate();
                                if (self._map) self._map.redrawLayer(self._layer);
                            });
                            self._initialized = true;
                            self.fire('initialize');
                        }
                    }
                }
            });
        },

        __createLayer: function() {
            var properties = {opacity: this._opacity, isDisplayed: this._display, layers: this._activeLayers || undefined};
            if (this._serviceInfo.spatialReference.wkt || this._serviceInfo.spatialReference.wkid) {
                if (this._serviceInfo.spatialReference.wkid === 102100 || this._serviceInfo.spatialReference.wkid === 102113) {
                    properties.crs = sGis.CRS.webMercator;
                } else if (this._map && this._map.crs.description === this._serviceInfo.spatialReference) {
                    properties.crs = this._map.crs;
                } else {
                    properties.crs = new sGis.Crs({description: this._serviceInfo.spatialReference});
                }
            }

            if (/\btile\b/.exec(this._serviceInfo.capabilities)) {
                if (this._map && this._map.layers.length === 0 && this._map.width && properties.crs.description) {
                    var position = new sGis.Point((this._serviceInfo.initialExtent.xmax + this._serviceInfo.initialExtent.xmin) / 2, (this._serviceInfo.initialExtent.ymax + this._serviceInfo.initialExtent.ymin) / 2, properties.crs),
                        resolution = (this._serviceInfo.initialExtent.xmax - this._serviceInfo.initialExtent.xmin) / this._map.width * 2;

                    this._map.position = position;
                    this._map.resolution = resolution || 10;
                }

                if (this._serviceInfo.tileInfo) {
                    properties.tileScheme = getTileScheme(this._serviceInfo);
                    if (!properties.crs.from) properties.cycleX = false;
                }

                this._layer = new sGis.TileLayer(this.url + 'MapServer/tile/{z}/{y}/{x}?_sb=' + this._serverConnector.sessionId, properties);
            } else {
                if (this._serverConnector.sessionId) {
                    properties.additionalParameters = '_sb=' + this._serverConnector.sessionId;
                } else {
                    var self = this;
                    this._serverConnector.addListner('sessionInitialized.mapServer-' + this._name, function() {
                        self._serverConnector.removeListner('sessionInitialized.mapServer-' + self._name);
                        self._layer.additionalParameters = '_sb=' + self._serverConnector.sessionId;
                    });
                }
                this._layer = new sGis.ESRIDynamicLayer(this.url + 'MapServer/', properties);
            }

            this._layer.mapServer = this;
            if (this._map) {
                this._map.addLayer(this._layer);
            }
        },

        __requestLegend: function() {
            var self = this;
            if (/\blegend\b/.exec(this._serviceInfo.capabilities)) {
                this._xhr = utils.ajax({
                    url: this._url + 'MapServer/legend?f=json&_sb=' + this._serverConnector.sessionId,
                    cache: false,
                    success: function(data, textStatus) {
                        self._legend = JSON.parse(data).layers;
                        self.fire('legendUpdate');
                        delete self._xhr;
                    }
                });
            }
        },

        hideObjects: function(ids) {
            utils.ajax({
                url: this._url + 'MapServer/display/?_sb=' + this._serverConnector.sessionId,
                type: 'POST',
                data: 'action=hide&data=' + encodeURIComponent(JSON.stringify(ids)) + '&ts=' + new Date().getTime()
            });
        },

        kill: function() {
            if (this._xhr) this._xhr.abort();
            this.map = null;
            if (this._serviceInfo) {
                this._serverConnector.removeNotificationListner(this._serviceInfo.fullName);
            }
        }
    };

    function getTileScheme(serviceInfo) {
        var scheme = {
            tileWidth: serviceInfo.tileInfo.rows,
            tileHeight: serviceInfo.tileInfo.cols,
            dpi: serviceInfo.tileInfo.dpi,
            origin: {
                x: serviceInfo.tileInfo.origin.x,
                y: serviceInfo.tileInfo.origin.y
            },
            matrix: {}
        };

        for (var i = 0, len = serviceInfo.tileInfo.lods.length; i < len; i++) {
            scheme.matrix[serviceInfo.tileInfo.lods[i].level] = {
                resolution: serviceInfo.tileInfo.lods[i].resolution,
                scale: serviceInfo.tileInfo.lods[i].scale
            };
        }

        return scheme;
    }

    Object.defineProperties(sGis.spatialProcessor.MapServer.prototype, {
        url: {
            get: function() {
                return this._url;
            }
        },

        map: {
            get: function() {
                return this._map;
            },

            set: function(map) {
                if (!(map instanceof sGis.Map) && map !== null) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
                if (this._layer) {
                    if (map === null || this._map && this._map !== map) this._map.removeLayer(this._layer);
                    if (map !== null) map.addLayer(this._layer);
                }
                this._map = map;
            }
        },

        serverConnector: {
            get: function() {
                return this._serverConnector;
            },

            set: function(serverConnector) {
                if (!(serverConnector instanceof sGis.spatialProcessor.Connector)) utils.error('sGis.spatialProcessor.Connector instance is expected but got ' + serverConnector + ' instead');
                this._serverConnector = serverConnector;
            }
        },

        opacity: {
            get: function() {
                return this._opacity;
            },

            set: function(opacity) {
                if (!utils.isNumber(opacity)) utils.error('Number is expected but got ' + opacity + ' instead');
                if (this._layer) this._layer.opacity = opacity;
                this._opacity = opacity;
            }
        },

        serviceInfo: {
            get: function() {
                return this._serviceInfo;
            }
        },

        layerInfo: {
            get: function() {
                return this._layerInfo;
            }
        },

        name: {
            get: function() {
                return this._serviceInfo && this._serviceInfo.mapName || this._name;
            }
        },

        fullName: {
            get: function() {
                return this._serviceInfo && this._serviceInfo.fullName;
            }
        },

        layer: {
            get: function() {
                return this._layer ? this._layer : null;
            }
        },

        legend: {
            get: function() {
                return this._legend;
            }
        },

        display: {
            get: function() {
                return this._display;
            },

            set: function(bool) {
                if (bool === true) {
                    if (this._layer) {
                        this._layer.show();
                        if (this._map) this._map.redrawLayer(this._layer);
                    }
                    this._display = true;
                } else if (bool === false) {
                    if (this._layer) {
                        this._layer.hide();
                        if (this._map) this._map.redrawLayer(this._layer);
                    }
                    this._display = false;
                } else {
                    utils.error('Boolean is expected but got ' + bool + ' instead');
                }
            }
        },

        activeLayers: {
            get: function() {
                return [].concat(this._activeLayers);
            },

            set: function(layerIdList) {
                this._activeLayers = layerIdList;
                if (this._layer && this._layer instanceof sGis.DynamicLayer) {
                    this._layer.showLayers(layerIdList);
                    this.fire('layerVisibilityChange');
                    this._layer.forceUpdate();
                    if (this._map) this._map.redrawLayer(this._layer);
                }
            }
        },

        initialized: {
            get: function() {
                return this._initialized || false;
            }
        },

        isEverGis: {
            get: function() {
                if (!this._layerInfo) {
                    return null;
                } else if (this._layerInfo.length === 1 && this._serviceInfo.capabilities.indexOf('tile') === -1 && this._layerInfo[0].LayerInfo.geometryType === 'unknown' && this._url.indexOf('VisualObjectsRendering') === -1) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        clientLayerController: {
            get: function() {
                return this._clientLayerController;
            }
        }
    });

    utils.mixin(sGis.spatialProcessor.MapServer.prototype, sGis.IEventHandler.prototype);

})();'use strict';

(function() {

    var instructionLimit = 10000000;

    sGis.spatialProcessor.DataTree = function(id, spatialProcessor, options) {
        this._url = spatialProcessor.url + 'DataTree/' + id + '/';
        this._spatialProcessor = spatialProcessor;
        if (options) this._wrapper = options.wrapper;

        this.__initialize();
    };

    sGis.spatialProcessor.DataTree.prototype = {
        __initialize: function() {
            this._instructions = {};
            this._childrenList = {};
            this._state = 'initializing';
            this._lastInstruction = 0;

            this.__requestInstructions();
        },

        __requestInstructions: function() {
            var self = this;
            utils.ajax({
                url: this._url + '?_sb=' + this._spatialProcessor.sessionId + '&ts=' + new Date().getTime(),
                cache: false,
                success: function(data) {
                    try {
                        var instructionList = JSON.parse(data);
                    } catch(e) {

                    } finally {
                        if (utils.isArray(instructionList) && instructionList.length > 0) {
                            self._state = 'loading';
                            self.__setInstructions(instructionList);
                            if (!self._currentInstruction) self._currentInstruction = instructionList[0].SequenceId;
                            self.__performInstructions();
                        } else {
                            self._state = 'error';
                            self._root = null;
                            self.fire('error');
                        }
                    }
                }
            });
        },

        __setInstructions: function(instructionList) {
            for (var i in instructionList) {
                this._instructions[instructionList[i].SequenceId] = instructionList[i];
                if (instructionList[i].type === 2) {
                    this._loadingComplete = true;
                    this._state = 'complete';
                    if (this._lastInstruction === 0 && instructionList.length === 1) this.__completeTree(0);
                } else if (instructionList[i].SequenceId > this._lastInstruction) {
                    this._lastInstruction = instructionList[i].SequenceId;
                }
            }
        },

        __performInstructions: function() {
            while(true) {
                if (this._instructions[this._currentInstruction]) {
                    this.__performInstruction(this._currentInstruction);
                    this._currentInstruction++;
                } else if (!this._loadingComplete) {
                    this.__requestInstructions();
                    break;
                } else {
                    if (this._currentInstruction > this._lastInstruction) {
                        this.__completeTree();
                        return;
                    } else {
                        this._currentInstruction++;
                    }
                }

                if (this._currentInstruction > instructionLimit && this._state !== 'complete') utils.error('Number of instruction exceeded the limit');
            }
        },

        __performInstruction: function(n) {
            var instruction = this._instructions[n];
            if (instruction.type === 0) {
                var row = getRow(instruction);
                if (instruction.pid.Id === -1) {
                    this._root = row;
                } else {
                    addChild(this._childrenList[row.parentId], row);
                }
                this._childrenList[row.id] = row;
            } else if (instruction.type === 1) {
                var row = this._childrenList[instruction.id.Id];

                if (row) {
                    if (instruction.data) row.data = instruction.data;
                    if (instruction.dataType) row.dataType = instruction.dataType;
                    if (instruction.status) row.status = instruction.status;
                }
            } else if (instruction.type === 2) {

            }
        },

        __completeTree: function() {
            this._state = 'complete';
            if (this._wrapper) {
                this.__setDisplayedTree();
            }

            this.fire('ready');
        },

        __setDisplayedTree: function() {
//        var nodes = getDynatreeRow(this.root, this),
//            self = this;
//        $(function() {
//            $('#' + self._wrapper).dynatree({
//                children: nodes.children,
//                debugLevel: 0,
//                idPrefix: self._wrapper + '-',
//                clickFolderMode: 1,
//                onClick: function(node, event) {
//                    if (node.getEventTargetType(event) === 'title') {
//                        if (self._onClick) self._onClick(node.data.treeRow);
//                    }
//                }
//            });
//        });
        }
    };

    Object.defineProperties(sGis.spatialProcessor.DataTree.prototype, {
        id: {
            get: function() {
                return /DataTree\/(.*)\//.exec(this._url)[1];
            }
        },

        state: {
            get: function() {
                return this._state;
            }
        },

        root: {
            get: function() {
                return this._root;
            }
        },

        onClick: {
            get: function() {
                return this._onClick;
            },

            set: function(callback) {
                this._onClick = callback;
            }
        },

        rows: {
            get: function() {
                return this._childrenList;
            }
        },

        wrapper: {
            get: function() {
                return this._wrapper;
            },

            set: function(wrapperId) {
                var $wrapper = $('#' + wrapperId);
                if ($wrapper.length === 0) utils.error('DOM element with id ' + wrapperId + ' could not be found');
                if (this._wrapper) {
                    $wrapper.html('');
                }
                this._wrapper = wrapperId;
                this.__setDisplayedTree();
            }
        }
    });

    utils.mixin(sGis.spatialProcessor.DataTree.prototype, sGis.IEventHandler.prototype);

    function getDynatreeRow(row, tree) {
        var displayedRow = {title: getRowTitle(row, tree), treeRow: row};
        if (row.children.length > 0) {
            displayedRow.isFolder = true;
            displayedRow.children = [];
            displayedRow.expand = true;
            for (var i in row.children) {
                displayedRow.children.push(getDynatreeRow(row.children[i], tree));
            }
        }
        return displayedRow;
    }

    function getRowTitle(row, tree) {
        if (row.dataType === 'System.String') return row.data;
        if (row.dataType === 'ServiceGroup') {
            var mapItem = tree._spatialProcessor.getMapItemById(row.data.Id);
            return mapItem ? mapItem.name : row.id;
        }
        if (row.dataType === 'LeafNode') return row.data.Header;
    }

    function addChild(parent, child) {
        var index = 0;
        for (var i in parent.children) {
            if (parent.children[i].id ===  child.previousId) {
                index = i + 1;
                break;
            }
        }
        parent.children.splice(index, 0, child);
    }

    function getRow(instruction) {
        return {id: instruction.id.Id, parentId: instruction.pid.Id, previousId: instruction.prid.Id, dataType: instruction.dataType, data: instruction.data, status: instruction.status, children: []};
    }


})();'use strict';

(function() {

    sGis.spatialProcessor.parseXML = function(xml) {
        var parser = new DOMParser(),
            nodes = parser.parseFromString(xml, 'text/xml'),
            parsed = {};

        serialize(nodes, parsed);

        return parsed;
    };

    function serialize(nodes, parsed, reference) {
        for (var i in nodes.childNodes) {
            var tagName = nodes.childNodes[i].tagName;
            if (serializer[tagName]) {
//            try {
                serializer[tagName](nodes.childNodes[i], parsed, reference);
//            } catch (e) {
//                debugger;
//            }
            }
        }
    }

    var serializer = {
        State: function(node, parsed) {
            var names = {
                Id: 'id',
                Name: 'name',
                Status: 'status'
            };

            parsed.operation = {};
            for (var i in node.attributes) {
                var att = node.attributes[i];
                if (typeof att === 'object') parsed.operation[names[att.name]] = att.nodeValue;
            }

            serialize(node, parsed);
        },

        Content: function(node, parsed) {
            var attributes = getNodeAttributes(node);
            if (attributes.ContentType === 'Visuals') {
                serialize(node, parsed);
            } else if (attributes.ContentType === 'JSON') {
                parsed.content = utils.parseXmlJsonNode(node);
            }
        },

        Data: function(node, parsed) {
            serialize(node, parsed);
        },

        SerializerSettings: function(node, parsed) {
            var attributes = getNodeAttributes(node);

            if (attributes.Type === 'Geometric' && attributes.GeometryVersion === '2') {
                parsed.geometryType = 'json';
            }
        },

        Resources: function(node, parsed) {
            serialize(node, parsed);
        },

        AttributesDefinition: function(node, parsed) {
            var attributesDefinition = {},
                names = {
                    Name: 'name',
                    Alias: 'alias',
                    Type: 'type',
                    Size: 'size'
                };

            for (var i in node.childNodes) {
                var attributeInfo = node.childNodes[i];
                if (!attributeInfo.attributes) continue;

                var fields = {};

                for (var j in attributeInfo.attributes) {
                    var att = attributeInfo.attributes[j];
                    if (typeof att === 'object') fields[names[att.name]] = att.nodeValue;
                }
                attributesDefinition[fields.name] = fields;

                if (attributeInfo.childNodes.length > 0 && attributeInfo.childNodes[0].nodeName === 'Domain') {
                    attributesDefinition[fields.name].domain = getDomainDescription(attributeInfo);
                }
            }

            for (var i in node.attributes) {
                if (node.attributes[i].name === 'Key') {
                    var key = node.attributes[i].nodeValue;
                }
            }

            if (!key) debugger;

            if (!parsed.attributesDefinitions) parsed.attributesDefinitions = {};

            parsed.attributesDefinitions[key] = attributesDefinition;
        },

        SolidBrush: function(node, parsed) {
            if (!parsed.brush) parsed.brush = {};

            var attributes = getNodeAttributes(node);
            parsed.brush[attributes.Key] = {color: attributes.Color};
        },

        ByteArray: function(node, parsed) {
            if (!parsed.image) parsed.image = {};
            var attributes = getNodeAttributes(node);
            parsed.image[attributes.Key] = {dataUrl: 'data:image/png;base64,' + node.childNodes[0].nodeValue};
        },

        HatchBrush: function(node, parsed) {
            if (!parsed.brush) parsed.brush = {};
            var attributes = getNodeAttributes(node),
                brushString = atob(node.childNodes[0].nodeValue),
                brushArray = [];

            for (var i = 0, l = brushString.length; i < l; i++) {
                brushArray[i] = brushString.charCodeAt(i);
            }

            var width = brushArray[0] + (brushArray[1] * 2 << 7) + (brushArray[2] * 2 << 15) + (brushArray[3] * 2 << 23),
                height = brushArray[4] + (brushArray[5] * 2 << 7) + (brushArray[6] * 2 << 15) + (brushArray[7] * 2 << 23),
                brush = [];

            for (var i = 0; i < height; i++) {
                brush[i] = brushArray.slice(8 + i * width, 8 + (i + 1) * width);
            }

            parsed.brush[attributes.Key] = {
                background: attributes.Background,
                foreground: attributes.Foreground,
                brush: brush
            };
        },

        SimplePolygonSymbol: function(node, parsed) {
            if (!parsed.symbol) parsed.symbol = {};

            var attributes = getNodeAttributes(node);
            parsed.symbol[attributes.Key] = {
                strokeThickness: attributes.StrokeThickness,
                opacity: attributes.Opacity,
                fill: parsed.brush[attributes.Fill] ? parsed.brush[attributes.Fill].color || parsed.brush[attributes.Fill] : undefined,
                stroke: parsed.brush[attributes.Stroke] ? parsed.brush[attributes.Stroke].color || 'FF000000' : undefined
            };
        },

        SimplePolylineSymbol: function(node, parsed) {
            if (!parsed.symbol) parsed.symbol = {};

            var attributes = getNodeAttributes(node);
            parsed.symbol[attributes.Key] = {
                strokeThickness: attributes.StrokeThickness,
                opacity: attributes.Opacity,
                stroke: parsed.brush[attributes.Stroke].color
            };
        },

        SimplePointSymbol: function(node, parsed) {
            if (!parsed.symbol) parsed.symbol = {};

            var attributes = getNodeAttributes(node);
            parsed.symbol[attributes.Key] = {
                size: attributes.Size === '0' ? 10 : attributes.Size,
                strokeThickness: attributes.StrokeThickness,
                fill: parsed.brush[attributes.Fill].color,
                stroke: parsed.brush[attributes.Stroke].color,
                shape: attributes.Shape
            };
        },

        ImagePointSymbol: function(node, parsed) {
            if (!parsed.symbol) parsed.symbol = {};

            var attributes = getNodeAttributes(node);
            parsed.symbol[attributes.Key] = {
                size: attributes.Size === '0' ? 10 : attributes.Size,
                color: attributes.Color,
                anchorPoint: {x: attributes.AnchorPointX, y: attributes.AnchorPointY},
                imageSrc: parsed.image[attributes.Pixels].dataUrl
            };
        },

        VisualObjects: function(node, parsed) {
            if (!parsed.objects) {
                parsed.objects = {};
                parsed.orderedIds = [];
            }
            serialize(node, parsed);
        },

        Geometric: function(node, parsed) {
            var nodeAttributes = getNodeAttributes(node);
            parsed.objects[nodeAttributes.Id] = {
                generatorId: nodeAttributes.GeneratorId,
                visualDefinitionId: nodeAttributes.VisualDefinitionId,
                visualDefinition: parsed.symbol && parsed.symbol[nodeAttributes.VisualDefinition] ? parsed.symbol[nodeAttributes.VisualDefinition] : null,
                attributesDefinition: nodeAttributes.AttributesDefinition
            };

            parsed.orderedIds.push(nodeAttributes.Id);

            serialize(node, parsed, parsed.objects[nodeAttributes.Id]);
        },

        Attributes: function(node, parsed, parentObject) {
            serialize(node, parsed, parentObject);
        },

        Attribute: function(node, parsed, parentObject) {
            var nodeAttributes = getNodeAttributes(node);
            if (!parentObject.attributes) parentObject.attributes = {};

            if (!parsed.attributesDefinitions[parentObject.attributesDefinition]) debugger;

            var attributeDefinition = parsed.attributesDefinitions[parentObject.attributesDefinition];

            parentObject.attributes[nodeAttributes.Name] = {
                title: attributeDefinition[nodeAttributes.Name].alias,
                value: nodeAttributes.Value,
                type: attributeDefinition[nodeAttributes.Name].type,
                size: attributeDefinition[nodeAttributes.Name].size,
                domain: attributeDefinition[nodeAttributes.Name].domain
            };
        },

        Geometry: function(node, parsed, parentObject) {
            if (parsed.geometryType === 'json') {
                var attributes = getNodeAttributes(node),
                    jsonData = utils.parseXmlJsonNode(node),
                    coordinates = jsonData.type === 'point' ? [jsonData.x, jsonData.y] : jsonData.v;
                parentObject.geometry = {type: attributes.Type, data: {type: jsonData.type, crs: jsonData.sr, coordinates: coordinates}};
            }
        },

        VisualDefinitions: function(node, parsed) {
            if (!parsed.visualDefinitions) parsed.visualDefinitions = {};
            serialize(node, parsed);
        },

        VisualDefinition: function(node, parsed) {
            var attributes = getNodeAttributes(node);
            parsed.visualDefinitions[attributes.Key] = attributes.Id;
        }
    };

    function getNodeAttributes(node) {
        var keys = Object.keys(node.attributes),
            attributes = {};
        for (var i in keys) {
            if (typeof node.attributes[keys[i]] === 'object') attributes[node.attributes[keys[i]].name] = node.attributes[keys[i]].nodeValue;
        }
        return attributes;
    }

    function getDomainDescription(node) {
        var domainNode = node.childNodes[0];
        var attributes = getNodeAttributes(domainNode);

        var desc = {
            name: attributes.Name,
            type: attributes.Type,
            options: []
        };
        for (var i = 0; i < domainNode.childNodes.length; i++) {
            var option = getNodeAttributes(domainNode.childNodes[i]);
            desc.options.push({
                name: option.Name,
                type: option.Type,
                code: option.Code
            });
        }

        return desc;
    }

    /*
     * SERIALIZER
     */

    sGis.spatialProcessor.serializeGeometry = function(features) {
        var formatedData = getFormatedData(features);
        return getXML(formatedData);
    };

    sGis.spatialProcessor.serializeGeometryEdit = function(editDescription, attributesOnly) {
        var featureList = [];
        for (var i in editDescription) {
            if (utils.isArray(editDescription[i])) featureList = featureList.concat(editDescription[i]);
        }

        var formatedData = getFormatedData(featureList, attributesOnly);
        return getXML(formatedData, editDescription, attributesOnly);
    };

    sGis.spatialProcessor.serializeSymbols = function(symbols) {
        var features = [];
        for (var i = 0, len = symbols.length; i < len; i++) {
            features.push(new featureClasses[symbols[i].type]([], { symbol: symbols[i] }));
        }

        var formatedData = getFormatedData(features);
        var xml = getNewXMLDocument(),
            dataNode = xml.getElementsByTagName('Data')[0];

        dataNode.appendChild(getSerializerGeometricSettingsNode(xml));
        dataNode.appendChild(getResourcesNode(formatedData, xml));
        dataNode.appendChild(getVisualDefinitionsNode(formatedData, xml));

        var text = new XMLSerializer().serializeToString(xml);
        return text;
    };

    sGis.spatialProcessor.serializeAttributes = function(attributes) {
        var data = {
            resources: {
                attributesDefinitions: {},
                lastKey: -1
            },
            visualObjects: []
        };

        for (var i in attributes) {
            if (attributes.hasOwnProperty(i)) {
                var attributesIndex = getAttributesDefinitionIndex(attributes[i], data.resources);
                data.visualObjects[i] = {attributesIndex: attributesIndex, feature: {id: i, attributes: attributes[i]}};
            }
        }

        return getXML(data);
    };

    var featureClasses = {
        point: sGis.feature.Point,
        polyline: sGis.feature.Polyline,
        polygon: sGis.feature.Polygon
    };

    function getXML(data, editDescription, attributesOnly) {
        var xml = getNewXMLDocument(),
            dataNode = xml.getElementsByTagName('Data')[0];

        dataNode.appendChild(getSerializerGeometricSettingsNode(xml));
        dataNode.appendChild(getSerializerCalloutSettingsNode(xml));
        dataNode.appendChild(getResourcesNode(data, xml, attributesOnly));
        dataNode.appendChild(getVisualObjectsNode(data, xml, attributesOnly));
        if (editDescription) dataNode.appendChild(getEditCommandsNode(editDescription, xml, attributesOnly));

        var text = new XMLSerializer().serializeToString(xml);
        return text;
    }

    function getNewXMLDocument() {
        var parser = new DOMParser();

        return parser.parseFromString('<Data />', 'text/xml');
    }

    function getEditCommandsNode(editDescription, xml, attributesOnly) {
        var node = xml.createElement('EditCommands');
        if (utils.isArray(editDescription.added)) {
            for (var i in editDescription.added) {
                node.appendChild(getAddObjectNode(editDescription.added[i], xml));
            }
        }
        if (utils.isArray(editDescription.updated)) {
            for (var i in editDescription.updated) {
                node.appendChild(getUpdateObjectNode(editDescription.updated[i], xml, attributesOnly));
            }
        }
        if (utils.isArray(editDescription.deleted)) {
            for (var i in editDescription.deleted) {
                node.appendChild(getDeleteObjectNode(editDescription.deleted[i], xml));
            }
        }
        return node;
    }

    function getAddObjectNode(feature, xml) {
        var node = xml.createElement('AddObject');
        setNodeAttributes(node, {
            Id: feature.id
        });
        return node;
    }

    function getUpdateObjectNode(feature, xml, attributesOnly) {
        var node = xml.createElement('UpdateObject');
        setNodeAttributes(node, {
            Id: feature.id,
            OnlyAttributes: attributesOnly || "False"
        });
        return node;
    }

    function getDeleteObjectNode(feature, xml) {
        var node = xml.createElement('DeleteObject');
        setNodeAttributes(node, {
            Id: feature.id
        });
        return node;
    }

    function getSerializerGeometricSettingsNode(xml) {
        var node = xml.createElement('SerializerSettings');
        setNodeAttributes(node, {
            Type: 'Geometric',
            //Version: '0',
            GeometryVersion: '2'
        });

        return node;
    }

    function getSerializerCalloutSettingsNode(xml) {
        var node = xml.createElement('SerializerSettings');
        setNodeAttributes(node, {
            Type: 'Callout',
            Version: '0',
            GeometryVersion: '2'
        });

        return node;
    }

    function getResourcesNode(data, xml, attributesOnly) {
        var node = xml.createElement('Resources');
        for (var i in data.resources.attributesDefinitions) {
            node.appendChild(getAttributesDefinitionNode(data.resources.attributesDefinitions[i], i, xml));
        }

        if (!attributesOnly) {
            for (var i in data.resources.brushes) {
                node.appendChild(getBrushNode(data.resources.brushes[i], i, xml));
            }

            for (var i in data.resources.images) {
                node.appendChild(getByteArrayNode(data.resources.images[i], i, xml));
            }

            for (var i in data.resources.symbols) {
                node.appendChild(getSymbolNode(data.resources.symbols[i], i, xml));
            }
        }

        return node;
    }

    function getAttributesDefinitionNode(attributeDefinition, key, xml) {
        var node = xml.createElement('AttributesDefinition');

        for (var i in attributeDefinition) {
            if (attributeDefinition[i].type === 'Strategis.Server.SpatialProcessor.Core.ObjectId') {
                var identity = i;
            }
        }

        var attributes = {Key: key, Display: 'Name'};
        if (identity) attributes.Identity = identity;

        setNodeAttributes(node, attributes);

        for (var i in attributeDefinition) {
            node.appendChild(getAttributeInfoNode(attributeDefinition[i], i, xml));
        }

        return node;
    }

    function getAttributeInfoNode(attribute, name, xml) {
        var node = xml.createElement('AttributeInfo');
        setNodeAttributes(node, {
            Name: name,
            Alias: attribute.title,
            Type: attribute.type,
            Size: attribute.size
        });

        if (attribute.domain) {
            node.appendChild(getDomainNode(attribute.domain, xml));
        }

        return node;
    }

    function getDomainNode(domain, xml) {
        var node = xml.createElement('Domain');
        setNodeAttributes(node, {
            Name: domain.name,
            Type: domain.type
        });

        for (var i = 0; i < domain.options.length; i++) {
            node.appendChild(getDomainValueNode(domain.options[i], xml));
        }

        return node;
    }

    function getDomainValueNode(option, xml) {
        var node = xml.createElement('DomainValue');
        setNodeAttributes(node, {
            Name: option.name,
            Type: option.type,
            Code: option.code
        });

        return node;
    }

    function getBrushNode(brush, key, xml) {
        if (brush instanceof Object) {
            return getHatchBrushNode(brush, key, xml);
        } else {
            return getSolidBrushNode(brush, key, xml);
        }
    }

    function getHatchBrushNode(brush, key, xml) {
        var node = xml.createElement('HatchBrush');
        setNodeAttributes(node, {
            Key: key,
            Background: colorToHex(brush.background),
            Foreground: colorToHex(brush.foreground)
        });

        var value = xml.createTextNode(brush.brushString);
        node.appendChild(value);

        return node;
    }

    function getSolidBrushNode(brush, key, xml) {
        var node = xml.createElement('SolidBrush');
        setNodeAttributes(node, {
            Key: key,
            Color: colorToHex(brush)
        });

        return node;
    }

    function getByteArrayNode(image, key, xml) {
        var node = xml.createElement('ByteArray'),
            text = image.match(/data.*,(.*)/)[1],
            textNode = xml.createTextNode(text);
        setNodeAttributes(node, {
            Key: key
        });
        node.appendChild(textNode);
        return node;
    }

    function getSymbolNode(symbol, key, xml) {
        var node = xml.createElement(symbol.type),
            attributes = {
                Key: key,
                StrokeThickness: symbol.StrokeThickness,
                Opacity: symbol.Opacity,
                Fill: symbol.Fill,
                Stroke: symbol.Stroke,
                AnchorPointX: symbol.AnchorPointX,
                AnchorPointY: symbol.AnchorPointY,
                Pixels: symbol.Pixels,
                Color: symbol.Color,
                Size: symbol.Size,
                Shape: symbol.Shape
            };

        setNodeAttributes(node, attributes);

        return node;
    }

    function getVisualDefinitionsNode(data, xml) {
        var node = xml.createElement('VisualDefinitions');
        for (var i in data.resources.symbols) {
            node.appendChild(getVisualDefinitionNode(i, xml));
        }

        return node;
    }

    function getVisualDefinitionNode(key, xml) {
        var node = xml.createElement('VisualDefinition');
        setNodeAttributes(node, {
            Key: key,
            Id: utils.getGuid()
        });

        return node;
    }

    function getVisualObjectsNode(data, xml, attributesOnly) {
        var node = xml.createElement('VisualObjects');
        for (var i in data.visualObjects) {
            if (data.visualObjects.hasOwnProperty(i)) {
                node.appendChild(getGeometricNode(data.visualObjects[i], xml, attributesOnly));
            }
        }

        return node;
    }

    function getGeometricNode(visualObject, xml, attributesOnly) {
        var node = xml.createElement('Geometric');

        var nodeAttributes = {
            Id: visualObject.feature.id,
            AttributesDefinition: visualObject.attributesIndex
        };

        if (!attributesOnly) {
            nodeAttributes.VisualDefinition = visualObject.symbolIndex;
            nodeAttributes.VisualDefinitionId = visualObject.feature.visualDefinitionId ? visualObject.feature.visualDefinitionId : visualObject.feature.visualDefinitionId === undefined ? undefined : '00000000-0000-0000-0000-000000000000';
            nodeAttributes.GeneratorId = visualObject.feature.generatorId ? visualObject.feature.generatorId : visualObject.feature.generatorId === undefined ? undefined : '00000000-0000-0000-0000-000000000000';
        }

        setNodeAttributes(node, nodeAttributes);
        node.appendChild(getAttributesNode(visualObject, xml));
        if (!attributesOnly) {
            node.appendChild(getGeometryNode(visualObject.feature, xml));
        }

        return node;
    }

    function getGeometryNode(feature, xml) {
        var node = xml.createElement('Geometry');
        setNodeAttributes(node, {Type: geometryTypes[feature.type]});

        var geometryJSON = {
            type: feature.type,
            sr: feature.crs.getWkidString()
        };

        if (feature instanceof sGis.feature.Point) {
            geometryJSON.x = feature.x;
            geometryJSON.y = feature.y;
        } else {
            geometryJSON.v = feature.coordinates;
        }

        var text = JSON.stringify(geometryJSON),
            textNode = xml.createTextNode(text);
        node.appendChild(textNode);
        return node;
    }

    var geometryTypes = {
        point: 'Point',
        polyline: 'Line',
        polygon: 'Poly'
    };

    function getAttributesNode(visualObject, xml) {
        var node = xml.createElement('Attributes');
        for (var i in visualObject.feature.attributes) {
            node.appendChild(getAttributeNode(visualObject.feature.attributes[i], i, xml));
        }

        return node;
    }

    function getAttributeNode(attribute, name, xml) {
        var node = xml.createElement('Attribute'),
            attributes = {Name: name};

        if (attribute.value !== undefined) attributes.Value = attribute.value;


        setNodeAttributes(node, attributes);

        return node;
    }

    function setNodeAttributes(node, attributes) {
        for (var i in attributes) {
            if (attributes[i] !== "" && attributes[i] !== undefined) node.setAttribute(i, attributes[i]);
        }
    }

    function getFormatedData(features, attributesOnly) {
        var data = {
            resources: {
                attributesDefinitions: {},
                brushes: {},
                images: {},
                symbols: {},
                lastKey: -1
            },
            visualObjects: []
        };
        for (var i in features) {
            var feature = features[i];
            var attributesIndex = getAttributesDefinitionIndex(feature.attributes, data.resources);

            if (!attributesOnly && features[i].symbol) {
                var symbolIndex = getSymbolIndex(feature, data.resources);
            }

            data.visualObjects[i] = {
                feature: feature,
                attributesIndex: attributesIndex,
                symbolIndex: symbolIndex
            };
        }

        return data;
    }

    function getSymbolIndex(feature, resources) {
        var newSymbol;

        if (feature.type === 'point') {
            if ((feature.symbol instanceof sGis.symbol.point.Image)) {
                newSymbol = {
                    Pixels: getImageIndex(feature.style.source, resources),
                    AnchorPointX: feature.style.anchorPoint.x,
                    AnchorPointY: feature.style.anchorPoint.y,
                    Size: feature.style.size,
                    Color: '#7f64c800',
                    MaskPixels: '-1',
                    type: 'ImagePointSymbol'
                };
            } else if (feature.symbol instanceof sGis.symbol.point.Point) {
                newSymbol = {
                    Opacity: 1,
                    Size: feature.style.size,
                    Fill: getBrushIndex(feature.style.color, resources),
                    Stroke: getBrushIndex(feature.style.strokeColor, resources),
                    StrokeThickness: feature.style.strokeWidth,
                    Shape: 'Circle',
                    type: symbolTypes[feature.type]
                };
            } else {
                newSymbol = {
                    Opacity: 1,
                    Size: feature.style.size,
                    Fill: getBrushIndex(feature.style.fillColor, resources),
                    Stroke: getBrushIndex(feature.style.strokeColor, resources),
                    StrokeThickness: feature.style.strokeWidth,
                    Shpae: 'Square',
                    type: symbolTypes[feature.type]
                };
            }
        } else if (feature.symbol instanceof sGis.symbol.polygon.BrushFill) {
            newSymbol = {
                StrokeThickness: feature.style.strokeWidth,
                Opacity: 1,
                Fill: getHatchBrushIndex(feature.style, resources),
                Stroke: getBrushIndex(feature.style.strokeColor, resources),
                type: symbolTypes[feature.type]
            };
        } else {
            newSymbol = {
                StrokeThickness: feature.style.strokeWidth ? feature.style.strokeWidth : 1,
                Opacity: 1,
                Fill: getBrushIndex(feature.style.fillColor ? feature.style.fillColor : feature.strokeColor, resources),
                Stroke: getBrushIndex(feature.style.strokeColor, resources),
                type: symbolTypes[feature.type]
            };
        }

        for (var i in resources.symbols) {
            var symbol = resources.symbols[i],
                same = true;

            for (var j in symbol) {
                if (symbol[j] !== newSymbol[j]) same = false;
            }
            if (same) return i;
        }

        resources.lastKey++;
        resources.symbols[resources.lastKey] = newSymbol;
        return resources.lastKey;
    }

    function getHatchBrushIndex(style, resources) {
        var brushString = getBrushString(style.fillBrush);

        for (var i in resources.brushes) {
            if (resources.brushes[i] instanceof Object && resources.brushes[i].brushString === brushString && resources.brushes[i].background === style.fillBackground && resources.brushes[i].foreground === style.fillForeground) {
                return i;
            }
        }

        resources.lastKey++;
        resources.brushes[resources.lastKey] = {
            brushString: brushString,
            background: style.fillBackground,
            foreground: style.fillForeground
        };
        return resources.lastKey;
    }

    function getBrushString(brush) {
        var height = brush.length,
            width = brush[0].length,
            heightStr = byteArrayToString(intToArray(height)),
            widthStr = byteArrayToString(intToArray(width)),
            brushString = heightStr + widthStr;

        for (var i = 0; i < height; i++) {
            brushString += byteArrayToString(brush[i]);
        }
        return btoa(brushString);
    }

    function byteArrayToString(array) {
        var string = '';
        for (var i = 0, l = array.length; i < l; i++) {
            string += String.fromCharCode(array[i]);
        }
        return string;
    }

    function intToArray(int) {
        var arr = [];

        for (var i = 0; i < 4; i++) {
            arr[i] = (int / Math.pow(2, i * 8) | 0) % ((2 << 7 + 8 * i) || 1);
        }

        return arr;
    }

    function getBrushIndex(color, resources) {
        for (var i in resources.brushes) {
            if (resources.brushes[i] === color) return i;
        }

        resources.lastKey++;
        resources.brushes[resources.lastKey] = color;
        return resources.lastKey;
    }

    function getImageIndex(imageSrc, resources) {
        for (var i = 0, l = resources.images.length; i < l; i++) {
            if (resources.images[i] === imageSrc) return i;
        }

        resources.lastKey++;
        resources.images[resources.lastKey] = imageSrc;
        return resources.lastKey;
    }

    function getAttributesDefinitionIndex(attributes, resources) {
        var attributesDefinitions = resources.attributesDefinitions;
        for (var i in attributesDefinitions) {
            var same = true;
            for (var j in attributes) {
                if (!attributes.type || !attributes.title || !attributes.size) continue;
                if (attributes[j].title !== attributesDefinitions[i][j].title ||
                    attributes[j].type !== attributesDefinitions[i][j].type) same = false;
            }

            if (same) {
                return i;
            }
        }

        resources.lastKey++;
        attributesDefinitions[resources.lastKey] = attributes;
        return resources.lastKey;
    }

    var symbolTypes = {
        point: 'SimplePointSymbol',
        polyline: 'SimplePolylineSymbol',
        polygon: 'SimplePolygonSymbol'
    };

    function colorToHex(color) {
        var c = new sGis.utils.Color(color);
        return c.toString('hex');
    }

})();'use strict';

(function() {

    sGis.spatialProcessor.Sfs = function(spatialProcessor) {
        if (!(spatialProcessor instanceof sGis.spatialProcessor.Connector)) utils.error('sGis.spatialProcessor.Connector instance is expected but got ' + spatialProcessor + ' instead');

        this._spatialProcessor = spatialProcessor;
    };

    sGis.spatialProcessor.Sfs.prototype = {
        getFolderList: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                var response = JSON.parse(data);
                if (utils.isArray(response)) {
                    success(response);
                } else if (properties.error) {
                    if (response.Message) {
                        properties.error(response.Message);
                    } else {
                        properties.error('Could not get folder list from server');
                    }
                }
            };
            this.__operation('listDirectories', properties);
        },

        getFileList: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                var response = JSON.parse(data);
                if (utils.isArray(response)) {
                    success(response);
                } else if (properties.error) {
                    if (response.Message) {
                        properties.error(response.Message);
                    } else {
                        properties.error('Could not get file list from server');
                    }
                }
            };
            this.__operation('listFiles', properties);
        },

        getTemplate: function(properties) {
            var success = properties.success;
            properties.success = function(data) {
                try {
                    var asset = decodeTemplate(data);
                    utils.message(JSON.stringify(asset));
                } catch(e) {
                    if (properties.error) properties.error('Could not decode the template data: ' + data);
                    return;
                }

                if (asset.ServerBuilder) {
                    asset.ServerBuilder = asset.ServerBuilder.replace(/\r/g, '').replace(/\t/g, '').replace(/,\]/g, ']');
                    try {
                        asset.ServerBuilder = JSON.parse(asset.ServerBuilder);
                    } catch(e) {
                        utils.message('Unsupported format of ServerBuilder');
                        asset.ServerBuilder = null;
                    }
                }

                if (asset.JsonVisualDefinition) {
                    asset.JsonVisualDefinition = sGis.spatialProcessor.parseXML(asset.JsonVisualDefinition);
                    var template = new sGis.spatialProcessor.Template(asset);
                }

                success(template || asset);
            };
            this.__operation('read', properties);
        },

        __operation: function(operation, properties) {
            var self = this;

            if (this._spatialProcessor.sessionId) {
                requestOperation();
            } else {
                this._spatialProcessor.addListner('sessionInitialized.sfs', requestOperation);
            }

            function requestOperation() {
                self._spatialProcessor.removeListner('.sfs');
                utils.ajax({
                    url: self._spatialProcessor.url + 'sfs/?operation=' + operation + '&path=' + encodeURIComponent(properties.path) + '&_sb=' + self._spatialProcessor.sessionId,
                    error: function(data) {
                        if (properties.error) properties.error(data);
                    },
                    success: function(data) {
                        if (properties.success) properties.success(data);
                    }
                });
            }
        }
    };

    function decodeTemplate(base64string) {
        var string = decodeURIComponent(escape(atob(JSON.parse(base64string))));

        for (var i = string.length - 1; i >= 0; i--) {
            if (string.charCodeAt(i) !== 0) {
                return utils.parseJSON(string.substr(0, i + 1));
            }
        }
    }

})();(function() {

    sGis.spatialProcessor.Template = function(asset) {
        this.name = asset.Name;
        this.serverBuilder = asset.ServerBuilder;
        this.categories = asset.Categories;
        this.geometryType = asset.GeometryType;
        this.isServerAsset = asset.IsServerAsset;
        this.overrideIcon = asset.OverrideIcon;
        this.visualDefinition = asset.JsonVisualDefinition;
    };

    sGis.spatialProcessor.Template.prototype = {
        _name: 'Undefined',
        _overrideIcon: '',
        _isServerAsset: false,
        _geometryType: undefined,
        _categories: [],
        _serverBuilder: null,

        createObject: function(coordinates, crs) {
            var objectClass = this.objectClass;
            if (objectClass !== undefined) {
                var feature = new this.objectClass(coordinates, {crs: crs, symbol: this.symbol});
                feature.visualDefinitionId = this._visualDefinition.visualDefinitions[Object.keys(this._visualDefinition.visualDefinitions)[0]];
                return feature;
            } else {
                return null;
            }
        }
    };

    Object.defineProperties(sGis.spatialProcessor.Template.prototype, {
        name: {
            get: function() {
                return this._name;
            },
            set: function(name) {
                if (!utils.isString(name)) utils.error('String is expected but got ' + name + ' instead');
                this._name = name;
            }
        },

        visualDefinition: {
            get: function() {
                return this._visualDefinition;
            },
            set: function(visualDefinition) {
                var symbolDescription = visualDefinition.symbol[Object.keys(visualDefinition.visualDefinitions)[0]],
                    featureType = featureTypes[this._geometryType];
                if (featureType) {
                    var symbol = getSymbol[featureType](symbolDescription);
                }

                this._symbol = symbol;
                this._visualDefinition = visualDefinition;
            }
        },

        serverBuilder: {
            get: function() {
                return this._serverBuilder;
            },
            set: function(serverBuilder) {
                this._serverBuilder = serverBuilder;
            }
        },

        geometryType: {
            get: function() {
                return this._geometryType;
            },

            set: function(type) {
                if (!utils.isNumber(type)) utils.error('Number is expected but got ' + type + ' instead');
                this._geometryType = type;
            }
        },

        objectClass: {
            get: function() {
                return featureClasses[this._geometryType];
            }
        },

        symbol: {
            get: function() {
                return this._symbol;
            }
        },

        style: {
            get: function() {
                return !this._symbol || this._symbol.style;
            }
        }
    });


    var featureClasses = [undefined, sGis.feature.Point, sGis.feature.Polyline, sGis.feature.Polygon],
        featureTypes = [undefined, 'point', 'polyline', 'polygon'],

        getSymbol = {
            point: function(symbolDescription) {
                if (symbolDescription.imageSrc) {
                    return new sGis.symbol.point.Image({
                        source: symbolDescription.imageSrc,
                        size: symbolDescription.size,
                        anchorPoint: symbolDescription.anchorPoint
                    });
                } else if (symbolDescription.shape === 'Circle') {
                    return new sGis.sybmol.point.Point({
                        size: symbolDescription.size,
                        color: parseColor(symbolDescription.stroke)
                    });
                } else {
                    return new sGis.symbol.point.Square({
                        size: symbolDescription.size,
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillColor: parseColor(symbolDescription.fill)
                    }); //TODO: there should be anchor point here
                }
            },

            polyline: function(symbolDescription) {
                return new sGis.symbol.polyline.Simple({
                    strokeWidth: symbolDescription.strokeThickness,
                    strokeColor: parseColor(symbolDescription.stroke)
                });
            },

            polygon: function(symbolDescription) {
                if (symbolDescription.fill && symbolDescription.fill.brush) {
                    return new sGis.symbol.polygon.BrushFill({
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillBrush: symbolDescription.fill.brush,
                        fillForeground: parseColor(symbolDescription.fill.foreground),
                        fillBackground: parseColor(symbolDescription.fill.background)
                    });
                } else {
                    return new sGis.symbol.polygon.Simple({
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillColor: parseColor(symbolDescription.fill)
                    });
                }
            }
        };


    /*
     public enum GeometryType
     {
     Unknown,
     Point,
     Line,
     Polygon,
     Mixed,
     Envelope,
     Multipoint
     }
     */

    function parseColor(color) {
        if (color) {
            return 'rgba(' + parseInt(color.substring(3, 5), 16) + ', ' + parseInt(color.substring(5, 7), 16) + ', ' + parseInt(color.substring(7, 9), 16) + ', ' + parseInt(color.substring(1, 3), 16) / 255 + ')';
        } else {
            return color;
        }
    }

})();'strict mode';

(function() {

var defaults = {
    dpi: 96,
    paperSize: {
        width: 210,
        height: 297
    },
    margin: {
        left: 10,
        top: 10,
        right: 10,
        bottom: 10
    }
};

sGis.spatialProcessor.Printer = function(sp, properties) {
    this._serverConnector = sp.connector;
    this._sp = sp;
};

sGis.spatialProcessor.Printer.prototype = {
    getTemplates: function(properties) {
        utils.ajax({
            url: this._serverConnector.url + 'export/templates/?_sb=' + this._serverConnector.sessionId,
            cache: false,
            success: function(data) {
                try {
                    var templates = utils.parseJSON(data);
                } catch (e) {
                    if (properties.error) properties.error('Incorrect response: ' + data);
                }

                if (properties.success) properties.success(templates);
            },
            error: function(data) {
                if (properties.error) properties.error('Server responded with error: ' + data);
            }
        });
    },

    getPreview: function(properties) {
        var successHandler = properties.success,
            self = this;
        properties.success = function() {
            var link = self._serverConnector.url + 'export/preview/?noHeader=true&f=binary&_sb=' + self._serverConnector.sessionId + '&ts=' + Date.now();
            if (successHandler) successHandler(link);
        };

        this.__store(properties);
    },

    getImage: function(properties) {
        var successHandler = properties.success,
            self = this;
        properties.success = function() {
            var link = self._serverConnector.url + 'export/print/?noHeader=true&f=binary&_sb=' + self._serverConnector.sessionId + '&ts=' + Date.now();
            if (successHandler) successHandler(link);
        };

        this.__store(properties);
    },

    __store: function(properties) {
        var description = {
            ServiceStateDefinition: [],
            MapCenter: {
                X: this._sp.map.position.x,
                Y: this._sp.map.position.y
            },
            SpatialReference: this._sp.map.crs.getWkidString(),
            Dpi: properties.dpi || defaults.dpi,
            Resolution: this._sp.map.resolution,
            PaperSize: {
                Width: properties.paperSize && properties.paperSize.width || defaults.paperSize.width,
                Height: properties.paperSize && properties.paperSize.height || defaults.paperSize.height
            },
            Margin: {
                Left: properties.margin && properties.margin.left || defaults.margin.left,
                Top: properties.margin && properties.margin.top || defaults.margin.top,
                Right: properties.margin && properties.margin.right || defaults.margin.right,
                Bottom: properties.margin && properties.margin.bottom || defaults.margin.bottom
            },
            PrintingTemplateName: properties.template.Name,
            Parameters: [],
        };

        for (var i = 0, len = properties.template.BindingGroups.length; i < len; i++) {
            description.Parameters = description.Parameters.concat(properties.template.BindingGroups[i].Parameters);
        }

        var layers = this._sp.map.layers,
            servicesWithLegend = [];
        for (var i = 0, len = layers.length; i < len; i++) {
            if (layers[i].mapServer) {
                if (layers[i].isDisplayed && layers[i].mapServer.mapItem.legend && layers[i].mapServer.mapItem.legend.length > 0) servicesWithLegend.push(layers[i].mapServer.mapItem);
                description.ServiceStateDefinition.push({
                    UniqueName: layers[i].mapServer.fullName || layers[i].mapServer.id,
                    Opactiy: layers[i].opacity,
                    IsVisible: layers[i].isDisplayed,
                    Title: layers[i].mapServer.Name,
                    CustomParameters: {},
                    Layers: [{ LayerId: -1, LegendItemId: -1, Children: [] }]
                });

                var subLayersInfo = layers[i].mapServer.mapItem && layers[i].mapServer.mapItem.getChildren(true) || [],
                    activeLayers = layers[i].mapServer.mapItem && layers[i].mapServer.mapItem.getActiveChildren(true) || [];

                for (var j = 0, length = subLayersInfo.length; j < length; j++) {
                    description.ServiceStateDefinition[description.ServiceStateDefinition.length - 1].Layers.push({
                        LayerId: subLayersInfo[j].layerId,
                        Opactiy: 1,
                        IsVisible: activeLayers.indexOf(subLayersInfo[j]) !== -1,
                        Title: subLayersInfo[j].name
                    });
                }
            }
        }

        description.Legend = {
            LayerId: -1,
            LegendItemId: -1,
            Children: getLayerTree(servicesWithLegend)
        };

        utils.ajax({
            url: this._serverConnector.url + 'export/store/?_sb=' + this._serverConnector.sessionId,
            type: 'POST',
            data: 'exportDefinition=' + encodeURIComponent(JSON.stringify(description)) + '&f=json',
            cache: false,
            success: properties.success,
            error: properties.error
        });
    }
};

function getLayerTree(mapItems) {
    var tree = [];
    for (var i = 0, len = mapItems.length; i < len; i++) {
        var mapItem = mapItems[i];
        if (hasLegend(mapItem)) {
            if (mapItem instanceof sGis.mapItem.MapServer) {
                tree.push({
                    LayerId: -1,
                    LegendItemId: -1,
                    Name: mapItem.name,
                    Children: getLayerTree(mapItem.children)
                });
            } else if (mapItem instanceof sGis.mapItem.DynamicServiceLayer && mapItem.isDisplayed) {
                if (mapItem.children && mapItem.children.length > 0) {
                    tree.push({
                        LayerId: -1,
                        LegendItemId: -1,
                        Name: mapItem.name,
                        Children: getLayerTree(mapItem.children)
                    });
                } else {
                    var legend = mapItem.legend,
                        legendItems = [];

                    for (var j = 0, length = legend.length; j < length; j++) {
                        legendItems.push({
                            Type: 2,
                            ServiceFullName: mapItem.parentName,
                            Name: legend[j].label,
                            LegendItemId: j,
                            LayerId: legend[j].label ? undefined : mapItem.layerId,
                            Children: []
                        });
                    }

                    tree.push({
                        LayerId: -1,
                        LegendItemId: -1,
                        Name: mapItem.name,
                        Children: legendItems
                    });
                }
            }
        }
    }

    return tree;
}

function hasLegend(mapItem) {
    if (mapItem instanceof sGis.mapItem.DynamicServiceLayer) {
        var legend = mapItem.legend;
        if (legend && legend.length > 0) {
            return true;
        }
    }

    var children = mapItem.getChildren();
    for (var i = 0, len = children.length; i < len; i++) {
        if (hasLegend(children[i])) {
            return true;
        }
    }
    return false;
}

})();'use strict';

(function() {

sGis.spatialProcessor.ClusteringService = function(serverConnector, name, options) {
    this._serverConnector = serverConnector;
    this._url = serverConnector.url + name + '/';
    this._id = utils.getGuid();

    utils.init(this, options);
};

sGis.spatialProcessor.ClusteringService.prototype = {
    _map: null,
    _layer: null,
    _storageId: null,
    _click: null,
    _minSize: 6,
    _maxSize: 31,

    getClusters: function(options) {
        // options: {storageId, bbox, resolution, [success, requested, error]}
        var bbox = options.bbox,
            bboxString = [bbox.p[0].x, bbox.p[0].y, bbox.p[1].x, bbox.p[1].y].join(','),
            sizeString = Math.round(bbox.width / options.resolution) + ',' + Math.round(bbox.height / options.resolution);

        utils.ajax({
            url: this._url + options.storageId + '/?bbox=' + encodeURIComponent(bboxString) + '&size=' + encodeURIComponent(sizeString) + '&_sb=' + this._serverConnector.sessionId,
            cache: false,
            success: function(response) {
                var clusters = utils.parseJSON(response);
                if (options.success) options.success(clusters);
            },
            requested: options.requested,
            error: options.error
        });
    },

    updateClusters: function() {
        if (this._layer && this._map && this._storageId) {
            var self = this;
            this.getClusters({
                storageId: this._storageId,
                bbox: this._map.bbox,
                resolution: this._map.resolution,
                success: function(clusters) {
                    self._layer.features = [];

                    var maxSize = 15;
                    clusters.forEach(function(cluster) {
                        maxSize = Math.max(cluster.Items.length, maxSize);
                    });

                    clusters.forEach(function(cluster) {
                        var size = self._minSize + Math.round((self._maxSize - self._minSize) * (cluster.Items.length / maxSize));
                        var point = new sGis.feature.Point([cluster.X, cluster.Y], { crs: self._map.crs, size: size, color: 'red' });
                        point.items = cluster.Items;
                        if (self._click) point.addListner('click', self._click);
                        self._layer.add(point);
                    });

                    self._map.redrawLayer(self._layer);
                }
            });
        }
    }
};

Object.defineProperties(sGis.spatialProcessor.ClusteringService.prototype, {
    map: {
        get: function() {
            return this._map;
        },
        set: function(map) {
            if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');

            if (this._map) {
                this._map.removeListner('.sGis-clusteringService-' + this._id);
                if (this._layer) this._map.removeLayer(this._layer);
            }

            if (this._layer && map.getLayerIndex(this._layer === -1)) map.addLayer(this._layer);

            var self = this;
            map.addListner('bboxChangeEnd.sGis-clusteringService-' + this._id, function() {
                self.updateClusters();
            });
            this._map = map;
        }
    },

    layer: {
        get: function() {
            return this._layer;
        },
        set: function(layer) {
            if (!(layer instanceof sGis.FeatureLayer)) utils.error('sGis.FeatureLayer instance is expected but got ' + layer + ' instead');

            if (this._map) {
                if (this._layer) {
                    this._map.removeLayer(this._layer);
                }
                if (this._map.getLayerIndex(layer) === -1) {
                    this._map.addLayer(layer);
                }
            }

            this._layer = layer;
            this.updateClusters();
        }
    },

    storageId: {
        get: function() {
            return this._storageId;
        },
        set: function(id) {
            if (!utils.isString(id)) utils.error('String is expected but got ' + id + ' instead');

            this._storageId = id;
            this.updateClusters();
        }
    },

    click: {
        get: function() {
            return this._click;
        },
        set: function(handler) {
            if (!(handler instanceof Function)) utils.error('Function is expected but got ' + handler + ' instead');
            this._click = handler;
        }
    }
});

})(); 'use strict';

(function() {
    
sGis.spatialProcessor.controller = {};
    
sGis.spatialProcessor.Controller = function(extention) {
    for (var key in extention) {
        this[key] = extention[key];
    }    
};
    
sGis.spatialProcessor.Controller.prototype = {
    _display: true,
    
    show: function() {
        if (this._layer) {
            this._layer.display = true;
        }
        this._display = true;
    },
    
    hide: function() {
        if (this._layer) {
            this._layer.display = false;
        }
        this._display = false;
    },
    
    __initialize: function(spatialProcessor, properties, callback) {
        if (!this._operationQueue) this._operationQueue = [];

        var sessionId = spatialProcessor.sessionId;
        if (sessionId) {
            this._spatialProcessor = spatialProcessor;
            this._spatialProcessorUrl = spatialProcessor.url;
            this._url = this._spatialProcessorUrl + 'ControllerService/';
            this._sessionId = sessionId;
            
            this.__connect(properties, callback);
        } else {
            var self = this;
            spatialProcessor.addListner('sessionInitialized', function() {self.__initialize(spatialProcessor, properties, callback);});
        }
    },
    
    __connect: function(properties, callback) {
        var request = '';
        if (properties) {
            for (var param in properties) {
                request += '&' + param + '=' + properties[param];
            }
        }
        request = 'create=' + this._type + request;
        
        var self = this;
        
        utils.ajax({
            url: this._url + '?_sb=' + this._spatialProcessor._sessionId + '&ts=' + new Date().getTime(),
            type: 'POST',
            data: request,
            success: function(data, textStatus) {
                var response = JSON.parse(data);
                self._id = response.ServiceId;
                self._mapServiceId = response.MapServiceId;
                self._storageId = response.StorageId;
                
                
                if (callback) callback.call(self);
                for (var i in self._operationQueue) {
                    self.__operation(self._operationQueue[i]);
                }
            },
            error: function() {
                utils.message('Could not create controller');
            }
        });
    },
    
    remove: function() {
        utils.ajax({
            url: this._url + '?_sb=' + this._sessionId + '&delete=' + this._id
        });
    },
    
    __operation: function(f) {
        var self = this;
        if (this._id) {
            var parameters = f.call(this);
            
            if (this._spatialProcessor.synchronized) {
                requestOperation();
            } else {
                this._spatialProcessor.addListner('synchronize.' + this.id, requestOperation);
            }
        } else {
            this._operationQueue.push(f);
        }
        
        function requestOperation() {
            self._spatialProcessor.removeListner('.' + self.id);
            utils.ajax({
                url: self._url + self._id + '/' + parameters.operation + '?' + (parameters.uriParameters || '') + '_sb=' + self._spatialProcessor.sessionId,
                type: parameters.dataParameters ? 'POST' : 'GET',
                data: parameters.dataParameters + '&timeout=20000&ts=' + new Date().getTime(),
                success: function(data) {
                    var response = parseOperationResponse(data);

                    if (response.status === 'success') {
                        if (parameters.requested) {
                            parameters.requested(response);
                        }
                        if (parameters.success || parameters.error) {
                            self._spatialProcessor.registerOperation(response.operationId, function(result) {
                                if (result.operation && result.operation.status === 'Success') {
                                    if (parameters.success) parameters.success(result);
                                } else {
                                    if (parameters.error) parameters.error(result);
                                }
                            });
                        }

                    } else if (response.status === 'error' && parameters.error) {
                        parameters.error(data);
                    }
                    
                    if (parameters.callback) parameters.callback(data);
                },
                
                error: function(data) {
                    if (parameters.error) parameters.error(data);
                }
            });            
        }
    },
    
    query: function(properties) {
        this.__operation(function() {
            var data;
            var self = this;
            if (properties.geometry) {
                data = JSON.stringify({rings: properties.geometry.coordinates, spatialReference: properties.geometry.crs.getWkidString()});
            } else if (properties.storageId) {
                data = JSON.stringify(utils.isArray(properties.storageId) ? properties.storageId : [properties.storageId]);
            } else {
                utils.error('Lacking the query data');
            }
            data = encodeURIComponent(data);

            if (properties.layerStorageId) data += '&id=' + encodeURIComponent(properties.layerStorageId);

            return {
                operation: 'query',
                dataParameters: 'data=' + data + '&geometryVersion=2',
                requested: properties.requested,
                error: properties.error,
                success: !properties.success ? undefined : function(response) {
                    properties.success(createFeatures(response, properties.crs || properties.geometry && properties.geometry.crs || self._map && self._map.crs));
                }
            };
        });
    },

    save: function(properties) {
        if (!properties.added && !properties.updated && !properties.deleted) utils.error('Edit description must contain at least one feature');

        var edit = {added: properties.added, updated: properties.updated, deleted: properties.deleted},
            xmlString = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + sGis.spatialProcessor.serializeGeometryEdit(edit));

        if (properties.layerStorageId) xmlString += '&id=' + encodeURIComponent(properties.layerStorageId);
        this.__operation(function() {
            return {
                operation: 'edit',
                dataParameters: 'action=edit&edit=' + xmlString,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    createObject: function(properties) {
        var geomDescription = {spatialReference: properties.object.crs.getWkidString()};
        if (properties.object instanceof sGis.feature.Point) {
            geomDescription.x = properties.object.x;
            geomDescription.y = properties.object.y;
        } else if (properties.object instanceof sGis.feature.Polygon) {
            geomDescription.rings = properties.object.coordinates;
        } else {
            geomDescription.paths = properties.object.coordinates;
        }

        var geometryString = encodeURIComponent(JSON.stringify(geomDescription)),
            self = this;

        if (properties.layerStorageId) geometryString += '&StorageId=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

        self.__operation(function() {
            return {
                operation: 'createVisualObject',
                dataParameters: 'geometry=' + geometryString + '&geometryVersion=2&generatorFile=' + encodeURIComponent(properties.templatePath),
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    autoComplete: function(properties) {
        var coordinates = properties.line.coordinates;
        var crs = properties.line.crs;
        var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids))// + '&geometryVersion=2';

        if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

        this.__operation(function() {
            return {
                operation: 'autoComplete',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    reshape: function(properties) {
        var coordinates = properties.line.coordinates;
        var crs = properties.line.crs;
        var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids)) + '&geometryVersion=2';

        if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

        this.__operation(function() {
            return {
                operation: 'reshape',
                    dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });

    },

    cut: function(properties) {
        var coordinates = properties.line.coordinates;
        var crs = properties.line.crs;
        var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids)) + '&geometryVersion=2';

        if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

        this.__operation(function() {
            return {
                operation: 'cut',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });

    },

    extent: function(properties) {
        var dataParameters = '';
        if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));
        this.__operation(function() {
            return {
                operation: 'extent',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: function(response) {
                    debugger;
                }
            };
        });
    }
};

utils.mixin(sGis.spatialProcessor.Controller.prototype, sGis.IEventHandler.prototype);

function createFeatures(response, crs) {
    var features = [];
    if (response.objects) {
        for (var i in response.objects) {
            var object = response.objects[i];

            if (object.geometry && object.visualDefinition) {
                var geometry = object.geometry.data,
                    points = geometry.coordinates,
                    attributes = object.attributes,
                    color = object.visualDefinition.stroke ? parseColor(object.visualDefinition.stroke) : undefined,
                    fillColor = object.visualDefinition.fill ? object.visualDefinition.fill : undefined;

                if (geometry.type === 'polygon') {
                    var feature = new sGis.feature.Polygon(points, {id: i, attributes: attributes, crs: crs, color: color, width: object.visualDefinition.strokeThickness});
                    if (fillColor && fillColor.brush) {
                        feature.symbol = new sGis.symbol.polygon.BrushFill({
                            strokeWidth: object.visualDefinition.strokeThickness,
                            strokeColor: color,
                            fillBrush: fillColor.brush,
                            fillForeground: parseColor(fillColor.foreground),
                            fillBackground: parseColor(fillColor.background)
                        });
                    } else {
                        feature.style = {
                            strokeWidth: object.visualDefinition.strokeThickness,
                            strokeColor: color,
                            fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                        };
                    }
                } else if (geometry.type === 'polyline') {
                    feature = new sGis.feature.Polyline(points, {id: i, attributes: attributes, crs: crs, color: color, width: object.visualDefinition.strokeThickness});
                } else if (geometry.type === 'point') {
                    feature = new sGis.feature.Point(points, {id: i, attributes: attributes, crs: crs, color: color, size: object.visualDefinition.size});
                    if (object.visualDefinition.imageSrc) {
                        feature.symbol = new sGis.symbol.point.Image({
                            source: object.visualDefinition.imageSrc,
                            size: object.visualDefinition.size,
                            anchorPoint: object.visualDefinition.anchorPoint
                        });
                    } else if (object.visualDefinition.shape === 'Circle') {
                        feature.style = {
                            size: object.visualDefinition.size,
                            color: fillColor ? parseColor(fillColor) : 'transparent',
                            strokeColor: color,
                            strokeWidth: object.visualDefinition.strokeThickness
                        };
                    } else {
                        feature.symbol = new sGis.symbol.point.Square({
                            size: object.visualDefinition.size,
                            strokeWidth: object.visualDefinition.strokeThickness,
                            strokeColor: color,
                            fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                        });
                    }
                }
            }

            if (feature) {
                feature.visualDefinitionId = object.visualDefinitionId;
                feature.generatorId = object.generatorId;
                features.push(feature);
            }
        }
    }

    return features;
}


function parseOperationResponse(data) {
    if (data.charAt(0) === '{') {
        return parseOperationError(data);
    } else {
        return parseOperationSuccess(data);
    }
};

function parseOperationError(data) {
    try {
        var response = JSON.parse(data);
    } catch (e) {
        var response = data;
    } finally {
        response.status = 'error';
        return response;
    }
}

function parseOperationSuccess(data) {
    var parser = new DOMParser(),
        xml = parser.parseFromString(data, 'text/xml'),
        attributes = xml.getElementsByTagName('Defered')[0].attributes,
        initDataNode = xml.getElementsByTagName('InitializationData')[0],
        response = {
            status: 'success'
        };
        
        for (var i in attributes) {
            if (attributes[i].nodeName === 'Id') {
                response.operationId = attributes[i].nodeValue;
            } else if (attributes[i].nodeName === 'Name') {
                response.operationName = attributes[i].nodeValue;
            }
        }
        
        if (initDataNode) {
            response.initializationData = JSON.parse(initDataNode.childNodes[0].nodeValue);
        }

    return response;
}

function parseColor(color) {
    var c = new sGis.utils.Color(color);
    return c.toString();
}

})();'use strict';

(function() {

    sGis.spatialProcessor.controller.Identify = function(spatialProcessor, options) {
        this._map = options.map;
        this.__initialize(spatialProcessor, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: options.map, display: this._display});
        });
    };

    sGis.spatialProcessor.controller.Identify.prototype = new sGis.spatialProcessor.Controller({
        _type: 'identify',

        identify: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'geom=' + encodeURIComponent(JSON.stringify({rings: properties.geometry.coordinates, spatialReference: this._map.crs.getWkidString()})) + //TODO: spatial reference should be fixed
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString())),
                    self = this;

                return {
                    operation: 'identify',
                    dataParameters: param,
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (self._tree && self._tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                self._tree.addListner('ready.controller', function() {
                                    self._tree.removeListner('ready.controller');
                                    properties.success(tree);
                                });
                                self._tree.addListner('error.controller', function(text) {
                                    self._tree.removeListner('error.controller');
                                    if (properties.error) properties.error(text);
                                });
                            }
                        }
                    },
                    error: properties.error,
                    requested: function(data) {
                        if (data && data.initializationData) {
                            tree = new sGis.spatialProcessor.DataTree(data.initializationData.TreeId, self._spatialProcessor);
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                        }
                    }
                };
            });
        },

        activate: function() {
            if (this._layer && !this._layer.map) this._layer.map = this._map;
        },

        deactivate: function() {
            if (this._layer) this._layer.map = null;
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.Identify.prototype, {
        tree: {
            get: function() {
                return this._tree;
            }
        },

        isActive: {
            get: function() {
                return this._layer.map === null;
            }
        }
    });

})();(function() {

    sGis.spatialProcessor.controller.SuperSearch = function(spatialProcessor, options) {
        if (options.map) {
            this._map = options.map;
        } else if (options.crs) {
            this._crs = options.crs;
        } else {
            this._crs = sGis.CRS.webMercator;
        }

        this.__initialize(spatialProcessor, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: this._map, display: this._display});
        });
    };

    sGis.spatialProcessor.controller.SuperSearch.prototype = new sGis.spatialProcessor.Controller({
        _type: 'superSearch',

        superSearch: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string),
                    self = this;

                param += '&sr=' + encodeURIComponent(JSON.stringify(this._map ? this._map.crs.getWkidString() : this._crs.getWkidString()));
                if (properties.storageIds) param += '&searchType=parametrizedSearch&mapItemIds=' + encodeURIComponent(JSON.stringify(properties.storageIds));

                return {
                    operation: 'superSearch',
                    dataParameters: param,
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (tree && tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                tree.addListner('ready.controller', function() {
                                    tree.removeListner('ready.controller');
                                    properties.success(tree);
                                });
                            }
                        }
                    },
                    error: properties.error,
                    requested: function(data) {
                        if (data && data.initializationData) {
                            tree = new sGis.spatialProcessor.DataTree(data.initializationData.TreeId, self._spatialProcessor);
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                        }
                    }
                };
            });
        },

        addressSearch: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string),
                    self = this;

                if (this._map) {
                    param += '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString()));
                } else {
                    param += '&sr=' + encodeURIComponent(JSON.stringify(sGis.CRS.webMercator.getWkidString()));
                }

                if (properties.providers) param += '&providers=' + encodeURIComponent(JSON.stringify(properties.providers));

                return {
                    operation: 'addressSearch',
                    dataParameters: param,
                    requested: function(data) {
                        if (data && data.initializationData) {
                            tree = new sGis.spatialProcessor.DataTree(data.initializationData.TreeId, self._spatialProcessor);
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                        }
                    },
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (tree && tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                tree.addListner('ready.controller', function() {
                                    tree.removeListner('ready.controller');
                                    properties.success(tree);
                                });
                            }
                        }
                    },
                    error: properties.error
                };
            });
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.SuperSearch.prototype, {
        tree: {
            get: function() {
                return this._tree;
            }
        }
    });

})();(function() {

sGis.spatialProcessor.controller.ClientLayer = function(spatialProcessor, options) {
    this._map = options.map;
    this._serviceName = options.serviceName;

    var parameters = {};
    if (options.serviceName) parameters.service = options.serviceName;

    this.__initialize(spatialProcessor, parameters, function() {
        this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, { map: options.map, display: this._display });
        var self = this;
        
        this._layer.addListner('initialize.sGis-controller-initialization', function() {
            this.removeListner('.sGis-controller-initialization');
            self.fire('initialize');
        });
    });
};

sGis.spatialProcessor.controller.ClientLayer.prototype = new sGis.spatialProcessor.Controller({
    _type: 'clientLayer',

    loadFile: function(properties) {
        this.__operation(function() {
            return {
                operation: 'bulk',
                dataParameters: 'uid=d7b47c78-9dbc-4dc9-b89b-124fdf23d237&fileName=' + encodeURIComponent(properties.fileName),
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    copy: function(properties) {
        var dataParameters = 'sourceStorage=' + properties.storageId;
        if (properties.items) dataParameters += '&items=' + encodeURIComponent(JSON.stringify(properties.items));

        this.__operation(function() {
            return {
                operation: 'copy',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    saveAs: function(properties) {
        this.__operation(function() {
            return {
                operation: 'save',
                dataParameters: 'uid=e42eac4f-ff1a-4d7e-a15f-21eb601baafd&fileName=' + encodeURIComponent(properties.fileName),
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    queryGeometryTypes: function(properties) {
        this.__operation(function() {
            return {
                operation: 'queryGeometryTypes',
                success: function(data) {
                    if (properties.success) {
                        var response = [];
                        for (var i = 0, len = data.content.length; i < len; i++) {
                            response.push(geometryTypes[data.content[i]]);
                        }

                        properties.success(response);
                    }
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    queryAttributes: function(properties) {
        var dataParameters = '';
        if (properties.geometryType) dataParameters += geometryTypes.indexOf(properties.geometryType) + '&';
        if (properties.numericOnly) dataParameters += properties.numericOnly + '&';
        this.__operation(function() {
            return {
                operation: 'queryAttributes',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    getClassifiableProperties: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType);
        this.__operation(function() {
            return {
                operation: 'getClassifiableProperties',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    getClassifiers: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType) + '&propertyName=' + properties.propertyName;
        this.__operation(function() {
            return {
                operation: 'getClassifiers',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    buildClassifierTable: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType) + '&settings=' + encodeURIComponent(JSON.stringify(properties.settings));
        this.__operation(function() {
            return {
                operation: 'buildClassifierTable',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    /*
    *   {
    *      tables: {
    *           point: [table1, table2, ...],
    *           polyline: [],
    *           polygon: []
    *       },
    *
    *       defaultSymbols: {
    *           point: symbol,
    *           polyline: symbol,
    *           polygon: symbol
    *       }
    *   }
    *
    */

    applySymbolizer: function(properties) {
        var symbolizerOptions = {
            SettersByAttributes: {},
            SymbolOverrideDefinitions: [],
            SerealizedDefaultSymbols: ''
        };

        for (var className in properties.tables) {
            symbolizerOptions.SettersByAttributes[geometryTypeTranslation[className]] = {};
            for (var i = 0, len = properties.tables[className].length; i < len; i++) {
                var table = properties.tables[className][i];
                var attributeName = table[0].AttributeName;
                normolizeColor(table);
                symbolizerOptions.SettersByAttributes[geometryTypeTranslation[className]][attributeName] = table;
            }
        }

        var symbols = [];
        var propDefaultSymbols = properties.defaultSymbols || [];
        for (var i in defaultSymbols) {
            symbols.push(propDefaultSymbols[i] || defaultSymbols[i]);
        }
        symbolizerOptions.SerealizedDefaultSymbols = sGis.spatialProcessor.serializeSymbols(symbols);

        this.__operation(function() {
            return {
                operation: 'applySymbolizer',
                dataParameters: 'symbolizer=' + encodeURIComponent(JSON.stringify(symbolizerOptions)),
                success: function(data) {
                    if (properties.success) properties.success(data);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    }
});

Object.defineProperties(sGis.spatialProcessor.controller.ClientLayer.prototype, {
    mapServer: {
        get: function() {
            return this._layer;
        }
    },

    storageId: {
        get: function() {
            return this._storageId;
        }
    },

    map: {
        get: function() {
            return this._map;
        },
        set: function(map) {
            this._map = map;
        }
    }
});

var geometryTypes = [undefined, 'point', 'polyline', 'polygon'];
var geometryTypeTranslation = {
    point: 'Point',
    polyline: 'Line',
    polygon: 'Polygon'
};

var defaultSymbols = {
    point: new sGis.symbol.point.Point({
        size: 5,
        color: 'blue'
    }),
    polyline: new sGis.symbol.polyline.Simple({
        strokeWidth: 1,
        strokeColor: 'red'
    }),
    polygon: new sGis.symbol.polygon.Simple({
        strokeWidth: 1,
        strokeColor: 'green',
        fillColor: 'blue'
    })
};

function normolizeColor(table) {
    for (var i = 0, len = table.length; i < len; i++) {
        if (table[i].PropertyValue.Color) table[i].PropertyValue.Color = hexToRGBA(table[i].PropertyValue.Color);
    }
}

function hexToRGBA(hex) {
    return {
        A: parseInt(hex.substr(1, 2), 16),
        R: parseInt(hex.substr(3, 2), 16),
        G: parseInt(hex.substr(5, 2), 16),
        B: parseInt(hex.substr(7, 2), 16)
    };
}

})();'use strict';

(function() {

    sGis.spatialProcessor.controller.DitIntegration = function(spatialProcessor, options) {
        this._map = options.map;

        var self = this;
        this.__initialize(spatialProcessor, {}, function() {
            self._mapServer = options.sp.addService('VisualObjectsRendering/' + this._mapServiceId);
            self._layer = self._mapServer;

            self.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.DitIntegration.prototype = new sGis.spatialProcessor.Controller({
        _type: 'integrationLayer',

        loadLayerData: function(properties) {
            var self = this;
            this.__operation(function() {
                properties.operation = 'loadLayerData';
                return properties;
            });
        },

        disintegrate: function(properties) {
            var self = this;
            this.__operation(function() {
                var param = 'layerId=' + encodeURIComponent(properties.layerId) + '&moduleId=' + encodeURIComponent(properties.moduleId) + '&shitId=' + encodeURIComponent(properties.queryId);
                return {operation: 'disintegrate',
                    dataParameters: param,
                    requested: properties.requested,

                    success: function() {
//                        everGis.addMapItem(self._mapItem);
                        if (properties.success) {
                            properties.success();
                        }
                    }};
            });
        },

        fullyDisintegrate: function(properties) {
            var self = this;
            this.__operation(function() {
                var param = 'layerId=' + encodeURIComponent(properties.layerId) + '&moduleId=' + encodeURIComponent(properties.moduleId) + '&shitId=' + encodeURIComponent(properties.queryId);
                return {operation: 'fullyDisintegrate',
                    dataParameters: param,
                    requested: properties.requested,

                    success: function() {
//                        everGis.addMapItem(self._mapItem);
                        if (properties.success) {
                            properties.success();
                        }
                    }};
            });
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.DitIntegration.prototype, {
        tree: {
            get: function() {
                return this._tree;
            }
        },

        isActive: {
            get: function() {
                return this._layer.map === null;
            }
        },

        mapServer: {
            get: function() {
                return this._mapServer;
            }
        }
    });

})();(function() {

    sGis.spatialProcessor.controller.DefinitionQuery = function(spatialProcessor, options) {
        this.__initialize(spatialProcessor);
    };

    sGis.spatialProcessor.controller.DefinitionQuery.prototype = new sGis.spatialProcessor.Controller({
        _type: 'definitionQuery',

        setDefinitionQuery: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'setDefinitionQuery',
                    dataParameters: 'storageId=' + properties.storageId + '&definitionQuery=' + encodeURIComponent(properties.definitionQuery),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

})();(function() {

    sGis.spatialProcessor.controller.TableView = function(serverConnector, options) {
        this._map = options && options.map;

        this.__initialize(serverConnector, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, { map: this._map, display: this._display });
        });
    };

    sGis.spatialProcessor.controller.TableView.prototype = new sGis.spatialProcessor.Controller({
        _type: 'tableView',

        runQuery: function(properties) {
            var self = this;
            this.__operation(function() {
                var queryDescription = {
                        PrevQueryId: properties.prevQueryId,
                        PageIndex: properties.pageIndex || -1,
                        SortDescriptions: properties.sortDescriptions || [],
                        GroupDescriptions: properties.groupDescriptions || [],
                        FilterDescriptions: properties.filterDescriptions || []
                    },
                    param = 'storageId=' + properties.storageId +
                        '&query=' + encodeURIComponent(JSON.stringify(queryDescription));
                var errorNotified;

                return {
                    operation: 'runQuery',
                    dataParameters: param,
                    success: function(data) {
                        if (data.content && data.content.VisualObjects) {
                            var objects = sGis.spatialProcessor.parseXML(data.content.VisualObjects);
                            objects.pagingInfo = data.content.PagingInfo;
                            objects.queryId = data.content.QueryId;

                            if (properties.success) properties.success(objects);
                        } else if (!errorNotified) {
                            if (properties.error) properties.error('Could not parse the response');
                        }
                    },
                    error: properties.error,
                    requested: function(data) {
                        if (data && data.operationId) {
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                            errorNotified = true;
                        }
                    }
                }
            });
        },

        highlight: function(properties) {
            var idsString = properties.ids ? '&ids=' + encodeURIComponent(JSON.stringify(properties.ids)) : '';
            this.__operation(function() {
                return {
                    operation: 'tableView.highlight',
                    dataParameters: 'queryId=' + properties.queryId + idsString,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        save: function(properties) {
            if (!properties.added && !properties.updated && !properties.deleted) utils.error('Edit description must contain at least one feature');

            var edit = {added: properties.added, updated: properties.updated, deleted: properties.deleted},
                xmlString = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + sGis.spatialProcessor.serializeGeometryEdit(edit, true));

            this.__operation(function() {
                return {
                    operation: 'tableView.save',
                    dataParameters: 'queryId=' + properties.queryId + '&changes=' + xmlString,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        createDrawingLayer: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.createDrawingLayer',
                    dataParameters: 'queryId=' + properties.queryId + '&storageId=' + properties.storageId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }
            });
        }
    });

})();(function() {

/**
 * Object for interactions with SpatialProcessor Data Access Service
 * @param {sGis.spatialProcessor.Connector} serverConnector
 * @param {String} name - name of the service on server
 * @constructor
 */
sGis.spatialProcessor.DataAccessService = function(serverConnector, name) {
    this._sp = serverConnector;
    this._spatialProcessor = serverConnector;

    this._url = this._spatialProcessor.url;
    this._id = name;

    this._operationQueue = [];
};

    //TODO: this operations should be united with controller operations
sGis.spatialProcessor.DataAccessService.prototype = {
    __operation: sGis.spatialProcessor.Controller.prototype.__operation,
    query: sGis.spatialProcessor.Controller.prototype.query,
    save: sGis.spatialProcessor.Controller.prototype.save,
    createObject: sGis.spatialProcessor.Controller.prototype.createObject,
    autoComplete: sGis.spatialProcessor.Controller.prototype.autoComplete,
    reshape: sGis.spatialProcessor.Controller.prototype.reshape,
    cut: sGis.spatialProcessor.Controller.prototype.cut
};

Object.defineProperties(sGis.spatialProcessor.DataAccessService.prototype, {
    
});

})();'use strict';

(function() {

    sGis.mapItem = {};

    sGis.MapItem = function(extention) {
        for (var key in extention) {
            this[key] = extention[key];
        }
    };

    sGis.MapItem.prototype = {
        _active: true,
        _parent: null,
        _name: null,
        _draggable: true,

        __initialize: function(options) {
            if (options && options.parent) this.parent = options.parent;
            utils.initializeOptions(this, options);

            this._id = utils.getGuid();
            this._suppressed = !!(this._parent && this._parent.isDisplayed);
            this._children = [];
            if (options && options.children) this.addChildren(options.children);
        },

        activate: function() {
            this.isActive = true;
        },

        deactivate: function() {
            this.isActive = false;
        },

        __unsuppress: function() {
            if (this._suppressed) {
                this._suppressed = false;
                unsuppressChildren(this);
                this.fire('activate');
            }
        },

        __suppress: function() {
            if (!this._suppressed) {
                this._suppressed = true;
                suppressChildren(this);
                this.fire('deactivate');
            }
        },

        getChildren: function(recurse) {
            if (!recurse) {
                return this.children;
            } else {
                var children = [];
                for (var i in this._children) {
                    children.push(this._children[i]);
                    if (this._children[i].getChildren) children = children.concat(this._children[i].getChildren(true));
                }
                return children;
            }
        },

        getActiveChildren: function(recurse) {
            var activeChildren = [];
            for (var i in this._children) {
                if (this._children[i].isActive) {
                    activeChildren.push(this._children[i]);
                    if (recurse) activeChildren = activeChildren.concat(this._children[i].getActiveChildren(true));
                }
            }
            return activeChildren;
        },

        addChildren: function(children) {
            if (utils.isArray(children)) {
                for (var i in children) {
                    this.addChild(children[i]);
                }
            } else {
                this.addChild(children);
            }
        },

        addChild: function(child) {
            if (this.isValidChild(child)) {
                var prevParent = child.parent;
                if (prevParent) prevParent.removeChild(child);

                this._children.push(child);
                child._parent = this;
                if (!this.isDisplayed) child.__suppress();
                if (child.getLayer && child.getLayer()) reorderLayers(child);
                this.fire('addChild', {child: child});
            } else {
                utils.error('sGis.MapItem instance is expected but got ' + child + ' instead');
            }
        },

        removeChild: function(child) {
            var index = this.getChildIndex(child);
            if (index !== -1) {
                this._children.splice(index, 1);
                child._parent = null;
                this.fire('removeChild', {child: child});
            } else {
                utils.error('Map item is not found');
            }
        },

        removeChildren: function() {
            for (var i = this._children.length - 1; i >=0; i--) {
                this.removeChild(this._children[i]);
            }
        },

        getChildIndex: function(child) {
            return this._children.indexOf(child);
        },

        moveChildToIndex: function(child, index) {
            if (index > this._children.length) index = this._children.length;

            var currentIndex = this.getChildIndex(child);
            if (currentIndex !== -1) {
                this._children.splice(currentIndex, 1);
                if (currentIndex < index) index--;
            }
            this._children.splice(index, 0, child);

            if (currentIndex === -1) {
                var prevParent = child.parent;
                if (prevParent) prevParent.removeChild(child);
                child._parent = this;
                if (!this.isDisplayed) {
                    child.__suppress();
                } else {
                    child.__unsuppress();
                }
                this.fire('addChild', {child: child});
            }
            reorderLayers(child);
            this.fire('childOrderChange', {child: child});
        },

        getNewLayerIndex: function(child) {
            var childIndex = this.getChildIndex(child);
            if (childIndex === -1) utils.error('The folder does not contain requested child');
            for (var i = childIndex+1; i < this._children.length; i++) {
                if (this._children[i].layer && this._children[i].layer.map && this._children[i].layer.layer) {
                    return this._children[i].layer.map.getLayerIndex(this._children[i].layer.layer); //TODO: must be fixed
                }
            }

            for (var i = childIndex - 1; i >= 0; i--) {
                if (this._children[i].layer && this._children[i].layer.layer && this._children[i].layer.map) {
                    return this._children[i].layer.map.getLayerIndex(this._children[i].layer.layer) + 1;
                }
            }

            var parent = this._parent;
            if (parent) {
                return parent.getNewLayerIndex(this);
            } else {
                return -1;
            }

        },

        getChildById: function(id, recurse) {
            for (var i = 0, len = this._children.length; i < len; i++) {
                if (this._children[i].id === id) return this._children[i];
                if (recurse) {
                    var foundChild = this._children[i].getChildById(id, recurse);
                    if (foundChild) return foundChild;
                }
            }
            return null;
        }
    };

    utils.mixin(sGis.MapItem.prototype, sGis.IEventHandler.prototype);

    Object.defineProperties(sGis.MapItem.prototype, {
        id: {
            get: function() {
                return this._id;
            }
        },

        name: {
            get: function() {
                return this._name || this._id;
            },

            set: function(name) {
                if (!utils.isString(name)) utils.error('String is expected but got ' + name + ' instead');
                this._name = name;
            }
        },

        parent: {
            get: function() {
                return this._parent;
            },

            set: function(parent) {
                if (this._draggable) {
                    if (this._parent) this._parent.removeChild(this);
                    parent.addChild(this);
                }
            }
        },

        serverOperations: {
            get: function() {
                return [];
            }
        },

        isActive: {
            get: function() {
                return this._active;
            },

            set: function(bool) {
                if (bool) {
                    this._active = true;
                    unsuppressChildren(this);
                    this.fire('activate');
                } else {
                    this._active = false;
                    suppressChildren(this);
                    this.fire('deactivate');
                }
            }
        },

        isSuppressed: {
            get: function() {
                return this.parent ? !this.parent.isActive || this.parent.isSuppressed : false;
            }
        },

        isDisplayed: {
            get: function() {
                return this._active && !this._suppressed;
            }
        },

        hasChildren: {
            get: function() {
                return this._children.length > 0;
            }
        },

        isDraggable: {
            get: function() {
                return this._draggable;
            }
        },

        children: {
            get: function() {
                return [].concat(this._children);
            },

            set: function(children) {
                this.removeChildren();
                this.addChildren(children);
            }
        }
    });

    function suppressChildren(mapItem) {
        if (mapItem._children) {
            for (var i in mapItem._children) {
                mapItem._children[i].__suppress();
            }
        }
    }

    function unsuppressChildren(mapItem) {
        if (mapItem._children) {
            for (var i in mapItem._children) {
                mapItem._children[i].__unsuppress();
            }
        }
    }

    function reorderLayers(sourceMapItem) {
        var childrenWithLayers = getChildrenWithLayers(sourceMapItem);

        for (var i in childrenWithLayers) {
            var layer = childrenWithLayers[i].mapServer.layer, //TODO: this must be fixed
                map = childrenWithLayers[i].mapServer.map,
                indexOnMap = childrenWithLayers[i].parent.getNewLayerIndex(childrenWithLayers[i]);

            if (indexOnMap === -1) {
                map.moveLayerToIndex(layer, 0);
            } else {
                var currentIndex = map.getLayerIndex(layer);
                if (currentIndex !== -1 && currentIndex < indexOnMap) indexOnMap--;

                map.moveLayerToIndex(layer, indexOnMap);
            }
        }
    }

    function getChildrenWithLayers(mapItem) {
        var childrenWithLayers = mapItem._layer ? [mapItem] : [];

        if (mapItem.getChildren) {
            var children = mapItem.getChildren();
            for (var i in children) {
                if (children[i].getChildren) {
                    childrenWithLayers.concat(getChildrenWithLayers(children[i]));
                }
                if (children[i].getLayer) {
                    childrenWithLayers.push(children[i]);
                }
            }
        }
        return childrenWithLayers;
    }

})();'use strict';

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


})();'use strict';

(function() {

    sGis.mapItem.MapServer = function(mapServer, options) {
        this._layer = mapServer;
        var self = this;

        this._active = mapServer.display;
        mapServer.mapItem = this;
        this.__initialize(options);

        if (mapServer.serviceInfo) this.__onServiceInfoUpdate();
        if (mapServer.legend) this.__onLegendUpdate();
        mapServer.addListner('initialize', function() { self.__onServiceInfoUpdate(); });
        mapServer.addListner('legendUpdate', function() { self.__onLegendUpdate(); });
        mapServer.addListner('layerVisibilityChange', function() {
            self.__onLayerVisibilityChange();
        });
    };

    sGis.mapItem.MapServer.prototype = new sGis.MapItem({
        isValidChild: function(child) {
            return child instanceof sGis.mapItem.DynamicServiceLayer;
        },

        _defaultHandlers: {
            activate: function() {
                var activeChildren = this.getActiveChildren();
                if (this.children.length === 0 || activeChildren && activeChildren.length > 0) {
                    if (this.mapServer) this.mapServer.display = true;
                }
            },

            deactivate: function() {
                this.mapServer.display = false;
            }
        },

        __onServiceInfoUpdate: function() {
            var serviceInfo = this._layer.serviceInfo,
                layersInfo = this._layer.layerInfo,
                self = this;

            if (serviceInfo.layers && !this._layer.isEverGis) {
                var children = {};
                for (var i in serviceInfo.layers) {
                    children[serviceInfo.layers[i].id] = new sGis.mapItem.DynamicServiceLayer({
                        name: serviceInfo.layers[i].name,
                        active: this._layer.activeLayers[0] !== null ? this._layer.activeLayers.indexOf(parseInt(i)) !== -1 : serviceInfo.layers[i].defaultVisibility,
                        layerId: serviceInfo.layers[i].id,
                        minScale: serviceInfo.layers[i].minScale,
                        maxScale: serviceInfo.layers[i].maxScale,
                        parentName: serviceInfo.fullName
                    });

                    if (layersInfo[i]) {
                        var layerInfo = layersInfo[i].LayerInfo;
                        children[serviceInfo.layers[i].id].setLayerInfo(layerInfo);
                    }
                }

                for (var i in serviceInfo.layers) {
                    if (serviceInfo.layers[i].parentLayerId === -1) {
                        this.addChild(children[serviceInfo.layers[i].id]);
                    } else {
                        children[serviceInfo.layers[i].parentLayerId].addChild(children[serviceInfo.layers[i].id]);
                    }
                    children[serviceInfo.layers[i].id].addListner('activate deactivate', function() {
                        self.__updateLayerVisibility();
                    });
                }
            }

            this.fire('propertyChange', {property: 'name'});
        },

        __updateLayerVisibility: function() {
            if (this._layer) {
                var activeChildren = this.getActiveChildren(true),
                    activeLayerList = [];

                for (var i in activeChildren) {
                    activeLayerList.push(activeChildren[i].layerId);
                }

                if (activeLayerList.length > 0) {
                    if (this.isDisplayed) this._layer.display = true;
                    this._layer.activeLayers = activeLayerList;
                } else {
                    this._layer.display = false;
                }
            }
        },

        __onLegendUpdate: function() {
            var legend = this.legend,
                children = this.getChildren(true);
            for (var i in children) {
                var layerId = children[i].layerId;
                for (var j in legend) {
                    if (legend[j].layerId === layerId) {
                        children[i].legend = legend[j].legend;
                        break;
                    }
                }
            }

            this.fire('legendUpdate');
        },

        __onLayerVisibilityChange: function() {
            var activeLayers = this.mapServer.activeLayers;
            var children = this.getChildren(true);

            for (var i = 0, len = children.length; i < len; i++) {
                var mapItem = children[i];
                if (activeLayers.indexOf(mapItem.layerId) === -1) {
                    if (mapItem.isActive) {
                        mapItem._active = false;
                    }
                } else {
                    if (!mapItem.isActive) {
                        mapItem._active = true;
                    }
                }
            }

            this.fire('propertyChange', { property: 'activeLayers' });
        }
    });

    Object.defineProperties(sGis.mapItem.MapServer.prototype, {
        name: {
            get: function() {
                return this._name || this.layer.name || this._id;
            },

            set: function(name) {
                this._name = name;
            }
        },

        layer: {
            get: function() {
                return this._layer;
            }
        },

        legend: {
            get: function() {
                return this.mapServer.legend;
            }
        },

        map: {
            get: function() {
                return this._layer.map;
            }
        },

        controller: {
            get: function() {
                return this._layer.clientLayerController;
            }
        },

        mapServer: {
            get: function() {
                return this._layer.isEverGis ? this._layer.clientLayerController.mapServer : this._layer;
            }
        },

        fullName: {
            get: function() {
                return this._layer && this._layer.fullName;
            }
        },

        isEverGis: {
            get: function() {
                return this._layer && this._layer.isEverGis;
            }
        },

        storageId: {
            get: function() {
                return this.isEverGis ? this._layer.clientLayerController.storageId : null;
            }
        },

        serverOperations: {
            get: function() {
                if (this.isEverGis) {
                    return [{ FullName: this.fullName, Identity: 0, Operation: 'lm' }];
                } else {
                    return [];
                }
            }
        }
    });

})();'use strict';

(function() {

    sGis.mapItem.DynamicServiceLayer = function(options) {
        this.__initialize(options);

        if (options && options.children) {
            this._children = options.children;
        } else {
            this._children = [];
        }
    };

    sGis.mapItem.DynamicServiceLayer.prototype = new sGis.MapItem({
        _draggable: false,
        _layerId: null,
        _minScale: 0,
        _maxScale: 0,
        _dpm: 96 * 100 / 2.54,
        _parentName: null,

        //addChild: function(child) {
        //    if (this.isValidChild(child)) this._children.push(child);
        //    this.fire('addChild', {child: child});
        //},

        isValidChild: function(child) {
            return child instanceof sGis.mapItem.DynamicServiceLayer;
        },

        getChildren: function(recurse) {
            if (recurse) {
                var children = [];
                for (var i in this._children) {
                    children.push(this._children[i]);
                    if (this._children[i].getChildren) children = children.concat(this._children[i].getChildren(recurse));
                }
                return children;
            } else {
                return this._children;
            }
        },

        getDisplayedLayerList: function(recurse) {
            if (!this._children) return [];

            var list = [];
            for (var i in this._children) {
                if (this._children[i].isActive()) {
                    list.push(this._children[i].getLayerId());
                    if (recurse) {
                        list = list.concat(this._children[i].getDisplayedLayerList(true));
                    }
                }
            }

            return list;
        },

        setLayerInfo: function(layerInfo) {
            this._layerInfo = layerInfo;
        },

        getChildIndex: function(child) {
            return this._children.indexOf(child);
        }
    });

    Object.defineProperties(sGis.mapItem.DynamicServiceLayer.prototype, {
        serverOperations: {
            get: function() {
                return [{FullName: this._parentName, Identity: this.layerId, Operation: 'lm'}];
            }
        },

        layerId: {
            get: function() {
                return this._layerId;
            }
        },

        legend: {
            get: function() {
                return this._legend;
            },

            set: function(legend) {
                this._legend = legend;
                this.fire('legendUpdate');
            }
        },

        isDisplayed: {
            get: function() {
                if (!this.map) return false;
                if (this._minScale !== 0 || this._maxScale !== 0) {
                    var scale = this.map.resolution * this._dpm;
                    if (scale < this._maxScale || this._minScale && scale > this._minScale) return false;
                }
                return this.isActive && !this.isSuppressed;
            }
        },

        map: {
            get: function() {
                return this._parent.map;
            }
        },

        parentName: {
            get: function() {
                return this._parentName;
            }
        },

        layerInfo: {
            get: function() {
                return this._layerInfo || [];
            }
        },

        storageId: {
            get: function() {
                var storageId = this.layerInfo.storageId;
                if (storageId && storageId !== '00000000-0000-0000-0000-000000000000') {
                    return storageId;
                } else {
                    return null;
                }
            }
        }
    });

})();'use strict';

(function() {

    sGis.mapItem.ClientLayer = function(controller, properties) {
        this.controller = controller;
        this.__initialize(properties);
    };

    sGis.mapItem.ClientLayer.prototype = new sGis.MapItem({

    });

    Object.defineProperties(sGis.mapItem.ClientLayer.prototype, {
        controller: {
            get: function() {
                return this._controller;
            },
            set: function(controller) {
                if (!(controller instanceof sGis.spatialProcessor.controller.ClientLayer)) utils.error('sGis.spatialProcessor.controller.ClientLayer instance is expected but got ' + controller + ' instead');
                this._controller = controller;
            }
        },

        mapServer: {
            get: function() {
                return this._controller.mapServer;
            }
        },

        isActive: {
            get: function() {
                return this._active;
            },
            set: function(bool) {
                if (bool) {
                    this._controller.show();
                    this.fire('activate');
                } else {
                    this._controller.hide();
                    this.fire('deactivate');
                }
            }
        },

        layerInfo: {
            get: function() {
                return this._controller.mapServer.layerInfo[0].LayerInfo;
            }
        },

        storageId: {
            get: function() {
                return this.layerInfo.storageId;
            }
        },

        serverOperations: {
            get: function() {
                return [{ FullName: this.controller.mapServer.fullName, Identity: 0, Operation: 'sm' }];
            }
        }
    });

})();'use strict';

(function() {

    sGis.SpatialProcessor = function(options) {
        this._rootMapItem = new sGis.mapItem.Folder();
        this._connector = new sGis.spatialProcessor.Connector(options.url, this._rootMapItem, options.password && options.login ? options.login : options.sessionId, options.password);
        this._map = new sGis.Map();

        this._services = {};
        if (options.baseMaps && options.baseMaps.length > 0) this._initializeBaseMaps(options.baseMaps);
        if (options.services) this._initializeServices(options.services);

        this._controllers = {};
        if (options.controllers) {
            for (var i = 0, len = options.controllers.length; i < len; i++) {
                this.addController(options.controllers[i]);
            }
        }

        if (options.mapWrapper) this.mapWrapper = options.mapWrapper;

        this._initializeDataAccessService();
    };

    sGis.SpatialProcessor.prototype = {
        _initializeServices: function(list) {
            for (var i = 0, len = list.length; i < len; i++) {
                if (!this._services[list[i]]) this.addService(list[i]);
            }
        },

        _createService: function(name) {
            this._services[name] = new sGis.spatialProcessor.MapServer(name, this._connector);

            var self = this;
            if (this._services[name].initialized) {
                setTimeout(function() { initializationHandler.call(self._services[name]); }, 0);
            } else {
                this._services[name].addListner('initialize.spInitialization', initializationHandler);
            }

            this.fire('serviceAdd', { service: name });
            return this._services[name];

            function initializationHandler() {
                this.removeListner('initialize.spInitialization');
                initializeService(self, this.mapItem);

                var allInitialized = true;
                for (var service in self._services) {
                    if (!self._services[service].initialized) allInitialized = false;
                }
                if (allInitialized & !self._initialized) {
                    self._initialized = true;
                    self.fire('initialize');
                }
            }
        },

        _createServiceMapItem: function(name) {
            var mapItem = new sGis.mapItem.MapServer(this._services[name]);
            this._rootMapItem.addChild(mapItem);
        },

        addService: function(name) {
            if (this._services[name]) utils.error('The service with the name ' + name + ' alreade exists');
            this._createService(name);
            this._createServiceMapItem(name);

            return this.service[name];
        },

        removeService: function(service) {
            if (!this._services[service]) utils.error('No service with the name ' + service + ' present');
            this._services[service].kill();

            var mapItems = this._rootMapItem.getChildren(true);
            for (var i = 0, len = mapItems.length; i < len; i++) {
                if (mapItems[i].layer && mapItems[i].layer === this._services[service]) this._rootMapItem.removeChild(mapItems[i]);
            }

            delete this._services[service];
        },

        addController: function(controllerName, options) {
            if (!controllerList[controllerName]) utils.error('Unknow controller: ' + controllerName);
            if (!options) options = {};
            options.map = this.map;
            options.sp = this;
            this._controllers[controllerName] = new controllerList[controllerName](this._connector, options);
            return this._controllers[controllerName];
        },

        kill: function() {
            this.map.wrapper = null;
            for (var i in this._services) {
                this.removeService(i);
            }
            this._connector.cancelNotificationRequest();
        },

        setMapPositionByService: function(service) {
            if (!service.layer.crs.from) {
                var x = (service._serviceInfo.initialExtent.xmax + service._serviceInfo.initialExtent.xmin) / 2,
                    y = (service._serviceInfo.initialExtent.ymax + service._serviceInfo.initialExtent.ymin) / 2,
                    position = new sGis.Point(x, y, service.layer.crs),
                    resolution = (service._serviceInfo.initialExtent.xmax - service._serviceInfo.initialExtent.xmin) / this._map.width * 2;

                this._map.crs = service.layer.crs;
                this._map.position = position;
                this._map.resolution = utils.isNumber(resolution) && resolution !== 0 ? resolution : 10;
            } else {
                this._map.position = sGis.Map.prototype._position;
                this._map.resolution = sGis.Map.prototype._resolution;
            }
        },

        _initializeDataAccessService: function() {
            this._dataAccessService = new sGis.spatialProcessor.DataAccessService(this._connector, 'DataAccess');
        },

        _initializeBaseMaps: function(list) {
            this._baseMapControl = new sGis.controls.BaseLayerSwitch(this._map);
            this._baseMapItems = {};

            var self = this;
            for (var i = 0, len = list.length; i < len; i++) {
                this._createService(list[i].name);
                this._baseMapItems[list[i].name] = new sGis.mapItem.MapServer(this._services[list[i].name], { name: 'Базовая карта' });

                if (this._services[list[i].name].initialized) {
                    this._baseMapControl.addLayer(this._services[list[i].name].layer, list[i].imageUrl);
                } else {
                    this._services[list[i].name].addListner('initialize.spatialProcessor-baseMap', (function (i) {
                        return function() {
                            self._baseMapControl.addLayer(this.layer, list[i].imageUrl);
                            if (!self._baseMapControl.isActive) self._baseMapControl.activate();
                        };
                    })(i));
                }
            }

            this._activeBaseMapItem = this._baseMapItems[list[0].name];
            this._rootMapItem.addChild(this._activeBaseMapItem);

            this._baseMapControl.addListner('activeLayerChange', function() {
                var index = self._rootMapItem.getChildIndex(self._activeBaseMapItem);
                self._rootMapItem.removeChild(self._activeBaseMapItem);

                var activeMapItem = self._baseMapItems[list[0].name];
                for (var i in self._baseMapItems) {
                    if (self._baseMapItems[i].layer.layer === this.activeLayer) {
                        activeMapItem = self._baseMapItems[i];
                        break;
                    }
                }

                activeMapItem.isActive = self._activeBaseMapItem.isActive;
                activeMapItem.layer._map = self._map; // TODO: durty hack must fix
                self._rootMapItem.moveChildToIndex(activeMapItem, index);
                self._activeBaseMapItem = activeMapItem;
            });
        }
    };

    function initializeService(sp, mapItem) {
        var mapItems = sp._rootMapItem.getChildren(true);

        for (var i = 0, len = mapItems.length; i < len; i++) {
            if (mapItems[i].layer) {
                if (!mapItems[i].layer.initialized || mapItems[i].layer.layer && mapItems[i].layer.layer.crs) {
                    var baseService = mapItems[i].layer;
                    sp._baseService = baseService;
                    break;
                }
            }
        }

        if (baseService) {
            if (mapItem.layer === baseService) sp.setMapPositionByService(baseService);

            if (baseService.initialized) {
                addServiceToMap(sp, mapItem);
            } else {
                baseService.addListner('initialize.init-' + mapItem.id, function() {
                    baseService.removeListner('initialize.init-' + mapItem.id);
                    initializeService(sp, mapItem);
                });
            }
        } else {
            sp.addListner('serviceAdd.initWaiting-' + mapItem.id, function() {
                sp.removeListner('serviceAdd.initWaiting-' + mapItem.id);
                initializeService(sp, mapItem);
            });
        }
    }

    function addServiceToMap(sp, mapItem) {
        if (mapItem.parent) {
            mapItem.mapServer.map = sp.map;
            if (mapItem.controller) mapItem.controller.map = sp.map;
            var index = mapItem.parent.getChildIndex(mapItem);
            mapItem.parent.moveChildToIndex(mapItem, index === -1 ? 0 : index);
        }
    }

    Object.defineProperties(sGis.SpatialProcessor.prototype, {
        connector: {
            get: function() {
                return this._connector;
            }
        },

        map: {
            get: function() {
                return this._map;
            }
        },

        service: {
            get: function() {
                return this._services;
            }
        },

        controller: {
            get: function() {
                return this._controllers;
            }
        },

        mapWrapper: {
            get: function() {
                return this._map.wrapper;
            },
            set: function(wrapper) {
                if (document.readyState === 'complete') {
                    this._map.wrapper = wrapper;
                } else {
                    var self = this;
                    Event.add(document, 'DOMContentLoaded', function() {
                        self._map.wrapper = wrapper;
                    });
                }
            }
        },

        rootMapItem: {
            get: function() {
                return this._rootMapItem;
            }
        },

        baseService: {
            get: function() {
                return this._baseService;
            }
        },

        dataAccessService: {
            get: function() {
                return this._dataAccessService;
            }
        }
    });

    utils.mixin(sGis.SpatialProcessor.prototype, sGis.IEventHandler.prototype);

    var controllerList = {
        'identify': sGis.spatialProcessor.controller.Identify,
        'superSearch': sGis.spatialProcessor.controller.SuperSearch,
        'ditIntegration': sGis.spatialProcessor.controller.DitIntegration,
        'clientLayer': sGis.spatialProcessor.controller.ClientLayer,
        'definitionQuery': sGis.spatialProcessor.controller.DefinitionQuery,
        'tableView': sGis.spatialProcessor.controller.TableView
    };

})();'use strict';

(function() {

    window.everGis = {
//    _serverUrl: 'http://194.187.206.128:20888/services/spatialprocessor/',
//    _serverUrl: 'http://192.168.13.64/spatialprocessor/',   // http://192.168.13.64/Strategis.JsClient/ApiLogin.aspx?authId=505741D8-C667-440D-9CA0-32FD1FF6AF88&userName=new&password=new
//    _serverUrl: 'http://chuck-pc/SpatialProcessor/',
//    _serverUrl: 'http://dev2.everpoint.ru/EverGIS/SpatialProcessor/IIS/',
//    _serverUrl: 'http://dev1.everpoint.ru/EverGIS/SpatialProcessor/IIS/',
        _mapItems: new sGis.mapItem.Folder(),
        _maps: [],
        _onDOMReady: [],
        _mapServices: [],
        _controllers: [],

        addMapItem: function(mapItem) {
            this._mapItems.addChild(mapItem);
        },

        addMapItems: function(mapItems) {
            this._mapItems.addChildren(mapItems);
        },

        removeMapItem: function(mapItem) {
            this._mapItems.removeChild(mapItem);
        },

        getMapItemList: function() {
            return this._mapItems.getChildren(true);
        },

        map: function(id) {
            var map = new sGis.Map();
            this._maps.push(map);

            this.onDOMReady = function() {
                map.wrapper = id;
            };

            return map;
        },

        folder: function(properties) {
            var folder = new sGis.mapItem.Folder({name: properties.name, parent: properties.parent || this._mapItems, active: properties.active});
            return folder;
        },

        mapServer: function(name, properties) {
            var mapServer = new sGis.spatialProcessor.MapServer(name, this._serverConnector, {map: properties.map, opacity: properties.opacity, display: properties.display}),
                self = this,
                mapItem = new sGis.mapItem.MapServer(mapServer, {active: properties.display});
            if (properties.folder) {
                properties.folder.addChild(mapItem);
            } else {
                this._mapItems.addChild(mapItem);
            }

            mapServer.addListner('initialize', function() {
                var index = mapItem.parent.getChildIndex(mapItem);
                mapItem.parent.moveChildToIndex(mapItem, index === -1 ? 0 : index);
            });

            return mapServer;
        },

        removeMapServer: function(mapServer) {
            if (!(mapServer instanceof sGis.spatialProcessor.MapServer)) utils.error('sGis.spatialProcessor instance is expected but got ' + mapServer + ' instead');
            var mapItems = this.mapItems;
            for (var i in mapItems) {
                if (mapItems[i].layer && mapItems[i].layer === mapServer) this.removeMapItem(mapItems[i]);
            }

            mapServer.map = null;
        },

        controller: function(type, options) {
            if (!options) options = {};
            if (type in sGis.spatialProcessor.controllerList) {
                if (this._maps[0]) options.map = this._maps[0];
                var controller = new sGis.spatialProcessor.controllerList[type](this._serverConnector, options);
                this._controllers.push(controller);
                return controller;
            } else {
                utils.error('Requested unknows type of controlller: ' + type);
            }
        },

        connect: function(url, login, password) {
            this._serverConnector = new sGis.spatialProcessor.Connector(url, this._mapItems, login, password);

            everGis._serverConnector.addListner('sessionInitialized', function() {
                isInitialized = true;
                for (var i in everGis._onInitialized) {
                    everGis._onInitialized[i]();
                }
            });
        }
    };

    Object.defineProperties(everGis, {
        serverConnector: {
            get: function() {
                return this._serverConnector;
            }
        },

        serverUrl: {
            get: function() {
                return this._url;
            }
        },

        mapItems: {
            get: function() {
                return this._mapItems.getChildren();
            },

            set: function(mapItems) {
                this._mapItems.removeChildren();
                this._mapItems.addChildren(mapItems);
            }
        },

        rootMapItem: {
            get: function() {
                return this._mapItems;
            }
        },

        sessionId: {
            get: function() {
                return this._serverConnector.sessionId;
            }
        },

        onDOMReady: {
            set: function(callback) {
                if (!(callback instanceof Function)) utils.error('Function is expected but got ' + callback + ' instead');
                if (!isDOMReady) {
                    this._onDOMReady.push(callback);
                } else {
                    callback();
                }
            }
        },

        onInitialized: {
            set: function(callback) {
                if (!(callback instanceof Function)) utils.error('Function is expected but got ' + callback + ' instead');
                if (isInitialized) {
                    callback();
                } else {
                    this._onInitialized.push(callback);
                }
            }
        }
    });

    var isInitialized = false;

//everGis._serverConnector = new sGis.spatialProcessor.Connector(everGis._serverUrl, 'z', 'z');


    var isDOMReady = false;

    Event.add(document, 'DOMContentLoaded', function() {
        isDOMReady = true;
        for (var i in everGis._onDOMReady) {
            everGis._onDOMReady[i]();
        }
    });

    sGis.spatialProcessor.controllerList = {
        'identify': sGis.spatialProcessor.controller.Identify,
        'superSearch': sGis.spatialProcessor.controller.SuperSearch,
        'ditIntegration': sGis.spatialProcessor.controller.DitIntegration,
        'clientLayer': sGis.spatialProcessor.controller.ClientLayer
    };

})();