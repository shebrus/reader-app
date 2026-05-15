// Экран выбранной полки: собирает шапку, поиск, переключатели вида и список книг.
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Book } from "../../shared/types";
import { ShelfBookListItem } from "./ShelfBookListItem";
import { ShelfDetailHeader } from "./ShelfDetailHeader";
import { ShelfSearchModeBar } from "./ShelfSearchModeBar";

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
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ShelfDetailHeader title={title} onBackPress={onBackPress} />
      <ShelfSearchModeBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {books.map((book) => (
          <ShelfBookListItem key={book.id} book={book} />
        ))}
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
});
