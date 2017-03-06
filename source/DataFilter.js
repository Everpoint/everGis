sGis.module('sp.DataFilter', [
    'serializer.symbolSerializer',
    'sp.Labeling',
    'sp.ClusterSymbol',
    'utils'
], (serializer, LabelingConst, ClusterSymbol, utils) => {

    'use strict';

    class DataFilter {
        constructor(options = {}) {
            Object.assign(this, options);
        }

        static deserialize({ Title, Symbol, Condition, Labeling, MaxResolution, MinResolution, ChildFilters, SerializationData}) {
            let serializationData = {};
            try {
                serializationData = utils.parseJSON(SerializationData) || {};
            } catch (e) {}

            let result = new DataFilter({
                condition: Condition,
                minResolution: MinResolution,
                maxResolution: MaxResolution,
                symbol: Symbol && serializer.deserialize(Symbol, 'hex8'),
                labeling: Labeling && new LabelingConst(Labeling) || new LabelingConst(),
                title: Title,
                childFilters: ChildFilters && ChildFilters.map(x => DataFilter.deserialize(x)) || [],
                serializationData: serializationData.serializationData
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
                SerializationData: { serializationData: this.serializationData }
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
            if (!this.childFilters || this.childFilters.length === 0) return null;
            if (this.childFilters[0] instanceof DataFilter) {
                return this.childFilters.map(child => child.serialize());
            } else {
                let base = new DataFilter({ condition: this.condition, symbol: this.symbol });
                let unfolded = [base];
                this.childFilters.forEach(child => {
                    unfolded = child.unfold(unfolded);
                });

                if (unfolded.length === 0) return null;
                return unfolded.map(child => child.serialize());
            }
        }

        clone() {
            return new DataFilter({
                title: this.title,
                condition: this.condition,
                minResolution: this.minResolution,
                maxResolution: this.maxResolution,
                symbol: this.symbol && this.symbol.clone(),
                labeling: this.labeling && this.labeling.clone() || new LabelingConst(),
                childFilters: this.childFilters.map(x => x.clone()),

                aggregations: this.aggregations && this.aggregations.slice(),

                serializationData: this.serializationData
            });
        }
    }

    Object.assign(DataFilter.prototype, {
        condition: null,
        minResolution: -1,
        maxResolution: -1,
        symbol: null,
        labeling: null,
        childFilters: [],
        title: null,

        aggregations: null,

        serializationData: null
    });

    return DataFilter;

});

sGis.module('sp.Labeling', [], () => {

    class Labeling {
        constructor(options = {}) {
            Object.assign(this, options);
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

    Object.assign(Labeling.prototype, defaultLabeling);

    return Labeling;
});