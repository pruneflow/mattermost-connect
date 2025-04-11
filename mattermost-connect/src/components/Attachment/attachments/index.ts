// src/components/Attachment/attachments/index.ts
export * from "./AttachmentTypes";
export { default as ImageAttachment } from "./ImageAttachment";
export { default as DocumentAttachment } from "./DocumentAttachment";
export { default as MediaAttachment } from "./MediaAttachment";
export { default as GenericAttachment } from "./GenericAttachment";

// Utility functions for attachment type checking
export const isImageType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("image") ||
    (fileName ? /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(fileName) : false)
  );
};

export const isDocumentType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("pdf") ||
    type.includes("text") ||
    (fileName
      ? /\.(pdf|txt|md|rtf|doc|docx|js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/i.test(
          fileName,
        )
      : false)
  );
};

export const isMediaType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("video") ||
    type.includes("audio") ||
    (fileName
      ? /\.(mp4|mov|avi|webm|mp3|wav|ogg|flac)$/i.test(fileName)
      : false)
  );
};

export const isArchiveType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("zip") ||
    type.includes("archive") ||
    (fileName ? /\.(zip|rar|7z|tar|gz)$/i.test(fileName) : false)
  );
};
