// Экран выбранной полки: собирает шапку, поиск, переключатели вида и список книг.
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Book } from "../../shared/types";
import { ShelfBookGridItem } from "./ShelfBookGridItem";
import { ShelfBookListItem } from "./ShelfBookListItem";
import { ShelfDetailHeader } from "./ShelfDetailHeader";
import { ShelfSearchModeBar, type ViewMode } from "./ShelfSearchModeBar";

type ShelfBooksScreenProps = {
  title: string;
  books: Book[];
  onBackPress: () => void;
};

export function ShelfBooksScreen({
  title,
  books,
  onBackPress,
}: ShelfBooksScreenProps) {
  const [activeView, setActiveView] = useState<ViewMode>("grid");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ShelfDetailHeader title={title} onBackPress={onBackPress} />
      <ShelfSearchModeBar
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          activeView === "grid" ? styles.gridContent : styles.listContent
        }
      >
        {books.map((book) =>
          activeView === "grid" ? (
            <ShelfBookGridItem key={book.id} book={book} />
          ) : (
            <ShelfBookListItem key={book.id} book={book} />
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  listContent: {
    gap: 32,
    paddingBottom: 54,
    paddingHorizontal: 10,
    paddingTop: 40,
  },

  gridContent: {
    columnGap: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 54,
    paddingHorizontal: 10,
    paddingTop: 40,
    rowGap: 25,
  },
});
