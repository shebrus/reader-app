import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCardNew } from "../BookCardNew";
import type { Book } from "../../shared/types";

type EditBookScreenProps = {
  book: Book;
  onBackPress: () => void;
  onSave: (book: Book) => void;
};

const BLUE = "#7BBDFA";

export function EditBookScreen({
  book,
  onBackPress,
  onSave,
}: EditBookScreenProps) {
  const { width } = useWindowDimensions();
  const [author, setAuthor] = useState(book.author);
  const [coverColor, setCoverColor] = useState(book.coverColor);
  const [coverImage, setCoverImage] = useState<Book["coverImage"]>(
    book.coverImage,
  );
  const [title, setTitle] = useState(book.title);
  const bookWidth = Math.min(252, Math.max(210, width * 0.62));
  const previewTitle = title.trim() || book.title;
  const previewAuthor = author.trim() || book.author;
  const saveDisabled = !previewTitle || !previewAuthor;
  const contentBottomInset = useMemo(
    () => (Platform.OS === "ios" ? 36 : 28),
    [],
  );

  const pickCover = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "image/*",
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      const coversDirectory = new Directory(Paths.document, "covers");
      coversDirectory.create({ idempotent: true, intermediates: true });

      const extension = getFileExtension(asset.name) || "jpg";
      const sourceFile = new File(asset.uri);
      const coverFile = new File(
        coversDirectory,
        `${book.id}-${Date.now()}.${extension}`,
      );
      sourceFile.copy(coverFile);
      setCoverImage(coverFile.uri);
      setCoverColor(undefined);
    } catch {
      Alert.alert("Не удалось выбрать обложку", "Попробуйте другое изображение.");
    }
  };

  const saveBook = () => {
    if (saveDisabled) return;

    onSave({
      ...book,
      author: previewAuthor,
      coverColor,
      coverImage,
      title: previewTitle,
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBackPress}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={29} color={BLUE} />
          </Pressable>

          <Text style={styles.headerTitle}>Редактирование</Text>

          <Pressable
            accessibilityRole="button"
            disabled={saveDisabled}
            hitSlop={12}
            onPress={saveBook}
            style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
          >
            <Ionicons name="checkmark" size={25} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: contentBottomInset },
          ]}
        >
          <View style={styles.previewStage}>
            <BookCardNew
              coverColor={coverColor}
              coverImage={coverImage}
              width={bookWidth}
            />
          </View>

          <View style={styles.previewText}>
            <Text numberOfLines={2} style={styles.previewBookTitle}>
              {previewTitle}
            </Text>
            <Text numberOfLines={1} style={styles.previewBookAuthor}>
              {previewAuthor}
            </Text>
          </View>

          <View style={styles.form}>
            <Pressable
              accessibilityRole="button"
              onPress={pickCover}
              style={styles.coverButton}
            >
              <Ionicons name="image-outline" size={20} color="#FFFFFF" />
              <Text style={styles.coverButtonText}>Сменить обложку</Text>
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Название</Text>
              <TextInput
                autoCapitalize="sentences"
                onChangeText={setTitle}
                placeholder="Название книги"
                placeholderTextColor="#9AA4AD"
                returnKeyType="next"
                style={styles.input}
                value={title}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Автор</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setAuthor}
                placeholder="Автор"
                placeholderTextColor="#9AA4AD"
                returnKeyType="done"
                style={styles.input}
                value={author}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getFileExtension(fileName: string | undefined) {
  const extension = fileName?.split(".").pop()?.toLowerCase();

  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : undefined;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  keyboard: {
    flex: 1,
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  headerButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  headerTitle: {
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 17,
    lineHeight: 22,
  },

  saveButton: {
    alignItems: "center",
    backgroundColor: BLUE,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  previewStage: {
    alignItems: "center",
    minHeight: 382,
    justifyContent: "center",
    width: "100%",
  },

  previewText: {
    alignItems: "center",
    marginTop: 2,
    width: "100%",
  },

  previewBookTitle: {
    color: "#2F2F2F",
    fontFamily: "SourceSerif4-Regular",
    fontSize: 26,
    lineHeight: 31,
    textAlign: "center",
  },

  previewBookAuthor: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },

  form: {
    gap: 16,
    marginTop: 28,
    width: "100%",
  },

  coverButton: {
    alignItems: "center",
    backgroundColor: BLUE,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
  },

  coverButtonText: {
    color: "#FFFFFF",
    fontFamily: "SFProText-Regular",
    fontSize: 15,
    lineHeight: 19,
  },

  inputGroup: {
    gap: 8,
  },

  inputLabel: {
    color: "#7A7F85",
    fontFamily: "SFProText-Regular",
    fontSize: 13,
    lineHeight: 16,
    paddingHorizontal: 2,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(123, 189, 250, 0.25)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: "#192024",
    fontFamily: "SFProText-Regular",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
});
