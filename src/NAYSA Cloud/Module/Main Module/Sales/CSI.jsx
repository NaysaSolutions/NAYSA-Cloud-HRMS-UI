



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
// import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
// import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
// import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
// import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
// import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
// import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
// import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
// import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// // Configuration
// import { postRequest } from '../../../Configuration/BaseURL.jsx'
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
//   useTopAccountRow,
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
//   useSelectedHSColConfig
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
// const CSI = () => {

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
//   const docType = docTypes.CSI || "CSI";
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
//     isGeneratingGL: false,
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
//     custAddr: "",
//     custTin: "",
//     salesRepCode: "",
//     salesRepName: "",
//     atcCode: "",
//     atcName: "",
//     vatCode: "",
//     vatName: "",

//     // Currency information
//     currCode: companyInfo?.currCode||"",
//     currName: companyInfo?.currName||"",
//     currRate: formatNumber(companyInfo?.currRate||1,6),
//     defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),

//     //Other Header Info
//     tblFieldArray :[],
//     csiStatus: "O",
//     csiTranType: "",
//     csiTranTypeOptions: [],
//     csiStatusOptions: [],

//     paymentType: "",
//     paymentTypeOptions: [],
//     bankCode: companyInfo?.depBankcode||"",
//     bank: "",
//     acctCode: companyInfo?.depositBankAcctCode || "",
//     acctName: companyInfo?.depositBankName || "",
//     currAmount: "0.00",
//     amount: "0.00",
//     checkNo: "",
//     checkDate: "",
//     clearDate: "",
//     refCsiNo1: "",
//     refCsiNo2: "",
//     remarks: "",
//     userCode: currentUserRow?.userCode||"",

//     //Detail 1-2
//     detailRows  :[],
//     detailRowsGL :[],

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
//     showSalesRepModal:false,
//     showItemModal:false,    
//     showATCModal:false,
//     showVatModal:false,
//     showBankMastModal:false,

//     currencyModalOpen:false,
//     branchModalOpen:false,
//     custModalOpen:false,
//     showCancelModal:false,
//     showAttachModal:false,
//     showSignatoryModal:false,
//     showAllTranDocNo:false,
//    });

//   const updateState = (updates) => {
//       setState(prev => ({ ...prev, ...updates }));
//     };

//   const [csiHeaderColConfig, setCsiHeaderColConfig] = useState([]);

//   useEffect(() => {
//     if (!refsLoaded) return;

//     let isMounted = true;

//     const loadCsiHeaderColConfig = async () => {
//       try {
//         const configRows = await useSelectedHSColConfig("CSI_Header");
//         if (isMounted && Array.isArray(configRows)) {
//           setCsiHeaderColConfig(configRows);
//         }
//       } catch (error) {
//         if (isMounted) {
//           setCsiHeaderColConfig([]);
//         }
//         console.warn("CSI_Header hs_colconfig is not available.", error);
//       }
//     };

//     loadCsiHeaderColConfig();

//     return () => {
//       isMounted = false;
//     };
//   }, [refsLoaded]);

//   const getCsiHeaderFieldConfig = useCallback(
//     (fieldKey) =>
//       (csiHeaderColConfig || []).find(
//         (config) => String(config?.key || "").toLowerCase() === String(fieldKey || "").toLowerCase()
//       ) || {},
//     [csiHeaderColConfig]
//   );

//   const getCsiHeaderLabel = useCallback(
//     (fieldKey, fallbackLabel) => getCsiHeaderFieldConfig(fieldKey)?.label || fallbackLabel,
//     [getCsiHeaderFieldConfig]
//   );

//   const isCsiHeaderFieldHidden = useCallback(
//     (fieldKey) => Number(getCsiHeaderFieldConfig(fieldKey)?.hidden || 0) === 1,
//     [getCsiHeaderFieldConfig]
//   );

//   const renderCsiHeaderField = (fieldKey, element) =>
//     isCsiHeaderFieldHidden(fieldKey) ? null : element;

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
//   isGeneratingGL,

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
//   custAddr,
//   custTin,
//   salesRepCode,
//   salesRepName,
//   atcCode,
//   atcName,
//   vatCode,
//   vatName,
//   currCode,
//   currName,
//   currRate,
//   csiTranType,
//   csiTranTypeOptions = [],
//   csiStatus,
//   csiStatusOptions = [],
//   paymentType,
//   paymentTypeOptions = [],
//   bankCode,
//   bank,
//   acctCode,
//   acctName,
//   currAmount,
//   amount,
//   checkNo,
//   checkDate,
//   clearDate,
//   refCsiNo1,
//   refCsiNo2,
//   remarks,

//   // Transaction details
//   tblFieldArray,
//   detailRows,
//   detailRowsGL,
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
//   showCancelModal,
//   showAttachModal,
//   showSignatoryModal,
//   showAllTranDocNo,
//   showATCModal,
//   showVatModal,
//   showBankMastModal

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
//   const totalCsiQuantity = detailRows.reduce((total, row) => total + (parseFormattedNumber(row.csiQuantity || 0) || 0),0);
//   const hasPickedQuantity = (detailRows || []).some(
//     (row) => (parseFormattedNumber(row.quantityPicked || 0) || 0) > 0
//   );

//   const filteredHeaderSiStatusOptions =
//     !isPosted && totalCsiQuantity > 0
//       ? (csiStatusOptions || []).filter(
//           (option) =>
//             ["O", "C"].includes(option.DROPDOWN_CODE) ||            
//             option.DROPDOWN_CODE === csiStatus
//         )
//       : csiStatusOptions;

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
//     headerAcctCode: glAccountFilter.ActiveAll,
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
//   const salesAllowDuplicateItem = String(companyInfo?.salesAllowDuplicateItem || "").toUpperCase();
//   const isSellingPriceAndDiscountEditable = true;
//   const CSI_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";

//   // Discount configuration
//   const discountLevel = 1;
//   const showTotalDiscountColumn = false;
//   const visibleDiscountRateFields = ["discRate"];
//   const visibleDiscountAmountFields = ["discAmount"];

//   const detailColumnDefs = [
//     { key: "groupId", label: "Group ID", width: 120 },
//     { key: "ln", label: "LN", width: 56 },
//     { key: "csiStat", label: "Picking Status", width: 130 },
//     { key: "itemCode", label: "Item Code", width: 140 },
//     { key: "itemName", label: "Item Name", width: 240 },
//     { key: "itemSpecs", label: "Specification", width: 240 },
//     { key: "uomCode", label: "UOM", width: 100 },
//     { key: "csiQuantity", label: "CSI Quantity", width: 120 },
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
//   const normalizedCsiTranType = String(csiTranType || "").toUpperCase();
//   const isDirectCsiType = true;
//   const isPickingCsiType = true;
//   const canUsePickingControls = !isViewDocumentUrl && isOpenStatus && !isPosted && !isCancelled;
//   const isAddItemDisabledByCsiType = false;
//   const hasCsiDetailRows = (detailRows || []).length > 0;
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
//     const hiddenColumnKeys = ["groupId", "vatRate"];

//     if (!isPickingCsiType) {
//       hiddenColumnKeys.push("csiStat", "quantityPicked", "itemAmount");
//     }



//     setSoDetailHiddenColumnKeys(hiddenColumnKeys);
//   }, [setSoDetailHiddenColumnKeys, isDirectCsiType, isPickingCsiType,normalizedCsiTranType]);


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

//   const csiGlColumnDefs = [
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
//     getColumnStyle: getCcsiGlColumnStyle,
//     getFrozenColumnStyle: getCcsiGlFrozenStyle,
//     getOrderedColumns: getOrderedCsiGlColumns,
//     getSortedRows: getSortedCsiGlRows,
//     setColumnOrder: setCcsiGlColumnOrder,
//     clearZeroValueOnFocus: clearCsiGlZeroOnFocus,
//     focusNextRowInput: focusNextCsiGlRowInput,
//     renderHeaderContextMenu: renderCcsiGlHeaderContextMenu,
//     renderResizableHeader: renderCcsiGlHeader,
//   } = useResizableTableColumns(csiGlColumnDefs);
//   const orderedCcsiGlColumns = getOrderedCsiGlColumns(csiGlColumnDefs);
//   const getCcsiGlFallbackWidth = (key) =>
//     csiGlColumnDefs.find((column) => column.key === key)?.width || 120;
//   const getCcsiGlCellStyle = (key, fallbackWidth) => ({
//     ...getCcsiGlColumnStyle(key, fallbackWidth),
//     ...getCcsiGlFrozenStyle(key, orderedCcsiGlColumns, fallbackWidth, {
//       isHeader: false,
//     }),
//   });
//   useEffect(() => {
//     setCcsiGlColumnOrder(csiGlColumnDefs.map((column) => column.key));
//   }, [setCcsiGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
//   const sortedCcsiGlRows = getSortedCsiGlRows(
//     detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => {
//       if (sortKey === "ln") return entry.originalIndex + 1;
//       return entry.row?.[sortKey] ?? "";
//     }
//   );
//   const csiGlEnterNextRowZeroClearFields = [
//     "debit",
//     "credit",
//     "debitFx1",
//     "creditFx1",
//     "debitFx2",
//     "creditFx2",
//   ];

//   const setGLActiveTab = (tab) => updateState({ GLactiveTab: tab });

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
//       `CSI Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all CSI Detail rows?`,
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

//     const filteredTypes = getAllDropDown("CSITRAN_TYPE", docType) || [];
//     const filteredPaymentTypes = getAllDropDown("PAYMENT_TYPE", docType) || [];

//     const defaultCsiType =
//       filteredTypes.find((type) => type.DROPDOWN_CODE === "CSI01")?.DROPDOWN_CODE ||
//       filteredTypes[0]?.DROPDOWN_CODE ||
//       "";

//     const defaultPaymentType =
//       filteredPaymentTypes.find((type) => type.DROPDOWN_CODE === "AR02")?.DROPDOWN_CODE ||
//       filteredPaymentTypes[0]?.DROPDOWN_CODE ||
//       "";

//     const mapHeaderCsiStatus = (value) => {
//       const normalizedValue = String(value || "").toUpperCase();
//       if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
//       if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
//       if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
//       return "O";
//     };

//     updateState({
//       csiTranTypeOptions: filteredTypes,
//       csiTranType: state.csiTranType || defaultCsiType,
//       paymentTypeOptions: filteredPaymentTypes,
//       paymentType: state.paymentType || defaultPaymentType,
//       csiStatusOptions: [
//         { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
//         { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
//         { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
//       ],
//       csiStatus: mapHeaderCsiStatus(state.csiStatus),
//     });
// }, [docType, refsLoaded]);

//   const handleReset = () => {
//       clearSoDetailSorting();
//       const filteredTypes = getAllDropDown("CSITRAN_TYPE", docType) || [];
//       const filteredPaymentTypes = getAllDropDown("PAYMENT_TYPE", docType) || [];

//       const defaultCsiType =
//         filteredTypes.find((type) => type.DROPDOWN_CODE === "CSI01")?.DROPDOWN_CODE ||
//         filteredTypes[0]?.DROPDOWN_CODE ||
//         "";

//       const defaultPaymentType =
//         filteredPaymentTypes.find((type) => type.DROPDOWN_CODE === "AR02")?.DROPDOWN_CODE ||
//         filteredPaymentTypes[0]?.DROPDOWN_CODE ||
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
//       refCsiNo1: "",
//       refCsiNo2: "",
//       salesRepCode:"",
//       salesRepName:"",
//       remarks:"",
//       noReprints:"0",
//       billToCustCode:"",
//       billToCustName:"",
//       custAddr:"",
//       custTin:"",
//       atcCode: "",
//       atcName: "",
//       vatCode: vatCode || "",
//       vatName: "",
//       documentNo: "",
//       documentID: "",
//       detailRows: [],
//       detailRowsGL: [],
//       ...getGLTotalsState([]),
//       documentStatus:"",      
//       csiTranTypeOptions: filteredTypes,
//       csiTranType: defaultCsiType,
//       paymentTypeOptions: filteredPaymentTypes,
//       paymentType: defaultPaymentType,
//       bankCode: companyInfo?.depBankcode||"",
//       bank: "",
//       acctCode: companyInfo?.depositBankAcctCode || "",
//       acctName: companyInfo?.depositBankName || "",
//       currAmount: "0.00",
//       amount: "0.00",
//       checkNo: "",
//       checkDate: "",
//       clearDate: "",
//       csiStatus:"O",

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
//       showBankMastModal: false,
//       showSlModal: false,
//       showSalesRepModal: false,
//     });

//     updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0);
//   };

//     const loadCompanyData = async () => {
//         updateState({ isLoading: true });

//         try {
//           const hdtblcol_result = await useFieldLenghtCheck(
//             "csi_hd,csi_dt1,csi_dt2"
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
//     const data = await useFetchTranData(documentNo, branchCode, docType, "csiNo", direction);

//     if (!data?.csiId) {
//       Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
//       return resetState();
//     }

//     // Format rows
//     const retrievedDetailRows = distributeVatAcrossDetailRows((data.dt1 || []).map(item => ({
//       ...item,
//       csiStat: item.pickStat || item.csiStat || "F",
//       csiQuantity: formatNumber(item.csiQuantity ?? 0,quantityDecimals),
//       groupId: item.groupId || "",
//       unitPrice: formatNumber(item.unitPrice??0,sellingPriceDecimals),
//       grossAmount: formatNumber(item.grossAmount),
//       discRate: formatNumber(item.discRate ?? 0),
//       discAmount: formatNumber(item.discAmount ?? 0),
//       totDiscount: formatNumber(item.totDiscount ?? 0),      
//       vatAmount: formatNumber(item.vatAmount ?? 0),
//       vatCode: item.vatCode || data.vatCode || "",
//       vatRate: formatNumber(item.vatRate ?? 0),
//       salesAmount: formatSalesAmount(item.netAmount ?? 0, item.vatAmount ?? 0),
//       atcAmount: formatNumber(item.atcAmount ?? 0),
//       amountDue: formatNumber(item.amountDue ?? 0),
//       netAmount: formatNumber(item.netAmount ?? 0),
//       quantityPicked: formatNumber(item.quantityPicked ?? item.qtyPicked ?? 0, quantityDecimals),
//       itemAmount: item.itemAmount ?? formatNumber( 0),    })), { atcCode: data.atcCode || "" });

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
//       documentStatus: data.csiStatus,
//       status: data.docStatus,
//       noReprints:data.noReprints,
//       documentID: data.csiId,
//       documentNo: data.csiNo,
//       refCsiNo1: data.refCsiNo1 || "",
//       refCsiNo2: data.refCsiNo2 || "",
//       branchCode: data.branchCode,
//       branchName:data.branchName,
//       documentDate: useformatToDatev2(data.csiDate),
//       csiTranType: data.csiTranType,
//       billToCustCode: data.custCode,
//       billToCustName: data.custName,
//       custAddr: data.custAddr || "",
//       custTin: data.custTin || "",
//       atcCode: data.atcCode || "",
//       atcName: data.atcName || "",
//       vatCode: data.vatCode || "",
//       vatName: data.vatName || "",
//       salesRepCode: data.salesRepCode || "",
//       salesRepName: data.salesRepName || "",
//       paymentType: data.paymentType || "",
//       bankCode: data.bankCode || "",
//       bank: data.bank || "",
//       acctCode: data.acctCode || "",
//       acctName: data.acctName || "",
//       currAmount: formatNumber(data.currAmount ?? data.totalAmountDue ?? 0),
//       amount: formatNumber(data.amount ?? data.totalAmountDue ?? 0),
//       checkNo: data.checkNo || "",
//       checkDate: data.checkDate ? useformatToDatev2(data.checkDate) : "",
//       clearDate: data.clearDate ? useformatToDatev2(data.clearDate) : "",
//       currCode: data.currCode,
//       currName: data.currName,
//       currRate: formatNumber(data.currRate, 6),
//       csiStatus:
//         String(data.csiStatus || "O").toUpperCase() === "OPEN"
//           ? "O"
//           : String(data.csiStatus || "O").toUpperCase() === "CANCELLED"
//           ? "X"
//           : String(data.csiStatus || "O").toUpperCase() === "CLOSED"
//           ? "C"
//           : String(data.csiStatus || "O"),
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

// const handlecsiNoBlur = () => {

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

//   if (isOpenStatus) {
//     updateState({ isLoading: true });

//     try {
//         const {
//         branchCode,
//         documentNo,
//         documentID,
//         billToCustCode,
//         billToCustName,
//         refCsiNo1,
//         refCsiNo2,
//         salesRepCode,
//         salesRepName,
//         currCode,
//         currRate,
//         remarks,
//         userCode,
//         csiTranType,
//         csiStatus,
//         detailRows,
//         detailRowsGL,
//       } = state;

//       let finalDetailRowsGL = [...detailRowsGL];

//       const buildCsiData = (glRows = finalDetailRowsGL) => ({
//         branchCode: branchCode,
//         csiNo: documentNo || "",
//         csiId: documentID || "",
//         csiDate: documentDate,
//         csiTranType: csiTranType,
//         custCode: billToCustCode,
//         custName: billToCustName,
//         custAddr: custAddr || "",
//         custTin: custTin || "",
//         refCsiNo1: refCsiNo1,
//         refCsiNo2: refCsiNo2,
//         currCode: currCode || "PHP",
//         currRate: parseFormattedNumber(currRate),
//         atcAmount: parseFormattedNumber(totals.totalAtcAmount),
//         atcCode: atcCode || "",
//         vatCode: vatCode || "",
//         remarks: remarks || "",
//         userCode: userCode,
//         salesRepCode,
//         salesRepName,
//         csiStatus: csiStatus || 'O',
//         paymentType: paymentType || '',
//         bankCode: bankCode || '',
//         bank: bank || '',
//         acctCode: acctCode || '',
//         currAmount: parseFormattedNumber(totals.totalAmountDue || 0),
//         amount: parseFormattedNumber(totals.totalAmountDue || 0),
//         checkNo: checkNo || '',
//         checkDate: checkDate || null,
//         clearDate: clearDate || null,
//         dt1: detailRows.map((row, index) => ({
//           lnNo: String(index + 1),
//           pickStat: row.csiStat || "F",
//           csiStat: row.csiStat || "F",
//           groupId: row.groupId || "",
//           itemCode: row.itemCode || "",
//           itemName: row.itemName || "",
//           itemSpecs: row.itemSpecs || "",
//           uomCode: row.uomCode || "",
//           csiQuantity: parseFormattedNumber(row.csiQuantity || 0),
//           unitPrice: parseFormattedNumber(row.unitPrice || 0),
//           grossAmount: parseFormattedNumber(row.grossAmount || 0),
//           discRate: parseFormattedNumber(row.discRate || 0),
//           discAmount: parseFormattedNumber(row.discAmount || 0),
//           totDiscount: parseFormattedNumber(row.totDiscount || 0),          
//           vatCode: row.vatCode || "",
//           vatRate: parseFormattedNumber(row.vatRate || 0),
//           vatAmount: parseFormattedNumber(row.vatAmount || 0),
//           salesAmount: parseFormattedNumber(row.salesAmount || 0),
//           atcAmount: parseFormattedNumber(row.atcAmount || 0),
//           amountDue: parseFormattedNumber(row.amountDue || 0),
//           netAmount: parseFormattedNumber(row.netAmount || 0),
//           freeItem: row.freeItem || "",
//           quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
//           itemAmount: parseFormattedNumber(row.itemAmount || 0),
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
//             buildCsiData([])
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
//             buildCsiData([])
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
//           buildCsiData(finalDetailRowsGL),
//           updateState,          
//           "csiId",
//           "csiNo"
//         );

//         if (response) {
//           const responseDocNo =  response.data[0].csiNo;
//           const responseDocId =  response.data[0].csiId;

//           await fetchTranData(responseDocNo,branchCode);

//           const isZero = Number(noReprints) === 0;
//           const onSaveAndPrint = isZero
//             ? () => updateState({ showSignatoryModal: true })
//             : () => handleSaveAndPrint(responseDocId);

//           useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
//         }
//         updateState({
//           documentNo: response?.data?.[0]?.csiNo || "",
//           documentID: response?.data?.[0]?.csiId || "",
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

//   const createCSIDetailRow = (overrides = {}) => ({
//       lnNo: "",
//       csiStat: "F",
//       groupId: "",
//       itemCode: "",
//       itemName: "",
//       itemSpecs: "",
//       uomCode: "",
//       csiQuantity: Number(0).toFixed(quantityDecimals),
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
//       discRate: "0.00",
//       discAmount: "0.00",
//       totDiscount: "0.00",      
//       netAmount: "0.00",      
//       freeItem: "",
//       ...overrides,
//     });

//   const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
//     if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
//       return;
//     }

//     const updatedRows = [...detailRows];
//     const normalizedInsertRows = rowsToInsert.map((row) => createCSIDetailRow(row));

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
//     insertDetailRows([createCSIDetailRow()], insertIndex);
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
//     if (CSI_ALLOW_DUPLICATE_ITEMS) {
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
//         `These item(s) already exist in CSI Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
//       );
//     }

//     return filteredRecords;
//   };

//   const calculateRowAmountsFromRates = (row) => {
//     const discountRateFields = visibleDiscountRateFields;
//     const discountAmountFields = visibleDiscountAmountFields;
//     const quantity = parseFormattedNumber(row.csiQuantity || 0) || 0;
//     let unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;

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

//   const mapItemRecordToDetailRow = (item = {}) => {
   

//     return createCSIDetailRow({
//       itemCode: item?.itemCode || "",
//       itemName: item?.itemName || "",
//       itemSpecs: item?.itemSpecs || "",
//       uomCode: item?.uomCode || "",
//       groupId: "",    
//       csiQuantity: formatNumber( item?.csiQuantity ?? 0, quantityDecimals ),
//       unitPrice: formatNumber(item?.unitPrice ?? item?.sellPrice ?? item?.sellingPrice ?? 0, sellingPriceDecimals),
//       grossAmount: formatNumber(item?.grossAmount ?? 0),
//       discRate: formatNumber(item?.discRate ?? 0),
//       discAmount: formatNumber(item?.discAmount ?? 0),
//       totDiscount: formatNumber(item?.totDiscount ?? 0),
//       vatCode: vatCode || item?.vatCode || "",
//       vatRate: formatNumber(item?.vatRate ?? 0),
//       vatAmount: formatNumber(item?.vatAmount ?? 0),
//       salesAmount: formatSalesAmount(item?.netAmount ?? 0, item?.vatAmount ?? 0),
//       atcAmount: formatNumber(item?.atcAmount ?? 0),
//       amountDue: formatNumber(item?.amountDue ?? 0),
//       netAmount: formatNumber(item?.netAmount ?? 0),
//       freeItem: item?.freeItem || "",
//       quantityPicked: formatNumber(item?.quantityPicked ?? item?.qtyPicked ?? 0, quantityDecimals),
//       itemAmount: formatNumber(item?.itemAmount ?? 0),
//     });
//   };
//   const handleInsertSelectedItems = async (selectedRecords = []) => {
//     if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
//       return;
//     }

//     const rowsToInsert = selectedRecords.map((item) =>
//       calculateRowAmountsFromRates(mapItemRecordToDetailRow(item))
//     );

//     insertDetailRows(rowsToInsert, insertAfterIndex);
//   };






// const cancelPickingAllocationForDeletedCSIRow = async (row) => {
//   const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

//   // Only SI02 has FG picking allocation.
//   if (String(csiTranType || "").toUpperCase() !== "CSI02") {
//     return true;
//   }

//   // No picked quantity, no need to call allocation API.
//   if (pickedQty <= 0) {
//     return true;
//   }

//   if (!documentID || !row?.groupId) {
//     useSwalErrorAlert(
//       "Delete CSI Detail",
//       "Cannot release picking allocation. CSI ID or Group ID is missing."
//     );
//     return false;
//   }

//   const confirm = await useSwalProceedConfirm(
//     "Delete Picked CSI Detail?",
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
//           docCode: "CSI",
//           docId: documentID,
//           groupId: row.groupId,
//           userCode: userCode || currentUserRow?.userCode || "",
//           reason: "CSI detail line deleted.",
//         },
//       }),
//     });

//     return true;
//   } catch (error) {
//     console.error("Failed to release CSI FG picking allocation:", error);
//     useSwalErrorAlert("Delete CSI Detail", getApiErrorMessage(error));
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

//   const canDelete = await cancelPickingAllocationForDeletedCSIRow(rowToDelete);

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
//       return; // Assuming CSI also requires detail rows to print
//       }
//   if (documentID) {
//     updateState({ showSignatoryModal: true });
//   }
// };

//   const handleOpenAddItemModal = async (overrides = {}) => {
//     const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
//     const fieldsToCheck = {
//       "Header : Customer Code": lookupCustCode,
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
//         "Add CSI Detail"
//       );
//       if (!branchIsValid) return;

//       updateState({
//         custModalOpen: true,
//         modalContext: "addDetail",
//       });
//       return;
//     }
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
//     docCode: "CSI",
//     docNo: documentNo || "",
//     docId: documentID || "",
//     docDate: documentDate || null,
//     branchCode: branchCode || "",
//     groupId: row?.groupId || "",
//     lineNo: index + 1,
//     itemCode: row?.itemCode || "",
//     requestedQty: parseFormattedNumber(row?.csiQuantity || 0) || 0,
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
//           sourceDocType: "CSI",
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

// const handleCancel = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return; // Assuming CSI also requires detail rows to cancel
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
//       csiStat: "F",
//       allocated: "",
//       totalAllocated: 0,
//       quantityPicked: formatNumber(0, quantityDecimals),
//       itemAmount: formatNumber(0),
//       groupId: "",
//       pickingAllocations: [],
//     }));
    
//     updateState({
//       documentNo: "",
//       documentID: "",
//       documentStatus: "",
//       status: "OPEN",
//       csiStatus: "O",
//       documentDate: nextDocumentDate,
//       bankCode: "",
//       bank: "",
//       checkNo: "",
//       checkDate: "",
//       clearDate: "",
//       refCsiNo1: "",
//       refCsiNo2: "",
//       noReprints: "0",
//       detailRows: copiedDetailRows,
//       detailRowsGL: [],
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
//   const docNo = params.get("csiNo");
//   const branchCode = params.get("branchCode");
  
//   if (!loadedFromUrlRef.current && docNo && branchCode) {
//     loadedFromUrlRef.current = true;
//     handleHistoryRowPick({ docNo, branchCode });
//   }
// }, [location.search, handleHistoryRowPick]);

//   const printData = {
//     csi_no: documentNo,
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

//         const address = selectedData?.addr || selectedData?.address || selectedData?.custAddr || "";
//         const tin = selectedData?.tin || selectedData?.tinNo || selectedData?.custTin || selectedData?.custTinNo || "";
//         const selectedVatCode = selectedData?.vatCode || "";
//         const selectedVatRow = getAllTopVatRow(selectedVatCode);
//         const selectedVatName = selectedVatRow?.vatName || selectedData?.vatName || "";
//         const selectedAtcCode = selectedData?.atcCode || "";
//         const selectedAtcRow = getAllTopATCRow(selectedAtcCode);
//         const selectedAtcName = selectedAtcRow?.atcName || selectedData?.atcName || "";
//         const custDetails = {            custCode: selectedData?.custCode || '',
//             custName: selectedData?.custName || '',
//             custAddr: address,
//             custTin: tin,
//             currCode: selectedData?.currCode || '',
//             salesRepCode: selectedData?.salesRepCode || '',
//             salesRepName: selectedData?.salesRepName || '',
//             vatCode: selectedVatCode,
//             vatName: selectedVatName,
//             atcCode: selectedAtcCode,
//             atcName: selectedAtcName,

//         };
//         const nextBillToCustCode = selectedData?.custCode || "";
//         updateState(
//             {
//                 billToCustName: selectedData.custName,
//                 billToCustCode: selectedData.custCode,
//                 custAddr: address,
//                 custTin: tin,
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
//                 custDetails.custAddr = customerRow?.addr || customerRow?.address || customerRow?.custAddr || custDetails.custAddr;
//                 custDetails.custTin = customerRow?.tin || customerRow?.tinNo || customerRow?.custTin || custDetails.custTin;
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
//             updateState({
//             salesRepCode: custDetails.salesRepCode,
//             salesRepName: custDetails.salesRepName,
//             custAddr: custDetails.custAddr || "",
//             custTin: custDetails.custTin || "",
//             vatCode: custDetails.vatCode,
//             vatName: custDetails.vatName,
//             atcCode: custDetails.atcCode,
//             atcName: custDetails.atcName,
//           })
//         ]);

//         if (modalContext === "addDetail") {
//           await handleOpenAddItemModal({
//             billToCustCode: custDetails.custCode || selectedData?.custCode || "",
//           });
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

//   const buildCsiDataForGl = (rows = detailRows, glRows = [], headerOverrides = {}) => {
//     const nextVatCode =
//       headerOverrides.vatCode !== undefined ? headerOverrides.vatCode : vatCode;
//     const nextAtcCode =
//       headerOverrides.atcCode !== undefined ? headerOverrides.atcCode : atcCode;
//     const totalValues = computeTotalsFromRows(rows, nextAtcCode);

//     return {
//       branchCode,
//       csiNo: documentNo || "",
//       csiId: documentID || "",
//       csiDate: documentDate,
//       csiTranType: csiTranType,
//       custCode: billToCustCode,
//       custName: billToCustName,
//       custAddr: custAddr || "",
//       custTin: custTin || "",
//       refCsiNo1,
//       refCsiNo2,
//       currCode: currCode || "PHP",
//       currRate: parseFormattedNumber(currRate),
//       atcAmount: totalValues.totalAtcAmt,
//       atcCode: nextAtcCode || "",
//       vatCode: nextVatCode || "",
//       remarks: remarks || "",
//       userCode,
//       salesRepCode,
//       salesRepName,
//       csiStatus: csiStatus || "O",
//       paymentType: paymentType || "",
//       bankCode: bankCode || "",
//       bank: bank || "",
//       acctCode: acctCode || "",
//       currAmount: parseFormattedNumber(totals.totalAmountDue || 0),
//       amount: parseFormattedNumber(totals.totalAmountDue || 0),
//       checkNo: checkNo || "",
//       checkDate: checkDate || null,
//       clearDate: clearDate || null,
//       dt1: rows.map((row, index) => ({
//         lnNo: String(index + 1),
//         pickStat: row.csiStat || "F",
//         csiStat: row.csiStat || "F",
//         groupId: row.groupId || "",
//         itemCode: row.itemCode || "",
//         itemName: row.itemName || "",
//         itemSpecs: row.itemSpecs || "",
//         uomCode: row.uomCode || "",
//         csiQuantity: parseFormattedNumber(row.csiQuantity || 0),
//         unitPrice: parseFormattedNumber(row.unitPrice || 0),
//         grossAmount: parseFormattedNumber(row.grossAmount || 0),
//         discRate: parseFormattedNumber(row.discRate || 0),
//         discAmount: parseFormattedNumber(row.discAmount || 0),
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
//         buildCsiDataForGl(rows, [], headerOverrides)
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
//       detailRowsGL: [],
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
//     detailRowsGL: [],
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
//         detailRowsGL: [],
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
//       detailRowsGL: [],
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

// const handleCloseBankMastModal = async (selectedBankCode) => {
//   if (selectedBankCode) {
//     const accountRow = selectedBankCode?.acctCode
//       ? await useTopAccountRow(selectedBankCode.acctCode)
//       : null;

//     updateState({
//       bankCode: selectedBankCode.bankCode || "",
//       acctCode: selectedBankCode.acctCode || "",
//       acctName: accountRow?.acctName || selectedBankCode.acctName || selectedBankCode.bankName || "",
//       detailRowsGL: [],
//       showBankMastModal: false,
//     });
//     return;
//   }

//   updateState({ showBankMastModal: false });
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

// const handleOpenItemPickingModal = async (index) => {
//   const row = detailRowsRef.current?.[index];
//   const requestedQty = parseFormattedNumber(row?.csiQuantity || 0) || 0;

//   if (!canUsePickingControls) return;

//   if (!documentID || !documentNo) {
//     useSwalErrorAlert("Item Picking", "Please save the CSI first before opening the picking allocation.");
//     return;
//   }

//   if (!row?.itemCode) {
//     useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
//     return;
//   }

//   if (!row?.groupId) {
//     useSwalErrorAlert("Item Picking", "Please save and reload the CSI first before opening the picking allocation.");
//     return;
//   }

//   if (requestedQty <= 0) {
//     useSwalErrorAlert("Item Picking", "CSI Quantity must be greater than zero before opening the picking allocation.");
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
//     const siQuantityValue = parseFormattedNumber(currentRow?.csiQuantity || 0) || 0;

//     updatedRows[itemPickingRowIndex] = {
//       ...currentRow,
//       csiStat:
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
//     useSwalErrorAlert("Item Picking", "Please save the CSI first before using Allocate All or Release All.");
//     return;
//   }

//   const confirm = await useSwalProceedConfirm(
//     `${actionLabel}?`,
//     isRelease
//       ? "This will release all picking allocations for the CSI details."
//       : "This will automatically pick available stock for all eligible CSI details.",
//     "Yes"
//   );

//   if (!confirm?.isConfirmed) return;

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     const updatedRows = [...rows];

//     for (const [index, row] of rows.entries()) {
//       const requestedQty = parseFormattedNumber(row?.csiQuantity || 0) || 0;
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
//         csiStat:
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
//     const updatedRows = [...detailRows];
//     const baseRow = {
//       ...updatedRows[selectedRowIndex],
//       itemCode: selectedItem?.itemCode || "",
//       itemName: selectedItem?.itemName || "",
//       itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
//       uomCode: selectedItem?.uomCode || "",
//       vatCode: vatCode || selectedItem?.vatCode || "",
//       vatRate: formatNumber(selectedItem?.vatRate ?? getDetailVatRate(vatCode || selectedItem?.vatCode || "")),
//       unitPrice: formatNumber(selectedItem?.sellPrice ?? selectedItem?.sellingPrice ?? selectedItem?.unitPrice ?? 0, sellingPriceDecimals),
//     };
//     updatedRows[selectedRowIndex] = calculateRowAmountsFromRates(baseRow);
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


// const validateSIQuantity = () => true;


// const recalculateSODetailRow = (row = {}, changedField = "") => {
//   const discountRateFields = [
//     "discRate",
//     "discRate2",
//     "discRate3",
//     "discRate4",
//     "discRate5",
//     "discRate6",
//     "discRate7",
//     "discRate8",
//   ];
//   const discountAmountFields = [
//     "discAmount",
//     "discAmount2",
//     "discAmount3",
//     "discAmount4",
//     "discAmount5",
//     "discAmount6",
//     "discAmount7",
//     "discAmount8",
//   ];

//   const quantity = parseFormattedNumber(row.csiQuantity || 0) || 0;
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
//     "discRate",
//     "discRate2",
//     "discRate3",
//     "discRate4",
//     "discRate5",
//     "discRate6",
//     "discRate7",
//     "discRate8",
//   ];
//   const discountAmountFields = [
//     "discAmount",
//     "discAmount2",
//     "discAmount3",
//     "discAmount4",
//     "discAmount5",
//     "discAmount6",
//     "discAmount7",
//     "discAmount8",
//   ];
//   const calculationTriggerFields = [
//     "csiQuantity",
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

// const handleCSIDetailRowChange = handleSODetailRowChange;

// const enterNextRowZeroClearFields = [
//   "csiQuantity",
//   "unitPrice",
//   "discRate",
//   "discRate2",
//   "discRate3",
//   "discRate4",
//   "discRate5",
//   "discRate6",
//   "discRate7",
//   "discRate8",
//   "discAmount",
//   "discAmount2",
//   "discAmount3",
//   "discAmount4",
//   "discAmount5",
//   "discAmount6",
//   "discAmount7",
//   "discAmount8",
// ];

// const renderCSIDetailCell = (columnKey, row, index) => {
//   const columnWidth = getDetailColumnFallbackWidth(columnKey);
//   const style = getDetailCellStyle(columnKey, columnWidth);
//   const canEditPickingStatus = false;
//   const canSearchItem = true;
  
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
//         handleCSIDetailRowChange(nextIndex, nextField, value),
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
//         handleCSIDetailRowChange(index, field, sanitizedValue);
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
//     csiStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`csiStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.csiStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleCSIDetailRowChange(index, "csiStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("csiStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
//     itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
//     itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
//     itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
//     uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.groupId || ""} readOnly /></td>,
//     csiQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: isFormDisabled, onBlur: (e) => validateSIQuantity(index, e.target.value), onKeyDown: (e) => validateSIQuantity(index, e.target.value) })}</td>,
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
//               disabled={!row?.itemCode || (parseFormattedNumber(row?.csiQuantity || 0) || 0) <= 0}
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
//     unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: sellingPriceDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`), blocked: () => row.freeItem === "Y", readOnly: isFormDisabled || row.freeItem === "Y" })}</td>,
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
//     freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled} onClick={() => handleCSIDetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>,
//   };

//   if (visibleDiscountRateFields.includes(columnKey) || visibleDiscountAmountFields.includes(columnKey)) {
//     detailColumnRenderers[columnKey] = () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { blocked: () => row.freeItem === "Y", readOnly: isFormDisabled || row.freeItem === "Y" })}</td>;
//   }

//   return detailColumnRenderers[columnKey]?.() ?? null;
// };

// const renderCcsiGlCell = (columnKey, row, index) => {
//   const columnWidth = getCcsiGlFallbackWidth(columnKey);
//   const style = getCcsiGlCellStyle(columnKey, columnWidth);
//   const glModalHandlers = {
//     acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
//     rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, modalContext: "glRC" }),
//     slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
//     vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "glVAT" }),
//     atcCode: () => updateState({ selectedRowIndex: index, showATCModal: true, modalContext: "glATC" }),
//   };

//   const focusNextGlCell = (field) => {
//     focusNextCsiGlRowInput(index, field, {
//       rows: detailRowsGL,
//       zeroClearFields: csiGlEnterNextRowZeroClearFields,
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
//         focusNextCsiGlRowInput(index, field, {
//           rows: detailRowsGL,
//           zeroClearFields: csiGlEnterNextRowZeroClearFields,
//           parseValue: parseFormattedNumber,
//           onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
//         });
//       }}
//       onFocus={(e) => clearCsiGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
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

//         detailsRoute="/page/CSI"

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

//         {/* CSI Header Form Section - Main Grid Container */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="csi_hd">

//           <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             <div className="global-tran-textbox-group-div-ui">
//               {renderCsiHeaderField("branchName", (
//                 <FieldRenderer
//                   id="branchName"
//                   label={getCsiHeaderLabel("branchName", "Branch")}
//                   type="lookup"
//                   value={branchName || ""}
//                   disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
//                   onLookup={() => updateState({ branchModalOpen: true })}
//                 />
//               ))}

//               {renderCsiHeaderField("csiNo", (
//                 <FieldRenderer
//                   id="csiNo"
//                   label={getCsiHeaderLabel("csiNo", "CSI No.")}
//                   type="lookup"
//                   value={state.documentNo || documentNo || ""}
//                   disabled={state.isDocNoDisabled}
//                   onChange={(val) => updateState({ documentNo: val })}
//                   onBlur={handlecsiNoBlur}
//                   onLookup={() => updateState({ showAllTranDocNo: true })}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       e.preventDefault();
//                       handlecsiNoBlur();
//                       document.getElementById("documentDate")?.focus();
//                     }
//                   }}
//                 />
//               ))}

//               {renderCsiHeaderField("documentDate", (
//                 <div className="relative w-full">
//                   <div
//                     className={`flex items-stretch global-ref-textbox-ui ${
//                       !isFormDisabled
//                         ? "global-ref-textbox-enabled"
//                         : "global-ref-textbox-disabled"
//                     }`}
//                   >
//                     <DateFormatInput
//                       id="documentDate"
//                       className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                       value={documentDate}
//                       disabled={isFormDisabled}
//                       updateState={updateState}
//                     />
//                   </div>
//                   <label
//                     htmlFor="documentDate"
//                     className={`global-ref-floating-label ${
//                       !isFormDisabled
//                         ? "global-ref-label-enabled"
//                         : "global-ref-label-disabled"
//                     }`}
//                   >
//                     {getCsiHeaderLabel("documentDate", "CSI Date")}
//                   </label>
//                 </div>
//               ))}

//               {renderCsiHeaderField("billToCustCode", (
//                 <FieldRenderer
//                   id="billToCustCode"
//                   label={getCsiHeaderLabel("billToCustCode", "Bill To Customer Code")}
//                   required
//                   type="lookup"
//                   value={billToCustCode || ""}
//                   disabled={isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFetchDisabled}
//                   onLookup={() => updateState({ custModalOpen: true })}
//                 />
//               ))}

//               {renderCsiHeaderField("billToCustName", (
//                 <FieldRenderer
//                   id="billToCustName"
//                   label={getCsiHeaderLabel("billToCustName", "Bill To Customer Name")}
//                   required
//                   type="text"
//                   value={billToCustName || ""}
//                   disabled
//                   readOnly
//                 />
//               ))}

//               {renderCsiHeaderField("custAddr", (
//                 <FieldRenderer
//                   id="custAddr"
//                   label={getCsiHeaderLabel("custAddr", "Address")}
//                   type="text"
//                   value={custAddr || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ custAddr: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "cust_addr")}
//                 />
//               ))}

//               {renderCsiHeaderField("custTin", (
//                 <FieldRenderer
//                   id="custTin"
//                   label={getCsiHeaderLabel("custTin", "TIN")}
//                   type="text"
//                   value={custTin || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ custTin: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "cust_tin")}
//                 />
//               ))}
//             </div>

//             <div className="global-tran-textbox-group-div-ui">
//               {renderCsiHeaderField("csiTranType", (
//                 <FieldRenderer
//                   id="csiTranType"
//                   label={getCsiHeaderLabel("csiTranType", "CSI Type")}
//                   type="select"
//                   value={csiTranType || ""}
//                   disabled={isFormDisabled || hasCsiDetailRows}
//                   onChange={(val) => updateState({ csiTranType: val })}
//                   options={(csiTranTypeOptions || []).map((t) => ({
//                     label: t.DROPDOWN_NAME,
//                     value: t.DROPDOWN_CODE,
//                   }))}
//                 />
//               ))}

//               {renderCsiHeaderField("paymentType", (
//                 <FieldRenderer
//                   id="paymentType"
//                   label={getCsiHeaderLabel("paymentType", "Payment Type")}
//                   required
//                   type="select"
//                   value={paymentType || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ paymentType: val })}
//                   options={(paymentTypeOptions || []).map((t) => ({
//                     label: t.DROPDOWN_NAME,
//                     value: t.DROPDOWN_CODE,
//                   }))}
//                 />
//               ))}

//               {renderCsiHeaderField("bankCode", (
//                 <FieldRenderer
//                   id="bankCode"
//                   label={getCsiHeaderLabel("bankCode", "Depository Bank")}
//                   required
//                   type="lookup"
//                   value={acctName || bankCode || ""}
//                   disabled={isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFormDisabled}
//                   onLookup={() => updateState({ showBankMastModal: true })}
//                 />
//               ))}

//               {renderCsiHeaderField("checkNo", (
//                 <FieldRenderer
//                   id="checkNo"
//                   label={getCsiHeaderLabel("checkNo", "Check No.")}
//                   type="text"
//                   value={checkNo || ""}
//                   disabled={isFormDisabled || !(String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03")}
//                   onChange={(val) => updateState({ checkNo: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "check_no")}
//                 />
//               ))}

//               {renderCsiHeaderField("checkDate", (
//                 <div className="relative w-full">
//                   <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
//                     <DateFormatInput
//                       id="checkDate"
//                       className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                       value={checkDate}
//                       disabled={isFormDisabled || !(String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03")}
//                       updateState={updateState}
//                     />
//                   </div>
//                   <label htmlFor="checkDate" className="global-ref-floating-label">
//                     {getCsiHeaderLabel("checkDate", "Check Date")}
//                   </label>
//                 </div>
//               ))}

//               {renderCsiHeaderField("bank", (
//                 <FieldRenderer
//                   id="bank"
//                   label={getCsiHeaderLabel("bank", String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03" ? "Check Bank" : "Bank")}
//                   type="text"
//                   value={bank || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ bank: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "bank")}
//                 />
//               ))}
//             </div>

//             <div className="global-tran-textbox-group-div-ui">
//               {renderCsiHeaderField("atcName", (
//                 <FieldRenderer
//                   id="atcName"
//                   label={getCsiHeaderLabel("atcName", "ATC (Goods)")}
//                   required
//                   type="lookup"
//                   value={atcName || ""}
//                   disabled={isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFormDisabled}
//                   onLookup={() => updateState({ showATCModal: true })}
//                 />
//               ))}

//               {renderCsiHeaderField("vatName", (
//                 <FieldRenderer
//                   id="vatName"
//                   label={getCsiHeaderLabel("vatName", "VAT (Goods)")}
//                   required
//                   type="lookup"
//                   value={vatName || ""}
//                   disabled={isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFormDisabled}
//                   onLookup={() => updateState({ showVatModal: true, selectedRowIndex: null, modalContext: "headerVAT" })}
//                 />
//               ))}

//               {renderCsiHeaderField("salesRepName", (
//                 <FieldRenderer
//                   id="salesRepName"
//                   label={getCsiHeaderLabel("salesRepName", "Sales Rep")}
//                   required
//                   type="lookup"
//                   value={salesRepName || ""}
//                   disabled={isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFormDisabled}
//                   onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
//                 />
//               ))}

//               {renderCsiHeaderField("refCsiNo1", (
//                 <FieldRenderer
//                   id="refCsiNo1"
//                   label={getCsiHeaderLabel("refCsiNo1", "Ref CSI No. 1")}
//                   type="text"
//                   value={refCsiNo1 || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ refCsiNo1: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "refcsi_no1")}
//                 />
//               ))}

//               {renderCsiHeaderField("refCsiNo2", (
//                 <FieldRenderer
//                   id="refCsiNo2"
//                   label={getCsiHeaderLabel("refCsiNo2", "Ref CSI No. 2")}
//                   type="text"
//                   value={refCsiNo2 || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ refCsiNo2: val })}
//                   maxLength={useGetFieldLength(tblFieldArray, "refcsi_no2")}
//                 />
//               ))}
//             </div>

//             {renderCsiHeaderField("remarks", (
//               <div className="col-span-full">
//                 <div className="relative p-2">
//                   <textarea
//                     id="remarks"
//                     placeholder=""
//                     rows={6}
//                     className="peer global-tran-textbox-remarks-ui pt-2"
//                     value={remarks}
//                     onChange={(e) => updateState({ remarks: e.target.value })}
//                     disabled={isFormDisabled}
//                     maxLength={useGetFieldLength(tblFieldArray, "remarks")}
//                   />
//                   <label
//                     htmlFor="remarks"
//                     className="global-tran-floating-label-remarks"
//                   >
//                     {getCsiHeaderLabel("remarks", "Remarks")}
//                   </label>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="global-tran-textbox-group-div-ui">
//             <div className="flex gap-4">
//               <input type="hidden" id="currCode" value={currCode || ""} readOnly />

//               {renderCsiHeaderField("currName", (
//                 <div className="flex-grow w-2/3">
//                   <FieldRenderer
//                     id="currName"
//                     label={getCsiHeaderLabel("currName", "Currency")}
//                     value={
//                       currCode
//                         ? `${currCode}${currName ? ` - ${currName}` : ""}`
//                         : ""
//                     }
//                     disabled
//                     readOnly
//                     type="text"
//                   />
//                 </div>
//               ))}

//               {renderCsiHeaderField("currRate", (
//                 <div className="flex-grow">
//                   <FieldRenderer
//                     id="currRate"
//                     label={getCsiHeaderLabel("currRate", "Currency Rate")}
//                     type="amount"
//                     value={currRate || ""}
//                     disabled={isFormDisabled || glCurrDefault === currCode}
//                     onChange={(val) => {
//                       const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
//                       if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
//                         updateState({ currRate: sanitizedValue });
//                       }
//                     }}
//                     onBlur={handleCurrRateNoBlur}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter") {
//                         e.preventDefault();
//                         document.getElementById("refCsiNo1")?.focus();
//                       }
//                     }}
//                     onFocus={(e) => {
//                       if (!isFormDisabled && parseFormattedNumber(e.target.value) === 0) {
//                         updateState({ currRate: "" });
//                       }
//                     }}
//                   />
//                 </div>
//               ))}
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
//           <div id="csi_dtl" className="global-tran-tab-div-ui">

//           {/* Tab Navigation */}
//           <div className="global-tran-tab-nav-ui">

//           {/* Tabs */}
//           <div className="flex flex-row sm:flex-row">
//             <button
//               className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
//             > {/* This is correct */}
//               CSI Details
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
//                   renderCSIDetailCell(column.key, row, originalIndex)
//                 )}

//                 {!isFormDisabled && (
//                   <td
//                     className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
//                     style={transactionActionsCellStyle}
//                   >
//                     <div className="flex items-center justify-center gap-1">
//                       <button
//                           type="button"
//                           className="global-tran-td-button-add-ui"
//                           onClick={() => handleInsertBlankRow(originalIndex)}
//                         >
//                           <FontAwesomeIcon icon={faPlus} />
//                         </button>

//                       <button
//                         type="button"
//                         className="global-tran-td-button-delete-ui"
//                         onClick={() => handleDeleteRow(originalIndex)}
//                         title={
//                           isPickingCsiType && pickedQty > 0
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
//                 {orderedCcsiGlColumns.map((column) =>
//                   renderCcsiGlHeader(column.label, column.key, column.width, {
//                     orderedColumns: orderedCcsiGlColumns,
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
//               {sortedCcsiGlRows.map(({ row, originalIndex }) => (
//                 <tr key={originalIndex} className="global-tran-tr-ui">
//                   {orderedCcsiGlColumns.map((column) =>
//                     renderCcsiGlCell(column.key, row, originalIndex)
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
//           {renderCcsiGlHeaderContextMenu()}
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

//     {custModalOpen && (
//       <CustomerMastLookupModal
//         isOpen={custModalOpen}
//         onClose={handleCloseCustModal}
//         customParam={undefined}
//       />
//     )}


//     {showBankMastModal && (
//       <BankMastLookupModal
//         isOpen={showBankMastModal}
//         onClose={handleCloseBankMastModal}
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
//         docType="SO"
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
//           sourceDocType: "CSI",
//           sourceDocTypeName: "Cash Cash Sales Invoice",
//           sourceDocNo: documentNo || "New CSI",
//           sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
//           groupId: selectedPickingRow?.groupId || "",
//           customerCode: billToCustCode || "",
//           customerName: billToCustName || "",
//           itemCode: selectedPickingRow?.itemCode || "",
//           itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
//           requestedQty: parseFormattedNumber(selectedPickingRow?.csiQuantity || 0) || 0,
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
//         params={{branchCode,branchName,docType,documentTitle,fieldNo : "csiNo"}}
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
//     endpoint="/getCSIHistory"
//     cacheKey={`CSI:${state.branchCode || ""}`}
//     activeTabKey="CSI_Summary"
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

// export default CSI;






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
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// Configuration
import { postRequest } from '../../../Configuration/BaseURL.jsx'
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
  useTopAccountRow,
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
  useSelectedHSColConfig
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
const CSI = () => {

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
  const docType = docTypes.CSI || "CSI";
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
    isGeneratingGL: false,
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
    custAddr: "",
    custTin: "",
    salesRepCode: "",
    salesRepName: "",
    atcCode: "",
    atcName: "",
    vatCode: "",
    vatName: "",

    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),

    //Other Header Info
    tblFieldArray :[],
    csiStatus: "O",
    csiTranType: "",
    csiTranTypeOptions: [],
    csiStatusOptions: [],

    paymentType: "",
    paymentTypeOptions: [],
    bankCode: companyInfo?.depBankcode||"",
    bank: "",
    acctCode: companyInfo?.depositBankAcctCode || "",
    acctName: companyInfo?.depositBankName || "",
    currAmount: "0.00",
    amount: "0.00",
    checkNo: "",
    checkDate: "",
    clearDate: "",
    refCsiNo1: "",
    refCsiNo2: "",
    remarks: "",
    userCode: currentUserRow?.userCode||"",

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],

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
    showSalesRepModal:false,
    showItemModal:false,    
    showATCModal:false,
    showVatModal:false,
    showBankMastModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showAllTranDocNo:false,
   });

  const updateState = (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    };

  const [csiHeaderColConfig, setCsiHeaderColConfig] = useState([]);

  useEffect(() => {
    if (!refsLoaded) return;

    let isMounted = true;

    const loadCsiHeaderColConfig = async () => {
      try {
        const configRows = await useSelectedHSColConfig("CSI_Header");
        if (isMounted && Array.isArray(configRows)) {
          setCsiHeaderColConfig(configRows);
        }
      } catch (error) {
        if (isMounted) {
          setCsiHeaderColConfig([]);
        }
        console.warn("CSI_Header hs_colconfig is not available.", error);
      }
    };

    loadCsiHeaderColConfig();

    return () => {
      isMounted = false;
    };
  }, [refsLoaded]);

  const getCsiHeaderFieldConfig = useCallback(
    (fieldKey) =>
      (csiHeaderColConfig || []).find(
        (config) => String(config?.key || "").toLowerCase() === String(fieldKey || "").toLowerCase()
      ) || {},
    [csiHeaderColConfig]
  );

  const getCsiHeaderLabel = useCallback(
    (fieldKey, fallbackLabel) => getCsiHeaderFieldConfig(fieldKey)?.label || fallbackLabel,
    [getCsiHeaderFieldConfig]
  );

  const isCsiHeaderFieldHidden = useCallback(
    (fieldKey) => Number(getCsiHeaderFieldConfig(fieldKey)?.hidden || 0) === 1,
    [getCsiHeaderFieldConfig]
  );

  const renderCsiHeaderField = (fieldKey, element) =>
    isCsiHeaderFieldHidden(fieldKey) ? null : element;

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
  isGeneratingGL,

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
  custAddr,
  custTin,
  salesRepCode,
  salesRepName,
  atcCode,
  atcName,
  vatCode,
  vatName,
  currCode,
  currName,
  currRate,
  csiTranType,
  csiTranTypeOptions = [],
  csiStatus,
  csiStatusOptions = [],
  paymentType,
  paymentTypeOptions = [],
  bankCode,
  bank,
  acctCode,
  acctName,
  currAmount,
  amount,
  checkNo,
  checkDate,
  clearDate,
  refCsiNo1,
  refCsiNo2,
  remarks,

  // Transaction details
  tblFieldArray,
  detailRows,
  detailRowsGL,
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
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAllTranDocNo,
  showATCModal,
  showVatModal,
  showBankMastModal

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
  const canViewCostAmount =
    String(currentUserRow?.viewCostamt || "").toUpperCase() === "Y";
  const totalCsiQuantity = detailRows.reduce((total, row) => total + (parseFormattedNumber(row.csiQuantity || 0) || 0),0);
  const hasPickedQuantity = (detailRows || []).some(
    (row) => (parseFormattedNumber(row.quantityPicked || 0) || 0) > 0
  );

  const filteredHeaderSiStatusOptions =
    !isPosted && totalCsiQuantity > 0
      ? (csiStatusOptions || []).filter(
          (option) =>
            ["O", "C"].includes(option.DROPDOWN_CODE) ||            
            option.DROPDOWN_CODE === csiStatus
        )
      : csiStatusOptions;

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
    headerAcctCode: glAccountFilter.ActiveAll,
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
  const salesAllowDuplicateItem = String(companyInfo?.salesAllowDuplicateItem || "").toUpperCase();
  const isSellingPriceAndDiscountEditable = true;
  const CSI_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";

  // Discount configuration
  const showTotalDiscountColumn = false;
  const visibleDiscountRateFields = ["discRate"];
  const visibleDiscountAmountFields = ["discAmount"];

  const detailColumnDefs = [
    { key: "groupId", label: "Group ID", width: 120 },
    { key: "ln", label: "LN", width: 56 },
    { key: "csiStat", label: "Picking Status", width: 130 },
    { key: "itemCode", label: "Item Code", width: 140 },
    { key: "itemName", label: "Item Name", width: 240 },
    { key: "itemSpecs", label: "Specification", width: 240 },
    { key: "uomCode", label: "UOM", width: 100 },
    { key: "csiQuantity", label: "CSI Quantity", width: 120 },
    { key: "quantityPicked", label: "Quantity Picked", width: 130 },
    { key: "itemAmount", label: "Item Amount", width: 130 },
    { key: "unitPrice", label: "Selling Price", width: 130 },
    { key: "grossAmount", label: "Gross Amount", width: 130 },
    ...visibleDiscountRateFields.map((field) => ({
      key: field,
      label: "Disc Rate",
      width: 110,
    })),
    ...visibleDiscountAmountFields.map((field) => ({
      key: field,
      label: "Disc Amount",
      width: 120,
    })),
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
  const normalizedCsiTranType = String(csiTranType || "").toUpperCase();
  const isDirectCsiType = true;
  const isPickingCsiType = true;
  const canUsePickingControls = !isViewDocumentUrl && isOpenStatus && !isPosted && !isCancelled;
  const isAddItemDisabledByCsiType = false;
  const hasCsiDetailRows = (detailRows || []).length > 0;
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
  }, [setSoDetailColumnOrder]);

  useEffect(() => {
    const hiddenColumnKeys = ["groupId", "vatRate"];

    if (!isPickingCsiType) {
      hiddenColumnKeys.push("csiStat", "quantityPicked");
    }

    if (!(isPosted && canViewCostAmount)) {
      hiddenColumnKeys.push("itemAmount");
    }



    setSoDetailHiddenColumnKeys(hiddenColumnKeys);
  }, [setSoDetailHiddenColumnKeys, isPosted, canViewCostAmount, isDirectCsiType, isPickingCsiType, normalizedCsiTranType]);


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

  const csiGlColumnDefs = [
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
    getColumnStyle: getCcsiGlColumnStyle,
    getFrozenColumnStyle: getCcsiGlFrozenStyle,
    getOrderedColumns: getOrderedCsiGlColumns,
    getSortedRows: getSortedCsiGlRows,
    setColumnOrder: setCcsiGlColumnOrder,
    clearZeroValueOnFocus: clearCsiGlZeroOnFocus,
    focusNextRowInput: focusNextCsiGlRowInput,
    renderHeaderContextMenu: renderCcsiGlHeaderContextMenu,
    renderResizableHeader: renderCcsiGlHeader,
  } = useResizableTableColumns(csiGlColumnDefs);
  const orderedCcsiGlColumns = getOrderedCsiGlColumns(csiGlColumnDefs);
  const getCcsiGlFallbackWidth = (key) =>
    csiGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCcsiGlCellStyle = (key, fallbackWidth) => ({
    ...getCcsiGlColumnStyle(key, fallbackWidth),
    ...getCcsiGlFrozenStyle(key, orderedCcsiGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setCcsiGlColumnOrder(csiGlColumnDefs.map((column) => column.key));
  }, [setCcsiGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedCcsiGlRows = getSortedCsiGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const csiGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];

  const setGLActiveTab = (tab) => updateState({ GLactiveTab: tab });

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
      `CSI Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all CSI Detail rows?`,
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

    const filteredTypes = getAllDropDown("CSITRAN_TYPE", docType) || [];
    const filteredPaymentTypes = getAllDropDown("PAYMENT_TYPE", docType) || [];

    const defaultCsiType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "CSI01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "";

    const defaultPaymentType =
      filteredPaymentTypes.find((type) => type.DROPDOWN_CODE === "AR02")?.DROPDOWN_CODE ||
      filteredPaymentTypes[0]?.DROPDOWN_CODE ||
      "";

    const mapHeaderCsiStatus = (value) => {
      const normalizedValue = String(value || "").toUpperCase();
      if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
      if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
      if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
      return "O";
    };

    updateState({
      csiTranTypeOptions: filteredTypes,
      csiTranType: state.csiTranType || defaultCsiType,
      paymentTypeOptions: filteredPaymentTypes,
      paymentType: state.paymentType || defaultPaymentType,
      csiStatusOptions: [
        { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
        { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
        { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
      ],
      csiStatus: mapHeaderCsiStatus(state.csiStatus),
    });
}, [docType, refsLoaded]);

  const handleReset = () => {
      clearSoDetailSorting();
      const filteredTypes = getAllDropDown("CSITRAN_TYPE", docType) || [];
      const filteredPaymentTypes = getAllDropDown("PAYMENT_TYPE", docType) || [];

      const defaultCsiType =
        filteredTypes.find((type) => type.DROPDOWN_CODE === "CSI01")?.DROPDOWN_CODE ||
        filteredTypes[0]?.DROPDOWN_CODE ||
        "";

      const defaultPaymentType =
        filteredPaymentTypes.find((type) => type.DROPDOWN_CODE === "AR02")?.DROPDOWN_CODE ||
        filteredPaymentTypes[0]?.DROPDOWN_CODE ||
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
      refCsiNo1: "",
      refCsiNo2: "",
      salesRepCode:"",
      salesRepName:"",
      remarks:"",
      noReprints:"0",
      billToCustCode:"",
      billToCustName:"",
      custAddr:"",
      custTin:"",
      atcCode: "",
      atcName: "",
      vatCode: vatCode || "",
      vatName: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      ...getGLTotalsState([]),
      documentStatus:"",      
      csiTranTypeOptions: filteredTypes,
      csiTranType: defaultCsiType,
      paymentTypeOptions: filteredPaymentTypes,
      paymentType: defaultPaymentType,
      bankCode: companyInfo?.depBankcode||"",
      bank: "",
      acctCode: companyInfo?.depositBankAcctCode || "",
      acctName: companyInfo?.depositBankName || "",
      currAmount: "0.00",
      amount: "0.00",
      checkNo: "",
      checkDate: "",
      clearDate: "",
      csiStatus:"O",

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
      showBankMastModal: false,
      showSlModal: false,
      showSalesRepModal: false,
    });

    updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0);
  };

    const loadCompanyData = async () => {
        updateState({ isLoading: true });

        try {
          const hdtblcol_result = await useFieldLenghtCheck(
            "csi_hd,csi_dt1,csi_dt2"
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
    const data = await useFetchTranData(documentNo, branchCode, docType, "csiNo", direction);

    if (!data?.csiId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }

    // Format rows
    const retrievedDetailRows = distributeVatAcrossDetailRows((data.dt1 || []).map(item => ({
      ...item,
      csiStat: item.pickStat || item.csiStat || "F",
      csiQuantity: formatNumber(item.csiQuantity ?? 0,quantityDecimals),
      groupId: item.groupId || "",
      unitPrice: formatNumber(item.unitPrice??0,sellingPriceDecimals),
      grossAmount: formatNumber(item.grossAmount),
      discRate: formatNumber(item.discRate ?? 0),
      discAmount: formatNumber(item.discAmount ?? 0),
      totDiscount: formatNumber(item.totDiscount ?? 0),      
      vatAmount: formatNumber(item.vatAmount ?? 0),
      vatCode: item.vatCode || data.vatCode || "",
      vatRate: formatNumber(item.vatRate ?? 0),
      salesAmount: formatSalesAmount(item.netAmount ?? 0, item.vatAmount ?? 0),
      atcAmount: formatNumber(item.atcAmount ?? 0),
      amountDue: formatNumber(item.amountDue ?? 0),
      netAmount: formatNumber(item.netAmount ?? 0),
      quantityPicked: formatNumber(item.quantityPicked ?? item.qtyPicked ?? 0, quantityDecimals),
      itemAmount: item.itemAmount ?? formatNumber( 0),    })), { atcCode: data.atcCode || "" });

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
      documentStatus: data.csiStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.csiId,
      documentNo: data.csiNo,
      refCsiNo1: data.refCsiNo1 || "",
      refCsiNo2: data.refCsiNo2 || "",
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.csiDate),
      csiTranType: data.csiTranType,
      billToCustCode: data.custCode,
      billToCustName: data.custName,
      custAddr: data.custAddr || "",
      custTin: data.custTin || "",
      atcCode: data.atcCode || "",
      atcName: data.atcName || "",
      vatCode: data.vatCode || "",
      vatName: data.vatName || "",
      salesRepCode: data.salesRepCode || "",
      salesRepName: data.salesRepName || "",
      paymentType: data.paymentType || "",
      bankCode: data.bankCode || "",
      bank: data.bank || "",
      acctCode: data.acctCode || "",
      acctName: data.acctName || "",
      currAmount: formatNumber(data.currAmount ?? data.totalAmountDue ?? 0),
      amount: formatNumber(data.amount ?? data.totalAmountDue ?? 0),
      checkNo: data.checkNo || "",
      checkDate: data.checkDate ? useformatToDatev2(data.checkDate) : "",
      clearDate: data.clearDate ? useformatToDatev2(data.clearDate) : "",
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      csiStatus:
        String(data.csiStatus || "O").toUpperCase() === "OPEN"
          ? "O"
          : String(data.csiStatus || "O").toUpperCase() === "CANCELLED"
          ? "X"
          : String(data.csiStatus || "O").toUpperCase() === "CLOSED"
          ? "C"
          : String(data.csiStatus || "O"),
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

const handlecsiNoBlur = () => {

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

  if (isOpenStatus) {
    updateState({ isLoading: true });

    try {
        const {
        branchCode,
        documentNo,
        documentID,
        billToCustCode,
        billToCustName,
        refCsiNo1,
        refCsiNo2,
        salesRepCode,
        salesRepName,
        currCode,
        currRate,
        remarks,
        userCode,
        csiTranType,
        csiStatus,
        detailRows,
        detailRowsGL,
      } = state;

      let finalDetailRowsGL = [...detailRowsGL];

      const buildCsiData = (glRows = finalDetailRowsGL) => ({
        branchCode: branchCode,
        csiNo: documentNo || "",
        csiId: documentID || "",
        csiDate: documentDate,
        csiTranType: csiTranType,
        custCode: billToCustCode,
        custName: billToCustName,
        custAddr: custAddr || "",
        custTin: custTin || "",
        refCsiNo1: refCsiNo1,
        refCsiNo2: refCsiNo2,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        atcAmount: parseFormattedNumber(totals.totalAtcAmount),
        atcCode: atcCode || "",
        vatCode: vatCode || "",
        remarks: remarks || "",
        userCode: userCode,
        salesRepCode,
        salesRepName,
        csiStatus: csiStatus || 'O',
        paymentType: paymentType || '',
        bankCode: bankCode || '',
        bank: bank || '',
        acctCode: acctCode || '',
        currAmount: parseFormattedNumber(totals.totalAmountDue || 0),
        amount: parseFormattedNumber(totals.totalAmountDue || 0),
        checkNo: checkNo || '',
        checkDate: checkDate || null,
        clearDate: clearDate || null,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          pickStat: row.csiStat || "F",
          csiStat: row.csiStat || "F",
          groupId: row.groupId || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          csiQuantity: parseFormattedNumber(row.csiQuantity || 0),
          unitPrice: parseFormattedNumber(row.unitPrice || 0),
          grossAmount: parseFormattedNumber(row.grossAmount || 0),
          discRate: parseFormattedNumber(row.discRate || 0),
          discAmount: parseFormattedNumber(row.discAmount || 0),
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
            buildCsiData([])
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
            buildCsiData([])
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
          buildCsiData(finalDetailRowsGL),
          updateState,          
          "csiId",
          "csiNo"
        );

        if (response) {
          const responseDocNo =  response.data[0].csiNo;
          const responseDocId =  response.data[0].csiId;

          await fetchTranData(responseDocNo,branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }
        updateState({
          documentNo: response?.data?.[0]?.csiNo || "",
          documentID: response?.data?.[0]?.csiId || "",
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

  const createCSIDetailRow = (overrides = {}) => ({
      lnNo: "",
      csiStat: "F",
      groupId: "",
      itemCode: "",
      itemName: "",
      itemSpecs: "",
      uomCode: "",
      csiQuantity: Number(0).toFixed(quantityDecimals),
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
      discRate: "0.00",
      discAmount: "0.00",
      totDiscount: "0.00",      
      netAmount: "0.00",      
      freeItem: "",
      ...overrides,
    });

  const normalizeCSIDetailLineNumbers = (rows = []) =>
    rows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    }));

  const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
      return;
    }

    const updatedRows = [...detailRows];
    const normalizedInsertRows = rowsToInsert.map((row) => createCSIDetailRow(row));

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
    insertDetailRows([createCSIDetailRow()], insertIndex);
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
    if (CSI_ALLOW_DUPLICATE_ITEMS) {
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
        `These item(s) already exist in CSI Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
      );
    }

    return filteredRecords;
  };

  const calculateRowAmountsFromRates = (row) => {
    const discountRateFields = visibleDiscountRateFields;
    const discountAmountFields = visibleDiscountAmountFields;
    const quantity = parseFormattedNumber(row.csiQuantity || 0) || 0;
    let unitPrice = parseFormattedNumber(row.unitPrice || 0) || 0;

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

  const mapItemRecordToDetailRow = (item = {}) => {
   

    return createCSIDetailRow({
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      itemSpecs: item?.itemSpecs || "",
      uomCode: item?.uomCode || "",
      groupId: "",    
      csiQuantity: formatNumber( item?.csiQuantity ?? 0, quantityDecimals ),
      unitPrice: formatNumber(item?.unitPrice ?? item?.sellPrice ?? item?.sellingPrice ?? 0, sellingPriceDecimals),
      grossAmount: formatNumber(item?.grossAmount ?? 0),
      discRate: formatNumber(item?.discRate ?? 0),
      discAmount: formatNumber(item?.discAmount ?? 0),
      totDiscount: formatNumber(item?.totDiscount ?? 0),
      vatCode: vatCode || item?.vatCode || "",
      vatRate: formatNumber(item?.vatRate ?? 0),
      vatAmount: formatNumber(item?.vatAmount ?? 0),
      salesAmount: formatSalesAmount(item?.netAmount ?? 0, item?.vatAmount ?? 0),
      atcAmount: formatNumber(item?.atcAmount ?? 0),
      amountDue: formatNumber(item?.amountDue ?? 0),
      netAmount: formatNumber(item?.netAmount ?? 0),
      freeItem: item?.freeItem || "",
      quantityPicked: formatNumber(item?.quantityPicked ?? item?.qtyPicked ?? 0, quantityDecimals),
      itemAmount: formatNumber(item?.itemAmount ?? 0),
    });
  };
  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const rowsToInsert = selectedRecords.map((item) =>
      calculateRowAmountsFromRates(mapItemRecordToDetailRow(item))
    );

    insertDetailRows(rowsToInsert, insertAfterIndex);
  };






const cancelPickingAllocationForDeletedCSIRow = async (row) => {
  const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

  // No picked quantity, no need to call allocation API.
  if (pickedQty <= 0) {
    return true;
  }

  if (!documentID || !row?.groupId) {
    useSwalErrorAlert(
      "Delete CSI Detail",
      "Cannot release picking allocation. CSI ID or Group ID is missing."
    );
    return false;
  }

  const confirm = await useSwalProceedConfirm(
    "Delete Picked CSI Detail?",
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
          docCode: "CSI",
          docId: documentID,
          groupId: row.groupId,
          userCode: userCode || currentUserRow?.userCode || "",
          reason: "CSI detail line deleted.",
        },
      }),
    });

    return true;
  } catch (error) {
    console.error("Failed to release CSI FG picking allocation:", error);
    useSwalErrorAlert("Delete CSI Detail", getApiErrorMessage(error));
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

  const canDelete = await cancelPickingAllocationForDeletedCSIRow(rowToDelete);

  if (!canDelete) {
    return;
  }

  const updatedRows = normalizeCSIDetailLineNumbers(
    detailRows.filter((_, rowIndex) => rowIndex !== index)
  );

  detailRowsRef.current = updatedRows;

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
    triggerGLEntries: updatedRows.some(
      (row) => (parseFormattedNumber(row.quantityPicked || 0) || 0) > 0
    ),
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
      return; // Assuming CSI also requires detail rows to print
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};

  const handleOpenAddItemModal = async (overrides = {}) => {
    const lookupCustCode = String(overrides.billToCustCode ?? billToCustCode ?? "").trim();
    const fieldsToCheck = {
      "Header : Customer Code": lookupCustCode,
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
        "Add CSI Detail"
      );
      if (!branchIsValid) return;

      updateState({
        custModalOpen: true,
        modalContext: "addDetail",
      });
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
    docCode: "CSI",
    docNo: documentNo || "",
    docId: documentID || "",
    docDate: documentDate || null,
    branchCode: branchCode || "",
    groupId: row?.groupId || "",
    lineNo: index + 1,
    itemCode: row?.itemCode || "",
    requestedQty: parseFormattedNumber(row?.csiQuantity || 0) || 0,
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
          sourceDocType: "CSI",
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

const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return; // Assuming CSI also requires detail rows to cancel
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
    const copiedDetailRows = detailRows.map((row) => {
      const normalizedRow = calculateRowAmountsFromRates({
        ...row,
        csiStat: "F",
        allocated: "",
        totalAllocated: 0,
        quantityPicked: formatNumber(0, quantityDecimals),
        groupId: "",
        pickingAllocations: [],
      });

      return {
        ...normalizedRow,
        itemAmount: formatNumber(0),
      };
    });
    
    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "OPEN",
      csiStatus: "O",
      documentDate: nextDocumentDate,
      bankCode: "",
      bank: "",
      checkNo: "",
      checkDate: "",
      clearDate: "",
      refCsiNo1: "",
      refCsiNo2: "",
      noReprints: "0",
      detailRows: copiedDetailRows,
      detailRowsGL: [],
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
  const docNo = params.get("csiNo");
  const branchCode = params.get("branchCode");
  
  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);

  const printData = {
    csi_no: documentNo,
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

        const address = selectedData?.addr || selectedData?.address || selectedData?.custAddr || "";
        const tin = selectedData?.tin || selectedData?.tinNo || selectedData?.custTin || selectedData?.custTinNo || "";
        const selectedVatCode = selectedData?.vatCode || "";
        const selectedVatRow = getAllTopVatRow(selectedVatCode);
        const selectedVatName = selectedVatRow?.vatName || selectedData?.vatName || "";
        const selectedAtcCode = selectedData?.atcCode || "";
        const selectedAtcRow = getAllTopATCRow(selectedAtcCode);
        const selectedAtcName = selectedAtcRow?.atcName || selectedData?.atcName || "";
        const custDetails = {            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            custAddr: address,
            custTin: tin,
            currCode: selectedData?.currCode || '',
            salesRepCode: selectedData?.salesRepCode || '',
            salesRepName: selectedData?.salesRepName || '',
            vatCode: selectedVatCode,
            vatName: selectedVatName,
            atcCode: selectedAtcCode,
            atcName: selectedAtcName,

        };
        const nextBillToCustCode = selectedData?.custCode || "";
        updateState(
            {
                billToCustName: selectedData.custName,
                billToCustCode: selectedData.custCode,
                custAddr: address,
                custTin: tin,
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
                custDetails.custAddr = customerRow?.addr || customerRow?.address || customerRow?.custAddr || custDetails.custAddr;
                custDetails.custTin = customerRow?.tin || customerRow?.tinNo || customerRow?.custTin || custDetails.custTin;
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
            updateState({
            salesRepCode: custDetails.salesRepCode,
            salesRepName: custDetails.salesRepName,
            custAddr: custDetails.custAddr || "",
            custTin: custDetails.custTin || "",
            vatCode: custDetails.vatCode,
            vatName: custDetails.vatName,
            atcCode: custDetails.atcCode,
            atcName: custDetails.atcName,
          })
        ]);

        if (modalContext === "addDetail") {
          await handleOpenAddItemModal({
            billToCustCode: custDetails.custCode || selectedData?.custCode || "",
          });
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

  const buildCsiDataForGl = (rows = detailRows, glRows = [], headerOverrides = {}) => {
    const nextVatCode =
      headerOverrides.vatCode !== undefined ? headerOverrides.vatCode : vatCode;
    const nextAtcCode =
      headerOverrides.atcCode !== undefined ? headerOverrides.atcCode : atcCode;
    const totalValues = computeTotalsFromRows(rows, nextAtcCode);

    return {
      branchCode,
      csiNo: documentNo || "",
      csiId: documentID || "",
      csiDate: documentDate,
      csiTranType: csiTranType,
      custCode: billToCustCode,
      custName: billToCustName,
      custAddr: custAddr || "",
      custTin: custTin || "",
      refCsiNo1,
      refCsiNo2,
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      atcAmount: totalValues.totalAtcAmt,
      atcCode: nextAtcCode || "",
      vatCode: nextVatCode || "",
      remarks: remarks || "",
      userCode,
      salesRepCode,
      salesRepName,
      csiStatus: csiStatus || "O",
      paymentType: paymentType || "",
      bankCode: bankCode || "",
      bank: bank || "",
      acctCode: acctCode || "",
      currAmount: parseFormattedNumber(totals.totalAmountDue || 0),
      amount: parseFormattedNumber(totals.totalAmountDue || 0),
      checkNo: checkNo || "",
      checkDate: checkDate || null,
      clearDate: clearDate || null,
      dt1: rows.map((row, index) => ({
        lnNo: String(index + 1),
        pickStat: row.csiStat || "F",
        csiStat: row.csiStat || "F",
        groupId: row.groupId || "",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        itemSpecs: row.itemSpecs || "",
        uomCode: row.uomCode || "",
        csiQuantity: parseFormattedNumber(row.csiQuantity || 0),
        unitPrice: parseFormattedNumber(row.unitPrice || 0),
        grossAmount: parseFormattedNumber(row.grossAmount || 0),
        discRate: parseFormattedNumber(row.discRate || 0),
        discAmount: parseFormattedNumber(row.discAmount || 0),
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
        buildCsiDataForGl(rows, [], headerOverrides)
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
      detailRowsGL: [],
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
    detailRowsGL: [],
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
      detailRowsRef.current = normalizedRows;

      updateState({
        detailRows: normalizedRows,
        detailRowsGL: [],
      });

      updateTotals(normalizedRows);
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
    detailRowsRef.current = normalizedRows;

    updateState({
      vatCode: nextVatCode,
      vatName: nextVatName,
      detailRows: normalizedRows,
      detailRowsGL: [],
      showVatModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });

    updateTotals(normalizedRows);
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

const handleCloseBankMastModal = async (selectedBankCode) => {
  if (selectedBankCode) {
    const accountRow = selectedBankCode?.acctCode
      ? await useTopAccountRow(selectedBankCode.acctCode)
      : null;

    updateState({
      bankCode: selectedBankCode.bankCode || "",
      acctCode: selectedBankCode.acctCode || "",
      acctName: accountRow?.acctName || selectedBankCode.acctName || selectedBankCode.bankName || "",
      detailRowsGL: [],
      showBankMastModal: false,
    });
    return;
  }

  updateState({ showBankMastModal: false });
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

const handleOpenItemPickingModal = async (index) => {
  const row = detailRowsRef.current?.[index];
  const requestedQty = parseFormattedNumber(row?.csiQuantity || 0) || 0;

  if (!canUsePickingControls) return;

  if (!documentID || !documentNo) {
    useSwalErrorAlert("Item Picking", "Please save the CSI first before opening the picking allocation.");
    return;
  }

  if (!row?.itemCode) {
    useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
    return;
  }

  if (!row?.groupId) {
    useSwalErrorAlert("Item Picking", "Please save and reload the CSI first before opening the picking allocation.");
    return;
  }

  if (requestedQty <= 0) {
    useSwalErrorAlert("Item Picking", "CSI Quantity must be greater than zero before opening the picking allocation.");
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
    const siQuantityValue = parseFormattedNumber(currentRow?.csiQuantity || 0) || 0;

    updatedRows[itemPickingRowIndex] = {
      ...currentRow,
      csiStat:
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
    useSwalErrorAlert("Item Picking", "Please save the CSI first before using Allocate All or Release All.");
    return;
  }

  const confirm = await useSwalProceedConfirm(
    `${actionLabel}?`,
    isRelease
      ? "This will release all picking allocations for the CSI details."
      : "This will automatically pick available stock for all eligible CSI details.",
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
        requestedQty: parseFormattedNumber(row?.csiQuantity || 0) || 0,
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
          ? "There are no valid CSI detail rows to release."
          : "There are no valid CSI detail rows to allocate."
      );
      return;
    }

    if (isRelease) {
      await postRequest("getFGUpdateStockAllocation", {
        mode: "BulkCancelAlloc",
        params: JSON.stringify({
          json_data: {
            docCode: "CSI",
            docId: documentID,
            userCode: userCode || currentUserRow?.userCode || "",
            reason: "CSI bulk release allocation.",
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
          csiStat: "F",
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
            docCode: "CSI",
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
          csiStat:
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
    const updatedRows = [...detailRows];
    const baseRow = {
      ...updatedRows[selectedRowIndex],
      itemCode: selectedItem?.itemCode || "",
      itemName: selectedItem?.itemName || "",
      itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
      uomCode: selectedItem?.uomCode || "",
      vatCode: vatCode || selectedItem?.vatCode || "",
      vatRate: formatNumber(selectedItem?.vatRate ?? getDetailVatRate(vatCode || selectedItem?.vatCode || "")),
      unitPrice: formatNumber(selectedItem?.sellPrice ?? selectedItem?.sellingPrice ?? selectedItem?.unitPrice ?? 0, sellingPriceDecimals),
    };
    updatedRows[selectedRowIndex] = calculateRowAmountsFromRates(baseRow);
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


const validateSIQuantity = () => true;

const CSI_MAX_DISC_RATE = 99.99;

const validateCSIDetailDiscounts = (row = {}, changedField = "", { showAlert = true } = {}) => {
  const validatedRow = {
    ...row,
  };
  const grossAmount = toFormattedAmountNumber(
    (parseFormattedNumber(validatedRow.csiQuantity || 0) || 0) *
    (parseFormattedNumber(validatedRow.unitPrice || 0) || 0)
  );
  const showDiscountAlert = (message) => {
    if (!showAlert) return;
    useSwalErrorAlert("CSI Discount Validation", message);
  };

  const discRate = parseFormattedNumber(validatedRow.discRate || 0) || 0;
  if (Math.abs(discRate) > CSI_MAX_DISC_RATE) {
    validatedRow.discRate = formatNumber(0);
    showDiscountAlert("Disc Rate must be from -99.99 to 99.99 only. Value reverted to zero.");
  }

  const discAmount = parseFormattedNumber(validatedRow.discAmount || 0) || 0;
  if (discAmount < 0 || discAmount > grossAmount) {
    validatedRow.discAmount = formatNumber(0);
    if (discAmount < 0) {
      showDiscountAlert("Disc Amount cannot be negative. Value reverted to zero.");
    } else if (changedField === "discAmount") {
      showDiscountAlert("Disc Amount cannot exceed Gross Amount. Value reverted to zero.");
    }
  }

  return validatedRow;
};


const recalculateSODetailRow = (row = {}, changedField = "") => {
  const validatedRow = validateCSIDetailDiscounts(row, changedField);
  const quantity = parseFormattedNumber(validatedRow.csiQuantity || 0) || 0;
  const unitPrice = parseFormattedNumber(validatedRow.unitPrice || 0) || 0;
  const grossAmount = toFormattedAmountNumber(quantity * unitPrice);
  const discRate = parseFormattedNumber(validatedRow.discRate || 0) || 0;
  const discAmountFromRate = toFormattedAmountNumber(grossAmount * (discRate * 0.01));
  const discAmount =
    changedField === "discAmount"
      ? toFormattedAmountNumber(parseFormattedNumber(validatedRow.discAmount || 0))
      : discAmountFromRate;
  const totalDiscount = discAmount;
  const netAmount = toFormattedAmountNumber(grossAmount - totalDiscount);
  const nextDiscRate =
    changedField === "discAmount" && grossAmount !== 0
      ? toFormattedAmountNumber((discAmount / grossAmount) * 100)
      : discRate;

  const vatAmount = parseFormattedNumber(validatedRow.vatAmount || 0) || 0;

  
  return {
    ...validatedRow,
    grossAmount: formatNumber(grossAmount),
    vatAmount: formatNumber(vatAmount),
    salesAmount: formatNumber(netAmount - vatAmount),
    // ATC is header-level only, not per detail row.
    atcAmount: formatNumber(0),
    amountDue: formatNumber(0),
    discRate: formatNumber(nextDiscRate),
    discAmount: formatNumber(discAmount),
    totDiscount: formatNumber(totalDiscount),
    netAmount: formatNumber(netAmount),
  };
};

const handleSODetailRowChange = (index, field, value) => {
  const calculationTriggerFields = [
    "csiQuantity",
    "unitPrice",
    "discRate",
    "discAmount",
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

    visibleDiscountRateFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    visibleDiscountAmountFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    return zeroedRow;
  };

  const updatedRows = [...(detailRowsRef.current || [])];
  let updatedRow = {
    ...updatedRows[index],
    [field]: value,
  };

  if (field === "freeItem") {
    updatedRow = buildFreeItemRow(updatedRow, value === "Y");
    updatedRows[index] = updatedRow;
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
    detailRowsRef.current = normalizedRows;
    updateState({ detailRows: normalizedRows });
    updateTotals(normalizedRows);
    return;
  }

  if (
    updatedRows[index]?.freeItem === "Y" &&
    ["unitPrice", ...visibleDiscountRateFields, ...visibleDiscountAmountFields].includes(field)
  ) {
    updatedRow = {
      ...updatedRows[index],
      [field]: zeroValueByField(field),
    };
    updatedRows[index] = buildFreeItemRow(updatedRow, true);
    const normalizedRows = distributeVatAcrossDetailRows(updatedRows);
    detailRowsRef.current = normalizedRows;
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

  detailRowsRef.current = normalizedRows;
  updateState({
    detailRows: normalizedRows,
    ...(calculationTriggerFields.includes(field) ? { detailRowsGL: [] } : {}),
  });
  updateTotals(normalizedRows);
};

const handleCSIDetailRowChange = handleSODetailRowChange;

const enterNextRowZeroClearFields = [
  "csiQuantity",
  "unitPrice",
  "discRate",
  "discAmount",
];

const renderCSIDetailCell = (columnKey, row, index) => {
  const columnWidth = getDetailColumnFallbackWidth(columnKey);
  const style = getDetailCellStyle(columnKey, columnWidth);
  const canEditPickingStatus = false;
  const canSearchItem = true;
  
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
        handleCSIDetailRowChange(nextIndex, nextField, value),
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
      let sanitizedValue = e.target.value.replace(
        options.allowNegative ? /[^0-9.-]/g : /[^0-9.]/g,
        ""
      );
      if (options.allowNegative) {
        sanitizedValue = sanitizedValue.replace(/(?!^)-/g, "");
      }
      const regex = options.regex || (options.allowNegative ? /^-?\d*\.?\d{0,2}$/ : /^\d*\.?\d{0,2}$/);
      if (regex.test(sanitizedValue) || sanitizedValue === "") {
        if (options.deferRecalculate) {
          const updatedRows = [...(detailRowsRef.current || detailRows || [])];
          updatedRows[index] = {
            ...updatedRows[index],
            [field]: sanitizedValue,
          };
          detailRowsRef.current = updatedRows;
          updateState({ detailRows: updatedRows });
          return;
        }
        handleCSIDetailRowChange(index, field, sanitizedValue);
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
    csiStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`csiStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.csiStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleCSIDetailRowChange(index, "csiStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("csiStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
    itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
    itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.groupId || ""} readOnly /></td>,
    csiQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: isFormDisabled, onBlur: (e) => validateSIQuantity(index, e.target.value), onKeyDown: (e) => validateSIQuantity(index, e.target.value) })}</td>,
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
              disabled={!row?.itemCode || (parseFormattedNumber(row?.csiQuantity || 0) || 0) <= 0}
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
    unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: sellingPriceDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`), blocked: () => row.freeItem === "Y", readOnly: isFormDisabled || row.freeItem === "Y" })}</td>,
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
    freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled} onClick={() => handleCSIDetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>,
  };

  if (visibleDiscountRateFields.includes(columnKey)) {
    detailColumnRenderers[columnKey] = () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        {numericInput(columnKey, {
          blocked: () => row.freeItem === "Y",
          readOnly: isFormDisabled || row.freeItem === "Y",
          deferRecalculate: true,
          allowNegative: true,
          regex: /^-?\d*\.?\d{0,2}$/,
        })}
      </td>
    );
  }

  if (visibleDiscountAmountFields.includes(columnKey)) {
    detailColumnRenderers[columnKey] = () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        {numericInput(columnKey, {
          blocked: () => row.freeItem === "Y",
          readOnly: isFormDisabled || row.freeItem === "Y",
          deferRecalculate: true,
          regex: /^\d*\.?\d{0,2}$/,
        })}
      </td>
    );
  }

  return detailColumnRenderers[columnKey]?.() ?? null;
};

const renderCcsiGlCell = (columnKey, row, index) => {
  const columnWidth = getCcsiGlFallbackWidth(columnKey);
  const style = getCcsiGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = {
    acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, modalContext: "glRC" }),
    slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
    vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, modalContext: "glVAT" }),
    atcCode: () => updateState({ selectedRowIndex: index, showATCModal: true, modalContext: "glATC" }),
  };

  const focusNextGlCell = (field) => {
    focusNextCsiGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: csiGlEnterNextRowZeroClearFields,
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
        focusNextCsiGlRowInput(index, field, {
          rows: detailRowsGL,
          zeroClearFields: csiGlEnterNextRowZeroClearFields,
          parseValue: parseFormattedNumber,
          onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
        });
      }}
      onFocus={(e) => clearCsiGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
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

        detailsRoute="/page/CSI"

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

        {/* CSI Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="csi_hd">

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="global-tran-textbox-group-div-ui">
              {renderCsiHeaderField("branchName", (
                <FieldRenderer
                  id="branchName"
                  label={getCsiHeaderLabel("branchName", "Branch")}
                  type="lookup"
                  value={branchName || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() => updateState({ branchModalOpen: true })}
                />
              ))}

              {renderCsiHeaderField("csiNo", (
                <FieldRenderer
                  id="csiNo"
                  label={getCsiHeaderLabel("csiNo", "CSI No.")}
                  type="lookup"
                  value={state.documentNo || documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onBlur={handlecsiNoBlur}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "F1") {
                      e.preventDefault();
                      updateState({ showAllTranDocNo: true });
                      return;
                    }

                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlecsiNoBlur();
                      document.getElementById("documentDate")?.focus();
                    }
                  }}
                />
              ))}

              {renderCsiHeaderField("documentDate", (
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
                    {getCsiHeaderLabel("documentDate", "CSI Date")}
                  </label>
                </div>
              ))}

              {renderCsiHeaderField("billToCustCode", (
                <FieldRenderer
                  id="billToCustCode"
                  label={getCsiHeaderLabel("billToCustCode", "Bill To Customer Code")}
                  required
                  type="lookup"
                  value={billToCustCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ custModalOpen: true })}
                />
              ))}

              {renderCsiHeaderField("billToCustName", (
                <FieldRenderer
                  id="billToCustName"
                  label={getCsiHeaderLabel("billToCustName", "Bill To Customer Name")}
                  required
                  type="text"
                  value={billToCustName || ""}
                  disabled
                  readOnly
                />
              ))}

              {renderCsiHeaderField("custAddr", (
                <FieldRenderer
                  id="custAddr"
                  label={getCsiHeaderLabel("custAddr", "Address")}
                  type="text"
                  value={custAddr || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ custAddr: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "cust_addr")}
                />
              ))}

              {renderCsiHeaderField("custTin", (
                <FieldRenderer
                  id="custTin"
                  label={getCsiHeaderLabel("custTin", "TIN")}
                  type="text"
                  value={custTin || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ custTin: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "cust_tin")}
                />
              ))}
            </div>

            <div className="global-tran-textbox-group-div-ui">
              {renderCsiHeaderField("csiTranType", (
                <FieldRenderer
                  id="csiTranType"
                  label={getCsiHeaderLabel("csiTranType", "CSI Type")}
                  type="select"
                  value={csiTranType || ""}
                  disabled={isFormDisabled || hasCsiDetailRows}
                  onChange={(val) => updateState({ csiTranType: val })}
                  options={(csiTranTypeOptions || []).map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />
              ))}

              {renderCsiHeaderField("paymentType", (
                <FieldRenderer
                  id="paymentType"
                  label={getCsiHeaderLabel("paymentType", "Payment Type")}
                  required
                  type="select"
                  value={paymentType || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ paymentType: val })}
                  options={(paymentTypeOptions || []).map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />
              ))}

              {renderCsiHeaderField("bankCode", (
                <FieldRenderer
                  id="bankCode"
                  label={getCsiHeaderLabel("bankCode", "Depository Bank")}
                  required
                  type="lookup"
                  value={acctName || bankCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFormDisabled}
                  onLookup={() => updateState({ showBankMastModal: true })}
                />
              ))}

              {renderCsiHeaderField("checkNo", (
                <FieldRenderer
                  id="checkNo"
                  label={getCsiHeaderLabel("checkNo", "Check No.")}
                  type="text"
                  value={checkNo || ""}
                  disabled={isFormDisabled || !(String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03")}
                  onChange={(val) => updateState({ checkNo: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "check_no")}
                />
              ))}

              {renderCsiHeaderField("checkDate", (
                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="checkDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={checkDate}
                      disabled={isFormDisabled || !(String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03")}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="checkDate" className="global-ref-floating-label">
                    {getCsiHeaderLabel("checkDate", "Check Date")}
                  </label>
                </div>
              ))}

              {renderCsiHeaderField("bank", (
                <FieldRenderer
                  id="bank"
                  label={getCsiHeaderLabel("bank", String(paymentType || "").toUpperCase() === "AR01" || String(paymentType || "").toUpperCase() === "AR03" ? "Check Bank" : "Bank")}
                  type="text"
                  value={bank || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ bank: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "bank")}
                />
              ))}
            </div>

            <div className="global-tran-textbox-group-div-ui">
              {renderCsiHeaderField("atcName", (
                <FieldRenderer
                  id="atcName"
                  label={getCsiHeaderLabel("atcName", "ATC (Goods)")}
                  required
                  type="lookup"
                  value={atcName || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFormDisabled}
                  onLookup={() => updateState({ showATCModal: true })}
                />
              ))}

              {renderCsiHeaderField("vatName", (
                <FieldRenderer
                  id="vatName"
                  label={getCsiHeaderLabel("vatName", "VAT (Goods)")}
                  required
                  type="lookup"
                  value={vatName || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFormDisabled}
                  onLookup={() => updateState({ showVatModal: true, selectedRowIndex: null, modalContext: "headerVAT" })}
                />
              ))}

              {renderCsiHeaderField("salesRepName", (
                <FieldRenderer
                  id="salesRepName"
                  label={getCsiHeaderLabel("salesRepName", "Sales Rep")}
                  required
                  type="lookup"
                  value={salesRepName || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFormDisabled}
                  onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
                />
              ))}

              {renderCsiHeaderField("refCsiNo1", (
                <FieldRenderer
                  id="refCsiNo1"
                  label={getCsiHeaderLabel("refCsiNo1", "Ref CSI No. 1")}
                  type="text"
                  value={refCsiNo1 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refCsiNo1: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refcsi_no1")}
                />
              ))}

              {renderCsiHeaderField("refCsiNo2", (
                <FieldRenderer
                  id="refCsiNo2"
                  label={getCsiHeaderLabel("refCsiNo2", "Ref CSI No. 2")}
                  type="text"
                  value={refCsiNo2 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refCsiNo2: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refcsi_no2")}
                />
              ))}
            </div>

            {renderCsiHeaderField("remarks", (
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
                    {getCsiHeaderLabel("remarks", "Remarks")}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <div className="flex gap-4">
              <input type="hidden" id="currCode" value={currCode || ""} readOnly />

              {renderCsiHeaderField("currName", (
                <div className="flex-grow w-2/3">
                  <FieldRenderer
                    id="currName"
                    label={getCsiHeaderLabel("currName", "Currency")}
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
              ))}

              {renderCsiHeaderField("currRate", (
                <div className="flex-grow">
                  <FieldRenderer
                    id="currRate"
                    label={getCsiHeaderLabel("currRate", "Currency Rate")}
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
                        document.getElementById("refCsiNo1")?.focus();
                      }
                    }}
                    onFocus={(e) => {
                      if (!isFormDisabled && parseFormattedNumber(e.target.value) === 0) {
                        updateState({ currRate: "" });
                      }
                    }}
                  />
                </div>
              ))}
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
          <div id="csi_dtl" className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            > {/* This is correct */}
              CSI Details
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
                  renderCSIDetailCell(column.key, row, originalIndex)
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
                          onClick={() => handleInsertBlankRow(originalIndex)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>

                      <button
                        type="button"
                        className="global-tran-td-button-delete-ui"
                        onClick={() => handleDeleteRow(originalIndex)}
                        title={
                          isPickingCsiType && pickedQty > 0
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
                {orderedCcsiGlColumns.map((column) =>
                  renderCcsiGlHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedCcsiGlColumns,
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
              {sortedCcsiGlRows.map(({ row, originalIndex }) => (
                <tr key={originalIndex} className="global-tran-tr-ui">
                  {orderedCcsiGlColumns.map((column) =>
                    renderCcsiGlCell(column.key, row, originalIndex)
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
          {renderCcsiGlHeaderContextMenu()}
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

    {custModalOpen && (
      <CustomerMastLookupModal
        isOpen={custModalOpen}
        onClose={handleCloseCustModal}
        customParam={undefined}
      />
    )}


    {showBankMastModal && (
      <BankMastLookupModal
        isOpen={showBankMastModal}
        onClose={handleCloseBankMastModal}
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
        docType="SO"
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
          sourceDocType: "CSI",
          sourceDocTypeName: "Cash Cash Sales Invoice",
          sourceDocNo: documentNo || "New CSI",
          sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
          groupId: selectedPickingRow?.groupId || "",
          customerCode: billToCustCode || "",
          customerName: billToCustName || "",
          itemCode: selectedPickingRow?.itemCode || "",
          itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
          requestedQty: parseFormattedNumber(selectedPickingRow?.csiQuantity || 0) || 0,
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "csiNo"}}
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
    endpoint="/getCSIHistory"
    cacheKey={`CSI:${state.branchCode || ""}`}
    activeTabKey="CSI_Summary"
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

export default CSI;




















