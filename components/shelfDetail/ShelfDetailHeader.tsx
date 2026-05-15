// Верхняя шапка экрана полки: кнопка назад, название категории и кнопка добавления.
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type ShelfDetailHeaderProps = {
  title: string;
  onBackPress: () => void;
};

export function ShelfDetailHeader({
  title,
  onBackPress,
}: ShelfDetailHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        onPress={onBackPress}
        style={styles.iconButton}
      >
        <Image
          source={require("../../assets/icons/back-icon.png")}
          style={styles.headerIcon}
        />
      </Pressable>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      <Pressable accessibilityRole="button" style={styles.iconButton}>
        <Image
          source={require("../../assets/icons/plus-icon.png")}
          style={styles.plusIcon}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 49,
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 10,
  },

  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  headerIcon: {
    height: 22,
    resizeMode: "contain",
    tintColor: "#7BBDFA",
    width: 22,
  },

  plusIcon: {
    height: 37,
    resizeMode: "contain",
    tintColor: "#7BBDFA",
    width: 37,
  },

  title: {
    color: "#192024",
    flex: 1,
    fontFamily: "SourceSerif4-48-Regular",
    fontSize: 36,
    fontWeight: "400",
    lineHeight: 49,
    textAlign: "center",
  },
});
