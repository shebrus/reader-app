// Временные общие данные библиотеки: полки, книги и функции выборки книг по полке.
import type { Book, Shelf } from "./types";

export const initialShelves: Shelf[] = [
  { id: "recent", title: "Последние", locked: true },
  { id: "all", title: "Все", locked: true },
  { id: "fantasy", title: "Фантастика", locked: false },
  { id: "science", title: "Научные", locked: false },
  { id: "recommended", title: "Посоветовали", locked: false },
];

export const libraryBooks: Book[] = [
  {
    id: "1",
    coverImage: require("../assets/covers/cover1.png"),
    shelfId: "fantasy",
    title: "Аркейн демо версия походу",
    author: "Неизвестный автор",
    pagesRead: 73,
    totalPages: 100,
  },
  {
    id: "2",
    coverImage: require("../assets/covers/cover2.png"),
    shelfId: "science",
    shelfIds: ["fantasy"],
    title: "Иди туда, где страшно. Именно",
    author: "Джим Лоулесс",
    pagesRead: 50,
    totalPages: 300,
  },
  {
    id: "3",
    coverImage: require("../assets/covers/cover3.png"),
    shelfId: "fantasy",
    title: "Наследница черного дракона",
    author: "Анна Джейн",
    pagesRead: 75,
    totalPages: 317,
  },
  {
    id: "4",
    coverImage: require("../assets/covers/cover4.png"),
    shelfId: "recommended",
    shelfIds: ["fantasy"],
    title: "Игры 1980 изменившие мир",
    author: "Неизвестный автор",
    pagesRead: 0,
    totalPages: 126,
  },
  {
    id: "5",
    coverImage: require("../assets/covers/cover5.jpg"),
    shelfId: "science",
    title: "Книга научных заметок",
    author: "Неизвестный автор",
    pagesRead: 24,
    totalPages: 180,
  },
  {
    id: "6",
    coverImage: require("../assets/covers/cover6.jpg"),
    shelfId: "recommended",
    title: "История, которую советовали",
    author: "Неизвестный автор",
    pagesRead: 12,
    totalPages: 220,
  },
];

export function getBooksForShelf(shelfId: string) {
  if (shelfId === "all") return libraryBooks;
  if (shelfId === "recent") return libraryBooks.slice(0, 4);

  return libraryBooks.filter(
    (book) => book.shelfId === shelfId || book.shelfIds?.includes(shelfId),
  );
}

export function getCountForShelf(shelfId: string) {
  return getBooksForShelf(shelfId).length;
}
