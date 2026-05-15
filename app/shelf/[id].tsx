// Маршрут отдельной полки: получает id/название из навигации и показывает книги этой категории.
import { useLocalSearchParams, useRouter } from "expo-router";

import { ShelfBooksScreen } from "../../components/shelfDetail/ShelfBooksScreen";
import { getBooksForShelf } from "../../shared/libraryData";

export default function ShelfRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const shelfId = params.id ?? "all";
  const title = params.title ?? "Все";
  const books = getBooksForShelf(shelfId);

  return (
    <ShelfBooksScreen
      title={title}
      books={books}
      onBackPress={() => router.back()}
    />
  );
}
