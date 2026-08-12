// import { useState, useEffect,useRef,useCallback } from "react";
// import Swal from 'sweetalert2';
// import { useNavigate,useLocation  } from "react-router-dom";

// // UI
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faClipboardCheck, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// // Lookup/Modal
// import BranchLookupModal from "../../../Lookup/SearchBranchRef";
// import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
// import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
// import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
// import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
// import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
// import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
// import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
// import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
// import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
// import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
// import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
// import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
// import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
// import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
// import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
// import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
// import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// // Configuration
// import { apiClient, fetchDataJson, postRequest} from '../../../Configuration/BaseURL.jsx'
// import { useReset } from "../../../Components/ResetContext";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import {
//   glAccountFilter,
//   docTypes,
//   docTypeVideoGuide,
//   docTypePDFGuide,
// } from '@/NAYSA Cloud/Global/doctype';

// import {
//   useTopRCRow,
//   useTopBillTermRow,
//   useTopForexRate,
//   useTopCurrencyRow,
//   useTopSalesRepRow,
// } from '@/NAYSA Cloud/Global/top1RefTable';

// import {
//   useUpdateRowGLEntries,
//   useTransactionUpsert,
//   useGenerateGLEntries,
//   useUpdateRowEditEntries,
//   useFetchTranData,
//   useHandleCancel,
//   useFieldLenghtCheck,
//   useGetFieldLength,
// } from '@/NAYSA Cloud/Global/procedure';

// import {
//   useGetCurrentDayV2,
//   useformatToDatev2
// } from '@/NAYSA Cloud/Global/dates';
// import {
//   useSelectedHSColConfig as selectedHSColConfig
// } from '@/NAYSA Cloud/Global/selectedData';

// import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
// import {
//   transactionActionsCellStyle,
//   transactionActionsHeaderStyle,
//   useResizableTableColumns,
// } from '@/NAYSA Cloud/Global/datatable.jsx';

// import {
//   useHandlePrint,
// } from '@/NAYSA Cloud/Global/report';

// import {
//   formatNumber,
//   parseFormattedNumber,
//   useSwalProceedConfirm,
//   useSwalvalidateRequiredFields,
//   useSwalshowSaveSuccessDialog,
//   useSwalSuccessAlert,
//   useSwalErrorAlert
// } from '@/NAYSA Cloud/Global/behavior.jsx';

// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// // Header
// import Header from '@/NAYSA Cloud/Components/Header';
// const SI = () => {

//   // View Document Const
//   const loadedFromUrlRef = useRef(false);
//   const originalSOQuantityRef = useRef({});
//   const detailRowsRef = useRef([]);
//   const detailRowsGLRef = useRef([]);
//   const addTypeDropdownRef = useRef(null);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopATCRow,getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
//   const [isViewDocument, setIsViewDocument] = useState(false);
//   useEffect(() => {
//     const p = new URLSearchParams(location.search);
//     if (p.get("viewDocument") === "true") {
//       setIsViewDocument(true);
//     }
//     }, []);

//   const isViewDocumentUrl = isViewDocument;

//   const [topTab, setTopTab] = useState("details"); // "details" | "history"
//   const { resetFlag } = useReset();
//   const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
//   const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
//   const [showItemPickingModal, setShowItemPickingModal] = useState(false);
//   const [itemPickingRowIndex, setItemPickingRowIndex] = useState(null);
//   const [itemPickingStockRows, setItemPickingStockRows] = useState([]);
//   const [itemPickingExistingAllocations, setItemPickingExistingAllocations] = useState([]);
//   const docType = docTypes.SI;
//   const hsDoc = getAllTopHSDocRow(docType) || {};
//   const pdfLink = docTypePDFGuide[docType];
//   const videoLink = docTypeVideoGuide[docType];
//   const documentTitle = hsDoc.docName + ' Transaction';

//   useEffect(() => {
//     if (!showAddTypeDropdown) return;

//     const handleClickOutside = (event) => {
//       if (addTypeDropdownRef.current?.contains(event.target)) return;
//       setShowAddTypeDropdown(false);
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, [showAddTypeDropdown]);

//   const [state, setState] = useState({
//     // Document information
//     documentName: hsDoc?.docName||"",
//     documentSeries: hsDoc?.docSeries||"Auto",
//     documentDocLen: hsDoc?.docLength||8,
//     documentID: null,
//     documentDate:useGetCurrentDayV2(),
//     documentNo: "",
//     documentStatus:"",
//     status: "OPEN",
//     noReprints:"0",

//     // UI state
//     activeTab: "basic",
//     GLactiveTab: "invoice",
//     isLoading: false,
//     showSpinner: false,
//     triggerGLEntries:false,
//     isDocNoDisabled: false,
//     isSaveDisabled: false,
//     isResetDisabled: false,
//     isFetchDisabled: false,

//     branchCode: currentUserRow?.branchCode||"",
//     branchName: currentUserRow?.branchName||"",

//     // Customer information
//     // Customer information
//     billToCustCode: "",
//     billToCustName: "",
//     contactPerson: "",
//     customerPoNo: "",
//     customerPoDate: null,
//     salesRepCode: "",
//     salesRepName: "",
//     atcCode: "",
//     atcName: "",
//     vatCode: "",
//     vatName: "",
//     vatCodeFADisposal:"",

//     // Currency information
//     currCode: companyInfo?.currCode||"",
//     currName: companyInfo?.currName||"",
//     currRate: formatNumber(companyInfo?.currRate||1,6),
//     defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),

//     //Other Header Info
//     tblFieldArray :[],
//     siStatus: "O",
//     siTranType: "",
//     siTranTypeOptions: [],
//     siStatusOptions: [],
//     refSiNo1: "",
//     refSiNo2: "",
//     remarks: "",
//     billtermCode: "",
//     billtermName: "",
//     dueDate: "",
//     daysDue: "",
//     userCode: currentUserRow?.userCode||"",

//     //Detail 1-2
//     detailRows  :[],
//     detailRowsGL :[],
//     openDRSI_Data_Summary: [],
//     openDRSI_Col_Summary: [],

//     totalDebit:"0.00",
//     totalCredit:"0.00",
//     totalDebitFx1:"0.00",
//     totalCreditFx1:"0.00",
//     totalDebitFx2:"0.00",
//     totalCreditFx2:"0.00",

//     // Modal states
//     modalContext: '',
//     selectionContext: '',
//     selectedRowIndex: null,
//     accountModalSource: null,
//     showAccountModal:false,
//     insertAfterIndex: null,    
//     showRcModal:false,
//     showSlModal:false,
//     showBilltermModal:false,
//     showSalesRepModal:false,
//     showItemModal:false,    
//     showATCModal:false,
//     showVatModal:false,

//     currencyModalOpen:false,
//     branchModalOpen:false,
//     custModalOpen:false,
//     billtermModalOpen:false,
//     showCancelModal:false,
//     showAttachModal:false,
//     showSignatoryModal:false,
//     showAllTranDocNo:false,
//     showOpenDRModal:false
//    });

//   const updateState = (updates) => {
//       setState(prev => ({ ...prev, ...updates }));
//     };

//   const {
//   // Document info
//   documentName,
//   documentSeries,
//   documentDocLen,
//   documentID,
//   documentStatus,
//   documentNo,
//   documentDate,
//   status,
//   userCode,
//   noReprints,

//   // Tabs & loading
//   activeTab,
//   GLactiveTab,
//   isLoading,
//   showSpinner,
//   triggerGLEntries,

//   // UI states / disable flags
//   isDocNoDisabled,
//   isSaveDisabled,
//   isResetDisabled,
//   isFetchDisabled,
//   defaultCurrRate,

//   // Transaction Header
//   branchCode,
//   branchName,
//   billToCustCode,
//   billToCustName,
//   customerPoNo,
//   customerPoDate,
//   salesRepCode,
//   salesRepName,
//   atcCode,
//   atcName,
//   vatCode,
//   vatName,
//   currCode,
//   currName,
//   currRate,
//   siTranType,
//   siTranTypeOptions = [],
//   siStatus,
//   siStatusOptions = [],
//   refSiNo1,
//   refSiNo2,
//   remarks,
//   contactPerson,
//   billtermCode,
//   billtermName,
//   dueDate,
//   daysDue,
//   vatCodeFADisposal,

//   // Transaction details
//   tblFieldArray,
//   detailRows,
//   detailRowsGL,
//   openDRSI_Data_Summary,
//   openDRSI_Col_Summary,
//   totalDebit,
//   totalCredit,
//   totalDebitFx1,
//   totalCreditFx1,
//   totalDebitFx2,
//   totalCreditFx2,

//   // Contexts
//   modalContext,
//   selectionContext,
//   selectedRowIndex,
//   accountModalSource,
//   insertAfterIndex,

//   // Modals
//   showAccountModal,
//   showRcModal,
//   showSlModal,
//   showSalesRepModal,
//   showItemModal,
//   currencyModalOpen,
//   branchModalOpen,
//   custModalOpen,
//   billtermModalOpen,
//   showCancelModal,
//   showAttachModal,
//   showSignatoryModal,
//   showAllTranDocNo,
//   showOpenDRModal,
//   showATCModal,
//   showVatModal

//   } = state;

//   useEffect(() => {
//     detailRowsRef.current = detailRows || [];
//     detailRowsGLRef.current = detailRowsGL || [];
//   }, [detailRows, detailRowsGL]);

//   //Status Global Setup
//   const displayStatus = status || 'OPEN';
//   const statusMap = {
//     FINALIZED: "global-tran-stat-text-finalized-ui",
//     CANCELLED: "global-tran-stat-text-closed-ui",
//     CLOSED: "global-tran-stat-text-closed-ui",
//   };

//   const statusColor = statusMap[displayStatus] || "";
//   const normalizedDisplayStatus = String(displayStatus || "").toUpperCase();
//   const normalizedDocumentStatus = String(documentStatus || "").toUpperCase();
//   const isOpenStatus =
//     ["OPEN", "O"].includes(normalizedDisplayStatus) ||
//     ["OPEN", "O"].includes(normalizedDocumentStatus);
//   const isPosted = ["FINALIZED", "POSTED"].includes(normalizedDisplayStatus);
//   const isCancelled = normalizedDisplayStatus === "CANCELLED";
//   const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(normalizedDisplayStatus);  
//   const isHeaderSiStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
//   const totalSiQuantity = detailRows.reduce((total, row) => total + (parseFormattedNumber(row.siQuantity || 0) || 0),0);
//   const hasPickedQuantity = (detailRows || []).some(
//     (row) => (parseFormattedNumber(row.quantityPicked || 0) || 0) > 0
//   );

//   const filteredHeaderSiStatusOptions =
//     !isPosted && totalSiQuantity > 0
//       ? (siStatusOptions || []).filter(
//           (option) =>
//             ["O", "C"].includes(option.DROPDOWN_CODE) ||            
//             option.DROPDOWN_CODE === siStatus
//         )
//       : siStatusOptions;

//   //Variables
//   const [totals, setTotals] = useState({
//   totalGrossAmount: '0.00',
//   totalDiscountAmount: '0.00',
//   totalVatAmount: '0.00',
//   totalAtcAmount: '0.00',
//   totalSalesAmount: '0.00',
//   totalNetAmount: '0.00',
//   totalAmountDue: '0.00',
//   });

//   const customParamMap = {
//     acctCode: glAccountFilter.ActiveAll,
//   };
//   const customParam = customParamMap[accountModalSource] || null;

//   const getGLTotalsState = (rows) => {
//     const sourceRows = Array.isArray(rows) ? rows : [];
//     const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
//     const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
//     const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
//     const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
//     const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
//     const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);

//     return {
//       totalDebit: formatNumber(debitSum),
//       totalCredit: formatNumber(creditSum),
//       totalDebitFx1: formatNumber(debitFx1Sum),
//       totalCreditFx1: formatNumber(creditFx1Sum),
//       totalDebitFx2: formatNumber(debitFx2Sum),
//       totalCreditFx2: formatNumber(creditFx2Sum),
//     };
//   };

//   useEffect(() => {
//     updateState(getGLTotalsState(detailRowsGL));
//   }, [detailRowsGL]);

  
//   // Company defaults
//   const glCurrDefault = companyInfo?.currCode || "";
//   const sellingPriceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
//   const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);

//   // Company sales settings
//   const salesDiscountMode = String(companyInfo?.salesDiscountMode || "").toUpperCase();
//   const salesAllowDuplicateItem = String(
//     companyInfo?.salesAllowDuplicateItem || ""
//   ).toUpperCase();

//   // Derived UI flags
//   const isSellingPriceAndDiscountEditable = salesDiscountMode === "MANUAL";
//   const SI_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";

//   // Discount configuration
//   const discountLevel = Math.min(
//     Math.max(Number(companyInfo?.salesDiscLevel ?? 8), 1),
//     8
//   );
//   const showTotalDiscountColumn = discountLevel > 1;
//   const visibleDiscountRateFields = Array.from(
//     { length: discountLevel },
//     (_, index) => `discRate${index + 1}`
//   );
//   const visibleDiscountAmountFields = Array.from(
//     { length: discountLevel },
//     (_, index) => `discAmount${index + 1}`
//   );

//   const detailColumnDefs = [
//     { key: "drId", label: "DR ID", width: 120 },
//     { key: "soId", label: "SO ID", width: 120 },
//     { key: "groupId", label: "Group ID", width: 120 },
//     { key: "ln", label: "LN", width: 56 },
//     { key: "siStat", label: "Picking Status", width: 130 },
//     { key: "drNo", label: "DR No.", width: 140 },
//     { key: "itemCode", label: "Item Code", width: 140 },
//     { key: "itemName", label: "Item Name", width: 240 },
//     { key: "itemSpecs", label: "Specification", width: 240 },
//     { key: "uomCode", label: "UOM", width: 100 },
//     { key: "siQuantity", label: "SI Quantity", width: 120 },
//     { key: "quantityPicked", label: "Quantity Picked", width: 130 },
//     { key: "itemAmount", label: "Item Amount", width: 130 },
//     { key: "unitPrice", label: "Selling Price", width: 130 },
//     { key: "grossAmount", label: "Gross Amount", width: 130 },
//     ...visibleDiscountRateFields.map((field, index) => ({
//       key: field,
//       label: discountLevel === 1 ? "Disc Rate" : `Disc Rate ${index + 1}`,
//       width: 110,
//     })),
//     ...visibleDiscountAmountFields.map((field, index) => ({
//       key: field,
//       label: discountLevel === 1 ? "Disc Amount" : `Disc Amount ${index + 1}`,
//       width: 120,
//     })),
//     ...(showTotalDiscountColumn
//       ? [{ key: "totDiscount", label: "Total Discount", width: 130 }]
//       : []),
//     { key: "netAmount", label: "Net Amount", width: 130 },
//     { key: "vatCode", label: "VAT Code", width: 120 },
//     { key: "vatRate", label: "VAT Rate", width: 110 },
//     { key: "vatAmount", label: "VAT Amount", width: 130 },
//     { key: "salesAmount", label: "Sales Amount", width: 130 },
//     { key: "freeItem", label: "Free Item", width: 110 },
//   ];


//   const {
//     getColumnStyle: getDetailColumnStyle,
//     getFrozenColumnStyle,
//     getOrderedColumns: getOrderedSoDetailColumns,
//     getSortedRows: getSortedSoDetailRows,
//     setHiddenColumnKeys: setSoDetailHiddenColumnKeys,
//     setColumnOrder: setSoDetailColumnOrder,
//     clearAllSorting: clearSoDetailSorting,
//     clearZeroValueOnFocus: clearSoDetailZeroOnFocus,
//     focusNextRowInput: focusNextSoDetailRowInput,
//     renderHeaderContextMenu: renderSoDetailHeaderContextMenu,
//     renderResizableHeader: renderSiDetailHeader,
//   } = useResizableTableColumns(detailColumnDefs);
//   const orderedDetailColumns = getOrderedSoDetailColumns(detailColumnDefs);
//   const normalizedSiTranType = String(siTranType || "").toUpperCase();
//   const isDirectSiType = normalizedSiTranType === "SI01";
//   const isPickingSiType = normalizedSiTranType === "SI02";
//   const canUsePickingControls =
//     isPickingSiType && !isViewDocumentUrl && isOpenStatus && !isPosted && !isCancelled;
//   const isAddItemDisabledBySiType = isDirectSiType;
//   const isOpenDRDisabledBySiType = isPickingSiType;
//   const hasSiDetailRows = (detailRows || []).length > 0;
//   const hasDRLinkedDetailRows = (detailRows || []).some((row) =>
//     Boolean(String(row?.drNo || "").trim())
//   );
//   const getDetailColumnFallbackWidth = (key) =>
//     detailColumnDefs.find((column) => column.key === key)?.width || 120;
//   const getDetailCellStyle = (key, fallbackWidth) => ({
//     ...getDetailColumnStyle(key, fallbackWidth),
//     ...getFrozenColumnStyle(key, orderedDetailColumns, fallbackWidth, {
//       isHeader: false,
//     }),
//   });
//   useEffect(() => {
//     setSoDetailColumnOrder(detailColumnDefs.map((column) => column.key));
//   }, [setSoDetailColumnOrder, discountLevel]);

//   useEffect(() => {
//     const hiddenColumnKeys = ["drId", "soId", "groupId", "vatRate"];

//     if (!isPickingSiType) {
//       hiddenColumnKeys.push("siStat", "quantityPicked", "itemAmount");
//     }

//    if (isPickingSiType || normalizedSiTranType === "SI03") {
//       hiddenColumnKeys.push("drNo");
//     }


//     if (normalizedSiTranType === "SI03") {
//       hiddenColumnKeys.push("discRate1", "discRate2", "discRate3", "discRate4", "discRate5", "discRate6", "discRate7", "discRate8", "discAmount1", "discAmount2", "discAmount3", "discAmount4", "discAmount5", "discAmount6", "discAmount7", "discAmount8", "totDiscount","freeItem");
//     }



//     setSoDetailHiddenColumnKeys(hiddenColumnKeys);
//   }, [setSoDetailHiddenColumnKeys, isDirectSiType, isPickingSiType,normalizedSiTranType]);


//   const sortedDetailRows = getSortedSoDetailRows(
//     detailRows.map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => {
//       if (sortKey === "ln") {
//         return entry.originalIndex + 1;
//       }

//       return entry.row?.[sortKey] ?? "";
//     }
//   );

//   const withCurr2 = (companyInfo?.glCurrMode === "M" && glCurrDefault !== currCode) || companyInfo?.glCurrMode === "D";
//   const withCurr3 = companyInfo?.glCurrMode === "T";
//   const glCurrGlobal2 = companyInfo?.glCurrGlobal2 || "";
//   const glCurrGlobal3 = companyInfo?.glCurrGlobal3 || "";

//   const siGlColumnDefs = [
//     { key: "ln", label: "LN", width: 56 },
//     { key: "acctCode", label: "Account Code", width: 120 },
//     { key: "rcCode", label: "RC Code", width: 120 },
//     { key: "sltypeCode", label: "SL Type Code", width: 120 },
//     { key: "slCode", label: "SL Code", width: 120 },
//     { key: "particular", label: "Particulars", width: 320 },
//     { key: "vatCode", label: "VAT Code", width: 120 },
//     { key: "vatName", label: "VAT Name", width: 220 },
//     { key: "atcCode", label: "ATC", width: 120 },
//     { key: "atcName", label: "ATC Name", width: 220 },
//     { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
//     { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
//     ...(withCurr2 ? [
//       { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
//       { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
//     ] : []),
//     ...(withCurr3 ? [
//       { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
//       { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
//     ] : []),
//     { key: "slRefNo", label: "SL Ref. No.", width: 120 },
//     { key: "slRefDate", label: "SL Ref. Date", width: 120 },
//     { key: "remarks", label: "Remarks", width: 140 },
//   ];
//   const {
//     getColumnStyle: getSiGlColumnStyle,
//     getFrozenColumnStyle: getSiGlFrozenStyle,
//     getOrderedColumns: getOrderedSiGlColumns,
//     getSortedRows: getSortedSiGlRows,
//     setColumnOrder: setSiGlColumnOrder,
//     clearZeroValueOnFocus: clearSiGlZeroOnFocus,
//     focusNextRowInput: focusNextSiGlRowInput,
//     renderHeaderContextMenu: renderSiGlHeaderContextMenu,
//     renderResizableHeader: renderSiGlHeader,
//   } = useResizableTableColumns(siGlColumnDefs);
//   const orderedSiGlColumns = getOrderedSiGlColumns(siGlColumnDefs);
//   const getSiGlFallbackWidth = (key) =>
//     siGlColumnDefs.find((column) => column.key === key)?.width || 120;
//   const getSiGlCellStyle = (key, fallbackWidth) => ({
//     ...getSiGlColumnStyle(key, fallbackWidth),
//     ...getSiGlFrozenStyle(key, orderedSiGlColumns, fallbackWidth, {
//       isHeader: false,
//     }),
//   });
//   useEffect(() => {
//     setSiGlColumnOrder(siGlColumnDefs.map((column) => column.key));
//   }, [setSiGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
//   const sortedSiGlRows = getSortedSiGlRows(
//     detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => {
//       if (sortKey === "ln") return entry.originalIndex + 1;
//       return entry.row?.[sortKey] ?? "";
//     }
//   );
//   const siGlEnterNextRowZeroClearFields = [
//     "debit",
//     "credit",
//     "debitFx1",
//     "creditFx1",
//     "debitFx2",
//     "creditFx2",
//   ];

//   const setGLActiveTab = (tab) => updateState({ GLactiveTab: tab });
//   const calculateDueDate = (startDate, daysDue) => {
//     if (!startDate || daysDue === "" || daysDue === null || daysDue === undefined || isNaN(daysDue)) return "";
//     try {
//       const rawDate = String(startDate).trim();
//       const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
//       const usMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
//       const date = isoMatch
//         ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
//         : usMatch
//         ? new Date(Number(usMatch[3]), Number(usMatch[1]) - 1, Number(usMatch[2]))
//         : new Date(rawDate);

//       if (Number.isNaN(date.getTime())) return "";

//       date.setDate(date.getDate() + parseInt(daysDue, 10));
//       const month = String(date.getMonth() + 1).padStart(2, "0");
//       const day = String(date.getDate()).padStart(2, "0");
//       const year = date.getFullYear();
//       return `${month}/${day}/${year}`;
//     } catch (error) {
//       console.error("Error calculating due date:", error);
//       return "";
//     }
//   };

//   useEffect(() => {
//     if (!billtermCode) return;
//     if (daysDue === "" || daysDue === null || daysDue === undefined) return;
//     const nextDueDate = calculateDueDate(documentDate, daysDue);
//     updateState({ dueDate: nextDueDate });
//   }, [documentDate, daysDue, billtermCode]);









//   // API endpoints
//   const SI_PRICE_MATRIX_ENDPOINT = "getPriceMatrixItemPrice"; // Assuming SI also uses price matrix
//   const SI_DUPLICATE_PO_ENDPOINT = "/checkSIDuplicatePO"; // Assuming SI also has duplicate PO check

//   const calculateSalesAmount = (netAmount, vatAmount) =>
//     (parseFormattedNumber(netAmount || 0) || 0) -
//     (parseFormattedNumber(vatAmount || 0) || 0);

//   const formatSalesAmount = (netAmount, vatAmount) => formatNumber(calculateSalesAmount(netAmount, vatAmount));
//   const toFormattedAmountNumber = (value, decimals = 2) =>
//     parseFormattedNumber(formatNumber(parseFormattedNumber(value), decimals)) || 0;

//   const getDetailTaxBase = (row = {}) => {
//     const grossAmount = parseFormattedNumber(row.grossAmount || 0) || 0;
//     const totalDiscount = parseFormattedNumber(row.totDiscount || 0) || 0;
//     return grossAmount - totalDiscount;
//   };


//   const getDetailVatRate = (vatCodeValue = "") => {
//     const vatRow = getAllTopVatRow(vatCodeValue);
//     return parseFormattedNumber(vatRow?.vatRate || 0) || 0;
//   };

//   const getMatrixVatRate = (row = {}) =>
//     parseFormattedNumber(row?.vatRate ?? 0) || 0;

//   const distributeVatAcrossDetailRows = (rows = [], options = {}) => {
//     if (!Array.isArray(rows) || rows.length === 0) {
//       return [];
//     }

  
//     const taxableRowsByVatCode = rows.reduce((groups, row, index) => {
//       const lineNetAmount = Math.max(
//         parseFormattedNumber(row.netAmount || 0) || getDetailTaxBase(row),
//         0
//       );
//       const lineVatCode = String(row.vatCode || "").trim();
//       const vatRate = getDetailVatRate(lineVatCode);

//       if (!lineVatCode || vatRate <= 0 || lineNetAmount <= 0) {
//         return groups;
//       }

//       if (!groups[lineVatCode]) {
//         groups[lineVatCode] = [];
//       }

//       groups[lineVatCode].push({
//         index,
//         lineNetAmount,
//         vatCode: lineVatCode,
//       });

//       return groups;
//     }, {});

//     const vatAmountByRowIndex = Object.values(taxableRowsByVatCode).reduce(
//       (amounts, taxableRows) => {
//         const totalNetAmount = taxableRows.reduce(
//           (sum, row) => sum + row.lineNetAmount,
//           0
//         );
//         const vatCodeForGroup = taxableRows[0]?.vatCode || "";
//         const totalVatAmount =
//           vatCodeForGroup && totalNetAmount > 0 && typeof getAllTopVatAmount === "function"
//             ? toFormattedAmountNumber(getAllTopVatAmount(vatCodeForGroup, totalNetAmount))
//             : 0;

//         let distributedVatAmount = 0;
//         const lastTaxableIndex = taxableRows[taxableRows.length - 1]?.index;

//         taxableRows.forEach(({ index, lineNetAmount }) => {
//           const lineVatAmount =
//             index === lastTaxableIndex
//               ? toFormattedAmountNumber(totalVatAmount - distributedVatAmount)
//               : toFormattedAmountNumber(
//                   totalNetAmount > 0
//                     ? totalVatAmount * (lineNetAmount / totalNetAmount)
//                     : 0
//                 );

//           if (index !== lastTaxableIndex) {
//             distributedVatAmount += lineVatAmount;
//           }

//           amounts[index] = lineVatAmount;
//         });

//         return amounts;
//       },
//       {}
//     );




//     return rows.map((row, index) => {
//       const grossAmount = toFormattedAmountNumber(row.grossAmount || 0);
//       const totalDiscount = toFormattedAmountNumber(row.totDiscount || 0);
//       const netAmount = Math.max(
//         toFormattedAmountNumber(grossAmount - totalDiscount),
//         0
//       );
//       const lineVatAmount = toFormattedAmountNumber(vatAmountByRowIndex[index] || 0);
//       const salesAmount = toFormattedAmountNumber(netAmount - lineVatAmount);

//       return {
//         ...row,
//         netAmount: formatNumber(netAmount),
//         vatAmount: formatNumber(lineVatAmount),
//         salesAmount: formatNumber(salesAmount),
//         // ATC is header-level only. Keep detail ATC/amountDue at zero.
//         atcAmount: formatNumber(0),
//         amountDue: formatNumber(0),
//       };
//     });
//   };






//   const updateTotalsDisplay = (
//     grossAmt,
//     discAmt,
//     vatAmt,
//     atcAmt,
//     salesAmt,
//     netAmt,
//     amountDue,
//     atcCodeOverride = atcCode
//   ) => {
//     const grossAmount = toFormattedAmountNumber(grossAmt);
//     const discountAmount = toFormattedAmountNumber(discAmt);
//     const vatAmount = toFormattedAmountNumber(vatAmt);
//     const netAmount = toFormattedAmountNumber(netAmt);
//     const salesBaseAmount = toFormattedAmountNumber(
//       salesAmt || grossAmount - discountAmount - vatAmount
//     );

//     const computedAtcAmount = toFormattedAmountNumber(
//       getAllTopATCAmount(atcCodeOverride, salesBaseAmount)
//     );
//     const computedAmountDue = toFormattedAmountNumber(netAmount - computedAtcAmount);

//     setTotals({
//       totalGrossAmount: formatNumber(grossAmount),
//       totalDiscountAmount: formatNumber(discountAmount),
//       totalVatAmount: formatNumber(vatAmount),
//       totalAtcAmount: formatNumber(computedAtcAmount),
//       totalSalesAmount: formatNumber(salesBaseAmount),
//       totalNetAmount: formatNumber(netAmount),
//       totalAmountDue: formatNumber(computedAmountDue),
//     });
//   };




//   const formatFetchedHeaderDate = (value) => {
//     const raw = String(value || "").trim();
//     if (!raw) return "";

//     if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
//       const [month, day, year] = raw.split("/").map(Number);
//       const isValidMonth = month >= 1 && month <= 12;
//       const isValidDay = day >= 1 && day <= 31;
//       const isValidYear = year >= 1900 && year <= 2999;

//       if (isValidMonth && isValidDay && isValidYear) {
//         return raw;
//       }
//     }

//     if (/^(19|20)\d{2}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
//       return useformatToDatev2(raw);
//     }

//     const digits = raw.replace(/\D/g, "");

//     if (digits.length === 8) {
//       const first4 = digits.slice(0, 4);
//       const middle2 = digits.slice(4, 6);
//       const last2 = digits.slice(6, 8);

//       if (/^(19|20)\d{2}$/.test(first4)) {
//         return `${middle2}/${last2}/${first4}`;
//       }

//       const month = digits.slice(0, 2);
//       const day = digits.slice(2, 4);
//       const year = digits.slice(4, 8);
//       return `${month}/${day}/${year}`;
//     }

//     return "";
//   };

//   const parseComparableDate = (value) => {
//     const formattedValue = formatFetchedHeaderDate(value);

//     if (!formattedValue || !/^\d{2}\/\d{2}\/\d{4}$/.test(formattedValue)) {
//       return null;
//     }

//     const [month, day, year] = formattedValue.split("/").map(Number);
//     const parsedDate = new Date(year, month - 1, day);

//     if (
//       parsedDate.getFullYear() !== year ||
//       parsedDate.getMonth() !== month - 1 ||
//       parsedDate.getDate() !== day
//     ) {
//       return null;
//     }

//     return parsedDate;
//   };

//   const isDateEarlierThanSiDate = (value) => {
//     const candidateDate = parseComparableDate(value);
//     const soDate = parseComparableDate(documentDate);

//     if (!candidateDate || !soDate) {
//       return false;
//     }

//     return candidateDate < soDate;
//   };

//   const clearHeaderAndDetailDates = ({ showAlert = false } = {}) => {
//     const updatedRows = detailRows.map((row) => ({
//       ...row,
//       // No delivery date in SI details, assuming SI date is the main date
//     }));

//     if (showAlert) {
//       useSwalErrorAlert(
//         "Invalid Date",
//         "Date must not be earlier than SI Date."
//       );
//     }
//   };

//   const parseDuplicatePOCheckResult = (response) => {
//     const rawResult =
//       response?.data?.data?.[0]?.result ??
//       response?.data?.[0]?.result ??
//       response?.data?.result ??
//       response?.result ??
//       '{"result":"0"}';

//     try {
//       const parsed =
//         typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
//       return String(parsed?.result || "0") === "1";
//     } catch {
//       return String(response?.data?.result || response?.result || "0") === "1";
//     }
//   };

//   const checkDuplicateSiNo = async (siNoValue) => {
//     const trimmedSiNo = String(siNoValue || "").trim();
//     const trimmedCustCode = String(billToCustCode || "").trim();

//     if (!trimmedSiNo || !trimmedCustCode) {
//       return false;
//     }

//     const params = {
//       json_data: {
//         siNo: trimmedSiNo,
//         custCode: trimmedCustCode,
//       },
//     };

//     try {
//       const response = await apiClient.get(SI_DUPLICATE_PO_ENDPOINT, { params });
//       return parseDuplicatePOCheckResult(response);
//     } catch (error) {
//       console.error("Error checking duplicate SO customer PO:", error);
//       return false;
//     }
//   };

//   const applyHeaderValueToDetailRows = (detailField, detailValue, headerOverrides = {}) => {
//     const selectedVatRow =
//       detailField === "vatCode" ? getAllTopVatRow(detailValue) : null;
//     const updatedRows = detailRows.map((row) =>
//       recalculateSODetailRow(
//         {
//           ...row,
//           [detailField]: detailValue,
//           ...(detailField === "vatCode"
//             ? { vatRate: formatNumber(selectedVatRow?.vatRate || 0) }
//             : {}),
//         },
//         detailField
//       )
//     );
//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows, headerOverrides);

//     updateState({ detailRows: normalizedRows });
//     updateTotals(normalizedRows);
//     regenerateGlEntriesForRows(normalizedRows, headerOverrides);
//   };

//   const confirmApplyHeaderValueToDetails = async ({
//     headerLabel,
//     detailField,
//     detailValue,
//   }) => {
//     if ((detailRows?.length || 0) === 0) {
//       return false;
//     }

//     const result = await useSwalProceedConfirm(
//       `Apply ${headerLabel} changes?`,
//       `SO Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all SO Detail rows?`,
//       "Yes"
//     );

//     if (result?.isConfirmed) {
//       applyHeaderValueToDetailRows(detailField, detailValue);
//       return true;
//     }

//     return false;
//   };

//   useEffect(() => {
//       if (resetFlag) {
//         handleReset();
//       }
//       let timer;
//       if (isLoading) {
//         timer = setTimeout(() => updateState({ showSpinner: true }), 200);
//       } else {
//         updateState({ showSpinner: false });
//       }
//       return () => clearTimeout(timer);
//   }, [resetFlag, isLoading]);

//   useEffect(() => {
//   }, [billToCustCode]);

//   useEffect(() => {
//     if (billToCustName?.currCode && detailRows.length > 0) {
//       const updatedRows = detailRows.map(row => ({
//         ...row,
//         currency: billToCustName.currCode
//       }));
//        updateState({ detailRows: updatedRows });
//     }
//   }, [billToCustName?.currCode]);

//   useEffect(() => {
//       updateState({isDocNoDisabled: !!state.documentID });
//   }, [state.documentID]);

// const isInitialMount = useRef(true);

// useEffect(() => {
//   if (isInitialMount.current) {
//     handleReset();
//     loadCompanyData();
//     isInitialMount.current = false;
//   }
// }, []);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

// useEffect(() => {
//     if (!refsLoaded) return;
//     const filteredTypes = getAllDropDown("SITRAN_TYPE", docType) || [];
//     const defaultSiType =
//       filteredTypes.find((type) => type.DROPDOWN_CODE === "SI01")?.DROPDOWN_CODE ||
//       filteredTypes[0]?.DROPDOWN_CODE ||
//       "";
//     const mapHeaderSiStatus = (value) => {
//       const normalizedValue = String(value || "").toUpperCase();
//       if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
//       if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
//       if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
//       return "O";
//     };
//     updateState({
//       siTranTypeOptions: filteredTypes,
//       siTranType: defaultSiType,
//       siStatusOptions: [{ DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" }, { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" }, { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" }],
//       siStatus: mapHeaderSiStatus(state.siStatus),
//     });
// }, [docType, refsLoaded]);

//   const handleReset = () => {
//       clearSoDetailSorting();
//       const filteredTypes = getAllDropDown("SITRAN_TYPE", docType) || [];
//       const defaultSiType =
//         filteredTypes.find((type) => type.DROPDOWN_CODE === "SI01")?.DROPDOWN_CODE ||
//         filteredTypes[0]?.DROPDOWN_CODE ||
//         "";

//       updateState({

//       branchCode: currentUserRow?.branchCode||"",
//       branchName: currentUserRow?.branchName||"",
//       userCode:currentUserRow?.userCode||"",
//       documentDate:useGetCurrentDayV2(),
//       currCode:companyInfo?.currCode||"",
//       glCurrDefault:companyInfo?.currCode||"",
//       currName:companyInfo?.currName||"",
//       currRate:formatNumber(companyInfo?.currRate||1,6),
//       refSiNo1: "",
//       refSiNo2: "",
//       salesRepCode:"",
//       salesRepName:"",
//       remarks:"",
//       billtermCode:"",
//       billtermName:"",
//       dueDate: "",
//       daysDue: "",
//       noReprints:"0",
//       billToCustCode:"",
//       billToCustName:"",
//       customerPoNo: "",
//       customerPoDate: null,
//       contactPerson: "",
//       atcCode: "",
//       atcName: "",
//       vatCode: "",
//       vatName: "",
//       documentNo: "",
//       documentID: "",
//       detailRows: [],
//       detailRowsGL: [],
//       openDRSI_Data_Summary: [],
//       openDRSI_Col_Summary: [],
//       ...getGLTotalsState([]),
//       documentStatus:"",      
//       siTranType: defaultSiType,
//       siStatus:"O",

//       // UI state
//       activeTab: "basic",
//       isDocNoDisabled: false,
//       isSaveDisabled: false,
//       isResetDisabled: false,
//       isFetchDisabled: false,
//       status: "Open",
//       // Modal states
//       showRcModal: false,
//       showAccountModal: false,
//       showSlModal: false,
//       showSalesRepModal: false,
//       showOpenDRModal: false,
//     });

//     updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0);
//   };

//     const loadCompanyData = async () => {
//         updateState({ isLoading: true });

//         try {
//           const hdtblcol_result = await useFieldLenghtCheck(
//             "si_hd,si_dt1,'si_dt2"
//           );

//           if (hdtblcol_result) {
//             updateState({ tblFieldArray: hdtblcol_result });
//           }
//         } catch (err) {
//           console.error("Error fetching data:", err);
//         } finally {
//           updateState({ isLoading: false });
//         }
//       };

// const fetchTranData = async (documentNo, branchCode, direction='') => {
//   const resetState = () => {
//     updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
//     updateTotals([]);
//   };

//   updateState({ isLoading: true });
  
//   try {
//     const data = await useFetchTranData(documentNo, branchCode, docType, "siNo", direction);

//     if (!data?.siId) {
//       Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
//       return resetState();
//     }

//     // Format rows
//     const retrievedDetailRows = distributeVatAcrossDetailRows((data.dt1 || []).map(item => ({
//       ...item,
//       siStat: item.pickStat || item.siStat || "F",
//       siQuantity: formatNumber(item.siQuantity ?? 0,quantityDecimals),
//       drNo: item.drNo || "",
//       drId: item.drId || "",
//       soId: item.soId || "",
//       groupId: item.groupId || "",
//       unitPrice: formatNumber(item.unitPrice??0,sellingPriceDecimals),
//       grossAmount: formatNumber(item.grossAmount),
//       discRate1: formatNumber(item.discRate1 ?? 0),
//       discRate2: formatNumber(item.discRate2 ?? 0),
//       discRate3: formatNumber(item.discRate3 ?? 0),
//       discRate4: formatNumber(item.discRate4 ?? 0),
//       discRate5: formatNumber(item.discRate5 ?? 0),
//       discRate6: formatNumber(item.discRate6 ?? 0),
//       discRate7: formatNumber(item.discRate7 ?? 0),
//       discRate8: formatNumber(item.discRate8 ?? 0),
//       discAmount1: formatNumber(item.discAmount1 ?? 0),
//       discAmount2: formatNumber(item.discAmount2 ?? 0),
//       discAmount3: formatNumber(item.discAmount3 ?? 0),
//       discAmount4: formatNumber(item.discAmount4 ?? 0),
//       discAmount5: formatNumber(item.discAmount5 ?? 0),
//       discAmount6: formatNumber(item.discAmount6 ?? 0),
//       discAmount7: formatNumber(item.discAmount7 ?? 0),
//       discAmount8: formatNumber(item.discAmount8 ?? 0),
//       totDiscount: formatNumber(item.totDiscount ?? 0),      
//       vatAmount: formatNumber(item.vatAmount ?? 0),
//       vatCode: item.vatCode || data.vatCode || "",
//       vatRate: formatNumber(item.vatRate ?? 0),
//       salesAmount: formatSalesAmount(item.netAmount ?? 0, item.vatAmount ?? 0),
//       atcAmount: formatNumber(item.atcAmount ?? 0),
//       amountDue: formatNumber(item.amountDue ?? 0),
//       netAmount: formatNumber(item.netAmount ?? 0),
//       quantityPicked: formatNumber(item.quantityPicked ?? item.qtyPicked ?? 0, quantityDecimals),
//       itemAmount: item.itemAmount ?? formatNumber( 0),
//       drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
//       linkedSiQuantity: formatNumber(item.siQuantity ?? 0, quantityDecimals), // Renamed to avoid confusion
//     })), { atcCode: data.atcCode || "" });

//     const formattedGLRows = (data.dt2 || []).map(glRow => ({
//       ...glRow,
//       debit: formatNumber(glRow.debit),
//       credit: formatNumber(glRow.credit),
//       debitFx1: formatNumber(glRow.debitFx1),
//       creditFx1: formatNumber(glRow.creditFx1),
//       debitFx2: formatNumber(glRow.debitFx2),
//       creditFx2: formatNumber(glRow.creditFx2),
//       slRefDate: useformatToDatev2(glRow.slRefDate),
//     }));

//     updateState({
//       documentStatus: data.siStatus,
//       status: data.docStatus,
//       noReprints:data.noReprints,
//       documentID: data.siId,
//       documentNo: data.siNo,
//       refSiNo1: data.refSiNo1 || "",
//       refSiNo2: data.refSiNo2 || "",
//       branchCode: data.branchCode,
//       branchName:data.branchName,
//       documentDate: useformatToDatev2(data.siDate),
//       siTranType: data.siTranType,
//       billToCustCode: data.custCode,
//       billToCustName: data.custName,
//       customerPoNo: data.customerPoNo || "",
//       customerPoDate: data.customerPoDate ? useformatToDatev2(data.customerPoDate) : null,
//       atcCode: data.atcCode || "",
//       atcName: data.atcName || "",
//       vatCode: data.vatCode || "",
//       vatName: data.vatName || "",
//       billtermCode: data.billtermCode,
//       billtermName: data.billtermName,
//       salesRepCode: data.salesRepCode || "",
//       salesRepName: data.salesRepName || "",
//       dueDate: data.dueDate ? useformatToDatev2(data.dueDate) : "",
//       currCode: data.currCode,
//       currName: data.currName,
//       currRate: formatNumber(data.currRate, 6),
//       siStatus:
//         String(data.siStatus || "O").toUpperCase() === "OPEN"
//           ? "O"
//           : String(data.siStatus || "O").toUpperCase() === "CANCELLED"
//           ? "X"
//           : String(data.siStatus || "O").toUpperCase() === "CLOSED"
//           ? "C"
//           : String(data.siStatus || "O"),
//       detailRows: retrievedDetailRows,
//       detailRowsGL: formattedGLRows,
//       isDocNoDisabled: true,
//       isFetchDisabled: true,
//     });

//     updateTotals(retrievedDetailRows, data.atcCode || "");

//   } catch (error) {
//     console.error("Error fetching transaction data:", error);
//     Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
//     resetState();
//   } finally {
//     updateState({ isLoading: false });
//   }
// };

// const handlesiNoBlur = () => {

//     if (!state.documentID && state.documentNo && state.branchCode) {
//         fetchTranData(state.documentNo, state.branchCode);
//     }
// };

// const handleCurrRateNoBlur = (e) => {

//   const num = formatNumber(e.target.value, 6);
//   updateState({
//         currRate: isNaN(num) ? "0.000000" : num
//         })

// };

// const moveFocusBeforeSave = async () => {
//   document.activeElement?.blur?.();
//   return true;
// };

// const handleActivityOption = async (action) => {
//    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
//     return;
//   }

//   if (action === "Upsert") {
//    await moveFocusBeforeSave();
//   }

//   if (documentStatus === "") { // Assuming SI also has an 'O' status for open
//     updateState({ isLoading: true });

//     try {
//         const {
//         branchCode,
//         documentNo,
//         documentID,
//         billtermCode,
//         billToCustCode,
//         billToCustName,
//         refSiNo1,
//         refSiNo2,
//         salesRepCode,
//         salesRepName,
//         currCode,
//         currRate,
//         remarks,
//         dueDate,
//         userCode,
//         contactPerson,
//         customerPoNo,
//         customerPoDate,
//         siTranType,
//         siStatus,
//         detailRows,
//         detailRowsGL,
//       } = state;

//       let finalDetailRowsGL = [...detailRowsGL];

//       const buildSoData = (glRows = finalDetailRowsGL) => ({
//         branchCode: branchCode,
//         siNo: documentNo || "",
//         siId: documentID || "",
//         siDate: documentDate,
//         sitranType: siTranType,
//         billtermCode: billtermCode,
//         custCode: billToCustCode,
//         custName: billToCustName,
//         attention: contactPerson,
//         refSiNo1: refSiNo1,
//         refSiNo2: refSiNo2,
//         currCode: currCode || "PHP",
//         currRate: parseFormattedNumber(currRate),
//         atcAmount: parseFormattedNumber(totals.totalAtcAmount),
//         atcCode: atcCode || "",
//         vatCode: vatCode || "",
//         dueDate: dueDate || "",
//         remarks: remarks || "",
//         userCode: userCode,
//         customerPoNo: customerPoNo || '',
//         customerPoDate: customerPoDate || null,
//         salesRepCode,
//         salesRepName,
//         soStatus: siStatus || 'O',
//         dt1: detailRows.map((row, index) => ({
//           lnNo: String(index + 1),
//           pickStat: row.siStat || "F",
//           siStat: row.siStat || "F",
//           drNo: row.drNo || "",
//           drId: row.drId || "",
//           soId: row.soId || "",
//           groupId: row.groupId || "",
//           itemCode: row.itemCode || "",
//           itemName: row.itemName || "",
//           itemSpecs: row.itemSpecs || "",
//           uomCode: row.uomCode || "",
//           pmType: row.pmType || "",
//           pmId: row.pmId || "",
//           siQuantity: parseFormattedNumber(row.siQuantity || 0),
//           unitPrice: parseFormattedNumber(row.unitPrice || 0),
//           grossAmount: parseFormattedNumber(row.grossAmount || 0),
//           discRate1: parseFormattedNumber(row.discRate1 || 0),
//           discRate2: parseFormattedNumber(row.discRate2 || 0),
//           discRate3: parseFormattedNumber(row.discRate3 || 0),
//           discRate4: parseFormattedNumber(row.discRate4 || 0),
//           discRate5: parseFormattedNumber(row.discRate5 || 0),
//           discRate6: parseFormattedNumber(row.discRate6 || 0),
//           discRate7: parseFormattedNumber(row.discRate7 || 0),
//           discRate8: parseFormattedNumber(row.discRate8 || 0),
//           discAmount1: parseFormattedNumber(row.discAmount1 || 0),
//           discAmount2: parseFormattedNumber(row.discAmount2 || 0),
//           discAmount3: parseFormattedNumber(row.discAmount3 || 0),
//           discAmount4: parseFormattedNumber(row.discAmount4 || 0),
//           discAmount5: parseFormattedNumber(row.discAmount5 || 0),
//           discAmount6: parseFormattedNumber(row.discAmount6 || 0),
//           discAmount7: parseFormattedNumber(row.discAmount7 || 0),
//           discAmount8: parseFormattedNumber(row.discAmount8 || 0),
//           totDiscount: parseFormattedNumber(row.totDiscount || 0),          
//           vatCode: row.vatCode || "",
//           vatRate: parseFormattedNumber(row.vatRate || 0),
//           vatAmount: parseFormattedNumber(row.vatAmount || 0),
//           salesAmount: parseFormattedNumber(row.salesAmount || 0),
//           atcAmount: parseFormattedNumber(row.atcAmount || 0),
//           amountDue: parseFormattedNumber(row.amountDue || 0),
//           netAmount: parseFormattedNumber(row.netAmount || 0),
//           // No delivery date, customer PO, sales rep in SI details
//           freeItem: row.freeItem || "",
//           quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
//           itemAmount: parseFormattedNumber(row.itemAmount || 0),
//           drQuantity: parseFormattedNumber(row.drQuantity || 0),
//         })),
//         dt2: glRows.map((entry, index) => ({
//           recNo: String(index + 1),
//           acctCode: entry.acctCode || "",
//           rcCode: entry.rcCode || "",
//           sltypeCode: entry.sltypeCode || "",
//           slCode: entry.slCode || "",
//           particular: entry.particular || "",
//           vatCode: entry.vatCode || "",
//           vatName: entry.vatName || "",
//           atcCode: entry.atcCode || "",
//           atcName: entry.atcName || "",
//           debit: parseFormattedNumber(entry.debit || 0),
//           credit: parseFormattedNumber(entry.credit || 0),
//           debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
//           creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
//           debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
//           creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
//           slRefNo: entry.slRefNo || "",
//           slRefDate: entry.slRefDate || null,
//           remarks: entry.remarks || "",
//           dt1Lineno: entry.dt1Lineno || "",
//         })),
//       });

//       if (action === "GenerateGL") {
//         try {
//           updateState({ detailRowsGL: [], isGeneratingGL: true });
//           const newGlEntries = await useGenerateGLEntries(
//             docType,
//             buildSoData([])
//           );

//           updateState({
//             detailRowsGL: newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
//             isGeneratingGL: false,
//           });
//         } catch (error) {
//           updateState({ detailRowsGL: [], isGeneratingGL: false });
//           console.error(error);
//         }
//         return;
//       }

//       if (action === "Upsert") {
//         if (finalDetailRowsGL.length === 0) {
//           const newGlEntries = await useGenerateGLEntries(
//             docType,
//             buildSoData([])
//           );

//           if (!newGlEntries || newGlEntries.length === 0) {
//             console.warn("GL entries generation failed or returned no data.");
//             return;
//           }

//           finalDetailRowsGL = newGlEntries;
//           updateState({ detailRowsGL: newGlEntries });
//         }

//         const response = await useTransactionUpsert(
//           docType,
//           buildSoData(finalDetailRowsGL),
//           updateState,          
//           "siId",
//           "siNo"
//         );

//         if (response) {
//           const responseDocNo =  response.data[0].siNo;
//           const responseDocId =  response.data[0].siId;

//           await fetchTranData(responseDocNo,branchCode);

//           const isZero = Number(noReprints) === 0;
//           const onSaveAndPrint = isZero
//             ? () => updateState({ showSignatoryModal: true })
//             : () => handleSaveAndPrint(responseDocId);

//           useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
//         }
//         updateState({
//           documentNo: response?.data?.[0]?.siNo || "",
//           documentID: response?.data?.[0]?.siId || "",
//           isDocNoDisabled: true,
//           isFetchDisabled: true,
//         });
//       }
//     } catch (error) {
//       console.error(`Error during ${action}:`, error);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   }
// };

//   const createSIDetailRow = (overrides = {}) => ({
//       lnNo: "",
//       siStat: "F",
//       drNo: "",
//       drId: "",
//       soId: "",
//       groupId: "",
//       itemCode: "",
//       itemName: "",
//       itemSpecs: "",
//       uomCode: "",
//       pmType: "",
//       pmId: "",
//       siQuantity: Number(0).toFixed(quantityDecimals),
//       quantityPicked: Number(0).toFixed(quantityDecimals),
//       itemAmount: "0.00",
//       unitPrice: Number(0).toFixed(sellingPriceDecimals),
//       vatCode: "",
//       vatRate: "0.00",
//       vatAmount: "0.00",
//       salesAmount: "0.00",
//       atcAmount: "0.00",
//       amountDue: "0.00",
//       grossAmount: "0.00",
//       discRate1: "0.00",
//       discRate2: "0.00",
//       discRate3: "0.00",
//       discRate4: "0.00",
//       discRate5: "0.00",
//       discRate6: "0.00",
//       discRate7: "0.00",
//       discRate8: "0.00",
//       discAmount1: "0.00",
//       discAmount2: "0.00",
//       discAmount3: "0.00",
//       discAmount4: "0.00",
//       discAmount5: "0.00",
//       discAmount6: "0.00",
//       discAmount7: "0.00",
//       discAmount8: "0.00",
//       totDiscount: "0.00",      
//       netAmount: "0.00",      
//       // No delivery date, customer PO, sales rep in SI details
//       freeItem: "",
//       drQuantity: Number(0).toFixed(quantityDecimals),
//       ...overrides,
//     });

//   const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
//     if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
//       return;
//     }

//     const updatedRows = [...detailRows];
//     const normalizedInsertRows = rowsToInsert.map((row) => createSIDetailRow(row));

//     if (insertIndex !== null && insertIndex >= 0) {
//       updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
//     } else {
//       updatedRows.push(...normalizedInsertRows);
//     }

//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows.map((row, index) => ({
//       ...row,
//       lnNo: String(index + 1),
//     })));

//     updateState({
//       detailRows: normalizedRows,
//     });
//     updateTotals(normalizedRows);

//     setTimeout(() => {
//       const tableContainer = document.querySelector(".max-h-\\[430px\\]");
//       if (!tableContainer) return;

//       if (insertIndex === null || insertIndex >= detailRows.length - 1) {
//         tableContainer.scrollTop = tableContainer.scrollHeight;
//       }
//     }, 100);
//   };

//   const handleInsertBlankRow = (insertIndex = null) => {
//     insertDetailRows([createSIDetailRow()], insertIndex);
//   };

//   // const resolveOpenDRGroupId = (item = {}) =>
//   //   item?.groupId || item?.group_id || "";

//   // const resolveOpenDRDrNo = (item = {}) =>
//   //   item?.drNo || item?.dr_no || "";



//   const normalizeOpenDRLookupRow = (item = {}) => ({
//     ...item,
//     groupId: item?.groupId || "",
//     drId: item?.drId || "",
//     drNo: item?.drNo || "",
//     soId: item?.soId || "",
//   });

//   const getUniqueOpenDRRemarks = (records = []) => {
//     const seen = new Set();

//     return (records || []).reduce((acc, record) => {
//       const value = String(record?.remarks || "").trim();
//       if (!value) return acc;

//       const key = value.replace(/\s+/g, " ").toLowerCase();
//       if (seen.has(key)) return acc;

//       seen.add(key);
//       acc.push(value);
//       return acc;
//     }, []);
//   };

//   const appendMissingRemarks = (currentRemarks = "", newRemarks = []) => {
//     const current = String(currentRemarks || "").trim();
//     const currentKey = current.replace(/\s+/g, " ").toLowerCase();
//     const missingRemarks = newRemarks.filter((remark) => {
//       const key = String(remark || "").trim().replace(/\s+/g, " ").toLowerCase();
//       return key && !currentKey.includes(key);
//     });

//     if (missingRemarks.length === 0) return currentRemarks || "";
//     return [current, ...missingRemarks].filter(Boolean).join("\n");
//   };

//   const buildOpenDRHeaderUpdates = async (selectedRecords = [], selectedSummaryRecords = []) => {
//     const topRecord = selectedRecords.find(Boolean) || {};
//     const updates = {};

//     const nextRemarks = appendMissingRemarks(
//       remarks,
//       getUniqueOpenDRRemarks(selectedSummaryRecords)
//     );
//     if (nextRemarks !== (remarks || "")) {
//       updates.remarks = nextRemarks;
//     }

//     const nextSalesRepCode = String(topRecord?.salesrepCode || "").trim();
//     if (nextSalesRepCode) {
//       const salesRepRow = await useTopSalesRepRow(nextSalesRepCode);
//       updates.salesRepCode = nextSalesRepCode;
//       updates.salesRepName = salesRepRow?.salesRepName || "";
//     }

//     const nextBilltermCode = String(topRecord?.billtermCode || "").trim();
//     if (nextBilltermCode) {
//       const billTermRow = await useTopBillTermRow(nextBilltermCode);
//       if (billTermRow) {
//         updates.billtermCode = billTermRow.billtermCode;
//         updates.billtermName = billTermRow.billtermName;
//         updates.daysDue = billTermRow.daysDue;
//         updates.dueDate = calculateDueDate(documentDate, billTermRow.daysDue);
//       } else {
//         updates.billtermCode = nextBilltermCode;
//       }
//     }

//     const nextCustPoNo = topRecord?.custpoNo || "";
//     if (nextCustPoNo) {
//       updates.customerPoNo = nextCustPoNo;
//     }

//     const nextCustPoDate = topRecord?.custpoDate || "";
//     if (nextCustPoDate) {
//       updates.customerPoDate = useformatToDatev2(nextCustPoDate);
//     }

//     if (siTranType === "SI03") {
//        const data = await useFetchTranData(topRecord?.drNo, branchCode, "FADS", "fadsNo", "");
//        updateState({
//         vatCodeFADisposal: data?.vatCode || "",
//         billToCustName: data?.custName || "",
//         customerPoNo: data?.fadsNo ? `FADS-${data.fadsNo}` : "",
//         customerPoDate: data?.fadsDate ? useformatToDatev2(data.fadsDate) : "",
//        })
//     }



    

//     return updates;


//   };

//   const mapOpenDRRecordToDetailRow = (item = {}) => {
//     const siQuantityValue =item?.siQuantity ?? 0;
//     const selectedVatCode = item?.vatCode || vatCode || "";
//     const selectedVatRow = getAllTopVatRow(selectedVatCode);

//     return calculateRowAmountsFromRates(createSIDetailRow({
//       drNo: item?.drNo || "",
//       drId: item?.drId || "",
//       soId: item?.soId || "",
//       groupId: item?.groupId || "",
//       itemCode: item?.itemCode || "",
//       itemName: item?.itemName || "",
//       itemSpecs: item?.itemSpecs || "",
//       uomCode: item?.uomCode || "",
//       pmType: item?.pmType || "",
//       pmId: item?.pmId || "",
//       siQuantity: formatNumber(siQuantityValue, quantityDecimals),
//       quantityPicked: formatNumber(item?.quantityPicked ?? siQuantityValue ?? 0, quantityDecimals),
//       itemAmount: formatNumber(item?.itemAmount ?? 0),
//       unitPrice: formatNumber(item?.unitPrice ?? item?.sellPrice ?? item?.sellingPrice ?? 0, sellingPriceDecimals),
//       vatCode: selectedVatCode,
//       vatRate: formatNumber(item?.vatRate ?? selectedVatRow?.vatRate ?? 0),
//       vatAmount: formatNumber(item?.vatAmount ?? 0),
//       atcAmount: formatNumber(item?.atcAmount ?? 0),
//       discRate1: formatNumber(item?.discRate1 ?? 0),
//       discRate2: formatNumber(item?.discRate2 ?? 0),
//       discRate3: formatNumber(item?.discRate3 ?? 0),
//       discRate4: formatNumber(item?.discRate4 ?? 0),
//       discRate5: formatNumber(item?.discRate5 ?? 0),
//       discRate6: formatNumber(item?.discRate6 ?? 0),
//       discRate7: formatNumber(item?.discRate7 ?? 0),
//       discRate8: formatNumber(item?.discRate8 ?? 0),
//       freeItem: item?.freeItem || "",
//     }));
//   };

//   const getOpenDRDuplicateKey = (row = {}) => {
//     const rowDrId = String(row?.drId || "").trim().toUpperCase();
//     const rowGroupId = String(row?.groupId || "").trim().toUpperCase();
//     return rowDrId && rowGroupId ? `${rowDrId}||${rowGroupId}` : "";
//   };

//   const applySelectedOpenDRSummaryKeys = (rows = [], summaries = []) => {
//     const normalizedSummaries = (summaries || []).map(normalizeOpenDRLookupRow);
//     if (!normalizedSummaries.length) return rows;

//     const summaryByGroupId = new Map(
//       normalizedSummaries
//         .filter((summary) => summary.groupId)
//         .map((summary) => [String(summary.groupId), summary])
//     );
//     const singleSummary = normalizedSummaries.length === 1 ? normalizedSummaries[0] : null;

//     return (rows || []).map((row) => {
//       const normalizedRow = normalizeOpenDRLookupRow(row);
//       const matchedSummary = summaryByGroupId.get(String(normalizedRow.drId || "")) || singleSummary;

//       if (!matchedSummary) return normalizedRow;

//       return {
//         ...normalizedRow,
//         drNo: normalizedRow.drNo || matchedSummary.drNo || "",
//         groupId: normalizedRow.groupId || "",
//         drId: normalizedRow.drId || matchedSummary.drId || matchedSummary.groupId || "",
//       };
//     });
//   };

//   const getDuplicateOpenDRRows = (incomingRows = []) => {
//     const seenKeys = new Set(
//       (detailRowsRef.current || [])
//         .map(getOpenDRDuplicateKey)
//         .filter(Boolean)
//     );
//     const duplicateRows = [];

//     (incomingRows || []).forEach((row) => {
//       const key = getOpenDRDuplicateKey(row);
//       if (!key) return;

//       if (seenKeys.has(key)) {
//         duplicateRows.push(row);
//         return;
//       }

//       seenKeys.add(key);
//     });

//     return duplicateRows;
//   };

//   const handleInsertSelectedOpenDR = async (payload) => {
   
//     const selectedIds = Array.isArray(payload?.data) ? payload.data : [];
//     const selectedSummaryRecords = Array.isArray(payload?.records) ? payload.records : [];

//     if (!selectedIds.length) {
//       updateState({ showOpenDRModal: false });
//       return;
//     }

//     const idString = selectedIds.join(",");
//     const requestPayload = {
//       json_data: {
//         selectedId: idString,
//         selectedIds: idString,
//       },
//     };

//     try {
//       updateState({ isLoading: true, showSpinner: true });
//       const response = await postRequest("getDRSI_Selected", JSON.stringify(requestPayload));

     


//       const rawRows = response?.data?.[0]?.result
//         ? JSON.parse(response.data[0].result)
//         : response?.data || response;
//       const selectedRecords = Array.isArray(rawRows)
//         ? applySelectedOpenDRSummaryKeys(rawRows, selectedSummaryRecords)
//         : [];


//       if (!selectedRecords.length) {
//         useSwalErrorAlert("Open DR", "No SI detail rows were returned for the selected Delivery Receipt record(s).");
//         return;
//       }


//       const duplicateRows = getDuplicateOpenDRRows(selectedRecords);
//       if (duplicateRows.length > 0) {
//         const duplicateList = duplicateRows
//           .map((row) => {
//             const drNo = row?.drNo || "";
//             const itemCode = row?.itemCode || "";
//             return `DR No. ${drNo || "-"} / Item Code ${itemCode || "-"}`;
//           })
//           .filter(Boolean);
//         useSwalErrorAlert(
//           "Duplicate Open DR Detail",
//           `Duplicate DR item(s) are not allowed:\n${[...new Set(duplicateList)].join("\n")}`
//         );
//         return;
//       }



//       const headerUpdates = await buildOpenDRHeaderUpdates(selectedRecords, selectedSummaryRecords);

//       insertDetailRows(selectedRecords.map(mapOpenDRRecordToDetailRow), insertAfterIndex);
//       setTopTab("details");
//       updateState({
//         ...headerUpdates,
//         showOpenDRModal: false,
//         openDRSI_Data_Summary: [],
//         openDRSI_Col_Summary: [],
//         insertAfterIndex: null,
//       });
//     } catch (error) {
//       console.error("getDRSI_Selected failed:", {
//         payload: requestPayload,
//         status: error?.response?.status,
//         data: error?.response?.data,
//         error,
//       });
//       useSwalErrorAlert("Open DR", getApiErrorMessage(error));
//     } finally {
//       updateState({ isLoading: false, showSpinner: false });
//     }
//   };

//   const normalizeItemModalRecords = (selectedItems) => {
//     if (Array.isArray(selectedItems?.records)) {
//       return selectedItems.records;
//     }
//     if (selectedItems?.records) {
//       return [selectedItems.records];
//     }
//     return selectedItems ? [selectedItems] : [];
//   };

//   const normalizeItemCode = (itemCode) => String(itemCode || "").trim().toUpperCase();

//   const getFilteredDuplicateFreeItems = (records = [], currentRowIndex = null) => {
//     if (SI_ALLOW_DUPLICATE_ITEMS) {
//       return records;
//     }

//     const existingItemCodes = new Set(
//       detailRows
//         .filter((_, index) => index !== currentRowIndex)
//         .map((row) => normalizeItemCode(row?.itemCode))
//         .filter(Boolean)
//     );

//     const selectedItemCodes = new Set();
//     const skippedItemCodes = [];
//     const filteredRecords = records.filter((record) => {
//       const itemCode = normalizeItemCode(record?.itemCode);
//       if (!itemCode) {
//         return true;
//       }

//       if (existingItemCodes.has(itemCode) || selectedItemCodes.has(itemCode)) {
//         skippedItemCodes.push(itemCode);
//         return false;
//       }

//       selectedItemCodes.add(itemCode);
//       return true;
//     });

//     if (skippedItemCodes.length > 0) {
//       useSwalErrorAlert(
//         "Duplicate Item Not Allowed",
//         `These item(s) already exist in SI Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
//       );
//     }

//     return filteredRecords;
//   };




//   const parsePriceMatrixResponse = (response) => {
//     const directResult =
//       response?.data?.[0]?.result ??
//       response?.result ??
//       response?.data?.result;
//     if (typeof directResult === "string") {
//       try {
//         const parsed = JSON.parse(directResult);
//         return Array.isArray(parsed) ? parsed : [];
//       } catch (error) {
//         console.error("Error parsing SO price matrix result:", error);
//         return [];
//       }
//     }


//     const rawData = response?.data ?? [];
//     if (Array.isArray(rawData)) {
//       return rawData;
//     }
//     if (Array.isArray(response)) {
//       return response;
//     }
//     return [];
//   };

//   const fetchPriceMatrixRows = async (
//     selectedRecords = [],
//     { custCode = billToCustCode || "", docDate = documentDate, headerVatCode = vatCode } = {}
//   ) => {
//     if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
//       return [];
//     }

//     const payload = {
//       json_data: {
//         docDate,
//         custCode,
//         vatCode: headerVatCode,
//         items: selectedRecords.map((item, index) => ({
//           sequence: index + 1,
//           itemCode: item?.itemCode || "",
//         })),
//       },
//     };

//     try {
//       updateState({ isLoading: true });
//       const response = await postRequest(
//         SI_PRICE_MATRIX_ENDPOINT,
//         JSON.stringify(payload)
//       );
//       return parsePriceMatrixResponse(response);
//     } catch (error) {
//       console.error("Error fetching SO price matrix:", error);
//       return [];
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };




//   const refreshDetailRowsFromPriceMatrix = async ({ // Assuming SI also uses price matrix
//     custCode = billToCustCode || "",
//     rows = detailRows,
//     docDate = documentDate,
//     headerVatCode = vatCode,
//   } = {}) => {
//     if (!Array.isArray(rows) || rows.length === 0 || !custCode) {
//       return;
//     }

//     const selectedRecords = rows.map((row, index) => ({
//       sequence: index + 1,
//       itemCode: row?.itemCode || "",
//     }));
//     const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords, {
//       custCode,
//       docDate,
//       headerVatCode,
//     });
//     const updatedRows = distributeVatAcrossDetailRows(rows.map((row, index) =>
//       applyPriceMatrixToDetailRow(
//         row,
//         getPriceMatrixRowForItem(priceMatrixRows, row, index)
//       )
//     ));

//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const getPriceMatrixRowForItem = (priceMatrixRows = [], item = {}, index = 0) => { // Assuming SI also uses price matrix
//     const itemCode = normalizeItemCode(item?.itemCode);
//     const getMatrixItemCode = (priceRow) =>
//       priceRow?.itemCode ??
//       "";

//     return (
//       priceMatrixRows.find(
//         (priceRow) => normalizeItemCode(getMatrixItemCode(priceRow)) === itemCode
//       ) ||
//       priceMatrixRows.find(
//         (priceRow) => Number(priceRow?.sequence) === index + 1
//       ) ||
//       {}
//     );
//   };

//   const calculateRowAmountsFromRates = (row) => {
//     const discountRateFields = visibleDiscountRateFields;
//     const discountAmountFields = visibleDiscountAmountFields;
//     const quantity = parseFormattedNumber(row.siQuantity || 0) || 0;
//     let unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;
   

//     if (vatCodeFADisposal) {
//        const vatRow = getAllTopVatRow(vatCodeFADisposal);
//       const vatRate = parseFormattedNumber(vatRow?.vatRate || 0) || 0;
      

//       unitPrice = vatRate > 0
//         ? toFormattedAmountNumber(unitPrice + (unitPrice * (vatRate * 0.01)))
//         : unitPrice;
//     }


//     const grossAmount = toFormattedAmountNumber(quantity * unitPrice);
//     let runningBase = grossAmount;
//     let totalDiscount = 0;
//     const updatedAmounts = {};

//     discountRateFields.forEach((rateField, index) => {
//       const amountField = discountAmountFields[index];
//       const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
//       const discountAmount = toFormattedAmountNumber(runningBase * (rateValue * 0.01));

//       updatedAmounts[amountField] = formatNumber(discountAmount);
//       totalDiscount += discountAmount;
//       runningBase = toFormattedAmountNumber(runningBase - discountAmount);
//     });
//     const netAmount = toFormattedAmountNumber(grossAmount - totalDiscount);
//     const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;

//     return {
//       ...row,
//       unitPrice: formatNumber(unitPrice, sellingPriceDecimals),
//       grossAmount: formatNumber(grossAmount),
//       ...updatedAmounts,
//       totDiscount: formatNumber(totalDiscount),
//       netAmount: formatNumber(netAmount),
//       salesAmount: formatNumber(netAmount - vatAmount),
//       // ATC is header-level only, not per detail row.
//       atcAmount: formatNumber(0),
//       amountDue: formatNumber(0),
//     };
//   };



//   const applyPriceMatrixToDetailRow = (baseRow, priceRow = {}) => {
//     if (baseRow.freeItem === "Y") {
//       return calculateRowAmountsFromRates({
//         ...baseRow,
//         unitPrice: formatNumber(0, sellingPriceDecimals),
//         ...Object.fromEntries(
//           visibleDiscountRateFields.map((field) => [field, formatNumber(0)])
//         ),
//       });
//     }

//     const hasPriceMatrix = priceRow && Object.keys(priceRow).length > 0;

//     // IMPORTANT:
//     // Do not return 0 immediately when price matrix has no sellingPrice.
//     // calculateRowAmountsFromRates() uses row.unitPrice, so fallback must include
//     // priceRow.unitPrice, baseRow.unitPrice, and baseRow.sellingPrice.
//     const getPriceValue = () =>
//       priceRow?.sellingPrice ??
//       priceRow?.unitPrice ??
//       baseRow?.unitPrice ??
//       baseRow?.sellingPrice ??
//       0;

//     const getPmTypeValue = () => priceRow?.pmType ?? baseRow?.pmType ?? "";
//     const getPmIdValue = () => priceRow?.pmId ?? baseRow?.pmId ?? "";

//     const getDiscountRateValue = (discountNo) =>
//       hasPriceMatrix
//         ? priceRow?.[`discRate${discountNo}`] ?? baseRow?.[`discRate${discountNo}`] ?? 0
//         : baseRow?.[`discRate${discountNo}`] ?? 0;

//     const selectedVatCode = priceRow?.vatCode || baseRow.vatCode || vatCode || "";
//     const selectedVatRow = getAllTopVatRow(selectedVatCode);

//     const updatedRow = {
//       ...baseRow,
//       pmType: getPmTypeValue(),
//       pmId: getPmIdValue(),
//       vatCode: selectedVatCode,
//       vatRate: formatNumber(selectedVatRow?.vatRate || baseRow?.vatRate || 0),
//       unitPrice: formatNumber(getPriceValue(), sellingPriceDecimals),
//     };

//     visibleDiscountRateFields.forEach((field, index) => {
//       updatedRow[field] = formatNumber(getDiscountRateValue(index + 1));
//     });

//     return calculateRowAmountsFromRates(updatedRow);
//   };

//   const mapItemRecordToDetailRow = (item = {}) => {
   

//     return createSIDetailRow({
//       itemCode: item?.itemCode || "",
//       itemName: item?.itemName || "",
//       itemSpecs: item?.itemSpecs || "",
//       uomCode: item?.uomCode || "",
//       pmType: item?.pmType || "",
//       groupId: "",
//       pmId: item?.pmId || "",    
//       siQuantity: formatNumber( item?.siQuantity ?? 0, quantityDecimals ),
//       sellingPrice: formatNumber(item?.sellPrice, sellingPriceDecimals),
//       grossAmount: formatNumber(item?.grossAmount ?? 0),
//       discRate1: formatNumber(item?.discRate1 ?? 0),
//       discRate2: formatNumber(item?.discRate2 ?? 0),
//       discRate3: formatNumber(item?.discRate3 ?? 0),
//       discRate4: formatNumber(item?.discRate4 ?? 0),
//       discRate5: formatNumber(item?.discRate5 ?? 0),
//       discRate6: formatNumber(item?.discRate6 ?? 0),
//       discRate7: formatNumber(item?.discRate7 ?? 0),
//       discRate8: formatNumber(item?.discRate8 ?? 0),
//       discAmount1: formatNumber(item?.discAmount1 ?? 0),
//       discAmount2: formatNumber(item?.discAmount2 ?? 0),
//       discAmount3: formatNumber(item?.discAmount3 ?? 0),
//       discAmount4: formatNumber(item?.discAmount4 ?? 0),
//       discAmount5: formatNumber(item?.discAmount5 ?? 0),
//       discAmount6: formatNumber(item?.discAmount6 ?? 0),
//       discAmount7: formatNumber(item?.discAmount7 ?? 0),
//       discAmount8: formatNumber(item?.discAmount8 ?? 0),
//       totDiscount: formatNumber(item?.totDiscount ?? 0),
//       vatCode: item?.vatCode || "",
//       vatRate: formatNumber(item?.vatRate ?? 0),
//       vatAmount: formatNumber(item?.vatAmount ?? 0),
//       salesAmount: formatSalesAmount(item?.netAmount ?? 0, item?.vatAmount ?? 0),
//       atcAmount: formatNumber(item?.atcAmount ?? 0),
//       amountDue: formatNumber(item?.amountDue ?? 0),
//       netAmount: formatNumber(item?.netAmount ?? 0),
//       freeItem: item?.freeItem || "",
//       quantityPicked: formatNumber(item?.quantityPicked ?? item?.qtyPicked ?? 0, quantityDecimals),
//       itemAmount: formatNumber(item?.itemAmount ?? 0),
//       drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
//     });
//   };

//   const handleInsertSelectedItems = async (selectedRecords = []) => {
//     if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
//       return;
//     }

//     const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords); // Assuming SI also uses price matrix
//     const rowsToInsert = selectedRecords.map((item, index) => {
//       const baseRow = mapItemRecordToDetailRow(item);
//       const priceRow = getPriceMatrixRowForItem(priceMatrixRows, item, index);
//       return applyPriceMatrixToDetailRow(baseRow, priceRow);
//     });

//     insertDetailRows(rowsToInsert, insertAfterIndex);
//   };






// const cancelPickingAllocationForDeletedSIRow = async (row) => {
//   const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

//   // Only SI02 has FG picking allocation.
//   if (String(siTranType || "").toUpperCase() !== "SI02") {
//     return true;
//   }

//   // No picked quantity, no need to call allocation API.
//   if (pickedQty <= 0) {
//     return true;
//   }

//   if (!documentID || !row?.groupId) {
//     useSwalErrorAlert(
//       "Delete SI Detail",
//       "Cannot release picking allocation. SI ID or Group ID is missing."
//     );
//     return false;
//   }

//   const confirm = await useSwalProceedConfirm(
//     "Delete Picked SI Detail?",
//     "This line already has picked quantity. Deleting it will release the FG picking allocation.",
//     "Yes"
//   );

//   if (!confirm?.isConfirmed) {
//     return false;
//   }

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     await postRequest("getFGUpdateStockAllocation", {
//       mode: "CancelAlloc",
//       params: JSON.stringify({
//         json_data: {
//           docCode: "SI",
//           docId: documentID,
//           groupId: row.groupId,
//           userCode: userCode || currentUserRow?.userCode || "",
//           reason: "SI detail line deleted.",
//         },
//       }),
//     });

//     return true;
//   } catch (error) {
//     console.error("Failed to release SI FG picking allocation:", error);
//     useSwalErrorAlert("Delete SI Detail", getApiErrorMessage(error));
//     return false;
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };


// const handleDeleteRow = async (index) => {
//   const rowToDelete = detailRows?.[index];

//   if (!rowToDelete) {
//     return;
//   }

//   const canDelete = await cancelPickingAllocationForDeletedSIRow(rowToDelete);

//   if (!canDelete) {
//     return;
//   }

//   const updatedRows = [...detailRows];
//   updatedRows.splice(index, 1);

//   updateState({
//     detailRows: updatedRows,
//     detailRowsGL: [],
//   });

//   updateTotals(updatedRows);
// };

// const handleAddRowGL = (index = null) => {
//   const newRow = {
//     acctCode: "",
//     rcCode: "",
//     sltypeCode: "CU",
//     slCode: "",
//     particular: "",
//     vatCode: "",
//     vatName: "",
//     atcCode: "",
//     atcName: "",
//     debit: "0.00",
//     credit: "0.00",
//     debitFx1: "0.00",
//     creditFx1: "0.00",
//     debitFx2: "0.00",
//     creditFx2: "0.00",
//     slRefNo: "",
//     slRefDate: "",
//     remarks: "",
//   };

//   const updatedRows = [...detailRowsGL];
//   if (index !== null && index >= 0) {
//     updatedRows.splice(index + 1, 0, newRow);
//   } else {
//     updatedRows.push(newRow);
//   }

//   updateState({
//     detailRowsGL: updatedRows,
//     ...getGLTotalsState(updatedRows),
//   });
// };

// const handleDeleteRowGL = (index) => {
//   const updatedRows = [...detailRowsGL];
//   updatedRows.splice(index, 1);
//   updateState({
//     detailRowsGL: updatedRows,
//     ...getGLTotalsState(updatedRows),
//   });
// };

// const handleDetailChangeGL = async (index, field, value) => {
//   const updatedRowsGL = [...(detailRowsGLRef.current || [])];
//   let row = { ...updatedRowsGL[index] };

//   if (["acctCode", "slCode", "rcCode", "sltypeCode", "vatCode", "atcCode"].includes(field)) {
//     const data = await useUpdateRowGLEntries(row, field, value, billToCustCode, docType);
//     if (data) {
//       row.acctCode = data.acctCode;
//       row.sltypeCode = data.sltypeCode;
//       row.slCode = data.slCode;
//       row.rcCode = data.rcCode;
//       row.vatCode = data.vatCode;
//       row.vatName = data.vatName;
//       row.atcCode = data.atcCode;
//       row.atcName = data.atcName;
//       row.particular = data.particular;
//     }
//   }

//   if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
//     row[field] = value;
//     const parsedValue = parseFormattedNumber(value);
//     const pairs = {
//       debit: "credit",
//       credit: "debit",
//       debitFx1: "creditFx1",
//       creditFx1: "debitFx1",
//       debitFx2: "creditFx2",
//       creditFx2: "debitFx2",
//     };

//     if (parsedValue > 0 && pairs[field]) {
//       row[pairs[field]] = "0.00";
//     }
//   }

//   if (["slRefNo", "slRefDate", "remarks", "particular", "atcName", "sltypeCode"].includes(field)) {
//     row[field] = value;
//   }

//   updatedRowsGL[index] = row;
//   updateState({
//     detailRowsGL: updatedRowsGL,
//     ...getGLTotalsState(updatedRowsGL),
//   });
// };

// const handleBlurGL = async (index, field, value, autoCompute = false) => {
//   const updatedRowsGL = [...(detailRowsGLRef.current || [])];
//   const row = { ...updatedRowsGL[index] };
//   const parsedValue = parseFormattedNumber(value);
//   row[field] = formatNumber(parsedValue);

//   if (autoCompute && (withCurr2 || withCurr3)) {
//     if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
//       const data = await useUpdateRowEditEntries(row, field, value, currCode, currRate, documentDate);
//       if (data) {
//         row.debit = formatNumber(data.debit);
//         row.credit = formatNumber(data.credit);
//         row.debitFx1 = formatNumber(data.debitFx1);
//         row.creditFx1 = formatNumber(data.creditFx1);
//         row.debitFx2 = formatNumber(data.debitFx2);
//         row.creditFx2 = formatNumber(data.creditFx2);
//       }
//     }
//   } else {
//     const pairs = [
//       ["debit", "credit"],
//       ["debitFx1", "creditFx1"],
//       ["debitFx2", "creditFx2"],
//     ];

//     pairs.forEach(([a, b]) => {
//       if (field === a && parsedValue > 0) {
//         row[b] = formatNumber(0);
//       } else if (field === b && parsedValue > 0) {
//         row[a] = formatNumber(0);
//       }
//     });
//   }

//   updatedRowsGL[index] = row;
//   updateState({
//     detailRowsGL: updatedRowsGL,
//     ...getGLTotalsState(updatedRowsGL),
//   });
// };

// const handlePrint = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return; // Assuming SI also requires detail rows to print
//       }
//   if (documentID) {
//     updateState({ showSignatoryModal: true });
//   }
// };

//   const handleOpenAddItemModal = async (overrides = {}) => {
//     const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
//     const lookupBillTermCode = String(overrides.billtermCode ?? billtermCode ?? "").trim();
//     const lookupSalesRepCode = String(overrides.salesRepCode ?? salesRepCode ?? "").trim();

//     const fieldsToCheck = {
//       "Header : Bill To Customer Code": lookupCustCode,
//       "Header : Billing Term": lookupBillTermCode,
//       "Header : Sales Rep": lookupSalesRepCode,
//     };

//     const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
//     if (!isValid) return;

//     updateState({
//       showItemModal: true,
//       selectionContext: "multiAdd",
//       selectedRowIndex: null,
//       insertAfterIndex: null,
//     });
//   };

//   const handleAddRowClick = async () => {
//     if (documentStatus !== "" || isFormDisabled) return;

//     setShowAddTypeDropdown(false);

//     const lookupCustCode = String(billToCustCode || "").trim();

//     if (!lookupCustCode) {
//       const branchIsValid = await useSwalvalidateRequiredFields(
//         { "Header : Branch": branchCode },
//         "Add SI Detail"
//       );
//       if (!branchIsValid) return;

//       updateState({
//         custModalOpen: true,
//         modalContext: "addDetail",
//       });
//       return;
//     }


//   if (["SI01", "SI03"].includes(String(siTranType || "").toUpperCase())) {
//     await handleOpenDRLookup();
//     return;
//   }

//     await handleOpenAddItemModal();
//   };

//   const getApiErrorMessage = (error) =>
//     error?.response?.data?.message ||
//     error?.response?.data?.error ||
//     error?.message ||
//     "Unknown server error";

//   const parseSprocJsonResult = (response) => {
//     const rawResult =
//       response?.data?.[0]?.result ??
//       response?.data?.data?.[0]?.result ??
//       response?.Data?.[0]?.result ??
//       response?.data?.result ??
//       response?.result;

//     if (!rawResult) return {};

//     if (typeof rawResult === "string") {
//       try {
//         return JSON.parse(rawResult);
//       } catch (error) {
//         console.error("Invalid JSON result:", rawResult, error);
//         return {};
//       }
//     }

//     return rawResult;
//   };

//   const getValueFromKeys = (source, keys = []) => {
//     if (!source || typeof source !== "object") return undefined;

//     for (const key of keys) {
//       if (source[key] !== undefined && source[key] !== null) {
//         return source[key];
//       }
//     }

//     const sourceEntries = Object.entries(source);
//     const normalizedKeys = keys.map((key) => String(key).toLowerCase());
//     const matchingEntry = sourceEntries.find(([key]) =>
//       normalizedKeys.includes(String(key).toLowerCase())
//     );

//     return matchingEntry?.[1];
//   };

//   const getPickingResultRows = (result) => {
//     if (Array.isArray(result)) return result;

//     return [
//       result?.dt1,
//       result?.detailRows,
//       result?.rows,
//       result?.data,
//       result?.allocations,
//     ].find(Array.isArray) || [];
//   };

//   const getPickingResultRow = (result, row, index) => {
//     const resultRows = getPickingResultRows(result);
//     if (!resultRows.length) return null;

//     const lineNo = String(index + 1);
//     const groupId = String(row?.groupId || "");
//     const itemCode = String(row?.itemCode || "");

//     return (
//       resultRows.find((resultRow) => {
//         const resultLineNo = String(
//           resultRow.lineNo ?? resultRow.lnNo ?? resultRow.ln ?? resultRow.recNo ?? ""
//         );
//         return resultLineNo && resultLineNo === lineNo;
//       }) ||
//       resultRows.find((resultRow) => {
//         const resultGroupId = String(resultRow.groupId ?? resultRow.groupID ?? "");
//         return groupId && resultGroupId === groupId;
//       }) ||
//       resultRows.find((resultRow) => {
//         const resultItemCode = String(resultRow.itemCode ?? resultRow.item_code ?? "");
//         return itemCode && resultItemCode === itemCode;
//       }) ||
//       resultRows[0]
//     );
//   };

//   const getPickingResultNumber = (result, row, index, keys, fallback = 0) => {
//     const detailResult = getPickingResultRow(result, row, index);
//     const value =
//       getValueFromKeys(detailResult, keys) ??
//       getValueFromKeys(result, keys) ??
//       fallback;

//     return parseFormattedNumber(value) || 0;
//   };

//   const getPickingAllocationAmount = (allocations = []) =>
//     (Array.isArray(allocations) ? allocations : []).reduce((total, allocation) => {
//       const pickedQty =
//         parseFormattedNumber(
//           allocation.pickQty ??
//             allocation.pickedQty ??
//             allocation.quantityPicked ??
//             allocation.qtyPicked ??
//             allocation.qty ??
//             0
//         ) || 0;
//       const unitCost =
//         parseFormattedNumber(
//           allocation.unitCost ??
//             allocation.wac ??
//             allocation.cost ??
//             allocation.itemCost ??
//             allocation.unitPrice ??
//             0
//         ) || 0;

//       return total + pickedQty * unitCost;
//     }, 0);

//   const buildPickingBasePayload = (row, index) => ({
//     docCode: "SI",
//     docNo: documentNo || "",
//     docId: documentID || "",
//     docDate: documentDate || null,
//     branchCode: branchCode || "",
//     groupId: row?.groupId || "",
//     lineNo: index + 1,
//     itemCode: row?.itemCode || "",
//     requestedQty: parseFormattedNumber(row?.siQuantity || 0) || 0,
//     userCode: userCode || currentUserRow?.userCode || "",
//   });

//   const buildAutoPickingAllocations = (stockRows = [], requestedQty = 0, row = {}) => {
//     let remainingQty = Math.max(parseFormattedNumber(requestedQty || 0) || 0, 0);

//     return [...(Array.isArray(stockRows) ? stockRows : [])]
//       .map((stockRow, index) => ({
//         ...stockRow,
//         priorityNo: stockRow.priorityNo || index + 1,
//         remainingAvailable: parseFormattedNumber(stockRow.remainingAvailable || 0) || 0,
//         isBlocked:
//           stockRow.isBlocked ||
//           (parseFormattedNumber(stockRow.remainingAvailable || 0) || 0) <= 0 ||
//           ["HOLD", "BLOCKED", "QUARANTINE"].includes(String(stockRow.qualityStatus || "").toUpperCase()),
//       }))
//       .sort((a, b) => {
//         const dateA = new Date(a.bestBeforeDate || "").getTime();
//         const dateB = new Date(b.bestBeforeDate || "").getTime();
//         const safeDateA = Number.isFinite(dateA) ? dateA : Number.MAX_SAFE_INTEGER;
//         const safeDateB = Number.isFinite(dateB) ? dateB : Number.MAX_SAFE_INTEGER;
//         if (safeDateA !== safeDateB) return safeDateA - safeDateB;
//         return Number(a.priorityNo || 0) - Number(b.priorityNo || 0);
//       })
//       .reduce((allocations, stockRow) => {
//         if (stockRow.isBlocked || remainingQty <= 0) return allocations;

//         const pickQty = Math.min(stockRow.remainingAvailable, remainingQty);
//         remainingQty -= pickQty;

//         if (pickQty <= 0) return allocations;

//         allocations.push({
//           groupId: row.groupId || "",
//           sourceDocType: "SI",
//           sourceLineNo: "",
//           itemCode: row.itemCode || "",
//           stockCardRefId: stockRow.stockCardRefId,
//           lotNo: stockRow.lotNo,
//           qualityStatus: stockRow.qualityStatus,
//           bestBeforeDate: stockRow.bestBeforeDate,
//           fgFifoLocId: stockRow.fgFifoLocId || null,
//           fgWacLocId: stockRow.fgWacLocId || null,
//           warehouseCode: stockRow.warehouseCode,
//           whouseCode: stockRow.warehouseCode,
//           warehouseName: stockRow.warehouseName,
//           locationCode: stockRow.locationCode,
//           locCode: stockRow.locationCode,
//           priorityNo: stockRow.priorityNo,
//           sourceDocCode: stockRow.sourceDocCode || null,
//           sourceDocNo: stockRow.sourceDocNo || null,
//           sourceDocDate: stockRow.sourceDocDate || null,
//           sourceDocId: stockRow.sourceDocId || null,
//           sourceGroupId: stockRow.sourceGroupId || null,
//           fifoDocCode: stockRow.fifoDocCode || null,
//           fifoDocNo: stockRow.fifoDocNo || null,
//           orderId: stockRow.orderId || null,
//           unitCost: parseFormattedNumber(stockRow.unitCost || 0) || 0,
//           wacKey: stockRow.wacKey || null,
//           wac: parseFormattedNumber(stockRow.wac || 0) || 0,
//           pickQty,
//         });

//         return allocations;
//       }, []);
//   };

//   const handleOpenDRLookup = async (overrides = {}) => {
//     const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
//     const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

//     if (!lookupCustCode) {
//       const branchIsValid = await useSwalvalidateRequiredFields(
//         { "Header : Branch": lookupBranchCode },
//         "Open DR Lookup"
//       );
//       if (!branchIsValid) return;

//       updateState({
//         custModalOpen: true,
//         modalContext: siTranType === "SI03" ? "openFADS" : "openDR",
//       });
//       return;
//     }

//     const fieldsToCheck = {
//       "Header : Bill To Customer Code": lookupCustCode,
//       "Header : Branch": lookupBranchCode,
//     };

//     const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Open DR Lookup");
//     if (!isValid) return;

//     try {
//       updateState({ isLoading: true, showSpinner: true });

//       const endpoint = "getDRSI_OpenSummary";
//       const payload = {
//           custCode: lookupCustCode,
//           billToCustCode: lookupCustCode,
//           branchCode: lookupBranchCode,
//           siTranType: siTranType || "",
//         };

//      console.log("GetDRSI_OpenSummary payload:", payload);
//       const response = await fetchDataJson(endpoint, payload);

//       const drRows = response?.data?.[0]?.result
//         ? JSON.parse(response.data[0].result).map(normalizeOpenDRLookupRow)
//         : [];

//       if (!drRows.length) {
//         useSwalErrorAlert(
//           "Open DR",
//           "There are no open Delivery Receipt records for the selected customer/branch."
//         );
//         return;
//       }

//       const summaryColumns = await selectedHSColConfig(endpoint);
//       updateState({
//         openDRSI_Data_Summary: drRows,
//         openDRSI_Col_Summary: summaryColumns,
//         showOpenDRModal: true,
//       });
//     } catch (error) {
//       console.error("Failed to fetch Open DR:", error);
//       useSwalErrorAlert("Open DR", getApiErrorMessage(error));
//       updateState({
//         openDRSI_Data_Summary: [],
//         openDRSI_Col_Summary: [],
//       });
//     } finally {
//       updateState({ isLoading: false, showSpinner: false });
//     }
//   };

// const handleCancel = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return; // Assuming SI also requires detail rows to cancel
//       }

//   if (documentID && (documentStatus === '')) {
//     updateState({ showCancelModal: true });
//   }
// };

// const handleAttach = async () => {
//   if (documentID ) {
//     updateState({ showAttachModal: true });
//    }
// };

// const handleCopy = async () => {
//   if (!detailRows || detailRows.length === 0) {
//     return;
//   }  
//   if (documentID) {
//     const nextDocumentDate = useGetCurrentDayV2();
//     const copiedDetailRows = detailRows.map((row) => ({
//       ...row,
//       siStat: "F",
//       drQuantity: formatNumber(0, quantityDecimals),
//       siQuantity: formatNumber(0, quantityDecimals),
//       groupId: "",
//       pmId: "",
//       pmType: "",
//     }));
    
//     updateState({
//       documentNo: "",
//       documentID: "",
//       documentStatus: "",
//       status: "OPEN",
//       siStatus: "O",
//       documentDate: nextDocumentDate,
//       refSiNo1: "",
//       refSiNo2: "",
//       noReprints: "0",
//       detailRows: copiedDetailRows,
//     });
//   }
// };

// //  ** View Document and Transaction History Retrieval ***
// const cleanUrl = useCallback(() => {
//   window.history.replaceState({}, "", window.location.origin);
// }, []);

// const handleHistoryRowPick = useCallback(
//   async (row) => {
//     const docNo = row?.docNo;
//     const branchCode = row?.branchCode;
//     if (!docNo || !branchCode) return;
  
//     await fetchTranData(docNo, branchCode);
//     setTopTab("details");
//     cleanUrl(); //
//   },
//   [fetchTranData, cleanUrl]
// );

// useEffect(() => {
//   const params = new URLSearchParams(location.search);
//   const docNo = params.get("siNo");
//   const branchCode = params.get("branchCode");
  
//   if (!loadedFromUrlRef.current && docNo && branchCode) {
//     loadedFromUrlRef.current = true;
//     handleHistoryRowPick({ docNo, branchCode });
//   }
// }, [location.search, handleHistoryRowPick]);

//   const printData = {
//     apv_no: documentNo,
//     branch: branchCode,
//     doc_id: docType,
//   };

// const handleTranDocNoRetrieval = async (data) => {

//     await fetchTranData(data.docNo, branchCode, data.key);
//     updateState({showAllTranDocNo: data.modalClose});
// };

// const handleTranDocNoSelection = async (data) => {

//     handleReset();
//     updateState({showAllTranDocNo: false, documentNo:data.docNo });
// };

// const handleCloseCancel = async (confirmation) => {
//     if(confirmation && documentStatus === "" && documentID !== null ) {
      
//       const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
//       if (result.success)
//       {
//        useSwalSuccessAlert("Success","Cancellation Completed")
//       }
//      await fetchTranData(documentNo,branchCode);
//     }
//     updateState({showCancelModal: false});
// };

// const handleCloseSignatory = async (mode) => {

//     updateState({
//         showSpinner: true,
//         showSignatoryModal: false,
//         noReprints: mode === "Final" ? 1 : 0, });
//     await useHandlePrint(documentID, docType, mode,userCode);

//     updateState({
//       showSpinner: false
//     });

// };

// const handleSaveAndPrint = async (documentID) => {

//     updateState({ showSpinner: true });
//     await useHandlePrint(documentID, docType);

//     updateState({showSpinner: false});
// };

//   const handleCloseCustModal = async (selectedData) => {
//     if (!selectedData) {
//         updateState({ custModalOpen: false });
//         return;
//     }

//     updateState({ custModalOpen: false });
//     updateState({ isLoading: true });

//     try {

//         const address = selectedData?.addr || "";
//         const selectedVatCode = selectedData?.vatCode || "";
//         const selectedVatRow = getAllTopVatRow(selectedVatCode);
//         const selectedVatName = selectedVatRow?.vatName || selectedData?.vatName || "";
//         const selectedAtcCode = selectedData?.atcCode || "";
//         const selectedAtcRow = getAllTopATCRow(selectedAtcCode);
//         const selectedAtcName = selectedAtcRow?.atcName || selectedData?.atcName || "";
//         const custDetails = {            custCode: selectedData?.custCode || '',
//             custName: selectedData?.custName || '',
//             currCode: selectedData?.currCode || '',
//             attention: selectedData?.attention || '',
//             billtermCode: selectedData?.billtermCode || '',
//             billtermName: selectedData?.billtermName || '',
//             salesRepCode: selectedData?.salesRepCode || '',
//             salesRepName: selectedData?.salesRepName || '',
//             vatCode: selectedVatCode,
//             vatName: selectedVatName,
//             atcCode: selectedAtcCode,
//             atcName: selectedAtcName,

//         };
//         const nextBillToCustCode = selectedData?.custCode || "";
//         const shouldRepriceDetailRows =
//           detailRows.length > 0 &&
//           String(nextBillToCustCode).trim() !== "" &&
//           String(nextBillToCustCode).trim() !== String(billToCustCode || "").trim();
//         updateState(
//             {
//                 billToCustName: selectedData.custName,
//                 billToCustCode: selectedData.custCode,
//                 vatCode: selectedVatCode,
//                 vatName: selectedVatName,
//                 atcCode: selectedAtcCode,
//                 atcName: selectedAtcName,
//                 custModalOpen: false,
//                 modalContext: "",
//             }
//         );

//         if (!selectedData.currCode) {
//             const payload = { CUST_CODE: selectedData.custCode };
//             const response = await postRequest("getCustomer", JSON.stringify(payload));

//             if (response.success) {
//                 const customerRow = JSON.parse(response.data[0].result)?.[0] || {};
//                 custDetails.currCode = customerRow?.currCode || custDetails.currCode;
//                 custDetails.attention = customerRow?.custContact || custDetails.attention;
//                 custDetails.billtermCode = customerRow?.billtermCode || custDetails.billtermCode;
//                 custDetails.billtermName = customerRow?.billtermName || custDetails.billtermName;
//                 custDetails.salesRepCode = customerRow?.salesRepCode || custDetails.salesRepCode;
//                 custDetails.vatCode = customerRow?.vatCode || custDetails.vatCode;
//                 const customerVatRow = getAllTopVatRow(custDetails.vatCode);
//                 custDetails.vatName = customerVatRow?.vatName || customerRow?.vatName || custDetails.vatName;
//                 custDetails.atcCode = customerRow?.atcCode || custDetails.atcCode;
//                 const customerAtcRow = getAllTopATCRow(custDetails.atcCode);
//                 custDetails.atcName = customerAtcRow?.atcName || customerRow?.atcName || custDetails.atcName;
//             } else {
//                 console.warn("API call for getCustomer returned success: false", response.message);
//             }
//         }

//         const custVatRow = getAllTopVatRow(custDetails.vatCode);
//         custDetails.vatName = custVatRow?.vatName || custDetails.vatName;
//         const custAtcRow = getAllTopATCRow(custDetails.atcCode);
//         custDetails.atcName = custAtcRow?.atcName || custDetails.atcName;

//         if (custDetails.salesRepCode) {
//           const salesRepRow = await useTopSalesRepRow(custDetails.salesRepCode);
//           custDetails.salesRepName = salesRepRow?.salesRepName || custDetails.salesRepName;
//         }

     
//         await Promise.all([
//             handleSelectCurrency(custDetails.currCode),
//             handleSelectBillTerm(custDetails.billtermCode),
//             updateState({
//             contactPerson: custDetails.attention,
//             salesRepCode: custDetails.salesRepCode,
//             salesRepName: custDetails.salesRepName,
//             vatCode: custDetails.vatCode,
//             vatName: custDetails.vatName,
//             atcCode: custDetails.atcCode,
//             atcName: custDetails.atcName,
//           })
//         ]);

//         if (shouldRepriceDetailRows) {
//             await refreshDetailRowsFromPriceMatrix({
//               custCode: nextBillToCustCode,
//               headerVatCode: custDetails.vatCode || vatCode,
//             });
//         }

//         if (modalContext === "addDetail" || modalContext === "openDR") {
//           const nextCustomerCode = custDetails.custCode || selectedData?.custCode || "";
//           const nextBillTermCode = custDetails.billtermCode || "";
//           const nextSalesRepCode = custDetails.salesRepCode || "";

//           if (["SI01", "SI03"].includes(String(siTranType || "").toUpperCase()) || modalContext === "openDR") {
//             await handleOpenDRLookup({
//               billToCustCode: nextCustomerCode,
//               branchCode,
//             });
//           } else {
//             await handleOpenAddItemModal({
//               billToCustCode: nextCustomerCode,
//               billtermCode: nextBillTermCode,
//               salesRepCode: nextSalesRepCode,
//             });
//           }
//         }

//     } catch (error) {
//         console.error("Error fetching customer details:", error);
//     } finally {
//        updateState({ isLoading: false, modalContext: "" });
//     }
// };

//   const computeTotalsFromRows = (rows = [], atcCodeOverride = atcCode) => {
//     let totalGrossAmt = 0;
//     let totalDiscAmt = 0;
//     let totalVatAmt = 0;
//     let totalSalesAmt = 0;
//     let totalNetAmt = 0;

//     rows.forEach((row) => {
//       totalGrossAmt += toFormattedAmountNumber(row.grossAmount || 0);
//       totalDiscAmt += toFormattedAmountNumber(row.totDiscount || 0);
//       totalVatAmt += toFormattedAmountNumber(row.vatAmount || 0);
//       totalNetAmt += toFormattedAmountNumber(row.netAmount || 0);
//     });

//     totalSalesAmt = toFormattedAmountNumber(totalNetAmt - totalVatAmt);

//     const totalAtcAmt = toFormattedAmountNumber(
//       getAllTopATCAmount(atcCodeOverride, totalSalesAmt)
//     );
//     const totalAmountDue = toFormattedAmountNumber(totalNetAmt - totalAtcAmt);

//     return {
//       totalGrossAmt,
//       totalDiscAmt,
//       totalVatAmt,
//       totalAtcAmt,
//       totalSalesAmt,
//       totalNetAmt,
//       totalAmountDue,
//     };
//   };

//   const updateTotals = (rows = [], atcCodeOverride = atcCode) => {
//     const {
//       totalGrossAmt,
//       totalDiscAmt,
//       totalVatAmt,
//       totalAtcAmt,
//       totalSalesAmt,
//       totalNetAmt,
//       totalAmountDue,
//     } = computeTotalsFromRows(rows, atcCodeOverride);

//     updateTotalsDisplay(
//       totalGrossAmt,
//       totalDiscAmt,
//       totalVatAmt,
//       totalAtcAmt,
//       totalSalesAmt,
//       totalNetAmt,
//       totalAmountDue,
//       atcCodeOverride
//     );
//   };

//   const buildSiDataForGl = (rows = detailRows, glRows = [], headerOverrides = {}) => {
//     const nextVatCode =
//       headerOverrides.vatCode !== undefined ? headerOverrides.vatCode : vatCode;
//     const nextAtcCode =
//       headerOverrides.atcCode !== undefined ? headerOverrides.atcCode : atcCode;
//     const totalValues = computeTotalsFromRows(rows, nextAtcCode);

//     return {
//       branchCode,
//       siNo: documentNo || "",
//       siId: documentID || "",
//       siDate: documentDate,
//       sitranType: siTranType,
//       billtermCode,
//       custCode: billToCustCode,
//       custName: billToCustName,
//       attention: contactPerson,
//       refSiNo1,
//       refSiNo2,
//       currCode: currCode || "PHP",
//       currRate: parseFormattedNumber(currRate),
//       atcAmount: totalValues.totalAtcAmt,
//       atcCode: nextAtcCode || "",
//       vatCode: nextVatCode || "",
//       dueDate: dueDate || "",
//       remarks: remarks || "",
//       userCode,
//       customerPoNo: customerPoNo || "",
//       customerPoDate: customerPoDate || null,
//       salesRepCode,
//       salesRepName,
//       soStatus: siStatus || "O",
//       dt1: rows.map((row, index) => ({
//         lnNo: String(index + 1),
//         pickStat: row.siStat || "F",
//         siStat: row.siStat || "F",
//         drNo: row.drNo || "",
//         drId: row.drId || "",
//         soId: row.soId || "",
//         groupId: row.groupId || "",
//         itemCode: row.itemCode || "",
//         itemName: row.itemName || "",
//         itemSpecs: row.itemSpecs || "",
//         uomCode: row.uomCode || "",
//         pmType: row.pmType || "",
//         pmId: row.pmId || "",
//         siQuantity: parseFormattedNumber(row.siQuantity || 0),
//         unitPrice: parseFormattedNumber(row.unitPrice || 0),
//         grossAmount: parseFormattedNumber(row.grossAmount || 0),
//         discRate1: parseFormattedNumber(row.discRate1 || 0),
//         discRate2: parseFormattedNumber(row.discRate2 || 0),
//         discRate3: parseFormattedNumber(row.discRate3 || 0),
//         discRate4: parseFormattedNumber(row.discRate4 || 0),
//         discRate5: parseFormattedNumber(row.discRate5 || 0),
//         discRate6: parseFormattedNumber(row.discRate6 || 0),
//         discRate7: parseFormattedNumber(row.discRate7 || 0),
//         discRate8: parseFormattedNumber(row.discRate8 || 0),
//         discAmount1: parseFormattedNumber(row.discAmount1 || 0),
//         discAmount2: parseFormattedNumber(row.discAmount2 || 0),
//         discAmount3: parseFormattedNumber(row.discAmount3 || 0),
//         discAmount4: parseFormattedNumber(row.discAmount4 || 0),
//         discAmount5: parseFormattedNumber(row.discAmount5 || 0),
//         discAmount6: parseFormattedNumber(row.discAmount6 || 0),
//         discAmount7: parseFormattedNumber(row.discAmount7 || 0),
//         discAmount8: parseFormattedNumber(row.discAmount8 || 0),
//         totDiscount: parseFormattedNumber(row.totDiscount || 0),
//         vatCode: row.vatCode || "",
//         vatRate: parseFormattedNumber(row.vatRate || 0),
//         vatAmount: parseFormattedNumber(row.vatAmount || 0),
//         salesAmount: parseFormattedNumber(row.salesAmount || 0),
//         atcAmount: parseFormattedNumber(row.atcAmount || 0),
//         amountDue: parseFormattedNumber(row.amountDue || 0),
//         netAmount: parseFormattedNumber(row.netAmount || 0),
//         freeItem: row.freeItem || "",
//         quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
//         itemAmount: parseFormattedNumber(row.itemAmount || 0),
//         drQuantity: parseFormattedNumber(row.drQuantity || 0),
//       })),
//       dt2: glRows.map((entry, index) => ({
//         recNo: String(index + 1),
//         acctCode: entry.acctCode || "",
//         rcCode: entry.rcCode || "",
//         sltypeCode: entry.sltypeCode || "",
//         slCode: entry.slCode || "",
//         particular: entry.particular || "",
//         vatCode: entry.vatCode || "",
//         vatName: entry.vatName || "",
//         atcCode: entry.atcCode || "",
//         atcName: entry.atcName || "",
//         debit: parseFormattedNumber(entry.debit || 0),
//         credit: parseFormattedNumber(entry.credit || 0),
//         debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
//         creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
//         debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
//         creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
//         slRefNo: entry.slRefNo || "",
//         slRefDate: entry.slRefDate || null,
//         remarks: entry.remarks || "",
//         dt1Lineno: entry.dt1Lineno || "",
//       })),
//     };
//   };

//   const regenerateGlEntriesForRows = async (rows, headerOverrides = {}) => {
//     if (!Array.isArray(rows) || rows.length === 0) {
//       updateState({ detailRowsGL: [] });
//       return;
//     }

//     try {
//       updateState({ detailRowsGL: [], isGeneratingGL: true });
//       const newGlEntries = await useGenerateGLEntries(
//         docType,
//         buildSiDataForGl(rows, [], headerOverrides)
//       );
//       updateState({
//         detailRowsGL: newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
//         isGeneratingGL: false,
//       });
//     } catch (error) {
//       updateState({ detailRowsGL: [], isGeneratingGL: false });
//       console.error(error);
//     }
//   };

// const handleCloseRcModal = async (selectedRc) => {
//   if (modalContext === "headerRc" && selectedRc) {
//     updateState({
//       rcCode: selectedRc.rcCode || "",
//       rcName: selectedRc.rcName || "",
//       showRcModal: false,
//       selectedRowIndex: null,
//       modalContext: "",
//     });
//     return;
//   }

//   if (modalContext === "glRC" && selectedRc && selectedRowIndex !== null) {
//     const result = await useTopRCRow(selectedRc.rcCode);
//     if (result) {
//       handleDetailChangeGL(selectedRowIndex, "rcCode", result);
//     }
//   }

//   updateState({
//     showRcModal: false,
//     selectedRowIndex: null,
//     modalContext: "",
//   });
// };

// const handleCloseATCModal = async (selectedATC) => {
//   if (!selectedATC) {
//     updateState({ showATCModal: false, selectedRowIndex: null, modalContext: "" });
//     return;
//   }

//   if (modalContext === "detailATC" && selectedRowIndex !== null) {
//     const updatedRows = [...detailRows];
//     updatedRows[selectedRowIndex] = {
//       ...updatedRows[selectedRowIndex],
//       atcCode: selectedATC.atcCode || "",
//     };

//     updateState({
//       detailRows: updatedRows,
//       showATCModal: false,
//       selectedRowIndex: null,
//       modalContext: "",
//     });
//     return;
//   }

//   if (modalContext === "glATC" && selectedRowIndex !== null) {
//     const result = getAllTopATCRow(selectedATC.atcCode);
//     if (result) {
//       handleDetailChangeGL(selectedRowIndex, "atcCode", result);
//     }

//     updateState({
//       showATCModal: false,
//       selectedRowIndex: null,
//       modalContext: "",
//     });
//     return;
//   }

//   const nextAtcCode = selectedATC.atcCode || "";
//   const normalizedRows = distributeVatAcrossDetailRows(detailRowsRef.current || detailRows, {
//     atcCode: nextAtcCode,
//   });

//   updateState({
//     atcCode: nextAtcCode,
//     atcName: selectedATC.atcName || "",
//     detailRows: normalizedRows,
//     showATCModal: false,
//     selectedRowIndex: null,
//     modalContext: "",
//   });
//   updateTotals(normalizedRows, nextAtcCode);
//   await regenerateGlEntriesForRows(normalizedRows, { atcCode: nextAtcCode });
// };

// const handleCloseVatModal = async (selectedVat) => {
//   const closeContext = modalContext;
//   const closeRowIndex = selectedRowIndex;

//   updateState({
//     showVatModal: false,
//     selectedRowIndex: null,
//     modalContext: "",
//   });

//   if (!selectedVat) return;

//   try {
//     const selectedVatCode =
//       selectedVat?.vatCode ||
//       selectedVat?.vat_code ||
//       selectedVat?.VAT_CODE ||
//       selectedVat?.code ||
//       "";

//     const selectedVatRow = getAllTopVatRow(selectedVatCode) || selectedVat || {};

//     const nextVatCode =
//       selectedVatRow?.vatCode ||
//       selectedVatRow?.vat_code ||
//       selectedVatRow?.VAT_CODE ||
//       selectedVatCode ||
//       "";

//     const nextVatName =
//       selectedVatRow?.vatName ||
//       selectedVatRow?.vat_name ||
//       selectedVatRow?.VAT_NAME ||
//       selectedVatRow?.vatDesc ||
//       selectedVatRow?.vat_desc ||
//       selectedVatRow?.VAT_DESC ||
//       selectedVat?.vatName ||
//       selectedVat?.vatDesc ||
//       "";

//     const nextVatRate = formatNumber(
//       selectedVatRow?.vatRate ??
//       selectedVatRow?.vat_rate ??
//       selectedVatRow?.VAT_RATE ??
//       selectedVat?.vatRate ??
//       selectedVat?.vat_rate ??
//       0
//     );

//     if (!nextVatCode) {
//       useSwalErrorAlert(
//         "Invalid VAT",
//         "Selected VAT did not return a valid VAT Code."
//       );
//       return;
//     }

//     if (closeContext === "detailVAT" && closeRowIndex !== null) {
//       const updatedRows = [...(detailRowsRef.current || [])];
//       const currentRow = updatedRows[closeRowIndex];

//       if (!currentRow) return;

//       updatedRows[closeRowIndex] = recalculateSODetailRow(
//         {
//           ...currentRow,
//           vatCode: nextVatCode,
//           vatRate: nextVatRate,
//           vatAmount: "0.00",
//         },
//         "vatCode"
//       );

//       const normalizedRows = distributeVatAcrossDetailRows(updatedRows, {
//         vatCode: nextVatCode,
//         atcCode,
//       });

//       updateState({
//         detailRows: normalizedRows,
//       });

//       updateTotals(normalizedRows);
//       await regenerateGlEntriesForRows(normalizedRows, {
//         vatCode: nextVatCode,
//         atcCode,
//       });
//       return;
//     }

//     if (closeContext === "glVAT" && closeRowIndex !== null) {
//       await handleDetailChangeGL(closeRowIndex, "vatCode", {
//         ...selectedVatRow,
//         vatCode: nextVatCode,
//         vatName: nextVatName,
//         vatRate: nextVatRate,
//       });
//       return;
//     }

//     const updatedRows = (detailRowsRef.current || detailRows || []).map((row) =>
//       recalculateSODetailRow(
//         {
//           ...row,
//           vatCode: nextVatCode,
//           vatRate: nextVatRate,
//           vatAmount: "0.00",
//         },
//         "vatCode"
//       )
//     );

//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows, {
//       vatCode: nextVatCode,
//       atcCode,
//     });

//     updateState({
//       vatCode: nextVatCode,
//       vatName: nextVatName,
//       detailRows: normalizedRows,
//       showVatModal: false,
//       selectedRowIndex: null,
//       modalContext: "",
//     });

//     updateTotals(normalizedRows);
//     await regenerateGlEntriesForRows(normalizedRows, {
//       vatCode: nextVatCode,
//       atcCode,
//     });
//   } catch (error) {
//     console.error("Error applying selected VAT:", error);
//     useSwalErrorAlert(
//       "VAT Selection Error",
//       error?.message || "Unable to apply the selected VAT."
//     );
//   }
// };

// const handleCloseAccountModal = (selectedAccount) => {
//   if (selectedAccount && selectedRowIndex !== null) {
//     handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
//   }

//   updateState({
//     showAccountModal: false,
//     selectedRowIndex: null,
//     accountModalSource: null,
//   });
// };

// const handleCloseSlModalGL = (selectedSl) => {
//   if (selectedSl && selectedRowIndex !== null) {
//     handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
//   }

//   updateState({
//     showSlModal: false,
//     selectedRowIndex: null,
//   });
// };

// const handleCloseBranchModal = (selectedBranch) => {
//     if (selectedBranch) {
//       updateState({
//       branchCode: selectedBranch.branchCode,
//       branchName:selectedBranch.branchName
//       })
//     }
//     updateState({ branchModalOpen: false });
//   };

//   const handleCloseCurrencyModal = async (selectedCurrency) => {
//     if (selectedCurrency) {
//     handleSelectCurrency(selectedCurrency.currCode);
//   };
//     updateState({ currencyModalOpen: false });
//   }

//   const handleSelectCurrency = async (currCode) => {
//     if (currCode) {

//      const result = await useTopCurrencyRow(currCode);
//       if (result) {
//         const rate = currCode === glCurrDefault
//           ? defaultCurrRate
//           : await useTopForexRate(currCode, documentDate);
        
//         updateState({
//           currCode: result.currCode,
//           currName: result.currName,
//           currRate: formatNumber(parseFormattedNumber(rate),6)
//         });
//       }
//   }
// };

// const handleCloseSalesRepModal = (selectedSalesRep) => {
//   if (selectedSalesRep) {
//     updateState({
//       salesRepCode: selectedSalesRep.salesRepCode || "",
//       salesRepName: selectedSalesRep.salesRepName || "",
//       showSalesRepModal: false,
//       selectedRowIndex: null,
//       modalContext: "",
//     });
//     return;
//   }

//   updateState({
//     showSalesRepModal: false,
//     selectedRowIndex: null,
//     modalContext: "",
//   });
// };

// const handleCloseBillTermModal = async (selectedBillTerm) => {
//     if (selectedBillTerm) {
//     handleSelectBillTerm(selectedBillTerm.billtermCode);
//   };
//     updateState({ billtermModalOpen: false });
// }

// const handleOpenItemPickingModal = async (index) => {
//   const row = detailRowsRef.current?.[index];
//   const requestedQty = parseFormattedNumber(row?.siQuantity || 0) || 0;

//   if (!canUsePickingControls) return;

//   if (!documentID || !documentNo) {
//     useSwalErrorAlert("Item Picking", "Please save the SI first before opening the picking allocation.");
//     return;
//   }

//   if (!row?.itemCode) {
//     useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
//     return;
//   }

//   if (!row?.groupId) {
//     useSwalErrorAlert("Item Picking", "Please save and reload the SI first before opening the picking allocation.");
//     return;
//   }

//   if (requestedQty <= 0) {
//     useSwalErrorAlert("Item Picking", "SI Quantity must be greater than zero before opening the picking allocation.");
//     return;
//   }

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     const response = await postRequest("getFGUpdateStockAllocation", {
//       mode: "GetOpenStock",
//       params: JSON.stringify({
//         json_data: buildPickingBasePayload(row, index),
//       }),
//     });

//     const result = parseSprocJsonResult(response);
//     setItemPickingStockRows(Array.isArray(result?.stockRows) ? result.stockRows : []);
//     setItemPickingExistingAllocations(
//       Array.isArray(result?.existingAllocations) ? result.existingAllocations : []
//     );
//     setItemPickingRowIndex(index);
//     setShowItemPickingModal(true);
//   } catch (error) {
//     console.error("Failed to load FG picking allocation:", error);
//     useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };

// const handleCloseItemPickingModal = () => {
//   setShowItemPickingModal(false);
//   setItemPickingRowIndex(null);
//   setItemPickingStockRows([]);
//   setItemPickingExistingAllocations([]);
// };

// const handleConfirmItemPicking = async (payload) => {
//   if (itemPickingRowIndex === null || itemPickingRowIndex === undefined) return;
//   if (!canUsePickingControls) return;

//   const updatedRows = [...(detailRowsRef.current || [])];
//   const currentRow = updatedRows[itemPickingRowIndex];
//   if (!currentRow) return;

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     const basePayload = buildPickingBasePayload(currentRow, itemPickingRowIndex);
//     const pickedAllocations = Array.isArray(payload?.allocations) ? payload.allocations : [];

//     const response = await postRequest("getFGUpdateStockAllocation", {
//       mode: "SaveAlloc",
//       params: JSON.stringify({
//         json_data: {
//           ...basePayload,
//           dt1: pickedAllocations,
//         },
//       }),
//     });

//     const result = parseSprocJsonResult(response);
//     const totalPicked = getPickingResultNumber(
//       result,
//       currentRow,
//       itemPickingRowIndex,
//       ["totalAllocated"],
//       payload?.totalPicked ?? 0
//     );
//     const itemAmount = getPickingResultNumber(
//       result,
//       currentRow,
//       itemPickingRowIndex,
//       ["itemAmount"],
//       totalPicked <= 0
//         ? 0
//         : getPickingAllocationAmount(pickedAllocations) || currentRow?.itemAmount || 0
//     );
//     const siQuantityValue = parseFormattedNumber(currentRow?.siQuantity || 0) || 0;

//     updatedRows[itemPickingRowIndex] = {
//       ...currentRow,
//       siStat:
//         totalPicked <= 0
//           ? "F"
//           : siQuantityValue > 0 && totalPicked >= siQuantityValue
//             ? "P"
//             : "T",
//       quantityPicked: formatNumber(totalPicked, quantityDecimals),
//       itemAmount: itemAmount,
//       pickingAllocations: pickedAllocations,
//       pickingOrderedStockRows: payload?.orderedStockRows || [],
//     };

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//     await fetchTranData(documentNo, branchCode);
//     handleCloseItemPickingModal();
//   } catch (error) {
//     console.error("Failed to save FG picking allocation:", error);
//     useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };

// const handleBulkPickingAllocation = async (mode) => {
//   const isRelease = mode === "release";
//   const actionLabel = isRelease ? "Release All" : "Allocate All";
//   const rows = detailRowsRef.current || [];

//   if (!rows.length || !canUsePickingControls) return;

//   if (!documentID || !documentNo) {
//     useSwalErrorAlert("Item Picking", "Please save the SI first before using Allocate All or Release All.");
//     return;
//   }

//   const confirm = await useSwalProceedConfirm(
//     `${actionLabel}?`,
//     isRelease
//       ? "This will release all picking allocations for the SI details."
//       : "This will automatically pick available stock for all eligible SI details.",
//     "Yes"
//   );

//   if (!confirm?.isConfirmed) return;

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     const updatedRows = [...rows];

//     for (const [index, row] of rows.entries()) {
//       const requestedQty = parseFormattedNumber(row?.siQuantity || 0) || 0;
//       if (!row?.itemCode || !row?.groupId || requestedQty <= 0) continue;

//       const basePayload = buildPickingBasePayload(row, index);
//       let pickedAllocations = [];

//       if (!isRelease) {
//         const openStockResponse = await postRequest("getFGUpdateStockAllocation", {
//           mode: "GetOpenStock",
//           params: JSON.stringify({
//             json_data: basePayload,
//           }),
//         });

//         const openStockResult = parseSprocJsonResult(openStockResponse);
//         pickedAllocations = buildAutoPickingAllocations(openStockResult?.stockRows, requestedQty, row);
//       }

//       const saveResponse = await postRequest("getFGUpdateStockAllocation", {
//         mode: "SaveAlloc",
//         params: JSON.stringify({
//           json_data: {
//             ...basePayload,
//             dt1: pickedAllocations,
//           },
//         }),
//       });

//       const result = parseSprocJsonResult(saveResponse);
//       const totalPicked = getPickingResultNumber(result, row, index, ["totalAllocated"], 0);
//       const itemAmount = getPickingResultNumber(
//         result,
//         row,
//         index,
//         ["itemAmount"],
//         totalPicked <= 0 ? 0 : getPickingAllocationAmount(pickedAllocations) || row?.itemAmount || 0
//       );

//       updatedRows[index] = {
//         ...updatedRows[index],
//         siStat:
//           totalPicked <= 0
//             ? "F"
//             : requestedQty > 0 && totalPicked >= requestedQty
//               ? "P"
//               : "T",
//         quantityPicked: formatNumber(totalPicked, quantityDecimals),
//         itemAmount:itemAmount,
//         pickingAllocations: pickedAllocations,
//       };
//     }

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//     await fetchTranData(documentNo, branchCode);
//   } catch (error) {
//     console.error(`Failed to ${actionLabel.toLowerCase()} picking allocation:`, error);
//     useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };

// const handleCloseItemModal = async (selectedItems) => {
//   const records = normalizeItemModalRecords(selectedItems);
  
//   if (selectionContext === "rowItemLookup" && selectedRowIndex !== null && records.length > 0) {
//     const [selectedItem] = getFilteredDuplicateFreeItems(records, selectedRowIndex);
//     if (!selectedItem) {
//       updateState({
//         showItemModal: false,
//         selectedRowIndex: null,
//         insertAfterIndex: null,
//         selectionContext: "",
//       });
//       return;
//     }
//     const priceMatrixRows = await fetchPriceMatrixRows([selectedItem]);
//     const updatedRows = [...detailRows];
//     const baseRow = {
//       ...updatedRows[selectedRowIndex],
//       itemCode: selectedItem?.itemCode || "",
//       itemName: selectedItem?.itemName || "",
//       itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
//       uomCode: selectedItem?.uomCode || "",
//       pmType: selectedItem?.pmType || updatedRows[selectedRowIndex]?.pmType || "",
//       groupId: updatedRows[selectedRowIndex]?.groupId || "",
//       pmId: selectedItem?.pmId || updatedRows[selectedRowIndex]?.pmId || "",
//     };
//     const priceRow = getPriceMatrixRowForItem(priceMatrixRows, selectedItem);
//     updatedRows[selectedRowIndex] = applyPriceMatrixToDetailRow(baseRow, priceRow);
//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
//     updateState({ detailRows: normalizedRows });
//     updateTotals(normalizedRows);
//   }

//   if (selectionContext === "multiAdd" && records.length > 0) {
//     const filteredRecords = getFilteredDuplicateFreeItems(records);
//     if (filteredRecords.length > 0) {
//       await handleInsertSelectedItems(filteredRecords);
//     }
//   }

//   updateState({
//     showItemModal: false,
//     selectedRowIndex: null,
//     insertAfterIndex: null,
//     selectionContext: "",
//   });
// };

// const handleSelectBillTerm = async (billtermCode) => {
//     if (billtermCode) {

//      const result = await useTopBillTermRow(billtermCode);
//       if (result) {
//       updateState({
//         billtermCode:result.billtermCode,
//         billtermName:result.billtermName,
//         daysDue: result.daysDue,
//         dueDate: calculateDueDate(documentDate, result.daysDue),
//         })
//       }
//     }
//   };

// const validateSIQuantity = (index, inputValue) => {
//   const row = detailRowsRef.current[index];
//   const drQty = parseFormattedNumber(row?.drQuantity || 0) || 0;
//   const siQty = parseFormattedNumber(inputValue || 0) || 0;
//   const rowStatus = String(row?.siStat || "").toUpperCase();

//   if (drQty > 0 && rowStatus === "F" && siQty < drQty) {
//     const originalValue = row?.siQuantity ?? formatNumber(0, quantityDecimals);

//     useSwalErrorAlert("Invalid Quantity", "SI Quantity must be greater than or equal to DR Quantity.");
    
//     const updatedRows = [...detailRowsRef.current];
//     updatedRows[index] = {
//       ...updatedRows[index],
//       siQuantity: originalValue,
//     };

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);

//     return false;
//   }

//   delete originalSOQuantityRef.current[index];
//   return true;
// };


// const recalculateSODetailRow = (row = {}, changedField = "") => {
//   const discountRateFields = [
//     "discRate1",
//     "discRate2",
//     "discRate3",
//     "discRate4",
//     "discRate5",
//     "discRate6",
//     "discRate7",
//     "discRate8",
//   ];
//   const discountAmountFields = [
//     "discAmount1",
//     "discAmount2",
//     "discAmount3",
//     "discAmount4",
//     "discAmount5",
//     "discAmount6",
//     "discAmount7",
//     "discAmount8",
//   ];

//   const quantity = parseFormattedNumber(row.siQuantity || 0) || 0;
//   const unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;
//   const grossAmount = toFormattedAmountNumber(quantity * unitPrice);

//   let runningBase = grossAmount;
//   let totalDiscount = 0;
//   const updatedDiscountAmounts = {};
//   const updatedDiscountRates = {};

//   if (discountAmountFields.includes(changedField)) {
//     discountAmountFields.forEach((amountField, index) => {
//       const discountNo = index + 1;
//       const rateField = `discRate${discountNo}`;
//       const discountAmount = toFormattedAmountNumber(
//         parseFormattedNumber(row[amountField] || 0)
//       );
//       const discountRate =
//         runningBase !== 0
//           ? toFormattedAmountNumber((discountAmount / runningBase) * 100)
//           : 0;

//       updatedDiscountAmounts[amountField] =
//         amountField === changedField ? row[amountField] : formatNumber(discountAmount);
//       updatedDiscountRates[rateField] = formatNumber(discountRate);

//       totalDiscount += discountAmount;
//       runningBase = toFormattedAmountNumber(runningBase - discountAmount);
//     });
//   } else {
//     discountRateFields.forEach((rateField, index) => {
//       const discountNo = index + 1;
//       const amountField = `discAmount${discountNo}`;
//       const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
//       const discountAmount = toFormattedAmountNumber(runningBase * (rateValue * 0.01));

//       updatedDiscountRates[rateField] =
//         rateField === changedField ? row[rateField] : formatNumber(rateValue);
//       updatedDiscountAmounts[amountField] = formatNumber(discountAmount);

//       totalDiscount += discountAmount;
//       runningBase = toFormattedAmountNumber(runningBase - discountAmount);
//     });
//   }

//   const netAmount = toFormattedAmountNumber(grossAmount - totalDiscount);
//   const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;

  
//   return {
//     ...row,
//     grossAmount: formatNumber(grossAmount),
//     vatAmount: formatNumber(vatAmount),
//     salesAmount: formatNumber(netAmount - vatAmount),
//     // ATC is header-level only, not per detail row.
//     atcAmount: formatNumber(0),
//     amountDue: formatNumber(0),
//     ...updatedDiscountRates,
//     ...updatedDiscountAmounts,
//     totDiscount: formatNumber(totalDiscount),
//     netAmount: formatNumber(netAmount),
//   };
// };

// const handleSODetailRowChange = (index, field, value) => {
//   const discountRateFields = [
//     "discRate1",
//     "discRate2",
//     "discRate3",
//     "discRate4",
//     "discRate5",
//     "discRate6",
//     "discRate7",
//     "discRate8",
//   ];
//   const discountAmountFields = [
//     "discAmount1",
//     "discAmount2",
//     "discAmount3",
//     "discAmount4",
//     "discAmount5",
//     "discAmount6",
//     "discAmount7",
//     "discAmount8",
//   ];
//   const calculationTriggerFields = [
//     "siQuantity",
//     "unitPrice",
//     ...discountRateFields,
//     ...discountAmountFields,
//   ];

//   const zeroValueByField = (targetField) => {
//     if (targetField === "unitPrice") {
//       return formatNumber(0, sellingPriceDecimals);
//     }

//     return formatNumber(0);
//   };

//   const buildFreeItemRow = (row, isFree) => {
//     if (!isFree) {
//       return {
//         ...row,
//         freeItem: "",
//       };
//     }

//     const zeroedRow = {
//       ...row,
//       freeItem: "Y",
//       unitPrice: formatNumber(0, sellingPriceDecimals),
//       grossAmount: formatNumber(0),
//       vatAmount: formatNumber(0),
//       salesAmount: formatNumber(0),
//       atcAmount: formatNumber(0),
//       amountDue: formatNumber(0),
//       totDiscount: formatNumber(0),
//       netAmount: formatNumber(0),
//     };

//     discountRateFields.forEach((discountField) => {
//       zeroedRow[discountField] = formatNumber(0);
//     });

//     discountAmountFields.forEach((discountField) => {
//       zeroedRow[discountField] = formatNumber(0);
//     });

//     return zeroedRow;
//   };

//   const updatedRows = [...(detailRowsRef.current || [])];
//   let updatedRow = {
//     ...updatedRows[index],
//     [field]: value,
//   };

//   if (field === "documentDate" && value && isDateEarlierThanSiDate(value)) {
//     clearHeaderAndDetailDates({ showAlert: true });
//     return;
//   }
//   if (field === "siDate" && value && isDateEarlierThanSiDate(value)) {
//     clearHeaderAndDetailDates({ showAlert: true });
//   }

//   if (field === "freeItem") {
//     updatedRow = buildFreeItemRow(updatedRow, value === "Y");
//     updatedRows[index] = updatedRow;
//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
//     updateState({ detailRows: normalizedRows });
//     updateTotals(normalizedRows);
//     return;
//   }

//   if (
//     updatedRows[index]?.freeItem === "Y" &&
//     ["unitPrice", ...discountRateFields, ...discountAmountFields].includes(field)
//   ) {
//     updatedRow = {
//       ...updatedRows[index],
//       [field]: zeroValueByField(field),
//     };
//     updatedRows[index] = buildFreeItemRow(updatedRow, true);
//     const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
//     updateState({ detailRows: normalizedRows });
//     updateTotals(normalizedRows);
//     return;
//   }

//   if (calculationTriggerFields.includes(field)) {
//     updatedRow = recalculateSODetailRow(updatedRow, field);
//   }


//   updatedRows[index] = updatedRow;
//   const normalizedRows = calculationTriggerFields.includes(field)
//     ? distributeVatAcrossDetailRows(updatedRows)
//     : updatedRows;


//   updateState({ detailRows: normalizedRows });
//   updateTotals(normalizedRows);
// };

// const handleSIDetailRowChange = handleSODetailRowChange;

// const enterNextRowZeroClearFields = [
//   "siQuantity",
//   "unitPrice",
//   "discRate1",
//   "discRate2",
//   "discRate3",
//   "discRate4",
//   "discRate5",
//   "discRate6",
//   "discRate7",
//   "discRate8",
//   "discAmount1",
//   "discAmount2",
//   "discAmount3",
//   "discAmount4",
//   "discAmount5",
//   "discAmount6",
//   "discAmount7",
//   "discAmount8",
// ];

// const renderSIDetailCell = (columnKey, row, index) => {
//   const columnWidth = getDetailColumnFallbackWidth(columnKey);
//   const style = getDetailCellStyle(columnKey, columnWidth);
//   const isRowWithDR = Boolean(String(row.drNo || "").trim());
//   const quantityPickedValue = parseFormattedNumber(row.quantityPicked || 0) || 0;
//   const canEditPickingStatus = isRowWithDR && quantityPickedValue === 0;
//   const canSearchItem = !isRowWithDR; // Can't change item if it's from a DR
  
//   // Removed salesRepCode from detailModalHandlers
//   // Added ATC lookup for detail rows if needed, but not explicitly requested for details.
//   // For now, only itemCode lookup is kept.
  
//   // Moves focus to the same editable column in the next visible row.
//   const focusNextDetailCell = (field) => {
//     focusNextSoDetailRowInput(index, field, {
//       rows: detailRows,
//       zeroClearFields: enterNextRowZeroClearFields,
//       parseValue: parseFormattedNumber,
//       onClearNextValue: (nextIndex, nextField, value) =>
//         handleSIDetailRowChange(nextIndex, nextField, value),
//     });
//   };

//   // Shared text input for editable detail columns.
//   const textInput = (field, options = {}) => (
//     <input
//       type="text"
//       id={`${field}-${index}`}
//       className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
//       value={row[field] || ""}
//       readOnly={options.readOnly ?? isFormDisabled}
//       onChange={(e) => handleSODetailRowChange(index, field, e.target.value)}
//       onKeyDown={(e) => {
//         if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
//         e.preventDefault();
//         focusNextDetailCell(field);
//       }}
//     />
//   );

//   // Shared read-only lookup input; the icon beside it opens the related modal.
//   const lookupInput = (field, options = {}) => (
//     <input
//       type="text"
//       id={`${field}-${index}`}
//       className={`w-full pr-6 global-tran-td-inputclass-ui text-center cursor-pointer ${options.className || ""}`.trim()}
//       value={row[field] || ""}
//       readOnly
//       onKeyDown={(e) => {
//         if (e.key !== "Enter" || isFormDisabled) return;
//         e.preventDefault();
//         focusNextDetailCell(field);
//       }}
//     />
//   );

//   const numericInput = (field, options = {}) => (
//   <input
//     type="text"
//     id={`${field}-${index}`}
//     className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
//     value={row[field] || ""}
//     readOnly={options.readOnly ?? isFormDisabled}
//     onChange={(e) => {
//       if (options.readOnly || options.blocked?.()) return;
//       const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
//       const regex = options.regex || /^\d*\.?\d{0,2}$/;
//       if (regex.test(sanitizedValue) || sanitizedValue === "") {
//         handleSIDetailRowChange(index, field, sanitizedValue);
//       }
//     }}
//       onFocus={(e) => {
//       options.onFocus?.(e);
//       clearSoDetailZeroOnFocus(e, {
//         isEditable: !(options.readOnly ?? isFormDisabled) && !options.blocked?.(),
//         onClear: (value) => handleSODetailRowChange(index, field, value),
//       });
//     }}
//     onBlur={(e) => {
//       if (options.readOnly || options.blocked?.()) return;
//       if (typeof options.onBlur === "function" && options.onBlur(e) === false) return;

//       const num = parseFormattedNumber(e.target.value);
//       handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
//     }}
//     onKeyDown={(e) => {
//       if (e.key !== "Enter" || options.readOnly || options.blocked?.()) return;
//       e.preventDefault();

//       if (typeof options.onKeyDown === "function" && options.onKeyDown(e) === false) return;

//       const num = parseFormattedNumber(e.target.value);
//       handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
//       focusNextDetailCell(field);
//     }}
//   />
// );

//   // Read-only amount display used by calculated amount columns.
//   const readonlyAmountInput = (field) => (
//     <input
//       type="text"
//       className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
//       value={row[field] || ""}
//       readOnly={true} // Always read-only for calculated fields
//       // onChange={(e) => handleSODetailRowChange(index, field, e.target.value)} // No onChange for read-only
//     />
//   );

//   const detailColumnRenderers = {
//     ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
//     siStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`siStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.siStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleSIDetailRowChange(index, "siStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("siStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
//     drNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
//     itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
//     itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
//     itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
//     uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.pmType || ""} readOnly /><input type="hidden" value={row.groupId || ""} readOnly /><input type="hidden" value={row.pmId || ""} readOnly /></td>,
//     siQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: isFormDisabled || isRowWithDR, onBlur: (e) => validateSIQuantity(index, e.target.value), onKeyDown: (e) => validateSIQuantity(index, e.target.value) })}</td>,
//     quantityPicked: () => (
//       <td key={columnKey} className="global-tran-td-ui" style={style}>
//         <div className="flex items-center gap-1">
//           <div className="min-w-0 flex-1">
//             {numericInput(columnKey, {
//               decimals: quantityDecimals,
//               regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`),
//               readOnly: true,
//             })}
//           </div>
//           {canUsePickingControls && (
//             <button
//               type="button"
//               title="Open Item Picking / Allocation"
//               aria-label="Open Item Picking / Allocation"
//               className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
//               disabled={!row?.itemCode || (parseFormattedNumber(row?.siQuantity || 0) || 0) <= 0}
//               onClick={() => handleOpenItemPickingModal(index)}
//             >
//               <FontAwesomeIcon icon={faClipboardCheck} />
//             </button>
//           )}
//         </div>
//       </td>
//     ),
//     itemAmount: () => (
//       <td key={columnKey} className="global-tran-td-ui" style={style}>
//         <input
//           type="text"
//           value={formatNumber(row.itemAmount || 0)}
//           readOnly
//           className="w-full global-tran-td-inputclass-ui text-right"
//         />
//       </td>
//     ),
//     unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: sellingPriceDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`), blocked: () => !isSellingPriceAndDiscountEditable || normalizedSiTranType === "SI03" || row.freeItem === "Y", readOnly: isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y" })}</td>,
//     grossAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
//     vatCode: () => (
//       <td key={columnKey} className="global-tran-td-ui" style={style}>
//         <div className="relative w-full">
//           {lookupInput(columnKey, { className: "text-center" })}
//           {!isFormDisabled && (
//             <FontAwesomeIcon
//               icon={faMagnifyingGlass}
//               className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
//               onClick={() => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "detailVAT" })}
//             />
//           )}
//         </div>
//       </td>
//     ),
//     vatRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
//     vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
//     salesAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
//     atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
//     totDiscount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
//     netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
//     amountDue: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
//     freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled || isRowWithDR ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled || isRowWithDR} onClick={() => handleSIDetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>,
//     drQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>, // Read-only as it comes from DR
//     linkedSiQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>, // Read-only as it comes from linked SI
//   };

//   if (visibleDiscountRateFields.includes(columnKey) || visibleDiscountAmountFields.includes(columnKey)) {
//     detailColumnRenderers[columnKey] = () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { blocked: () => !isSellingPriceAndDiscountEditable || row.freeItem === "Y", readOnly: isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y" })}</td>;
//   }

//   return detailColumnRenderers[columnKey]?.() ?? null;
// };

// const renderSiGlCell = (columnKey, row, index) => {
//   const columnWidth = getSiGlFallbackWidth(columnKey);
//   const style = getSiGlCellStyle(columnKey, columnWidth);
//   const glModalHandlers = {
//     acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
//     rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, modalContext: "glRC" }),
//     slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
//     vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "glVAT" }),
//     atcCode: () => updateState({ selectedRowIndex: index, showATCModal: true, modalContext: "glATC" }),
//   };

//   const focusNextGlCell = (field) => {
//     focusNextSiGlRowInput(index, field, {
//       rows: detailRowsGL,
//       zeroClearFields: siGlEnterNextRowZeroClearFields,
//       parseValue: parseFormattedNumber,
//       onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
//     });
//   };

//   const glTextInput = (field, options = {}) => (
//     <input
//       type="text"
//       id={`${field}-${index}`}
//       className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
//       value={row[field] || ""}
//       readOnly={options.readOnly ?? isFormDisabled}
//       maxLength={options.maxLength}
//       onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
//       onKeyDown={(e) => {
//         if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
//         e.preventDefault();
//         focusNextGlCell(field);
//       }}
//     />
//   );

//   const glLookupInput = (field, options = {}) => (
//     <input
//       type="text"
//       id={`${field}-${index}`}
//       className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
//       value={row[field] || ""}
//       readOnly={options.readOnly}
//       onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
//       onKeyDown={(e) => {
//         if (e.key !== "Enter" || isFormDisabled) return;
//         e.preventDefault();
//         focusNextGlCell(field);
//       }}
//     />
//   );

//   const glAmountInput = (field) => (
//     <input
//       type="text"
//       id={`${field}-${index}`}
//       className="w-full global-tran-td-inputclass-ui text-right"
//       value={row[field] || ""}
//       readOnly={isFormDisabled}
//       onChange={(e) => {
//         const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
//         if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
//           handleDetailChangeGL(index, field, sanitizedValue);
//         }
//       }}
//       onKeyDown={(e) => {
//         if (e.key !== "Enter") return;
//         e.preventDefault();
//         handleBlurGL(index, field, e.target.value, true);
//         focusNextSiGlRowInput(index, field, {
//           rows: detailRowsGL,
//           zeroClearFields: siGlEnterNextRowZeroClearFields,
//           parseValue: parseFormattedNumber,
//           onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
//         });
//       }}
//       onFocus={(e) => clearSiGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
//       onBlur={(e) => {
//         if (isFormDisabled) return;
//         handleBlurGL(index, field, e.target.value);
//       }}
//     />
//   );

//   const glColumnRenderers = {
//     ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
//     acctCode: () => { const showLookupIcon = !isFormDisabled; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: false })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
//     rcCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
//     slCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
//     vatCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
//     atcCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
//     sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
//     slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
//     remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
//     particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
//     atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
//     vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
//     debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
//     slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`slRefDate${index}`] !== undefined) handleDetailChangeGL(index, "slRefDate", updates[`slRefDate${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
//   };

//   return glColumnRenderers[columnKey]?.() ?? null;
// };

// const selectedPickingRow = itemPickingRowIndex !== null && itemPickingRowIndex !== undefined
//   ? detailRows?.[itemPickingRowIndex]
//   : null;

// return (
// <>
// <div className="global-tran-main-div-ui">

//       {showSpinner && <LoadingSpinner />}

//       <div className="global-tran-headerToolbar-ui">
//       <Header
//         docType={docType}
//         pdfLink={pdfLink}
//         videoLink={videoLink}
//         onPrint={handlePrint}
//         printData={printData}
//         onReset={handleReset}
//         onSave={() => handleActivityOption("Upsert")}
//         onCancel={handleCancel}
//         onCopy={handleCopy}
//         onAttach={handleAttach}

//         activeTopTab={topTab}
//         showActions={topTab === "details"}
//         showBIRForm={false}
//         isViewDocument={isViewDocument}
//         onDetails={() => setTopTab("details")}
//         onHistory={() => setTopTab("history")}
//         disableRouteNavigation={true}

//         detailsRoute="/page/DR"

//         isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
//         isResetDisabled={state.isResetDisabled}
//         isAttachDisabled={!documentID}
//         isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
//         isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
//         isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED" }
//       />
//       </div>

//       <div
//         className={topTab === "details" ? "" : "hidden"}
//         style={{ display: topTab === "details" ? undefined : "none" }}
//       >

//       {/* Page title and subheading */}
//       <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
//         <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
//           <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
//         </div>
//         <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
//           <div>
//             <p className="global-tran-headerstat-text-ui">Transaction Status</p>
//             <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
//           </div>
//         </div>
//       </div>

//       {/* Form Layout with Tabs */}
//       <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
//         {/* Tab Navigation */}
//         <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
//           <button
//             className={`global-tran-tab-padding-ui ${
//               activeTab === "basic"
//                 ? "global-tran-tab-text_active-ui"
//                 : "global-tran-tab-text_inactive-ui"
//             }`}
//             onClick={() => updateState({ activeTab: "basic" })}
//           >
//             Basic Information
//           </button>
//           {/* Provision for Other Tabs */}
//         </div>

//         {/* SI Header Form Section - Main Grid Container */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="so_hd">

//           <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="branchName"
//               label="Branch"
//               type="lookup"
//               value={branchName || ""}
//               disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
//               onLookup={() => updateState({ branchModalOpen: true })}
//             />

//             <FieldRenderer
//               id="siNo"
//               label="SI No."
//               type="lookup"
//               value={state.documentNo || documentNo || ""}
//               disabled={state.isDocNoDisabled}
//               onChange={(val) => updateState({ documentNo: val })}
//               onBlur={handlesiNoBlur}
//               onLookup={() => updateState({ showAllTranDocNo: true })}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") {
//                   e.preventDefault();
//                   handlesoNoBlur();
//                   document.getElementById("documentDate")?.focus();
//                 }
//               }}
//             />

//             <div className="relative w-full">
//               <div
//                 className={`flex items-stretch global-ref-textbox-ui ${
//                   !isFormDisabled
//                     ? "global-ref-textbox-enabled"
//                     : "global-ref-textbox-disabled"
//                 }`}
//               >
//                 <DateFormatInput
//                   id="documentDate"
//                   className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                   value={documentDate}
//                   disabled={isFormDisabled}
//                   updateState={updateState}
//                 />
//               </div>
//               <label
//                 htmlFor="documentDate"
//                 className={`global-ref-floating-label ${
//                   !isFormDisabled
//                     ? "global-ref-label-enabled"
//                     : "global-ref-label-disabled"
//                 }`}
//               >
//                 SI Date
//               </label>
//             </div>

//             <FieldRenderer
//               id="billToCustCode"
//               label="Bill To Customer Code"
//               required
//               type="lookup"
//               value={billToCustCode || ""}
//               disabled={isFormDisabled || hasDRLinkedDetailRows}
//               readOnly
//               lookupDisabled={isFetchDisabled || hasDRLinkedDetailRows}
//               onLookup={() => updateState({ custModalOpen: true, modalContext: "OpenDR" })}
//             />

//             <FieldRenderer
//               id="billToCustName"
//               label="Bill To Customer Name"
//               required
//               type="text"
//               value={billToCustName || ""}
//               disabled
//               readOnly
//             />
//           </div>

//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="siTranType"
//               label="SI Type"
//               type="select"
//               value={siTranType || ""}
//               disabled={isFormDisabled || hasSiDetailRows}
//               onChange={(val) => updateState({ siTranType: val })}
//               options={(siTranTypeOptions || []).map((t) => ({
//                 label: t.DROPDOWN_NAME,
//                 value: t.DROPDOWN_CODE,
//               }))}
//             />

//             <FieldRenderer
//               id="atcName"
//               label="ATC (Goods)"
//               required
//               type="lookup"
//               value={atcName || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={isFormDisabled}
//               onLookup={() => updateState({ showATCModal: true })}
//             />

//             <FieldRenderer
//               id="vatName"
//               label="VAT (Goods)"
//               required
//               type="lookup"
//               value={vatName || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={isFormDisabled}
//               onLookup={() => updateState({ showVatModal: true, selectedRowIndex: null, modalContext: "headerVAT" })}
//             />

//             <FieldRenderer
//               id="billtermName"
//               label="Billing Term"
//               required
//               type="lookup"
//               value={billtermName || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={isFormDisabled}
//               onLookup={() => updateState({ billtermModalOpen: true })}
//             />

           
//               <div className="relative w-full">
//               <div
//                 className={`flex items-stretch global-ref-textbox-ui ${
//                   !isFormDisabled
//                     ? "global-ref-textbox-enabled"
//                     : "global-ref-textbox-disabled"
//                 }`}
//               >
//                 <DateFormatInput
//                   id="dueDate"
//                   className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                   value={dueDate}
//                   disabled
//                   updateState={updateState}
//                 />
//               </div>
//               <label htmlFor="dueDate" className="global-ref-floating-label">
//                 Due Date
//               </label>
//             </div>


//           </div>

//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="salesRepName"
//               label="Sales Rep"
//               required
//               type="lookup"
//               value={salesRepName || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={isFormDisabled}
//               onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
//             />

//             <FieldRenderer
//               id="customerPoNo"
//               label="Customer PO No."
//               type="text"
//               value={customerPoNo || ""}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ customerPoNo: val })}
//               maxLength={useGetFieldLength(tblFieldArray, "cust_po_no")}
//             />

//             <div className="relative w-full">
//               <div
//                 className={`flex items-stretch global-ref-textbox-ui ${
//                   !isFormDisabled
//                     ? "global-ref-textbox-enabled"
//                     : "global-ref-textbox-disabled"
//                 }`}
//               >
//                 <DateFormatInput
//                   id="customerPoDate"
//                   className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                   value={customerPoDate}
//                   disabled={isFormDisabled}
//                   updateState={updateState}
//                 />
//               </div>
//               <label htmlFor="customerPoDate" className="global-ref-floating-label">
//                 Customer PO Date
//               </label>
//             </div>

//             <FieldRenderer
//               id="refSiNo1"
//               label="Ref SI No. 1"
//               type="text"
//               value={refSiNo1 || ""}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ refSiNo1: val })}
//               maxLength={useGetFieldLength(tblFieldArray, "refsi_no1")}
//             />

//             <FieldRenderer
//               id="refSiNo2"
//               label="Ref SI No. 2"
//               type="text"
//               value={refSiNo2 || ""}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ refSiNo2: val })}
//               maxLength={useGetFieldLength(tblFieldArray, "refsi_no2")}
//             />
//           </div>

//           <div className="col-span-full">
//             <div className="relative p-2">
//               <textarea
//                 id="remarks"
//                 placeholder=""
//                 rows={6}
//                 className="peer global-tran-textbox-remarks-ui pt-2"
//                 value={remarks}
//                 onChange={(e) => updateState({ remarks: e.target.value })}
//                 disabled={isFormDisabled}
//                 maxLength={useGetFieldLength(tblFieldArray, "remarks")}
//               />
//               <label
//                 htmlFor="remarks"
//                 className="global-tran-floating-label-remarks"
//               >
//                 Remarks
//               </label>
//             </div>
//           </div>
//           </div>

//           <div className="global-tran-textbox-group-div-ui">
//             <div className="flex gap-4">
//               <input type="hidden" id="currCode" value={currCode || ""} readOnly />

//               <div className="flex-grow w-2/3">
//                 <FieldRenderer
//                   id="currName"
//                   label="Currency"
//                   value={
//                     currCode
//                       ? `${currCode}${currName ? ` - ${currName}` : ""}`
//                       : ""
//                   }
//                   disabled
//                   readOnly
//                   type="text"
//                 />
//               </div>

//               <div className="flex-grow">
//                 <FieldRenderer
//                   id="currRate"
//                   label="Currency Rate"
//                   type="amount"
//                   value={currRate || ""}
//                   disabled={isFormDisabled || glCurrDefault === currCode}
//                   onChange={(val) => {
//                     const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
//                     if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
//                       updateState({ currRate: sanitizedValue });
//                     }
//                   }}
//                   onBlur={handleCurrRateNoBlur}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       e.preventDefault();
//                       document.getElementById("refDocNo1")?.focus();
//                     }
//                   }}
//                   onFocus={(e) => {
//                     if (!isFormDisabled && parseFormattedNumber(e.target.value) === 0) {
//                       updateState({ currRate: "" });
//                     }
//                   }}
//                 />
//               </div>
//             </div>

//             <FieldRenderer
//               id="totalGrossAmount"
//               label="Gross Amount"
//               type="amount"
//               value={totals.totalGrossAmount || ""}
//               disabled
//             />

//             <FieldRenderer
//               id="totalDiscountAmount"
//               label="Discount Amount"
//               type="amount"
//               value={totals.totalDiscountAmount || ""}
//               disabled
//               readOnly
//             />

//             <FieldRenderer
//               id="totalNetAmount"
//               label="Net Amount"
//               type="amount"
//               value={totals.totalNetAmount || ""}
//               disabled
//               readOnly
//             />

//             <FieldRenderer
//               id="totalVatAmount"
//               label="VAT Amount"
//               type="amount"
//               value={totals.totalVatAmount || ""}
//               disabled
//               readOnly
//             />

//             <FieldRenderer
//               id="totalSalesAmount"
//               label="Sales Amount"
//               type="amount"
//               value={totals.totalSalesAmount || ""}
//               disabled
//               readOnly
//             />

//             <FieldRenderer
//               id="totalAtcAmount"
//               label="ATC Amount"
//               type="amount"
//               value={totals.totalAtcAmount || ""}
//               disabled
//               readOnly
//             />

//             <FieldRenderer
//               id="totalAmountDue"
//               label="Amount Due"
//               type="amount"
//               value={totals.totalAmountDue || ""}
//               disabled
//               readOnly
//             />
//           </div>
//         </div>

//     </div>
//     </div>

//           {/* APV Detail Section */}
//           <div id="apv_dtl" className="global-tran-tab-div-ui">

//           {/* Tab Navigation */}
//           <div className="global-tran-tab-nav-ui">

//           {/* Tabs */}
//           <div className="flex flex-row sm:flex-row">
//             <button
//               className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
//             > {/* This is correct */}
//               SI Details
//             </button>
//           </div>
//         </div>

//       {/* Invoice Details Button */}

//       <div className="global-tran-table-main-div-ui">
//       <div className="global-tran-table-main-sub-div-ui">
//         <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
//           <thead className="global-tran-thead-div-ui">
//             <tr>
//               {orderedDetailColumns.map((column) =>
//                 renderSiDetailHeader(column.label, column.key, column.width, {
//                   orderedColumns: orderedDetailColumns,
//                 })
//               )}

//                 {!isFormDisabled && (
//                   <th
//                     className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
//                     style={transactionActionsHeaderStyle}
//                   >
//                     Actions
//                   </th>
//                 )}

//             </tr>
//           </thead>

//           <tbody className="relative">{sortedDetailRows.map(({ row, originalIndex }) => {
//             const pickedQty = parseFormattedNumber(row.quantityPicked || 0) || 0;
//             return (
//               <tr key={originalIndex} className="global-tran-tr-ui">
//                 {orderedDetailColumns.map((column) =>
//                   renderSIDetailCell(column.key, row, originalIndex)
//                 )}

//                 {!isFormDisabled && (
//                   <td
//                     className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
//                     style={transactionActionsCellStyle}
//                   >
//                     <div className="flex items-center justify-center gap-1">
//                       {!isDirectSiType && (
//                         <button
//                           type="button"
//                           className="global-tran-td-button-add-ui"
//                           onClick={() => handleInsertBlankRow(originalIndex)}
//                         >
//                           <FontAwesomeIcon icon={faPlus} />
//                         </button>
//                       )}

//                       <button
//                         type="button"
//                         className="global-tran-td-button-delete-ui"
//                         onClick={() => handleDeleteRow(originalIndex)}
//                         title={
//                           isPickingSiType && pickedQty > 0
//                             ? "Delete row and release picking allocation"
//                             : "Delete row"
//                         }
//                       >
//                         <FontAwesomeIcon icon={faTrashAlt} />
//                       </button>
//                     </div>
//                   </td>
//                 )}
//               </tr>
//             );
//           })}
//           </tbody>

//         </table>
//         {renderSoDetailHeaderContextMenu()}
//       </div>
//       </div>

//     {topTab === "details" && (
//     <>
//     {/* Invoice Details Footer */}
//     <div className="global-tran-tab-footer-main-div-ui relative">

//     {/* Add Button */}
//     <div className="global-tran-tab-footer-button-div-ui">
//       <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
//         {showAddTypeDropdown && (
//           <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
//             <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
//               <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
//                 Add SI Detail
//               </div>
//             </div>

//             <div className="p-2">
//               <button
//                 type="button"
//                 className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isAddItemDisabledBySiType ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"}`}
//                 disabled={isAddItemDisabledBySiType}
//                 onClick={() => {
//                   if (isAddItemDisabledBySiType) return;
//                   setShowAddTypeDropdown(false);
//                   handleOpenAddItemModal();
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
//                     <FontAwesomeIcon icon={faPlus} />
//                   </span>
//                   <div className="flex flex-col items-start">
//                     <span>Add Item</span>
//                     <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
//                       Select item from item master
//                     </span>
//                   </div>
//                 </div>
//               </button>

//               <button
//                 type="button"
//                 className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isOpenDRDisabledBySiType ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500" : "text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"}`}
//                 disabled={isOpenDRDisabledBySiType}
//                 onClick={() => {
//                   if (isOpenDRDisabledBySiType) return;
//                   setShowAddTypeDropdown(false);
//                   handleOpenDRLookup();
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
//                     <FontAwesomeIcon icon={faClipboardCheck} />
//                   </span>
//                   <div className="flex flex-col items-start">
//                     <span>Open DR</span>
//                     <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
//                       Lookup open DR items
//                     </span>
//                   </div>
//                 </div>
//               </button>
//             </div>
//           </div>
//         )}

//         <button
//           onClick={handleAddRowClick}
//           className="global-tran-tab-footer-button-add-ui"
//         >
//           <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
//         </button>
//       </div>
//       {canUsePickingControls && (detailRows?.length || 0) > 0 && (
//       <div className="ml-6 flex items-center gap-2">
//         <button
//           type="button"
//           className="min-h-[36px] w-[132px] rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
//           disabled={isLoading}
//           onClick={() => handleBulkPickingAllocation("allocate")}
//         >
//           <FontAwesomeIcon icon={faClipboardCheck} className="mr-2" />
//           Allocate All
//         </button>

//         <button
//           type="button"
//           className="min-h-[36px] w-[132px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
//           disabled={isLoading || !hasPickedQuantity}
//           onClick={() => handleBulkPickingAllocation("release")}
//         >
//           <FontAwesomeIcon icon={faMinus} className="mr-2" />
//           Release All
//         </button>
//       </div>
//     )}
//     </div>

      
//     </div>
//     </>
//     )}

//     </div>

//     {/* General Ledger Section */}
//     <div
//       className={topTab === "details" ? "global-tran-tab-div-ui" : "hidden"}
//       style={{ display: topTab === "details" ? undefined : "none" }}
//     >
//       <div className="global-tran-tab-nav-ui">
//         <div className="flex flex-row sm:flex-row">
//           <button
//             className={`global-tran-tab-padding-ui ${
//               GLactiveTab === "invoice"
//                 ? "global-tran-tab-text_active-ui"
//                 : "global-tran-tab-text_inactive-ui"
//             }`}
//             onClick={() => setGLActiveTab("invoice")}
//           >
//             General Ledger
//           </button>
//         </div>

//         <div className="flex justify-end">
//           <button
//             onClick={() => handleActivityOption("GenerateGL")}
//             className="global-tran-button-generateGL"
//             disabled={isLoading}
//             style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
//           >
//             {isLoading ? "Generating..." : "Generate GL Entries"}
//           </button>
//         </div>
//       </div>

//       <div className="global-tran-table-main-div-ui">
//         <div className="global-tran-table-main-sub-div-ui">
//           <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
//             <thead className="global-tran-thead-div-ui">
//               <tr>
//                 {orderedSiGlColumns.map((column) =>
//                   renderSiGlHeader(column.label, column.key, column.width, {
//                     orderedColumns: orderedSiGlColumns,
//                   })
//                 )}
//                 {!isFormDisabled && (
//                   <th
//                     className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
//                     style={transactionActionsHeaderStyle}
//                   >
//                     Actions
//                   </th>
//                 )}
//               </tr>
//             </thead>
//             <tbody className="relative">
//               {sortedSiGlRows.map(({ row, originalIndex }) => (
//                 <tr key={originalIndex} className="global-tran-tr-ui">
//                   {orderedSiGlColumns.map((column) =>
//                     renderSiGlCell(column.key, row, originalIndex)
//                   )}

//                   {!isFormDisabled && (
//                     <td
//                       className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
//                       style={transactionActionsCellStyle}
//                     >
//                       <div className="flex items-center justify-center gap-1">
//                         <button
//                           type="button"
//                           className="global-tran-td-button-add-ui"
//                           onClick={() => handleAddRowGL(originalIndex)}
//                         >
//                           <FontAwesomeIcon icon={faPlus} />
//                         </button>

//                         <button
//                           type="button"
//                           className="global-tran-td-button-delete-ui"
//                           onClick={() => handleDeleteRowGL(originalIndex)}
//                         >
//                           <FontAwesomeIcon icon={faTrashAlt} />
//                         </button>
//                       </div>
//                     </td>
//                   )}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {renderSiGlHeaderContextMenu()}
//         </div>
//       </div>

//       <div className="global-tran-tab-footer-main-div-ui">
//         <div className="global-tran-tab-footer-button-div-ui">
//           <button
//             onClick={() => handleAddRowGL()}
//             className="global-tran-tab-footer-button-add-ui"
//             style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
//           >
//             <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
//           </button>
//         </div>

//         <div className="global-tran-tab-footer-total-main-div-ui">
//           <>
//             <div className="global-tran-tab-footer-total-div-ui">
//               <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
//                 Total Debit ({glCurrDefault}):
//               </label>
//               <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
//                 {totalDebit}
//               </label>
//             </div>

//             <div className="global-tran-tab-footer-total-div-ui">
//               <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
//                 Total Credit ({glCurrDefault}):
//               </label>
//               <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
//                 {totalCredit}
//               </label>
//             </div>
//           </>

//           {glCurrDefault !== currCode && (
//             <div className="global-tran-tab-footer-total-main-div-ui">
//               <div className="global-tran-tab-footer-total-div-ui">
//                 <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
//                   Total Debit ({currCode}):
//                 </label>
//                 <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
//                   {totalDebitFx1}
//                 </label>
//               </div>

//               <div className="global-tran-tab-footer-total-div-ui">
//                 <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
//                   Total Credit ({currCode}):
//                 </label>
//                 <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
//                   {totalCreditFx1}
//                 </label>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>

//     {branchModalOpen && (
//             <BranchLookupModal
//               isOpen={branchModalOpen}
//               onClose={handleCloseBranchModal}
//             />
//           )}

//     {currencyModalOpen && (
//             <CurrLookupModal
//               isOpen={currencyModalOpen}
//               onClose={handleCloseCurrencyModal}
//             />
//           )}

//     {billtermModalOpen && (
//       <BillTermLookupModal
//           isOpen={billtermModalOpen}
//           onClose={handleCloseBillTermModal}
//         />
//     )}

//     {custModalOpen && (
//       <CustomerMastLookupModal
//         isOpen={custModalOpen}
//         onClose={handleCloseCustModal}
//         customParam={
//           String(siTranType || "").toUpperCase() === "SI03"
//             ? "openFADS"
//             : String(siTranType || "").toUpperCase() === "SI01"
//               ? "openDR"
//               : undefined
//         }
//       />
//     )}

//     {showAccountModal && (
//       <COAMastLookupModal
//         isOpen={showAccountModal}
//         onClose={handleCloseAccountModal}
//         source={accountModalSource}
//         customParam={customParam}
//       />
//     )}

//     {showSlModal && (
//       <SLMastLookupModal
//         isOpen={showSlModal}
//         onClose={handleCloseSlModalGL}
//       />
//     )}

//     {showItemModal && (
//       <ItemMastLookupModal
//         isOpen={showItemModal}
//         endpoint="getInvLookupFG"
//         docType="SI"
//         onClose={handleCloseItemModal}
//         onCancel={() =>
//           updateState({
//             showItemModal: false,
//             selectedRowIndex: null,
//             insertAfterIndex: null,
//             selectionContext: "",
//           })
//         }
//         enableMultiSelect={selectionContext === "multiAdd"}
//       />
//     )}

//     {showOpenDRModal && (
//       <GlobalLookupModalv1
//         isOpen={showOpenDRModal}
//         title="Open Delivery Receipt Summary"
//         endpoint={openDRSI_Col_Summary}
//         data={openDRSI_Data_Summary}
//         btnCaption="Get Selected DR"
//         onClose={handleInsertSelectedOpenDR}
//         onCancel={() =>
//           updateState({
//             showOpenDRModal: false,
//             openDRSI_Data_Summary: [],
//             openDRSI_Col_Summary: [],
//           })
//         }
//       />
//     )}

//     {showATCModal && (
//       <ATCLookupModal
//         isOpen={showATCModal}
//         onClose={handleCloseATCModal}
//       />
//     )}

//     {showVatModal && (
//       <VATLookupModal
//         isOpen={showVatModal}
//         onClose={handleCloseVatModal}
//         customParam ="OutputGoods"
//       />
//     )}

//     {showSalesRepModal && (
//       <SearchSalesRepRef
//         isOpen={showSalesRepModal}
//         onClose={handleCloseSalesRepModal}
//       />
//     )}

//     {showRcModal && (
//       <RCLookupModal
//         isOpen={showRcModal}
//         onClose={handleCloseRcModal}
//       />
//     )}

//     {showItemPickingModal && selectedPickingRow && (
//       <SearchGlobalItemPickingModal
//         isOpen={showItemPickingModal}
//         onClose={handleCloseItemPickingModal}
//         transaction={{
//           sourceDocType: "SI",
//           sourceDocTypeName: "Sales Invoice",
//           sourceDocNo: documentNo || "New SI",
//           sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
//           groupId: selectedPickingRow?.groupId || "",
//           customerCode: billToCustCode || "",
//           customerName: billToCustName || "",
//           itemCode: selectedPickingRow?.itemCode || "",
//           itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
//           requestedQty: parseFormattedNumber(selectedPickingRow?.siQuantity || 0) || 0,
//         }}
//         stockRows={itemPickingStockRows}
//         existingAllocations={itemPickingExistingAllocations}
//         onConfirm={handleConfirmItemPicking}
//       />
//     )}

//     {/* Cancellation Modal */}
//     {showCancelModal && (
//       <CancelTranModal
//         isOpen={showCancelModal}
//         onClose={handleCloseCancel}
//       />
//     )}

//     {showAttachModal && (
//       <AttachDocumentModal
//         isOpen={showAttachModal}
//         params={{
//           DocumentID: documentID,
//           DocumentName: documentName,
//           BranchName: branchName,
//           DocumentNo: documentNo,
//         }}
//         onClose={() => updateState({ showAttachModal: false })}
//       />
//     )}

//     {showSignatoryModal && (
//       <DocumentSignatories
//         isOpen={showSignatoryModal}
//         params={{noReprints,documentID,docType}}
//         onClose={handleCloseSignatory}
//         onCancel={() => updateState({ showSignatoryModal: false })}
//       />
//     )}
//     {showAllTranDocNo && (
//       <AllTranDocNo
//         isOpen={showAllTranDocNo}
//         params={{branchCode,branchName,docType,documentTitle,fieldNo : "siNo"}}
//         onRetrieve={handleTranDocNoRetrieval}
//         onResponse={{documentNo}}
//         onSelected={handleTranDocNoSelection}
//         onClose={() => updateState({ showAllTranDocNo: false })}
//       />
//     )}

//       {showSpinner && <LoadingSpinner />}
//     </div>
//   <div
//     className={topTab === "history" ? "" : "hidden"}
//     style={{ display: topTab === "history" ? undefined : "none" }}
//   >
//   <AllTranHistory
//     showHeader={false}
//     isActive={topTab === "history"}
//     endpoint="/getSIHistory"
//     cacheKey={`SI:${state.branchCode || ""}`}
//     activeTabKey="SI_Summary"
//     branchCode={state.branchCode}
//     status="All"
//     onRowDoubleClick={handleHistoryRowPick}
//     historyExportName={`${documentTitle} History`}
//   />
// </div>

// </>
// );
// // End of Return

// };

// export default SI;








import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faClipboardCheck, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// Configuration
import { apiClient, fetchDataJson, postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';

import {
  useTopRCRow,
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopSalesRepRow,
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';
import {
  useSelectedHSColConfig as selectedHSColConfig
} from '@/NAYSA Cloud/Global/selectedData';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from '@/NAYSA Cloud/Global/datatable.jsx';

import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';

import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalvalidateRequiredFields,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';
const SI = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const originalSOQuantityRef = useRef({});
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const addTypeDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopATCRow,getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
  const [isViewDocument, setIsViewDocument] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
    }, []);

  const isViewDocumentUrl = isViewDocument;

  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const { resetFlag } = useReset();
  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
  const [showItemPickingModal, setShowItemPickingModal] = useState(false);
  const [itemPickingRowIndex, setItemPickingRowIndex] = useState(null);
  const [itemPickingStockRows, setItemPickingStockRows] = useState([]);
  const [itemPickingExistingAllocations, setItemPickingExistingAllocations] = useState([]);
  const docType = docTypes.SI;
  const hsDoc = getAllTopHSDocRow(docType) || {};
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';

  useEffect(() => {
    if (!showAddTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowAddTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddTypeDropdown]);

  const [state, setState] = useState({
    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentDate:useGetCurrentDayV2(),
    documentNo: "",
    documentStatus:"",
    status: "OPEN",
    noReprints:"0",

    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries:false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",

    // Customer information
    // Customer information
    billToCustCode: "",
    billToCustName: "",
    contactPerson: "",
    customerPoNo: "",
    customerPoDate: null,
    salesRepCode: "",
    salesRepName: "",
    atcCode: "",
    atcName: "",
    vatCode: "",
    vatName: "",
    vatCodeFADisposal:"",

    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),

    //Other Header Info
    tblFieldArray :[],
    siStatus: "O",
    siTranType: "",
    siTranTypeOptions: [],
    siStatusOptions: [],
    refSiNo1: "",
    refSiNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    dueDate: "",
    daysDue: "",
    userCode: currentUserRow?.userCode||"",

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    openDRSI_Data_Summary: [],
    openDRSI_Col_Summary: [],

    totalDebit:"0.00",
    totalCredit:"0.00",
    totalDebitFx1:"0.00",
    totalCreditFx1:"0.00",
    totalDebitFx2:"0.00",
    totalCreditFx2:"0.00",

    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal:false,
    insertAfterIndex: null,    
    showRcModal:false,
    showSlModal:false,
    showBilltermModal:false,
    showSalesRepModal:false,
    showItemModal:false,    
    showATCModal:false,
    showVatModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    billtermModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showAllTranDocNo:false,
    showOpenDRModal:false
   });

  const updateState = (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    };

  const {
  // Document info
  documentName,
  documentSeries,
  documentDocLen,
  documentID,
  documentStatus,
  documentNo,
  documentDate,
  status,
  userCode,
  noReprints,

  // Tabs & loading
  activeTab,
  GLactiveTab,
  isLoading,
  showSpinner,
  triggerGLEntries,

  // UI states / disable flags
  isDocNoDisabled,
  isSaveDisabled,
  isResetDisabled,
  isFetchDisabled,
  defaultCurrRate,

  // Transaction Header
  branchCode,
  branchName,
  billToCustCode,
  billToCustName,
  customerPoNo,
  customerPoDate,
  salesRepCode,
  salesRepName,
  atcCode,
  atcName,
  vatCode,
  vatName,
  currCode,
  currName,
  currRate,
  siTranType,
  siTranTypeOptions = [],
  siStatus,
  siStatusOptions = [],
  refSiNo1,
  refSiNo2,
  remarks,
  contactPerson,
  billtermCode,
  billtermName,
  dueDate,
  daysDue,
  vatCodeFADisposal,

  // Transaction details
  tblFieldArray,
  detailRows,
  detailRowsGL,
  openDRSI_Data_Summary,
  openDRSI_Col_Summary,
  totalDebit,
  totalCredit,
  totalDebitFx1,
  totalCreditFx1,
  totalDebitFx2,
  totalCreditFx2,

  // Contexts
  modalContext,
  selectionContext,
  selectedRowIndex,
  accountModalSource,
  insertAfterIndex,

  // Modals
  showAccountModal,
  showRcModal,
  showSlModal,
  showSalesRepModal,
  showItemModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  billtermModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAllTranDocNo,
  showOpenDRModal,
  showATCModal,
  showVatModal

  } = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const normalizedDisplayStatus = String(displayStatus || "").toUpperCase();
  const normalizedDocumentStatus = String(documentStatus || "").toUpperCase();
  const isOpenStatus =
    ["OPEN", "O"].includes(normalizedDisplayStatus) ||
    ["OPEN", "O"].includes(normalizedDocumentStatus);
  const isPosted = ["FINALIZED", "POSTED"].includes(normalizedDisplayStatus);
  const isCancelled = normalizedDisplayStatus === "CANCELLED";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(normalizedDisplayStatus);  
  const isHeaderSiStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
  const totalSiQuantity = detailRows.reduce((total, row) => total + (parseFormattedNumber(row.siQuantity || 0) || 0),0);
  const hasPickedQuantity = (detailRows || []).some(
    (row) => (parseFormattedNumber(row.quantityPicked || 0) || 0) > 0
  );

  const filteredHeaderSiStatusOptions =
    !isPosted && totalSiQuantity > 0
      ? (siStatusOptions || []).filter(
          (option) =>
            ["O", "C"].includes(option.DROPDOWN_CODE) ||            
            option.DROPDOWN_CODE === siStatus
        )
      : siStatusOptions;

  //Variables
  const [totals, setTotals] = useState({
  totalGrossAmount: '0.00',
  totalDiscountAmount: '0.00',
  totalVatAmount: '0.00',
  totalAtcAmount: '0.00',
  totalSalesAmount: '0.00',
  totalNetAmount: '0.00',
  totalAmountDue: '0.00',
  });

  const customParamMap = {
    acctCode: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);

    return {
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
      totalDebitFx2: formatNumber(debitFx2Sum),
      totalCreditFx2: formatNumber(creditFx2Sum),
    };
  };

  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);

  
  // Company defaults
  const glCurrDefault = companyInfo?.currCode || "";
  const sellingPriceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);

  // Company sales settings
  const salesDiscountMode = String(companyInfo?.salesDiscountMode || "").toUpperCase();
  const salesAllowDuplicateItem = String(
    companyInfo?.salesAllowDuplicateItem || ""
  ).toUpperCase();

  // Derived UI flags
  const isSellingPriceAndDiscountEditable = salesDiscountMode === "MANUAL";
  const SI_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";

  // Discount configuration
  const discountLevel = Math.min(
    Math.max(Number(companyInfo?.salesDiscLevel ?? 8), 1),
    8
  );
  const showTotalDiscountColumn = discountLevel > 1;
  const visibleDiscountRateFields = Array.from(
    { length: discountLevel },
    (_, index) => `discRate${index + 1}`
  );
  const visibleDiscountAmountFields = Array.from(
    { length: discountLevel },
    (_, index) => `discAmount${index + 1}`
  );

  const detailColumnDefs = [
    { key: "drId", label: "DR ID", width: 120 },
    { key: "soId", label: "SO ID", width: 120 },
    { key: "groupId", label: "Group ID", width: 120 },
    { key: "ln", label: "LN", width: 56 },
    { key: "siStat", label: "Picking Status", width: 130 },
    { key: "drNo", label: "DR No.", width: 140 },
    { key: "itemCode", label: "Item Code", width: 140 },
    { key: "itemName", label: "Item Name", width: 240 },
    { key: "itemSpecs", label: "Specification", width: 240 },
    { key: "uomCode", label: "UOM", width: 100 },
    { key: "siQuantity", label: "SI Quantity", width: 120 },
    { key: "quantityPicked", label: "Quantity Picked", width: 130 },
    { key: "itemAmount", label: "Item Amount", width: 130 },
    { key: "unitPrice", label: "Selling Price", width: 130 },
    { key: "grossAmount", label: "Gross Amount", width: 130 },
    ...visibleDiscountRateFields.map((field, index) => ({
      key: field,
      label: discountLevel === 1 ? "Disc Rate" : `Disc Rate ${index + 1}`,
      width: 110,
    })),
    ...visibleDiscountAmountFields.map((field, index) => ({
      key: field,
      label: discountLevel === 1 ? "Disc Amount" : `Disc Amount ${index + 1}`,
      width: 120,
    })),
    ...(showTotalDiscountColumn
      ? [{ key: "totDiscount", label: "Total Discount", width: 130 }]
      : []),
    { key: "netAmount", label: "Net Amount", width: 130 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatRate", label: "VAT Rate", width: 110 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "salesAmount", label: "Sales Amount", width: 130 },
    { key: "freeItem", label: "Free Item", width: 110 },
  ];


  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns: getOrderedSoDetailColumns,
    getSortedRows: getSortedSoDetailRows,
    setHiddenColumnKeys: setSoDetailHiddenColumnKeys,
    setColumnOrder: setSoDetailColumnOrder,
    clearAllSorting: clearSoDetailSorting,
    clearZeroValueOnFocus: clearSoDetailZeroOnFocus,
    focusNextRowInput: focusNextSoDetailRowInput,
    renderHeaderContextMenu: renderSoDetailHeaderContextMenu,
    renderResizableHeader: renderSiDetailHeader,
  } = useResizableTableColumns(detailColumnDefs);
  const orderedDetailColumns = getOrderedSoDetailColumns(detailColumnDefs);
  const normalizedSiTranType = String(siTranType || "").toUpperCase();
  const isDirectSiType = normalizedSiTranType === "SI01";
  const isPickingSiType = normalizedSiTranType === "SI02";
  const canViewCostAmount =
    String(currentUserRow?.viewCostamt || "").toUpperCase() === "Y";
  const canUsePickingControls =
    isPickingSiType && !isViewDocumentUrl && isOpenStatus && !isPosted && !isCancelled;
  const isAddItemDisabledBySiType = isDirectSiType;
  const isOpenDRDisabledBySiType = isPickingSiType;
  const hasSiDetailRows = (detailRows || []).length > 0;
  const hasDRLinkedDetailRows = (detailRows || []).some((row) =>
    Boolean(String(row?.drNo || "").trim())
  );
  const getDetailColumnFallbackWidth = (key) =>
    detailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getDetailCellStyle = (key, fallbackWidth) => ({
    ...getDetailColumnStyle(key, fallbackWidth),
    ...getFrozenColumnStyle(key, orderedDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setSoDetailColumnOrder(detailColumnDefs.map((column) => column.key));
  }, [setSoDetailColumnOrder, discountLevel]);

  useEffect(() => {
    const hiddenColumnKeys = ["drId", "soId", "groupId", "vatRate"];

    if (!isPickingSiType) {
      hiddenColumnKeys.push("siStat", "quantityPicked");
    }

    if (!(isPosted && canViewCostAmount)) {
      hiddenColumnKeys.push("itemAmount");
    }

   if (isPickingSiType || normalizedSiTranType === "SI03") {
      hiddenColumnKeys.push("drNo");
    }


    if (normalizedSiTranType === "SI03") {
      hiddenColumnKeys.push("discRate1", "discRate2", "discRate3", "discRate4", "discRate5", "discRate6", "discRate7", "discRate8", "discAmount1", "discAmount2", "discAmount3", "discAmount4", "discAmount5", "discAmount6", "discAmount7", "discAmount8", "totDiscount","freeItem");
    }



    setSoDetailHiddenColumnKeys(hiddenColumnKeys);
  }, [setSoDetailHiddenColumnKeys, isPosted, canViewCostAmount, isDirectSiType, isPickingSiType, normalizedSiTranType]);


  const sortedDetailRows = getSortedSoDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") {
        return entry.originalIndex + 1;
      }

      return entry.row?.[sortKey] ?? "";
    }
  );

  const withCurr2 = (companyInfo?.glCurrMode === "M" && glCurrDefault !== currCode) || companyInfo?.glCurrMode === "D";
  const withCurr3 = companyInfo?.glCurrMode === "T";
  const glCurrGlobal2 = companyInfo?.glCurrGlobal2 || "";
  const glCurrGlobal3 = companyInfo?.glCurrGlobal3 || "";

  const siGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2 ? [
      { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
      { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
    ] : []),
    ...(withCurr3 ? [
      { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
      { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
    ] : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 140 },
  ];
  const {
    getColumnStyle: getSiGlColumnStyle,
    getFrozenColumnStyle: getSiGlFrozenStyle,
    getOrderedColumns: getOrderedSiGlColumns,
    getSortedRows: getSortedSiGlRows,
    setColumnOrder: setSiGlColumnOrder,
    clearZeroValueOnFocus: clearSiGlZeroOnFocus,
    focusNextRowInput: focusNextSiGlRowInput,
    renderHeaderContextMenu: renderSiGlHeaderContextMenu,
    renderResizableHeader: renderSiGlHeader,
  } = useResizableTableColumns(siGlColumnDefs);
  const orderedSiGlColumns = getOrderedSiGlColumns(siGlColumnDefs);
  const getSiGlFallbackWidth = (key) =>
    siGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getSiGlCellStyle = (key, fallbackWidth) => ({
    ...getSiGlColumnStyle(key, fallbackWidth),
    ...getSiGlFrozenStyle(key, orderedSiGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setSiGlColumnOrder(siGlColumnDefs.map((column) => column.key));
  }, [setSiGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedSiGlRows = getSortedSiGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const siGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];

  const setGLActiveTab = (tab) => updateState({ GLactiveTab: tab });
  const calculateDueDate = (startDate, daysDue) => {
    if (!startDate || daysDue === "" || daysDue === null || daysDue === undefined || isNaN(daysDue)) return "";
    try {
      const rawDate = String(startDate).trim();
      const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const usMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const date = isoMatch
        ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
        : usMatch
        ? new Date(Number(usMatch[3]), Number(usMatch[1]) - 1, Number(usMatch[2]))
        : new Date(rawDate);

      if (Number.isNaN(date.getTime())) return "";

      date.setDate(date.getDate() + parseInt(daysDue, 10));
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Error calculating due date:", error);
      return "";
    }
  };

  useEffect(() => {
    if (!billtermCode) return;
    if (daysDue === "" || daysDue === null || daysDue === undefined) return;
    const nextDueDate = calculateDueDate(documentDate, daysDue);
    updateState({ dueDate: nextDueDate });
  }, [documentDate, daysDue, billtermCode]);









  // API endpoints
  const SI_PRICE_MATRIX_ENDPOINT = "getPriceMatrixItemPrice"; // Assuming SI also uses price matrix
  const SI_DUPLICATE_PO_ENDPOINT = "/checkSIDuplicatePO"; // Assuming SI also has duplicate PO check

  const calculateSalesAmount = (netAmount, vatAmount) =>
    (parseFormattedNumber(netAmount || 0) || 0) -
    (parseFormattedNumber(vatAmount || 0) || 0);

  const formatSalesAmount = (netAmount, vatAmount) => formatNumber(calculateSalesAmount(netAmount, vatAmount));
  const toFormattedAmountNumber = (value, decimals = 2) =>
    parseFormattedNumber(formatNumber(parseFormattedNumber(value), decimals)) || 0;

  const getDetailTaxBase = (row = {}) => {
    const grossAmount = parseFormattedNumber(row.grossAmount || 0) || 0;
    const totalDiscount = parseFormattedNumber(row.totDiscount || 0) || 0;
    return grossAmount - totalDiscount;
  };


  const getDetailVatRate = (vatCodeValue = "") => {
    const vatRow = getAllTopVatRow(vatCodeValue);
    return parseFormattedNumber(vatRow?.vatRate || 0) || 0;
  };

  const getMatrixVatRate = (row = {}) =>
    parseFormattedNumber(row?.vatRate ?? 0) || 0;

  const distributeVatAcrossDetailRows = (rows = [], options = {}) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

  
    const taxableRowsByVatCode = rows.reduce((groups, row, index) => {
      const lineNetAmount = Math.max(
        parseFormattedNumber(row.netAmount || 0) || getDetailTaxBase(row),
        0
      );
      const lineVatCode = String(row.vatCode || "").trim();
      const vatRate = getDetailVatRate(lineVatCode);

      if (!lineVatCode || vatRate <= 0 || lineNetAmount <= 0) {
        return groups;
      }

      if (!groups[lineVatCode]) {
        groups[lineVatCode] = [];
      }

      groups[lineVatCode].push({
        index,
        lineNetAmount,
        vatCode: lineVatCode,
      });

      return groups;
    }, {});

    const vatAmountByRowIndex = Object.values(taxableRowsByVatCode).reduce(
      (amounts, taxableRows) => {
        const totalNetAmount = taxableRows.reduce(
          (sum, row) => sum + row.lineNetAmount,
          0
        );
        const vatCodeForGroup = taxableRows[0]?.vatCode || "";
        const totalVatAmount =
          vatCodeForGroup && totalNetAmount > 0 && typeof getAllTopVatAmount === "function"
            ? toFormattedAmountNumber(getAllTopVatAmount(vatCodeForGroup, totalNetAmount))
            : 0;

        let distributedVatAmount = 0;
        const lastTaxableIndex = taxableRows[taxableRows.length - 1]?.index;

        taxableRows.forEach(({ index, lineNetAmount }) => {
          const lineVatAmount =
            index === lastTaxableIndex
              ? toFormattedAmountNumber(totalVatAmount - distributedVatAmount)
              : toFormattedAmountNumber(
                  totalNetAmount > 0
                    ? totalVatAmount * (lineNetAmount / totalNetAmount)
                    : 0
                );

          if (index !== lastTaxableIndex) {
            distributedVatAmount += lineVatAmount;
          }

          amounts[index] = lineVatAmount;
        });

        return amounts;
      },
      {}
    );




    return rows.map((row, index) => {
      const grossAmount = toFormattedAmountNumber(row.grossAmount || 0);
      const totalDiscount = toFormattedAmountNumber(row.totDiscount || 0);
      const netAmount = Math.max(
        toFormattedAmountNumber(grossAmount - totalDiscount),
        0
      );
      const lineVatAmount = toFormattedAmountNumber(vatAmountByRowIndex[index] || 0);
      const salesAmount = toFormattedAmountNumber(netAmount - lineVatAmount);

      return {
        ...row,
        netAmount: formatNumber(netAmount),
        vatAmount: formatNumber(lineVatAmount),
        salesAmount: formatNumber(salesAmount),
        // ATC is header-level only. Keep detail ATC/amountDue at zero.
        atcAmount: formatNumber(0),
        amountDue: formatNumber(0),
      };
    });
  };






  const updateTotalsDisplay = (
    grossAmt,
    discAmt,
    vatAmt,
    atcAmt,
    salesAmt,
    netAmt,
    amountDue,
    atcCodeOverride = atcCode
  ) => {
    const grossAmount = toFormattedAmountNumber(grossAmt);
    const discountAmount = toFormattedAmountNumber(discAmt);
    const vatAmount = toFormattedAmountNumber(vatAmt);
    const netAmount = toFormattedAmountNumber(netAmt);
    const salesBaseAmount = toFormattedAmountNumber(
      salesAmt || grossAmount - discountAmount - vatAmount
    );

    const computedAtcAmount = toFormattedAmountNumber(
      getAllTopATCAmount(atcCodeOverride, salesBaseAmount)
    );
    const computedAmountDue = toFormattedAmountNumber(netAmount - computedAtcAmount);

    setTotals({
      totalGrossAmount: formatNumber(grossAmount),
      totalDiscountAmount: formatNumber(discountAmount),
      totalVatAmount: formatNumber(vatAmount),
      totalAtcAmount: formatNumber(computedAtcAmount),
      totalSalesAmount: formatNumber(salesBaseAmount),
      totalNetAmount: formatNumber(netAmount),
      totalAmountDue: formatNumber(computedAmountDue),
    });
  };




  const formatFetchedHeaderDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [month, day, year] = raw.split("/").map(Number);
      const isValidMonth = month >= 1 && month <= 12;
      const isValidDay = day >= 1 && day <= 31;
      const isValidYear = year >= 1900 && year <= 2999;

      if (isValidMonth && isValidDay && isValidYear) {
        return raw;
      }
    }

    if (/^(19|20)\d{2}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
      return useformatToDatev2(raw);
    }

    const digits = raw.replace(/\D/g, "");

    if (digits.length === 8) {
      const first4 = digits.slice(0, 4);
      const middle2 = digits.slice(4, 6);
      const last2 = digits.slice(6, 8);

      if (/^(19|20)\d{2}$/.test(first4)) {
        return `${middle2}/${last2}/${first4}`;
      }

      const month = digits.slice(0, 2);
      const day = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      return `${month}/${day}/${year}`;
    }

    return "";
  };

  const parseComparableDate = (value) => {
    const formattedValue = formatFetchedHeaderDate(value);

    if (!formattedValue || !/^\d{2}\/\d{2}\/\d{4}$/.test(formattedValue)) {
      return null;
    }

    const [month, day, year] = formattedValue.split("/").map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return parsedDate;
  };

  const isDateEarlierThanSiDate = (value) => {
    const candidateDate = parseComparableDate(value);
    const soDate = parseComparableDate(documentDate);

    if (!candidateDate || !soDate) {
      return false;
    }

    return candidateDate < soDate;
  };

  const clearHeaderAndDetailDates = ({ showAlert = false } = {}) => {
    const updatedRows = detailRows.map((row) => ({
      ...row,
      // No delivery date in SI details, assuming SI date is the main date
    }));

    if (showAlert) {
      useSwalErrorAlert(
        "Invalid Date",
        "Date must not be earlier than SI Date."
      );
    }
  };

  const parseDuplicatePOCheckResult = (response) => {
    const rawResult =
      response?.data?.data?.[0]?.result ??
      response?.data?.[0]?.result ??
      response?.data?.result ??
      response?.result ??
      '{"result":"0"}';

    try {
      const parsed =
        typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      return String(parsed?.result || "0") === "1";
    } catch {
      return String(response?.data?.result || response?.result || "0") === "1";
    }
  };

  const checkDuplicateSiNo = async (siNoValue) => {
    const trimmedSiNo = String(siNoValue || "").trim();
    const trimmedCustCode = String(billToCustCode || "").trim();

    if (!trimmedSiNo || !trimmedCustCode) {
      return false;
    }

    const params = {
      json_data: {
        siNo: trimmedSiNo,
        custCode: trimmedCustCode,
      },
    };

    try {
      const response = await apiClient.get(SI_DUPLICATE_PO_ENDPOINT, { params });
      return parseDuplicatePOCheckResult(response);
    } catch (error) {
      console.error("Error checking duplicate SO customer PO:", error);
      return false;
    }
  };

  const applyHeaderValueToDetailRows = (detailField, detailValue, headerOverrides = {}) => {
    const selectedVatRow =
      detailField === "vatCode" ? getAllTopVatRow(detailValue) : null;
    const updatedRows = detailRows.map((row) =>
      recalculateSODetailRow(
        {
          ...row,
          [detailField]: detailValue,
          ...(detailField === "vatCode"
            ? { vatRate: formatNumber(selectedVatRow?.vatRate || 0) }
            : {}),
        },
        detailField
      )
    );
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows, headerOverrides);

    updateState({ detailRows: normalizedRows });
    updateTotals(normalizedRows);
    regenerateGlEntriesForRows(normalizedRows, headerOverrides);
  };

  const confirmApplyHeaderValueToDetails = async ({
    headerLabel,
    detailField,
    detailValue,
  }) => {
    if ((detailRows?.length || 0) === 0) {
      return false;
    }

    const result = await useSwalProceedConfirm(
      `Apply ${headerLabel} changes?`,
      `SO Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all SO Detail rows?`,
      "Yes"
    );

    if (result?.isConfirmed) {
      applyHeaderValueToDetailRows(detailField, detailValue);
      return true;
    }

    return false;
  };

  useEffect(() => {
      if (resetFlag) {
        handleReset();
      }
      let timer;
      if (isLoading) {
        timer = setTimeout(() => updateState({ showSpinner: true }), 200);
      } else {
        updateState({ showSpinner: false });
      }
      return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
  }, [billToCustCode]);

  useEffect(() => {
    if (billToCustName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: billToCustName.currCode
      }));
       updateState({ detailRows: updatedRows });
    }
  }, [billToCustName?.currCode]);

  useEffect(() => {
      updateState({isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    handleReset();
    loadCompanyData();
    isInitialMount.current = false;
  }
}, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown("SITRAN_TYPE", docType) || [];
    const defaultSiType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "SI01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "";
    const mapHeaderSiStatus = (value) => {
      const normalizedValue = String(value || "").toUpperCase();
      if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
      if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
      if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
      return "O";
    };
    updateState({
      siTranTypeOptions: filteredTypes,
      siTranType: defaultSiType,
      siStatusOptions: [{ DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" }, { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" }, { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" }],
      siStatus: mapHeaderSiStatus(state.siStatus),
    });
}, [docType, refsLoaded]);

  const handleReset = () => {
      clearSoDetailSorting();
      const filteredTypes = getAllDropDown("SITRAN_TYPE", docType) || [];
      const defaultSiType =
        filteredTypes.find((type) => type.DROPDOWN_CODE === "SI01")?.DROPDOWN_CODE ||
        filteredTypes[0]?.DROPDOWN_CODE ||
        "";

      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6),
      refSiNo1: "",
      refSiNo2: "",
      salesRepCode:"",
      salesRepName:"",
      remarks:"",
      billtermCode:"",
      billtermName:"",
      dueDate: "",
      daysDue: "",
      noReprints:"0",
      billToCustCode:"",
      billToCustName:"",
      customerPoNo: "",
      customerPoDate: null,
      contactPerson: "",
      atcCode: "",
      atcName: "",
      vatCode: "",
      vatName: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      openDRSI_Data_Summary: [],
      openDRSI_Col_Summary: [],
      ...getGLTotalsState([]),
      documentStatus:"",      
      siTranType: defaultSiType,
      siStatus:"O",

      // UI state
      activeTab: "basic",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open",
      // Modal states
      showRcModal: false,
      showAccountModal: false,
      showSlModal: false,
      showSalesRepModal: false,
      showOpenDRModal: false,
    });

    updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0);
  };

    const loadCompanyData = async () => {
        updateState({ isLoading: true });

        try {
          const hdtblcol_result = await useFieldLenghtCheck(
            "si_hd,si_dt1,'si_dt2"
          );

          if (hdtblcol_result) {
            updateState({ tblFieldArray: hdtblcol_result });
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        } finally {
          updateState({ isLoading: false });
        }
      };

const fetchTranData = async (documentNo, branchCode, direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });
  
  try {
    const data = await useFetchTranData(documentNo, branchCode, docType, "siNo", direction);

    if (!data?.siId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }

    // Format rows
    const retrievedDetailRows = distributeVatAcrossDetailRows((data.dt1 || []).map(item => ({
      ...item,
      siStat: item.pickStat || item.siStat || "F",
      siQuantity: formatNumber(item.siQuantity ?? 0,quantityDecimals),
      drNo: item.drNo || "",
      drId: item.drId || "",
      soId: item.soId || "",
      groupId: item.groupId || "",
      unitPrice: formatNumber(item.unitPrice??0,sellingPriceDecimals),
      grossAmount: formatNumber(item.grossAmount),
      discRate1: formatNumber(item.discRate1 ?? 0),
      discRate2: formatNumber(item.discRate2 ?? 0),
      discRate3: formatNumber(item.discRate3 ?? 0),
      discRate4: formatNumber(item.discRate4 ?? 0),
      discRate5: formatNumber(item.discRate5 ?? 0),
      discRate6: formatNumber(item.discRate6 ?? 0),
      discRate7: formatNumber(item.discRate7 ?? 0),
      discRate8: formatNumber(item.discRate8 ?? 0),
      discAmount1: formatNumber(item.discAmount1 ?? 0),
      discAmount2: formatNumber(item.discAmount2 ?? 0),
      discAmount3: formatNumber(item.discAmount3 ?? 0),
      discAmount4: formatNumber(item.discAmount4 ?? 0),
      discAmount5: formatNumber(item.discAmount5 ?? 0),
      discAmount6: formatNumber(item.discAmount6 ?? 0),
      discAmount7: formatNumber(item.discAmount7 ?? 0),
      discAmount8: formatNumber(item.discAmount8 ?? 0),
      totDiscount: formatNumber(item.totDiscount ?? 0),      
      vatAmount: formatNumber(item.vatAmount ?? 0),
      vatCode: item.vatCode || data.vatCode || "",
      vatRate: formatNumber(item.vatRate ?? 0),
      salesAmount: formatSalesAmount(item.netAmount ?? 0, item.vatAmount ?? 0),
      atcAmount: formatNumber(item.atcAmount ?? 0),
      amountDue: formatNumber(item.amountDue ?? 0),
      netAmount: formatNumber(item.netAmount ?? 0),
      quantityPicked: formatNumber(item.quantityPicked ?? item.qtyPicked ?? 0, quantityDecimals),
      itemAmount: item.itemAmount ?? formatNumber( 0),
      drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
      linkedSiQuantity: formatNumber(item.siQuantity ?? 0, quantityDecimals), // Renamed to avoid confusion
    })), { atcCode: data.atcCode || "" });

    const formattedGLRows = (data.dt2 || []).map(glRow => ({
      ...glRow,
      debit: formatNumber(glRow.debit),
      credit: formatNumber(glRow.credit),
      debitFx1: formatNumber(glRow.debitFx1),
      creditFx1: formatNumber(glRow.creditFx1),
      debitFx2: formatNumber(glRow.debitFx2),
      creditFx2: formatNumber(glRow.creditFx2),
      slRefDate: useformatToDatev2(glRow.slRefDate),
    }));

    updateState({
      documentStatus: data.siStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.siId,
      documentNo: data.siNo,
      refSiNo1: data.refSiNo1 || "",
      refSiNo2: data.refSiNo2 || "",
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.siDate),
      siTranType: data.siTranType,
      billToCustCode: data.custCode,
      billToCustName: data.custName,
      customerPoNo: data.customerPoNo || "",
      customerPoDate: data.customerPoDate ? useformatToDatev2(data.customerPoDate) : null,
      atcCode: data.atcCode || "",
      atcName: data.atcName || "",
      vatCode: data.vatCode || "",
      vatName: data.vatName || "",
      billtermCode: data.billtermCode,
      billtermName: data.billtermName,
      salesRepCode: data.salesRepCode || "",
      salesRepName: data.salesRepName || "",
      dueDate: data.dueDate ? useformatToDatev2(data.dueDate) : "",
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      siStatus:
        String(data.siStatus || "O").toUpperCase() === "OPEN"
          ? "O"
          : String(data.siStatus || "O").toUpperCase() === "CANCELLED"
          ? "X"
          : String(data.siStatus || "O").toUpperCase() === "CLOSED"
          ? "C"
          : String(data.siStatus || "O"),
      detailRows: retrievedDetailRows,
      detailRowsGL: formattedGLRows,
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

    updateTotals(retrievedDetailRows, data.atcCode || "");

  } catch (error) {
    console.error("Error fetching transaction data:", error);
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};

const handlesiNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) {
        fetchTranData(state.documentNo, state.branchCode);
    }
};

const handleCurrRateNoBlur = (e) => {

  const num = formatNumber(e.target.value, 6);
  updateState({
        currRate: isNaN(num) ? "0.000000" : num
        })

};

const moveFocusBeforeSave = async () => {
  document.activeElement?.blur?.();
  return true;
};

const handleActivityOption = async (action) => {
   if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
    return;
  }

  if (action === "Upsert") {
   await moveFocusBeforeSave();
  }

  if (documentStatus === "") { // Assuming SI also has an 'O' status for open
    updateState({ isLoading: true });

    try {
        const {
        branchCode,
        documentNo,
        documentID,
        billtermCode,
        billToCustCode,
        billToCustName,
        refSiNo1,
        refSiNo2,
        salesRepCode,
        salesRepName,
        currCode,
        currRate,
        remarks,
        dueDate,
        userCode,
        contactPerson,
        customerPoNo,
        customerPoDate,
        siTranType,
        siStatus,
        detailRows,
        detailRowsGL,
      } = state;

      let finalDetailRowsGL = [...detailRowsGL];

      const buildSoData = (glRows = finalDetailRowsGL) => ({
        branchCode: branchCode,
        siNo: documentNo || "",
        siId: documentID || "",
        siDate: documentDate,
        sitranType: siTranType,
        billtermCode: billtermCode,
        custCode: billToCustCode,
        custName: billToCustName,
        attention: contactPerson,
        refSiNo1: refSiNo1,
        refSiNo2: refSiNo2,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        atcAmount: parseFormattedNumber(totals.totalAtcAmount),
        atcCode: atcCode || "",
        vatCode: vatCode || "",
        dueDate: dueDate || "",
        remarks: remarks || "",
        userCode: userCode,
        customerPoNo: customerPoNo || '',
        customerPoDate: customerPoDate || null,
        salesRepCode,
        salesRepName,
        soStatus: siStatus || 'O',
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          pickStat: row.siStat || "F",
          siStat: row.siStat || "F",
          drNo: row.drNo || "",
          drId: row.drId || "",
          soId: row.soId || "",
          groupId: row.groupId || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          pmType: row.pmType || "",
          pmId: row.pmId || "",
          siQuantity: parseFormattedNumber(row.siQuantity || 0),
          unitPrice: parseFormattedNumber(row.unitPrice || 0),
          grossAmount: parseFormattedNumber(row.grossAmount || 0),
          discRate1: parseFormattedNumber(row.discRate1 || 0),
          discRate2: parseFormattedNumber(row.discRate2 || 0),
          discRate3: parseFormattedNumber(row.discRate3 || 0),
          discRate4: parseFormattedNumber(row.discRate4 || 0),
          discRate5: parseFormattedNumber(row.discRate5 || 0),
          discRate6: parseFormattedNumber(row.discRate6 || 0),
          discRate7: parseFormattedNumber(row.discRate7 || 0),
          discRate8: parseFormattedNumber(row.discRate8 || 0),
          discAmount1: parseFormattedNumber(row.discAmount1 || 0),
          discAmount2: parseFormattedNumber(row.discAmount2 || 0),
          discAmount3: parseFormattedNumber(row.discAmount3 || 0),
          discAmount4: parseFormattedNumber(row.discAmount4 || 0),
          discAmount5: parseFormattedNumber(row.discAmount5 || 0),
          discAmount6: parseFormattedNumber(row.discAmount6 || 0),
          discAmount7: parseFormattedNumber(row.discAmount7 || 0),
          discAmount8: parseFormattedNumber(row.discAmount8 || 0),
          totDiscount: parseFormattedNumber(row.totDiscount || 0),          
          vatCode: row.vatCode || "",
          vatRate: parseFormattedNumber(row.vatRate || 0),
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          salesAmount: parseFormattedNumber(row.salesAmount || 0),
          atcAmount: parseFormattedNumber(row.atcAmount || 0),
          amountDue: parseFormattedNumber(row.amountDue || 0),
          netAmount: parseFormattedNumber(row.netAmount || 0),
          // No delivery date, customer PO, sales rep in SI details
          freeItem: row.freeItem || "",
          quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
          itemAmount: parseFormattedNumber(row.itemAmount || 0),
          drQuantity: parseFormattedNumber(row.drQuantity || 0),
        })),
        dt2: glRows.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          vatName: entry.vatName || "",
          atcCode: entry.atcCode || "",
          atcName: entry.atcName || "",
          debit: parseFormattedNumber(entry.debit || 0),
          credit: parseFormattedNumber(entry.credit || 0),
          debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
          creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
          debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
          creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate || null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || "",
        })),
      });

      if (action === "GenerateGL") {
        try {
          updateState({ detailRowsGL: [], isGeneratingGL: true });
          const newGlEntries = await useGenerateGLEntries(
            docType,
            buildSoData([])
          );

          updateState({
            detailRowsGL: newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
            isGeneratingGL: false,
          });
        } catch (error) {
          updateState({ detailRowsGL: [], isGeneratingGL: false });
          console.error(error);
        }
        return;
      }

      if (action === "Upsert") {
        if (finalDetailRowsGL.length === 0) {
          const newGlEntries = await useGenerateGLEntries(
            docType,
            buildSoData([])
          );

          if (!newGlEntries || newGlEntries.length === 0) {
            console.warn("GL entries generation failed or returned no data.");
            return;
          }

          finalDetailRowsGL = newGlEntries;
          updateState({ detailRowsGL: newGlEntries });
        }

        const response = await useTransactionUpsert(
          docType,
          buildSoData(finalDetailRowsGL),
          updateState,          
          "siId",
          "siNo"
        );

        if (response) {
          const responseDocNo =  response.data[0].siNo;
          const responseDocId =  response.data[0].siId;

          await fetchTranData(responseDocNo,branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }
        updateState({
          documentNo: response?.data?.[0]?.siNo || "",
          documentID: response?.data?.[0]?.siId || "",
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      updateState({ isLoading: false });
    }
  }
};

  const createSIDetailRow = (overrides = {}) => ({
      lnNo: "",
      siStat: "F",
      drNo: "",
      drId: "",
      soId: "",
      groupId: "",
      itemCode: "",
      itemName: "",
      itemSpecs: "",
      uomCode: "",
      pmType: "",
      pmId: "",
      siQuantity: Number(0).toFixed(quantityDecimals),
      quantityPicked: Number(0).toFixed(quantityDecimals),
      itemAmount: "0.00",
      unitPrice: Number(0).toFixed(sellingPriceDecimals),
      vatCode: "",
      vatRate: "0.00",
      vatAmount: "0.00",
      salesAmount: "0.00",
      atcAmount: "0.00",
      amountDue: "0.00",
      grossAmount: "0.00",
      discRate1: "0.00",
      discRate2: "0.00",
      discRate3: "0.00",
      discRate4: "0.00",
      discRate5: "0.00",
      discRate6: "0.00",
      discRate7: "0.00",
      discRate8: "0.00",
      discAmount1: "0.00",
      discAmount2: "0.00",
      discAmount3: "0.00",
      discAmount4: "0.00",
      discAmount5: "0.00",
      discAmount6: "0.00",
      discAmount7: "0.00",
      discAmount8: "0.00",
      totDiscount: "0.00",      
      netAmount: "0.00",      
      // No delivery date, customer PO, sales rep in SI details
      freeItem: "",
      drQuantity: Number(0).toFixed(quantityDecimals),
      ...overrides,
    });

  const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
      return;
    }

    const updatedRows = [...detailRows];
    const normalizedInsertRows = rowsToInsert.map((row) => createSIDetailRow(row));

    if (insertIndex !== null && insertIndex >= 0) {
      updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
    } else {
      updatedRows.push(...normalizedInsertRows);
    }

    const normalizedRows = distributeVatAcrossDetailRows(updatedRows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    })));

    updateState({
      detailRows: normalizedRows,
    });
    updateTotals(normalizedRows);

    setTimeout(() => {
      const tableContainer = document.querySelector(".max-h-\\[430px\\]");
      if (!tableContainer) return;

      if (insertIndex === null || insertIndex >= detailRows.length - 1) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleInsertBlankRow = (insertIndex = null) => {
    insertDetailRows([createSIDetailRow()], insertIndex);
  };

  // const resolveOpenDRGroupId = (item = {}) =>
  //   item?.groupId || item?.group_id || "";

  // const resolveOpenDRDrNo = (item = {}) =>
  //   item?.drNo || item?.dr_no || "";



  const normalizeOpenDRLookupRow = (item = {}) => ({
    ...item,
    groupId: item?.groupId || "",
    drId: item?.drId || "",
    drNo: item?.drNo || "",
    soId: item?.soId || "",
  });

  const getUniqueOpenDRRemarks = (records = []) => {
    const seen = new Set();

    return (records || []).reduce((acc, record) => {
      const value = String(record?.remarks || "").trim();
      if (!value) return acc;

      const key = value.replace(/\s+/g, " ").toLowerCase();
      if (seen.has(key)) return acc;

      seen.add(key);
      acc.push(value);
      return acc;
    }, []);
  };

  const appendMissingRemarks = (currentRemarks = "", newRemarks = []) => {
    const current = String(currentRemarks || "").trim();
    const currentKey = current.replace(/\s+/g, " ").toLowerCase();
    const missingRemarks = newRemarks.filter((remark) => {
      const key = String(remark || "").trim().replace(/\s+/g, " ").toLowerCase();
      return key && !currentKey.includes(key);
    });

    if (missingRemarks.length === 0) return currentRemarks || "";
    return [current, ...missingRemarks].filter(Boolean).join("\n");
  };

  const buildOpenDRHeaderUpdates = async (selectedRecords = [], selectedSummaryRecords = []) => {
    const topRecord = selectedRecords.find(Boolean) || {};
    const updates = {};

    const nextRemarks = appendMissingRemarks(
      remarks,
      getUniqueOpenDRRemarks(selectedSummaryRecords)
    );
    if (nextRemarks !== (remarks || "")) {
      updates.remarks = nextRemarks;
    }

    const nextSalesRepCode = String(topRecord?.salesrepCode || "").trim();
    if (nextSalesRepCode) {
      const salesRepRow = await useTopSalesRepRow(nextSalesRepCode);
      updates.salesRepCode = nextSalesRepCode;
      updates.salesRepName = salesRepRow?.salesRepName || "";
    }

    const nextBilltermCode = String(topRecord?.billtermCode || "").trim();
    if (nextBilltermCode) {
      const billTermRow = await useTopBillTermRow(nextBilltermCode);
      if (billTermRow) {
        updates.billtermCode = billTermRow.billtermCode;
        updates.billtermName = billTermRow.billtermName;
        updates.daysDue = billTermRow.daysDue;
        updates.dueDate = calculateDueDate(documentDate, billTermRow.daysDue);
      } else {
        updates.billtermCode = nextBilltermCode;
      }
    }

    const nextCustPoNo = topRecord?.custpoNo || "";
    if (nextCustPoNo) {
      updates.customerPoNo = nextCustPoNo;
    }

    const nextCustPoDate = topRecord?.custpoDate || "";
    if (nextCustPoDate) {
      updates.customerPoDate = useformatToDatev2(nextCustPoDate);
    }

    if (siTranType === "SI03") {
       const data = await useFetchTranData(topRecord?.drNo, branchCode, "FADS", "fadsNo", "");
       updateState({
        vatCodeFADisposal: data?.vatCode || "",
        billToCustName: data?.custName || "",
        customerPoNo: data?.fadsNo ? `FADS-${data.fadsNo}` : "",
        customerPoDate: data?.fadsDate ? useformatToDatev2(data.fadsDate) : "",
       })
    }



    

    return updates;


  };

  const mapOpenDRRecordToDetailRow = (item = {}) => {
    const siQuantityValue =item?.siQuantity ?? 0;
    const selectedVatCode = item?.vatCode || vatCode || "";
    const selectedVatRow = getAllTopVatRow(selectedVatCode);

    return calculateRowAmountsFromRates(createSIDetailRow({
      drNo: item?.drNo || "",
      drId: item?.drId || "",
      soId: item?.soId || "",
      groupId: item?.groupId || "",
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      itemSpecs: item?.itemSpecs || "",
      uomCode: item?.uomCode || "",
      pmType: item?.pmType || "",
      pmId: item?.pmId || "",
      siQuantity: formatNumber(siQuantityValue, quantityDecimals),
      quantityPicked: formatNumber(item?.quantityPicked ?? siQuantityValue ?? 0, quantityDecimals),
      itemAmount: formatNumber(item?.itemAmount ?? 0),
      unitPrice: formatNumber(item?.unitPrice ?? item?.sellPrice ?? item?.sellingPrice ?? 0, sellingPriceDecimals),
      vatCode: selectedVatCode,
      vatRate: formatNumber(item?.vatRate ?? selectedVatRow?.vatRate ?? 0),
      vatAmount: formatNumber(item?.vatAmount ?? 0),
      atcAmount: formatNumber(item?.atcAmount ?? 0),
      discRate1: formatNumber(item?.discRate1 ?? 0),
      discRate2: formatNumber(item?.discRate2 ?? 0),
      discRate3: formatNumber(item?.discRate3 ?? 0),
      discRate4: formatNumber(item?.discRate4 ?? 0),
      discRate5: formatNumber(item?.discRate5 ?? 0),
      discRate6: formatNumber(item?.discRate6 ?? 0),
      discRate7: formatNumber(item?.discRate7 ?? 0),
      discRate8: formatNumber(item?.discRate8 ?? 0),
      freeItem: item?.freeItem || "",
    }));
  };

  const getOpenDRDuplicateKey = (row = {}) => {
    const rowDrId = String(row?.drId || "").trim().toUpperCase();
    const rowGroupId = String(row?.groupId || "").trim().toUpperCase();
    return rowDrId && rowGroupId ? `${rowDrId}||${rowGroupId}` : "";
  };

  const applySelectedOpenDRSummaryKeys = (rows = [], summaries = []) => {
    const normalizedSummaries = (summaries || []).map(normalizeOpenDRLookupRow);
    if (!normalizedSummaries.length) return rows;

    const summaryByGroupId = new Map(
      normalizedSummaries
        .filter((summary) => summary.groupId)
        .map((summary) => [String(summary.groupId), summary])
    );
    const singleSummary = normalizedSummaries.length === 1 ? normalizedSummaries[0] : null;

    return (rows || []).map((row) => {
      const normalizedRow = normalizeOpenDRLookupRow(row);
      const matchedSummary = summaryByGroupId.get(String(normalizedRow.drId || "")) || singleSummary;

      if (!matchedSummary) return normalizedRow;

      return {
        ...normalizedRow,
        drNo: normalizedRow.drNo || matchedSummary.drNo || "",
        groupId: normalizedRow.groupId || "",
        drId: normalizedRow.drId || matchedSummary.drId || matchedSummary.groupId || "",
      };
    });
  };

  const getDuplicateOpenDRRows = (incomingRows = []) => {
    const seenKeys = new Set(
      (detailRowsRef.current || [])
        .map(getOpenDRDuplicateKey)
        .filter(Boolean)
    );
    const duplicateRows = [];

    (incomingRows || []).forEach((row) => {
      const key = getOpenDRDuplicateKey(row);
      if (!key) return;

      if (seenKeys.has(key)) {
        duplicateRows.push(row);
        return;
      }

      seenKeys.add(key);
    });

    return duplicateRows;
  };

  const handleInsertSelectedOpenDR = async (payload) => {
   
    const selectedIds = Array.isArray(payload?.data) ? payload.data : [];
    const selectedSummaryRecords = Array.isArray(payload?.records) ? payload.records : [];

    if (!selectedIds.length) {
      updateState({ showOpenDRModal: false });
      return;
    }

    const idString = selectedIds.join(",");
    const requestPayload = {
      json_data: {
        selectedId: idString,
        selectedIds: idString,
      },
    };

    try {
      updateState({ isLoading: true, showSpinner: true });
      const response = await postRequest("getDRSI_Selected", JSON.stringify(requestPayload));

     


      const rawRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : response?.data || response;
      const selectedRecords = Array.isArray(rawRows)
        ? applySelectedOpenDRSummaryKeys(rawRows, selectedSummaryRecords)
        : [];


      if (!selectedRecords.length) {
        useSwalErrorAlert("Open DR", "No SI detail rows were returned for the selected Delivery Receipt record(s).");
        return;
      }


      const duplicateRows = getDuplicateOpenDRRows(selectedRecords);
      if (duplicateRows.length > 0) {
        const duplicateList = duplicateRows
          .map((row) => {
            const drNo = row?.drNo || "";
            const itemCode = row?.itemCode || "";
            return `DR No. ${drNo || "-"} / Item Code ${itemCode || "-"}`;
          })
          .filter(Boolean);
        useSwalErrorAlert(
          "Duplicate Open DR Detail",
          `Duplicate DR item(s) are not allowed:\n${[...new Set(duplicateList)].join("\n")}`
        );
        return;
      }



      const headerUpdates = await buildOpenDRHeaderUpdates(selectedRecords, selectedSummaryRecords);

      insertDetailRows(selectedRecords.map(mapOpenDRRecordToDetailRow), insertAfterIndex);
      setTopTab("details");
      updateState({
        ...headerUpdates,
        showOpenDRModal: false,
        openDRSI_Data_Summary: [],
        openDRSI_Col_Summary: [],
        insertAfterIndex: null,
      });
    } catch (error) {
      console.error("getDRSI_Selected failed:", {
        payload: requestPayload,
        status: error?.response?.status,
        data: error?.response?.data,
        error,
      });
      useSwalErrorAlert("Open DR", getApiErrorMessage(error));
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const normalizeItemModalRecords = (selectedItems) => {
    if (Array.isArray(selectedItems?.records)) {
      return selectedItems.records;
    }
    if (selectedItems?.records) {
      return [selectedItems.records];
    }
    return selectedItems ? [selectedItems] : [];
  };

  const normalizeItemCode = (itemCode) => String(itemCode || "").trim().toUpperCase();

  const getFilteredDuplicateFreeItems = (records = [], currentRowIndex = null) => {
    if (SI_ALLOW_DUPLICATE_ITEMS) {
      return records;
    }

    const existingItemCodes = new Set(
      detailRows
        .filter((_, index) => index !== currentRowIndex)
        .map((row) => normalizeItemCode(row?.itemCode))
        .filter(Boolean)
    );

    const selectedItemCodes = new Set();
    const skippedItemCodes = [];
    const filteredRecords = records.filter((record) => {
      const itemCode = normalizeItemCode(record?.itemCode);
      if (!itemCode) {
        return true;
      }

      if (existingItemCodes.has(itemCode) || selectedItemCodes.has(itemCode)) {
        skippedItemCodes.push(itemCode);
        return false;
      }

      selectedItemCodes.add(itemCode);
      return true;
    });

    if (skippedItemCodes.length > 0) {
      useSwalErrorAlert(
        "Duplicate Item Not Allowed",
        `These item(s) already exist in SI Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
      );
    }

    return filteredRecords;
  };




  const parsePriceMatrixResponse = (response) => {
    const directResult =
      response?.data?.[0]?.result ??
      response?.result ??
      response?.data?.result;
    if (typeof directResult === "string") {
      try {
        const parsed = JSON.parse(directResult);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Error parsing SO price matrix result:", error);
        return [];
      }
    }


    const rawData = response?.data ?? [];
    if (Array.isArray(rawData)) {
      return rawData;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  };

  const fetchPriceMatrixRows = async (
    selectedRecords = [],
    { custCode = billToCustCode || "", docDate = documentDate, headerVatCode = vatCode } = {}
  ) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return [];
    }

    const payload = {
      json_data: {
        docDate,
        custCode,
        vatCode: headerVatCode,
        items: selectedRecords.map((item, index) => ({
          sequence: index + 1,
          itemCode: item?.itemCode || "",
        })),
      },
    };

    try {
      updateState({ isLoading: true });
      const response = await postRequest(
        SI_PRICE_MATRIX_ENDPOINT,
        JSON.stringify(payload)
      );
      return parsePriceMatrixResponse(response);
    } catch (error) {
      console.error("Error fetching SO price matrix:", error);
      return [];
    } finally {
      updateState({ isLoading: false });
    }
  };




  const refreshDetailRowsFromPriceMatrix = async ({ // Assuming SI also uses price matrix
    custCode = billToCustCode || "",
    rows = detailRows,
    docDate = documentDate,
    headerVatCode = vatCode,
  } = {}) => {
    if (!Array.isArray(rows) || rows.length === 0 || !custCode) {
      return;
    }

    const selectedRecords = rows.map((row, index) => ({
      sequence: index + 1,
      itemCode: row?.itemCode || "",
    }));
    const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords, {
      custCode,
      docDate,
      headerVatCode,
    });
    const updatedRows = distributeVatAcrossDetailRows(rows.map((row, index) =>
      applyPriceMatrixToDetailRow(
        row,
        getPriceMatrixRowForItem(priceMatrixRows, row, index)
      )
    ));

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const getPriceMatrixRowForItem = (priceMatrixRows = [], item = {}, index = 0) => { // Assuming SI also uses price matrix
    const itemCode = normalizeItemCode(item?.itemCode);
    const getMatrixItemCode = (priceRow) =>
      priceRow?.itemCode ??
      "";

    return (
      priceMatrixRows.find(
        (priceRow) => normalizeItemCode(getMatrixItemCode(priceRow)) === itemCode
      ) ||
      priceMatrixRows.find(
        (priceRow) => Number(priceRow?.sequence) === index + 1
      ) ||
      {}
    );
  };

  const calculateRowAmountsFromRates = (row) => {
    const discountRateFields = visibleDiscountRateFields;
    const discountAmountFields = visibleDiscountAmountFields;
    const quantity = parseFormattedNumber(row.siQuantity || 0) || 0;
    let unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;
   

    if (vatCodeFADisposal) {
       const vatRow = getAllTopVatRow(vatCodeFADisposal);
      const vatRate = parseFormattedNumber(vatRow?.vatRate || 0) || 0;
      

      unitPrice = vatRate > 0
        ? toFormattedAmountNumber(unitPrice + (unitPrice * (vatRate * 0.01)))
        : unitPrice;
    }


    const grossAmount = toFormattedAmountNumber(quantity * unitPrice);
    let runningBase = grossAmount;
    let totalDiscount = 0;
    const updatedAmounts = {};

    discountRateFields.forEach((rateField, index) => {
      const amountField = discountAmountFields[index];
      const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
      const discountAmount = toFormattedAmountNumber(runningBase * (rateValue * 0.01));

      updatedAmounts[amountField] = formatNumber(discountAmount);
      totalDiscount += discountAmount;
      runningBase = toFormattedAmountNumber(runningBase - discountAmount);
    });
    const netAmount = toFormattedAmountNumber(grossAmount - totalDiscount);
    const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;

    return {
      ...row,
      unitPrice: formatNumber(unitPrice, sellingPriceDecimals),
      grossAmount: formatNumber(grossAmount),
      ...updatedAmounts,
      totDiscount: formatNumber(totalDiscount),
      netAmount: formatNumber(netAmount),
      salesAmount: formatNumber(netAmount - vatAmount),
      // ATC is header-level only, not per detail row.
      atcAmount: formatNumber(0),
      amountDue: formatNumber(0),
    };
  };



  const applyPriceMatrixToDetailRow = (baseRow, priceRow = {}) => {
    if (baseRow.freeItem === "Y") {
      return calculateRowAmountsFromRates({
        ...baseRow,
        unitPrice: formatNumber(0, sellingPriceDecimals),
        ...Object.fromEntries(
          visibleDiscountRateFields.map((field) => [field, formatNumber(0)])
        ),
      });
    }

    const hasPriceMatrix = priceRow && Object.keys(priceRow).length > 0;

    // IMPORTANT:
    // Do not return 0 immediately when price matrix has no sellingPrice.
    // calculateRowAmountsFromRates() uses row.unitPrice, so fallback must include
    // priceRow.unitPrice, baseRow.unitPrice, and baseRow.sellingPrice.
    const getPriceValue = () =>
      priceRow?.sellingPrice ??
      priceRow?.unitPrice ??
      baseRow?.unitPrice ??
      baseRow?.sellingPrice ??
      0;

    const getPmTypeValue = () => priceRow?.pmType ?? baseRow?.pmType ?? "";
    const getPmIdValue = () => priceRow?.pmId ?? baseRow?.pmId ?? "";

    const getDiscountRateValue = (discountNo) =>
      hasPriceMatrix
        ? priceRow?.[`discRate${discountNo}`] ?? baseRow?.[`discRate${discountNo}`] ?? 0
        : baseRow?.[`discRate${discountNo}`] ?? 0;

    const selectedVatCode = priceRow?.vatCode || baseRow.vatCode || vatCode || "";
    const selectedVatRow = getAllTopVatRow(selectedVatCode);

    const updatedRow = {
      ...baseRow,
      pmType: getPmTypeValue(),
      pmId: getPmIdValue(),
      vatCode: selectedVatCode,
      vatRate: formatNumber(selectedVatRow?.vatRate || baseRow?.vatRate || 0),
      unitPrice: formatNumber(getPriceValue(), sellingPriceDecimals),
    };

    visibleDiscountRateFields.forEach((field, index) => {
      updatedRow[field] = formatNumber(getDiscountRateValue(index + 1));
    });

    return calculateRowAmountsFromRates(updatedRow);
  };

  const mapItemRecordToDetailRow = (item = {}) => {
   

    return createSIDetailRow({
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      itemSpecs: item?.itemSpecs || "",
      uomCode: item?.uomCode || "",
      pmType: item?.pmType || "",
      groupId: "",
      pmId: item?.pmId || "",    
      siQuantity: formatNumber( item?.siQuantity ?? 0, quantityDecimals ),
      sellingPrice: formatNumber(item?.sellPrice, sellingPriceDecimals),
      grossAmount: formatNumber(item?.grossAmount ?? 0),
      discRate1: formatNumber(item?.discRate1 ?? 0),
      discRate2: formatNumber(item?.discRate2 ?? 0),
      discRate3: formatNumber(item?.discRate3 ?? 0),
      discRate4: formatNumber(item?.discRate4 ?? 0),
      discRate5: formatNumber(item?.discRate5 ?? 0),
      discRate6: formatNumber(item?.discRate6 ?? 0),
      discRate7: formatNumber(item?.discRate7 ?? 0),
      discRate8: formatNumber(item?.discRate8 ?? 0),
      discAmount1: formatNumber(item?.discAmount1 ?? 0),
      discAmount2: formatNumber(item?.discAmount2 ?? 0),
      discAmount3: formatNumber(item?.discAmount3 ?? 0),
      discAmount4: formatNumber(item?.discAmount4 ?? 0),
      discAmount5: formatNumber(item?.discAmount5 ?? 0),
      discAmount6: formatNumber(item?.discAmount6 ?? 0),
      discAmount7: formatNumber(item?.discAmount7 ?? 0),
      discAmount8: formatNumber(item?.discAmount8 ?? 0),
      totDiscount: formatNumber(item?.totDiscount ?? 0),
      vatCode: item?.vatCode || "",
      vatRate: formatNumber(item?.vatRate ?? 0),
      vatAmount: formatNumber(item?.vatAmount ?? 0),
      salesAmount: formatSalesAmount(item?.netAmount ?? 0, item?.vatAmount ?? 0),
      atcAmount: formatNumber(item?.atcAmount ?? 0),
      amountDue: formatNumber(item?.amountDue ?? 0),
      netAmount: formatNumber(item?.netAmount ?? 0),
      freeItem: item?.freeItem || "",
      quantityPicked: formatNumber(item?.quantityPicked ?? item?.qtyPicked ?? 0, quantityDecimals),
      itemAmount: formatNumber(item?.itemAmount ?? 0),
      drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
    });
  };

  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords); // Assuming SI also uses price matrix
    const rowsToInsert = selectedRecords.map((item, index) => {
      const baseRow = mapItemRecordToDetailRow(item);
      const priceRow = getPriceMatrixRowForItem(priceMatrixRows, item, index);
      return applyPriceMatrixToDetailRow(baseRow, priceRow);
    });

    insertDetailRows(rowsToInsert, insertAfterIndex);
  };






const cancelPickingAllocationForDeletedSIRow = async (row) => {
  const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

  // Only SI02 has FG picking allocation.
  if (String(siTranType || "").toUpperCase() !== "SI02") {
    return true;
  }

  // No picked quantity, no need to call allocation API.
  if (pickedQty <= 0) {
    return true;
  }

  if (!documentID || !row?.groupId) {
    useSwalErrorAlert(
      "Delete SI Detail",
      "Cannot release picking allocation. SI ID or Group ID is missing."
    );
    return false;
  }

  const confirm = await useSwalProceedConfirm(
    "Delete Picked SI Detail?",
    "This line already has picked quantity. Deleting it will release the FG picking allocation.",
    "Yes"
  );

  if (!confirm?.isConfirmed) {
    return false;
  }

  try {
    updateState({ isLoading: true, showSpinner: true });

    await postRequest("getFGUpdateStockAllocation", {
      mode: "CancelAlloc",
      params: JSON.stringify({
        json_data: {
          docCode: "SI",
          docId: documentID,
          groupId: row.groupId,
          userCode: userCode || currentUserRow?.userCode || "",
          reason: "SI detail line deleted.",
        },
      }),
    });

    return true;
  } catch (error) {
    console.error("Failed to release SI FG picking allocation:", error);
    useSwalErrorAlert("Delete SI Detail", getApiErrorMessage(error));
    return false;
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};


const handleDeleteRow = async (index) => {
  const rowToDelete = detailRows?.[index];

  if (!rowToDelete) {
    return;
  }

  const canDelete = await cancelPickingAllocationForDeletedSIRow(rowToDelete);

  if (!canDelete) {
    return;
  }

  const updatedRows = [...detailRows];
  updatedRows.splice(index, 1);

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
  });

  updateTotals(updatedRows);
};

const handleAddRowGL = (index = null) => {
  const newRow = {
    acctCode: "",
    rcCode: "",
    sltypeCode: "CU",
    slCode: "",
    particular: "",
    vatCode: "",
    vatName: "",
    atcCode: "",
    atcName: "",
    debit: "0.00",
    credit: "0.00",
    debitFx1: "0.00",
    creditFx1: "0.00",
    debitFx2: "0.00",
    creditFx2: "0.00",
    slRefNo: "",
    slRefDate: "",
    remarks: "",
  };

  const updatedRows = [...detailRowsGL];
  if (index !== null && index >= 0) {
    updatedRows.splice(index + 1, 0, newRow);
  } else {
    updatedRows.push(newRow);
  }

  updateState({
    detailRowsGL: updatedRows,
    ...getGLTotalsState(updatedRows),
  });
};

const handleDeleteRowGL = (index) => {
  const updatedRows = [...detailRowsGL];
  updatedRows.splice(index, 1);
  updateState({
    detailRowsGL: updatedRows,
    ...getGLTotalsState(updatedRows),
  });
};

const handleDetailChangeGL = async (index, field, value) => {
  const updatedRowsGL = [...(detailRowsGLRef.current || [])];
  let row = { ...updatedRowsGL[index] };

  if (["acctCode", "slCode", "rcCode", "sltypeCode", "vatCode", "atcCode"].includes(field)) {
    const data = await useUpdateRowGLEntries(row, field, value, billToCustCode, docType);
    if (data) {
      row.acctCode = data.acctCode;
      row.sltypeCode = data.sltypeCode;
      row.slCode = data.slCode;
      row.rcCode = data.rcCode;
      row.vatCode = data.vatCode;
      row.vatName = data.vatName;
      row.atcCode = data.atcCode;
      row.atcName = data.atcName;
      row.particular = data.particular;
    }
  }

  if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
    row[field] = value;
    const parsedValue = parseFormattedNumber(value);
    const pairs = {
      debit: "credit",
      credit: "debit",
      debitFx1: "creditFx1",
      creditFx1: "debitFx1",
      debitFx2: "creditFx2",
      creditFx2: "debitFx2",
    };

    if (parsedValue > 0 && pairs[field]) {
      row[pairs[field]] = "0.00";
    }
  }

  if (["slRefNo", "slRefDate", "remarks", "particular", "atcName", "sltypeCode"].includes(field)) {
    row[field] = value;
  }

  updatedRowsGL[index] = row;
  updateState({
    detailRowsGL: updatedRowsGL,
    ...getGLTotalsState(updatedRowsGL),
  });
};

const handleBlurGL = async (index, field, value, autoCompute = false) => {
  const updatedRowsGL = [...(detailRowsGLRef.current || [])];
  const row = { ...updatedRowsGL[index] };
  const parsedValue = parseFormattedNumber(value);
  row[field] = formatNumber(parsedValue);

  if (autoCompute && (withCurr2 || withCurr3)) {
    if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
      const data = await useUpdateRowEditEntries(row, field, value, currCode, currRate, documentDate);
      if (data) {
        row.debit = formatNumber(data.debit);
        row.credit = formatNumber(data.credit);
        row.debitFx1 = formatNumber(data.debitFx1);
        row.creditFx1 = formatNumber(data.creditFx1);
        row.debitFx2 = formatNumber(data.debitFx2);
        row.creditFx2 = formatNumber(data.creditFx2);
      }
    }
  } else {
    const pairs = [
      ["debit", "credit"],
      ["debitFx1", "creditFx1"],
      ["debitFx2", "creditFx2"],
    ];

    pairs.forEach(([a, b]) => {
      if (field === a && parsedValue > 0) {
        row[b] = formatNumber(0);
      } else if (field === b && parsedValue > 0) {
        row[a] = formatNumber(0);
      }
    });
  }

  updatedRowsGL[index] = row;
  updateState({
    detailRowsGL: updatedRowsGL,
    ...getGLTotalsState(updatedRowsGL),
  });
};

const handlePrint = async () => {
 if (!detailRows || detailRows.length === 0) {
      return; // Assuming SI also requires detail rows to print
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};

  const handleOpenAddItemModal = async (overrides = {}) => {
    const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
    const lookupBillTermCode = String(overrides.billtermCode ?? billtermCode ?? "").trim();
    const lookupSalesRepCode = String(overrides.salesRepCode ?? salesRepCode ?? "").trim();

    const fieldsToCheck = {
      "Header : Bill To Customer Code": lookupCustCode,
      "Header : Billing Term": lookupBillTermCode,
      "Header : Sales Rep": lookupSalesRepCode,
    };

    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
    if (!isValid) return;

    updateState({
      showItemModal: true,
      selectionContext: "multiAdd",
      selectedRowIndex: null,
      insertAfterIndex: null,
    });
  };

  const handleAddRowClick = async () => {
    if (documentStatus !== "" || isFormDisabled) return;

    setShowAddTypeDropdown(false);

    const lookupCustCode = String(billToCustCode || "").trim();

    if (!lookupCustCode) {
      const branchIsValid = await useSwalvalidateRequiredFields(
        { "Header : Branch": branchCode },
        "Add SI Detail"
      );
      if (!branchIsValid) return;

      updateState({
        custModalOpen: true,
        modalContext: "addDetail",
      });
      return;
    }


  if (["SI01", "SI03"].includes(String(siTranType || "").toUpperCase())) {
    await handleOpenDRLookup();
    return;
  }

    await handleOpenAddItemModal();
  };

  const getApiErrorMessage = (error) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unknown server error";

  const parseSprocJsonResult = (response) => {
    const rawResult =
      response?.data?.[0]?.result ??
      response?.data?.data?.[0]?.result ??
      response?.Data?.[0]?.result ??
      response?.data?.result ??
      response?.result;

    if (!rawResult) return {};

    if (typeof rawResult === "string") {
      try {
        return JSON.parse(rawResult);
      } catch (error) {
        console.error("Invalid JSON result:", rawResult, error);
        return {};
      }
    }

    return rawResult;
  };

  const getValueFromKeys = (source, keys = []) => {
    if (!source || typeof source !== "object") return undefined;

    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }

    const sourceEntries = Object.entries(source);
    const normalizedKeys = keys.map((key) => String(key).toLowerCase());
    const matchingEntry = sourceEntries.find(([key]) =>
      normalizedKeys.includes(String(key).toLowerCase())
    );

    return matchingEntry?.[1];
  };

  const getPickingResultRows = (result) => {
    if (Array.isArray(result)) return result;

    return [
      result?.dt1,
      result?.detailRows,
      result?.rows,
      result?.data,
      result?.allocations,
    ].find(Array.isArray) || [];
  };

  const getPickingResultRow = (result, row, index) => {
    const resultRows = getPickingResultRows(result);
    if (!resultRows.length) return null;

    const lineNo = String(index + 1);
    const groupId = String(row?.groupId || "");
    const itemCode = String(row?.itemCode || "");

    return (
      resultRows.find((resultRow) => {
        const resultLineNo = String(
          resultRow.lineNo ?? resultRow.lnNo ?? resultRow.ln ?? resultRow.recNo ?? ""
        );
        return resultLineNo && resultLineNo === lineNo;
      }) ||
      resultRows.find((resultRow) => {
        const resultGroupId = String(resultRow.groupId ?? resultRow.groupID ?? "");
        return groupId && resultGroupId === groupId;
      }) ||
      resultRows.find((resultRow) => {
        const resultItemCode = String(resultRow.itemCode ?? resultRow.item_code ?? "");
        return itemCode && resultItemCode === itemCode;
      }) ||
      resultRows[0]
    );
  };

  const getPickingResultNumber = (result, row, index, keys, fallback = 0) => {
    const detailResult = getPickingResultRow(result, row, index);
    const value =
      getValueFromKeys(detailResult, keys) ??
      getValueFromKeys(result, keys) ??
      fallback;

    return parseFormattedNumber(value) || 0;
  };

  const getPickingAllocationAmount = (allocations = []) =>
    (Array.isArray(allocations) ? allocations : []).reduce((total, allocation) => {
      const pickedQty =
        parseFormattedNumber(
          allocation.pickQty ??
            allocation.pickedQty ??
            allocation.quantityPicked ??
            allocation.qtyPicked ??
            allocation.qty ??
            0
        ) || 0;
      const unitCost =
        parseFormattedNumber(
          allocation.unitCost ??
            allocation.wac ??
            allocation.cost ??
            allocation.itemCost ??
            allocation.unitPrice ??
            0
        ) || 0;

      return total + pickedQty * unitCost;
    }, 0);

  const buildPickingBasePayload = (row, index) => ({
    docCode: "SI",
    docNo: documentNo || "",
    docId: documentID || "",
    docDate: documentDate || null,
    branchCode: branchCode || "",
    groupId: row?.groupId || "",
    lineNo: index + 1,
    itemCode: row?.itemCode || "",
    requestedQty: parseFormattedNumber(row?.siQuantity || 0) || 0,
    userCode: userCode || currentUserRow?.userCode || "",
  });

  const buildAutoPickingAllocations = (stockRows = [], requestedQty = 0, row = {}) => {
    let remainingQty = Math.max(parseFormattedNumber(requestedQty || 0) || 0, 0);

    return [...(Array.isArray(stockRows) ? stockRows : [])]
      .map((stockRow, index) => ({
        ...stockRow,
        priorityNo: stockRow.priorityNo || index + 1,
        remainingAvailable: parseFormattedNumber(stockRow.remainingAvailable || 0) || 0,
        isBlocked:
          stockRow.isBlocked ||
          (parseFormattedNumber(stockRow.remainingAvailable || 0) || 0) <= 0 ||
          ["HOLD", "BLOCKED", "QUARANTINE"].includes(String(stockRow.qualityStatus || "").toUpperCase()),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.bestBeforeDate || "").getTime();
        const dateB = new Date(b.bestBeforeDate || "").getTime();
        const safeDateA = Number.isFinite(dateA) ? dateA : Number.MAX_SAFE_INTEGER;
        const safeDateB = Number.isFinite(dateB) ? dateB : Number.MAX_SAFE_INTEGER;
        if (safeDateA !== safeDateB) return safeDateA - safeDateB;
        return Number(a.priorityNo || 0) - Number(b.priorityNo || 0);
      })
      .reduce((allocations, stockRow) => {
        if (stockRow.isBlocked || remainingQty <= 0) return allocations;

        const pickQty = Math.min(stockRow.remainingAvailable, remainingQty);
        remainingQty -= pickQty;

        if (pickQty <= 0) return allocations;

        allocations.push({
          groupId: row.groupId || "",
          sourceDocType: "SI",
          sourceLineNo: "",
          itemCode: row.itemCode || "",
          stockCardRefId: stockRow.stockCardRefId,
          lotNo: stockRow.lotNo,
          qualityStatus: stockRow.qualityStatus,
          bestBeforeDate: stockRow.bestBeforeDate,
          fgFifoLocId: stockRow.fgFifoLocId || null,
          fgWacLocId: stockRow.fgWacLocId || null,
          warehouseCode: stockRow.warehouseCode,
          whouseCode: stockRow.warehouseCode,
          warehouseName: stockRow.warehouseName,
          locationCode: stockRow.locationCode,
          locCode: stockRow.locationCode,
          priorityNo: stockRow.priorityNo,
          sourceDocCode: stockRow.sourceDocCode || null,
          sourceDocNo: stockRow.sourceDocNo || null,
          sourceDocDate: stockRow.sourceDocDate || null,
          sourceDocId: stockRow.sourceDocId || null,
          sourceGroupId: stockRow.sourceGroupId || null,
          fifoDocCode: stockRow.fifoDocCode || null,
          fifoDocNo: stockRow.fifoDocNo || null,
          orderId: stockRow.orderId || null,
          unitCost: parseFormattedNumber(stockRow.unitCost || 0) || 0,
          wacKey: stockRow.wacKey || null,
          wac: parseFormattedNumber(stockRow.wac || 0) || 0,
          pickQty,
        });

        return allocations;
      }, []);
  };

  const handleOpenDRLookup = async (overrides = {}) => {
    const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

    if (!lookupCustCode) {
      const branchIsValid = await useSwalvalidateRequiredFields(
        { "Header : Branch": lookupBranchCode },
        "Open DR Lookup"
      );
      if (!branchIsValid) return;

      updateState({
        custModalOpen: true,
        modalContext: siTranType === "SI03" ? "openFADS" : "openDR",
      });
      return;
    }

    const fieldsToCheck = {
      "Header : Bill To Customer Code": lookupCustCode,
      "Header : Branch": lookupBranchCode,
    };

    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Open DR Lookup");
    if (!isValid) return;

    try {
      updateState({ isLoading: true, showSpinner: true });

      const endpoint = "getDRSI_OpenSummary";
      const payload = {
          custCode: lookupCustCode,
          billToCustCode: lookupCustCode,
          branchCode: lookupBranchCode,
          siTranType: siTranType || "",
        };

     console.log("GetDRSI_OpenSummary payload:", payload);
      const response = await fetchDataJson(endpoint, payload);

      const drRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result).map(normalizeOpenDRLookupRow)
        : [];

      if (!drRows.length) {
        useSwalErrorAlert(
          "Open DR",
          "There are no open Delivery Receipt records for the selected customer/branch."
        );
        return;
      }

      const summaryColumns = await selectedHSColConfig(endpoint);
      updateState({
        openDRSI_Data_Summary: drRows,
        openDRSI_Col_Summary: summaryColumns,
        showOpenDRModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch Open DR:", error);
      useSwalErrorAlert("Open DR", getApiErrorMessage(error));
      updateState({
        openDRSI_Data_Summary: [],
        openDRSI_Col_Summary: [],
      });
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return; // Assuming SI also requires detail rows to cancel
      }

  if (documentID && (documentStatus === '')) {
    updateState({ showCancelModal: true });
  }
};

const handleAttach = async () => {
  if (documentID ) {
    updateState({ showAttachModal: true });
   }
};

const handleCopy = async () => {
  if (!detailRows || detailRows.length === 0) {
    return;
  }  
  if (documentID) {
    const nextDocumentDate = useGetCurrentDayV2();
    const copiedDetailRows = detailRows.map((row) => ({
      ...row,
      siStat: "F",
      drQuantity: formatNumber(0, quantityDecimals),
      siQuantity: formatNumber(0, quantityDecimals),
      groupId: "",
      pmId: "",
      pmType: "",
    }));
    
    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "OPEN",
      siStatus: "O",
      documentDate: nextDocumentDate,
      refSiNo1: "",
      refSiNo2: "",
      noReprints: "0",
      detailRows: copiedDetailRows,
    });
  }
};

//  ** View Document and Transaction History Retrieval ***
const cleanUrl = useCallback(() => {
  window.history.replaceState({}, "", window.location.origin);
}, []);

const handleHistoryRowPick = useCallback(
  async (row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
  
    await fetchTranData(docNo, branchCode);
    setTopTab("details");
    cleanUrl(); //
  },
  [fetchTranData, cleanUrl]
);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const docNo = params.get("siNo");
  const branchCode = params.get("branchCode");
  
  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

const handleTranDocNoRetrieval = async (data) => {

    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({showAllTranDocNo: data.modalClose});
};

const handleTranDocNoSelection = async (data) => {

    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};

const handleCloseCancel = async (confirmation) => {
    if(confirmation && documentStatus === "" && documentID !== null ) {
      
      const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
      if (result.success)
      {
       useSwalSuccessAlert("Success","Cancellation Completed")
      }
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showCancelModal: false});
};

const handleCloseSignatory = async (mode) => {

    updateState({
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
    await useHandlePrint(documentID, docType, mode,userCode);

    updateState({
      showSpinner: false
    });

};

const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};

  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ custModalOpen: false });
        return;
    }

    updateState({ custModalOpen: false });
    updateState({ isLoading: true });

    try {

        const address = selectedData?.addr || "";
        const selectedVatCode = selectedData?.vatCode || "";
        const selectedVatRow = getAllTopVatRow(selectedVatCode);
        const selectedVatName = selectedVatRow?.vatName || selectedData?.vatName || "";
        const selectedAtcCode = selectedData?.atcCode || "";
        const selectedAtcRow = getAllTopATCRow(selectedAtcCode);
        const selectedAtcName = selectedAtcRow?.atcName || selectedData?.atcName || "";
        const custDetails = {            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
            attention: selectedData?.attention || '',
            billtermCode: selectedData?.billtermCode || '',
            billtermName: selectedData?.billtermName || '',
            salesRepCode: selectedData?.salesRepCode || '',
            salesRepName: selectedData?.salesRepName || '',
            vatCode: selectedVatCode,
            vatName: selectedVatName,
            atcCode: selectedAtcCode,
            atcName: selectedAtcName,

        };
        const nextBillToCustCode = selectedData?.custCode || "";
        const shouldRepriceDetailRows =
          detailRows.length > 0 &&
          String(nextBillToCustCode).trim() !== "" &&
          String(nextBillToCustCode).trim() !== String(billToCustCode || "").trim();
        updateState(
            {
                billToCustName: selectedData.custName,
                billToCustCode: selectedData.custCode,
                vatCode: selectedVatCode,
                vatName: selectedVatName,
                atcCode: selectedAtcCode,
                atcName: selectedAtcName,
                custModalOpen: false,
                modalContext: "",
            }
        );

        if (!selectedData.currCode) {
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            if (response.success) {
                const customerRow = JSON.parse(response.data[0].result)?.[0] || {};
                custDetails.currCode = customerRow?.currCode || custDetails.currCode;
                custDetails.attention = customerRow?.custContact || custDetails.attention;
                custDetails.billtermCode = customerRow?.billtermCode || custDetails.billtermCode;
                custDetails.billtermName = customerRow?.billtermName || custDetails.billtermName;
                custDetails.salesRepCode = customerRow?.salesRepCode || custDetails.salesRepCode;
                custDetails.vatCode = customerRow?.vatCode || custDetails.vatCode;
                const customerVatRow = getAllTopVatRow(custDetails.vatCode);
                custDetails.vatName = customerVatRow?.vatName || customerRow?.vatName || custDetails.vatName;
                custDetails.atcCode = customerRow?.atcCode || custDetails.atcCode;
                const customerAtcRow = getAllTopATCRow(custDetails.atcCode);
                custDetails.atcName = customerAtcRow?.atcName || customerRow?.atcName || custDetails.atcName;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        const custVatRow = getAllTopVatRow(custDetails.vatCode);
        custDetails.vatName = custVatRow?.vatName || custDetails.vatName;
        const custAtcRow = getAllTopATCRow(custDetails.atcCode);
        custDetails.atcName = custAtcRow?.atcName || custDetails.atcName;

        if (custDetails.salesRepCode) {
          const salesRepRow = await useTopSalesRepRow(custDetails.salesRepCode);
          custDetails.salesRepName = salesRepRow?.salesRepName || custDetails.salesRepName;
        }

     
        await Promise.all([
            handleSelectCurrency(custDetails.currCode),
            handleSelectBillTerm(custDetails.billtermCode),
            updateState({
            contactPerson: custDetails.attention,
            salesRepCode: custDetails.salesRepCode,
            salesRepName: custDetails.salesRepName,
            vatCode: custDetails.vatCode,
            vatName: custDetails.vatName,
            atcCode: custDetails.atcCode,
            atcName: custDetails.atcName,
          })
        ]);

        if (shouldRepriceDetailRows) {
            await refreshDetailRowsFromPriceMatrix({
              custCode: nextBillToCustCode,
              headerVatCode: custDetails.vatCode || vatCode,
            });
        }

        if (modalContext === "addDetail" || modalContext === "openDR") {
          const nextCustomerCode = custDetails.custCode || selectedData?.custCode || "";
          const nextBillTermCode = custDetails.billtermCode || "";
          const nextSalesRepCode = custDetails.salesRepCode || "";

          if (["SI01", "SI03"].includes(String(siTranType || "").toUpperCase()) || modalContext === "openDR") {
            await handleOpenDRLookup({
              billToCustCode: nextCustomerCode,
              branchCode,
            });
          } else {
            await handleOpenAddItemModal({
              billToCustCode: nextCustomerCode,
              billtermCode: nextBillTermCode,
              salesRepCode: nextSalesRepCode,
            });
          }
        }

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
       updateState({ isLoading: false, modalContext: "" });
    }
};

  const computeTotalsFromRows = (rows = [], atcCodeOverride = atcCode) => {
    let totalGrossAmt = 0;
    let totalDiscAmt = 0;
    let totalVatAmt = 0;
    let totalSalesAmt = 0;
    let totalNetAmt = 0;

    rows.forEach((row) => {
      totalGrossAmt += toFormattedAmountNumber(row.grossAmount || 0);
      totalDiscAmt += toFormattedAmountNumber(row.totDiscount || 0);
      totalVatAmt += toFormattedAmountNumber(row.vatAmount || 0);
      totalNetAmt += toFormattedAmountNumber(row.netAmount || 0);
    });

    totalSalesAmt = toFormattedAmountNumber(totalNetAmt - totalVatAmt);

    const totalAtcAmt = toFormattedAmountNumber(
      getAllTopATCAmount(atcCodeOverride, totalSalesAmt)
    );
    const totalAmountDue = toFormattedAmountNumber(totalNetAmt - totalAtcAmt);

    return {
      totalGrossAmt,
      totalDiscAmt,
      totalVatAmt,
      totalAtcAmt,
      totalSalesAmt,
      totalNetAmt,
      totalAmountDue,
    };
  };

  const updateTotals = (rows = [], atcCodeOverride = atcCode) => {
    const {
      totalGrossAmt,
      totalDiscAmt,
      totalVatAmt,
      totalAtcAmt,
      totalSalesAmt,
      totalNetAmt,
      totalAmountDue,
    } = computeTotalsFromRows(rows, atcCodeOverride);

    updateTotalsDisplay(
      totalGrossAmt,
      totalDiscAmt,
      totalVatAmt,
      totalAtcAmt,
      totalSalesAmt,
      totalNetAmt,
      totalAmountDue,
      atcCodeOverride
    );
  };

  const buildSiDataForGl = (rows = detailRows, glRows = [], headerOverrides = {}) => {
    const nextVatCode =
      headerOverrides.vatCode !== undefined ? headerOverrides.vatCode : vatCode;
    const nextAtcCode =
      headerOverrides.atcCode !== undefined ? headerOverrides.atcCode : atcCode;
    const totalValues = computeTotalsFromRows(rows, nextAtcCode);

    return {
      branchCode,
      siNo: documentNo || "",
      siId: documentID || "",
      siDate: documentDate,
      sitranType: siTranType,
      billtermCode,
      custCode: billToCustCode,
      custName: billToCustName,
      attention: contactPerson,
      refSiNo1,
      refSiNo2,
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      atcAmount: totalValues.totalAtcAmt,
      atcCode: nextAtcCode || "",
      vatCode: nextVatCode || "",
      dueDate: dueDate || "",
      remarks: remarks || "",
      userCode,
      customerPoNo: customerPoNo || "",
      customerPoDate: customerPoDate || null,
      salesRepCode,
      salesRepName,
      soStatus: siStatus || "O",
      dt1: rows.map((row, index) => ({
        lnNo: String(index + 1),
        pickStat: row.siStat || "F",
        siStat: row.siStat || "F",
        drNo: row.drNo || "",
        drId: row.drId || "",
        soId: row.soId || "",
        groupId: row.groupId || "",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        itemSpecs: row.itemSpecs || "",
        uomCode: row.uomCode || "",
        pmType: row.pmType || "",
        pmId: row.pmId || "",
        siQuantity: parseFormattedNumber(row.siQuantity || 0),
        unitPrice: parseFormattedNumber(row.unitPrice || 0),
        grossAmount: parseFormattedNumber(row.grossAmount || 0),
        discRate1: parseFormattedNumber(row.discRate1 || 0),
        discRate2: parseFormattedNumber(row.discRate2 || 0),
        discRate3: parseFormattedNumber(row.discRate3 || 0),
        discRate4: parseFormattedNumber(row.discRate4 || 0),
        discRate5: parseFormattedNumber(row.discRate5 || 0),
        discRate6: parseFormattedNumber(row.discRate6 || 0),
        discRate7: parseFormattedNumber(row.discRate7 || 0),
        discRate8: parseFormattedNumber(row.discRate8 || 0),
        discAmount1: parseFormattedNumber(row.discAmount1 || 0),
        discAmount2: parseFormattedNumber(row.discAmount2 || 0),
        discAmount3: parseFormattedNumber(row.discAmount3 || 0),
        discAmount4: parseFormattedNumber(row.discAmount4 || 0),
        discAmount5: parseFormattedNumber(row.discAmount5 || 0),
        discAmount6: parseFormattedNumber(row.discAmount6 || 0),
        discAmount7: parseFormattedNumber(row.discAmount7 || 0),
        discAmount8: parseFormattedNumber(row.discAmount8 || 0),
        totDiscount: parseFormattedNumber(row.totDiscount || 0),
        vatCode: row.vatCode || "",
        vatRate: parseFormattedNumber(row.vatRate || 0),
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        salesAmount: parseFormattedNumber(row.salesAmount || 0),
        atcAmount: parseFormattedNumber(row.atcAmount || 0),
        amountDue: parseFormattedNumber(row.amountDue || 0),
        netAmount: parseFormattedNumber(row.netAmount || 0),
        freeItem: row.freeItem || "",
        quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
        itemAmount: parseFormattedNumber(row.itemAmount || 0),
        drQuantity: parseFormattedNumber(row.drQuantity || 0),
      })),
      dt2: glRows.map((entry, index) => ({
        recNo: String(index + 1),
        acctCode: entry.acctCode || "",
        rcCode: entry.rcCode || "",
        sltypeCode: entry.sltypeCode || "",
        slCode: entry.slCode || "",
        particular: entry.particular || "",
        vatCode: entry.vatCode || "",
        vatName: entry.vatName || "",
        atcCode: entry.atcCode || "",
        atcName: entry.atcName || "",
        debit: parseFormattedNumber(entry.debit || 0),
        credit: parseFormattedNumber(entry.credit || 0),
        debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
        creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
        debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
        creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
        slRefNo: entry.slRefNo || "",
        slRefDate: entry.slRefDate || null,
        remarks: entry.remarks || "",
        dt1Lineno: entry.dt1Lineno || "",
      })),
    };
  };

  const regenerateGlEntriesForRows = async (rows, headerOverrides = {}) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      updateState({ detailRowsGL: [] });
      return;
    }

    try {
      updateState({ detailRowsGL: [], isGeneratingGL: true });
      const newGlEntries = await useGenerateGLEntries(
        docType,
        buildSiDataForGl(rows, [], headerOverrides)
      );
      updateState({
        detailRowsGL: newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
        isGeneratingGL: false,
      });
    } catch (error) {
      updateState({ detailRowsGL: [], isGeneratingGL: false });
      console.error(error);
    }
  };

const handleCloseRcModal = async (selectedRc) => {
  if (modalContext === "headerRc" && selectedRc) {
    updateState({
      rcCode: selectedRc.rcCode || "",
      rcName: selectedRc.rcName || "",
      showRcModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  if (modalContext === "glRC" && selectedRc && selectedRowIndex !== null) {
    const result = await useTopRCRow(selectedRc.rcCode);
    if (result) {
      handleDetailChangeGL(selectedRowIndex, "rcCode", result);
    }
  }

  updateState({
    showRcModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
};

const handleCloseATCModal = async (selectedATC) => {
  if (!selectedATC) {
    updateState({ showATCModal: false, selectedRowIndex: null, modalContext: "" });
    return;
  }

  if (modalContext === "detailATC" && selectedRowIndex !== null) {
    const updatedRows = [...detailRows];
    updatedRows[selectedRowIndex] = {
      ...updatedRows[selectedRowIndex],
      atcCode: selectedATC.atcCode || "",
    };

    updateState({
      detailRows: updatedRows,
      showATCModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  if (modalContext === "glATC" && selectedRowIndex !== null) {
    const result = getAllTopATCRow(selectedATC.atcCode);
    if (result) {
      handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }

    updateState({
      showATCModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  const nextAtcCode = selectedATC.atcCode || "";
  const normalizedRows = distributeVatAcrossDetailRows(detailRowsRef.current || detailRows, {
    atcCode: nextAtcCode,
  });

  updateState({
    atcCode: nextAtcCode,
    atcName: selectedATC.atcName || "",
    detailRows: normalizedRows,
    showATCModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
  updateTotals(normalizedRows, nextAtcCode);
  await regenerateGlEntriesForRows(normalizedRows, { atcCode: nextAtcCode });
};

const handleCloseVatModal = async (selectedVat) => {
  const closeContext = modalContext;
  const closeRowIndex = selectedRowIndex;

  updateState({
    showVatModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });

  if (!selectedVat) return;

  try {
    const selectedVatCode =
      selectedVat?.vatCode ||
      selectedVat?.vat_code ||
      selectedVat?.VAT_CODE ||
      selectedVat?.code ||
      "";

    const selectedVatRow = getAllTopVatRow(selectedVatCode) || selectedVat || {};

    const nextVatCode =
      selectedVatRow?.vatCode ||
      selectedVatRow?.vat_code ||
      selectedVatRow?.VAT_CODE ||
      selectedVatCode ||
      "";

    const nextVatName =
      selectedVatRow?.vatName ||
      selectedVatRow?.vat_name ||
      selectedVatRow?.VAT_NAME ||
      selectedVatRow?.vatDesc ||
      selectedVatRow?.vat_desc ||
      selectedVatRow?.VAT_DESC ||
      selectedVat?.vatName ||
      selectedVat?.vatDesc ||
      "";

    const nextVatRate = formatNumber(
      selectedVatRow?.vatRate ??
      selectedVatRow?.vat_rate ??
      selectedVatRow?.VAT_RATE ??
      selectedVat?.vatRate ??
      selectedVat?.vat_rate ??
      0
    );

    if (!nextVatCode) {
      useSwalErrorAlert(
        "Invalid VAT",
        "Selected VAT did not return a valid VAT Code."
      );
      return;
    }

    if (closeContext === "detailVAT" && closeRowIndex !== null) {
      const updatedRows = [...(detailRowsRef.current || [])];
      const currentRow = updatedRows[closeRowIndex];

      if (!currentRow) return;

      updatedRows[closeRowIndex] = recalculateSODetailRow(
        {
          ...currentRow,
          vatCode: nextVatCode,
          vatRate: nextVatRate,
          vatAmount: "0.00",
        },
        "vatCode"
      );

      const normalizedRows = distributeVatAcrossDetailRows(updatedRows, {
        vatCode: nextVatCode,
        atcCode,
      });

      updateState({
        detailRows: normalizedRows,
      });

      updateTotals(normalizedRows);
      await regenerateGlEntriesForRows(normalizedRows, {
        vatCode: nextVatCode,
        atcCode,
      });
      return;
    }

    if (closeContext === "glVAT" && closeRowIndex !== null) {
      await handleDetailChangeGL(closeRowIndex, "vatCode", {
        ...selectedVatRow,
        vatCode: nextVatCode,
        vatName: nextVatName,
        vatRate: nextVatRate,
      });
      return;
    }

    const updatedRows = (detailRowsRef.current || detailRows || []).map((row) =>
      recalculateSODetailRow(
        {
          ...row,
          vatCode: nextVatCode,
          vatRate: nextVatRate,
          vatAmount: "0.00",
        },
        "vatCode"
      )
    );

    const normalizedRows = distributeVatAcrossDetailRows(updatedRows, {
      vatCode: nextVatCode,
      atcCode,
    });

    updateState({
      vatCode: nextVatCode,
      vatName: nextVatName,
      detailRows: normalizedRows,
      showVatModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });

    updateTotals(normalizedRows);
    await regenerateGlEntriesForRows(normalizedRows, {
      vatCode: nextVatCode,
      atcCode,
    });
  } catch (error) {
    console.error("Error applying selected VAT:", error);
    useSwalErrorAlert(
      "VAT Selection Error",
      error?.message || "Unable to apply the selected VAT."
    );
  }
};

const handleCloseAccountModal = (selectedAccount) => {
  if (selectedAccount && selectedRowIndex !== null) {
    handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
  }

  updateState({
    showAccountModal: false,
    selectedRowIndex: null,
    accountModalSource: null,
  });
};

const handleCloseSlModalGL = (selectedSl) => {
  if (selectedSl && selectedRowIndex !== null) {
    handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
  }

  updateState({
    showSlModal: false,
    selectedRowIndex: null,
  });
};

const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
      branchCode: selectedBranch.branchCode,
      branchName:selectedBranch.branchName
      })
    }
    updateState({ branchModalOpen: false });
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
    handleSelectCurrency(selectedCurrency.currCode);
  };
    updateState({ currencyModalOpen: false });
  }

  const handleSelectCurrency = async (currCode) => {
    if (currCode) {

     const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate = currCode === glCurrDefault
          ? defaultCurrRate
          : await useTopForexRate(currCode, documentDate);
        
        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate),6)
        });
      }
  }
};

const handleCloseSalesRepModal = (selectedSalesRep) => {
  if (selectedSalesRep) {
    updateState({
      salesRepCode: selectedSalesRep.salesRepCode || "",
      salesRepName: selectedSalesRep.salesRepName || "",
      showSalesRepModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  updateState({
    showSalesRepModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
};

const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
    handleSelectBillTerm(selectedBillTerm.billtermCode);
  };
    updateState({ billtermModalOpen: false });
}

const handleOpenItemPickingModal = async (index) => {
  const row = detailRowsRef.current?.[index];
  const requestedQty = parseFormattedNumber(row?.siQuantity || 0) || 0;

  if (!canUsePickingControls) return;

  if (!documentID || !documentNo) {
    useSwalErrorAlert("Item Picking", "Please save the SI first before opening the picking allocation.");
    return;
  }

  if (!row?.itemCode) {
    useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
    return;
  }

  if (!row?.groupId) {
    useSwalErrorAlert("Item Picking", "Please save and reload the SI first before opening the picking allocation.");
    return;
  }

  if (requestedQty <= 0) {
    useSwalErrorAlert("Item Picking", "SI Quantity must be greater than zero before opening the picking allocation.");
    return;
  }

  try {
    updateState({ isLoading: true, showSpinner: true });

    const response = await postRequest("getFGUpdateStockAllocation", {
      mode: "GetOpenStock",
      params: JSON.stringify({
        json_data: buildPickingBasePayload(row, index),
      }),
    });

    const result = parseSprocJsonResult(response);
    setItemPickingStockRows(Array.isArray(result?.stockRows) ? result.stockRows : []);
    setItemPickingExistingAllocations(
      Array.isArray(result?.existingAllocations) ? result.existingAllocations : []
    );
    setItemPickingRowIndex(index);
    setShowItemPickingModal(true);
  } catch (error) {
    console.error("Failed to load FG picking allocation:", error);
    useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleCloseItemPickingModal = () => {
  setShowItemPickingModal(false);
  setItemPickingRowIndex(null);
  setItemPickingStockRows([]);
  setItemPickingExistingAllocations([]);
};

const handleConfirmItemPicking = async (payload) => {
  if (itemPickingRowIndex === null || itemPickingRowIndex === undefined) return;
  if (!canUsePickingControls) return;

  const updatedRows = [...(detailRowsRef.current || [])];
  const currentRow = updatedRows[itemPickingRowIndex];
  if (!currentRow) return;

  try {
    updateState({ isLoading: true, showSpinner: true });

    const basePayload = buildPickingBasePayload(currentRow, itemPickingRowIndex);
    const pickedAllocations = Array.isArray(payload?.allocations) ? payload.allocations : [];

    const response = await postRequest("getFGUpdateStockAllocation", {
      mode: "SaveAlloc",
      params: JSON.stringify({
        json_data: {
          ...basePayload,
          dt1: pickedAllocations,
        },
      }),
    });

    const result = parseSprocJsonResult(response);
    const totalPicked = getPickingResultNumber(
      result,
      currentRow,
      itemPickingRowIndex,
      ["totalAllocated"],
      payload?.totalPicked ?? 0
    );
    const itemAmount = getPickingResultNumber(
      result,
      currentRow,
      itemPickingRowIndex,
      ["itemAmount"],
      totalPicked <= 0
        ? 0
        : getPickingAllocationAmount(pickedAllocations) || currentRow?.itemAmount || 0
    );
    const siQuantityValue = parseFormattedNumber(currentRow?.siQuantity || 0) || 0;

    updatedRows[itemPickingRowIndex] = {
      ...currentRow,
      siStat:
        totalPicked <= 0
          ? "F"
          : siQuantityValue > 0 && totalPicked >= siQuantityValue
            ? "P"
            : "T",
      quantityPicked: formatNumber(totalPicked, quantityDecimals),
      itemAmount: itemAmount,
      pickingAllocations: pickedAllocations,
      pickingOrderedStockRows: payload?.orderedStockRows || [],
    };

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    await fetchTranData(documentNo, branchCode);
    handleCloseItemPickingModal();
  } catch (error) {
    console.error("Failed to save FG picking allocation:", error);
    useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleBulkPickingAllocation = async (mode) => {
  const isRelease = mode === "release";
  const actionLabel = isRelease ? "Release All" : "Allocate All";
  const rows = detailRowsRef.current || [];

  if (!rows.length || !canUsePickingControls) return;

  if (!documentID || !documentNo) {
    useSwalErrorAlert("Item Picking", "Please save the SI first before using Allocate All or Release All.");
    return;
  }

  const confirm = await useSwalProceedConfirm(
    `${actionLabel}?`,
    isRelease
      ? "This will release all picking allocations for the SI details."
      : "This will automatically pick available stock for all eligible SI details.",
    "Yes"
  );

  if (!confirm?.isConfirmed) return;

  try {
    updateState({ isLoading: true, showSpinner: true });

    const updatedRows = [...rows];
    const bulkRows = rows
      .map((row, index) => ({
        row,
        index,
        requestedQty: parseFormattedNumber(row?.siQuantity || 0) || 0,
      }))
      .filter(({ row, requestedQty }) =>
        String(row?.itemCode || "").trim() &&
        String(row?.groupId || "").trim() &&
        (isRelease || requestedQty > 0)
      );

    if (bulkRows.length === 0) {
      useSwalErrorAlert(
        "Item Picking",
        isRelease
          ? "There are no valid SI detail rows to release."
          : "There are no valid SI detail rows to allocate."
      );
      return;
    }

    if (isRelease) {
      await postRequest("getFGUpdateStockAllocation", {
        mode: "BulkCancelAlloc",
        params: JSON.stringify({
          json_data: {
            docCode: "SI",
            docId: documentID,
            userCode: userCode || currentUserRow?.userCode || "",
            reason: "SI bulk release allocation.",
            dt1: bulkRows.map(({ row, index }) => ({
              groupId: row.groupId || "",
              lineNo: index + 1,
              itemCode: row.itemCode || "",
            })),
          },
        }),
      });

      bulkRows.forEach(({ index }) => {
        updatedRows[index] = {
          ...updatedRows[index],
          siStat: "F",
          quantityPicked: formatNumber(0, quantityDecimals),
          itemAmount: formatNumber(0),
          pickingAllocations: [],
        };
      });
    } else {
      const response = await postRequest("getFGUpdateStockAllocation", {
        mode: "BulkAutoAlloc",
        params: JSON.stringify({
          json_data: {
            docCode: "SI",
            docNo: documentNo || "",
            docId: documentID || "",
            docDate: documentDate || null,
            branchCode: branchCode || "",
            userCode: userCode || currentUserRow?.userCode || "",
            dt1: bulkRows.map(({ row, index, requestedQty }) => ({
              groupId: row.groupId || "",
              lineNo: index + 1,
              itemCode: row.itemCode || "",
              requestedQty,
            })),
          },
        }),
      });

      const result = parseSprocJsonResult(response);

      bulkRows.forEach(({ row, index, requestedQty }) => {
        const detailResult = getPickingResultRow(result, row, index);
        const totalPicked = parseFormattedNumber(
          detailResult?.totalAllocated ?? detailResult?.totalPicked ?? 0
        ) || 0;
        const itemAmount = parseFormattedNumber(
          detailResult?.itemAmount ??
          (totalPicked <= 0 ? 0 : updatedRows[index]?.itemAmount || 0)
        ) || 0;

        updatedRows[index] = {
          ...updatedRows[index],
          siStat:
            detailResult?.pickStat ||
            (totalPicked <= 0
              ? "F"
              : requestedQty > 0 && totalPicked >= requestedQty
                ? "P"
                : "T"),
          quantityPicked: formatNumber(totalPicked, quantityDecimals),
          itemAmount: itemAmount,
          pickingAllocations: [],
        };
      });
    }

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    await fetchTranData(documentNo, branchCode);
  } catch (error) {
    console.error(`Failed to ${actionLabel.toLowerCase()} picking allocation:`, error);
    useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleCloseItemModal = async (selectedItems) => {
  const records = normalizeItemModalRecords(selectedItems);
  
  if (selectionContext === "rowItemLookup" && selectedRowIndex !== null && records.length > 0) {
    const [selectedItem] = getFilteredDuplicateFreeItems(records, selectedRowIndex);
    if (!selectedItem) {
      updateState({
        showItemModal: false,
        selectedRowIndex: null,
        insertAfterIndex: null,
        selectionContext: "",
      });
      return;
    }
    const priceMatrixRows = await fetchPriceMatrixRows([selectedItem]);
    const updatedRows = [...detailRows];
    const baseRow = {
      ...updatedRows[selectedRowIndex],
      itemCode: selectedItem?.itemCode || "",
      itemName: selectedItem?.itemName || "",
      itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
      uomCode: selectedItem?.uomCode || "",
      pmType: selectedItem?.pmType || updatedRows[selectedRowIndex]?.pmType || "",
      groupId: updatedRows[selectedRowIndex]?.groupId || "",
      pmId: selectedItem?.pmId || updatedRows[selectedRowIndex]?.pmId || "",
    };
    const priceRow = getPriceMatrixRowForItem(priceMatrixRows, selectedItem);
    updatedRows[selectedRowIndex] = applyPriceMatrixToDetailRow(baseRow, priceRow);
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
    updateState({ detailRows: normalizedRows });
    updateTotals(normalizedRows);
  }

  if (selectionContext === "multiAdd" && records.length > 0) {
    const filteredRecords = getFilteredDuplicateFreeItems(records);
    if (filteredRecords.length > 0) {
      await handleInsertSelectedItems(filteredRecords);
    }
  }

  updateState({
    showItemModal: false,
    selectedRowIndex: null,
    insertAfterIndex: null,
    selectionContext: "",
  });
};

const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {

     const result = await useTopBillTermRow(billtermCode);
      if (result) {
      updateState({
        billtermCode:result.billtermCode,
        billtermName:result.billtermName,
        daysDue: result.daysDue,
        dueDate: calculateDueDate(documentDate, result.daysDue),
        })
      }
    }
  };

const validateSIQuantity = (index, inputValue) => {
  const row = detailRowsRef.current[index];
  const drQty = parseFormattedNumber(row?.drQuantity || 0) || 0;
  const siQty = parseFormattedNumber(inputValue || 0) || 0;
  const rowStatus = String(row?.siStat || "").toUpperCase();

  if (drQty > 0 && rowStatus === "F" && siQty < drQty) {
    const originalValue = row?.siQuantity ?? formatNumber(0, quantityDecimals);

    useSwalErrorAlert("Invalid Quantity", "SI Quantity must be greater than or equal to DR Quantity.");
    
    const updatedRows = [...detailRowsRef.current];
    updatedRows[index] = {
      ...updatedRows[index],
      siQuantity: originalValue,
    };

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

    return false;
  }

  delete originalSOQuantityRef.current[index];
  return true;
};


const recalculateSODetailRow = (row = {}, changedField = "") => {
  const discountRateFields = [
    "discRate1",
    "discRate2",
    "discRate3",
    "discRate4",
    "discRate5",
    "discRate6",
    "discRate7",
    "discRate8",
  ];
  const discountAmountFields = [
    "discAmount1",
    "discAmount2",
    "discAmount3",
    "discAmount4",
    "discAmount5",
    "discAmount6",
    "discAmount7",
    "discAmount8",
  ];

  const quantity = parseFormattedNumber(row.siQuantity || 0) || 0;
  const unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;
  const grossAmount = toFormattedAmountNumber(quantity * unitPrice);

  let runningBase = grossAmount;
  let totalDiscount = 0;
  const updatedDiscountAmounts = {};
  const updatedDiscountRates = {};

  if (discountAmountFields.includes(changedField)) {
    discountAmountFields.forEach((amountField, index) => {
      const discountNo = index + 1;
      const rateField = `discRate${discountNo}`;
      const discountAmount = toFormattedAmountNumber(
        parseFormattedNumber(row[amountField] || 0)
      );
      const discountRate =
        runningBase !== 0
          ? toFormattedAmountNumber((discountAmount / runningBase) * 100)
          : 0;

      updatedDiscountAmounts[amountField] =
        amountField === changedField ? row[amountField] : formatNumber(discountAmount);
      updatedDiscountRates[rateField] = formatNumber(discountRate);

      totalDiscount += discountAmount;
      runningBase = toFormattedAmountNumber(runningBase - discountAmount);
    });
  } else {
    discountRateFields.forEach((rateField, index) => {
      const discountNo = index + 1;
      const amountField = `discAmount${discountNo}`;
      const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
      const discountAmount = toFormattedAmountNumber(runningBase * (rateValue * 0.01));

      updatedDiscountRates[rateField] =
        rateField === changedField ? row[rateField] : formatNumber(rateValue);
      updatedDiscountAmounts[amountField] = formatNumber(discountAmount);

      totalDiscount += discountAmount;
      runningBase = toFormattedAmountNumber(runningBase - discountAmount);
    });
  }

  const netAmount = toFormattedAmountNumber(grossAmount - totalDiscount);
  const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;

  
  return {
    ...row,
    grossAmount: formatNumber(grossAmount),
    vatAmount: formatNumber(vatAmount),
    salesAmount: formatNumber(netAmount - vatAmount),
    // ATC is header-level only, not per detail row.
    atcAmount: formatNumber(0),
    amountDue: formatNumber(0),
    ...updatedDiscountRates,
    ...updatedDiscountAmounts,
    totDiscount: formatNumber(totalDiscount),
    netAmount: formatNumber(netAmount),
  };
};

const handleSODetailRowChange = (index, field, value) => {
  const discountRateFields = [
    "discRate1",
    "discRate2",
    "discRate3",
    "discRate4",
    "discRate5",
    "discRate6",
    "discRate7",
    "discRate8",
  ];
  const discountAmountFields = [
    "discAmount1",
    "discAmount2",
    "discAmount3",
    "discAmount4",
    "discAmount5",
    "discAmount6",
    "discAmount7",
    "discAmount8",
  ];
  const calculationTriggerFields = [
    "siQuantity",
    "unitPrice",
    ...discountRateFields,
    ...discountAmountFields,
  ];

  const zeroValueByField = (targetField) => {
    if (targetField === "unitPrice") {
      return formatNumber(0, sellingPriceDecimals);
    }

    return formatNumber(0);
  };

  const buildFreeItemRow = (row, isFree) => {
    if (!isFree) {
      return {
        ...row,
        freeItem: "",
      };
    }

    const zeroedRow = {
      ...row,
      freeItem: "Y",
      unitPrice: formatNumber(0, sellingPriceDecimals),
      grossAmount: formatNumber(0),
      vatAmount: formatNumber(0),
      salesAmount: formatNumber(0),
      atcAmount: formatNumber(0),
      amountDue: formatNumber(0),
      totDiscount: formatNumber(0),
      netAmount: formatNumber(0),
    };

    discountRateFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    discountAmountFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    return zeroedRow;
  };

  const updatedRows = [...(detailRowsRef.current || [])];
  let updatedRow = {
    ...updatedRows[index],
    [field]: value,
  };

  if (field === "documentDate" && value && isDateEarlierThanSiDate(value)) {
    clearHeaderAndDetailDates({ showAlert: true });
    return;
  }
  if (field === "siDate" && value && isDateEarlierThanSiDate(value)) {
    clearHeaderAndDetailDates({ showAlert: true });
  }

  if (field === "freeItem") {
    updatedRow = buildFreeItemRow(updatedRow, value === "Y");
    updatedRows[index] = updatedRow;
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
    updateState({ detailRows: normalizedRows });
    updateTotals(normalizedRows);
    return;
  }

  if (
    updatedRows[index]?.freeItem === "Y" &&
    ["unitPrice", ...discountRateFields, ...discountAmountFields].includes(field)
  ) {
    updatedRow = {
      ...updatedRows[index],
      [field]: zeroValueByField(field),
    };
    updatedRows[index] = buildFreeItemRow(updatedRow, true);
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
    updateState({ detailRows: normalizedRows });
    updateTotals(normalizedRows);
    return;
  }

  if (calculationTriggerFields.includes(field)) {
    updatedRow = recalculateSODetailRow(updatedRow, field);
  }


  updatedRows[index] = updatedRow;
  const normalizedRows = calculationTriggerFields.includes(field)
    ? distributeVatAcrossDetailRows(updatedRows)
    : updatedRows;


  updateState({ detailRows: normalizedRows });
  updateTotals(normalizedRows);
};

const handleSIDetailRowChange = handleSODetailRowChange;

const enterNextRowZeroClearFields = [
  "siQuantity",
  "unitPrice",
  "discRate1",
  "discRate2",
  "discRate3",
  "discRate4",
  "discRate5",
  "discRate6",
  "discRate7",
  "discRate8",
  "discAmount1",
  "discAmount2",
  "discAmount3",
  "discAmount4",
  "discAmount5",
  "discAmount6",
  "discAmount7",
  "discAmount8",
];

const renderSIDetailCell = (columnKey, row, index) => {
  const columnWidth = getDetailColumnFallbackWidth(columnKey);
  const style = getDetailCellStyle(columnKey, columnWidth);
  const isRowWithDR = Boolean(String(row.drNo || "").trim());
  const quantityPickedValue = parseFormattedNumber(row.quantityPicked || 0) || 0;
  const canEditPickingStatus = isRowWithDR && quantityPickedValue === 0;
  const canSearchItem = !isRowWithDR; // Can't change item if it's from a DR
  
  // Removed salesRepCode from detailModalHandlers
  // Added ATC lookup for detail rows if needed, but not explicitly requested for details.
  // For now, only itemCode lookup is kept.
  
  // Moves focus to the same editable column in the next visible row.
  const focusNextDetailCell = (field) => {
    focusNextSoDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: enterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) =>
        handleSIDetailRowChange(nextIndex, nextField, value),
    });
  };

  // Shared text input for editable detail columns.
  const textInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={options.readOnly ?? isFormDisabled}
      onChange={(e) => handleSODetailRowChange(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
        e.preventDefault();
        focusNextDetailCell(field);
      }}
    />
  );

  // Shared read-only lookup input; the icon beside it opens the related modal.
  const lookupInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full pr-6 global-tran-td-inputclass-ui text-center cursor-pointer ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly
      onKeyDown={(e) => {
        if (e.key !== "Enter" || isFormDisabled) return;
        e.preventDefault();
        focusNextDetailCell(field);
      }}
    />
  );

  const numericInput = (field, options = {}) => (
  <input
    type="text"
    id={`${field}-${index}`}
    className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
    value={row[field] || ""}
    readOnly={options.readOnly ?? isFormDisabled}
    onChange={(e) => {
      if (options.readOnly || options.blocked?.()) return;
      const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
      const regex = options.regex || /^\d*\.?\d{0,2}$/;
      if (regex.test(sanitizedValue) || sanitizedValue === "") {
        handleSIDetailRowChange(index, field, sanitizedValue);
      }
    }}
      onFocus={(e) => {
      options.onFocus?.(e);
      clearSoDetailZeroOnFocus(e, {
        isEditable: !(options.readOnly ?? isFormDisabled) && !options.blocked?.(),
        onClear: (value) => handleSODetailRowChange(index, field, value),
      });
    }}
    onBlur={(e) => {
      if (options.readOnly || options.blocked?.()) return;
      if (typeof options.onBlur === "function" && options.onBlur(e) === false) return;

      const num = parseFormattedNumber(e.target.value);
      handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
    }}
    onKeyDown={(e) => {
      if (e.key !== "Enter" || options.readOnly || options.blocked?.()) return;
      e.preventDefault();

      if (typeof options.onKeyDown === "function" && options.onKeyDown(e) === false) return;

      const num = parseFormattedNumber(e.target.value);
      handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
      focusNextDetailCell(field);
    }}
  />
);

  // Read-only amount display used by calculated amount columns.
  const readonlyAmountInput = (field) => (
    <input
      type="text"
      className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
      value={row[field] || ""}
      readOnly={true} // Always read-only for calculated fields
      // onChange={(e) => handleSODetailRowChange(index, field, e.target.value)} // No onChange for read-only
    />
  );

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    siStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`siStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.siStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleSIDetailRowChange(index, "siStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("siStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
    drNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
    itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
    itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.pmType || ""} readOnly /><input type="hidden" value={row.groupId || ""} readOnly /><input type="hidden" value={row.pmId || ""} readOnly /></td>,
    siQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: isFormDisabled || isRowWithDR, onBlur: (e) => validateSIQuantity(index, e.target.value), onKeyDown: (e) => validateSIQuantity(index, e.target.value) })}</td>,
    quantityPicked: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            {numericInput(columnKey, {
              decimals: quantityDecimals,
              regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`),
              readOnly: true,
            })}
          </div>
          {canUsePickingControls && (
            <button
              type="button"
              title="Open Item Picking / Allocation"
              aria-label="Open Item Picking / Allocation"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!row?.itemCode || (parseFormattedNumber(row?.siQuantity || 0) || 0) <= 0}
              onClick={() => handleOpenItemPickingModal(index)}
            >
              <FontAwesomeIcon icon={faClipboardCheck} />
            </button>
          )}
        </div>
      </td>
    ),
    itemAmount: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <input
          type="text"
          value={formatNumber(row.itemAmount || 0)}
          readOnly
          className="w-full global-tran-td-inputclass-ui text-right"
        />
      </td>
    ),
    unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: sellingPriceDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`), blocked: () => !isSellingPriceAndDiscountEditable || normalizedSiTranType === "SI03" || row.freeItem === "Y", readOnly: isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y" })}</td>,
    grossAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    vatCode: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          {lookupInput(columnKey, { className: "text-center" })}
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "detailVAT" })}
            />
          )}
        </div>
      </td>
    ),
    vatRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
    salesAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
    totDiscount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    amountDue: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>, // New field
    freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled || isRowWithDR ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled || isRowWithDR} onClick={() => handleSIDetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>,
    drQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>, // Read-only as it comes from DR
    linkedSiQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>, // Read-only as it comes from linked SI
  };

  if (visibleDiscountRateFields.includes(columnKey) || visibleDiscountAmountFields.includes(columnKey)) {
    detailColumnRenderers[columnKey] = () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { blocked: () => !isSellingPriceAndDiscountEditable || row.freeItem === "Y", readOnly: isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y" })}</td>;
  }

  return detailColumnRenderers[columnKey]?.() ?? null;
};

const renderSiGlCell = (columnKey, row, index) => {
  const columnWidth = getSiGlFallbackWidth(columnKey);
  const style = getSiGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = {
    acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, modalContext: "glRC" }),
    slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
    vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "glVAT" }),
    atcCode: () => updateState({ selectedRowIndex: index, showATCModal: true, modalContext: "glATC" }),
  };

  const focusNextGlCell = (field) => {
    focusNextSiGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: siGlEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
    });
  };

  const glTextInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={options.readOnly ?? isFormDisabled}
      maxLength={options.maxLength}
      onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
        e.preventDefault();
        focusNextGlCell(field);
      }}
    />
  );

  const glLookupInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={options.readOnly}
      onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || isFormDisabled) return;
        e.preventDefault();
        focusNextGlCell(field);
      }}
    />
  );

  const glAmountInput = (field) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className="w-full global-tran-td-inputclass-ui text-right"
      value={row[field] || ""}
      readOnly={isFormDisabled}
      onChange={(e) => {
        const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
          handleDetailChangeGL(index, field, sanitizedValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        handleBlurGL(index, field, e.target.value, true);
        focusNextSiGlRowInput(index, field, {
          rows: detailRowsGL,
          zeroClearFields: siGlEnterNextRowZeroClearFields,
          parseValue: parseFormattedNumber,
          onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
        });
      }}
      onFocus={(e) => clearSiGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
      onBlur={(e) => {
        if (isFormDisabled) return;
        handleBlurGL(index, field, e.target.value);
      }}
    />
  );

  const glColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    acctCode: () => { const showLookupIcon = !isFormDisabled; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: false })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    rcCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    slCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    vatCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    atcCode: () => { const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly: true })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
    particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`slRefDate${index}`] !== undefined) handleDetailChangeGL(index, "slRefDate", updates[`slRefDate${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
  };

  return glColumnRenderers[columnKey]?.() ?? null;
};

const selectedPickingRow = itemPickingRowIndex !== null && itemPickingRowIndex !== undefined
  ? detailRows?.[itemPickingRowIndex]
  : null;

return (
<>
<div className="global-tran-main-div-ui">

      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
      <Header
        docType={docType}
        pdfLink={pdfLink}
        videoLink={videoLink}
        onPrint={handlePrint}
        printData={printData}
        onReset={handleReset}
        onSave={() => handleActivityOption("Upsert")}
        onCancel={handleCancel}
        onCopy={handleCopy}
        onAttach={handleAttach}

        activeTopTab={topTab}
        showActions={topTab === "details"}
        showBIRForm={false}
        isViewDocument={isViewDocument}
        onDetails={() => setTopTab("details")}
        onHistory={() => setTopTab("history")}
        disableRouteNavigation={true}

        detailsRoute="/page/DR"

        isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
        isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
        isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED" }
      />
      </div>

      <div
        className={topTab === "details" ? "" : "hidden"}
        style={{ display: topTab === "details" ? undefined : "none" }}
      >

      {/* Page title and subheading */}
      <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
        <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
          <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
        </div>
        <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
          <div>
            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
            <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{displayStatus}</h1>
          </div>
        </div>
      </div>

      {/* Form Layout with Tabs */}
      <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
        {/* Tab Navigation */}
        <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
          <button
            className={`global-tran-tab-padding-ui ${
              activeTab === "basic"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
            }`}
            onClick={() => updateState({ activeTab: "basic" })}
          >
            Basic Information
          </button>
          {/* Provision for Other Tabs */}
        </div>

        {/* SI Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="so_hd">

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="branchName"
              label="Branch"
              type="lookup"
              value={branchName || ""}
              disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
              onLookup={() => updateState({ branchModalOpen: true })}
            />

            <FieldRenderer
              id="siNo"
              label="SI No."
              type="lookup"
              value={state.documentNo || documentNo || ""}
              disabled={state.isDocNoDisabled}
              onChange={(val) => updateState({ documentNo: val })}
              onBlur={handlesiNoBlur}
              onLookup={() => updateState({ showAllTranDocNo: true })}
              onKeyDown={(e) => {
                if (e.key === "F1") {
                  e.preventDefault();
                  updateState({ showAllTranDocNo: true });
                  return;
                }

                if (e.key === "Enter") {
                  e.preventDefault();
                  handlesoNoBlur();
                  document.getElementById("documentDate")?.focus();
                }
              }}
            />

            <div className="relative w-full">
              <div
                className={`flex items-stretch global-ref-textbox-ui ${
                  !isFormDisabled
                    ? "global-ref-textbox-enabled"
                    : "global-ref-textbox-disabled"
                }`}
              >
                <DateFormatInput
                  id="documentDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={documentDate}
                  disabled={isFormDisabled}
                  updateState={updateState}
                />
              </div>
              <label
                htmlFor="documentDate"
                className={`global-ref-floating-label ${
                  !isFormDisabled
                    ? "global-ref-label-enabled"
                    : "global-ref-label-disabled"
                }`}
              >
                SI Date
              </label>
            </div>

            <FieldRenderer
              id="billToCustCode"
              label="Bill To Customer Code"
              required
              type="lookup"
              value={billToCustCode || ""}
              disabled={isFormDisabled || hasDRLinkedDetailRows}
              readOnly
              lookupDisabled={isFetchDisabled || hasDRLinkedDetailRows}
              onLookup={() => updateState({ custModalOpen: true, modalContext: "OpenDR" })}
            />

            <FieldRenderer
              id="billToCustName"
              label="Bill To Customer Name"
              required
              type="text"
              value={billToCustName || ""}
              disabled
              readOnly
            />
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="siTranType"
              label="SI Type"
              type="select"
              value={siTranType || ""}
              disabled={isFormDisabled || hasSiDetailRows}
              onChange={(val) => updateState({ siTranType: val })}
              options={(siTranTypeOptions || []).map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />

            <FieldRenderer
              id="atcName"
              label="ATC (Goods)"
              required
              type="lookup"
              value={atcName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFormDisabled}
              onLookup={() => updateState({ showATCModal: true })}
            />

            <FieldRenderer
              id="vatName"
              label="VAT (Goods)"
              required
              type="lookup"
              value={vatName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFormDisabled}
              onLookup={() => updateState({ showVatModal: true, selectedRowIndex: null, modalContext: "headerVAT" })}
            />

            <FieldRenderer
              id="billtermName"
              label="Billing Term"
              required
              type="lookup"
              value={billtermName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFormDisabled}
              onLookup={() => updateState({ billtermModalOpen: true })}
            />

           
              <div className="relative w-full">
              <div
                className={`flex items-stretch global-ref-textbox-ui ${
                  !isFormDisabled
                    ? "global-ref-textbox-enabled"
                    : "global-ref-textbox-disabled"
                }`}
              >
                <DateFormatInput
                  id="dueDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={dueDate}
                  disabled
                  updateState={updateState}
                />
              </div>
              <label htmlFor="dueDate" className="global-ref-floating-label">
                Due Date
              </label>
            </div>


          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="salesRepName"
              label="Sales Rep"
              required
              type="lookup"
              value={salesRepName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFormDisabled}
              onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
            />

            <FieldRenderer
              id="customerPoNo"
              label="Customer PO No."
              type="text"
              value={customerPoNo || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ customerPoNo: val })}
              maxLength={useGetFieldLength(tblFieldArray, "cust_po_no")}
            />

            <div className="relative w-full">
              <div
                className={`flex items-stretch global-ref-textbox-ui ${
                  !isFormDisabled
                    ? "global-ref-textbox-enabled"
                    : "global-ref-textbox-disabled"
                }`}
              >
                <DateFormatInput
                  id="customerPoDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={customerPoDate}
                  disabled={isFormDisabled}
                  updateState={updateState}
                />
              </div>
              <label htmlFor="customerPoDate" className="global-ref-floating-label">
                Customer PO Date
              </label>
            </div>

            <FieldRenderer
              id="refSiNo1"
              label="Ref SI No. 1"
              type="text"
              value={refSiNo1 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refSiNo1: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refsi_no1")}
            />

            <FieldRenderer
              id="refSiNo2"
              label="Ref SI No. 2"
              type="text"
              value={refSiNo2 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refSiNo2: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refsi_no2")}
            />
          </div>

          <div className="col-span-full">
            <div className="relative p-2">
              <textarea
                id="remarks"
                placeholder=""
                rows={6}
                className="peer global-tran-textbox-remarks-ui pt-2"
                value={remarks}
                onChange={(e) => updateState({ remarks: e.target.value })}
                disabled={isFormDisabled}
                maxLength={useGetFieldLength(tblFieldArray, "remarks")}
              />
              <label
                htmlFor="remarks"
                className="global-tran-floating-label-remarks"
              >
                Remarks
              </label>
            </div>
          </div>
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <div className="flex gap-4">
              <input type="hidden" id="currCode" value={currCode || ""} readOnly />

              <div className="flex-grow w-2/3">
                <FieldRenderer
                  id="currName"
                  label="Currency"
                  value={
                    currCode
                      ? `${currCode}${currName ? ` - ${currName}` : ""}`
                      : ""
                  }
                  disabled
                  readOnly
                  type="text"
                />
              </div>

              <div className="flex-grow">
                <FieldRenderer
                  id="currRate"
                  label="Currency Rate"
                  type="amount"
                  value={currRate || ""}
                  disabled={isFormDisabled || glCurrDefault === currCode}
                  onChange={(val) => {
                    const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
                    if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                      updateState({ currRate: sanitizedValue });
                    }
                  }}
                  onBlur={handleCurrRateNoBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("refDocNo1")?.focus();
                    }
                  }}
                  onFocus={(e) => {
                    if (!isFormDisabled && parseFormattedNumber(e.target.value) === 0) {
                      updateState({ currRate: "" });
                    }
                  }}
                />
              </div>
            </div>

            <FieldRenderer
              id="totalGrossAmount"
              label="Gross Amount"
              type="amount"
              value={totals.totalGrossAmount || ""}
              disabled
            />

            <FieldRenderer
              id="totalDiscountAmount"
              label="Discount Amount"
              type="amount"
              value={totals.totalDiscountAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalNetAmount"
              label="Net Amount"
              type="amount"
              value={totals.totalNetAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalVatAmount"
              label="VAT Amount"
              type="amount"
              value={totals.totalVatAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalSalesAmount"
              label="Sales Amount"
              type="amount"
              value={totals.totalSalesAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalAtcAmount"
              label="ATC Amount"
              type="amount"
              value={totals.totalAtcAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalAmountDue"
              label="Amount Due"
              type="amount"
              value={totals.totalAmountDue || ""}
              disabled
              readOnly
            />
          </div>
        </div>

    </div>
    </div>

          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            > {/* This is correct */}
              SI Details
            </button>
          </div>
        </div>

      {/* Invoice Details Button */}

      <div className="global-tran-table-main-div-ui">
      <div className="global-tran-table-main-sub-div-ui">
        <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
          <thead className="global-tran-thead-div-ui">
            <tr>
              {orderedDetailColumns.map((column) =>
                renderSiDetailHeader(column.label, column.key, column.width, {
                  orderedColumns: orderedDetailColumns,
                })
              )}

                {!isFormDisabled && (
                  <th
                    className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={transactionActionsHeaderStyle}
                  >
                    Actions
                  </th>
                )}

            </tr>
          </thead>

          <tbody className="relative">{sortedDetailRows.map(({ row, originalIndex }) => {
            const pickedQty = parseFormattedNumber(row.quantityPicked || 0) || 0;
            return (
              <tr key={originalIndex} className="global-tran-tr-ui">
                {orderedDetailColumns.map((column) =>
                  renderSIDetailCell(column.key, row, originalIndex)
                )}

                {!isFormDisabled && (
                  <td
                    className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                    style={transactionActionsCellStyle}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {!isDirectSiType && (
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleInsertBlankRow(originalIndex)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="global-tran-td-button-delete-ui"
                        onClick={() => handleDeleteRow(originalIndex)}
                        title={
                          isPickingSiType && pickedQty > 0
                            ? "Delete row and release picking allocation"
                            : "Delete row"
                        }
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          </tbody>

        </table>
        {renderSoDetailHeaderContextMenu()}
      </div>
      </div>

    {topTab === "details" && (
    <>
    {/* Invoice Details Footer */}
    <div className="global-tran-tab-footer-main-div-ui relative">

    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
        {showAddTypeDropdown && (
          <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Add SI Detail
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isAddItemDisabledBySiType ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"}`}
                disabled={isAddItemDisabledBySiType}
                onClick={() => {
                  if (isAddItemDisabledBySiType) return;
                  setShowAddTypeDropdown(false);
                  handleOpenAddItemModal();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <FontAwesomeIcon icon={faPlus} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Add Item</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Select item from item master
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isOpenDRDisabledBySiType ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500" : "text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"}`}
                disabled={isOpenDRDisabledBySiType}
                onClick={() => {
                  if (isOpenDRDisabledBySiType) return;
                  setShowAddTypeDropdown(false);
                  handleOpenDRLookup();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                    <FontAwesomeIcon icon={faClipboardCheck} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Open DR</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Lookup open DR items
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleAddRowClick}
          className="global-tran-tab-footer-button-add-ui"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
        </button>
      </div>
      {canUsePickingControls && (detailRows?.length || 0) > 0 && (
      <div className="ml-6 flex items-center gap-2">
        <button
          type="button"
          className="min-h-[36px] w-[132px] rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
          disabled={isLoading}
          onClick={() => handleBulkPickingAllocation("allocate")}
        >
          <FontAwesomeIcon icon={faClipboardCheck} className="mr-2" />
          Allocate All
        </button>

        <button
          type="button"
          className="min-h-[36px] w-[132px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
          disabled={isLoading || !hasPickedQuantity}
          onClick={() => handleBulkPickingAllocation("release")}
        >
          <FontAwesomeIcon icon={faMinus} className="mr-2" />
          Release All
        </button>
      </div>
    )}
    </div>

      
    </div>
    </>
    )}

    </div>

    {/* General Ledger Section */}
    <div
      className={topTab === "details" ? "global-tran-tab-div-ui" : "hidden"}
      style={{ display: topTab === "details" ? undefined : "none" }}
    >
      <div className="global-tran-tab-nav-ui">
        <div className="flex flex-row sm:flex-row">
          <button
            className={`global-tran-tab-padding-ui ${
              GLactiveTab === "invoice"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
            }`}
            onClick={() => setGLActiveTab("invoice")}
          >
            General Ledger
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleActivityOption("GenerateGL")}
            className="global-tran-button-generateGL"
            disabled={isLoading}
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
          >
            {isLoading ? "Generating..." : "Generate GL Entries"}
          </button>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui">
        <div className="global-tran-table-main-sub-div-ui">
          <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
            <thead className="global-tran-thead-div-ui">
              <tr>
                {orderedSiGlColumns.map((column) =>
                  renderSiGlHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedSiGlColumns,
                  })
                )}
                {!isFormDisabled && (
                  <th
                    className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={transactionActionsHeaderStyle}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedSiGlRows.map(({ row, originalIndex }) => (
                <tr key={originalIndex} className="global-tran-tr-ui">
                  {orderedSiGlColumns.map((column) =>
                    renderSiGlCell(column.key, row, originalIndex)
                  )}

                  {!isFormDisabled && (
                    <td
                      className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                      style={transactionActionsCellStyle}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleAddRowGL(originalIndex)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>

                        <button
                          type="button"
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteRowGL(originalIndex)}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {renderSiGlHeaderContextMenu()}
        </div>
      </div>

      <div className="global-tran-tab-footer-main-div-ui">
        <div className="global-tran-tab-footer-button-div-ui">
          <button
            onClick={() => handleAddRowGL()}
            className="global-tran-tab-footer-button-add-ui"
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
          </button>
        </div>

        <div className="global-tran-tab-footer-total-main-div-ui">
          <>
            <div className="global-tran-tab-footer-total-div-ui">
              <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                Total Debit ({glCurrDefault}):
              </label>
              <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                {totalDebit}
              </label>
            </div>

            <div className="global-tran-tab-footer-total-div-ui">
              <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                Total Credit ({glCurrDefault}):
              </label>
              <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                {totalCredit}
              </label>
            </div>
          </>

          {glCurrDefault !== currCode && (
            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({currCode}):
                </label>
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                  {totalDebitFx1}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({currCode}):
                </label>
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
                  {totalCreditFx1}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {branchModalOpen && (
            <BranchLookupModal
              isOpen={branchModalOpen}
              onClose={handleCloseBranchModal}
            />
          )}

    {currencyModalOpen && (
            <CurrLookupModal
              isOpen={currencyModalOpen}
              onClose={handleCloseCurrencyModal}
            />
          )}

    {billtermModalOpen && (
      <BillTermLookupModal
          isOpen={billtermModalOpen}
          onClose={handleCloseBillTermModal}
        />
    )}

    {custModalOpen && (
      <CustomerMastLookupModal
        isOpen={custModalOpen}
        onClose={handleCloseCustModal}
        customParam={
          String(siTranType || "").toUpperCase() === "SI03"
            ? "openFADS"
            : String(siTranType || "").toUpperCase() === "SI01"
              ? "openDR"
              : undefined
        }
      />
    )}

    {showAccountModal && (
      <COAMastLookupModal
        isOpen={showAccountModal}
        onClose={handleCloseAccountModal}
        source={accountModalSource}
        customParam={customParam}
      />
    )}

    {showSlModal && (
      <SLMastLookupModal
        isOpen={showSlModal}
        onClose={handleCloseSlModalGL}
      />
    )}

    {showItemModal && (
      <ItemMastLookupModal
        isOpen={showItemModal}
        endpoint="getInvLookupFG"
        docType="SI"
        onClose={handleCloseItemModal}
        onCancel={() =>
          updateState({
            showItemModal: false,
            selectedRowIndex: null,
            insertAfterIndex: null,
            selectionContext: "",
          })
        }
        enableMultiSelect={selectionContext === "multiAdd"}
      />
    )}

    {showOpenDRModal && (
      <GlobalLookupModalv1
        isOpen={showOpenDRModal}
        title="Open Delivery Receipt Summary"
        endpoint={openDRSI_Col_Summary}
        data={openDRSI_Data_Summary}
        btnCaption="Get Selected DR"
        onClose={handleInsertSelectedOpenDR}
        onCancel={() =>
          updateState({
            showOpenDRModal: false,
            openDRSI_Data_Summary: [],
            openDRSI_Col_Summary: [],
          })
        }
      />
    )}

    {showATCModal && (
      <ATCLookupModal
        isOpen={showATCModal}
        onClose={handleCloseATCModal}
      />
    )}

    {showVatModal && (
      <VATLookupModal
        isOpen={showVatModal}
        onClose={handleCloseVatModal}
        customParam ="OutputGoods"
      />
    )}

    {showSalesRepModal && (
      <SearchSalesRepRef
        isOpen={showSalesRepModal}
        onClose={handleCloseSalesRepModal}
      />
    )}

    {showRcModal && (
      <RCLookupModal
        isOpen={showRcModal}
        onClose={handleCloseRcModal}
      />
    )}

    {showItemPickingModal && selectedPickingRow && (
      <SearchGlobalItemPickingModal
        isOpen={showItemPickingModal}
        onClose={handleCloseItemPickingModal}
        transaction={{
          sourceDocType: "SI",
          sourceDocTypeName: "Sales Invoice",
          sourceDocNo: documentNo || "New SI",
          sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
          groupId: selectedPickingRow?.groupId || "",
          customerCode: billToCustCode || "",
          customerName: billToCustName || "",
          itemCode: selectedPickingRow?.itemCode || "",
          itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
          requestedQty: parseFormattedNumber(selectedPickingRow?.siQuantity || 0) || 0,
        }}
        stockRows={itemPickingStockRows}
        existingAllocations={itemPickingExistingAllocations}
        onConfirm={handleConfirmItemPicking}
      />
    )}

    {/* Cancellation Modal */}
    {showCancelModal && (
      <CancelTranModal
        isOpen={showCancelModal}
        onClose={handleCloseCancel}
      />
    )}

    {showAttachModal && (
      <AttachDocumentModal
        isOpen={showAttachModal}
        params={{
          DocumentID: documentID,
          DocumentName: documentName,
          BranchName: branchName,
          DocumentNo: documentNo,
        }}
        onClose={() => updateState({ showAttachModal: false })}
      />
    )}

    {showSignatoryModal && (
      <DocumentSignatories
        isOpen={showSignatoryModal}
        params={{noReprints,documentID,docType}}
        onClose={handleCloseSignatory}
        onCancel={() => updateState({ showSignatoryModal: false })}
      />
    )}
    {showAllTranDocNo && (
      <AllTranDocNo
        isOpen={showAllTranDocNo}
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "siNo"}}
        onRetrieve={handleTranDocNoRetrieval}
        onResponse={{documentNo}}
        onSelected={handleTranDocNoSelection}
        onClose={() => updateState({ showAllTranDocNo: false })}
      />
    )}

      {showSpinner && <LoadingSpinner />}
    </div>
  <div
    className={topTab === "history" ? "" : "hidden"}
    style={{ display: topTab === "history" ? undefined : "none" }}
  >
  <AllTranHistory
    showHeader={false}
    isActive={topTab === "history"}
    endpoint="/getSIHistory"
    cacheKey={`SI:${state.branchCode || ""}`}
    activeTabKey="SI_Summary"
    branchCode={state.branchCode}
    status="All"
    onRowDoubleClick={handleHistoryRowPick}
    historyExportName={`${documentTitle} History`}
  />
</div>

</>
);
// End of Return

};

export default SI;

















