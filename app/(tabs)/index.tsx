//Главный экран
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BookRow } from "../../components/BookRow";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from "react-native-safe-area-context";

const books = [
  require("../../assets/images/book1.png"),
  require("../../assets/images/book2.png"),
  require("../../assets/images/book3.png"),
  require("../../assets/images/book4.png"),
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>Мои любимые</Text>
          <Text style={styles.title}>КНИГИ</Text>
        </View>

        {/* SECTIONS */}
        <BookRow title="Все" count={4} data={books} isEven={false} />
        <BookRow title="Любимые" count={4} data={books} isEven={true} />
        <BookRow title="Фантастика" count={3} data={books} isEven={false} />
        <BookRow title="Научные" count={2} data={books} isEven={true} />
      </ScrollView>

      {/* НИЖНИЙ BLUR */}
      <View style={styles.blurContainer}>
        <BlurView intensity={12} tint="light" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  header: {
    alignItems: "center",
    marginBottom: 41,
  },

  subtitle: {
    fontFamily: "Poppins-Light",
    fontSize: 14,
    color: "#192024",
  },

  title: {
    fontFamily: "SourceSerif-Regular",
    fontSize: 40,
    letterSpacing: 2,
    fontWeight: 300,
  },

  blurContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  height: 165,
  },
});