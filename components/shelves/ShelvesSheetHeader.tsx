// Заголовок нижнего окна управления полками.
import { StyleSheet, Text, View } from "react-native";

export function ShelvesSheetHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Мои полки</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    height: 44,
    marginBottom: 16,
  },

  title: {
    fontFamily: "SourceSerif4-Light",
    fontSize: 32,
    lineHeight: 44,
    color: "#192024",
  },
});
