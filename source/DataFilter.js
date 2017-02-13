sGis.module('spatialProcessor.DataFilter', ['serializer.symbolSerializer'], (serializer) => {

    'use strict';

    class DataFilter {
        constructor(options) {
            Object.assign(this, options);
        }

        static deserialize({ Title, Symbol, Condition, Labeling, MaxResolution, MinResolution, ChildFilters = []}) {
            return new DataFilter({
                condition: Condition,
                minResolution: MinResolution,
                maxResolution: MaxResolution,
                symbol: serializer.deserialize(Symbol, 'hex8'),
                labeling: Labeling,
                title: Title,
                childFilters: ChildFilters.map(x => DataFilter.deserialize(x))
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
