// Типы, которые используются внутри компонента 3D-карточки книги.
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";

export type BookCardNewProps = {
  coverImage?: ImageSourcePropType | string;
  width?: number;
  style?: StyleProp<ViewStyle>;
};

export type LayerFrame = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SvgLayerProps = {
  source: ImageSourcePropType;
  style: LayerFrame;
};

export type CoverLayerProps = {
  coverImage?: ImageSourcePropType | string;
  source: ImageSourcePropType;
  style: LayerFrame;
  clipId: string;
  shape: "back" | "front";
};
