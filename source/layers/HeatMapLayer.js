sGis.module('sp.layers.HeatMapLayer', [
    'DynamicLayer'
], (DynamicLayer) => {

    class HeatMapLayer extends DynamicLayer {
        constructor(service) {
            super(getImageUrl, service.crs);

            this._service = service;

            let self = this;
            function getImageUrl(bbox, resolution) {
                return self.getImageUrl(bbox, resolution);
            }
        }

        getImageUrl(bbox, resolution) {
            let imgWidth = Math.round((bbox.xMax - bbox.xMin) / resolution);
            let imgHeight = Math.round((bbox.yMax - bbox.yMin) / resolution);
            let sr = encodeURIComponent(bbox.crs.wkid || JSON.stringify(bbox.crs.description));

            return this._service.url + 'heatmap?' +
                'dpi=96&' +
                'transparent=true&' +
                'bbox=' +
                bbox.xMin + '%2C' +
                bbox.yMin + '%2C' +
                bbox.xMax + '%2C' +
                bbox.yMax + '&' +
                'bboxSR=' + sr + '&' +
                'imageSR=' + sr + '&' +
                'size=' + imgWidth + '%2C' + imgHeight + '&' +
                'f=image' + this._service.connector.sessionSuffix;
        }
    }

    return HeatMapLayer;

});