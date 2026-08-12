import React, { lazy } from "react";

// Maps DB componentKey -> lazy React component. Keep keys stable because the
// backend stores them in menu-routes/menu-items.
const lazyPage = (loader) => lazy(loader);

const UniversalReportModal = lazyPage(() =>
  import("./NAYSA Cloud/Printing/UniversalReportModal.jsx")
);

const reportModal = (module) => {
  const ReportModal = (props) => (
    <UniversalReportModal {...props} module={module} />
  );
  ReportModal.displayName = `${module}ReportModal`;
  return ReportModal;
};

export const pageRegistry = {
  // Accounts Receivable
  SVI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/SVI.jsx")),
  SOA: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/SOA.jsx")),
  ARCM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/ARCM.jsx")),
  ARDM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/ARDM.jsx")),
  CR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/CR.jsx")),
  AR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/AR.jsx")),
  ARDS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/ARDS.jsx")),
  PRC: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PRC.jsx")),

  // Accounts Payable
  APV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/APV.jsx")),
  APCM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/APCM.jsx")),
  APDM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/APDM.jsx")),
  PCV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PCV.jsx")),
  APV2307: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/APV2307.jsx")),
  CV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/CV.jsx")),
  CVHistory: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/CVHistory.jsx")),
  CheckTemplateSetup: lazyPage(() => import("./NAYSA Cloud/Matrix/CheckTemplateSetup.jsx")),

  // Purchasing
  PR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/PR.jsx")),
  PRApprovalModal: lazyPage(() => import("./NAYSA Cloud/Approval/PRApprovalModal.jsx")),
  JOApprovalModal: lazyPage(() => import("./NAYSA Cloud/Approval/JOApprovalModal.jsx")),
  POApprovalModal: lazyPage(() => import("./NAYSA Cloud/Approval/POApprovalModal.jsx")),
  ApprovalMatrixModal: lazyPage(() => import("./NAYSA Cloud/Approval/GlobalApprovalMatrix.jsx")),
  PO: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/PO.jsx")),
  JO: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/JO.jsx")),
  JobCodeRef: lazyPage(() => import("./NAYSA Cloud/Reference File/JobCodeRef.jsx")),

  // Sales
  SO: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/SO.jsx")),
  DR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/DR.jsx")),
  SI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/SI.jsx")),
  CSI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/CSI.jsx")),
  SALESANALYSIS: lazyPage(() => import("./NAYSA Cloud/Query/SOInq/SalesAnalysis.jsx")),
  // Inventory
  MSRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSRR.jsx")),
  MSIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSIS.jsx")),
  MSST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSST.jsx")),
  RMST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMST.jsx")),
  MSAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSAJ.jsx")),
  FGAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGAJ.jsx")),
  MSRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSRTV.jsx")),
  FGRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGRTV.jsx")),
  RMRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMRTV.jsx")),
  FGRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGRR.jsx")),
  RMRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMRR.jsx")),
  FGSR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGSR.jsx")),
  FGST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGST.jsx")),
  RMAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMAJ.jsx")),
  FGIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGIS.jsx")),
  RMIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMIS.jsx")),
  FGPR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGPR.jsx")),
  RMPR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMPR.jsx")),
  FGRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/FGRFP.jsx")),
  RMRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/RMRFP.jsx")),
  MSRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/MSRFP.jsx")),




  // Production 
  WO: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Production/WO.jsx")),
  StorePortalOrder: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/StorePortal/StorePortalOrder.jsx")),
  Commissary: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/StorePortal/Commissary.jsx")),

  // Importation
  LC: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Importation/LC.jsx")),

  // Fixed Assets
  FADP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/FADP.jsx")),
  FADS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/FADS.jsx")),
  FARR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/FARR.jsx")),
  FARS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/FARS.jsx")),
  FATR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/FATR.jsx")),

  // General Ledger & Master Data
  JV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/General Ledger/JV.jsx")),
  BUDBB: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/BUDBB.jsx")),
  BUDAU: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/BUDAU.jsx")),
  BUDCL: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/BUDCL.jsx")),
  BUDRA: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/BUDRA.jsx")),
  COAMast: lazyPage(() => import("./NAYSA Cloud/Master Data/ChartofAccounts/COAMast.jsx")),
  FSConso: lazyPage(() => import("./NAYSA Cloud/Master Data/ChartofAccounts/FSConsolidation.jsx")),
  GLFSMatching: lazyPage(() => import("./NAYSA Cloud/Master Data/ChartofAccounts/GLFSMatching.jsx")),
  BankMast: lazyPage(() => import("./NAYSA Cloud/Master Data/BankMast.jsx")),
  RCMast: lazyPage(() => import("./NAYSA Cloud/Master Data/RCMast.jsx")),
  CustMast: lazyPage(() => import("./NAYSA Cloud/Master Data/CustMast.jsx")),
  VendMast: lazyPage(() => import("./NAYSA Cloud/Master Data/VendMast.jsx")),
  SLMast: lazyPage(() => import("./NAYSA Cloud/Master Data/SLMast.jsx")),
  MSMast: lazyPage(() => import("./NAYSA Cloud/Master Data/MSMasterData/MSMast.jsx")),
  FGMast: lazyPage(() => import("./NAYSA Cloud/Master Data/FGMasterData/FGMast.jsx")),
  RMMast: lazyPage(() => import("./NAYSA Cloud/Master Data/RMMasterData/RMMast.jsx")),
  RMMast: lazyPage(() => import("./NAYSA Cloud/Master Data/RMMasterData/RMMast.jsx")),
  FAMast: lazyPage(() => import("./NAYSA Cloud/Master Data/FAMasterData/FAMast.jsx")),
  ProdBOM: lazyPage(() => import("./NAYSA Cloud/Master Data/BillofMaterial/Reference File/ProdBOM.jsx")),
  ProdWorkCenter: lazyPage(() => import("./NAYSA Cloud/Master Data/BillofMaterial/Reference File/ProdWorkCenter.jsx")),
  ProdParameters: lazyPage(() => import("./NAYSA Cloud/Master Data/BillofMaterial/Reference File/ProdParameters.jsx")),
  ProdParameter: lazyPage(() => import("./NAYSA Cloud/Master Data/BillofMaterial/Reference File/ProdParameters.jsx")),
  // Global & Queries
  AllTranHistory: lazyPage(() => import("./NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx")),
  BudgetInquiry: lazyPage(() => import("./NAYSA Cloud/Query/BUDInq/BUDInq.jsx")),
  BUDInq: lazyPage(() => import("./NAYSA Cloud/Query/BUDInq/BUDInq.jsx")),
  ARINQ: lazyPage(() => import("./NAYSA Cloud/Query/ARInq/ARINQ.jsx")),
  APINQ: lazyPage(() => import("./NAYSA Cloud/Query/APInq/APINQ.jsx")),
  EWTINQ: lazyPage(() => import("./NAYSA Cloud/Query/EWTInq/EWTINQ.jsx")),
  InvoiceEmailingHistory: lazyPage(() =>
    import("./NAYSA Cloud/Module/Main Module/Sales/InvoiceEmailingHistory.jsx")
  ),
  CWTINQ: lazyPage(() => import("./NAYSA Cloud/Query/CWTInq/CWTINQ.jsx")),
  INTAXINQ: lazyPage(() => import("./NAYSA Cloud/Query/INTAXInq/INTAXINQ.jsx")),
  OUTAXINQ: lazyPage(() => import("./NAYSA Cloud/Query/OUTAXInq/OUTAXINQ.jsx")),
  CWTMonitoring: lazyPage(() => import("./NAYSA Cloud/Query/CWTInq/CWTMonitoring.jsx")),
  CheckRL: lazyPage(() => import("./NAYSA Cloud/Query/CheckRL/CheckRL.jsx")),
  GLINQ: lazyPage(() => import("./NAYSA Cloud/Query/GLInq/GLInq.jsx")),
  GLANALYSIS: lazyPage(() => import("./NAYSA Cloud/Query/GLInq/GLAnalysis.jsx")),
  AuditTrail: lazyPage(() => import("./NAYSA Cloud/Query/AuditTrail/AuditTail.jsx")),
  SecurityAuditTrail: lazyPage(() => import("./NAYSA Cloud/Query/AuditTrail/SecurityAuditTrail.jsx")),
  MSINQ: lazyPage(() => import("./NAYSA Cloud/Query/INVInq/MSStockCard.jsx")),
  FGINQ: lazyPage(() => import("./NAYSA Cloud/Query/INVInq/FGStockCard.jsx")),
  RMINQ: lazyPage(() => import("./NAYSA Cloud/Query/INVInq/RMStockCard.jsx")),
  SalesTracker: lazyPage(() => import("./NAYSA Cloud/Query/SOInq/SalesTracker.jsx")),
  FAINQ: lazyPage(() => import("./NAYSA Cloud/Query/FAInq/FAAssetInquiry.jsx")),
  FAAssetInquiry: lazyPage(() => import("./NAYSA Cloud/Query/FAInq/FAAssetInquiry.jsx")),
  SearchFAFind: lazyPage(() => import("./NAYSA Cloud/Lookup/SearchFAFind.jsx")),
  AssetFinder: lazyPage(() => import("./NAYSA Cloud/Lookup/SearchFAFind.jsx")),
  SearchPPETag: lazyPage(() => import("./NAYSA Cloud/Lookup/SearchPPETag.jsx")),

  // Global Reference
  Company: lazyPage(() => import("./NAYSA Cloud/Reference File/Company.jsx")),
  CutoffRef: lazyPage(() => import("./NAYSA Cloud/Reference File/CutoffRef.jsx")),
  VATRef: lazyPage(() => import("./NAYSA Cloud/Reference File/VATRef.jsx")),
  CurrRef: lazyPage(() => import("./NAYSA Cloud/Reference File/CurrRef.jsx")),
  DForexRef: lazyPage(() => import("./NAYSA Cloud/Reference File/DForexRef.jsx")),
  BranchRef: lazyPage(() => import("./NAYSA Cloud/Reference File/BranchRef.jsx")),
  BankRef: lazyPage(() => import("./NAYSA Cloud/Reference File/BankRef.jsx")),
  UpdateUser: lazyPage(() => import("./NAYSA Cloud/Reference File/UpdateUser.jsx")),
  UserAccessRights: lazyPage(() => import("./NAYSA Cloud/Reference File/UserAccessRights.jsx")),
  MasterAccessRights: lazyPage(() => import("./NAYSA Cloud/Reference File/MasterAccessRights.jsx")),
  ReportAccessRights: lazyPage(() => import("./NAYSA Cloud/Reference File/ReportAccessRights.jsx")),
  ATaxCode: lazyPage(() => import("./NAYSA Cloud/Reference File/ATCRef.jsx")),
  BillCodeRef: lazyPage(() => import("./NAYSA Cloud/Reference File/BillCodeRef.jsx")),
  LCRef: lazyPage(() => import("./NAYSA Cloud/Reference File/LCRef.jsx")),
  BudItemRef: lazyPage(() => import("./NAYSA Cloud/Reference File/BudItemRef.jsx")),
  BudgetAccountRef: lazyPage(() => import("./NAYSA Cloud/Reference File/BudgetAccountRef.jsx")),
  WarehouseLocation: lazyPage(() => import("./NAYSA Cloud/Master Data/Inventory/WareMast.jsx")),
  UOM: lazyPage(() => import("./NAYSA Cloud/Master Data/Inventory/UOM.jsx")),
  QualityStat: lazyPage(() => import("./NAYSA Cloud/Master Data/Inventory/QualityStat.jsx")),

  // Posting
  PostSVI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostSVI.jsx")),
  PostSOA: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostSOA.jsx")),
  PostARCM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostARCM.jsx")),
  PostARDM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostARDM.jsx")),
  PostCR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostCR.jsx")),
  PostAR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostAR.jsx")),
  PostCV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PostCV.jsx")),
  PostPCV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PostPCV.jsx")),
  PostJV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/General Ledger/PostJV.jsx")),
  PostAPV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPV.jsx")),
  PostAPCM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPCM.jsx")),
  PostAPDM: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPDM.jsx")),
  PostMSRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSRR.jsx")),
  PostMSIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSIS.jsx")),
  PostMSRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSRTV.jsx")),
  PostMSST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSST.jsx")),
  PostRMST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMST.jsx")),
  PostFGRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGRTV.jsx")),
  PostFGST: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGST.jsx")),
  PostFGSR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGSR.jsx")),
  PostMSIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSIS.jsx")),
  PostRMRTV: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMRTV.jsx")),
  PostFGRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGRR.jsx")),
  PostFGPR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGPR.jsx")),
  PostRMPR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMPR.jsx")),
  PostMSAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSAJ.jsx")),
  PostFGAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGAJ.jsx")),
  PostRMAJ: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMAJ.jsx")),
  PostFADP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/PostFADP.jsx")),
  PostFADS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/PostFADS.jsx")),
  PostFARR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/PostFARR.jsx")),
  PostFARS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/PostFARS.jsx")),
  PostFATR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Fixed Assets/PostFATR.jsx")),
  PostDR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/PostDR.jsx")),
  PostSI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/PostSI.jsx")),
  InvoiceEmailing: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/InvoiceEmailing.jsx")),
  PostCSI: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Sales/PostCSI.jsx")),
  PostLC: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Importation/PostLC.jsx")),
  PostBUDBB: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/PostBUDBB.jsx")),
  PostBUDAU: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/PostBUDAU.jsx")),
  PostBUDRA: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/PostBUDRA.jsx")),
  PostBUDCL: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Budget/PostBUDCL.jsx")),
  PostRMRR: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMRR.jsx")),
  PostRMIS: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMIS.jsx")),
  PostFGRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostFGRFP.jsx")),
  PostRMRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostRMRFP.jsx")),
  PostMSRFP: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Inventory/PostMSRFP.jsx")),
  MonthendGLProcessingModal: lazyPage(() => import("./NAYSA Cloud/Processing/MonthendProcessing.jsx")),
  YearendGLProcessingModal: lazyPage(() => import("./NAYSA Cloud/Processing/YearendProcessing.jsx")),
  BankReconProcessing: lazyPage(() => import("./NAYSA Cloud/Processing/BankReconProcessing.jsx")),
  BankReconProcessingModal: lazyPage(() => import("./NAYSA Cloud/Processing/BankReconProcessing.jsx")),

  // Matrix
  SalesPMCustomerItem: lazyPage(() => import("./NAYSA Cloud/Matrix/SalesPMCustomerItem.jsx")),
  CommisaryPriceMatrix: lazyPage(() => import("./NAYSA Cloud/Matrix/CommisaryPriceMatrix.jsx")),
  CAN: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/CAN.jsx")),

  // Purchasing Inquiry (Unified/Merged)
  PRInquiry: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/PRInquiry.jsx")),
  PRInq: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/PRInquiry.jsx")),
  POInq: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/POInquiry.jsx")),
  JOInq: lazyPage(() => import("./NAYSA Cloud/Module/Main Module/Purchasing/JOInquiry.jsx")),

  // Printing (Universal Modal Mapping)
  APReportModal: reportModal("AP"),
  VIReportModal: reportModal("VI"),
  EWTReportModal: reportModal("EWT"),
  ARReportModal: reportModal("AR"),
  VOReportModal: reportModal("VO"),
  CWTReportModal: reportModal("CWT"),
  GLReportModal: reportModal("GL"),
  BIRReportModal: reportModal("BIR"),
  PURReportModal: reportModal("PUR"),
  MSINVReportModal: reportModal("MS"),
  FGINVReportModal: reportModal("FG"),
  RMINVReportModal: reportModal("RM"),
  FAReportModal: reportModal("FA"),
  IMPReportModal: reportModal("IMP"),
  SalesReportModal: reportModal("OE"),
  BUDReportModal: reportModal("BUD"),
  PRDReportModal: reportModal("PRD"),
};
