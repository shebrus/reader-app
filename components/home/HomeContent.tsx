// Содержимое главного экрана с полками: хранит книги/полки, открывает модальное окно и рисует список категорий.
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ShelvesSheet from "../ShelvesSheet";
import type { Book, Shelf } from "../../shared/types";
import { HomeHeader } from "./HomeHeader";
import { ShelfSection } from "./ShelfSection";

// Временные локальные данные книг. Позже их можно будет заменить на данные из хранилища.
const allBooks: Book[] = [
  {
    id: "1",
    coverImage: require("../../assets/covers/cover1.png"),
    shelfId: "fantasy",
  },
  {
    id: "2",
    coverImage: require("../../assets/covers/cover2.png"),
    shelfId: "science",
  },
  {
    id: "3",
    coverImage: require("../../assets/covers/cover3.png"),
    shelfId: "fantasy",
  },
  {
    id: "4",
    coverImage: require("../../assets/covers/cover4.png"),
    shelfId: "recommended",
  },
  {
    id: "5",
    coverImage: require("../../assets/covers/cover5.jpg"),
    shelfId: "science",
  },
  {
    id: "6",
    coverImage: require("../../assets/covers/cover6.jpg"),
    shelfId: "recommended",
  },
];

export function HomeContent() {
  // Управляет видимостью нижнего окна редактирования полок.
  const [sheetVisible, setSheetVisible] = useState(false);

  // Хранит порядок, названия и признак закрепления полок.
  const [shelves, setShelves] = useState<Shelf[]>([
    { id: "recent", title: "Последние", locked: true },
    { id: "all", title: "Все", locked: true },
    { id: "fantasy", title: "Фантастика", locked: false },
    { id: "science", title: "Научные", locked: false },
    { id: "recommended", title: "Посоветовали", locked: false },
  ]);

  // Возвращает книги, которые относятся к конкретной полке.
  const getBooksForShelf = (shelfId: string) => {
    if (shelfId === "all") return allBooks;
    if (shelfId === "recent") return allBooks.slice(0, 4);

    return allBooks.filter((book) => book.shelfId === shelfId);
  };

  // Возвращает количество книг на полке. Для "Последние" показываем максимум 4 книги.
  const getCountForShelf = (shelfId: string) => {
    if (shelfId === "all") return allBooks.length;
    if (shelfId === "recent") return Math.min(4, allBooks.length);

    return allBooks.filter((book) => book.shelfId === shelfId).length;
  };

  // Оставляет на главном экране закрепленные полки и пользовательские полки, даже если они пустые.
  const visibleShelves = useMemo(() => {
    return shelves.filter((shelf) => {
      if (shelf.id === "recent" || shelf.id === "all") return true;
      return getBooksForShelf(shelf.id).length > 0 || !shelf.locked;
    });
  }, [shelves]);

  // Добавляет новую пустую пользовательскую полку в конец списка.
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

  // Удаляет полку по id.
  const handleDeleteShelf = (id: string) => {
    setShelves((prev) => prev.filter((shelf) => shelf.id !== id));
  };

  // Сохраняет новый порядок полок после перетаскивания в модальном окне.
  const handleReorderShelves = (newShelves: Shelf[]) => {
    setShelves(newShelves);
  };

  // Обновляет название полки после редактирования.
  const handleRenameShelf = (id: string, newTitle: string) => {
    setShelves((prev) =>
      prev.map((shelf) =>
        shelf.id === id ? { ...shelf, title: newTitle } : shelf,
      ),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HomeHeader onEditPress={() => setSheetVisible(true)} />

        {visibleShelves.map((shelf, index) => {
          const books = getBooksForShelf(shelf.id);
          const bookCount = getCountForShelf(shelf.id);

          return (
            <ShelfSection
              key={shelf.id}
              shelf={shelf}
              books={books}
              bookCount={bookCount}
              index={index}
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
