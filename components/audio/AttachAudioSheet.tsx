import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Book, Shelf } from "../../shared/types";
import type { PendingAudio } from "../../shared/importBook";
import { getBookAudioTracks } from "../../shared/audioBook";

type AttachAudioSheetProps = {
  audio: PendingAudio | null;
  books: Book[];
  shelves: Shelf[];
  visible: boolean;
  onAddStandalone?: (audio: PendingAudio) => void;
  onClose: () => void;
  onAttach: (bookId: string, audio: PendingAudio) => void;
};

export function AttachAudioSheet({
  audio,
  books,
  shelves,
  visible,
  onAddStandalone,
  onClose,
  onAttach,
}: AttachAudioSheetProps) {
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);

  const shelfOptions = useMemo(
    () => shelves.filter((shelf) => shelf.id !== "recent"),
    [shelves],
  );

  const booksForShelf = useMemo(() => {
    if (!selectedShelfId || !audio) return [];

    if (selectedShelfId === "all") return books;
    return books.filter(
      (book) => book.shelfId === selectedShelfId || book.shelfIds?.includes(selectedShelfId),
    );
  }, [audio, books, selectedShelfId]);

  const handleClose = () => {
    setSelectedShelfId(null);
    onClose();
  };

  const handlePickBook = (bookId: string) => {
    if (!audio) return;
    onAttach(bookId, audio);
    handleClose();
  };

  const handleAddStandalone = () => {
    if (!audio) return;
    onAddStandalone?.(audio);
    handleClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.backdrop} />
        </Pressable>

        <View style={styles.sheet}>
          <Text style={styles.title}>Привязать аудио к книге</Text>

          <View style={styles.subTitleBlock}>
            <Text numberOfLines={1} style={styles.subTitleLabel}>
              Аудиофайл
            </Text>
            <Text numberOfLines={1} style={styles.subTitleValue}>
              {audio?.fileName ?? "--"}
            </Text>
          </View>

          <Pressable onPress={handleAddStandalone} style={styles.standaloneButton}>
            <Text style={styles.standaloneText}>Р”РѕР±Р°РІРёС‚СЊ РєР°Рє Р°СѓРґРёРѕРєРЅРёРіСѓ</Text>
          </Pressable>

          {!selectedShelfId ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.listContent}>
              {shelfOptions.map((shelf) => (
                <Pressable
                  key={shelf.id}
                  onPress={() => setSelectedShelfId(shelf.id)}
                  style={styles.row}
                >
                  <Text style={styles.rowTitle}>{shelf.title}</Text>
                  <Text style={styles.rowMeta}>{countBooksForShelf(books, shelf.id)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.listContent}>
              <Pressable onPress={() => setSelectedShelfId(null)} style={styles.backRow}>
                <Text style={styles.backText}>Назад к категориям</Text>
              </Pressable>

              {booksForShelf.map((book) => (
                <Pressable key={book.id} onPress={() => handlePickBook(book.id)} style={styles.row}>
                  <View style={styles.bookTextBlock}>
                    <Text numberOfLines={1} style={styles.rowTitle}>{book.title}</Text>
                    <Text numberOfLines={1} style={styles.rowSubtitle}>{book.author}</Text>
                  </View>
                  <Text style={styles.rowMeta}>
                    {getBookAudioTracks(book).length > 0 ? "Есть аудио" : "Без аудио"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Отмена</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function countBooksForShelf(books: Book[], shelfId: string) {
  if (shelfId === "all") return `${books.length}`;
  return `${books.filter((book) => book.shelfId === shelfId || book.shelfIds?.includes(shelfId)).length}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(25, 32, 36, 0.28)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: {
    color: "#192024",
    fontFamily: "SourceSerif4-Regular",
    fontSize: 24,
    lineHeight: 30,
  },
  subTitleBlock: {
    backgroundColor: "#F5F7FA",
    borderRadius: 18,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subTitleLabel: {
    color: "#7A7F85",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
  },
  subTitleValue: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
  },
  list: { maxHeight: 430 },
  listContent: { gap: 10, paddingBottom: 10 },
  row: {
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowTitle: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 15,
  },
  rowSubtitle: {
    color: "#7A7F85",
    fontFamily: "SFProText-Light",
    fontSize: 12,
  },
  rowMeta: {
    color: "#7BBDFA",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
  },
  bookTextBlock: { flex: 1, gap: 2 },
  standaloneButton: {
    alignItems: "center",
    backgroundColor: "#7BBDFA",
    borderRadius: 18,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  standaloneText: {
    color: "#FFFFFF",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
  },
  backRow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(123, 189, 250, 0.12)",
    borderRadius: 999,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
  },
  cancelButton: {
    alignSelf: "center",
    backgroundColor: "#F2F6FA",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
  },
});
