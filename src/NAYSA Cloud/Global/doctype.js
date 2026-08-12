import DR from "../Module/Main Module/Sales/DR";

export const docTypes = {
  SO: "SO",
  DR: "DR",
  SI: "SI", 
  SVI: "SVI",
  CV: "CV",
  JV: "JV",
  APV:"APV",
  PCV:"PCV",
  SOA:"SOA",
  ARCM:"ARCM",
  ARDM:"ARDM",
  APCM:"APCM",
  APDM:"APDM",
  CR:"CR",
  AR:"AR",
  MSRR:"MSRR",
  MSIS:"MSIS",
  MSAJ:"MSAJ",
  FGAJ:"FGAJ",
  MSST:"MSST",
  MSRTV:"MSRTV",
  FGRTV:"FGRTV",
  FGSR:"FGSR",
  FARR:"FARR",
  FARS:"FARS",
  FAAD:"FAAD",
  FADP:"FADP",
  FADS:"FADS",
  FAMG:"FAMG",
  FARC:"FARC",
  FASP:"FASP",
  FATR:"FATR",
  FGST:"FGST",
  FGIS:"FGIS",
  PR:"PR",
  JO:"JO",  
  RMRR:"RMRR",
  RMIS:"RMIS",
  RMRTV:"RMRTV",
  RMAJ:"RMAJ",
  RMST:"RMST",
  WO:"WO",
  MSRFP:"MSRFP",
  RMRFP:"RMRFP",
  FGRFP:"FGRFP"
};



export const docTypeNames = {

    // General Ledger Module
    JV: "Journal Voucher Transaction",
    PCV: "Petty Cash Voucher Transaction",
    // Accounts Payable Module
    APV: "Accounts Payable Voucher Transaction",
    APDM: "AP Debit Memo Voucher Transaction",
    APCM: "AP Credit Memo Voucher Transaction",
    CV: "Check Voucher Transaction",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "Service Invoice Transaction",
    SO: "Sales Order Transaction",
    DR: "Delivery Receipt Transaction",
    ARDM: "AR Debit Memo Transaction",
    ARCM: "AR Credit Memo Transaction",
    CR: "Collection Receipt Transaction",
    AR: "Acknowledgement Receipt Transaction",
    SOA: "Statement of Account Transaction",


    MSRR: "MS Receiving Report Transaction",
    RMRR: "RM Receiving Report Transaction",
    MSIS: "MS Issue Slip Transaction",
    MSST: "MS Stock Transfer Transaction",
    MSAJ: "MS Inventory Adjustment Transaction",
    FGAJ: "FG Inventory Adjustment Transaction",
    RMAJ: "RM Inventory Adjustment Transaction",
    MSRTV: "MS Inventory Return to Vendor Transaction",
    FGRTV: "FG Inventory Return to Vendor Transaction",
    FGSR: "FG Sales Return Transaction",
    FGIS: "FG Issue Slip Transaction",
    FGST: "FG Stock Transfer Transaction",
    RMST: "RM Stock Transfer Transaction",
    RMRTV: "RM Inventory Return to Vendor Transaction",
    MSRFP: "MS Return from Production Transaction",
    RMRFP: "RM Return from Production Transaction",
    FGRFP: "FG Return from Production Transaction",


    // Fixed Assets Module
    FARR: "Fixed Assets Receiving Transaction",
    FARS: "Fixed Asset Restructuring Transaction",
    FAAD: "Fixed Asset Adjustment Transaction",
    FADP: "Fixed Asset Depreciation Transaction",
    FADS: "Fixed Asset Disposal Transaction",
    FAMG: "Fixed Asset Merge Transaction",
    FARC: "Fixed Asset Reclassification Transaction",
    FASP: "Fixed Asset Split Transaction",
    FATR: "Fixed Asset Transfer Location Transaction",

    WO: "Work Order Transaction",
    PR: "Purchase Request Transaction",
    JO: "Job Order Transaction",

  };




  export const docTypeVideoGuide = {
    
    // General Ledger Module
    JV: "https://www.youtube.com/watch?v=NtA7iqQ5tu0&ab_channel=Learn%40NAYSA",
    PCV: "https://www.youtube.com/watch?v=VsITqPlYIjM&ab_channel=Learn%40NAYSA",

    // Accounts Payable Module
    APV: "https://www.youtube.com/watch?v=e5gBnrL-3u4&list=PLfNvt59xJjIgoEopcrnnG9fWfz76EMIxO&index=5&t=9s",
    APDM: "https://youtu.be/ZzFMbTBLp-I",
    APCM: "https://youtu.be/ULTdHwSylLs",
    CV: "https://www.youtube.com/watch?v=x8CsG1pHSM8&ab_channel=Learn%40NAYSA",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "https://www.youtube.com/watch?v=x8CsG1pHSM8&ab_channel=Learn%40NAYSA",
    SO: "Sales Order Transaction",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",

    // Fixed Assets Module
    FARR: "",
    FARS: "",
    FAAD: "",
    FADP: "",
    FADS: "",
    FAMG: "",
    FARC: "",
    FASP: "",
    FATR: "",
    FGSR: "",

    
    WO: "",

  };

  export const docTypePDFGuide = {
    
    // General Ledger Module
    JV: "/public/Guide/NAYSA GL Journal Voucher.pdf",
    PCV: "/public/Guide/NAYSA GL Petty Cash Voucher.pdf",

    // Accounts Payable Module
    APV: "/public/Guide/NAYSA AP Accounts Payable Voucher.pdf",
    APDM: "/public/Guide/NAYSA AP Debit Memo.pdf",
    APCM: "/public/Guide/NAYSA AP Credit Memo.pdf",
    CV: "/public/Guide/NAYSA AP Check Voucher.pdf",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "/public/Guide/NAYSA AR Billing Invoice.pdf",
    SO: "Sales Order Transaction",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",

    // Fixed Assets Module
    FARR: "",
    FARS: "",
    FAAD: "",
    FADP: "",
    FADS: "",
    FAMG: "",
    FARC: "",
    FASP: "",
    FATR: "",
    FGSR: "",
    
    WO: "",
    
  };








  export const glAccountFilter = {
    ActiveAll: "ActiveAll",
    PayableAcct: "APGL",
    VATOutputAcct:"VATOutputAcct",
    VATInputAcct:"VATInputAcct"
  };
