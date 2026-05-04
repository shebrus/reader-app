// Типы для компонентов управления полками.
import type { Dispatch, SetStateAction } from "react";

import type { Shelf } from "../../shared/types";

export type { Shelf };

export type ShelfItemProps = {
  item: Shelf;
  drag: () => void;
  isActive: boolean;
  getCountForShelf: (shelfId: string) => number;
  onDeleteShelf: (id: string) => void;
  onRename: (id: string, title: string) => void;
  isSelected: boolean;
  onSelect: Dispatch<SetStateAction<string | null>>;
};
