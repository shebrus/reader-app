// Экран выбранной полки: собирает шапку, поиск, переключатели вида и список книг.
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Book } from "../../shared/types";
import { AddBookSheet } from "./AddBookSheet";
import { ShelfBookGridItem } from "./ShelfBookGridItem";
import { ShelfBookListItem } from "./ShelfBookListItem";
import { ShelfDetailHeader } from "./ShelfDetailHeader";
import { ShelfSearchModeBar, type ViewMode } from "./ShelfSearchModeBar";

type ShelfBooksScreenProps = {
  title: string;
  books: Book[];
  onImportBook?: () => Promise<void>;
  onBookPress?: (book: Book) => void;
  onBackPress: () => void;
};

const GRID_COLUMNS = 3;

export function ShelfBooksScreen({
  title,
  books,
  onImportBook,
  onBookPress,
  onBackPress,
}: ShelfBooksScreenProps) {
  const [activeView, setActiveView] = useState<ViewMode>("grid");
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const isGridView = activeView === "grid";

  const renderGridItem = useCallback<ListRenderItem<Book>>(
    ({ item }) => <ShelfBookGridItem book={item} onPress={onBookPress} />,
    [onBookPress],
  );

  const renderListItem = useCallback<ListRenderItem<Book>>(
    ({ item }) => <ShelfBookListItem book={item} onPress={onBookPress} />,
    [onBookPress],
  );

  const keyExtractor = useCallback((book: Book) => book.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ShelfDetailHeader
        title={title}
        onBackPress={onBackPress}
        onAddPress={() => setAddSheetVisible(true)}
      />
      <ShelfSearchModeBar
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <FlatList
        key={isGridView ? "grid" : "list"}
        data={books}
        keyExtractor={keyExtractor}
        renderItem={isGridView ? renderGridItem : renderListItem}
        numColumns={isGridView ? GRID_COLUMNS : 1}
        initialNumToRender={isGridView ? 6 : 4}
        maxToRenderPerBatch={isGridView ? 6 : 4}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          isGridView ? styles.gridContent : styles.listContent
        }
        columnWrapperStyle={isGridView ? styles.gridRow : undefined}
      />

      <AddBookSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onImportBook={onImportBook}
      />
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
    paddingBottom: 54,
    paddingHorizontal: 10,
    paddingTop: 40,
    rowGap: 25,
  },

  gridRow: {
    columnGap: 15,
    justifyContent: "space-between",
  },
});
