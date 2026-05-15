// Содержимое главного экрана с полками: хранит книги/полки, открывает модальное окно и рисует список категорий.
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ShelvesSheet from "../ShelvesSheet";
import {
  getBooksForShelf,
  initialShelves,
  libraryBooks,
} from "../../shared/libraryData";
import type { Shelf } from "../../shared/types";
import { HomeHeader } from "./HomeHeader";
import { ShelfSection } from "./ShelfSection";

export function HomeContent() {
  const router = useRouter();

  // Управляет видимостью нижнего окна редактирования полок.
  const [sheetVisible, setSheetVisible] = useState(false);

  // Хранит порядок, названия и признак закрепления полок.
  const [shelves, setShelves] = useState<Shelf[]>(initialShelves);

  // Возвращает количество книг на полке. Для "Последние" показываем максимум 4 книги.
  const getCountForShelf = (shelfId: string) => {
    if (shelfId === "all") return libraryBooks.length;
    if (shelfId === "recent") return Math.min(4, libraryBooks.length);

    return getBooksForShelf(shelfId).length;
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

  // Открывает отдельный экран полки с книгами этой категории.
  const handleOpenShelf = (shelf: Shelf) => {
    router.push({
      pathname: "/shelf/[id]",
      params: { id: shelf.id, title: shelf.title },
    });
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
