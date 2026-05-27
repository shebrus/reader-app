// Корневой layout приложения: загружает шрифты и настраивает навигационный Stack.
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { preloadBookAssets } from "../shared/preloadAssets";

export default function RootLayout() {
  const [loaded] = useFonts({
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "SourceSerif-Regular": require("../assets/fonts/SourceSerif4-Regular.ttf"),
    "SourceSerif4-48-Regular": require("../assets/fonts/SourceSerif4_48pt-Regular.ttf"),
    "SourceSerif4-Light": require("../assets/fonts/SourceSerif4-Light.ttf"),
    "SFProDisplay-Light": require("../assets/fonts/SF-Pro-Display-Light.otf"),
    "SFProText-Light": require("../assets/fonts/SF-Pro-Text-Light.otf"),
    "SFProText-Regular": require("../assets/fonts/SF-Pro-Text-Regular.otf"),
  });

  useEffect(() => {
    if (loaded) {
      void preloadBookAssets();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
