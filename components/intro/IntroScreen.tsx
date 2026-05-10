// Стартовый экран приложения: показывает название, подзаголовок и декоративную стопку последних книг.
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookCardNew } from "../BookCardNew";

const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;

const introBooks = [
  {
    id: "back",
    coverImage: require("../../assets/covers/cover2.png"),
    width: 216,
    top: 232,
  },
  {
    id: "middle",
    coverImage: require("../../assets/covers/cover4.png"),
    width: 243,
    top: 283,
  },
  {
    id: "front",
    coverImage: require("../../assets/covers/cover1.png"),
    width: 270,
    top: 340,
  },
];

export function IntroScreen() {
  const { width, height } = useWindowDimensions();

  // Масштаб сохраняет пропорции макета 375x812 на экранах другого размера.
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.copyBlock,
          { top: 44 * scale, width: 289 * scale, gap: 8 * scale },
        ]}
      >
        <Text style={[styles.title, { fontSize: 58 * scale, lineHeight: 80 * scale }]}>
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
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {introBooks.map((book) => {
          const scaledWidth = book.width * scale;

          return (
            <BookCardNew
              key={book.id}
              coverImage={book.coverImage}
              width={scaledWidth}
              style={[
                styles.book,
                {
                  left: (width - scaledWidth) / 2,
                  top: book.top * scale,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  copyBlock: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    width: 289,
    gap: 8,
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

  book: {
    position: "absolute",
  },
});
