// Список полок внутри нижнего окна: закрепленные полки, сортируемые полки и добавление.
import { Dispatch, SetStateAction } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";

import { AddShelfRow } from "./AddShelfRow";
import { ShelfItem } from "./ShelfItem";
import type { Shelf } from "../../shared/types";

type ShelvesListProps = {
  shelves: Shelf[];
  keyboardHeight: number;
  selectedShelfId: string | null;
  setSelectedShelfId: Dispatch<SetStateAction<string | null>>;
  getCountForShelf: (shelfId: string) => number;
  onAddShelf: () => void;
  onDeleteShelf: (id: string) => void;
  onReorder: (shelves: Shelf[]) => void;
  onRename: (id: string, title: string) => void;
};

export function ShelvesList({
  shelves,
  keyboardHeight,
  selectedShelfId,
  setSelectedShelfId,
  getCountForShelf,
  onAddShelf,
  onDeleteShelf,
  onReorder,
  onRename,
}: ShelvesListProps) {
  const pinnedShelves = shelves.filter((shelf) => shelf.locked);
  const editableShelves = shelves.filter((shelf) => !shelf.locked);

  const handleDeleteShelf = (id: string) => {
    setSelectedShelfId((prev) => (prev === id ? null : prev));
    onDeleteShelf(id);
  };

  return (
    <>
      <View style={styles.pinnedList}>
        {pinnedShelves.map((item) => (
          <ShelfItem
            key={item.id}
            item={item}
            drag={() => {}}
            isActive={false}
            getCountForShelf={getCountForShelf}
            onDeleteShelf={handleDeleteShelf}
            onRename={onRename}
            isSelected={false}
            onSelect={setSelectedShelfId}
          />
        ))}
      </View>

      <DraggableFlatList
        data={editableShelves}
        keyExtractor={(item) => item.id}
        containerStyle={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: keyboardHeight + 16 },
        ]}
        scrollEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onDragEnd={({ data }) => onReorder([...pinnedShelves, ...data])}
        renderItem={({ item, drag, isActive }) => (
          <ShelfItem
            item={item}
            drag={drag}
            isActive={isActive}
            getCountForShelf={getCountForShelf}
            onDeleteShelf={handleDeleteShelf}
            onRename={onRename}
            isSelected={selectedShelfId === item.id}
            onSelect={setSelectedShelfId}
          />
        )}
        ListFooterComponent={<AddShelfRow onPress={onAddShelf} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },

  pinnedList: {
    marginBottom: 0,
  },

  listContent: {
    paddingBottom: 16,
  },
});
