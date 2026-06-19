import { File } from "expo-file-system";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { Book } from "./types";
import { isAudioBookFormat } from "./audioBook";

export type ReadingChapter = {
  id: string;
  title: string;
  text: string;
};

export type ReadingContent = {
  title: string;
  chapters: ReadingChapter[];
  textLength: number;
};

type EpubTocEntry = {
  basePath: string;
  href: string;
  level: number;
  title: string;
};

type ResolvedEpubTocEntry = EpubTocEntry & {
  fragment?: string;
  order: number;
  path: string;
};

type EpubReadableItem = {
  path: string;
};

const UNTITLED_BOOK = "Книга";
const UNTITLED_CHAPTER = "Глава";

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  removeNSPrefix: true,
  textNodeName: "text",
  trimValues: true,
});

const tocParser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  removeNSPrefix: true,
  textNodeName: "__text",
  trimValues: true,
});

export async function readBookContent(book: Book): Promise<ReadingContent> {
  if (!book.fileUri) return fallbackContent(book);

  if (isAudioBookFormat(book.fileFormat)) {
    return makeContent(book.title || "Аудиокнига", [
      {
        id: "audio-unavailable",
        title: book.title || "Аудиокнига",
        text: "Воспроизведение аудиокниг пока не поддерживается.",
      },
    ]);
  }

  try {
    const file = new File(book.fileUri);

    if (book.fileFormat === "fb2") return readFb2Content(file, book);
    if (book.fileFormat === "epub") return readEpubContent(file, book);
    if (book.fileFormat === "txt") return readTxtContent(file, book);
    if (book.fileFormat === "zip") return readZipBookContent(file, book);

    if (book.fileFormat === "pdf") {
      return makeContent(book.title || "PDF", [
        {
          id: "pdf-unavailable",
          title: "PDF",
          text: "Чтение PDF внутри приложения пока не поддерживается.",
        },
      ]);
    }
  } catch {
    return fallbackContent(book);
  }

  return fallbackContent(book);
}

async function readTxtContent(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const text = normalizeText(await file.text());
  const chapters = splitPlainTextIntoChapters(text, book.title || UNTITLED_BOOK);

  return makeContent(book.title || getTitleFromFileName(file.name), chapters);
}

async function readFb2Content(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const parsed = parseFb2Text(await file.text(), book, getTitleFromFileName(file.name));

  return makeContent(parsed.title, parsed.chapters);
}

function parseFb2Text(
  text: string,
  book: Book,
  fallbackTitle: string,
): { chapters: ReadingChapter[]; title: string } {
  const fb2 = parser.parse(text);
  const fictionBook = fb2?.FictionBook ?? fb2;
  const titleInfo = fictionBook?.description?.["title-info"];
  const bookTitle =
    textValue(titleInfo?.["book-title"]) || book.title || fallbackTitle || UNTITLED_BOOK;
  const mainBody = getMainFb2Body(fictionBook?.body);
  const chapters = collectFb2Chapters(mainBody);
  const fallbackText = normalizeText(extractXmlText(mainBody));

  return {
    title: bookTitle,
    chapters: chapters.length > 0 ? chapters : [
      {
        id: "fb2-body",
        title: bookTitle,
        text: fallbackText || "Не удалось открыть текст книги.",
      },
    ],
  };
}

async function readEpubContent(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const zip = await JSZip.loadAsync(await file.bytes());
  const rootFilePath = await findEpubPackagePath(zip);
  if (!rootFilePath) return fallbackContent(book);

  const opfFile = zip.file(rootFilePath);
  if (!opfFile) return fallbackContent(book);

  const opf = parser.parse(await opfFile.async("text"));
  const packageData = opf?.package ?? {};
  const metadata = packageData.metadata ?? {};
  const bookTitle =
    textValue(firstValue(metadata.title)) || book.title || UNTITLED_BOOK;
  const manifestItems = toArray(packageData.manifest?.item);
  const spine = firstValue(packageData.spine);
  const spineItems = toArray(spine?.itemref);
  const spineHtmlItems = getEpubSpineHtmlItems(
    manifestItems,
    spineItems,
    rootFilePath,
  );
  const tocEntries = await readEpubTocEntries(
    zip,
    rootFilePath,
    manifestItems,
    spine,
  );
  const tocChapters = await readEpubTocChapters(
    zip,
    tocEntries,
    bookTitle,
    spineHtmlItems,
  );

  if (tocChapters.length > 0) {
    return makeContent(bookTitle, tocChapters);
  }

  const chapters: ReadingChapter[] = [];
  const seenPaths = new Set<string>();

  for (const spineItem of spineItems) {
    if (typeof spineItem?.idref !== "string") continue;
    if (spineItem?.linear === "no") continue;

    const manifestItem = manifestItems.find(
      (item) => item?.id === spineItem.idref,
    );
    const chapter = await readEpubManifestItem(
      zip,
      rootFilePath,
      manifestItem,
      bookTitle,
      chapters.length,
      seenPaths,
    );
    if (chapter) chapters.push(chapter);
  }

  if (chapters.length === 0) {
    for (const manifestItem of manifestItems) {
      const chapter = await readEpubManifestItem(
        zip,
        rootFilePath,
        manifestItem,
        bookTitle,
        chapters.length,
        seenPaths,
      );
      if (chapter) chapters.push(chapter);
    }
  }

  return makeContent(bookTitle, chapters);
}

async function readZipBookContent(
  file: File,
  book: Book,
): Promise<ReadingContent> {
  const zip = await JSZip.loadAsync(await file.bytes());
  const archiveFiles = getReadableBookArchiveFiles(zip);
  if (archiveFiles.length === 0) return fallbackContent(book);

  const chapters: ReadingChapter[] = [];
  const fallbackTitle = book.title || getTitleFromFileName(file.name);
  let archiveTitle = fallbackTitle;

  for (const [fileIndex, archiveFile] of archiveFiles.entries()) {
    const extension = getExtension(archiveFile.name);
    const fileTitle = getTitleFromFileName(getArchiveFileName(archiveFile.name));
    if (isServiceDocumentCandidate(fileTitle, archiveFile.name)) continue;

    if (extension === "fb2") {
      const parsedFb2 = parseFb2Text(
        await archiveFile.async("text"),
        book,
        fileTitle,
      );
      if (fileIndex === 0 && parsedFb2.title) archiveTitle = parsedFb2.title;

      chapters.push(
        ...parsedFb2.chapters.map((chapter, chapterIndex) => ({
          ...chapter,
          id: `zip-${fileIndex}-${chapter.id || chapterIndex}`,
          title: chapter.title || fileTitle,
        })),
      );
      continue;
    }

    if (extension === "txt" || extension === "md") {
      const text = normalizeText(await archiveFile.async("text"));

      if (archiveFiles.length === 1) {
        chapters.push(...splitPlainTextIntoChapters(text, fallbackTitle));
      } else {
        chapters.push(makeArchiveChapter(text, fileTitle, fileIndex));
      }
      continue;
    }

    if (extension === "html" || extension === "htm" || extension === "xhtml") {
      const rawHtml = await archiveFile.async("text");
      const bodyHtml = extractBodyHtml(rawHtml);
      const title =
        extractHtmlTitle(bodyHtml) ||
        extractHtmlTitle(rawHtml) ||
        fileTitle ||
        `${UNTITLED_CHAPTER} ${fileIndex + 1}`;
      const text = removeLeadingTitle(htmlToText(bodyHtml), title);

      if (!isReadableChapter(title, text, archiveFile.name, false)) continue;

      chapters.push({
        id: `zip-${fileIndex}`,
        title,
        text,
      });
    }
  }

  return makeContent(archiveTitle, chapters);
}

async function findEpubPackagePath(zip: JSZip) {
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) return undefined;

  const containerXml = parser.parse(await containerFile.async("text"));
  const rootFile = firstValue(containerXml?.container?.rootfiles?.rootfile);
  const path = rootFile?.["full-path"];

  return typeof path === "string" ? path : undefined;
}

function getEpubSpineHtmlItems(
  manifestItems: any[],
  spineItems: any[],
  opfPath: string,
): EpubReadableItem[] {
  const items: EpubReadableItem[] = [];

  for (const spineItem of spineItems) {
    if (typeof spineItem?.idref !== "string") continue;
    if (spineItem?.linear === "no") continue;

    const manifestItem = manifestItems.find(
      (item) => item?.id === spineItem.idref,
    );
    const path = getEpubManifestItemPath(manifestItem, opfPath);
    if (!path || !isEpubHtmlManifestItem(manifestItem, path)) continue;
    if (hasManifestProperty(manifestItem, "nav")) continue;

    items.push({ path });
  }

  return items;
}

async function readEpubTocEntries(
  zip: JSZip,
  opfPath: string,
  manifestItems: any[],
  spine: any,
): Promise<EpubTocEntry[]> {
  const navItem = manifestItems.find((item) => hasManifestProperty(item, "nav"));
  const navPath = getEpubManifestItemPath(navItem, opfPath);

  if (navPath) {
    const navFile = zip.file(navPath);
    if (navFile) {
      const navEntries = parseEpubNavToc(await navFile.async("text"), navPath);
      if (navEntries.length > 0) return navEntries;
    }
  }

  const spineTocId = typeof spine?.toc === "string" ? spine.toc : undefined;
  const ncxItem =
    manifestItems.find((item) => spineTocId && item?.id === spineTocId) ??
    manifestItems.find((item) => {
      const mediaType = String(item?.["media-type"] ?? "").toLowerCase();
      return mediaType.includes("dtbncx") || /\.ncx$/i.test(String(item?.href ?? ""));
    });
  const ncxPath = getEpubManifestItemPath(ncxItem, opfPath);

  if (!ncxPath) return [];

  const ncxFile = zip.file(ncxPath);
  if (!ncxFile) return [];

  return parseEpubNcxToc(await ncxFile.async("text"), ncxPath);
}

async function readEpubTocChapters(
  zip: JSZip,
  tocEntries: EpubTocEntry[],
  bookTitle: string,
  spineHtmlItems: EpubReadableItem[],
): Promise<ReadingChapter[]> {
  if (tocEntries.length === 0) return [];

  const spinePathSet = new Set(spineHtmlItems.map((item) => item.path));
  const resolvedEntries = selectEpubTocChapterEntries(tocEntries
    .map<ResolvedEpubTocEntry | null>((entry, order) => {
      const path = resolveArchiveHref(entry.basePath, entry.href);
      if (!path || isServiceDocumentCandidate(entry.title, path)) return null;
      if (!spinePathSet.has(path) && !/\.(xhtml|html?)$/i.test(path)) return null;

      return {
        ...entry,
        fragment: getHrefFragment(entry.href),
        order,
        path,
      };
    })
    .filter((entry): entry is ResolvedEpubTocEntry => Boolean(entry)));

  const chapters: ReadingChapter[] = [];
  const htmlCache = new Map<string, Promise<string>>();
  const seenEntries = new Set<string>();

  for (const [index, entry] of resolvedEntries.entries()) {
    if (isTocContainerEntry(entry, resolvedEntries)) continue;

    const entryKey = `${entry.path}#${entry.fragment ?? ""}`;
    if (seenEntries.has(entryKey)) continue;
    seenEntries.add(entryKey);

    const nextEntryInFile = resolvedEntries
      .slice(index + 1)
      .find((candidate) => candidate.path === entry.path && candidate.fragment);
    const rawHtmlPromise =
      htmlCache.get(entry.path) ??
      zip.file(entry.path)?.async("text") ??
      Promise.resolve("");
    htmlCache.set(entry.path, rawHtmlPromise);

    const chapter = readEpubHtmlChapter(
      await rawHtmlPromise,
      entry,
      nextEntryInFile,
      bookTitle,
      chapters.length,
    );
    if (chapter) chapters.push(chapter);
  }

  return chapters;
}

function selectEpubTocChapterEntries(entries: ResolvedEpubTocEntry[]) {
  if (entries.length <= 2) return entries;

  const chapterLikeByLevel = new Map<number, number>();

  for (const entry of entries) {
    if (!isChapterLikeTocTitle(entry.title)) continue;

    chapterLikeByLevel.set(
      entry.level,
      (chapterLikeByLevel.get(entry.level) ?? 0) + 1,
    );
  }

  const dominantChapterLevel = [...chapterLikeByLevel.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]?.[0];

  if (typeof dominantChapterLevel === "number") {
    const levelEntries = entries.filter((entry) => {
      if (entry.level !== dominantChapterLevel) return false;
      if (isTocBranchEntry(entry, entries) && !isChapterLikeTocTitle(entry.title)) {
        return false;
      }

      return !isContainerTocTitle(entry.title) || isChapterLikeTocTitle(entry.title);
    });

    if (levelEntries.length > 0) return levelEntries;
  }

  const leafEntries = entries.filter((entry) => !isTocBranchEntry(entry, entries));
  if (leafEntries.length >= 2) return leafEntries;

  return entries.filter(
    (entry) => !isTocBranchEntry(entry, entries) || isChapterLikeTocTitle(entry.title),
  );
}

function isTocBranchEntry(
  entry: ResolvedEpubTocEntry,
  entries: ResolvedEpubTocEntry[],
) {
  const entryIndex = entries.indexOf(entry);
  if (entryIndex < 0) return false;

  for (let index = entryIndex + 1; index < entries.length; index += 1) {
    const candidate = entries[index];
    if (candidate.level <= entry.level) return false;
    if (candidate.level > entry.level) return true;
  }

  return false;
}

function isTocContainerEntry(
  entry: ResolvedEpubTocEntry,
  entries: ResolvedEpubTocEntry[],
) {
  if (entry.fragment) return false;

  const entryIndex = entries.indexOf(entry);
  if (entryIndex < 0) return false;

  for (let index = entryIndex + 1; index < entries.length; index += 1) {
    const candidate = entries[index];
    if (candidate.level <= entry.level) return false;
    if (candidate.path === entry.path && candidate.fragment) return true;
  }

  return false;
}

function isChapterLikeTocTitle(title: string) {
  const normalizedTitle = normalizeServiceText(title)
    .replace(/\bchapter\b/g, "глава")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedTitle) return false;
  if (/^(глава|chapitre|capitulo|capítulo)\s+/.test(normalizedTitle)) return true;
  if (/^(chapter|chap)\s+/.test(title.toLowerCase())) return true;
  if (/^\d{1,3}[.)]?$/.test(normalizedTitle)) return true;
  if (/^[ivxlcdm]{1,8}[.)]?$/i.test(normalizedTitle)) return true;
  if (/^\d{1,3}\s+[^\d\s].+/.test(normalizedTitle)) return true;

  return false;
}

function isContainerTocTitle(title: string) {
  const normalizedTitle = normalizeServiceText(title);

  return (
    /^(том|том\s+\d+|volume|vol\.?)\b/.test(normalizedTitle) ||
    /^(часть|part|книга|book)\b/.test(normalizedTitle) ||
    /\b(том|volume|часть|part)\b/.test(normalizedTitle)
  );
}

function readEpubHtmlChapter(
  rawHtml: string,
  entry: ResolvedEpubTocEntry,
  nextEntryInFile: ResolvedEpubTocEntry | undefined,
  bookTitle: string,
  chapterIndex: number,
): ReadingChapter | undefined {
  if (!rawHtml) return undefined;

  const bodyHtml = extractBodyHtml(rawHtml);
  const chapterHtml = sliceHtmlByFragment(
    bodyHtml,
    entry.fragment,
    nextEntryInFile?.fragment,
  );
  const title =
    normalizeText(entry.title) ||
    extractHtmlTitle(chapterHtml) ||
    extractHtmlTitle(rawHtml) ||
    `${UNTITLED_CHAPTER} ${chapterIndex + 1}`;
  const text = removeLeadingTitle(htmlToText(chapterHtml), title);

  if (!isReadableChapter(title, text, entry.path, true)) return undefined;

  return {
    id: `${entry.path}#${entry.fragment ?? chapterIndex}`,
    title: title || bookTitle,
    text,
  };
}

function parseEpubNavToc(rawHtml: string, navPath: string): EpubTocEntry[] {
  try {
    const parsed = tocParser.parse(rawHtml);
    const navNodes = findNodesByKey(parsed, "nav");
    const tocNav =
      navNodes.find(isTocNavNode) ??
      navNodes.find((node) => node?.ol || node?.ul);

    if (!tocNav) return [];

    return collectEpubNavListEntries(tocNav.ol ?? tocNav.ul, navPath, 0);
  } catch {
    return [];
  }
}

function parseEpubNcxToc(rawNcx: string, ncxPath: string): EpubTocEntry[] {
  try {
    const parsed = tocParser.parse(rawNcx);
    const navMap = parsed?.ncx?.navMap ?? parsed?.navMap;
    if (!navMap) return [];

    return collectEpubNcxNavPoints(navMap.navPoint, ncxPath, 0);
  } catch {
    return [];
  }
}

function collectEpubNavListEntries(
  list: any,
  basePath: string,
  level: number,
): EpubTocEntry[] {
  if (isHiddenHtmlNode(list)) return [];

  const entries: EpubTocEntry[] = [];

  for (const item of toArray(list?.li)) {
    if (isHiddenHtmlNode(item)) continue;

    const link = firstValue(item?.a);
    const labelNode = link ?? firstValue(item?.span);
    const href = typeof link?.href === "string" ? link.href : undefined;
    const title = normalizeText(extractXmlText(labelNode));

    if (href && title) {
      entries.push({ basePath, href, level, title });
    }

    for (const nestedList of [...toArray(item?.ol), ...toArray(item?.ul)]) {
      entries.push(...collectEpubNavListEntries(nestedList, basePath, level + 1));
    }
  }

  return entries;
}

function isHiddenHtmlNode(node: any) {
  return (
    node?.hidden != null ||
    normalizeServiceText(String(node?.style ?? "")).includes("display none") ||
    normalizeServiceText(String(node?.["aria-hidden"] ?? "")) === "true"
  );
}

function collectEpubNcxNavPoints(
  navPoints: any,
  basePath: string,
  level: number,
): EpubTocEntry[] {
  const entries: EpubTocEntry[] = [];

  for (const navPoint of toArray(navPoints)) {
    const label = firstValue(navPoint?.navLabel);
    const content = firstValue(navPoint?.content);
    const href = typeof content?.src === "string" ? content.src : undefined;
    const title = normalizeText(
      textValue(label?.text) ?? extractXmlText(label),
    );

    if (href && title) {
      entries.push({ basePath, href, level, title });
    }

    entries.push(
      ...collectEpubNcxNavPoints(navPoint?.navPoint, basePath, level + 1),
    );
  }

  return entries;
}

function isTocNavNode(node: any) {
  const navType = normalizeServiceText(
    [
      node?.type,
      node?.["epub:type"],
      node?.role,
      node?.id,
      node?.class,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return /\btoc\b/.test(navType) || navType.includes("оглав");
}

function findNodesByKey(value: any, key: string): any[] {
  if (value == null || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => findNodesByKey(item, key));
  }

  const ownNodes = key in value ? toArray(value[key]) : [];
  const childNodes = Object.entries(value).flatMap(([childKey, child]) =>
    childKey === key ? [] : findNodesByKey(child, key),
  );

  return [...ownNodes, ...childNodes];
}

function getEpubManifestItemPath(manifestItem: any, opfPath: string) {
  if (typeof manifestItem?.href !== "string") return undefined;

  return normalizeArchivePath(
    joinArchivePath(dirname(opfPath), stripHrefQuery(manifestItem.href)),
  );
}

function isEpubHtmlManifestItem(manifestItem: any, path: string) {
  const mediaType = String(manifestItem?.["media-type"] ?? "").toLowerCase();

  return mediaType.includes("html") || /\.(xhtml|html?)$/i.test(path);
}

function hasManifestProperty(manifestItem: any, property: string) {
  return String(manifestItem?.properties ?? "")
    .split(/\s+/)
    .includes(property);
}

async function readEpubManifestItem(
  zip: JSZip,
  opfPath: string,
  manifestItem: any,
  bookTitle: string,
  index: number,
  seenPaths: Set<string>,
): Promise<ReadingChapter | undefined> {
  const chapterPath = getEpubManifestItemPath(manifestItem, opfPath);
  if (!chapterPath) return undefined;

  const mediaType = String(manifestItem?.["media-type"] ?? "");
  const properties = String(manifestItem?.properties ?? "");
  const isHtml =
    mediaType.includes("html") || /\.(xhtml|html?)$/i.test(chapterPath);

  if (!isHtml) return undefined;
  if (properties.split(/\s+/).includes("nav")) return undefined;
  if (seenPaths.has(chapterPath)) return undefined;
  seenPaths.add(chapterPath);

  const chapterFile = zip.file(chapterPath);
  if (!chapterFile) return undefined;

  const rawHtml = await chapterFile.async("text");
  const bodyHtml = extractBodyHtml(rawHtml);
  const title =
    extractHtmlTitle(bodyHtml) ||
    extractHtmlTitle(rawHtml) ||
    `${UNTITLED_CHAPTER} ${index + 1}`;
  const text = removeLeadingTitle(htmlToText(bodyHtml), title);

  if (!isReadableChapter(title, text, chapterPath, false)) return undefined;

  return {
    id: manifestItem.id || chapterPath || `epub-${index}`,
    title: normalizeText(title) || bookTitle,
    text,
  };
}

function getMainFb2Body(body: any) {
  const bodies = toArray(body);

  return (
    bodies.find((bodyItem) => !isSupplementaryFb2Body(bodyItem)) ??
    bodies[0]
  );
}

function collectFb2Chapters(body: any): ReadingChapter[] {
  const chapters: ReadingChapter[] = [];
  if (!body || isSupplementaryFb2Body(body)) return chapters;

  for (const section of toArray(body?.section)) {
    collectFb2Section(section, chapters, []);
  }

  return chapters.filter((chapter) => chapter.text.length > 0);
}

function collectFb2Section(
  section: any,
  chapters: ReadingChapter[],
  titleStack: string[],
) {
  if (!section) return;

  const title = extractTitle(section.title);
  const nextTitleStack = title ? [...titleStack, title] : titleStack;
  const nestedSections = toArray(section.section);
  const text = extractFb2SectionOwnText(section, title);
  const chapterTitle = normalizeText(nextTitleStack[nextTitleStack.length - 1] ?? "");

  if (
    title &&
    text.length > 0 &&
    !isServiceDocumentCandidate(chapterTitle, "")
  ) {
    chapters.push({
      id: section.id || `fb2-${chapters.length}`,
      title: chapterTitle || `${UNTITLED_CHAPTER} ${chapters.length + 1}`,
      text,
    });
  }

  for (const nestedSection of nestedSections) {
    collectFb2Section(nestedSection, chapters, nextTitleStack);
  }
}

function extractFb2SectionOwnText(section: any, title: string | undefined) {
  const readableSection = { ...section };
  delete readableSection.annotation;
  delete readableSection.section;
  delete readableSection.title;

  return removeLeadingTitle(
    normalizeText(extractXmlText(readableSection)),
    title || "",
  );
}

function isSupplementaryFb2Body(body: any) {
  const bodyName = normalizeServiceText(
    String(body?.name ?? body?.["fb:name"] ?? ""),
  );

  return /(^|\s)(notes?|comments?|footnotes?)(\s|$)/.test(bodyName) ||
    bodyName.includes("примеч") ||
    bodyName.includes("сноск") ||
    bodyName.includes("комментар");
}

function splitPlainTextIntoChapters(
  text: string,
  fallbackTitle: string,
): ReadingChapter[] {
  if (!text) {
    return [{ id: "txt-empty", title: fallbackTitle, text: "В файле нет текста." }];
  }

  const lines = text.split("\n");
  const chapters: ReadingChapter[] = [];
  let currentTitle = fallbackTitle;
  let buffer: string[] = [];

  const flush = () => {
    const chapterText = normalizeText(buffer.join("\n"));
    if (!chapterText) return;

    chapters.push({
      id: `txt-${chapters.length}`,
      title: currentTitle,
      text: removeLeadingTitle(chapterText, currentTitle),
    });
  };

  for (const line of lines) {
    if (isPlainTextChapterTitle(line) && buffer.join("\n").length > 400) {
      flush();
      currentTitle = normalizeText(line);
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  flush();

  return chapters.length > 0
    ? chapters
    : [{ id: "txt-full", title: fallbackTitle, text }];
}

function makeArchiveChapter(text: string, fallbackTitle: string, index: number): ReadingChapter {
  const firstLine = text.split("\n").find(Boolean);
  const title =
    firstLine && isPlainTextChapterTitle(firstLine)
      ? normalizeText(firstLine)
      : fallbackTitle || `${UNTITLED_CHAPTER} ${index + 1}`;

  return {
    id: `zip-${index}`,
    title,
    text: removeLeadingTitle(text, title),
  };
}

function isPlainTextChapterTitle(line: string) {
  const title = normalizeText(line);
  if (title.length < 3 || title.length > 80) return false;

  return (
    /^(глава|часть|пролог|эпилог|chapter|part)\b/i.test(title) ||
    /^([ivxlcdm]+|\d+)[.)\s-]+.{0,60}$/i.test(title)
  );
}

function getReadableBookArchiveFiles(zip: JSZip) {
  return Object.values(zip.files)
    .filter((file) => {
      if (file.dir || isHiddenArchivePath(file.name)) return false;

      const extension = getExtension(file.name);
      return (
        extension === "fb2" ||
        extension === "txt" ||
        extension === "md" ||
        extension === "html" ||
        extension === "htm" ||
        extension === "xhtml"
      );
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

function makeContent(title: string, chapters: ReadingChapter[]): ReadingContent {
  const safeChapters = chapters
    .map((chapter, index) => normalizeReadingChapter(chapter, index))
    .filter((chapter) => chapter.text.length > 0);

  const fallbackChapters =
    safeChapters.length > 0
      ? safeChapters
      : [
          {
            id: "empty",
            title: title || UNTITLED_BOOK,
            text: "Не удалось открыть текст книги.",
          },
        ];

  return {
    title: normalizeText(title) || UNTITLED_BOOK,
    chapters: fallbackChapters,
    textLength: fallbackChapters.reduce(
      (sum, chapter) => sum + chapter.text.length,
      0,
    ),
  };
}

function fallbackContent(book: Book): ReadingContent {
  return makeContent(book.title || UNTITLED_BOOK, [
    {
      id: "fallback",
      title: book.title || UNTITLED_BOOK,
      text: "Не удалось открыть текст книги.",
    },
  ]);
}

function normalizeReadingChapter(chapter: ReadingChapter, index: number) {
  const text = normalizeText(chapter.text);
  const rawTitle = normalizeText(chapter.title);
  const generatedTitle = `${UNTITLED_CHAPTER} ${index + 1}`;
  const firstLineTitle = getFirstLineChapterTitle(text);
  const title =
    firstLineTitle && shouldPreferFirstLineTitle(rawTitle, firstLineTitle)
      ? firstLineTitle
      : rawTitle || firstLineTitle || generatedTitle;

  return {
    id: chapter.id || `chapter-${index}`,
    title,
    text,
  };
}

function getFirstLineChapterTitle(text: string) {
  const firstLine = text.split("\n").find((line) => normalizeText(line));
  const normalizedLine = normalizeText(firstLine ?? "");

  if (!normalizedLine || normalizedLine.length > 80) return undefined;
  if (isPlainTextChapterTitle(normalizedLine)) return normalizedLine;
  if (/^(глава|chapter)\s+([ivxlcdm]+|\d+|[а-я]+)\b/i.test(normalizedLine)) {
    return normalizedLine;
  }

  return undefined;
}

function shouldPreferFirstLineTitle(currentTitle: string, firstLineTitle: string) {
  if (!currentTitle) return true;
  if (normalizeServiceText(currentTitle) === normalizeServiceText(firstLineTitle)) {
    return false;
  }

  return /^глава\s+\d+$/i.test(currentTitle) || currentTitle.length > 32;
}

function isReadableChapter(
  title: string,
  text: string,
  path: string | undefined,
  fromToc: boolean,
) {
  if (isServiceDocumentCandidate(title, path ?? "")) return false;
  if (isServiceChapterContent(title, text)) return false;

  return fromToc ? text.length > 0 : text.length > 40;
}

function isServiceChapterContent(title: string, text: string) {
  const normalizedTitle = normalizeServiceText(title);
  const normalizedText = normalizeServiceText(text);
  const compactText = normalizedText.replace(/\s+/g, " ");
  const serviceMarkers = [
    "спасибо что скачали книгу",
    "спасибо за скачивание",
    "бесплатной электронной библиотеке",
    "bookscafe",
    "все книги автора",
    "эта же книга в других форматах",
    "другие книги серии",
    "приятного чтения",
    "скачали на сайте",
    "provided by",
    "downloaded from",
  ];

  if (serviceMarkers.some((marker) => compactText.includes(marker))) {
    return true;
  }

  if (normalizedTitle.includes("аннотац")) return true;
  if (normalizedTitle.includes("содержан") || normalizedTitle.includes("оглавлен")) return true;

  return false;
}

function isServiceDocumentCandidate(title: string, path: string) {
  const fileName = getArchiveFileName(path);
  const fileTitle = fileName ? getTitleFromFileName(fileName) : "";
  const normalizedTitle = normalizeServiceText(title);
  const normalizedFileTitle = normalizeServiceText(fileTitle);
  const normalizedPath = normalizeServiceText(path.replace(/\.[^/.]+$/, ""));
  const haystack = `${normalizedTitle}\n${normalizedFileTitle}\n${normalizedPath}`;
  const exactServiceTitles = new Set([
    "annotation",
    "аннотация",
    "contents",
    "table of contents",
    "toc",
    "оглавление",
    "содержание",
    "cover",
    "обложка",
    "title page",
    "titlepage",
    "титульный лист",
    "copyright",
    "playlist",
    "nav",
  ]);

  if (exactServiceTitles.has(normalizedTitle)) return true;
  if (exactServiceTitles.has(normalizedFileTitle)) return true;

  return (
    /\b(annotation|contents|toc|cover|titlepage|copyright|playlist)\b/.test(haystack) ||
    /\b(notes?|footnotes?|endnotes?)\b/.test(haystack) ||
    haystack.includes("аннотац") ||
    haystack.includes("оглавлен") ||
    haystack.includes("содержан") ||
    haystack.includes("примечан") ||
    haystack.includes("сноск") ||
    haystack.includes("об автор") ||
    haystack.includes("about author") ||
    haystack.includes("about the author")
  );
}

function normalizeServiceText(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zа-я0-9#./ ]+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(value: any): string | undefined {
  return normalizeText(extractXmlText(value)).split("\n").find(Boolean);
}

function extractXmlText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(extractXmlText).filter(Boolean).join("\n");
  if (typeof value !== "object") return "";

  const parts: string[] = [];

  if (typeof value.text === "string" || typeof value.text === "number") {
    parts.push(String(value.text));
  }
  if (typeof value.__text === "string" || typeof value.__text === "number") {
    parts.push(String(value.__text));
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      key === "binary" ||
      key === "image" ||
      key === "annotation" ||
      key === "stylesheet" ||
      key === "title" ||
      key === "text" ||
      key === "__text" ||
      key === "id" ||
      key === "href" ||
      key === "type"
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
  const withoutMarkup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|blockquote|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  return normalizeText(decodeHtmlEntities(withoutMarkup));
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
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
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textValue(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || undefined;
  }
  if (typeof value.text === "string" || typeof value.text === "number") {
    return String(value.text).trim() || undefined;
  }
  if (typeof value.__text === "string" || typeof value.__text === "number") {
    return String(value.__text).trim() || undefined;
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

function resolveArchiveHref(basePath: string, href: string) {
  const path = stripHrefQuery(href).split("#")[0];
  const decodedPath = safeDecodeURIComponent(path);

  if (!decodedPath) return normalizeArchivePath(basePath);

  return normalizeArchivePath(joinArchivePath(dirname(basePath), decodedPath));
}

function stripHrefQuery(href: string) {
  return href.split("#")[0].split("?")[0];
}

function getHrefFragment(href: string) {
  const fragment = href.split("#")[1]?.split("?")[0];

  return fragment ? safeDecodeURIComponent(fragment) : undefined;
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

function sliceHtmlByFragment(
  html: string,
  fragment: string | undefined,
  nextFragment: string | undefined,
) {
  if (!fragment) return html;

  const startIndex = findHtmlAnchorIndex(html, fragment);
  if (startIndex < 0) return html;

  const endIndex = nextFragment
    ? findHtmlAnchorIndex(html, nextFragment, startIndex + 1)
    : -1;

  return html.slice(startIndex, endIndex > startIndex ? endIndex : undefined);
}

function findHtmlAnchorIndex(html: string, fragment: string, fromIndex = 0) {
  const escapedFragment = escapeRegExp(fragment);
  const anchorPattern = new RegExp(
    `<[^>]+(?:id|name)\\s*=\\s*["']${escapedFragment}["'][^>]*>`,
    "i",
  );
  const slicedHtml = html.slice(fromIndex);
  const match = anchorPattern.exec(slicedHtml);

  return match?.index == null ? -1 : fromIndex + match.index;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHiddenArchivePath(path: string) {
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
  const fileName = getArchiveFileName(normalizedPath);

  return normalizedPath.includes("__macosx/") || fileName.startsWith(".");
}

function getArchiveFileName(path: string) {
  return path.split("/").pop() || path;
}

function getExtension(path: string) {
  return path.split(".").pop()?.toLowerCase();
}

function getTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || UNTITLED_BOOK;
}
