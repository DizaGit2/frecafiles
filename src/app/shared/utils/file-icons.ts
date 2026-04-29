export interface FileTypeInfo {
  icon: string;
  color: string;
  label: string;
}

const TONE_DOC = 'var(--freca-gold)';
const TONE_STRUCTURED = 'var(--freca-gold-soft)';
const TONE_MEDIA = 'var(--freca-cream)';
const TONE_BINARY = 'var(--freca-ash-strong)';

const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  pdf:  { icon: 'picture_as_pdf', color: TONE_DOC,        label: 'PDF' },
  doc:  { icon: 'description',    color: TONE_DOC,        label: 'DOC' },
  docx: { icon: 'description',    color: TONE_DOC,        label: 'DOCX' },
  txt:  { icon: 'article',        color: TONE_DOC,        label: 'TXT' },
  csv:  { icon: 'table_chart',    color: TONE_DOC,        label: 'CSV' },

  xls:  { icon: 'grid_on',        color: TONE_STRUCTURED, label: 'XLS' },
  xlsx: { icon: 'grid_on',        color: TONE_STRUCTURED, label: 'XLSX' },
  ppt:  { icon: 'slideshow',      color: TONE_STRUCTURED, label: 'PPT' },
  pptx: { icon: 'slideshow',      color: TONE_STRUCTURED, label: 'PPTX' },

  jpg:  { icon: 'image',          color: TONE_MEDIA,      label: 'JPG' },
  jpeg: { icon: 'image',          color: TONE_MEDIA,      label: 'JPEG' },
  png:  { icon: 'image',          color: TONE_MEDIA,      label: 'PNG' },
  webp: { icon: 'image',          color: TONE_MEDIA,      label: 'WEBP' },
  gif:  { icon: 'gif',            color: TONE_MEDIA,      label: 'GIF' },
  svg:  { icon: 'image',          color: TONE_MEDIA,      label: 'SVG' },

  mov:  { icon: 'movie',          color: TONE_BINARY,     label: 'MOV' },
  mp4:  { icon: 'movie',          color: TONE_BINARY,     label: 'MP4' },
  avi:  { icon: 'movie',          color: TONE_BINARY,     label: 'AVI' },
  mp3:  { icon: 'audiotrack',     color: TONE_BINARY,     label: 'MP3' },
  wav:  { icon: 'audiotrack',     color: TONE_BINARY,     label: 'WAV' },
  ai:   { icon: 'design_services',color: TONE_BINARY,     label: 'AI' },
  psd:  { icon: 'brush',          color: TONE_BINARY,     label: 'PSD' },
  zip:  { icon: 'folder_zip',     color: TONE_BINARY,     label: 'ZIP' },
  rar:  { icon: 'folder_zip',     color: TONE_BINARY,     label: 'RAR' },
};

const DEFAULT_FILE_TYPE: FileTypeInfo = { icon: 'insert_drive_file', color: TONE_BINARY, label: 'FILE' };

const PREVIEWABLE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'] as const;

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function getFileTypeInfo(filename: string): FileTypeInfo {
  const ext = getFileExtension(filename);
  return FILE_TYPE_MAP[ext] || { ...DEFAULT_FILE_TYPE, label: ext.toUpperCase() || 'FILE' };
}

export function isPreviewableFile(filename: string): boolean {
  return (PREVIEWABLE_EXTENSIONS as readonly string[]).includes(getFileExtension(filename));
}
