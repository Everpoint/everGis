import {DynamicLayer} from "sgis/layers/DynamicLayer";

export class SpDynamicLayer extends DynamicLayer {
    _service: any;

    constructor(service) {
        super();
        this._service = service;
    }

    getUrl(bbox, resolution) {
        let imgWidth = Math.round((bbox.xMax - bbox.xMin) / resolution);
        let imgHeight = Math.round((bbox.yMax - bbox.yMin) / resolution);
        let sr = bbox.crs.toString();

        return this._service.url + 'export?' +
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