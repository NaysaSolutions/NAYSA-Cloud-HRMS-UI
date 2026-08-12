import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { formatNumber } from '@/NAYSA Cloud/Global/behavior';
import { useSwalValidationAlert, useSwalErrorAlert} from '@/NAYSA Cloud/Global/behavior.jsx';
import Swal from 'sweetalert2';
import { parseFormattedNumber } from './behavior';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';




export const formatDateToMMDDYYYY = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "";

  const [year, month, day] = datePart.split("-");
  return `${month}/${day}/${year}`;
};




export const useGenerateGLEntries = async (docCode, glData) => {
    const payload = { json_data: glData };

    console.log(JSON.stringify(payload));

    try {
        const response = await postRequest("generateGL" + docCode, JSON.stringify(payload));

     
        if (response?.status === 'success' && Array.isArray(response.data) && response.data.length > 0) {
            const resultData = response.data[0];
            const returnedErrorCount = resultData['errorCount'];
            const returnedErrorMsg = resultData['errorMsg'];

          

            if (returnedErrorMsg && returnedErrorCount > 0) {
                if (returnedErrorMsg.includes("Unbalanced")) {
                    const tDebit = glData.dt2.reduce((sum, row) => sum + (parseFloat(row.debit) || 0), 0);
                    const tCredit = glData.dt2.reduce((sum, row) => sum + (parseFloat(row.credit) || 0), 0);
                    
                    useSwalErrorAlert(
                        "Unbalanced Debit/Credit",
                        `Total Debit: ${formatNumber(tDebit)}\nTotal Credit: ${formatNumber(tCredit)}`
                    );
                } else {
                    useSwalErrorAlert("Generation Failed", returnedErrorMsg);
                }
                return null;
            }

            let glEntries;
            try {
                glEntries = resultData.result ? JSON.parse(resultData.result) : [];
                if (!Array.isArray(glEntries)) glEntries = [glEntries];
            } catch (parseError) {
                throw new Error("Failed to parse GL entries.");
            }

            console.log(glEntries)
           return glEntries.map((entry, idx) => {
          const rawSlRefDate = entry.slRefDate ?? "";

          return {
              ...entry,
              id: idx + 1,

              debit: formatNumber(entry.debit),
              credit: formatNumber(entry.credit),
              debitFx1: formatNumber(entry.debitFx1),
              creditFx1: formatNumber(entry.creditFx1),
              debitFx2: formatNumber(entry.debitFx2),
              creditFx2: formatNumber(entry.creditFx2),

              slRefDate: rawSlRefDate
                  ? formatDateToMMDDYYYY(rawSlRefDate)
                  : "",
          };
          });
        }
        return null;
    } catch (error) {
        useSwalErrorAlert("System Error", error.message);
        return null;
    }
};




export const useTransactionUpsert = async (docCode, glData, updateState, idKey, noKey) => {
    try {
        updateState({ isLoading: true });
        const payload = { json_data: glData };
        console.log(JSON.stringify(payload))
        const response = await postRequest("upsert" + docCode, JSON.stringify(payload));

        const legacySuccess = response?.status === 'success' && Array.isArray(response.data) && response.data.length > 0;
        const normalizedSuccess = response?.success === true;

        if (legacySuccess || normalizedSuccess) {
            const resultData = legacySuccess ? response.data[0] : response;
            const returnedErrorCount = resultData['errorCount'];
            const returnedErrorMsg = resultData['errorMsg'] || resultData['message'];

            if (returnedErrorMsg && returnedErrorCount > 0) {
                if (returnedErrorMsg.includes("Unbalanced")) {
                    const glRows = Array.isArray(glData.dt2) ? glData.dt2 : [];
                    const tDebit = glRows.reduce((sum, row) => sum + (parseFloat(row.debit) || 0), 0);
                    const tCredit = glRows.reduce((sum, row) => sum + (parseFloat(row.credit) || 0), 0);

                    useSwalErrorAlert(
                        "Unbalanced Debit/Credit",
                        `Total Debit: ${formatNumber(tDebit)}\nTotal Credit: ${formatNumber(tCredit)}`
                    );
                } else {
                    useSwalErrorAlert("Validation Failed", returnedErrorMsg);
                }
                return null;
            }

            if (resultData[noKey] && resultData[idKey]) {
                updateState({
                    documentID: resultData[idKey],
                    documentNo: resultData[noKey],
                    isDocNoDisabled: true,
                    isFetchDisabled: true
                });
            }
            return legacySuccess
                ? response
                : { ...response, status: 'success', data: [resultData] };
        } 

        if (response?.success === false || response?.status === 'error') {
            useSwalErrorAlert("Validation Failed", response?.message || "Unable to save transaction.");
        }
        return null;
    } catch (error) {
        const backendError = error?.response?.data || {};
        const backendMessage =
            backendError.details ||
            backendError.message ||
            backendError.error ||
            error.message;

        console.error("Transaction upsert failed:", {
            status: error?.response?.status,
            data: backendError,
            message: error.message,
        });

        useSwalErrorAlert("Connection Error", backendMessage);
        return null;
    } finally {
        updateState({ isSaveDisabled: false, isResetDisabled: false, isLoading: false });
    }
};





// global update of GL Entries per record
export const useUpdateRowGLEntries = async (row, field, value, custVendCode,docCode) => {
  const payload = {
    json_data: {
      acctCode: field === "acctCode" ? value.acctCode : row.acctCode,
      slCode: field === "slCode" ? value.slCode : row.slCode,
      rcCode: field === "rcCode" ? value.rcCode : row.rcCode,
      sltypeCode: field === "slCode" ? value.sltypeCode : row.sltypeCode, 
      vatCode: field === "vatCode" ? value.vatCode : row.vatCode, 
      vatName: row.vatName,
      atcCode: field === "atcCode" ? value.atcCode : row.atcCode,  
      atcName: row.atcName,
      atcName: row.atcName,
      custVendCode:custVendCode,
      docCode: docCode
    }
  };


  try {
    const response = await postRequest("lookupGL", JSON.stringify(payload));

    // ✅ Match actual API format
    if (!response || response.status !== "success" || !Array.isArray(response.data)) {
      console.warn("Invalid API response structure", response);
      return [];
    }



    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");
    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData[0]
      : null;

  } catch (error) {
    console.error("Error fetching LookupGL:", error);
    return [];
  }
};






// global update of GL Entries per record
export const useUpdateRowEditEntries = async (row, field, value,currCode,currRate,docDate) => {
  const payload = {
    json_data: {
      fieldName:field,
      debit: parseFormattedNumber(row.debit),
      credit: parseFormattedNumber(row.credit),
      debitFx1: parseFormattedNumber(row.debitFx1),
      creditFx1: parseFormattedNumber(row.creditFx1),
      debitFx2:parseFormattedNumber(row.debitFx2),
      creditFx2:parseFormattedNumber(row.creditFx2),
      currCode: currCode,
      currRate: currRate,
      docDate: docDate
    }
  };
  

  try {
    const response = await postRequest("editEntries", JSON.stringify(payload));

    // ✅ Match actual API format
    if (!response || response.status !== "success" || !Array.isArray(response.data)) {
      console.warn("Invalid API response structure", response);
      return [];
    }



    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");
    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData[0]
      : null;

  } catch (error) {
    console.error("Error fetching editEntries:", error);
    return [];
  }
};







// global update of GL Entries per record
export const useFetchTranData = async (documentNo,branchCode,docType,fieldName,direction='') => {

  
  const response = await fetchData(`get${docType}?${fieldName}=${documentNo}&branchCode=${branchCode}&direction=${direction}`);
  
  
  if (!response?.success || !response.data?.length) {
    return null; // no record
  }

  let data = JSON.parse(response.data[0].result || "{}");
  return data;

};






export const useIsTranExist = async (documentNo, branchCode, docType, fieldName) => {
  try {
    const query = `${fieldName}=${encodeURIComponent(documentNo)}&branchCode=${encodeURIComponent(branchCode)}`;

    
    const endpoint = `get${docType}?${query}`;

    const response = await fetchData(endpoint);

    // Basic validation
    if (!response?.success || !Array.isArray(response.data) || response.data.length === 0) {
      return 0; // not found
    }

    const result = response.data[0]?.result;

    // Handle stringified null result
    if (!result || result === '{"result":null}') {
      return 0; // not found
    }

    return 1; // exists
  } catch (error) {
    console.error("Error checking transaction existence:", error);
    return 0;
  }
};








// global update of GL Entries per record
export const useFetchTranDataReversal = async (documentNo,branchCode,docType,refDocType,fieldName) => {
  
if (!documentNo || !branchCode) {
    throw new Error("Document No. or Branch Code missing.");
  }

  const response = await fetchData(`reversal${docType}?${fieldName}=${documentNo}&refDocType=${refDocType}&branchCode=${branchCode}`);
  if (!response?.success || !response.data?.length) {
    return null; // no record
  }

  let data = JSON.parse(response.data[0].result || "{}");
  return data;

};






export async function useHandleCancel(docCode, documentID, userCode, password, reason, updateState) {
 
  const payload = {
    userPassword: password,
    userCode,
    json_data: {      
      docCode,
      documentID,
      userCode,
      reason,
    },
  };

  updateState({ isLoading: true });

  try {

    console.log(payload)
    const { data: res } = await apiClient.post("/cancel"+docCode, payload);
    if (res?.status === "success" || res?.success) {
      // You can standardize the return here
      return { success: true, data: res };
    } else {
      Swal.fire("Cancellation failed", res?.message ?? "Cancellation failed.", "error");
      return { success: false, message: res?.message || "Unexpected response" };
    } 

} catch (err) {
  const status = err?.response?.status;
  const data   = err?.response?.data || {};
  const code   = data.error || "";
  const msg    = data.message || "Something went wrong.";

  // Wrong or missing password only
  if (status === 422 && code === "INVALID_CREDENTIALS") {
    useSwalErrorAlert(
      "Incorrect Password", 
      "The password you entered is incorrect. Please try again."
    );  
    return { success: false, code, message: msg };
  }

  if (status === 422 && code === "MISSING_CREDENTIALS") {
    useSwalErrorAlert(
      "Password required", 
      "Please enter your password."
    );  
    return { success: false, code, message: msg };
  }

  // Anything else — generic error
  Swal.fire("Error", msg, "error");
  return { success: false, code: code || "UNKNOWN", message: msg };
  } finally {
    updateState({
      isSaveDisabled: false,
      isResetDisabled: false,
      isLoading: false,
    });
  }
}




// moved to printing.js
export async function useHandlePrint(documentID, docCode) {

}



//use global posting from Post SVI
export async function useHandlePost(documentID, docCode) {

}




// use global posting from Post Tran
export const useHandlePostTran = async (
  selectedData,
  userPw,
  docCode,
  userCode,
  setLoading,
  onClose
) => {

  setLoading(true);

  try {

 

    const payload = {
      userCode,
      userPassword: userPw,
      json_data: {
        userCode,
        dt1: selectedData.map((item, idx) => ({
          lnNo: idx + 1, // number (safer for SQL)
          groupId: item.groupId
        })),
      },
    };

    console.log(JSON.stringify(payload))
 
    const { data: res } = await apiClient.post("/finalize"+docCode, payload);

    if (res?.success) {
      const postedSummary = res?.data?.[0]?.result ?? "No summary returned.";
      useSwalValidationAlert({
        icon: "info",
        title: "Posting Summary",
        message: postedSummary,
      });
      onClose?.();
      return;
    }



    // 200 but success=false
    Swal.fire("Posting failed", res?.message ?? "Finalize failed.", "error");

  } catch (err) {

    // ❌ LOG ERROR IN DETAIL
    console.group("❌ FINALIZE ERROR");
    console.error("error object:", err);
    console.error("status:", err?.response?.status);
    console.error("response data:", err?.response?.data);
    console.groupEnd();

    const status = err?.response?.status;
    const data   = err?.response?.data || {};
    const code   = data.error || "";
    const msg    = data.message || "Something went wrong.";

    if (status === 422) {
      if (code === "INVALID_CREDENTIALS") {
        useSwalErrorAlert(
                  "Incorrect Password", 
                  "The password you entered is incorrect. Please try again."
                );
        return { success: false, code, message: msg };
      }
      if (code === "MISSING_CREDENTIALS" || code === "VALIDATION_ERROR" || !data?.error) {
        Swal.fire("Missing credentials", msg, "info");
        return { success: false, code: code || "MISSING_CREDENTIALS", message: msg };
      }
    }

    if (status === 403 && (code === "USER_INACTIVE" || code === "USER_MISMATCH")) {
      const text =
        code === "USER_INACTIVE"
          ? (msg || "User is inactive.")
          : "Authenticated user does not match userCode.";
      Swal.fire("Blocked", text, "warning");
      return { success: false, code, message: text };
    }

    Swal.fire("Error", msg, "error");
    return { success: false, code: code || "UNKNOWN", message: msg };

  } finally {
    setLoading(false);
  }
};










export const useFieldLenghtCheck = async (tableName) => {

  try {

    const payload = {tableName}
    const response = await fetchData("getHSTblColLen",payload );
    // ✅ Match actual API format
    if (!response || !response.success ) {
      console.warn("Invalid API response structure", response);
      return [];
    }

    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");

    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData
      : null;

  } catch (error) {
    console.error("Error fetching Table Field lenght:", error);
    return [];
  }
};





export const useGetFieldLength = (fieldsArray, fieldName) => {
  if (!Array.isArray(fieldsArray) || !fieldName) return 0;

  const field = fieldsArray.find(
    (item) => item.fieldname?.toLowerCase() === fieldName.toLowerCase()
  );

  return field ? parseInt(field.fieldlength, 10) : 0;
};






// export const useFieldLenghtCheck = async (tableName) => {
//   try {
//     const payload = { tableName };
//     const response = await fetchData("getHSTblColLen", payload);

//     // ✅ Validate API response
//     if (!response || !response.success) {
//       console.warn("Invalid API response structure:", response);
//       return [];
//     }

//     // ✅ Parse safely
//     let parsedData = [];
//     try {
//       const rawResult = response.data?.[0]?.result || "[]";
//       const json = JSON.parse(rawResult);

//       // Convert to array if backend returns single object
//       parsedData = Array.isArray(json) ? json : [json];
//     } catch (parseError) {
//       console.error("Error parsing response data:", parseError);
//       return [];
//     }

//     return parsedData;
//   } catch (error) {
//     console.error("Error fetching table field length:", error);
//     return [];
//   }
// };
