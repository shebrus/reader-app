// Хук следит за клавиатурой и возвращает ее текущую высоту.
import { useEffect, useState } from "react";
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    const animateKeyboardChange = (event?: {
      duration?: number;
      easing?: string;
    }) => {
      if (event?.duration) {
        Keyboard.scheduleLayoutAnimation(event as any);
        return;
      }

      LayoutAnimation.configureNext({
        duration: 240,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      animateKeyboardChange(event);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      animateKeyboardChange(event);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}
