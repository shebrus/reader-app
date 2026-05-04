// шапка StoryNest + кнопка карандаша.
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const pencilIcon = require("../../assets/icons/pencil-icon.png");

const TITLE_FONT_FAMILY = "SourceSerif4-Light";
const TITLE_FONT_WEIGHT = "300";

type HomeHeaderProps = {
  onEditPress: () => void;
};

export function HomeHeader({ onEditPress }: HomeHeaderProps) {
  return (
    <View style={styles.headerWrapper}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>StoryNest</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={onEditPress}
        activeOpacity={0.7}
      >
        <Image source={pencilIcon} style={styles.editIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: "relative",
    height: 142,
    paddingTop: 31,
  },

  header: {
    alignItems: "center",
  },

  screenTitle: {
    fontFamily: TITLE_FONT_FAMILY,
    fontWeight: TITLE_FONT_WEIGHT,
    fontSize: 48,
    lineHeight: 66,
    color: "#000",
  },

  editButton: {
    position: "absolute",
    right: 5,
    top: 54,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  editIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
});
