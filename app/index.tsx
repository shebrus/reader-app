// Управляет переходом между стартовым экраном и экраном категорий как одной вертикальной страницей.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import type { PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";

import { HomeContent } from "../components/home/HomeContent";
import {
  ImportStatusBubble,
  type ImportStatusTask,
} from "../components/import/ImportStatusBubble";
import { IntroScreen } from "../components/intro/IntroScreen";
import {
  importPickedAudioSource,
  pickAndImportBook,
  pickAudioImportSource,
  type AudioImportProgress,
  type PendingAudio,
} from "../shared/importBook";
import {
  loadImportedBooks,
  saveImportedBooks,
} from "../shared/importedBooksStore";
import type { Book } from "../shared/types";

const OPEN_DISTANCE = 250;
const OPEN_VELOCITY = -650;

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const [introCompleted, setIntroCompleted] = useState(false);
  const [carouselActive, setCarouselActive] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [introBookToOpen, setIntroBookToOpen] = useState<Book | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [pendingAudioShelfId, setPendingAudioShelfId] = useState<string | null>(null);
  const [audioImportExpanded, setAudioImportExpanded] = useState(false);
  const [audioImportTask, setAudioImportTask] =
    useState<ImportStatusTask | null>(null);
  const audioImportHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Основная позиция всей вертикальной страницы: 0 - стартовый экран, -height - экран категорий.
  const baseTranslateY = useRef(new Animated.Value(0)).current;

  // Временное смещение пальцем во время свайпа.
  const dragTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    loadImportedBooks().then((importedBooks) => {
      if (cancelled) return;
      setBooks(importedBooks);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioImportHideTimer.current) {
        clearTimeout(audioImportHideTimer.current);
      }
    };
  }, []);

  // При изменении высоты экрана держим страницу в правильной позиции.
  useEffect(() => {
    baseTranslateY.setValue(introCompleted ? -height : 0);
    dragTranslateY.setValue(0);
  }, [baseTranslateY, dragTranslateY, height, introCompleted]);

  // Складываем постоянную позицию страницы и текущее движение пальца, затем ограничиваем диапазон.
  const pageTranslateY = useMemo(() => {
    return Animated.add(baseTranslateY, dragTranslateY).interpolate({
      inputRange: [-height, 0],
      outputRange: [-height, 0],
      extrapolate: "clamp",
    });
  }, [baseTranslateY, dragTranslateY, height]);

  // Связывает вертикальное движение пальца с движением всей страницы.
  const handleGesture = Animated.event(
    [{ nativeEvent: { translationY: dragTranslateY } }],
    { useNativeDriver: true },
  );

  // После отпускания пальца решает: завершить переход к категориям или вернуть стартовый экран.
  const handleHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) return;

    const { translationY, velocityY } = event.nativeEvent;
    const shouldOpen =
      translationY < -OPEN_DISTANCE || velocityY < OPEN_VELOCITY;

    if (shouldOpen) {
      const currentPosition = Math.max(Math.min(translationY, 0), -height);

      baseTranslateY.setValue(currentPosition);
      dragTranslateY.setValue(0);

      Animated.timing(baseTranslateY, {
        toValue: -height,
        duration: 420,
        useNativeDriver: true,
      }).start(() => {
        setIntroCompleted(true);
      });

      return;
    }

    Animated.spring(dragTranslateY, {
      toValue: 0,
      damping: 18,
      stiffness: 170,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleImportBook = async (shelfId: string) => {
    let importedBook: Book | null = null;

    try {
      importedBook = await pickAndImportBook(shelfId);
    } catch (error) {
      Alert.alert("Не удалось загрузить", getImportErrorMessage(error));
      return;
    }

    if (!importedBook) return;

    setBooks((currentBooks) => {
      const nextBooks = [importedBook, ...currentBooks];
      saveImportedBooks(nextBooks.filter((book) => book.importedAt));
      return nextBooks;
    });
  };

  const handleImportAudioBook = async (shelfId: string) => {
    let pickedAudioSource: Awaited<ReturnType<typeof pickAudioImportSource>> = null;

    try {
      pickedAudioSource = await pickAudioImportSource();
    } catch (error) {
      Alert.alert("Не удалось загрузить аудио", getImportErrorMessage(error));
      return;
    }

    if (!pickedAudioSource) return;

    if (audioImportHideTimer.current) {
      clearTimeout(audioImportHideTimer.current);
      audioImportHideTimer.current = null;
    }

    const taskId = `audio-import-${Date.now()}`;
    setAudioImportExpanded(false);
    setAudioImportTask({
      fileName: pickedAudioSource.originalFileName,
      id: taskId,
      message: "Начинаем импорт",
      progress: 0,
      status: "running",
      title: "Загрузка аудио",
    });

    setTimeout(() => {
      const updateProgress = (progress: AudioImportProgress) => {
        setAudioImportTask((currentTask) =>
          currentTask?.id === taskId
            ? {
                ...currentTask,
                fileName:
                  progress.currentTrackName ??
                  progress.fileName ??
                  currentTask.fileName,
                message: progress.message,
                progress: progress.progress ?? currentTask.progress,
              }
            : currentTask,
        );
      };

      void importPickedAudioSource(pickedAudioSource, updateProgress)
        .then((importedAudio) => {
          setPendingAudioShelfId(shelfId);
          setPendingAudio(importedAudio);
          setAudioImportExpanded(true);
          setAudioImportTask((currentTask) =>
            currentTask?.id === taskId
              ? {
                  ...currentTask,
                  fileName: importedAudio.fileName,
                  message: "Выберите книгу для привязки",
                  progress: 1,
                  status: "done",
                  title: "Аудио готово",
                }
              : currentTask,
          );
          audioImportHideTimer.current = setTimeout(() => {
            setAudioImportTask((currentTask) =>
              currentTask?.id === taskId ? null : currentTask,
            );
            setAudioImportExpanded(false);
          }, 7000);
        })
        .catch((error) => {
          setAudioImportExpanded(true);
          setAudioImportTask((currentTask) =>
            currentTask?.id === taskId
              ? {
                  ...currentTask,
                  message: getImportErrorMessage(error),
                  status: "error",
                  title: "Не удалось загрузить",
                }
              : currentTask,
          );
      });
    }, 0);
  };

  const handleImportAudioForBook = async (bookId: string) => {
    let pickedAudioSource: Awaited<ReturnType<typeof pickAudioImportSource>> = null;

    try {
      pickedAudioSource = await pickAudioImportSource();
    } catch (error) {
      Alert.alert("Не удалось загрузить аудио", getImportErrorMessage(error));
      return;
    }

    if (!pickedAudioSource) return;

    if (audioImportHideTimer.current) {
      clearTimeout(audioImportHideTimer.current);
      audioImportHideTimer.current = null;
    }

    const taskId = `audio-import-${Date.now()}`;
    setAudioImportExpanded(false);
    setAudioImportTask({
      fileName: pickedAudioSource.originalFileName,
      id: taskId,
      message: "Начинаем импорт",
      progress: 0,
      status: "running",
      title: "Загрузка аудио",
    });

    setTimeout(() => {
      const updateProgress = (progress: AudioImportProgress) => {
        setAudioImportTask((currentTask) =>
          currentTask?.id === taskId
            ? {
                ...currentTask,
                fileName:
                  progress.currentTrackName ??
                  progress.fileName ??
                  currentTask.fileName,
                message: progress.message,
                progress: progress.progress ?? currentTask.progress,
              }
            : currentTask,
        );
      };

      void importPickedAudioSource(pickedAudioSource, updateProgress)
        .then((importedAudio) => {
          setBooks((currentBooks) => {
            const nextBooks = currentBooks.map((book) =>
              book.id === bookId ? attachAudioToBook(book, importedAudio) : book,
            );
            saveImportedBooks(nextBooks.filter((book) => book.importedAt));
            return nextBooks;
          });
          setAudioImportExpanded(true);
          setAudioImportTask((currentTask) =>
            currentTask?.id === taskId
              ? {
                  ...currentTask,
                  fileName: importedAudio.fileName,
                  message: "Аудио прикреплено к книге",
                  progress: 1,
                  status: "done",
                  title: "Аудио готово",
                }
              : currentTask,
          );
          audioImportHideTimer.current = setTimeout(() => {
            setAudioImportTask((currentTask) =>
              currentTask?.id === taskId ? null : currentTask,
            );
            setAudioImportExpanded(false);
          }, 7000);
        })
        .catch((error) => {
          setAudioImportExpanded(true);
          setAudioImportTask((currentTask) =>
            currentTask?.id === taskId
              ? {
                  ...currentTask,
                  message: getImportErrorMessage(error),
                  status: "error",
                  title: "Не удалось загрузить",
                }
              : currentTask,
          );
        });
    }, 0);
  };

  const clearResolvedAudioImport = () => {
    setPendingAudio(null);
    setPendingAudioShelfId(null);
    setAudioImportTask((currentTask) =>
      currentTask?.status === "done" ? null : currentTask,
    );
    setAudioImportExpanded(false);
  };

  const handleAddStandaloneAudio = (audio: PendingAudio, shelfId: string) => {
    const importedAt = Date.now();
    const book: Book = {
      id: `audio-book-${importedAt}`,
      author: "Аудиокнига",
      audioChapterMarkers: audio.chapterMarkers,
      audioCurrentTrackIndex: 0,
      audioFileFormat: audio.fileFormat,
      audioFileName: audio.fileName,
      audioFileSize: audio.fileSize,
      audioPositionMillis: 0,
      audioReadingProgressRatio: 0,
      audioTracks: audio.tracks,
      audioUri: audio.fileUri,
      coverColor: "#DFF1FF",
      fileFormat: audio.fileFormat,
      fileName: audio.fileName,
      fileSize: audio.fileSize,
      fileUri: audio.fileUri,
      importedAt,
      notesCount: 0,
      pagesRead: 0,
      shelfId: shelfId === "recent" ? "all" : shelfId,
      title: getTitleFromFileName(audio.fileName),
      totalPages: 0,
    };

    setBooks((currentBooks) => {
      const nextBooks = [book, ...currentBooks];
      saveImportedBooks(nextBooks.filter((item) => item.importedAt));
      return nextBooks;
    });
    clearResolvedAudioImport();
  };

  const handleAttachAudio = (bookId: string, audio: PendingAudio) => {
    setBooks((currentBooks) => {
      const nextBooks = currentBooks.map((book) =>
        book.id === bookId ? attachAudioToBook(book, audio) : book,
      );

      saveImportedBooks(nextBooks.filter((book) => book.importedAt));
      return nextBooks;
    });
    clearResolvedAudioImport();
  };

  const handleBookDelete = (bookId: string, shelfId?: string) => {
    setBooks((currentBooks) => {
      const deleteEverywhere = !shelfId || shelfId === "all" || shelfId === "recent";
      const nextBooks = deleteEverywhere
        ? currentBooks.filter((book) => book.id !== bookId)
        : currentBooks.map((book) =>
            book.id === bookId ? removeBookFromShelf(book, shelfId) : book,
          );

      saveImportedBooks(nextBooks.filter((book) => book.importedAt));
      return nextBooks;
    });
  };

  const handleBookUpdate = (updatedBook: Book) => {
    setBooks((currentBooks) => {
      const currentBook = currentBooks.find((book) => book.id === updatedBook.id);
      if (
        currentBook &&
        getReaderStateKey(currentBook) === getReaderStateKey(updatedBook) &&
        getBookDetailsKey(currentBook) === getBookDetailsKey(updatedBook)
      ) {
        return currentBooks;
      }

      const nextBooks = currentBooks.map((book) =>
        book.id === updatedBook.id
          ? {
              ...book,
              ...updatedBook,
              audioFileFormat: updatedBook.audioFileFormat ?? book.audioFileFormat,
              audioFileName: updatedBook.audioFileName ?? book.audioFileName,
              audioFileSize: updatedBook.audioFileSize ?? book.audioFileSize,
              audioChapterMarkers:
                updatedBook.audioChapterMarkers ?? book.audioChapterMarkers,
              audioCurrentTrackIndex:
                updatedBook.audioCurrentTrackIndex ?? book.audioCurrentTrackIndex,
              audioTracks: updatedBook.audioTracks ?? book.audioTracks,
              audioUri: updatedBook.audioUri ?? book.audioUri,
            }
          : book,
      );

      saveImportedBooks(nextBooks.filter((book) => book.importedAt));

      return nextBooks;
    });
  };

  const handleIntroBookPress = (book: Book) => {
    setIntroBookToOpen(book);
    setIntroCompleted(true);
  };

  return (
    <PanGestureHandler
      enabled={!introCompleted && !carouselActive}
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleHandlerStateChange}
    >
      <Animated.View style={styles.root}>
        <Animated.View
          style={[
            styles.page,
            {
              height: height * 2,
              transform: [{ translateY: pageTranslateY }],
            },
          ]}
        >
          <View style={[styles.screen, { height }]}>
            <IntroScreen
              books={books}
              onBookPress={handleIntroBookPress}
              onCarouselActiveChange={setCarouselActive}
            />
          </View>

          <View style={[styles.screen, { height }]}>
            <HomeContent
              books={books}
              bookToOpen={introBookToOpen}
              onBookDelete={handleBookDelete}
              onBookUpdate={handleBookUpdate}
              onImportBook={handleImportBook}
              onImportAudioBook={handleImportAudioBook}
              onImportAudioForBook={handleImportAudioForBook}
              pendingAudio={pendingAudio}
              pendingAudioShelfId={pendingAudioShelfId}
              onCancelPendingAudio={clearResolvedAudioImport}
              onAddStandaloneAudio={handleAddStandaloneAudio}
              onAttachAudio={handleAttachAudio}
            />
          </View>
        </Animated.View>
        <ImportStatusBubble
          expanded={audioImportExpanded}
          task={audioImportTask}
          onDismiss={() => {
            setAudioImportTask(null);
            setAudioImportExpanded(false);
          }}
          onToggle={() => setAudioImportExpanded((expanded) => !expanded)}
        />
      </Animated.View>
    </PanGestureHandler>
  );
}

function getTitleFromFileName(fileName: string) {
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();

  return title || "Новая аудиокнига";
}

function attachAudioToBook(book: Book, audio: PendingAudio): Book {
  return {
    ...book,
    audioChapterMarkers: audio.chapterMarkers,
    audioCurrentTrackIndex: 0,
    audioFileName: audio.fileName,
    audioFileFormat: audio.fileFormat,
    audioFileSize: audio.fileSize,
    audioPositionMillis: 0,
    audioReadingProgressRatio: 0,
    audioTracks: audio.tracks,
    audioUri: audio.fileUri,
  };
}

function removeBookFromShelf(book: Book, shelfId: string): Book {
  const shelfIds = book.shelfIds?.filter((id) => id !== shelfId);

  return {
    ...book,
    shelfId: book.shelfId === shelfId ? "all" : book.shelfId,
    shelfIds: shelfIds && shelfIds.length > 0 ? shelfIds : undefined,
  };
}

function getImportErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Проверьте формат файла и попробуйте ещё раз.";
}

function getBookDetailsKey(book: Book) {
  return JSON.stringify({
    author: book.author,
    coverColor: book.coverColor,
    coverImage: book.coverImage,
    fileName: book.fileName,
    shelfId: book.shelfId,
    shelfIds: book.shelfIds,
    title: book.title,
  });
}

function getReaderStateKey(book: Book) {
  return JSON.stringify({
    audioChapterMarkers: book.audioChapterMarkers,
    audioCurrentTrackIndex: book.audioCurrentTrackIndex,
    audioDurationMillis: book.audioDurationMillis,
    audioPendingTrackProgressRatio: book.audioPendingTrackProgressRatio,
    audioPositionMillis: book.audioPositionMillis,
    audioReadingProgressRatio: book.audioReadingProgressRatio,
    audioTextChapterIndex: book.audioTextChapterIndex,
    audioTextChapterProgressRatio: book.audioTextChapterProgressRatio,
    audioTextChapterTitle: book.audioTextChapterTitle,
    audioTextJumpRequestedAt: book.audioTextJumpRequestedAt,
    audioTracks: book.audioTracks,
    notesCount: book.notesCount,
    pagesRead: book.pagesRead,
    readerBrightness: book.readerBrightness,
    readerContentVersion: book.readerContentVersion,
    readerCustomThemes: book.readerCustomThemes,
    readerFontSize: book.readerFontSize,
    readerPageTurnMode: book.readerPageTurnMode,
    readerTextSettings: book.readerTextSettings,
    readerThemeId: book.readerThemeId,
    readerThemeMode: book.readerThemeMode,
    readingBookmark: book.readingBookmark,
    readingChapterIndex: book.readingChapterIndex,
    readingNotes: book.readingNotes,
    readingPageIndex: book.readingPageIndex,
    totalPages: book.totalPages,
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },

  page: {
    width: "100%",
    backgroundColor: "#F5F5F5",
  },

  screen: {
    width: "100%",
    backgroundColor: "#F5F5F5",
  },
});
