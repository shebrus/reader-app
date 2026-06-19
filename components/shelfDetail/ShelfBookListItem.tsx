// Строка книги в режиме списка: обложка, название, автор, прогресс чтения и иконки форматов.
import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { BookCardNew } from "../BookCardNew";
import { getBookAudioTracks, isAudioBookFormat } from "../../shared/audioBook";
import type { Book } from "../../shared/types";

const BOOK_WIDTH = 108;

type ShelfBookListItemProps = {
  book: Book;
  onPress?: (book: Book) => void;
};

function ShelfBookListItemComponent({ book, onPress }: ShelfBookListItemProps) {
  const progress = getBookProgress(book);
  const hasReadableBook = !isAudioBookFormat(book.fileFormat);
  const hasAudio = getBookAudioTracks(book).length > 0 || isAudioBookFormat(book.fileFormat);

  return (
    <Pressable
      disabled={!book.importedAt || !onPress}
      onPress={() => onPress?.(book)}
      style={styles.item}
    >
      <BookCardNew
        coverImage={book.coverImage}
        coverColor={book.coverColor}
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
              hasReadableBook
                ? require("../../assets/icons/book-icon.png")
                : require("../../assets/icons/book-close-icon.png")
            }
            style={[
              styles.formatIcon,
              hasReadableBook && styles.activeFormatIcon,
            ]}
          />
          <Image
            source={require("../../assets/icons/headphones-icon.png")}
            style={[
              styles.formatIcon,
              hasAudio && styles.activeFormatIcon,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

export const ShelfBookListItem = memo(ShelfBookListItemComponent);

function getBookProgress(book: Book) {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100));
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    height: 164,
    width: "100%",
  },

  cover: {
    flexShrink: 0,
  },

  info: {
    flex: 1,
    gap: 12,
    maxWidth: 211,
  },

  titleBlock: {
    gap: 4,
  },

  title: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 19,
  },

  author: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 12,
    fontWeight: "300",
    lineHeight: 14,
  },

  progressBlock: {
    gap: 4,
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
    width: "100%",
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
