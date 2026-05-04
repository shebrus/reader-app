// Хук управляет анимацией открытия, закрытия и затемнения нижнего окна.
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

type UseSheetAnimationParams = {
  visible: boolean;
  sheetHeight: number;
  onClose: () => void;
};

export function useSheetAnimation({
  visible,
  sheetHeight,
  onClose,
}: UseSheetAnimationParams) {
  const translateY = useRef(new Animated.Value(500)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(sheetHeight);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity, sheetHeight]);

  const closeWithAnimation = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return {
    translateY,
    backdropOpacity,
    closeWithAnimation,
  };
}
