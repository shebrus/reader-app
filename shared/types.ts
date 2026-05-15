// Общие типы приложения: книги и полки.
import type { ImageSourcePropType } from "react-native";

export type Book = {
  id: string;
  coverImage: ImageSourcePropType;
  shelfId: string;
  shelfIds?: string[];
  title: string;
  author: string;
  pagesRead: number;
  totalPages: number;
};

export type Shelf = {
  id: string;
  title: string;
  locked: boolean;
};
