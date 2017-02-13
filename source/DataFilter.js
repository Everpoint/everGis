sGis.module('spatialProcessor.DataFilter', ['serializer.symbolSerializer', 'spatialProcessor.Labeling'], (serializer, LabelingConst) => {

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