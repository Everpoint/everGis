import {Crs, ellipticalMercator, webMercator, wgs84, geo} from "sgis/dist/Crs";
import {Polygon} from "sgis/dist/features/Polygon";
import {BrushFill} from "sgis/dist/symbols/polygon/BrushFill";
import {PolygonSymbol} from "sgis/dist/symbols/polygon/Simple";
import {PolylineSymbol} from "sgis/dist/symbols/PolylineSymbol";
import {Polyline} from "sgis/dist/features/Polyline";
import {MaskedImage} from "sgis/dist/symbols/point/MaskedImage";
import {PointSymbol} from "sgis/dist/symbols/point/Point";
import {SquareSymbol} from "sgis/dist/symbols/point/Square";
import {PointFeature} from "sgis/dist/features/Point";
import {MultiPoint} from "sgis/dist/features/MultiPoint";
import {Color} from "sgis/dist/utils/Color";
import {parseXmlJsonNode} from "../utils";
import {isArray, getGuid} from "sgis/dist/utils/utils";
import {StaticImageSymbol} from "sgis/dist/symbols/point/StaticImageSymbol";

export let xmlSerializer = <any>{};

xmlSerializer.deserializeFeatures = function(response) {
    return createFeatures(response);
};

const DEFAULT_VD = {
    point: {
        shape: 'Circle',
        size: 10,
        fill: '#00000000',
        color: '#00000000',
        strokeThickness: 1
    },
    polyline: {
        color: '#00000000',
        strokeThickness: 1
    },
    polygon: {
        fill: '#00000000',
        color: '#00000000',
        strokeThickness: 1
    }
};

function parseCrs(desc) {
    if (desc && crsMapping[desc]) {
        return crsMapping[desc];
    } else if (desc && desc.wkid && crsMapping[desc.wkid]) {
        return crsMapping[desc.wkid];
    } else if (desc && desc.wkid === 0) {
        return null;
    } else {
        return new Crs(desc);
    }
}

let crsMapping = {
    '102100': webMercator,
    '102113': webMercator,
    '3857': webMercator,
    '3395': ellipticalMercator,
    '84': wgs84,
    '4326': geo
};

function createFeatures(response) {
    var features = [];
    if (response.objects) {
        for (var i in response.objects) {
            var object = response.objects[i];
            let visualDefinition = object.visualDefinition || object.geometry && DEFAULT_VD[object.geometry.data.type];
            if (object.geometry && visualDefinition) {
                var geometry = object.geometry.data,
                    points = geometry.coordinates,
                    attributes = object.attributes,
                    color = visualDefinition.stroke ? parseColor(visualDefinition.stroke) : undefined,
                    fillColor = visualDefinition.fill ? visualDefinition.fill : undefined;

                var serverCrs = object.geometry.data.crs;
                var crs = parseCrs(serverCrs);

                var idAttribute = response.attributesDefinitions[object.attributesDefinition]._identity;
                var id = parseInt(object.attributes[idAttribute].value);

                if (geometry.type === 'polygon') {
                    var feature = <any>new Polygon(points, {crs: crs}, {id: id, attributes: attributes});
                    if (fillColor && fillColor.brush) {
                        feature.symbol = new BrushFill({
                            strokeWidth: parseFloat(visualDefinition.strokeThickness),
                            strokeColor: color,
                            fillBrush: fillColor.brush,
                            fillForeground: parseColor(fillColor.foreground),
                            fillBackground: parseColor(fillColor.background)
                        });
                    } else {
                        feature.symbol = new PolygonSymbol({
                            strokeWidth: parseFloat(visualDefinition.strokeThickness),
                            strokeColor: color,
                            fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                        });
                    }
                } else if (geometry.type === 'polyline') {
                    let symbol = new PolylineSymbol({ strokeColor: color, strokeWidth: parseFloat(visualDefinition.strokeThickness)});
                    feature = new Polyline(points, {crs, symbol}, {id, attributes});
                } else if (geometry.type === 'point' || geometry.type === 'multipoint') {
                    var symbol;

                    if (visualDefinition.maskSrc) {
                        symbol = new MaskedImage({
                            imageSource: visualDefinition.imageSrc,
                            maskSource: visualDefinition.maskSrc,
                            width: parseFloat(visualDefinition.size),
                            height: null,
                            anchorPoint: [visualDefinition.anchorPoint.x, visualDefinition.anchorPoint.y]
                        });
                    } else if (visualDefinition.imageSrc) {
                        symbol = new StaticImageSymbol({
                            source: visualDefinition.imageSrc,
                            width: parseFloat(visualDefinition.size),
                            height: null,
                            anchorPoint: [visualDefinition.anchorPoint.x, visualDefinition.anchorPoint.y]
                        });
                    } else if (visualDefinition.shape === 'Circle') {
                        symbol = new PointSymbol({
                            size: parseFloat(visualDefinition.size),
                            fillColor: fillColor ? parseColor(fillColor) : 'transparent',
                            strokeColor: color,
                            strokeWidth: parseFloat(visualDefinition.strokeThickness)
                        });
                    } else {
                        symbol = new SquareSymbol({
                            size: parseFloat(visualDefinition.size),
                            strokeWidth: parseFloat(visualDefinition.strokeThickness),
                            strokeColor: color,
                            fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                        });
                    }

                    var featureClass = geometry.type === 'point' ? PointFeature : MultiPoint;
                    if (geometry.type === 'multipoint') points = points[0];
                    feature = new (<any>featureClass)(points, {crs: crs, symbol: symbol}, {id: id, attributes: attributes});
                }
            }

            if (feature && response.attributesDefinitions && object.attributesDefinition) {
                feature.displayField = response.attributesDefinitions[object.attributesDefinition]._display;
                feature.visualDefinitionId = object.visualDefinitionId;
                feature.generatorId = object.generatorId;
                features.push(feature);
            }
        }
    }

    return features;
}

function parseColor(color) {
    var c = new Color(color);
    return c.toString();
}

xmlSerializer.deserialize = function(xml) {
    var parser = new DOMParser(),
        nodes = parser.parseFromString(xml, 'text/xml'),
        parsed = {};

    serialize(nodes, parsed);

    return parsed;
};

function serialize(nodes, parsed, reference=null) {
    for (var i in nodes.childNodes) {
        var tagName = nodes.childNodes[i].tagName;
        if (serializer[tagName]) {
            serializer[tagName](nodes.childNodes[i], parsed, reference);
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
            parsed.content = {};
            serialize(node, parsed.content);
        } else if (attributes.ContentType === 'JSON') {
            parsed.content = parseXmlJsonNode(node);
        } else if (attributes.ContentType === 'Text') {
            parsed.content = node.innerHTML || node.textContent;
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
        var attributesDefinition = <any>{},
            names = {
                Name: 'name',
                Alias: 'alias',
                Type: 'type',
                Size: 'size',
                Editable: 'isEditable'
            };

        var parameters = getNodeAttributes(node);
        attributesDefinition._identity = parameters.Identity;
        attributesDefinition._display = parameters.Display;

        for (var i in node.childNodes) {
            var attributeInfo = node.childNodes[i];
            if (!attributeInfo.attributes) continue;

            var fields = <any>{};

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
            symbol: 'SimplePolygonSymbol',
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
            symbol: 'SimplePolylineSymbol',
            strokeThickness: attributes.StrokeThickness,
            opacity: attributes.Opacity,
            stroke: parsed.brush[attributes.Stroke].color
        };
    },

    SimplePointSymbol: function(node, parsed) {
        if (!parsed.symbol) parsed.symbol = {};

        var attributes = getNodeAttributes(node);
        parsed.symbol[attributes.Key] = {
            symbol: 'SimplePointSymbol',
            size: attributes.Size === '0' ? 10 : attributes.Size,
            strokeThickness: attributes.StrokeThickness,
            fill: parsed.brush[attributes.Fill].color,
            stroke: parsed.brush[attributes.Stroke] ? parsed.brush[attributes.Stroke].color : 'transparent',
            shape: attributes.Shape
        };
    },

    ImagePointSymbol: function(node, parsed) {
        if (!parsed.symbol) parsed.symbol = {};

        var attributes = getNodeAttributes(node);

        const maskSrc = parsed.image[attributes.MaskPixels];

        parsed.symbol[attributes.Key] = {
            symbol: 'ImagePointSymbol',
            size: attributes.Size === '0' ? 10 : attributes.Size,
            color: attributes.Color,
            anchorPoint: [attributes.AnchorPointX, attributes.AnchorPointY],
            imageSrc: parsed.image[attributes.Pixels].dataUrl,
            maskSrc: maskSrc && maskSrc.dataUrl
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

        var attributeDefinition = parsed.attributesDefinitions[parentObject.attributesDefinition][nodeAttributes.Name];
        if (!attributeDefinition) return;

        let value;
        if (attributeDefinition.type === 'System.DateTime' && nodeAttributes.Value) {
            value = new Date(parseInt(nodeAttributes.Value));
            if (isNaN(value.getTime())) value = null;
        } else {
            value = nodeAttributes.Value;
        }

        parentObject.attributes[nodeAttributes.Name] = {
            title: attributeDefinition.alias || nodeAttributes.Name,
            value: value,
            type: attributeDefinition.type,
            size: attributeDefinition.size || 0,
            domain: attributeDefinition.domain,
            isEditable: attributeDefinition.isEditable === 'True'
        };
    },

    Geometry: function(node, parsed, parentObject) {
        if (parsed.geometryType === 'json') {
            var attributes = getNodeAttributes(node),
                jsonData = parseXmlJsonNode(node),
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

function getNodeAttributes(node): any {
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

let tempId = -1;

export const serializeGeometry = function(features) {
    var formatedData = getFormatedData(features);
    return getXML(formatedData);
};

xmlSerializer.serializeGeometryEdit = function(editDescription, attributesOnly, ignoreSymbol) {
    tempId = -1;
    var featureList = [];
    for (var i in editDescription) {
        if (isArray(editDescription[i]) && i !== 'deleted') featureList = featureList.concat(editDescription[i]);
    }

    var formatedData = getFormatedData(featureList, attributesOnly);
    return addTitle(getXML(formatedData, editDescription, attributesOnly, ignoreSymbol));
};

function addTitle(xml) {
    return '<?xml version="1.0" encoding="utf-8"?>' + xml;
}

export const serializeSymbols = function(symbols) {
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

export const serializeAttributes = function(attributes) {
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
    point: PointFeature,
    polyline: Polyline,
    polygon: Polygon
};

function getXML(data, editDescription = null, attributesOnly = false, ignoreSymbol = false) {
    var xml = getNewXMLDocument(),
        dataNode = xml.getElementsByTagName('Data')[0];

    dataNode.appendChild(getSerializerGeometricSettingsNode(xml));
    dataNode.appendChild(getSerializerCalloutSettingsNode(xml));
    dataNode.appendChild(getResourcesNode(data, xml, attributesOnly, ignoreSymbol));
    dataNode.appendChild(getVisualObjectsNode(data, xml, attributesOnly, ignoreSymbol));
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
    if (isArray(editDescription.added)) {
        for (var i in editDescription.added) {
            node.appendChild(getAddObjectNode(editDescription.added[i], xml));
        }
    }
    if (isArray(editDescription.updated)) {
        for (var i in editDescription.updated) {
            node.appendChild(getUpdateObjectNode(editDescription.updated[i], xml, attributesOnly));
        }
    }
    if (isArray(editDescription.deleted)) {
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

function getDeleteObjectNode(id, xml) {
    var node = xml.createElement('DeleteObject');
    setNodeAttributes(node, {
        Id: id
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

function getResourcesNode(data, xml, attributesOnly = false, ignoreSymbol = false) {
    var node = xml.createElement('Resources');
    for (var i in data.resources.attributesDefinitions) {
        node.appendChild(getAttributesDefinitionNode(data.resources.attributesDefinitions[i], i, xml));
    }

    if (!attributesOnly && !ignoreSymbol) {
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

    var attributes = <any>{Key: key, Display: 'Name'};
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
        Id: getGuid()
    });

    return node;
}

function getVisualObjectsNode(data, xml, attributesOnly, ignoreSymbol) {
    var node = xml.createElement('VisualObjects');
    for (var i in data.visualObjects) {
        if (data.visualObjects.hasOwnProperty(i)) {
            node.appendChild(getGeometricNode(data.visualObjects[i], xml, attributesOnly, ignoreSymbol));
        }
    }

    return node;
}

function getGeometricNode(visualObject, xml, attributesOnly, ignoreSymbol) {
    var node = xml.createElement('Geometric');

    if (visualObject.feature.id === undefined) visualObject.feature.id = tempId--;

    var nodeAttributes = <any>{
        Id: visualObject.feature.id,
        AttributesDefinition: visualObject.attributesIndex
    };

    if (!attributesOnly && !ignoreSymbol) {
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
    var type = getGeometryType(feature);
    setNodeAttributes(node, {Type: type});

    var geometryJSON = <any>{
        type: getCoordinatesType(feature),
        sr: feature.crs.toString()
    };

    if (feature instanceof PointFeature) {
        geometryJSON.x = feature.x;
        geometryJSON.y = feature.y;
    } else if (feature instanceof MultiPoint) {
        geometryJSON.v = [feature.coordinates];
    } else {
        geometryJSON.v = feature.rings;
    }

    var text = JSON.stringify(geometryJSON),
        textNode = xml.createTextNode(text);
    node.appendChild(textNode);
    return node;
}

function getGeometryType(feature) {
    if (feature instanceof MultiPoint) return 'MultiPoint';
    if (feature instanceof PointFeature) return 'Point';
    if (feature instanceof Polyline) return 'Line';
    if (feature instanceof Polygon) return 'Poly';
}

function getCoordinatesType(feature) {
    if (feature instanceof MultiPoint) return 'multipoint';
    if (feature instanceof PointFeature) return 'point';
    if (feature instanceof Polyline) return 'polyline';
    if (feature instanceof Polygon) return 'polygon';
}

function getAttributesNode(visualObject, xml) {
    var node = xml.createElement('Attributes');
    for (var i in visualObject.feature.attributes) {
        node.appendChild(getAttributeNode(visualObject.feature.attributes[i], i, xml));
    }

    return node;
}

function getAttributeNode(attribute, name, xml) {
    var node = xml.createElement('Attribute'),
        attributes = <any>{Name: name};

    if (attribute.value instanceof Date) {
        attributes.Value = attribute.value.getTime();
    } else if (attribute.value !== undefined) {
        attributes.Value = attribute.value;
    }


    setNodeAttributes(node, attributes);

    return node;
}

function setNodeAttributes(node, attributes) {
    for (var i in attributes) {
        if (attributes[i] !== "" && attributes[i] !== undefined) node.setAttribute(i, attributes[i]);
    }
}

function getFormatedData(features, attributesOnly = false) {
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
    var symbol = feature.originalSymbol;

    if (feature.type === 'point') {
        if ((symbol instanceof StaticImageSymbol)) {
            newSymbol = {
                Pixels: getImageIndex(symbol.source, resources),
                AnchorPointX: symbol.anchorPoint[0],
                AnchorPointY: symbol.anchorPoint[1],
                Size: symbol.width,
                Color: '#7f64c800',
                MaskPixels: '-1',
                type: 'ImagePointSymbol'
            };
        } else if (symbol instanceof PointSymbol) {
            newSymbol = {
                Opacity: 1,
                Size: symbol.size,
                Fill: getBrushIndex(symbol.fillColor, resources),
                Stroke: getBrushIndex(symbol.strokeColor, resources),
                StrokeThickness: symbol.strokeWidth,
                Shape: 'Circle',
                type: symbolTypes[feature.type]
            };
        } else {
            newSymbol = {
                Opacity: 1,
                Size: symbol.size,
                Fill: getBrushIndex(symbol.fillColor, resources),
                Stroke: getBrushIndex(symbol.strokeColor, resources),
                StrokeThickness: symbol.strokeWidth,
                Shpae: 'Square',
                type: symbolTypes[feature.type]
            };
        }
    } else if (symbol instanceof BrushFill) {
        newSymbol = {
            StrokeThickness: symbol.strokeWidth,
            Opacity: 1,
            Fill: getHatchBrushIndex(symbol, resources),
            Stroke: getBrushIndex(symbol.strokeColor, resources),
            type: symbolTypes[feature.type]
        };
    } else if (symbol instanceof PolylineSymbol) {
        newSymbol = {
            StrokeThickness: symbol.strokeWidth ? symbol.strokeWidth : 1,
            Opacity: 1,
            Stroke: getBrushIndex(symbol.strokeColor, resources),
            type: symbolTypes[feature.type]
        };
    } else {
        newSymbol = {
            StrokeThickness: symbol.strokeWidth ? symbol.strokeWidth : 1,
            Opacity: 1,
            Fill: getBrushIndex(symbol.fillColor ? symbol.fillColor : feature.strokeColor, resources),
            Stroke: getBrushIndex(symbol.strokeColor, resources),
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
    var c = new Color(color);
    return c.toString('hex');
}
