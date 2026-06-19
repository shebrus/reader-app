import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { Book } from "./types";

const WEB_STORAGE_KEY = "reader-app:imported-books";

function getImportedBooksFile() {
  const libraryDirectory = new Directory(Paths.document, "library");
  const importedBooksFile = new File(libraryDirectory, "imported-books.json");

  return { importedBooksFile, libraryDirectory };
}

function getWebStorage() {
  return (
    globalThis as {
      localStorage?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    }
  ).localStorage;
}

export async function loadImportedBooks(): Promise<Book[]> {
  try {
    if (Platform.OS === "web") {
      const rawBooks = getWebStorage()?.getItem(WEB_STORAGE_KEY);
      if (!rawBooks) return [];

      const parsedBooks = JSON.parse(rawBooks);
      if (!Array.isArray(parsedBooks)) return [];

      return parsedBooks.filter(isStoredBook);
    }

    const { importedBooksFile } = getImportedBooksFile();
    if (!importedBooksFile.exists) return [];

    const rawBooks = await importedBooksFile.text();
    const parsedBooks = JSON.parse(rawBooks);

    if (!Array.isArray(parsedBooks)) return [];

    return parsedBooks.filter(isStoredBook);
  } catch {
    return [];
  }
}

export function saveImportedBooks(books: Book[]) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(WEB_STORAGE_KEY, JSON.stringify(books, null, 2));
    return;
  }

  const { importedBooksFile, libraryDirectory } = getImportedBooksFile();
  libraryDirectory.create({ idempotent: true, intermediates: true });
  importedBooksFile.write(JSON.stringify(books, null, 2));
}

function isStoredBook(book: unknown): book is Book {
  if (!book || typeof book !== "object") return false;

  const candidate = book as Partial<Book>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.shelfId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.author === "string" &&
    typeof candidate.pagesRead === "number" &&
    typeof candidate.totalPages === "number"
  );
}
