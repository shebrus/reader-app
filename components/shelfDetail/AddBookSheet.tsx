import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const arrowLeftIcon = require("../../assets/icons/arrow_left.svg");
const arrowRightIcon = require("../../assets/icons/arrow_right.svg");
const downloadBookIcon = require("../../assets/icons/download_book.svg");

const DESIGN_WIDTH = 375;
const SHEET_HEIGHT = 363;
const SIDE_PADDING = 20;

type AddBookSheetProps = {
  visible: boolean;
  onClose: () => void;
  onImportBook?: () => Promise<void>;
};

export function AddBookSheet({
  visible,
  onClose,
  onImportBook,
}: AddBookSheetProps) {
  const { width } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  const contentWidth = Math.max(width - SIDE_PADDING * 2, 0);

  const handleImportPress = async () => {
    await onImportBook?.();
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.backdrop} />
        </Pressable>

        <View
          style={[
            styles.sheet,
            {
              borderRadius: 24 * scale,
              gap: 34 * scale,
              height: SHEET_HEIGHT * scale,
              paddingBottom: 34 * scale,
              paddingHorizontal: SIDE_PADDING,
              paddingTop: 20 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.headerRow,
              {
                height: 33 * scale,
                width: contentWidth,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                {
                  fontSize: 24 * scale,
                  lineHeight: 33 * scale,
                  width: contentWidth,
                },
              ]}
            >
              Загрузить или добавить
            </Text>
          </View>

          <View
            style={[
              styles.content,
              {
                gap: 41 * scale,
                height: 242 * scale,
                width: contentWidth,
              },
            ]}
          >
            <View
              style={[
                styles.actionsRow,
                {
                  height: 178 * scale,
                  width: contentWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.arrowButton,
                  {
                    borderRadius: 10 * scale,
                    height: 36 * scale,
                    padding: 6 * scale,
                    width: 36 * scale,
                  },
                ]}
              >
                <ExpoImage
                  source={arrowLeftIcon}
                  contentFit="contain"
                  style={{ height: 24 * scale, width: 24 * scale }}
                />
              </View>

              <View
                style={[
                  styles.actionCard,
                  {
                    borderRadius: 10 * scale,
                    height: 178 * scale,
                    paddingHorizontal: 22 * scale,
                    width: 116 * scale,
                  },
                ]}
              >
                <ExpoImage
                  source={downloadBookIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  style={{
                    height: 92 * scale,
                    width: 72 * scale,
                  }}
                />
              </View>

              <View
                style={[
                  styles.arrowButton,
                  {
                    borderRadius: 10 * scale,
                    height: 36 * scale,
                    padding: 6 * scale,
                    width: 36 * scale,
                  },
                ]}
              >
                <ExpoImage
                  source={arrowRightIcon}
                  contentFit="contain"
                  style={{ height: 24 * scale, width: 24 * scale }}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleImportPress}
              style={[
                styles.submitButton,
                {
                  borderRadius: 10 * scale,
                  height: 39 * scale,
                  padding: 10 * scale,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.submitText,
                  {
                    fontSize: 16 * scale,
                    lineHeight: 19 * scale,
                  },
                ]}
              >
                Загрузить книгу
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 32, 36, 0.28)",
  },

  sheet: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    width: "100%",
  },

  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexGrow: 0,
  },

  title: {
    color: "#192024",
    fontFamily: "SourceSerif4-Light",
    fontWeight: "300",
    textAlign: "left",
  },

  content: {
    alignItems: "center",
    alignSelf: "stretch",
    flexGrow: 1,
    justifyContent: "space-between",
  },

  actionsRow: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  arrowButton: {
    alignItems: "center",
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    justifyContent: "center",
  },

  actionCard: {
    alignItems: "center",
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    justifyContent: "center",
  },

  submitButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    justifyContent: "center",
  },

  submitText: {
    color: "#2F2F2F",
    fontFamily: "SFProText-Light",
    fontWeight: "300",
    textAlign: "center",
  },
});
