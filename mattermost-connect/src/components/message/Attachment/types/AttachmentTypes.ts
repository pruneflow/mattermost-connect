// src/components/Attachment/attachments/AttachmentTypes.ts
import { SxProps, Theme } from "@mui/material";
import { AttachmentMode } from "../Attachment";
import { MessageAttachment } from "../../../../types";

/**
 * Base props for all attachment types
 */
export interface BaseAttachmentProps {
  /** The file to display */
  file: File | MessageAttachment;

  /** Mode of the attachment component */
  mode?: AttachmentMode;

  /** Additional styling */
  sx?: SxProps<Theme>;

  /** Icon styling */
  iconSx?: SxProps<Theme>;

  /** Fixed width of the component (default 240px) */
  width?: string | number;
}

/**
 * Props specific to MESSAGE mode
 */
export interface MessageAttachmentProps extends BaseAttachmentProps {
  mode?: AttachmentMode.MESSAGE;

  /** Optional click handler */
  onClick?: (file: MessageAttachment) => void;
}

/**
 * Props specific to PREVIEW mode
 */
export interface PreviewAttachmentProps extends BaseAttachmentProps {
  mode?: AttachmentMode.PREVIEW;

  /** Handler to remove the attachment */
  onRemove?: () => void;

  /** Whether the file is currently uploading */
  isUploading?: boolean;

  /** Whether the file has been uploaded to the server */
  isUploaded?: boolean;
}

/**
 * Props for document type attachments (zip, odt, etc.)
 */
export interface ArchiveAttachmentProps extends BaseAttachmentProps {
  /** File name */
  fileName: string;

  /** File size in bytes */
  fileSize?: number;

  /** Custom handling for document click */
  onArchiveClick?: () => void;
}

/**
 * Props for pdf type attachments
 */
export interface PdfAttachmentProps extends BaseAttachmentProps {
  /** File name */
  fileName: string;

  /** File size in bytes */
  fileSize?: number;

  /** Custom handling for document click */
  onPdfClick?: () => void;
}

/**
 * Props for image type attachments
 */
export interface ImageAttachmentProps extends BaseAttachmentProps {
  /** Thumbnail URL */
  thumbnailUrl: string | null;

  fileName?: string;

  /** Whether there was an error loading the thumbnail */
  thumbnailError: boolean;

  setThumbnailError: (error: boolean) => void;

  /** Custom handling for image click */
  onImageClick?: () => void;
}

/**
 * Union type for all attachment props
 */
export type AttachmentProps = MessageAttachmentProps | PreviewAttachmentProps;
