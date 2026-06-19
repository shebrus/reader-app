import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ShelvesSheet from "../ShelvesSheet";
import { AttachAudioSheet } from "../audio/AttachAudioSheet";
import { EditBookScreen } from "../bookInfo/EditBookScreen";
import { BookInfoScreen } from "../bookInfo/BookInfoScreen";
import { AudioPlayerScreen } from "../audio/AudioPlayerScreen";
import { ReaderScreen } from "../reader/ReaderScreen";
import { ShelfBooksScreen } from "../shelfDetail/ShelfBooksScreen";
import {
  getAudioProgressRatio,
  getBookAudioTracks,
  isAudioBookFormat,
} from "../../shared/audioBook";
import { initialShelves } from "../../shared/libraryData";
import type { PendingAudio } from "../../shared/importBook";
import type {
  AudioPlaybackPosition,
  AudioTextPosition,
  Book,
  Shelf,
} from "../../shared/types";
import { HomeHeader } from "./HomeHeader";
import { ShelfSection } from "./ShelfSection";

type HomeContentProps = {
  books: Book[];
  bookToOpen?: Book | null;
  pendingAudio: PendingAudio | null;
  pendingAudioShelfId: string | null;
  onBookUpdate: (book: Book) => void;
  onBookDelete: (bookId: string, shelfId?: string) => void;
  onImportBook: (shelfId: string) => Promise<void>;
  onImportAudioBook: (shelfId: string) => Promise<void>;
  onImportAudioForBook: (bookId: string) => Promise<void>;
  onAddStandaloneAudio: (audio: PendingAudio, shelfId: string) => void;
  onAttachAudio: (bookId: string, audio: PendingAudio) => void;
  onCancelPendingAudio: () => void;
};

export function HomeContent({
  books,
  bookToOpen,
  pendingAudio,
  pendingAudioShelfId,
  onBookUpdate,
  onBookDelete,
  onImportBook,
  onImportAudioBook,
  onImportAudioForBook,
  onAddStandaloneAudio,
  onAttachAudio,
  onCancelPendingAudio,
}: HomeContentProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [listeningBook, setListeningBook] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>(initialShelves);

  useEffect(() => {
    if (!bookToOpen?.importedAt) return;

    setListeningBook(null);
    setReadingBook(null);
    setEditingBook(null);
    setSelectedShelf(null);
    setSelectedBook(bookToOpen);
  }, [bookToOpen]);

  useEffect(() => {
    const syncBook = (currentBook: Book | null) => {
      if (!currentBook) return null;
      return books.find((book) => book.id === currentBook.id) ?? null;
    };

    setSelectedBook(syncBook);
    setReadingBook(syncBook);
    setListeningBook(syncBook);
    setEditingBook(syncBook);
  }, [books]);

  useEffect(() => {
    if (!selectedShelf && !selectedBook && !readingBook && !listeningBook && !editingBook)
      return;

    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (editingBook) {
          setEditingBook(null);
          return true;
        }

        if (listeningBook) {
          setListeningBook(null);
          return true;
        }

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
  }, [editingBook, listeningBook, readingBook, selectedBook, selectedShelf]);

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

  const handleAttachAudioToBook = (bookId: string, audio: PendingAudio) => {
    const audioFields = {
      audioChapterMarkers: audio.chapterMarkers,
      audioCurrentTrackIndex: 0,
      audioFileFormat: audio.fileFormat,
      audioFileName: audio.fileName,
      audioFileSize: audio.fileSize,
      audioPositionMillis: 0,
      audioReadingProgressRatio: 0,
      audioTracks: audio.tracks,
      audioUri: audio.fileUri,
    };

    setSelectedBook((currentBook) =>
      currentBook?.id === bookId ? { ...currentBook, ...audioFields } : currentBook,
    );
    setReadingBook((currentBook) =>
      currentBook?.id === bookId ? { ...currentBook, ...audioFields } : currentBook,
    );
    setListeningBook((currentBook) =>
      currentBook?.id === bookId ? { ...currentBook, ...audioFields } : currentBook,
    );
    onAttachAudio(bookId, audio);
  };

  const handleAddStandaloneAudio = (audio: PendingAudio) => {
    onAddStandaloneAudio(audio, pendingAudioShelfId ?? selectedShelf?.id ?? "all");
  };

  const handleReaderProgressChange = (updatedBook: Book) => {
    setSelectedBook((currentBook) =>
      currentBook
        ? {
            ...currentBook,
            ...updatedBook,
            audioFileFormat:
              updatedBook.audioFileFormat ?? currentBook.audioFileFormat,
            audioFileName: updatedBook.audioFileName ?? currentBook.audioFileName,
            audioFileSize: updatedBook.audioFileSize ?? currentBook.audioFileSize,
            audioUri: updatedBook.audioUri ?? currentBook.audioUri,
          }
        : updatedBook,
    );
    setReadingBook((currentBook) =>
      currentBook
        ? {
            ...currentBook,
            ...updatedBook,
            audioFileFormat:
              updatedBook.audioFileFormat ?? currentBook.audioFileFormat,
            audioFileName: updatedBook.audioFileName ?? currentBook.audioFileName,
            audioFileSize: updatedBook.audioFileSize ?? currentBook.audioFileSize,
            audioUri: updatedBook.audioUri ?? currentBook.audioUri,
          }
        : updatedBook,
    );
    setListeningBook(null);
    onBookUpdate(updatedBook);
  };

  const handleAudioProgressChange = (updatedBook: Book) => {
    setSelectedBook((currentBook) =>
      currentBook?.id === updatedBook.id ? { ...currentBook, ...updatedBook } : currentBook,
    );
    setListeningBook((currentBook) =>
      currentBook?.id === updatedBook.id ? { ...currentBook, ...updatedBook } : currentBook,
    );
    onBookUpdate(updatedBook);
  };

  const handleOpenSelectedBook = () => {
    if (!selectedBook) return;
    if (isAudioBookFormat(selectedBook.fileFormat)) {
      handleListenSelectedBook();
      return;
    }

    setReadingBook(selectedBook);
  };

  const handleListenSelectedBook = () => {
    if (!selectedBook || getBookAudioTracks(selectedBook).length === 0) return;

    setReadingBook(null);
    setListeningBook(selectedBook);
  };

  const getSelectedBookDeleteMode = () =>
    selectedShelf && selectedShelf.id !== "all" && selectedShelf.id !== "recent"
      ? "shelf"
      : "library";

  const handleDeleteSelectedBook = () => {
    if (!selectedBook) return;

    const deleteMode = getSelectedBookDeleteMode();
    Alert.alert(
      deleteMode === "library" ? "Удалить книгу?" : "Убрать из категории?",
      deleteMode === "library"
        ? "Книга исчезнет из всех категорий."
        : "Книга останется в разделе «Все».",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: deleteMode === "library" ? "Удалить" : "Убрать",
          style: "destructive",
          onPress: () => {
            onBookDelete(selectedBook.id, selectedShelf?.id);
            setEditingBook(null);
            setListeningBook(null);
            setReadingBook(null);
            setSelectedBook(null);
          },
        },
      ],
    );
  };

  const handleSaveEditedBook = (updatedBook: Book) => {
    setEditingBook(null);
    setSelectedBook(updatedBook);
    onBookUpdate(updatedBook);
  };

  const handleImportAudioForSelectedBook = () => {
    if (!selectedBook) return;
    void onImportAudioForBook(selectedBook.id);
  };

  const handleOpenTextAtAudioPosition = (
    textPosition: AudioTextPosition,
    playback: {
      durationMillis: number;
      positionMillis: number;
      trackIndex: number;
    },
  ) => {
    const sourceBook = selectedBook ?? listeningBook;
    if (!sourceBook || isAudioBookFormat(sourceBook.fileFormat)) return;

    const bookAtAudioPosition = {
      ...sourceBook,
      audioCurrentTrackIndex: playback.trackIndex,
      audioDurationMillis: playback.durationMillis,
      audioPositionMillis: playback.positionMillis,
      audioReadingProgressRatio: Math.max(
        0,
        Math.min(textPosition.progressRatio, 1),
      ),
      audioTextChapterIndex: textPosition.chapterIndex,
      audioTextChapterProgressRatio: textPosition.chapterProgressRatio,
      audioTextChapterTitle: textPosition.chapterTitle,
      audioTextJumpRequestedAt: Date.now(),
    };

    setListeningBook(null);
    setSelectedBook(bookAtAudioPosition);
    setReadingBook(bookAtAudioPosition);
    onBookUpdate(bookAtAudioPosition);
  };

  const handleOpenAudioAtTextPosition = (playback: AudioPlaybackPosition) => {
    const sourceBook = readingBook ?? selectedBook;
    if (!sourceBook) return;

    const tracks = getBookAudioTracks(sourceBook);
    if (tracks.length === 0) return;

    const trackIndex = clampNumber(playback.trackIndex, 0, tracks.length - 1);
    const track = tracks[trackIndex];
    const trackDurationMillis =
      playback.durationMillis ??
      track.durationMillis ??
      (sourceBook.audioCurrentTrackIndex === trackIndex
        ? sourceBook.audioDurationMillis
        : undefined);
    const trackProgressRatio = clampNumber(playback.trackProgressRatio, 0, 1);
    const positionMillis =
      typeof playback.positionMillis === "number"
        ? Math.max(
            0,
            trackDurationMillis
              ? Math.min(playback.positionMillis, trackDurationMillis)
              : playback.positionMillis,
          )
        :
      trackDurationMillis && trackDurationMillis > 0
        ? Math.round(trackDurationMillis * trackProgressRatio)
        : 0;
    const readingProgressRatio =
      trackDurationMillis && trackDurationMillis > 0
        ? getAudioProgressRatio(
            tracks,
            trackIndex,
            positionMillis,
            trackDurationMillis,
          )
        : tracks.length > 1
          ? clampNumber((trackIndex + trackProgressRatio) / tracks.length, 0, 1)
          : trackProgressRatio;
    const bookAtTextPosition: Book = {
      ...sourceBook,
      audioCurrentTrackIndex: trackIndex,
      audioDurationMillis: trackDurationMillis ?? sourceBook.audioDurationMillis,
      audioPendingTrackProgressRatio:
        trackDurationMillis && trackDurationMillis > 0
          ? undefined
          : trackProgressRatio,
      audioPositionMillis: positionMillis,
      audioReadingProgressRatio: readingProgressRatio,
      audioTextChapterIndex: undefined,
      audioTextChapterProgressRatio: undefined,
      audioTextChapterTitle: undefined,
      audioTextJumpRequestedAt: undefined,
      audioUri: track?.uri ?? sourceBook.audioUri,
    };

    setReadingBook(null);
    setSelectedBook(bookAtTextPosition);
    setListeningBook(bookAtTextPosition);
    onBookUpdate(bookAtTextPosition);
  };

  const attachAudioSheet = (
    <AttachAudioSheet
      audio={pendingAudio}
      books={books}
      shelves={shelves}
      visible={Boolean(pendingAudio)}
      onAddStandalone={handleAddStandaloneAudio}
      onClose={onCancelPendingAudio}
      onAttach={handleAttachAudioToBook}
    />
  );

  if (selectedBook) {
    if (editingBook) {
      return (
        <>
          <EditBookScreen
            book={editingBook}
            onBackPress={() => setEditingBook(null)}
            onSave={handleSaveEditedBook}
          />
          {attachAudioSheet}
        </>
      );
    }

    if (listeningBook) {
      return (
        <>
          <AudioPlayerScreen
            book={listeningBook}
            onClose={() => setListeningBook(null)}
            onOpenTextAtPosition={handleOpenTextAtAudioPosition}
            onProgressChange={handleAudioProgressChange}
          />
          {attachAudioSheet}
        </>
      );
    }

    if (readingBook) {
      return (
        <>
          <ReaderScreen
            book={readingBook}
            key={readingBook.id}
            onClose={() => setReadingBook(null)}
            onOpenAudioAtPosition={handleOpenAudioAtTextPosition}
            onProgressChange={handleReaderProgressChange}
          />
          {attachAudioSheet}
        </>
      );
    }

    return (
      <>
        <BookInfoScreen
          book={selectedBook}
          deleteMode={getSelectedBookDeleteMode()}
          onAddAudioPress={handleImportAudioForSelectedBook}
          onBackPress={() => setSelectedBook(null)}
          onDeletePress={handleDeleteSelectedBook}
          onEditPress={() => setEditingBook(selectedBook)}
          onReadPress={handleOpenSelectedBook}
          onListenPress={handleListenSelectedBook}
        />
        {attachAudioSheet}
      </>
    );
  }

  if (selectedShelf) {
    return (
      <>
        <ShelfBooksScreen
          title={selectedShelf.title}
          books={getBooksForShelf(selectedShelf.id)}
          onImportBook={() => onImportBook(selectedShelf.id)}
          onImportAudioBook={() => onImportAudioBook(selectedShelf.id)}
          onBookPress={handleOpenBook}
          onBackPress={() => setSelectedShelf(null)}
        />
        {attachAudioSheet}
      </>
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

      {attachAudioSheet}
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
