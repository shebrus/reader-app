//
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // убираем "Home"
        tabBarStyle: { display: "none" }, // убираем таббар
      }}
    >
      <Tabs.Screen name="index" />
    </Tabs>
  );
}