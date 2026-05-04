// Нижнее модальное окно управления полками: высота, фон, анимация и сборка списка.
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useState } from "react";

import { ShelvesList } from "./shelves/ShelvesList";
import { ShelvesSheetHeader } from "./shelves/ShelvesSheetHeader";
import type { Shelf } from "../shared/types";
import { useKeyboardHeight } from "./shelves/useKeyboardHeight";
import { useSheetAnimation } from "./shelves/useSheetAnimation";

type Props = {
  visible: boolean;
  shelves: Shelf[];
  getCountForShelf: (shelfId: string) => number;
  onClose: () => void;
  onAddShelf: () => void;
  onDeleteShelf: (id: string) => void;
  onReorder: (shelves: Shelf[]) => void;
  onRename: (id: string, title: string) => void;
};

export default function ShelvesSheet({
  visible,
  shelves,
  getCountForShelf,
  onClose,
  onAddShelf,
  onDeleteShelf,
  onReorder,
  onRename,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const sheetHeight = Math.min(windowHeight * 0.5 + keyboardHeight, windowHeight);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const { translateY, backdropOpacity, closeWithAnimation } = useSheetAnimation({
    visible,
    sheetHeight,
    onClose,
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.wrapper}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight, transform: [{ translateY }] },
          ]}
        >
          <ShelvesSheetHeader />

          <ShelvesList
            shelves={shelves}
            keyboardHeight={keyboardHeight}
            selectedShelfId={selectedShelfId}
            setSelectedShelfId={setSelectedShelfId}
            getCountForShelf={getCountForShelf}
            onAddShelf={onAddShelf}
            onDeleteShelf={onDeleteShelf}
            onReorder={onReorder}
            onRename={onRename}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
});
