// import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";



// export const usehandleFileUpload = async (files, documentID) => {
//   try {
//     const formData = new FormData();

//     files.forEach((f) => {
//       const fileObj = f.file ? f.file : f;
//       const modifiedDate = f.modifiedDate ? new Date(f.modifiedDate) : new Date();
//       const uploadedDate = f.uploadedDate ? new Date(f.uploadedDate) : new Date();

//       formData.append("files[]", fileObj);
//       formData.append("modifiedDate[]", modifiedDate.toISOString());
//       formData.append("uploadedDate[]", uploadedDate.toISOString());
//     });

//     formData.append("documentID", documentID);

//     const { data: result } = await apiClient.post("/attachFile", formData, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });

//     return result;
//   } catch (error) {
//     console.error("❌ Upload failed:", error);
//     throw error;
//   }
// };




// export const useHandleFileDelete = async (id) => {
//   try {
//     const { data: result } = await apiClient.delete(`/deleteFile/${id}`);
//     return result;
//   } catch (err) {
//     console.error("Delete failed:", err);
//     throw err;
//   }
// };



// export const useHandleFileDownload = async (id) => {
//   try {
//     const response = await apiClient.get(`/downloadFile/${id}`, {
//       responseType: "blob", // 👈 important for file downloads
//     });

//     const blob = response.data;
//     const contentDisposition = response.headers["content-disposition"];
//     let filename = "download";

//     if (contentDisposition) {
//       const filenameMatch = contentDisposition.match(/filename="(.+)"/);
//       if (filenameMatch?.[1]) {
//         filename = filenameMatch[1];
//       }
//     }

//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();

//     window.URL.revokeObjectURL(url);
//     a.remove();

//     return { success: true, message: "Download triggered" };
//   } catch (err) {
//     console.error("❌ Download failed:", err);
//     throw err;
//   }
// };





// export const useHandleFileDownloadAll = async (documentID) => {
//   try {
//     const response = await apiClient.get(`/downloadAll/${documentID}`, {
//       responseType: "blob",
//     });

//     const blob = response.data;

//     // Default filename
//     let filename = `attachments_${documentID}.zip`;

//     // Try to read from response headers (handles both filename and filename*)
//     const cd = response.headers["content-disposition"];
//     if (cd) {
//       const matchQuoted = cd.match(/filename\*?=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
//       const extracted = decodeURIComponent(matchQuoted?.[1] || matchQuoted?.[2] || "");
//       if (extracted) filename = extracted;
//     }

//     // Trigger download
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();

//     window.URL.revokeObjectURL(url);
//     a.remove();

//     return { success: true, message: "All files download triggered" };
//   } catch (err) {
//     console.error("❌ Download all failed:", err);
//     throw err;
//   }
// };





// export const useFetchTranAtt = async (documentID) => {
// if (!documentID || !documentID) {
//     throw new Error("Document ID missing");
//   }

//   try {
//     const response = await fetchData("getAttachFile", { documentID: documentID });
//     if (response.success) {

//      let data = JSON.parse(response.data[0].result || "{}");
//      return data;

  

//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching File Attachment row:", error);
//     return null;
//   }
// };

import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

export const usehandleFileUpload = async (files, documentID) => {
  try {
    const formData = new FormData();

    files.forEach((f) => {
      const fileObj = f.file ? f.file : f;
      const modifiedDate = f.modifiedDate ? new Date(f.modifiedDate) : new Date();
      const uploadedDate = f.uploadedDate ? new Date(f.uploadedDate) : new Date();

      formData.append("files[]", fileObj);
      formData.append("modifiedDate[]", modifiedDate.toISOString());
      formData.append("uploadedDate[]", uploadedDate.toISOString());
    });

    formData.append("documentID", documentID);

    const { data: result } = await apiClient.post("/attachFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return result;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};

export const useHandleFileDelete = async (id) => {
  try {
    const { data: result } = await apiClient.delete(`/deleteFile/${id}`);
    return result;
  } catch (err) {
    console.error("Delete failed:", err);
    throw err;
  }
};

export const useHandleFileDownload = async (id, fallbackName = "download") => {
  try {
    const response = await apiClient.get(`/downloadFile/${id}`, {
      responseType: "blob", 
    });

    let blob = response.data;
    const text = await blob.text();

    // 1. SAFETY CHECK: Did the server send JSON instead of a file?
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      try {
        const jsonData = JSON.parse(text);
        
        // If the backend sent an error message
        if (jsonData.message || jsonData.error) {
          throw new Error(jsonData.message || jsonData.error);
        }

        // If the backend sent the file as a Base64 string inside JSON (e.g., { "file": "JVBER..." })
        const base64Data = jsonData.file || jsonData.data || jsonData.base64;
        if (base64Data) {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray]); // Rebuild the raw file
        } else {
          throw new Error("Server returned JSON, but no file data was found.");
        }
      } catch (e) {
        if (e.message.includes("Server returned JSON")) throw e;
        // Not JSON, just continue
      }
    }

    // EXTRACT FILENAME
    const contentDisposition = response.headers["content-disposition"];
    let filename = fallbackName;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }

    // APPLY MIME TYPE
    const fileType = response.headers['content-type'] || blob.type;
    const secureBlob = new Blob([blob], { type: fileType });

    // TRIGGER DOWNLOAD
    const url = window.URL.createObjectURL(secureBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true, message: "Download triggered" };
  } catch (err) {
    console.error("❌ Download failed:", err);
    throw err;
  }
};

export const useHandleFileDownloadAll = async (documentID) => {
  try {
    const response = await apiClient.get(`/downloadAll/${documentID}`, {
      responseType: "blob",
    });

    const blob = response.data;

    // SAFETY CHECK
    if (blob.type === "application/json" || blob.type.includes("text/html")) {
      const text = await blob.text();
      throw new Error("Server returned an error instead of a ZIP file.");
    }

    let filename = `attachments_${documentID}.zip`;

    // Try to read from response headers (handles both filename and filename*)
    const cd = response.headers["content-disposition"];
    if (cd) {
      const matchQuoted = cd.match(/filename\*?=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const extracted = decodeURIComponent(matchQuoted?.[1] || matchQuoted?.[2] || "");
      if (extracted) filename = extracted;
    }

    // EXCEL/ZIP CORRUPTION FIX: Forcefully apply the ZIP MIME type
    const fileType = response.headers['content-type'] || 'application/zip';
    const secureBlob = new Blob([blob], { type: fileType });

    // TRIGGER DOWNLOAD
    const url = window.URL.createObjectURL(secureBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true, message: "All files download triggered" };
  } catch (err) {
    console.error("❌ Download all failed:", err);
    throw err;
  }
};

export const useFetchTranAtt = async (documentID) => {
  if (!documentID) {
    throw new Error("Document ID missing");
  }

  try {
    const response = await fetchData("getAttachFile", { documentID: documentID });
    if (response.success) {
      let data = JSON.parse(response.data[0].result || "{}");
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching File Attachment row:", error);
    return null;
  }
};