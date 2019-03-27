import {PointSymbol} from "@evergis/sgis/symbols/point/Point";
import {HorizontalAlignment, VectorLabel, VerticalAlignment} from "@evergis/sgis/renders/VectorLabel";
import {Arc} from "@evergis/sgis/renders/Arc";
import * as symbolSerializer from "@evergis/sgis/serializers/symbolSerializer";
import {Symbol} from "@evergis/sgis/symbols/Symbol";
import {ClusterFeature} from "./ClusterFeature";

export interface ClusterSymbolParams {
  size?: number;

  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;

  clusterSize?: number;
  minSize?: number;
  maxSize?: number;

  sizeAggregationIndex?: number;
  sizeAggregationMaxValue?: number;
  pieAggregationIndex?: number;

  labelText?: string | "{__qty}";
  labelFormatter?: (feature: ClusterFeature) => string;

  gridSize?: number;

  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontColor?: string;
  fontWeight?: number;
  labelBackground?: string;
}

export class ClusterSymbol extends PointSymbol {
  private _sortedPieValues: (string | number)[];

  size = 50;

  fillColor = 'rgba(0, 183, 255, 1)';
  strokeColor = 'white';
  strokeWidth = 2;

  clusterSize = 10;

  minSize = 50;
  maxSize = 50;
  sizeAggregationIndex = -1;
  sizeAggregationMaxValue = 0;

  pieAggregationIndex = -1;

  gridSize = 100;

  labelText?: string;
  labelFormatter?: (feature: ClusterFeature) => string = formatCount;
  fontSize = 10;
  fontFamily: string;
  fontStyle: string;
  fontColor: string;
  fontWeight = 400;
  labelBackground?: string;

  _singleObjectSymbol = null;
  _pieGroups = {};

  constructor(properties: ClusterSymbolParams = {}) {
    super();

    if (properties) Object.assign(this, properties);
  }

  renderFunction(feature, resolution, crs) {
    if (this.singleObjectSymbol && feature.objectCount === 1) return this.singleObjectSymbol.renderFunction(feature, resolution, crs);

    let renders = super.renderFunction.call(this, feature, resolution, crs);
    this._applySizeClassifier(renders[0], feature);

    if (this.pieAggregationIndex >= 0) {
      let pieChart = this._applyChartClassifier(feature, renders[0].center, renders[0].radius);
      if (pieChart && pieChart.length > 0) {
        renders[0].radius -= this.clusterSize;
        renders = pieChart.concat(renders);
      }
    }

    if (this.labelBackground) {
      renders.push(this.renderLabelBackground(renders[0].center))
    }

    if (this.labelText || this.labelFormatter) {
      renders.push(this._renderLabel(renders[0].center, feature));
    }

    return renders;
  }

  renderLabelBackground(center) {
    return new Arc(center, {
      fillColor: this.labelBackground,
      strokeColor: "transparent",
      strokeWidth: 1,
      radius: (this.size / 2) * 0.54,
    });
  }

  _renderLabel(position, feature) {
    let text = "";

    if (this.labelText) {
      text = this.labelText.replace('{__qty}', feature.objectCount || '');
    }

    if (this.labelFormatter) {
      text = this.labelFormatter(feature);
    }

    return new VectorLabel({
      position,
      text,
      fontSize: this.fontSize,
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      fillColor: this.fontColor,
      fontWeight: this.fontWeight,
      strokeWidth: 0,
      horizontalAlignment: HorizontalAlignment.Center,
      verticalAlignment: VerticalAlignment.Middle
    });
  }

  _applySizeClassifier(circleRender, feature) {
    if (feature.objectCount === undefined || !this.minSize || !this.maxSize || !this.sizeAggregationMaxValue) return;

    let minSize = this.minSize;
    let maxSize = this.maxSize;
    let maxCount = this.sizeAggregationMaxValue;
    let value = this.sizeAggregationIndex <= 0 ? feature.objectCount : feature.aggregations[this.sizeAggregationIndex].value;
    let size = Math.min(this.maxSize, (minSize + value / maxCount * (maxSize - minSize)));
    circleRender.radius = size / 2;
  }

  _applyChartClassifier(feature, center, radius) {
    if (!feature.aggregations || !feature.aggregations[this.pieAggregationIndex]) return;
    let aggr = feature.aggregations[this.pieAggregationIndex];
    if (!aggr) return;

    let totalCount = aggr.reduce((sum, item) => sum + item.count, 0);
    if (!totalCount) return;

    let startAngle = -Math.PI / 2;

    let pies = {};
    Object.keys(this._pieGroups).forEach(key => pies[key] = 0);

    if (!this._sortedPieValues) this._sortPieGroups();

    aggr.forEach(distinct => {
      let pieValue;
      if (this._pieGroups[distinct.value]) {
        pieValue = distinct.value;
      } else {
        for (let i = 0; i < this._sortedPieValues.length; i++) {
          if (distinct.value > this._sortedPieValues[i]) continue;

          pieValue = this._sortedPieValues[i];
          break;
        }
      }
      if (pieValue === undefined) {
        pieValue = this._sortedPieValues[this._sortedPieValues.length - 1];
      }
      if (this._pieGroups[pieValue]) {
        pies[pieValue] += distinct.count;
      }
    });

    let renders = Object.keys(pies).filter(key => pies[key] > 0).map(key => {
      let count = pies[key];
      let angle = count / totalCount * Math.PI * 2;
      let fillColor = this._pieGroups[key] || this.fillColor;

      let arc = new Arc(center, {
        fillColor: fillColor,
        strokeColor: this.strokeColor,
        strokeWidth: this.strokeWidth,
        radius: radius,
        startAngle: startAngle,
        endAngle: startAngle + angle,
        isSector: true
      });

      startAngle += angle;
      return arc;
    });

    return renders;
  }

  resetClassification() {
    this.sizeAggregationIndex = -1;
    this.sizeAggregationMaxValue = 1;
    this.pieAggregationIndex = -1;
    this._pieGroups = {};
  }

  clearPieGroups() {
    this._pieGroups = {};
  }

  addPieGroup(attributeValue, color) {
    this._pieGroups[attributeValue] = color;
    this._sortPieGroups();
  }

  _sortPieGroups() {
    let keys = Object.keys(this._pieGroups);
    this._sortedPieValues = keys.map(key => isNaN(<any>key) ? key : parseFloat(key)).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  }

  clone() {
    return new ClusterSymbol(this.serialize());
  }

  serialize() {
    return {
      size: this.size,
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      clusterSize: this.clusterSize,
      minSize: this.minSize,
      maxSize: this.maxSize,
      sizeAggregationIndex: this.sizeAggregationIndex,
      sizeAggregationMaxValue: this.sizeAggregationMaxValue,
      pieAggregationIndex: this.pieAggregationIndex,
      _pieGroups: this._pieGroups,
      labelText: this.labelText,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontStyle: this.fontStyle,
      fontColor: this.fontColor,
      fontWeight: this.fontWeight,
      labelBackground: this.labelBackground,
      singleObjectSymbol: this.singleObjectSymbol && (this.singleObjectSymbol.serialize && this.singleObjectSymbol.serialize() || symbolSerializer.serialize(this.singleObjectSymbol)),
      gridSize: this.gridSize
    };
  }

  get singleObjectSymbol() {
    return this._singleObjectSymbol;
  }

  set singleObjectSymbol(symbol) {
    if (!symbol || symbol instanceof Symbol) {
      this._singleObjectSymbol = symbol;
    } else {
      this._singleObjectSymbol = symbolSerializer.deserialize(symbol);
    }
  }
}

function roundToDecimal(number: number) {
  return Math.round(number * 10) / 10;
}

function formatCount(feature: ClusterFeature): string {
  const count = feature.objectCount;

  if (count > 999999) {
    return String(roundToDecimal(count / 1000000)) + "M";
  }

  if (count > 999) {
    return String(roundToDecimal(count / 1000)) + "k";
  }

  return String(count);
}