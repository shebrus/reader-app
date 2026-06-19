import { Directory, File } from "expo-file-system";
import { Inflate } from "pako";

import {
  getAudioFileFormat,
  getTitleFromFileName as getAudioTitleFromFileName,
} from "./audioBook";
import type { AudioFileFormat, BookAudioTrack } from "./types";

export type StreamingZipEntry = {
  compressedSize: number;
  compressionMethod: number;
  flags: number;
  localHeaderOffset: number;
  name: string;
  uncompressedSize: number;
};

export type StreamingZipArchiveProfile = {
  audioEntries: StreamingZipEntry[];
  playlistEntries: StreamingZipEntry[];
  readableFiles: StreamingZipEntry[];
};

export type StreamingZipImportProgress = {
  completedTracks?: number;
  currentTrackName?: string;
  message: string;
  phase: "scanning" | "ordering" | "extracting" | "finishing";
  progress?: number;
  totalTracks?: number;
};

type PreparedStreamingAudioZip = {
  fileName: string;
  fileSize?: number;
  fileUri: string;
  fileFormat: AudioFileFormat;
  tracks: BookAudioTrack[];
};

type FileHandle = ReturnType<File["open"]>;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP64_EOCD_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP_METHOD_STORE = 0;
const ZIP_METHOD_DEFLATE = 8;
const ZIP_EOCD_SEARCH_BYTES = 66 * 1024;
const ZIP_COPY_CHUNK_SIZE = 512 * 1024;
const ZIP_PROGRESS_INTERVAL_MS = 90;
const ZIP_UI_YIELD_INTERVAL_MS = 24;
const ZIP64_MAGIC_16 = 0xffff;
const ZIP64_MAGIC_32 = 0xffffffff;

export async function readStreamingZipArchiveProfile(
  sourceFile: File,
): Promise<StreamingZipArchiveProfile> {
  const entries = await readZipEntries(sourceFile);

  return {
    audioEntries: entries.filter((entry) => getAudioFileFormat(entry.name)),
    playlistEntries: entries.filter((entry) => /\.(m3u8?|pls)$/i.test(entry.name)),
    readableFiles: entries.filter(isReadableBookEntry),
  };
}

export async function prepareStreamingMp3AudioZip({
  assetSize,
  audioEntries,
  audioId,
  booksDirectory,
  onProgress,
  originalFileName,
  playlistEntries,
  sourceFile,
}: {
  assetSize?: number;
  audioEntries?: StreamingZipEntry[];
  audioId: string;
  booksDirectory: Directory;
  onProgress?: (progress: StreamingZipImportProgress) => void;
  originalFileName: string;
  playlistEntries?: StreamingZipEntry[];
  sourceFile: File;
}): Promise<PreparedStreamingAudioZip | null> {
  onProgress?.({
    message: "Сканируем архив",
    phase: "scanning",
    progress: 0,
  });

  const archiveProfile = audioEntries
    ? undefined
    : await readStreamingZipArchiveProfile(sourceFile);
  const entries = audioEntries ?? archiveProfile?.audioEntries ?? [];
  const mp3Entries = entries.filter(
    (entry) => getAudioFileFormat(entry.name) === "mp3",
  );

  if (mp3Entries.length === 0 || mp3Entries.length !== entries.length) {
    return null;
  }

  onProgress?.({
    message: "Определяем порядок глав",
    phase: "ordering",
    progress: 0.03,
    totalTracks: mp3Entries.length,
  });

  const sortedEntries = await sortAudioEntries(
    sourceFile,
    mp3Entries,
    playlistEntries ?? archiveProfile?.playlistEntries ?? [],
  );
  const audioDirectory = new Directory(booksDirectory, audioId);
  audioDirectory.create({ idempotent: true, intermediates: true });

  const tracks: BookAudioTrack[] = [];
  let totalSize = 0;
  let extractedCompressedBytes = 0;
  let lastProgressReportAt = 0;
  const totalCompressedBytes = sortedEntries.reduce(
    (sum, entry) => sum + Math.max(1, entry.compressedSize),
    0,
  );
  const reportExtractionProgress = (
    entry: StreamingZipEntry,
    entryIndex: number,
    compressedBytesDelta = 0,
    force = false,
  ) => {
    extractedCompressedBytes += compressedBytesDelta;

    const now = Date.now();
    if (!force && now - lastProgressReportAt < ZIP_PROGRESS_INTERVAL_MS) return;
    lastProgressReportAt = now;

    const archiveFileName = getArchiveFileName(entry.name);
    const extractRatio =
      totalCompressedBytes > 0
        ? Math.min(extractedCompressedBytes / totalCompressedBytes, 1)
        : 0;

    onProgress?.({
      completedTracks: entryIndex,
      currentTrackName: archiveFileName,
      message: `Распаковываем главу ${entryIndex + 1} из ${sortedEntries.length}`,
      phase: "extracting",
      progress: 0.05 + extractRatio * 0.93,
      totalTracks: sortedEntries.length,
    });
  };

  for (const [index, entry] of sortedEntries.entries()) {
    const archiveFileName = getArchiveFileName(entry.name);
    const storedFileName = `${String(index + 1).padStart(3, "0")}-${sanitizeFileName(archiveFileName)}`;
    const destinationFile = new File(audioDirectory, storedFileName);
    reportExtractionProgress(entry, index, 0, true);

    const fileSize = await extractZipEntryToFile(
      sourceFile,
      entry,
      destinationFile,
      (compressedBytesDelta) =>
        reportExtractionProgress(entry, index, compressedBytesDelta),
    );

    totalSize += fileSize;
    tracks.push({
      chapterIndex: index,
      fileFormat: "mp3",
      fileName: archiveFileName,
      fileSize,
      id: `${audioId}-track-${index}`,
      title: getAudioTitleFromFileName(archiveFileName) || `Track ${index + 1}`,
      uri: destinationFile.uri,
    });
  }

  const firstTrack = tracks[0];
  if (!firstTrack) return null;

  onProgress?.({
    completedTracks: tracks.length,
    message: "Аудиокнига готова",
    phase: "finishing",
    progress: 1,
    totalTracks: tracks.length,
  });

  return {
    fileFormat: firstTrack.fileFormat,
    fileName: originalFileName,
    fileSize: totalSize || sourceFile.size || assetSize,
    fileUri: firstTrack.uri,
    tracks,
  };
}

async function sortAudioEntries(
  sourceFile: File,
  audioEntries: StreamingZipEntry[],
  playlistEntries: StreamingZipEntry[],
) {
  const naturalOrder = [...audioEntries].sort((a, b) =>
    compareArchivePaths(a.name, b.name),
  );
  const playlistEntry = [...playlistEntries].sort((a, b) =>
    compareArchivePaths(a.name, b.name),
  )[0];

  if (!playlistEntry) return naturalOrder;

  const playlistText = await readZipTextEntry(sourceFile, playlistEntry, 256 * 1024);
  if (!playlistText) return naturalOrder;

  const playlistOrder = parsePlaylistOrder(playlistText);
  if (playlistOrder.length === 0) return naturalOrder;

  return naturalOrder.sort((a, b) => {
    const aIndex = getPlaylistIndex(a.name, playlistOrder);
    const bIndex = getPlaylistIndex(b.name, playlistOrder);

    if (aIndex !== bIndex) return aIndex - bIndex;
    return compareArchivePaths(a.name, b.name);
  });
}

async function readZipTextEntry(
  sourceFile: File,
  entry: StreamingZipEntry,
  maxBytes: number,
) {
  try {
    return decodeUtf8Bytes(await extractZipEntryToBytes(sourceFile, entry, maxBytes));
  } catch {
    return "";
  }
}

async function extractZipEntryToBytes(
  sourceFile: File,
  entry: StreamingZipEntry,
  maxBytes: number,
) {
  if ((entry.flags & 0x0001) !== 0) {
    throw new Error("ZIP-архив с паролем не поддерживается.");
  }

  if (entry.uncompressedSize > maxBytes) {
    throw new Error("ZIP-запись слишком большая.");
  }

  const input = sourceFile.open();

  try {
    const dataOffset = getEntryDataOffset(input, entry);

    return entry.compressionMethod === ZIP_METHOD_STORE
      ? readStoredEntryBytes(input, dataOffset, entry.compressedSize, maxBytes)
      : await inflateEntryToBytes(input, dataOffset, entry.compressedSize, maxBytes);
  } finally {
    input.close();
  }
}

function readStoredEntryBytes(
  input: FileHandle,
  dataOffset: number,
  compressedSize: number,
  maxBytes: number,
) {
  if (compressedSize > maxBytes) {
    throw new Error("ZIP-запись слишком большая.");
  }

  return readRangeFromHandle(input, dataOffset, compressedSize);
}

async function inflateEntryToBytes(
  input: FileHandle,
  dataOffset: number,
  compressedSize: number,
  maxBytes: number,
) {
  const inflator = new Inflate({ chunkSize: Math.min(ZIP_COPY_CHUNK_SIZE, maxBytes), raw: true });
  const maybeYieldToUi = createUiYielder();
  const chunks: Uint8Array[] = [];
  let remaining = compressedSize;
  let offset = dataOffset;
  let totalBytes = 0;
  let inflateError: unknown;

  inflator.onData = (rawChunk) => {
    try {
      const chunk = normalizeInflatedChunk(rawChunk);
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) throw new Error("ZIP-запись слишком большая.");
      chunks.push(chunk);
    } catch (error) {
      inflateError = error;
    }
  };

  if (remaining === 0) {
    inflator.push(new Uint8Array(), true);
  }

  while (remaining > 0) {
    const chunkLength = Math.min(remaining, ZIP_COPY_CHUNK_SIZE);
    const chunk = readRangeFromHandle(input, offset, chunkLength);

    if (chunk.length === 0) break;

    remaining -= chunk.length;
    offset += chunk.length;

    const ok = inflator.push(chunk, remaining === 0);
    if (inflateError) throw inflateError;
    if (!ok || inflator.err) {
      throw new Error(inflator.msg || "Не удалось распаковать запись ZIP.");
    }
    await maybeYieldToUi();
  }

  if (inflateError) throw inflateError;

  const bytes = new Uint8Array(totalBytes);
  let writeOffset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return bytes;
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
    (item) =>
      item === normalizedPath ||
      item.endsWith(`/${baseName}`) ||
      item === baseName,
  );

  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

async function readZipEntries(sourceFile: File): Promise<StreamingZipEntry[]> {
  const handle = sourceFile.open();

  try {
    const fileSize = handle.size ?? sourceFile.size;
    if (!fileSize || fileSize < 22) {
      throw new Error("ZIP-архив пустой или поврежден.");
    }

    const tailLength = Math.min(fileSize, ZIP_EOCD_SEARCH_BYTES);
    const tail = readRangeFromHandle(handle, fileSize - tailLength, tailLength);
    const eocdOffsetInTail = findLastSignature(tail, EOCD_SIGNATURE);

    if (eocdOffsetInTail < 0) {
      throw new Error("Не удалось прочитать структуру ZIP-архива.");
    }

    const eocdFileOffset = fileSize - tailLength + eocdOffsetInTail;
    const eocd = parseEndOfCentralDirectory(tail, eocdOffsetInTail);
    const centralDirectory = needsZip64(eocd)
      ? readZip64CentralDirectory(handle, eocdFileOffset)
      : {
          entriesCount: eocd.entriesCount,
          offset: eocd.centralDirectoryOffset,
          size: eocd.centralDirectorySize,
        };

    if (
      centralDirectory.offset < 0 ||
      centralDirectory.size < 0 ||
      centralDirectory.offset + centralDirectory.size > fileSize
    ) {
      throw new Error("Центральный каталог ZIP поврежден.");
    }

    const directoryBytes = readRangeFromHandle(
      handle,
      centralDirectory.offset,
      centralDirectory.size,
    );

    return parseCentralDirectory(directoryBytes, centralDirectory.entriesCount);
  } finally {
    handle.close();
  }
}

function parseEndOfCentralDirectory(bytes: Uint8Array, offset: number) {
  return {
    centralDirectoryOffset: readUInt32LE(bytes, offset + 16),
    centralDirectorySize: readUInt32LE(bytes, offset + 12),
    entriesCount: readUInt16LE(bytes, offset + 10),
  };
}

function needsZip64(eocd: {
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  entriesCount: number;
}) {
  return (
    eocd.centralDirectoryOffset === ZIP64_MAGIC_32 ||
    eocd.centralDirectorySize === ZIP64_MAGIC_32 ||
    eocd.entriesCount === ZIP64_MAGIC_16
  );
}

function readZip64CentralDirectory(handle: FileHandle, eocdFileOffset: number) {
  const locatorOffset = eocdFileOffset - 20;
  if (locatorOffset < 0) {
    throw new Error("ZIP64-архив поврежден.");
  }

  const locator = readRangeFromHandle(handle, locatorOffset, 20);
  if (readUInt32LE(locator, 0) !== ZIP64_EOCD_LOCATOR_SIGNATURE) {
    throw new Error("ZIP64-архив пока не поддерживается.");
  }

  const zip64EocdOffset = readUInt64LE(locator, 8);
  const zip64EocdHeader = readRangeFromHandle(handle, zip64EocdOffset, 56);

  if (readUInt32LE(zip64EocdHeader, 0) !== ZIP64_EOCD_SIGNATURE) {
    throw new Error("ZIP64-архив поврежден.");
  }

  return {
    entriesCount: readUInt64LE(zip64EocdHeader, 32),
    offset: readUInt64LE(zip64EocdHeader, 48),
    size: readUInt64LE(zip64EocdHeader, 40),
  };
}

function parseCentralDirectory(bytes: Uint8Array, entriesCount: number) {
  const entries: StreamingZipEntry[] = [];
  let offset = 0;

  while (offset + 46 <= bytes.length && entries.length < entriesCount) {
    if (readUInt32LE(bytes, offset) !== CENTRAL_FILE_HEADER_SIGNATURE) {
      throw new Error("Центральный каталог ZIP поврежден.");
    }

    const flags = readUInt16LE(bytes, offset + 8);
    const compressionMethod = readUInt16LE(bytes, offset + 10);
    const fileNameLength = readUInt16LE(bytes, offset + 28);
    const extraLength = readUInt16LE(bytes, offset + 30);
    const commentLength = readUInt16LE(bytes, offset + 32);
    const fileNameStart = offset + 46;
    const extraStart = fileNameStart + fileNameLength;
    const nextOffset = extraStart + extraLength + commentLength;

    if (nextOffset > bytes.length) {
      throw new Error("Центральный каталог ZIP поврежден.");
    }

    const rawEntry = {
      compressedSize: readUInt32LE(bytes, offset + 20),
      compressionMethod,
      flags,
      localHeaderOffset: readUInt32LE(bytes, offset + 42),
      name: decodeZipFileName(
        bytes.slice(fileNameStart, fileNameStart + fileNameLength),
        flags,
      ),
      uncompressedSize: readUInt32LE(bytes, offset + 24),
    };
    const extraBytes = bytes.slice(extraStart, extraStart + extraLength);

    entries.push(resolveZip64EntryFields(rawEntry, extraBytes));
    offset = nextOffset;
  }

  return entries.filter((entry) => !isHiddenArchivePath(entry.name));
}

function resolveZip64EntryFields(
  entry: StreamingZipEntry,
  extraBytes: Uint8Array,
): StreamingZipEntry {
  if (
    entry.compressedSize !== ZIP64_MAGIC_32 &&
    entry.uncompressedSize !== ZIP64_MAGIC_32 &&
    entry.localHeaderOffset !== ZIP64_MAGIC_32
  ) {
    return entry;
  }

  const zip64Extra = findZip64Extra(extraBytes);
  if (!zip64Extra) {
    throw new Error("ZIP64-запись повреждена.");
  }

  let offset = 0;
  const nextUInt64 = () => {
    const value = readUInt64LE(zip64Extra, offset);
    offset += 8;
    return value;
  };
  const nextEntry = { ...entry };

  if (entry.uncompressedSize === ZIP64_MAGIC_32) {
    nextEntry.uncompressedSize = nextUInt64();
  }

  if (entry.compressedSize === ZIP64_MAGIC_32) {
    nextEntry.compressedSize = nextUInt64();
  }

  if (entry.localHeaderOffset === ZIP64_MAGIC_32) {
    nextEntry.localHeaderOffset = nextUInt64();
  }

  return nextEntry;
}

function findZip64Extra(extraBytes: Uint8Array) {
  let offset = 0;

  while (offset + 4 <= extraBytes.length) {
    const headerId = readUInt16LE(extraBytes, offset);
    const dataSize = readUInt16LE(extraBytes, offset + 2);
    const dataStart = offset + 4;
    const dataEnd = dataStart + dataSize;

    if (dataEnd > extraBytes.length) break;
    if (headerId === 0x0001) return extraBytes.slice(dataStart, dataEnd);

    offset = dataEnd;
  }

  return undefined;
}

async function extractZipEntryToFile(
  sourceFile: File,
  entry: StreamingZipEntry,
  destinationFile: File,
  onCompressedBytesRead?: (bytes: number) => void,
) {
  if ((entry.flags & 0x0001) !== 0) {
    throw new Error("ZIP-архив с паролем не поддерживается.");
  }

  if (
    entry.compressionMethod !== ZIP_METHOD_STORE &&
    entry.compressionMethod !== ZIP_METHOD_DEFLATE
  ) {
    throw new Error("Этот тип сжатия ZIP пока не поддерживается.");
  }

  const input = sourceFile.open();
  destinationFile.create({ intermediates: true, overwrite: true });
  const output = destinationFile.open();

  try {
    const dataOffset = getEntryDataOffset(input, entry);

    return entry.compressionMethod === ZIP_METHOD_STORE
      ? await copyStoredEntry(
          input,
          output,
          dataOffset,
          entry.compressedSize,
          onCompressedBytesRead,
        )
      : await inflateEntry(
          input,
          output,
          dataOffset,
          entry.compressedSize,
          onCompressedBytesRead,
        );
  } finally {
    input.close();
    output.close();
  }
}

function getEntryDataOffset(handle: FileHandle, entry: StreamingZipEntry) {
  const localHeader = readRangeFromHandle(handle, entry.localHeaderOffset, 30);

  if (readUInt32LE(localHeader, 0) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("Локальный заголовок ZIP поврежден.");
  }

  const fileNameLength = readUInt16LE(localHeader, 26);
  const extraLength = readUInt16LE(localHeader, 28);

  return entry.localHeaderOffset + 30 + fileNameLength + extraLength;
}

async function copyStoredEntry(
  input: FileHandle,
  output: FileHandle,
  dataOffset: number,
  compressedSize: number,
  onCompressedBytesRead?: (bytes: number) => void,
) {
  const maybeYieldToUi = createUiYielder();
  let remaining = compressedSize;
  let offset = dataOffset;
  let writtenBytes = 0;

  while (remaining > 0) {
    const chunkLength = Math.min(remaining, ZIP_COPY_CHUNK_SIZE);
    const chunk = readRangeFromHandle(input, offset, chunkLength);

    if (chunk.length === 0) break;
    output.writeBytes(chunk);
    onCompressedBytesRead?.(chunk.length);
    writtenBytes += chunk.length;
    offset += chunk.length;
    remaining -= chunk.length;
    await maybeYieldToUi();
  }

  return writtenBytes;
}

async function inflateEntry(
  input: FileHandle,
  output: FileHandle,
  dataOffset: number,
  compressedSize: number,
  onCompressedBytesRead?: (bytes: number) => void,
) {
  const inflator = new Inflate({ chunkSize: ZIP_COPY_CHUNK_SIZE, raw: true });
  const maybeYieldToUi = createUiYielder();
  let remaining = compressedSize;
  let offset = dataOffset;
  let writtenBytes = 0;
  let writeError: unknown;

  inflator.onData = (rawChunk) => {
    try {
      const chunk = normalizeInflatedChunk(rawChunk);
      output.writeBytes(chunk);
      writtenBytes += chunk.length;
    } catch (error) {
      writeError = error;
    }
  };

  if (remaining === 0) {
    inflator.push(new Uint8Array(), true);
  }

  while (remaining > 0) {
    const chunkLength = Math.min(remaining, ZIP_COPY_CHUNK_SIZE);
    const chunk = readRangeFromHandle(input, offset, chunkLength);

    if (chunk.length === 0) break;

    remaining -= chunk.length;
    offset += chunk.length;
    onCompressedBytesRead?.(chunk.length);

    const ok = inflator.push(chunk, remaining === 0);
    if (writeError) throw writeError;
    if (!ok || inflator.err) {
      throw new Error(inflator.msg || "Не удалось распаковать MP3 из ZIP.");
    }
    await maybeYieldToUi();
  }

  if (writeError) throw writeError;

  return writtenBytes;
}

function normalizeInflatedChunk(chunk: Uint8Array | number[] | string) {
  if (chunk instanceof Uint8Array) return chunk;
  if (Array.isArray(chunk)) return Uint8Array.from(chunk);

  const bytes = new Uint8Array(chunk.length);
  for (let index = 0; index < chunk.length; index += 1) {
    bytes[index] = chunk.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function createUiYielder() {
  let lastYieldAt = Date.now();

  return async (force = false) => {
    const now = Date.now();
    if (!force && now - lastYieldAt < ZIP_UI_YIELD_INTERVAL_MS) return;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    lastYieldAt = Date.now();
  };
}

function readRangeFromHandle(handle: FileHandle, offset: number, length: number) {
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
}

function findLastSignature(bytes: Uint8Array, signature: number) {
  for (let offset = bytes.length - 4; offset >= 0; offset -= 1) {
    if (readUInt32LE(bytes, offset) === signature) return offset;
  }

  return -1;
}

function isReadableBookEntry(entry: StreamingZipEntry) {
  if (isHiddenArchivePath(entry.name)) return false;

  const extension = getExtension(entry.name);
  return (
    extension === "fb2" ||
    extension === "txt" ||
    extension === "md" ||
    extension === "html" ||
    extension === "htm" ||
    extension === "xhtml"
  );
}

function decodeZipFileName(bytes: Uint8Array, flags: number) {
  const isUtf8 = (flags & 0x0800) !== 0;
  if (isUtf8) return decodeUtf8Bytes(bytes);

  const decodedAsUtf8 = decodeUtf8Bytes(bytes);
  return decodedAsUtf8 || bytesToLatin1(bytes);
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

function compareArchivePaths(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function isHiddenArchivePath(path: string) {
  const normalizedPath = normalizeArchivePathForMatch(path);
  const fileName = getArchiveFileName(normalizedPath);

  return normalizedPath.includes("__macosx/") || fileName.startsWith(".");
}

function normalizeArchivePathForMatch(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

function getArchiveFileName(path: string) {
  return path.replace(/\\/g, "/").split("/").pop() || path;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "audio.mp3";
}

function getExtension(path: string) {
  return path.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase();
}

function readUInt16LE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readUInt32LE(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] ?? 0) +
    ((bytes[offset + 1] ?? 0) << 8) +
    ((bytes[offset + 2] ?? 0) << 16) +
    ((bytes[offset + 3] ?? 0) * 0x1000000)
  );
}

function readUInt64LE(bytes: Uint8Array, offset: number) {
  const low = readUInt32LE(bytes, offset);
  const high = readUInt32LE(bytes, offset + 4);
  const value = high * 0x100000000 + low;

  if (!Number.isSafeInteger(value)) {
    throw new Error("ZIP-архив слишком большой для обработки.");
  }

  return value;
}
