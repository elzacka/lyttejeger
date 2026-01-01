/**
 * Transcript Service
 * Supports Podcasting 2.0 transcript formats: SRT, VTT, JSON
 */

export interface TranscriptSegment {
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  speaker?: string;
}

export interface Transcript {
  segments: TranscriptSegment[];
  language?: string;
  format: 'srt' | 'vtt' | 'json' | 'unknown';
}

// Parse SRT format
function parseSRT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // Second line is timing: 00:00:00,000 --> 00:00:03,500
    const timingLine = lines[1];
    const timingMatch = timingLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );

    if (!timingMatch) continue;

    const startTime =
      parseInt(timingMatch[1]) * 3600 +
      parseInt(timingMatch[2]) * 60 +
      parseInt(timingMatch[3]) +
      parseInt(timingMatch[4]) / 1000;

    const endTime =
      parseInt(timingMatch[5]) * 3600 +
      parseInt(timingMatch[6]) * 60 +
      parseInt(timingMatch[7]) +
      parseInt(timingMatch[8]) / 1000;

    // Remaining lines are text
    const text = lines.slice(2).join(' ').trim();

    if (text) {
      segments.push({ startTime, endTime, text });
    }
  }

  return segments;
}

// Parse VTT format
function parseVTT(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Remove WEBVTT header and any metadata
  const lines = content.split('\n');
  let i = 0;

  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    // Look for timing line
    const timingMatch =
      line.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/) ||
      line.match(/(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2})[.,](\d{3})/);

    if (timingMatch) {
      let startTime: number;
      let endTime: number;

      if (timingMatch.length === 9) {
        // HH:MM:SS.mmm format
        startTime =
          parseInt(timingMatch[1]) * 3600 +
          parseInt(timingMatch[2]) * 60 +
          parseInt(timingMatch[3]) +
          parseInt(timingMatch[4]) / 1000;
        endTime =
          parseInt(timingMatch[5]) * 3600 +
          parseInt(timingMatch[6]) * 60 +
          parseInt(timingMatch[7]) +
          parseInt(timingMatch[8]) / 1000;
      } else {
        // MM:SS.mmm format
        startTime =
          parseInt(timingMatch[1]) * 60 +
          parseInt(timingMatch[2]) +
          parseInt(timingMatch[3]) / 1000;
        endTime =
          parseInt(timingMatch[4]) * 60 +
          parseInt(timingMatch[5]) +
          parseInt(timingMatch[6]) / 1000;
      }

      // Collect text lines until empty line or next timing
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
        // Remove VTT tags like <v Speaker>
        const cleanLine = lines[i].replace(/<[^>]+>/g, '').trim();
        if (cleanLine) textLines.push(cleanLine);
        i++;
      }

      const text = textLines.join(' ').trim();
      if (text) {
        segments.push({ startTime, endTime, text });
      }
    } else {
      i++;
    }
  }

  return segments;
}

// Parse JSON transcript format (Podcasting 2.0)
interface JSONTranscriptSegment {
  startTime: number;
  endTime: number;
  body?: string;
  text?: string;
  speaker?: string;
}

function parseJSON(content: string): TranscriptSegment[] {
  try {
    const data = JSON.parse(content);

    // Handle different JSON formats
    const segments: JSONTranscriptSegment[] = data.segments || data.cues || data;

    if (!Array.isArray(segments)) return [];

    return segments.map((seg) => ({
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.body || seg.text || '',
      speaker: seg.speaker,
    }));
  } catch {
    return [];
  }
}

// Detect format and parse
function parseTranscript(content: string, url: string): Transcript {
  const lowerUrl = url.toLowerCase();
  let format: Transcript['format'] = 'unknown';
  let segments: TranscriptSegment[] = [];

  if (lowerUrl.endsWith('.srt') || content.match(/^\d+\n\d{2}:\d{2}:\d{2}/m)) {
    format = 'srt';
    segments = parseSRT(content);
  } else if (lowerUrl.endsWith('.vtt') || content.startsWith('WEBVTT')) {
    format = 'vtt';
    segments = parseVTT(content);
  } else if (
    lowerUrl.endsWith('.json') ||
    content.trim().startsWith('{') ||
    content.trim().startsWith('[')
  ) {
    format = 'json';
    segments = parseJSON(content);
  } else {
    // Try each parser
    segments = parseVTT(content);
    if (segments.length > 0) {
      format = 'vtt';
    } else {
      segments = parseSRT(content);
      if (segments.length > 0) {
        format = 'srt';
      } else {
        segments = parseJSON(content);
        if (segments.length > 0) {
          format = 'json';
        }
      }
    }
  }

  return { segments, format };
}

// Fetch and parse transcript
export async function fetchTranscript(url: string): Promise<Transcript | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const content = await response.text();
    return parseTranscript(content, url);
  } catch {
    return null;
  }
}

// Format time for display
export function formatTranscriptTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Find segment at given time
export function findSegmentAtTime(
  segments: TranscriptSegment[],
  time: number
): TranscriptSegment | null {
  return segments.find((seg) => time >= seg.startTime && time <= seg.endTime) || null;
}

// Search within transcript
export function searchTranscript(
  segments: TranscriptSegment[],
  query: string
): TranscriptSegment[] {
  const lowerQuery = query.toLowerCase();
  return segments.filter((seg) => seg.text.toLowerCase().includes(lowerQuery));
}
