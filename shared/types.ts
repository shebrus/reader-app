// Общие типы приложения: книги и полки.
import type { ImageSourcePropType } from "react-native";

export type Book = {
  id: string;
  coverImage?: ImageSourcePropType;
  coverColor?: string;
  shelfId: string;
  shelfIds?: string[];
  title: string;
  author: string;
  pagesRead: number;
  totalPages: number;
  fileUri?: string;
  fileName?: string;
  fileFormat?: "epub" | "fb2" | "txt" | "pdf";
  fileSize?: number;
  importedAt?: number;
  notesCount?: number;
};

export type Shelf = {
  id: string;
  title: string;
  locked: boolean;
};
