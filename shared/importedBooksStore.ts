import { Directory, File, Paths } from "expo-file-system";

import type { Book } from "./types";

const libraryDirectory = new Directory(Paths.document, "library");
const importedBooksFile = new File(libraryDirectory, "imported-books.json");

export async function loadImportedBooks(): Promise<Book[]> {
  try {
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
