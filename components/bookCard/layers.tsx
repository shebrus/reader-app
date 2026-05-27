// Слои карточки книги: обложка, SVG-маски и декоративные изображения.
import { Image as ExpoImage } from "expo-image";
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Path,
  Rect,
} from "react-native-svg";

import {
  BACK_COVER_PATH,
  COVER_HEIGHT,
  COVER_RADIUS,
  COVER_WIDTH,
} from "./constants";
import type { CoverLayerProps, SvgLayerProps } from "./types";
import { styles } from "./styles";

export const CoverLayer = ({
  coverImage,
  coverColor,
  source,
  style,
  clipId,
  shape,
}: CoverLayerProps) => {
  if (!coverImage && !coverColor) {
    return <SvgLayer source={source} style={style} />;
  }

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
      preserveAspectRatio="none"
      style={[styles.layer, style]}
    >
      <Defs>
        <ClipPath id={clipId}>
          {shape === "front" ? (
            <Rect width={COVER_WIDTH} height={COVER_HEIGHT} rx={COVER_RADIUS} />
          ) : (
            <Path d={BACK_COVER_PATH} />
          )}
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {coverImage ? (
          <SvgImage
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            href={coverImage}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <Rect
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            fill={coverColor}
          />
        )}
      </G>
    </Svg>
  );
};

export const SvgLayer = ({ source, style }: SvgLayerProps) => (
  <ExpoImage
    source={source}
    contentFit="fill"
    cachePolicy="memory-disk"
    style={[styles.layer, style]}
  />
);
