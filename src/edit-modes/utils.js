// @flow

import type { MjolnirEvent } from 'mjolnir.js';
import type { Feature, Position } from '@nebula.gl/edit-modes';

import circle from '@turf/circle'
import distance from '@turf/distance'

import { GEOJSON_TYPE } from '../constants';

export function isNumeric(val: any) {
  return !Array.isArray(val) && !isNaN(parseFloat(val)) && isFinite(val);
}

export function parseEventElement(evt: MjolnirEvent) {
  const elem = evt.target;
  if (!elem || !elem.dataset || !elem.dataset.type) {
    return null;
  }

  const type = elem.dataset.type;
  const featureIndex = elem.dataset.featureIndex;
  const index = elem.dataset.index;

  return {
    object: {
      type,
      index: isNumeric(index) ? Number(index) : undefined,
      featureIndex: isNumeric(featureIndex) ? Number(featureIndex) : undefined
    },
    index
  };
}

export function getScreenCoords(evt: MjolnirEvent) {
  const {
    offsetCenter: { x, y }
  } = evt;
  return [Number(x), Number(y)];
}

export function findClosestPointOnLineSegment(p1: Position, p2: Position, p: Position) {
  // line
  const k = (p2[1] - p1[1]) / (p2[0] - p1[0]);
  const b = p1[1] - k * p1[0];

  // vertical line
  if (!isFinite(k)) {
    const q = [p1[0], p[1]];
    return inBounds(p1, p2, q) ? q : null;
  }

  // p is on line [p1, p2]
  if (p[0] * k + b - p[1] === 0) {
    return inBounds(p1, p2, p) ? p : null;
  }

  const qx = (k * p[1] + p[0] - k * b) / (k * k + 1);
  const qy = k * qx + b;

  return inBounds(p1, p2, [qx, qy]) ? [qx, qy] : null;
}


export function getCircleEditHandleCoordinate(coordinates) {
 if(coordinates.length < 4) return []
 const editHandleCoordinates = []
 const points = Math.ceil(coordinates.length / 4)
 const arr = new Array(4)

 for(let i = 0; i < arr.length; i++) {
   let targetIndex = (i * points)
   if(coordinates[targetIndex]) {
     editHandleCoordinates.push(coordinates[targetIndex])
   }
 }
 return editHandleCoordinates
}


export function createCircle(
  centerPoint: Position,
  mapCoords: Number,
  properties: Object = {},
  options: Object = {}
) {
 const radius = Math.max(distance(centerPoint, mapCoords), 0.001);
 let circleFeature = circle(centerPoint, radius, {
   ...options,
   steps: 64,
   properties,
 });

 circleFeature.geometry.type = GEOJSON_TYPE.CIRCLE;
 circleFeature.geometry.coordinates = circleFeature.geometry.coordinates[0];
 return circleFeature;
}

export function updateCircleRadius(feature: Feature, mapCoords: Position) {
   const properties = feature.properties;
   if (!properties.centerCoordinates) {
     return null;
   }
   const { centerCoordinates } = properties;
   return createCircle(centerCoordinates, mapCoords, properties);
}

export function getFeatureCoordinates(feature: Feature) {
  const coordinates = feature && feature.geometry && feature.geometry.coordinates;
  if (!coordinates) {
    return null;
  }

  const isPolygonal = feature.geometry.type === GEOJSON_TYPE.POLYGON;
  return isPolygonal ? coordinates[0] : coordinates;
}

export function updateRectanglePosition(
  feature: Feature,
  editHandleIndex: number,
  mapCoords: Position
) {
  const coordinates = getFeatureCoordinates(feature);
  if (!coordinates) {
    return null;
  }

  const points = coordinates.slice(0, 4);
  points[editHandleIndex % 4] = mapCoords;

  /*
  *   p0.x, p0.y (p0) ------ p2.x, p0.y (p1)
  *       |                      |
  *       |                      |
  *   p0.x, p2.y (p3) ----- p2.x, p2.y (p2)
  */
  const p0 = points[(editHandleIndex + 2) % 4];
  const p2 = points[editHandleIndex % 4];
  points[(editHandleIndex + 1) % 4] = [p2[0], p0[1]];
  points[(editHandleIndex + 3) % 4] = [p0[0], p2[1]];

  return feature.geometry.type === GEOJSON_TYPE.POLYGON ? [[...points, points[0]]] : points;
}

function inBounds(p1: Position, p2: Position, p: Position) {
  const bounds = [
    Math.min(p1[0], p2[0]),
    Math.max(p1[0], p2[0]),
    Math.min(p1[1], p2[1]),
    Math.max(p1[1], p2[1])
  ];

  return p[0] >= bounds[0] && p[0] <= bounds[1] && p[1] >= bounds[2] && p[1] <= bounds[3];
}
