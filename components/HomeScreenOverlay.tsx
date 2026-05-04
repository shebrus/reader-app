// Собирает синюю плашку на главном экране поверх ряда книг.
import { BlurView } from "expo-blur";
import { useId } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";

import {
  ANDROID_BLUR_PROPS,
  BACKDROP_BLUR_INTENSITY,
  BACKDROP_BLUR_OPACITY,
  DOT_HEIGHT,
  DOT_RADIUS,
  DOT_WIDTH,
  OVERLAY_HEIGHT,
  OVERLAY_RADIUS,
  PRIMARY_BLUE,
  SCREEN_EDGE_INSET,
  SECONDARY_BLUE,
  dotImg,
} from "./homeOverlay/constants";
import { OverlaySvg } from "./homeOverlay/OverlaySvg";

type HomeScreenOverlayProps = {
  isEven?: boolean;
};

export const HomeScreenOverlay = ({
  isEven = false,
}: HomeScreenOverlayProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const overlayWidth = Math.max(windowWidth - SCREEN_EDGE_INSET * 2, 0);
  const baseColor = isEven ? SECONDARY_BLUE : PRIMARY_BLUE;
  const idBase = useId().replace(/:/g, "_");

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          left: SCREEN_EDGE_INSET,
          width: overlayWidth,
        },
      ]}
    >
      <View style={styles.card}>
        {BACKDROP_BLUR_INTENSITY > 0 ? (
          <BlurView
            intensity={BACKDROP_BLUR_INTENSITY}
            tint="default"
            style={styles.backdropBlur}
            {...ANDROID_BLUR_PROPS}
          />
        ) : null}

        <OverlaySvg
          width={overlayWidth}
          baseColor={baseColor}
          clipId={`${idBase}-clip`}
          blurId={`${idBase}-blur`}
          gradient1Id={`${idBase}-gradient-1`}
          gradient2Id={`${idBase}-gradient-2`}
          insetId={`${idBase}-inset-gradient`}
        />

        <View style={styles.content}>
          <Image source={dotImg} style={styles.dot} />
          <Image source={dotImg} style={styles.dot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    height: OVERLAY_HEIGHT,
    top: 138,
  },

  card: {
    flex: 1,
    borderRadius: OVERLAY_RADIUS,
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  backdropBlur: {
    ...StyleSheet.absoluteFillObject,
    opacity: BACKDROP_BLUR_OPACITY,
  },

  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  dot: {
    width: DOT_WIDTH,
    height: DOT_HEIGHT,
    borderRadius: DOT_RADIUS,
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 1 },
    shadowOpacity: 0.44,
    shadowRadius: 3.4,
    elevation: 4,
  },
});
