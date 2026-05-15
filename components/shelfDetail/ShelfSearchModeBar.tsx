// Панель под шапкой: поле поиска и три переключателя будущих режимов отображения книг.
import { Image, StyleSheet, Text, View } from "react-native";

const ACTIVE_VIEW = "list";
const ACTIVE_COLOR = "#7BBDFA";
const INACTIVE_COLOR = "#898EA1";
type ViewMode = "cover" | "list" | "grid";

type ShelfSearchModeBarProps = {
  activeView?: ViewMode;
};

export function ShelfSearchModeBar({
  activeView = ACTIVE_VIEW,
}: ShelfSearchModeBarProps) {
  const getModeTint = (mode: ViewMode) =>
    activeView === mode ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <Image
          source={require("../../assets/icons/search-icon.png")}
          style={styles.searchIcon}
        />
        <Text style={styles.searchText}>Поиск</Text>
      </View>

      <View style={styles.modeButtons}>
        <Image
          source={require("../../assets/icons/view-cover-icon.png")}
          style={[styles.modeIcon, { tintColor: getModeTint("cover") }]}
        />
        <Image
          source={require("../../assets/icons/view-list-icon.png")}
          style={[styles.modeIcon, { tintColor: getModeTint("list") }]}
        />
        <Image
          source={require("../../assets/icons/view-grid-icon.png")}
          style={[styles.modeIcon, { tintColor: getModeTint("grid") }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 38,
    marginTop: 16,
    paddingHorizontal: 10,
  },

  searchBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    height: 38,
    paddingHorizontal: 6,
  },

  searchIcon: {
    height: 22,
    resizeMode: "contain",
    tintColor: "#9C9C9C",
    width: 22,
  },

  searchText: {
    color: "#192024",
    fontFamily: "SFProText-Light",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 19,
  },

  modeButtons: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 22,
    justifyContent: "flex-end",
    width: 96,
  },

  modeIcon: {
    height: 22,
    resizeMode: "contain",
    width: 24,
  },
});
