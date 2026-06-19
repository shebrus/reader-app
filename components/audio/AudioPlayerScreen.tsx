import { Ionicons } from "@expo/vector-icons";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCardNew } from "../BookCardNew";
import {
  buildAudioTextPosition,
  getAudioFormatLabel,
  getAudioProgressRatio,
  getAudioTotalSize,
  getBookAudioTracks,
  isAudioBookFormat,
  mergeTrackDuration,
} from "../../shared/audioBook";
import type {
  AudioTextPosition,
  Book,
  BookAudioTrack,
  ReadingNote,
} from "../../shared/types";

type AudioNoteDraft = {
  audioDurationMillis: number;
  audioFileName?: string;
  audioPositionMillis: number;
  audioProgressRatio: number;
  audioTrackIndex: number;
  audioTrackTitle?: string;
  description: string;
  title: string;
};

type AudioPlayerScreenProps = {
  book: Book;
  onClose?: () => void;
  onOpenTextAtPosition?: (
    textPosition: AudioTextPosition,
    playback: {
      durationMillis: number;
      positionMillis: number;
      trackIndex: number;
    },
  ) => void;
  onProgressChange?: (book: Book) => void;
};

const PLAYBACK_STATUS_UI_INTERVAL_MS = 500;

export function AudioPlayerScreen({
  book,
  onClose,
  onOpenTextAtPosition,
  onProgressChange,
}: AudioPlayerScreenProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const soundRef = useRef<Audio.Sound | null>(null);
  const bookRef = useRef(book);
  const trackIndexRef = useRef(0);
  const tracksRef = useRef<BookAudioTrack[]>([]);
  const requestedStartPositionRef = useRef<number | null>(null);
  const shouldAutoPlayOnLoadRef = useRef(false);
  const lastProgressUpdateRef = useRef(0);
  const lastStatusRenderAtRef = useRef(0);
  const onProgressChangeRef = useRef(onProgressChange);
  const statusRef = useRef<AVPlaybackStatus | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioNoteDraft, setAudioNoteDraft] = useState<AudioNoteDraft | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const tracks = useMemo(() => getBookAudioTracks(book), [book]);
  const trackListKey = useMemo(
    () => tracks.map((track) => track.uri).join("|"),
    [tracks],
  );
  const [trackIndex, setTrackIndex] = useState(() =>
    clampTrackIndex(book.audioCurrentTrackIndex ?? 0, getBookAudioTracks(book)),
  );
  const activeTrackIndex = clampTrackIndex(trackIndex, tracks);
  const activeTrack = tracks[activeTrackIndex];
  const audioSourceUri = activeTrack?.uri ?? book.audioUri ?? book.fileUri ?? "";
  const canOpenText = Boolean(
    tracks.length > 0 && book.fileUri && !isAudioBookFormat(book.fileFormat),
  );
  const audioFormatLabel = getAudioFormatLabel(book);
  const audioFileSize = getAudioTotalSize(book);
  const audioChapterCount = book.audioChapterMarkers?.length ?? 0;
  const activeTrackTitle = activeTrack?.title ?? book.audioFileName ?? book.fileName ?? book.title;
  const compactLayout = height < 840;
  const coverWidth = Math.min(
    height < 760 ? 170 : compactLayout ? 198 : 218,
    Math.max(160, width * (compactLayout ? 0.48 : 0.54)),
  );

  useEffect(() => {
    bookRef.current = book;
    onProgressChangeRef.current = onProgressChange;
  }, [book, onProgressChange]);

  useEffect(() => {
    tracksRef.current = tracks;
    trackIndexRef.current = activeTrackIndex;
  }, [activeTrackIndex, tracks]);

  useEffect(() => {
    requestedStartPositionRef.current = book.audioPositionMillis ?? 0;
    setTrackIndex(clampTrackIndex(book.audioCurrentTrackIndex ?? 0, tracks));
    // This should only reset when the opened book or its track list changes.
    // Live playback position updates must not overwrite manual track switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, trackListKey]);

  useEffect(() => {
    let isMounted = true;
    const sound = new Audio.Sound();
    soundRef.current = sound;
    setIsLoading(true);
    statusRef.current = null;
    lastStatusRenderAtRef.current = 0;
    setStatus(null);

    const loadSound = async () => {
      if (!audioSourceUri) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        sound.setOnPlaybackStatusUpdate((nextStatus) => {
          if (!isMounted) return;
          const now = Date.now();
          const previousLoadedStatus = statusRef.current?.isLoaded
            ? statusRef.current
            : null;
          const playbackStateChanged =
            !nextStatus.isLoaded ||
            !previousLoadedStatus ||
            nextStatus.isPlaying !== previousLoadedStatus.isPlaying ||
            nextStatus.didJustFinish;
          const shouldRenderStatus =
            playbackStateChanged ||
            now - lastStatusRenderAtRef.current >= PLAYBACK_STATUS_UI_INTERVAL_MS;

          if (shouldRenderStatus) {
            statusRef.current = nextStatus;
            lastStatusRenderAtRef.current = now;
            setStatus(nextStatus);
          }

          if (nextStatus.isLoaded) {
            const shouldReportProgress =
              nextStatus.didJustFinish || now - lastProgressUpdateRef.current > 2000;

            if (shouldReportProgress) {
              lastProgressUpdateRef.current = now;
              const currentBook = bookRef.current;
              const currentTrackIndex = trackIndexRef.current;
              const currentTracks = tracksRef.current;
              const currentTrack = currentTracks[currentTrackIndex];
              const nextTracks = currentTrack
                ? mergeTrackDuration(
                    currentTracks,
                    currentTrack.id,
                    nextStatus.durationMillis,
                  )
                : currentTracks;
              tracksRef.current = nextTracks;

              onProgressChangeRef.current?.({
                ...currentBook,
                audioCurrentTrackIndex: currentTrackIndex,
                audioDurationMillis: nextStatus.durationMillis,
                audioPendingTrackProgressRatio: undefined,
                audioPositionMillis: nextStatus.positionMillis,
                audioTracks: nextTracks,
                audioUri: currentTrack?.uri ?? currentBook.audioUri,
                audioReadingProgressRatio:
                  nextStatus.durationMillis && nextStatus.durationMillis > 0
                    ? getAudioProgressRatio(
                        nextTracks,
                        currentTrackIndex,
                        nextStatus.positionMillis,
                        nextStatus.durationMillis,
                      )
                    : currentBook.audioReadingProgressRatio,
              });
            }
          }

          if (nextStatus.isLoaded && nextStatus.didJustFinish) {
            const currentTrackIndex = trackIndexRef.current;
            const currentTracks = tracksRef.current;

            if (currentTrackIndex < currentTracks.length - 1) {
              requestedStartPositionRef.current = 0;
              shouldAutoPlayOnLoadRef.current = true;
              setTrackIndex(currentTrackIndex + 1);
            } else {
              void sound.setPositionAsync(0);
              void sound.pauseAsync();
            }
          }
        });

        const startPositionMillis =
          requestedStartPositionRef.current ??
          (activeTrackIndex === (bookRef.current.audioCurrentTrackIndex ?? 0)
            ? bookRef.current.audioPositionMillis ?? 0
            : 0);
        const pendingStartRatio =
          requestedStartPositionRef.current === null &&
          activeTrackIndex === (bookRef.current.audioCurrentTrackIndex ?? 0) &&
          typeof bookRef.current.audioPendingTrackProgressRatio === "number"
            ? clamp(bookRef.current.audioPendingTrackProgressRatio, 0, 1)
            : null;
        const shouldPlay = shouldAutoPlayOnLoadRef.current;
        requestedStartPositionRef.current = null;
        shouldAutoPlayOnLoadRef.current = false;

        await sound.loadAsync(
          { uri: audioSourceUri },
          {
            positionMillis: pendingStartRatio === null ? startPositionMillis : 0,
            progressUpdateIntervalMillis: PLAYBACK_STATUS_UI_INTERVAL_MS,
            shouldPlay,
          },
        );

        if (pendingStartRatio !== null) {
          const loaded = await sound.getStatusAsync();
          if (loaded.isLoaded && loaded.durationMillis && loaded.durationMillis > 0) {
            await sound.setPositionAsync(
              Math.round(loaded.durationMillis * pendingStartRatio),
            );
          }
        }
      } catch {
        if (isMounted) {
          setStatus(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSound();

    return () => {
      isMounted = false;
      setIsLoading(true);
      soundRef.current = null;
      void sound.unloadAsync();
    };
  }, [activeTrackIndex, audioSourceUri]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose?.();
        return true;
      },
    );

    return () => {
      backSubscription.remove();
    };
  }, [onClose]);

  const loadedStatus = status?.isLoaded ? status : null;
  const isLoaded = Boolean(loadedStatus);
  const isPlaying = loadedStatus?.isPlaying ?? false;
  const positionMillis = loadedStatus?.positionMillis ?? 0;
  const durationMillis = loadedStatus?.durationMillis ?? 0;
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const formattedPosition = formatTime(positionMillis);
  const formattedDuration = formatTime(durationMillis);
  const activeMarkerIndex = getActiveMarkerIndex(book, positionMillis);
  const activeMarkerTitle = getActiveMarkerTitle(book, positionMillis);
  const currentChapterLabel =
    tracks.length > 1
      ? `Глава ${activeTrackIndex + 1} из ${tracks.length}`
      : audioChapterCount > 0
        ? `Глава ${activeMarkerIndex + 1} из ${audioChapterCount}`
        : "";
  const trackLabel =
    tracks.length > 1
      ? activeTrackTitle
      : audioChapterCount > 0
        ? activeMarkerTitle ?? activeTrackTitle
        : "";
  const cover = useMemo(
    () => (
      <BookCardNew
        coverColor={book.coverColor}
        coverImage={book.coverImage}
        width={coverWidth}
      />
    ),
    [book.coverColor, book.coverImage, coverWidth],
  );

  const togglePlayback = async () => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    if (isPlaying) {
      await sound.pauseAsync();
      return;
    }

    await sound.playAsync();
  };

  const skipBy = async (deltaMillis: number) => {
    const sound = soundRef.current;
    if (!sound || !isLoaded || !durationMillis) return;

    const nextPosition = Math.min(
      Math.max(positionMillis + deltaMillis, 0),
      durationMillis,
    );
    await sound.setPositionAsync(nextPosition);
  };

  const changeTrack = (delta: number) => {
    if (tracks.length <= 1) return;

    const nextTrackIndex = Math.min(
      Math.max(activeTrackIndex + delta, 0),
      tracks.length - 1,
    );
    if (nextTrackIndex === activeTrackIndex) return;

    requestedStartPositionRef.current = 0;
    shouldAutoPlayOnLoadRef.current = isPlaying;
    setTrackIndex(nextTrackIndex);
  };

  const seekToRatio = async (ratio: number) => {
    const sound = soundRef.current;
    if (!sound || !isLoaded || !durationMillis) return;

    const nextPosition = Math.max(
      0,
      Math.min(Math.round(durationMillis * ratio), durationMillis),
    );
    await sound.setPositionAsync(nextPosition);
  };

  const openAudioNoteEditor = async () => {
    const sound = soundRef.current;
    if (sound && isLoaded && isPlaying) {
      await sound.pauseAsync();
    }

    const capturedDuration =
      durationMillis || activeTrack?.durationMillis || book.audioDurationMillis || 0;
    const capturedPosition =
      positionMillis || book.audioPositionMillis || 0;
    const capturedProgressRatio =
      capturedDuration > 0
        ? clamp(capturedPosition / capturedDuration, 0, 1)
        : 0;

    setAudioNoteDraft({
      audioDurationMillis: capturedDuration,
      audioFileName: activeTrack?.fileName ?? book.audioFileName ?? book.fileName,
      audioPositionMillis: capturedPosition,
      audioProgressRatio: capturedProgressRatio,
      audioTrackIndex: activeTrackIndex,
      audioTrackTitle: activeTrackTitle,
      description: "",
      title: "",
    });
  };

  const saveAudioNoteDraft = () => {
    if (!audioNoteDraft) return;

    const title = audioNoteDraft.title.trim();
    if (!title) return;

    const now = Date.now();
    const currentBook = bookRef.current;
    const nextNote: ReadingNote = {
      absolutePage: 1,
      audioDurationMillis: audioNoteDraft.audioDurationMillis,
      audioFileName: audioNoteDraft.audioFileName,
      audioPositionMillis: audioNoteDraft.audioPositionMillis,
      audioProgressRatio: audioNoteDraft.audioProgressRatio,
      audioTrackIndex: audioNoteDraft.audioTrackIndex,
      audioTrackTitle: audioNoteDraft.audioTrackTitle,
      chapterIndex: 0,
      chapterTitle: "Аудио",
      createdAt: now,
      description: audioNoteDraft.description.trim(),
      id: `audio-note-${now}`,
      noteKind: "audio",
      pageIndex: 0,
      selectedText: `${audioNoteDraft.audioTrackTitle || "Аудиофрагмент"} · ${formatTime(audioNoteDraft.audioPositionMillis)}`,
      title,
      updatedAt: now,
    };
    const readingNotes = [nextNote, ...(currentBook.readingNotes ?? [])];
    const updatedBook: Book = {
      ...currentBook,
      notesCount: readingNotes.length,
      readingNotes,
    };

    bookRef.current = updatedBook;
    onProgressChangeRef.current?.(updatedBook);
    setAudioNoteDraft(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}> 
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC", "#EEF6FF"]}
        locations={[0, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#7BBDFA" />
        </Pressable>

        <View style={styles.topBarBadge}>
          <Ionicons name="headset" size={16} color="#56B0FE" />
          <Text style={styles.topBarBadgeText}>Аудиокнига</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => void openAudioNoteEditor()}
          style={styles.noteButton}
        >
          <Ionicons name="create-outline" size={22} color="#7BBDFA" />
        </Pressable>
      </View>

      <View
        style={[
          styles.playerContent,
          { paddingBottom: Math.max(22, insets.bottom + 18) },
        ]}
      >
        <View style={styles.nowPlayingCard}>
          <View style={styles.nowPlayingIcon}>
            <Ionicons name="volume-medium" size={21} color="#56B0FE" />
          </View>
          <View style={styles.nowPlayingTextBlock}>
            <Text style={styles.nowPlayingEyebrow}>Сейчас играет</Text>
            <Text numberOfLines={1} style={styles.nowPlayingTitle}>
              {currentChapterLabel || "Аудиофайл"}
            </Text>
            <Text numberOfLines={1} style={styles.nowPlayingSubtitle}>
              {trackLabel || activeTrackTitle}
            </Text>
          </View>
        </View>

        <View style={styles.coverFrame}>{cover}</View>

        <View style={styles.timelineHeader}>
          <Text style={styles.timeText}>{formattedPosition}</Text>
          <Text style={styles.timeText}>{formattedDuration}</Text>
        </View>

        <Pressable
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onPress={(event) => {
            if (!trackWidth || !durationMillis) return;

            const nextRatio =
              event.nativeEvent.locationX <= 0
                ? 0
                : event.nativeEvent.locationX / trackWidth;

            void seekToRatio(nextRatio);
          }}
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(progress * 100, 100))}%` },
            ]}
          />
        </Pressable>

        <View style={styles.controlsGrid}>
          <View style={styles.controlColumn}>
            <Pressable
              accessibilityRole="button"
              disabled={tracks.length <= 1 || activeTrackIndex <= 0}
              onPress={() => changeTrack(-1)}
              style={[
                styles.chapterButton,
                (tracks.length <= 1 || activeTrackIndex <= 0) &&
                  styles.chapterButtonDisabled,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#A8B2BD" />
              <Text style={styles.chapterButtonText}>Назад</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void skipBy(-15000)}
              style={styles.skipButton}
            >
              <Ionicons name="play-back" size={24} color="#4D5660" />
              <Text style={styles.skipButtonText}>15</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void togglePlayback()}
            style={styles.playButton}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={38}
                color="#FFFFFF"
              />
            )}
          </Pressable>

          <View style={styles.controlColumn}>
            <Pressable
              accessibilityRole="button"
              disabled={tracks.length <= 1 || activeTrackIndex >= tracks.length - 1}
              onPress={() => changeTrack(1)}
              style={[
                styles.chapterButton,
                (tracks.length <= 1 || activeTrackIndex >= tracks.length - 1) &&
                  styles.chapterButtonDisabled,
              ]}
            >
              <Text style={styles.chapterButtonText}>Дальше</Text>
              <Ionicons name="chevron-forward" size={22} color="#4D5660" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void skipBy(15000)}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>15</Text>
              <Ionicons name="play-forward" size={24} color="#4D5660" />
            </Pressable>
          </View>
        </View>

        {false ? (
          <View style={styles.chapterRow}>
            <Pressable
              accessibilityRole="button"
              disabled={activeTrackIndex <= 0}
              onPress={() => changeTrack(-1)}
              style={[
                styles.chapterButton,
                activeTrackIndex <= 0 && styles.chapterButtonDisabled,
              ]}
            >
              <Ionicons name="chevron-back" size={18} color="#192024" />
              <Text style={styles.chapterButtonText}>Назад</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={activeTrackIndex >= tracks.length - 1}
              onPress={() => changeTrack(1)}
              style={[
                styles.chapterButton,
                activeTrackIndex >= tracks.length - 1 && styles.chapterButtonDisabled,
              ]}
            >
              <Text style={styles.chapterButtonText}>Дальше</Text>
              <Ionicons name="chevron-forward" size={18} color="#192024" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.noteActionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openAudioNoteEditor()}
            style={styles.noteActionButton}
          >
            <Text numberOfLines={1} style={styles.noteActionText}>
              Перейти к заметкам
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openAudioNoteEditor()}
            style={styles.noteActionButton}
          >
            <Text numberOfLines={1} style={styles.noteActionText}>
              Создать заметку
            </Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          {currentChapterLabel ? <MetaChip label={currentChapterLabel} /> : null}
          <MetaChip label={audioFormatLabel} />
          <MetaChip label={formatFileSize(audioFileSize)} />
          {audioChapterCount > 0 ? <MetaChip label={`${audioChapterCount} глав`} /> : null}
          <MetaChip label={isPlaying ? "Играет" : "Пауза"} />
        </View>

        {canOpenText ? (
          <View style={styles.syncPanel}>
            <View style={styles.syncTextBlock}>
              <Text style={styles.syncTitle}>Продолжить чтение</Text>
              <Text style={styles.syncText}>
                Откроем текст примерно на этом месте аудио.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                onOpenTextAtPosition?.(
                  buildAudioTextPosition({
                    book,
                    durationMillis,
                    positionMillis,
                    trackIndex: activeTrackIndex,
                    tracks,
                  }),
                  {
                    durationMillis,
                    positionMillis,
                    trackIndex: activeTrackIndex,
                  },
                )
              }
              style={styles.syncButton}
            >
              <Ionicons name="reader-outline" size={18} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>К тексту</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {audioNoteDraft ? (
        <AudioNoteEditorSheet
          draft={audioNoteDraft}
          onCancel={() => setAudioNoteDraft(null)}
          onChange={setAudioNoteDraft}
          onSave={saveAudioNoteDraft}
        />
      ) : null}
    </SafeAreaView>
  );
}

function AudioNoteEditorSheet({
  draft,
  onCancel,
  onChange,
  onSave,
}: {
  draft: AudioNoteDraft;
  onCancel: () => void;
  onChange: (draft: AudioNoteDraft) => void;
  onSave: () => void;
}) {
  const canSave = draft.title.trim().length > 0;

  return (
    <View style={styles.noteEditorBackdrop}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
        style={styles.noteKeyboardAvoider}
      >
        <View style={styles.noteEditorSheet}>
          <View style={styles.noteEditorHeader}>
            <View style={styles.noteEditorTitleBlock}>
              <Text style={styles.noteEditorTitle}>Новая заметка</Text>
              <Text numberOfLines={1} style={styles.noteEditorMeta}>
                {draft.audioTrackTitle || "Аудио"} | {formatTime(draft.audioPositionMillis)}
              </Text>
            </View>
            <Pressable onPress={onCancel} style={styles.noteCloseButton}>
              <Ionicons name="close" size={20} color="#FF9F9F" />
            </Pressable>
          </View>

          <TextInput
            autoFocus
            cursorColor="#7BBDFA"
            onChangeText={(title) => onChange({ ...draft, title })}
            placeholder="Заголовок"
            placeholderTextColor="#9C9C9C"
            selectionColor="#9ACDFF"
            style={styles.noteTitleInput}
            value={draft.title}
          />

          <TextInput
            cursorColor="#7BBDFA"
            multiline
            onChangeText={(description) => onChange({ ...draft, description })}
            placeholder="Описание"
            placeholderTextColor="#9C9C9C"
            selectionColor="#9ACDFF"
            style={styles.noteDescriptionInput}
            textAlignVertical="top"
            value={draft.description}
          />

          <Pressable
            disabled={!canSave}
            onPress={onSave}
            style={[styles.noteSaveButton, !canSave && styles.noteSaveButtonDisabled]}
          >
            <Text style={styles.noteSaveButtonText}>Сохранить</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text numberOfLines={1} style={styles.metaChipText}>
        {label}
      </Text>
    </View>
  );
}

function formatTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "0:00";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 Мб";

  const megabytes = bytes / (1024 * 1024);
  const rounded =
    megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10;

  return `${String(rounded).replace(".", ",")} Мб`;
}

function getActiveMarkerIndex(book: Book, positionMillis: number) {
  const markers = book.audioChapterMarkers ?? [];
  if (markers.length === 0) return -1;

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextMarker = markers[index + 1];
    const endMillis = marker.endMillis ?? nextMarker?.startMillis ?? Number.POSITIVE_INFINITY;

    if (positionMillis >= marker.startMillis && positionMillis < endMillis) {
      return index;
    }
  }

  return markers.length - 1;
}

function getActiveMarkerTitle(book: Book, positionMillis: number) {
  const markers = book.audioChapterMarkers ?? [];
  if (markers.length === 0) return undefined;

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextMarker = markers[index + 1];
    const endMillis = marker.endMillis ?? nextMarker?.startMillis ?? Number.POSITIVE_INFINITY;

    if (positionMillis >= marker.startMillis && positionMillis < endMillis) {
      return marker.title;
    }
  }

  return markers[markers.length - 1]?.title;
}

function clampTrackIndex(index: number, tracks: BookAudioTrack[]) {
  if (tracks.length === 0) return 0;

  return Math.min(Math.max(index, 0), tracks.length - 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  backButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  topBarSpacer: {
    height: 36,
    width: 36,
  },

  topBarBadge: {
    display: "none",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(123, 189, 250, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  topBarBadgeText: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
  },

  noteButton: {
    display: "none",
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  hero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 10,
    paddingTop: 8,
  },

  coverFrame: {
    alignItems: "center",
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },

  trackDecor: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  trackBar: {
    backgroundColor: "rgba(123, 189, 250, 0.6)",
    borderRadius: 999,
    height: 5,
  },

  infoBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
  },

  title: {
    color: "#192024",
    fontFamily: "SourceSerif4-Regular",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },

  author: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 20,
    marginTop: 6,
  },

  currentChapterBadge: {
    alignItems: "center",
    backgroundColor: "rgba(86, 176, 254, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
    maxWidth: "100%",
    minHeight: 28,
    paddingHorizontal: 11,
  },

  currentChapterText: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
  },

  trackTitle: {
    color: "#7A7F85",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
    marginTop: 6,
    maxWidth: "100%",
  },

  playerContent: {
    flex: 1,
    gap: 13,
    justifyContent: "flex-start",
    paddingHorizontal: 22,
    paddingTop: 24,
  },

  nowPlayingCard: {
    alignItems: "center",
    backgroundColor: "#F2F7FC",
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  nowPlayingIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },

  nowPlayingTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  nowPlayingEyebrow: {
    color: "#7A7F85",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    lineHeight: 15,
  },

  nowPlayingTitle: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 22,
    lineHeight: 27,
    marginTop: 2,
  },

  nowPlayingSubtitle: {
    color: "#59616A",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
    marginTop: 3,
  },

  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  timeText: {
    color: "#7A7F85",
    fontFamily: "SFProText-Light",
    fontSize: 13,
    lineHeight: 16,
  },

  progressTrack: {
    backgroundColor: "#E5EAF1",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },

  progressFill: {
    backgroundColor: "#80C2FF",
    borderRadius: 999,
    height: 6,
  },

  controlsGrid: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 4,
  },

  controlColumn: {
    flex: 1,
    gap: 10,
  },

  chapterRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: -4,
  },

  chapterButton: {
    alignItems: "center",
    backgroundColor: "#F3F7FC",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  chapterButtonDisabled: {
    opacity: 0.38,
  },

  chapterButtonText: {
    color: "#4D5660",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    lineHeight: 20,
  },

  skipButton: {
    alignItems: "center",
    backgroundColor: "#F3F7FC",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    height: 40,
    justifyContent: "center",
  },

  skipButtonText: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 18,
    lineHeight: 22,
  },

  playButton: {
    alignItems: "center",
    backgroundColor: "#7BBDFA",
    borderRadius: 999,
    height: 88,
    justifyContent: "center",
    width: 88,
  },

  metaRow: {
    display: "none",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },

  metaChip: {
    backgroundColor: "#F2F6FA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  metaChipText: {
    color: "#4D4D4D",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    lineHeight: 15,
  },

  noteActionsRow: {
    flexDirection: "row",
    gap: 22,
    justifyContent: "space-between",
  },

  noteActionButton: {
    alignItems: "center",
    backgroundColor: "#7BBDFA",
    borderRadius: 999,
    flex: 1,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  noteActionText: {
    color: "#FFFFFF",
    fontFamily: "SFProText-Regular",
    fontSize: 15,
    lineHeight: 19,
  },

  syncPanel: {
    alignItems: "center",
    backgroundColor: "#F2F6FA",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  syncTextBlock: {
    flex: 1,
    gap: 3,
  },

  syncTitle: {
    display: "none",
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 18,
  },

  syncText: {
    color: "#7A7F85",
    fontFamily: "SFProText-Light",
    fontSize: 12,
    lineHeight: 15,
  },

  syncButton: {
    alignItems: "center",
    backgroundColor: "#7BBDFA",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
  },

  syncButtonText: {
    color: "#FFFFFF",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
  },

  noteEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 80,
  },

  noteKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },

  noteEditorSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  noteEditorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  noteEditorTitleBlock: {
    flex: 1,
    gap: 3,
  },

  noteEditorTitle: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 29,
  },

  noteEditorMeta: {
    color: "#7A7F85",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 17,
  },

  noteCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  noteTitleInput: {
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    height: 44,
    lineHeight: 21,
    paddingHorizontal: 12,
  },

  noteDescriptionInput: {
    backgroundColor: "#F2F6FA",
    borderRadius: 10,
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    height: 104,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 11,
  },

  noteSaveButton: {
    alignItems: "center",
    backgroundColor: "#7BBDFA",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
  },

  noteSaveButtonDisabled: {
    opacity: 0.45,
  },

  noteSaveButtonText: {
    color: "#FFFFFF",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    lineHeight: 19,
  },
});
