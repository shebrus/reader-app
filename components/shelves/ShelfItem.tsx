//Одна строка модального окна
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";

import type { ShelfItemProps } from "./types";

const bookIcon = require("../../assets/icons/book-icon.png");
const trashIcon = require("../../assets/icons/trash-icon.png");

const DELETE_TARGET_ACTIVE_THRESHOLD = 4;
const DELETE_SWIPE_THRESHOLD = 56;
const MAX_DELETE_SWIPE = 92;

export function ShelfItem({
  item,
  drag,
  isActive,
  getCountForShelf,
  onDeleteShelf,
  onRename,
  isSelected,
  onSelect,
}: ShelfItemProps) {
  const titleTranslateX = useRef(new Animated.Value(0)).current;
  const deleteTargetActiveRef = useRef(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [isDeleteTargetActive, setIsDeleteTargetActive] = useState(false);

  const count = getCountForShelf(item.id);
  const isLocked = item.locked;
  const isEditing = editingId === item.id;
  const isHighlighted = isSelected || isEditing;

  useEffect(() => {
    if (!isHighlighted) {
      titleTranslateX.setValue(0);
      deleteTargetActiveRef.current = false;
      setIsDeleteTargetActive(false);
    }
  }, [isHighlighted, titleTranslateX]);

  if (isLocked) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.itemRow, isActive && { opacity: 0.8 }]}
      >
        <View style={styles.leftSide}>
          <View style={styles.titleBox}>
            <Text
              style={[styles.itemText, styles.itemTextLocked]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
        </View>

        <View style={styles.rightSide}>
          <Text style={styles.countText}>{count}</Text>
          <Image source={bookIcon} style={styles.bookIcon} />
        </View>
      </TouchableOpacity>
    );
  }

  const titleTranslate = titleTranslateX.interpolate({
    inputRange: [0, MAX_DELETE_SWIPE],
    outputRange: [0, MAX_DELETE_SWIPE],
    extrapolate: "clamp",
  });

  const updateDeleteTargetState = (translationX: number) => {
    const nextIsActive = translationX >= DELETE_TARGET_ACTIVE_THRESHOLD;

    if (deleteTargetActiveRef.current !== nextIsActive) {
      deleteTargetActiveRef.current = nextIsActive;
      setIsDeleteTargetActive(nextIsActive);
    }
  };

  const titleContent = (
    <View style={[styles.titleBox, isHighlighted && styles.titleBoxEditing]}>
      {isEditing ? (
        <TextInput
          value={tempTitle}
          onChangeText={setTempTitle}
          onBlur={() => {
            onRename(item.id, tempTitle);
            setEditingId(null);
          }}
          onSubmitEditing={() => {
            onRename(item.id, tempTitle);
            setEditingId(null);
          }}
          returnKeyType="done"
          blurOnSubmit
          autoFocus
          style={[styles.itemText, styles.itemInput]}
        />
      ) : (
        <Text
          style={styles.itemText}
          numberOfLines={1}
          onPress={() => {
            if (isSelected) {
              setEditingId(item.id);
              setTempTitle(item.title);
            }
          }}
        >
          {item.title}
        </Text>
      )}
    </View>
  );

  const leftContent = (
    <Animated.View
      style={[
        styles.leftSide,
        isHighlighted && !isEditing
          ? { transform: [{ translateX: titleTranslate }] }
          : null,
      ]}
    >
      <TouchableOpacity
        style={styles.dragIconBox}
        activeOpacity={0.75}
        onLongPress={() => {
          onSelect(item.id);
          drag();
        }}
      >
        <View style={styles.dragIcon}>
          <View style={styles.dragIconLineLong} />
          <View style={styles.dragIconLineShort} />
          <View style={styles.dragIconLineLong} />
        </View>
      </TouchableOpacity>

      {titleContent}
    </Animated.View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.itemRow, isActive && { opacity: 0.8 }]}
    >
      {isHighlighted && !isEditing ? (
        <PanGestureHandler
          activeOffsetX={[-999, 12]}
          failOffsetY={[-8, 8]}
          onGestureEvent={Animated.event(
            [{ nativeEvent: { translationX: titleTranslateX } }],
            {
              listener: (e: any) =>
                updateDeleteTargetState(e.nativeEvent.translationX),
              useNativeDriver: false,
            },
          )}
          onEnded={(e: any) => {
            if (e.nativeEvent.translationX >= DELETE_SWIPE_THRESHOLD) {
              onDeleteShelf(item.id);
              return;
            }

            deleteTargetActiveRef.current = false;
            setIsDeleteTargetActive(false);

            Animated.spring(titleTranslateX, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          }}
        >
          {leftContent}
        </PanGestureHandler>
      ) : (
        leftContent
      )}

      {isHighlighted ? (
        <TouchableOpacity
          style={[
            styles.deleteIconBox,
            isDeleteTargetActive && styles.deleteIconBoxActive,
          ]}
          onPress={() => onDeleteShelf(item.id)}
          activeOpacity={0.7}
        >
          <Image source={trashIcon} style={styles.deleteIcon} />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightSide}>
          <Text style={styles.countText}>{count}</Text>
          <Image source={bookIcon} style={styles.bookIcon} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    marginBottom: 6,
  },

  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  titleBox: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  titleBoxEditing: {
    backgroundColor: "rgba(0, 132, 255, 0.1)",
  },

  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: 36,
    height: 36,
    marginLeft: 4,
    paddingVertical: 7,
  },

  dragIconBox: {
    width: 36,
    height: 36,
    borderRadius: 2,
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  dragIcon: {
    width: 22,
    height: 12,
    justifyContent: "space-between",
  },

  dragIconLineLong: {
    height: 1.36,
    width: 22,
    borderRadius: 999,
    backgroundColor: "#6DB8FF",
  },

  dragIconLineShort: {
    height: 1.36,
    width: 16,
    borderRadius: 999,
    backgroundColor: "#6DB8FF",
  },

  itemText: {
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
    flexShrink: 1,
  },

  itemInput: {
    flex: 1,
    padding: 0,
  },

  itemTextLocked: {
    marginLeft: 0,
  },

  countText: {
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
    minWidth: 9,
    textAlign: "right",
  },

  bookIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },

  deleteIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },

  deleteIconBox: {
    width: 36,
    height: 36,
    borderRadius: 2,
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    padding: 7,
  },

  deleteIconBoxActive: {
    backgroundColor: "rgba(229, 66, 66, 0.16)",
  },
});
