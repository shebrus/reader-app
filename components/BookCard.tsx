// components/BookCard.tsx
import { View, Image, StyleSheet, Platform, ImageSourcePropType } from "react-native";

type BookCardProps = {
  image: ImageSourcePropType;
};

export const BookCard = ({ image }: BookCardProps) => {
  return (
    <View style={styles.cardWrap}>
      <View style={styles.shadowBox}>
        <Image source={image} style={styles.image} resizeMode="cover" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /**
   * ВНЕШНИЙ контейнер:
   * - даём сверху место под тень
   * - справа место под тень
   * - overflow ОБЯЗАТЕЛЬНО visible
   */
  cardWrap: {
    width: 99, // 96 + запас справа
    height: 143, // 140 + запас сверху
    marginRight: 7,
    paddingTop: 3,   // место под верхнюю тень
    paddingRight: 3, // место под правую тень
    overflow: "visible",
  },

  /**
   * САМА КНИГА
   */
  shadowBox: {
    width: 96,
    height: 140,
    borderRadius: 0, 
    overflow: "visible",
    backgroundColor: "#D9D9D9",

    shadowColor: "#000",
    shadowOffset: {
      width: 3,
      height: -3, 
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.6,

    // Android
    ...(Platform.OS === "android" && {
      elevation: 6,
    }),
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 0, 
  },
});