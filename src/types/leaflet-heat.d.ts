import * as L from 'leaflet';

declare module 'leaflet' {
  export function heatLayer(latlngs: Array<[number, number, number]>, options?: Record<string, unknown>): L.Layer;
}
