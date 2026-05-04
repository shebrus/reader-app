// Константы и ассеты для 3D-карточки книги.
export const bookAssets = {
  backCover: require("../../assets/book/back_cover.svg"),
  blur1: require("../../assets/book/blur_1.svg"),
  blur2: require("../../assets/book/blur_2.svg"),
  frontCover: require("../../assets/book/front_cover.svg"),
  leftShadow: require("../../assets/book/left_shadow.svg"),
  leftShadow2: require("../../assets/book/left_shadow_2.svg"),
  pages: require("../../assets/book/pages.png"),
  rightShadow1: require("../../assets/book/right_shadow_1.svg"),
  rightShadow2: require("../../assets/book/right_shadow_2.svg"),
  upShadow: require("../../assets/book/up_shadow.svg"),
};

export const BOOK_WIDTH = 540;
export const BOOK_HEIGHT = 820;
export const BACK_COVER_GROUP_WIDTH = 540;
export const BACK_COVER_GROUP_HEIGHT = 807;
export const FRONT_COVER_GROUP_WIDTH = 540;
export const FRONT_COVER_GROUP_HEIGHT = 771;
export const FRONT_COVER_GROUP_TOP = BOOK_HEIGHT - FRONT_COVER_GROUP_HEIGHT;
export const COVER_WIDTH = 540;
export const COVER_HEIGHT = 771;
export const COVER_RADIUS = 20;
export const SIDE_SHADOW_WIDTH = 9;
export const SIDE_SHADOW_HEIGHT = 764;
export const SIDE_SHADOW_TOP = (COVER_HEIGHT - SIDE_SHADOW_HEIGHT) / 2;
export const RIGHT_SHADOW_LEFT = COVER_WIDTH - SIDE_SHADOW_WIDTH;
export const LEFT_SHADOW_2_LEFT = 24;
export const LEFT_SHADOW_2_WIDTH = 29;
export const LEFT_SHADOW_2_HEIGHT = 772;
export const PAGES_LEFT = 28;
export const PAGES_TOP = BACK_COVER_GROUP_HEIGHT - 798;
export const PAGES_WIDTH = 500;
export const PAGES_HEIGHT = 798;
export const UP_SHADOW_WIDTH = 540;
export const UP_SHADOW_HEIGHT = 69;
export const DEFAULT_BOOK_WIDTH = 216;
export const BACK_COVER_PATH =
  "M520 0C531.046 0 540 8.9543 540 20V771H7.10526H0V69L7.10526 19C8.32331 3.8 20.4699 0 26.391 0H520Z";
