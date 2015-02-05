(function() {





sGis.Geoindex = function() {

};

sGis.Geoindex.prototype = {
    add: function(obj) {

    }
};

Object.defineProperties(sGis.Geoindex.prototype, {

});




sGis.geoIndex = {};

sGis.geoIndex.Node = function(objects, parent) {
    this._parent = parent;

    if (objects[0] instanceof sGis.geoIndex.Node) {
        this._children = objects[0];
    } else {
        for (var i = 0, len = objects.length; i < len; i++) {
            this.add(objects[i]);
        }
    }
};

sGis.geoIndex.Node.prototype = {
    _minLength: 5,
    _maxLength: 10,

    add: function(obj) {
        if (this._children) {
            var child = this._getChildForInsert(obj);
            child.add(obj);
        } else {
            this._objects.push(obj);
            if (this._objects.length > this._maxLength) {
                this._split();
            } else {
                this.updateMbr();
            }
        }
    },

    updateMbr: function() {
        this._mbr = new Mbr(this._children || this._objects);
        if (this._parent) this._parent.updateMbr();
    },

    _getChildForInsert: function(obj) {
        var minIntersectionIncrease = Infinity, index;
        for (var i = 0, len = this._chilren.length; i < len; i++) {
            var intersectionIncrease = getIntersectionIncrease(this._children[i], this._children, obj);

            if (intersectionIncrease < minIntersectionIncrease) {
                minIntersectionIncrease = intersectionIncrease;
                index = i;
            } else if (intersectionIncrease === minIntersectionIncrease) {
                var iAreaIncrease = getAreaIncrease(this._children[i], obj);
                var indexAreaIncrease = getAreaIncrease(this._children[index], obj);

                if (iAreaIncrease < indexAreaIncrease) {
                    index = i;
                } else if (iAreaIncrease === indexAreaIncrease) {
                    if (this._children[i].area < this._children[index].area) {
                        index = i;
                    }
                }
            }
        }

        return this._children[index];
    },

    split: function() {
        var sortedLists = getSortedLists(this._objects);
        var axis = this._chooseSplitAxis(sortedLists);
        var groups = this._chooseSpliteIndex(sortedLists, axis);

        this._parent._replace(this, new sGis.geoIndex.Node(groups[0], this._parent), new sGis.geoIndex.Node(groups[1], this._parent));
    },

    _replace: function(node) {
        var index = this._children.getIndex(node);
        if (index !== -1) {
            this._children.splice(index, 1, arguments.split(1));
        }
        if (this._children.length > this._maxLength) {
            this.split();
        }
    },

    _chooseSplitAxis: function(sortedLists) {
        var kMax = this._maxLength - 2 * this._minLength + 2;

        var splitAxis, minPerimeterSum = Infinity;
        for (var axis = 0; axis < 2; axis++) {
            var perimeterSum = 0;

            for (var i = 0; i < 2; i++) {
                var groups = [];
                
                for (var k = 0; k < kMax; k++) {
                    var splitIndex = this._minLength + k;
                    var group1 = sortedLists[i][axis].split(0, splitIndex);
                    var group2 = sortedLists[i][axis].split(splitIndex);

                    group1.mbr = new Mbr(group1);
                    group2.mbr = new Mbr(group2);

                    var area = group1.mbr.area + group2.mbr.area;
                    var perimeter = group1.mbr.perimeter + group2.mbr.perimeter;
                    var overlap = group1.mbr.getOverlap(group2.mbr);

                    var group = [group1, group2];
                    group.area = area;
                    group.perimeter = perimeter;
                    group.overlap = overlap;
                    group.splitIndes = splitIndex;

                    perimeterSum += perimeter;

                    groups[k] = group;
                }

                sortedLists[i][axis].groups = groups;
            }

            if (perimeterSum < minPerimeterSum) {
                splitAxis = axis;
                perimeterSum = minPerimterSum;
            }
        }

        return splitAxis;
    },

    _getSplitGroups: function(sortedLists, axis) {
        var kMax = this._maxLength - 2 * this._minLength + 2;
        var splitI, splitK, minOverlap = Infinity, minArea;

        for (var i = 0; i < 2; i++) {
            for (var k = 0; k < kMax; k++) {
                var overlap = sortedLists[i][axis].groups[k].overlap;
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    splitI = i;
                    splitK = k;
                    minArea = sortedLists[i][axis].groups[k].area;
                } else if (overlap === minOverlap) {
                    var area = sortedLists[i][axis].groups[k].area;
                    if (area < minArea) {
                        splitI = i;
                        splitK = k;
                        minArea = area;
                    }
                }
            }
        }

        return sortedLists[splitI][axis].groups[splitK];
    }
};

Object.defineProperties(sGis.geoIndex.Node.prototype, {
    area: {
        get: function() {
            return this._mbr.area;
        }
    },

    mbr: {
        get: function() {
            return this._mbr;
        }
    }
});

var Mbr = function(objects) {
    var func = [Math.min, Math.max];
    this.coordinates = [[Infinity, Infinity], [-Infinity, -Infinty]];
    for (var i = 0, len = objects.length; i < len; i++) {
        var coordinates;
        if (utils.isArray(objects[i].coordinates[0])) {
            coordinates = objects[i].coordinates;
        } else {
            coordinates = [objects[i].coordinates, objects[i].coordinates];
        }

        for (var index1 = 0; index1 < 2; index1++) {
            for (var index2 = 0; index2 < 2; index2++) {
                this.coordinates[index1][index2] = func[index1](this.coordinates[index1][index2], coordinates[index1][index2]);
            }
        }
    }

    var dx = this.coordinates[1][0] - this.coordinates[0][0];
    var dy = this.coordinates[1][1] - this.coordinates[0][1];
    this._area = dx * dy;
    this._perimeter = 2 * (dx + dy);
};

Mbr.prototype = {
    getOverlap: function(mbr) {
        var overlaps = [];
        for (var i = 0; i < 2; i++) {
            overlaps[i] = Math.min(this.coordinates[0][i], mbr.coordinates[1][i]) - Math.max(this.coordinates[1][i], mbr.coordinates[0][i]);
            if (overlaps[i] <=0) return 0;
        }

        return overlaps[0] * overlaps[1];
    }
}

Object.defineProperties(Mbr.prototype, {
    area: {
        get: function() {
            this._area;
        }
    },

    perimeter: {
        get: function() {
            this._perimeter;
        }
    }
});

function getIntersectionIncrease(node, siblings, obj) {
    var totalOverlapIncrease = 0;
    for (var i = 0, len = siblings.length; i < len; i++) {
        if (siblings[i] !== node) {
            var overlapBefore = siblings[i].mbr.getOverlap(node.mbr);
            var newMbr = new Mbr([node.mbr, obj]);
            var overlapAfter = siblings[i].mbr.getOverlap(newMbr);
            totalOverlapIncrease += overlapAfter - overlapBefore;
        }
    }
    return totalOverlapIncrease;
}

function getAreaIncrease(node, obj) {
    var mbr1 = node.mbr;
    var mbr2 = new Mbr([mbr1, obj]);
    return mbr2.area - mbr1.area;
}

function getSortedLists(objects) {
    var lists = [];
    for (var i = 0; i < 2; i++) {
        lists[i] = [];
        for (var j = 0; j < 2; j++) {
            lists[i][j] = objects.slice().sort(function(a, b) {
                if (a.mbr[i][j] < b.mbr[i][j]) {
                    return -1;
                } else if (a.mbr[i][j] > b.mbr[i][j]) {
                    return 1;
                } else {
                    return 0
                }
            });
        }
    }

    return lists;
}

})();