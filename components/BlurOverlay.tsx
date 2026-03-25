// BlurOverlay.tsx
import { StyleSheet, View, Image} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const dotImg = require("../assets/images/dot.png"); 
//const H_PADDING = 18;
export const BlurOverlay = ({ isEven }: { isEven: boolean }) => {
  const baseColor = isEven
    ? "rgba(27,145,255,0.6)"
    : "rgba(0,60,255,0.6)";

  return (
    <View style={styles.shadowWrapper}>
      <View style={styles.inner}>
        <BlurView
          intensity={3}
          tint="default"
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: baseColor },
          ]}
        />

        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.45)",
            "rgba(255,255,255,0)",
          ]}
          locations={[0.46, 0.76, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.dotWrapper, { left: 11 }]}>
          <Image source={dotImg} style={styles.dotImage} />
        </View>
        <View style={[styles.dotWrapper, { right: 11 }]}>
          <Image source={dotImg} style={styles.dotImage} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ВНЕШНИЙ контейнер: только тень, без overflow
  shadowWrapper: {
    position: "absolute",
    bottom: -24,
    left: 10,
    right: 10,
    //left: H_PADDING,
    //right: H_PADDING,
    height: 68,
    // тень
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },

  // ВНУТРЕННИЙ контейнер: скругление + обрезка содержимого
  inner: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },

  dotWrapper: {
    position: "absolute",
    width: 7.8,
    height: 7.7,
    borderRadius: 3.9,
    top: "50%",
    transform: [{ translateY: -3.9 }],

    shadowColor: "#000",
    shadowOffset: { width: 2, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },

  dotImage: {
    width: "100%",
    height: "100%",
    borderRadius: 3.9,
  },
});