import {IPoint} from "@evergis/sgis/es/Point";
import {Map} from "@evergis/sgis/es/Map";
import {MapService} from "../../services/MapService";
import {TileService} from "../../services/TileService";

export interface PrintingTemplate {
    Name: string,
    BindingGroups: any[],
}

export interface PrintParameters {
    map: Map,
    services: MapService[],
    template: PrintingTemplate,

    position?: IPoint,
    dpi?: number,
    resolution?: number,
    paperSize?: {
        width: number,
        height: number
    },
    margin?: {
        left: number,
        top: number,
        right: number,
        bottom: number
    },
}

export function getServerPrintDescription({
    map, services, template,
    position, resolution,
      dpi = 96,
      paperSize = {
          width: 210,
          height: 297
      },
      margin = {
          left: 10,
          top: 10,
          right: 10,
          bottom: 10
      }
    }: PrintParameters) {

    let description = <any>{
        ServiceStateDefinition: [],
        MapCenter: {
            X: position ? position.x : map.centerPoint.x,
            Y: position ? position.y : map.centerPoint.y
        },
        SpatialReference: map.crs.toString(),
        Dpi: dpi,
        Resolution: resolution || map.resolution,
        PaperSize: {
            Width: paperSize.width,
            Height: paperSize.height
        },
        Margin: {
            Left: margin.left,
            Top: margin.top,
            Right: margin.right,
            Bottom: margin.bottom
        },
        PrintingTemplateName: template.Name,
        Parameters: []
    };

    for (let i = 0, len = template.BindingGroups.length; i < len; i++) {
        description.Parameters = description.Parameters.concat(template.BindingGroups[i].Parameters);
    }

    for (let i = 0, len = services.length; i < len; i++) {
        let service = services[i];
        if (service instanceof TileService && service.activeTileSets && service.activeTileSets.length > 0) {
            service.activeTileSets.forEach(setId => {
                description.ServiceStateDefinition.push({
                    UniqueName: service.name ,
                    Opactiy: service.layer.opacity,
                    IsVisible: service.isDisplayed,
                    Title: service.name,
                    CustomParameters: {"tileSetId": setId},
                    Layers: [{ LayerId: -1, LegendItemId: -1, Children: [] }]
                });
            });
        } else {
            description.ServiceStateDefinition.push({
                UniqueName: service.name ,
                Opactiy: service.layer.opacity,
                IsVisible: service.isDisplayed,
                Title: service.name,
                CustomParameters: {},
                Layers: [{ LayerId: -1, LegendItemId: -1, Children: [] }]
            });
        }
    }

    description.Legend = {
        LayerId: -1,
        LegendItemId: -1,
        Children: services.filter(x => x.hasLegend).map(x => {
            return {
                Name: x.alias || x.name,
                ServiceFullName: x.name
            };
        })
    };

    return description;
}
