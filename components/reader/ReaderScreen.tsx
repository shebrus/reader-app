import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { readBookContent, type ReadingContent } from "../../shared/bookReader";
import type { Book } from "../../shared/types";

type ReaderScreenProps = {
  book: Book;
};

const DESIGN_WIDTH = 375;
const CONTENT_WIDTH = 322;

export function ReaderScreen({ book }: ReaderScreenProps) {
  const { width } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  const [content, setContent] = useState<ReadingContent | null>(null);

  useEffect(() => {
    let cancelled = false;

    readBookContent(book).then((nextContent) => {
      if (cancelled) return;
      setContent(nextContent);
    });

    return () => {
      cancelled = true;
    };
  }, [book]);

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Text
        numberOfLines={1}
        style={[
          styles.chapterMeta,
          {
            left: 106 * scale,
            top: 65 * scale,
            width: 164 * scale,
          },
        ]}
      >
        {content?.chapterTitle ?? book.title}
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[
          styles.textViewport,
          {
            height: 639 * scale,
            left: 27 * scale,
            top: 97 * scale,
            width: CONTENT_WIDTH * scale,
          },
        ]}
        contentContainerStyle={styles.textContent}
      >
        {content ? (
          <Text style={styles.readerText}>{content.text}</Text>
        ) : (
          <View style={styles.loader}>
            <ActivityIndicator color="#4B4B4B" />
          </View>
        )}
      </ScrollView>

      <Text
        style={[
          styles.pageLabel,
          {
            left: 156 * scale,
            top: 756 * scale,
            width: 64 * scale,
          },
        ]}
      >
        1 из {book.totalPages > 0 ? book.totalPages : 1}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },

  chapterMeta: {
    color: "#4B4B4B",
    fontFamily: "SFProText-Light",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 19,
    position: "absolute",
    textAlign: "center",
  },

  textViewport: {
    flexGrow: 0,
    position: "absolute",
  },

  textContent: {
    paddingBottom: 32,
  },

  readerText: {
    color: "#E0E0E0",
    fontFamily: "Georgia",
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 23,
  },

  loader: {
    alignItems: "center",
    minHeight: 180,
    justifyContent: "center",
  },

  pageLabel: {
    color: "#4E4E4E",
    fontFamily: "SFProText-Light",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 19,
    position: "absolute",
    textAlign: "center",
  },
});
