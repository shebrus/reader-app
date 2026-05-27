// Конфиг стартового экрана: размеры макета, координаты книг, тайминги анимаций и типы карусели.
import type { ImageSourcePropType } from "react-native";

export const DESIGN_WIDTH = 375;
export const DESIGN_HEIGHT = 812;
export const BASE_BOOK_WIDTH = 270;
export const BOOK_RATIO = 820 / 540;
export const OPEN_DURATION = 850;
export const CLOSE_DURATION = 850;
export const ROTATE_DURATION = 800;
export const SWIPE_DISTANCE = 70;
export const SWIPE_VELOCITY = 500;

export type SlotName = "left" | "center" | "right";
export type RotateDirection = "left" | "right";

export type IntroBook = {
  id: string;
  coverColor?: string;
  coverImage?: ImageSourcePropType;
  sourceBookId?: string;
};

export type Frame = {
  left: number;
  top: number;
  width: number;
};

export const initialFrames: Record<SlotName, Frame> = {
  left: { left: 66, top: 283, width: 243 },
  center: { left: 53, top: 340, width: 270 },
  right: { left: 80, top: 232, width: 216 },
};

export const carouselFrames: Record<SlotName, Frame> = {
  left: { left: -108, top: 254, width: 216 },
  center: { left: 52, top: 201, width: 270 },
  right: { left: 267, top: 254, width: 216 },
};

export const introBooks: IntroBook[] = [
  {
    id: "left",
    coverImage: require("../../assets/covers/cover4.png"),
  },
  {
    id: "center",
    coverImage: require("../../assets/covers/cover1.png"),
  },
  {
    id: "right",
    coverImage: require("../../assets/covers/cover2.png"),
  },
];

export const slotNames: SlotName[] = ["left", "center", "right"];

export const getNextSlot = (
  slotName: SlotName,
  direction: RotateDirection,
): SlotName => {
  if (direction === "right") {
    if (slotName === "right") return "center";
    if (slotName === "center") return "left";
    return "right";
  }

  if (slotName === "left") return "center";
  if (slotName === "center") return "right";
  return "left";
};
