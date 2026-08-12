// src/NAYSA Cloud/Lookup/SearchAttachment.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faPaperclip,
  faPlus,
  faDownload,
  faTrash,
  faFile,
  faXmark,
  faEye
} from '@fortawesome/free-solid-svg-icons';

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import SearchPDFReader from './SearchPDFReader';
import {
  useSwalErrorAlert,
  useSwalValidationAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  usehandleFileUpload,
  useHandleFileDelete,
  useHandleFileDownload,
  useHandleFileDownloadAll,
  useFetchTranAtt,
} from '@/NAYSA Cloud/Global/fileManagement';

const SearchAttachment = ({ isOpen, onClose, params }) => {
  // Destructure dynamic labels and values from params (Title removed from UI)
  const {
    DocumentID,
    BranchName,
    DocumentNo,
    DocumentName,
    CodeLabel,
    Code,
    NameLabel,
    Name,
    viewOnly = false,
  } = params || {};

  const finalCode = DocumentNo || Code || "N/A";
  const finalName = DocumentName || Name || "N/A";
  const finalBranchName = BranchName || "N/A";

  const [files, setFiles] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [previewingId, setPreviewingId] = useState(null);
  const [isViewAllLoading, setIsViewAllLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!DocumentID) return;
      try {
        setIsFetching(true);
        const result = await useFetchTranAtt(DocumentID);
        if (!isMounted) return;

        const normalized = Array.isArray(result)
          ? result.map((item) => ({
              id: item.id || item.fileID,
              fileName: item.file_name || item.fileName,
              modifiedDate: item.dateModified ? new Date(item.dateModified) : null,
              uploadedDate: item.dateUploaded ? new Date(item.dateUploaded) : null,
            }))
          : [];
        setFiles(normalized);
      } catch (error) {
        if (isMounted) {
          console.error("❌ Failed to fetch attachments:", error);
          await useSwalErrorAlert("Error", "Failed to load attachments.");
        }
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    if (isOpen) {
      fetchData();
    } else {
      setFiles([]);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, DocumentID]);

  const allowedAttachmentExtensions = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".xls",
    ".xlsx",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".json",
  ];

  const allowedAttachmentTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/csv",
    "application/json",
    "text/json",
  ];

  const allowedAttachmentLabel = "PDF, image, Excel, Word, PowerPoint, text, CSV, or JSON files";

  const isAllowedAttachmentFile = (file) => {
    const fileName = file?.name?.toLowerCase() || "";
    const fileType = file?.type?.toLowerCase() || "";

    return (
      allowedAttachmentTypes.includes(fileType) ||
      allowedAttachmentExtensions.some((extension) => fileName.endsWith(extension))
    );
  };

  const processSelectedFiles = async (rawFiles = []) => {
    if (viewOnly || isUploading) return;

    if (!DocumentID) {
      await useSwalErrorAlert("Error", "Document ID is required before uploading files.");
      return;
    }

    const validFiles = Array.from(rawFiles).filter(isAllowedAttachmentFile);

    if (validFiles.length === 0) {
      await useSwalValidationAlert({
        icon: "info",
        title: "Invalid File",
        message: `Please select or drag ${allowedAttachmentLabel} only.`,
      });
      return;
    }

    if (validFiles.length < rawFiles.length) {
      await useSwalValidationAlert({
        icon: "info",
        title: "Invalid File Skipped",
        message: `Only ${allowedAttachmentLabel} are allowed. Some files were skipped.`,
      });
    }

    setIsUploading(true);

    const selectedFiles = validFiles.map((file) => ({
      file,
      modifiedDate: new Date(file.lastModified),
      uploadedDate: new Date(),
    }));

    try {
      const existingNames = files.map((f) => String(f.fileName || "").toLowerCase());
      const filesToUpload = selectedFiles.filter(
        (f) => !existingNames.includes(f.file.name.toLowerCase())
      );

      if (filesToUpload.length < selectedFiles.length) {
        await useSwalValidationAlert({
          icon: "info",
          title: "Duplicate File",
          message: "Some files were skipped because they already exist.",
        });
      }

      if (filesToUpload.length > 0) {
        const result = await usehandleFileUpload(filesToUpload, DocumentID);
        const normalized = result.data.map((item) => ({
          id: item.id,
          fileName: item.file_name,
          modifiedDate: new Date(item.date_modified),
          uploadedDate: new Date(item.date_uploaded),
        }));
        setFiles((prev) => [...prev, ...normalized]);
      }
    } catch (error) {
      console.error("❌ Upload failed:", error);
      await useSwalErrorAlert("Error", "Failed to upload files.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    await processSelectedFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDragEnter = (e) => {
    if (viewOnly || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    if (viewOnly || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (viewOnly || isUploading) return;
    e.preventDefault();
    e.stopPropagation();

    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    if (viewOnly || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    await processSelectedFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDelete = async (id, fileName) => {
    if (!id) return;

    const confirm = await useSwalDeleteConfirm(
      "Delete File?",
      `Are you sure you want to delete ${fileName}? This action cannot be undone.`
    );
    if (!confirm?.isConfirmed) return;

    setDeletingId(id);
    try {
      await useHandleFileDelete(id);
      setFiles((prev) => prev.filter((file) => file.id !== id));
      await useSwalDeleteRecord("Deleted", "File has been successfully removed.");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      await useSwalErrorAlert("Error", "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  };

  const loadPdfForPreview = async (id, fileName) => {
    const response = await apiClient.get(`/downloadFile/${encodeURIComponent(id)}`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    return {
      id,
      blob,
      url,
      name: fileName,
    };
  };

  const handlePreview = async (id, fileName) => {
    if (!id) return;

    // Basic file type check - PDF Reader is for PDFs
    if (!fileName?.toLowerCase().endsWith(".pdf")) {
      await useSwalErrorAlert("Preview Not Supported","Currently, only PDF files can be previewed. Please download the file to view it.");
      return;
    }

    setPreviewingId(id);
    try {
      const loadedPdf = await loadPdfForPreview(id, fileName);

      setPreviewFile(loadedPdf);
      setPreviewFiles([loadedPdf]);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("❌ Preview failed:", err);
      await useSwalErrorAlert("Preview Failed", "Could not load the file for preview.");
    } finally {
      setPreviewingId(null);
    }
  };

  const handleViewAll = async () => {
    const pdfFiles = files.filter((file) => file.fileName?.toLowerCase().endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      await useSwalErrorAlert("No PDF Found", "There are no PDF attachments available for preview.");
      return;
    }

    setIsViewAllLoading(true);

    try {
      const loadedPdfs = [];

      for (const file of pdfFiles) {
        const loadedPdf = await loadPdfForPreview(file.id, file.fileName);
        loadedPdfs.push(loadedPdf);
      }

      setPreviewFile(loadedPdfs[0] || null);
      setPreviewFiles(loadedPdfs);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("❌ View all preview failed:", err);
      await useSwalErrorAlert("Preview Failed", "Could not load all PDF files for preview.");
    } finally {
      setIsViewAllLoading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    if (!id) return;
    setDownloadingId(id);
    try {
      await useHandleFileDownload(id, fileName);
    } catch (err) {
      console.error("❌ Download failed:", err);
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!DocumentID || files.length === 0) return;
    try {
      await useHandleFileDownloadAll(DocumentID);
    } catch (err) {
      console.error("❌ Download all failed:", err);
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download all files.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
      <div
        className="relative bg-white dark:bg-gray-800 w-full max-w-4xl mx-auto rounded-lg shadow-2xl overflow-hidden transform transition-all sm:my-8 sm:align-middle"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {isDragOver && !viewOnly && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-blue-950/25 backdrop-blur-[1px]">
            <div className="rounded-2xl border-2 border-dashed border-blue-500 bg-white px-8 py-6 text-center shadow-2xl">
              <FontAwesomeIcon icon={faPaperclip} className="mb-3 text-3xl text-blue-600" />
              <div className="text-sm font-semibold text-gray-800">Drop Files to Upload</div>
              <div className="mt-1 text-xs text-gray-500">PDF, image, Excel, Word, PowerPoint, text, CSV, or JSON files</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-100">
            <FontAwesomeIcon icon={faPaperclip} className="text-blue-600 text-lg" />
            <p className="font-bold text-lg">Document Attachments</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faXmark} size="xl" />
          </button>
        </div>

        {/* Transaction Info (Payee Code & Payee Name ONLY) */}
        <div className="p-4 m-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm rounded-lg grid sm:grid-cols-3 gap-4 shadow-sm">
          <p className="flex flex-col">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{CodeLabel || "Branch Name"}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{finalBranchName}</span>
          </p>
          <p className="flex flex-col">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{CodeLabel || "Document No."}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{finalCode}</span>
          </p>
          <p className="flex flex-col">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{NameLabel || "Document Name"}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{finalName}</span>
          </p>
        </div>

        {/* Attachment Details */}
        <div className="flex-grow px-4 pb-4 min-h-[250px] overflow-hidden">
          {isFetching ? (
            <div className="flex items-center justify-center h-full text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">Loading attachments...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <FontAwesomeIcon icon={faFile} size="3x" className="mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No attachments found.</p>
              {!viewOnly && (
                <p className="text-xs mt-1">Click "Add File" below to upload documents.</p>
              )}
            </div>
          ) : (
            <div className="max-h-[300px] mt-0 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-[860px] w-full table-fixed text-sm divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="w-[45%] px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300">File Name</th>
                    <th className="w-[18%] px-2 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Modified Date</th>
                    <th className="w-[18%] px-2 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Uploaded Date</th>
                    <th className="sticky right-0 z-30 w-[140px] min-w-[140px] border-l border-gray-200 bg-gray-100 px-3 py-2.5 text-center font-semibold text-gray-700 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.7)] dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {files.map((item, index) => {
                    const rowBgClass = index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700";

                    return (
                      <tr key={item.id} className={rowBgClass}>
                        <td className="px-3 py-2.5 text-gray-800 dark:text-gray-100 font-medium">
                          <div className="flex min-w-0 items-center space-x-2">
                            <FontAwesomeIcon icon={faFile} className="shrink-0 text-gray-400" />
                            <span className="min-w-0 truncate" title={item.fileName}>{item.fileName}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell text-[11px] whitespace-nowrap">
                          {item.modifiedDate ? item.modifiedDate.toLocaleString() : "-"}
                        </td>
                        <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell text-[11px] whitespace-nowrap">
                          {item.uploadedDate ? item.uploadedDate.toLocaleString() : "-"}
                        </td>
                        <td className={`sticky right-0 z-10 w-[140px] min-w-[140px] border-l border-gray-200 px-3 py-2.5 text-center shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.7)] dark:border-gray-700 ${rowBgClass}`}>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={() => handlePreview(item.id, item.fileName)}
                              title="Preview"
                              disabled={previewingId === item.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-500 transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={previewingId === item.id ? faSpinner : faEye} spin={previewingId === item.id} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(item.id, item.fileName)}
                              title="Download"
                              disabled={downloadingId === item.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-500 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={downloadingId === item.id ? faSpinner : faDownload} spin={downloadingId === item.id} />
                            </button>
                            {!viewOnly && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.fileName)}
                                title="Delete"
                                disabled={deletingId === item.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={deletingId === item.id ? faSpinner : faTrash} spin={deletingId === item.id} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap justify-end gap-2">
            {!viewOnly && (
              <>
                <label
                  htmlFor="fileInput"
                  className={`inline-flex w-[120px] items-center justify-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors duration-200
                    ${isUploading ? 'cursor-not-allowed bg-gray-400 text-gray-800' : 'cursor-pointer bg-blue-600 hover:bg-blue-700'}`}
                >
                  <FontAwesomeIcon icon={isUploading ? faSpinner : faPlus} spin={isUploading} />
                  <span>{isUploading ? 'Uploading...' : 'Add File'}</span>
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.csv,.json"
                  id="fileInput"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </>
            )}
            <button
              type="button"
              onClick={handleViewAll}
              disabled={isViewAllLoading || files.filter((file) => file.fileName?.toLowerCase().endsWith(".pdf")).length === 0}
              className="inline-flex w-[120px] items-center justify-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-800"
            >
              <FontAwesomeIcon icon={isViewAllLoading ? faSpinner : faEye} spin={isViewAllLoading} />
              <span>{isViewAllLoading ? "Loading..." : "View All"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={files.length === 0}
              className="inline-flex w-[120px] items-center justify-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-800"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </div>

      <SearchPDFReader
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
          setPreviewFiles([]);
        }}
        title={previewFiles.length > 1 ? "Attachment Preview - View All" : "Attachment Preview"}
        externalFile={previewFile}
        externalFiles={previewFiles}
      />
    </div>
  );
};

export default SearchAttachment;
