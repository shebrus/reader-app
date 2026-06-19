import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import JSZip from "jszip";

import {
  getAudioFileFormat,
  getTitleFromFileName as getAudioTitleFromFileName,
} from "./audioBook";
import { readBookMetadata } from "./bookMetadata";
import type {
  AudioFileFormat,
  Book,
  BookAudioChapterMarker,
  BookAudioTrack,
  BookFileFormat,
} from "./types";
import {
  prepareStreamingMp3AudioZip,
  readStreamingZipArchiveProfile,
  type StreamingZipImportProgress,
} from "./zipAudioImport";

const supportedBookFormats = ["epub", "fb2", "txt", "pdf"] as const;
const supportedPickerFormats = [...supportedBookFormats, "zip"] as const;
type SupportedPickerFormat = (typeof supportedPickerFormats)[number];
const supportedAudioPickerFormats = ["zip"] as const;
type SupportedAudioPickerFormat =
  | AudioFileFormat
  | (typeof supportedAudioPickerFormats)[number];

const unknownAuthor = "Неизвестный автор";
const unknownAudioAuthor = "Аудиокнига";
const importedCoverColor = "#DFF1FF";

type PreparedBook = {
  destinationFile: File;
  fileFormat: BookFileFormat;
  originalFileName: string;
  storedFileSize?: number;
};

export type PendingAudio = {
  chapterMarkers?: BookAudioChapterMarker[];
  fileName: string;
  fileSize?: number;
  fileUri: string;
  fileFormat: AudioFileFormat;
  tracks?: BookAudioTrack[];
};

export type AudioImportProgress = StreamingZipImportProgress & {
  fileName?: string;
};

export type PickedAudioImportSource = {
  assetSize?: number;
  id: string;
  originalFileName: string;
  pickedFormat: SupportedAudioPickerFormat;
  sourceFile: File;
};

export async function pickAndImportBook(shelfId: string): Promise<Book | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const sourceFile = new File(asset.uri);
  const pickedFormat = getSupportedPickerFormat(asset.name, asset.mimeType);
  if (!pickedFormat) {
    throw new Error("Выберите книгу в формате EPUB, FB2, TXT, PDF или ZIP.");
  }

  const importedAt = Date.now();
  const id = `book-${importedAt}`;
  const booksDirectory = new Directory(Paths.document, "books");
  booksDirectory.create({ idempotent: true, intermediates: true });

  let loadedZip: JSZip | undefined;
  if (pickedFormat === "zip") {
    const archiveProfile = await readStreamingZipArchiveProfile(sourceFile);
    if (archiveProfile.audioEntries.length > 0) {
      const audio = await prepareStreamingMp3AudioZip({
        audioEntries: archiveProfile.audioEntries,
        audioId: `audio-${importedAt}`,
        assetSize: asset.size,
        booksDirectory,
        originalFileName: asset.name,
        playlistEntries: archiveProfile.playlistEntries,
        sourceFile,
      });

      if (!audio) {
        throw new Error("Пока ZIP-аудио поддерживает только MP3-файлы.");
      }

      return makeImportedAudioBook(audio, shelfId, importedAt);
    }

    loadedZip = await JSZip.loadAsync(await sourceFile.bytes());
  }

  const {
    destinationFile,
    fileFormat,
    originalFileName,
    storedFileSize,
  } = await preparePickedFile(sourceFile, booksDirectory, id, pickedFormat, loadedZip);
  const metadata = await readBookMetadata(destinationFile, fileFormat as Book["fileFormat"], id);

  return {
    id,
    author: metadata.author ?? unknownAuthor,
    coverColor: metadata.coverImage ? undefined : importedCoverColor,
    coverImage: metadata.coverImage,
    fileFormat,
    fileName: originalFileName,
    fileSize: storedFileSize ?? asset.size,
    fileUri: destinationFile.uri,
    importedAt,
    notesCount: 0,
    pagesRead: 0,
    shelfId,
    title: metadata.title ?? getTitleFromFileName(originalFileName),
    totalPages: 0,
  };
}

export async function pickAudioFile(
  onProgress?: (progress: AudioImportProgress) => void,
): Promise<PendingAudio | null> {
  const source = await pickAudioImportSource();
  if (!source) return null;

  return importPickedAudioSource(source, onProgress);
}

export async function pickAudioImportSource(): Promise<PickedAudioImportSource | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const sourceFile = new File(asset.uri);
  const pickedFormat = await detectSupportedAudioPickerFormat(
    asset.name,
    asset.mimeType,
    sourceFile,
  );
  if (!pickedFormat) {
    throw new Error(
      "Выберите аудиокнигу аудиофайлом или ZIP-архивом с аудиоглавами.",
    );
  }

  const importedAt = Date.now();
  const id = `audio-${importedAt}`;
  const booksDirectory = new Directory(Paths.document, "books");
  booksDirectory.create({ idempotent: true, intermediates: true });

  return {
    assetSize: asset.size,
    id,
    originalFileName: asset.name,
    pickedFormat,
    sourceFile,
  };
}

export async function importPickedAudioSource(
  source: PickedAudioImportSource,
  onProgress?: (progress: AudioImportProgress) => void,
): Promise<PendingAudio> {
  const booksDirectory = new Directory(Paths.document, "books");
  booksDirectory.create({ idempotent: true, intermediates: true });

  onProgress?.({
    fileName: source.originalFileName,
    message: "Готовим аудио",
    phase: "scanning",
    progress: 0,
  });

  return preparePickedAudio(
    source.sourceFile,
    booksDirectory,
    source.id,
    source.pickedFormat,
    source.originalFileName,
    source.assetSize,
    (progress) =>
      onProgress?.({
        ...progress,
        fileName: source.originalFileName,
      }),
  );
}

function makeImportedAudioBook(
  audio: PendingAudio,
  shelfId: string,
  importedAt: number,
): Book {
  return {
    id: `audio-book-${importedAt}`,
    author: unknownAudioAuthor,
    audioChapterMarkers: audio.chapterMarkers,
    audioCurrentTrackIndex: 0,
    audioFileFormat: audio.fileFormat,
    audioFileName: audio.fileName,
    audioFileSize: audio.fileSize,
    audioPositionMillis: 0,
    audioReadingProgressRatio: 0,
    audioTracks: audio.tracks,
    audioUri: audio.fileUri,
    coverColor: importedCoverColor,
    fileFormat: audio.fileFormat,
    fileName: audio.fileName,
    fileSize: audio.fileSize,
    fileUri: audio.fileUri,
    importedAt,
    notesCount: 0,
    pagesRead: 0,
    shelfId: shelfId === "recent" ? "all" : shelfId,
    title: getAudioTitleFromFileName(audio.fileName) || "Новая аудиокнига",
    totalPages: 0,
  };
}

async function preparePickedFile(
  sourceFile: File,
  booksDirectory: Directory,
  bookId: string,
  pickedFormat: SupportedPickerFormat,
  loadedZip?: JSZip,
): Promise<PreparedBook> {
  if (pickedFormat === "zip") {
    return prepareBookZip(sourceFile, booksDirectory, bookId, loadedZip);
  }

  const destinationFile = new File(booksDirectory, `${bookId}.${pickedFormat}`);
  sourceFile.copy(destinationFile);

  return {
    destinationFile,
    fileFormat: pickedFormat,
    originalFileName: sourceFile.name,
    storedFileSize: sourceFile.size,
  };
}

async function prepareBookZip(
  sourceFile: File,
  booksDirectory: Directory,
  bookId: string,
  loadedZip?: JSZip,
): Promise<PreparedBook> {
  const zip = loadedZip ?? await JSZip.loadAsync(await sourceFile.bytes());
  const readableFiles = getReadableBookArchiveFiles(zip);
  const fb2Files = readableFiles.filter((file) =>
    file.name.toLowerCase().endsWith(".fb2"),
  );

  if (readableFiles.length === 0) {
    throw new Error("В ZIP-архиве не найдены главы книги.");
  }

  if (readableFiles.length === 1 && fb2Files.length === 1) {
    const fb2File = fb2Files[0];
    const fb2Bytes = await fb2File.async("uint8array");
    const destinationFile = new File(booksDirectory, `${bookId}.fb2`);
    destinationFile.write(fb2Bytes);

    return {
      destinationFile,
      fileFormat: "fb2",
      originalFileName: getArchiveFileName(fb2File.name),
      storedFileSize: fb2Bytes.length,
    };
  }

  const destinationFile = new File(booksDirectory, `${bookId}.zip`);
  sourceFile.copy(destinationFile);

  return {
    destinationFile,
    fileFormat: "zip",
    originalFileName: sourceFile.name,
    storedFileSize: sourceFile.size,
  };
}

async function preparePickedAudio(
  sourceFile: File,
  booksDirectory: Directory,
  audioId: string,
  pickedFormat: SupportedAudioPickerFormat,
  originalFileName: string,
  assetSize?: number,
  onProgress?: (progress: AudioImportProgress) => void,
): Promise<PendingAudio> {
  if (pickedFormat === "zip") {
    return prepareAudioZip(
      sourceFile,
      booksDirectory,
      audioId,
      originalFileName,
      assetSize,
      undefined,
      undefined,
      onProgress,
    );
  }

  onProgress?.({
    fileName: originalFileName,
    message: "Копируем аудио",
    phase: "extracting",
    progress: 0.2,
  });

  const destinationFile = new File(booksDirectory, `${audioId}.${pickedFormat}`);
  sourceFile.copy(destinationFile);

  const fileSize = sourceFile.size ?? assetSize;
  const title = getAudioTitleFromFileName(originalFileName) || originalFileName;
  const chapterMarkers = await readEmbeddedChapterMarkers(sourceFile, pickedFormat);
  const tracks: BookAudioTrack[] = [
    {
      fileFormat: pickedFormat,
      fileName: originalFileName,
      fileSize,
      id: `${audioId}-track-0`,
      title,
      uri: destinationFile.uri,
    },
  ];

  onProgress?.({
    fileName: originalFileName,
    message: "Аудио готово",
    phase: "finishing",
    progress: 1,
    totalTracks: 1,
  });

  return {
    ...(chapterMarkers.length > 0 ? { chapterMarkers } : {}),
    fileFormat: pickedFormat,
    fileName: originalFileName,
    fileSize,
    fileUri: destinationFile.uri,
    tracks,
  };
}

async function prepareAudioZip(
  sourceFile: File,
  booksDirectory: Directory,
  audioId: string,
  originalFileName: string,
  assetSize?: number,
  loadedZip?: JSZip,
  loadedAudioEntries?: JSZip.JSZipObject[],
  onProgress?: (progress: AudioImportProgress) => void,
): Promise<PendingAudio> {
  if (!loadedZip) {
    const archiveProfile = await readStreamingZipArchiveProfile(sourceFile);
    const streamingAudio = await prepareStreamingMp3AudioZip({
      audioEntries: archiveProfile.audioEntries,
      audioId,
      assetSize,
      booksDirectory,
      originalFileName,
      onProgress,
      playlistEntries: archiveProfile.playlistEntries,
      sourceFile,
    });

    if (streamingAudio) return streamingAudio;

    if (archiveProfile.audioEntries.length > 0) {
      throw new Error("Пока ZIP-аудио поддерживает только MP3-файлы.");
    }
  }

  const zip = loadedZip ?? await JSZip.loadAsync(await sourceFile.bytes());
  const audioEntries = await sortAudioArchiveEntries(
    zip,
    loadedAudioEntries ?? getAudioArchiveEntries(zip),
  );

  if (audioEntries.length === 0) {
    throw new Error(
      `В ZIP-архиве не найдены аудиофайлы. ${describeArchiveContents(zip)}`,
    );
  }

  const audioDirectory = new Directory(booksDirectory, audioId);
  audioDirectory.create({ idempotent: true, intermediates: true });

  const tracks: BookAudioTrack[] = [];
  let totalSize = 0;
  let singleAudioBytes: Uint8Array | null = null;

  for (const [index, entry] of audioEntries.entries()) {
    const fileFormat = getAudioFileFormat(entry.name);
    if (!fileFormat) continue;

    const audioBytes = await entry.async("uint8array");
    const archiveFileName = getArchiveFileName(entry.name);
    const storedFileName = `${String(index + 1).padStart(3, "0")}-${sanitizeFileName(archiveFileName)}`;
    const destinationFile = new File(audioDirectory, storedFileName);
    destinationFile.write(audioBytes);

    if (audioEntries.length === 1) {
      singleAudioBytes = audioBytes;
    }

    totalSize += audioBytes.length;
    tracks.push({
      chapterIndex: index,
      fileFormat,
      fileName: archiveFileName,
      fileSize: audioBytes.length,
      id: `${audioId}-track-${index}`,
      title: getAudioTitleFromFileName(archiveFileName) || `Track ${index + 1}`,
      uri: destinationFile.uri,
    });
  }

  const firstTrack = tracks[0];
  if (!firstTrack) {
    throw new Error("В ZIP-архиве не найдены поддерживаемые аудиофайлы.");
  }

  const sidecarMarkers =
    tracks.length === 1 ? await readArchiveChapterMarkers(zip) : [];
  const embeddedMarkers =
    tracks.length === 1 && singleAudioBytes
      ? readChapterMarkersFromBytes(singleAudioBytes, firstTrack.fileFormat)
      : [];
  const chapterMarkers =
    sidecarMarkers.length >= embeddedMarkers.length
      ? sidecarMarkers
      : embeddedMarkers;

  return {
    ...(chapterMarkers.length > 0 ? { chapterMarkers } : {}),
    fileFormat: firstTrack.fileFormat,
    fileName: originalFileName,
    fileSize: totalSize || sourceFile.size || assetSize,
    fileUri: firstTrack.uri,
    tracks,
  };
}

async function detectSupportedAudioPickerFormat(
  fileName: string,
  mimeType: string | undefined,
  sourceFile: File,
): Promise<SupportedAudioPickerFormat | null> {
  return (
    getSupportedAudioPickerFormat(fileName, mimeType) ??
    await detectAudioPickerFormatFromHeader(sourceFile)
  );
}

function getSupportedAudioPickerFormat(
  fileName: string,
  mimeType?: string,
): SupportedAudioPickerFormat | null {
  const extension = getExtension(fileName);

  if (extension === "zip") return "zip";
  return getAudioFileFormat(fileName) ?? getAudioPickerFormatFromMimeType(mimeType);
}

function getSupportedPickerFormat(
  fileName: string,
  mimeType?: string,
): SupportedPickerFormat | null {
  const extension = getExtension(fileName);

  if (
    extension &&
    supportedPickerFormats.includes(extension as SupportedPickerFormat)
  ) {
    return extension as SupportedPickerFormat;
  }

  if (isZipMimeType(mimeType)) return "zip";

  return null;
}

function getAudioPickerFormatFromMimeType(
  mimeType: string | undefined,
): SupportedAudioPickerFormat | null {
  const normalizedMimeType = mimeType?.toLowerCase();
  if (!normalizedMimeType) return null;

  if (isZipMimeType(normalizedMimeType)) return "zip";
  if (normalizedMimeType.includes("mpeg")) return "mp3";
  if (normalizedMimeType.includes("mp4") || normalizedMimeType.includes("m4a")) return "m4a";
  if (normalizedMimeType.includes("m4b")) return "m4b";
  if (normalizedMimeType.includes("aac")) return "aac";
  if (normalizedMimeType.includes("wav")) return "wav";
  if (normalizedMimeType.includes("ogg")) return "ogg";
  if (normalizedMimeType.includes("opus")) return "opus";
  if (normalizedMimeType.includes("flac")) return "flac";
  if (normalizedMimeType.includes("webm")) return "webm";
  if (normalizedMimeType.includes("aiff")) return "aiff";
  if (normalizedMimeType.includes("caf")) return "caf";
  if (normalizedMimeType.includes("amr")) return "amr";
  if (normalizedMimeType.includes("3gpp")) return "3gp";
  if (normalizedMimeType.includes("x-ms-wma")) return "wma";

  return null;
}

async function detectAudioPickerFormatFromHeader(
  sourceFile: File,
): Promise<SupportedAudioPickerFormat | null> {
  try {
    const bytes = readFileHeaderBytes(sourceFile, 64);

    if (isZipBytes(bytes)) return "zip";
    if (bytesToAscii(bytes, 0, 3) === "ID3" || isMp3FrameHeader(bytes)) return "mp3";
    if (bytesToAscii(bytes, 0, 4) === "fLaC") return "flac";
    if (bytesToAscii(bytes, 0, 4) === "OggS") return "ogg";
    if (
      bytesToAscii(bytes, 0, 4) === "RIFF" &&
      bytesToAscii(bytes, 8, 4) === "WAVE"
    ) {
      return "wav";
    }
    if (bytesToAscii(bytes, 4, 4) === "ftyp") return "m4a";
  } catch {
    return null;
  }

  return null;
}

function getReadableBookArchiveFiles(zip: JSZip) {
  return Object.values(zip.files)
    .filter((file) => {
      if (file.dir || isHiddenArchivePath(file.name)) return false;

      const extension = getExtension(file.name);
      return (
        extension === "fb2" ||
        extension === "txt" ||
        extension === "md" ||
        extension === "html" ||
        extension === "htm" ||
        extension === "xhtml"
      );
    })
    .sort((a, b) => compareArchivePaths(a.name, b.name));
}

function getZipArchiveProfile(zip: JSZip) {
  return {
    audioEntries: getAudioArchiveEntries(zip),
    readableFiles: getReadableBookArchiveFiles(zip),
  };
}

function getAudioArchiveEntries(zip: JSZip) {
  return Object.values(zip.files).filter(
    (file) => !file.dir && !isHiddenArchivePath(file.name) && getAudioFileFormat(file.name),
  );
}

function describeArchiveContents(zip: JSZip) {
  const fileNames = Object.values(zip.files)
    .filter((file) => !file.dir && !isHiddenArchivePath(file.name))
    .map((file) => getArchiveFileName(file.name))
    .slice(0, 8);

  if (fileNames.length === 0) return "Архив пуст или содержит только папки.";

  return `Первые файлы: ${fileNames.join(", ")}.`;
}

async function sortAudioArchiveEntries(zip: JSZip, audioEntries: any[]) {
  const naturalOrder = [...audioEntries].sort((a, b) =>
    compareArchivePaths(a.name, b.name),
  );
  const playlistFile = Object.values(zip.files)
    .filter((file) => !file.dir && /\.(m3u8?|pls)$/i.test(file.name))
    .sort((a, b) => compareArchivePaths(a.name, b.name))[0];

  if (!playlistFile) return naturalOrder;

  const playlistOrder = parsePlaylistOrder(await playlistFile.async("text"));
  if (playlistOrder.length === 0) return naturalOrder;

  return naturalOrder.sort((a, b) => {
    const aIndex = getPlaylistIndex(a.name, playlistOrder);
    const bIndex = getPlaylistIndex(b.name, playlistOrder);

    if (aIndex !== bIndex) return aIndex - bIndex;
    return compareArchivePaths(a.name, b.name);
  });
}

function parsePlaylistOrder(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(normalizeArchivePathForMatch);
}

function getPlaylistIndex(path: string, playlistOrder: string[]) {
  const normalizedPath = normalizeArchivePathForMatch(path);
  const baseName = normalizeArchivePathForMatch(getArchiveFileName(path));
  const index = playlistOrder.findIndex(
    (item) => item === normalizedPath || item.endsWith(`/${baseName}`) || item === baseName,
  );

  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

async function readArchiveChapterMarkers(zip: JSZip) {
  const sidecarFiles = Object.values(zip.files)
    .filter((file) => {
      if (file.dir || isHiddenArchivePath(file.name)) return false;
      return /\.(cue|ffmetadata|json|txt)$/i.test(file.name);
    })
    .sort((a, b) => compareArchivePaths(a.name, b.name));
  let bestMarkers: BookAudioChapterMarker[] = [];

  for (const file of sidecarFiles) {
    const text = await file.async("text");
    const markers = parseChapterMarkersFromText(text, file.name);

    if (markers.length > bestMarkers.length) {
      bestMarkers = markers;
    }
  }

  return bestMarkers;
}

async function readEmbeddedChapterMarkers(
  file: File,
  format: AudioFileFormat,
) {
  try {
    if (format === "mp3") {
      const id3TagBytes = readMp3Id3TagBytes(file);
      return id3TagBytes ? readChapterMarkersFromBytes(id3TagBytes, format) : [];
    }

    return readChapterMarkersFromBytes(await file.bytes(), format);
  } catch {
    return [];
  }
}

function readChapterMarkersFromBytes(
  bytes: Uint8Array,
  format: AudioFileFormat,
) {
  if (format === "mp3") return parseId3ChapterMarkers(bytes);
  if (format === "m4a" || format === "m4b" || format === "mp4") {
    return parseMp4ChapterMarkers(bytes);
  }

  return [];
}

function parseChapterMarkersFromText(text: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "cue") return normalizeMarkers(parseCueMarkers(text));
  if (extension === "json") return normalizeMarkers(parseJsonMarkers(text));
  if (extension === "ffmetadata" || text.includes("[CHAPTER]")) {
    return normalizeMarkers(parseFfmetadataMarkers(text));
  }

  return normalizeMarkers(parsePlainTextMarkers(text));
}

function parseCueMarkers(text: string) {
  const markers: Partial<BookAudioChapterMarker>[] = [];
  let trackStarted = false;
  let currentTitle = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (/^TRACK\s+\d+/i.test(line)) {
      trackStarted = true;
      currentTitle = "";
      continue;
    }

    const titleMatch = line.match(/^TITLE\s+"?(.+?)"?$/i);
    if (trackStarted && titleMatch) {
      currentTitle = titleMatch[1].trim();
      continue;
    }

    const indexMatch = line.match(/^INDEX\s+01\s+(\d+):(\d{2}):(\d{2})/i);
    if (trackStarted && indexMatch) {
      markers.push({
        startMillis: parseCueTime(indexMatch[1], indexMatch[2], indexMatch[3]),
        title: currentTitle,
      });
    }
  }

  return markers;
}

function parseJsonMarkers(text: string) {
  try {
    const parsed = JSON.parse(text);
    const chapters = Array.isArray(parsed) ? parsed : parsed?.chapters;
    if (!Array.isArray(chapters)) return [];

    return chapters
      .map((chapter, index) => {
        const startMillis =
          parseMarkerTime(chapter.startMillis) ??
          parseMarkerTime(chapter.start) ??
          parseMarkerTime(chapter.time);
        const endMillis =
          parseMarkerTime(chapter.endMillis) ?? parseMarkerTime(chapter.end);

        return typeof startMillis === "number"
          ? {
              endMillis,
              startMillis,
              title: String(chapter.title ?? chapter.name ?? `Chapter ${index + 1}`),
            }
          : undefined;
      })
      .filter(Boolean) as Partial<BookAudioChapterMarker>[];
  } catch {
    return [];
  }
}

function parseFfmetadataMarkers(text: string) {
  const markers: Partial<BookAudioChapterMarker>[] = [];
  const sections = text.split(/\r?\n(?=\[CHAPTER\])/i);

  for (const section of sections) {
    if (!section.trim().startsWith("[CHAPTER]")) continue;

    const values = new Map<string, string>();
    for (const line of section.split(/\r?\n/)) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) values.set(match[1].trim().toLowerCase(), match[2].trim());
    }

    const timeBase = values.get("timebase") ?? "1/1000";
    const startMillis = parseFfmetadataTime(values.get("start"), timeBase);
    const endMillis = parseFfmetadataTime(values.get("end"), timeBase);

    if (typeof startMillis === "number") {
      markers.push({
        endMillis,
        startMillis,
        title: values.get("title") ?? "",
      });
    }
  }

  return markers;
}

function parsePlainTextMarkers(text: string) {
  const markers: Partial<BookAudioChapterMarker>[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line
      .trim()
      .match(/^(\d{1,2}(?::\d{2}){1,2}(?:[.,]\d{1,3})?)\s*(?:[-–—.)]\s*)?(.+)$/);
    if (!match) continue;

    const startMillis = parseTimecode(match[1]);
    if (typeof startMillis !== "number") continue;

    markers.push({
      startMillis,
      title: match[2].trim(),
    });
  }

  return markers;
}

function parseId3ChapterMarkers(bytes: Uint8Array) {
  if (bytes.length < 10 || bytesToAscii(bytes, 0, 3) !== "ID3") return [];

  const version = bytes[3];
  const tagSize = readSynchsafeInteger(bytes, 6);
  const endOffset = Math.min(bytes.length, 10 + tagSize);
  const markers: Partial<BookAudioChapterMarker>[] = [];
  let offset = 10;

  while (offset + 10 <= endOffset) {
    const frameId = bytesToAscii(bytes, offset, 4);
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

    const frameSize =
      version === 4
        ? readSynchsafeInteger(bytes, offset + 4)
        : readUInt32(bytes, offset + 4);
    const frameStart = offset + 10;
    const frameEnd = frameStart + frameSize;
    if (frameSize <= 0 || frameEnd > endOffset) break;

    if (frameId === "CHAP") {
      const marker = parseId3ChapFrame(
        bytes.slice(frameStart, frameEnd),
        markers.length,
        version,
      );
      if (marker) markers.push(marker);
    }

    offset = frameEnd;
  }

  return normalizeMarkers(markers);
}

function parseId3ChapFrame(data: Uint8Array, index: number, version: number) {
  const idEnd = data.indexOf(0);
  if (idEnd < 0 || idEnd + 17 > data.length) return undefined;

  const timingOffset = idEnd + 1;
  const startMillis = readUInt32(data, timingOffset);
  const endMillis = readUInt32(data, timingOffset + 4);
  let title = "";
  let offset = timingOffset + 16;

  while (offset + 10 <= data.length) {
    const frameId = bytesToAscii(data, offset, 4);
    const frameSize =
      version === 4
        ? readSynchsafeInteger(data, offset + 4)
        : readUInt32(data, offset + 4);
    const frameStart = offset + 10;
    const frameEnd = frameStart + frameSize;
    if (frameSize <= 0 || frameEnd > data.length) break;

    if (frameId === "TIT2") {
      title = decodeId3TextFrame(data.slice(frameStart, frameEnd));
      break;
    }

    offset = frameEnd;
  }

  return {
    endMillis: endMillis > startMillis ? endMillis : undefined,
    startMillis,
    title: title || `Chapter ${index + 1}`,
  };
}

function parseMp4ChapterMarkers(bytes: Uint8Array) {
  let bestMarkers: BookAudioChapterMarker[] = [];

  for (let offset = 4; offset + 4 < bytes.length; offset += 1) {
    if (bytesToAscii(bytes, offset, 4) !== "chpl") continue;

    const atomStart = offset - 4;
    const atomSize = readUInt32(bytes, atomStart);
    const payloadStart = offset + 4;
    const payloadEnd = atomSize > 8 ? Math.min(bytes.length, atomStart + atomSize) : bytes.length;
    if (payloadStart >= payloadEnd) continue;

    const markers = parseMp4ChplPayload(bytes.slice(payloadStart, payloadEnd));
    if (markers.length > bestMarkers.length) bestMarkers = markers;
  }

  return bestMarkers;
}

function parseMp4ChplPayload(payload: Uint8Array) {
  const countOffsets = [4, 5, 8, 9];

  for (const countOffset of countOffsets) {
    const count = payload[countOffset];
    if (!count || count > 200) continue;

    const markers: Partial<BookAudioChapterMarker>[] = [];
    let offset = countOffset + 1;

    for (let index = 0; index < count; index += 1) {
      if (offset + 9 > payload.length) break;

      const startUnits = readUInt64AsNumber(payload, offset);
      offset += 8;
      const titleLength = payload[offset];
      offset += 1;
      if (offset + titleLength > payload.length) break;

      const title = decodeUtf8Bytes(payload.slice(offset, offset + titleLength));
      offset += titleLength;

      markers.push({
        startMillis: Math.round(startUnits / 10000),
        title,
      });
    }

    const normalizedMarkers = normalizeMarkers(markers);
    if (normalizedMarkers.length === count) return normalizedMarkers;
  }

  return [];
}

function normalizeMarkers(markers: Partial<BookAudioChapterMarker>[]) {
  const sortedMarkers = markers
    .filter(
      (marker): marker is Partial<BookAudioChapterMarker> & { startMillis: number } =>
        typeof marker.startMillis === "number" &&
        Number.isFinite(marker.startMillis) &&
        marker.startMillis >= 0,
    )
    .sort((a, b) => a.startMillis - b.startMillis);

  return sortedMarkers.map((marker, index) => {
    const nextMarker = sortedMarkers[index + 1];

    return {
      chapterIndex: index,
      endMillis:
        typeof marker.endMillis === "number" && marker.endMillis > marker.startMillis
          ? marker.endMillis
          : nextMarker?.startMillis,
      id: `audio-marker-${index}`,
      startMillis: marker.startMillis,
      title: marker.title?.trim() || `Chapter ${index + 1}`,
    };
  });
}

function parseCueTime(minutes: string, seconds: string, frames: string) {
  return (
    (Number(minutes) * 60 + Number(seconds)) * 1000 +
    Math.round((Number(frames) * 1000) / 75)
  );
}

function parseFfmetadataTime(value: string | undefined, timeBase: string) {
  if (!value) return undefined;

  const rawValue = Number(value);
  if (!Number.isFinite(rawValue)) return undefined;

  const [numeratorRaw, denominatorRaw] = timeBase.split("/");
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  const seconds =
    Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? rawValue * (numerator / denominator)
      : rawValue / 1000;

  return Math.round(seconds * 1000);
}

function parseMarkerTime(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 100000 ? Math.round(value) : Math.round(value * 1000);
  }

  if (typeof value !== "string") return undefined;
  return parseTimecode(value);
}

function parseTimecode(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return undefined;

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts.pop()) : 0;

  if (![hours, minutes, seconds].every(Number.isFinite)) return undefined;

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

function decodeId3TextFrame(data: Uint8Array) {
  if (data.length === 0) return "";

  const encoding = data[0];
  const textBytes = data.slice(1);

  if (encoding === 1 || encoding === 2) return decodeUtf16Bytes(textBytes);
  return decodeUtf8Bytes(textBytes).replace(/\0/g, "").trim();
}

function decodeUtf16Bytes(bytes: Uint8Array) {
  let littleEndian = true;
  let offset = 0;

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    littleEndian = false;
    offset = 2;
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    offset = 2;
  }

  let text = "";
  for (let index = offset; index + 1 < bytes.length; index += 2) {
    const code = littleEndian
      ? bytes[index] | (bytes[index + 1] << 8)
      : (bytes[index] << 8) | bytes[index + 1];
    if (code === 0) continue;
    text += String.fromCharCode(code);
  }

  return text.trim();
}

function decodeUtf8Bytes(bytes: Uint8Array) {
  let encoded = "";

  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }

  try {
    return decodeURIComponent(encoded).replace(/\0/g, "").trim();
  } catch {
    return bytesToLatin1(bytes).replace(/\0/g, "").trim();
  }
}

function bytesToLatin1(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

function bytesToAscii(bytes: Uint8Array, offset: number, length: number) {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(bytes[offset + index] ?? 0);
  }
  return text;
}

function readUInt32(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] ?? 0) * 0x1000000) +
    (((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0))
  );
}

function readUInt64AsNumber(bytes: Uint8Array, offset: number) {
  let value = 0;
  for (let index = 0; index < 8; index += 1) {
    value = value * 256 + (bytes[offset + index] ?? 0);
  }
  return value;
}

function readSynchsafeInteger(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] ?? 0) << 21) |
    ((bytes[offset + 1] ?? 0) << 14) |
    ((bytes[offset + 2] ?? 0) << 7) |
    (bytes[offset + 3] ?? 0)
  );
}

function readFileHeaderBytes(file: File, length: number) {
  return readFileRangeBytes(file, 0, length);
}

function readMp3Id3TagBytes(file: File) {
  const header = readFileHeaderBytes(file, 10);
  if (header.length < 10 || bytesToAscii(header, 0, 3) !== "ID3") return null;

  const tagSize = readSynchsafeInteger(header, 6);
  const totalTagSize = 10 + tagSize;
  const maxTagSize = 4 * 1024 * 1024;

  if (totalTagSize <= 10 || totalTagSize > maxTagSize) return null;

  return readFileRangeBytes(file, 0, totalTagSize);
}

function readFileRangeBytes(file: File, offset: number, length: number) {
  const handle = file.open();

  try {
    const targetLength = Math.max(0, Math.floor(length));
    const bytes = new Uint8Array(targetLength);
    let readBytes = 0;

    handle.offset = Math.max(0, Math.floor(offset));

    while (readBytes < targetLength) {
      const chunk = handle.readBytes(targetLength - readBytes);
      if (chunk.length === 0) break;

      bytes.set(chunk, readBytes);
      readBytes += chunk.length;
    }

    return readBytes === targetLength ? bytes : bytes.slice(0, readBytes);
  } finally {
    handle.close();
  }
}

function compareArchivePaths(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeArchivePathForMatch(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

function isHiddenArchivePath(path: string) {
  const normalizedPath = normalizeArchivePathForMatch(path);
  const fileName = getArchiveFileName(normalizedPath);

  return normalizedPath.includes("__macosx/") || fileName.startsWith(".");
}

function getArchiveFileName(path: string) {
  return path.replace(/\\/g, "/").split("/").pop() || path;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "audio";
}

function getExtension(path: string) {
  return path.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase();
}

function isZipMimeType(mimeType: string | undefined) {
  const normalizedMimeType = mimeType?.toLowerCase();

  return (
    normalizedMimeType === "application/zip" ||
    normalizedMimeType === "application/x-zip-compressed" ||
    normalizedMimeType === "application/octet-stream+zip"
  );
}

function isZipBytes(bytes: Uint8Array) {
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

function isMp3FrameHeader(bytes: Uint8Array) {
  return bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
}

function getTitleFromFileName(fileName: string) {
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();

  return title || "Новая книга";
}
