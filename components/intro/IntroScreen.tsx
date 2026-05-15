// Стартовый экран приложения: собирает заголовок и интерактивную карусель книг.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";

import { IntroBookCarousel } from "./IntroBookCarousel";
import { IntroTitle } from "./IntroTitle";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./introLayout";

type IntroScreenProps = {
  onCarouselActiveChange?: (active: boolean) => void;
};

export function IntroScreen({ onCarouselActiveChange }: IntroScreenProps) {
  const { width, height } = useWindowDimensions();
  const [carouselActive, setCarouselActive] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // progress отвечает за раскрытие стопки: 0 - стопка, 1 - карусель.
  const progress = useRef(new Animated.Value(0)).current;

  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const canvasLeft = (width - DESIGN_WIDTH * scale) / 2;

  useEffect(() => {
    onCarouselActiveChange?.(carouselActive);
  }, [carouselActive, onCarouselActiveChange]);

  const textOpacity = useMemo(() => {
    return progress.interpolate({
      inputRange: [0, 0.7],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
  }, [progress]);

  const textTranslateY = useMemo(() => {
    return progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -22 * scale],
      extrapolate: "clamp",
    });
  }, [progress, scale]);

  return (
    <View style={styles.root}>
      <IntroTitle
        opacity={textOpacity}
        scale={scale}
        translateY={textTranslateY}
      />

      <IntroBookCarousel
        canvasLeft={canvasLeft}
        carouselActive={carouselActive}
        isRotating={isRotating}
        onActiveChange={setCarouselActive}
        onRotatingChange={setIsRotating}
        progress={progress}
        scale={scale}
        width={width}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
});
