// import { useState, useEffect, useRef, useCallback } from "react";
// import Swal from "sweetalert2";
// import { useLocation } from "react-router-dom";

// // UI
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMagnifyingGlass,
//   faPlus,
//   faTrashAlt,
// } from "@fortawesome/free-solid-svg-icons";

// // Lookup/Modal
// import BranchLookupModal from "../../../Lookup/SearchBranchRef";
// import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
// import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
// import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
// import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
// import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
// import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
// import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
// import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
// import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// // Configuration
// import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
// import { useReset } from "../../../Components/ResetContext";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// import {
//   docTypes,
//   docTypeVideoGuide,
//   docTypePDFGuide,
// } from "@/NAYSA Cloud/Global/doctype";

// import {
//   useTopCurrencyRow,
//   useTopForexRate,
// } from "@/NAYSA Cloud/Global/top1RefTable";

// import {
//   useGetCurrentDayV2,
//   useformatToDatev2,
// } from "@/NAYSA Cloud/Global/dates";

// import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
// import {
//   transactionActionsCellStyle,
//   transactionActionsHeaderStyle,
//   useResizableTableColumns,
// } from "@/NAYSA Cloud/Global/datatable.jsx";

// import {
//   useSelectedOpenARBalance,
//   useSelectedHSColConfig,
// } from "@/NAYSA Cloud/Global/selectedData";

// import {
//   useTransactionUpsert,
//   useFetchTranData,
//   useHandleCancel,
//   useFieldLenghtCheck,
//   useGetFieldLength,
// } from "@/NAYSA Cloud/Global/procedure";

// import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

// import {
//   formatNumber,
//   parseFormattedNumber,
//   useSwalshowSaveSuccessDialog,
//   useSwalvalidateRequiredFields,
//   useSwalProceedConfirm,
//   useSwalErrorAlert,
//   useSwalSuccessAlert,
// } from "@/NAYSA Cloud/Global/behavior.jsx";

// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
// import Header from "@/NAYSA Cloud/Components/Header";

// const PRC = () => {
//   const loadedFromUrlRef = useRef(false);
//   const detailRowsRef = useRef([]);
//   const checkNoRef = useRef("");
//   const checkDateRef = useRef("");
//   const location = useLocation();
//   const { resetFlag } = useReset();
//   const {
//     companyInfo,
//     currentUserRow,
//     getAllTopHSDocRow,
//   } = useAuth();

//   const [isViewDocument, setIsViewDocument] = useState(false);

//   useEffect(() => {
//     const p = new URLSearchParams(location.search);
//     if (p.get("viewDocument") === "true") {
//       setIsViewDocument(true);
//     }
//   }, [location.search]);

//   const docType = docTypes?.PRC || "PRC";
//   const hsDoc = getAllTopHSDocRow?.(docType) || {};
//   const pdfLink = docTypePDFGuide?.[docType];
//   const videoLink = docTypeVideoGuide?.[docType];
//   const documentTitle = `${hsDoc?.docName || "Provisional Receipt"} Transaction`;

//   const prcTypeOptions = [
//     { value: "W", label: "With Invoice" },
//     { value: "WO", label: "Without Invoice" },
//   ];

//   const [topTab, setTopTab] = useState("details");
//   const [focusedCell, setFocusedCell] = useState(null);

//   const [state, setState] = useState({
//     documentName: hsDoc?.docName || "Provisional Receipt",
//     documentSeries: hsDoc?.docSeries || "Auto",
//     documentDocLen: hsDoc?.docLength || 8,
//     documentID: null,
//     documentNo: "",
//     documentStatus: "",
//     documentDate: useGetCurrentDayV2(),
//     status: "OPEN",
//     noReprints: "0",

//     activeTab: "basic",
//     isLoading: false,
//     showSpinner: false,
//     isDocNoDisabled: false,
//     isSaveDisabled: false,
//     isResetDisabled: false,
//     isFetchDisabled: false,

//     branchCode: currentUserRow?.branchCode || "",
//     branchName: currentUserRow?.branchName || "",
//     custCode: "",
//     custName: "",
//     chainCode: "",
//     chainName: "",

//     prcType: "W",
//     refPrcNo: "",
//     currCode: companyInfo?.currCode || "",
//     currName: companyInfo?.currName || "",
//     currRate: formatNumber(companyInfo?.currRate || 1, 6),
//     defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
//     currAmount: "0.00",
//     amount: "0.00",
//     bank: "",
//     checkNo: "",
//     checkDate: null,
//     remarks: "",
//     userCode: currentUserRow?.userCode || "",

//     tblFieldArray: [],
//     detailRows: [],
//     globalLookupRow: [],
//     globalLookupHeader: [],

//     selectedRowIndex: null,
//     currencyModalOpen: false,
//     branchModalOpen: false,
//     custModalOpen: false,
//     custModalParams: "OpenAR",
//     custModalSource: null,
//     showBankMastModal: false,
//     showARBalanceModal: false,
//     showCancelModal: false,
//     showAttachModal: false,
//     showSignatoryModal: false,
//     showAllTranDocNo: false,
//   });

//   const updateState = (updates) => {
//     setState((prev) => ({ ...prev, ...updates }));
//   };

//   const {
//     documentName,
//     documentID,
//     documentStatus,
//     documentNo,
//     documentDate,
//     status,
//     noReprints,
//     activeTab,
//     isLoading,
//     showSpinner,
//     isDocNoDisabled,
//     isSaveDisabled,
//     isResetDisabled,
//     isFetchDisabled,
//     branchCode,
//     branchName,
//     custCode,
//     custName,
//     chainCode,
//     chainName,
//     prcType,
//     refPrcNo,
//     currCode,
//     currName,
//     currRate,
//     defaultCurrRate,
//     currAmount,
//     amount,
//     bank,
//     checkNo,
//     checkDate,
//     remarks,
//     userCode,
//     tblFieldArray,
//     detailRows,
//     globalLookupRow,
//     globalLookupHeader,
//     selectedRowIndex,
//     currencyModalOpen,
//     branchModalOpen,
//     custModalOpen,
//     custModalParams,
//     custModalSource,
//     showBankMastModal,
//     showARBalanceModal,
//     showCancelModal,
//     showAttachModal,
//     showSignatoryModal,
//     showAllTranDocNo,
//   } = state;

//   useEffect(() => {
//     detailRowsRef.current = detailRows || [];
//   }, [detailRows]);

//   const displayStatus = status || "OPEN";
//   const statusMap = {
//     FINALIZED: "global-tran-stat-text-finalized-ui",
//     CANCELLED: "global-tran-stat-text-closed-ui",
//     CLOSED: "global-tran-stat-text-closed-ui",
//   };
//   const statusColor = statusMap[displayStatus] || "";
//   const isFormDisabled = isViewDocument || ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

//   const fieldLengths = {
//     siNo: useGetFieldLength(tblFieldArray, "si_no"),
//     bank: useGetFieldLength(tblFieldArray, "bank"),
//     checkNo: useGetFieldLength(tblFieldArray, "check_no"),
//     remarks: useGetFieldLength(tblFieldArray, "remarks"),
//   };

//   const isWithInvoice = prcType === "W";
//   const detailColumnDefs = [
//     { key: "ln", label: "LN", width: 56 },
//     ...(isWithInvoice ? [{ key: "refDocCode", label: "Doc Code", width: 100 }] : []),
//     { key: "siNo", label: isWithInvoice ? "Invoice No." : "Reference No.", width: 140 },
//     { key: "siDate", label: isWithInvoice ? "Invoice Date" : "Reference Date", width: 130 },
//     { key: "siAmount", label: isWithInvoice ? "Invoice Amount" : "Reference Amount", width: 140 },
//     { key: "appliedAmount", label: "Applied Amount", width: 140 },
//     { key: "unappliedAmount", label: "Unapplied", width: 130 },
//     ...(isWithInvoice ? [{ key: "balance", label: "Balance", width: 130 }] : []),
//     ...(isWithInvoice ? [{ key: "arAcct", label: "AR Account", width: 130 }] : []),
//     { key: "currCode", label: "Curr Code", width: 110 },
//     { key: "currRate", label: "Curr Rate", width: 120 },
//     { key: "bank", label: "Bank", width: 140 },
//     { key: "checkNo", label: "Check No.", width: 140 },
//     { key: "checkDate", label: "Check Date", width: 130 },
//     { key: "checkAmount", label: "Check Amount", width: 140 },
//     { key: "bounceFlag", label: "Bounce Flag", width: 110 },
//     { key: "custCode", label: "Customer Code", width: 130 },
//     { key: "custName", label: "Customer Name", width: 260 },
//     { key: "remarks", label: "Remarks", width: 220 },
//   ];

//   const {
//     getColumnStyle,
//     getFrozenColumnStyle,
//     getOrderedColumns,
//     getSortedRows,
//     setColumnOrder,
//     clearAllSorting,
//     clearZeroValueOnFocus,
//     focusNextRowInput,
//     renderHeaderContextMenu,
//     renderResizableHeader,
//   } = useResizableTableColumns(detailColumnDefs);

//   const orderedDetailColumns = getOrderedColumns(detailColumnDefs);
//   const visibleDetailColumns = orderedDetailColumns;
//   const getFallbackWidth = (key) => detailColumnDefs.find((column) => column.key === key)?.width || 120;
//   const getDetailCellStyle = (key, fallbackWidth) => ({
//     ...getColumnStyle(key, fallbackWidth),
//     ...getFrozenColumnStyle(key, orderedDetailColumns, fallbackWidth, { isHeader: false }),
//   });

//   useEffect(() => {
//     setColumnOrder(detailColumnDefs.map((column) => column.key));
//   }, [setColumnOrder, prcType]);

//   const sortedDetailRows = getSortedRows(
//     detailRows.map((row, originalIndex) => ({ row, originalIndex })),
//     (entry, sortKey) => {
//       if (sortKey === "ln") return entry.originalIndex + 1;
//       return entry.row?.[sortKey] ?? "";
//     }
//   );

//   const [totals, setTotals] = useState({
//     totalSIAmount: "0.00",
//     totalAppliedAmount: "0.00",
//     totalUnappliedAmount: "0.00",
//     totalCheckAmount: "0.00",
//   });

//   const recalcRow = (row) => {
//     const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
//     const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
//     const siAmount = parseFormattedNumber(row.siAmount || 0) || 0;
//     const checkAmt = applied + unapplied;
//     const balanceAmt = isWithInvoice ? siAmount - applied : 0;

//     return {
//       ...row,
//       siAmount: formatNumber(isWithInvoice ? siAmount : applied),
//       balance: formatNumber(balanceAmt < 0 ? 0 : balanceAmt),
//       checkAmount: formatNumber(checkAmt < 0 ? 0 : checkAmt),
//     };
//   };

//   const updateTotals = (rows) => {
//     let totalSI = 0;
//     let totalApplied = 0;
//     let totalUnapplied = 0;
//     let totalCheck = 0;

//     (rows || []).forEach((row) => {
//       totalSI += parseFormattedNumber(row.siAmount || 0) || 0;
//       totalApplied += parseFormattedNumber(row.appliedAmount || 0) || 0;
//       totalUnapplied += parseFormattedNumber(row.unappliedAmount || 0) || 0;
//       totalCheck += parseFormattedNumber(row.checkAmount || 0) || 0;
//     });

//     setTotals({
//       totalSIAmount: formatNumber(totalSI),
//       totalAppliedAmount: formatNumber(totalApplied),
//       totalUnappliedAmount: formatNumber(totalUnapplied),
//       totalCheckAmount: formatNumber(totalCheck),
//     });

//     updateState({
//       currAmount: formatNumber(totalApplied + totalUnapplied),
//       amount: formatNumber(totalCheck),
//     });
//   };

//   const getNormalizedGroupId = (groupId = "") => String(groupId || "").trim();

//   const getGroupInvoiceAmount = (rows = [], groupId = "") => {
//     const normalizedGroupId = getNormalizedGroupId(groupId);
//     if (!normalizedGroupId) return 0;

//     const topGroupRow = (rows || []).find(
//       (row) => getNormalizedGroupId(row?.groupId) === normalizedGroupId
//     );

//     return parseFormattedNumber(topGroupRow?.siAmount || 0) || 0;
//   };

//   const getGroupAppliedTotal = (rows = [], groupId = "", excludeIndex = null) => {
//     const normalizedGroupId = getNormalizedGroupId(groupId);
//     if (!normalizedGroupId) return 0;

//     return (rows || []).reduce((total, row, index) => {
//       if (index === excludeIndex) return total;
//       if (getNormalizedGroupId(row?.groupId) !== normalizedGroupId) return total;
//       return total + (parseFormattedNumber(row?.appliedAmount || 0) || 0);
//     }, 0);
//   };

//   const getGroupRemainingBalance = (rows = [], groupId = "", excludeIndex = null) => {
//     const limit = getGroupInvoiceAmount(rows, groupId);
//     const applied = getGroupAppliedTotal(rows, groupId, excludeIndex);
//     return Math.max(0, limit - applied);
//   };

//   const recalcRowsByGroup = (rows = [], withInvoice = isWithInvoice) => {
//     if (!withInvoice) {
//       return (rows || []).map((row) => recalcRow(row));
//     }

//     return (rows || []).map((row) => {
//       const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
//       const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
//       const siAmount = parseFormattedNumber(row.siAmount || 0) || 0;
//       const checkAmt = applied + unapplied;
//       const groupId = getNormalizedGroupId(row.groupId);
//       const balanceAmt = groupId
//         ? getGroupRemainingBalance(rows, groupId)
//         : Math.max(0, siAmount - applied);

//       return {
//         ...row,
//         balance: formatNumber(balanceAmt),
//         checkAmount: formatNumber(checkAmt < 0 ? 0 : checkAmt),
//       };
//     });
//   };

//   const applyHeaderValueToDetailRows = (detailField, detailValue) => {
//     const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
//     const updatedRows = (sourceRows || []).map((row) => ({
//       ...row,
//       [detailField]: detailValue,
//     }));

//     detailRowsRef.current = updatedRows;
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const confirmApplyHeaderValueToDetails = async ({
//     headerLabel,
//     detailField,
//     detailValue,
//   }) => {
//     const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
//     if ((sourceRows?.length || 0) === 0) {
//       return false;
//     }

//     const result = await useSwalProceedConfirm(
//       `Apply ${headerLabel} changes?`,
//       `PRC detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all PRC detail rows?`,
//       "Yes"
//     );

//     if (result?.isConfirmed) {
//       applyHeaderValueToDetailRows(detailField, detailValue);
//       return true;
//     }

//     return false;
//   };

//   useEffect(() => {
//     const timer = isLoading
//       ? setTimeout(() => updateState({ showSpinner: true }), 200)
//       : (updateState({ showSpinner: false }), null);

//     return () => timer && clearTimeout(timer);
//   }, [isLoading]);

//   useEffect(() => {
//     if (resetFlag) handleReset();
//   }, [resetFlag]);

//   useEffect(() => {
//     updateState({ isDocNoDisabled: !!documentID });
//   }, [documentID]);

//   const loadCompanyData = async () => {
//     updateState({ isLoading: true });
//     try {
//       const hdtblcolResult = await useFieldLenghtCheck("PRC_HD,PRC_DT1");
//       if (hdtblcolResult) {
//         updateState({ tblFieldArray: hdtblcolResult });
//       }
//     } catch (err) {
//       console.error("Error fetching field length data:", err);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };

//   useEffect(() => {
//     handleReset();
//     loadCompanyData();
//   }, []);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.key === "F1") {
//         e.preventDefault();
//         updateState({ showAllTranDocNo: true });
//       }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, []);

//   const cleanUrl = useCallback(() => {
//     if (!loadedFromUrlRef.current) return;
//     const url = new URL(window.location.href);
//     ["prcNo", "branchCode", "mode", "docNo"].forEach((key) => url.searchParams.delete(key));
//     window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
//     loadedFromUrlRef.current = false;
//   }, []);

//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const docNo = params.get("prcNo") || params.get("docNo");
//     const urlBranchCode = params.get("branchCode") || branchCode;

//     if (docNo && urlBranchCode && !loadedFromUrlRef.current) {
//       loadedFromUrlRef.current = true;
//       fetchTranData(docNo, urlBranchCode);
//     }
//   }, [location.search, branchCode]);

//   const handleReset = () => {
//     clearAllSorting?.();
//     updateState({
//       documentID: null,
//       documentNo: "",
//       documentStatus: "",
//       documentDate: useGetCurrentDayV2(),
//       status: "OPEN",
//       noReprints: "0",
//       activeTab: "basic",
//       isDocNoDisabled: false,
//       isSaveDisabled: false,
//       isResetDisabled: false,
//       isFetchDisabled: false,
//       branchCode: currentUserRow?.branchCode || "",
//       branchName: currentUserRow?.branchName || "",
//       custCode: "",
//       custName: "",
//       chainCode: "",
//       chainName: "",
//       prcType: "W",
//       refPrcNo: "",
//       currCode: companyInfo?.currCode || "",
//       currName: companyInfo?.currName || "",
//       currRate: formatNumber(companyInfo?.currRate || 1, 6),
//       defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
//       currAmount: "0.00",
//       amount: "0.00",
//       bank: "",
//       checkNo: "",
//       checkDate: null,
//       remarks: "",
//       userCode: currentUserRow?.userCode || "",
//       detailRows: [],
//       globalLookupRow: [],
//       globalLookupHeader: [],
//       selectedRowIndex: null,
//       currencyModalOpen: false,
//       branchModalOpen: false,
//       custModalOpen: false,
//       custModalParams: "OpenAR",
//       custModalSource: null,
//       showBankMastModal: false,
//           showARBalanceModal: false,
//       showCancelModal: false,
//       showAttachModal: false,
//       showSignatoryModal: false,
//       showAllTranDocNo: false,
//     });

//     setTotals({
//       totalSIAmount: "0.00",
//       totalAppliedAmount: "0.00",
//       totalUnappliedAmount: "0.00",
//           totalCheckAmount: "0.00",
//     });
//     checkNoRef.current = "";
//     checkDateRef.current = "";
//     cleanUrl();
//   };

//   const fetchTranData = async (docNo, searchBranchCode, direction = "") => {
//     updateState({ isLoading: true });
//     try {
//       const data = await useFetchTranData(docNo, searchBranchCode, docType, "prcNo", direction);

//       if (!data?.prcId) {
//         Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
//         updateState({ documentNo: "", documentID: null, isDocNoDisabled: false, isFetchDisabled: false });
//         updateTotals([]);
//         return;
//       }

//       const retrievedRows = recalcRowsByGroup((data.dt1 || []).map((item, index) => ({
//         ...item,
//         lnNo: item.lnNo || item.lineNo || String(index + 1),
//         refDocCode: item.refDocCode || "",
//         siNo: item.siNo || "",
//         siDate: useformatToDatev2(item.siDate),
//         siAmount: formatNumber(item.siAmount || 0),
//         appliedAmount: formatNumber(item.appliedAmount || 0),
//         balance: formatNumber(item.balance || 0),
//         unappliedAmount: formatNumber(item.unappliedAmount || 0),
//         currCode: item.currCode || data.currCode || companyInfo?.currCode || "",
//         currRate: formatNumber(item.currRate || data.currRate || 1, 6),
//         bank: item.bank || "",
//         checkNo: item.checkNo || "",
//         checkDate: useformatToDatev2(item.checkDate),
//         checkAmount: formatNumber(item.checkAmount || 0),
//         refBranchCode: item.refBranchCode || data.branchCode || searchBranchCode || "",
//         arAcct: item.arAcct || "",
//         custCode: item.custCode || data.custCode || "",
//         custName: item.custName || data.custName || "",
//         groupId: item.groupId || "",
//         orNo: item.orNo || "",
//         bounceFlag: item.bounceFlag || "",
//         remarks: item.remarks || "",
//       })), (data.prcType || "W") === "W");

//       const firstDetailRow = retrievedRows?.[0] || {};

//       updateState({
//         documentStatus: data.prcStatus || "",
//         status: data.docStatus || "OPEN",
//         documentID: data.prcId,
//         documentNo: data.prcNo,
//         branchCode: data.branchCode,
//         branchName: data.branchName,
//         documentDate: useformatToDatev2(data.prcDate),
//         prcType: data.prcType || "W",
//         chainCode: data.chainCode || "",
//         chainName: data.chainName || "",
//         custCode: data.custCode || "",
//         custName: data.custName || "",
//         refPrcNo: data.refPrcNo || "",
//         currCode: data.currCode || companyInfo?.currCode || "",
//         currName: data.currName || "",
//         currRate: formatNumber(data.currRate || 1, 6),
//         currAmount: formatNumber(data.currAmount || 0),
//         amount: formatNumber(data.amount || 0),
//         bank: data.bank || firstDetailRow.bank || "",
//         checkNo: data.checkNo || firstDetailRow.checkNo || "",
//         checkDate: useformatToDatev2(data.checkDate) || firstDetailRow.checkDate || null,
//         remarks: data.remarks || "",
//         userCode: data.userCode || currentUserRow?.userCode || "",
//         noReprints: String(data.noReprints ?? noReprints ?? "0"),
//         detailRows: retrievedRows,
//         isDocNoDisabled: true,
//         isFetchDisabled: true,
//       });
//       updateTotals(retrievedRows);
//       checkNoRef.current = data.checkNo || firstDetailRow.checkNo || "";
//       checkDateRef.current = useformatToDatev2(data.checkDate) || firstDetailRow.checkDate || "";
//     } catch (error) {
//       console.error("Error fetching PRC data:", error);
//       useSwalErrorAlert("PRC", "Failed to fetch transaction data.");
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };

//   const handlePrcNoBlur = () => {
//     if (!documentNo || !branchCode || documentID) return;
//     fetchTranData(documentNo, branchCode);
//   };

//   const handlePrcTypeChange = (value) => {
//     if (documentID) return;
//     updateState({
//       prcType: value,
//       detailRows: [],
//       currAmount: "0.00",
//       amount: "0.00",
//       custModalParams: value === "W" ? "OpenAR" : "ActiveAll",
//     });
//     updateTotals([]);
//   };

//   const handleSelectCurrency = async (selectedCurrCode) => {
//     if (!selectedCurrCode) return currRate;

//     const result = await useTopCurrencyRow(selectedCurrCode);
//     if (!result) return currRate;

//     const rate = selectedCurrCode === (companyInfo?.currCode || "")
//       ? defaultCurrRate
//       : await useTopForexRate(selectedCurrCode, documentDate);

//     const formattedRate = formatNumber(parseFormattedNumber(rate || 1), 6);
//     const updatedRows = detailRows.map((row) => ({
//       ...row,
//       currCode: selectedCurrCode,
//       currRate: formattedRate,
//     }));

//     updateState({
//       currCode: result.currCode,
//       currName: result.currName,
//       currRate: formattedRate,
//       detailRows: updatedRows,
//     });
//     return formattedRate;
//   };

//   const handleCloseCurrencyModal = async (selectedCurrency) => {
//     if (selectedCurrency) await handleSelectCurrency(selectedCurrency.currCode);
//     updateState({ currencyModalOpen: false });
//   };

//   const handleCloseBranchModal = (selectedBranch) => {
//     if (selectedBranch) {
//       updateState({
//         branchCode: selectedBranch.branchCode,
//         branchName: selectedBranch.branchName,
//       });
//     }
//     updateState({ branchModalOpen: false });
//   };

//   const handleCloseBankMast = async (selectedBank) => {
//     if (selectedBank) {
//       const nextBank = selectedBank.bankCode || selectedBank.bankName || "";
//       updateState({ bank: nextBank });
//       if (detailRows.length > 0) {
//         await confirmApplyHeaderValueToDetails({
//           headerLabel: "Default Bank",
//           detailField: "bank",
//           detailValue: nextBank,
//         });
//       }
//     }
//     updateState({ showBankMastModal: false });
//   };

//   const handleCloseCustModal = async (selectedData) => {
//     if (!selectedData) {
//       updateState({ custModalOpen: false, custModalSource: null });
//       return;
//     }

//     if (custModalSource === "chain") {
//       updateState({
//         custModalOpen: false,
//         custModalSource: null,
//         chainCode: selectedData?.custCode || "",
//         chainName: selectedData?.custName || "",
//         custCode: "",
//         custName: "",
//         detailRows: [],
//       });
//       updateTotals([]);
//       return;
//     }

//     updateState({ custModalOpen: false, custModalSource: null, isLoading: true });

//     try {
//       let selectedCurrCode = selectedData?.currCode || "";

//       if (!selectedCurrCode && selectedData?.custCode) {
//         const payload = { CUST_CODE: selectedData.custCode };
//         const response = await postRequest("getCustomer", JSON.stringify(payload));
//         if (response?.success) {
//           const customerRows = JSON.parse(response.data?.[0]?.result || "[]");
//           selectedCurrCode = customerRows?.[0]?.currCode || selectedCurrCode;
//         }
//       }

//       const newRate = selectedCurrCode ? await handleSelectCurrency(selectedCurrCode) : currRate;
//       const updatedRows = detailRows.map((row) => ({
//         ...row,
//         custCode: selectedData.custCode || "",
//         custName: selectedData.custName || "",
//         currCode: selectedCurrCode || row.currCode || currCode,
//         currRate: newRate || row.currRate || currRate,
//       }));

//       updateState({
//         custCode: selectedData.custCode || "",
//         custName: selectedData.custName || "",
//         chainCode: "",
//         chainName: "",
//         detailRows: updatedRows,
//       });
//     } catch (error) {
//       console.error("Error fetching customer details:", error);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };

//   const createBlankRow = () => ({
//     lnNo: "",
//     siNo: "",
//     siDate: documentDate,
//     siAmount: "0.00",
//     appliedAmount: "0.00",
//     unappliedAmount: "0.00",
//     balance: "0.00",
//     currCode: currCode || companyInfo?.currCode || "",
//     currRate: formatNumber(currRate || 1, 6),
//     bank: bank || "",
//     checkNo: checkNo || "",
//     checkDate: checkDate || documentDate,
//     checkAmount: "0.00",
//     refBranchCode: branchCode,
//     refDocCode: "",
//     arAcct: "",
//     custCode: custCode || "",
//     custName: custName || "",
//     groupId: "",
//     bounceFlag: "",
//     orNo: "",
//     remarks: "",
//   });

//   const createCopiedRow = (sourceRow = {}) => {
//     const sourceSiAmount = parseFormattedNumber(sourceRow.siAmount || 0) || 0;
//     return recalcRow({
//       ...sourceRow,
//       appliedAmount: "0.00",
//       unappliedAmount: "0.00",
//       balance: formatNumber(sourceSiAmount),
//       checkAmount: "0.00",
//       bounceFlag: sourceRow.bounceFlag || "",
//     });
//   };

//   const handleOpenARBalance = async () => {
//     const selectedCustomerOrChain = String(custCode || chainCode || "").trim();

//     if (!selectedCustomerOrChain) {
//       updateState({
//         globalLookupRow: [],
//         globalLookupHeader: [],
//         showARBalanceModal: false,
//       });
//       useSwalErrorAlert("Open Invoices", "Please select Customer or Chain first.");
//       return;
//     }

//     const fieldsToCheck = {
//       "Header : Customer or Chain": selectedCustomerOrChain,
//     };
//     const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Open Invoices");
//     if (!isValid) return;

//     try {
//       updateState({ isLoading: true });
//       const endpoint = "getOpenARBalance";
//       const response = await fetchDataJson(endpoint, { custCode: selectedCustomerOrChain, branchCode });
//       const arRows = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
//       const colConfig = await useSelectedHSColConfig(endpoint);

//       if (arRows.length === 0) {
//         useSwalErrorAlert("Open Invoices", "There are no open invoice records for the selected customer/branch.");
//         return;
//       }

//       updateState({
//         globalLookupRow: arRows,
//         globalLookupHeader: colConfig,
//         showARBalanceModal: true,
//       });
//     } catch (error) {
//       console.error("Failed to fetch Open Invoices:", error);
//       useSwalErrorAlert("Open Invoices", "Failed to fetch open invoices.");
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };

//   const handleCloseARBalance = async (payload) => {
//     if (payload) {
//       updateState({ isLoading: true });
//       try {
//         const result = await useSelectedOpenARBalance(payload);
//         if (result) {
//           let workingRows = [...detailRows];

//           result.forEach((entry, idx) => {
//             const baseAmount = parseFormattedNumber(entry.balance || 0) || 0;
//             const entryGroupId = entry.groupId || "";
//             const groupAlreadyExists = entryGroupId
//               ? workingRows.some((row) => getNormalizedGroupId(row.groupId) === getNormalizedGroupId(entryGroupId))
//               : false;
//             const remainingBalance = entryGroupId && groupAlreadyExists
//               ? getGroupRemainingBalance(workingRows, entryGroupId)
//               : baseAmount;
//             const appliedAmount = Math.min(baseAmount, remainingBalance);

//             const newRow = {
//               lnNo: workingRows.length + 1,
//               refDocCode: entry.docCode || entry.doccode || entry.refDocCode || entry.refDoccode || "",
//               siNo: entry.siNo || "",
//               siDate: useformatToDatev2(entry.siDate),
//               siAmount: formatNumber(baseAmount),
//               appliedAmount: formatNumber(appliedAmount),
//               unappliedAmount: "0.00",
//               balance: "0.00",
//               currCode: entry.currCode || currCode,
//               currRate: formatNumber(entry.currRate || currRate || 1, 6),
//               bank: bank || "",
//               checkNo: checkNo || "",
//               checkDate: checkDate || documentDate,
//               checkAmount: formatNumber(appliedAmount),
//               refBranchCode: branchCode,
//               arAcct: entry.arAcct || "",
//               custCode: entry.custCode || custCode,
//               custName: entry.custName || custName,
//               groupId: entryGroupId,
//               bounceFlag: entry.bounceFlag || entry.boundFlag || "",
//               orNo: "",
//               remarks: "",
//             };

//             workingRows = recalcRowsByGroup([...workingRows, newRow]);
//           });

//           updateState({ detailRows: workingRows });
//           updateTotals(workingRows);
//         }
//       } catch (error) {
//         console.error("Error loading selected invoices:", error);
//       } finally {
//         updateState({ isLoading: false });
//       }
//     }

//     updateState({ showARBalanceModal: false });
//   };

//   const handleAddRow = async (index = null) => {
//     if (isFormDisabled) return;

//     if (isWithInvoice) {
//       await handleOpenARBalance();
//       return;
//     }

//       const fieldsToCheck = {
//         "Header : Customer or Chain": custCode || chainCode,
//       };
//     const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Add Detail");
//     if (!isValid) return;

//     const newRow = createBlankRow();
//     let updatedRows = [...detailRows];
//     if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
//     else updatedRows.push(newRow);
//     updatedRows = recalcRowsByGroup(updatedRows);

//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const handleInsertRow = (index) => {
//     if (isFormDisabled) return;
//     if (index === null || index < 0 || index >= detailRows.length) return;

//     const sourceRow = detailRows[index];
//     const insertedRow = createCopiedRow(sourceRow);
//     let updatedRows = [...detailRows];
//     updatedRows.splice(index + 1, 0, insertedRow);
//     updatedRows = recalcRowsByGroup(updatedRows);

//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const handleDeleteRow = (index) => {
//     const updatedRows = recalcRowsByGroup(detailRows.filter((_, i) => i !== index));
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const handleDetailChange = (index, field, value, runCalculations = true) => {
//     if (field === "appliedAmount") {
//       const numericValue = parseFormattedNumber(value || 0) || 0;
//       if (numericValue < 0) {
//         useSwalErrorAlert("Invalid Applied Amount", "Applied Amount cannot be negative.");
//         return;
//       }

//       const targetRow = detailRows[index] || {};
//       const groupId = getNormalizedGroupId(targetRow.groupId);
//       if (groupId) {
//         const remainingBalance = getGroupRemainingBalance(detailRows, groupId, index);
//         if (numericValue > remainingBalance + 0.000001) {
//           useSwalErrorAlert(
//             "Invalid Applied Amount",
//             `LN # ${index + 1} - SI No. ${targetRow.siNo || ""} - Applied Amount exceeds Invoice Balance. It was forced to the remaining balance (${formatNumber(remainingBalance)}).`
//           );
//           value = formatNumber(remainingBalance);
//         }
//       }
//     }

//     let updatedRows = detailRows.map((row, i) => {
//       if (i !== index) return row;
//       const updatedRow = { ...row, [field]: value };
//       if (!runCalculations) return updatedRow;

//       if (["appliedAmount", "unappliedAmount", "siAmount"].includes(field)) {
//         return recalcRow(updatedRow);
//       }
//       if (field === "bounceFlag") {
//         return { ...updatedRow, bounceFlag: value === "Y" ? "Y" : "" };
//       }
//       return updatedRow;
//     });

//     updatedRows = recalcRowsByGroup(updatedRows);

//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);
//   };

//   const normalizeAmountForBlur = (value, decimalPlaces = 2) => {
//     const parsed = parseFormattedNumber(value || 0);
//     const numericValue = Number.isFinite(Number(parsed)) ? Number(parsed) : 0;
//     return formatNumber(numericValue, decimalPlaces);
//   };

//   const commitAmountField = (index, field, value, decimalPlaces = 2) => {
//     let formattedValue = normalizeAmountForBlur(value, decimalPlaces);

//     if (field === "appliedAmount") {
//       const numericValue = parseFormattedNumber(formattedValue || 0) || 0;
//       const targetRow = detailRows[index] || {};
//       const groupId = getNormalizedGroupId(targetRow.groupId);

//       if (numericValue < 0) {
//         useSwalErrorAlert("Invalid Applied Amount", "Applied Amount cannot be negative.");
//         formattedValue = "0.00";
//       }

//       if (groupId) {
//         const remainingBalance = getGroupRemainingBalance(detailRows, groupId, index);
//         if (numericValue > remainingBalance + 0.000001) {
//           useSwalErrorAlert(
//             "Invalid Applied Amount",
//             `LN # ${index + 1} - SI No. ${targetRow.siNo || ""} - Applied Amount exceeds Invoice Balance. It was forced to the remaining balance (${formatNumber(remainingBalance)}).`
//           );
//           formattedValue = formatNumber(remainingBalance);
//         }
//       }
//     }

//     let updatedRows = detailRows.map((row, i) => {
//       if (i !== index) return row;

//       const updatedRow = { ...row, [field]: formattedValue };
//       if (["appliedAmount", "unappliedAmount", "siAmount"].includes(field)) {
//         return recalcRow(updatedRow);
//       }

//       return updatedRow;
//     });

//     updatedRows = recalcRowsByGroup(updatedRows);
//     updateState({ detailRows: updatedRows });
//     updateTotals(updatedRows);

//     return updatedRows;
//   };

//   const handleBlur = (index, field, value, focusNext = false) => {
//     const decimalPlaces = field === "currRate" ? 6 : 2;
//     const updatedRows = commitAmountField(index, field, value, decimalPlaces);

//     if (focusNext && (field === "appliedAmount" || field === "unappliedAmount")) {
//       window.setTimeout(() => {
//         focusNextRowInput(index, field, {
//           rows: updatedRows,
//           zeroClearFields: ["appliedAmount", "unappliedAmount", "checkAmount"],
//           parseValue: parseFormattedNumber,
//           onClearNextValue: (nextIndex, nextField, nextValue) =>
//             handleDetailChange(nextIndex, nextField, nextValue, false),
//         });
//       }, 0);
//     }
//   };

//   const handleHeaderCheckNoBlur = async (e) => {
//     const currentValue = String(e?.target?.value || "").trim();
//     if (currentValue === checkNoRef.current) return;

//     const applied = await confirmApplyHeaderValueToDetails({
//       headerLabel: "Default Check No.",
//       detailField: "checkNo",
//       detailValue: currentValue,
//     });

//     checkNoRef.current = currentValue;
//     if (!applied) return;
//   };

//   const normalizeDefaultCheckDate = (value) => {
//     if (value === null || value === undefined) return "";

//     if (value instanceof Date) {
//       if (Number.isNaN(value.getTime())) return "";
//       return value.toISOString().slice(0, 10);
//     }

//     if (typeof value === "object") {
//       if (value?.target?.value !== undefined) {
//         return normalizeDefaultCheckDate(value.target.value);
//       }
//       if (value?.value !== undefined) {
//         return normalizeDefaultCheckDate(value.value);
//       }
//       return "";
//     }

//     return String(value).trim();
//   };

//   const handleHeaderCheckDateBlur = async (eventOrValue = null, meta = {}) => {
//     const currentValue = normalizeDefaultCheckDate(
//       meta?.value ?? eventOrValue?.target?.value ?? eventOrValue?.value ?? eventOrValue ?? checkDate
//     );
//     const originalValue = normalizeDefaultCheckDate(checkDateRef.current);

//     if (currentValue && meta?.isValid === false) return;
//     if (currentValue === originalValue) return;

//     await confirmApplyHeaderValueToDetails({
//       headerLabel: "Default Check Date",
//       detailField: "checkDate",
//       detailValue: currentValue,
//     });

//     checkDateRef.current = currentValue;
//   };

//   const validateBeforeSave = () => {
//     const fieldsToCheck = {
//       "Header : Branch": branchCode,
//       "Header : PRC Date": documentDate,
//       "Header : PRC Type": prcType,
//       "Header : Customer or Chain": custCode || chainCode,
//       "Header : Currency Code": currCode,
//       "Header : Currency Rate": parseFormattedNumber(currRate || 0) > 0 ? currRate : "",
//       "Detail Rows": detailRows.length > 0 ? "Y" : "",
//     };

//     const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Save Provisional Receipt");
//     if (!isValid) return false;

//     for (let i = 0; i < detailRows.length; i += 1) {
//       const row = detailRows[i];
//       const lineNo = i + 1;
//       const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
//       const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;

//       if (!row.siNo) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - ${isWithInvoice ? "Invoice No." : "Reference No."} is required.`);
//         return false;
//       }
//       if (applied + unapplied === 0) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Applied/Unapplied amount is required.`);
//         return false;
//       }
//       if (applied < 0) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Applied Amount cannot be negative.`);
//         return false;
//       }
//       if (row.groupId) {
//         const groupLimit = getGroupInvoiceAmount(detailRows, row.groupId);
//         const groupAppliedTotal = getGroupAppliedTotal(detailRows, row.groupId);
//         if (groupAppliedTotal > groupLimit + 0.000001) {
//           const groupRows = detailRows.filter((detailRow) => String(detailRow.groupId || "").trim() === String(row.groupId || "").trim());
//           const firstGroupRow = groupRows[0] || {};
//           const firstGroupIndex = detailRows.findIndex((detailRow) => String(detailRow.groupId || "").trim() === String(row.groupId || "").trim());
//           const groupLineNo = firstGroupIndex >= 0 ? firstGroupIndex + 1 : lineNo;
//           useSwalErrorAlert(
//             "Save Provisional Receipt",
//             `Detail LN # ${groupLineNo} - SI No. ${firstGroupRow.siNo || ""} - Total Applied Amount cannot exceed the Invoice Amount (${formatNumber(groupLimit)}).`
//           );
//           return false;
//         }
//       }
//       if (isWithInvoice && !row.arAcct) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - AR Account is required.`);
//         return false;
//       }
//       if (!row.bank) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Bank is required.`);
//         return false;
//       }
//       if (!row.checkNo) {
//         useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Check No. is required.`);
//         return false;
//       }
//     }

//     return true;
//   };

//   const buildSavePayload = () => {
//     const saveRows = recalcRowsByGroup(detailRows);

//     return {
//       branchCode,
//       prcNo: documentNo || "",
//       prcId: documentID || "",
//       documentID: documentID || "",
//       prcDate: documentDate,
//       prcType,
//       chainCode: chainCode || "",
//       chainName: chainName || "",
//       custCode: custCode || "",
//       custName: custName || "",
//       refPrcNo: refPrcNo || "",
//       currAmount: parseFormattedNumber(currAmount || totals.totalAppliedAmount || 0),
//       amount: parseFormattedNumber(amount || totals.totalCheckAmount || 0),
//       currCode: currCode || "PHP",
//       currRate: parseFormattedNumber(currRate || 1),
//       remarks: remarks || "",
//       noReprints: Number(noReprints || 0),
//       userCode,
//       dt1: saveRows.map((row, index) => ({
//       lnNo: String(index + 1),
//       siNo: row.siNo || "",
//       siDate: row.siDate || null,
//       siAmount: parseFormattedNumber(row.siAmount || 0),
//       appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
//       balance: parseFormattedNumber(row.balance || 0),
//       unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
//       currCode: row.currCode || currCode || "PHP",
//       currRate: parseFormattedNumber(row.currRate || currRate || 1),
//       bank: row.bank || "",
//       checkNo: row.checkNo || "",
//       checkDate: row.checkDate || null,
//       checkAmount: parseFormattedNumber(row.checkAmount || 0),
//       refBranchCode: row.refBranchCode || branchCode || "",
//       refDocCode: row.refDocCode || "",
//       arAcct: row.arAcct || "",
//       custCode: row.custCode || custCode || "",
//       custName: row.custName || custName || "",
//       groupId: row.groupId || "",
//       orNo: row.orNo || "",
//       bounceFlag: row.bounceFlag || "",
//         remarks: row.remarks || "",
//       })),
//     };
//   };

//   const handleActivityOption = async (action) => {
//     if (action !== "Upsert") return;
//     if (documentStatus !== "") return;
//     if (!validateBeforeSave()) return;

//     updateState({ isLoading: true });
//     try {
//       const response = await useTransactionUpsert(
//         docType,
//         buildSavePayload(),
//         updateState,
//         "prcId",
//         "prcNo"
//       );

//       if (response) {
//         const responseDocNo = response.data?.[0]?.prcNo || documentNo;
//         const responseDocId = response.data?.[0]?.prcId || documentID;

//         await fetchTranData(responseDocNo, branchCode);

//         const isZero = Number(noReprints) === 0;
//         const onSaveAndPrint = isZero
//           ? () => updateState({ showSignatoryModal: true })
//           : () => handleSaveAndPrint(responseDocId);

//         useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

//         updateState({
//           documentNo: responseDocNo,
//           documentID: responseDocId,
//           isDocNoDisabled: true,
//           isFetchDisabled: true,
//         });
//       }
//     } catch (error) {
//       console.error("Error saving PRC:", error);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   };

//   const handlePrint = async () => {
//     if (documentID) updateState({ showSignatoryModal: true });
//   };

//   const handleSaveAndPrint = async (docId) => {
//     updateState({ showSpinner: true });
//     await useHandlePrint(docId, docType);
//     updateState({ showSpinner: false });
//   };

//   const handleCancel = async () => {
//     if (documentID && documentStatus === "") {
//       updateState({ showCancelModal: true });
//     }
//   };

//   const handleAttach = async () => {
//     if (documentID) updateState({ showAttachModal: true });
//   };

//   const handleCloseCancel = async (confirmation) => {
//     if (confirmation && documentID) {
//       const result = await useHandleCancel(
//         docType,
//         documentID,
//         currentUserRow.userCode,
//         confirmation.password,
//         confirmation.reason,
//         updateState
//       );

//       if (result?.success) {
//         useSwalSuccessAlert("Success", "Cancellation Completed");
//       }
//       await fetchTranData(documentNo, branchCode);
//     }
//     updateState({ showCancelModal: false });
//   };

//   const handleCloseSignatory = async (mode) => {
//     updateState({ showSpinner: true, showSignatoryModal: false, noReprints: mode === "Final" ? 1 : 0 });
//     await useHandlePrint(documentID, docType, mode, userCode);
//     updateState({ showSpinner: false });
//   };

//   const handleTranDocNoRetrieval = async (data) => {
//     await fetchTranData(data.docNo, branchCode, data.key);
//     updateState({ showAllTranDocNo: data.modalClose });
//   };

//   const handleTranDocNoSelection = async (data) => {
//     handleReset();
//     updateState({ showAllTranDocNo: false, documentNo: data.docNo });
//   };

//   const handleHistoryRowPick = async (row) => {
//     const docNo = row?.docNo || row?.prcNo;
//     const rowBranchCode = row?.branchCode || branchCode;
//     if (!docNo) return;
//     setTopTab("details");
//     await fetchTranData(docNo, rowBranchCode);
//   };


//   const renderDetailCell = (columnKey, row, index) => {
//     const columnWidth = getFallbackWidth(columnKey);
//     const style = getDetailCellStyle(columnKey, columnWidth);
//     const lockedInvoiceSource = isWithInvoice && ["refDocCode", "siNo", "siDate", "siAmount", "balance", "arAcct", "custCode", "custName"].includes(columnKey);

//     const focusNextDetailCell = (field) => {
//       focusNextRowInput(index, field, {
//         rows: detailRows,
//         zeroClearFields: ["appliedAmount", "unappliedAmount", "checkAmount"],
//         parseValue: parseFormattedNumber,
//         onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
//       });
//     };

//     const textInput = (field, options = {}) => (
//       <input
//         type={options.type || "text"}
//         id={`${field}-${index}`}
//         className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
//         value={row[field] || ""}
//         readOnly={options.readOnly ?? isFormDisabled}
//         maxLength={options.maxLength}
//         onChange={(e) => handleDetailChange(index, field, e.target.value, options.runCalculations ?? true)}
//         onKeyDown={(e) => {
//           if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
//           e.preventDefault();
//           focusNextDetailCell(field);
//         }}
//       />
//     );

//     const amountInput = (field, decimalPlaces = 2, readOnly = false) => (
//       <input
//         type="text"
//         id={`${field}-${index}`}
//         className="w-full global-tran-td-inputclass-ui text-right"
//         value={row[field] || ""}
//         readOnly={isFormDisabled || readOnly}
//         onChange={(e) => {
//           const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
//           const regex = decimalPlaces === 6 ? /^\d*\.?\d{0,6}$/ : /^\d*\.?\d{0,2}$/;
//           if (regex.test(sanitizedValue) || sanitizedValue === "") {
//             handleDetailChange(index, field, sanitizedValue);
//           }
//         }}
//         onFocus={(e) => clearZeroValueOnFocus(e, {
//           isEditable: !isFormDisabled && !readOnly,
//           onClear: (value) => handleDetailChange(index, field, value, false),
//         })}
//         onBlur={(e) => {
//           if (isFormDisabled || readOnly) return;
//           handleBlur(index, field, e.target.value);
//         }}
//         onKeyDown={(e) => {
//           if (e.key !== "Enter" || isFormDisabled || readOnly) return;
//           e.preventDefault();
//           handleBlur(index, field, e.target.value, true);
//         }}
//       />
//     );

//     const lookupInput = (field, onLookup, readOnly = true) => (
//       <div className="relative w-full">
//         {textInput(field, { readOnly })}
//         {!isFormDisabled && (
//           <FontAwesomeIcon
//             icon={faMagnifyingGlass}
//             className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
//             onClick={onLookup}
//           />
//         )}
//       </div>
//     );

//     const renderers = {
//       ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
//       refDocCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("refDocCode", { readOnly: isFormDisabled || lockedInvoiceSource })}</td>,
//       siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siNo", { readOnly: isFormDisabled || lockedInvoiceSource, maxLength: fieldLengths.siNo })}</td>,
//       siDate: () => (
//         <td key={columnKey} className="global-tran-td-ui" style={style}>
//           <DateFormatInput
//             id={`siDate${index}`}
//             value={row.siDate || ""}
//             disabled={isFormDisabled || lockedInvoiceSource}
//             className="w-full global-tran-td-inputclass-ui text-center pr-7"
//             updateState={(updates) => {
//               if (updates[`siDate${index}`] !== undefined) {
//                 handleDetailChange(index, "siDate", updates[`siDate${index}`], false);
//               }
//             }}
//             onKeyDownCustom={(e) => {
//               if (e.key !== "Enter" || isFormDisabled || lockedInvoiceSource) return;
//               e.preventDefault();
//               focusNextDetailCell("siDate");
//             }}
//           />
//         </td>
//       ),
//       siAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("siAmount", 2, isWithInvoice)}</td>,
//       appliedAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("appliedAmount")}</td>,
//       unappliedAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("unappliedAmount")}</td>,
//       balance: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("balance", 2, true)}</td>,
//       arAcct: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("arAcct", { readOnly: isFormDisabled || lockedInvoiceSource })}</td>,
//       currCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("currCode", { readOnly: true })}</td>,
//       currRate: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("currRate", 6, true)}</td>,
//       bank: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("bank", { readOnly: isFormDisabled, maxLength: fieldLengths.bank })}</td>,
//       checkNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("checkNo", { readOnly: isFormDisabled, maxLength: fieldLengths.checkNo })}</td>,
//       checkDate: () => (
//         <td key={columnKey} className="global-tran-td-ui" style={style}>
//           <DateFormatInput
//             id={`checkDate${index}`}
//             value={row.checkDate || ""}
//             disabled={isFormDisabled}
//             className="w-full global-tran-td-inputclass-ui text-center pr-7"
//             updateState={(updates) => {
//               if (updates[`checkDate${index}`] !== undefined) {
//                 handleDetailChange(index, "checkDate", updates[`checkDate${index}`], false);
//               }
//             }}
//             onKeyDownCustom={(e) => {
//               if (e.key !== "Enter" || isFormDisabled) return;
//               e.preventDefault();
//               focusNextDetailCell("checkDate");
//             }}
//           />
//         </td>
//       ),
//       checkAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("checkAmount", 2, true)}</td>,
//       bounceFlag: () => (
//         <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
//           <button
//             type="button"
//             className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${
//               row.bounceFlag === "Y"
//                 ? "border-blue-500 bg-blue-500/15 text-blue-700"
//                 : "border-slate-300 bg-white text-slate-600"
//             } ${(!documentID || isFormDisabled) ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
//             disabled={!documentID || isFormDisabled}
//             onClick={() => handleDetailChange(index, "bounceFlag", row.bounceFlag === "Y" ? "" : "Y", false)}
//           >
//             {row.bounceFlag === "Y" ? "Yes" : "No"}
//           </button>
//         </td>
//       ),
//       custCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custCode", { readOnly: true })}</td>,
//       custName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custName", { readOnly: true })}</td>,
//       remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { readOnly: isFormDisabled, maxLength: fieldLengths.remarks })}</td>,
//     };

//     return renderers[columnKey]?.() ?? null;
//   };

//   const printData = { documentID, documentNo, docType };

//   return (
//     <div className="global-tran-main-div-ui">
//       {showSpinner && <LoadingSpinner />}

//       <div className="global-tran-headerToolbar-ui">
//         <Header
//           docType={docType}
//           pdfLink={pdfLink}
//           videoLink={videoLink}
//           onPrint={handlePrint}
//           printData={printData}
//           onReset={handleReset}
//           onSave={() => handleActivityOption("Upsert")}
//           onCancel={handleCancel}
//           onAttach={handleAttach}
//           activeTopTab={topTab}
//           showActions={topTab === "details"}
//           showBIRForm={false}
//           isViewDocument={isViewDocument}
//           onDetails={() => setTopTab("details")}
//           onHistory={() => setTopTab("history")}
//           disableRouteNavigation={true}
//           detailsRoute="/page/PRC"
//           isSaveDisabled={isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
//           isResetDisabled={isResetDisabled}
//           isAttachDisabled={!documentID}
//           isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
//           isCopyDisabled
//           isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
//         />
//       </div>

//       <div className={topTab === "details" ? "" : "hidden"}>
//         <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
//           <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
//             <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
//           </div>
//           <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
//             <div>
//               <p className="global-tran-headerstat-text-ui">Transaction Status</p>
//               <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
//             </div>
//           </div>
//         </div>

//         <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
//           <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
//             <button
//               className={`global-tran-tab-padding-ui ${
//                 activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
//               }`}
//               onClick={() => updateState({ activeTab: "basic" })}
//             >
//               Basic Information
//             </button>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="prc_hd">
//             <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               <div className="global-tran-textbox-group-div-ui">
//                 <FieldRenderer
//                   id="branchName"
//                   label="Branch"
//                   type="lookup"
//                   value={branchName || ""}
//                   disabled={isFetchDisabled || isDocNoDisabled || isFormDisabled}
//                   readOnly
//                   lookupDisabled={isFetchDisabled}
//                   onLookup={() => updateState({ branchModalOpen: true })}
//                 />

//                 <FieldRenderer
//                   id="prcNo"
//                   label="PRC No."
//                   type="lookup"
//                   value={documentNo || ""}
//                   disabled={isDocNoDisabled}
//                   onChange={(val) => updateState({ documentNo: val })}
//                   onLookup={() => updateState({ showAllTranDocNo: true })}
//                   onBlur={handlePrcNoBlur}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       handlePrcNoBlur();
//                       e.preventDefault();
//                       document.getElementById("documentDate")?.focus();
//                     }
//                   }}
//                 />

//                 <div className="relative w-full">
//                   <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
//                     <DateFormatInput
//                       id="documentDate"
//                       className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                       value={documentDate}
//                       disabled={isFormDisabled}
//                       updateState={updateState}
//                     />
//                   </div>
//                   <label htmlFor="documentDate" className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
//                     PRC Date
//                   </label>
//                 </div>

//                 <FieldRenderer
//                   id="prcType"
//                   label="PRC Type"
//                   type="select"
//                   value={prcType || ""}
//                   disabled={isFormDisabled || !!documentID}
//                   onChange={(val) => handlePrcTypeChange(val)}
//                   options={prcTypeOptions}
//                 />
//               </div>

//               <div className="global-tran-textbox-group-div-ui">
//                 <FieldRenderer
//                   id="chainCode"
//                   label="Chain Code"
//                   type="lookup"
//                   value={chainCode || ""}
//                   disabled={isFormDisabled || !!documentID}
//                   readOnly
//                   lookupDisabled={isFetchDisabled}
//                   onLookup={() => updateState({ custModalOpen: true, custModalParams: "ActiveChain", custModalSource: "chain" })}
//                 />

//                 <FieldRenderer
//                   id="chainName"
//                   label="Chain Name"
//                   type="text"
//                   value={chainName || ""}
//                   disabled
//                   readOnly
//                 />

//                 <FieldRenderer
//                   id="custCode"
//                   label="Customer Code"
//                   required
//                   type="lookup"
//                   value={custCode || ""}
//                   disabled={isFormDisabled || !!documentID}
//                   readOnly
//                   lookupDisabled={isFetchDisabled}
//                   onLookup={() => updateState({
//                     custModalOpen: true,
//                     custModalParams: isWithInvoice ? "OpenAR" : "ActiveAll",
//                     custModalSource: "customer",
//                   })}
//                 />

//                 <FieldRenderer
//                   id="custName"
//                   label="Customer Name"
//                   required
//                   type="text"
//                   value={custName || ""}
//                   disabled
//                   readOnly
//                 />
//               </div>

//               <div className="global-tran-textbox-group-div-ui">
//                 <FieldRenderer
//                   id="currCode"
//                   label="Currency Code"
//                   type="lookup"
//                   value={currCode || ""}
//                   disabled={isFormDisabled || !!documentID}
//                   readOnly
//                   lookupDisabled={isFetchDisabled}
//                   onLookup={() => updateState({ currencyModalOpen: true })}
//                 />

//                 <FieldRenderer
//                   id="currName"
//                   label="Currency Name"
//                   type="text"
//                   value={currName || ""}
//                   disabled
//                   readOnly
//                 />

//                 <FieldRenderer
//                   id="currRate"
//                   label="Currency Rate"
//                   type="text"
//                   value={currRate || ""}
//                   disabled
//                   readOnly
//                 />

//                 <FieldRenderer
//                   id="refPrcNo"
//                   label="Reference PRC No."
//                   type="text"
//                   value={refPrcNo || ""}
//                   disabled={isFormDisabled}
//                   onChange={(val) => updateState({ refPrcNo: val })}
//                 />
//               </div>
//             </div>

//             <div className="global-tran-textbox-group-div-ui">
//               <FieldRenderer
//                 id="bank"
//                 label="Default Bank"
//                 type="lookup"
//                 value={bank || ""}
//                 disabled={isFormDisabled}
//                 onChange={(val) => updateState({ bank: val })}
//                 onLookup={() => updateState({ showBankMastModal: true })}
//               />

//               <FieldRenderer
//                 id="checkNo"
//                 label="Default Check No."
//                 type="text"
//                 value={checkNo || ""}
//                 disabled={isFormDisabled}
//                 onChange={(val) => updateState({ checkNo: val })}
//                 onBlur={handleHeaderCheckNoBlur}
//               />

//               <div className="relative w-full">
//                 <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
//                   <DateFormatInput
//                     id="checkDate"
//                     className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
//                     value={checkDate || ""}
//                     disabled={isFormDisabled}
//                     updateState={updateState}
//                     onBlurCustom={handleHeaderCheckDateBlur}
//                   />
//                 </div>
//                 <label htmlFor="checkDate" className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
//                   Default Check Date
//                 </label>
//               </div>

//               <FieldRenderer
//                 id="remarks"
//                 label="Remarks"
//                 type="textarea"
//                 value={remarks || ""}
//                 disabled={isFormDisabled}
//                 onChange={(val) => updateState({ remarks: val })}
//               />
//             </div>
//           </div>
//         </div>

//         <div className="global-tran-tab-div-ui">
//           <div className="global-tran-tab-nav-ui">
//             <div className="flex flex-row sm:flex-row">
//               <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
//                 Invoice Details
//               </span>
//             </div>
//           </div>

//           <div className="global-tran-table-main-div-ui">
//             <div className="global-tran-table-main-sub-div-ui">
//                 <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
//                   <thead className="global-tran-thead-div-ui">
//                     <tr>
//                       {visibleDetailColumns.map((column) =>
//                         renderResizableHeader(column.label, column.key, column.width, { orderedColumns: visibleDetailColumns })
//                       )}
//                       {!isFormDisabled && (
//                         <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
//                           Actions
//                         </th>
//                       )}
//                     </tr>
//                   </thead>
//                   <tbody className="relative">
//                     {sortedDetailRows.map(({ row, originalIndex }) => (
//                       <tr key={originalIndex} className="global-tran-tr-ui">
//                         {visibleDetailColumns.map((column) => renderDetailCell(column.key, row, originalIndex))}
//                         {!isFormDisabled && (
//                           <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
//                             <div className="flex items-center justify-center gap-1">
//                               <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleInsertRow(originalIndex)}>
//                                   <FontAwesomeIcon icon={faPlus} />
//                                 </button>
//                               <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(originalIndex)}>
//                                 <FontAwesomeIcon icon={faTrashAlt} />
//                               </button>
//                             </div>
//                           </td>
//                         )}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//                 {renderHeaderContextMenu()}
//               </div>
//             </div>

//           <div className="global-tran-tab-footer-main-div-ui">
//             <div className="global-tran-tab-footer-button-div-ui">
//               <button
//                 onClick={() => handleAddRow()}
//                 className="global-tran-tab-footer-button-add-ui"
//                 style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
//               >
//                 <FontAwesomeIcon icon={faPlus} className="mr-2" />
//                 Add
//               </button>
//             </div>

//             <div className="global-tran-tab-footer-total-main-div-ui">
//               <div className="global-tran-tab-footer-total-div-ui">
//                 <label className="global-tran-tab-footer-total-label-ui">Total Applied:</label>
//                 <label className="global-tran-tab-footer-total-value-ui">{totals.totalAppliedAmount}</label>
//               </div>
//               <div className="global-tran-tab-footer-total-div-ui">
//                 <label className="global-tran-tab-footer-total-label-ui">Total Unapplied:</label>
//                 <label className="global-tran-tab-footer-total-value-ui">{totals.totalUnappliedAmount}</label>
//               </div>
//               <div className="global-tran-tab-footer-total-div-ui">
//                 <label className="global-tran-tab-footer-total-label-ui">Total Check:</label>
//                 <label className="global-tran-tab-footer-total-value-ui">{totals.totalCheckAmount}</label>
//               </div>
//             </div>
//           </div>
//         </div>
//         </div>

//         {branchModalOpen && <BranchLookupModal isOpen={branchModalOpen} onClose={handleCloseBranchModal} />}
//         {currencyModalOpen && <CurrLookupModal isOpen={currencyModalOpen} onClose={handleCloseCurrencyModal} />}
//         {custModalOpen && <CustomerMastLookupModal isOpen={custModalOpen} onClose={handleCloseCustModal} customParam={custModalParams} />}
//         {showBankMastModal && <BankMastLookupModal isOpen={showBankMastModal} onClose={handleCloseBankMast} />}

//         {showARBalanceModal && (
//           <GlobalLookupModalv1
//             isOpen={showARBalanceModal}
//             data={globalLookupRow}
//             btnCaption="Get Selected Invoice"
//             title="Open Invoices"
//             endpoint={globalLookupHeader}
//             onClose={handleCloseARBalance}
//             onCancel={() => updateState({ showARBalanceModal: false })}
//           />
//         )}

//         {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />}

//         {showAttachModal && (
//           <AttachDocumentModal
//             isOpen={showAttachModal}
//             params={{
//               DocumentID: documentID,
//               DocumentName: documentName,
//               BranchName: branchName,
//               DocumentNo: documentNo,
//             }}
//             onClose={() => updateState({ showAttachModal: false })}
//           />
//         )}

//         {showSignatoryModal && (
//           <DocumentSignatories
//             isOpen={showSignatoryModal}
//             params={{ noReprints, documentID, docType }}
//             onClose={handleCloseSignatory}
//             onCancel={() => updateState({ showSignatoryModal: false })}
//           />
//         )}

//         {showAllTranDocNo && (
//           <AllTranDocNo
//             isOpen={showAllTranDocNo}
//             params={{ branchCode, branchName, docType, documentTitle, fieldNo: "prcNo" }}
//             onRetrieve={handleTranDocNoRetrieval}
//             onResponse={{ documentNo }}
//             onSelected={handleTranDocNoSelection}
//             onClose={() => updateState({ showAllTranDocNo: false })}
//           />
//         )}
//       <div className={topTab === "history" ? "" : "hidden"}>
//         <AllTranHistory
//           showHeader={false}
//           isActive={topTab === "history"}
//           endpoint="/getPRCHistory"
//           cacheKey={`PRC:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
//           activeTabKey="prcSummary"
//           branchCode={state.branchCode}
//           startDate={state.fromDate}
//           endDate={state.toDate}
//           status="All"
//           onRowDoubleClick={handleHistoryRowPick}
//           historyExportName={`${documentTitle} History`}
//         />
//       </div>
//     </div>
//   );
// };

// export default PRC;


import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopAccountRow,
  useTopCurrencyRow,
  useTopForexRate,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

import {
  useSelectedOpenARBalance,
  useSelectedHSColConfig,
} from "@/NAYSA Cloud/Global/selectedData";

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalvalidateRequiredFields,
  useSwalProceedConfirm,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import Header from "@/NAYSA Cloud/Components/Header";

const PRC = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const bankRef = useRef("");
  const checkNoRef = useRef("");
  const checkDateRef = useRef("");
  const location = useLocation();
  const { resetFlag } = useReset();
  const {
    companyInfo,
    currentUserRow,
    getAllTopHSDocRow,
  } = useAuth();

  const [isViewDocument, setIsViewDocument] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, [location.search]);

  const docType = docTypes?.PRC || "PRC";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = `${hsDoc?.docName || "Provisional Receipt"} Transaction`;

  const prcTypeOptions = [
    { value: "W", label: "With Invoice" },
    { value: "WO", label: "Without Invoice" },
  ];

  const [topTab, setTopTab] = useState("details");
  const [focusedCell, setFocusedCell] = useState(null);

  const [state, setState] = useState({
    documentName: hsDoc?.docName || "Provisional Receipt",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    documentDate: useGetCurrentDayV2(),
    status: "OPEN",
    noReprints: "0",

    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    custCode: "",
    custName: "",
    chainCode: "",
    chainName: "",

    prcType: "W",
    refPrcNo: "",
    currCode: companyInfo?.currCode || "",
    currName: companyInfo?.currName || "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
    currAmount: "0.00",
    amount: "0.00",
    depBankCode: companyInfo?.depBankcode || "",
    depAcctName: companyInfo?.depositBankName || "",
    depAcctNo: companyInfo?.depositBankAcctNo || "",
    bank: "",
    checkNo: "",
    checkDate: null,
    remarks: "",
    userCode: currentUserRow?.userCode || "",

    tblFieldArray: [],
    detailRows: [],
    globalLookupRow: [],
    globalLookupHeader: [],

    selectedRowIndex: null,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    custModalParams: "OpenAR",
    custModalSource: null,
    showBankMastModal: false,
    showARBalanceModal: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showAllTranDocNo: false,
  });

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    documentName,
    documentID,
    documentStatus,
    documentNo,
    documentDate,
    status,
    noReprints,
    activeTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    branchCode,
    branchName,
    custCode,
    custName,
    chainCode,
    chainName,
    prcType,
    refPrcNo,
    currCode,
    currName,
    currRate,
    defaultCurrRate,
    currAmount,
    amount,
    depBankCode,
    depAcctName,
    depAcctNo,
    bank,
    checkNo,
    checkDate,
    remarks,
    userCode,
    tblFieldArray,
    detailRows,
    globalLookupRow,
    globalLookupHeader,
    selectedRowIndex,
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    custModalParams,
    custModalSource,
    showBankMastModal,
    showARBalanceModal,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showAllTranDocNo,
  } = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  const displayStatus = status || "OPEN";
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const isFormDisabled = isViewDocument || ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);
  const isReturnedRow = (row = {}) => String(row?.orNo || "").trim() !== "";
  const hasReturnedRows = detailRows.some(isReturnedRow);
  const isHeaderDisabled = isFormDisabled || hasReturnedRows;

  const fieldLengths = {
    siNo: useGetFieldLength(tblFieldArray, "si_no"),
    bank: useGetFieldLength(tblFieldArray, "bank"),
    checkNo: useGetFieldLength(tblFieldArray, "check_no"),
    remarks: useGetFieldLength(tblFieldArray, "remarks"),
  };

  const isWithInvoice = prcType === "W";
  const currencyDisplay = currCode ? `${currCode}${currName ? ` - ${currName}` : ""}` : "";

  const detailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    ...(isWithInvoice ? [{ key: "refDocCode", label: "Doc Code", width: 100 }] : []),
    { key: "siNo", label: isWithInvoice ? "Invoice No." : "Reference No.", width: 140 },
    { key: "siDate", label: isWithInvoice ? "Invoice Date" : "Reference Date", width: 130 },
    { key: "siAmount", label: isWithInvoice ? "Invoice Amount" : "Reference Amount", width: 140 },
    { key: "appliedAmount", label: "Applied Amount", width: 140 },
    { key: "unappliedAmount", label: "Unapplied", width: 130 },
    ...(isWithInvoice ? [{ key: "balance", label: "Balance", width: 130 }] : []),
    ...(isWithInvoice ? [{ key: "arAcct", label: "AR Account", width: 130 }] : []),
    { key: "currCode", label: "Curr Code", width: 110 },
    { key: "currRate", label: "Curr Rate", width: 120 },
    { key: "bank", label: "Bank", width: 140 },
    { key: "checkNo", label: "Check No.", width: 140 },
    { key: "checkDate", label: "Check Date", width: 130 },
    { key: "checkAmount", label: "Check Amount", width: 140 },
    { key: "bounceFlag", label: "Bounce Flag", width: 110 },
    { key: "custCode", label: "Customer Code", width: 130 },
    { key: "custName", label: "Customer Name", width: 260 },
    { key: "remarks", label: "Remarks", width: 220 },
    { key: "orNo", label: "CR No", width: 140 },
  ];

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    setColumnOrder,
    clearAllSorting,
    clearZeroValueOnFocus,
    focusNextRowInput,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);

  const orderedDetailColumns = getOrderedColumns(detailColumnDefs);
  const visibleDetailColumns = orderedDetailColumns;
  const getFallbackWidth = (key) => detailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getDetailCellStyle = (key, fallbackWidth) => ({
    ...getColumnStyle(key, fallbackWidth),
    ...getFrozenColumnStyle(key, orderedDetailColumns, fallbackWidth, { isHeader: false }),
  });

  useEffect(() => {
    setColumnOrder(detailColumnDefs.map((column) => column.key));
  }, [setColumnOrder, prcType]);

  const sortedDetailRows = getSortedRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );

  const [totals, setTotals] = useState({
    totalSIAmount: "0.00",
    totalAppliedAmount: "0.00",
    totalUnappliedAmount: "0.00",
    totalCheckAmount: "0.00",
  });

  const recalcRow = (row) => {
    const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
    const siAmount = parseFormattedNumber(row.siAmount || 0) || 0;
    const checkAmt = applied + unapplied;
    const balanceAmt = isWithInvoice ? siAmount - applied : 0;

    return {
      ...row,
      siAmount: formatNumber(isWithInvoice ? siAmount : applied),
      balance: formatNumber(balanceAmt < 0 ? 0 : balanceAmt),
      checkAmount: formatNumber(checkAmt < 0 ? 0 : checkAmt),
    };
  };

  const updateTotals = (rows) => {
    let totalSI = 0;
    let totalApplied = 0;
    let totalUnapplied = 0;
    let totalCheck = 0;

    (rows || []).forEach((row) => {
      totalSI += parseFormattedNumber(row.siAmount || 0) || 0;
      totalApplied += parseFormattedNumber(row.appliedAmount || 0) || 0;
      totalUnapplied += parseFormattedNumber(row.unappliedAmount || 0) || 0;
      totalCheck += parseFormattedNumber(row.checkAmount || 0) || 0;
    });

    setTotals({
      totalSIAmount: formatNumber(totalSI),
      totalAppliedAmount: formatNumber(totalApplied),
      totalUnappliedAmount: formatNumber(totalUnapplied),
      totalCheckAmount: formatNumber(totalCheck),
    });

    updateState({
      currAmount: formatNumber(totalApplied + totalUnapplied),
      amount: formatNumber(totalCheck),
    });
  };

  const getNormalizedGroupId = (groupId = "") => String(groupId || "").trim();

  const getGroupInvoiceAmount = (rows = [], groupId = "") => {
    const normalizedGroupId = getNormalizedGroupId(groupId);
    if (!normalizedGroupId) return 0;

    const topGroupRow = (rows || []).find(
      (row) => getNormalizedGroupId(row?.groupId) === normalizedGroupId
    );

    return parseFormattedNumber(topGroupRow?.siAmount || 0) || 0;
  };

  const getGroupAppliedTotal = (rows = [], groupId = "", excludeIndex = null) => {
    const normalizedGroupId = getNormalizedGroupId(groupId);
    if (!normalizedGroupId) return 0;

    return (rows || []).reduce((total, row, index) => {
      if (index === excludeIndex) return total;
      if (getNormalizedGroupId(row?.groupId) !== normalizedGroupId) return total;
      return total + (parseFormattedNumber(row?.appliedAmount || 0) || 0);
    }, 0);
  };

  const getGroupRemainingBalance = (rows = [], groupId = "", excludeIndex = null) => {
    const limit = getGroupInvoiceAmount(rows, groupId);
    const applied = getGroupAppliedTotal(rows, groupId, excludeIndex);
    return Math.max(0, limit - applied);
  };

  const recalcRowsByGroup = (rows = [], withInvoice = isWithInvoice) => {
    if (!withInvoice) {
      return (rows || []).map((row) => recalcRow(row));
    }

    return (rows || []).map((row) => {
      const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
      const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
      const siAmount = parseFormattedNumber(row.siAmount || 0) || 0;
      const checkAmt = applied + unapplied;
      const groupId = getNormalizedGroupId(row.groupId);
      const balanceAmt = groupId
        ? getGroupRemainingBalance(rows, groupId)
        : Math.max(0, siAmount - applied);

      return {
        ...row,
        balance: formatNumber(balanceAmt),
        checkAmount: formatNumber(checkAmt < 0 ? 0 : checkAmt),
      };
    });
  };

  const applyHeaderValueToDetailRows = (detailField, detailValue) => {
    const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
    const updatedRows = (sourceRows || []).map((row) =>
      isReturnedRow(row)
        ? row
        : {
            ...row,
            [detailField]: detailValue,
          }
    );

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const confirmApplyHeaderValueToDetails = async ({
    headerLabel,
    detailField,
    detailValue,
  }) => {
    const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
    if ((sourceRows?.length || 0) === 0) {
      return false;
    }

    const result = await useSwalProceedConfirm(
      `Apply ${headerLabel} changes?`,
      `PRC detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all PRC detail rows?`,
      "Yes"
    );

    if (result?.isConfirmed) {
      applyHeaderValueToDetailRows(detailField, detailValue);
      return true;
    }

    return false;
  };

  useEffect(() => {
    const timer = isLoading
      ? setTimeout(() => updateState({ showSpinner: true }), 200)
      : (updateState({ showSpinner: false }), null);

    return () => timer && clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [resetFlag]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!documentID });
  }, [documentID]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const hdtblcolResult = await useFieldLenghtCheck("PRC_HD,PRC_DT1");
      if (hdtblcolResult) {
        updateState({ tblFieldArray: hdtblcolResult });
      }
    } catch (err) {
      console.error("Error fetching field length data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    handleReset();
    loadCompanyData();
  }, []);

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

  const cleanUrl = useCallback(() => {
    if (!loadedFromUrlRef.current) return;
    const url = new URL(window.location.href);
    ["prcNo", "branchCode", "mode", "docNo"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    loadedFromUrlRef.current = false;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("prcNo") || params.get("docNo");
    const urlBranchCode = params.get("branchCode") || branchCode;

    if (docNo && urlBranchCode && !loadedFromUrlRef.current) {
      loadedFromUrlRef.current = true;
      fetchTranData(docNo, urlBranchCode);
    }
  }, [location.search, branchCode]);

  const handleReset = () => {
    clearAllSorting?.();
    updateState({
      documentID: null,
      documentNo: "",
      documentStatus: "",
      documentDate: useGetCurrentDayV2(),
      status: "OPEN",
      noReprints: "0",
      activeTab: "basic",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      custCode: "",
      custName: "",
      chainCode: "",
      chainName: "",
      prcType: "W",
      refPrcNo: "",
      currCode: companyInfo?.currCode || "",
      currName: companyInfo?.currName || "",
      currRate: formatNumber(companyInfo?.currRate || 1, 6),
      defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
      currAmount: "0.00",
      amount: "0.00",
      depBankCode: companyInfo?.depBankcode || "",
      depAcctName: companyInfo?.depositBankName || "",
      depAcctNo: companyInfo?.depositBankAcctNo || "",
      bank: "",
      checkNo: "",
      checkDate: null,
      remarks: "",
      userCode: currentUserRow?.userCode || "",
      detailRows: [],
      globalLookupRow: [],
      globalLookupHeader: [],
      selectedRowIndex: null,
      currencyModalOpen: false,
      branchModalOpen: false,
      custModalOpen: false,
      custModalParams: "OpenAR",
      custModalSource: null,
      showBankMastModal: false,
          showARBalanceModal: false,
      showCancelModal: false,
      showAttachModal: false,
      showSignatoryModal: false,
      showAllTranDocNo: false,
    });

    setTotals({
      totalSIAmount: "0.00",
      totalAppliedAmount: "0.00",
      totalUnappliedAmount: "0.00",
          totalCheckAmount: "0.00",
    });
    bankRef.current = "";
    checkNoRef.current = "";
    checkDateRef.current = "";
    cleanUrl();
  };

  const fetchTranData = async (docNo, searchBranchCode, direction = "") => {
    updateState({ isLoading: true });
    try {
      const data = await useFetchTranData(docNo, searchBranchCode, docType, "prcNo", direction);

      if (!data?.prcId) {
        Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
        updateState({ documentNo: "", documentID: null, isDocNoDisabled: false, isFetchDisabled: false });
        updateTotals([]);
        return;
      }

      const retrievedRows = recalcRowsByGroup((data.dt1 || []).map((item, index) => ({
        ...item,
        lnNo: item.lnNo || item.lineNo || String(index + 1),
        refDocCode: item.refDocCode || "",
        siNo: item.siNo || "",
        siDate: useformatToDatev2(item.siDate),
        siAmount: formatNumber(item.siAmount || 0),
        appliedAmount: formatNumber(item.appliedAmount || 0),
        balance: formatNumber(item.balance || 0),
        unappliedAmount: formatNumber(item.unappliedAmount || 0),
        currCode: item.currCode || data.currCode || companyInfo?.currCode || "",
        currRate: formatNumber(item.currRate || data.currRate || 1, 6),
        bank: item.bank || "",
        checkNo: item.checkNo || "",
        checkDate: useformatToDatev2(item.checkDate),
        checkAmount: formatNumber(item.checkAmount || 0),
        refBranchCode: item.refBranchCode || data.branchCode || searchBranchCode || "",
        arAcct: item.arAcct || "",
        custCode: item.custCode || data.custCode || "",
        custName: item.custName || data.custName || "",
        groupId: item.groupId || "",
        orNo: item.orNo || "",
        bounceFlag: item.bounceFlag || "",
        remarks: item.remarks || "",
      })), (data.prcType || "W") === "W");

      const firstDetailRow = retrievedRows?.[0] || {};

      updateState({
        documentStatus: data.prcStatus || "",
        status: data.docStatus || "OPEN",
        documentID: data.prcId,
        documentNo: data.prcNo,
        branchCode: data.branchCode,
        branchName: data.branchName,
        documentDate: useformatToDatev2(data.prcDate),
        prcType: data.prcType || "W",
        chainCode: data.chainCode || "",
        chainName: data.chainName || "",
        custCode: data.custCode || "",
        custName: data.custName || "",
        refPrcNo: data.refPrcNo || "",
        currCode: data.currCode || companyInfo?.currCode || "",
        currName: data.currName || companyInfo?.currName || "",
        currRate: formatNumber(data.currRate || 1, 6),
        currAmount: formatNumber(data.currAmount || 0),
        amount: formatNumber(data.amount || 0),
        depBankCode: data.depBankCode || data.depBankcode || data.dep_bank_code || companyInfo?.depBankcode || "",
        depAcctName: data.depAcctName || data.depositBankName || data.dep_acct_name || companyInfo?.depositBankName || "",
        depAcctNo: data.depAcctNo || data.depositBankAcctNo || data.dep_acct_no || companyInfo?.depositBankAcctNo || "",
        bank: data.bank || firstDetailRow.bank || "",
        checkNo: data.checkNo || firstDetailRow.checkNo || "",
        checkDate: useformatToDatev2(data.checkDate) || firstDetailRow.checkDate || null,
        remarks: data.remarks || "",
        userCode: data.userCode || currentUserRow?.userCode || "",
        noReprints: String(data.noReprints ?? noReprints ?? "0"),
        detailRows: retrievedRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
      updateTotals(retrievedRows);
      bankRef.current = data.bank || firstDetailRow.bank || "";
      checkNoRef.current = data.checkNo || firstDetailRow.checkNo || "";
      checkDateRef.current = useformatToDatev2(data.checkDate) || firstDetailRow.checkDate || "";
    } catch (error) {
      console.error("Error fetching PRC data:", error);
      useSwalErrorAlert("PRC", "Failed to fetch transaction data.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handlePrcNoBlur = () => {
    if (!documentNo || !branchCode || documentID) return;
    fetchTranData(documentNo, branchCode);
  };

  const handlePrcTypeChange = (value) => {
    if (documentID) return;
    updateState({
      prcType: value,
      detailRows: [],
      currAmount: "0.00",
      amount: "0.00",
      custModalParams: value === "W" ? "OpenAR" : "ActiveAll",
    });
    updateTotals([]);
  };

  const handleSelectCurrency = async (selectedCurrCode) => {
    if (!selectedCurrCode) return currRate;

    const result = await useTopCurrencyRow(selectedCurrCode);
    if (!result) return currRate;

    const rate = selectedCurrCode === (companyInfo?.currCode || "")
      ? defaultCurrRate
      : await useTopForexRate(selectedCurrCode, documentDate);

    const formattedRate = formatNumber(parseFormattedNumber(rate || 1), 6);
    const updatedRows = detailRows.map((row) => ({
      ...row,
      currCode: selectedCurrCode,
      currRate: formattedRate,
    }));

    updateState({
      currCode: result.currCode,
      currName: result.currName,
      currRate: formattedRate,
      detailRows: updatedRows,
    });
    return formattedRate;
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) await handleSelectCurrency(selectedCurrency.currCode);
    updateState({ currencyModalOpen: false });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode,
        branchName: selectedBranch.branchName,
      });
    }
    updateState({ branchModalOpen: false });
  };

  const handleCloseBankMast = async (selectedBank) => {
    if (selectedBank) {
      const accountRow = selectedBank?.acctCode
        ? await useTopAccountRow(selectedBank.acctCode)
        : null;

      updateState({
        depBankCode: selectedBank.bankCode || "",
        depAcctName: accountRow?.acctName || selectedBank.bankName || selectedBank.acctName || "",
        depAcctNo: selectedBank.bankAcctNo || selectedBank.acctNo || "",
      });
    }
    updateState({ showBankMastModal: false });
  };

  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ custModalOpen: false, custModalSource: null });
      return;
    }

    if (custModalSource === "chain") {
      updateState({
        custModalOpen: false,
        custModalSource: null,
        chainCode: selectedData?.custCode || "",
        chainName: selectedData?.custName || "",
        custCode: "",
        custName: "",
        detailRows: [],
      });
      updateTotals([]);
      return;
    }

    updateState({ custModalOpen: false, custModalSource: null, isLoading: true });

    try {
      let selectedCurrCode = selectedData?.currCode || "";

      if (!selectedCurrCode && selectedData?.custCode) {
        const payload = { CUST_CODE: selectedData.custCode };
        const response = await postRequest("getCustomer", JSON.stringify(payload));
        if (response?.success) {
          const customerRows = JSON.parse(response.data?.[0]?.result || "[]");
          selectedCurrCode = customerRows?.[0]?.currCode || selectedCurrCode;
        }
      }

      const newRate = selectedCurrCode ? await handleSelectCurrency(selectedCurrCode) : currRate;
      const updatedRows = detailRows.map((row) => ({
        ...row,
        custCode: selectedData.custCode || "",
        custName: selectedData.custName || "",
        currCode: selectedCurrCode || row.currCode || currCode,
        currRate: newRate || row.currRate || currRate,
      }));

      updateState({
        custCode: selectedData.custCode || "",
        custName: selectedData.custName || "",
        chainCode: "",
        chainName: "",
        detailRows: updatedRows,
      });
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const createBlankRow = () => ({
    lnNo: "",
    siNo: "",
    siDate: documentDate,
    siAmount: "0.00",
    appliedAmount: "0.00",
    unappliedAmount: "0.00",
    balance: "0.00",
    currCode: currCode || companyInfo?.currCode || "",
    currRate: formatNumber(currRate || 1, 6),
    bank: bank || "",
    checkNo: checkNo || "",
    checkDate: checkDate || documentDate,
    checkAmount: "0.00",
    refBranchCode: branchCode,
    refDocCode: "",
    arAcct: "",
    custCode: custCode || "",
    custName: custName || "",
    groupId: "",
    bounceFlag: "",
    orNo: "",
    remarks: "",
  });

  const createCopiedRow = (sourceRow = {}) => {
    const sourceSiAmount = parseFormattedNumber(sourceRow.siAmount || 0) || 0;
    return recalcRow({
      ...sourceRow,
      appliedAmount: "0.00",
      unappliedAmount: "0.00",
      balance: formatNumber(sourceSiAmount),
      checkAmount: "0.00",
      bounceFlag: sourceRow.bounceFlag || "",
    });
  };

  const handleOpenARBalance = async () => {
    const selectedCustomerOrChain = String(custCode || chainCode || "").trim();

    if (!selectedCustomerOrChain) {
      updateState({
        globalLookupRow: [],
        globalLookupHeader: [],
        showARBalanceModal: false,
      });
      useSwalErrorAlert("Open Invoices", "Please select Customer or Chain first.");
      return;
    }

    const fieldsToCheck = {
      "Header : Customer or Chain": selectedCustomerOrChain,
    };
    const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Open Invoices");
    if (!isValid) return;

    try {
      updateState({ isLoading: true });
      const endpoint = "getOpenARBalance";
      const response = await fetchDataJson(endpoint, { custCode: selectedCustomerOrChain, branchCode });
      const arRows = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const colConfig = await useSelectedHSColConfig(endpoint);

      if (arRows.length === 0) {
        useSwalErrorAlert("Open Invoices", "There are no open invoice records for the selected customer/branch.");
        return;
      }

      updateState({
        globalLookupRow: arRows,
        globalLookupHeader: colConfig,
        showARBalanceModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch Open Invoices:", error);
      useSwalErrorAlert("Open Invoices", "Failed to fetch open invoices.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseARBalance = async (payload) => {
    if (payload) {
      updateState({ isLoading: true });
      try {
        const result = await useSelectedOpenARBalance(payload);
        if (result) {
          let workingRows = [...detailRows];

          result.forEach((entry, idx) => {
            const baseAmount = parseFormattedNumber(entry.balance || 0) || 0;
            const entryGroupId = entry.groupId || "";
            const groupAlreadyExists = entryGroupId
              ? workingRows.some((row) => getNormalizedGroupId(row.groupId) === getNormalizedGroupId(entryGroupId))
              : false;
            const remainingBalance = entryGroupId && groupAlreadyExists
              ? getGroupRemainingBalance(workingRows, entryGroupId)
              : baseAmount;
            const appliedAmount = Math.min(baseAmount, remainingBalance);

            const newRow = {
              lnNo: workingRows.length + 1,
              refDocCode: entry.docCode || entry.doccode || entry.refDocCode || entry.refDoccode || "",
              siNo: entry.siNo || "",
              siDate: useformatToDatev2(entry.siDate),
              siAmount: formatNumber(baseAmount),
              appliedAmount: formatNumber(appliedAmount),
              unappliedAmount: "0.00",
              balance: "0.00",
              currCode: entry.currCode || currCode,
              currRate: formatNumber(entry.currRate || currRate || 1, 6),
              bank: bank || "",
              checkNo: checkNo || "",
              checkDate: checkDate || documentDate,
              checkAmount: formatNumber(appliedAmount),
              refBranchCode: branchCode,
              arAcct: entry.arAcct || "",
              custCode: entry.custCode || custCode,
              custName: entry.custName || custName,
              groupId: entryGroupId,
              bounceFlag: entry.bounceFlag || entry.boundFlag || "",
              orNo: "",
              remarks: "",
            };

            workingRows = recalcRowsByGroup([...workingRows, newRow]);
          });

          updateState({ detailRows: workingRows });
          updateTotals(workingRows);
        }
      } catch (error) {
        console.error("Error loading selected invoices:", error);
      } finally {
        updateState({ isLoading: false });
      }
    }

    updateState({ showARBalanceModal: false });
  };

  const handleAddRow = async (index = null) => {
    if (isFormDisabled) return;

    if (isWithInvoice) {
      await handleOpenARBalance();
      return;
    }

      const fieldsToCheck = {
        "Header : Customer or Chain": custCode || chainCode,
      };
    const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Add Detail");
    if (!isValid) return;

    const newRow = createBlankRow();
    let updatedRows = [...detailRows];
    if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
    else updatedRows.push(newRow);
    updatedRows = recalcRowsByGroup(updatedRows);

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleInsertRow = (index) => {
    if (isFormDisabled) return;
    if (index === null || index < 0 || index >= detailRows.length) return;

    const sourceRow = detailRows[index];
    if (isReturnedRow(sourceRow)) return;
    const insertedRow = createCopiedRow(sourceRow);
    let updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, insertedRow);
    updatedRows = recalcRowsByGroup(updatedRows);

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleDeleteRow = (index) => {
    if (isReturnedRow(detailRows[index])) return;

    const updatedRows = recalcRowsByGroup(detailRows.filter((_, i) => i !== index));
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleDetailChange = (index, field, value, runCalculations = true) => {
    if (isReturnedRow(detailRows[index])) return;

    if (field === "appliedAmount") {
      const numericValue = parseFormattedNumber(value || 0) || 0;
      if (numericValue < 0) {
        useSwalErrorAlert("Invalid Applied Amount", "Applied Amount cannot be negative.");
        return;
      }

      const targetRow = detailRows[index] || {};
      const groupId = getNormalizedGroupId(targetRow.groupId);
      if (groupId) {
        const remainingBalance = getGroupRemainingBalance(detailRows, groupId, index);
        if (numericValue > remainingBalance + 0.000001) {
          useSwalErrorAlert(
            "Invalid Applied Amount",
            `LN # ${index + 1} - SI No. ${targetRow.siNo || ""} - Applied Amount exceeds Invoice Balance. It was forced to the remaining balance (${formatNumber(remainingBalance)}).`
          );
          value = formatNumber(remainingBalance);
        }
      }
    }

    let updatedRows = detailRows.map((row, i) => {
      if (i !== index) return row;
      const updatedRow = { ...row, [field]: value };
      if (!runCalculations) return updatedRow;

      if (["appliedAmount", "unappliedAmount", "siAmount"].includes(field)) {
        return recalcRow(updatedRow);
      }
      if (field === "bounceFlag") {
        return { ...updatedRow, bounceFlag: value === "Y" ? "Y" : "" };
      }
      return updatedRow;
    });

    updatedRows = recalcRowsByGroup(updatedRows);

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const normalizeAmountForBlur = (value, decimalPlaces = 2) => {
    const parsed = parseFormattedNumber(value || 0);
    const numericValue = Number.isFinite(Number(parsed)) ? Number(parsed) : 0;
    return formatNumber(numericValue, decimalPlaces);
  };

  const commitAmountField = (index, field, value, decimalPlaces = 2) => {
    if (isReturnedRow(detailRows[index])) return detailRows;

    let formattedValue = normalizeAmountForBlur(value, decimalPlaces);

    if (field === "appliedAmount") {
      const numericValue = parseFormattedNumber(formattedValue || 0) || 0;
      const targetRow = detailRows[index] || {};
      const groupId = getNormalizedGroupId(targetRow.groupId);

      if (numericValue < 0) {
        useSwalErrorAlert("Invalid Applied Amount", "Applied Amount cannot be negative.");
        formattedValue = "0.00";
      }

      if (groupId) {
        const remainingBalance = getGroupRemainingBalance(detailRows, groupId, index);
        if (numericValue > remainingBalance + 0.000001) {
          useSwalErrorAlert(
            "Invalid Applied Amount",
            `LN # ${index + 1} - SI No. ${targetRow.siNo || ""} - Applied Amount exceeds Invoice Balance. It was forced to the remaining balance (${formatNumber(remainingBalance)}).`
          );
          formattedValue = formatNumber(remainingBalance);
        }
      }
    }

    let updatedRows = detailRows.map((row, i) => {
      if (i !== index) return row;

      const updatedRow = { ...row, [field]: formattedValue };
      if (["appliedAmount", "unappliedAmount", "siAmount"].includes(field)) {
        return recalcRow(updatedRow);
      }

      return updatedRow;
    });

    updatedRows = recalcRowsByGroup(updatedRows);
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

    return updatedRows;
  };

  const handleBlur = (index, field, value, focusNext = false) => {
    if (isReturnedRow(detailRows[index])) return;

    const decimalPlaces = field === "currRate" ? 6 : 2;
    const updatedRows = commitAmountField(index, field, value, decimalPlaces);

    if (focusNext && (field === "appliedAmount" || field === "unappliedAmount")) {
      window.setTimeout(() => {
        focusNextRowInput(index, field, {
          rows: updatedRows,
          zeroClearFields: ["appliedAmount", "unappliedAmount", "checkAmount"],
          parseValue: parseFormattedNumber,
          onClearNextValue: (nextIndex, nextField, nextValue) =>
            handleDetailChange(nextIndex, nextField, nextValue, false),
        });
      }, 0);
    }
  };

  const handleHeaderBankBlur = async (e) => {
    const currentValue = String(e?.target?.value || "").trim();
    if (currentValue === bankRef.current) return;

    await confirmApplyHeaderValueToDetails({
      headerLabel: "Default Customer Bank",
      detailField: "bank",
      detailValue: currentValue,
    });

    bankRef.current = currentValue;
  };

  const handleHeaderCheckNoBlur = async (e) => {
    const currentValue = String(e?.target?.value || "").trim();
    if (currentValue === checkNoRef.current) return;

    const applied = await confirmApplyHeaderValueToDetails({
      headerLabel: "Default Check No.",
      detailField: "checkNo",
      detailValue: currentValue,
    });

    checkNoRef.current = currentValue;
    if (!applied) return;
  };

  const normalizeDefaultCheckDate = (value) => {
    if (value === null || value === undefined) return "";

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return "";
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === "object") {
      if (value?.target?.value !== undefined) {
        return normalizeDefaultCheckDate(value.target.value);
      }
      if (value?.value !== undefined) {
        return normalizeDefaultCheckDate(value.value);
      }
      return "";
    }

    return String(value).trim();
  };

  const handleHeaderCheckDateBlur = async (eventOrValue = null, meta = {}) => {
    const currentValue = normalizeDefaultCheckDate(
      meta?.value ?? eventOrValue?.target?.value ?? eventOrValue?.value ?? eventOrValue ?? checkDate
    );
    const originalValue = normalizeDefaultCheckDate(checkDateRef.current);

    if (currentValue && meta?.isValid === false) return;
    if (currentValue === originalValue) return;

    await confirmApplyHeaderValueToDetails({
      headerLabel: "Default Check Date",
      detailField: "checkDate",
      detailValue: currentValue,
    });

    checkDateRef.current = currentValue;
  };

  const validateBeforeSave = () => {
    const fieldsToCheck = {
      "Header : Branch": branchCode,
      "Header : PRC Date": documentDate,
      "Header : PRC Type": prcType,
      "Header : Customer or Chain": custCode || chainCode,
      "Header : Currency Code": currCode,
      "Header : Currency Rate": parseFormattedNumber(currRate || 0) > 0 ? currRate : "",
      "Detail Rows": detailRows.length > 0 ? "Y" : "",
    };

    const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Save Provisional Receipt");
    if (!isValid) return false;

    for (let i = 0; i < detailRows.length; i += 1) {
      const row = detailRows[i];
      const lineNo = i + 1;
      const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
      const unapplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;

      if (!row.siNo) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - ${isWithInvoice ? "Invoice No." : "Reference No."} is required.`);
        return false;
      }
      if (applied + unapplied === 0) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Applied/Unapplied amount is required.`);
        return false;
      }
      if (applied < 0) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Applied Amount cannot be negative.`);
        return false;
      }
      if (row.groupId) {
        const groupLimit = getGroupInvoiceAmount(detailRows, row.groupId);
        const groupAppliedTotal = getGroupAppliedTotal(detailRows, row.groupId);
        if (groupAppliedTotal > groupLimit + 0.000001) {
          const groupRows = detailRows.filter((detailRow) => String(detailRow.groupId || "").trim() === String(row.groupId || "").trim());
          const firstGroupRow = groupRows[0] || {};
          const firstGroupIndex = detailRows.findIndex((detailRow) => String(detailRow.groupId || "").trim() === String(row.groupId || "").trim());
          const groupLineNo = firstGroupIndex >= 0 ? firstGroupIndex + 1 : lineNo;
          useSwalErrorAlert(
            "Save Provisional Receipt",
            `Detail LN # ${groupLineNo} - SI No. ${firstGroupRow.siNo || ""} - Total Applied Amount cannot exceed the Invoice Amount (${formatNumber(groupLimit)}).`
          );
          return false;
        }
      }
      if (isWithInvoice && !row.arAcct) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - AR Account is required.`);
        return false;
      }
      if (!row.bank) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Bank is required.`);
        return false;
      }
      if (!row.checkNo) {
        useSwalErrorAlert("Save Provisional Receipt", `Detail LN # ${lineNo} - Check No. is required.`);
        return false;
      }
    }

    return true;
  };

  const buildSavePayload = () => {
    const saveRows = recalcRowsByGroup(detailRows);

    return {
      branchCode,
      prcNo: documentNo || "",
      prcId: documentID || "",
      documentID: documentID || "",
      prcDate: documentDate,
      prcType,
      chainCode: chainCode || "",
      chainName: chainName || "",
      custCode: custCode || "",
      custName: custName || "",
      refPrcNo: refPrcNo || "",
      depBankCode: depBankCode || "",
      depAcctName: depAcctName || "",
      depAcctNo: depAcctNo || "",
      bank: bank || "",
      checkNo: checkNo || "",
      checkDate: checkDate || null,
      currAmount: parseFormattedNumber(currAmount || totals.totalAppliedAmount || 0),
      amount: parseFormattedNumber(amount || totals.totalCheckAmount || 0),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate || 1),
      remarks: remarks || "",
      noReprints: Number(noReprints || 0),
      userCode,
      dt1: saveRows.map((row, index) => ({
      lnNo: String(index + 1),
      siNo: row.siNo || "",
      siDate: row.siDate || null,
      siAmount: parseFormattedNumber(row.siAmount || 0),
      appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
      balance: parseFormattedNumber(row.balance || 0),
      unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
      currCode: row.currCode || currCode || "PHP",
      currRate: parseFormattedNumber(row.currRate || currRate || 1),
      bank: row.bank || "",
      checkNo: row.checkNo || "",
      checkDate: row.checkDate || null,
      checkAmount: parseFormattedNumber(row.checkAmount || 0),
      refBranchCode: row.refBranchCode || branchCode || "",
      refDocCode: row.refDocCode || "",
      arAcct: row.arAcct || "",
      custCode: row.custCode || custCode || "",
      custName: row.custName || custName || "",
      groupId: row.groupId || "",
      orNo: row.orNo || "",
      bounceFlag: row.bounceFlag || "",
        remarks: row.remarks || "",
      })),
    };
  };

  const handleActivityOption = async (action) => {
    if (action !== "Upsert") return;
    if (documentStatus !== "") return;
    if (!validateBeforeSave()) return;

    updateState({ isLoading: true });
    try {
      const response = await useTransactionUpsert(
        docType,
        buildSavePayload(),
        updateState,
        "prcId",
        "prcNo"
      );

      if (response) {
        const responseDocNo = response.data?.[0]?.prcNo || documentNo;
        const responseDocId = response.data?.[0]?.prcId || documentID;

        await fetchTranData(responseDocNo, branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

        updateState({
          documentNo: responseDocNo,
          documentID: responseDocId,
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error("Error saving PRC:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handlePrint = async () => {
    if (documentID) updateState({ showSignatoryModal: true });
  };

  const handleSaveAndPrint = async (docId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(docId, docType);
    updateState({ showSpinner: false });
  };

  const handleCancel = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    if (documentID) updateState({ showAttachModal: true });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentID) {
      const result = await useHandleCancel(
        docType,
        documentID,
        currentUserRow.userCode,
        confirmation.password,
        confirmation.reason,
        updateState
      );

      if (result?.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
      }
      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleCloseSignatory = async (mode) => {
    updateState({ showSpinner: true, showSignatoryModal: false, noReprints: mode === "Final" ? 1 : 0 });
    await useHandlePrint(documentID, docType, mode, userCode);
    updateState({ showSpinner: false });
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };

  const handleHistoryRowPick = async (row) => {
    const docNo = row?.docNo || row?.prcNo;
    const rowBranchCode = row?.branchCode || branchCode;
    if (!docNo) return;
    setTopTab("details");
    await fetchTranData(docNo, rowBranchCode);
  };


  const renderDetailCell = (columnKey, row, index) => {
    const columnWidth = getFallbackWidth(columnKey);
    const style = getDetailCellStyle(columnKey, columnWidth);
    const returnedRowLocked = isReturnedRow(row);
    const lockedInvoiceSource =
      returnedRowLocked ||
      (isWithInvoice && ["refDocCode", "siNo", "siDate", "siAmount", "balance", "arAcct", "custCode", "custName"].includes(columnKey));

    const focusNextDetailCell = (field) => {
      focusNextRowInput(index, field, {
        rows: detailRows,
        zeroClearFields: ["appliedAmount", "unappliedAmount", "checkAmount"],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
      });
    };

    const textInput = (field, options = {}) => (
      <input
        type={options.type || "text"}
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={(options.readOnly ?? isFormDisabled) || returnedRowLocked}
        maxLength={options.maxLength}
        onChange={(e) => handleDetailChange(index, field, e.target.value, options.runCalculations ?? true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled || returnedRowLocked) return;
          e.preventDefault();
          focusNextDetailCell(field);
        }}
      />
    );

    const amountInput = (field, decimalPlaces = 2, readOnly = false) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={isFormDisabled || returnedRowLocked || readOnly}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          const regex = decimalPlaces === 6 ? /^\d*\.?\d{0,6}$/ : /^\d*\.?\d{0,2}$/;
          if (regex.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue);
          }
        }}
        onFocus={(e) => clearZeroValueOnFocus(e, {
          isEditable: !isFormDisabled && !returnedRowLocked && !readOnly,
          onClear: (value) => handleDetailChange(index, field, value, false),
        })}
        onBlur={(e) => {
          if (isFormDisabled || returnedRowLocked || readOnly) return;
          handleBlur(index, field, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || isFormDisabled || returnedRowLocked || readOnly) return;
          e.preventDefault();
          handleBlur(index, field, e.target.value, true);
        }}
      />
    );

    const lookupInput = (field, onLookup, readOnly = true) => (
      <div className="relative w-full">
        {textInput(field, { readOnly })}
        {!isFormDisabled && !returnedRowLocked && (
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
            onClick={onLookup}
          />
        )}
      </div>
    );

    const renderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      refDocCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("refDocCode", { readOnly: isFormDisabled || lockedInvoiceSource })}</td>,
      siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siNo", { readOnly: isFormDisabled || lockedInvoiceSource, maxLength: fieldLengths.siNo })}</td>,
      siDate: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <DateFormatInput
            id={`siDate${index}`}
            value={row.siDate || ""}
            disabled={isFormDisabled || lockedInvoiceSource}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`siDate${index}`] !== undefined) {
                handleDetailChange(index, "siDate", updates[`siDate${index}`], false);
              }
            }}
            onKeyDownCustom={(e) => {
              if (e.key !== "Enter" || isFormDisabled || lockedInvoiceSource) return;
              e.preventDefault();
              focusNextDetailCell("siDate");
            }}
          />
        </td>
      ),
      siAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("siAmount", 2, isWithInvoice)}</td>,
      appliedAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("appliedAmount")}</td>,
      unappliedAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("unappliedAmount")}</td>,
      balance: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("balance", 2, true)}</td>,
      arAcct: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("arAcct", { readOnly: isFormDisabled || lockedInvoiceSource })}</td>,
      currCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("currCode", { readOnly: true })}</td>,
      currRate: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("currRate", 6, true)}</td>,
      bank: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("bank", { readOnly: isFormDisabled, maxLength: fieldLengths.bank })}</td>,
      checkNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("checkNo", { readOnly: isFormDisabled, maxLength: fieldLengths.checkNo })}</td>,
      checkDate: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <DateFormatInput
            id={`checkDate${index}`}
            value={row.checkDate || ""}
            disabled={isFormDisabled || returnedRowLocked}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`checkDate${index}`] !== undefined) {
                handleDetailChange(index, "checkDate", updates[`checkDate${index}`], false);
              }
            }}
            onKeyDownCustom={(e) => {
              if (e.key !== "Enter" || isFormDisabled || returnedRowLocked) return;
              e.preventDefault();
              focusNextDetailCell("checkDate");
            }}
          />
        </td>
      ),
      checkAmount: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("checkAmount", 2, true)}</td>,
      bounceFlag: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          <button
            type="button"
            className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${
              row.bounceFlag === "Y"
                ? "border-blue-500 bg-blue-500/15 text-blue-700"
                : "border-slate-300 bg-white text-slate-600"
            } ${(!documentID || isFormDisabled || returnedRowLocked) ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            disabled={!documentID || isFormDisabled || returnedRowLocked}
            onClick={() => handleDetailChange(index, "bounceFlag", row.bounceFlag === "Y" ? "" : "Y", false)}
          >
            {row.bounceFlag === "Y" ? "Yes" : "No"}
          </button>
        </td>
      ),
      custCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custCode", { readOnly: true })}</td>,
      custName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custName", { readOnly: true })}</td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { readOnly: isFormDisabled || returnedRowLocked, maxLength: fieldLengths.remarks })}</td>,
      orNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("orNo", { readOnly: true })}</td>,
    };

    return renderers[columnKey]?.() ?? null;
  };

  const printData = { documentID, documentNo, docType };

  return (
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
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/PRC"
          isSaveDisabled={isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
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

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${
                activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
              }`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="prc_hd">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={isFetchDisabled || isDocNoDisabled || isHeaderDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled || isHeaderDisabled}
                  onLookup={() => updateState({ branchModalOpen: true })}
                />

                <FieldRenderer
                  id="prcNo"
                  label="PRC No."
                  type="lookup"
                  value={documentNo || ""}
                  disabled={isDocNoDisabled || isHeaderDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onBlur={handlePrcNoBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePrcNoBlur();
                      e.preventDefault();
                      document.getElementById("documentDate")?.focus();
                    }
                  }}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isHeaderDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="documentDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={documentDate}
                      disabled={isHeaderDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="documentDate" className={`global-ref-floating-label ${!isHeaderDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
                    PRC Date
                  </label>
                </div>

                <FieldRenderer
                  id="prcType"
                  label="PRC Type"
                  type="select"
                  value={prcType || ""}
                  disabled={isHeaderDisabled || !!documentID}
                  onChange={(val) => handlePrcTypeChange(val)}
                  options={prcTypeOptions}
                />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="chainCode"
                  label="Chain Code"
                  type="lookup"
                  value={chainCode || ""}
                  disabled={isHeaderDisabled || !!documentID}
                  readOnly
                  lookupDisabled={isFetchDisabled || isHeaderDisabled}
                  onLookup={() => updateState({ custModalOpen: true, custModalParams: "ActiveChain", custModalSource: "chain" })}
                />

                <FieldRenderer
                  id="chainName"
                  label="Chain Name"
                  type="text"
                  value={chainName || ""}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  required
                  type="lookup"
                  value={custCode || ""}
                  disabled={isHeaderDisabled || !!documentID}
                  readOnly
                  lookupDisabled={isFetchDisabled || isHeaderDisabled}
                  onLookup={() =>
                    updateState({
                      custModalOpen: true,
                      custModalParams: isWithInvoice ? "OpenAR" : "ActiveAll",
                      custModalSource: "customer",
                    })
                  }
                />

                <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  required
                  type="text"
                  value={custName || ""}
                  disabled
                  readOnly
                />
              </div>

              <div className="global-tran-textbox-group-div-ui">

                <FieldRenderer
                  id="depAcctName"
                  label="Depository Bank"
                  type="lookup"
                  value={depAcctName || ""}
                  disabled={isHeaderDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled || isHeaderDisabled}
                  onLookup={() => updateState({ showBankMastModal: true })}
                />

                <FieldRenderer
                  id="depAcctNo"
                  label="Depository Account No."
                  type="text"
                  value={depAcctNo || ""}
                  disabled
                  readOnly
                />


                <div className="flex gap-4">                
                  <input type="hidden" id="currCode" value={currCode || ""} readOnly />
                  <div className="flex-grow w-2/3">
                    <FieldRenderer
                      id="currName"
                      label="Currency"
                      type="lookup"
                      value={currencyDisplay}
                      disabled={isHeaderDisabled || !!documentID}
                      readOnly
                      lookupDisabled={isFetchDisabled || isHeaderDisabled}
                      onLookup={() => updateState({ currencyModalOpen: true })}
                    />
                  </div>

                  <div className="flex-grow">
                    <FieldRenderer
                      id="currRate"
                      label="Currency Rate"
                      type="text"
                      value={currRate || ""}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <FieldRenderer
                  id="refPrcNo"
                  label="Reference PRC No."
                  type="text"
                  value={refPrcNo || ""}
                  disabled={isHeaderDisabled}
                  onChange={(val) => updateState({ refPrcNo: val })}
                />

              
                <FieldRenderer
                  id="remarks"
                  label="Remarks"
                  type="textarea"
                  value={remarks || ""}
                  disabled={isHeaderDisabled}
                  onChange={(val) => updateState({ remarks: val })}
                />
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="bank"
                label="Default Customer Bank"
                type="text"
                value={bank || ""}
                disabled={isHeaderDisabled}
                onChange={(val) => updateState({ bank: val })}
                onBlur={handleHeaderBankBlur}
                maxLength={fieldLengths.bank}
              />

              <FieldRenderer
                id="checkNo"
                label="Default Check No."
                type="text"
                value={checkNo || ""}
                disabled={isHeaderDisabled}
                onChange={(val) => updateState({ checkNo: val })}
                onBlur={handleHeaderCheckNoBlur}
              />

              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isHeaderDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="checkDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={checkDate || ""}
                    disabled={isHeaderDisabled}
                    updateState={updateState}
                    onBlurCustom={handleHeaderCheckDateBlur}
                  />
                </div>
                <label htmlFor="checkDate" className={`global-ref-floating-label ${!isHeaderDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
                  Default Check Date
                </label>
              </div>
            </div>
          </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Invoice Details
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {visibleDetailColumns.map((column) =>
                        renderResizableHeader(column.label, column.key, column.width, { orderedColumns: visibleDetailColumns })
                      )}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="relative">
                    {sortedDetailRows.map(({ row, originalIndex }) => (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {visibleDetailColumns.map((column) => renderDetailCell(column.key, row, originalIndex))}
                        {!isFormDisabled && (
                          <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className={`global-tran-td-button-add-ui ${isReturnedRow(row) ? "cursor-not-allowed opacity-50" : ""}`}
                                disabled={isReturnedRow(row)}
                                onClick={() => handleInsertRow(originalIndex)}
                              >
                                  <FontAwesomeIcon icon={faPlus} />
                                </button>
                              <button
                                type="button"
                                className={`global-tran-td-button-delete-ui ${isReturnedRow(row) ? "cursor-not-allowed opacity-50" : ""}`}
                                disabled={isReturnedRow(row)}
                                onClick={() => handleDeleteRow(originalIndex)}
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
                {renderHeaderContextMenu()}
              </div>
            </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => handleAddRow()}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Applied:</label>
                <label className="global-tran-tab-footer-total-value-ui">{totals.totalAppliedAmount}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Unapplied:</label>
                <label className="global-tran-tab-footer-total-value-ui">{totals.totalUnappliedAmount}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Check:</label>
                <label className="global-tran-tab-footer-total-value-ui">{totals.totalCheckAmount}</label>
              </div>
            </div>
          </div>
        </div>
        </div>

        {branchModalOpen && <BranchLookupModal isOpen={branchModalOpen} onClose={handleCloseBranchModal} />}
        {currencyModalOpen && <CurrLookupModal isOpen={currencyModalOpen} onClose={handleCloseCurrencyModal} />}
        {custModalOpen && <CustomerMastLookupModal isOpen={custModalOpen} onClose={handleCloseCustModal} customParam={custModalParams} />}
        {showBankMastModal && <BankMastLookupModal isOpen={showBankMastModal} onClose={handleCloseBankMast} />}

        {showARBalanceModal && (
          <GlobalLookupModalv1
            isOpen={showARBalanceModal}
            data={globalLookupRow}
            btnCaption="Get Selected Invoice"
            title="Open Invoices"
            endpoint={globalLookupHeader}
            onClose={handleCloseARBalance}
            onCancel={() => updateState({ showARBalanceModal: false })}
          />
        )}

        {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />}

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
            params={{ noReprints, documentID, docType }}
            onClose={handleCloseSignatory}
            onCancel={() => updateState({ showSignatoryModal: false })}
          />
        )}

        {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{ branchCode, branchName, docType, documentTitle, fieldNo: "prcNo" }}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{ documentNo }}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
        )}
      </div>
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getPRCHistory"
          cacheKey={`PRC:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="prcSummary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>
    </div>
  );
};

export default PRC;
