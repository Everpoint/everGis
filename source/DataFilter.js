sGis.module('spatialProcessor.DataFilter', [
    'serializer.symbolSerializer',
    'spatialProcessor.Labeling',
    'spatialProcessor.ClusterSymbol'
], (serializer, LabelingConst, ClusterSymbol) => {

    'use strict';

    class DataFilter {
        constructor(options = {}) {
            Object.assign(this, options);
        }

        static deserialize({ Title, Symbol, Condition, Labeling, MaxResolution, MinResolution, ChildFilters = []}) {
            return new DataFilter({
                condition: Condition,
                minResolution: MinResolution,
                maxResolution: MaxResolution,
                symbol: Symbol && serializer.deserialize(Symbol, 'hex8'),
                labeling: Labeling && new LabelingConst(Labeling) || new LabelingConst(),
                title: Title,
                childFilters: ChildFilters.map(x => DataFilter.deserialize(x))
            });
        }

        serialize() {
            let serialized = {
                Title: this.title,
                Symbol: null,
                Condition: this.condition,
                Labeling: null,
                MaxResolution: this.maxResolution,
                MinResolution: this.minResolution,
                ChildFilters: null
            };

            if (this.symbol instanceof ClusterSymbol) {
                this.symbol.classifiers = this.childFilters;
                return serialized;
            }

            serialized.Symbol = this.symbol && serializer.serialize(this.symbol, 'hex');
            serialized.Labeling = this.labeling && this.labeling.serialize();
            serialized.ChildFilters = this._serializeChildren();

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
                condition: this.condition,
                minResolution: this.minResolution,
                maxResolution: this.maxResolution,
                symbol: this.symbol && this.symbol.clone(),
                labeling: this.labeling && this.labeling.clone() || new LabelingConst(),
                childFilters: this.childFilters.map(x => x.clone()),
                customDisplaySettings: this.customDisplaySettings
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
        customDisplaySettings: null
    });

    return DataFilter;

});

sGis.module('spatialProcessor.dataFilter.Classifier', ['utils.Color'], (Color) => {

    'use strict';

    class Classifier {
        constructor(options = {}) {
            Object.assign(this, options);
        }

        unfold(baseFilters) {
            let result = [];
            baseFilters.forEach(base => {
                result = result.concat(this._unfold(base));
            });

            return result;
        }

        _unfold(base) {
            if (!this.values) return [];
            return this.values.map(val => {
                let clone = base.clone();

                let condition = [];
                if (clone.condition) conditions.push(clone.consitions);
                let titles = [];
                if (clone.title) titles.push(clone.title);

                if (val.attributeValue) {
                    condition.push(`${this.attributeName}==${formatVal(val.attributeValue)}`);
                    titles.push(`${this.attributeName}: ${val.attributeValue}`)
                }
                if (val.attributeMinValue && isFinite(val.attributeMinValue)) {
                    condition.push(`${this.attributeName}>=${formatVal(val.attributeMinValue)}`);
                    titles.push(`${this.attributeName} > ${val.attributeMinValue}`)
                }
                if (val.attributeMaxValue && isFinite(val.attributeMaxValue)) {
                    condition.push(`${this.attributeName}<${formatVal(val.attributeMaxValue)}`);
                    titles.push(`${this.attributeName} < ${val.attributeMaxValue}`)
                }

                clone.condition = condition.join(' && ');
                clone.symbol[this.propertyName] = this.propertyType === 'color' ? formatColor(val.propertyValue) : val.propertyValue;
                clone.title = titles.join('\n');

                return clone;
            });
        }

        get title() { return 'Классификатор: ' + this.propertyName; }
    }

    function formatVal(val) {
        if (typeof val === 'string') return `"${val}"`;
        return val;
    }

    function formatColor(colorString) {
        let color = new Color(colorString);
        if (color.isValid) return color.toString('hex');
        return colorString;
    }

    Object.assign(Classifier.prototype, {
        propertyName: null,
        propertyType: null,
        attributeName: null,
        values: null
    });

    return Classifier;

});

sGis.module('spatialProcessor.Labeling', [], () => {

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