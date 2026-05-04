//Добавление полки
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const plusIcon = require("../../assets/icons/plus-icon.png");

type AddShelfRowProps = {
  onPress: () => void;
};

export function AddShelfRow({ onPress }: AddShelfRowProps) {
  return (
    <TouchableOpacity style={styles.addRow} onPress={onPress}>
      <View style={styles.addIconBox}>
        <Image source={plusIcon} style={styles.plusIcon} />
      </View>
      <Text style={styles.addText}>Добавить полку</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    marginTop: 0,
  },

  addIconBox: {
    width: 36,
    height: 36,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  plusIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },

  addText: {
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
  },
});
