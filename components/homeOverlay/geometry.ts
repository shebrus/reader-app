// Геометрические расчеты для SVG-градиентов и эллипсов синей плашки.
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "./constants";

type GradientInput = {
  angleDeg: number;
  shiftX: number;
  shiftY: number;
};

type EllipseInput = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const getGradientGeometry = ({
  angleDeg,
  shiftX,
  shiftY,
}: GradientInput) => {
  const angle = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const t = Math.min(
    OVERLAY_WIDTH / 2 / Math.abs(dx || 1),
    OVERLAY_HEIGHT / 2 / Math.abs(dy || 1),
  );

  return {
    x1: OVERLAY_WIDTH / 2 - dx * t + shiftX,
    y1: OVERLAY_HEIGHT / 2 - dy * t + shiftY,
    x2: OVERLAY_WIDTH / 2 + dx * t + shiftX,
    y2: OVERLAY_HEIGHT / 2 + dy * t + shiftY,
  };
};

export const getEllipseCenter = ({
  left,
  top,
  width,
  height,
}: EllipseInput) => ({
  cx: left + width / 2,
  cy: top + height / 2,
  rx: width / 2,
  ry: height / 2,
});
