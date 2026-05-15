// Управляет переходом между стартовым экраном и экраном категорий как одной вертикальной страницей.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import type { PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";

import { HomeContent } from "../components/home/HomeContent";
import { IntroScreen } from "../components/intro/IntroScreen";

const OPEN_DISTANCE = 250;
const OPEN_VELOCITY = -650;

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const [introCompleted, setIntroCompleted] = useState(false);
  const [carouselActive, setCarouselActive] = useState(false);

  // Основная позиция всей вертикальной страницы: 0 - стартовый экран, -height - экран категорий.
  const baseTranslateY = useRef(new Animated.Value(0)).current;

  // Временное смещение пальцем во время свайпа.
  const dragTranslateY = useRef(new Animated.Value(0)).current;

  // При изменении высоты экрана держим страницу в правильной позиции.
  useEffect(() => {
    baseTranslateY.setValue(introCompleted ? -height : 0);
    dragTranslateY.setValue(0);
  }, [baseTranslateY, dragTranslateY, height, introCompleted]);

  // Складываем постоянную позицию страницы и текущее движение пальца, затем ограничиваем диапазон.
  const pageTranslateY = useMemo(() => {
    return Animated.add(baseTranslateY, dragTranslateY).interpolate({
      inputRange: [-height, 0],
      outputRange: [-height, 0],
      extrapolate: "clamp",
    });
  }, [baseTranslateY, dragTranslateY, height]);

  // Связывает вертикальное движение пальца с движением всей страницы.
  const handleGesture = Animated.event(
    [{ nativeEvent: { translationY: dragTranslateY } }],
    { useNativeDriver: true },
  );

  // После отпускания пальца решает: завершить переход к категориям или вернуть стартовый экран.
  const handleHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) return;

    const { translationY, velocityY } = event.nativeEvent;
    const shouldOpen =
      translationY < -OPEN_DISTANCE || velocityY < OPEN_VELOCITY;

    if (shouldOpen) {
      const currentPosition = Math.max(Math.min(translationY, 0), -height);

      baseTranslateY.setValue(currentPosition);
      dragTranslateY.setValue(0);

      Animated.timing(baseTranslateY, {
        toValue: -height,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setIntroCompleted(true);
      });

      return;
    }

    Animated.spring(dragTranslateY, {
      toValue: 0,
      damping: 18,
      stiffness: 170,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  };

  return (
    <PanGestureHandler
      enabled={!introCompleted && !carouselActive}
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleHandlerStateChange}
    >
      <Animated.View style={styles.root}>
        <Animated.View
          style={[
            styles.page,
            {
              height: height * 2,
              transform: [{ translateY: pageTranslateY }],
            },
          ]}
        >
          <View style={[styles.screen, { height }]}>
            <IntroScreen onCarouselActiveChange={setCarouselActive} />
          </View>

          <View style={[styles.screen, { height }]}>
            <HomeContent />
          </View>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },

  page: {
    width: "100%",
    backgroundColor: "#F5F5F5",
  },

  screen: {
    width: "100%",
    backgroundColor: "#F5F5F5",
  },
});
