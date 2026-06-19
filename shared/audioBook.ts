import type {
  AudioFileFormat,
  AudioTextPosition,
  Book,
  BookAudioChapterMarker,
  BookAudioTrack,
  BookFileFormat,
} from "./types";

export const supportedAudioFormats = [
  "mp3",
  "m4a",
  "m4b",
  "aac",
  "wav",
  "ogg",
  "flac",
  "opus",
  "mp4",
  "mpeg",
  "mpga",
  "webm",
  "aiff",
  "aif",
  "caf",
  "oga",
  "mka",
  "amr",
  "3gp",
  "wma",
] as const satisfies readonly AudioFileFormat[];

const supportedAudioFormatSet = new Set<string>(supportedAudioFormats);

export function getAudioFileFormat(fileName: string): AudioFileFormat | null {
  const extension = getFileExtension(fileName);

  return extension && supportedAudioFormatSet.has(extension)
    ? (extension as AudioFileFormat)
    : null;
}

export function isAudioBookFormat(
  format: BookFileFormat | undefined,
): format is AudioFileFormat {
  return Boolean(format && supportedAudioFormatSet.has(format));
}

export function getBookAudioTracks(book: Book): BookAudioTrack[] {
  const storedTracks = Array.isArray(book.audioTracks)
    ? book.audioTracks.filter((track) => track.uri && track.fileFormat)
    : [];

  if (storedTracks.length > 0) {
    return storedTracks.map((track, index) => ({
      ...track,
      chapterIndex:
        typeof track.chapterIndex === "number" ? track.chapterIndex : index,
      id: track.id || `audio-track-${index}`,
      title: track.title || getTitleFromFileName(track.fileName),
    }));
  }

  const uri = book.audioUri ?? (isAudioBookFormat(book.fileFormat) ? book.fileUri : undefined);
  const fileFormat = book.audioFileFormat ?? (
    isAudioBookFormat(book.fileFormat) ? book.fileFormat : undefined
  );

  if (!uri || !fileFormat) return [];

  const fileName = book.audioFileName ?? book.fileName ?? `${book.title}.${fileFormat}`;

  return [
    {
      durationMillis: book.audioDurationMillis,
      fileFormat,
      fileName,
      fileSize: book.audioFileSize ?? book.fileSize,
      id: "audio-main",
      title: getTitleFromFileName(fileName) || book.title,
      uri,
    },
  ];
}

export function getAudioFormatLabel(book: Book) {
  const tracks = getBookAudioTracks(book);
  const firstFormat = (tracks[0]?.fileFormat ?? book.audioFileFormat ?? book.fileFormat ?? "")
    .toUpperCase();

  if (tracks.length > 1) return `${firstFormat} x${tracks.length}`;
  if (book.audioChapterMarkers?.length) {
    return `${firstFormat} / ${book.audioChapterMarkers.length} ch`;
  }

  return firstFormat;
}

export function getAudioTotalSize(book: Book) {
  const tracks = getBookAudioTracks(book);
  const trackSize = tracks.reduce((sum, track) => sum + (track.fileSize ?? 0), 0);

  return trackSize > 0 ? trackSize : book.audioFileSize ?? book.fileSize;
}

export function getAudioProgressRatio(
  tracks: BookAudioTrack[],
  trackIndex: number,
  positionMillis: number,
  durationMillis: number,
) {
  const localRatio =
    durationMillis > 0
      ? clamp(positionMillis / durationMillis, 0, 1)
      : 0;

  if (tracks.length <= 1) return localRatio;

  const durations = tracks.map((track, index) =>
    index === trackIndex ? durationMillis || track.durationMillis : track.durationMillis,
  );
  const allDurationsKnown = durations.every(
    (duration) => typeof duration === "number" && duration > 0,
  );

  if (allDurationsKnown) {
    const knownDurations = durations as number[];
    const elapsedBeforeTrack = knownDurations
      .slice(0, trackIndex)
      .reduce((sum, duration) => sum + duration, 0);
    const totalDuration = knownDurations.reduce(
      (sum, duration) => sum + duration,
      0,
    );

    return totalDuration > 0
      ? clamp((elapsedBeforeTrack + positionMillis) / totalDuration, 0, 1)
      : 0;
  }

  return clamp((trackIndex + localRatio) / tracks.length, 0, 1);
}

export function buildAudioTextPosition({
  book,
  durationMillis,
  positionMillis,
  trackIndex,
  tracks,
}: {
  book: Book;
  durationMillis: number;
  positionMillis: number;
  trackIndex: number;
  tracks: BookAudioTrack[];
}): AudioTextPosition {
  const progressRatio = getAudioProgressRatio(
    tracks,
    trackIndex,
    positionMillis,
    durationMillis,
  );
  const localRatio =
    durationMillis > 0 ? clamp(positionMillis / durationMillis, 0, 1) : 0;
  const markers = normalizeChapterMarkers(book.audioChapterMarkers);
  const globalPositionMillis = getGlobalPositionMillis(
    tracks,
    trackIndex,
    positionMillis,
  );

  if (markers.length > 0) {
    const markerMatch = findMarkerAtPosition(
      markers,
      globalPositionMillis,
      getKnownTotalDurationMillis(tracks, trackIndex, durationMillis),
    );

    if (markerMatch) {
      return {
        chapterIndex:
          typeof markerMatch.marker.chapterIndex === "number"
            ? markerMatch.marker.chapterIndex
            : markerMatch.index,
        chapterProgressRatio: markerMatch.ratio,
        chapterTitle: markerMatch.marker.title,
        progressRatio,
      };
    }
  }

  if (tracks.length > 1) {
    const track = tracks[trackIndex];

    return {
      chapterIndex:
        typeof track?.chapterIndex === "number" ? track.chapterIndex : trackIndex,
      chapterProgressRatio: localRatio,
      chapterTitle: track?.title,
      progressRatio,
    };
  }

  return { progressRatio };
}

export function mergeTrackDuration(
  tracks: BookAudioTrack[],
  trackId: string,
  durationMillis: number | undefined,
) {
  if (!durationMillis || durationMillis <= 0) return tracks;

  return tracks.map((track) =>
    track.id === trackId ? { ...track, durationMillis } : track,
  );
}

export function getTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function normalizeChapterMarkers(markers: BookAudioChapterMarker[] | undefined) {
  return Array.isArray(markers)
    ? markers
        .filter((marker) => Number.isFinite(marker.startMillis))
        .sort((a, b) => a.startMillis - b.startMillis)
    : [];
}

function findMarkerAtPosition(
  markers: BookAudioChapterMarker[],
  positionMillis: number,
  totalDurationMillis: number | undefined,
) {
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextMarker = markers[index + 1];
    const endMillis =
      marker.endMillis ??
      nextMarker?.startMillis ??
      totalDurationMillis ??
      marker.startMillis;

    if (
      positionMillis >= marker.startMillis &&
      (positionMillis < endMillis || index === markers.length - 1)
    ) {
      return {
        index,
        marker,
        ratio:
          endMillis > marker.startMillis
            ? clamp(
                (positionMillis - marker.startMillis) /
                  (endMillis - marker.startMillis),
                0,
                1,
              )
            : 0,
      };
    }
  }

  return undefined;
}

function getGlobalPositionMillis(
  tracks: BookAudioTrack[],
  trackIndex: number,
  positionMillis: number,
) {
  if (tracks.length <= 1) return positionMillis;

  return tracks
    .slice(0, trackIndex)
    .reduce((sum, track) => sum + (track.durationMillis ?? 0), positionMillis);
}

function getKnownTotalDurationMillis(
  tracks: BookAudioTrack[],
  trackIndex: number,
  durationMillis: number,
) {
  const durations = tracks.map((track, index) =>
    index === trackIndex ? durationMillis || track.durationMillis : track.durationMillis,
  );

  if (!durations.every((duration) => typeof duration === "number" && duration > 0)) {
    return undefined;
  }

  return (durations as number[]).reduce((sum, duration) => sum + duration, 0);
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
