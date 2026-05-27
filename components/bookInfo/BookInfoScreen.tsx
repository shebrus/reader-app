import { Image as ExpoImage } from "expo-image";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCardNew } from "../BookCardNew";
import type { Book } from "../../shared/types";

type BookInfoScreenProps = {
  book: Book;
  onBackPress: () => void;
  onReadPress: () => void;
};

const DESIGN_WIDTH = 375;
const BOOK_WIDTH = 243;
const BOOK_HEIGHT = 369;
const BLUE = "#7BBDFA";

export function BookInfoScreen({
  book,
  onBackPress,
  onReadPress,
}: BookInfoScreenProps) {
  const { width } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  const progress = getBookProgress(book);

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.header,
            {
              height: 24 * scale,
              left: 10 * scale,
              top: 80 * scale,
              width: 355 * scale,
            },
          ]}
        >
          <Pressable
            hitSlop={12}
            onPress={onBackPress}
            style={[
              styles.backButton,
              { height: 24 * scale, width: 24 * scale },
            ]}
          >
            <ExpoImage
              source={require("../../assets/icons/arrow_back.svg")}
              style={[
                styles.backIcon,
                { height: 22 * scale, width: 22 * scale },
              ]}
            />
          </Pressable>

          <ExpoImage
            source={require("../../assets/icons/menu.svg")}
            style={[
              styles.menuIcon,
              { height: 24 * scale, width: 24 * scale },
            ]}
          />
        </View>

        <Pressable
          onPress={onReadPress}
          style={[
            styles.bookWrapper,
            {
              height: BOOK_HEIGHT * scale,
              left: 66 * scale,
              top: 136 * scale,
              width: BOOK_WIDTH * scale,
            },
          ]}
        >
          <BookCardNew
            coverColor={book.coverColor}
            coverImage={book.coverImage}
            width={BOOK_WIDTH * scale}
          />
        </Pressable>

        <View
          style={[
            styles.infoPanel,
            {
              height: 194 * scale,
              left: 0,
              gap: 20 * scale,
              paddingHorizontal: 12 * scale,
              top: 545 * scale,
              width,
            },
          ]}
        >
          <View
            style={[
              styles.mainInfo,
              { gap: 12 * scale, height: 91 * scale, width: 351 * scale },
            ]}
          >
            <View
              style={[
                styles.titleBlock,
                { gap: 4 * scale, height: 52 * scale, width: 325 * scale },
              ]}
            >
              <Text numberOfLines={1} style={styles.title}>
                {book.title}
              </Text>
              <Text numberOfLines={1} style={styles.author}>
                {book.author}
              </Text>
            </View>

            <View
              style={[
                styles.progressBlock,
                { gap: 4 * scale, height: 27 * scale, width: 351 * scale },
              ]}
            >
              <View
                style={[
                  styles.progressTopRow,
                  {
                    height: 17 * scale,
                    paddingHorizontal: 2 * scale,
                    width: 351 * scale,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pagesRow,
                    { gap: 4 * scale, height: 17 * scale },
                  ]}
                >
                  <Text style={styles.pagesText}>
                    {book.pagesRead} из {book.totalPages}
                  </Text>
                  <ExpoImage
                    source={require("../../assets/icons/str.svg")}
                    style={[
                      styles.pagesIcon,
                      { height: 16 * scale, width: 16 * scale },
                    ]}
                  />
                </View>

                <Text style={styles.percentText}>{progress}%</Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { height: 6 * scale, width: 351 * scale },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { height: 6 * scale, width: `${progress}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statsBlock,
              {
                gap: 12 * scale,
                height: 83 * scale,
                paddingBottom: 8 * scale,
                width: 351 * scale,
              },
            ]}
          >
            <InfoRow label="Дата добавления" value={formatDate(book.importedAt)} />
            <InfoRow label="Объём" value={formatFileSize(book.fileSize)} />
            <InfoRow
              label="Формат"
              value={(book.fileFormat ?? "").toUpperCase() || "--"}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getBookProgress(book: Book) {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100));
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "--.--.----";

  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 Мб";

  const megabytes = bytes / (1024 * 1024);
  const rounded =
    megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10;

  return `${String(rounded).replace(".", ",")} Мб`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
  },

  backButton: {
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    tintColor: BLUE,
  },

  menuIcon: {
    tintColor: BLUE,
  },

  bookWrapper: {
    position: "absolute",
  },

  infoPanel: {
    gap: 20,
    position: "absolute",
  },

  mainInfo: {
    gap: 12,
    height: 91,
  },

  titleBlock: {
    gap: 4,
    height: 52,
    justifyContent: "center",
  },

  title: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 29,
  },

  author: {
    color: "#4D4D4D",
    fontFamily: "SFProDisplay-Light",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 19,
  },

  progressBlock: {
    gap: 4,
    height: 27,
  },

  progressTopRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 17,
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },

  pagesRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 17,
  },

  pagesText: {
    color: "#000000",
    fontFamily: "SFProText-Light",
    fontSize: 14,
    fontWeight: "300",
    lineHeight: 17,
  },

  pagesIcon: {
    height: 16,
    width: 16,
  },

  percentText: {
    color: "#192024",
    fontFamily: "SFProText-Light",
    fontSize: 14,
    fontWeight: "300",
    lineHeight: 17,
  },

  progressTrack: {
    backgroundColor: "#E2E2E2",
    borderRadius: 15,
    height: 6,
    overflow: "hidden",
  },

  progressFill: {
    backgroundColor: "#80C2FF",
    borderRadius: 16,
    height: 6,
  },

  statsBlock: {
    alignItems: "flex-end",
    gap: 12,
    height: 83,
    paddingBottom: 8,
  },

  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 17,
    justifyContent: "space-between",
    width: "100%",
  },

  infoLabel: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 17,
  },

  infoValue: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 17,
  },
});
