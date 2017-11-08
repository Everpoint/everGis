import {ClusterSymbol} from "./layers/ClusterLayer";
import {parseJSON} from "./utils";
import * as serializer from "sgis/dist/serializers/symbolSerializer";
import {isString} from "sgis/dist/utils/utils";

export class DataFilter {
    condition = null;
    minResolution = -1;
    maxResolution = -1;
    symbol = null;
    labeling = null;
    childFilters = [];
    title = null;

    aggregations = null;

    serializationData = null;

    constructor(options = {}) {
        Object.assign(this, options);
    }

    static deserialize({ Title, Symbol, Condition, Labeling: LabelingConst, MaxResolution, MinResolution, ChildFilters, SerializationData}) {
        let serializationData = <any>{};
        try {
            serializationData = parseJSON(SerializationData) || {};
        } catch (e) {}

        let result = new DataFilter({
            condition: Condition,
            minResolution: MinResolution,
            maxResolution: MaxResolution,
            symbol: Symbol && serializer.deserialize(Symbol, 'hex8'),
            labeling: LabelingConst && new Labeling(LabelingConst) || new Labeling(),
            title: Title,
            childFilters: ChildFilters && ChildFilters.map(x => DataFilter.deserialize(x)) || [],
            serializationData: serializationData.serializationData || {}
        });

        if (serializationData.clusterSymbol) {
            result.symbol = new ClusterSymbol(serializationData.clusterSymbol);
            result.labeling = serializationData.clusterLabel;
            result.aggregations = serializationData.aggregations;
        }

        return result;
    }

    serialize() {
        let serialized = {
            Title: this.title,
            Symbol: null,
            Condition: this.condition,
            Labeling: null,
            MaxResolution: this.maxResolution,
            MinResolution: this.minResolution,
            ChildFilters: null,
            SerializationData: <any>{ serializationData: this.serializationData }
        };

        if (this.symbol instanceof ClusterSymbol) {
            serialized.SerializationData.clusterSymbol = this.symbol.serialize();
            serialized.SerializationData.clusterLabel = this.labeling && this.labeling.serialize();
            serialized.SerializationData.aggregations = this.aggregations;
        } else {
            serialized.Symbol = this.symbol && serializer.serialize(this.symbol, 'hex');
            serialized.Labeling = this.labeling && this.labeling.serialize();
        }

        serialized.ChildFilters = this._serializeChildren();

        serialized.SerializationData = JSON.stringify(serialized.SerializationData);

        return serialized;
    }

    _serializeChildren() {
        if (!this.childFilters) return null;
        return this.childFilters.map(child => child.serialize());
    }

    clone() {
        return new DataFilter({
            title: this.title,
            condition: this.condition,
            minResolution: this.minResolution,
            maxResolution: this.maxResolution,
            symbol: this.symbol && this.symbol.clone(),
            labeling: this.labeling && this.labeling.clone() || new Labeling(),
            childFilters: this.childFilters.map(x => x.clone()),

            aggregations: this.aggregations && this.aggregations.slice(),

            serializationData: {}
        });
    }
}

export class Labeling {
    fieldFormat = 'Текст подписи';
    attributes = [];
    fontName = 'Arial';
    fontSize = 10;
    fontStyle = null;
    fontWeight = 300;
    fontColor = '#ff000000';
    background = '#ffffffff';
    border = {
        Brush: '#ffffffff',
        Thickness: 1
    };
    borderRadius = 0;
    showBox = true;
    boxMaxWidth = 128;
    boxMargin = 3;
    horizontalAlignment = 'Center';
    verticalAlignment = 'Bottom';
    offset = [3,3];
    offsetFromSymbol = true;
    isActive = false;
    isBoxDisplayed = true;

    constructor(options: any = {}) {
        Object.assign(this, options);
        if (options.fieldFormat) this.isActive = true;
        if (options.offset && isString(options.offset)) {
            let arr = options.offset.split(' ');
            if (arr.length === 2) this.offset = arr;
        }
    }

    clone() {
        let copy = new Labeling();
        Object.keys(defaultLabeling).forEach(key => {
            copy[key] = this[key];
            if (key === 'border') copy[key] = {
                Brush: this.border.Brush,
                Thickness: this.border.Thickness
            };
        });
        return copy;
    }

    serialize() {
        if (!this.isActive) return null;

        let result = {};
        Object.keys(defaultLabeling).forEach(key => {
            result[key] = this[key];
            if (key === 'border') result[key] = {
                Brush: this.border.Brush,
                Thickness: this.border.Thickness
            };
        });

        return result;
    }
}

let defaultLabeling = {
    fieldFormat: 'Текст подписи',
    attributes: [],
    fontName: 'Arial',
    fontSize: 10,
    fontStyle: null,
    fontWeight: 300,
    fontColor: '#ff000000',
    background: '#ffffffff',
    border: {
        Brush: '#ffffffff',
        Thickness: 1
    },
    borderRadius: 0,
    showBox: true,
    boxMaxWidth: 128,
    boxMargin: 3,
    horizontalAlignment: 'Center',
    verticalAlignment: 'Bottom',
    offset: [3,3],
    offsetFromSymbol: true,
    isActive: false,
    isBoxDisplayed: true
};
