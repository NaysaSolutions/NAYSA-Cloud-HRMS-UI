import { apiClient, getApiErrorMessage, postPdfRequest, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { useTopDocControlRow,useTopHSRptRow } from '@/NAYSA Cloud/Global/top1RefTable';
import { formatNumber, useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const showPrintError = (error) => {
  const message = getApiErrorMessage(error);
  console.error("Error printing report:", error);
  return useSwalErrorAlert("Printing Error", message);
};

const openPdfPreview = (pdfBlob) => {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  let previewWindow = null;

  const handleViewerReady = (event) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== previewWindow ||
      event.data?.type !== "naysa-pdf-viewer-ready"
    ) {
      return;
    }

    previewWindow.postMessage(
      { type: "naysa-pdf-viewer-data", blob: pdfBlob },
      window.location.origin
    );
    window.removeEventListener("message", handleViewerReady);
  };

  window.addEventListener("message", handleViewerReady);
  previewWindow = window.open(`${base}pdf-viewer`, "_blank");

  if (!previewWindow) {
    window.removeEventListener("message", handleViewerReady);
    throw new Error("The report is ready, but the preview was blocked. Please allow popups for this site and try again.");
  }

  setTimeout(
    () => window.removeEventListener("message", handleViewerReady),
    60000
  );
};


export function injectLoadingSpinner(printWindow) {
  if (!printWindow || !printWindow.document) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Preparing Document...</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #eef2f3, #d9e2ec);
            color: #333;
          }
          .spinner {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 6px solid transparent;
            border-top: 6px solid #4a90e2;
            border-left: 6px solid #6fb1fc;
            background: linear-gradient(145deg, #ffffff, #cfd9df);
            box-shadow:
              inset 2px 2px 4px rgba(0,0,0,0.15),
              inset -2px -2px 4px rgba(255,255,255,0.6),
              0 0 12px rgba(74,144,226,0.4);
            animation: spin 1s linear infinite;
            margin-bottom: 18px;
          }
          .caption {
            font-size: 1rem;
            font-weight: 500;
            opacity: 0.85;
            letter-spacing: 0.4px;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div class="caption">Preparing document...</div>
      </body>
    </html>
  `);
}







export async function useHandlePrint(documentID, docCode, printMode, userCode) {
  try {
    const responseDocControl = await useTopDocControlRow(docCode);
    const formName = responseDocControl?.formName;

    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { tranId: documentID, formName, docCode, printMode ,userCode};
        console.log("Received PDF blob:", payload);
    const pdfBlob = await postPdfRequest("/printForm", payload);


    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);

  } catch (error) {
    showPrintError(error);
  }
}


// export async function useHandlePrint(documentID, docCode, printMode, userCode) {
//   let printWindow = null;

//   try {
//     printWindow = window.open("", "_blank");

//     if (!printWindow) {
//       throw new Error("Popup blocked — please allow popups for this site.");
//     }

//     injectLoadingSpinner(printWindow);

//     const responseDocControl = await useTopDocControlRow(docCode);
//     const formName = responseDocControl?.formName;

//     if (!formName) {
//       throw new Error("Report Name not defined");
//     }

//     const payload = {
//       tranId: documentID,
//       formName,
//       docCode,
//       printMode,
//       userCode,

//       // Optional but recommended if your Laravel/API accepts it.
//       // If reportCode is blank, Laravel can still resolve from formName.
//       reportCode: responseDocControl?.reportCode || "",
//     };

//     console.log("Opening DXR viewer:", payload);

//     const res = await postRequest("open-dxr-viewer", payload);

//     const viewerUrl =
//       res?.data?.viewerUrl ||
//       res?.Data?.viewerUrl ||
//       res?.viewerUrl ||
//       res?.data?.data?.viewerUrl;

//     if (!viewerUrl) {
//       console.error("Invalid open-dxr-viewer response:", res);
//       throw new Error("DevExpress viewer URL was not returned.");
//     }

//     printWindow.location.href = viewerUrl;
//   } catch (error) {
//     console.error("Error opening DevExpress report viewer:", error);

//     if (printWindow && !printWindow.closed) {
//       printWindow.document.open();
//       printWindow.document.write(`
//         <html>
//           <head>
//             <title>Report Error</title>
//             <style>
//               body {
//                 font-family: Segoe UI, Tahoma, sans-serif;
//                 padding: 30px;
//                 color: #991b1b;
//               }
//             </style>
//           </head>
//           <body>
//             <h3>Unable to open report viewer</h3>
//             <p>${error?.message || "Unknown error"}</p>
//           </body>
//         </html>
//       `);
//       printWindow.document.close();
//     }
//   }
// }






export async function useHandlePrintQuery(formName, userCode,params) {
  try {
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { formName ,userCode,params};
    console.log(payload)
    const pdfBlob = await postPdfRequest("/printQuery", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);

  } catch (error) {
    showPrintError(error);
  }
}







export async function useHandlePrintARReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sCustCode: params.sCustCode,
              eCustCode: params.eCustCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };

   

    const pdfBlob = await postPdfRequest("/printARReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);

  } catch (error) {
    showPrintError(error);
  }
}








export async function useHandleDownloadExcelARReport(params) {
  const { mode, branchCode, startDate, endDate, sCustCode, eCustCode } = params;

  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode,
        branchcode: branchCode,
        startdate: startDate,
        enddate: endDate,
        scustomer: sCustCode,
        ecustomer: eCustCode
      })
    };

    return await postRequest("getARReport", payload);
  } catch (error) {
    console.error("Error downloading AR report:", error);
    return { Data: {} }; 
  }
}







export async function useHandlePrintAPReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sPayee: params.sVendCode,
              ePayee: params.eVendCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };
  

    const pdfBlob = await postPdfRequest("/printAPReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);

  } catch (error) {
    showPrintError(error);
  }
}







export async function useHandleDownloadExcelAPReport(params) {
  const {
    mode,
    branchCode,
    startDate,
    endDate,
    sPayeeCode,
    ePayeeCode,
  } = params;

  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode,
        branchCode,
        startDate,
        endDate,
        sPayeeCode,
        ePayeeCode,
      })
    };

    return await postRequest("getAPReport", payload);
  } catch (error) {
    console.error("Error downloading AP report:", error);
    return { Data: {} }; 
  }
}


export async function useHandlePrintFGINVReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      itemCode: params.itemCode,
      whCode: params.whCode,
      locCode: params.locCode,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printFGINVReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}


export async function useHandleDownloadExcelFGINVReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchCode: params.branchCode,
        startDate: params.startDate,
        endDate: params.endDate,
        itemCode: params.itemCode,
        whCode: params.whCode,
        locCode: params.locCode,
      })
    };

    return await postRequest("getFGINVReport", payload);
  } catch (error) {
    console.error("Error downloading FG inventory report:", error);
    return { Data: {} };
  }
}


export async function useHandlePrintMSINVReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      itemCode: params.itemCode,
      whCode: params.whCode,
      locCode: params.locCode,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printMSINVReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}


export async function useHandleDownloadExcelMSINVReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchCode: params.branchCode,
        startDate: params.startDate,
        endDate: params.endDate,
        itemCode: params.itemCode,
        whCode: params.whCode,
        locCode: params.locCode,
      })
    };

    return await postRequest("getMSINVReport", payload);
  } catch (error) {
    console.error("Error downloading MS inventory report:", error);
    return { Data: {} };
  }
}


export async function useHandlePrintRMINVReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      itemCode: params.itemCode,
      whCode: params.whCode,
      locCode: params.locCode,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printRMINVReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}


export async function useHandleDownloadExcelRMINVReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchCode: params.branchCode,
        startDate: params.startDate,
        endDate: params.endDate,
        itemCode: params.itemCode,
        whCode: params.whCode,
        locCode: params.locCode,
      })
    };

    return await postRequest("getRMINVReport", payload);
  } catch (error) {
    console.error("Error downloading RM inventory report:", error);
    return { Data: {} };
  }
}



export async function useHandleDownloadExcelPURReport(params) {
  const { mode, branchCode, startDate, endDate, payeeCode, rcCode } = params;
  try {

    const payload = {
      PARAMS: JSON.stringify({
        mode,
        branchCode,
        startDate,
        endDate,
        payeeCode: payeeCode,
        rcCode: rcCode,      
      }),
    };

    return await postRequest("getPURReport", payload);
  } catch (error) {
    console.error("Error downloading Purchasing report:", error);
    return { Data: {} };
  }
}


export async function useHandleDownloadExcelFAReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchcode: params.branchCode,
        startdate: params.startDate,
        enddate: params.endDate,
        categCode: params.categCode,
        classCode: params.classCode,
        rcCode: params.rcCode,
        locCode: params.locCode,
        faCode: params.faCode,
      }),
    };

    return await postRequest("getFAReport", payload);
  } catch (error) {
    console.error("Error downloading Fixed Asset report:", error);
    return { Data: {} };
  }
}


export async function useHandlePrintFAReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      categCode: params.categCode,
      classCode: params.classCode,
      rcCode: params.rcCode,
      locCode: params.locCode,
      faCode: params.faCode,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printFAReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}




export async function useHandleDownloadExcelIMPReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchcode: params.branchCode,
        startdate: params.startDate,
        enddate: params.endDate,
        payeecode: params.payeeCode || params.vendCode,
        rcCode: params.rcCode || params.departmentCode,
      }),
    };

    return await postRequest("getIMPReport", payload);
  } catch (error) {
    console.error("Error downloading Importation report:", error);
    return { Data: {} };
  }
}



export async function useHandleDownloadExcelSalesReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchcode: params.branchCode,
        startdate: params.startDate,
        enddate: params.endDate,
        custCode: params.custCode || params.customerCode || params.sCustCode,
        itemCode: params.itemCode || params.sCode,
        chainCustomer: params.chainCustomer || params.chainCode,
      }),
    };

    return await postRequest("getSalesReport", payload);
  } catch (error) {
    console.error("Error downloading Sales report:", error);
    return { Data: {} };
  }
}


export async function useHandlePrintSalesReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      custCode: params.custCode || params.customerCode || params.sCustCode,
      itemCode: params.itemCode || params.sCode,
      chainCustomer: params.chainCustomer || params.chainCode,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printSalesReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}



export async function useHandleDownloadExcelBUDReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchcode: params.branchCode,
        startdate: params.startDate,
        enddate: params.endDate,
        budgetYear: params.budgetYear,
        cutoffCode: params.cutoffCode,
        budgetCode: params.budgetCode,
        acctCode: params.acctCode || params.accountCode,
        rcCode: params.rcCode || params.departmentCode,
        groupBy: params.groupBy || "ACCOUNT_RC",
        monthlyView: params.monthlyView || "BUDGET",
      }),
    };

    return await postRequest("getBudgetReport", payload);
  } catch (error) {
    console.error("Error downloading Budget report:", error);
    return { Data: {} };
  }
}


export async function useHandlePrintBUDReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      budgetYear: params.budgetYear,
      cutoffCode: params.cutoffCode,
      budgetCode: params.budgetCode,
      acctCode: params.acctCode || params.accountCode,
      rcCode: params.rcCode || params.departmentCode,
      groupBy: params.groupBy || "ACCOUNT_RC",
      monthlyView: params.monthlyView || "BUDGET",
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printBudgetReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}



export async function useHandlePrintPRDReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      invType: params.invType,
      itemCode: params.itemCode,
      woNo: params.woNo,
      reportName: formName,
      sprocMode: "",
      sprocName: "",
      export: "",
    };

    const pdfBlob = await postPdfRequest("/printPRDReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);
  } catch (error) {
    showPrintError(error);
  }
}

export async function useHandleDownloadExcelPRDReport(params) {
  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode: params.mode,
        branchcode: params.branchCode,
        startdate: params.startDate,
        enddate: params.endDate,
        invtype: params.invType,
        itemcode: params.itemCode,
        wono: params.woNo,
      }),
    };

    return await postRequest("getPRDReport", payload);
  } catch (error) {
    console.error("Error downloading Production report:", error);
    return { Data: {} };
  }
}


export async function useHandleDownloadExcelBIRReport(params) {
  const { branchCode, sCutOff, eCutOff, userName, mode } = params;

  try {
    const payload = {
      PARAMS: JSON.stringify({
        json_data:{
          branchCode: params.branchCode,
          startingCutoff: params.sCutOff,
          endingCutoff: params.eCutOff,
          userName: params.userName,
          books: params.mode,
        }  
      })
    };

    return await postRequest("generateBIRBooks", payload);
  } catch (error) {
    console.error("Error downloading AP report:", error);
    return { Data: {} }; 
  }
}





export async function useHandlePrintGLReport(params) {
  try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sGL: params.sAcctCode,
              eGL: params.eAcctCode,
              sSL: params.sSLCode,
              eSL: params.eSLCode,
              sRC: params.sRCCode,
              eRC: params.eRCCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };

        console.log(JSON.stringify(payload))

    const pdfBlob = await postPdfRequest("/printGLReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    openPdfPreview(pdfBlob);

  } catch (error) {
    showPrintError(error);
  }
}








export async function useHandleDownloadExcelGLReport(params) {
  const { mode, branchCode, startDate, endDate, sGL, eGL,sRC,eRC,sSL,eSL} = params;

  try {
    const payload = {
      PARAMS: JSON.stringify({
        mode,
        branchCode: params.branchCode,
        startDate: params.startDate,
        endDate: params.endDate,
        sGL: params.sGL,
        eGL: params.eGL,
        sSL:params.sSL,
        eSL:params.eSL,
        sRC:params.sRC,
        eRC:params.eRC
      })
    };

    return await postRequest("getGLReport", payload);
  } catch (error) {
    console.error("Error downloading AP report:", error);
    return { Data: {} }; 
  }
}






export function exportToTabbedJson(jsonSheets = []) {
  const data = {};
  for (const tab of jsonSheets) {
    const key = tab.sheetName || "Sheet";
    data[key] = Array.isArray(tab.rows) ? tab.rows : [];
  }
  return { Data: data };
}




export function exportBuildJsonSheets(sheetConfigs = []) {
  return (sheetConfigs || []).map(cfg => ({
    sheetName: cfg.sheetName || "Sheet",
    rows: Array.isArray(cfg.data) ? cfg.data : [],
  }));
}



export function projectRowsByColumnsRaw(rows = [], columns = []) {
 
  const isVisible = (col) => col && col.hidden !== true;

  function formatByColumn(value, col) {
    if (value === null || value === undefined) return "";
    if (col.renderType === "number" || col.renderType === "currency") {
      const digits =
        typeof col.roundingOff === "number" ? col.roundingOff : 2;
      return formatNumber(value, digits);
    }
    return String(value);
  }


  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Array.isArray(columns) || columns.length === 0) return rows;

  const visibleCols = columns.filter(isVisible);
  if (visibleCols.length === 0) return rows;

  return rows.map((r) => {
    const out = {};
    for (const col of visibleCols) {
      const header = col.label || col.key;
      const rawValue = r?.[col.key];
      out[header] = formatByColumn(rawValue, col); 
    }
    return out;
  });
}



export function makeSheet(sheetName, rows, columns) {
  return {
    sheetName: sheetName || "Sheet",
    data: projectRowsByColumnsRaw(rows, columns),
  };
}




export async function exportHistoryExcel(endPoint,payload,setExporting,reportName) {
 
   try {
        const res = await apiClient.post(endPoint, payload, { responseType: "blob" });
        const cd = res.headers["content-disposition"] || "";
        const match = cd.match(/filename=("?)([^"]+)\1/i);
        const filename = match ? match[2] : `${reportName}.xlsx`;
  
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch (err) {
        try {
          const text = await err?.response?.data?.text?.();
          console.error("Export failed:", text || err);
          alert("Export failed.\n" + (text || err.message));
        } catch {
          console.error("Export failed:", err);
          alert("Export failed.\n" + err.message);
        }
      } finally {
        setExporting(false);
      }
}







export function useDownloadTextFile(filename, text) {
   try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Create a temporary hidden <a> tag
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // In some browsers, setting rel="noopener" and target="_self"
    // ensures same-name overwriting behavior instead of appending (1)
    a.rel = "noopener";
    a.target = "_self";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
  }
}





export const useNormalizeDat = (src) => {
  if (src == null) return "";

  // If it's already a string, normalize CRLF and return
  if (typeof src === "string") {
    return src.replace(/\r?\n/g, "\r\n");
  }

  // If it's a flat array (strings/numbers), join as lines
  if (Array.isArray(src) && src.every(v => typeof v !== "object" || v === null)) {
    return src.map(v => String(v ?? "")).join("\r\n").replace(/\r?\n/g, "\r\n");
  }

  // If it's an array of objects, pick a sensible line for each object
  if (Array.isArray(src) && src.some(v => v && typeof v === "object")) {
    const preferredKeys = ["line", "LINE", "dat", "DAT", "text", "TEXT", "value", "VALUE", "data", "DATA"];

    const objToLine = (obj) => {
      if (obj == null) return "";

      // 1) If there's a single obvious text field, use it
      for (const k of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
          return String(obj[k]);
        }
      }

      // 2) Otherwise, build a pipe-delimited line from values (stable key order)
      const keys = Object.keys(obj); // JS preserves insertion order
      const vals = keys.map((k) => {
        const v = obj[k];
        if (v == null) return "";
        if (typeof v === "object") return JSON.stringify(v); // last resort
        return String(v);
      });
      return vals.join("|");
    };

    const text = src.map(objToLine).join("\r\n");
    return text.replace(/\r?\n/g, "\r\n");
  }

  // Last resort: stringify
  return String(src).replace(/\r?\n/g, "\r\n");
};




const cleanStr = (s) => (s == null ? "" : String(s).trim());
const getFormattedDateTime = () => {
    const now = new Date();
    const date = now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2);
    const time = ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2) + ':' +
      ('0' + now.getSeconds()).slice(-2);
    return date + ' ' + time;
  };






//  const STANDARD_FONT_COLOR = "FF000000";
//  const STANDARD_HEADER_FILL = "FFD9D9D9";
//  const STANDARD_SUBTOTAL_FILL = "FFF8F8F8";
//  const STANDARD_TOTAL_FILL = "FFF3F3F3";
//  const STANDARD_GROUP_FILL = "FFF5F5F5";

 
 const STANDARD_FONT_COLOR = "FF000000";
 const STANDARD_HEADER_FILL = "d7ecff";
 const STANDARD_SUBTOTAL_FILL = "f0f8ff";
 const STANDARD_TOTAL_FILL = "d7ecff";
 const STANDARD_GROUP_FILL = "f0f8ff";

 const borderThin = {};


// export async function exportGenericHistoryExcel(payload, columnConfigsMap, groupingKeys = []) {
//   const {
//     ReportName,
//     UserCode,
//     Branch,
//     StartDate,
//     EndDate,
//     JsonData,
//     companyName,
//     companyAddress,
//     companyTelNo,
//   } = payload;

//   const sheetsData = JsonData?.Data || {};
//   const sheetKeys = Object.keys(sheetsData);

//   if (sheetKeys.length === 0) {
//     alert("No data found to export.");
//     return;
//   }

//   const workbook = new ExcelJS.Workbook();
//   workbook.creator = UserCode || "System";
//   workbook.created = new Date();
//   workbook.properties.defaultFont = { name: "Calibri", size: 10 };

//   const MAX_COL_WIDTH = 60;
//   const MIN_COL_WIDTH = 10;
//   const PADDING = 2;

//   const SHEET_COLORS = [
//     "FFADD8E6",
//     "FF98FB98",
//     "FFFFB6C1",
//     "FF87CEFA",
//     "FFFFE4B5",
//     "FFDDA0DD",
//     "FFB0C4DE",
//     "FFF0E68C",
//     "FFFFDAB9",
//     "FF40E0D0",
//   ];

//   const getColLetter = (colIndex) => {
//     let letter = "";
//     let temp = colIndex;
//     while (temp > 0) {
//       const modulo = (temp - 1) % 26;
//       letter = String.fromCharCode(65 + modulo) + letter;
//       temp = Math.floor((temp - 1) / 26);
//     }
//     return letter;
//   };

//   for (let i = 0; i < sheetKeys.length; i++) {
//     const sheetKey = sheetKeys[i];
//     const safeSheetName = sheetKey.replace(/[*?:\/\[\]]/g, " ").substring(0, 31);
//     const tabColorArgb = SHEET_COLORS[i % SHEET_COLORS.length];

//     const ws = workbook.addWorksheet(safeSheetName || "Sheet", {
//       properties: {
//         tabColor: { argb: tabColorArgb },
//       },
//     });

//     const rawRows = sheetsData[sheetKey] || [];

//     let columnsDef = columnConfigsMap[sheetKey];
//     if (!columnsDef || columnsDef.length === 0) {
//       if (rawRows.length > 0) {
//         columnsDef = Object.keys(rawRows[0]).map((k) => ({
//           key: k,
//           label: k.toUpperCase(),
//           renderType: "text",
//         }));
//       } else {
//         continue;
//       }
//     }

//     const formatMMddyyyy = (value) => {
//       if (!value) return "";

//       const d = new Date(value);
//       if (isNaN(d.getTime())) return "";

//       const mm = String(d.getMonth() + 1).padStart(2, "0");
//       const dd = String(d.getDate()).padStart(2, "0");
//       const yyyy = d.getFullYear();

//       return `${mm}${dd}${yyyy}`;
//     };

//     const formattedStartDate = formatMMddyyyy(StartDate);
//     const formattedEndDate = formatMMddyyyy(EndDate);
//     const activeCols = columnsDef.filter((c) => !c.hidden);

//     const colWidths = activeCols.map((col) => {
//       let maxLen = (col.label || col.key).length;

//       for (let r = 0; r < rawRows.length; r++) {
//         const val = rawRows[r][col.key];
//         const valLen = val ? String(val).length : 0;
//         const buffer =
//           col.renderType === "number" || col.renderType === "currency" ? 4 : 0;

//         if (valLen + buffer > maxLen) maxLen = valLen + buffer;
//         if (maxLen >= MAX_COL_WIDTH) break;
//       }

//       const finalWidth = Math.min(
//         Math.max(maxLen + PADDING, MIN_COL_WIDTH),
//         MAX_COL_WIDTH
//       );

//       return { width: finalWidth };
//     });

//     ws.columns = colWidths;

//     const setMeta = (r, c, val, bold = false) => {
//       const cell = ws.getCell(r, c);
//       cell.value = val;
//       cell.font = {
//         name: "Calibri",
//         size: 10,
//         bold,
//         color: { argb: STANDARD_FONT_COLOR },
//       };
//       cell.alignment = { horizontal: "left", wrapText: false };
//     };

//     let currentRowIndex = 1;

//     ws.getCell(currentRowIndex, 1).value = companyName || "";
//     ws.getCell(currentRowIndex, 1).alignment = {
//       horizontal: "left",
//       vertical: "middle",
//     };
//     ws.getCell(currentRowIndex, 1).font = {
//       name: "Calibri",
//       size: 16,
//       bold: true,
//       color: { argb: STANDARD_FONT_COLOR },
//     };
//     currentRowIndex++;

//     setMeta(currentRowIndex, 1, companyAddress || "");
//     currentRowIndex++;

//     setMeta(currentRowIndex, 1, `Tel No: ${companyTelNo || ""}`);
//     currentRowIndex++;

//     ws.getCell(currentRowIndex, 1).value =
//     formattedStartDate && formattedEndDate
//       ? `${ReportName || ""} ${formattedStartDate} to ${formattedEndDate}`
//       : ReportName || "";


//     ws.getCell(currentRowIndex, 1).alignment = {
//       horizontal: "left",
//       vertical: "middle",
//     };
//     ws.getCell(currentRowIndex, 1).font = {
//       name: "Calibri",
//       size: 11,
//       bold: true,
//       italic: true,
//       color: { argb: STANDARD_FONT_COLOR },
//     };
//     currentRowIndex++;

//     setMeta(
//       currentRowIndex,
//       1,
//       `Extracted By: ${UserCode || ""} | Date/Time: ${getFormattedDateTime()}`
//     );
//     currentRowIndex++;

//     if (StartDate && EndDate) {
//       setMeta(currentRowIndex, 1, `Date Range: ${StartDate} - ${EndDate}`);
//       currentRowIndex++;
//     }

//     const headerRowIdx = currentRowIndex + 1;
//     const headerRow = ws.getRow(headerRowIdx);

//     ws.views = [{ state: "frozen", ySplit: headerRowIdx }];

//     activeCols.forEach((col, idx) => {
//       const cell = headerRow.getCell(idx + 1);
//       cell.value = col.label || col.key;
//       cell.font = {
//         name: "Calibri",
//         size: 10,
//         bold: true,
//         color: { argb: STANDARD_FONT_COLOR },
//       };
//       cell.alignment = {
//         horizontal: "center",
//         vertical: "middle",
//         wrapText: false,
//       };
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: STANDARD_HEADER_FILL },
//       };
//       cell.border = borderThin;
//     });

//     headerRow.height = 25;

//     ws.autoFilter = {
//       from: { row: headerRowIdx, column: 1 },
//       to: { row: headerRowIdx, column: activeCols.length },
//     };

//     const totalableColumns = activeCols
//       .filter(
//         (col) =>
//           (col.renderType === "number" || col.renderType === "currency") &&
//           col.key.toLowerCase() !== "currrate"
//       )
//       .map((col) => col.key);

//     let processedRows = rawRows;
//     const grandTotalAccumulator = {};
//     const isGroupedMode =
//       Array.isArray(groupingKeys) && groupingKeys.length > 0 && rawRows.length > 0;

//     if (isGroupedMode) {
//       totalableColumns.forEach((key) => {
//         grandTotalAccumulator[key] = 0;
//       });

//       const sortedRows = [...rawRows].sort((a, b) => {
//         for (const key of groupingKeys) {
//           if (a[key] < b[key]) return -1;
//           if (a[key] > b[key]) return 1;
//         }
//         return 0;
//       });

//       processedRows = [];
//       let currentGroup = {};
//       let currentGroupRows = [];

//       const calculateSubtotal = (groupValue) => {
//         if (currentGroupRows.length === 0) return null;

//         const subtotalRow = { __isSubtotal: true, __groupingValue: groupValue };

//         totalableColumns.forEach((key) => {
//           const subtotal = currentGroupRows.reduce(
//             (sum, row) => sum + (parseFloat(row[key]) || 0),
//             0
//           );
//           subtotalRow[key] = subtotal;
//           grandTotalAccumulator[key] += subtotal;
//         });

//         return subtotalRow;
//       };

//       const isGroupChange = (row) => {
//         if (currentGroupRows.length === 0) return true;
//         for (const key of groupingKeys) {
//           if (row[key] !== currentGroup[key]) return true;
//         }
//         return false;
//       };

//       sortedRows.forEach((row, index) => {
//         if (isGroupChange(row)) {
//           const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
//           if (subtotalRow) {
//             processedRows.push({ __isBlank: true });
//             processedRows.push(subtotalRow);
//           }

//           currentGroup = {};
//           groupingKeys.forEach((key) => {
//             currentGroup[key] = row[key];
//           });
//           currentGroupRows = [];
//         }

//         currentGroupRows.push(row);
//         processedRows.push(row);

//         if (index === sortedRows.length - 1) {
//           const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
//           if (subtotalRow) {
//             processedRows.push({ __isBlank: true });
//             processedRows.push(subtotalRow);
//           }
//         }
//       });
//     }

//     const dataStartRowIdx = headerRowIdx + 1;
//     let dataRowCounter = dataStartRowIdx;

//     processedRows.forEach((rowItem) => {
//       const wsRow = ws.getRow(dataRowCounter);
//       const isSubtotalRow = rowItem.__isSubtotal;
//       const isBlank = rowItem.__isBlank;

//       if (isBlank) {
//         dataRowCounter++;
//         return;
//       }

//       activeCols.forEach((col, colIdx) => {
//         const cell = wsRow.getCell(colIdx + 1);
//         const rawVal = rowItem[col.key];
//         const type = col.renderType || "text";

//         cell.font = {
//           name: "Calibri",
//           size: 10,
//           bold: isSubtotalRow,
//           color: { argb: STANDARD_FONT_COLOR },
//         };

//         if (isSubtotalRow) {
//           cell.fill = {
//             type: "pattern",
//             pattern: "solid",
//             fgColor: { argb: STANDARD_SUBTOTAL_FILL },
//           };
//           cell.border = {
//             ...borderThin,
//             bottom: { style: "double" },
//           };

//           if (type === "number" || type === "currency") {
//             const num = parseFloat(rawVal);
//             if (!isNaN(num)) {
//               cell.value = num;
//               const digits = col.roundingOff ?? 2;
//               const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
//               cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;
//               cell.alignment = { horizontal: "right", wrapText: false };
//             } else {
//               cell.value = "";
//             }
//           } else if (colIdx === 0) {
//             cell.value = `SUBTOTAL for ${rowItem.__groupingValue}`;
//             cell.alignment = { horizontal: "left", wrapText: false };
//           } else {
//             cell.value = "";
//           }
//         } else {
//           if (type === "number" || type === "currency") {
//             const num = parseFloat(rawVal);
//             if (!isNaN(num)) {
//               cell.value = num;
//               const digits = col.roundingOff ?? 2;
//               const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
//               cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;
//               cell.alignment = { horizontal: "right", wrapText: false };
//             } else {
//               cell.value = rawVal ?? "";
//               cell.alignment = { horizontal: "right", wrapText: false };
//             }
//           } else if (type === "date") {
//             cell.value = rawVal ? new Date(rawVal) : "";
//             cell.numFmt = "mm/dd/yyyy";
//             cell.alignment = { horizontal: "center", wrapText: false };
//           } else {
//             cell.value = rawVal ?? "";
//             cell.alignment = { horizontal: "left", wrapText: false };
//           }
//         }
//       });

//       dataRowCounter++;
//     });

//     const lastDataRow = dataRowCounter - 1;
//     const firstDataRow = dataStartRowIdx;

//     if (lastDataRow >= firstDataRow) {
//       if (isGroupedMode) {
//         dataRowCounter++;
//       }

//       const totalRow = ws.getRow(dataRowCounter);
//       const totalLabelCell = totalRow.getCell(1);

//       totalLabelCell.value = isGroupedMode ? "GRAND TOTAL" : "TOTAL";
//       totalLabelCell.font = {
//         name: "Calibri",
//         size: 10,
//         bold: true,
//         color: { argb: STANDARD_FONT_COLOR },
//       };
//       totalLabelCell.alignment = { horizontal: "right", wrapText: false };

//       activeCols.forEach((col, idx) => {
//         const colIdx = idx + 1;
//         const cell = totalRow.getCell(colIdx);
//         const type = col.renderType;
//         const colKeyLower = col.key.toLowerCase();

//         cell.fill = {
//           type: "pattern",
//           pattern: "solid",
//           fgColor: { argb: STANDARD_TOTAL_FILL },
//         };

//         const excludedKeywords = [
//           "rate",
//           "unitprice",
//           "unitcost",
//           "unit_price",
//           "unit_cost",
//         ];

//         if (excludedKeywords.some((keyword) => colKeyLower.includes(keyword))) {
//           cell.value = "";
//           return;
//         }

//         if (type === "number" || type === "currency") {
//           cell.font = {
//             name: "Calibri",
//             size: 10,
//             bold: true,
//             color: { argb: STANDARD_FONT_COLOR },
//           };
//           cell.alignment = { horizontal: "right", wrapText: false };

//           const digits = col.roundingOff ?? 2;
//           const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
//           cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;

//           if (isGroupedMode) {
//             cell.value = grandTotalAccumulator[col.key] || 0;
//           } else {
//             const letter = getColLetter(colIdx);
//             cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
//           }
//         }
//       });
//     }
//   }

//   const buf = await workbook.xlsx.writeBuffer();
//   const fileName = `${ReportName || "Export"}.xlsx`;

//   saveAs(
//     new Blob([buf], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     }),
//     fileName
//   );
// }


export async function exportGenericHistoryExcel(payload, columnConfigsMap, groupingKeys = []) {
  const {
    ReportName,
    UserCode,
    Branch,
    StartDate,
    EndDate,
    JsonData,
    companyName,
    companyAddress,
    companyTelNo,
  } = payload;

  const sheetsData = JsonData?.Data || {};
  const sheetKeys = Object.keys(sheetsData);

  if (sheetKeys.length === 0) {
    alert("No data found to export.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = UserCode || "System";
  workbook.created = new Date();
  workbook.properties.defaultFont = { name: "Calibri", size: 10 };

  const MAX_TEXT_CHAR_WIDTH = 40;
  const MAX_NUM_CHAR_WIDTH = 25;
  const MAX_DATE_CHAR_WIDTH = 15;
  const FIRST_COL_CHAR_WIDTH = 15;
  const MIN_COL_WIDTH = 10;
  const PADDING = 2;

  const SHEET_COLORS = [
    "FFADD8E6",
    "FF98FB98",
    "FFFFB6C1",
    "FF87CEFA",
    "FFFFE4B5",
    "FFDDA0DD",
    "FFB0C4DE",
    "FFF0E68C",
    "FFFFDAB9",
    "FF40E0D0",
  ];

  const getColLetter = (colIndex) => {
    let letter = "";
    let temp = colIndex;
    while (temp > 0) {
      const modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - 1) / 26);
    }
    return letter;
  };

  const getDisplayLength = (value, renderType) => {
    if (value === null || value === undefined) return 0;

    if (renderType === "date") {
      return MAX_DATE_CHAR_WIDTH;
    }

    if (renderType === "number" || renderType === "currency") {
      const num = parseFloat(value);
      if (!isNaN(num)) return String(num).length;
      return String(value).length;
    }

    return String(value).length;
  };

  const getColumnMaxWidth = (renderType, colIndex) => {
    if (colIndex === 0) return FIRST_COL_CHAR_WIDTH;
    if (renderType === "date") return MAX_DATE_CHAR_WIDTH;
    if (renderType === "number" || renderType === "currency") return MAX_NUM_CHAR_WIDTH;
    return MAX_TEXT_CHAR_WIDTH;
  };

  for (let i = 0; i < sheetKeys.length; i++) {
    const sheetKey = sheetKeys[i];
    const safeSheetName = sheetKey.replace(/[*?:\/\[\]]/g, " ").substring(0, 31);
    const tabColorArgb = SHEET_COLORS[i % SHEET_COLORS.length];

    const ws = workbook.addWorksheet(safeSheetName || "Sheet", {
      properties: {
        tabColor: { argb: tabColorArgb },
      },
    });

    const rawRows = sheetsData[sheetKey] || [];

    let columnsDef = columnConfigsMap[sheetKey];
    if (!columnsDef || columnsDef.length === 0) {
      if (rawRows.length > 0) {
        columnsDef = Object.keys(rawRows[0]).map((k) => ({
          key: k,
          label: k.toUpperCase(),
          renderType: "text",
        }));
      } else {
        continue;
      }
    }

    const formatMMddyyyy = (value) => {
      if (!value) return "";

      const d = new Date(value);
      if (isNaN(d.getTime())) return "";

      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();

      return `${mm}${dd}${yyyy}`;
    };

    const formattedStartDate = formatMMddyyyy(StartDate);
    const formattedEndDate = formatMMddyyyy(EndDate);
    const activeCols = columnsDef.filter((c) => !c.hidden);

    const colWidths = activeCols.map((col, colIndex) => {
      if (colIndex === 0) {
        return { width: FIRST_COL_CHAR_WIDTH };
      }

      let maxLen = String(col.label || col.key || "").length;
      const maxAllowed = getColumnMaxWidth(col.renderType, colIndex);

      for (let r = 0; r < rawRows.length; r++) {
        const val = rawRows[r]?.[col.key];
        const valLen = getDisplayLength(val, col.renderType);

        if (valLen > maxLen) maxLen = valLen;
        if (maxLen >= maxAllowed) break;
      }

      const finalWidth = Math.min(
        Math.max(maxLen + PADDING, MIN_COL_WIDTH),
        maxAllowed
      );

      return { width: finalWidth };
    });

    ws.columns = colWidths;

    const setMeta = (r, c, val, bold = false) => {
      const cell = ws.getCell(r, c);
      cell.value = val;
      cell.font = {
        name: "Calibri",
        size: 10,
        bold,
        color: { argb: STANDARD_FONT_COLOR },
      };
      cell.alignment = { horizontal: "left", wrapText: false };
    };

    let currentRowIndex = 1;

    ws.getCell(currentRowIndex, 1).value = companyName || "";
    ws.getCell(currentRowIndex, 1).alignment = {
      horizontal: "left",
      vertical: "middle",
    };
    ws.getCell(currentRowIndex, 1).font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: STANDARD_FONT_COLOR },
    };
    currentRowIndex++;

    setMeta(currentRowIndex, 1, companyAddress || "");
    currentRowIndex++;

    setMeta(currentRowIndex, 1, `Tel No: ${companyTelNo || ""}`);
    currentRowIndex++;

    ws.getCell(currentRowIndex, 1).value =
      formattedStartDate && formattedEndDate
        ? `${ReportName || ""} ${formattedStartDate} to ${formattedEndDate}`
        : ReportName || "";

    ws.getCell(currentRowIndex, 1).alignment = {
      horizontal: "left",
      vertical: "middle",
    };
    ws.getCell(currentRowIndex, 1).font = {
      name: "Calibri",
      size: 11,
      bold: true,
      italic: true,
      color: { argb: STANDARD_FONT_COLOR },
    };
    currentRowIndex++;

    setMeta(
      currentRowIndex,
      1,
      `Extracted By: ${UserCode || ""} | Date/Time: ${getFormattedDateTime()}`
    );
    currentRowIndex++;

    if (StartDate && EndDate) {
      setMeta(currentRowIndex, 1, `Date Range: ${StartDate} - ${EndDate}`);
      currentRowIndex++;
    }

    const headerRowIdx = currentRowIndex + 1;
    const headerRow = ws.getRow(headerRowIdx);

    ws.views = [{ state: "frozen", ySplit: headerRowIdx }];

    activeCols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label || col.key;
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: STANDARD_FONT_COLOR },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: false,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STANDARD_HEADER_FILL },
      };
      cell.border = borderThin;
    });

    headerRow.height = 25;

    ws.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to: { row: headerRowIdx, column: activeCols.length },
    };

    const totalableColumns = activeCols
      .filter(
        (col) =>
          (col.renderType === "number" || col.renderType === "currency") &&
          col.key.toLowerCase() !== "currrate"
      )
      .map((col) => col.key);

    let processedRows = rawRows;
    const grandTotalAccumulator = {};
    const isGroupedMode =
      Array.isArray(groupingKeys) && groupingKeys.length > 0 && rawRows.length > 0;

    if (isGroupedMode) {
      totalableColumns.forEach((key) => {
        grandTotalAccumulator[key] = 0;
      });

      const sortedRows = [...rawRows].sort((a, b) => {
        for (const key of groupingKeys) {
          if (a[key] < b[key]) return -1;
          if (a[key] > b[key]) return 1;
        }
        return 0;
      });

      processedRows = [];
      let currentGroup = {};
      let currentGroupRows = [];

      const calculateSubtotal = (groupValue) => {
        if (currentGroupRows.length === 0) return null;

        const subtotalRow = { __isSubtotal: true, __groupingValue: groupValue };

        totalableColumns.forEach((key) => {
          const subtotal = currentGroupRows.reduce(
            (sum, row) => sum + (parseFloat(row[key]) || 0),
            0
          );
          subtotalRow[key] = subtotal;
          grandTotalAccumulator[key] += subtotal;
        });

        return subtotalRow;
      };

      const isGroupChange = (row) => {
        if (currentGroupRows.length === 0) return true;
        for (const key of groupingKeys) {
          if (row[key] !== currentGroup[key]) return true;
        }
        return false;
      };

      sortedRows.forEach((row, index) => {
        if (isGroupChange(row)) {
          const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
          if (subtotalRow) {
            processedRows.push({ __isBlank: true });
            processedRows.push(subtotalRow);
          }

          currentGroup = {};
          groupingKeys.forEach((key) => {
            currentGroup[key] = row[key];
          });
          currentGroupRows = [];
        }

        currentGroupRows.push(row);
        processedRows.push(row);

        if (index === sortedRows.length - 1) {
          const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
          if (subtotalRow) {
            processedRows.push({ __isBlank: true });
            processedRows.push(subtotalRow);
          }
        }
      });
    }

    const dataStartRowIdx = headerRowIdx + 1;
    let dataRowCounter = dataStartRowIdx;

    processedRows.forEach((rowItem) => {
      const wsRow = ws.getRow(dataRowCounter);
      const isSubtotalRow = rowItem.__isSubtotal;
      const isBlank = rowItem.__isBlank;

      if (isBlank) {
        dataRowCounter++;
        return;
      }

      activeCols.forEach((col, colIdx) => {
        const cell = wsRow.getCell(colIdx + 1);
        const rawVal = rowItem[col.key];
        const type = col.renderType || "text";

        cell.font = {
          name: "Calibri",
          size: 10,
          bold: isSubtotalRow,
          color: { argb: STANDARD_FONT_COLOR },
        };

        if (isSubtotalRow) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: STANDARD_SUBTOTAL_FILL },
          };
          cell.border = {
            ...borderThin,
            bottom: { style: "double" },
          };

          if (type === "number" || type === "currency") {
            const num = parseFloat(rawVal);
            if (!isNaN(num)) {
              cell.value = num;
              const digits = col.roundingOff ?? 2;
              const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
              cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;
              cell.alignment = { horizontal: "right", wrapText: false };
            } else {
              cell.value = "";
            }
          } else if (colIdx === 0) {
            cell.value = `SUBTOTAL for ${rowItem.__groupingValue}`;
            cell.alignment = { horizontal: "left", wrapText: false };
          } else {
            cell.value = "";
          }
        } else {
          if (type === "number" || type === "currency") {
            const num = parseFloat(rawVal);
            if (!isNaN(num)) {
              cell.value = num;
              const digits = col.roundingOff ?? 2;
              const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
              cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;
              cell.alignment = { horizontal: "right", wrapText: false };
            } else {
              cell.value = rawVal ?? "";
              cell.alignment = { horizontal: "right", wrapText: false };
            }
          } else if (type === "date") {
            cell.value = rawVal ? new Date(rawVal) : "";
            cell.numFmt = "mm/dd/yyyy";
            cell.alignment = { horizontal: "center", wrapText: false };
          } else {
            cell.value = rawVal ?? "";
            cell.alignment = { horizontal: "left", wrapText: false };
          }
        }
      });

      dataRowCounter++;
    });

    const lastDataRow = dataRowCounter - 1;
    const firstDataRow = dataStartRowIdx;

    if (lastDataRow >= firstDataRow) {
      if (isGroupedMode) {
        dataRowCounter++;
      }

      const totalRow = ws.getRow(dataRowCounter);
      const totalLabelCell = totalRow.getCell(1);

      totalLabelCell.value = isGroupedMode ? "GRAND TOTAL" : "TOTAL";
      totalLabelCell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: STANDARD_FONT_COLOR },
      };
      totalLabelCell.alignment = { horizontal: "right", wrapText: false };

      activeCols.forEach((col, idx) => {
        const colIdx = idx + 1;
        const cell = totalRow.getCell(colIdx);
        const type = col.renderType;
        const colKeyLower = col.key.toLowerCase();

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STANDARD_TOTAL_FILL },
        };

        const excludedKeywords = [
          "rate",
          "unitprice",
          "unitcost",
          "unit_price",
          "unit_cost",
        ];

        if (excludedKeywords.some((keyword) => colKeyLower.includes(keyword))) {
          cell.value = "";
          return;
        }

        if (type === "number" || type === "currency") {
          cell.font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: STANDARD_FONT_COLOR },
          };
          cell.alignment = { horizontal: "right", wrapText: false };

          const digits = col.roundingOff ?? 2;
          const zeros = digits > 0 ? "." + "0".repeat(digits) : "";
          cell.numFmt = `#,##0${zeros};[Red]-#,##0${zeros};0${zeros}`;

          if (isGroupedMode) {
            cell.value = grandTotalAccumulator[col.key] || 0;
          } else {
            const letter = getColLetter(colIdx);
            cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
          }
        }
      });
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  const fileName = `${ReportName || "Export"}.xlsx`;

  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
}





export const exportGenericQueryExcel = async (
  data,
  grandTotals = {},
  visibleCols,
  groupBy,
  columns,
  expandedGroups,
  startHeaderRow = 7,
  fileName = "Query_Export",
  userName = "",
  compName = "",
  compAddr = "",
  telNo = "",
  reportTitle = "",
  autoExpandGroups = false
) => {
  if (!data || data.length === 0) return;

  grandTotals =
    grandTotals && typeof grandTotals === "object" ? grandTotals : {};

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  const HEADER_ROW_HEIGHT = 25;

  const headerKeys = visibleCols.map((c) => c.key);
  const headerLabels = visibleCols.map((c) => c.label);
  const colCount = headerKeys.length;

  const DATE_NUMFMT = "mm/dd/yyyy";

  const getFullCol = (key) =>
    columns.find((c) => c.key === key) || visibleCols.find((c) => c.key === key);

  const getNumberFormatForCol = (col) => {
    if (col?.renderType === "number" || col?.renderType === "currency") {
      const digits =
        typeof col.roundingOff === "number" ? col.roundingOff : 2;
      const decimalPart = digits > 0 ? "." + "0".repeat(digits) : "";
      return `#,##0${decimalPart}`;
    }
    return undefined;
  };

  const getRoundedNumericValue = (col, rawVal) => {
    if (rawVal === null || rawVal === undefined || rawVal === "") return null;

    const num = parseFloat(String(rawVal).replace(/,/g, ""));
    if (isNaN(num)) return null;

    const digits =
      typeof col.roundingOff === "number" ? col.roundingOff : 2;
    const factor = Math.pow(10, digits);

    return Math.round(num * factor) / factor;
  };

  const prepareCellValue = (key, node) => {
    const col = getFullCol(key);
    const rawVal = node[key];

    if (rawVal === null || rawVal === undefined || rawVal === "") return null;

    if (col?.renderType === "number" || col?.renderType === "currency") {
      return getRoundedNumericValue(col, rawVal);
    }

    if (col?.renderType === "date") {
      const str = String(rawVal);
      const datePart = str.split("T")[0].split(" ")[0];
      const d = new Date(datePart);
      return isNaN(d.getTime()) ? rawVal : d;
    }

    return rawVal;
  };

  worksheet.columns = visibleCols.map((col) => {
    const fullCol = getFullCol(col.key);
    let numFmt;

    if (fullCol?.renderType === "date") {
      numFmt = DATE_NUMFMT;
    } else {
      numFmt = getNumberFormatForCol(fullCol);
    }

    return {
      header: col.label,
      key: col.key,
      width: col.width ? Number(col.width) / 6 : 15,
      numFmt,
      style: {
        font: {
          name: "Calibri",
          size: 10,
          color: { argb: STANDARD_FONT_COLOR },
        },
      },
    };
  });

  const setMeta = (r, c, val, bold = false) => {
    const cell = worksheet.getCell(r, c);
    cell.value = val;
    cell.font = {
      name: "Calibri",
      size: 10,
      bold,
      color: { argb: STANDARD_FONT_COLOR },
    };
    cell.alignment = { horizontal: "left", wrapText: false };
  };

  let currentRowIndex = 1;

  worksheet.getCell(currentRowIndex, 1).value = compName || "";
  worksheet.getCell(currentRowIndex, 1).alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  worksheet.getCell(currentRowIndex, 1).font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: STANDARD_FONT_COLOR },
  };
  currentRowIndex++;

  setMeta(currentRowIndex, 1, compAddr || "");
  currentRowIndex++;

  setMeta(currentRowIndex, 1, `Tel No: ${telNo || ""}`);
  currentRowIndex++;

  worksheet.getCell(currentRowIndex, 1).value =
    reportTitle || fileName || "";
  worksheet.getCell(currentRowIndex, 1).alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  worksheet.getCell(currentRowIndex, 1).font = {
    name: "Calibri",
    size: 11,
    bold: true,
    italic: true,
    color: { argb: STANDARD_FONT_COLOR },
  };
  currentRowIndex++;

  setMeta(
    currentRowIndex,
    1,
    `Extracted By: ${userName || ""} | Date/Time: ${getFormattedDateTime()}`
  );
  currentRowIndex++;

  const headerRow = worksheet.getRow(startHeaderRow);
  headerRow.height = HEADER_ROW_HEIGHT;
  headerRow.values = [, ...headerLabels];

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: STANDARD_FONT_COLOR },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: STANDARD_HEADER_FILL },
    };
    cell.border = borderThin;
  });

  if (groupBy.length === 0) {
    const filterRange = `A${startHeaderRow}:${worksheet.getColumn(colCount).letter}${startHeaderRow}`;
    worksheet.autoFilter = filterRange;
  }

  currentRowIndex = startHeaderRow + 1;

  const addRows = (nodes, currentLevel = 0) => {
    nodes.forEach((node) => {
      if (node.isGroup) {
        const uniqueId = `${node.key}:${node.value}:${node.level}`;

        const groupRow = worksheet.getRow(currentRowIndex++);
        groupRow.getCell(1).value = `${
          columns.find((c) => c.key === node.key)?.label
        }: ${node.value} (${node.count} items)`;
        groupRow.getCell(1).font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: STANDARD_FONT_COLOR },
        };
        groupRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STANDARD_GROUP_FILL },
        };

        worksheet.mergeCells(groupRow.number, 1, groupRow.number, colCount);

        if (
          autoExpandGroups ||
          expandedGroups?.[uniqueId] ||
          groupBy.length === 1
        ) {
          addRows(node.children, currentLevel + 1);

          const subtotalRow = worksheet.getRow(currentRowIndex++);

          for (let i = 1; i <= colCount; i++) {
            subtotalRow.getCell(i).fill = {
              type: "pattern",
              pattern: "solid",
              bold: true,
              fgColor: { argb: STANDARD_SUBTOTAL_FILL },
            };
            subtotalRow.getCell(i).border = {
              ...borderThin,
              bottom: { style: "double" },
            };
          }


          subtotalRow.getCell(1).value =
          `SUBTOTAL: ${String(node.value ?? "").trim() || "(Blank)"}`;
          subtotalRow.getCell(1).font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: STANDARD_FONT_COLOR },
          };

          headerKeys.forEach((key, index) => {
            const aggregateValue = node.aggregates[key];
            if (aggregateValue !== undefined) {
              const fullCol = getFullCol(key);
              const cell = subtotalRow.getCell(index + 1);

              cell.font = {
                name: "Calibri",
                size: 10,
                bold: true,
                color: { argb: STANDARD_FONT_COLOR },
              };

              if (
                fullCol?.renderType === "number" ||
                fullCol?.renderType === "currency"
              ) {
                cell.value = getRoundedNumericValue(fullCol, aggregateValue);
                const numFmt = getNumberFormatForCol(fullCol);
                if (numFmt) cell.numFmt = numFmt;
              } else {
                cell.value = aggregateValue;
              }
            }
          });
        }
      } else {
        const dataRow = worksheet.getRow(currentRowIndex++);

        headerKeys.forEach((key, index) => {
          const fullCol = getFullCol(key);
          const cell = dataRow.getCell(index + 1);
          const value = prepareCellValue(key, node);

          cell.value = value;
          cell.font = {
            name: "Calibri",
            size: 10,
            color: { argb: STANDARD_FONT_COLOR },
          };

          if (
            fullCol?.renderType === "number" ||
            fullCol?.renderType === "currency"
          ) {
            const numFmt = getNumberFormatForCol(fullCol);
            if (numFmt) cell.numFmt = numFmt;
          }

          if (fullCol?.renderType === "date" && value instanceof Date) {
            cell.numFmt = DATE_NUMFMT;
          }
        });
      }
    });
  };

  addRows(data);

  const hasGrandTotals = grandTotals && Object.keys(grandTotals).length > 0;

  if (hasGrandTotals || groupBy.length > 0) {
    const totalRow = worksheet.getRow(currentRowIndex++);

    totalRow.getCell(1).value = groupBy.length > 0 ? "GRAND TOTAL" : "TOTAL";
    totalRow.getCell(1).font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: STANDARD_FONT_COLOR },
    };

    for (let i = 1; i <= colCount; i++) {
      totalRow.getCell(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STANDARD_TOTAL_FILL },
      };
    }

    headerKeys.forEach((key, index) => {
      const totalValue = grandTotals[key];
      if (totalValue !== undefined) {
        const fullCol = getFullCol(key);
        const cell = totalRow.getCell(index + 1);

        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: STANDARD_FONT_COLOR },
        };

        if (
          fullCol?.renderType === "number" ||
          fullCol?.renderType === "currency"
        ) {
          cell.value = getRoundedNumericValue(fullCol, totalValue);
          const numFmt = getNumberFormatForCol(fullCol);
          if (numFmt) cell.numFmt = numFmt;
        } else {
          cell.value = totalValue;
        }
      }
    });
  }

  const MAX_TEXT_CHAR_WIDTH = 40;
  const MAX_NUM_CHAR_WIDTH = 25;
  const MAX_DATE_CHAR_WIDTH = 15;
  const FIRST_COL_CHAR_WIDTH = 15;

  worksheet.columns.forEach((column, colIndex) => {
    const colNumber = colIndex + 1;

    if (colNumber === 1) {
      column.width = FIRST_COL_CHAR_WIDTH;
      return;
    }

    const headerKey = headerKeys[colNumber - 1];
    const fullCol = getFullCol(headerKey);

    let maxAllowedWidth = MAX_TEXT_CHAR_WIDTH;

    if (
      fullCol?.renderType === "number" ||
      fullCol?.renderType === "currency"
    ) {
      maxAllowedWidth = MAX_NUM_CHAR_WIDTH;
    } else if (fullCol?.renderType === "date") {
      maxAllowedWidth = MAX_DATE_CHAR_WIDTH;
    }

    let maxLength = 0;

    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      const firstColVal = worksheet.getRow(rowNumber).getCell(1).value;

      if (typeof firstColVal === "string") {
        const t = firstColVal.trim().toUpperCase();
        if (
          t.startsWith("SUBTOTAL") ||
          t.startsWith("TOTAL") ||
          t.startsWith("GRAND TOTAL") ||
          t.includes(" ITEMS)")
        ) {
          return;
        }
      }

      let cellValue = cell.value;
      if (cellValue == null) return;

      if (typeof cellValue === "object") {
        if (cellValue.text) {
          cellValue = cellValue.text;
        } else if (cellValue.richText) {
          cellValue = cellValue.richText.map((r) => r.text).join("");
        } else if (cellValue.result != null) {
          cellValue = cellValue.result;
        } else if (
          cellValue.year != null &&
          cellValue.month != null &&
          cellValue.day != null
        ) {
          cellValue = `${cellValue.month}/${cellValue.day}/${cellValue.year}`;
        }
      }

      const text = String(cellValue);
      if (text.length > maxLength) {
        maxLength = text.length;
      }
    });

    column.width = Math.min(maxLength + 2, maxAllowedWidth);
  });

  worksheet.views = [{ state: "frozen", ySplit: startHeaderRow }];

  const row1 = worksheet.getRow(1);
  for (let col = 2; col <= colCount; col++) {
    row1.getCell(col).value = null;
  }

  const safeFileName = (fileName && String(fileName).trim()) || "Query_Export";

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
