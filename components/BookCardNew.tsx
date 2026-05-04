// Рисует 3D-карточку книги из слоев обложки, страниц, бликов и теней.
import { useId } from "react";
import { Image as ExpoImage } from "expo-image";
import { View } from "react-native";

import {
  BACK_COVER_GROUP_HEIGHT,
  BACK_COVER_GROUP_WIDTH,
  BOOK_HEIGHT,
  BOOK_WIDTH,
  COVER_HEIGHT,
  COVER_WIDTH,
  DEFAULT_BOOK_WIDTH,
  FRONT_COVER_GROUP_HEIGHT,
  FRONT_COVER_GROUP_TOP,
  FRONT_COVER_GROUP_WIDTH,
  LEFT_SHADOW_2_HEIGHT,
  LEFT_SHADOW_2_LEFT,
  LEFT_SHADOW_2_WIDTH,
  PAGES_HEIGHT,
  PAGES_LEFT,
  PAGES_TOP,
  PAGES_WIDTH,
  RIGHT_SHADOW_LEFT,
  SIDE_SHADOW_HEIGHT,
  SIDE_SHADOW_TOP,
  SIDE_SHADOW_WIDTH,
  UP_SHADOW_HEIGHT,
  UP_SHADOW_WIDTH,
  bookAssets,
} from "./bookCard/constants";
import { CoverLayer, SvgLayer } from "./bookCard/layers";
import { styles } from "./bookCard/styles";
import type { BookCardNewProps, LayerFrame } from "./bookCard/types";

const BookCardNew = ({
  coverImage,
  width = DEFAULT_BOOK_WIDTH,
  style,
}: BookCardNewProps) => {
  const clipIdBase = useId().replace(/:/g, "_");
  const scale = width / BOOK_WIDTH;

  const layerStyle = (
    left: number,
    top: number,
    layerWidth: number,
    layerHeight: number,
  ): LayerFrame => ({
    height: layerHeight * scale,
    left: left * scale,
    top: top * scale,
    width: layerWidth * scale,
  });

  const coverFrame = layerStyle(0, 0, COVER_WIDTH, COVER_HEIGHT);

  return (
    <View
      style={[
        styles.book,
        {
          height: BOOK_HEIGHT * scale,
          width: BOOK_WIDTH * scale,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.group,
          layerStyle(0, 0, BACK_COVER_GROUP_WIDTH, BACK_COVER_GROUP_HEIGHT),
        ]}
      >
        <CoverLayer
          coverImage={coverImage}
          source={bookAssets.backCover}
          style={coverFrame}
          clipId={`${clipIdBase}-back-cover`}
          shape="back"
        />
        <SvgLayer source={bookAssets.blur2} style={coverFrame} />
        <SvgLayer
          source={bookAssets.rightShadow2}
          style={layerStyle(
            RIGHT_SHADOW_LEFT,
            SIDE_SHADOW_TOP,
            SIDE_SHADOW_WIDTH,
            SIDE_SHADOW_HEIGHT,
          )}
        />
        <SvgLayer
          source={bookAssets.upShadow}
          style={layerStyle(0, 0, UP_SHADOW_WIDTH, UP_SHADOW_HEIGHT)}
        />
        <ExpoImage
          source={bookAssets.pages}
          contentFit="fill"
          style={[
            styles.layer,
            layerStyle(PAGES_LEFT, PAGES_TOP, PAGES_WIDTH, PAGES_HEIGHT),
          ]}
        />
      </View>

      <View
        style={[
          styles.group,
          layerStyle(
            0,
            FRONT_COVER_GROUP_TOP,
            FRONT_COVER_GROUP_WIDTH,
            FRONT_COVER_GROUP_HEIGHT,
          ),
        ]}
      >
        <CoverLayer
          coverImage={coverImage}
          source={bookAssets.frontCover}
          style={coverFrame}
          clipId={`${clipIdBase}-front-cover`}
          shape="front"
        />
        <SvgLayer source={bookAssets.blur1} style={coverFrame} />

        <View style={[styles.group, coverFrame]}>
          <SvgLayer
            source={bookAssets.rightShadow1}
            style={layerStyle(
              RIGHT_SHADOW_LEFT,
              SIDE_SHADOW_TOP,
              SIDE_SHADOW_WIDTH,
              SIDE_SHADOW_HEIGHT,
            )}
          />
          <SvgLayer
            source={bookAssets.leftShadow2}
            style={layerStyle(
              LEFT_SHADOW_2_LEFT,
              0,
              LEFT_SHADOW_2_WIDTH,
              LEFT_SHADOW_2_HEIGHT,
            )}
          />
          <SvgLayer
            source={bookAssets.leftShadow}
            style={layerStyle(
              0,
              SIDE_SHADOW_TOP,
              SIDE_SHADOW_WIDTH,
              SIDE_SHADOW_HEIGHT,
            )}
          />
        </View>
      </View>
    </View>
  );
};

export { BookCardNew };
export default BookCardNew;