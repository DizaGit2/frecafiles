export interface FileTypeInfo {
  icon: string;
  color: string;
  label: string;
}

const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  pdf:  { icon: 'picture_as_pdf', color: '#ef5350', label: 'PDF' },
  jpg:  { icon: 'image', color: '#42a5f5', label: 'JPG' },
  jpeg: { icon: 'image', color: '#42a5f5', label: 'JPEG' },
  png:  { icon: 'image', color: '#66bb6a', label: 'PNG' },
  webp: { icon: 'image', color: '#ab47bc', label: 'WEBP' },
  gif:  { icon: 'gif', color: '#ff7043', label: 'GIF' },
  svg:  { icon: 'image', color: '#ff7043', label: 'SVG' },
  mov:  { icon: 'movie', color: '#ec407a', label: 'MOV' },
  mp4:  { icon: 'movie', color: '#ec407a', label: 'MP4' },
  avi:  { icon: 'movie', color: '#ec407a', label: 'AVI' },
  mp3:  { icon: 'audiotrack', color: '#ab47bc', label: 'MP3' },
  wav:  { icon: 'audiotrack', color: '#ab47bc', label: 'WAV' },
  ai:   { icon: 'design_services', color: '#ff9800', label: 'AI' },
  psd:  { icon: 'brush', color: '#29b6f6', label: 'PSD' },
  doc:  { icon: 'description', color: '#5c6bc0', label: 'DOC' },
  docx: { icon: 'description', color: '#5c6bc0', label: 'DOCX' },
  xls:  { icon: 'grid_on', color: '#66bb6a', label: 'XLS' },
  xlsx: { icon: 'grid_on', color: '#66bb6a', label: 'XLSX' },
  ppt:  { icon: 'slideshow', color: '#ef5350', label: 'PPT' },
  pptx: { icon: 'slideshow', color: '#ef5350', label: 'PPTX' },
  zip:  { icon: 'folder_zip', color: '#ffa726', label: 'ZIP' },
  rar:  { icon: 'folder_zip', color: '#ffa726', label: 'RAR' },
  txt:  { icon: 'article', color: '#78909c', label: 'TXT' },
  csv:  { icon: 'table_chart', color: '#26a69a', label: 'CSV' },
};

const DEFAULT_FILE_TYPE: FileTypeInfo = { icon: 'insert_drive_file', color: '#78909c', label: 'FILE' };

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
