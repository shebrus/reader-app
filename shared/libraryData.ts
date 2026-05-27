import type { Book, Shelf } from "./types";

export const initialShelves: Shelf[] = [
  { id: "recent", title: "Последние", locked: true },
  { id: "all", title: "Все", locked: true },
  { id: "fantasy", title: "Фантастика", locked: false },
  { id: "science", title: "Научные", locked: false },
  { id: "recommended", title: "Посоветовали", locked: false },
];

export const libraryBooks: Book[] = [];

export const libraryBookAssets: number[] = [];

const emptyBooks: Book[] = [];

export function getBooksForShelf() {
  return emptyBooks;
}

export function getCountForShelf() {
  return 0;
}
