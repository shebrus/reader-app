import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type ImageStyle,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCardNew } from "../BookCardNew";
import {
  readBookContent,
  type ReadingChapter,
  type ReadingContent,
} from "../../shared/bookReader";
import { getBookAudioTracks } from "../../shared/audioBook";
import type {
  AudioPlaybackPosition,
  Book,
  ReaderCustomTheme,
  ReaderPageTurnMode,
  ReaderTextSettings,
  ReaderThemeMode,
  ReadingBookmark,
  ReadingNote,
} from "../../shared/types";

type ReaderScreenProps = {
  book: Book;
  onClose?: () => void;
  onOpenAudioAtPosition?: (playback: AudioPlaybackPosition) => void;
  onProgressChange?: (book: Book) => void;
};

type ReaderOverlay =
  | "none"
  | "menu"
  | "search"
  | "settings"
  | "toc"
  | "customize"
  | "notes";
type ReaderThemeId =
  | "charcoal"
  | "black"
  | "graphite"
  | "ink"
  | "sepia"
  | "brown"
  | "paper"
  | "pearl"
  | "ivory"
  | "mist"
  | "sage"
  | "sky";

type ReaderPage = {
  chapterIndex: number;
  pageIndex: number;
  title: string;
  text: string;
};

type SearchResult = {
  absolutePage: number;
  chapterIndex: number;
  id: string;
  pageIndex: number;
  snippet: string;
};

type AudioTextJump = {
  chapterIndex?: number;
  chapterProgressRatio?: number;
  progressRatio?: number;
  requestedAt?: number;
};

type ReaderTextSelection = {
  absolutePage: number;
  chapterIndex: number;
  chapterTitle: string;
  pageIndex: number;
  selectedText: string;
};

type NoteDraft = {
  description: string;
  title: string;
};

type ThemePalette = {
  accent: string;
  background: string;
  border: string;
  muted: string;
  panel: string;
  panelButton: string;
  text: string;
};

type ThemeChoice = {
  editable?: boolean;
  id: string;
  name: string;
  palette: ThemePalette;
};

type CustomThemeDraft = ReaderCustomTheme;

type CustomThemeColorKey =
  | "accent"
  | "background"
  | "border"
  | "muted"
  | "panel"
  | "panelButton"
  | "text";

const MIN_FONT_SIZE = 18;
const MAX_FONT_SIZE = 26;
const DEFAULT_FONT_SIZE = 20;
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;
const READER_CONTENT_VERSION = 2;
const DEFAULT_CUSTOM_SETTINGS: ReaderTextSettings = {
  bold: false,
  customLayout: true,
  fontFamily: "SourceSerif-Regular",
  fontLabel: "Source Serif",
  justify: false,
  letterSpacing: 0,
  lineHeightScale: 1.13,
  marginScale: 0,
  paragraphSpacing: 0,
  wordSpacing: 0,
};

const themePresets: Record<ReaderThemeId, ThemePalette> = {
  charcoal: {
    accent: "#E6F3FF",
    background: "#1C1C1E",
    border: "#4C4C4C",
    muted: "#4B4B4B",
    panel: "#252525",
    panelButton: "#878787",
    text: "#E0E0E0",
  },
  black: {
    accent: "#E6F3FF",
    background: "#000000",
    border: "#2E2E2E",
    muted: "#4B4B4B",
    panel: "#252525",
    panelButton: "#878787",
    text: "#FFFFFF",
  },
  graphite: {
    accent: "#E6F3FF",
    background: "#000000",
    border: "#3A3A3A",
    muted: "#555555",
    panel: "#252525",
    panelButton: "#878787",
    text: "#FFFFFF",
  },
  ink: {
    accent: "#E6F3FF",
    background: "#000000",
    border: "#303030",
    muted: "#4B4B4B",
    panel: "#252525",
    panelButton: "#878787",
    text: "#FFFFFF",
  },
  sepia: {
    accent: "#E6F3FF",
    background: "#433D31",
    border: "#6A604C",
    muted: "#A69B86",
    panel: "#252525",
    panelButton: "#878787",
    text: "#FFFFFF",
  },
  brown: {
    accent: "#E6F3FF",
    background: "#19150C",
    border: "#403625",
    muted: "#8B7A60",
    panel: "#252525",
    panelButton: "#878787",
    text: "#FFFFFF",
  },
  paper: {
    accent: "#376B9C",
    background: "#F5F0E5",
    border: "#D5CAB9",
    muted: "#8A8175",
    panel: "#E7DDCD",
    panelButton: "#A79E92",
    text: "#26211B",
  },
  pearl: {
    accent: "#446D86",
    background: "#F8F8F4",
    border: "#D7D9D3",
    muted: "#7F8588",
    panel: "#E9EAE4",
    panelButton: "#A0A5A7",
    text: "#202326",
  },
  ivory: {
    accent: "#8B5E20",
    background: "#FFF6D9",
    border: "#E6D7AC",
    muted: "#8C7B5C",
    panel: "#F0E3BF",
    panelButton: "#B4A078",
    text: "#332615",
  },
  mist: {
    accent: "#53739A",
    background: "#EAF1F3",
    border: "#CCD9DE",
    muted: "#738289",
    panel: "#DDE7EA",
    panelButton: "#94A5AD",
    text: "#1D2930",
  },
  sage: {
    accent: "#4D7159",
    background: "#EDF4E8",
    border: "#CBD9C4",
    muted: "#70806A",
    panel: "#E0EAD9",
    panelButton: "#94A68B",
    text: "#1F2A1D",
  },
  sky: {
    accent: "#376EB7",
    background: "#EEF6FF",
    border: "#C8DDF3",
    muted: "#6D8094",
    panel: "#DDEBFA",
    panelButton: "#8EA9C4",
    text: "#182838",
  },
};

const darkThemeOrder: ReaderThemeId[] = [
  "black",
  "ink",
  "charcoal",
  "graphite",
  "sepia",
  "brown",
];

const lightThemeOrder: ReaderThemeId[] = [
  "paper",
  "pearl",
  "ivory",
  "mist",
  "sage",
  "sky",
];

const defaultCustomTheme: ReaderCustomTheme = {
  id: "custom-1",
  name: "Своя 1",
  accent: "#8AC7FF",
  background: "#202124",
  border: "#3A3D42",
  muted: "#8A9097",
  panel: "#2A2D31",
  panelButton: "#7F8790",
  text: "#F1F4F7",
};

const colorPickerSwatches = [
  "#FFFFFF",
  "#F7F2E8",
  "#F4E2B8",
  "#DDEBFA",
  "#E1F0DE",
  "#F4DCDC",
  "#B9D9FF",
  "#8AC7FF",
  "#6ED7A5",
  "#F2C166",
  "#F08A8A",
  "#C39BFF",
  "#9A9A9A",
  "#5E6670",
  "#2A2D31",
  "#202124",
  "#141414",
  "#050505",
];

const readerUiPalette: ThemePalette = {
  accent: "#E6F3FF",
  background: "#1C1C1E",
  border: "#4C4C4C",
  muted: "#B2B2B2",
  panel: "#252525",
  panelButton: "#878787",
  text: "#E6F3FF",
};

const readerIconSources = {
  backBookmark: require("../../assets/icons/back_save_read.svg"),
  bigA: require("../../assets/icons/Big_a_read.svg"),
  bookmarkOff: require("../../assets/icons/save_read_off.svg"),
  bookmarkOn: require("../../assets/icons/save_read_on.svg"),
  close: require("../../assets/icons/krest_read.svg"),
  flash: require("../../assets/icons/flash_time.svg"),
  menu: require("../../assets/icons/menu_read.svg"),
  moon: require("../../assets/icons/moon_read.svg"),
  palette: require("../../assets/icons/palette_read.svg"),
  pencil: require("../../assets/icons/pencil_read.svg"),
  search: require("../../assets/icons/search_read.svg"),
  settings: require("../../assets/icons/setting_read.svg"),
  smallA: require("../../assets/icons/small_a_read.svg"),
  sleep: require("../../assets/icons/block_read.svg"),
  slide: require("../../assets/icons/skip_read.svg"),
  scroll: require("../../assets/icons/slide_read.svg"),
  sun: require("../../assets/icons/sun_read.svg"),
  sunLarge: require("../../assets/icons/sun_bid_read.svg"),
  sunSmall: require("../../assets/icons/sun_small_read.svg"),
  textSettings: require("../../assets/icons/customer_read.svg"),
  toc: require("../../assets/icons/glava_read.svg"),
  audio: require("../../assets/icons/headphon_read.svg"),
};

type ReaderIconName = keyof typeof readerIconSources;

function ReaderSvgIcon({
  color = "#E6F3FF",
  height,
  name,
  size = 24,
  style,
  width,
}: {
  color?: string;
  height?: number;
  name: ReaderIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  width?: number;
}) {
  return (
    <ExpoImage
      contentFit="contain"
      source={readerIconSources[name] as ImageSourcePropType}
      style={[
        {
          height: height ?? size,
          tintColor: color,
          width: width ?? size,
        },
        style,
      ]}
    />
  );
}

export function ReaderScreen({
  book,
  onClose,
  onOpenAudioAtPosition,
  onProgressChange,
}: ReaderScreenProps) {
  const { height, width } = useWindowDimensions();
  const hasCurrentContentVersion =
    book.readerContentVersion === READER_CONTENT_VERSION;
  const initialChapterIndex = hasCurrentContentVersion
    ? book.readingChapterIndex ?? 0
    : 0;
  const initialPageIndex = hasCurrentContentVersion
    ? book.readingPageIndex ?? 0
    : 0;
  const savedThemeMode = getInitialThemeMode(
    book.readerThemeMode,
    book.readerThemeId,
  );
  const [content, setContent] = useState<ReadingContent | null>(null);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [fontSize, setFontSize] = useState(
    clampNumber(book.readerFontSize ?? DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE),
  );
  const [pageTurnMode, setPageTurnMode] = useState<ReaderPageTurnMode>(
    normalizePageTurnMode(book.readerPageTurnMode),
  );
  const [overlay, setOverlay] = useState<ReaderOverlay>("none");
  const [controlsVisible, setControlsVisible] = useState(false);
  const [customThemeDraft, setCustomThemeDraft] =
    useState<CustomThemeDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNeedle, setSearchNeedle] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [themeMode, setThemeMode] = useState<ReaderThemeMode>(
    savedThemeMode,
  );
  const [customThemes, setCustomThemes] = useState<ReaderCustomTheme[]>(
    normalizeCustomThemes(book.readerCustomThemes),
  );
  const [themeId, setThemeId] = useState<string>(
    getInitialThemeId(
      book.readerThemeId,
      savedThemeMode,
      normalizeCustomThemes(book.readerCustomThemes),
    ),
  );
  const [brightness, setBrightness] = useState(
    clampNumber(book.readerBrightness ?? 0.58, 0.18, 1),
  );
  const [bookmark, setBookmark] = useState<ReadingBookmark | null>(
    book.readingBookmark ?? null,
  );
  const [notes, setNotes] = useState<ReadingNote[]>(
    normalizeReadingNotes(book.readingNotes),
  );
  const [pendingSelection, setPendingSelection] =
    useState<ReaderTextSelection | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [activeNoteHighlight, setActiveNoteHighlight] =
    useState<ReadingNote | null>(null);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const scrollTouchStart = useRef<{
    pageX: number;
    pageY: number;
    time: number;
  } | null>(null);
  const [customSettings, setCustomSettings] = useState<ReaderTextSettings>(
    normalizeTextSettings(book.readerTextSettings),
  );
  const lastProgressKey = useRef("");
  const layoutKeyRef = useRef("");
  const chapterPositionRatio = useRef(0);
  const pageTurnDirection = useRef<"backward" | "forward">("forward");
  const pageTransition = useRef(new Animated.Value(1)).current;
  const lastRenderedPage = useRef<ReaderPage | null>(null);
  const [fadeOutgoingPage, setFadeOutgoingPage] = useState<ReaderPage | null>(
    null,
  );
  const scrollSyncTarget = useRef<"external" | "user">("external");
  const scrollReaderRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollSyncFrame = useRef<number | null>(null);
  const scrollSyncedLayoutKey = useRef("");
  const audioTextJump = useRef<AudioTextJump>(getAudioTextJump(book));
  const savedPosition = useRef({
    bookId: book.id,
    chapterIndex: initialChapterIndex,
    pageIndex: initialPageIndex,
  });

  if (savedPosition.current.bookId !== book.id) {
    savedPosition.current = {
      bookId: book.id,
      chapterIndex: initialChapterIndex,
      pageIndex: initialPageIndex,
    };
    audioTextJump.current = getAudioTextJump(book);
  }

  const sourceBook = useMemo<Book>(
    () => ({
      author: book.author,
      fileFormat: book.fileFormat,
      fileName: book.fileName,
      fileUri: book.fileUri,
      id: book.id,
      pagesRead: 0,
      shelfId: book.shelfId,
      title: book.title,
      totalPages: 0,
    }),
    [
      book.author,
      book.fileFormat,
      book.fileName,
      book.fileUri,
      book.id,
      book.shelfId,
      book.title,
    ],
  );

  const palette = getThemePalette(themeId, customThemes);
  const activeThemeChoices = getThemeChoices(themeMode, customThemes);
  const layoutEnabled = customSettings.customLayout;
  const effectiveLineHeightScale = layoutEnabled
    ? customSettings.lineHeightScale
    : DEFAULT_CUSTOM_SETTINGS.lineHeightScale;
  const effectiveLetterSpacing = layoutEnabled ? customSettings.letterSpacing : 0;
  const effectiveMarginScale = layoutEnabled ? customSettings.marginScale : 0;
  const effectiveParagraphSpacing = layoutEnabled
    ? customSettings.paragraphSpacing
    : 0;
  const effectiveWordSpacing = layoutEnabled ? customSettings.wordSpacing : 0;
  const lineHeight = Math.round(fontSize * effectiveLineHeightScale);
  const widthScale = width / DESIGN_WIDTH;
  const heightScale = height / DESIGN_HEIGHT;
  const readerSideInset = clampNumber(27 * widthScale, 20, 32);
  const readerControlRightInset = clampNumber(26 * widthScale, 20, 31);
  const controlsStateActive = controlsVisible || overlay !== "none";
  const readerTop = clampNumber(
    (controlsStateActive ? 97 : 94) * heightScale,
    78,
    104,
  );
  const readerBottomInset = clampNumber(89 * heightScale, 70, 96);
  const topLabelTop = clampNumber(65 * heightScale, 52, 69);
  const headerButtonTop = clampNumber(57 * heightScale, 45, 61);
  const footerButtonBottom = clampNumber(37 * heightScale, 28, 40);
  const pageCounterBottom = clampNumber(37 * heightScale, 28, 40);
  const readerMenuWidth = Math.min(
    265.51 * widthScale,
    Math.max(228, width - readerControlRightInset - 20),
  );
  const contentWidth = Math.max(
    240,
    width - readerSideInset * 2 - effectiveMarginScale * 74,
  );
  const contentHeight = Math.max(
    360,
    height - readerTop - readerBottomInset,
  );
  const brightnessDimOpacity = Math.max(0, 0.62 - brightness) * 0.9;
  const layoutKey = [
    contentHeight,
    contentWidth,
    fontSize,
    lineHeight,
    customSettings.bold,
    effectiveLetterSpacing,
    effectiveMarginScale,
    effectiveParagraphSpacing,
    effectiveWordSpacing,
  ].join(":");

  useEffect(() => {
    return () => {
      if (scrollSettleTimer.current) {
        clearTimeout(scrollSettleTimer.current);
      }

      if (scrollSyncFrame.current !== null) {
        cancelAnimationFrame(scrollSyncFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      setSearchNeedle(searchQuery);
    }, 140);

    return () => {
      clearTimeout(searchTimer);
    };
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    setContent(null);
    readBookContent(sourceBook).then((nextContent) => {
      if (cancelled) return;
      setContent(nextContent);
      setChapterIndex(
        clamp(
          savedPosition.current.chapterIndex,
          0,
          nextContent.chapters.length - 1,
        ),
      );
      setPageIndex(Math.max(0, savedPosition.current.pageIndex));
    });

    return () => {
      cancelled = true;
    };
  }, [sourceBook]);

  const chapterPages = useMemo(() => {
    if (!content) return [];

    const charsPerPage = estimateCharsPerPage({
      contentHeight,
      contentWidth,
      fontSize,
      letterSpacing: effectiveLetterSpacing,
      lineHeight,
      paragraphSpacing: effectiveParagraphSpacing,
      wordSpacing: effectiveWordSpacing,
    });

    return content.chapters.map((chapter, index) =>
      paginateChapter(
        chapter,
        index,
        charsPerPage,
        effectiveParagraphSpacing,
      ),
    );
  }, [
    content,
    contentHeight,
    contentWidth,
    effectiveLetterSpacing,
    effectiveParagraphSpacing,
    effectiveWordSpacing,
    fontSize,
    lineHeight,
  ]);

  const pages = chapterPages[chapterIndex] ?? [];
  const page = pages[pageIndex] ?? pages[0];
  const totalPages = chapterPages.reduce(
    (sum, chapter) => sum + chapter.length,
    0,
  );
  const audioTracks = useMemo(() => getBookAudioTracks(book), [book]);
  const canOpenAudio = audioTracks.length > 0;
  const absolutePage = getAbsolutePage(chapterPages, chapterIndex, pageIndex);
  const chapterProgress = pages.length > 0
    ? Math.min(100, Math.max(1, Math.round(((pageIndex + 1) / pages.length) * 100)))
    : 0;
  const pagesLeftInChapter = Math.max(0, pages.length - pageIndex - 1);
  const chapterTitle = content?.chapters[chapterIndex]?.title ?? page?.title ?? "Глава";
  const topReaderLabel = controlsStateActive
    ? `${pagesLeftInChapter} с. До конца главы`
    : shortChapterTitle(chapterTitle, chapterIndex);
  const currentPageKey = getPageKey(page);
  const searchResults = useMemo(
    () => buildSearchResults(content, chapterPages, searchNeedle),
    [chapterPages, content, searchNeedle],
  );

  const openAudioAtCurrentPosition = () => {
    if (!content || !canOpenAudio) return;

    setOverlay("none");
    onOpenAudioAtPosition?.({
      trackIndex: getAudioTrackIndexForTextChapter(
        content.chapters,
        chapterIndex,
        audioTracks.length,
        book,
      ),
      trackProgressRatio: getChapterPageRatio(pageIndex, pages.length),
    });
  };

  useEffect(() => {
    const jump = audioTextJump.current;
    if (!jump.requestedAt || totalPages <= 0) return;

    audioTextJump.current = {};
    scrollSyncTarget.current = "external";

    if (typeof jump.chapterIndex === "number") {
      const syncedChapterIndex = content
        ? getAudioSyncedChapterIndex(content.chapters, jump.chapterIndex, book)
        : jump.chapterIndex;
      const targetChapterIndex = clamp(
        syncedChapterIndex,
        0,
        Math.max(0, chapterPages.length - 1),
      );
      const targetPages = chapterPages[targetChapterIndex] ?? [];
      const targetPageIndex = clamp(
        Math.round(
          (jump.chapterProgressRatio ?? 0) *
            Math.max(0, targetPages.length - 1),
        ),
        0,
        Math.max(0, targetPages.length - 1),
      );

      setChapterIndex(targetChapterIndex);
      setPageIndex(targetPageIndex);
      return;
    }

    if (typeof jump.progressRatio !== "number") return;

    const targetAbsolutePage = clamp(
      Math.round(jump.progressRatio * Math.max(0, totalPages - 1)),
      0,
      Math.max(0, totalPages - 1),
    );
    const targetPosition = getChapterPositionFromAbsolutePage(
      chapterPages,
      targetAbsolutePage,
    );

    setChapterIndex(targetPosition.chapterIndex);
    setPageIndex(targetPosition.pageIndex);
  }, [book, chapterPages, content, totalPages]);

  useEffect(() => {
    if (!content || pages.length === 0) return;

    if (!layoutKeyRef.current) {
      layoutKeyRef.current = layoutKey;
      return;
    }

    if (layoutKeyRef.current === layoutKey) return;

    layoutKeyRef.current = layoutKey;
    const nextPageIndex = clamp(
      Math.round(chapterPositionRatio.current * Math.max(0, pages.length - 1)),
      0,
      Math.max(0, pages.length - 1),
    );

    if (nextPageIndex !== pageIndex) {
      scrollSyncTarget.current = "external";
      setPageIndex(nextPageIndex);
    }
  }, [content, layoutKey, pageIndex, pages.length]);

  useEffect(() => {
    if (pages.length <= 1) {
      chapterPositionRatio.current = 0;
      return;
    }

    chapterPositionRatio.current = clamp(pageIndex / (pages.length - 1), 0, 1);
  }, [chapterIndex, layoutKey, pageIndex, pages.length]);

  useEffect(() => {
    if (pageTurnMode !== "scroll") return;
    const nextSyncKey = `${chapterIndex}:${layoutKey}`;
    const shouldSync =
      scrollSyncTarget.current === "external" ||
      scrollSyncedLayoutKey.current !== nextSyncKey;

    if (!shouldSync) return;

    const scrollableHeight = Math.max(0, scrollContentHeight - contentHeight);
    const targetY =
      pages.length > 1
        ? (pageIndex / (pages.length - 1)) * scrollableHeight
        : 0;

    if (scrollSyncFrame.current !== null) {
      cancelAnimationFrame(scrollSyncFrame.current);
    }

    scrollSyncFrame.current = requestAnimationFrame(() => {
      scrollSyncFrame.current = null;
      scrollReaderRef.current?.scrollTo({
        animated: false,
        x: 0,
        y: targetY,
      });
      scrollOffsetY.current = targetY;
      scrollSyncedLayoutKey.current = nextSyncKey;
      scrollSyncTarget.current = "user";
    });
  }, [
    chapterIndex,
    contentHeight,
    layoutKey,
    pageIndex,
    pageTurnMode,
    pages.length,
    scrollContentHeight,
  ]);

  useLayoutEffect(() => {
    if (!page || pageTurnMode === "scroll") {
      lastRenderedPage.current = page ?? null;
      setFadeOutgoingPage(null);
      pageTransition.setValue(1);
      return;
    }

    const previousPage = lastRenderedPage.current;
    const pageChanged = getPageKey(previousPage) !== currentPageKey;

    pageTransition.stopAnimation();

    if ((pageTurnMode === "fade" || pageTurnMode === "slide") && previousPage && pageChanged) {
      setFadeOutgoingPage(previousPage);
      pageTransition.setValue(0);
      Animated.timing(pageTransition, {
        duration: pageTurnMode === "fade" ? 760 : 320,
        easing:
          pageTurnMode === "fade"
            ? Easing.inOut(Easing.quad)
            : Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setFadeOutgoingPage(null);
        }
      });
    } else {
      setFadeOutgoingPage(null);
      pageTransition.setValue(pageChanged ? 0 : 1);

      if (pageChanged) {
        Animated.timing(pageTransition, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    }

    lastRenderedPage.current = page;
  }, [currentPageKey, page, pageTransition, pageTurnMode]);

  useEffect(() => {
    if (!content || totalPages <= 0) return;

    const safeChapterIndex = clamp(chapterIndex, 0, chapterPages.length - 1);
    const safePageIndex = clamp(
      pageIndex,
      0,
      (chapterPages[safeChapterIndex]?.length ?? 1) - 1,
    );

    if (safeChapterIndex !== chapterIndex) {
      scrollSyncTarget.current = "external";
      setChapterIndex(safeChapterIndex);
      return;
    }

    if (safePageIndex !== pageIndex) {
      scrollSyncTarget.current = "external";
      setPageIndex(safePageIndex);
      return;
    }

    const progressKey = [
      book.id,
      absolutePage,
      safeChapterIndex,
      safePageIndex,
      totalPages,
      bookmark?.absolutePage ?? "no-bookmark",
      bookmark?.chapterIndex ?? 0,
      bookmark?.pageIndex ?? 0,
      brightness,
      JSON.stringify(customThemes),
      JSON.stringify(notes),
      fontSize,
      READER_CONTENT_VERSION,
      themeMode,
      themeId,
      pageTurnMode,
      JSON.stringify(customSettings),
    ].join(":");

    if (lastProgressKey.current === progressKey) return;
    lastProgressKey.current = progressKey;

    onProgressChange?.({
      ...book,
      pagesRead: absolutePage,
      audioTextChapterIndex: undefined,
      audioTextChapterProgressRatio: undefined,
      audioTextChapterTitle: undefined,
      audioTextJumpRequestedAt: undefined,
      readerBrightness: brightness,
      readerContentVersion: READER_CONTENT_VERSION,
      readerCustomThemes: customThemes,
      readerFontSize: fontSize,
      readerPageTurnMode: pageTurnMode,
      readerTextSettings: customSettings,
      readerThemeId: themeId,
      readerThemeMode: themeMode,
      notesCount: notes.length,
      readingNotes: notes,
      readingBookmark: bookmark ?? undefined,
      readingChapterIndex: safeChapterIndex,
      readingPageIndex: safePageIndex,
      totalPages,
    });
  }, [
    absolutePage,
    book,
    bookmark,
    brightness,
    chapterIndex,
    chapterPages,
    content,
    customThemes,
    customSettings,
    fontSize,
    onProgressChange,
    notes,
    pageTurnMode,
    pageIndex,
    themeId,
    themeMode,
    totalPages,
  ]);

  const closeOverlay = () => {
    setOverlay("none");
    setShowModeMenu(false);
    setShowThemeMenu(false);
    setControlsVisible(true);
  };

  const selectThemeMode = (nextMode: ReaderThemeMode) => {
    const nextThemeChoices = getThemeChoices(nextMode, customThemes);
    const fallbackThemeId = nextThemeChoices[0]?.id;

    setThemeMode(nextMode);
    if (fallbackThemeId && !nextThemeChoices.some((theme) => theme.id === themeId)) {
      setThemeId(fallbackThemeId);
    }
  };

  const selectPageTurnMode = (nextMode: ReaderPageTurnMode) => {
    scrollSyncTarget.current = "external";
    setPageTurnMode(nextMode);
  };

  const openCustomThemeEditor = (theme?: ReaderCustomTheme) => {
    const nextIndex = Math.min(customThemes.length + 1, 6);

    setCustomThemeDraft(
      theme ?? {
        ...defaultCustomTheme,
        id: `custom-${Date.now()}`,
        name: `Своя ${nextIndex}`,
      },
    );
  };

  const saveCustomTheme = (theme: ReaderCustomTheme) => {
    const normalizedTheme = normalizeCustomTheme(theme);

    setCustomThemes((currentThemes) => {
      const exists = currentThemes.some((item) => item.id === normalizedTheme.id);
      const nextThemes = exists
        ? currentThemes.map((item) =>
            item.id === normalizedTheme.id ? normalizedTheme : item,
          )
        : [...currentThemes, normalizedTheme].slice(0, 6);

      return nextThemes;
    });
    setThemeMode("custom");
    setThemeId(normalizedTheme.id);
    setCustomThemeDraft(null);
  };

  const goToNextPage = () => {
    if (!content || overlay !== "none") return;

    pageTurnDirection.current = "forward";
    if (pageIndex < pages.length - 1) {
      scrollSyncTarget.current = "external";
      setPageIndex((current) => current + 1);
      return;
    }

    if (chapterIndex < content.chapters.length - 1) {
      scrollSyncTarget.current = "external";
      setChapterIndex((current) => current + 1);
      setPageIndex(0);
    }
  };

  const goToPreviousPage = () => {
    if (!content || overlay !== "none") return;

    pageTurnDirection.current = "backward";
    if (pageIndex > 0) {
      scrollSyncTarget.current = "external";
      setPageIndex((current) => current - 1);
      return;
    }

    if (chapterIndex > 0) {
      const previousChapterIndex = chapterIndex - 1;
      scrollSyncTarget.current = "external";
      setChapterIndex(previousChapterIndex);
      setPageIndex(
        Math.max(0, (chapterPages[previousChapterIndex]?.length ?? 1) - 1),
      );
    }
  };

  const goToChapter = (nextChapterIndex: number) => {
    pageTurnDirection.current = nextChapterIndex >= chapterIndex ? "forward" : "backward";
    scrollSyncTarget.current = "external";
    setChapterIndex(nextChapterIndex);
    setPageIndex(0);
    closeOverlay();
  };

  const goToSearchResult = (result: SearchResult) => {
    pageTurnDirection.current =
      result.chapterIndex > chapterIndex ||
      (result.chapterIndex === chapterIndex && result.pageIndex >= pageIndex)
        ? "forward"
        : "backward";
    scrollSyncTarget.current = "external";
    setChapterIndex(result.chapterIndex);
    setPageIndex(result.pageIndex);
    closeOverlay();
  };

  const toggleBookmark = () => {
    if (!content || totalPages <= 0) return;

    if (
      bookmark?.chapterIndex === chapterIndex &&
      bookmark?.pageIndex === pageIndex
    ) {
      setBookmark(null);
      return;
    }

    setBookmark({
      absolutePage,
      chapterIndex,
      chapterProgressRatio: getChapterPageRatio(pageIndex, pages.length),
      pageIndex,
      updatedAt: Date.now(),
    });
  };

  const openNoteEditorForSelection = () => {
    if (!pendingSelection) return;

    setNoteDraft({
      description: "",
      title: "",
    });
  };

  const openNoteEditorForCurrentPage = () => {
    if (!page) return;

    const selectedText = makeCurrentPageNoteExcerpt(page.text);
    if (!selectedText) return;

    setActiveNoteHighlight(null);
    setPendingSelection({
      absolutePage,
      chapterIndex,
      chapterTitle: shortChapterTitle(chapterTitle, chapterIndex),
      pageIndex,
      selectedText,
    });
    setNoteDraft({
      description: "",
      title: "",
    });
    setOverlay("none");
    setControlsVisible(true);
  };

  const saveNoteDraft = () => {
    if (!pendingSelection || !noteDraft) return;

    const now = Date.now();
    const title = noteDraft.title.trim();
    if (!title) return;

    const description = noteDraft.description.trim();

    setNotes((currentNotes) => [
      {
        absolutePage: pendingSelection.absolutePage,
        chapterIndex: pendingSelection.chapterIndex,
        chapterProgressRatio: getChapterPageRatio(pageIndex, pages.length),
        chapterTitle: pendingSelection.chapterTitle,
        createdAt: now,
        description,
        id: `note-${now}`,
        noteKind: "text",
        pageIndex: pendingSelection.pageIndex,
        selectedText: pendingSelection.selectedText,
        title,
        updatedAt: now,
      },
      ...currentNotes,
    ]);
    setActiveNoteHighlight(null);
    setNoteDraft(null);
    setPendingSelection(null);
    setControlsVisible(true);
  };

  const deleteNote = (noteId: string) => {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    setActiveNoteHighlight((currentNote) =>
      currentNote?.id === noteId ? null : currentNote,
    );
  };

  const openNotePosition = (note: ReadingNote) => {
    if (note.noteKind === "audio") {
      const tracks = getBookAudioTracks(book);
      if (tracks.length === 0) return;

      const nextTrackIndex = clamp(
        note.audioTrackIndex ?? 0,
        0,
        Math.max(0, tracks.length - 1),
      );
      const trackDurationMillis =
        note.audioDurationMillis ??
        tracks[nextTrackIndex]?.durationMillis ??
        book.audioDurationMillis ??
        0;
      const trackProgressRatio =
        typeof note.audioProgressRatio === "number"
          ? clamp(note.audioProgressRatio, 0, 1)
          : trackDurationMillis > 0
            ? clamp((note.audioPositionMillis ?? 0) / trackDurationMillis, 0, 1)
            : 0;

      onOpenAudioAtPosition?.({
        durationMillis: trackDurationMillis,
        positionMillis: note.audioPositionMillis,
        trackIndex: nextTrackIndex,
        trackProgressRatio,
      });
      setPendingSelection(null);
      setActiveNoteHighlight(null);
      setOverlay("none");
      setControlsVisible(true);
      return;
    }

    const noteChapterPages = chapterPages[note.chapterIndex] ?? [];
    const nextPageIndex =
      typeof note.chapterProgressRatio === "number"
        ? clamp(
            Math.round(
              note.chapterProgressRatio * Math.max(0, noteChapterPages.length - 1),
            ),
            0,
            Math.max(0, noteChapterPages.length - 1),
          )
        : note.pageIndex;

    scrollSyncTarget.current = "external";
    pageTurnDirection.current =
      note.chapterIndex > chapterIndex ||
      (note.chapterIndex === chapterIndex && nextPageIndex >= pageIndex)
        ? "forward"
        : "backward";
    setChapterIndex(note.chapterIndex);
    setPageIndex(nextPageIndex);
    setActiveNoteHighlight(note);
    setPendingSelection(null);
    setOverlay("none");
    setControlsVisible(true);
  };

  const goToBookmark = () => {
    if (!bookmark) return;

    const bookmarkedChapterPages = chapterPages[bookmark.chapterIndex] ?? [];
    const nextPageIndex =
      typeof bookmark.chapterProgressRatio === "number"
        ? clamp(
            Math.round(
              bookmark.chapterProgressRatio *
                Math.max(0, bookmarkedChapterPages.length - 1),
            ),
            0,
            Math.max(0, bookmarkedChapterPages.length - 1),
          )
        : bookmark.pageIndex;

    scrollSyncTarget.current = "external";
    pageTurnDirection.current =
      bookmark.chapterIndex > chapterIndex ||
      (bookmark.chapterIndex === chapterIndex && nextPageIndex >= pageIndex)
        ? "forward"
        : "backward";
    setChapterIndex(bookmark.chapterIndex);
    setPageIndex(nextPageIndex);
    closeOverlay();
  };

  const changeBrightness = (direction: "down" | "up") => {
    setBrightness((current) =>
      clamp(
        Number((current + (direction === "up" ? 0.12 : -0.12)).toFixed(2)),
        0.18,
        1,
      ),
    );
  };

  const clearScrollSettleTimer = () => {
    if (!scrollSettleTimer.current) return;

    clearTimeout(scrollSettleTimer.current);
    scrollSettleTimer.current = null;
  };

  const commitScrollPageChange = (offsetY: number) => {
    if (pageTurnMode !== "scroll" || pages.length === 0) return;

    const scrollableHeight = Math.max(1, scrollContentHeight - contentHeight);
    const scrollRatio = clamp(offsetY / scrollableHeight, 0, 1);
    const nextPageIndex = clamp(
      Math.round(scrollRatio * Math.max(0, pages.length - 1)),
      0,
      pages.length - 1,
    );

    scrollOffsetY.current = offsetY;
    scrollSyncedLayoutKey.current = `${chapterIndex}:${layoutKey}`;

    if (nextPageIndex !== pageIndex) {
      scrollSyncTarget.current = "user";
      setPageIndex(nextPageIndex);
    }
  };

  const handleScrollEndDrag = (offsetY: number) => {
    clearScrollSettleTimer();
    scrollOffsetY.current = offsetY;
    scrollSettleTimer.current = setTimeout(() => {
      scrollSettleTimer.current = null;
      commitScrollPageChange(scrollOffsetY.current);
    }, 110);
  };

  const handleMomentumScrollBegin = () => {
    clearScrollSettleTimer();
    scrollSyncTarget.current = "user";
  };

  const handleMomentumScrollEnd = (offsetY: number) => {
    clearScrollSettleTimer();
    commitScrollPageChange(offsetY);
  };

  const handleScrollTouchStart = (pageX: number, pageY: number) => {
    scrollTouchStart.current = {
      pageX,
      pageY,
      time: Date.now(),
    };
  };

  const handleScrollTouchEnd = (pageX: number, pageY: number) => {
    const start = scrollTouchStart.current;
    scrollTouchStart.current = null;
    if (!start || overlay !== "none") return;

    const moved = Math.hypot(pageX - start.pageX, pageY - start.pageY);
    const elapsed = Date.now() - start.time;

    if (moved <= 8 && elapsed <= 260) {
      setControlsVisible((visible) => !visible);
      setActiveNoteHighlight(null);
    }
  };

  const handleReaderTextSelection = (
    readerPage: ReaderPage,
    fullText: string,
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const { end, start } = event.nativeEvent.selection;
    const from = Math.min(start, end);
    const to = Math.max(start, end);

    if (to - from < 2) return;

    const selectedText = fullText.slice(from, to).replace(/\s+/g, " ").trim();
    if (selectedText.length < 2) return;

    setActiveNoteHighlight(null);
    setPendingSelection({
      absolutePage: getAbsolutePage(
        chapterPages,
        readerPage.chapterIndex,
        readerPage.pageIndex,
      ),
      chapterIndex: readerPage.chapterIndex,
      chapterTitle: shortChapterTitle(readerPage.title, readerPage.chapterIndex),
      pageIndex: readerPage.pageIndex,
      selectedText,
    });
  };

  const readerTextStyle = [
    styles.readerText,
    {
      color: palette.text,
      fontSize,
      fontFamily: customSettings.fontFamily,
      fontWeight: customSettings.bold ? "700" as const : "400" as const,
      letterSpacing: effectiveLetterSpacing,
      lineHeight,
      textAlign: customSettings.justify ? "justify" as const : "left" as const,
      width: contentWidth,
    },
  ];
  const renderReaderText = (readerPage: ReaderPage, selectable = true) => {
    const text = formatReaderText(
      readerPage.text,
      effectiveWordSpacing,
      effectiveParagraphSpacing,
    );
    const highlightText =
      activeNoteHighlight?.chapterIndex === readerPage.chapterIndex &&
      activeNoteHighlight.pageIndex === readerPage.pageIndex
        ? activeNoteHighlight.selectedText
        : undefined;

    if (highlightText) {
      return (
        <Pressable onPress={() => setActiveNoteHighlight(null)}>
          <HighlightedReaderText
            highlight={highlightText}
            style={readerTextStyle}
            text={text}
          />
        </Pressable>
      );
    }

    if (!selectable) {
      return <Text style={readerTextStyle}>{text}</Text>;
    }

    return (
      <SelectableReaderText
        onTouchEnd={(event) =>
          handleScrollTouchEnd(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          )
        }
        onTouchStart={(event) =>
          handleScrollTouchStart(
            event.nativeEvent.pageX,
            event.nativeEvent.pageY,
          )
        }
        onSelectionChange={(event) =>
          handleReaderTextSelection(readerPage, text, event)
        }
        style={readerTextStyle}
        text={text}
      />
    );
  };

  const renderPageContent = (readerPage: ReaderPage, selectable = true) => (
    <>
      {readerPage.pageIndex === 0 ? (
        <ChapterHeading
          color={palette.text}
          fontFamily={customSettings.fontFamily}
          title={shortChapterTitle(readerPage.title, readerPage.chapterIndex)}
        />
      ) : null}
      {renderReaderText(readerPage, selectable)}
    </>
  );
  const pageTransitionStyle = {
    opacity:
      pageTurnMode === "fade"
        ? pageTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          })
        : 1,
    transform: [
      {
        translateX:
          pageTurnMode === "slide"
            ? pageTransition.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  pageTurnDirection.current === "forward" ? 34 : -34,
                  0,
                ],
              })
            : 0,
      },
    ],
  };
  const fadeOutgoingStyle = {
    opacity:
      pageTurnMode === "fade"
        ? pageTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          })
        : pageTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.72],
          }),
    transform: [
      {
        translateX:
          pageTurnMode === "slide"
            ? pageTransition.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  0,
                  pageTurnDirection.current === "forward" ? -34 : 34,
                ],
              })
            : 0,
      },
    ],
  };

  return (
    <SafeAreaView
      edges={[]}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.chapterLeft,
          { color: palette.muted, top: topLabelTop },
        ]}
      >
        {topReaderLabel}
      </Text>

      {controlsVisible && (overlay === "none" || overlay === "menu") ? (
        <Pressable
          hitSlop={12}
          onPress={onClose}
          style={[
            styles.readerCloseButton,
            { right: readerControlRightInset, top: headerButtonTop },
          ]}
        >
          <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
        </Pressable>
      ) : null}

      <View
        style={[
          styles.readerFrame,
          {
            height: contentHeight,
            left: readerSideInset,
            right: readerSideInset,
            top: readerTop,
          },
        ]}
      >
        {content && page ? (
          pageTurnMode === "scroll" ? (
            <ScrollView
              key={`${chapterIndex}-${layoutKey}`}
              ref={scrollReaderRef}
              contentContainerStyle={styles.scrollReaderContent}
              decelerationRate="normal"
              onMomentumScrollBegin={handleMomentumScrollBegin}
              onMomentumScrollEnd={(event) =>
                handleMomentumScrollEnd(event.nativeEvent.contentOffset.y)
              }
              onContentSizeChange={(_, nextHeight) => {
                setScrollContentHeight(nextHeight);
              }}
              onScroll={(event) => {
                scrollOffsetY.current = event.nativeEvent.contentOffset.y;
              }}
              onScrollBeginDrag={() => {
                clearScrollSettleTimer();
                scrollSyncTarget.current = "user";
              }}
              onScrollEndDrag={(event) =>
                handleScrollEndDrag(event.nativeEvent.contentOffset.y)
              }
              onTouchEnd={(event) =>
                handleScrollTouchEnd(
                  event.nativeEvent.pageX,
                  event.nativeEvent.pageY,
                )
              }
              onTouchStart={(event) =>
                handleScrollTouchStart(
                  event.nativeEvent.pageX,
                  event.nativeEvent.pageY,
                )
              }
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={styles.scrollReader}
            >
              <ChapterHeading
                color={palette.text}
                fontFamily={customSettings.fontFamily}
                title={shortChapterTitle(chapterTitle, chapterIndex)}
              />
              {renderReaderText(
                {
                  chapterIndex,
                  pageIndex,
                  text: content.chapters[chapterIndex]?.text ?? page.text,
                  title: chapterTitle,
                },
                true,
              )}
            </ScrollView>
          ) : (
            <View style={styles.pageModeStack}>
              {(pageTurnMode === "fade" || pageTurnMode === "slide") &&
              fadeOutgoingPage ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pageModeFrame,
                    styles.pageFadeOutgoingFrame,
                    fadeOutgoingStyle,
                  ]}
                >
                  {renderPageContent(fadeOutgoingPage, false)}
                </Animated.View>
              ) : null}
              <Animated.View
                key={`${pageTurnMode}-${chapterIndex}-${pageIndex}`}
                style={[
                  styles.pageModeFrame,
                  pageTurnMode === "fade" && styles.pageFadeIncomingFrame,
                  pageTransitionStyle,
                ]}
              >
                {renderPageContent(page)}
              </Animated.View>
            </View>
          )
        ) : (
          <View style={styles.loader}>
            <ActivityIndicator color={palette.muted} />
          </View>
        )}
      </View>

      <View
        pointerEvents="none"
        style={[styles.brightnessDimmer, { opacity: brightnessDimOpacity }]}
      />

      {pageTurnMode !== "scroll" ? (
        <>
          <Pressable
            style={[
              styles.leftTapZone,
              { bottom: readerBottomInset, top: readerTop },
            ]}
            onPress={goToPreviousPage}
          />
          <Pressable
            style={[
              styles.rightTapZone,
              { bottom: readerBottomInset, top: readerTop },
            ]}
            onPress={goToNextPage}
          />
        </>
      ) : null}

      <Text
        style={[
          styles.pageCounter,
          { bottom: pageCounterBottom, color: palette.muted },
        ]}
      >
        {Math.max(1, absolutePage)} из {Math.max(1, totalPages)}
      </Text>

      {controlsVisible &&
      overlay !== "search" &&
      overlay !== "settings" &&
      overlay !== "toc" &&
      overlay !== "customize" &&
      overlay !== "notes" ? (
        <Pressable
          onPress={() => {
            setControlsVisible(true);
            setOverlay((current) => current === "menu" ? "none" : "menu");
          }}
          style={[
            styles.floatingMenuButton,
            {
              backgroundColor: readerUiPalette.panelButton,
              bottom: footerButtonBottom,
              right: readerControlRightInset,
            },
          ]}
        >
          <ReaderSvgIcon height={14} name="menu" width={20} />
        </Pressable>
      ) : null}

      {overlay === "menu" && content ? (
        <ReaderMenu
          audioAvailable={canOpenAudio}
          chapterProgress={chapterProgress}
          chapterTitle={shortChapterTitle(chapterTitle, chapterIndex)}
          bookmark={bookmark}
          bookmarkActive={
            bookmark?.chapterIndex === chapterIndex &&
            bookmark?.pageIndex === pageIndex
          }
          onGoToBookmark={goToBookmark}
          onOpenSearch={() => setOverlay("search")}
          onOpenSettings={() => setOverlay("settings")}
          onOpenToc={() => setOverlay("toc")}
          onOpenAudio={openAudioAtCurrentPosition}
          onOpenNotes={() => setOverlay("notes")}
          onToggleBookmark={toggleBookmark}
          palette={readerUiPalette}
          rightInset={readerControlRightInset}
          width={readerMenuWidth}
        />
      ) : null}

      {overlay === "search" && content ? (
        <SearchOverlay
          onClose={closeOverlay}
          onOpenResult={goToSearchResult}
          palette={readerUiPalette}
          query={searchQuery}
          results={searchResults}
          setQuery={setSearchQuery}
        />
      ) : null}

      {overlay === "settings" ? (
        <SettingsSheet
          brightness={brightness}
          fontSize={fontSize}
          onChangeBrightness={changeBrightness}
          onCloseMenus={() => {
            setShowModeMenu(false);
            setShowThemeMenu(false);
          }}
          onCloseSheet={closeOverlay}
          onOpenCustomize={() => {
            setShowModeMenu(false);
            setOverlay("customize");
          }}
          onOpenCustomThemeEditor={openCustomThemeEditor}
          onSelectPageTurnMode={selectPageTurnMode}
          onSelectTheme={setThemeId}
          onSelectThemeMode={selectThemeMode}
          pageTurnMode={pageTurnMode}
          palette={readerUiPalette}
          selectedTheme={themeId}
          themeMode={themeMode}
          themes={activeThemeChoices}
          setFontSize={setFontSize}
          setShowModeMenu={setShowModeMenu}
          setShowThemeMenu={setShowThemeMenu}
          showModeMenu={showModeMenu}
          showThemeMenu={showThemeMenu}
        />
      ) : null}

      {overlay === "customize" ? (
        <ThemeCustomizeScreen
          initialSettings={customSettings}
          onCancel={() => setOverlay("settings")}
          onSave={(nextSettings) => {
            setCustomSettings(nextSettings);
            setOverlay("settings");
          }}
          palette={palette}
        />
      ) : null}

      {customThemeDraft ? (
        <CustomThemeEditor
          draft={customThemeDraft}
          onCancel={() => setCustomThemeDraft(null)}
          onChange={setCustomThemeDraft}
          onSave={saveCustomTheme}
        />
      ) : null}

      {overlay === "toc" && content ? (
        <TableOfContentsOverlay
          absolutePage={absolutePage}
          book={book}
          chapterPages={chapterPages}
          content={content}
          onClose={closeOverlay}
          onOpenChapter={goToChapter}
          palette={readerUiPalette}
          totalPages={totalPages}
        />
      ) : null}

      {overlay === "notes" ? (
        <ReaderNotesOverlay
          book={book}
          notes={notes}
          onClose={closeOverlay}
          onCreateNote={openNoteEditorForCurrentPage}
          onDeleteNote={deleteNote}
          onOpenNote={openNotePosition}
          palette={readerUiPalette}
        />
      ) : null}

      {pendingSelection && !noteDraft ? (
        <SelectionNoteBar
          onClose={() => setPendingSelection(null)}
          onCreateNote={openNoteEditorForSelection}
          palette={readerUiPalette}
          selection={pendingSelection}
        />
      ) : null}

      {pendingSelection && noteDraft ? (
        <NoteEditorSheet
          draft={noteDraft}
          onCancel={() => setNoteDraft(null)}
          onChange={setNoteDraft}
          onSave={saveNoteDraft}
          palette={readerUiPalette}
          selection={pendingSelection}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ReaderMenu({
  audioAvailable,
  bookmark,
  bookmarkActive,
  chapterProgress,
  chapterTitle,
  onGoToBookmark,
  onOpenAudio,
  onOpenNotes,
  onOpenSearch,
  onOpenSettings,
  onOpenToc,
  onToggleBookmark,
  palette,
  rightInset,
  width,
}: {
  audioAvailable: boolean;
  bookmark: ReadingBookmark | null;
  bookmarkActive: boolean;
  chapterProgress: number;
  chapterTitle: string;
  onGoToBookmark: () => void;
  onOpenAudio: () => void;
  onOpenNotes: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenToc: () => void;
  onToggleBookmark: () => void;
  palette: ThemePalette;
  rightInset: number;
  width: number;
}) {
  return (
    <View style={[styles.readerMenu, { right: rightInset, width }]}>
      {bookmark ? (
        <MenuRow
          icon="backBookmark"
          label="Перейти к закладке"
          onPress={onGoToBookmark}
          palette={palette}
        />
      ) : null}
      <MenuRow
        icon="toc"
        label={`${chapterTitle} | ${chapterProgress}%`}
        onPress={onOpenToc}
        palette={palette}
      />
      <MenuRow
        icon="search"
        label="Поиск в книге"
        onPress={onOpenSearch}
        palette={palette}
      />
      <MenuRow
        icon="textSettings"
        label="Темы и настройки"
        onPress={onOpenSettings}
        palette={palette}
      />

      <View style={styles.readerActionRow}>
        <MenuIconButton
          icon="audio"
          onPress={audioAvailable ? onOpenAudio : undefined}
          palette={palette}
        />
        <MenuIconButton icon="sleep" palette={palette} />
        <MenuIconButton icon="pencil" onPress={onOpenNotes} palette={palette} />
        <MenuIconButton
          active={bookmarkActive}
          icon={bookmarkActive ? "bookmarkOn" : "bookmarkOff"}
          onPress={onToggleBookmark}
          palette={palette}
        />
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  palette,
}: {
  icon: ReaderIconName;
  label: string;
  onPress: () => void;
  palette: ThemePalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuRow, { backgroundColor: palette.panelButton }]}
    >
      <Text numberOfLines={1} style={styles.menuRowText}>
        {label}
      </Text>
      <View style={styles.menuRowIconSlot}>
        <ReaderSvgIcon name={icon} {...getMenuRowIconFrame(icon)} />
      </View>
    </Pressable>
  );
}

function MenuIconButton({
  active = false,
  icon,
  onPress,
  palette,
}: {
  active?: boolean;
  icon: ReaderIconName;
  onPress?: () => void;
  palette: ThemePalette;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.menuIconButton,
        {
          backgroundColor: active ? palette.accent : palette.panelButton,
        },
      ]}
    >
      <ReaderSvgIcon
        name={icon}
        color={active ? palette.background : "#EEF5FA"}
        {...getMenuActionIconFrame(icon)}
      />
    </Pressable>
  );
}

function ReaderNotesOverlay({
  book,
  notes,
  onClose,
  onCreateNote,
  onDeleteNote,
  onOpenNote,
  palette,
}: {
  book: Book;
  notes: ReadingNote[];
  onClose: () => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onOpenNote: (note: ReadingNote) => void;
  palette: ThemePalette;
}) {
  return (
    <View style={[styles.notesScreen, { backgroundColor: palette.panel }]}>
      <View style={styles.notesHeader}>
        <View style={styles.notesBookThumb}>
          <BookCardNew
            coverColor={book.coverColor}
            coverImage={book.coverImage}
            width={54}
          />
        </View>

        <View style={styles.notesBookInfo}>
          <Text numberOfLines={2} style={styles.notesBookTitle}>
            {book.title}
          </Text>
          <Text numberOfLines={1} style={styles.notesBookAuthor}>
            {book.author}
          </Text>
          <Text style={styles.notesCount}>
            {formatNotesCount(notes.length)}
          </Text>
        </View>

        <Pressable onPress={onCreateNote} style={styles.notesCreateButton}>
          <ReaderSvgIcon name="pencil" size={20} />
        </Pressable>

        <Pressable onPress={onClose} style={styles.overlayCloseButton}>
          <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.notesListContent}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <View style={styles.notesEmptyState}>
            <Text style={styles.notesEmptyTitle}>Заметок пока нет</Text>
            <Text style={styles.notesEmptyText}>
              Выделите фрагмент текста и нажмите «Оставить заметку».
            </Text>
          </View>
        ) : null}

        {notes.map((note) => {
          const noteMeta =
            note.noteKind === "audio"
              ? formatAudioNoteMeta(note)
              : `${note.chapterTitle} | стр. ${note.absolutePage}`;

          return (
            <Pressable
              key={note.id}
              onPress={() => onOpenNote(note)}
              style={[styles.noteCard, { borderColor: palette.border }]}
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardMetaBlock}>
                  <Text numberOfLines={1} style={styles.noteTitle}>
                    {note.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.noteMeta}>
                    {noteMeta}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => onDeleteNote(note.id)}
                  style={styles.noteDeleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF9F9F" />
                </Pressable>
              </View>

              <Text numberOfLines={3} style={styles.noteQuote}>
                {note.selectedText}
              </Text>

              {note.description ? (
                <Text numberOfLines={2} style={styles.noteDescription}>
                  {note.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SelectionNoteBar({
  onClose,
  onCreateNote,
  palette,
  selection,
}: {
  onClose: () => void;
  onCreateNote: () => void;
  palette: ThemePalette;
  selection: ReaderTextSelection;
}) {
  return (
    <View style={[styles.selectionNoteBar, { backgroundColor: palette.panel }]}>
      <View style={styles.selectionTextBlock}>
        <Text numberOfLines={1} style={styles.selectionTitle}>
          Выделен фрагмент
        </Text>
        <Text numberOfLines={2} style={styles.selectionSnippet}>
          {selection.selectedText}
        </Text>
      </View>
      <Pressable
        onPress={onCreateNote}
        style={[styles.selectionActionButton, { backgroundColor: palette.panelButton }]}
      >
        <ReaderSvgIcon name="pencil" size={20} />
        <Text style={styles.selectionActionText}>Заметка</Text>
      </Pressable>
      <Pressable onPress={onClose} style={styles.selectionCloseButton}>
        <ReaderSvgIcon color="#FF9F9F" name="close" size={14} />
      </Pressable>
    </View>
  );
}

function NoteEditorSheet({
  draft,
  onCancel,
  onChange,
  onSave,
  palette,
  selection,
}: {
  draft: NoteDraft;
  onCancel: () => void;
  onChange: (draft: NoteDraft) => void;
  onSave: () => void;
  palette: ThemePalette;
  selection: ReaderTextSelection;
}) {
  const canSave = draft.title.trim().length > 0;

  return (
    <View style={styles.noteEditorBackdrop}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
        style={styles.noteEditorKeyboardAvoider}
      >
        <View style={[styles.noteEditorSheet, { backgroundColor: palette.panel }]}>
          <View style={styles.noteEditorHeader}>
            <Text style={styles.noteEditorTitle}>Новая заметка</Text>
            <Pressable onPress={onCancel} style={styles.overlayCloseButton}>
              <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
            </Pressable>
          </View>

          <Text numberOfLines={3} style={styles.noteEditorQuote}>
            {selection.selectedText}
          </Text>
          <Text style={styles.noteEditorMeta}>
            {selection.chapterTitle} | стр. {selection.absolutePage}
          </Text>

          <TextInput
            autoFocus
            cursorColor="#E6F3FF"
            onChangeText={(title) => onChange({ ...draft, title })}
            placeholder="Заголовок"
            placeholderTextColor="#9C9C9C"
            selectionColor="#9ACDFF"
            style={styles.noteTitleInput}
            value={draft.title}
          />

          <TextInput
            cursorColor="#E6F3FF"
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
            style={[
              styles.noteSaveButton,
              { backgroundColor: palette.panelButton },
              !canSave && styles.noteSaveButtonDisabled,
            ]}
          >
            <Text style={styles.noteSaveButtonText}>Сохранить</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SelectableReaderText({
  onSelectionChange,
  onTouchEnd,
  onTouchStart,
  style,
  text,
}: {
  onSelectionChange: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
  onTouchStart: (event: GestureResponderEvent) => void;
  style: StyleProp<TextStyle>;
  text: string;
}) {
  return (
    <TextInput
      caretHidden
      contextMenuHidden={false}
      multiline
      onChangeText={() => undefined}
      onSelectionChange={onSelectionChange}
      onTouchEnd={onTouchEnd}
      onTouchStart={onTouchStart}
      scrollEnabled={false}
      selectionColor="rgba(154,205,255,0.38)"
      showSoftInputOnFocus={false}
      style={[style, styles.selectableReaderTextInput]}
      value={text}
    />
  );
}

function HighlightedReaderText({
  highlight,
  style,
  text,
}: {
  highlight: string;
  style: StyleProp<TextStyle>;
  text: string;
}) {
  const normalizedText = text.toLowerCase();
  const normalizedHighlight = highlight.toLowerCase();
  const index = normalizedText.indexOf(normalizedHighlight);

  if (index < 0) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <Text style={style}>
      {text.slice(0, index)}
      <Text style={styles.readerNoteHighlight}>
        {text.slice(index, index + highlight.length)}
      </Text>
      {text.slice(index + highlight.length)}
    </Text>
  );
}

function SearchOverlay({
  onClose,
  onOpenResult,
  palette,
  query,
  results,
  setQuery,
}: {
  onClose: () => void;
  onOpenResult: (result: SearchResult) => void;
  palette: ThemePalette;
  query: string;
  results: SearchResult[];
  setQuery: (query: string) => void;
}) {
  const { height } = useWindowDimensions();
  const panelTop = Math.max(
    92,
    Math.min(116, Math.round((116 * height) / DESIGN_HEIGHT)),
  );

  return (
    <View
      style={[
        styles.searchPanel,
        { backgroundColor: palette.panel, top: panelTop },
      ]}
    >
      <View style={styles.searchHeader}>
        <View style={styles.searchInputWrap}>
          <ReaderSvgIcon color="#9C9C9C" name="search" size={26} />
          <TextInput
            autoFocus
            cursorColor="#222222"
            onChangeText={setQuery}
            placeholder="Поиск"
            placeholderTextColor="#707377"
            returnKeyType="search"
            selectionColor="#9ACDFF"
            style={styles.searchInput}
            value={query}
          />
        </View>
        <Pressable onPress={onClose} style={styles.overlayCloseButton}>
          <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.searchResults}
      >
        {query.trim().length > 0 && results.length === 0 ? (
          <Text style={[styles.emptySearchText, { color: palette.muted }]}>
            Ничего не найдено
          </Text>
        ) : null}

        {results.map((result) => (
          <Pressable
            key={result.id}
            onPress={() => onOpenResult(result)}
            style={[styles.searchResultRow, { borderColor: palette.border }]}
          >
            <SearchSnippet query={query} snippet={result.snippet} />
            <Text style={[styles.searchResultPage, { color: "#A9ADB2" }]}>
              {result.absolutePage}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SearchSnippet({
  query,
  snippet,
}: {
  query: string;
  snippet: string;
}) {
  const trimmedQuery = query.trim();
  const index = snippet.toLowerCase().indexOf(trimmedQuery.toLowerCase());

  if (!trimmedQuery || index < 0) {
    return <Text numberOfLines={2} style={styles.searchResultText}>{snippet}</Text>;
  }

  return (
    <Text numberOfLines={2} style={styles.searchResultText}>
      {snippet.slice(0, index)}
      <Text style={styles.searchHighlight}>
        {snippet.slice(index, index + trimmedQuery.length)}
      </Text>
      {snippet.slice(index + trimmedQuery.length)}
    </Text>
  );
}

function ChapterHeading({
  color,
  fontFamily,
  title,
}: {
  color: string;
  fontFamily: string;
  title: string;
}) {
  return (
    <Text
      numberOfLines={2}
      style={[
        styles.inlineChapterTitle,
        {
          color,
          fontFamily,
        },
      ]}
    >
      {title}
    </Text>
  );
}

function SettingsSheet({
  brightness,
  fontSize,
  onChangeBrightness,
  onCloseMenus,
  onCloseSheet,
  onOpenCustomThemeEditor,
  onOpenCustomize,
  onSelectPageTurnMode,
  onSelectTheme,
  onSelectThemeMode,
  pageTurnMode,
  palette,
  selectedTheme,
  setFontSize,
  setShowModeMenu,
  setShowThemeMenu,
  showModeMenu,
  showThemeMenu,
  themeMode,
  themes,
}: {
  brightness: number;
  fontSize: number;
  onChangeBrightness: (direction: "down" | "up") => void;
  onCloseMenus: () => void;
  onCloseSheet: () => void;
  onOpenCustomThemeEditor: (theme?: ReaderCustomTheme) => void;
  onOpenCustomize: () => void;
  onSelectPageTurnMode: (mode: ReaderPageTurnMode) => void;
  onSelectTheme: (theme: string) => void;
  onSelectThemeMode: (mode: ReaderThemeMode) => void;
  pageTurnMode: ReaderPageTurnMode;
  palette: ThemePalette;
  selectedTheme: string;
  setFontSize: (update: (value: number) => number) => void;
  setShowModeMenu: (show: boolean) => void;
  setShowThemeMenu: (show: boolean) => void;
  showModeMenu: boolean;
  showThemeMenu: boolean;
  themeMode: ReaderThemeMode;
  themes: ThemeChoice[];
}) {
  const currentPageTurnIcon = getPageTurnIcon(pageTurnMode);
  const { height, width } = useWindowDimensions();
  const sheetHeight = Math.min(468, Math.max(380, height - 24));
  const pageTurnPopupLeft = Math.min(80, Math.max(12, width - 219));
  const themePopupLeft = Math.min(247, Math.max(12, width - 128));
  const settingsContentWidth = Math.max(0, width - 24);
  const themeGridWidth = Math.min(351, settingsContentWidth);
  const themeSwatchWidth = (themeGridWidth - 16) / 3;

  return (
    <Pressable onPress={onCloseMenus} style={styles.settingsBackdrop}>
      <View
        style={[
          styles.settingsSheet,
          { backgroundColor: palette.panel, height: sheetHeight },
        ]}
      >
        {showModeMenu ? (
          <View style={[styles.readingModeMenu, { left: pageTurnPopupLeft }]}>
            {[
              { icon: "slide", label: "Скольжение", mode: "slide" },
              { icon: "scroll", label: "Прокрутка", mode: "scroll" },
              { icon: "flash", label: "Быстрое выцветание", mode: "fade" },
            ].map(({ label, icon, mode }) => (
              <Pressable
                key={mode}
                onPress={() => {
                  onSelectPageTurnMode(mode as ReaderPageTurnMode);
                  setShowModeMenu(false);
                }}
                style={[
                  styles.smallPopupRow,
                  {
                    backgroundColor:
                      pageTurnMode === mode ? palette.accent : palette.panelButton,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallPopupText,
                    pageTurnMode === mode && { color: palette.background },
                  ]}
                >
                  {label}
                </Text>
                <ReaderSvgIcon
                  name={icon as ReaderIconName}
                  {...getPageTurnPopupIconFrame(mode as ReaderPageTurnMode)}
                  color={pageTurnMode === mode ? palette.background : "#EEF5FA"}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {showThemeMenu ? (
          <View style={[styles.themeModeMenu, { left: themePopupLeft }]}>
            {[
              { icon: "palette", label: "Своя", mode: "custom" },
              { icon: "sun", label: "Светлая", mode: "light" },
              { icon: "moon", label: "Тёмная", mode: "dark" },
            ].map(({ icon, label, mode }) => (
              <Pressable
                key={mode}
                onPress={() => {
                  onSelectThemeMode(mode as ReaderThemeMode);
                  setShowThemeMenu(false);
                }}
                style={[
                  styles.themePopupRow,
                  {
                    backgroundColor:
                      themeMode === mode ? palette.accent : palette.panelButton,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallPopupText,
                    themeMode === mode && { color: palette.background },
                  ]}
                >
                  {label}
                </Text>
                <ReaderSvgIcon
                  color={themeMode === mode ? palette.background : "#E6F3FF"}
                  name={icon as ReaderIconName}
                  {...getThemePopupIconFrame(mode as ReaderThemeMode)}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Темы и настройки</Text>
          <Pressable onPress={onCloseSheet} style={styles.settingsCloseButton}>
            <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
          </Pressable>
        </View>

        <View style={styles.settingsTopRow}>
          <View style={[styles.fontStepper, { backgroundColor: palette.panelButton }]}>
            <Pressable
              onPress={() => setFontSize((value) => Math.max(MIN_FONT_SIZE, value - 1))}
              style={styles.fontStepButton}
            >
              <ReaderSvgIcon height={11} name="smallA" width={8} />
            </Pressable>
            <View style={styles.fontSeparator} />
            <Pressable
              onPress={() => setFontSize((value) => Math.min(MAX_FONT_SIZE, value + 1))}
              style={styles.fontStepButton}
            >
              <ReaderSvgIcon height={16} name="bigA" width={12} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setShowThemeMenu(false);
              setShowModeMenu(!showModeMenu);
            }}
            style={[styles.settingsIconButton, { backgroundColor: palette.panelButton }]}
          >
            <ReaderSvgIcon
              name={currentPageTurnIcon}
              {...getSettingsTopIconFrame(pageTurnMode)}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              setShowModeMenu(false);
              setShowThemeMenu(!showThemeMenu);
            }}
            style={[styles.settingsIconButton, { backgroundColor: palette.panelButton }]}
          >
            <ReaderSvgIcon
              name={getThemeModeIcon(themeMode)}
              {...getThemeTopIconFrame(themeMode)}
            />
          </Pressable>
        </View>

        <View style={styles.brightnessRow}>
          <Pressable
            hitSlop={8}
            onPress={() => onChangeBrightness("down")}
            style={styles.brightnessSunButton}
          >
            <ReaderSvgIcon name="sunSmall" size={24} />
          </Pressable>
          <View style={styles.brightnessTrack}>
            <View
              style={[
                styles.brightnessFill,
                { width: `${Math.round(brightness * 100)}%` },
              ]}
            />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => onChangeBrightness("up")}
            style={styles.brightnessSunButton}
          >
            <ReaderSvgIcon name="sunLarge" size={24} />
          </Pressable>
        </View>

        <View style={[styles.settingsDivider, { backgroundColor: palette.border }]} />

        <View style={[styles.themeGrid, { width: themeGridWidth }]}>
          {themes.map((theme) => {
            const swatch = theme.palette;
            const selected = selectedTheme === theme.id;

            return (
              <Pressable
                key={theme.id}
                onLongPress={() => {
                  if (theme.editable) {
                    onOpenCustomThemeEditor({
                      id: theme.id,
                      name: theme.name,
                      ...theme.palette,
                    });
                  }
                }}
                onPress={() => onSelectTheme(theme.id)}
                style={[
                  styles.themeSwatch,
                  {
                    backgroundColor: swatch.background,
                    borderColor: selected ? "#E6F3FF" : "transparent",
                    width: themeSwatchWidth,
                  },
                ]}
              >
                <Text style={[styles.swatchAa, { color: swatch.text }]}>Aa</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.swatchAccent, { color: swatch.text }]}
                >
                  Акцент
                </Text>
              </Pressable>
            );
          })}
          {themeMode === "custom" && themes.length < 6 ? (
            <Pressable
              onPress={() => onOpenCustomThemeEditor()}
              style={[
                styles.themeSwatch,
                styles.addThemeSwatch,
                { borderColor: palette.border, width: themeSwatchWidth },
              ]}
            >
              <Ionicons name="add" size={30} color="#EDF3F8" />
              <Text style={styles.addThemeText}>Своя</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.configureWrap}>
          <Pressable
            onPress={onOpenCustomize}
            style={[styles.configureButton, { backgroundColor: palette.panelButton }]}
          >
            <ReaderSvgIcon name="settings" size={24} />
            <Text style={styles.configureText}>Настроить</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function CustomThemeEditor({
  draft,
  onCancel,
  onChange,
  onSave,
}: {
  draft: CustomThemeDraft;
  onCancel: () => void;
  onChange: (draft: CustomThemeDraft) => void;
  onSave: (draft: CustomThemeDraft) => void;
}) {
  const [activeColor, setActiveColor] =
    useState<CustomThemeColorKey>("background");
  const activeValue = draft[activeColor];

  const updateColor = (color: string) => {
    const normalizedColor = normalizeHexColor(color);
    if (!normalizedColor) return;

    onChange({
      ...draft,
      [activeColor]: normalizedColor,
    });
  };

  return (
    <View style={[styles.customThemeScreen, { backgroundColor: draft.background }]}>
      <View style={styles.customThemeHeader}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={[styles.customThemeNav, { color: draft.text }]}>Отмена</Text>
        </Pressable>
        <Text style={[styles.customThemeTitle, { color: draft.text }]}>
          Своя тема
        </Text>
        <Pressable onPress={() => onSave(draft)} hitSlop={12}>
          <Text style={[styles.customThemeSave, { color: draft.accent }]}>
            Сохранить
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.customThemeContent}
      >
        <View style={[styles.customThemePreview, { backgroundColor: draft.panel }]}>
          <TextInput
            onChangeText={(name) => onChange({ ...draft, name })}
            placeholder="Название"
            placeholderTextColor={draft.muted}
            style={[styles.customThemeNameInput, { color: draft.text }]}
            value={draft.name}
          />
          <Text style={[styles.customThemePreviewAa, { color: draft.text }]}>Aa</Text>
          <Text style={[styles.customThemePreviewText, { color: draft.text }]}>
            Цвет темы должен помогать чтению: фон спокойный, текст контрастный,
            акцент заметный, но не кричащий.
          </Text>
          <View style={styles.customThemePreviewButtons}>
            <View
              style={[
                styles.customThemeMiniButton,
                { backgroundColor: draft.panelButton },
              ]}
            />
            <View
              style={[
                styles.customThemeMiniButton,
                { backgroundColor: draft.accent },
              ]}
            />
          </View>
        </View>

        <Text style={[styles.colorEditorTitle, { color: draft.text }]}>
          Цвета
        </Text>
        <Text style={[styles.colorEditorSubtitle, { color: draft.muted }]}>
          Сейчас редактируется: {getColorRoleLabel(activeColor)}
        </Text>
        <View style={styles.colorRoleGrid}>
          {(
            [
              "background",
              "text",
              "panel",
              "panelButton",
              "accent",
              "muted",
              "border",
            ] as CustomThemeColorKey[]
          ).map((colorKey) => (
            <Pressable
              key={colorKey}
              onPress={() => setActiveColor(colorKey)}
              style={[
                styles.colorRole,
                {
                  borderColor:
                    activeColor === colorKey ? draft.accent : draft.border,
                },
              ]}
            >
              <View
                style={[
                  styles.colorRoleSwatch,
                  { backgroundColor: draft[colorKey] },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[styles.colorRoleText, { color: draft.text }]}
              >
                {getColorRoleLabel(colorKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.colorInspector, { backgroundColor: draft.panel }]}>
          <View
            style={[
              styles.colorInspectorPreview,
              { backgroundColor: activeValue },
            ]}
          />
          <View style={styles.colorInspectorTextBlock}>
            <Text style={[styles.colorInspectorLabel, { color: draft.muted }]}>
              {getColorRoleLabel(activeColor)}
            </Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={updateColor}
              style={[styles.hexInput, { color: draft.text }]}
              value={activeValue}
            />
          </View>
        </View>

        <View style={styles.colorSwatchGrid}>
          {colorPickerSwatches.map((color) => (
            <Pressable
              key={color}
              onPress={() => updateColor(color)}
              style={[
                styles.colorPickerSwatch,
                {
                  backgroundColor: color,
                  borderColor: activeValue === color ? draft.accent : draft.border,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ThemeCustomizeScreen({
  initialSettings,
  onCancel,
  onSave,
  palette,
}: {
  initialSettings: ReaderTextSettings;
  onCancel: () => void;
  onSave: (settings: ReaderTextSettings) => void;
  palette: ThemePalette;
}) {
  const [draft, setDraft] = useState(initialSettings);
  const fontOptions = [
    { family: "SourceSerif-Regular", label: "Source Serif" },
    { family: "Georgia", label: "Georgia" },
    { family: "SFProText-Regular", label: "SF Pro" },
  ];

  const setDraftValue = <Key extends keyof ReaderTextSettings>(
    key: Key,
    value: ReaderTextSettings[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const cycleFont = () => {
    const currentIndex = fontOptions.findIndex(
      (font) => font.family === draft.fontFamily,
    );
    const nextFont = fontOptions[(currentIndex + 1) % fontOptions.length];

    setDraft((current) => ({
      ...current,
      fontFamily: nextFont.family,
      fontLabel: nextFont.label,
    }));
  };

  return (
    <View style={[styles.customizeScreen, { backgroundColor: palette.background }]}>
      <View style={styles.customizeHeader}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.customizeNavText}>Отмена</Text>
        </Pressable>
        <Text style={styles.customizeTitle}>Типографика</Text>
        <Pressable onPress={() => onSave(draft)} hitSlop={12}>
          <Text style={styles.customizeSaveText}>Сохранить</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.customizeContent}
      >
        <View style={[styles.previewPanel, { backgroundColor: palette.panel }]}>
          <Text
            style={[
              styles.previewAa,
              {
                color: palette.text,
                fontFamily: draft.fontFamily,
                fontWeight: draft.bold ? "700" : "400",
              },
            ]}
          >
            Aa
          </Text>
          <Text
            style={[
              styles.previewParagraph,
              {
                color: palette.text,
                fontFamily: draft.fontFamily,
                fontWeight: draft.bold ? "700" : "400",
                letterSpacing: draft.letterSpacing,
                lineHeight: Math.round(29 * draft.lineHeightScale),
                textAlign: draft.justify ? "justify" : "left",
              },
            ]}
          >
            Мне нравится, когда текст дышит спокойно: строки не спорят друг с
            другом, поля держат ритм, а шрифт остаётся незаметным спутником
            истории.
          </Text>
        </View>

        <Text style={styles.customizeSectionTitle}>Текст</Text>
        <View style={styles.fontChoiceGrid}>
          {fontOptions.map((font) => {
            const active = draft.fontFamily === font.family;

            return (
              <Pressable
                key={font.family}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    fontFamily: font.family,
                    fontLabel: font.label,
                  }))
                }
                style={[
                  styles.fontChoice,
                  {
                    backgroundColor: active ? palette.text : palette.panel,
                    borderColor: active ? palette.text : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontChoiceAa,
                    {
                      color: active ? palette.background : palette.text,
                      fontFamily: font.family,
                    },
                  ]}
                >
                  Aa
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.fontChoiceLabel,
                    { color: active ? palette.background : palette.muted },
                  ]}
                >
                  {font.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.customizeCard, { backgroundColor: palette.panel }]}>
          <Pressable
            onPress={cycleFont}
            style={[styles.customizeRow, { borderColor: palette.border }]}
          >
            <View style={styles.customizeRowLabel}>
              <Text style={styles.customizeIconText}>Aa</Text>
              <Text style={styles.customizeRowText}>Шрифт</Text>
            </View>
            <View style={styles.customizeRowValue}>
              <Text style={styles.customizeValueText}>{draft.fontLabel}</Text>
              <Ionicons name="chevron-forward" size={22} color="#AEB4B9" />
            </View>
          </Pressable>

          <View style={styles.customizeRow}>
            <View style={styles.customizeRowLabel}>
              <Text style={styles.customizeBoldIcon}>B</Text>
              <Text style={styles.customizeRowText}>Жирный шрифт</Text>
            </View>
            <ToggleSwitch
              enabled={draft.bold}
              onToggle={() => setDraftValue("bold", !draft.bold)}
            />
          </View>
        </View>

        <Text style={styles.customizeSectionTitle}>Универсальный доступ и макет</Text>
        <View style={[styles.customizeCard, { backgroundColor: palette.panel }]}>
          <View style={[styles.customizeRow, { borderColor: palette.border }]}>
            <Text style={styles.customizeRowText}>Настраивать макет</Text>
            <ToggleSwitch
              enabled={draft.customLayout}
              onToggle={() => setDraftValue("customLayout", !draft.customLayout)}
            />
          </View>

          <TuningRow
            icon="swap-vertical-outline"
            label="Межстрочный интервал"
            onDecrease={() =>
              setDraftValue(
                "lineHeightScale",
                clampNumber(draft.lineHeightScale - 0.05, 1.05, 1.8),
              )
            }
            onIncrease={() =>
              setDraftValue(
                "lineHeightScale",
                clampNumber(draft.lineHeightScale + 0.05, 1.05, 1.8),
              )
            }
            value={draft.lineHeightScale.toFixed(2).replace(".", ",")}
          />
          <TuningRow
            icon="reader-outline"
            label="Отступ после абзаца"
            onDecrease={() =>
              setDraftValue(
                "paragraphSpacing",
                clampNumber(draft.paragraphSpacing - 0.25, 0, 1.5),
              )
            }
            onIncrease={() =>
              setDraftValue(
                "paragraphSpacing",
                clampNumber(draft.paragraphSpacing + 0.25, 0, 1.5),
              )
            }
            value={`${Math.round(draft.paragraphSpacing * 100)}%`}
          />
          <TuningRow
            icon="text-outline"
            label="Интервал между символами"
            onDecrease={() =>
              setDraftValue(
                "letterSpacing",
                clampNumber(draft.letterSpacing - 0.2, -0.4, 1.4),
              )
            }
            onIncrease={() =>
              setDraftValue(
                "letterSpacing",
                clampNumber(draft.letterSpacing + 0.2, -0.4, 1.4),
              )
            }
            value={`${Math.round(draft.letterSpacing * 100)}%`}
          />
          <TuningRow
            icon="reorder-three-outline"
            label="Интервал между словами"
            onDecrease={() =>
              setDraftValue(
                "wordSpacing",
                clampNumber(draft.wordSpacing - 0.25, 0, 1),
              )
            }
            onIncrease={() =>
              setDraftValue(
                "wordSpacing",
                clampNumber(draft.wordSpacing + 0.25, 0, 1),
              )
            }
            value={`${Math.round(draft.wordSpacing * 100)}%`}
          />
          <TuningRow
            icon="tablet-portrait-outline"
            label="Поля"
            onDecrease={() =>
              setDraftValue(
                "marginScale",
                clampNumber(draft.marginScale - 0.25, 0, 1),
              )
            }
            onIncrease={() =>
              setDraftValue(
                "marginScale",
                clampNumber(draft.marginScale + 0.25, 0, 1),
              )
            }
            value={`${Math.round(draft.marginScale * 100)}%`}
          />
        </View>

        <View style={[styles.customizeCard, { backgroundColor: palette.panel }]}>
          <View style={styles.customizeRow}>
            <Text style={styles.customizeRowText}>Выравнивание текста по ширине</Text>
            <ToggleSwitch
              enabled={draft.justify}
              onToggle={() => setDraftValue("justify", !draft.justify)}
            />
          </View>
        </View>

        <Pressable
          onPress={() => setDraft(DEFAULT_CUSTOM_SETTINGS)}
          style={[styles.resetThemeButton, { backgroundColor: palette.panel }]}
        >
          <Text style={styles.resetThemeText}>Сбросить тему</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.optionToggle,
        enabled && styles.optionToggleActive,
      ]}
    >
      <Ionicons
        name={enabled ? "checkmark" : "remove"}
        size={18}
        color={enabled ? "#101113" : "#D9DEE3"}
      />
      <Text
        style={[
          styles.optionToggleText,
          enabled && styles.optionToggleTextActive,
        ]}
      >
        {enabled ? "Вкл" : "Выкл"}
      </Text>
    </Pressable>
  );
}

function TuningRow({
  icon,
  label,
  onDecrease,
  onIncrease,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: string;
}) {
  return (
    <View style={[styles.tuningRow, { borderColor: "rgba(255,255,255,0.08)" }]}>
      <Text style={styles.tuningLabel}>{label}</Text>
      <View style={styles.tuningControls}>
        <Ionicons name={icon} size={25} color="#F2F2F2" />
        <Pressable onPress={onDecrease} style={styles.tuningButton}>
          <Ionicons name="remove" size={18} color="#F2F2F2" />
        </Pressable>
        <View style={styles.tuningTrack}>
          <View style={styles.tuningKnob} />
        </View>
        <Pressable onPress={onIncrease} style={styles.tuningButton}>
          <Ionicons name="add" size={18} color="#F2F2F2" />
        </Pressable>
        <Text style={styles.tuningValue}>{value}</Text>
      </View>
    </View>
  );
}

function TableOfContentsOverlay({
  absolutePage,
  book,
  chapterPages,
  content,
  onClose,
  onOpenChapter,
  palette,
  totalPages,
}: {
  absolutePage: number;
  book: Book;
  chapterPages: ReaderPage[][];
  content: ReadingContent;
  onClose: () => void;
  onOpenChapter: (index: number) => void;
  palette: ThemePalette;
  totalPages: number;
}) {
  const { height } = useWindowDimensions();
  const panelTop = Math.max(
    92,
    Math.min(116, Math.round((116 * height) / DESIGN_HEIGHT)),
  );

  return (
    <View
      style={[
        styles.tocPanel,
        { backgroundColor: palette.panel, top: panelTop },
      ]}
    >
      <View style={styles.tocHeader}>
        <View style={styles.coverThumb}>
          <BookCardNew
            coverColor={book.coverColor}
            coverImage={book.coverImage}
            width={54}
          />
        </View>

        <View style={styles.tocBookInfo}>
          <Text numberOfLines={2} style={styles.tocBookTitle}>
            {content.title}
          </Text>
          <Text style={styles.tocBookMeta}>
            Страница <Text style={styles.tocBookMetaStrong}>{absolutePage}</Text> из{" "}
            <Text style={styles.tocBookMetaStrong}>{Math.max(1, totalPages)}</Text>
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.overlayCloseButton}>
          <ReaderSvgIcon color="#FF9F9F" name="close" size={16} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.tocList}>
        {content.chapters.map((chapter, index) => (
          <Pressable
            key={chapter.id}
            onPress={() => onOpenChapter(index)}
            style={[styles.tocRow, { borderColor: palette.border }]}
          >
            <Text numberOfLines={1} style={styles.tocTitle}>
              {shortChapterTitle(chapter.title, index)}
            </Text>
            <Text style={styles.tocPage}>
              {getChapterStartPage(chapterPages, index)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function estimateCharsPerPage({
  contentHeight,
  contentWidth,
  fontSize,
  letterSpacing,
  lineHeight,
  paragraphSpacing,
  wordSpacing,
}: {
  contentHeight: number;
  contentWidth: number;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  paragraphSpacing: number;
  wordSpacing: number;
}) {
  const averageCharWidth = fontSize * (0.49 + letterSpacing * 0.03 + wordSpacing * 0.08);
  const charsPerLine = Math.max(25, Math.floor(contentWidth / averageCharWidth));
  const paragraphPenalty = 1 + paragraphSpacing * 0.08;
  const linesPerPage = Math.max(10, Math.floor(contentHeight / (lineHeight * paragraphPenalty)));

  return Math.max(520, Math.floor(charsPerLine * linesPerPage * 0.94));
}

function paginateChapter(
  chapter: ReadingChapter,
  chapterIndex: number,
  charsPerPage: number,
  paragraphSpacing: number,
): ReaderPage[] {
  const paragraphBreak = "\n".repeat(2 + Math.round(paragraphSpacing * 2));
  const pages: string[] = [];
  let remaining = chapter.text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join(paragraphBreak);

  while (remaining.length > charsPerPage * 1.08) {
    const splitAt = findSplitPoint(remaining, charsPerPage);
    pages.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) pages.push(remaining);

  return (pages.length > 0 ? pages : [chapter.text]).map((text, pageIndex) => ({
    chapterIndex,
    pageIndex,
    title: chapter.title,
    text,
  }));
}

function buildSearchResults(
  content: ReadingContent | null,
  chapterPages: ReaderPage[][],
  query: string,
): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!content || needle.length < 2) return [];

  const results: SearchResult[] = [];

  for (const [chapterIndex, pages] of chapterPages.entries()) {
    for (const page of pages) {
      const pageText = page.text.replace(/\s+/g, " ");
      const lowerText = pageText.toLowerCase();
      let matchIndex = lowerText.indexOf(needle);

      while (matchIndex >= 0 && results.length < 40) {
        const snippet = makeSnippet(pageText, matchIndex, needle.length);

        results.push({
          absolutePage: getAbsolutePage(chapterPages, chapterIndex, page.pageIndex),
          chapterIndex,
          id: `${page.title}-${chapterIndex}-${page.pageIndex}-${matchIndex}`,
          pageIndex: page.pageIndex,
          snippet,
        });

        matchIndex = lowerText.indexOf(needle, matchIndex + needle.length);
      }

      if (results.length >= 40) return results;
    }
  }

  return results;
}

function makeSnippet(text: string, index: number, length: number) {
  const start = Math.max(0, index - 8);
  const end = Math.min(text.length, index + length + 62);
  const prefix = start > 0 ? "" : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function makeCurrentPageNoteExcerpt(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (normalizedText.length <= 180) return normalizedText;

  return `${normalizedText.slice(0, 180).trim()}...`;
}

function formatReaderText(
  text: string,
  wordSpacing: number,
  paragraphSpacing: number,
) {
  const paragraphBreak = "\n".repeat(2 + Math.round(paragraphSpacing * 2));
  const paragraphText = paragraphSpacing > 0
    ? text.replace(/\n{2,}/g, paragraphBreak)
    : text;

  if (wordSpacing <= 0) return paragraphText;

  const extraSpaces = " ".repeat(Math.max(1, Math.round(wordSpacing * 3)));
  return paragraphText.replace(/ /g, ` ${extraSpaces}`);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value.toFixed(2))));
}

function findSplitPoint(text: string, preferredLength: number) {
  const min = Math.floor(preferredLength * 0.72);
  const max = Math.min(text.length, Math.floor(preferredLength * 1.05));
  const slice = text.slice(min, max);
  const punctuation = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("; "),
  );

  if (punctuation > 0) return min + punctuation + 1;

  const whitespace = slice.lastIndexOf(" ");
  return whitespace > 0 ? min + whitespace : preferredLength;
}

function getAbsolutePage(
  chapterPages: ReaderPage[][],
  chapterIndex: number,
  pageIndex: number,
) {
  const previousPages = chapterPages
    .slice(0, chapterIndex)
    .reduce((sum, chapter) => sum + chapter.length, 0);

  return previousPages + pageIndex + 1;
}

function getChapterPositionFromAbsolutePage(
  chapterPages: ReaderPage[][],
  absolutePageIndex: number,
) {
  let remainingPages = absolutePageIndex;

  for (const [chapterIndex, pages] of chapterPages.entries()) {
    if (remainingPages < pages.length) {
      return {
        chapterIndex,
        pageIndex: clamp(remainingPages, 0, Math.max(0, pages.length - 1)),
      };
    }

    remainingPages -= pages.length;
  }

  const lastChapterIndex = Math.max(0, chapterPages.length - 1);
  const lastChapterPages = chapterPages[lastChapterIndex] ?? [];

  return {
    chapterIndex: lastChapterIndex,
    pageIndex: Math.max(0, lastChapterPages.length - 1),
  };
}

function getChapterStartPage(chapterPages: ReaderPage[][], chapterIndex: number) {
  return chapterPages
    .slice(0, chapterIndex)
    .reduce((sum, chapter) => sum + chapter.length, 1);
}

function getChapterPageRatio(pageIndex: number, pageCount: number) {
  if (pageCount <= 1) return 0;

  return clamp(pageIndex / (pageCount - 1), 0, 1);
}

function getAudioTextJump(book: Book): AudioTextJump {
  if (!book.audioTextJumpRequestedAt) return {};

  return {
    chapterIndex: book.audioTextChapterIndex,
    chapterProgressRatio: book.audioTextChapterProgressRatio,
    progressRatio: book.audioReadingProgressRatio,
    requestedAt: book.audioTextJumpRequestedAt,
  };
}

function getAudioSyncedChapterIndex(
  chapters: ReadingChapter[],
  audioChapterIndex: number,
  book: Book,
) {
  const firstStoryChapterIndex = getFirstStoryChapterIndex(chapters, book);

  return clamp(
    audioChapterIndex + firstStoryChapterIndex,
    0,
    Math.max(0, chapters.length - 1),
  );
}

function getAudioTrackIndexForTextChapter(
  chapters: ReadingChapter[],
  textChapterIndex: number,
  trackCount: number,
  book: Book,
) {
  const firstStoryChapterIndex = getFirstStoryChapterIndex(chapters, book);

  return clamp(
    textChapterIndex - firstStoryChapterIndex,
    0,
    Math.max(0, trackCount - 1),
  );
}

function getFirstStoryChapterIndex(chapters: ReadingChapter[], book: Book) {
  if (chapters.length <= 1) return 0;

  const scanLimit = Math.min(chapters.length, 6);
  let skippedIntroCount = 0;

  for (let index = 0; index < scanLimit; index += 1) {
    if (!isServiceIntroChapter(chapters[index], book)) return index;
    skippedIntroCount = index + 1;
  }

  return Math.min(skippedIntroCount, Math.max(0, chapters.length - 1));
}

function isServiceIntroChapter(chapter: ReadingChapter | undefined, book: Book) {
  if (!chapter) return false;

  const normalizedTitle = normalizeIntroText(chapter.title);
  const normalizedBody = normalizeIntroText(chapter.text);
  const text = `${normalizedTitle}\n${normalizedBody}`;
  const serviceMarkers = [
    "bookscafe",
    "спасибо, что скачали книгу",
    "бесплатной электронной библиотеке",
    "все книги автора",
    "эта же книга в других форматах",
    "другие книги серии",
    "приятного чтения",
  ];

  if (serviceMarkers.some((marker) => text.includes(marker))) return true;

  const bodyLines = normalizedBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const compactBody = normalizedBody.replace(/\s+/g, " ").trim();
  const letterCount = (compactBody.match(/[a-zа-я0-9]/gi) ?? []).length;
  const wordCount = compactBody.split(/\s+/).filter(Boolean).length;

  if (letterCount === 0) return true;
  if (letterCount > 520 || wordCount > 95 || bodyLines.length > 12) return false;
  if (looksLikeStoryStart(compactBody, wordCount)) return false;

  let score = 0;
  if (letterCount <= 320) score += 1;
  if (bodyLines.length <= 8) score += 1;
  if (hasBookIdentityMarker(text, book)) score += 2;
  if (hasFrontMatterMarker(text)) score += 2;
  if (hasTitlePageShape(bodyLines, compactBody)) score += 1;

  return score >= 3;
}

function normalizeIntroText(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"“”]/g, "")
    .replace(/\r/g, "")
    .trim();
}

function looksLikeStoryStart(text: string, wordCount: number) {
  const sentenceCount = (text.match(/[.!?…]/g) ?? []).length;
  const dialogueLine = /(^|\n)\s*[—–-]\s*[a-zа-я]/i.test(text);

  return dialogueLine || (wordCount >= 35 && sentenceCount >= 2);
}

function hasBookIdentityMarker(text: string, book: Book) {
  return [book.title, book.author]
    .map(normalizeIntroText)
    .filter((value) => value.length >= 4)
    .some((value) => text.includes(value));
}

function hasFrontMatterMarker(text: string) {
  const frontMatterMarkers = [
    "isbn",
    "ocr",
    "fb2",
    "epub",
    "в одном томе",
    "издательство",
    "издатель",
    "электронная книга",
    "серия",
    "сборник",
    "аннотация",
    "обложка",
    "перевод",
    "редактор",
    "copyright",
  ];

  return frontMatterMarkers.some((marker) => text.includes(marker));
}

function hasTitlePageShape(lines: string[], text: string) {
  const punctuationCount = (text.match(/[.!?…,:;]/g) ?? []).length;
  const averageLineLength =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + line.length, 0) / lines.length
      : text.length;

  return lines.length >= 2 && lines.length <= 7 && averageLineLength <= 42 && punctuationCount <= 2;
}

function shortChapterTitle(title: string, index: number) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > 32) return `Глава ${index + 1}`;

  return trimmedTitle;
}

function getInitialThemeId(
  savedThemeId: string | undefined,
  mode: ReaderThemeMode,
  customThemes: ReaderCustomTheme[],
): string {
  const availableThemes =
    mode === "dark"
      ? darkThemeOrder
      : mode === "light"
        ? lightThemeOrder
        : customThemes.map((theme) => theme.id);

  return savedThemeId && availableThemes.includes(savedThemeId)
    ? savedThemeId
    : availableThemes[0] ?? darkThemeOrder[0];
}

function getInitialThemeMode(
  savedMode: ReaderThemeMode | undefined,
  savedThemeId: string | undefined,
): ReaderThemeMode {
  if (savedMode) return savedMode;
  if (isReaderThemeId(savedThemeId) && lightThemeOrder.includes(savedThemeId)) {
    return "light";
  }
  if (savedThemeId?.startsWith("custom-")) return "custom";

  return "dark";
}

function isReaderThemeId(value: string | undefined): value is ReaderThemeId {
  return Boolean(value && value in themePresets);
}

function getThemePalette(
  themeId: string,
  customThemes: ReaderCustomTheme[],
): ThemePalette {
  if (isReaderThemeId(themeId)) {
    return ensureReadablePalette(themePresets[themeId]);
  }

  return ensureReadablePalette(
    customThemes.find((theme) => theme.id === themeId) ??
      customThemes[0] ??
      themePresets.charcoal,
  );
}

function getThemeChoices(
  mode: ReaderThemeMode,
  customThemes: ReaderCustomTheme[],
): ThemeChoice[] {
  if (mode === "custom") {
    return customThemes.map((theme) => ({
      editable: true,
      id: theme.id,
      name: theme.name,
      palette: ensureReadablePalette(theme),
    }));
  }

  const themeIds = mode === "dark" ? darkThemeOrder : lightThemeOrder;

  return themeIds.map((themeId, index) => ({
    id: themeId,
    name: `${mode === "dark" ? "Тёмная" : "Светлая"} ${index + 1}`,
    palette: ensureReadablePalette(themePresets[themeId]),
  }));
}

function ensureReadablePalette(palette: ThemePalette): ThemePalette {
  return {
    ...palette,
    muted: getReadableTextColor(palette.background, palette.muted, {
      dark: "#4B4B4B",
      light: "#A9A9A9",
      minimum: 2.8,
    }),
    text: getReadableTextColor(palette.background, palette.text, {
      minimum: 7,
    }),
  };
}

function getReadableTextColor(
  background: string,
  preferred: string,
  options: {
    dark?: string;
    light?: string;
    minimum?: number;
  } = {},
) {
  const minimum = options.minimum ?? 4.5;
  if (getContrastRatio(background, preferred) >= minimum) return preferred;

  const light = options.light ?? "#FFFFFF";
  const dark = options.dark ?? "#111111";

  return getContrastRatio(background, light) >= getContrastRatio(background, dark)
    ? light
    : dark;
}

function getContrastRatio(firstColor: string, secondColor: string) {
  const first = getRelativeLuminance(firstColor);
  const second = getRelativeLuminance(secondColor);

  if (first === null || second === null) return 21;

  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string) {
  const rgb = parseHexColor(color);
  if (!rgb) return null;

  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function parseHexColor(color: string) {
  const normalized = color.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function getThemeModeIcon(mode: ReaderThemeMode): ReaderIconName {
  if (mode === "dark") return "moon";
  if (mode === "light") return "sun";
  return "palette";
}

function getPageTurnIcon(mode: ReaderPageTurnMode): ReaderIconName {
  if (mode === "scroll") return "scroll";
  if (mode === "fade") return "flash";
  return "slide";
}

function getSettingsTopIconFrame(mode: ReaderPageTurnMode) {
  if (mode === "scroll") return { height: 22, width: 17.55 };
  if (mode === "fade") return { height: 22, width: 15.71 };
  return { height: 24.5, width: 21 };
}

function getPageTurnPopupIconFrame(mode: ReaderPageTurnMode) {
  if (mode === "scroll") return { height: 22, width: 17.55 };
  if (mode === "fade") return { height: 22, width: 15.71 };
  return { height: 22, width: 18.86 };
}

function getThemeTopIconFrame(mode: ReaderThemeMode) {
  if (mode === "light") return { height: 17, width: 25.05 };
  if (mode === "custom") return { height: 18, width: 18 };
  return { height: 20, width: 18.25 };
}

function getThemePopupIconFrame(mode: ReaderThemeMode) {
  if (mode === "light") return { height: 17, width: 25.05 };
  if (mode === "custom") return { height: 18, width: 18 };
  return { height: 17.89, width: 16.33 };
}

function getMenuRowIconFrame(icon: ReaderIconName) {
  if (icon === "backBookmark") return { height: 19, width: 24 };
  if (icon === "toc") return { height: 15, width: 25 };
  if (icon === "search") return { height: 23, width: 23 };
  if (icon === "textSettings") return { height: 16, width: 22 };
  return { height: 24, width: 24 };
}

function getMenuActionIconFrame(icon: ReaderIconName) {
  if (icon === "audio" || icon === "sleep") return { height: 32, width: 32 };
  if (icon === "pencil" || icon === "bookmarkOn" || icon === "bookmarkOff") {
    return { height: 24, width: 24 };
  }

  return { height: 24, width: 24 };
}

function getPageKey(page: ReaderPage | null | undefined) {
  return page
    ? `${page.chapterIndex}:${page.pageIndex}:${page.title}`
    : "empty";
}

function normalizePageTurnMode(mode: unknown): ReaderPageTurnMode {
  if (mode === "scroll" || mode === "fade" || mode === "slide") {
    return mode;
  }

  return "slide";
}

function normalizeCustomThemes(
  themes: ReaderCustomTheme[] | undefined,
): ReaderCustomTheme[] {
  const sourceThemes = themes && themes.length > 0 ? themes : [defaultCustomTheme];

  return sourceThemes.slice(0, 6).map(normalizeCustomTheme);
}

function normalizeReadingNotes(notes: ReadingNote[] | undefined): ReadingNote[] {
  if (!Array.isArray(notes)) return [];

  return notes
    .filter((note) => note && typeof note.id === "string")
    .map((note) => {
      const noteKind: ReadingNote["noteKind"] =
        note.noteKind === "audio" ? "audio" : "text";
      const selectedText =
        String(note.selectedText || "").trim() ||
        (noteKind === "audio" ? "Аудиофрагмент" : "");

      return {
        absolutePage: Math.max(1, Number(note.absolutePage) || 1),
        audioDurationMillis:
          typeof note.audioDurationMillis === "number"
            ? Math.max(0, note.audioDurationMillis)
            : undefined,
        audioFileName: note.audioFileName
          ? String(note.audioFileName)
          : undefined,
        audioPositionMillis:
          typeof note.audioPositionMillis === "number"
            ? Math.max(0, note.audioPositionMillis)
            : undefined,
        audioProgressRatio:
          typeof note.audioProgressRatio === "number"
            ? clamp(note.audioProgressRatio, 0, 1)
            : undefined,
        audioTrackIndex:
          typeof note.audioTrackIndex === "number"
            ? Math.max(0, note.audioTrackIndex)
            : undefined,
        audioTrackTitle: note.audioTrackTitle
          ? String(note.audioTrackTitle)
          : undefined,
        chapterIndex: Math.max(0, Number(note.chapterIndex) || 0),
        chapterProgressRatio:
          typeof note.chapterProgressRatio === "number"
            ? clamp(note.chapterProgressRatio, 0, 1)
            : undefined,
        chapterTitle: String(note.chapterTitle || (noteKind === "audio" ? "Аудио" : "Глава")),
        createdAt: Number(note.createdAt) || Date.now(),
        description: String(note.description || ""),
        id: note.id,
        noteKind,
        pageIndex: Math.max(0, Number(note.pageIndex) || 0),
        selectedText,
        title: String(note.title || "Заметка").trim() || "Заметка",
        updatedAt: Number(note.updatedAt) || Number(note.createdAt) || Date.now(),
      };
    })
    .filter((note) => note.selectedText.length > 0)
    .sort((first, second) => second.createdAt - first.createdAt);
}

function formatNotesCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "заметка"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "заметки"
        : "заметок";

  return `${count} ${word}`;
}

function formatAudioNoteMeta(note: ReadingNote) {
  const trackTitle = note.audioTrackTitle || note.audioFileName || "Аудио";
  return `${trackTitle} | ${formatAudioNoteTime(note.audioPositionMillis ?? 0)}`;
}

function formatAudioNoteTime(milliseconds: number) {
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

function normalizeCustomTheme(theme: ReaderCustomTheme): ReaderCustomTheme {
  return {
    id: theme.id || `custom-${Date.now()}`,
    name: theme.name.trim() || "Своя тема",
    accent: normalizeHexColor(theme.accent) ?? defaultCustomTheme.accent,
    background:
      normalizeHexColor(theme.background) ?? defaultCustomTheme.background,
    border: normalizeHexColor(theme.border) ?? defaultCustomTheme.border,
    muted: normalizeHexColor(theme.muted) ?? defaultCustomTheme.muted,
    panel: normalizeHexColor(theme.panel) ?? defaultCustomTheme.panel,
    panelButton:
      normalizeHexColor(theme.panelButton) ?? defaultCustomTheme.panelButton,
    text: normalizeHexColor(theme.text) ?? defaultCustomTheme.text,
  };
}

function normalizeHexColor(color: string) {
  const normalized = color.trim().startsWith("#")
    ? color.trim()
    : `#${color.trim()}`;

  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : null;
}

function getColorRoleLabel(colorKey: CustomThemeColorKey) {
  const labels: Record<CustomThemeColorKey, string> = {
    accent: "Акцент",
    background: "Фон",
    border: "Линии",
    muted: "Вторичный",
    panel: "Панель",
    panelButton: "Кнопки",
    text: "Текст",
  };

  return labels[colorKey];
}

function normalizeTextSettings(
  settings: ReaderTextSettings | undefined,
): ReaderTextSettings {
  return {
    ...DEFAULT_CUSTOM_SETTINGS,
    ...settings,
    letterSpacing: clampNumber(settings?.letterSpacing ?? 0, -0.4, 1.4),
    lineHeightScale: clampNumber(settings?.lineHeightScale ?? 1.13, 1.05, 1.8),
    marginScale: clampNumber(settings?.marginScale ?? 0, 0, 1),
    paragraphSpacing: clampNumber(settings?.paragraphSpacing ?? 0, 0, 1.5),
    wordSpacing: clampNumber(settings?.wordSpacing ?? 0, 0, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  chapterLeft: {
    fontFamily: "SFProText-Light",
    fontSize: 16,
    left: 0,
    lineHeight: 19,
    paddingHorizontal: 72,
    position: "absolute",
    right: 0,
    textAlign: "center",
    top: 67,
  },

  readerCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: 27,
    top: 57,
    width: 36,
    zIndex: 40,
  },

  readerFrame: {
    overflow: "hidden",
    position: "absolute",
  },

  readerText: {
    fontFamily: "SourceSerif-Regular",
    fontWeight: "400",
  },

  inlineChapterTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 18,
    textAlign: "left",
  },

  scrollReader: {
    width: "100%",
  },

  scrollReaderContent: {
    paddingBottom: 48,
  },

  selectableReaderTextInput: {
    backgroundColor: "transparent",
    minHeight: 0,
    padding: 0,
    textAlignVertical: "top",
  },

  readerNoteHighlight: {
    backgroundColor: "rgba(154,205,255,0.34)",
  },

  pageModeFrame: {
    overflow: "hidden",
    width: "100%",
  },

  pageModeStack: {
    height: "100%",
    width: "100%",
  },

  pageFadeIncomingFrame: {
    zIndex: 1,
  },

  pageFadeOutgoingFrame: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  loader: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  brightnessDimmer: {
    backgroundColor: "#000000",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4,
  },

  leftTapZone: {
    left: 0,
    position: "absolute",
    width: "24%",
    zIndex: 5,
  },

  rightTapZone: {
    position: "absolute",
    right: 0,
    width: "24%",
    zIndex: 5,
  },

  pageCounter: {
    bottom: 39,
    fontFamily: "SFProText-Light",
    fontSize: 16,
    left: 0,
    lineHeight: 19,
    position: "absolute",
    right: 0,
    textAlign: "center",
  },

  floatingMenuButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    width: 36,
    zIndex: 35,
  },

  readerMenu: {
    alignItems: "flex-start",
    bottom: 80,
    gap: 4.87,
    position: "absolute",
    zIndex: 34,
  },

  menuRow: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    height: 42,
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 12,
    width: "99.43%",
  },

  menuRowText: {
    color: "#E6F3FF",
    flex: 1,
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  menuRowIconSlot: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  readerActionRow: {
    flexDirection: "row",
    gap: 4,
    height: 42,
    width: "99.43%",
  },

  menuIconButton: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },

  notesScreen: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 56,
    zIndex: 75,
  },

  notesHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 82,
  },

  notesBookThumb: {
    height: 82,
    overflow: "hidden",
    width: 54,
  },

  notesBookInfo: {
    flex: 1,
    gap: 3,
    paddingHorizontal: 2,
  },

  notesBookTitle: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    lineHeight: 20,
  },

  notesBookAuthor: {
    color: "#B2B2B2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  notesCount: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    lineHeight: 19,
    marginTop: 2,
  },

  notesCreateButton: {
    alignItems: "center",
    backgroundColor: "#878787",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  notesListContent: {
    gap: 10,
    paddingBottom: 44,
    paddingTop: 18,
  },

  notesEmptyState: {
    borderColor: "#4C4C4C",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  notesEmptyTitle: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 6,
  },

  notesEmptyText: {
    color: "#B2B2B2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 20,
  },

  noteCard: {
    backgroundColor: "#323232",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 12,
  },

  noteCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  noteCardMetaBlock: {
    flex: 1,
    gap: 2,
  },

  noteTitle: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    lineHeight: 20,
  },

  noteMeta: {
    color: "#B2B2B2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 14,
    lineHeight: 17,
  },

  noteDeleteButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  noteQuote: {
    color: "#E6F3FF",
    fontFamily: "SourceSerif-Regular",
    fontSize: 17,
    lineHeight: 22,
  },

  noteDescription: {
    color: "#C8CDD2",
    fontFamily: "SFProText-Regular",
    fontSize: 15,
    lineHeight: 19,
  },

  selectionNoteBar: {
    alignItems: "center",
    borderRadius: 14,
    bottom: 86,
    flexDirection: "row",
    gap: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: "absolute",
    right: 12,
    zIndex: 82,
  },

  selectionTextBlock: {
    flex: 1,
    gap: 2,
  },

  selectionTitle: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 17,
  },

  selectionSnippet: {
    color: "#C8CDD2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 14,
    lineHeight: 18,
  },

  selectionActionButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  selectionActionText: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 17,
  },

  selectionCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  noteEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },

  noteEditorKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },

  noteEditorSheet: {
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
    justifyContent: "space-between",
  },

  noteEditorTitle: {
    color: "#E6F3FF",
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 29,
  },

  noteEditorQuote: {
    color: "#E6F3FF",
    fontFamily: "SourceSerif-Regular",
    fontSize: 18,
    lineHeight: 23,
  },

  noteEditorMeta: {
    color: "#B2B2B2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 15,
    lineHeight: 18,
  },

  noteTitleInput: {
    backgroundColor: "#323232",
    borderRadius: 10,
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    height: 44,
    lineHeight: 21,
    paddingHorizontal: 12,
  },

  noteDescriptionInput: {
    backgroundColor: "#323232",
    borderRadius: 10,
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    height: 104,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 11,
  },

  noteSaveButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
  },

  noteSaveButtonDisabled: {
    opacity: 0.45,
  },

  noteSaveButtonText: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    lineHeight: 19,
  },

  searchPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    position: "absolute",
    right: 0,
    top: 116,
    zIndex: 60,
  },

  searchHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  searchInputWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    height: 36,
    paddingHorizontal: 6,
  },

  searchInput: {
    color: "#192024",
    flex: 1,
    fontFamily: "Poppins-Light",
    fontSize: 16,
    height: 36,
    lineHeight: 24,
    padding: 0,
  },

  overlayCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  searchResults: {
    marginTop: 16,
  },

  emptySearchText: {
    fontFamily: "SFProText-Regular",
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 8,
  },

  searchResultRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 63,
    paddingVertical: 12,
  },

  searchResultText: {
    color: "#E6F3FF",
    flex: 1,
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  searchHighlight: {
    color: "#73C4FF",
  },

  searchResultPage: {
    fontFamily: "SFProText-Light",
    fontSize: 16,
    lineHeight: 19,
    minWidth: 32,
    textAlign: "right",
  },

  settingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 55,
  },

  settingsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "visible",
    paddingBottom: 36,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  settingsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  settingsTitle: {
    color: "#E6F3FF",
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 29,
  },

  settingsCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(229,66,66,0.1)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  settingsTopRow: {
    flexDirection: "row",
    gap: 4,
    height: 38,
  },

  fontStepper: {
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    overflow: "hidden",
  },

  fontStepButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  fontSeparator: {
    alignSelf: "center",
    backgroundColor: "#E6F3FF",
    height: 24,
    width: StyleSheet.hairlineWidth,
  },

  settingsIconButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 72.5,
  },

  brightnessRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 24,
    marginTop: 12,
  },

  brightnessSunButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },

  brightnessTrack: {
    backgroundColor: "#979797",
    borderRadius: 99,
    flex: 1,
    height: 8,
    overflow: "hidden",
  },

  brightnessFill: {
    backgroundColor: "#E6F3FF",
    borderRadius: 99,
    height: 8,
    width: "38%",
  },

  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 24,
    marginTop: 12,
  },

  themeGrid: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    height: 204,
    rowGap: 8,
    columnGap: 8,
  },

  themeSwatch: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 2,
    height: 98,
    justifyContent: "center",
    width: "31.81%",
  },

  swatchAa: {
    fontFamily: "SFProDisplay-Light",
    fontSize: 32,
    lineHeight: 38,
    textAlign: "center",
    width: "100%",
  },

  swatchAccent: {
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
    textAlign: "center",
    width: "100%",
  },

  addThemeSwatch: {
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 3,
  },

  addThemeText: {
    color: "#EDF3F8",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
  },

  configureWrap: {
    alignItems: "center",
    marginTop: 22,
  },

  configureButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 7,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  configureText: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 19,
  },

  readingModeMenu: {
    gap: 4,
    left: 80,
    position: "absolute",
    top: -74,
    width: 207,
    zIndex: 70,
  },

  themeModeMenu: {
    gap: 4,
    left: 247,
    position: "absolute",
    top: -74,
    width: 116,
    zIndex: 70,
  },

  smallPopupRow: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    height: 42,
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 16,
  },

  themePopupRow: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    height: 42,
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 12,
  },

  smallPopupText: {
    color: "#E6F3FF",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  customThemeScreen: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 52,
    zIndex: 90,
  },

  customThemeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
    paddingHorizontal: 24,
  },

  customThemeNav: {
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    lineHeight: 21,
  },

  customThemeTitle: {
    fontFamily: "SFProText-Regular",
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 26,
  },

  customThemeSave: {
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 21,
  },

  customThemeContent: {
    paddingBottom: 44,
    paddingHorizontal: 18,
  },

  customThemePreview: {
    borderRadius: 18,
    gap: 12,
    marginBottom: 20,
    padding: 18,
  },

  customThemeNameInput: {
    fontFamily: "SFProText-Regular",
    fontSize: 19,
    fontWeight: "600",
    height: 28,
    lineHeight: 23,
    padding: 0,
  },

  customThemePreviewAa: {
    fontFamily: "SourceSerif-Regular",
    fontSize: 42,
    lineHeight: 48,
  },

  customThemePreviewText: {
    fontFamily: "SourceSerif-Regular",
    fontSize: 20,
    lineHeight: 26,
  },

  customThemePreviewButtons: {
    flexDirection: "row",
    gap: 8,
  },

  customThemeMiniButton: {
    borderRadius: 8,
    height: 34,
    width: 64,
  },

  colorEditorTitle: {
    fontFamily: "SFProText-Regular",
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: 2,
  },

  colorEditorSubtitle: {
    fontFamily: "SFProText-Light",
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 10,
  },

  colorRoleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  colorRole: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 42,
    paddingHorizontal: 10,
    width: "48.8%",
  },

  colorRoleSwatch: {
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 20,
    width: 20,
  },

  colorRoleText: {
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 17,
  },

  colorInspector: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  colorInspectorPreview: {
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    width: 40,
  },

  colorInspectorTextBlock: {
    flex: 1,
    gap: 2,
  },

  colorInspectorLabel: {
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
  },

  hexInput: {
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    height: 44,
    lineHeight: 20,
    padding: 0,
  },

  colorSwatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  colorPickerSwatch: {
    borderRadius: 11,
    borderWidth: 2,
    height: 42,
    width: 42,
  },

  customizeScreen: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 52,
    zIndex: 80,
  },

  customizeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 18,
  },

  customizeNavText: {
    color: "#F2F2F2",
    fontFamily: "SFProText-Regular",
    fontSize: 18,
    lineHeight: 22,
  },

  customizeSaveText: {
    color: "#9ACDFF",
    fontFamily: "SFProText-Regular",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },

  customizeTitle: {
    color: "#F2F2F2",
    fontFamily: "SFProText-Regular",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 27,
  },

  customizeContent: {
    paddingBottom: 48,
    paddingHorizontal: 30,
  },

  previewPanel: {
    borderRadius: 16,
    marginBottom: 24,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },

  previewAa: {
    fontSize: 45,
    lineHeight: 52,
    marginBottom: 19,
  },

  previewParagraph: {
    fontSize: 25,
  },

  customizeSectionTitle: {
    color: "#F2F2F2",
    fontFamily: "SFProText-Regular",
    fontSize: 23,
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 10,
  },

  fontChoiceGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  fontChoice: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 3,
    height: 72,
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  fontChoiceAa: {
    fontSize: 28,
    lineHeight: 32,
  },

  fontChoiceLabel: {
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    lineHeight: 15,
    maxWidth: "100%",
  },

  customizeCard: {
    borderRadius: 14,
    marginBottom: 22,
    overflow: "hidden",
  },

  customizeRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 28,
  },

  customizeRowLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 22,
  },

  customizeIconText: {
    color: "#F2F2F2",
    fontFamily: "SourceSerif-Regular",
    fontSize: 26,
    lineHeight: 31,
    width: 30,
  },

  customizeBoldIcon: {
    color: "#F2F2F2",
    fontFamily: "SFProText-Regular",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
    width: 30,
  },

  customizeRowText: {
    color: "#F2F2F2",
    flexShrink: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 20,
    lineHeight: 24,
  },

  customizeRowValue: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },

  customizeValueText: {
    color: "#AEB4B9",
    fontFamily: "SourceSerif-Regular",
    fontSize: 20,
    lineHeight: 24,
  },

  optionToggle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  optionToggleActive: {
    backgroundColor: "#E8EEF4",
    borderColor: "#E8EEF4",
  },

  optionToggleText: {
    color: "#D9DEE3",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
  },

  optionToggleTextActive: {
    color: "#101113",
    fontWeight: "600",
  },

  tuningRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },

  tuningLabel: {
    color: "#AEB4B9",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    letterSpacing: 0.4,
    lineHeight: 20,
    marginBottom: 12,
    textTransform: "uppercase",
  },

  tuningControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  tuningButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },

  tuningTrack: {
    backgroundColor: "#5D5E64",
    borderRadius: 99,
    flex: 1,
    height: 5,
    justifyContent: "center",
  },

  tuningKnob: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    height: 30,
    width: 30,
  },

  tuningValue: {
    color: "#AEB4B9",
    fontFamily: "SFProText-Regular",
    fontSize: 20,
    lineHeight: 24,
    minWidth: 56,
    textAlign: "right",
  },

  resetThemeButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 58,
    justifyContent: "center",
  },

  resetThemeText: {
    color: "#777B80",
    fontFamily: "SFProText-Regular",
    fontSize: 20,
    lineHeight: 24,
  },

  tocPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 13,
    position: "absolute",
    right: 0,
    top: 116,
    zIndex: 60,
  },

  tocHeader: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 82,
  },

  coverThumb: {
    borderRadius: 2,
    height: 82,
    overflow: "hidden",
    width: 54,
  },

  tocBookInfo: {
    flex: 1,
    gap: 3,
    paddingHorizontal: 10,
  },

  tocBookTitle: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    lineHeight: 20,
  },

  tocBookMeta: {
    color: "#B2B2B2",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  tocBookMetaStrong: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  tocList: {
    marginTop: 18,
  },

  tocRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 43,
    justifyContent: "space-between",
  },

  tocTitle: {
    color: "#E6F3FF",
    flex: 1,
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
  },

  tocPage: {
    color: "#E6F3FF",
    fontFamily: "SFProText-Light",
    fontSize: 16,
    lineHeight: 19,
    minWidth: 44,
    textAlign: "right",
  },
});
