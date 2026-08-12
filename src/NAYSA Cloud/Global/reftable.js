import BankMast from "../Master Data/BankMast";
import COAMast from "../Master Data/ChartofAccounts/COAMast";
import BillCodeRef from "../Reference File/BillCodeRef";
import CutoffRef from "../Reference File/CutoffRef";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalshowSave,
  useSwalValidationAlert,
  useSwalDeleteRecord,
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

export const reftables = {

    // Reference Files
    Branch: "Branch Codes",
    BankType: "Bank Type Codes",
    UserAccRight: "User Access Rights",
    Company: "Company ID",
    VATRef: "VAT Codes",
    Cutoff: "Cycle Period",
    Currency: "Currency Codes",
    FSConso: "FS Consolidation",
    GLFSMatching: "GL-FS Matching",
    COAMast: "Chart of Accounts",
    UserUpdate: "User Management",
    BankMast: "Bank Master Data",
    BillCode: "Billing Codes",
    VendMast: "Payee Master Data",

    JobCodeRef: "Job Codes",
    AgentRef: "Agent Codes",
    ZoneRef: "Zone Codes",
    AreaRef: "Area Codes",
    CustTypeRef: "Customer Types",
    BillTermRef: "Billing Terms",

    // Accounts Payable Module
    APV: "Accounts Payable Voucher Transaction",
    APDM: "AP Debit Memo Voucher Transaction",
    APCM: "AP Credit Memo Voucher Transaction",
    CV: "Check Voucher Transaction",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "Service Invoice Transaction",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",


  };

  
  export const reftablesVideoGuide = {
    
    // General Ledger Module
    Branch: "https://www.youtube.com/watch?v=e5gBnrL-3u4&list=PLfNvt59xJjIgoEopcrnnG9fWfz76EMIxO&index=5&t=9s",
    PCV: "https://www.youtube.com/watch?v=VsITqPlYIjM&ab_channel=Learn%40NAYSA",

    // Accounts Payable Module
    APV: "https://www.youtube.com/watch?v=e5gBnrL-3u4&list=PLfNvt59xJjIgoEopcrnnG9fWfz76EMIxO&index=5&t=9s",
    APDM: "https://youtu.be/ZzFMbTBLp-I",
    APCM: "https://youtu.be/ULTdHwSylLs",
    CV: "https://www.youtube.com/watch?v=x8CsG1pHSM8&ab_channel=Learn%40NAYSA",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "Service Invoice Transaction",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",

    
    COAMast: "https://www.youtube.com/watch?v=NfiO76wxs9U",

  };

  export const reftablesPDFGuide = {
    
    // General Ledger Module
    Branch: "/public/Guide/NAYSA AP Accounts Payable Voucher.pdf",
    PCV: "/public/Guide/NAYSA GL Petty Cash Voucher.pdf",

    // Accounts Payable Module
    APV: "/public/Guide/NAYSA AP Accounts Payable Voucher.pdf",
    APDM: "/public/Guide/NAYSA AP Debit Memo.pdf",
    APCM: "/public/Guide/NAYSA AP Credit Memo.pdf",
    CV: "/public/Guide/NAYSA AP Check Voucher.pdf",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "Service Invoice Transaction",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",

    COAMast: "/public/Guide/NAYSA GL Reference Files.pdf",

  };


  // utils/accountUtils.js (or useAccountActions.js)

 export const useGlobalDuplicateRefTable = async (tblCode, payload, fieldcaption) => {
  try {
    const response = await apiClient.post(`/checkDuplicate${tblCode}`, payload);
    
    // Access the first row and parse the JSON string from the empty key ""
    const rawData = response.data.data[0]?.[""] || '{"result":"0"}';
    const { result } = JSON.parse(rawData);

    if (result === "1") {
      useSwalInfoAlert(
        "Duplicate Entry",
        `The ${fieldcaption} code you entered already exists. Please use a unique code.`
      );
      return true; 
    }
    return false; // It is NOT in use
  } catch (error) {
    console.error("Duplicate check failed:", error);
    return true; // Block action on error as a safety measure
  }
};






export const useGlobalDeleteRefTable = async ({
  rowParam = null,
  selectedAccount = null,
  onSuccess,
  onReset,
  payload,
  tblCode,
  idKey = "acctCode",
  fieldcaption
}) => {
  const row = rowParam || selectedAccount;

  // 1. Basic Selection Validation
  if (!row?.[idKey]) {
    await showValidation("Error", [`Please select an ${fieldcaption} to delete.`]);
    return;
  }

  try {
    // 2. Check if in use BEFORE asking for confirmation
    const inUsed = await apiClient.post(`/checkInUsed${tblCode}`, payload);
    
    // Safety check for data structure
    const rawData = inUsed.data.data[0]?.[""] || '{"result":"0"}';
    const parsedData = JSON.parse(rawData);

    if (parsedData.result === "1") {
      // Use 'await' so the function stops here until user clicks OK
      await useSwalInfoAlert(
        "Action Restricted",
        `This ${fieldcaption} code is currently in use and cannot be deleted.`
      );
      return; // Exit early
    }

    // 3. Confirmation (Only appears if NOT in use)
    const confirm = await useSwalDeleteConfirm(
      `Delete this ${fieldcaption}?`,
      `Code: ${row[idKey]}`,
      "Yes, delete it"
    );

    if (!confirm.isConfirmed) return;

    // 4. Actual Deletion
    const response = await apiClient.post(`/delete${tblCode}`, payload);

    if (response?.data?.success) {
      await useSwalDeleteRecord();
      
      if (onSuccess) await onSuccess();
      
      // Compare current selection to deleted row to trigger reset
      if (selectedAccount?.[idKey] === row[idKey] && onReset) {
        onReset();
      }
    } else {
      await showValidation("Error", [
        response?.data?.message || `Failed to delete ${fieldcaption}.`,
      ]);
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || `Failed to delete ${fieldcaption}.`;
    await showValidation("Error", [msg]);
  }
};