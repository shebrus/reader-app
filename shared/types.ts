// Общие типы приложения: книги и полки.
import type { ImageSourcePropType } from "react-native";

export type ReaderThemeMode = "dark" | "light" | "custom";
export type ReaderPageTurnMode = "slide" | "scroll" | "fade";

export type ReaderCustomTheme = {
  id: string;
  name: string;
  accent: string;
  background: string;
  border: string;
  muted: string;
  panel: string;
  panelButton: string;
  text: string;
};

export type ReaderTextSettings = {
  bold: boolean;
  customLayout: boolean;
  fontFamily: string;
  fontLabel: string;
  justify: boolean;
  letterSpacing: number;
  lineHeightScale: number;
  marginScale: number;
  paragraphSpacing: number;
  wordSpacing: number;
};

export type ReadingBookmark = {
  absolutePage: number;
  chapterIndex: number;
  chapterProgressRatio?: number;
  pageIndex: number;
  updatedAt: number;
};

export type ReadingNote = {
  absolutePage: number;
  audioDurationMillis?: number;
  audioFileName?: string;
  audioPositionMillis?: number;
  audioProgressRatio?: number;
  audioTrackIndex?: number;
  audioTrackTitle?: string;
  chapterIndex: number;
  chapterProgressRatio?: number;
  chapterTitle: string;
  createdAt: number;
  description: string;
  id: string;
  noteKind?: "audio" | "text";
  pageIndex: number;
  selectedText: string;
  title: string;
  updatedAt: number;
};

export type AudioFileFormat =
  | "mp3"
  | "m4a"
  | "m4b"
  | "aac"
  | "wav"
  | "ogg"
  | "flac"
  | "opus"
  | "mp4"
  | "mpeg"
  | "mpga"
  | "webm"
  | "aiff"
  | "aif"
  | "caf"
  | "oga"
  | "mka"
  | "amr"
  | "3gp"
  | "wma";

export type BookFileFormat =
  | "epub"
  | "fb2"
  | "txt"
  | "pdf"
  | "zip"
  | AudioFileFormat;

export type BookAudioTrack = {
  chapterIndex?: number;
  durationMillis?: number;
  fileFormat: AudioFileFormat;
  fileName: string;
  fileSize?: number;
  id: string;
  title: string;
  uri: string;
};

export type BookAudioChapterMarker = {
  chapterIndex?: number;
  endMillis?: number;
  id: string;
  startMillis: number;
  title: string;
};

export type AudioTextPosition = {
  chapterIndex?: number;
  chapterProgressRatio?: number;
  chapterTitle?: string;
  progressRatio: number;
};

export type AudioPlaybackPosition = {
  durationMillis?: number;
  positionMillis?: number;
  trackIndex: number;
  trackProgressRatio: number;
};

export type Book = {
  id: string;
  coverImage?: ImageSourcePropType | string;
  coverColor?: string;
  audioFileName?: string;
  audioFileFormat?: AudioFileFormat;
  audioFileSize?: number;
  audioChapterMarkers?: BookAudioChapterMarker[];
  audioCurrentTrackIndex?: number;
  audioDurationMillis?: number;
  audioPositionMillis?: number;
  audioPendingTrackProgressRatio?: number;
  audioReadingProgressRatio?: number;
  audioTextChapterIndex?: number;
  audioTextChapterProgressRatio?: number;
  audioTextChapterTitle?: string;
  audioTextJumpRequestedAt?: number;
  audioTracks?: BookAudioTrack[];
  audioUri?: string;
  shelfId: string;
  shelfIds?: string[];
  title: string;
  author: string;
  pagesRead: number;
  totalPages: number;
  fileUri?: string;
  fileName?: string;
  fileFormat?: BookFileFormat;
  fileSize?: number;
  importedAt?: number;
  notesCount?: number;
  readingNotes?: ReadingNote[];
  readingChapterIndex?: number;
  readingPageIndex?: number;
  readingBookmark?: ReadingBookmark;
  readerBrightness?: number;
  readerContentVersion?: number;
  readerCustomThemes?: ReaderCustomTheme[];
  readerFontSize?: number;
  readerPageTurnMode?: ReaderPageTurnMode;
  readerTextSettings?: ReaderTextSettings;
  readerThemeId?: string;
  readerThemeMode?: ReaderThemeMode;
};

export type Shelf = {
  id: string;
  title: string;
  locked: boolean;
};
