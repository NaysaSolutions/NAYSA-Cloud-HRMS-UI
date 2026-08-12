// src/NAYSA Cloud/Global/AttachFileModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faPlus,
  faTrash,
  faTimes,
  faSpinner,
  faFile
} from "@fortawesome/free-solid-svg-icons";

// 1. IMPORT YOUR CUSTOM NAYSA SWAL BEHAVIORS
import {
  useSwalErrorAlert,
  useSwalValidationAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  usehandleFileUpload,
  useHandleFileDelete,
  useHandleFileDownload,
  useHandleFileDownloadAll,
  useFetchTranAtt,
} from "@/NAYSA Cloud/Global/fileManagement";

const safeText = (v) => (v === null || v === undefined ? "" : String(v));

const AttachFileModal = ({
  isOpen,
  onClose,
  transaction = "Payee Master Data",
  documentNo = "",
  branch = "HO",
  logoSrc = "/public/naysa_logo.png",
}) => {
  const [filterFile, setFilterFile] = useState("");
  const [filterModified, setFilterModified] = useState("");
  const [filterUploaded, setFilterUploaded] = useState("");

  const [files, setFiles] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!documentNo) return;
      try {
        setIsFetching(true);
        const result = await useFetchTranAtt(documentNo);
        if (!isMounted) return;

        const normalized = Array.isArray(result)
          ? result.map((item) => ({
              id: item.id || item.fileID,
              fileName: item.file_name || item.fileName,
              modifiedDate: item.dateModified 
                ? new Date(item.dateModified).toLocaleString() 
                : (item.date_modified ? new Date(item.date_modified).toLocaleString() : ""),
              uploadedDate: item.dateUploaded 
                ? new Date(item.dateUploaded).toLocaleString() 
                : (item.date_uploaded ? new Date(item.date_uploaded).toLocaleString() : ""),
            }))
          : [];
        setFiles(normalized);
      } catch (error) {
        if (isMounted) {
          console.error("❌ Failed to fetch attachments:", error);
          // Standardized Error
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
      setFilterFile("");
      setFilterModified("");
      setFilterUploaded("");
    }
    return () => { isMounted = false; };
  }, [isOpen, documentNo]);

  const handleFileChange = async (e) => {
    setIsUploading(true);
    const selectedFiles = Array.from(e.target.files).map((file) => ({
      file,
      modifiedDate: new Date(file.lastModified),
      uploadedDate: new Date(),
    }));

    if (selectedFiles.length > 0 && documentNo) {
      try {
        const existingNames = files.map(f => f.fileName.toLowerCase());
        const filesToUpload = selectedFiles.filter(
          f => !existingNames.includes(f.file.name.toLowerCase())
        );

        if (filesToUpload.length < selectedFiles.length) {
          // Standardized Info/Warning
          await useSwalValidationAlert({
            icon: "info",
            title: "Duplicate File",
            message: "Some files were skipped because they already exist.",
          });
        }

        if (filesToUpload.length > 0) {
          const result = await usehandleFileUpload(filesToUpload, documentNo);
          const normalized = result.data.map((item) => ({
            id: item.id,
            fileName: item.file_name,
            modifiedDate: new Date(item.date_modified).toLocaleString(),
            uploadedDate: new Date(item.date_uploaded).toLocaleString(),
          }));
          setFiles((prev) => [...prev, ...normalized]);
          
          // Optional: Add a success alert for uploading
          // await useSwalSuccessAlert("Uploaded!", "Files attached successfully.");
        }
      } catch (error) {
        await useSwalErrorAlert("Error", "Failed to upload files.");
      }
    }
    e.target.value = "";
    setIsUploading(false);
  };

  // UPDATED: Now takes the fileName to display in the confirmation box
  const handleDelete = async (id, fileName) => {
    if (!id) return;

    // Standardized Delete Confirmation
    const confirm = await useSwalDeleteConfirm(
      "Delete File?",
      `Are you sure you want to delete ${fileName}? This action cannot be undone.`
    );
    
    if (!confirm?.isConfirmed) return;

    setDeletingId(id);
    try {
      await useHandleFileDelete(id);
      setFiles((prev) => prev.filter((file) => file.id !== id));
      
      // Standardized Delete Success
      await useSwalDeleteRecord("Deleted", "File has been successfully removed.");
    } catch (err) {
      await useSwalErrorAlert("Error", "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id, fileName) => {
    if (!id) return;
    setDownloadingId(id);
    try {
      await useHandleFileDownload(id, fileName);
    } catch (err) {
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!documentNo || files.length === 0) return;
    try {
      await useHandleFileDownloadAll(documentNo);
    } catch (err) {
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download all files.");
    }
  };

  const filteredRows = useMemo(() => {
    const f1 = filterFile.trim().toLowerCase();
    const f2 = filterModified.trim().toLowerCase();
    const f3 = filterUploaded.trim().toLowerCase();

    return files.filter((r) => {
      const fileName = safeText(r.fileName).toLowerCase();
      const modified = safeText(r.modifiedDate).toLowerCase();
      const uploaded = safeText(r.uploadedDate).toLowerCase();

      if (f1 && !fileName.includes(f1)) return false;
      if (f2 && !modified.includes(f2)) return false;
      if (f3 && !uploaded.includes(f3)) return false;
      return true;
    });
  }, [files, filterFile, filterModified, filterUploaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-[980px] max-w-[98vw] rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="NAYSA"
              className="h-10 w-10 object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="leading-tight">
              <div className="text-sm font-bold text-gray-800">
                NAYSA-Solutions, Inc. – Attach Document
              </div>
              <div className="text-xs text-gray-500">
                Manage file attachments for this transaction
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-gray-200 text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* TOP INFO + DOWNLOAD ALL */}
        <div className="px-4 py-3 border-b">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={files.length === 0 || isFetching}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} />
                Download All
              </button>
            </div>
            <div className="text-xs text-gray-700 md:text-right">
              <div className="flex md:justify-end gap-2">
                <span className="font-semibold">Master Data</span>
                <span className="text-blue-700 italic">{safeText(transaction)}</span>
              </div>
              <div className="flex md:justify-end gap-2">
                <span className="font-semibold">Branch</span>
                <span className="text-blue-700 italic">{safeText(branch)}</span>
              </div>
              <div className="flex md:justify-end gap-2">
                <span className="font-semibold">Payee Code</span>
                <span className="text-blue-700 italic">{safeText(documentNo)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[360px] overflow-auto">
              {isFetching ? (
                 <div className="flex items-center justify-center h-48 text-blue-500">
                   <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                   <span className="text-gray-600 font-medium">Loading attachments...</span>
                 </div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="text-gray-700">
                      <th className="p-2 text-left font-semibold border-b border-gray-200">File Name</th>
                      <th className="p-2 text-left font-semibold border-b border-gray-200">Modified Date</th>
                      <th className="p-2 text-left font-semibold border-b border-gray-200">Uploaded Date</th>
                      <th className="p-2 text-center font-semibold border-b border-gray-200 w-24">Actions</th>
                    </tr>
                    <tr className="bg-white">
                      <th className="p-1 border-b border-gray-200">
                        <input
                          className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                          placeholder="Contains:"
                          value={filterFile}
                          onChange={(e) => setFilterFile(e.target.value)}
                        />
                      </th>
                      <th className="p-1 border-b border-gray-200">
                        <input
                          className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                          placeholder="Filter:"
                          value={filterModified}
                          onChange={(e) => setFilterModified(e.target.value)}
                        />
                      </th>
                      <th className="p-1 border-b border-gray-200">
                        <input
                          className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                          placeholder="Filter:"
                          value={filterUploaded}
                          onChange={(e) => setFilterUploaded(e.target.value)}
                        />
                      </th>
                      <th className="p-1 border-b border-gray-200"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="p-2 border-b border-gray-100 flex items-center gap-2">
                          <FontAwesomeIcon icon={faFile} className="text-gray-400" />
                          <span>{safeText(r.fileName)}</span>
                        </td>
                        <td className="p-2 border-b border-gray-100">
                          {safeText(r.modifiedDate)}
                        </td>
                        <td className="p-2 border-b border-gray-100">
                          {safeText(r.uploadedDate)}
                        </td>
                        <td className="p-2 border-b border-gray-100 text-center space-x-3">
                          <button
                            onClick={() => handleDownload(r.id, r.fileName)}
                            disabled={downloadingId === r.id}
                            className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
                            title="Download"
                          >
                            <FontAwesomeIcon icon={downloadingId === r.id ? faSpinner : faDownload} spin={downloadingId === r.id} />
                          </button>
                          
                          {/* UPDATED: Pass fileName to the delete handler for the confirmation popup */}
                          <button
                            onClick={() => handleDelete(r.id, r.fileName)}
                            disabled={deletingId === r.id}
                            className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={deletingId === r.id ? faSpinner : faTrash} spin={deletingId === r.id} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredRows.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                          No attachments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="flex gap-2 mt-3">
            <label
              htmlFor="fileInput"
              className={`px-4 py-2 text-xs font-medium rounded-md cursor-pointer transition-colors duration-150 flex items-center gap-2
                ${isUploading ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-blue-800 text-white hover:bg-blue-700'}`}
            >
              <FontAwesomeIcon icon={isUploading ? faSpinner : faPlus} spin={isUploading} />
              <span>{isUploading ? 'Uploading...' : 'Add'}</span>
            </label>
            <input
              type="file"
              multiple
              id="fileInput"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachFileModal;