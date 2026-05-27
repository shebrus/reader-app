import { Asset } from "expo-asset";

import { bookAssets } from "../components/bookCard/constants";
import { libraryBookAssets } from "./libraryData";

let preloadPromise: Promise<Asset[]> | null = null;

export function preloadBookAssets() {
  preloadPromise ??= Asset.loadAsync([
    ...Object.values(bookAssets),
    ...libraryBookAssets,
  ]);

  return preloadPromise;
}
