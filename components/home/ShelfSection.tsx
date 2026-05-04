// одна секция полки: название, количество книг, горизонтальный список книг, синяя плашка.
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BookCardNew } from "../BookCardNew";
import { HomeScreenOverlay } from "../HomeScreenOverlay";
import { getBookCountLabel } from "./bookCount";
import type { Book, Shelf } from "../../shared/types";

const HOME_BOOK_WIDTH = 81;
const HOME_BOOK_HEIGHT = HOME_BOOK_WIDTH * (820 / 540);
const ROW_PADDING = 18;
const TEXT_FONT_FAMILY = "SFProText-Light";
const TEXT_FONT_WEIGHT = "300";

type ShelfSectionProps = {
  shelf: Shelf;
  books: Book[];
  bookCount: number;
  index: number;
};

export function ShelfSection({
  shelf,
  books,
  bookCount,
  index,
}: ShelfSectionProps) {
  return (
    <View style={styles.shelfWrapper}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{shelf.title}</Text>

        <View style={styles.rowHeaderRight}>
          <Text style={styles.count}>{getBookCountLabel(bookCount)}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        style={styles.booksViewport}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.booksScroll}
      >
        {books.map((book) => (
          <BookCardNew
            key={book.id}
            coverImage={book.coverImage}
            width={HOME_BOOK_WIDTH}
            style={styles.bookCard}
          />
        ))}
      </ScrollView>

      <HomeScreenOverlay isEven={index % 2 === 1} />
    </View>
  );
}

const styles = StyleSheet.create({
  shelfWrapper: {
    height: 208,
    marginBottom: 40,
    paddingLeft: 10,
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 27,
    paddingLeft: 22,
    paddingRight: 32,
  },

  rowTitle: {
    fontFamily: TEXT_FONT_FAMILY,
    fontWeight: TEXT_FONT_WEIGHT,
    fontSize: 16,
    lineHeight: 19,
    color: "#192024",
  },

  rowHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  count: {
    fontFamily: TEXT_FONT_FAMILY,
    fontWeight: TEXT_FONT_WEIGHT,
    fontSize: 12,
    lineHeight: 14,
    color: "#ADADAD",
  },

  booksScroll: {
    paddingLeft: 19,
    paddingRight: ROW_PADDING,
    paddingBottom: 4,
  },

  booksViewport: {
    height: HOME_BOOK_HEIGHT + 4,
    overflow: "visible",
  },

  bookCard: {
    marginRight: 10,
  },
});
