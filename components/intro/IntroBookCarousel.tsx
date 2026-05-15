// Карусель книг на стартовом экране: раскрывает стопку, закрывает ее и меняет центральную книгу свайпом.
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  unstable_batchedUpdates,
  View,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import type { PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";

import { BookCardNew } from "../BookCardNew";
import {
  BASE_BOOK_WIDTH,
  BOOK_RATIO,
  CLOSE_DURATION,
  OPEN_DURATION,
  ROTATE_DURATION,
  SWIPE_DISTANCE,
  SWIPE_VELOCITY,
  carouselFrames,
  getNextSlot,
  initialFrames,
  introBooks,
  slotNames,
} from "./introLayout";
import type { RotateDirection } from "./introLayout";

type IntroBookCarouselProps = {
  canvasLeft: number;
  carouselActive: boolean;
  isRotating: boolean;
  onActiveChange: (active: boolean) => void;
  onRotatingChange: (rotating: boolean) => void;
  progress: Animated.Value;
  scale: number;
  width: number;
};

export function IntroBookCarousel({
  canvasLeft,
  carouselActive,
  isRotating,
  onActiveChange,
  onRotatingChange,
  progress,
  scale,
  width,
}: IntroBookCarouselProps) {
  const [books, setBooks] = useState(introBooks);
  const [rotationDirection, setRotationDirection] =
    useState<RotateDirection | null>(null);

  const dragX = useRef(new Animated.Value(0)).current;
  const rotationProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!carouselActive) {
      dragX.setValue(0);
      rotationProgress.setValue(0);
      setRotationDirection(null);
    }
  }, [carouselActive, dragX, rotationProgress]);

  const openCarousel = () => {
    onActiveChange(true);

    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const closeCarousel = () => {
    if (isRotating) return;

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      dragX.setValue(0);
      onActiveChange(false);
    });
  };

  const rotateBooks = (direction: RotateDirection) => {
    if (isRotating) return;

    onRotatingChange(true);
    setRotationDirection(direction);
    rotationProgress.setValue(0);
    dragX.setValue(0);

    Animated.timing(rotationProgress, {
      toValue: 1,
      duration: ROTATE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      unstable_batchedUpdates(() => {
        setBooks((current) => {
          if (direction === "right") {
            return [current[1], current[2], current[0]];
          }

          return [current[2], current[0], current[1]];
        });
        setRotationDirection(null);
        onRotatingChange(false);
      });

      requestAnimationFrame(() => {
        dragX.setValue(0);
        rotationProgress.setValue(0);
      });
    });
  };

  const handleScreenPress = () => {
    if (isRotating) return;

    if (carouselActive) {
      closeCarousel();
      return;
    }

    openCarousel();
  };

  const handleCarouselGesture = Animated.event(
    [{ nativeEvent: { translationX: dragX } }],
    { useNativeDriver: true },
  );

  const handleCarouselStateChange = (
    event: PanGestureHandlerStateChangeEvent,
  ) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) return;
    if (isRotating) return;

    const { translationX, translationY, velocityX } = event.nativeEvent;
    const isVerticalSwipe = Math.abs(translationY) > SWIPE_DISTANCE;
    const isHorizontalSwipe =
      Math.abs(translationX) > SWIPE_DISTANCE ||
      Math.abs(velocityX) > SWIPE_VELOCITY;

    if (isVerticalSwipe) {
      closeCarousel();
      return;
    }

    if (isHorizontalSwipe) {
      rotateBooks(
        translationX < 0 || velocityX < -SWIPE_VELOCITY ? "right" : "left",
      );
      return;
    }

    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 170,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const getBookStyle = (slotIndex: number) => {
    const slotName = slotNames[slotIndex];
    const nextSlotName = rotationDirection
      ? getNextSlot(slotName, rotationDirection)
      : slotName;
    const initialFrame = initialFrames[slotName];
    const carouselFrame = carouselFrames[slotName];
    const nextCarouselFrame = carouselFrames[nextSlotName];
    const initialWidth = initialFrame.width * scale;
    const initialHeight = initialWidth * BOOK_RATIO;
    const baseWidth = BASE_BOOK_WIDTH * scale;
    const baseHeight = baseWidth * BOOK_RATIO;
    const initialLeft = canvasLeft + initialFrame.left * scale;
    const initialTop = initialFrame.top * scale;
    const finalWidth = carouselFrame.width * scale;
    const finalHeight = finalWidth * BOOK_RATIO;
    const finalLeft = canvasLeft + carouselFrame.left * scale;
    const finalTop = carouselFrame.top * scale;
    const initialCenterX = initialLeft + initialWidth / 2;
    const initialCenterY = initialTop + initialHeight / 2;
    const baseLeft = initialCenterX - baseWidth / 2;
    const baseTop = initialCenterY - baseHeight / 2;
    const finalCenterX = finalLeft + finalWidth / 2;
    const finalCenterY = finalTop + finalHeight / 2;
    const finalTranslateX = finalCenterX - initialCenterX;
    const finalTranslateY = finalCenterY - initialCenterY;
    const initialScale = initialFrame.width / BASE_BOOK_WIDTH;
    const finalScale = carouselFrame.width / BASE_BOOK_WIDTH;
    const nextFinalWidth = nextCarouselFrame.width * scale;
    const nextFinalHeight = nextFinalWidth * BOOK_RATIO;
    const nextFinalLeft = canvasLeft + nextCarouselFrame.left * scale;
    const nextFinalTop = nextCarouselFrame.top * scale;
    const nextFinalCenterX = nextFinalLeft + nextFinalWidth / 2;
    const nextFinalCenterY = nextFinalTop + nextFinalHeight / 2;
    const rotationTranslateX = nextFinalCenterX - finalCenterX;
    const rotationTranslateY = nextFinalCenterY - finalCenterY;
    const rotationScale = nextCarouselFrame.width / carouselFrame.width;
    const openTranslateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, finalTranslateX],
      extrapolate: "clamp",
    });
    const openTranslateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, finalTranslateY],
      extrapolate: "clamp",
    });
    const openScale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [initialScale, finalScale],
      extrapolate: "clamp",
    });
    const rotateTranslateX = rotationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, rotationTranslateX],
      extrapolate: "clamp",
    });
    const rotateTranslateY = rotationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, rotationTranslateY],
      extrapolate: "clamp",
    });
    const rotateScale = rotationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, rotationScale],
      extrapolate: "clamp",
    });
    const translateX = Animated.add(openTranslateX, rotateTranslateX);
    const translateY = Animated.add(openTranslateY, rotateTranslateY);
    const bookScale = Animated.multiply(openScale, rotateScale);
    const activeZIndex =
      rotationDirection === "right"
        ? slotName === "right"
          ? 4
          : slotName === "center"
            ? 3
            : 1
        : rotationDirection === "left"
          ? slotName === "left"
            ? 4
            : slotName === "center"
              ? 3
              : 1
          : slotName === "center"
            ? 3
            : slotName === "left"
              ? 2
              : 1;

    return {
      height: baseHeight,
      left: baseLeft,
      top: baseTop,
      transform: [{ translateX }, { translateY }, { scale: bookScale }],
      width: baseWidth,
      zIndex: activeZIndex,
    };
  };

  return (
    <PanGestureHandler
      enabled={carouselActive}
      onGestureEvent={handleCarouselGesture}
      onHandlerStateChange={handleCarouselStateChange}
    >
      <Animated.View style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleScreenPress} />

        <View
          pointerEvents={carouselActive ? "box-none" : "none"}
          style={StyleSheet.absoluteFill}
        >
          {introBooks.map((book) => {
            const bookIndex = books.findIndex((item) => item.id === book.id);
            const baseWidth = BASE_BOOK_WIDTH * scale;

            return (
              <Animated.View
                key={book.id}
                onStartShouldSetResponder={() => true}
                style={[styles.book, getBookStyle(bookIndex)]}
              >
                <BookCardNew coverImage={book.coverImage} width={baseWidth} />
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  book: {
    position: "absolute",
  },
});
