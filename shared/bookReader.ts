import { File } from "expo-file-system";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { Book } from "./types";

export type ReadingContent = {
  chapterTitle: string;
  text: string;
};

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  removeNSPrefix: true,
  textNodeName: "text",
  trimValues: true,
});

export async function readBookContent(book: Book): Promise<ReadingContent> {
  if (!book.fileUri) return fallbackContent(book);

  try {
    const file = new File(book.fileUri);

    if (book.fileFormat === "fb2") return readFb2Content(file, book);
    if (book.fileFormat === "epub") return readEpubContent(file, book);

    if (book.fileFormat === "txt") {
      const text = normalizeText(await file.text());
      return {
        chapterTitle: book.title || ru("Книга"),
        text: text || ru("В файле нет текста."),
      };
    }

    if (book.fileFormat === "pdf") {
      return {
        chapterTitle: book.title || "PDF",
        text: ru("Чтение PDF внутри приложения пока не поддерживается."),
      };
    }
  } catch {
    return fallbackContent(book);
  }

  return fallbackContent(book);
}

async function readFb2Content(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const fb2 = parser.parse(await file.text());
  const fictionBook = fb2?.FictionBook ?? fb2;
  const firstSection = findFirstSection(fictionBook?.body);
  const chapterTitle =
    extractTitle(firstSection?.title) ||
    extractTitle(fictionBook?.description?.["title-info"]?.["book-title"]) ||
    book.title ||
    ru("Глава");
  const textSource = firstSection
    ? { ...firstSection, title: undefined }
    : fictionBook?.body;
  const text = removeLeadingTitle(
    normalizeText(extractXmlText(textSource)),
    chapterTitle,
  );

  return {
    chapterTitle,
    text: text || ru("В главе нет текста."),
  };
}

async function readEpubContent(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const zip = await JSZip.loadAsync(await file.bytes());
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) return fallbackContent(book);

  const containerXml = parser.parse(await containerFile.async("text"));
  const rootFilePath = firstValue(
    containerXml?.container?.rootfiles?.rootfile,
  )?.["full-path"];
  if (!rootFilePath || typeof rootFilePath !== "string") {
    return fallbackContent(book);
  }

  const opfFile = zip.file(rootFilePath);
  if (!opfFile) return fallbackContent(book);

  const opf = parser.parse(await opfFile.async("text"));
  const manifestItems = toArray(opf?.package?.manifest?.item);
  const spineItems = toArray(opf?.package?.spine?.itemref);

  for (const spineItem of spineItems) {
    if (typeof spineItem?.idref !== "string") continue;

    const manifestItem = manifestItems.find(
      (item) => item?.id === spineItem.idref,
    );
    if (typeof manifestItem?.href !== "string") continue;

    const content = await readEpubChapter(
      zip,
      rootFilePath,
      manifestItem.href,
      book,
    );
    if (isReadableChapter(content)) return content;
  }

  for (const manifestItem of manifestItems) {
    if (typeof manifestItem?.href !== "string") continue;

    const mediaType = String(manifestItem?.["media-type"] ?? "");
    const isHtml =
      mediaType.includes("html") || /\.(xhtml|html?)$/i.test(manifestItem.href);
    if (!isHtml) continue;

    const content = await readEpubChapter(
      zip,
      rootFilePath,
      manifestItem.href,
      book,
    );
    if (isReadableChapter(content)) return content;
  }

  return fallbackContent(book);
}

async function readEpubChapter(
  zip: JSZip,
  opfPath: string,
  href: string,
  book: Book,
): Promise<ReadingContent> {
  const chapterPath = normalizeArchivePath(
    joinArchivePath(dirname(opfPath), href.split("#")[0]),
  );
  const chapterFile = zip.file(chapterPath);
  if (!chapterFile) return { chapterTitle: book.title || ru("Глава"), text: "" };

  const rawHtml = await chapterFile.async("text");
  const bodyHtml = extractBodyHtml(rawHtml);
  const chapterTitle =
    extractHtmlTitle(bodyHtml) ||
    extractHtmlTitle(rawHtml) ||
    book.title ||
    ru("Глава");
  const text = removeLeadingTitle(htmlToText(bodyHtml), chapterTitle);

  return {
    chapterTitle,
    text,
  };
}

function isReadableChapter(content: ReadingContent) {
  const title = content.chapterTitle.toLowerCase();
  const serviceTitles = [
    "table of contents",
    "contents",
    "\u0441\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435",
    "\u043e\u0433\u043b\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
    "\u0430\u043d\u043d\u043e\u0442\u0430\u0446\u0438\u044f",
    "annotation",
    "\u0432\u043d\u0438\u043c\u0430\u043d\u0438\u0435",
    "playlist",
  ];

  if (serviceTitles.some((serviceTitle) => title.includes(serviceTitle))) {
    return false;
  }

  return content.text.length > 500;
}

function fallbackContent(book: Book): ReadingContent {
  return {
    chapterTitle: book.title || ru("Книга"),
    text: ru("Не удалось открыть текст книги."),
  };
}

function findFirstSection(body: any): any {
  const bodies = toArray(body);

  for (const bodyItem of bodies) {
    const section = firstValue(bodyItem?.section);
    if (section) return section;
  }

  return firstValue(bodies);
}

function extractTitle(value: any): string | undefined {
  return normalizeText(extractXmlText(value)).split("\n").find(Boolean);
}

function extractXmlText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(extractXmlText).filter(Boolean).join("\n");
  }
  if (typeof value !== "object") return "";

  const parts: string[] = [];

  for (const [key, child] of Object.entries(value)) {
    if (
      key === "binary" ||
      key === "image" ||
      key === "stylesheet" ||
      key === "title"
    ) {
      continue;
    }
    parts.push(extractXmlText(child));
  }

  return parts.filter(Boolean).join("\n");
}

function extractBodyHtml(html: string) {
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
}

function extractHtmlTitle(html: string) {
  const titleHtml =
    html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ??
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return titleHtml ? htmlToText(titleHtml).split("\n").find(Boolean) : undefined;
}

function htmlToText(html: string) {
  const withoutTitle = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|blockquote|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeText(decodeHtmlEntities(withoutTitle));
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10)),
    );
}

function removeLeadingTitle(text: string, title: string) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return text;

  const lines = text.split("\n");
  if (normalizeText(lines[0] ?? "") === normalizedTitle) {
    return normalizeText(lines.slice(1).join("\n"));
  }

  return text;
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\u2028/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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

function ru(text: string) {
  return text;
}
