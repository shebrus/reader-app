import { View, Text, StyleSheet, ScrollView, ImageSourcePropType } from "react-native";
import { BookCard } from "./BookCard";
import { BlurOverlay } from "./BlurOverlay";

type BookRowProps = {
  title: string;
  count: number;
  data: ImageSourcePropType[];
  isEven: boolean;
};

const H_PADDING = 18;

export const BookRow = ({ title, count, data, isEven }: BookRowProps) => {
  return (
    <View style={styles.wrapper}>
      {/* HEADER */}
      <View style={styles.rowHeader}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.right}>
          <Text style={styles.count}>{count} книг</Text>
        </View>
      </View>

      {/* BOOKS */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.booksScroll}
      >
        {data.map((img, i) => (
          <BookCard key={i} image={img} />
        ))}
      </ScrollView>

      {/* GLASS OVERLAY */}
      <BlurOverlay isEven={isEven} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 64,
    paddingLeft: H_PADDING,
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingRight: 21,
    paddingLeft: 21,
  },

  title: {
    fontFamily: "Poppins-Light",
    fontSize: 16,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  count: {
    fontFamily: "SFPro",
    fontSize: 12,
    color: "#ADADAD",
  },
  
  booksScroll: {
    paddingLeft: H_PADDING,
    paddingRight: H_PADDING,
  },
});