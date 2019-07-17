import {FeatureParams} from "@evergis/sgis/es/features/Feature";
import {PointFeature} from "@evergis/sgis/es/features/PointFeature";
import {Coordinates} from "@evergis/sgis/es/baseTypes";

export interface ClusterFeatureParams extends FeatureParams {
  objectCount: number;
  aggregations: any;
  setNo: number;
  ids: number[];
  boundingPolygon: any;
}

export class ClusterFeature extends PointFeature {
  objectCount: number;
  aggregations: any;
  setNo: number;
  ids: number[];
  boundingPolygon: any;

  constructor(position: Coordinates, {objectCount, aggregations, setNo, ids, boundingPolygon, ...params}: ClusterFeatureParams) {
    super(position, params);
    this.objectCount = objectCount;
    this.aggregations = aggregations;
    this.setNo = setNo;
    this.ids = ids;
    this.boundingPolygon = boundingPolygon;
  }
}