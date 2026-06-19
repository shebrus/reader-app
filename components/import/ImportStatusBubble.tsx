import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ImportStatusTask = {
  fileName?: string;
  id: string;
  message: string;
  progress?: number;
  status: "done" | "error" | "running";
  title: string;
};

type ImportStatusBubbleProps = {
  expanded: boolean;
  task: ImportStatusTask | null;
  onDismiss?: () => void;
  onToggle: () => void;
};

export function ImportStatusBubble({
  expanded,
  task,
  onDismiss,
  onToggle,
}: ImportStatusBubbleProps) {
  const insets = useSafeAreaInsets();

  if (!task) return null;

  const progress = clamp(task.progress ?? 0, 0, 1);
  const progressLabel =
    task.status === "running"
      ? `${Math.round(progress * 100)}%`
      : task.status === "done"
        ? "100%"
        : "";
  const iconName =
    task.status === "done"
      ? "checkmark"
      : task.status === "error"
        ? "alert"
        : "cloud-download-outline";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(18, insets.bottom + 16) }]}
    >
      {expanded ? (
        <View style={styles.panel}>
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            style={[
              styles.iconButton,
              task.status === "error" && styles.iconButtonError,
              task.status === "done" && styles.iconButtonDone,
            ]}
          >
            {task.status === "running" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name={iconName} size={22} color="#FFFFFF" />
            )}
          </Pressable>

          <View style={styles.textBlock}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.title}>
                {task.title}
              </Text>
              {progressLabel ? (
                <Text style={styles.progressText}>{progressLabel}</Text>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.message}>
              {task.message}
            </Text>
            {task.fileName ? (
              <Text numberOfLines={1} style={styles.fileName}>
                {task.fileName}
              </Text>
            ) : null}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          {task.status !== "running" ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onDismiss}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={18} color="#7A7F85" />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onToggle}
          style={[
            styles.collapsed,
            task.status === "error" && styles.iconButtonError,
            task.status === "done" && styles.iconButtonDone,
          ]}
        >
          {task.status === "running" ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name={iconName} size={23} color="#FFFFFF" />
          )}
        </Pressable>
      )}
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    position: "absolute",
    right: 16,
    zIndex: 120,
  },

  collapsed: {
    alignItems: "center",
    backgroundColor: "#56B0FE",
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 54,
  },

  panel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(86, 176, 254, 0.2)",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    width: 304,
  },

  iconButton: {
    alignItems: "center",
    backgroundColor: "#56B0FE",
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    width: 50,
  },

  iconButtonDone: {
    backgroundColor: "#3CBF74",
  },

  iconButtonError: {
    backgroundColor: "#EF6A62",
  },

  textBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },

  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  title: {
    color: "#192024",
    flex: 1,
    fontFamily: "SFProText-Regular",
    fontSize: 14,
    lineHeight: 18,
  },

  progressText: {
    color: "#56B0FE",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    lineHeight: 15,
  },

  message: {
    color: "#4D4D4D",
    fontFamily: "SFProText-Regular",
    fontSize: 12,
    lineHeight: 15,
  },

  fileName: {
    color: "#7A7F85",
    fontFamily: "SFProText-Light",
    fontSize: 11,
    lineHeight: 14,
  },

  progressTrack: {
    backgroundColor: "#E7EEF5",
    borderRadius: 999,
    height: 4,
    marginTop: 3,
    overflow: "hidden",
  },

  progressFill: {
    backgroundColor: "#56B0FE",
    borderRadius: 999,
    height: 4,
  },

  closeButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
