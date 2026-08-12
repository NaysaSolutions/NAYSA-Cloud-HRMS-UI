// import { useState, useEffect,useRef,useCallback, Fragment } from "react";
// import Swal from 'sweetalert2';
// import { useNavigate,useLocation  } from "react-router-dom";

// // UI
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faClipboardCheck, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// // Lookup/Modal
// import BranchLookupModal from "../../../Lookup/SearchBranchRef";
// import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
// import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
// import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
// import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
// import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
// import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
// import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
// import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
// import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
// import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
// import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
// import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
// import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
// import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// // Configuration
// import { fetchDataJson, postRequest} from '../../../Configuration/BaseURL.jsx'
// import { useReset } from "../../../Components/ResetContext";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import {
//   docTypes, docTypeVideoGuide, docTypePDFGuide,
// } from '@/NAYSA Cloud/Global/doctype';

// import {
//   useTransactionUpsert,
//   useGenerateGLEntries,
//   useUpdateRowGLEntries,
//   useFetchTranData,
//   useHandleCancel,
//   useFieldLenghtCheck,
//   useGetFieldLength,
// } from '@/NAYSA Cloud/Global/procedure';

// import {
//   useGetCurrentDayV2,
//   useformatToDatev2
// } from '@/NAYSA Cloud/Global/dates';

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
//   useSelectedHSColConfig as selectedHSColConfig
// } from '@/NAYSA Cloud/Global/selectedData';

// import {
//   useTopHSOption,
//   useTopRCRow,
//   useTopWarehouseRow,
// } from '@/NAYSA Cloud/Global/top1RefTable';


// import {
//   formatNumber,
//   parseFormattedNumber,
//   useSwalProceedConfirm,
//   useSwalInfoAlert,
//   useSwalvalidateRequiredFields,
//   useSwalshowSaveSuccessDialog,
//   useSwalSuccessAlert,
//   useSwalErrorAlert
// } from '@/NAYSA Cloud/Global/behavior.jsx';


// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// // Header
// import Header from '@/NAYSA Cloud/Components/Header';

// const DR = () => {

//   // View Document Const
//   const loadedFromUrlRef = useRef(false);
//   const detailRowsRef = useRef([]);
//   const detailRowsGLRef = useRef([]);
//   const detailSectionRef = useRef(null);
//   const originalSOQuantityRef = useRef({});
//   const addTypeDropdownRef = useRef(null);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopHSDocRow } = useAuth();

//   // Company defaults - moved here to ensure they are defined before use in useState
//   const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
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
//   const docType = docTypes.DR;
//   const hsDoc = getAllTopHSDocRow(docType);
//   const pdfLink = docTypePDFGuide[docType];
//   const videoLink = docTypeVideoGuide[docType];
//   const documentTitle = (hsDoc?.docName || '') + ' Transaction';

//   const [state, setState] = useState({
//     // HS Option
//     glCurrMode:"M",
//     glCurrDefault:"PHP",
//     withCurr2:false,
//     withCurr3:false,
//     glCurrGlobal1:"",
//     glCurrGlobal2:"",
//     glCurrGlobal3:"",

//     // Document information
//     documentName: hsDoc?.docName||"",
//     documentSeries: hsDoc?.docSeries||"Auto",
//     documentDocLen: hsDoc?.docLength||8,
//     documentID: null,
//     documentDate:useGetCurrentDayV2(),
//     documentNo: "",
//     documentStatus:"O",
//     originalDocStatus: "O",
//     status: "OPEN",
//     noReprints:"0",


//     // UI state
//     activeTab: "basic",
//     GLactiveTab: "invoice",
//     isLoading: false,
//     showSpinner: false,
//     triggerGLEntries: false,
//     isGeneratingGL: false,
//     isDocNoDisabled: false,
//     isSaveDisabled: false,
//     isResetDisabled: false,
//     isFetchDisabled: false,



//     branchCode: currentUserRow?.branchCode||"",
//     branchName: currentUserRow?.branchName||"",

//     shipToCode: "",
//     shipToName: "",
//     shipToAddress: "",

//     tblFieldArray :[],
//     drTranType: "DR01",
//     drTranTypeOptions: [],
//     refDocNo1: "",
//     refDocNo2: "",
//     remarks: "",
//     userCode: currentUserRow?.userCode||"",

//     //Detail 1-2
//     detailRows  :[],
//     detailRowsGL: [],
//     totalDebit: "0.00",
//     totalCredit: "0.00",
//     totalDebitFx1: "0.00",
//     totalCreditFx1: "0.00",
//     totalDebitFx2: "0.00",
//     totalCreditFx2: "0.00",

//     openSODR_Data_Summary: [],
//     openSODR_Col_Summary: [],
//     openSODR_Col_Detail: [],


//     // Modal states
//     modalContext: '',
//     selectionContext: '',
//     selectedRowIndex: null,
//     insertAfterIndex: null,
//     showItemModal:false,
//     showWhseModal:false,
//     showLocModal:false,
//     custModalOpen:false,
//     showCancelModal:false,
//     showAttachModal:false,
//     showSignatoryModal:false,
//     showAllTranDocNo:false,
//     showOpenSOModal:false,
//     showAccountModal:false,
//     showRcModal:false,
//     showSlModal:false,
//     accountModalSource:null
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
//   originalDocStatus,
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


//   // Currency
//   glCurrMode,
//   glCurrDefault,
//   withCurr2,
//   withCurr3,
//   glCurrGlobal1,
//   glCurrGlobal2,
//   glCurrGlobal3,
//   defaultCurrRate,
//   currCode,
//   currName,
//   currRate,

//   // Transaction Header
//   branchCode,
//   branchName,
//   shipToCode,
//   shipToName,
//   shipToAddress,
//   whseCode,
//   whseName,
//   locCode,
//   locName,
//   drTranType,
//   drTranTypeOptions,
//   drStatus,
//   drStatusOptions,
//   refDocNo1,
//   refDocNo2,
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
//   openSODR_Data_Summary,
//   openSODR_Col_Summary,
//   openSODR_Col_Detail,


//   // Contexts
//   modalContext,
//   selectionContext,
//   selectedRowIndex,
//   insertAfterIndex,

//   // Modals
//   showItemModal,
//   showWhseModal,
//   showLocModal,
//   branchModalOpen,
//   custModalOpen,
//   showCancelModal,
//   showAttachModal,
//   showSignatoryModal,
//   showAllTranDocNo,
//   showOpenSOModal,
//   showAccountModal,
//   showRcModal,
//   showSlModal,
//   accountModalSource

//   } = state;

//   const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
//   const [showItemPickingModal, setShowItemPickingModal] = useState(false);
//   const [itemPickingRowIndex, setItemPickingRowIndex] = useState(null);
//   const [itemPickingStockRows, setItemPickingStockRows] = useState([]);
//   const [itemPickingExistingAllocations, setItemPickingExistingAllocations] = useState([]);

//   useEffect(() => {
//     if (!showAddTypeDropdown) return;

//     const handleClickOutside = (event) => {
//       if (addTypeDropdownRef.current?.contains(event.target)) return;
//       setShowAddTypeDropdown(false);
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, [showAddTypeDropdown]);

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
//   const isPosted = ["FINALIZED", "POSTED"].includes(normalizedDisplayStatus);
//   const isCancelled = normalizedDisplayStatus === "CANCELLED";
//   const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(normalizedDisplayStatus);
//   const isHeaderDrStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
//   const canUsePickingControls = !isViewDocumentUrl && !isPosted && !isCancelled;
//   const filteredHeaderDrStatusOptions = drStatusOptions || [];
//   const getOptionalFieldLength = (fieldName) =>
//     useGetFieldLength(tblFieldArray, fieldName) || undefined;
//   const canChangeCustomer =
//     !isFormDisabled && (detailRows || []).every((row) => !String(row?.soNo || "").trim());



//   //Variables
//   const [totals, setTotals] = useState({
//     totalDrQuantity: formatNumber(0, quantityDecimals),
//     totalQuantityPicked: formatNumber(0, quantityDecimals),
//   });



  
//   const salesAllowDuplicateItem = String(
//     companyInfo?.salesAllowDuplicateItem || ""
//   ).toUpperCase();

//   // Derived UI flags
//   const DR_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";
//   const canViewCostAmount =
//     String(currentUserRow?.viewCostamt || "").toUpperCase() !== "N";

//   const detailColumnDefs = [
//     { key: "groupId", label: "Group ID", width: 120 },
//     { key: "soId", label: "SO ID", width: 120 },
//     { key: "ln", label: "LN", width: 56 },
//     { key: "drStat", label: "Picking Status", width: 130 },
//     { key: "soNo", label: "SO No.", width: 140 },
//     { key: "itemCode", label: "Item Code", width: 140 },
//     { key: "itemName", label: "Item Name", width: 240 },
//     { key: "itemSpecs", label: "Specification", width: 240 },
//     { key: "uomCode", label: "UOM", width: 100 },
//     { key: "soBalance", label: "SO Balance", width: 120 },
//     { key: "drQuantity", label: "DR Quantity", width: 120 },
//     { key: "quantityPicked", label: "Quantity Picked", width: 130 },
//     { key: "itemAmount", label: "Item Amount", width: 130 },
//     { key: "deliveryDate", label: "Delivery Date", width: 130 },
//     { key: "siNo", label: "SI No.", width: 140 },
//     { key: "siDate", label: "SI Date", width: 130 },
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
//     renderResizableHeader: renderSoDetailHeader,
//   } = useResizableTableColumns(detailColumnDefs);
//   const orderedDetailColumns = getOrderedSoDetailColumns(detailColumnDefs);
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
//     setSoDetailHiddenColumnKeys([
//       "groupId",
//       "soId",
//       ...(canViewCostAmount ? [] : ["itemAmount"]),
//     ]);
//   }, [setSoDetailColumnOrder, setSoDetailHiddenColumnKeys, canViewCostAmount]);
//   const sortedDetailRows = getSortedSoDetailRows(
//     detailRows.map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => {
//       if (sortKey === "ln") {
//         return entry.originalIndex + 1;
//       }

//       return entry.row?.[sortKey] ?? "";
//     }
//   );


//   const drGlColumnDefs = [
//     { key: "ln", label: "LN", width: 56 },
//     { key: "acctCode", label: "Account Code", width: 120 },
//     { key: "rcCode", label: "RC Code", width: 120 },
//     { key: "sltypeCode", label: "SL Type", width: 120 },
//     { key: "slCode", label: "SL Code", width: 120 },
//     { key: "particular", label: "Particulars", width: 320 },
//     { key: "vatCode", label: "VAT Code", width: 120 },
//     { key: "vatName", label: "VAT Name", width: 220 },
//     { key: "atcCode", label: "ATC Code", width: 120 },
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
//     { key: "slRefDate", label: "SL Ref. Date", width: 130 },
//     { key: "remarks", label: "Remarks", width: 160 },
//   ];

//   const {
//     getColumnStyle: getDrGlColumnStyle,
//     getFrozenColumnStyle: getDrGlFrozenStyle,
//     getOrderedColumns: getOrderedDrGlColumns,
//     getSortedRows: getSortedDrGlRows,
//     setColumnOrder: setDrGlColumnOrder,
//     clearAllSorting: clearDrGlSorting,
//     clearZeroValueOnFocus: clearDrGlZeroOnFocus,
//     focusNextRowInput: focusNextDrGlRowInput,
//     renderHeaderContextMenu: renderDrGlHeaderContextMenu,
//     renderResizableHeader: renderDrGlHeader,
//   } = useResizableTableColumns(drGlColumnDefs);
  
//   const orderedDrGlColumns = getOrderedDrGlColumns(drGlColumnDefs);
//   const getDrGlFallbackWidth = (key) => drGlColumnDefs.find((column) => column.key === key)?.width || 120;
//   const getDrGlCellStyle = (key, fallbackWidth) => ({
//     ...getDrGlColumnStyle(key, fallbackWidth),
//     ...getDrGlFrozenStyle(key, orderedDrGlColumns, fallbackWidth, { isHeader: false }),
//   });
  
//   useEffect(() => {
//     setDrGlColumnOrder(drGlColumnDefs.map((column) => column.key));
//   }, [setDrGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  
//   const sortedDrGlRows = getSortedDrGlRows(
//     (detailRowsGL || []).map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
//   );

//   const getTotalQuantityPicked = (rows = []) =>
//     (Array.isArray(rows) ? rows : []).reduce(
//       (total, row) => total + (parseFormattedNumber(row.quantityPicked || 0) || 0),
//       0
//     );

//   const hasPickedQuantity = getTotalQuantityPicked(detailRows) > 0;

//   const getGLTotalsState = (rows) => {
//     const sourceRows = Array.isArray(rows) ? rows : [];
//     const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
//     const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
//     const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
//     const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
//     const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
//     const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);
//     return { totalDebit: formatNumber(debitSum), totalCredit: formatNumber(creditSum), totalDebitFx1: formatNumber(debitFx1Sum), totalCreditFx1: formatNumber(creditFx1Sum), totalDebitFx2: formatNumber(debitFx2Sum), totalCreditFx2: formatNumber(creditFx2Sum) };
//   };

//   useEffect(() => {
//     updateState(getGLTotalsState(detailRowsGL));
//   }, [detailRowsGL]);




//   const updateTotalsDisplay = (totalDrQty, totalPickedQty) => {
//     setTotals({
//       totalDrQuantity: formatNumber(totalDrQty, quantityDecimals),
//       totalQuantityPicked: formatNumber(totalPickedQty, quantityDecimals),
//       });
//   };


//   const applyHeaderValueToDetailRows = (detailField, detailValue) => {
//     const updatedRows = detailRows.map((row) => ({
//       ...row,
//       [detailField]: detailValue,
//     }));

//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
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

// useEffect(() => {
//     if (!refsLoaded) return;
//     const filteredTypes = getAllDropDown("DRTRAN_TYPE", docType) || [];
//     const defaultDrType =
//       filteredTypes.find((type) => type.DROPDOWN_CODE === "DR01")?.DROPDOWN_CODE ||
//       filteredTypes[0]?.DROPDOWN_CODE ||
//       "DR01";
//     const mapHeaderDrStatus = (value) => {
//       const normalizedValue = String(value || "").toUpperCase();
//       if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
//       if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
//       if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
//       return "O";
//     };

//     updateState({
//       drTranTypeOptions: filteredTypes,
//       drTranType: state.drTranType || defaultDrType,
//       drStatusOptions: [
//         { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
//         { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
//         { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
//       ],
//       drStatus: mapHeaderDrStatus(state.drStatus),
//     });
// }, [docType, refsLoaded]);



//   const handleReset = () => {
//     clearSoDetailSorting();
//     setShowAddTypeDropdown(false);
//     const filteredTypes = getAllDropDown("DRTRAN_TYPE", docType) || [];
//     const defaultDrType =
//       filteredTypes.find((type) => type.DROPDOWN_CODE === "DR01")?.DROPDOWN_CODE ||
//       filteredTypes[0]?.DROPDOWN_CODE ||
//       "DR01";

//     updateState({
//       branchCode: currentUserRow?.branchCode || "",
//       branchName: currentUserRow?.branchName || "",
//       userCode: currentUserRow?.userCode || "",
//       documentDate: useGetCurrentDayV2(),
//       refDocNo1: "",
//       refDocNo2: "",
//       whseCode: "",
//       whseName: "",
//       locCode: "",
//       locName: "",
//       remarks: "",
//       noReprints: "0",
//       shipToCode: "",
//       shipToName: "",
//       shipToAddress: "",
//       documentNo: "",
//       documentID: "",
//       detailRows: [],
//       detailRowsGL: [],
//       openSODR_Data_Summary: [],
//       openSODR_Col_Summary: [],
//       openSODR_Col_Detail: [],
//       documentStatus: "O",
//       originalDocStatus: "O",
//       drTranType: defaultDrType,
//       drStatus: "O",
//       activeTab: "basic",
//       GLactiveTab: "invoice",
//       isDocNoDisabled: false,
//       isSaveDisabled: false,
//       isResetDisabled: false,
//       isFetchDisabled: false,
//       showOpenSOModal: false,
//       triggerGLEntries: false,
//       isGeneratingGL: false,
//       status: "Open",
//     });
//     updateTotalsDisplay(0, 0);
//   };






//     const loadCompanyData = async () => {
//         updateState({ isLoading: true });

//         try {
//           const hdtblcol_result = await useFieldLenghtCheck(
//             "dr_hd,dr_dt1,dr_dt2",
//           );

//           if (hdtblcol_result) {
//             updateState({ tblFieldArray: hdtblcol_result });
//           }

//           const hsOption = await useTopHSOption();
//           if (hsOption) {
//             updateState({
//               glCurrMode: hsOption.glCurrMode,
//               glCurrDefault: hsOption.glCurrDefault,
//               glCurrGlobal1: hsOption.glCurrGlobal1,
//               glCurrGlobal2: hsOption.glCurrGlobal2,
//               glCurrGlobal3: hsOption.glCurrGlobal3,
//               withCurr2: (hsOption.glCurrMode === "M" && hsOption.glCurrDefault !== companyInfo?.currCode) || hsOption.glCurrMode === "D" || hsOption.glCurrMode === "T",
//               withCurr3: hsOption.glCurrMode === "T",
//             });
//           }
//         } catch (err) {
//           console.error("Error fetching data:", err);
//         } finally {
//           updateState({ isLoading: false });
//         }
//       };


// const fetchTranData = async (documentNo, branchCode,direction='') => {
//   const resetState = () => {
//     updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
//     updateTotals([]);
//   };

//   updateState({ isLoading: true, showSpinner: true });

//   try { // Assuming 'drNo' is the correct field for DR document number
//     const data = await useFetchTranData(documentNo, branchCode, docType, "drNo", direction);


//     if (!data?.drId) {
//       Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
//       return resetState();
//     }


//     // Format rows
//     const retrievedDetailRows = (data.dt1 || []).map(item => ({
//       ...item,
//       soNo: item.soNo || "",
//       drStat: item.pickStat || "F",
//       itemCode: item.itemCode || "",
//       itemName: item.itemName || "",
//       itemSpecs: item.itemSpecs || "",
//       uomCode: item.uomCode || "",
//       groupId: item.groupId || "",
//       soId: item.soId || "",
//       soBalance: formatNumber(item.soBalance ?? 0, quantityDecimals),
//       drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
//       quantityPicked: formatNumber(item.quantityPicked ?? 0, quantityDecimals),
//       itemAmount:  item.itemAmount?? formatNumber(0),// formatNumber(item.itemAmount ?? 0),
//       freeItem: item.freeItem || "",
//       deliveryDate: useformatToDatev2(item.deliveryDate),
//       siNo: item.siNo || "",
//       siDate: useformatToDatev2(item.siDate),
//       drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
//     }));

//     const formattedGLRows = (data.dt2 || []).map(glRow => ({
//       ...glRow,
//       debit: formatNumber(parseFormattedNumber(glRow.debit)),
//       credit: formatNumber(parseFormattedNumber(glRow.credit)),
//       debitFx1: formatNumber(parseFormattedNumber(glRow.debitFx1)),
//       creditFx1: formatNumber(parseFormattedNumber(glRow.creditFx1)),
//       debitFx2: formatNumber(parseFormattedNumber(glRow.debitFx2)),
//       creditFx2: formatNumber(parseFormattedNumber(glRow.creditFx2)),
//       slRefDate: useformatToDatev2(glRow.slRefDate),
//     }));

//     updateState({
//       documentStatus: data.drStatus,
//       status: data.docStatus,
//       noReprints:data.noReprints,
//       documentID: data.drId,
//       documentNo: data.drNo,
//       documentDate: useformatToDatev2(data.drDate),
//       branchCode: data.branchCode,
//       branchName:data.branchName,
//       drTranType: data.drTranType || data.drtranType || "DR01",
//       shipToCode: data.custCode,
//       shipToName: data.custName,
//       shipToAddress:data.shipToAddr,
//       whseCode: data.whouseCode || "",
//       whseName: data.whouseName || "",
//       locCode: data.locCode || "",
//       locName: data.locName || "",
//       refDocNo1: data.refDrNo1,
//       refDocNo2: data.refDrNo2,
//       remarks: data.remarks,
//       drStatus: String(data.drStatus || "O").toUpperCase() === "OPEN" ? "O" : String(data.drStatus || "O").toUpperCase() === "CANCELLED" ? "X" : String(data.drStatus || "O").toUpperCase() === "CLOSED" ? "C" : String(data.drStatus || "O"), 
//       originalDocStatus: data.drStatus,
//       detailRows: retrievedDetailRows,
//       detailRowsGL: formattedGLRows,
//       isDocNoDisabled: true,
//       isFetchDisabled: true,
//     });

//     updateTotals(retrievedDetailRows);

//   } catch (error) { // Changed soNo to drNo
//     console.error("Error fetching transaction data:", error); 
//     Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
//     resetState();
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };


// const handlesoNoBlur = () => { // Renamed to handleDrNoBlur

//     if (!state.documentID && state.documentNo && state.branchCode) {
//         fetchTranData(state.documentNo, state.branchCode);
//     }
// };








// const moveFocusBeforeSave = async () => {
//   document.activeElement?.blur?.();
//   return true;
// };




// const handleActivityOption = async (action) => {
//   if ((detailRows?.length || 0) === 0) {
//     return;
//   }

//   if (action === "Upsert") {
//     await moveFocusBeforeSave();
//   }

//   if (documentStatus === "O" || action === "GenerateGL") {
//     updateState({ isLoading: true, showSpinner: true });

//     try {
//       const {
//         branchCode,
//         documentNo,
//         documentID,
//         shipToCode,
//         shipToName,
//         shipToAddress,
//         drTranType,
//         refDocNo1,
//         refDocNo2,
//         remarks,
//         userCode,
//         drStatus,
//         detailRows,
//         detailRowsGL,
//       } = state;

//       let finalDetailRowsGL = Array.isArray(detailRowsGL) ? [...detailRowsGL] : [];

//       const formatGeneratedGLRows = (rows = []) =>
//         (Array.isArray(rows) ? rows : []).map((row) => ({
//           ...row,
//           debit: formatNumber(parseFormattedNumber(row.debit)),
//           credit: formatNumber(parseFormattedNumber(row.credit)),
//           debitFx1: formatNumber(parseFormattedNumber(row.debitFx1)),
//           creditFx1: formatNumber(parseFormattedNumber(row.creditFx1)),
//           debitFx2: formatNumber(parseFormattedNumber(row.debitFx2)),
//           creditFx2: formatNumber(parseFormattedNumber(row.creditFx2)),
//           slRefDate: useformatToDatev2(row.slRefDate),
//         }));

//       const buildDrData = (glRows = []) => ({
//         branchCode: branchCode,
//         drNo: documentNo || "",
//         drId: documentID || "",
//         drDate: documentDate,
//         drTranType: drTranType || "DR01",
//         custCode: shipToCode,
//         custName: shipToName,
//         shipToAddr: shipToAddress,
//         refDrNo1: refDocNo1,
//         refDrNo2: refDocNo2,
//         whouseCode: whseCode,
//         locCode,
//         remarks: remarks || "",
//         userCode: userCode,
//         drStatus,
//         dt1: detailRows.map((row, index) => ({
//           lnNo: String(index + 1),
//           pickStat: row.drStat || "F",
//           itemCode: row.itemCode || "",
//           itemName: row.itemName || "",
//           uomCode: row.uomCode || "",
//           freeItem: row.freeItem || "",
//           soBalance: parseFormattedNumber(row.soBalance || 0),
//           drQuantity: parseFormattedNumber(row.drQuantity || 0),
//           quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
//           itemAmount: parseFormattedNumber(row.itemAmount || 0),
//           soNo: row.soNo || "",
//           deliveryDate: row.deliveryDate || null,
//           siNo: row.siNo || "",
//           siDate: row.siDate || null,
//           itemSpecs: row.itemSpecs || "",
//           groupId: row.groupId || "",
//           soId: row.soId || "",
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
//         const totalPickedQuantity = getTotalQuantityPicked(detailRows);

//         if (totalPickedQuantity <= 0) {
//           updateState({
//             detailRowsGL: [],
//             ...getGLTotalsState([]),
//             isGeneratingGL: false,
//           });
//           return;
//         }

//         try {
//           updateState({ detailRowsGL: [], isGeneratingGL: true });

//           const newGlEntries = await useGenerateGLEntries(
//             docType,
//             buildDrData(finalDetailRowsGL)
//           );

//           const formattedGLRows = formatGeneratedGLRows(newGlEntries);

//           updateState({
//             detailRowsGL: formattedGLRows,
//             ...getGLTotalsState(formattedGLRows),
//             isGeneratingGL: false,
//           });
//         } catch (error) {
//           updateState({ detailRowsGL: [], isGeneratingGL: false });
//           console.error("Error generating DR GL entries:", error);
//           useSwalErrorAlert("Generate GL", getApiErrorMessage(error));
//         }

//         return;
//       }

//       if (action === "Upsert") {
//         const totalPickedQuantity = getTotalQuantityPicked(detailRows);

//         /*
//           Important:
//           Do not regenerate GL during Save.
//           Save must preserve the current detailRowsGL because user may have manually edited GL entries.

//           GL is regenerated only by:
//           1. Generate GL Entries button
//           2. Picking allocation database flow using GenerateEntries + saveToTable = Y
//         */
//         if (totalPickedQuantity <= 0) {
//           finalDetailRowsGL = [];

//           updateState({
//             detailRowsGL: [],
//             ...getGLTotalsState([]),
//           });
//         } else {
//           finalDetailRowsGL = Array.isArray(detailRowsGL)
//             ? [...detailRowsGL]
//             : [];
//         }

//         const response = await useTransactionUpsert(
//           docType,
//           buildDrData(finalDetailRowsGL),
//           updateState,
//           "drId",
//           "drNo"
//         );

//         if (response) {
//           const responseDocNo = response.data[0].drNo;
//           const responseDocId = response.data[0].drId;

//           await fetchTranData(responseDocNo, branchCode);

//           const isZero = Number(noReprints) === 0;
//           const onSaveAndPrint = isZero
//             ? () => updateState({ showSignatoryModal: true })
//             : () => handleSaveAndPrint(responseDocId);

//           useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
//         }

//         updateState({
//           documentNo: response?.data?.[0]?.drNo || "",
//           documentID: response?.data?.[0]?.drId || "",
//           isDocNoDisabled: true,
//           isFetchDisabled: true,
//         });
//       }
//     } catch (error) {
//       console.error(`Error during ${action}:`, error);
//       useSwalErrorAlert("Delivery Receipt", getApiErrorMessage(error));
//     } finally {
//       updateState({ isLoading: false, showSpinner: false });
//     }
//   }
// };




// useEffect(() => {
//   if (!triggerGLEntries) return;

//   handleActivityOption("GenerateGL").finally(() => {
//     updateState({ triggerGLEntries: false });
//   });
// }, [triggerGLEntries]);



//   const createDRDetailRow = (overrides = {}) => ({
//       lnNo: "",
//       drStat: "F",
//       soNo: "",
//       itemCode: "",
//       itemName: "",
//       itemSpecs: "",
//       uomCode: "",
//       groupId: "",
//       soId: "",
//       soBalance: Number(0).toFixed(quantityDecimals),
//       deliveryDate: null,
//       drQuantity: Number(0).toFixed(quantityDecimals),
//       quantityPicked: Number(0).toFixed(quantityDecimals), 
//       freeItem: "", 
//       drQuantity: Number(0).toFixed(quantityDecimals),
//       itemAmount: formatNumber(0),
//       ...overrides,
//     });

//   const normalizeDetailLineNumbers = (rows = []) =>
//     rows.map((row, index) => ({
//       ...row,
//       lnNo: String(index + 1),
//     }));

//   const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
//     if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
//       return;
//     }

//     const updatedRows = [...detailRows];
//     const normalizedInsertRows = rowsToInsert.map((row) => createDRDetailRow(row));

//     if (insertIndex !== null && insertIndex >= 0) {
//       updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
//     } else {
//       updatedRows.push(...normalizedInsertRows);
//     }

//     const normalizedRows = normalizeDetailLineNumbers(updatedRows);

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
//     insertDetailRows([createDRDetailRow()], insertIndex);
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
//     if (DR_ALLOW_DUPLICATE_ITEMS) {
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
//         `These item(s) already exist in DR Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
//       );
//     }

//     return filteredRecords;
//   };





//   const mapItemRecordToDetailRow = (item = {}) => createDRDetailRow({
//     soNo: item?.soNo || "",
//     itemCode: item?.itemCode || "",
//     itemName: item?.itemName || "",
//     itemSpecs: item?.itemSpecs || "",
//     uomCode: item?.uomCode || "",
//     groupId: item?.groupId || "",
//     soId: item?.soId || "",
//     soBalance: formatNumber(
//       item?.soBalance ?? item?.soQuantity ?? 0, 
//       quantityDecimals 
//     ),
//     deliveryDate: useformatToDatev2(item?.deliveryDate),
//     drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
//     quantityPicked: formatNumber(item?.quantityPicked ?? 0, quantityDecimals),
//     itemAmount: formatNumber(item?.itemAmount ?? 0),
//     siNo: item?.siNo || "",
//     siDate: item?.siDate || "",
//     freeItem: item?.freeItem || "",
//   });

//   const resolveOpenSOGroupId = (item = {}) => item?.groupId || "";

//   const normalizeOpenSOLookupRow = (item = {}) => ({
//     ...item,
//     groupId: resolveOpenSOGroupId(item),
//     soId: item?.soId || "",
//     soNo: item?.soNo || "",
//     deliveryDate: item?.deliveryDate || "",
//   });

//   const mapOpenSORecordToDetailRow = (item = {}) => {
//     const soBalanceValue = item?.soBalance ?? 0;

//     return createDRDetailRow({
//       soNo: item?.soNo || "",
//       itemCode: item?.itemCode || "",
//       itemName: item?.itemName || "",
//       itemSpecs: item?.itemSpecs || "",
//       uomCode: item?.uomCode || "",
//       groupId: resolveOpenSOGroupId(item),
//       soId: item?.soId || "",
//       soBalance: formatNumber(soBalanceValue, quantityDecimals),
//       deliveryDate: useformatToDatev2(item?.deliveryDate),
//       drQuantity: formatNumber(item?.drQuantity ?? soBalanceValue ?? 0, quantityDecimals),
//       quantityPicked: formatNumber(item?.quantityPicked ?? 0, quantityDecimals),
//       siNo: item?.siNo || "",
//       siDate: item?.siDate || "",
//       freeItem: item?.freeItem || "",
//     });
//   };

//   const getOpenSOShipToAddress = (records = []) => {
//     const addressKeys = ["shipto_addr", "shipToAddr", "shipToAddress", "shipToAddr1"];
//     const source = (records || []).find((record) =>
//       addressKeys.some((key) => String(record?.[key] || "").trim())
//     );

//     if (!source) return "";

//     const key = addressKeys.find((field) => String(source?.[field] || "").trim());
//     return String(source?.[key] || "").trim();
//   };

//   const getUniqueOpenSORemarks = (records = []) => {
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

//   const handleInsertSelectedItems = async (selectedRecords = []) => {
//     if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
//       return;
//     }

//     const rowsToInsert = selectedRecords.map((item) => {
//       const baseRow = mapItemRecordToDetailRow(item); 
//       return baseRow; // No price matrix application for DR
//     });

//     insertDetailRows(rowsToInsert, insertAfterIndex);
//   };

//   const scrollDetailSectionToMiddle = () => {
//     window.requestAnimationFrame(() => {
//       window.requestAnimationFrame(() => {
//         detailSectionRef.current?.scrollIntoView({
//           behavior: "smooth",
//           block: "center",
//         });
//       });
//     });
//   };

//   const handleInsertSelectedOpenSO = async (payload) => {
//     const selectedRecords = Array.isArray(payload?.details)
//       ? payload.details
//       : normalizeItemModalRecords(payload);
//     const selectedSummaryRecords = Array.isArray(payload?.summary)
//       ? payload.summary
//       : [];
//     const headerSourceRecords = selectedSummaryRecords.length > 0
//       ? selectedSummaryRecords
//       : selectedRecords;

//     if (selectedRecords.length === 0) {
//       updateState({ showOpenSOModal: false });
//       return;
//     }

//     const rowsToInsert = selectedRecords.map(mapOpenSORecordToDetailRow);
//     const selectedShipToAddress = getOpenSOShipToAddress(headerSourceRecords);
//     const nextRemarks = appendMissingRemarks(
//       remarks,
//       getUniqueOpenSORemarks(headerSourceRecords)
//     );

//     insertDetailRows(rowsToInsert, insertAfterIndex);
//     setTopTab("details");

//     updateState({
//       ...(selectedShipToAddress ? { shipToAddress: selectedShipToAddress } : {}),
//       remarks: nextRemarks,
//       showOpenSOModal: false,
//       openSODR_Data_Summary: [],
//       openSODR_Col_Summary: [],
//       openSODR_Col_Detail: [],
//       insertAfterIndex: null,
//     });
//     scrollDetailSectionToMiddle();
//   };





// const cancelPickingAllocationForDeletedRow = async (row) => {
//   const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

//   // No picked quantity, no need to call allocation API.
//   if (pickedQty <= 0) {
//     return true;
//   }

//   if (!documentID || !row?.groupId) {
//     useSwalErrorAlert(
//       "Delete DR Detail",
//       "Cannot release picking allocation. DR ID or Group ID is missing."
//     );
//     return false;
//   }

//   const confirm = await useSwalProceedConfirm(
//     "Delete Picked DR Detail?",
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
//           docCode: "DR",
//           docId: documentID,
//           groupId: row.groupId,
//           userCode: userCode || currentUserRow?.userCode || "",
//           reason: "DR detail line deleted.",
//         },
//       }),
//     });

//     return true;
//   } catch (error) {
//     console.error("Failed to release FG picking allocation:", error);
//     useSwalErrorAlert("Delete DR Detail", getApiErrorMessage(error));
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

//   const canDelete = await cancelPickingAllocationForDeletedRow(rowToDelete);

//   if (!canDelete) {
//     return;
//   }

//   const updatedRows = normalizeDetailLineNumbers(
//     detailRows.filter((_, rowIndex) => rowIndex !== index)
//   );

//   detailRowsRef.current = updatedRows;

//   updateState({
//     detailRows: updatedRows,
//     detailRowsGL: [],
//     triggerGLEntries: getTotalQuantityPicked(updatedRows) > 0,
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

//   const updatedRows = [...(detailRowsGL || [])];

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
//   const updatedRows = [...(detailRowsGL || [])];
//   updatedRows.splice(index, 1);

//   updateState({
//     detailRowsGL: updatedRows,
//     ...getGLTotalsState(updatedRows),
//   });
// };








// const handlePrint = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return;
//       }
//   if (documentID) {
//     updateState({ showSignatoryModal: true });
//   }
// };

//   const handleOpenAddItemModal = async () => {
//     const fieldsToCheck = {
//       "Header : Bill To Customer Code": shipToCode, // Still uses shipToCode state in DR.
//     };
//   const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
//     if (!isValid) return;

//     updateState({
//       showItemModal: true,
//       selectionContext: "multiAdd",
//       selectedRowIndex: null,
//       insertAfterIndex: null,
//     });
//   };



//   const getApiErrorMessage = (error) =>
//     error?.response?.data?.message ||
//     error?.response?.data?.error ||
//     error?.message ||
//     "Unknown server error";

//   const parseSprocJsonResult = (response) => {
//   const rawResult =
//     response?.data?.[0]?.result ??
//     response?.data?.data?.[0]?.result ??
//     response?.Data?.[0]?.result ??
//     response?.data?.result ??
//     response?.result;

//   if (!rawResult) return {};

//   if (typeof rawResult === "string") {
//     try {
//       return JSON.parse(rawResult);
//     } catch (error) {
//       console.error("Invalid JSON result:", rawResult, error);
//       return {};
//     }
//   }

//   return rawResult;
// };

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
//     docCode: "DR",
//     docNo: documentNo || "",
//     docId: documentID || "",
//     docDate: documentDate || null,
//     branchCode: branchCode || "",
//     whouseCode: whseCode || "",
//     locCode: locCode || "",
//     groupId: row?.groupId || "",
//     lineNo: index + 1,
//     itemCode: row?.itemCode || "",
//     requestedQty: parseFormattedNumber(row?.drQuantity || 0) || 0,
//     userCode: userCode || currentUserRow?.userCode || "",
//   });

//   const handleOpenSalesOrderLookup = async (overrides = {}) => {
//     const lookupShipToCode = String(overrides.shipToCode ?? shipToCode ?? "").trim();
//     const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

//     if (!lookupShipToCode) {
//       const branchIsValid = await useSwalvalidateRequiredFields(
//         { "Header : Branch": lookupBranchCode },
//         "Open Sales Order Lookup"
//       );
//       if (!branchIsValid) return;

//       updateState({
//         custModalOpen: true,
//         modalContext: "openSO",
//       });
//       return;
//     }

//     const fieldsToCheck = {
//       "Header : Bill To Customer Code": lookupShipToCode,
//       "Header : Branch": lookupBranchCode,
//     };

//     const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Open Sales Order Lookup");
//     if (!isValid) return;

//     try {
//       updateState({ isLoading: true, showSpinner: true });

//       const endpoint = "getSODR_OpenSummary";
//       let response;
//       try {
//         response = await fetchDataJson(endpoint, {
//           custCode: lookupShipToCode,
//           shipToCode: lookupShipToCode,
//           branchCode: lookupBranchCode,
//         });
//       } catch (error) {
//         console.error(`${endpoint} failed:`, {
//           payload: {
//             custCode: lookupShipToCode,
//             shipToCode: lookupShipToCode,
//             branchCode: lookupBranchCode,
//           },
//           status: error?.response?.status,
//           data: error?.response?.data,
//           error,
//         });
//         throw new Error(`${endpoint}: ${getApiErrorMessage(error)}`);
//       }

//       const soRows = response?.data?.[0]?.result
//         ? JSON.parse(response.data[0].result).map(normalizeOpenSOLookupRow)
//         : [];

//       if (soRows.length === 0) {
//         useSwalErrorAlert(
//           "Open Sales Order",
//           "There are no open Sales Order records for the selected customer/branch."
//         );
//         return;
//       }

//       const summaryColumns = await selectedHSColConfig(endpoint);
//       const detailColumns = await selectedHSColConfig("getSODR_OpenDetail");

//       updateState({
//         openSODR_Data_Summary: soRows,
//         openSODR_Col_Summary: summaryColumns,
//         openSODR_Col_Detail: detailColumns,
//         showOpenSOModal: true,
//       });
//     } catch (error) {
//       console.error("Failed to fetch Open Sales Order:", error);
//       useSwalErrorAlert("Open Sales Order", getApiErrorMessage(error));
//       updateState({
//         openSODR_Data_Summary: [],
//         openSODR_Col_Summary: [],
//         openSODR_Col_Detail: [],
//       });
//     } finally {
//       updateState({ isLoading: false, showSpinner: false });
//     }
//   };

//   const handleAddRowClick = async () => {
//     if (documentStatus !== "O" || isFormDisabled) return;
//     setShowAddTypeDropdown((prev) => !prev);
//   };












// const handleOpenItemPickingModal = async (index) => {
//   const row = detailRowsRef.current?.[index];
//   const requestedQty = parseFormattedNumber(row?.drQuantity || 0) || 0;

//   if (!canUsePickingControls) return;

//   if (!documentID || !documentNo) {
//     useSwalErrorAlert("Item Picking", "Please save the DR first before opening the picking allocation.");
//     return;
//   }

//   if (!row?.itemCode) {
//     useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
//     return;
//   }

//   if (!row?.groupId) {
//     useSwalErrorAlert("Item Picking", "Group ID is required for item picking allocation. Please save or reload the document first.");
//     return;
//   }

//   if (requestedQty <= 0) {
//     useSwalErrorAlert("Item Picking", "DR Quantity must be greater than zero before opening the picking allocation.");
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
//     const totalPicked = getPickingResultNumber(result,currentRow,itemPickingRowIndex, ["totalAllocated"],payload?.totalPicked ?? 0);
//     const itemAmount = getPickingResultNumber( result,currentRow,itemPickingRowIndex, ["itemAmount"],totalPicked <= 0 ? 0 : getPickingAllocationAmount(pickedAllocations) || currentRow?.itemAmount || 0);
//     const drQuantityValue = parseFormattedNumber(currentRow?.drQuantity || 0) || 0;

//     updatedRows[itemPickingRowIndex] = {
//       ...currentRow,
//       drStat:
//         totalPicked <= 0
//           ? "F"
//           : drQuantityValue > 0 && totalPicked >= drQuantityValue
//             ? "P"
//             : "T",
//       quantityPicked: formatNumber(totalPicked, quantityDecimals),
//       itemAmount: itemAmount,
//       pickingAllocations: pickedAllocations,
//       pickingOrderedStockRows: payload?.orderedStockRows || [],
//     };

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: true });
//     updateTotals(updatedRows);
//     handleCloseItemPickingModal();
//   } catch (error) {
//     console.error("Failed to save FG picking allocation:", error);
//     useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };

// const buildAutoPickingAllocations = (stockRows = [], requestedQty = 0, row = {}) => {
//   let remainingQty = Math.max(parseFormattedNumber(requestedQty || 0) || 0, 0);

//   return [...(Array.isArray(stockRows) ? stockRows : [])]
//     .map((stockRow, index) => ({
//       ...stockRow,
//       priorityNo: stockRow.priorityNo || index + 1,
//       remainingAvailable: parseFormattedNumber(stockRow.remainingAvailable || 0) || 0,
//       isBlocked:
//         stockRow.isBlocked ||
//         (parseFormattedNumber(stockRow.remainingAvailable || 0) || 0) <= 0 ||
//         ["HOLD", "BLOCKED", "QUARANTINE"].includes(String(stockRow.qualityStatus || "").toUpperCase()),
//     }))
//     .sort((a, b) => {
//       const dateA = new Date(a.bestBeforeDate || "").getTime();
//       const dateB = new Date(b.bestBeforeDate || "").getTime();
//       const safeDateA = Number.isFinite(dateA) ? dateA : Number.MAX_SAFE_INTEGER;
//       const safeDateB = Number.isFinite(dateB) ? dateB : Number.MAX_SAFE_INTEGER;
//       if (safeDateA !== safeDateB) return safeDateA - safeDateB;
//       return Number(a.priorityNo || 0) - Number(b.priorityNo || 0);
//     })
//     .reduce((allocations, stockRow) => {
//       if (stockRow.isBlocked || remainingQty <= 0) return allocations;

//       const pickQty = Math.min(stockRow.remainingAvailable, remainingQty);
//       remainingQty -= pickQty;

//       if (pickQty <= 0) return allocations;

//       allocations.push({
//         groupId: row.groupId || "",
//         sourceDocType: "DR",
//         sourceLineNo: "",
//         itemCode: row.itemCode || "",
//         stockCardRefId: stockRow.stockCardRefId,
//         lotNo: stockRow.lotNo,
//         qualityStatus: stockRow.qualityStatus,
//         bestBeforeDate: stockRow.bestBeforeDate,
//         fgFifoLocId: stockRow.fgFifoLocId || null,
//         fgWacLocId: stockRow.fgWacLocId || null,
//         warehouseCode: stockRow.warehouseCode,
//         whouseCode: stockRow.warehouseCode,
//         warehouseName: stockRow.warehouseName,
//         locationCode: stockRow.locationCode,
//         locCode: stockRow.locationCode,
//         priorityNo: stockRow.priorityNo,
//         sourceDocCode: stockRow.sourceDocCode || null,
//         sourceDocNo: stockRow.sourceDocNo || null,
//         sourceDocDate: stockRow.sourceDocDate || null,
//         sourceDocId: stockRow.sourceDocId || null,
//         sourceGroupId: stockRow.sourceGroupId || null,
//         fifoDocCode: stockRow.fifoDocCode || null,
//         fifoDocNo: stockRow.fifoDocNo || null,
//         orderId: stockRow.orderId || null,
//         unitCost: parseFormattedNumber(stockRow.unitCost || 0) || 0,
//         wacKey: stockRow.wacKey || null,
//         wac: parseFormattedNumber(stockRow.wac || 0) || 0,
//         pickQty,
//       });

//       return allocations;
//     }, []);
// };

// const handleBulkPickingAllocation = async (mode) => {
//   const isRelease = mode === "release";
//   const actionLabel = isRelease ? "Release All" : "Allocate All";
//   const rows = detailRowsRef.current || [];

//   if (!rows.length || !canUsePickingControls) return;

//   if (!documentID || !documentNo) {
//     useSwalErrorAlert("Item Picking", "Please save the DR first before using Allocate All or Release All.");
//     return;
//   }

//   const confirm = await useSwalProceedConfirm(
//     `${actionLabel}?`,
//     isRelease
//       ? "This will release all picking allocations for the DR details."
//       : "This will automatically pick available stock for all eligible DR details.",
//     "Yes"
//   );

//   if (!confirm?.isConfirmed) return;

//   try {
//     updateState({ isLoading: true, showSpinner: true });

//     const updatedRows = [...rows];

//     for (const [index, row] of rows.entries()) {
//       const requestedQty = parseFormattedNumber(row?.drQuantity || 0) || 0;
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
//       const totalPicked = getPickingResultNumber(result,row,index,["totalAllocated"],0);
//       const itemAmount = getPickingResultNumber(result,row,index,["itemAmount"],totalPicked <= 0 ? 0 : getPickingAllocationAmount(pickedAllocations) || row?.itemAmount || 0);


//       updatedRows[index] = {
//         ...updatedRows[index],
//         drStat:
//           totalPicked <= 0
//             ? "F"
//             : requestedQty > 0 && totalPicked >= requestedQty
//               ? "P"
//               : "T",
//         quantityPicked: formatNumber(totalPicked, quantityDecimals),
//         itemAmount: itemAmount,
//         pickingAllocations: pickedAllocations,
//       };
//     }

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: true });
//     updateTotals(updatedRows);
//   } catch (error) {
//     console.error(`Failed to ${actionLabel.toLowerCase()} picking allocation:`, error);
//     useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
//   } finally {
//     updateState({ isLoading: false, showSpinner: false });
//   }
// };

// const handleCancel = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return;
//       }


//   if (documentID && (documentStatus === 'O')) {
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
//       groupId: "",
//       soId: "",
//       soNo: "",
//       soBalance: formatNumber(0, quantityDecimals),
//       deliveryDate: "",
//       siNo: "",
//       siDate: null,
//       quantityPicked: formatNumber(0, quantityDecimals),
//       drStat: "F",
//     }));

//     updateState({
//       documentNo: "",
//       documentID: "",
//       documentStatus: "O",
//       originalDocStatus: "O",
//       status: "OPEN",
//       documentDate: nextDocumentDate, 
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
//   const docNo = params.get("soNo");
//   const branchCode = params.get("branchCode");

//   if (!loadedFromUrlRef.current && docNo && branchCode) {
//     loadedFromUrlRef.current = true;
//     handleHistoryRowPick({ docNo, branchCode });
//   }
// }, [location.search, handleHistoryRowPick]);





//   const printData = {
//     apv_no: documentNo,
//     branch: branchCode,
//     doc_id: docType
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
//     updateState({ showSpinner: true });
//   try {
//     if(confirmation && originalDocStatus === "O" && documentID !== null ) {

//       const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
//       if (result.success)
//       {
//        useSwalSuccessAlert("Success","Cancellation Completed")
//       }
//      await fetchTranData(documentNo,branchCode);
//     }
//   } finally {
//     updateState({showCancelModal: false, showSpinner: false});
//   }
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

//     updateState({ custModalOpen: false, isLoading: true, showSpinner: true });

//     try {
//         const address = selectedData?.addr || "";

//         // In DR, we only care about shipTo.
//         if (modalContext === "shipTo" || modalContext === "openSO") {
//             // Fetch full details from master data to ensure data is complete and up-to-date
//             const payload = { CUST_CODE: selectedData.custCode };
//             const response = await postRequest("getCustomer", JSON.stringify(payload));

//             let finalName = selectedData.custName || "";
//             let finalCode = selectedData.custCode || "";
//             let finalAddress = address;
//             let finalWhseCode = "";
//             let customerRow = {};

//             if (response.success) {
//                 customerRow = JSON.parse(response.data[0].result)?.[0] || {};
//                 const fullAddress = [customerRow.custAddr1, customerRow.custAddr2, customerRow.custAddr3].filter(Boolean).join(' ').trim();

//                 finalName = customerRow.custName || finalName;
//                 finalCode = customerRow.custCode || finalCode;
//                 finalAddress = fullAddress || finalAddress;
//                 finalWhseCode = customerRow.whCode || finalWhseCode;
//             } else {
//                 console.warn("API call for getCustomer returned success: false", response.message);
//             }

//             const selectedWarehouse = finalWhseCode
//               ? await useTopWarehouseRow(finalWhseCode)
//               : null;

//             updateState({
//                 shipToName: finalName,
//                 shipToCode: finalCode,
//                 shipToAddress: finalAddress,
//                 whseCode: selectedWarehouse?.whouseCode || finalWhseCode || "",
//                 whseName: selectedWarehouse?.whouseName || "",
//                 locCode: "",
//                 locName: "",
//             });

//             if (modalContext === "openSO") {
//               await handleOpenSalesOrderLookup({
//                 shipToCode: finalCode,
//                 branchCode,
//               });
//             }
//         }

//     } catch (error) {
//         console.error("Error fetching customer details:", error);
//     } finally {
//        updateState({ isLoading: false, showSpinner: false, modalContext: "" });
//     }
// };

 

//   const updateTotals = (rows) => { // This function might not be needed if gross/net/discount are removed
//     let totalDrQty = 0;
//     let totalPickedQty = 0;

//     rows.forEach(row => {
//       totalDrQty += parseFormattedNumber(row.drQuantity || 0) || 0;
//       totalPickedQty += parseFormattedNumber(row.quantityPicked || 0) || 0;
//     });
//     updateTotalsDisplay(totalDrQty, totalPickedQty);
// };




// const handleCloseBranchModal = (selectedBranch) => {
//     if (selectedBranch) {
//       updateState({
//       branchCode: selectedBranch.branchCode,
//       branchName:selectedBranch.branchName,
//       whseCode: "",
//       whseName: "",
//       locCode: "",
//       locName: ""
//       })
//     }
//     updateState({ branchModalOpen: false });
//   };

// const handleCloseWarehouseLookup = (row) => {
//   if (row) {
//     updateState({
//       whseCode: row.whCode || "",
//       whseName: row.whName || "",
//       locCode: "",
//       locName: "",
//     });
//   }

//   updateState({ showWhseModal: false });
// };

// const handleCloseLocationLookup = (row) => {
//   if (row) {
//     updateState({
//       locCode: row.locCode || "",
//       locName: row.locName || "",
//     });
//   }

//   updateState({ showLocModal: false });
// };




// const handleCloseItemModal = async (selectedItems) => { // Simplified as price matrix is removed
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
//       groupId: updatedRows[selectedRowIndex]?.groupId || "",
//       soId: updatedRows[selectedRowIndex]?.soId || selectedItem?.soId || "",
//     };
//     updatedRows[selectedRowIndex] = baseRow; // Directly assign baseRow
//     updateState({ detailRows: updatedRows }); 
//     updateTotals(updatedRows);
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





 


// const validateSOQuantity = (index, inputValue) => {
//   const row = detailRowsRef.current[index];
//   const drQty = parseFormattedNumber(row?.drQuantity || 0) || 0;
//   const soQty = parseFormattedNumber(inputValue || 0) || 0;
//   const rowStatus = String(row?.soStat || "").toUpperCase();

//   if (drQty > 0 && rowStatus === "O" && soQty < drQty) {
//     const originalValue = originalSOQuantityRef.current[index] ?? row?.soQuantity ?? formatNumber(0, quantityDecimals);

//     useSwalErrorAlert("Invalid Quantity", "SO Quantity must be greater than or equal to DR Quantity.");

//     const updatedRows = [...detailRowsRef.current];
//     updatedRows[index] = {
//       ...updatedRows[index],
//       soQuantity: originalValue,
//     };

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);

//     return false;
//   }

//   delete originalSOQuantityRef.current[index];
//   return true;
// };

 
// const handleSODetailRowChange = (index, field, value) => {
//   const parseDateValue = (dateValue) => {
//     if (!dateValue) return null;
//     const raw = String(dateValue).trim();
//     const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//     if (match) {
//       const [, month, day, year] = match;
//       return new Date(Number(year), Number(month) - 1, Number(day));
//     }

//     const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
//     if (isoMatch) {
//       const [, year, month, day] = isoMatch;
//       return new Date(Number(year), Number(month) - 1, Number(day));
//     }

//     return null;
//   };

//   if (field === "deliveryDate") {
//     const nextDate = parseDateValue(value);
//     const drDateValue = parseDateValue(documentDate);

//     if (nextDate && drDateValue) {
//       nextDate.setHours(0, 0, 0, 0);
//       drDateValue.setHours(0, 0, 0, 0);

//       if (nextDate < drDateValue) {
//         useSwalErrorAlert("Invalid Delivery Date", "Delivery Date cannot be earlier than DR Date.");
//         return;
//       }
//     }
//   }

//   const zeroValueByField = (targetField) => {
//     if (targetField === "soQuantity" || targetField === "drQuantity") {
//       return formatNumber(0, quantityDecimals);
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

//     return {
//       ...row,
//       freeItem: "Y",
//     };
//   };

//   const updatedRows = [...(detailRowsRef.current || [])];
//   let updatedRow = {
//     ...updatedRows[index],
//     [field]: value,
//   };
 

//   if (field === "freeItem") {
//     updatedRow = buildFreeItemRow(updatedRow, value === "Y");
//     updatedRows[index] = updatedRow;
//     updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: false });
//     updateTotals(updatedRows); 
//     return;
//   }

//   updatedRows[index] = updatedRow; 

//   updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: false });
//   updateTotals(updatedRows);
// };

// const handleDetailChangeGL = async (index, field, value) => {
//   const updatedRowsGL = [...(detailRowsGLRef.current || [])];
//   const row = { ...(updatedRowsGL[index] || {}) };

//   if (["acctCode", "slCode", "rcCode"].includes(field)) {
//     const data = await useUpdateRowGLEntries(row, field, value, shipToCode, docType);

//     if (data) {
//       row.acctCode = data.acctCode || "";
//       row.sltypeCode = data.sltypeCode || "";
//       row.slCode = data.slCode || "";
//       row.rcCode = data.rcCode || "";
//       row.vatCode = data.vatCode || "";
//       row.vatName = data.vatName || "";
//       row.atcCode = data.atcCode || "";
//       row.atcName = data.atcName || "";
//       row.particular = data.particular || "";
//     }
//   } else {
//     row[field] = value;
//   }

//   updatedRowsGL[index] = row;
//   updateState({
//     detailRowsGL: updatedRowsGL,
//     ...getGLTotalsState(updatedRowsGL),
//   });
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

// const handleCloseRcModalGL = async (selectedRc) => {
//   if (selectedRc && selectedRowIndex !== null) {
//     const result = await useTopRCRow(selectedRc.rcCode);
//     handleDetailChangeGL(selectedRowIndex, "rcCode", result || selectedRc);
//   }

//   updateState({
//     showRcModal: false,
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
//     accountModalSource: null,
//   });
// };

// const enterNextRowZeroClearFields = [
//   "soQuantity",
// ];

// const renderDRDetailCell = (columnKey, row, index) => {
//   const columnWidth = getDetailColumnFallbackWidth(columnKey);
//   const style = getDetailCellStyle(columnKey, columnWidth);
//   const isRowWithDR = (parseFormattedNumber(row.drQuantity || 0) || 0) > 0;
//   const quantityPickedValue = parseFormattedNumber(row.quantityPicked || 0) || 0;
//   const isRowFromSO = String(row.soNo || "").trim() !== "";
//   const canEditPickingStatus = isRowWithDR && quantityPickedValue === 0;
//   const canSearchItem = !isRowWithDR;
//   const canEditDetailAfterDR = !isRowWithDR;
//   const detailModalHandlers = {
//     itemCode: () => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true }),
//   }; 

//   // Moves focus to the same editable column in the next visible row.
//   const focusNextDetailCell = (field) => {
//     focusNextSoDetailRowInput(index, field, {
//       rows: detailRows,
//       zeroClearFields: enterNextRowZeroClearFields,
//       parseValue: parseFormattedNumber,
//       onClearNextValue: (nextIndex, nextField, value) => 
//         handleSODetailRowChange(nextIndex, nextField, value),
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
//         handleSODetailRowChange(index, field, sanitizedValue);
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


//   const detailColumnRenderers = {
//     ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
//     drStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`drStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.drStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleSODetailRowChange(index, "drStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("drStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
//     soNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
//     itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
//     itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>, 
//     itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>, 
//     uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.pmType || ""} readOnly /><input type="hidden" value={row.groupId || ""} readOnly /><input type="hidden" value={row.pmId || ""} readOnly /></td>, 
//     soBalance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>,
//     deliveryDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput key={`deliveryDate-${index}-${row.deliveryDate || "empty"}`} id={`deliveryDate-${index}`} name="deliveryDate" value={row.deliveryDate || ""} disabled={isFormDisabled || isRowFromSO} updateState={(updates) => handleSODetailRowChange(index, "deliveryDate", updates.deliveryDate || "")} className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" /></td>,
//     freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled || isRowFromSO ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled || isRowFromSO} onClick={() => handleSODetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>, 
//     drQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`) })}</td>, 
//     quantityPicked: () => (
//       <td key={columnKey} className="global-tran-td-ui" style={style}>
//         <div className="flex items-center gap-1">
//           <div className="min-w-0 flex-1">
//             {numericInput(columnKey, {
//               decimals: quantityDecimals,
//               regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`),
//             })}
//           </div>
//           {canUsePickingControls && (
//             <button
//               type="button"
//               title="Open Item Picking / Allocation"
//               aria-label="Open Item Picking / Allocation"
//               className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
//               disabled={!row?.groupId || !row?.itemCode || (parseFormattedNumber(row?.drQuantity || 0) || 0) <= 0}
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
//     siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
//     siDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`siDate-${index}`} name="siDate" value={row.siDate || ""} disabled updateState={() => {}} className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" /></td>,
//   };

//   return detailColumnRenderers[columnKey]?.() ?? null;
// };

// const renderDrGlColumn = (columnKey, row, index) => {
//   const columnWidth = getDrGlFallbackWidth(columnKey);
//   const style = getDrGlCellStyle(columnKey, columnWidth);
//   const glModalHandlers = {
//     acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
//     rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }),
//     slCode: () => updateState({ selectedRowIndex: index, showSlModal: true, accountModalSource: "slCode" }),
//   };

//   const focusNextGlCell = (field) => {
//     focusNextDrGlRowInput(index, field, {
//       rows: detailRowsGL,
//       zeroClearFields: [],
//       parseValue: parseFormattedNumber,
//       onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
//     });
//   };
  
//   const textInput = (field, options = {}) => (
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

//   const lookupCell = (field, options = {}) => {
//     const hasLookupValue = Boolean(String(row[field] || "").trim());
//     const showLookupIcon =
//       !isFormDisabled &&
//       glModalHandlers[field] &&
//       (!["rcCode", "slCode"].includes(field) || hasLookupValue);

//     return (
//       <td key={columnKey} className="global-tran-td-ui" style={style}>
//         <div className="relative w-full">
//           <input
//             type="text"
//             id={`${field}-${index}`}
//             className={`w-full ${showLookupIcon ? "pr-6" : ""} global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
//             value={row[field] || ""}
//             readOnly={true}
//             onKeyDown={(e) => {
//               if (e.key !== "Enter" || isFormDisabled) return;
//               e.preventDefault();
//               focusNextGlCell(field);
//             }}
//           />
//           {showLookupIcon && (
//             <FontAwesomeIcon
//               icon={faMagnifyingGlass}
//               className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
//               onClick={glModalHandlers[field]}
//             />
//           )}
//         </div>
//       </td>
//     );
//   };

//   const amountInput = (field) => (
//     <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={true} />
//   );
  
//   const glColumnRenderers = {
//     ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
//     acctCode: () => lookupCell("acctCode"),
//     rcCode: () => lookupCell("rcCode"),
//     sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("sltypeCode")}</td>,
//     slCode: () => lookupCell("slCode"),
//     particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("particular")}</td>,
//     vatCode: () => lookupCell("vatCode"),
//     vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
//     atcCode: () => lookupCell("atcCode"),
//     atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("atcName")}</td>,
//     debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debit")}</td>,
//     credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("credit")}</td>,
//     debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx1")}</td>,
//     creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx1")}</td>,
//     debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx2")}</td>,
//     creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx2")}</td>,
//     slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slRefNo", { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
//     slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate-${index}`} name={`slRefDate-${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} updateState={(updates) => handleDetailChangeGL(index, "slRefDate", updates[`slRefDate-${index}`] || updates.slRefDate || "")} className="w-full global-tran-td-inputclass-ui text-center pr-7" onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
//     remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
//   };
//   return glColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
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
 
//         detailsRoute="/page/SVI"

//         isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
//         isResetDisabled={state.isResetDisabled}
//         isAttachDisabled={!documentID}
//         isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
//         isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
//         isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED"} 
//       />
//       </div>


//       {topTab === "details" && (
//       <div className="contents">



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



//         {/* DR Header Form Section - Main Grid Container */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="dr_hd">
 
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
//               id="drNo"
//               label="DR No."
//               type="lookup"
//               value={state.documentNo || documentNo || ""}
//               disabled={state.isDocNoDisabled}
//               onChange={(val) => updateState({ documentNo: val })}
//               onBlur={handlesoNoBlur}
//               onLookup={() => updateState({ showAllTranDocNo: true })} // Changed soNo to drNo
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
//                   DR Date
//               </label>
//             </div>

//             <FieldRenderer
//               id="drTranType"
//               label="DR Type"
//               type="select"
//               value={drTranType || "DR01"}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ drTranType: val })}
//               options={drTranTypeOptions.map((t) => ({
//                 label: t.DROPDOWN_NAME,
//                 value: t.DROPDOWN_CODE,
//               }))}
//             />
//             </div>
 
//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="shipToCode"
//               label="Bill To Customer Code"
//               required
//               type="lookup"
//               value={shipToCode || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={!canChangeCustomer}
//               onLookup={() => canChangeCustomer && updateState({ custModalOpen: true, modalContext: "shipTo" })}
//             />
 
//             <FieldRenderer
//               id="shipToName"
//               label="Bill To Customer Name"
//               required
//               type="text"
//               value={shipToName || ""}
//               disabled
//               readOnly
//             />
 
//             <div className="relative w-full">
//               <div className="relative flex items-center w-full">
//                 <input
//                   id="shipToAddress"
//                   type="text"
//                   value={shipToAddress || ""}
//                   disabled={isFormDisabled}
//                   onChange={(e) => updateState({ shipToAddress: e.target.value })} 
//                   className={`peer w-full h-8 sm:h-8 global-ref-textbox-ui !px-2 !font-normal rounded-lg pr-12 ${
//                     !isFormDisabled
//                       ? "global-ref-textbox-enabled"
//                       : "global-ref-textbox-disabled"
//                   } focus-visible:ring-0 focus-visible:ring-offset-0 border shadow-none transition-all`}
//                 />
//                 <button
//                   type="button" 
//                   onClick={() =>
//                     canChangeCustomer &&
//                     updateState({ custModalOpen: true, modalContext: "shipTo" })
//                   }
//                   disabled={!canChangeCustomer}
//                   title="Search"
//                   className={`absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center rounded-r-lg border border-l-0 transition-colors ${ 
//                     canChangeCustomer
//                       ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
//                       : "bg-gray-100 text-gray-400"
//                   }`}
//                 >
//                   <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
//                 </button>
//               </div>
//               <label
//                 htmlFor="shipToAddress"
//                 className={`global-ref-floating-label ${
//                   !isFormDisabled
//                     ? "global-ref-label-enabled"
//                     : "global-ref-label-disabled"
//                 }`}
//               >
//                 Ship To Address
//               </label>
//             </div>
//           </div> 

//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="whseName"
//               label="Warehouse"
//               type="lookup"
//               value={whseName || ""}
//               disabled={isFormDisabled}
//               readOnly
//               lookupDisabled={false}
//               editableLookup
//               onLookup={() => updateState({ showWhseModal: true })}
//               onClear={() =>
//                 updateState({
//                   whseCode: "",
//                   whseName: "",
//                   locCode: "",
//                   locName: "",
//                 })
//               }
//             />
 
//             <FieldRenderer
//               id="locName"
//               label="Location"
//               type="lookup"
//               value={locName || ""}
//               disabled={isFormDisabled || !whseCode}
//               readOnly
//               lookupDisabled={!whseCode}
//               editableLookup
//               onLookup={() =>
//                 !isFormDisabled &&
//                 whseCode &&
//                 updateState({ showLocModal: true })
//               }
//               onClear={() => updateState({ locCode: "", locName: "" })}
//             />
//           </div>
 
//           <div className="global-tran-textbox-group-div-ui">
//             <FieldRenderer
//               id="refDocNo1"
//               label="Ref DR No. 1"
//               type="text"
//               value={refDocNo1 || ""}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ refDocNo1: val })}
//               maxLength={getOptionalFieldLength("refdr_no1")}
//             />
 
//             <FieldRenderer
//               id="refDocNo2"
//               label="Ref DR No. 2"
//               type="text"
//               value={refDocNo2 || ""}
//               disabled={isFormDisabled}
//               onChange={(val) => updateState({ refDocNo2: val })}
//               maxLength={getOptionalFieldLength("refdr_no2")}
//             />
 
//             <FieldRenderer
//               id="drStatus"
//               label="DR Status"
//               type="select"
//               value={drStatus || ""}
//               disabled={!isHeaderDrStatusEditable}
//               onChange={(val) => updateState({ drStatus: val })}
//               options={filteredHeaderDrStatusOptions.map((t) => ({
//                 label: t.DROPDOWN_NAME,
//                 value: t.DROPDOWN_CODE,
//               }))}
//             />
//           </div>
 
//           </div>

//           <div className="md:col-span-2 lg:col-span-4">
//             <div className="relative p-2">
//               <textarea
//                 id="remarks"
//                 placeholder=""
//                 rows={6}
//                 className="peer global-tran-textbox-remarks-ui pt-2"
//                 value={remarks} 
//                 onChange={(e) => updateState({ remarks: e.target.value })}
//                 disabled={isFormDisabled}
//                 maxLength={getOptionalFieldLength("remarks")}
//               />
//               <label
//                 htmlFor="remarks"
//                 className="global-tran-floating-label-remarks"
//               >
//                 Remarks
//               </label>
//             </div>
//           </div>
//         </div>

//           {/* APV Detail Section */}
//           <div id="apv_dtl" ref={detailSectionRef} className="global-tran-tab-div-ui">

//           {/* Tab Navigation */}
//           <div className="global-tran-tab-nav-ui">
 
//           {/* Tabs */}
//           <div className="flex flex-row sm:flex-row">
//             <button
//               className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
//             >
//               DR Details
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
//                 renderSoDetailHeader(column.label, column.key, column.width, {
//                   orderedColumns: orderedDetailColumns,
//                 })
//               )}

//                 {!isFormDisabled && (
//                   <th
//                     className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
//                     style={transactionActionsHeaderStyle} // Changed soDetailHeader to drDetailHeader
//                   > 
//                     Actions
//                   </th>
//                 )}
//             </tr>
//           </thead>

//           <tbody className="relative">{sortedDetailRows.map(({ row, originalIndex }) => {
//             const isPickingSelectedRow = showItemPickingModal && itemPickingRowIndex === originalIndex;
//             const pickedQty = parseFormattedNumber(row.quantityPicked || 0) || 0;
//             const canDeleteRow = pickedQty > 0 || !String(row.siNo || "").trim();

//             return (
//             <tr
//               key={originalIndex}
//               className={`global-tran-tr-ui ${isPickingSelectedRow ? "[&>td]:!bg-slate-200" : ""}`}
//             >
//               {orderedDetailColumns.map((column) => 
//                 renderDRDetailCell(column.key, row, originalIndex)
//               )}


//                {!isFormDisabled && (
//                     <td
//                       className={`global-tran-td-ui text-center sticky right-0 ${
//                         isPickingSelectedRow ? "bg-slate-200" : "bg-white dark:bg-black"
//                       }`}
//                       style={transactionActionsCellStyle}
//                     >
//                       <div className="flex items-center justify-center gap-1">
//                         <button
//                           type="button"
//                           className="global-tran-td-button-add-ui"
//                           onClick={() => handleInsertBlankRow(originalIndex)} 
//                           title="Insert blank row"
//                         >
//                           <FontAwesomeIcon icon={faPlus} />
//                         </button>

//                         <button
//                           type="button"
//                           className="global-tran-td-button-delete-ui"
//                           onClick={() => handleDeleteRow(originalIndex)} 
//                           disabled={!canDeleteRow}
//                           title={
//                             pickedQty > 0
//                               ? "Delete row and release picking allocation"
//                               : "Delete row"
//                           }
//                         >
//                           <FontAwesomeIcon icon={faTrashAlt} />
//                         </button>
//                       </div>
//                     </td>
//                   )}
 

//               </tr>
//             );
//           })}
//           </tbody>


//         </table>
//         {renderSoDetailHeaderContextMenu()}
//       </div> 
//       </div>

//     {/* Invoice Details Footer */}
//     <div className="global-tran-tab-footer-main-div-ui relative">

//     {/* Add Button */}
//     <div className="global-tran-tab-footer-button-div-ui">
//       <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
//         {showAddTypeDropdown && (
//           <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
//             <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
//               <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
//                 Add DR Detail
//               </div>
//             </div>

//             <div className="p-2">
//               <button
//                 type="button"
//                 className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
//                 onClick={() => {
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
//                 className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
//                 onClick={() => {
//                   setShowAddTypeDropdown(false);
//                   handleOpenSalesOrderLookup();
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
//                     <FontAwesomeIcon icon={faClipboardCheck} />
//                   </span>
//                   <div className="flex flex-col items-start">
//                     <span>Open Sales Order</span>
//                     <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
//                       Lookup open SO items
//                     </span>
//                   </div>
//                 </div>
//               </button>
//             </div>
//           </div>
//         )}

//       <button
//           onClick={handleAddRowClick}
//           className="global-tran-tab-footer-button-add-ui"
//         >
//           <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
//         </button>
//       </div>
//       {canUsePickingControls && (detailRows?.length || 0) > 0 && (
//         <div className="ml-6 flex items-center gap-2">
//           <button
//             type="button"
//             className="min-h-[36px] w-[132px] rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
//             disabled={isLoading}
//             onClick={() => handleBulkPickingAllocation("allocate")}
//           >
//             <FontAwesomeIcon icon={faClipboardCheck} className="mr-2" />
//             Allocate All
//           </button>

//           <button
//             type="button"
//             className="min-h-[36px] w-[132px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center whitespace-nowrap focus:outline-none"
//             disabled={isLoading || !hasPickedQuantity}
//             onClick={() => handleBulkPickingAllocation("release")}
//           >
//             <FontAwesomeIcon icon={faMinus} className="mr-2" />
//             Release All
//           </button>
//         </div>
//       )}
//     </div>

//       <div
//         className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-2"
//       >
//         {/* Total DR Quantity */}
//         <div className="global-tran-tab-footer-total-label-ui">Total DR Quantity:</div>
//         <div className="global-tran-tab-footer-total-value-ui">{totals.totalDrQuantity}</div>

//         {/* Total Quantity Picked */}
//         <div className="global-tran-tab-footer-total-label-ui">Total Quantity Picked:</div>
//         <div className="global-tran-tab-footer-total-value-ui">{totals.totalQuantityPicked}</div>
//       </div>
//     </div>
//     </div>

//       {/* General Ledger */}
//       {canViewCostAmount && hasPickedQuantity && (
//       <div className="global-tran-tab-div-ui mt-3">

//           {/* Tab Navigation */}
//           <div className="global-tran-tab-nav-ui">

//           {/* Tabs */}
//           <div className="flex flex-row sm:flex-row">
//             <button
//               className={`global-tran-tab-padding-ui ${
//                 GLactiveTab === 'invoice'
//                   ? 'global-tran-tab-text_active-ui'
//                   : 'global-tran-tab-text_inactive-ui'
//               }`}
//               onClick={() => updateState({ GLactiveTab: "invoice" })}
//             >
//               General Ledger
//             </button>
//           </div>

//           <div className="flex justify-end">
//             {!isFormDisabled && (
//               <button
//                 type="button"
//                 className="global-tran-button-generateGL"
//                 disabled={isGeneratingGL}
//                 onClick={() => handleActivityOption("GenerateGL")}
//               >
//                 {isGeneratingGL ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : null}
//                 {isGeneratingGL ? "Generating..." : "Generate GL Entries"}
//               </button>
//             )}
//           </div>
//         </div>

//         {/* GL Details Table */}
//         <div className="global-tran-table-main-div-ui">
//           <div className="global-tran-table-main-sub-div-ui">
//             <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
//               <thead className="global-tran-thead-div-ui">
//                 <tr>
//                   {orderedDrGlColumns.map((column) => (
//                     <Fragment key={`gl-header-${column.key}`}>
//                       {renderDrGlHeader(column.label, column.key, column.width, {
//                         orderedColumns: orderedDrGlColumns,
//                       })}
//                     </Fragment>
//                   ))}
//                   {!isFormDisabled && (
//                     <th
//                       className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
//                       style={transactionActionsHeaderStyle}
//                     >
//                       Actions
//                     </th>
//                   )}
//                 </tr>
//                 {renderDrGlHeaderContextMenu()}
//               </thead>
//               <tbody className="relative">
//                 {sortedDrGlRows.map(({ row, originalIndex }) => (
//                   <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
//                     {orderedDrGlColumns.map((column) => renderDrGlColumn(column.key, row, originalIndex))}
//                     {!isFormDisabled && (
//                       <td
//                         className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
//                         style={transactionActionsCellStyle}
//                       >
//                         <div className="flex items-center justify-center gap-1">
//                           <button
//                             type="button"
//                             className="global-tran-td-button-add-ui"
//                             onClick={() => handleAddRowGL(originalIndex)}
//                           >
//                             <FontAwesomeIcon icon={faPlus} />
//                           </button>

//                           <button
//                             type="button"
//                             className="global-tran-td-button-delete-ui"
//                             onClick={() => handleDeleteRowGL(originalIndex)}
//                           >
//                             <FontAwesomeIcon icon={faTrashAlt} />
//                           </button>
//                         </div>
//                       </td>
//                     )}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>


//         <div className="global-tran-tab-footer-main-div-ui">          
//           <div className="global-tran-tab-footer-button-div-ui">
//             <button
//               onClick={() => handleAddRowGL()}
//               className="global-tran-tab-footer-button-add-ui"
//               style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
//             >
//               <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
//             </button>
//           </div>

//           {/* Totals Section */}
//           <div className="global-tran-tab-footer-total-main-div-ui w-full">

//             {/* Total Debit */}
//             <div className="global-tran-tab-footer-total-div-ui">
//               <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
//                 Total Debit ({glCurrDefault}):
//               </label>
//               <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
//                 {totalDebit}
//               </label>
//             </div>

//             {/* Total Credit */}
//             <div className="global-tran-tab-footer-total-div-ui">
//               <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
//                 Total Credit ({glCurrDefault}):
//               </label>
//               <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
//                 {totalCredit}
//               </label>
//             </div>

//           </div>
//         </div>
//       </div>
//       )}

//     </div>
//     )}

//     {branchModalOpen && (
//             <BranchLookupModal
//               isOpen={branchModalOpen}
//               onClose={handleCloseBranchModal}
//             />
//           )}

//     {custModalOpen && (
//       <CustomerMastLookupModal
//         isOpen={custModalOpen}
//         onClose={handleCloseCustModal}
//         customParam={modalContext === "openSO" ? "OpenSO" : undefined}
//       />
//     )}

//     {showWhseModal && (
//       <WarehouseLookupModal
//         isOpen={showWhseModal}
//         onClose={handleCloseWarehouseLookup}
//         filter={"ByBC" + branchCode}
//       />
//     )}

//     {showLocModal && (
//       <LocationLookupModal
//         isOpen={showLocModal}
//         onClose={handleCloseLocationLookup}
//         filter={"ByWH" + whseCode}
//       />
//     )}

//     {showOpenSOModal && (
//       <GlobalCombinedLookup
//         isOpen={showOpenSOModal}
//         title="Open Sales Order"
//         summarySelectionMode="multiple"
//         detailSelectionMode="multiple"
//         summaryColumns={openSODR_Col_Summary}
//         detailColumns={openSODR_Col_Detail}
//         summaryData={openSODR_Data_Summary}
//         tabTitles={["Open SO Summary", "Open SO Detail"]}
//         fetchDetailApi={async (selectedIds) => {
//           const idString = Array.isArray(selectedIds)
//             ? selectedIds.join(",")
//             : selectedIds;

//           const payload = {
//             json_data: JSON.stringify({
//               json_data: {
//                 selectedId: idString
//               },
//             }),
//           };

//           let response;
//           try {
//             response = await postRequest("getSODR_OpenDetail", payload);
//           } catch (error) {
//             console.error("getSODR_OpenDetail failed:", {
//               payload,
//               status: error?.response?.status,
//               data: error?.response?.data,
//               error,
//             });
//             throw error;
//           }

//           const rawData = response?.data?.[0]?.result
//             ? JSON.parse(response.data[0].result)
//             : response?.data || response;
//           const normalizedData = Array.isArray(rawData)
//             ? rawData.map(normalizeOpenSOLookupRow)
//             : [];

//           return { data: normalizedData };
//         }}
//         onClose={handleInsertSelectedOpenSO}
//         onCancel={() =>
//           updateState({
//             showOpenSOModal: false,
//             openSODR_Data_Summary: [],
//             openSODR_Col_Summary: [],
//             openSODR_Col_Detail: [],
//           })
//         }
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
 

//     {showItemPickingModal && selectedPickingRow && (
//       <SearchGlobalItemPickingModal
//         isOpen={showItemPickingModal}
//         onClose={handleCloseItemPickingModal}
//         transaction={{
//           sourceDocType: "DR",
//           sourceDocTypeName: "Delivery Receipt",
//           sourceDocNo: documentNo || "",
//           sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
//           groupId: selectedPickingRow?.groupId || "",
//           customerCode: shipToCode || "",
//           customerName: shipToName || "",
//           itemCode: selectedPickingRow?.itemCode || "",
//           itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
//           requestedQty: parseFormattedNumber(selectedPickingRow?.drQuantity || 0) || 0,
//         }}
//         stockRows={itemPickingStockRows}
//         existingAllocations={itemPickingExistingAllocations}
//         onConfirm={handleConfirmItemPicking}
//       />
//     )}

//     {showAccountModal && (
//       <COAMastLookupModal
//         isOpen={showAccountModal}
//         onClose={handleCloseAccountModal}
//         source={accountModalSource}
//       />
//     )}

//     {showRcModal && (
//       <RCLookupModal
//         isOpen={showRcModal}
//         onClose={handleCloseRcModalGL}
//         source={accountModalSource}
//       />
//     )}

//     {showSlModal && (
//       <SLMastLookupModal
//         isOpen={showSlModal}
//         onClose={handleCloseSlModalGL}
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
//         params={{branchCode,branchName,docType,documentTitle,fieldNo : "drNo"}}
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
//     endpoint="/getDRHistory"
//     cacheKey={`DR:${state.branchCode || ""}`}
//     activeTabKey="DR_Summary"
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

// export default DR;



import { useState, useEffect,useRef,useCallback, Fragment } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faClipboardCheck, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalItemPickingModal from "../../../Lookup/SearchGlobalItemPickingModal.jsx";

// Configuration
import { fetchDataJson, postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  docTypes, docTypeVideoGuide, docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';

import {
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowGLEntries,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

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
  useSelectedHSColConfig as selectedHSColConfig
} from '@/NAYSA Cloud/Global/selectedData';

import {
  useTopHSOption,
  useTopRCRow,
  useTopWarehouseRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalInfoAlert,
  useSwalvalidateRequiredFields,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// Header
import Header from '@/NAYSA Cloud/Components/Header';

const DR = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const detailSectionRef = useRef(null);
  const originalSOQuantityRef = useRef({});
  const addTypeDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopHSDocRow } = useAuth();

  // Company defaults - moved here to ensure they are defined before use in useState
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
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
  const docType = docTypes.DR;
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = (hsDoc?.docName || '') + ' Transaction';

  const [state, setState] = useState({
    // HS Option
    glCurrMode:"M",
    glCurrDefault:"PHP",
    withCurr2:false,
    withCurr3:false,
    glCurrGlobal1:"",
    glCurrGlobal2:"",
    glCurrGlobal3:"",

    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentDate:useGetCurrentDayV2(),
    documentNo: "",
    documentStatus:"O",
    originalDocStatus: "O",
    status: "OPEN",
    noReprints:"0",


    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries: false,
    isGeneratingGL: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,



    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",

    shipToCode: "",
    shipToName: "",
    shipToAddress: "",

    tblFieldArray :[],
    drTranType: "DR01",
    drTranTypeOptions: [],
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",
    userCode: currentUserRow?.userCode||"",

    //Detail 1-2
    detailRows  :[],
    detailRowsGL: [],
    totalDebit: "0.00",
    totalCredit: "0.00",
    totalDebitFx1: "0.00",
    totalCreditFx1: "0.00",
    totalDebitFx2: "0.00",
    totalCreditFx2: "0.00",

    openSODR_Data_Summary: [],
    openSODR_Col_Summary: [],
    openSODR_Col_Detail: [],


    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    insertAfterIndex: null,
    showItemModal:false,
    showWhseModal:false,
    showLocModal:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showAllTranDocNo:false,
    showOpenSOModal:false,
    showAccountModal:false,
    showRcModal:false,
    showSlModal:false,
    accountModalSource:null
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
  originalDocStatus,
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


  // Currency
  glCurrMode,
  glCurrDefault,
  withCurr2,
  withCurr3,
  glCurrGlobal1,
  glCurrGlobal2,
  glCurrGlobal3,
  defaultCurrRate,
  currCode,
  currName,
  currRate,

  // Transaction Header
  branchCode,
  branchName,
  shipToCode,
  shipToName,
  shipToAddress,
  whseCode,
  whseName,
  locCode,
  locName,
  drTranType,
  drTranTypeOptions,
  drStatus,
  drStatusOptions,
  refDocNo1,
  refDocNo2,
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
  openSODR_Data_Summary,
  openSODR_Col_Summary,
  openSODR_Col_Detail,


  // Contexts
  modalContext,
  selectionContext,
  selectedRowIndex,
  insertAfterIndex,

  // Modals
  showItemModal,
  showWhseModal,
  showLocModal,
  branchModalOpen,
  custModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAllTranDocNo,
  showOpenSOModal,
  showAccountModal,
  showRcModal,
  showSlModal,
  accountModalSource

  } = state;

  const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
  const [showItemPickingModal, setShowItemPickingModal] = useState(false);
  const [itemPickingRowIndex, setItemPickingRowIndex] = useState(null);
  const [itemPickingStockRows, setItemPickingStockRows] = useState([]);
  const [itemPickingExistingAllocations, setItemPickingExistingAllocations] = useState([]);

  useEffect(() => {
    if (!showAddTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowAddTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddTypeDropdown]);

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
  const isPosted = ["FINALIZED", "POSTED"].includes(normalizedDisplayStatus);
  const isCancelled = normalizedDisplayStatus === "CANCELLED";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(normalizedDisplayStatus);
  const isHeaderDrStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
  const canUsePickingControls = !isViewDocumentUrl && !isPosted && !isCancelled;
  const filteredHeaderDrStatusOptions = drStatusOptions || [];
  const selectedDrTranTypeOption = (drTranTypeOptions || []).find(
    (option) => option.DROPDOWN_CODE === (drTranType || "DR01")
  );
  const selectedDrTranTypeText = `${drTranType || "DR01"} ${selectedDrTranTypeOption?.DROPDOWN_NAME || ""}`.toUpperCase();
  const isRegularDrType = (drTranType || "DR01") === "DR01" || selectedDrTranTypeText.includes("REGULAR");
  const getOptionalFieldLength = (fieldName) =>
    useGetFieldLength(tblFieldArray, fieldName) || undefined;
  const canChangeCustomer =
    !isFormDisabled && (detailRows || []).every((row) => !String(row?.soNo || "").trim());



  //Variables
  const [totals, setTotals] = useState({
    totalDrQuantity: formatNumber(0, quantityDecimals),
    totalQuantityPicked: formatNumber(0, quantityDecimals),
  });



  
  const salesAllowDuplicateItem = String(
    companyInfo?.salesAllowDuplicateItem || ""
  ).toUpperCase();

  // Derived UI flags
  const DR_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";
  const canViewCostAmount =
    String(currentUserRow?.viewCostamt || "").toUpperCase() === "Y";

  const detailColumnDefs = [
    { key: "groupId", label: "Group ID", width: 120 },
    { key: "soId", label: "SO ID", width: 120 },
    { key: "ln", label: "LN", width: 56 },
    { key: "drStat", label: "Picking Status", width: 130 },
    { key: "soNo", label: "SO No.", width: 140 },
    { key: "itemCode", label: "Item Code", width: 140 },
    { key: "itemName", label: "Item Name", width: 240 },
    { key: "itemSpecs", label: "Specification", width: 240 },
    { key: "uomCode", label: "UOM", width: 100 },
    { key: "soBalance", label: "SO Balance", width: 120 },
    { key: "drQuantity", label: "DR Quantity", width: 120 },
    { key: "quantityPicked", label: "Quantity Picked", width: 130 },
    { key: "itemAmount", label: "Item Amount", width: 130 },
    { key: "deliveryDate", label: "Delivery Date", width: 130 },
    { key: "siNo", label: "SI No.", width: 140 },
    { key: "siDate", label: "SI Date", width: 130 },
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
    renderResizableHeader: renderSoDetailHeader,
  } = useResizableTableColumns(detailColumnDefs);
  const orderedDetailColumns = getOrderedSoDetailColumns(detailColumnDefs);
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
    const shouldShowItemAmount = isPosted && canViewCostAmount;
    setSoDetailHiddenColumnKeys([
      "groupId",
      "soId",
      ...(shouldShowItemAmount ? [] : ["itemAmount"]),
    ]);
  }, [setSoDetailColumnOrder, setSoDetailHiddenColumnKeys, isPosted, canViewCostAmount]);
  const sortedDetailRows = getSortedSoDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") {
        return entry.originalIndex + 1;
      }

      return entry.row?.[sortKey] ?? "";
    }
  );


  const drGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC Code", width: 120 },
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
    { key: "slRefDate", label: "SL Ref. Date", width: 130 },
    { key: "remarks", label: "Remarks", width: 160 },
  ];

  const {
    getColumnStyle: getDrGlColumnStyle,
    getFrozenColumnStyle: getDrGlFrozenStyle,
    getOrderedColumns: getOrderedDrGlColumns,
    getSortedRows: getSortedDrGlRows,
    setColumnOrder: setDrGlColumnOrder,
    clearAllSorting: clearDrGlSorting,
    clearZeroValueOnFocus: clearDrGlZeroOnFocus,
    focusNextRowInput: focusNextDrGlRowInput,
    renderHeaderContextMenu: renderDrGlHeaderContextMenu,
    renderResizableHeader: renderDrGlHeader,
  } = useResizableTableColumns(drGlColumnDefs);
  
  const orderedDrGlColumns = getOrderedDrGlColumns(drGlColumnDefs);
  const getDrGlFallbackWidth = (key) => drGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getDrGlCellStyle = (key, fallbackWidth) => ({
    ...getDrGlColumnStyle(key, fallbackWidth),
    ...getDrGlFrozenStyle(key, orderedDrGlColumns, fallbackWidth, { isHeader: false }),
  });
  
  useEffect(() => {
    setDrGlColumnOrder(drGlColumnDefs.map((column) => column.key));
  }, [setDrGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  
  const sortedDrGlRows = getSortedDrGlRows(
    (detailRowsGL || []).map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const getTotalQuantityPicked = (rows = []) =>
    (Array.isArray(rows) ? rows : []).reduce(
      (total, row) => total + (parseFormattedNumber(row.quantityPicked || 0) || 0),
      0
    );

  const hasPickedQuantity = getTotalQuantityPicked(detailRows) > 0;

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);
    return { totalDebit: formatNumber(debitSum), totalCredit: formatNumber(creditSum), totalDebitFx1: formatNumber(debitFx1Sum), totalCreditFx1: formatNumber(creditFx1Sum), totalDebitFx2: formatNumber(debitFx2Sum), totalCreditFx2: formatNumber(creditFx2Sum) };
  };

  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);




  const updateTotalsDisplay = (totalDrQty, totalPickedQty) => {
    setTotals({
      totalDrQuantity: formatNumber(totalDrQty, quantityDecimals),
      totalQuantityPicked: formatNumber(totalPickedQty, quantityDecimals),
      });
  };


  const applyHeaderValueToDetailRows = (detailField, detailValue) => {
    const updatedRows = detailRows.map((row) => ({
      ...row,
      [detailField]: detailValue,
    }));

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
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
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown("DRTRAN_TYPE", docType) || [];
    const defaultDrType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "DR01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "DR01";
    const mapHeaderDrStatus = (value) => {
      const normalizedValue = String(value || "").toUpperCase();
      if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
      if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
      if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
      return "O";
    };

    updateState({
      drTranTypeOptions: filteredTypes,
      drTranType: state.drTranType || defaultDrType,
      drStatusOptions: [
        { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
        { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
        { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
      ],
      drStatus: mapHeaderDrStatus(state.drStatus),
    });
}, [docType, refsLoaded]);



  const handleReset = () => {
    clearSoDetailSorting();
    setShowAddTypeDropdown(false);
    const filteredTypes = getAllDropDown("DRTRAN_TYPE", docType) || [];
    const defaultDrType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "DR01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "DR01";

    updateState({
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      userCode: currentUserRow?.userCode || "",
      documentDate: useGetCurrentDayV2(),
      refDocNo1: "",
      refDocNo2: "",
      whseCode: "",
      whseName: "",
      locCode: "",
      locName: "",
      remarks: "",
      noReprints: "0",
      shipToCode: "",
      shipToName: "",
      shipToAddress: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      openSODR_Data_Summary: [],
      openSODR_Col_Summary: [],
      openSODR_Col_Detail: [],
      documentStatus: "O",
      originalDocStatus: "O",
      drTranType: defaultDrType,
      drStatus: "O",
      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      showOpenSOModal: false,
      triggerGLEntries: false,
      isGeneratingGL: false,
      status: "Open",
    });
    updateTotalsDisplay(0, 0);
  };






    const loadCompanyData = async () => {
        updateState({ isLoading: true });

        try {
          const hdtblcol_result = await useFieldLenghtCheck(
            "dr_hd,dr_dt1,dr_dt2",
          );

          if (hdtblcol_result) {
            updateState({ tblFieldArray: hdtblcol_result });
          }

          const hsOption = await useTopHSOption();
          if (hsOption) {
            updateState({
              glCurrMode: hsOption.glCurrMode,
              glCurrDefault: hsOption.glCurrDefault,
              glCurrGlobal1: hsOption.glCurrGlobal1,
              glCurrGlobal2: hsOption.glCurrGlobal2,
              glCurrGlobal3: hsOption.glCurrGlobal3,
              withCurr2: (hsOption.glCurrMode === "M" && hsOption.glCurrDefault !== companyInfo?.currCode) || hsOption.glCurrMode === "D" || hsOption.glCurrMode === "T",
              withCurr3: hsOption.glCurrMode === "T",
            });
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        } finally {
          updateState({ isLoading: false });
        }
      };


const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true, showSpinner: true });

  try { // Assuming 'drNo' is the correct field for DR document number
    const data = await useFetchTranData(documentNo, branchCode, docType, "drNo", direction);


    if (!data?.drId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      soNo: item.soNo || "",
      drStat: item.pickStat || "F",
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      itemSpecs: item.itemSpecs || "",
      uomCode: item.uomCode || "",
      groupId: item.groupId || "",
      soId: item.soId || "",
      soBalance: formatNumber(item.soBalance ?? 0, quantityDecimals),
      drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
      quantityPicked: formatNumber(item.quantityPicked ?? 0, quantityDecimals),
      itemAmount:  item.itemAmount?? formatNumber(0),// formatNumber(item.itemAmount ?? 0),
      freeItem: item.freeItem || "",
      deliveryDate: useformatToDatev2(item.deliveryDate),
      siNo: item.siNo || "",
      siDate: useformatToDatev2(item.siDate),
      drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
    }));

    const formattedGLRows = (data.dt2 || []).map(glRow => ({
      ...glRow,
      debit: formatNumber(parseFormattedNumber(glRow.debit)),
      credit: formatNumber(parseFormattedNumber(glRow.credit)),
      debitFx1: formatNumber(parseFormattedNumber(glRow.debitFx1)),
      creditFx1: formatNumber(parseFormattedNumber(glRow.creditFx1)),
      debitFx2: formatNumber(parseFormattedNumber(glRow.debitFx2)),
      creditFx2: formatNumber(parseFormattedNumber(glRow.creditFx2)),
      slRefDate: useformatToDatev2(glRow.slRefDate),
    }));

    updateState({
      documentStatus: data.drStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.drId,
      documentNo: data.drNo,
      documentDate: useformatToDatev2(data.drDate),
      branchCode: data.branchCode,
      branchName:data.branchName,
      drTranType: data.drTranType || data.drtranType || "DR01",
      shipToCode: data.custCode,
      shipToName: data.custName,
      shipToAddress:data.shipToAddr,
      whseCode: data.whouseCode || "",
      whseName: data.whouseName || "",
      locCode: data.locCode || "",
      locName: data.locName || "",
      refDocNo1: data.refDrNo1,
      refDocNo2: data.refDrNo2,
      remarks: data.remarks,
      drStatus: String(data.drStatus || "O").toUpperCase() === "OPEN" ? "O" : String(data.drStatus || "O").toUpperCase() === "CANCELLED" ? "X" : String(data.drStatus || "O").toUpperCase() === "CLOSED" ? "C" : String(data.drStatus || "O"), 
      originalDocStatus: data.drStatus,
      detailRows: retrievedDetailRows,
      detailRowsGL: formattedGLRows,
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

    updateTotals(retrievedDetailRows);

  } catch (error) { // Changed soNo to drNo
    console.error("Error fetching transaction data:", error); 
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};


const handlesoNoBlur = () => { // Renamed to handleDrNoBlur

    if (!state.documentID && state.documentNo && state.branchCode) {
        fetchTranData(state.documentNo, state.branchCode);
    }
};








const moveFocusBeforeSave = async () => {
  document.activeElement?.blur?.();
  return true;
};




const handleActivityOption = async (action) => {
  if ((detailRows?.length || 0) === 0) {
    return;
  }

  if (action === "Upsert") {
    await moveFocusBeforeSave();
  }

  if (documentStatus === "O" || action === "GenerateGL") {
    updateState({ isLoading: true, showSpinner: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        shipToCode,
        shipToName,
        shipToAddress,
        drTranType,
        refDocNo1,
        refDocNo2,
        remarks,
        userCode,
        drStatus,
        detailRows,
        detailRowsGL,
      } = state;

      let finalDetailRowsGL = Array.isArray(detailRowsGL) ? [...detailRowsGL] : [];

      const formatGeneratedGLRows = (rows = []) =>
        (Array.isArray(rows) ? rows : []).map((row) => ({
          ...row,
          debit: formatNumber(parseFormattedNumber(row.debit)),
          credit: formatNumber(parseFormattedNumber(row.credit)),
          debitFx1: formatNumber(parseFormattedNumber(row.debitFx1)),
          creditFx1: formatNumber(parseFormattedNumber(row.creditFx1)),
          debitFx2: formatNumber(parseFormattedNumber(row.debitFx2)),
          creditFx2: formatNumber(parseFormattedNumber(row.creditFx2)),
          slRefDate: useformatToDatev2(row.slRefDate),
        }));

      const buildDrData = (glRows = []) => ({
        branchCode: branchCode,
        drNo: documentNo || "",
        drId: documentID || "",
        drDate: documentDate,
        drTranType: drTranType || "DR01",
        custCode: shipToCode,
        custName: shipToName,
        shipToAddr: shipToAddress,
        refDrNo1: refDocNo1,
        refDrNo2: refDocNo2,
        whouseCode: whseCode,
        locCode,
        remarks: remarks || "",
        userCode: userCode,
        drStatus,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          pickStat: row.drStat || "F",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          uomCode: row.uomCode || "",
          freeItem: row.freeItem || "",
          soBalance: parseFormattedNumber(row.soBalance || 0),
          drQuantity: parseFormattedNumber(row.drQuantity || 0),
          quantityPicked: parseFormattedNumber(row.quantityPicked || 0),
          itemAmount: parseFormattedNumber(row.itemAmount || 0),
          soNo: row.soNo || "",
          deliveryDate: row.deliveryDate || null,
          siNo: row.siNo || "",
          siDate: row.siDate || null,
          itemSpecs: row.itemSpecs || "",
          groupId: row.groupId || "",
          soId: row.soId || "",
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
        const totalPickedQuantity = getTotalQuantityPicked(detailRows);

        if (totalPickedQuantity <= 0) {
          updateState({
            detailRowsGL: [],
            ...getGLTotalsState([]),
            isGeneratingGL: false,
          });
          return;
        }

        try {
          updateState({ detailRowsGL: [], isGeneratingGL: true });

          const newGlEntries = await useGenerateGLEntries(
            docType,
            buildDrData(finalDetailRowsGL)
          );

          const formattedGLRows = formatGeneratedGLRows(newGlEntries);

          updateState({
            detailRowsGL: formattedGLRows,
            ...getGLTotalsState(formattedGLRows),
            isGeneratingGL: false,
          });
        } catch (error) {
          updateState({ detailRowsGL: [], isGeneratingGL: false });
          console.error("Error generating DR GL entries:", error);
          useSwalErrorAlert("Generate GL", getApiErrorMessage(error));
        }

        return;
      }

      if (action === "Upsert") {
        const totalPickedQuantity = getTotalQuantityPicked(detailRows);

        /*
          Important:
          Do not regenerate GL during Save.
          Save must preserve the current detailRowsGL because user may have manually edited GL entries.

          GL is regenerated only by:
          1. Generate GL Entries button
          2. Picking allocation database flow using GenerateEntries + saveToTable = Y
        */
        if (totalPickedQuantity <= 0) {
          finalDetailRowsGL = [];

          updateState({
            detailRowsGL: [],
            ...getGLTotalsState([]),
          });
        } else {
          finalDetailRowsGL = Array.isArray(detailRowsGL)
            ? [...detailRowsGL]
            : [];
        }

        const response = await useTransactionUpsert(
          docType,
          buildDrData(finalDetailRowsGL),
          updateState,
          "drId",
          "drNo"
        );

        if (response) {
          const responseDocNo = response.data[0].drNo;
          const responseDocId = response.data[0].drId;

          await fetchTranData(responseDocNo, branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }

        updateState({
          documentNo: response?.data?.[0]?.drNo || "",
          documentID: response?.data?.[0]?.drId || "",
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      useSwalErrorAlert("Delivery Receipt", getApiErrorMessage(error));
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  }
};




useEffect(() => {
  if (!triggerGLEntries) return;

  handleActivityOption("GenerateGL").finally(() => {
    updateState({ triggerGLEntries: false });
  });
}, [triggerGLEntries]);



  const createDRDetailRow = (overrides = {}) => ({
      lnNo: "",
      drStat: "F",
      soNo: "",
      itemCode: "",
      itemName: "",
      itemSpecs: "",
      uomCode: "",
      groupId: "",
      soId: "",
      soBalance: Number(0).toFixed(quantityDecimals),
      deliveryDate: null,
      drQuantity: Number(0).toFixed(quantityDecimals),
      quantityPicked: Number(0).toFixed(quantityDecimals), 
      freeItem: "", 
      drQuantity: Number(0).toFixed(quantityDecimals),
      itemAmount: formatNumber(0),
      ...overrides,
    });

  const normalizeDetailLineNumbers = (rows = []) =>
    rows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    }));

  const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
      return;
    }

    const updatedRows = [...detailRows];
    const normalizedInsertRows = rowsToInsert.map((row) => createDRDetailRow(row));

    if (insertIndex !== null && insertIndex >= 0) {
      updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
    } else {
      updatedRows.push(...normalizedInsertRows);
    }

    const normalizedRows = normalizeDetailLineNumbers(updatedRows);

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
    insertDetailRows([createDRDetailRow()], insertIndex);
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
    if (DR_ALLOW_DUPLICATE_ITEMS) {
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
        `These item(s) already exist in DR Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
      );
    }

    return filteredRecords;
  };





  const mapItemRecordToDetailRow = (item = {}) => createDRDetailRow({
    soNo: item?.soNo || "",
    itemCode: item?.itemCode || "",
    itemName: item?.itemName || "",
    itemSpecs: item?.itemSpecs || "",
    uomCode: item?.uomCode || "",
    groupId: item?.groupId || "",
    soId: item?.soId || "",
    soBalance: formatNumber(
      item?.soBalance ?? item?.soQuantity ?? 0, 
      quantityDecimals 
    ),
    deliveryDate: useformatToDatev2(item?.deliveryDate),
    drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
    quantityPicked: formatNumber(item?.quantityPicked ?? 0, quantityDecimals),
    itemAmount: formatNumber(item?.itemAmount ?? 0),
    siNo: item?.siNo || "",
    siDate: item?.siDate || "",
    freeItem: item?.freeItem || "",
  });

  const resolveOpenSOGroupId = (item = {}) => item?.groupId || "";

  const normalizeOpenSOLookupRow = (item = {}) => ({
    ...item,
    groupId: resolveOpenSOGroupId(item),
    soId: item?.soId || "",
    soNo: item?.soNo || "",
    deliveryDate: item?.deliveryDate || "",
  });

  const mapOpenSORecordToDetailRow = (item = {}) => {
    const soBalanceValue = item?.soBalance ?? 0;

    return createDRDetailRow({
      soNo: item?.soNo || "",
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      itemSpecs: item?.itemSpecs || "",
      uomCode: item?.uomCode || "",
      groupId: resolveOpenSOGroupId(item),
      soId: item?.soId || "",
      soBalance: formatNumber(soBalanceValue, quantityDecimals),
      deliveryDate: useformatToDatev2(item?.deliveryDate),
      drQuantity: formatNumber(item?.drQuantity ?? soBalanceValue ?? 0, quantityDecimals),
      quantityPicked: formatNumber(item?.quantityPicked ?? 0, quantityDecimals),
      siNo: item?.siNo || "",
      siDate: item?.siDate || "",
      freeItem: item?.freeItem || "",
    });
  };

  const getOpenSOShipToAddress = (records = []) => {
    const addressKeys = ["shipto_addr", "shipToAddr", "shipToAddress", "shipToAddr1"];
    const source = (records || []).find((record) =>
      addressKeys.some((key) => String(record?.[key] || "").trim())
    );

    if (!source) return "";

    const key = addressKeys.find((field) => String(source?.[field] || "").trim());
    return String(source?.[key] || "").trim();
  };

  const getUniqueOpenSORemarks = (records = []) => {
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

  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const rowsToInsert = selectedRecords.map((item) => {
      const baseRow = mapItemRecordToDetailRow(item); 
      return baseRow; // No price matrix application for DR
    });

    insertDetailRows(rowsToInsert, insertAfterIndex);
  };

  const scrollDetailSectionToMiddle = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        detailSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  };

  const handleInsertSelectedOpenSO = async (payload) => {
    const selectedRecords = Array.isArray(payload?.details)
      ? payload.details
      : normalizeItemModalRecords(payload);
    const selectedSummaryRecords = Array.isArray(payload?.summary)
      ? payload.summary
      : [];
    const headerSourceRecords = selectedSummaryRecords.length > 0
      ? selectedSummaryRecords
      : selectedRecords;

    if (selectedRecords.length === 0) {
      updateState({ showOpenSOModal: false });
      return;
    }

    const rowsToInsert = selectedRecords.map(mapOpenSORecordToDetailRow);
    const selectedShipToAddress = getOpenSOShipToAddress(headerSourceRecords);
    const nextRemarks = appendMissingRemarks(
      remarks,
      getUniqueOpenSORemarks(headerSourceRecords)
    );

    insertDetailRows(rowsToInsert, insertAfterIndex);
    setTopTab("details");

    updateState({
      ...(selectedShipToAddress ? { shipToAddress: selectedShipToAddress } : {}),
      remarks: nextRemarks,
      showOpenSOModal: false,
      openSODR_Data_Summary: [],
      openSODR_Col_Summary: [],
      openSODR_Col_Detail: [],
      insertAfterIndex: null,
    });
    scrollDetailSectionToMiddle();
  };





const cancelPickingAllocationForDeletedRow = async (row) => {
  const pickedQty = parseFormattedNumber(row?.quantityPicked || 0) || 0;

  // No picked quantity, no need to call allocation API.
  if (pickedQty <= 0) {
    return true;
  }

  if (!documentID || !row?.groupId) {
    useSwalErrorAlert(
      "Delete DR Detail",
      "Cannot release picking allocation. DR ID or Group ID is missing."
    );
    return false;
  }

  const confirm = await useSwalProceedConfirm(
    "Delete Picked DR Detail?",
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
          docCode: "DR",
          docId: documentID,
          groupId: row.groupId,
          userCode: userCode || currentUserRow?.userCode || "",
          reason: "DR detail line deleted.",
        },
      }),
    });

    return true;
  } catch (error) {
    console.error("Failed to release FG picking allocation:", error);
    useSwalErrorAlert("Delete DR Detail", getApiErrorMessage(error));
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

  const canDelete = await cancelPickingAllocationForDeletedRow(rowToDelete);

  if (!canDelete) {
    return;
  }

  const updatedRows = normalizeDetailLineNumbers(
    detailRows.filter((_, rowIndex) => rowIndex !== index)
  );

  detailRowsRef.current = updatedRows;

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
    triggerGLEntries: getTotalQuantityPicked(updatedRows) > 0,
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

  const updatedRows = [...(detailRowsGL || [])];

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
  const updatedRows = [...(detailRowsGL || [])];
  updatedRows.splice(index, 1);

  updateState({
    detailRowsGL: updatedRows,
    ...getGLTotalsState(updatedRows),
  });
};








const handlePrint = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};

  const handleOpenAddItemModal = async () => {
    const fieldsToCheck = {
      "Header : Bill To Customer Code": shipToCode, // Still uses shipToCode state in DR.
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
    docCode: "DR",
    docNo: documentNo || "",
    docId: documentID || "",
    docDate: documentDate || null,
    branchCode: branchCode || "",
    whouseCode: whseCode || "",
    locCode: locCode || "",
    groupId: row?.groupId || "",
    lineNo: index + 1,
    itemCode: row?.itemCode || "",
    requestedQty: parseFormattedNumber(row?.drQuantity || 0) || 0,
    userCode: userCode || currentUserRow?.userCode || "",
  });

  const handleOpenSalesOrderLookup = async (overrides = {}) => {
    const lookupShipToCode = String(overrides.shipToCode ?? shipToCode ?? "").trim();
    const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

    if (!lookupShipToCode) {
      const branchIsValid = await useSwalvalidateRequiredFields(
        { "Header : Branch": lookupBranchCode },
        "Open Sales Order Lookup"
      );
      if (!branchIsValid) return;

      updateState({
        custModalOpen: true,
        modalContext: "openSO",
      });
      return;
    }

    const fieldsToCheck = {
      "Header : Bill To Customer Code": lookupShipToCode,
      "Header : Branch": lookupBranchCode,
    };

    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Open Sales Order Lookup");
    if (!isValid) return;

    try {
      updateState({ isLoading: true, showSpinner: true });

      const endpoint = "getSODR_OpenSummary";
      let response;
      try {
        response = await fetchDataJson(endpoint, {
          custCode: lookupShipToCode,
          shipToCode: lookupShipToCode,
          branchCode: lookupBranchCode,
        });
      } catch (error) {
        console.error(`${endpoint} failed:`, {
          payload: {
            custCode: lookupShipToCode,
            shipToCode: lookupShipToCode,
            branchCode: lookupBranchCode,
          },
          status: error?.response?.status,
          data: error?.response?.data,
          error,
        });
        throw new Error(`${endpoint}: ${getApiErrorMessage(error)}`);
      }

      const soRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result).map(normalizeOpenSOLookupRow)
        : [];

      if (soRows.length === 0) {
        useSwalErrorAlert(
          "Open Sales Order",
          "There are no open Sales Order records for the selected customer/branch."
        );
        return;
      }

      const summaryColumns = await selectedHSColConfig(endpoint);
      const detailColumns = await selectedHSColConfig("getSODR_OpenDetail");

      updateState({
        openSODR_Data_Summary: soRows,
        openSODR_Col_Summary: summaryColumns,
        openSODR_Col_Detail: detailColumns,
        showOpenSOModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch Open Sales Order:", error);
      useSwalErrorAlert("Open Sales Order", getApiErrorMessage(error));
      updateState({
        openSODR_Data_Summary: [],
        openSODR_Col_Summary: [],
        openSODR_Col_Detail: [],
      });
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleAddRowClick = async () => {
    if (documentStatus !== "O" || isFormDisabled) return;
    setShowAddTypeDropdown((prev) => !prev);
  };












const handleOpenItemPickingModal = async (index) => {
  const row = detailRowsRef.current?.[index];
  const requestedQty = parseFormattedNumber(row?.drQuantity || 0) || 0;

  if (!canUsePickingControls) return;

  if (!documentID || !documentNo) {
    useSwalErrorAlert("Item Picking", "Please save the DR first before opening the picking allocation.");
    return;
  }

  if (!row?.itemCode) {
    useSwalErrorAlert("Item Picking", "Please select an item before opening the picking allocation.");
    return;
  }

  if (!row?.groupId) {
    useSwalErrorAlert("Item Picking", "Group ID is required for item picking allocation. Please save or reload the document first.");
    return;
  }

  if (requestedQty <= 0) {
    useSwalErrorAlert("Item Picking", "DR Quantity must be greater than zero before opening the picking allocation.");
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
    const requestedQty = parseFormattedNumber(currentRow?.drQuantity || 0) || 0;
    const payloadTotalPicked = parseFormattedNumber(payload?.totalPicked || 0) || 0;

    if (payloadTotalPicked > requestedQty) {
      useSwalErrorAlert("Item Picking", "Picked quantity cannot be more than requested quantity.");
      return;
    }

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
    const totalPicked = getPickingResultNumber(result,currentRow,itemPickingRowIndex, ["totalAllocated"],payload?.totalPicked ?? 0);
    const itemAmount = getPickingResultNumber( result,currentRow,itemPickingRowIndex, ["itemAmount"],totalPicked <= 0 ? 0 : getPickingAllocationAmount(pickedAllocations) || currentRow?.itemAmount || 0);
    const drQuantityValue = parseFormattedNumber(currentRow?.drQuantity || 0) || 0;

    if (totalPicked > drQuantityValue) {
      useSwalErrorAlert("Item Picking", "Picked quantity cannot be more than requested quantity.");
      return;
    }

    updatedRows[itemPickingRowIndex] = {
      ...currentRow,
      drStat:
        totalPicked <= 0
          ? "F"
          : drQuantityValue > 0 && totalPicked >= drQuantityValue
            ? "P"
            : "T",
      quantityPicked: formatNumber(totalPicked, quantityDecimals),
      itemAmount: itemAmount,
      pickingAllocations: pickedAllocations,
      pickingOrderedStockRows: payload?.orderedStockRows || [],
    };

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: true });
    updateTotals(updatedRows);
    handleCloseItemPickingModal();
  } catch (error) {
    console.error("Failed to save FG picking allocation:", error);
    useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

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
        sourceDocType: "DR",
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

const handleBulkPickingAllocation = async (mode) => {
  const isRelease = mode === "release";
  const actionLabel = isRelease ? "Release All" : "Allocate All";
  const rows = detailRowsRef.current || [];

  if (!rows.length || !canUsePickingControls) return;

  if (!documentID || !documentNo) {
    useSwalErrorAlert("Item Picking", "Please save the DR first before using Allocate All or Release All.");
    return;
  }

  const confirm = await useSwalProceedConfirm(
    `${actionLabel}?`,
    isRelease
      ? "This will release all picking allocations for the DR details."
      : "This will automatically pick available stock for all eligible DR details.",
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
        requestedQty: parseFormattedNumber(row?.drQuantity || 0) || 0,
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
          ? "There are no valid DR detail rows to release."
          : "There are no valid DR detail rows to allocate."
      );
      return;
    }

    if (isRelease) {
      await postRequest("getFGUpdateStockAllocation", {
        mode: "BulkCancelAlloc",
        params: JSON.stringify({
          json_data: {
            docCode: "DR",
            docId: documentID,
            userCode: userCode || currentUserRow?.userCode || "",
            reason: "DR bulk release allocation.",
            skipRegen: "Y",
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
          drStat: "F",
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
            docCode: "DR",
            docNo: documentNo || "",
            docId: documentID || "",
            docDate: documentDate || null,
            branchCode: branchCode || "",
            whouseCode: whseCode || "",
            locCode: locCode || "",
            userCode: userCode || currentUserRow?.userCode || "",
            skipRegen: "Y",
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
          drStat:
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

    const totalPickedQuantity = getTotalQuantityPicked(updatedRows);

    detailRowsRef.current = updatedRows;
    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
      triggerGLEntries: totalPickedQuantity > 0,
    });
    updateTotals(updatedRows);
  } catch (error) {
    console.error(`Failed to ${actionLabel.toLowerCase()} picking allocation:`, error);
    useSwalErrorAlert("Item Picking", getApiErrorMessage(error));
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === 'O')) {
    updateState({ showCancelModal: true });
  }
};

const handleHeaderDrStatusChange = async (value) => {
  if (value === "X") {
    await handleCancel();
    return;
  }

  if (String(drStatus || "").toUpperCase() === "O" && value === "C") {
    const result = await useSwalProceedConfirm(
      "Confirm Close DR",
      "Do you want to change DR Status from Open to Closed?",
      "Yes"
    );

    if (!result?.isConfirmed) return;
  }

  updateState({ drStatus: value });
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
      groupId: "",
      soId: "",
      soNo: "",
      soBalance: formatNumber(0, quantityDecimals),
      deliveryDate: "",
      siNo: "",
      siDate: null,
      quantityPicked: formatNumber(0, quantityDecimals),
      drStat: "F",
    }));

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "O",
      originalDocStatus: "O",
      status: "OPEN",
      drStatus: "O",
      documentDate: nextDocumentDate, 
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
  const docNo = params.get("soNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);





  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType
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
    updateState({ showSpinner: true });
  try {
    if(confirmation && originalDocStatus === "O" && documentID !== null ) {

      const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
      if (result.success)
      {
       useSwalSuccessAlert("Success","Cancellation Completed")
      }
     await fetchTranData(documentNo,branchCode);
    }
  } finally {
    updateState({showCancelModal: false, showSpinner: false});
  }
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

    updateState({ custModalOpen: false, isLoading: true, showSpinner: true });

    try {
        const address = selectedData?.addr || "";

        // In DR, we only care about shipTo.
        if (modalContext === "shipTo" || modalContext === "openSO") {
            // Fetch full details from master data to ensure data is complete and up-to-date
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            let finalName = selectedData.custName || "";
            let finalCode = selectedData.custCode || "";
            let finalAddress = address;
            let finalWhseCode = "";
            let customerRow = {};

            if (response.success) {
                customerRow = JSON.parse(response.data[0].result)?.[0] || {};
                const fullAddress = [customerRow.custAddr1, customerRow.custAddr2, customerRow.custAddr3].filter(Boolean).join(' ').trim();

                finalName = customerRow.custName || finalName;
                finalCode = customerRow.custCode || finalCode;
                finalAddress = fullAddress || finalAddress;
                finalWhseCode = customerRow.whCode || finalWhseCode;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }

            const selectedWarehouse = finalWhseCode
              ? await useTopWarehouseRow(finalWhseCode)
              : null;

            updateState({
                shipToName: finalName,
                shipToCode: finalCode,
                shipToAddress: finalAddress,
                whseCode: selectedWarehouse?.whouseCode || finalWhseCode || "",
                whseName: selectedWarehouse?.whouseName || "",
                locCode: "",
                locName: "",
            });

            if (modalContext === "openSO") {
              await handleOpenSalesOrderLookup({
                shipToCode: finalCode,
                branchCode,
              });
            }
        }

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
       updateState({ isLoading: false, showSpinner: false, modalContext: "" });
    }
};

 

  const updateTotals = (rows) => { // This function might not be needed if gross/net/discount are removed
    let totalDrQty = 0;
    let totalPickedQty = 0;

    rows.forEach(row => {
      totalDrQty += parseFormattedNumber(row.drQuantity || 0) || 0;
      totalPickedQty += parseFormattedNumber(row.quantityPicked || 0) || 0;
    });
    updateTotalsDisplay(totalDrQty, totalPickedQty);
};




const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
      branchCode: selectedBranch.branchCode,
      branchName:selectedBranch.branchName,
      whseCode: "",
      whseName: "",
      locCode: "",
      locName: ""
      })
    }
    updateState({ branchModalOpen: false });
  };

const handleCloseWarehouseLookup = (row) => {
  if (row) {
    updateState({
      whseCode: row.whCode || "",
      whseName: row.whName || "",
      locCode: "",
      locName: "",
    });
  }

  updateState({ showWhseModal: false });
};

const handleCloseLocationLookup = (row) => {
  if (row) {
    updateState({
      locCode: row.locCode || "",
      locName: row.locName || "",
    });
  }

  updateState({ showLocModal: false });
};




const handleCloseItemModal = async (selectedItems) => { // Simplified as price matrix is removed
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
      groupId: updatedRows[selectedRowIndex]?.groupId || "",
      soId: updatedRows[selectedRowIndex]?.soId || selectedItem?.soId || "",
    };
    updatedRows[selectedRowIndex] = baseRow; // Directly assign baseRow
    updateState({ detailRows: updatedRows }); 
    updateTotals(updatedRows);
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





 


const validateSOQuantity = (index, inputValue) => {
  const row = detailRowsRef.current[index];
  const drQty = parseFormattedNumber(row?.drQuantity || 0) || 0;
  const soQty = parseFormattedNumber(inputValue || 0) || 0;
  const rowStatus = String(row?.soStat || "").toUpperCase();

  if (drQty > 0 && rowStatus === "O" && soQty < drQty) {
    const originalValue = originalSOQuantityRef.current[index] ?? row?.soQuantity ?? formatNumber(0, quantityDecimals);

    useSwalErrorAlert("Invalid Quantity", "SO Quantity must be greater than or equal to DR Quantity.");

    const updatedRows = [...detailRowsRef.current];
    updatedRows[index] = {
      ...updatedRows[index],
      soQuantity: originalValue,
    };

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

    return false;
  }

  delete originalSOQuantityRef.current[index];
  return true;
};

 
const handleSODetailRowChange = (index, field, value) => {
  const parseDateValue = (dateValue) => {
    if (!dateValue) return null;
    const raw = String(dateValue).trim();
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return null;
  };

  if (field === "deliveryDate") {
    const nextDate = parseDateValue(value);
    const drDateValue = parseDateValue(documentDate);

    if (nextDate && drDateValue) {
      nextDate.setHours(0, 0, 0, 0);
      drDateValue.setHours(0, 0, 0, 0);

      if (nextDate < drDateValue) {
        useSwalErrorAlert("Invalid Delivery Date", "Delivery Date cannot be earlier than DR Date.");
        return;
      }
    }
  }

  if (field === "drQuantity" && isRegularDrType) {
    const drQty = parseFormattedNumber(value || 0) || 0;
    const soBalance = parseFormattedNumber(detailRowsRef.current?.[index]?.soBalance || 0) || 0;

    if (drQty > soBalance) {
      useSwalErrorAlert("Invalid DR Quantity", "DR Quantity cannot be more than SO Balance.");
      return;
    }
  }

  const zeroValueByField = (targetField) => {
    if (targetField === "soQuantity" || targetField === "drQuantity") {
      return formatNumber(0, quantityDecimals);
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

    return {
      ...row,
      freeItem: "Y",
    };
  };

  const updatedRows = [...(detailRowsRef.current || [])];
  let updatedRow = {
    ...updatedRows[index],
    [field]: value,
  };
 

  if (field === "freeItem") {
    updatedRow = buildFreeItemRow(updatedRow, value === "Y");
    updatedRows[index] = updatedRow;
    updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: false });
    updateTotals(updatedRows); 
    return;
  }

  updatedRows[index] = updatedRow; 

  updateState({ detailRows: updatedRows, detailRowsGL: [], triggerGLEntries: false });
  updateTotals(updatedRows);
};

const handleDetailChangeGL = async (index, field, value) => {
  const updatedRowsGL = [...(detailRowsGLRef.current || [])];
  const row = { ...(updatedRowsGL[index] || {}) };

  if (["acctCode", "slCode", "rcCode"].includes(field)) {
    const data = await useUpdateRowGLEntries(row, field, value, shipToCode, docType);

    if (data) {
      row.acctCode = data.acctCode || "";
      row.sltypeCode = data.sltypeCode || "";
      row.slCode = data.slCode || "";
      row.rcCode = data.rcCode || "";
      row.vatCode = data.vatCode || "";
      row.vatName = data.vatName || "";
      row.atcCode = data.atcCode || "";
      row.atcName = data.atcName || "";
      row.particular = data.particular || "";
    }
  } else {
    row[field] = value;
  }

  updatedRowsGL[index] = row;
  updateState({
    detailRowsGL: updatedRowsGL,
    ...getGLTotalsState(updatedRowsGL),
  });
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

const handleCloseRcModalGL = async (selectedRc) => {
  if (selectedRc && selectedRowIndex !== null) {
    const result = await useTopRCRow(selectedRc.rcCode);
    handleDetailChangeGL(selectedRowIndex, "rcCode", result || selectedRc);
  }

  updateState({
    showRcModal: false,
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
    accountModalSource: null,
  });
};

const enterNextRowZeroClearFields = [
  "soQuantity",
];

const renderDRDetailCell = (columnKey, row, index) => {
  const columnWidth = getDetailColumnFallbackWidth(columnKey);
  const style = getDetailCellStyle(columnKey, columnWidth);
  const isRowWithDR = (parseFormattedNumber(row.drQuantity || 0) || 0) > 0;
  const quantityPickedValue = parseFormattedNumber(row.quantityPicked || 0) || 0;
  const isRowFromSO = String(row.soNo || "").trim() !== "";
  const canEditPickingStatus = isRowWithDR && quantityPickedValue === 0;
  const canSearchItem = !isRowWithDR;
  const canEditDetailAfterDR = !isRowWithDR;
  const detailModalHandlers = {
    itemCode: () => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true }),
  }; 

  // Moves focus to the same editable column in the next visible row.
  const focusNextDetailCell = (field) => {
    focusNextSoDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: enterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => 
        handleSODetailRowChange(nextIndex, nextField, value),
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
        handleSODetailRowChange(index, field, sanitizedValue);
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


  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    drStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`drStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.drStat || "F"} disabled={isFormDisabled || !canEditPickingStatus} onChange={(e) => handleSODetailRowChange(index, "drStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || !canEditPickingStatus) return; e.preventDefault(); focusNextDetailCell("drStat"); }}><option value="F">For Picking</option>{canEditPickingStatus ? <option value="X">Cancelled</option> : <><option value="T">Partially Picked</option><option value="P">Picked</option><option value="X">Cancelled</option></>}</select></td>,
    soNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
    itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>, 
    itemSpecs: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>, 
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.pmType || ""} readOnly /><input type="hidden" value={row.groupId || ""} readOnly /><input type="hidden" value={row.pmId || ""} readOnly /></td>, 
    soBalance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>,
    deliveryDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput key={`deliveryDate-${index}-${row.deliveryDate || "empty"}`} id={`deliveryDate-${index}`} name="deliveryDate" value={row.deliveryDate || ""} disabled={isFormDisabled} updateState={(updates) => handleSODetailRowChange(index, "deliveryDate", updates.deliveryDate || "")} className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" /></td>,
    freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isFormDisabled || isRowFromSO ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isFormDisabled || isRowFromSO} onClick={() => handleSODetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>, 
    drQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`) })}</td>, 
    quantityPicked: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            {numericInput(columnKey, {
              decimals: quantityDecimals,
              regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`),
            })}
          </div>
          {canUsePickingControls && (
            <button
              type="button"
              title="Open Item Picking / Allocation"
              aria-label="Open Item Picking / Allocation"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!row?.groupId || !row?.itemCode || (parseFormattedNumber(row?.drQuantity || 0) || 0) <= 0}
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
    siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: true })}</td>,
    siDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`siDate-${index}`} name="siDate" value={row.siDate || ""} disabled updateState={() => {}} className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" /></td>,
  };

  return detailColumnRenderers[columnKey]?.() ?? null;
};

const renderDrGlColumn = (columnKey, row, index) => {
  const columnWidth = getDrGlFallbackWidth(columnKey);
  const style = getDrGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = {
    acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }),
    slCode: () => updateState({ selectedRowIndex: index, showSlModal: true, accountModalSource: "slCode" }),
  };

  const focusNextGlCell = (field) => {
    focusNextDrGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: [],
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
    });
  };
  
  const textInput = (field, options = {}) => (
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

  const lookupCell = (field, options = {}) => {
    const hasLookupValue = Boolean(String(row[field] || "").trim());
    const showLookupIcon =
      !isFormDisabled &&
      glModalHandlers[field] &&
      (!["rcCode", "slCode"].includes(field) || hasLookupValue);

    return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          <input
            type="text"
            id={`${field}-${index}`}
            className={`w-full ${showLookupIcon ? "pr-6" : ""} global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
            value={row[field] || ""}
            readOnly={true}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || isFormDisabled) return;
              e.preventDefault();
              focusNextGlCell(field);
            }}
          />
          {showLookupIcon && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={glModalHandlers[field]}
            />
          )}
        </div>
      </td>
    );
  };

  const amountInput = (field) => (
    <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={true} />
  );
  
  const glColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    acctCode: () => lookupCell("acctCode"),
    rcCode: () => lookupCell("rcCode"),
    sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("sltypeCode")}</td>,
    slCode: () => lookupCell("slCode"),
    particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("particular")}</td>,
    vatCode: () => lookupCell("vatCode"),
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    atcCode: () => lookupCell("atcCode"),
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("atcName")}</td>,
    debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debit")}</td>,
    credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("credit")}</td>,
    debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx1")}</td>,
    creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx1")}</td>,
    debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx2")}</td>,
    creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx2")}</td>,
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slRefNo", { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate-${index}`} name={`slRefDate-${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} updateState={(updates) => handleDetailChangeGL(index, "slRefDate", updates[`slRefDate-${index}`] || updates.slRefDate || "")} className="w-full global-tran-td-inputclass-ui text-center pr-7" onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
  };
  return glColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
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
 
        detailsRoute="/page/SVI"

        isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
        isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
        isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED"} 
      />
      </div>


      {topTab === "details" && (
      <div className="contents">



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



        {/* DR Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="dr_hd">
 
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
              id="drNo"
              label="DR No."
              type="lookup"
              value={state.documentNo || documentNo || ""}
              disabled={state.isDocNoDisabled}
              onChange={(val) => updateState({ documentNo: val })}
              onBlur={handlesoNoBlur}
              onLookup={() => updateState({ showAllTranDocNo: true })} // Changed soNo to drNo
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
                  DR Date
              </label>
            </div>

            <FieldRenderer
              id="drTranType"
              label="DR Type"
              type="select"
              value={drTranType || "DR01"}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ drTranType: val })}
              options={drTranTypeOptions.map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />
            </div>
 
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="shipToCode"
              label="Bill To Customer Code"
              required
              type="lookup"
              value={shipToCode || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={!canChangeCustomer}
              onLookup={() => canChangeCustomer && updateState({ custModalOpen: true, modalContext: "shipTo" })}
            />
 
            <FieldRenderer
              id="shipToName"
              label="Bill To Customer Name"
              required
              type="text"
              value={shipToName || ""}
              disabled
              readOnly
            />
 
            <div className="relative w-full">
              <div className="relative flex items-center w-full">
                <input
                  id="shipToAddress"
                  type="text"
                  value={shipToAddress || ""}
                  disabled={isFormDisabled}
                  onChange={(e) => updateState({ shipToAddress: e.target.value })} 
                  className={`peer w-full h-8 sm:h-8 global-ref-textbox-ui !px-2 !font-normal rounded-lg pr-12 ${
                    !isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                  } focus-visible:ring-0 focus-visible:ring-offset-0 border shadow-none transition-all`}
                />
                <button
                  type="button" 
                  onClick={() =>
                    canChangeCustomer &&
                    updateState({ custModalOpen: true, modalContext: "shipTo" })
                  }
                  disabled={!canChangeCustomer}
                  title="Search"
                  className={`absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center rounded-r-lg border border-l-0 transition-colors ${ 
                    canChangeCustomer
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
                </button>
              </div>
              <label
                htmlFor="shipToAddress"
                className={`global-ref-floating-label ${
                  !isFormDisabled
                    ? "global-ref-label-enabled"
                    : "global-ref-label-disabled"
                }`}
              >
                Ship To Address
              </label>
            </div>
          </div> 

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="whseName"
              label="Warehouse"
              type="lookup"
              value={whseName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={false}
              editableLookup
              onLookup={() => updateState({ showWhseModal: true })}
              onClear={() =>
                updateState({
                  whseCode: "",
                  whseName: "",
                  locCode: "",
                  locName: "",
                })
              }
            />
 
            <FieldRenderer
              id="locName"
              label="Location"
              type="lookup"
              value={locName || ""}
              disabled={isFormDisabled || !whseCode}
              readOnly
              lookupDisabled={!whseCode}
              editableLookup
              onLookup={() =>
                !isFormDisabled &&
                whseCode &&
                updateState({ showLocModal: true })
              }
              onClear={() => updateState({ locCode: "", locName: "" })}
            />
          </div>
 
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="refDocNo1"
              label="Ref DR No. 1"
              type="text"
              value={refDocNo1 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo1: val })}
              maxLength={getOptionalFieldLength("refdr_no1")}
            />
 
            <FieldRenderer
              id="refDocNo2"
              label="Ref DR No. 2"
              type="text"
              value={refDocNo2 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo2: val })}
              maxLength={getOptionalFieldLength("refdr_no2")}
            />
 
            <FieldRenderer
              id="drStatus"
              label="DR Status"
              type="select"
              value={drStatus || ""}
              disabled={!isHeaderDrStatusEditable}
              onChange={handleHeaderDrStatusChange}
              options={filteredHeaderDrStatusOptions.map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />
          </div>
 
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <div className="relative p-2">
              <textarea
                id="remarks"
                placeholder=""
                rows={6}
                className="peer global-tran-textbox-remarks-ui pt-2"
                value={remarks} 
                onChange={(e) => updateState({ remarks: e.target.value })}
                disabled={isFormDisabled}
                maxLength={getOptionalFieldLength("remarks")}
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

          {/* APV Detail Section */}
          <div id="apv_dtl" ref={detailSectionRef} className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">
 
          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            >
              DR Details
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
                renderSoDetailHeader(column.label, column.key, column.width, {
                  orderedColumns: orderedDetailColumns,
                })
              )}

                {!isFormDisabled && (
                  <th
                    className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={transactionActionsHeaderStyle} // Changed soDetailHeader to drDetailHeader
                  > 
                    Actions
                  </th>
                )}
            </tr>
          </thead>

          <tbody className="relative">{sortedDetailRows.map(({ row, originalIndex }) => {
            const isPickingSelectedRow = showItemPickingModal && itemPickingRowIndex === originalIndex;
            const pickedQty = parseFormattedNumber(row.quantityPicked || 0) || 0;
            const canDeleteRow = pickedQty > 0 || !String(row.siNo || "").trim();

            return (
            <tr
              key={originalIndex}
              className={`global-tran-tr-ui ${isPickingSelectedRow ? "[&>td]:!bg-slate-200" : ""}`}
            >
              {orderedDetailColumns.map((column) => 
                renderDRDetailCell(column.key, row, originalIndex)
              )}


               {!isFormDisabled && (
                    <td
                      className={`global-tran-td-ui text-center sticky right-0 ${
                        isPickingSelectedRow ? "bg-slate-200" : "bg-white dark:bg-black"
                      }`}
                      style={transactionActionsCellStyle}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleInsertBlankRow(originalIndex)} 
                          title="Insert blank row"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>

                        <button
                          type="button"
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteRow(originalIndex)} 
                          disabled={!canDeleteRow}
                          title={
                            pickedQty > 0
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

    {/* Invoice Details Footer */}
    <div className="global-tran-tab-footer-main-div-ui relative">

    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
        {showAddTypeDropdown && (
          <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Add DR Detail
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() => {
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
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                onClick={() => {
                  setShowAddTypeDropdown(false);
                  handleOpenSalesOrderLookup();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                    <FontAwesomeIcon icon={faClipboardCheck} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Open Sales Order</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Lookup open SO items
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

      <div
        className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-2"
      >
        {/* Total DR Quantity */}
        <div className="global-tran-tab-footer-total-label-ui">Total DR Quantity:</div>
        <div className="global-tran-tab-footer-total-value-ui">{totals.totalDrQuantity}</div>

        {/* Total Quantity Picked */}
        <div className="global-tran-tab-footer-total-label-ui">Total Quantity Picked:</div>
        <div className="global-tran-tab-footer-total-value-ui">{totals.totalQuantityPicked}</div>
      </div>
    </div>
    </div>

      {/* General Ledger */}
      {canViewCostAmount && hasPickedQuantity && (
      <div className="global-tran-tab-div-ui mt-3">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className={`global-tran-tab-padding-ui ${
                GLactiveTab === 'invoice'
                  ? 'global-tran-tab-text_active-ui'
                  : 'global-tran-tab-text_inactive-ui'
              }`}
              onClick={() => updateState({ GLactiveTab: "invoice" })}
            >
              General Ledger
            </button>
          </div>

          <div className="flex justify-end">
            {!isFormDisabled && (
              <button
                type="button"
                className="global-tran-button-generateGL"
                disabled={isGeneratingGL}
                onClick={() => handleActivityOption("GenerateGL")}
              >
                {isGeneratingGL ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : null}
                {isGeneratingGL ? "Generating..." : "Generate GL Entries"}
              </button>
            )}
          </div>
        </div>

        {/* GL Details Table */}
        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  {orderedDrGlColumns.map((column) => (
                    <Fragment key={`gl-header-${column.key}`}>
                      {renderDrGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedDrGlColumns,
                      })}
                    </Fragment>
                  ))}
                  {!isFormDisabled && (
                    <th
                      className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                      style={transactionActionsHeaderStyle}
                    >
                      Actions
                    </th>
                  )}
                </tr>
                {renderDrGlHeaderContextMenu()}
              </thead>
              <tbody className="relative">
                {sortedDrGlRows.map(({ row, originalIndex }) => (
                  <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                    {orderedDrGlColumns.map((column) => renderDrGlColumn(column.key, row, originalIndex))}
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

          {/* Totals Section */}
          <div className="global-tran-tab-footer-total-main-div-ui w-full">

            {/* Total Debit */}
            <div className="global-tran-tab-footer-total-div-ui">
              <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                Total Debit ({glCurrDefault}):
              </label>
              <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                {totalDebit}
              </label>
            </div>

            {/* Total Credit */}
            <div className="global-tran-tab-footer-total-div-ui">
              <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                Total Credit ({glCurrDefault}):
              </label>
              <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                {totalCredit}
              </label>
            </div>

          </div>
        </div>
      </div>
      )}

    </div>
    )}

    {branchModalOpen && (
            <BranchLookupModal
              isOpen={branchModalOpen}
              onClose={handleCloseBranchModal}
            />
          )}

    {custModalOpen && (
      <CustomerMastLookupModal
        isOpen={custModalOpen}
        onClose={handleCloseCustModal}
        customParam={modalContext === "openSO" ? "OpenSO" : undefined}
      />
    )}

    {showWhseModal && (
      <WarehouseLookupModal
        isOpen={showWhseModal}
        onClose={handleCloseWarehouseLookup}
        filter={"ByBC" + branchCode}
        branchCode={branchCode || ""}
      invType="FG"
      />
    )}

    {showLocModal && (
      <LocationLookupModal
        isOpen={showLocModal}
        onClose={handleCloseLocationLookup}
        filter={"ByWH" + whseCode}
      />
    )}

    {showOpenSOModal && (
      <GlobalCombinedLookup
        isOpen={showOpenSOModal}
        title="Open Sales Order"
        summarySelectionMode="multiple"
        detailSelectionMode="multiple"
        summaryColumns={openSODR_Col_Summary}
        detailColumns={openSODR_Col_Detail}
        summaryData={openSODR_Data_Summary}
        tabTitles={["Open SO Summary", "Open SO Detail"]}
        fetchDetailApi={async (selectedIds) => {
          const idString = Array.isArray(selectedIds)
            ? selectedIds.join(",")
            : selectedIds;

          const payload = {
            json_data: JSON.stringify({
              json_data: {
                selectedId: idString
              },
            }),
          };

          let response;
          try {
            response = await postRequest("getSODR_OpenDetail", payload);
          } catch (error) {
            console.error("getSODR_OpenDetail failed:", {
              payload,
              status: error?.response?.status,
              data: error?.response?.data,
              error,
            });
            throw error;
          }

          const rawData = response?.data?.[0]?.result
            ? JSON.parse(response.data[0].result)
            : response?.data || response;
          const normalizedData = Array.isArray(rawData)
            ? rawData.map(normalizeOpenSOLookupRow)
            : [];

          return { data: normalizedData };
        }}
        onClose={handleInsertSelectedOpenSO}
        onCancel={() =>
          updateState({
            showOpenSOModal: false,
            openSODR_Data_Summary: [],
            openSODR_Col_Summary: [],
            openSODR_Col_Detail: [],
          })
        }
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
 

    {showItemPickingModal && selectedPickingRow && (
      <SearchGlobalItemPickingModal
        isOpen={showItemPickingModal}
        onClose={handleCloseItemPickingModal}
        transaction={{
          sourceDocType: "DR",
          sourceDocTypeName: "Delivery Receipt",
          sourceDocNo: documentNo || "",
          sourceLineNo: `Line ${Number(itemPickingRowIndex ?? 0) + 1}`,
          groupId: selectedPickingRow?.groupId || "",
          customerCode: shipToCode || "",
          customerName: shipToName || "",
          itemCode: selectedPickingRow?.itemCode || "",
          itemName: selectedPickingRow?.itemName || selectedPickingRow?.itemSpecs || "",
          requestedQty: parseFormattedNumber(selectedPickingRow?.drQuantity || 0) || 0,
        }}
        stockRows={itemPickingStockRows}
        existingAllocations={itemPickingExistingAllocations}
        onConfirm={handleConfirmItemPicking}
      />
    )}

    {showAccountModal && (
      <COAMastLookupModal
        isOpen={showAccountModal}
        onClose={handleCloseAccountModal}
        source={accountModalSource}
      />
    )}

    {showRcModal && (
      <RCLookupModal
        isOpen={showRcModal}
        onClose={handleCloseRcModalGL}
        source={accountModalSource}
      />
    )}

    {showSlModal && (
      <SLMastLookupModal
        isOpen={showSlModal}
        onClose={handleCloseSlModalGL}
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "drNo"}}
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
    endpoint="/getDRHistory"
    cacheKey={`DR:${state.branchCode || ""}`}
    activeTabKey="DR_Summary"
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

export default DR;
