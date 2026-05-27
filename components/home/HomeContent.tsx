import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ShelvesSheet from "../ShelvesSheet";
import { BookInfoScreen } from "../bookInfo/BookInfoScreen";
import { ReaderScreen } from "../reader/ReaderScreen";
import { ShelfBooksScreen } from "../shelfDetail/ShelfBooksScreen";
import { initialShelves } from "../../shared/libraryData";
import type { Book, Shelf } from "../../shared/types";
import { HomeHeader } from "./HomeHeader";
import { ShelfSection } from "./ShelfSection";

type HomeContentProps = {
  books: Book[];
  bookToOpen?: Book | null;
  onImportBook: (shelfId: string) => Promise<void>;
};

export function HomeContent({
  books,
  bookToOpen,
  onImportBook,
}: HomeContentProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>(initialShelves);

  useEffect(() => {
    if (!bookToOpen?.importedAt) return;

    setReadingBook(null);
    setSelectedShelf(null);
    setSelectedBook(bookToOpen);
  }, [bookToOpen]);

  useEffect(() => {
    if (!selectedShelf && !selectedBook && !readingBook) return;

    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (readingBook) {
          setReadingBook(null);
          return true;
        }

        if (selectedBook) {
          setSelectedBook(null);
          return true;
        }

        setSelectedShelf(null);
        return true;
      },
    );

    return () => {
      backSubscription.remove();
    };
  }, [readingBook, selectedBook, selectedShelf]);

  const getBooksForShelf = useCallback(
    (shelfId: string) => {
      if (shelfId === "all") return books;
      if (shelfId === "recent") return books.slice(0, 4);

      return books.filter(
        (book) => book.shelfId === shelfId || book.shelfIds?.includes(shelfId),
      );
    },
    [books],
  );

  const getCountForShelf = (shelfId: string) => {
    if (shelfId === "all") return books.length;
    if (shelfId === "recent") return Math.min(4, books.length);

    return getBooksForShelf(shelfId).length;
  };

  const visibleShelves = useMemo(() => {
    return shelves.filter((shelf) => {
      if (shelf.id === "recent" || shelf.id === "all") return true;
      return getBooksForShelf(shelf.id).length > 0 || !shelf.locked;
    });
  }, [getBooksForShelf, shelves]);

  const handleAddShelf = () => {
    const nextNumber =
      shelves.filter((shelf) => shelf.title.startsWith("Новая полка")).length +
      1;

    setShelves((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: `Новая полка ${nextNumber}`,
        locked: false,
      },
    ]);
  };

  const handleDeleteShelf = (id: string) => {
    setShelves((prev) => prev.filter((shelf) => shelf.id !== id));
  };

  const handleReorderShelves = (newShelves: Shelf[]) => {
    setShelves(newShelves);
  };

  const handleRenameShelf = (id: string, newTitle: string) => {
    setShelves((prev) =>
      prev.map((shelf) =>
        shelf.id === id ? { ...shelf, title: newTitle } : shelf,
      ),
    );
  };

  const handleOpenShelf = (shelf: Shelf) => {
    setSelectedShelf(shelf);
  };

  const handleOpenBook = (book: Book) => {
    if (!book.importedAt) return;
    setSelectedBook(book);
  };

  if (selectedBook) {
    if (readingBook) {
      return <ReaderScreen book={readingBook} />;
    }

    return (
      <BookInfoScreen
        book={selectedBook}
        onBackPress={() => setSelectedBook(null)}
        onReadPress={() => setReadingBook(selectedBook)}
      />
    );
  }

  if (selectedShelf) {
    return (
      <ShelfBooksScreen
        title={selectedShelf.title}
        books={getBooksForShelf(selectedShelf.id)}
        onImportBook={() => onImportBook(selectedShelf.id)}
        onBookPress={handleOpenBook}
        onBackPress={() => setSelectedShelf(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HomeHeader onEditPress={() => setSheetVisible(true)} />

        {visibleShelves.map((shelf, index) => {
          const shelfBooks = getBooksForShelf(shelf.id);
          const bookCount = getCountForShelf(shelf.id);

          return (
            <ShelfSection
              key={shelf.id}
              shelf={shelf}
              books={shelfBooks}
              bookCount={bookCount}
              index={index}
              onBookPress={handleOpenBook}
              onPress={() => handleOpenShelf(shelf)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.blurContainer}>
        <BlurView intensity={12} tint="light" />
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ShelvesSheet
        visible={sheetVisible}
        shelves={shelves}
        getCountForShelf={getCountForShelf}
        onClose={() => setSheetVisible(false)}
        onAddShelf={handleAddShelf}
        onDeleteShelf={handleDeleteShelf}
        onReorder={handleReorderShelves}
        onRename={handleRenameShelf}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  content: {
    paddingBottom: 120,
  },

  blurContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 121,
  },
});
