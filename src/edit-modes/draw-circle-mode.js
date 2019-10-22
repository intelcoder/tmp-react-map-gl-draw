// @flow

import type { Feature, ClickEvent, FeatureCollection, PointerMoveEvent } from '@nebula.gl/edit-modes';
import uuid from 'uuid/v1';
import type { ModeProps } from '../types';

import { EDIT_TYPE, GEOJSON_TYPE, GUIDE_TYPE, RENDER_TYPE } from '../constants';
import BaseMode from './base-mode';
import { getFeatureCoordinates, createCircle } from './utils';

export default class DrawCircleMode extends BaseMode {
  handlePointerMove = (event: PointerMoveEvent, props: ModeProps<FeatureCollection> ) => {
    let tentativeFeature = this.getTentativeFeature();
    const clickSequence = this.getClickSequence()

    if(clickSequence.length < 1) {
      return null
    }
    const centerCoordinates = clickSequence[0].mapCoords;

    const properties = {
      id: uuid(),
      renderType: RENDER_TYPE.CIRCLE,
      guideType: GUIDE_TYPE.TENTATIVE,

    }
    const circleFeature = createCircle(
      centerCoordinates,
      event.mapCoords,
      properties,
    )
    this.setTentativeFeature(circleFeature)
  }
  handleClick = (event: ClickEvent, props: ModeProps<FeatureCollection>) => {
    const { data } = props;
    this._clickSequence.push(event)
    let tentativeFeature = this.getTentativeFeature();

    if(this._clickSequence.length === 2) {
      const coordinates = getFeatureCoordinates(tentativeFeature);

      tentativeFeature = {
        type: 'Feature',
        properties: {
          // TODO deprecate id
          id: tentativeFeature.properties.id,
          renderType: RENDER_TYPE.CIRCLE,
          centerCoordinates: this._clickSequence[0].mapCoords
        },
        geometry: {
          type: GEOJSON_TYPE.CIRCLE,
          coordinates,
        }
      };
      const updatedData = data.addFeature(tentativeFeature).getObject();

      props.onEdit({
        editType: EDIT_TYPE.ADD_FEATURE,
        updatedData,
        editContext: null
      });
      this._clickSequence = []
      this.setTentativeFeature(null);
    }
  };

  getGuides = (props: ModeProps<FeatureCollection>) => {
    let tentativeFeature = this.getTentativeFeature();
    const coordinates = getFeatureCoordinates(tentativeFeature);
    if (!coordinates) {
      return null;
    }

    const event = props.lastPointerMoveEvent;
    // update tentative feature
    tentativeFeature = {
      type: 'Feature',
      properties: {
        // TODO deprecate id and renderType
        id: uuid(),
        guideType: GUIDE_TYPE.EDIT_HANDLE,
        renderType: RENDER_TYPE.CIRCLE
      },
      geometry: {
        type: GEOJSON_TYPE.CIRCLE,
        coordinates: coordinates
      }
    };

    const editHandles = this.getEditHandlesFromFeature(tentativeFeature);

    return {
      tentativeFeature,
      editHandles
    };
  };
}
