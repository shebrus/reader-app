// Рисует 3D-карточку книги из слоев обложки, страниц, бликов и теней.
import { memo, useId } from "react";
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

type BookLayout = {
  backCoverGroupFrame: LayerFrame;
  bookFrame: Pick<LayerFrame, "height" | "width">;
  coverFrame: LayerFrame;
  frontCoverGroupFrame: LayerFrame;
  leftShadowFrame: LayerFrame;
  leftShadow2Frame: LayerFrame;
  pagesFrame: LayerFrame;
  rightShadowFrame: LayerFrame;
  upShadowFrame: LayerFrame;
};

const bookLayoutCache = new Map<number, BookLayout>();

function getBookLayout(width: number) {
  const cachedLayout = bookLayoutCache.get(width);

  if (cachedLayout) return cachedLayout;

  const scale = width / BOOK_WIDTH;
  const layerFrame = (
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

  const layout: BookLayout = {
    backCoverGroupFrame: layerFrame(
      0,
      0,
      BACK_COVER_GROUP_WIDTH,
      BACK_COVER_GROUP_HEIGHT,
    ),
    bookFrame: {
      height: BOOK_HEIGHT * scale,
      width: BOOK_WIDTH * scale,
    },
    coverFrame: layerFrame(0, 0, COVER_WIDTH, COVER_HEIGHT),
    frontCoverGroupFrame: layerFrame(
      0,
      FRONT_COVER_GROUP_TOP,
      FRONT_COVER_GROUP_WIDTH,
      FRONT_COVER_GROUP_HEIGHT,
    ),
    leftShadowFrame: layerFrame(
      0,
      SIDE_SHADOW_TOP,
      SIDE_SHADOW_WIDTH,
      SIDE_SHADOW_HEIGHT,
    ),
    leftShadow2Frame: layerFrame(
      LEFT_SHADOW_2_LEFT,
      0,
      LEFT_SHADOW_2_WIDTH,
      LEFT_SHADOW_2_HEIGHT,
    ),
    pagesFrame: layerFrame(PAGES_LEFT, PAGES_TOP, PAGES_WIDTH, PAGES_HEIGHT),
    rightShadowFrame: layerFrame(
      RIGHT_SHADOW_LEFT,
      SIDE_SHADOW_TOP,
      SIDE_SHADOW_WIDTH,
      SIDE_SHADOW_HEIGHT,
    ),
    upShadowFrame: layerFrame(0, 0, UP_SHADOW_WIDTH, UP_SHADOW_HEIGHT),
  };

  bookLayoutCache.set(width, layout);
  return layout;
}

const BookCardNew = ({
  coverImage,
  coverColor,
  width = DEFAULT_BOOK_WIDTH,
  style,
}: BookCardNewProps) => {
  const clipIdBase = useId().replace(/:/g, "_");
  const {
    backCoverGroupFrame,
    bookFrame,
    coverFrame,
    frontCoverGroupFrame,
    leftShadowFrame,
    leftShadow2Frame,
    pagesFrame,
    rightShadowFrame,
    upShadowFrame,
  } = getBookLayout(width);

  return (
    <View
      style={[
        styles.book,
        bookFrame,
        style,
      ]}
    >
      <View
        style={[
          styles.group,
          backCoverGroupFrame,
        ]}
      >
        <CoverLayer
          coverImage={coverImage}
          coverColor={coverColor}
          source={bookAssets.backCover}
          style={coverFrame}
          clipId={`${clipIdBase}-back-cover`}
          shape="back"
        />
        <SvgLayer source={bookAssets.blur2} style={coverFrame} />
        <SvgLayer source={bookAssets.rightShadow2} style={rightShadowFrame} />
        <SvgLayer source={bookAssets.upShadow} style={upShadowFrame} />
        <ExpoImage
          source={bookAssets.pages}
          contentFit="fill"
          style={[styles.layer, pagesFrame]}
        />
      </View>

      <View
        style={[
          styles.group,
          frontCoverGroupFrame,
        ]}
      >
        <CoverLayer
          coverImage={coverImage}
          coverColor={coverColor}
          source={bookAssets.frontCover}
          style={coverFrame}
          clipId={`${clipIdBase}-front-cover`}
          shape="front"
        />
        <SvgLayer source={bookAssets.blur1} style={coverFrame} />

        <View style={[styles.group, coverFrame]}>
          <SvgLayer source={bookAssets.rightShadow1} style={rightShadowFrame} />
          <SvgLayer source={bookAssets.leftShadow2} style={leftShadow2Frame} />
          <SvgLayer source={bookAssets.leftShadow} style={leftShadowFrame} />
        </View>
      </View>
    </View>
  );
};

const MemoizedBookCardNew = memo(BookCardNew);

export { MemoizedBookCardNew as BookCardNew };
export default MemoizedBookCardNew;
