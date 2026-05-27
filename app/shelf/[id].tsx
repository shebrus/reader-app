// Маршрут отдельной полки: получает id/название из навигации и показывает книги этой категории.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { ShelfBooksScreen } from "../../components/shelfDetail/ShelfBooksScreen";
import { loadImportedBooks } from "../../shared/importedBooksStore";
import type { Book } from "../../shared/types";

export default function ShelfRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const shelfId = params.id ?? "all";
  const title = params.title ?? "Все";
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    let cancelled = false;

    loadImportedBooks().then((importedBooks) => {
      if (cancelled) return;
      setBooks(getBooksForShelf(importedBooks, shelfId));
    });

    return () => {
      cancelled = true;
    };
  }, [shelfId]);

  return (
    <ShelfBooksScreen
      title={title}
      books={books}
      onBackPress={() => router.back()}
    />
  );
}

function getBooksForShelf(books: Book[], shelfId: string) {
  if (shelfId === "all") return books;
  if (shelfId === "recent") return books.slice(0, 4);

  return books.filter(
    (book) => book.shelfId === shelfId || book.shelfIds?.includes(shelfId),
  );
}

