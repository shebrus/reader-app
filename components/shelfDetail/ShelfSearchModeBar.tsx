// Панель под шапкой: поле поиска и три переключателя будущих режимов отображения книг.
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const ACTIVE_VIEW = "grid";
const ACTIVE_COLOR = "#7BBDFA";
const INACTIVE_COLOR = "#898EA1";
export type ViewMode = "cover" | "list" | "grid";

type ShelfSearchModeBarProps = {
  activeView?: ViewMode;
  onChangeView?: (view: ViewMode) => void;
};

export function ShelfSearchModeBar({
  activeView = ACTIVE_VIEW,
  onChangeView,
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
        <ModeIcon
          mode="cover"
          tintColor={getModeTint("cover")}
          source={require("../../assets/icons/view-cover-icon.png")}
          onPress={onChangeView}
        />
        <ModeIcon
          mode="list"
          tintColor={getModeTint("list")}
          source={require("../../assets/icons/view-list-icon.png")}
          onPress={onChangeView}
        />
        <ModeIcon
          mode="grid"
          tintColor={getModeTint("grid")}
          source={require("../../assets/icons/view-grid-icon.png")}
          onPress={onChangeView}
        />
      </View>
    </View>
  );
}

type ModeIconProps = {
  mode: ViewMode;
  source: number;
  tintColor: string;
  onPress?: (view: ViewMode) => void;
};

function ModeIcon({ mode, source, tintColor, onPress }: ModeIconProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(mode)}
      style={styles.modeButton}
    >
      <Image source={source} style={[styles.modeIcon, { tintColor }]} />
    </Pressable>
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

  modeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 24,
  },

  modeIcon: {
    height: 22,
    resizeMode: "contain",
    width: 24,
  },
});
