import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useState, type ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCardNew } from "../BookCardNew";
import {
  getAudioFormatLabel,
  getAudioTotalSize,
  getBookAudioTracks,
  isAudioBookFormat,
} from "../../shared/audioBook";
import type { Book } from "../../shared/types";

type BookInfoScreenProps = {
  book: Book;
  onBackPress: () => void;
  onAddAudioPress?: () => void;
  onDeletePress?: () => void;
  onEditPress?: () => void;
  onReadPress: () => void;
  onListenPress?: () => void;
  deleteMode?: "library" | "shelf";
};

type InfoMode = "audio" | "book";

const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;
const BLUE = "#7BBDFA";
const CASSETTE_FRAME = {
  left: 142.49,
  top: 185,
  width: 246,
  height: 150,
};
const BOOK_FRAME = {
  left: 27,
  top: 138.02,
  width: 162,
  height: 246,
};

export function BookInfoScreen({
  book,
  onBackPress,
  onAddAudioPress,
  onDeletePress,
  onEditPress,
  onReadPress,
  onListenPress,
  deleteMode = "library",
}: BookInfoScreenProps) {
  const { height, width } = useWindowDimensions();
  const audioOnly = isAudioBookFormat(book.fileFormat);
  const tracks = getBookAudioTracks(book);
  const hasAudio = tracks.length > 0 || audioOnly;
  const canRead = !audioOnly;
  const [mode, setMode] = useState<InfoMode>(audioOnly ? "audio" : "book");
  const [menuOpen, setMenuOpen] = useState(false);
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const offsetX = (width - DESIGN_WIDTH * scale) / 2;
  const frame = (left: number, top: number, itemWidth: number, itemHeight: number) => ({
    height: itemHeight * scale,
    left: offsetX + left * scale,
    top: top * scale,
    width: itemWidth * scale,
  });
  const size = (value: number) => value * scale;
  const bookProgress = getBookProgress(book);
  const audioProgress = getAudioProgress(book);
  const progress = mode === "audio" ? audioProgress : bookProgress;
  const activeTrackIndex = clampNumber(
    book.audioCurrentTrackIndex ?? 0,
    0,
    Math.max(0, tracks.length - 1),
  );
  const activeTrack = tracks[activeTrackIndex];
  const notes = book.readingNotes ?? [];
  const notesCount =
    mode === "audio"
      ? notes.filter((note) => note.noteKind === "audio").length
      : notes.filter((note) => note.noteKind !== "audio").length;
  const title = false
    ? hasAudio
      ? activeTrack?.title ?? book.audioFileName ?? book.title
      : "Аудио не добавлено"
    : book.title;
  const subtitle = false
    ? hasAudio
      ? book.audioFileName ?? book.author
      : "Добавьте файл через меню"
    : book.author;
  const progressLabel =
    mode === "audio"
      ? hasAudio
        ? `${formatTime(book.audioPositionMillis ?? 0)} из ${formatTime(getAudioDuration(book))}`
        : "0:00 из 0:00"
      : `${book.pagesRead} из ${book.totalPages}`;
  const stats =
    mode === "audio"
      ? [
          {
            label: "Аудиофайл",
            value: hasAudio ? getAudioFormatLabel(book) || "--" : "--",
          },
          {
            label: "Объём аудио",
            value: hasAudio ? formatFileSize(getAudioTotalSize(book)) : "--",
          },
          { label: "Количество заметок", value: String(notesCount) },
        ]
      : [
          { label: "Дата добавления", value: formatDate(book.importedAt) },
          { label: "Объём", value: formatFileSize(book.fileSize) },
          { label: "Количество заметок", value: String(notesCount) },
        ];

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.header, frame(10, 80, 355, 24)]}>
          <Pressable
            hitSlop={12}
            onPress={onBackPress}
            style={[styles.headerIconButton, { height: size(24), width: size(24) }]}
          >
            <ExpoImage
              contentFit="contain"
              source={require("../../assets/icons/arrow_back.svg")}
              style={[
                styles.headerBackIcon,
                { height: size(22), width: size(22) },
              ]}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setMenuOpen((open) => !open)}
            style={[styles.headerIconButton, { height: size(24), width: size(24) }]}
          >
            <ExpoImage
              contentFit="contain"
              source={require("../../assets/icons/menu.svg")}
              style={[
                styles.headerMenuIcon,
                { height: size(24), width: size(24) },
              ]}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!hasAudio}
          onPress={onListenPress}
          style={[
            styles.cassetteHitbox,
            frame(
              CASSETTE_FRAME.left,
              CASSETTE_FRAME.top,
              CASSETTE_FRAME.width,
              CASSETTE_FRAME.height,
            ),
            !hasAudio && styles.disabledMedia,
          ]}
        >
          <ExpoImage
            contentFit="contain"
            source={require("../../assets/images/kaseta.png")}
            style={styles.mediaFill}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canRead}
          onPress={onReadPress}
          style={[
            styles.bookHitbox,
            frame(
              BOOK_FRAME.left,
              BOOK_FRAME.top,
              BOOK_FRAME.width,
              BOOK_FRAME.height,
            ),
            !canRead && styles.disabledMedia,
          ]}
        >
          <BookCardNew
            coverColor={book.coverColor}
            coverImage={book.coverImage}
            width={size(162)}
          />
        </Pressable>

        <View style={[styles.tabs, frame(10, 497, 355, 27)]}>
          <InfoTab
            active={mode === "book"}
            label="Книга"
            onPress={() => setMode("book")}
            width={50 * scale}
          />
          <InfoTab
            active={mode === "audio"}
            label="Аудио"
            muted={!hasAudio}
            onPress={() => setMode("audio")}
            width={52 * scale}
          />
        </View>

        <View style={[styles.titleBlock, frame(10, 545, 325, 52)]}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.author}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.progressBlock, frame(10, 609, 353, 27)]}>
          <View style={styles.progressTopRow}>
            <View style={styles.progressLabelRow}>
              <Text numberOfLines={1} style={styles.progressLabel}>
                {progressLabel}
              </Text>
              {mode === "book" ? (
                <ExpoImage
                  contentFit="contain"
                  source={require("../../assets/icons/str.svg")}
                  style={styles.progressIcon}
                />
              ) : null}
            </View>
            <Text style={styles.percentText}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={[styles.statsBlock, frame(10, 657, 355, 83)]}>
          {stats.map((item) => (
            <InfoRow key={item.label} label={item.label} value={item.value} />
          ))}
        </View>

        {menuOpen ? (
          <Pressable
            onPress={() => setMenuOpen(false)}
            style={styles.menuBackdrop}
          >
            <BookInfoActionMenu
              deleteMode={deleteMode}
              onAddAudio={() => {
                setMenuOpen(false);
                onAddAudioPress?.();
              }}
              onDelete={() => {
                setMenuOpen(false);
                onDeletePress?.();
              }}
              onEdit={() => {
                setMenuOpen(false);
                onEditPress?.();
              }}
              style={{
                right: offsetX + 10 * scale,
                top: 112 * scale,
                width: 265 * scale,
              }}
            />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function InfoTab({
  active,
  label,
  muted = false,
  onPress,
  width,
}: {
  active: boolean;
  label: string;
  muted?: boolean;
  onPress: () => void;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        { width },
        active && styles.activeTabButton,
        muted && styles.mutedTabButton,
      ]}
    >
      <Text style={styles.tabText}>{label}</Text>
    </Pressable>
  );
}

function BookInfoActionMenu({
  deleteMode,
  onAddAudio,
  onDelete,
  onEdit,
  style,
}: {
  deleteMode: "library" | "shelf";
  onAddAudio: () => void;
  onDelete: () => void;
  onEdit: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.actionMenu, style]}>
      <BookInfoMenuRow
        icon="headset"
        label="Добавить аудио"
        onPress={onAddAudio}
      />
      <BookInfoMenuRow
        icon="create-outline"
        label="Редактировать книгу"
        onPress={onEdit}
      />
      <BookInfoMenuRow
        danger
        icon="trash-outline"
        label={deleteMode === "library" ? "Удалить книгу" : "Убрать из категории"}
        onPress={onDelete}
      />
    </View>
  );
}

function BookInfoMenuRow({
  danger = false,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Text numberOfLines={1} style={[styles.menuRowText, danger && styles.menuRowDangerText]}>
        {label}
      </Text>
      <Ionicons name={icon} size={25} color={danger ? "#FF8F8F" : "#EAF1F7"} />
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text numberOfLines={1} style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getBookProgress(book: Book) {
  if (book.totalPages <= 0) return 0;
  return clampNumber(Math.round((book.pagesRead / book.totalPages) * 100), 0, 100);
}

function getAudioProgress(book: Book) {
  return clampNumber(Math.round((book.audioReadingProgressRatio ?? 0) * 100), 0, 100);
}

function getAudioDuration(book: Book) {
  const tracks = getBookAudioTracks(book);
  if (tracks.length > 1) {
    const knownDuration = tracks.reduce(
      (sum, track) => sum + (track.durationMillis ?? 0),
      0,
    );
    return knownDuration > 0 ? knownDuration : book.audioDurationMillis ?? 0;
  }

  return tracks[0]?.durationMillis ?? book.audioDurationMillis ?? 0;
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "--.--.----";

  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 Мб";

  const megabytes = bytes / (1024 * 1024);
  const rounded =
    megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10;

  return `${String(rounded).replace(".", ",")} Мб`;
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#F5F5F5",
    flex: 1,
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
  },

  headerIconButton: {
    alignItems: "center",
    justifyContent: "center",
  },

  headerBackIcon: {
    tintColor: BLUE,
  },

  headerMenuIcon: {
    tintColor: BLUE,
  },

  cassetteHitbox: {
    position: "absolute",
    transform: [{ rotate: "104.55deg" }],
    zIndex: 1,
  },

  bookHitbox: {
    position: "absolute",
    transform: [{ rotate: "-10.18deg" }],
    zIndex: 2,
  },

  disabledMedia: {
    opacity: 0.42,
  },

  mediaFill: {
    height: "100%",
    width: "100%",
  },

  tabs: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    position: "absolute",
  },

  tabButton: {
    alignItems: "center",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    height: 27,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 4,
  },

  activeTabButton: {
    borderBottomColor: "#80C2FF",
    borderBottomWidth: 1,
  },

  mutedTabButton: {
    opacity: 0.45,
  },

  tabText: {
    color: "#000000",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    lineHeight: 19,
  },

  titleBlock: {
    gap: 4,
    justifyContent: "center",
    position: "absolute",
  },

  title: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 29,
  },

  author: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 19,
  },

  progressBlock: {
    gap: 4,
    position: "absolute",
  },

  progressTopRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 17,
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },

  progressLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: 245,
  },

  progressLabel: {
    color: "#000000",
    fontFamily: "SFProText-Light",
    fontSize: 14,
    fontWeight: "300",
    lineHeight: 17,
  },

  progressIcon: {
    height: 16,
    tintColor: "#0084FF",
    width: 16,
  },

  percentText: {
    color: "#192024",
    fontFamily: "SFProText-Light",
    fontSize: 14,
    fontWeight: "300",
    lineHeight: 17,
  },

  progressTrack: {
    backgroundColor: "#E2E2E2",
    borderRadius: 15,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },

  progressFill: {
    backgroundColor: "#80C2FF",
    borderRadius: 16,
    height: 6,
  },

  statsBlock: {
    alignItems: "flex-end",
    gap: 12,
    paddingBottom: 8,
    position: "absolute",
  },

  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 17,
    justifyContent: "space-between",
    width: "100%",
  },

  infoLabel: {
    color: "#2F2F2F",
    flexShrink: 0,
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 17,
    maxWidth: 190,
  },

  infoValue: {
    color: "#2F2F2F",
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 17,
    textAlign: "right",
  },

  menuBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 40,
  },

  actionMenu: {
    gap: 5,
    position: "absolute",
    zIndex: 41,
  },

  menuRow: {
    alignItems: "center",
    backgroundColor: "#252A2F",
    borderRadius: 10,
    flexDirection: "row",
    height: 43,
    justifyContent: "space-between",
    paddingLeft: 13,
    paddingRight: 14,
  },

  menuRowText: {
    color: "#F1F6FA",
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 15,
    lineHeight: 18,
  },

  menuRowDangerText: {
    color: "#FFB0B0",
  },
});
