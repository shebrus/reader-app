// Рисует SVG-слой синей плашки: фон, градиенты, маску и декоративные блики.
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

import {
  ELLIPSE_3,
  GRADIENT_1,
  GRADIENT_2,
  OVERLAY_HEIGHT,
  OVERLAY_RADIUS,
  OVERLAY_WIDTH,
  PLATE_FILL_OPACITY,
} from "./constants";
import { getEllipseCenter, getGradientGeometry } from "./geometry";

type OverlaySvgProps = {
  width: number;
  baseColor: string;
  clipId: string;
  blurId: string;
  gradient1Id: string;
  gradient2Id: string;
  insetId: string;
};

const gradient1Geometry = getGradientGeometry(GRADIENT_1);
const gradient2Geometry = getGradientGeometry(GRADIENT_2);

export function OverlaySvg({
  width,
  baseColor,
  clipId,
  blurId,
  gradient1Id,
  gradient2Id,
  insetId,
}: OverlaySvgProps) {
  const ellipse3 = getEllipseCenter(ELLIPSE_3);

  return (
    <Svg
      width={width}
      height={OVERLAY_HEIGHT}
      viewBox={`0 0 ${OVERLAY_WIDTH} ${OVERLAY_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <ClipPath id={clipId}>
          <Rect
            width={OVERLAY_WIDTH}
            height={OVERLAY_HEIGHT}
            rx={OVERLAY_RADIUS}
          />
        </ClipPath>

        <Filter id={blurId} x="-65%" y="-320%" width="320%" height="760%">
          <FeGaussianBlur stdDeviation="39.9" />
        </Filter>

        <LinearGradient
          id={gradient1Id}
          x1={gradient1Geometry.x1}
          y1={gradient1Geometry.y1}
          x2={gradient1Geometry.x2}
          y2={gradient1Geometry.y2}
          gradientUnits="userSpaceOnUse"
        >
          <Stop
            offset={GRADIENT_1.startOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_1.startOpacity}
          />
          <Stop
            offset={GRADIENT_1.middleOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_1.middleOpacity}
          />
          <Stop
            offset={GRADIENT_1.endOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_1.endOpacity}
          />
        </LinearGradient>

        <LinearGradient
          id={gradient2Id}
          x1={gradient2Geometry.x1}
          y1={gradient2Geometry.y1}
          x2={gradient2Geometry.x2}
          y2={gradient2Geometry.y2}
          gradientUnits="userSpaceOnUse"
        >
          <Stop
            offset={GRADIENT_2.startOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_2.startOpacity}
          />
          <Stop
            offset={GRADIENT_2.middleOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_2.middleOpacity}
          />
          <Stop
            offset={GRADIENT_2.endOffset}
            stopColor="#FFFFFF"
            stopOpacity={GRADIENT_2.endOpacity}
          />
        </LinearGradient>

        <LinearGradient
          id={insetId}
          x1="0"
          y1="0"
          x2="08"
          y2="82"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <G clipPath={`url(#${clipId})`}>
        <Rect
          width={OVERLAY_WIDTH}
          height={OVERLAY_HEIGHT}
          fill={baseColor}
          fillOpacity={PLATE_FILL_OPACITY}
        />
        <Rect
          width={OVERLAY_WIDTH}
          height={OVERLAY_HEIGHT}
          fill={`url(#${gradient1Id})`}
          fillOpacity={GRADIENT_1.opacity}
        />
        <Rect
          width={OVERLAY_WIDTH}
          height={OVERLAY_HEIGHT}
          fill={`url(#${gradient2Id})`}
          fillOpacity={GRADIENT_2.opacity}
        />
        <Rect width={OVERLAY_WIDTH} height={OVERLAY_HEIGHT} fill={`url(#${insetId})`} />

        <Ellipse
          cx={ellipse3.cx}
          cy={ellipse3.cy}
          rx={ellipse3.rx}
          ry={ellipse3.ry}
          fill={baseColor}
          fillOpacity={ELLIPSE_3.opacity}
          filter={`url(#${blurId})`}
          transform={`rotate(${ELLIPSE_3.rotation} ${ellipse3.cx} ${ellipse3.cy})`}
        />
      </G>
    </Svg>
  );
}
