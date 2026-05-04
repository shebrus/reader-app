// Константы внешнего вида синей плашки на главном экране.
import { Platform } from "react-native";

export const dotImg = require("../../assets/images/dot.png");

export const OVERLAY_WIDTH = 355;
export const OVERLAY_HEIGHT = 68;
export const OVERLAY_RADIUS = 10;
export const SCREEN_EDGE_INSET = 10;
export const DOT_WIDTH = 7.82;
export const DOT_HEIGHT = 7.74;
export const DOT_RADIUS = 3.90991;
export const PRIMARY_BLUE = "#003CFF";
export const SECONDARY_BLUE = "#1B91FF";
export const PLATE_FILL_OPACITY = 0.6;
export const BACKDROP_BLUR_INTENSITY = 0.1;
export const BACKDROP_BLUR_OPACITY = 0.4;
export const ANDROID_BLUR_PROPS =
  Platform.OS === "android"
    ? {
        experimentalBlurMethod: "dimezisBlurView" as const,
        blurReductionFactor: 1,
      }
    : {};

export const ELLIPSE_3 = {
  left: 304,
  top: 24,
  width: 162,
  height: 138,
  rotation: -14.31,
  opacity: 0,
};

export const GRADIENT_1 = {
  angleDeg: 151.62,
  shiftX: 70,
  shiftY: 0,
  opacity: 0.8,
  startOffset: "06.02%",
  middleOffset: "66.18%",
  endOffset: "110.52%",
  startOpacity: 0,
  middleOpacity: 0.35,
  endOpacity: 0,
};

export const GRADIENT_2 = {
  angleDeg: 151.62,
  shiftX: -OVERLAY_WIDTH / 3.5,
  shiftY: -OVERLAY_HEIGHT / 2,
  opacity: 1,
  startOffset: "06.02%",
  middleOffset: "66.18%",
  endOffset: "110.52%",
  startOpacity: 0.2,
  middleOpacity: 0.22,
  endOpacity: 0.1,
};
