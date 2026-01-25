/**
 * Transcript fetching and parsing service
 * Supports Podcasting 2.0 transcript formats
 *
 * @see https://github.com/Podcastindex-org/podcast-namespace/blob/main/transcripts/transcripts.md
 */

import { getCorsProxyUrl } from '../utils/corsProxy';

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
}

export interface Transcript {
  segments: TranscriptSegment[];
  language?: string;
}

/**
 * Fetch and parse transcript from URL
 * Supports: SRT, VTT, JSON transcript formats
 */
export async function fetchTranscript(transcriptUrl: string): Promise<Transcript | null> {
  try {
    // Try common transcript file extensions first (.vtt, .srt, .json)
    const urlsToTry = [
      transcriptUrl + '.vtt',
      transcriptUrl + '.srt',
      transcriptUrl + '.json',
      transcriptUrl, // Original URL last
    ];

    for (const url of urlsToTry) {
      console.log('[fetchTranscript] Trying URL:', url);
      const proxiedUrl = getCorsProxyUrl(url);

      try {
        const response = await fetch(proxiedUrl);
        console.log('[fetchTranscript] Response status:', response.status, 'for', url);

        if (!response.ok) {
          console.log('[fetchTranscript] Response not OK, trying next URL');
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        console.log('[fetchTranscript] Content-Type:', contentType);

        const text = await response.text();
        console.log('[fetchTranscript] Response text length:', text.length);
        console.log('[fetchTranscript] Response text preview:', text.substring(0, 200));

        // Try to parse HTML transcript as last resort
        if (contentType.includes('html') || text.trim().startsWith('<!DOCTYPE')) {
          console.log('[fetchTranscript] Detected HTML, trying HTML parser');
          const result = parseHtmlTranscript(text);
          if (result.segments.length > 0) {
            console.log('[fetchTranscript] HTML parser found', result.segments.length, 'segments');
            return result;
          }
          console.log('[fetchTranscript] HTML parser found no segments, skipping to next URL');
          continue;
        }

        // Detect format and parse accordingly
        if (contentType.includes('json') || url.endsWith('.json')) {
          console.log('[fetchTranscript] Parsing as JSON');
          const result = parseJsonTranscript(text);
          if (result.segments.length > 0) return result;
          console.log('[fetchTranscript] JSON parse returned no segments, trying next URL');
          continue;
        } else if (url.endsWith('.vtt') || contentType.includes('vtt') || text.includes('WEBVTT')) {
          console.log('[fetchTranscript] Parsing as VTT');
          const result = parseVttTranscript(text);
          if (result.segments.length > 0) return result;
          console.log('[fetchTranscript] VTT parse returned no segments, trying next URL');
          continue;
        } else if (url.endsWith('.srt') || contentType.includes('srt') || text.match(/\d+\n\d{2}:\d{2}:\d{2}/)) {
          console.log('[fetchTranscript] Parsing as SRT');
          const result = parseSrtTranscript(text);
          if (result.segments.length > 0) return result;
          console.log('[fetchTranscript] SRT parse returned no segments, trying next URL');
          continue;
        }

        // Default: try JSON first, then SRT/VTT
        try {
          console.log('[fetchTranscript] Trying JSON parse (default)');
          const result = parseJsonTranscript(text);
          if (result.segments.length > 0) return result;
          console.log('[fetchTranscript] JSON returned no segments');
        } catch (e) {
          console.log('[fetchTranscript] JSON parse failed:', e);
        }

        if (text.includes('WEBVTT')) {
          console.log('[fetchTranscript] Detected WEBVTT, parsing as VTT');
          const result = parseVttTranscript(text);
          if (result.segments.length > 0) return result;
          console.log('[fetchTranscript] VTT returned no segments');
        }

        console.log('[fetchTranscript] Trying SRT parse (fallback)');
        const result = parseSrtTranscript(text);
        console.log('[fetchTranscript] SRT parse result:', result);
        if (result.segments.length > 0) return result;
        console.log('[fetchTranscript] SRT returned no segments, trying next URL');
      } catch (fetchError) {
        console.log('[fetchTranscript] Fetch failed for', url, ':', fetchError);
        continue;
      }
    }

    // All URLs failed
    console.log('[fetchTranscript] All transcript URLs failed');
    return null;
  } catch (e) {
    console.log('[fetchTranscript] Error:', e);
    return null;
  }
}

/**
 * Parse Podcasting 2.0 JSON transcript format
 */
function parseJsonTranscript(text: string): Transcript {
  const data = JSON.parse(text);

  // Handle array format (common in Podcasting 2.0)
  if (Array.isArray(data)) {
    return {
      segments: data.map((item) => ({
        startTime: item.startTime ?? item.start ?? 0,
        endTime: item.endTime ?? item.end ?? item.startTime + 5,
        text: item.body ?? item.text ?? '',
        speaker: item.speaker,
      })),
    };
  }

  // Handle object with segments array
  if (data.segments) {
    return {
      segments: data.segments.map(
        (seg: {
          startTime?: number;
          start?: number;
          endTime?: number;
          end?: number;
          body?: string;
          text?: string;
          speaker?: string;
        }) => ({
          startTime: seg.startTime ?? seg.start ?? 0,
          endTime: seg.endTime ?? seg.end ?? (seg.startTime ?? 0) + 5,
          text: seg.body ?? seg.text ?? '',
          speaker: seg.speaker,
        })
      ),
      language: data.language,
    };
  }

  return { segments: [] };
}

/**
 * Parse VTT (WebVTT) transcript format
 */
function parseVttTranscript(text: string): Transcript {
  const segments: TranscriptSegment[] = [];
  const lines = text.split('\n');

  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip header and empty lines
    if (trimmed === 'WEBVTT' || trimmed === '' || trimmed.startsWith('NOTE')) {
      if (currentText.length > 0) {
        segments.push({
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.join(' ').trim(),
        });
        currentText = [];
      }
      continue;
    }

    // Parse timestamp line: 00:00:00.000 --> 00:00:05.000
    const timestampMatch = trimmed.match(
      /(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    );
    if (timestampMatch) {
      if (currentText.length > 0) {
        segments.push({
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.join(' ').trim(),
        });
        currentText = [];
      }
      currentStart = parseVttTime(timestampMatch.slice(1, 5));
      currentEnd = parseVttTime(timestampMatch.slice(5, 9));
      continue;
    }

    // Skip cue identifiers (lines that are just numbers or identifiers)
    if (/^\d+$/.test(trimmed)) continue;

    // Collect text lines
    if (trimmed) {
      currentText.push(trimmed);
    }
  }

  // Don't forget last segment
  if (currentText.length > 0) {
    segments.push({
      startTime: currentStart,
      endTime: currentEnd,
      text: currentText.join(' ').trim(),
    });
  }

  return { segments };
}

/**
 * Parse SRT transcript format
 */
function parseSrtTranscript(text: string): Transcript {
  const segments: TranscriptSegment[] = [];
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Find timestamp line
    let timestampLine = '';
    let textLines: string[] = [];
    let foundTimestamp = false;

    for (const line of lines) {
      if (!foundTimestamp && line.includes('-->')) {
        timestampLine = line;
        foundTimestamp = true;
      } else if (foundTimestamp) {
        textLines.push(line.trim());
      }
    }

    if (!timestampLine) continue;

    // Parse: 00:00:00,000 --> 00:00:05,000
    const match = timestampLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!match) continue;

    const startTime = parseSrtTime(match.slice(1, 5) as [string, string, string, string]);
    const endTime = parseSrtTime(match.slice(5, 9) as [string, string, string, string]);

    segments.push({
      startTime,
      endTime,
      text: textLines.join(' ').trim(),
    });
  }

  return { segments };
}

function parseVttTime(parts: (string | undefined)[]): number {
  const hours = parts[0] ? parseInt(parts[0].replace(':', ''), 10) : 0;
  const mins = parseInt(parts[1] || '0', 10);
  const secs = parseInt(parts[2] || '0', 10);
  const ms = parseInt(parts[3] || '0', 10);
  return hours * 3600 + mins * 60 + secs + ms / 1000;
}

function parseSrtTime(parts: [string, string, string, string]): number {
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  const secs = parseInt(parts[2], 10);
  const ms = parseInt(parts[3], 10);
  return hours * 3600 + mins * 60 + secs + ms / 1000;
}

/**
 * Parse HTML transcript (e.g., from changelog.com)
 * Extracts speaker names and text from HTML paragraphs
 * Note: HTML transcripts typically don't have timestamps
 */
function parseHtmlTranscript(html: string): Transcript {
  const segments: TranscriptSegment[] = [];

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove all links from the DOM to avoid URL text contamination
  const links = doc.querySelectorAll('a');
  links.forEach(link => {
    // Replace link with its text content (if any)
    const textNode = doc.createTextNode(link.textContent || '');
    link.parentNode?.replaceChild(textNode, link);
  });

  // Try to find transcript content
  // Common patterns: paragraphs with speaker names followed by text
  const paragraphs = doc.querySelectorAll('p');

  let currentTime = 0;
  const estimatedSegmentDuration = 5; // Estimate 5 seconds per segment

  for (const p of paragraphs) {
    let text = p.textContent?.trim();
    if (!text) continue;

    // Clean up text: remove URLs that might still be in the text
    text = text.replace(/https?:\/\/[^\s]+/g, '').trim();

    // Skip if text is too short after cleaning
    if (text.length < 10) continue;

    // Try to extract speaker name (common pattern: "Speaker Name: text")
    const speakerMatch = text.match(/^([^:]+):\s*(.+)/s);

    if (speakerMatch) {
      const speaker = speakerMatch[1].trim();
      const content = speakerMatch[2].trim();

      if (content.length > 10) { // Skip very short segments
        segments.push({
          startTime: currentTime,
          endTime: currentTime + estimatedSegmentDuration,
          text: content,
          speaker: speaker,
        });
        currentTime += estimatedSegmentDuration;
      }
    } else if (text.length > 10) {
      // No speaker pattern found, but we have text
      segments.push({
        startTime: currentTime,
        endTime: currentTime + estimatedSegmentDuration,
        text: text,
      });
      currentTime += estimatedSegmentDuration;
    }
  }

  console.log('[parseHtmlTranscript] Extracted', segments.length, 'segments from HTML');

  return { segments };
}

/**
 * Get the current segment based on playback time
 */
export function getCurrentSegment(
  transcript: Transcript,
  currentTime: number
): TranscriptSegment | null {
  for (const segment of transcript.segments) {
    if (currentTime >= segment.startTime && currentTime < segment.endTime) {
      return segment;
    }
  }
  return null;
}

/**
 * Format time for display (same format as chapters)
 */
export function formatTranscriptTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
