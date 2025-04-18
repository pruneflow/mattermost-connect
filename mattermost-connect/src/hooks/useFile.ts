// src/hooks/useFile.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useMattermost } from "../context";
import { assertServiceInitialized } from "../services";

/**
 * Type pour les informations de fichier
 */
export interface FileInfo {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  preview?: string; // URL blob pour la miniature
}

/**
 * Type pour les fichiers en cours de téléchargement
 */
export interface UploadingFile {
  id: string; // ID temporaire local
  file: File;
  progress: number;
  error?: Error;
}

/**
 * Options pour le hook useFile
 */
interface UseFileOptions {
  /** Types de fichiers autorisés (extension ou MIME type) */
  allowedTypes?: string[];

  /** Taille maximum des fichiers en octets */
  maxFileSize?: number;

  /** Nombre maximum de fichiers simultanés */
  maxFiles?: number;

  /** Génère automatiquement des miniatures pour les images */
  generatePreviews?: boolean;

  /** Taille maximum des miniatures en pixels */
  previewSize?: number;

  /** Callback appelé quand un téléchargement est réussi */
  onUploadSuccess?: (fileInfo: FileInfo[]) => void;

  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
}

/**
 * État de retour du hook useFile
 */
interface UseFileState {
  /** Fichiers actuellement sélectionnés pour téléchargement */
  selectedFiles: File[];

  /** Fichiers en cours de téléchargement */
  uploadingFiles: UploadingFile[];

  /** Fichiers téléchargés avec succès */
  uploadedFiles: FileInfo[];

  /** Indique si un téléchargement est en cours */
  isUploading: boolean;

  /** Erreur éventuelle */
  error: Error | null;

  /** Miniatures générées pour les fichiers (si generatePreviews est true) */
  previews: Record<string, string>;
}

/**
 * Hook personnalisé pour gérer les opérations sur les fichiers
 *
 * @param options Options de configuration
 * @returns État et fonctions pour gérer les fichiers
 */
export function useFile(options: UseFileOptions = {}) {
  // Options avec valeurs par défaut
  const {
    allowedTypes,
    maxFileSize,
    maxFiles = 10,
    generatePreviews = true,
    previewSize = 200,
    onUploadSuccess,
    onError,
  } = options;

  // Contexte Mattermost
  const { services } = useMattermost();

  // États locaux
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Référence pour les objets URL créés pour pouvoir les libérer plus tard
  const blobUrlsRef = useRef<string[]>([]);

  // Nettoyer les URL blob à la destruction du composant
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  /**
   * Valide un fichier selon les critères
   */
  const validateFile = useCallback(
    (file: File): Error | null => {
      // Vérifier le type de fichier si des types sont spécifiés
      if (allowedTypes && allowedTypes.length > 0) {
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        const isTypeAllowed = allowedTypes.some((type) => {
          // Vérifier si c'est un type MIME ou une extension
          return type.includes("/")
            ? file.type === type
            : fileExtension === type.toLowerCase();
        });

        if (!isTypeAllowed) {
          return new Error(`Type de fichier non autorisé: ${file.type}`);
        }
      }

      // Vérifier la taille du fichier si une taille maximum est spécifiée
      if (maxFileSize && file.size > maxFileSize) {
        return new Error(
          `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)} Mo (max: ${(maxFileSize / 1024 / 1024).toFixed(2)} Mo)`,
        );
      }

      return null;
    },
    [allowedTypes, maxFileSize],
  );

  /**
   * Génère une miniature pour un fichier image
   */
  const generatePreview = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
          reject(new Error("Pas une image"));
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          if (!e.target?.result) {
            reject(new Error("Échec de lecture du fichier"));
            return;
          }

          // Créer une image pour redimensionner
          const img = new Image();
          img.onload = () => {
            // Calculer les dimensions proportionnelles
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > previewSize) {
                height = Math.round((height * previewSize) / width);
                width = previewSize;
              }
            } else {
              if (height > previewSize) {
                width = Math.round((width * previewSize) / height);
                height = previewSize;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // Dessiner l'image redimensionnée
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Impossible de créer le contexte canvas"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convertir en URL de données
            const dataUrl = canvas.toDataURL(file.type);

            resolve(dataUrl);
          };

          img.onerror = () => {
            reject(new Error("Échec de chargement de l'image"));
          };

          img.src = e.target.result as string;
        };

        reader.onerror = (e) => {
          reject(new Error("Échec de lecture du fichier"));
        };

        reader.readAsDataURL(file);
      });
    },
    [previewSize],
  );

  /**
   * Génère un ID unique temporaire pour un fichier
   */
  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Sélectionne des fichiers pour téléchargement
   */
  const selectFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      setError(null);

      // Convertir FileList en tableau si nécessaire
      const fileArray = Array.from(files);

      // Vérifier si le nombre de fichiers dépasse la limite
      if (selectedFiles.length + fileArray.length > maxFiles) {
        setError(new Error(`Nombre maximum de fichiers dépassé (${maxFiles})`));
        return;
      }

      // Valider chaque fichier
      const validFiles: File[] = [];
      const newPreviews: Record<string, string> = { ...previews };

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          console.warn(
            `Fichier ignoré: ${file.name} - ${validationError.message}`,
          );
          continue;
        }

        validFiles.push(file);

        // Générer les miniatures si nécessaire
        if (generatePreviews && file.type.startsWith("image/")) {
          try {
            const preview = await generatePreview(file);
            const fileId =
              file.name + "_" + file.size + "_" + file.lastModified;
            newPreviews[fileId] = preview;
          } catch (error) {
            console.warn(
              `Impossible de générer une miniature pour ${file.name}:`,
              error,
            );
          }
        }
      }

      // Mettre à jour l'état avec les fichiers valides
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setPreviews(newPreviews);
    },
    [
      selectedFiles,
      maxFiles,
      validateFile,
      generatePreviews,
      generatePreview,
      previews,
    ],
  );

  /**
   * Supprime un fichier sélectionné
   */
  const removeSelectedFile = useCallback(
    (index: number): void => {
      setSelectedFiles((prev) => {
        const newFiles = [...prev];

        // Supprimer la miniature associée si elle existe
        const file = newFiles[index];
        if (file) {
          const fileId = file.name + "_" + file.size + "_" + file.lastModified;
          if (previews[fileId]) {
            setPreviews((prev) => {
              const newPreviews = { ...prev };
              delete newPreviews[fileId];
              return newPreviews;
            });
          }
        }

        newFiles.splice(index, 1);
        return newFiles;
      });
    },
    [previews],
  );

  /**
   * Supprime un fichier téléchargé
   */
  const removeUploadedFile = useCallback(
    (fileId: string): void => {
      // Supprimer des fichiers téléchargés
      setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));

      // Supprimer la miniature du serveur si elle existe
      if (services && services.fileService) {
        // Libérer l'URL de la miniature si elle existe
        const fileInfo = uploadedFiles.find((file) => file.id === fileId);
        if (fileInfo?.preview) {
          services.fileService.revokeObjectURL(fileInfo.preview);
        }
      }
    },
    [services, uploadedFiles],
  );

  /**
   * Efface tous les fichiers sélectionnés
   */
  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);

    // Effacer les miniatures
    if (Object.keys(previews).length > 0) {
      setPreviews({});
    }
  }, [previews]);

  /**
   * Annule tous les téléchargements en cours
   */
  const cancelUploads = useCallback(() => {
    setUploadingFiles([]);
    setIsUploading(false);
  }, []);

  /**
   * Efface tous les fichiers téléchargés
   */
  const clearUploadedFiles = useCallback(() => {
    // Libérer toutes les URL blob des miniatures
    if (services && services.fileService) {
      uploadedFiles.forEach((file) => {
        if (file.preview) {
          services.fileService.revokeObjectURL(file.preview);
        }
      });
    }

    setUploadedFiles([]);
  }, [services, uploadedFiles]);

  /**
   * Télécharge les fichiers sélectionnés vers le serveur
   */
  const uploadFiles = useCallback(async (): Promise<FileInfo[]> => {
    if (!selectedFiles.length) {
      setError(new Error("Aucun fichier sélectionné"));
      return [];
    }

    if (!services || !services.mattermostService) {
      setError(new Error("Service Mattermost non disponible"));
      return [];
    }

    assertServiceInitialized(services.mattermostService, "mattermostService");
    assertServiceInitialized(services.fileService, "fileService");

    // Réinitialiser les erreurs
    setError(null);
    setIsUploading(true);

    // Préparer les fichiers pour le téléchargement
    const tempUploadingFiles: UploadingFile[] = selectedFiles.map((file) => ({
      id: generateTempId(),
      file,
      progress: 0,
    }));

    setUploadingFiles(tempUploadingFiles);

    try {
      // Créer un FormData avec tous les fichiers
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Télécharger les fichiers
      const result = await services.mattermostService.uploadFiles(formData);

      // Traiter les informations de fichier retournées
      const uploadedFileInfos: FileInfo[] = [];

      if (result.file_infos && result.file_infos.length > 0) {
        for (const fileInfo of result.file_infos) {
          const newFileInfo: FileInfo = {
            id: fileInfo.id,
            name: fileInfo.name,
            type: fileInfo.type,
            size: fileInfo.size,
            url: fileInfo.url,
          };

          // Charger la miniature si c'est une image
          if (fileInfo.type?.startsWith("image/")) {
            try {
              const previewUrl = await services.fileService.fetchThumbnail(
                fileInfo.id,
              );
              newFileInfo.preview = previewUrl;

              // Ajouter à la liste des URL blob à libérer plus tard
              blobUrlsRef.current.push(previewUrl);
            } catch (error) {
              console.warn(
                `Impossible de charger la miniature pour ${fileInfo.name}:`,
                error,
              );
            }
          }

          uploadedFileInfos.push(newFileInfo);
        }
      }

      // Mettre à jour l'état
      setUploadedFiles((prev) => [...prev, ...uploadedFileInfos]);

      // Effacer les fichiers sélectionnés
      clearSelectedFiles();

      // Appeler le callback de succès si fourni
      if (onUploadSuccess) {
        onUploadSuccess(uploadedFileInfos);
      }

      return uploadedFileInfos;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error("Erreur lors du téléchargement des fichiers:", errorObj);
      setError(errorObj);

      // Appeler le callback d'erreur si fourni
      if (onError) {
        onError(errorObj);
      }

      return [];
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
    }
  }, [
    selectedFiles,
    services,
    generateTempId,
    clearSelectedFiles,
    onUploadSuccess,
    onError,
  ]);

  /**
   * Télécharge un fichier depuis le serveur
   */
  const downloadFile = useCallback(
    async (fileId: string): Promise<void> => {
      if (!services || !services.fileService) {
        setError(new Error("Service de fichiers non disponible"));
        return;
      }

      assertServiceInitialized(services.fileService, "fileService");

      try {
        await services.fileService.downloadFile(fileId);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error(
          `Erreur lors du téléchargement du fichier ${fileId}:`,
          errorObj,
        );
        setError(errorObj);

        // Appeler le callback d'erreur si fourni
        if (onError) {
          onError(errorObj);
        }
      }
    },
    [services, onError],
  );

  /**
   * Récupère l'URL d'aperçu d'un fichier
   */
  const getFilePreview = useCallback(
    async (fileId: string): Promise<string> => {
      if (!services || !services.fileService) {
        throw new Error("Service de fichiers non disponible");
      }

      assertServiceInitialized(services.fileService, "fileService");

      // Vérifier si le fichier est déjà dans les fichiers téléchargés
      const existingFile = uploadedFiles.find((file) => file.id === fileId);
      if (existingFile && existingFile.preview) {
        return existingFile.preview;
      }

      try {
        const previewUrl = await services.fileService.fetchThumbnail(fileId);

        // Mettre à jour l'aperçu dans le fichier téléchargé si présent
        setUploadedFiles((prev) =>
          prev.map((file) => {
            if (file.id === fileId) {
              return { ...file, preview: previewUrl };
            }
            return file;
          }),
        );

        // Ajouter à la liste des URL blob à libérer plus tard
        blobUrlsRef.current.push(previewUrl);

        return previewUrl;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error(
          `Erreur lors de la récupération de l'aperçu du fichier ${fileId}:`,
          errorObj,
        );
        throw errorObj;
      }
    },
    [services, uploadedFiles],
  );

  /**
   * Récupère l'URL complète d'un fichier
   */
  const getFileUrl = useCallback(
    async (fileId: string): Promise<string> => {
      if (!services || !services.fileService) {
        throw new Error("Service de fichiers non disponible");
      }

      assertServiceInitialized(services.fileService, "fileService");

      try {
        const fileUrl = await services.fileService.fetchFile(fileId);

        // Ajouter à la liste des URL blob à libérer plus tard
        blobUrlsRef.current.push(fileUrl);

        return fileUrl;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error(
          `Erreur lors de la récupération de l'URL du fichier ${fileId}:`,
          errorObj,
        );
        throw errorObj;
      }
    },
    [services],
  );

  /**
   * Crée un lien public pour un fichier
   */
  const createPublicLink = useCallback(
    async (fileId: string): Promise<string> => {
      if (!services || !services.fileService) {
        throw new Error("Service de fichiers non disponible");
      }

      assertServiceInitialized(services.fileService, "fileService");

      try {
        return await services.fileService.createPublicLink(fileId);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error(
          `Erreur lors de la création du lien public pour le fichier ${fileId}:`,
          errorObj,
        );
        throw errorObj;
      }
    },
    [services],
  );

  // État combiné à retourner
  const state: UseFileState = {
    selectedFiles,
    uploadingFiles,
    uploadedFiles,
    isUploading,
    error,
    previews,
  };

  // Retourner l'état et les fonctions
  return {
    ...state,
    selectFiles,
    removeSelectedFile,
    removeUploadedFile,
    clearSelectedFiles,
    cancelUploads,
    clearUploadedFiles,
    uploadFiles,
    downloadFile,
    getFilePreview,
    getFileUrl,
    createPublicLink,
  };
}

export default useFile;
