//Корень приложения
import { Stack } from "expo-router";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [loaded] = useFonts({
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "SourceSerif-Regular": require("../assets/fonts/SourceSerif4-Regular.ttf"),
  });

  if (!loaded) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}