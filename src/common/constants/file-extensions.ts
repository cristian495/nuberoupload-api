export enum FileCategory { 
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}
export const FILE_EXTENSIONS = {
  [FileCategory.IMAGE]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
  [FileCategory.VIDEO]: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'],
  [FileCategory.DOCUMENT]: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
  [FileCategory.AUDIO]: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma']
} as const;

export const ALL_SUPPORTED_EXTENSIONS = [
  ...FILE_EXTENSIONS.image,
  ...FILE_EXTENSIONS.video,
  ...FILE_EXTENSIONS.document,
  ...FILE_EXTENSIONS.audio
];

// export type FileCategory = keyof typeof FILE_EXTENSIONS;
export type FileExtension = (typeof ALL_SUPPORTED_EXTENSIONS)[number];