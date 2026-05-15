// Заголовок стартового экрана: рисует StoryNest и подзаголовок, а также плавно скрывается при раскрытии карусели.
import { Animated, StyleSheet, Text } from "react-native";

type IntroTitleProps = {
  opacity: Animated.AnimatedInterpolation<number>;
  scale: number;
  translateY: Animated.AnimatedInterpolation<number>;
};

export function IntroTitle({ opacity, scale, translateY }: IntroTitleProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.copyBlock,
        {
          gap: 8 * scale,
          opacity,
          top: 44 * scale,
          transform: [{ translateY }],
          width: 289 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { fontSize: 58 * scale, lineHeight: 80 * scale },
        ]}
      >
        StoryNest
      </Text>
      <Text
        style={[
          styles.subtitle,
          { fontSize: 20 * scale, lineHeight: 24 * scale },
        ]}
      >
        Приложение для чтения{"\n"}ваших любимых книг
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  copyBlock: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
  },

  title: {
    fontFamily: "SourceSerif4-48-Regular",
    fontWeight: "400",
    color: "#000000",
    textAlign: "center",
  },

  subtitle: {
    fontFamily: "SFProText-Light",
    fontWeight: "300",
    color: "#7C7C7C",
    textAlign: "center",
  },
});
