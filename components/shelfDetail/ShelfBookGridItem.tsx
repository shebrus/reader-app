// Карточка книги для режима сетки: компактная обложка, подписи, прогресс и иконки форматов.
import { Image, StyleSheet, Text, View } from "react-native";

import { BookCardNew } from "../BookCardNew";
import type { Book } from "../../shared/types";

const BOOK_WIDTH = 108;

type ShelfBookGridItemProps = {
  book: Book;
};

export function ShelfBookGridItem({ book }: ShelfBookGridItemProps) {
  const progress = getBookProgress(book);
  const isBookUnavailable = book.id === "3";
  const isAudioUnavailable = book.id === "4";

  return (
    <View style={styles.card}>
      <BookCardNew
        coverImage={book.coverImage}
        width={BOOK_WIDTH}
        style={styles.cover}
      />

      <View style={styles.info}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {book.title}
          </Text>
          <Text numberOfLines={1} style={styles.author}>
            {book.author}
          </Text>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressTopRow}>
            <View style={styles.pagesRow}>
              <Text style={styles.pagesText}>
                {book.pagesRead} из {book.totalPages}
              </Text>
              <Image
                source={require("../../assets/icons/book-open-icon.png")}
                style={styles.progressIcon}
              />
            </View>

            <Text style={styles.percentText}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.formatIcons}>
          <Image
            source={
              isBookUnavailable
                ? require("../../assets/icons/book-close-icon.png")
                : require("../../assets/icons/book-icon.png")
            }
            style={[
              styles.formatIcon,
              !isBookUnavailable && styles.activeFormatIcon,
            ]}
          />
          <Image
            source={require("../../assets/icons/headphones-icon.png")}
            style={[
              styles.formatIcon,
              !isAudioUnavailable && styles.activeFormatIcon,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function getBookProgress(book: Book) {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100));
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    width: 108,
  },

  cover: {
    flexShrink: 0,
  },

  info: {
    gap: 5,
    width: 108,
  },

  titleBlock: {
    height: 43,
    justifyContent: "center",
  },

  title: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14,
  },

  author: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 10,
    fontWeight: "300",
    lineHeight: 12,
  },

  progressBlock: {
    gap: 4,
    width: 108,
  },

  progressTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },

  pagesRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },

  pagesText: {
    color: "#000000",
    fontFamily: "SFProText-Light",
    fontSize: 10,
    fontWeight: "300",
    lineHeight: 12,
  },

  progressIcon: {
    height: 16,
    resizeMode: "contain",
    tintColor: "#0084FF",
    width: 16,
  },

  percentText: {
    color: "#192024",
    fontFamily: "SFProText-Light",
    fontSize: 10,
    fontWeight: "300",
    lineHeight: 12,
  },

  progressTrack: {
    backgroundColor: "#E2E2E2",
    borderRadius: 15,
    height: 4,
    overflow: "hidden",
    width: 108,
  },

  progressFill: {
    backgroundColor: "#80C2FF",
    borderRadius: 16,
    height: 4,
  },

  formatIcons: {
    flexDirection: "row",
    gap: 4,
    height: 22,
  },

  formatIcon: {
    height: 22,
    resizeMode: "contain",
    width: 22,
  },

  activeFormatIcon: {
    tintColor: "#0084FF",
  },
});
