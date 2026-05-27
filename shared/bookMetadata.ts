import { Directory, File, Paths } from "expo-file-system";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

import type { Book } from "./types";

type BookMetadata = Pick<Book, "author" | "coverImage" | "title">;

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  removeNSPrefix: true,
  textNodeName: "text",
  trimValues: true,
});

export async function readBookMetadata(
  file: File,
  format: Book["fileFormat"],
  bookId: string,
): Promise<Partial<BookMetadata>> {
  try {
    if (format === "epub") {
      return await readEpubMetadata(file, bookId);
    }

    if (format === "fb2") {
      return await readFb2Metadata(file, bookId);
    }
  } catch {
    return {};
  }

  return {};
}

async function readEpubMetadata(
  file: File,
  bookId: string,
): Promise<Partial<BookMetadata>> {
  const zip = await JSZip.loadAsync(await file.bytes());
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) return {};

  const containerXml = parser.parse(await containerFile.async("text"));
  const rootFilePath = firstValue(
    containerXml?.container?.rootfiles?.rootfile,
  )?.["full-path"];
  if (!rootFilePath || typeof rootFilePath !== "string") return {};

  const opfFile = zip.file(rootFilePath);
  if (!opfFile) return {};

  const opf = parser.parse(await opfFile.async("text"));
  const metadata = opf?.package?.metadata ?? {};
  const manifestItems = toArray(opf?.package?.manifest?.item);
  const title = textValue(firstValue(metadata.title));
  const author = textValue(firstValue(metadata.creator));
  const coverHref = findEpubCoverHref(metadata, manifestItems);
  const coverImage = coverHref
    ? await writeEpubCover(zip, rootFilePath, coverHref, bookId)
    : undefined;

  return {
    ...(author ? { author } : {}),
    ...(coverImage ? { coverImage } : {}),
    ...(title ? { title } : {}),
  };
}

async function readFb2Metadata(
  file: File,
  bookId: string,
): Promise<Partial<BookMetadata>> {
  const fb2 = parser.parse(await file.text());
  const fictionBook = fb2?.FictionBook ?? fb2;
  const titleInfo = fictionBook?.description?.["title-info"];
  const title = textValue(titleInfo?.["book-title"]);
  const author = formatFb2Author(firstValue(titleInfo?.author));
  const coverHref = firstValue(titleInfo?.coverpage?.image)?.href;
  const coverId =
    typeof coverHref === "string" ? coverHref.replace(/^#/, "") : undefined;
  const coverBinary = coverId
    ? toArray(fictionBook?.binary).find((binary) => binary?.id === coverId)
    : undefined;
  const coverImage = coverBinary
    ? writeFb2Cover(coverBinary, bookId)
    : undefined;

  return {
    ...(author ? { author } : {}),
    ...(coverImage ? { coverImage } : {}),
    ...(title ? { title } : {}),
  };
}

function findEpubCoverHref(metadata: any, manifestItems: any[]) {
  const coverId = toArray(metadata?.meta).find(
    (meta) => meta?.name === "cover" && typeof meta?.content === "string",
  )?.content;
  const coverItem =
    manifestItems.find((item) => item?.id === coverId) ??
    manifestItems.find((item) =>
      typeof item?.properties === "string"
        ? item.properties.split(/\s+/).includes("cover-image")
        : false,
    );

  return typeof coverItem?.href === "string" ? coverItem.href : undefined;
}

async function writeEpubCover(
  zip: JSZip,
  opfPath: string,
  coverHref: string,
  bookId: string,
) {
  const coverPath = normalizeArchivePath(joinArchivePath(dirname(opfPath), coverHref));
  const coverFile = zip.file(coverPath);
  if (!coverFile) return undefined;

  const extension = getExtension(coverPath) || "jpg";
  const cover = new File(getCoversDirectory(), `${bookId}.${extension}`);
  cover.write(await coverFile.async("uint8array"));

  return { uri: cover.uri };
}

function writeFb2Cover(binary: any, bookId: string) {
  const base64 = textValue(binary)?.replace(/\s+/g, "");
  if (!base64) return undefined;

  const contentType =
    typeof binary?.["content-type"] === "string"
      ? binary["content-type"]
      : "image/jpeg";
  const extension = contentType.includes("png") ? "png" : "jpg";
  const cover = new File(getCoversDirectory(), `${bookId}.${extension}`);
  cover.write(base64, { encoding: "base64" });

  return { uri: cover.uri };
}

function getCoversDirectory() {
  const coversDirectory = new Directory(Paths.document, "covers");
  coversDirectory.create({ idempotent: true, intermediates: true });
  return coversDirectory;
}

function formatFb2Author(author: any) {
  if (!author) return undefined;

  const parts = [
    textValue(author["first-name"]),
    textValue(author["middle-name"]),
    textValue(author["last-name"]),
  ].filter(Boolean);

  return parts.join(" ") || textValue(author.nickname);
}

function textValue(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || undefined;
  }
  if (typeof value.text === "string" || typeof value.text === "number") {
    return String(value.text).trim() || undefined;
  }

  return undefined;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstValue<T>(value: T | T[] | undefined): T | undefined {
  return toArray(value)[0];
}

function dirname(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function joinArchivePath(basePath: string, path: string) {
  return basePath ? `${basePath}/${path}` : path;
}

function normalizeArchivePath(path: string) {
  const parts: string[] = [];

  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return parts.join("/");
}

function getExtension(path: string) {
  return path.split(".").pop()?.toLowerCase();
}
