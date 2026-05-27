import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import JSZip from "jszip";

import { readBookMetadata } from "./bookMetadata";
import type { Book } from "./types";

const supportedBookFormats = ["epub", "fb2", "txt", "pdf"] as const;
type SupportedBookFormat = (typeof supportedBookFormats)[number];
const supportedPickerFormats = [...supportedBookFormats, "zip"] as const;
type SupportedPickerFormat = (typeof supportedPickerFormats)[number];

const unknownAuthor = "Неизвестный автор";
const importedCoverColor = "#DFF1FF";

type PreparedBook = {
  destinationFile: File;
  fileFormat: SupportedBookFormat;
  originalFileName: string;
  storedFileSize?: number;
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

  const pickedFormat = getSupportedPickerFormat(asset.name);
  if (!pickedFormat) {
    throw new Error("Выберите книгу в формате EPUB, FB2, TXT, PDF или FB2.ZIP.");
  }

  const importedAt = Date.now();
  const id = `book-${importedAt}`;
  const booksDirectory = new Directory(Paths.document, "books");
  booksDirectory.create({ idempotent: true, intermediates: true });

  const sourceFile = new File(asset.uri);
  const {
    destinationFile,
    fileFormat,
    originalFileName,
    storedFileSize,
  } = await preparePickedBook(sourceFile, booksDirectory, id, pickedFormat);
  const metadata = await readBookMetadata(destinationFile, fileFormat, id);

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

async function preparePickedBook(
  sourceFile: File,
  booksDirectory: Directory,
  bookId: string,
  pickedFormat: SupportedPickerFormat,
): Promise<PreparedBook> {
  if (pickedFormat === "zip") {
    return extractFb2FromZip(sourceFile, booksDirectory, bookId);
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

async function extractFb2FromZip(
  sourceFile: File,
  booksDirectory: Directory,
  bookId: string,
): Promise<PreparedBook> {
  const zip = await JSZip.loadAsync(await sourceFile.bytes());
  const fb2File = Object.values(zip.files)
    .filter((file) => !file.dir)
    .find((file) => file.name.toLowerCase().endsWith(".fb2"));

  if (!fb2File) {
    throw new Error("В ZIP-архиве не найден файл FB2.");
  }

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

function getSupportedPickerFormat(fileName: string): SupportedPickerFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (
    extension &&
    supportedPickerFormats.includes(extension as SupportedPickerFormat)
  ) {
    return extension as SupportedPickerFormat;
  }

  return null;
}

function getArchiveFileName(path: string) {
  return path.split("/").pop() || path;
}

function getTitleFromFileName(fileName: string) {
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();

  return title || "Новая книга";
}
