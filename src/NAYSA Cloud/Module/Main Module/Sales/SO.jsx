import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { apiClient, postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';


import {
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopSalesRepRow,
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useTransactionUpsert,
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
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalvalidateRequiredFields,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalHandleOpenSpecsModal
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// Header
import Header from '@/NAYSA Cloud/Components/Header';

const formatDateValue = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const getNextDayDateValue = (value) => {
  if (!value) return null;

  const normalizedValue = String(value).trim();
  const mmddyyyyMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const yyyymmddMatch = normalizedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  const [, first, second, third] = mmddyyyyMatch || [];
  const [, isoYear, isoMonth, isoDay] = yyyymmddMatch || [];
  const month = mmddyyyyMatch ? Number(first) : Number(isoMonth);
  const day = mmddyyyyMatch ? Number(second) : Number(isoDay);
  const year = mmddyyyyMatch ? Number(third) : Number(isoYear);

  if (!month || !day || !year) return null;

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  parsedDate.setDate(parsedDate.getDate() + 1);
  return formatDateValue(parsedDate);
};

const SO = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const customerPoNoRef = useRef("");
  const originalSOQuantityRef = useRef({});
  const skipNextCustomerPoBlurRef = useRef(false);
  const deliveryDateRef = useRef("");
  const suppressDeliveryDatePromptRef = useRef(true);
  const salesRepRef = useRef({ code: "", name: "" });
  const detailRowsRef = useRef([]);
  const documentDateBeforeManualEditRef = useRef("");
  const documentDateConfirmOpenRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopHSDocRow } = useAuth();
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
  const docType = docTypes.SO;
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';
  const initialDocumentDate = useGetCurrentDayV2();
  const initialDeliveryDate = getNextDayDateValue(initialDocumentDate);

  const [state, setState] = useState({
    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentDate: initialDocumentDate,
    documentNo: "",
    documentStatus:"O",
    status: "OPEN",
    noReprints:"0",


    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,



    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",

    // Customer information
    billToCustCode: "",
    billToCustName: "",
    billToAddress: "",
    shipToCode: "",
    shipToName: "",
    shipToAddress: "",
    contactPerson: "",
    customerPoNo: "",
    customerPoDate: null,
    deliveryDate: initialDeliveryDate,
    rcCode: "",
    rcName: "",
    salesRepCode: "",
    salesRepName: "",

    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    tblFieldArray :[],
    soStatus: "O",
    salesType: "",
    salesTypeOptions: [],
    soStatusOptions: [],
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    userCode: currentUserRow?.userCode||"",

    //Detail 1-2
    detailRows  :[],


    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    insertAfterIndex: null,
    showRcModal:false,
    showBilltermModal:false,
    showItemModal:false,
    showSalesRepModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    billtermModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showAllTranDocNo:false
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
  isLoading,
  showSpinner,

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
  billToAddress,
  shipToCode,
  shipToName,
  shipToAddress,
  contactPerson,
  customerPoNo,
  customerPoDate,
  deliveryDate,
  rcCode,
  rcName,
  salesRepCode,
  salesRepName,
  currCode,
  currName,
  currRate,
  salesType,
  salesTypeOptions,
  soStatus,
  soStatusOptions,
  refDocNo1,
  refDocNo2,
  remarks,
  billtermCode,
  billtermName,


  // Transaction details
  tblFieldArray,
  detailRows,


  // Contexts
  modalContext,
  selectionContext,
  selectedRowIndex,
  insertAfterIndex,

  // Modals
  showRcModal,
  showItemModal,
  showSalesRepModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  billtermModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAllTranDocNo

  } = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const normalizedDocumentStatus = String(displayStatus).trim().toUpperCase();
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };



  const statusColor = statusMap[normalizedDocumentStatus] || "";
  const isFormDisabled =
    isViewDocumentUrl ||
    ["FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedDocumentStatus);
  const normalizedSoStatus = String(soStatus || "O").trim().toUpperCase();
  const isSoDetailsDisabled =
    isFormDisabled ||
    ["C", "X", "CLOSED", "CANCELLED"].includes(normalizedSoStatus);
  const isHeaderSoStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
  const isPosted = normalizedDocumentStatus === "FINALIZED";
  const totalDrQuantity = detailRows.reduce((total, row) => total + (parseFormattedNumber(row.drQuantity || 0) || 0),0);

  const filteredHeaderSoStatusOptions =
    !isPosted && totalDrQuantity > 0
      ? soStatusOptions.filter(
          (option) =>
            ["O", "C"].includes(option.DROPDOWN_CODE) ||
            option.DROPDOWN_CODE === soStatus
        )
      : soStatusOptions;



  //Variables
  const [totals, setTotals] = useState({
  totalGrossAmount: '0.00',
  totalDiscountAmount: '0.00',
  totalNetAmount: '0.00',
  });



  
  // Company defaults
  const glCurrDefault = companyInfo?.currCode || "";
  const sellingPriceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);

  // Company sales settings
  const salesDiscountMode = String(companyInfo?.salesDiscountMode || "").toUpperCase();
  const priceDiscountMode = String(companyInfo?.salesAllowOpwnEditPrice || "").toUpperCase();
  const salesAllowDuplicateItem = String(
    companyInfo?.salesAllowDuplicateItem || ""
  ).toUpperCase();

  // Derived UI flags
  const isDiscountEditable = salesDiscountMode === "MANUAL";
  const isSellPriceOpenEditable = priceDiscountMode === "E" || salesDiscountMode === "MANUAL";
  const SO_ALLOW_DUPLICATE_ITEMS = salesAllowDuplicateItem === "E";

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
    { key: "ln", label: "LN", width: 56 },
    { key: "soStat", label: "SO Status", width: 110 },
    { key: "itemCode", label: "Item Code", width: 140 },
    { key: "itemName", label: "Item Name", width: 240 },
    { key: "itemSpecs", label: "Specification", width: 240 },
    { key: "uomCode", label: "UOM", width: 100 },
    { key: "soQuantity", label: "SO Quantity", width: 120 },
    { key: "sellingPrice", label: "Selling Price", width: 130 },
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
    { key: "delDate", label: "Delivery Date", width: 130 },
    { key: "customerPoNo", label: "Customer PO No.", width: 150 },
    { key: "salesRepCode", label: "Sales Rep Code", width: 130 },
    { key: "freeItem", label: "Free Item", width: 110 },
    { key: "drQuantity", label: "DR Quantity", width: 120 },
    { key: "siQuantity", label: "SI Quantity", width: 120 },
  ];
  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns: getOrderedSoDetailColumns,
    getSortedRows: getSortedSoDetailRows,
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
  }, [setSoDetailColumnOrder, discountLevel]);
  const sortedDetailRows = getSortedSoDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") {
        return entry.originalIndex + 1;
      }

      return entry.row?.[sortKey] ?? "";
    }
  );

  // API endpoints
  const SO_PRICE_MATRIX_ENDPOINT = "getPriceMatrixItemPrice";
  const SO_DUPLICATE_PO_ENDPOINT = "/checkSODuplicatePO";





  const updateTotalsDisplay = (grossAmt, discAmt, netDisc) => {
    setTotals({
          totalGrossAmount: formatNumber(grossAmt),
          totalDiscountAmount: formatNumber(discAmt),
          totalNetAmount: formatNumber(netDisc),
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

  const isDateEarlierThanDocumentDate = (value) => {
    const candidateDate = parseComparableDate(value);
    const soDate = parseComparableDate(documentDate);

    if (!candidateDate || !soDate) {
      return false;
    }

    return candidateDate < soDate;
  };

  const handleDocumentDateFocus = () => {
    documentDateBeforeManualEditRef.current = documentDate || "";
  };

  const handleDocumentDateChange = (updates) => {
    const nextDocumentDate = updates.documentDate;
    const currentDefaultDeliveryDate = getNextDayDateValue(documentDate);
    const nextDefaultDeliveryDate = getNextDayDateValue(nextDocumentDate);
    const shouldUpdateDefaultDeliveryDate =
      (detailRows?.length || 0) === 0 &&
      (!deliveryDate || deliveryDate === currentDefaultDeliveryDate);

    if (shouldUpdateDefaultDeliveryDate) {
      deliveryDateRef.current = nextDefaultDeliveryDate || "";
      suppressDeliveryDatePromptRef.current = true;
    }

    updateState({
      documentDate: nextDocumentDate,
      ...(shouldUpdateDefaultDeliveryDate ? { deliveryDate: nextDefaultDeliveryDate } : {}),
    });
  };

  const handleDocumentDateBlur = async (_event, { value: nextDocumentDate, isValid } = {}) => {
    const originalDocumentDate =
      documentDateBeforeManualEditRef.current || documentDate || "";
    const isCompleteDocumentDate =
      isValid &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(String(nextDocumentDate || "")) &&
      !!parseComparableDate(nextDocumentDate);
    const hasMatrixPricedRows = (detailRowsRef.current || []).some((row) =>
      String(row?.pmId || "").trim()
    );

    if (
      !documentDateConfirmOpenRef.current &&
      hasMatrixPricedRows &&
      isCompleteDocumentDate &&
      String(nextDocumentDate || "") !== String(originalDocumentDate || "")
    ) {
      documentDateConfirmOpenRef.current = true;

      try {
        const result = await useSwalProceedConfirm(
          "Update SO Date?",
          "Editing of SO Date will update the Price and Discount based on matrix.",
          "Yes",
          "No"
        );

        if (!result?.isConfirmed) {
          documentDateBeforeManualEditRef.current = originalDocumentDate;
          updateState({ documentDate: originalDocumentDate });
          return;
        }

        documentDateBeforeManualEditRef.current = nextDocumentDate;
        updateState({ documentDate: nextDocumentDate });
        await refreshDetailRowsFromPriceMatrix({
          rows: detailRowsRef.current,
          docDate: nextDocumentDate,
        });
      } finally {
        documentDateConfirmOpenRef.current = false;
      }

      return;
    }

    if (isCompleteDocumentDate) {
      documentDateBeforeManualEditRef.current = nextDocumentDate;
    }
  };



  

  const clearHeaderAndDetailDeliveryDates = ({ showAlert = false } = {}) => {
    const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
    const updatedRows = (sourceRows || []).map((row) => ({
      ...row,
      delDate: "",
    }));

    if (showAlert) {
      useSwalErrorAlert(
        "Invalid Delivery Date",
        "Delivery Date must not be earlier than SO Date."
      );
    }

    deliveryDateRef.current = "";
    suppressDeliveryDatePromptRef.current = true;

    updateState({
      deliveryDate: null,
      detailRows: updatedRows,
    });
    detailRowsRef.current = updatedRows;
    updateTotals(updatedRows);
  };

  const clearHeaderAndDetailCustomerPO = () => {
    const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
    const updatedRows = (sourceRows || []).map((row) => ({
      ...row,
      customerPoNo: "",
    }));

    customerPoNoRef.current = "";

    updateState({
      customerPoNo: "",
      customerPoDate: null,
      detailRows: updatedRows,
    });
    detailRowsRef.current = updatedRows;
    updateTotals(updatedRows);
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

  const checkDuplicateCustomerPO = async (customerPOValue) => {
    const trimmedCustomerPO = String(customerPOValue || "").trim();
    const trimmedCustCode = String(billToCustCode || "").trim();

    if (!trimmedCustomerPO || !trimmedCustCode) {
      return false;
    }

    const params = {
      json_data: {
        customerPoNo: trimmedCustomerPO,
        custCode: trimmedCustCode,
      },
    };

    try {
      const response = await apiClient.get(SO_DUPLICATE_PO_ENDPOINT, { params });
      return parseDuplicatePOCheckResult(response);
    } catch (error) {
      console.error("Error checking duplicate SO customer PO:", error);
      return false;
    }
  };

  const applyHeaderValueToDetailRows = (detailField, detailValue) => {
    const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
    const updatedRows = (sourceRows || []).map((row) => ({
      ...row,
      [detailField]: detailValue,
    }));

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
      `SO Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all SO Detail rows?`,
      "Yes"
    );

    if (result?.isConfirmed) {
      applyHeaderValueToDetailRows(detailField, detailValue);
      return true;
    }

    return false;
  };

  const handleHeaderCustomerPoBlur = async () => {
    const currentValue = String(customerPoNo || "").trim();
    const currentPoDate = String(customerPoDate || "").trim();

    if (currentValue && currentValue !== customerPoNoRef.current) {
      const isDuplicatePO = await checkDuplicateCustomerPO(currentValue);

      if (isDuplicatePO) {
        const result = await useSwalProceedConfirm(
          "Duplicate Customer PO",
          "Customer PO already exists for this customer. Do you want to proceed?"
        );

        if (!result?.isConfirmed) {
          clearHeaderAndDetailCustomerPO();
          return;
        }
      }
    }

    if (currentValue && !currentPoDate) {
      updateState({
        customerPoDate: documentDate || useGetCurrentDayV2(),
      });
    }

    if (currentValue !== customerPoNoRef.current) {
      await confirmApplyHeaderValueToDetails({
        headerLabel: "Customer PO No.",
        detailField: "customerPoNo",
        detailValue: currentValue,
      });
      customerPoNoRef.current = currentValue;
    }
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
    if (suppressDeliveryDatePromptRef.current) {
      suppressDeliveryDatePromptRef.current = false;
      deliveryDateRef.current = deliveryDate || "";
      return;
    }

    const currentValue = deliveryDate || "";

    if (currentValue === deliveryDateRef.current) {
      return;
    }

    const isCompleteOrCleared =
      currentValue === "" || /^\d{2}\/\d{2}\/\d{4}$/.test(currentValue);

    if (!isCompleteOrCleared) {
      return;
    }

    if (currentValue && isDateEarlierThanDocumentDate(currentValue)) {
      clearHeaderAndDetailDeliveryDates({ showAlert: true });
      return;
    }

    const run = async () => {
      await confirmApplyHeaderValueToDetails({
        headerLabel: "Delivery Date",
        detailField: "delDate",
        detailValue: currentValue,
      });
      deliveryDateRef.current = currentValue;
    };

    run();
  }, [deliveryDate]);


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
    const filteredTypes = getAllDropDown("SOTRAN_TYPE", docType) || [];
    const defaultSoType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "SO01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "";
    const mapHeaderSoStatus = (value) => {
      const normalizedValue = String(value || "").toUpperCase();
      if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
      if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
      if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
      return "O";
    };

    updateState({
      salesTypeOptions: filteredTypes,
      salesType: defaultSoType,
      soStatusOptions: [
        { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
        { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
        { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
      ],
      soStatus: mapHeaderSoStatus(state.soStatus),
    });
}, [docType, refsLoaded]);



  const handleReset = () => {
      clearSoDetailSorting();
      const filteredTypes = getAllDropDown("SOTRAN_TYPE", docType) || [];
      const defaultSoType =
        filteredTypes.find((type) => type.DROPDOWN_CODE === "SO01")?.DROPDOWN_CODE ||
        filteredTypes[0]?.DROPDOWN_CODE ||
        "";
      const nextDocumentDate = useGetCurrentDayV2();
      const nextDeliveryDate = getNextDayDateValue(nextDocumentDate);

      customerPoNoRef.current = "";
      deliveryDateRef.current = nextDeliveryDate || "";
      suppressDeliveryDatePromptRef.current = true;
      salesRepRef.current = { code: "", name: "" };


      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate: nextDocumentDate,
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      refDocNo1: "",
      refDocNo2:"",
      remarks:"",
      billtermCode:"",
      billtermName:"",
      noReprints:"0",

      billToCustCode:"",
      billToCustName:"",
      billToAddress:"",
      shipToCode:"",
      shipToName:"",
      shipToAddress:"",
      contactPerson:"",
      customerPoNo:"",
      customerPoDate:null,
      deliveryDate: nextDeliveryDate,
      rcCode:"",
      rcName:"",
      salesRepCode:"",
      salesRepName:"",
      documentNo: "",
      documentID: "",
      detailRows: [],
      documentStatus:"O",
      salesType: defaultSoType,
      soStatus:"O",


      // UI state
      activeTab: "basic",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status:"Open"

    });

      updateTotalsDisplay(0, 0, 0, 0)
  };






    const loadCompanyData = async () => {
        updateState({ isLoading: true });

        try {
          const hdtblcol_result = await useFieldLenghtCheck(
            "so_hd,so_dt1"
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


const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"soNo",direction);


    if (!data?.soId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      soQuantity: formatNumber(item.soQuantity ?? 0,quantityDecimals),
      sellingPrice: formatNumber(item.sellingPrice??0,sellingPriceDecimals),
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
      netAmount: formatNumber(item.netAmount ?? 0),
      drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
      siQuantity: formatNumber(item.siQuantity ?? 0, quantityDecimals),
      delDate: useformatToDatev2(item.delDate),
    }));

    updateState({
      documentStatus: data.soStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.soId,
      documentNo: data.soNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.soDate),
      salesType: data.soTranType,
      billToCustCode: data.custCode,
      billToCustName: data.custName,
      billToAddress: data.addr,
      contactPerson:data.attention,
      shipToCode: data.shipToCode,
      shipToName: data.shipToName,
      shipToAddress:data.shipToAddr,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      billtermCode: data.billtermCode,
      billtermName: data.billtermName,
      customerPoNo: data.customerPoNo ||  "",
      customerPoDate: useformatToDatev2(data.customerPoDate),
      deliveryDate: useformatToDatev2(data.deliveryDate),
      rcCode: data.rcCode || "",
      rcName: data.rcName || "",
      salesRepCode: data.salesRepCode || "",
      salesRepName: data.salesRepName || "",
      soStatus:
        String(data.soStatus || "O").toUpperCase() === "OPEN"
          ? "O"
          : String(data.soStatus || "O").toUpperCase() === "CANCELLED"
          ? "X"
          : String(data.soStatus || "O").toUpperCase() === "CLOSED"
          ? "C"
          : String(data.soStatus ||  "O"),
      detailRows: retrievedDetailRows,
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

    customerPoNoRef.current = data.customerPoNo ||"";
    deliveryDateRef.current = formatFetchedHeaderDate(data.deliveryDate) || "";
    suppressDeliveryDatePromptRef.current = true;
    salesRepRef.current = {
      code: data.salesRepCode || "",
      name: data.salesRepName || "",
    };


    updateTotals(retrievedDetailRows);

  } catch (error) {
    console.error("Error fetching transaction data:", error);
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};


const handlesoNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) {
        fetchTranData(state.documentNo,state.branchCode);
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
   if ((detailRows?.length || 0) === 0) {
    return;
  }



  if (action === "Upsert") {
   await moveFocusBeforeSave();
  }



  if (documentStatus === "O") {
    updateState({ isLoading: true });


    try {
        const {
        branchCode,
        documentNo,
        documentID,
        billtermCode,
        billToCustCode,
        billToCustName,
        billToAddress,
        shipToCode,
        shipToName,
        shipToAddress,
        refDocNo1,
        refDocNo2,
        currCode,
        currRate,
        remarks,
        userCode,
        contactPerson,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
        salesRepCode,
        salesRepName,
        salesType,
        soStatus,
        detailRows,
      } = state;

      const buildSoData = () => ({
        branchCode: branchCode,
        soNo: documentNo || "",
        soId: documentID || "",
        soDate: documentDate,
        sotranType: salesType,
        billtermCode: billtermCode,
        custCode: billToCustCode,
        custName: billToCustName,
        billToAddress,
        shipToCode,
        shipToName,
        shipToAddress,
        attention: contactPerson,
        refDocNo1: refDocNo1,
        refDocNo2: refDocNo2,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: userCode,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
        salesRepCode,
        salesRepName,
        soStatus,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          soStat: row.soStat || "O",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          pmType: row.pmType || "",
          groupId: row.groupId || "",
          pmId: row.pmId || "",
          soQuantity: parseFormattedNumber(row.soQuantity || 0),
          sellingPrice: parseFormattedNumber(row.sellingPrice || 0),
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
          netAmount: parseFormattedNumber(row.netAmount || 0),
          delDate: row.delDate || null,
          customerPoNo: row.customerPoNo || "",
          salesRepCode: row.salesRepCode || "",
          freeItem: row.freeItem || "",
          drQuantity: parseFormattedNumber(row.drQuantity || 0),
          siQuantity: parseFormattedNumber(row.siQuantity || 0),
        })),
        dt2: [],
      });



      if (action === "Upsert") {
        const response = await useTransactionUpsert(
          docType,
          buildSoData(),
          updateState,
          "soId",
          "soNo"
        );

        if (response) {
          const responseDocNo =  response.data[0].soNo;
          const responseDocId =  response.data[0].soId;

          await fetchTranData(responseDocNo,branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }
        updateState({
          documentNo: response?.data?.[0]?.soNo || "",
          documentID: response?.data?.[0]?.soId || "",
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





  const createSODetailRow = (overrides = {}) => ({
      lnNo: "",
      soStat: "O",
      itemCode: "",
      itemName: "",
      itemSpecs: "",
      uomCode: "",
      pmType: "",
      groupId: "",
      pmId: "",
      soQuantity: Number(0).toFixed(quantityDecimals),
      sellingPrice: Number(0).toFixed(sellingPriceDecimals),
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
      delDate: deliveryDate || "",
      customerPoNo: customerPoNo || "",
      salesRepCode: salesRepCode || "",
      freeItem: "",
      drQuantity: Number(0).toFixed(quantityDecimals),
      siQuantity: Number(0).toFixed(quantityDecimals),
      ...overrides,
    });

  const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
      return;
    }

    const updatedRows = [...detailRows];
    const normalizedInsertRows = rowsToInsert.map((row) => createSODetailRow(row));

    if (insertIndex !== null && insertIndex >= 0) {
      updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
    } else {
      updatedRows.push(...normalizedInsertRows);
    }

    const normalizedRows = updatedRows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    }));

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
    insertDetailRows([createSODetailRow()], insertIndex);
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
    if (SO_ALLOW_DUPLICATE_ITEMS) {
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
        `These item(s) already exist in SO Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
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
    { custCode = billToCustCode || "", docDate = documentDate } = {}
  ) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return [];
    }

    const payload = {
      json_data: {
        docDate,
        custCode,
        items: selectedRecords.map((item, index) => ({
          sequence: index + 1,
          itemCode: item?.itemCode || "",
        })),
      },
    };

    try {
      updateState({ isLoading: true });
      const response = await postRequest(
        SO_PRICE_MATRIX_ENDPOINT,
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






  const refreshDetailRowsFromPriceMatrix = async ({
    custCode = billToCustCode || "",
    rows = detailRows,
    docDate = documentDate,
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
    });
    const updatedRows = rows.map((row, index) =>
      applyPriceMatrixToDetailRow(
        row,
        getPriceMatrixRowForItem(priceMatrixRows, row, index)
      )
    );

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };







  const getPriceMatrixRowForItem = (priceMatrixRows = [], item = {}, index = 0) => {
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




  const toFormattedAmountNumber = (value, decimals = 2) =>
    parseFormattedNumber(formatNumber(value, decimals)) || 0;

  const calculateRowAmountsFromRates = (row) => {
    const discountRateFields = visibleDiscountRateFields;
    const discountAmountFields = visibleDiscountAmountFields;
    const quantity = parseFormattedNumber(row.soQuantity || 0) || 0;
    const sellingPrice = parseFormattedNumber(row.sellingPrice || 0) || 0;
    const grossAmount = toFormattedAmountNumber(quantity * sellingPrice);
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

    return {
      ...row,
      grossAmount: formatNumber(grossAmount),
      ...updatedAmounts,
      totDiscount: formatNumber(totalDiscount),
      netAmount: formatNumber(toFormattedAmountNumber(grossAmount - totalDiscount)),
    };
  };






  const applyPriceMatrixToDetailRow = (baseRow, priceRow = {}) => {
    if (baseRow.freeItem === "Y") {
      return calculateRowAmountsFromRates({
        ...baseRow,
        sellingPrice: formatNumber(0, sellingPriceDecimals),
        ...Object.fromEntries(
          visibleDiscountRateFields.map((field) => [field, formatNumber(0)])
        ),
      });
    }

    const getPriceValue = () => priceRow?.sellingPrice ||0
    const getPmTypeValue = () => priceRow?.pmType||"";
    const getPmIdValue = () =>   priceRow?.pmId ||"";
    const getDiscountRateValue = (discountNo) =>  priceRow?.[`discRate${discountNo}`] ||0;
    const updatedRow = {
      ...baseRow,
      pmType: getPmTypeValue() ?? baseRow.pmType ?? "",
      pmId: getPmIdValue() ?? baseRow.pmId ?? "",
      sellingPrice: formatNumber(
        getPriceValue() ?? baseRow.sellingPrice ?? 0,
        sellingPriceDecimals
      ),
    };

    visibleDiscountRateFields.forEach((field, index) => {
      updatedRow[field] = formatNumber(
        getDiscountRateValue(index + 1) ?? baseRow[field] ?? 0
      );
    });

    return calculateRowAmountsFromRates(updatedRow);
  };

  const mapItemRecordToDetailRow = (item = {}) => createSODetailRow({
    itemCode: item?.itemCode || "",
    itemName: item?.itemName || "",
    itemSpecs: item?.itemSpecs || "",
    uomCode: item?.uomCode || "",
    pmType: item?.pmType || "",
    groupId: "",
    pmId: item?.pmId || "",
    soQuantity: formatNumber(
      item?.soQuantity ?? item?.quantity ?? item?.soQty ?? 0,
      quantityDecimals
    ),
    sellingPrice: formatNumber(
      item?.sellingPrice ?? item?.unitPrice ?? 0,
      sellingPriceDecimals
    ),
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
    netAmount: formatNumber(item?.netAmount ?? 0),
    delDate: item?.delDate || deliveryDate || "",
    customerPoNo: item?.customerPoNo || customerPoNo || "",
    salesRepCode: item?.salesRepCode || item?.repCode || salesRepCode || "",
    freeItem: item?.freeItem || "",
    drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
    siQuantity: formatNumber(item?.siQuantity ?? 0, quantityDecimals),
  });

  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords);
    const rowsToInsert = selectedRecords.map((item, index) => {
      const baseRow = mapItemRecordToDetailRow(item);
      const priceRow = getPriceMatrixRowForItem(priceMatrixRows, item, index);
      return applyPriceMatrixToDetailRow(baseRow, priceRow);
    });

    insertDetailRows(rowsToInsert, insertAfterIndex);
  };







const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
        detailRows: updatedRows });
    updateTotals(updatedRows);

  };








const handlePrint = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};

  const handleOpenAddItemModal =  async() => {
    const fieldsToCheck = {
      "Header : Bill To Customer Code": billToCustCode,
      "Header : Ship To Customer Code": shipToCode,
      "Header : Billing Term": billtermCode,
      "Header : Sales Rep": salesRepCode,
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











const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === 'O')) {
    updateState({ showCancelModal: true });
  }
};

const handleHeaderSoStatusChange = async (value) => {
  if (value === "X") {
    await handleCancel();
    return;
  }

  if (String(soStatus || "").toUpperCase() === "O" && value === "C") {
    const result = await useSwalProceedConfirm(
      "Confirm Close SO",
      "Do you want to change SO Status from Open to Closed?",
      "Yes"
    );

    if (!result?.isConfirmed) return;
  }

  updateState({ soStatus: value });
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
    const nextDeliveryDate = getNextDayDateValue(nextDocumentDate);
    const copiedDetailRows = detailRows.map((row) => ({
      ...row,
      soStat: "O",
      delDate: "",
      customerPoNo: "",
      drQuantity: formatNumber(0, quantityDecimals),
      siQuantity: formatNumber(0, quantityDecimals),
      groupId: "",
      pmId: "",
      pmType: "",
    }));

    customerPoNoRef.current = "";
    deliveryDateRef.current = nextDeliveryDate || "";
    suppressDeliveryDatePromptRef.current = true;

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "O",
      status: "OPEN",
      soStatus: "O",
      documentDate: nextDocumentDate,
      customerPoNo: "",
      customerPoDate: null,
      deliveryDate: nextDeliveryDate,
      refDocNo1: "",
      refDocNo2: "",
      noReprints: "0",
      detailRows: copiedDetailRows,
    });

    await refreshDetailRowsFromPriceMatrix({
      docDate: nextDocumentDate,
      rows: copiedDetailRows,
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
    if(confirmation && documentStatus === "O" && documentID !== null ) {

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
        const address = selectedData?.addr ||  "";
        const custDetails = {
            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
            attention: selectedData?.attention || '',
            billtermCode: selectedData?.billtermCode || '',
            billtermName: selectedData?.billtermName || '',
            salesRepCode: selectedData?.salesRepCode || '',
            salesRepName: selectedData?.salesRepName || ''
        };
        const isShipTo = modalContext === "shipTo";
        const nextBillToCustCode = isShipTo
          ? billToCustCode || ""
          : selectedData?.custCode || "";
        const shouldRepriceDetailRows =
          !isShipTo &&
          detailRows.length > 0 &&
          String(nextBillToCustCode).trim() !== "" &&
          String(nextBillToCustCode).trim() !== String(billToCustCode || "").trim();
        const shouldSyncShipTo = !isShipTo && !String(shipToCode || "").trim();
        const shouldSyncBillTo = isShipTo && !String(billToCustCode || "").trim();
        updateState(
          isShipTo
            ? {
                shipToName: selectedData.custName,
                shipToCode: selectedData.custCode,
                shipToAddress: address,
                ...(shouldSyncBillTo
                  ? {
                      billToCustName: selectedData.custName,
                      billToCustCode: selectedData.custCode,
                      billToAddress: address,
                    }
                  : {}),
                custModalOpen: false,
                modalContext: "",
              }
            : {
                billToCustName: selectedData.custName,
                billToCustCode: selectedData.custCode,
                billToAddress: address,
                ...(shouldSyncShipTo
                  ? {
                      shipToName: selectedData.custName,
                      shipToCode: selectedData.custCode,
                      shipToAddress: address,
                    }
                  : {}),
                custModalOpen: false,
                modalContext: "",
              }
        );

        if (!selectedData.currCode || (!isShipTo && !custDetails.salesRepCode)) {
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            if (response.success) {
                const customerRow = JSON.parse(response.data[0].result)?.[0] || {};
                custDetails.currCode = customerRow?.currCode || custDetails.currCode;
                custDetails.attention = customerRow?.custContact || custDetails.attention;
                custDetails.billtermCode = customerRow?.billtermCode || custDetails.billtermCode;
                custDetails.billtermName = customerRow?.billtermName || custDetails.billtermName;
                if (!isShipTo) {
                  custDetails.salesRepCode =
                    customerRow?.salesRepCode ||  custDetails.salesRepCode;
                }
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        if (!isShipTo && custDetails.salesRepCode) {
            const salesRepRow = await useTopSalesRepRow(custDetails.salesRepCode);
            custDetails.salesRepName =
              salesRepRow?.salesRepName || custDetails.salesRepName;
        }

        await Promise.all([
            handleSelectCurrency(custDetails.currCode),
            handleSelectBillTerm(custDetails.billtermCode),
            updateState({
              contactPerson: custDetails.attention,
              ...(!isShipTo
                ? {
                    salesRepCode: custDetails.salesRepCode,
                    salesRepName: custDetails.salesRepName,
                  }
                : {}),
            })
        ]);

        if (shouldRepriceDetailRows) {
            await refreshDetailRowsFromPriceMatrix({
              custCode: nextBillToCustCode,
            });
        }

        if (!isShipTo && custDetails.salesRepCode !== salesRepRef.current.code) {
            await confirmApplyHeaderValueToDetails({
              headerLabel: "Sales Rep",
              detailField: "salesRepCode",
              detailValue: custDetails.salesRepCode,
            });
        }

        if (!isShipTo) {
            salesRepRef.current = {
              code: custDetails.salesRepCode,
              name: custDetails.salesRepName,
            };
        }

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
       updateState({ isLoading: false });
    }
};



  const updateTotals = (rows) => {
  let totalNetAmount = 0;
  let totalGrossAmt =0;
  let totalDiscAmt=0;

  rows.forEach(row => {
    const invoiceGross = parseFormattedNumber(row.grossAmount || 0) || 0;
    const invoiceNetAmount = parseFormattedNumber(row.netAmount || 0) || 0;
    const invoiceDiscount = parseFormattedNumber(row.totDiscount || 0) || 0;

    totalGrossAmt+= invoiceGross;
    totalDiscAmt+= invoiceDiscount;
    totalNetAmount+= invoiceNetAmount;
  });
    updateTotalsDisplay(totalGrossAmt, totalDiscAmt, totalNetAmount);

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

  updateState({
    showRcModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
};

const handleCloseSalesRepModal = (selectedSalesRep) => {
  if (modalContext === "headerSalesRep" && selectedSalesRep) {
    const nextSalesRepCode = selectedSalesRep.salesRepCode || "";
    const nextSalesRepName = selectedSalesRep.salesRepName || "";

    updateState({
      salesRepCode: nextSalesRepCode,
      salesRepName: nextSalesRepName,
      showSalesRepModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });

    if (nextSalesRepCode !== salesRepRef.current.code) {
      confirmApplyHeaderValueToDetails({
        headerLabel: "Sales Rep",
        detailField: "salesRepCode",
        detailValue: nextSalesRepCode,
      });
    }

    salesRepRef.current = {
      code: nextSalesRepCode,
      name: nextSalesRepName,
    };
    return;
  }

  if (modalContext === "detailSalesRep" && selectedRowIndex !== null && selectedSalesRep) {
    const updatedRows = [...detailRows];
    updatedRows[selectedRowIndex] = {
      ...updatedRows[selectedRowIndex],
      salesRepCode: selectedSalesRep.salesRepCode || "",
    };

    updateState({
      detailRows: updatedRows,
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




const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
    handleSelectBillTerm(selectedBillTerm.billtermCode);
  };
    updateState({ billtermModalOpen: false });
}




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



const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {

     const result = await useTopBillTermRow(billtermCode);
      if (result) {
      updateState({
        billtermCode:result.billtermCode,
        billtermName:result.billtermName,
        daysDue: result.daysDue
        })
      }
    }
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


const handleSODetailRowChange = async (index, field, value) => {
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
    "soQuantity",
    "sellingPrice",
    ...discountRateFields,
    ...discountAmountFields,
  ];
  const zeroValueByField = (targetField) => {
    if (targetField === "sellingPrice") {
      return formatNumber(0, sellingPriceDecimals);
    }

    if (targetField === "soQuantity" || targetField === "drQuantity" || targetField === "siQuantity") {
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

    const zeroedRow = {
      ...row,
      freeItem: "Y",
      sellingPrice: formatNumber(0, sellingPriceDecimals),
      grossAmount: formatNumber(0),
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

  const recalculateSODetailRow = (row, changedField) => {
    const quantity = parseFormattedNumber(row.soQuantity || 0) || 0;
    const sellingPrice = parseFormattedNumber(row.sellingPrice || 0) || 0;
    const grossAmount = toFormattedAmountNumber(quantity * sellingPrice);

    let runningBase = grossAmount;
    let totalDiscount = 0;
    const updatedDiscountAmounts = {};
    const updatedDiscountRates = {};

    if (discountAmountFields.includes(changedField)) {
      discountAmountFields.forEach((amountField, index) => {
        const discountNo = index + 1;
        const rateField = `discRate${discountNo}`;
        const discountAmount = toFormattedAmountNumber(parseFormattedNumber(row[amountField] || 0));
        const discountRate =
          runningBase !== 0 ? toFormattedAmountNumber((discountAmount / runningBase) * 100) : 0;

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

    return {
      ...row,
      grossAmount: formatNumber(grossAmount),
      ...updatedDiscountRates,
      ...updatedDiscountAmounts,
      totDiscount: formatNumber(totalDiscount),
      netAmount: formatNumber(netAmount),
    };
  };

  const updatedRows = [...(detailRowsRef.current || [])];
  let updatedRow = {
    ...updatedRows[index],
    [field]: value,
  };





  if (field === "delDate" && value && isDateEarlierThanDocumentDate(value)) {
    clearHeaderAndDetailDeliveryDates({ showAlert: true });
    return;
  }

  if (field === "freeItem") {
    if (updatedRows[index]?.freeItem !== "Y" && value === "Y") {
      const result = await useSwalProceedConfirm(
        "Confirm Free Item",
        "Do you want to mark this item as a free item?",
        "Yes"
      );

      if (!result?.isConfirmed) return;
    }

    updatedRow = buildFreeItemRow(updatedRow, value === "Y");
    updatedRows[index] = updatedRow;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    return;
  }

  if (
    updatedRows[index]?.freeItem === "Y" &&
    ["sellingPrice", ...discountRateFields, ...discountAmountFields].includes(field)
  ) {
    updatedRow = {
      ...updatedRows[index],
      [field]: zeroValueByField(field),
    };
    updatedRows[index] = buildFreeItemRow(updatedRow, true);
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    return;
  }

  if (calculationTriggerFields.includes(field)) {
    updatedRow = recalculateSODetailRow(updatedRow, field);
  }

  updatedRows[index] = updatedRow;

  updateState({ detailRows: updatedRows });
  updateTotals(updatedRows);
};

const enterNextRowZeroClearFields = [
  "soQuantity",
  "sellingPrice",
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

const renderSODetailCell = (columnKey, row, index, soStatusOptions) => {
  const columnWidth = getDetailColumnFallbackWidth(columnKey);
  const style = getDetailCellStyle(columnKey, columnWidth);
  const normalizedRowStatus = String(row.soStat || "O").trim().toUpperCase();
  const isDetailRowDisabled =
    isSoDetailsDisabled ||
    ["C", "X", "CLOSED", "CANCELLED"].includes(normalizedRowStatus);
  const isRowWithDR = (parseFormattedNumber(row.drQuantity || 0) || 0) > 0;
  const canSearchItem = !isDetailRowDisabled && !isRowWithDR;
  const canEditDetailAfterDR = !isDetailRowDisabled && !isRowWithDR;
  const detailModalHandlers = {
    itemCode: () => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true }),
    salesRepCode: () => updateState({ showSalesRepModal: true, selectedRowIndex: index, modalContext: "detailSalesRep" }),
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
      readOnly={isDetailRowDisabled || !!options.readOnly}
      onChange={(e) => handleSODetailRowChange(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || isDetailRowDisabled) return;
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
        if (e.key !== "Enter" || isDetailRowDisabled) return;
        e.preventDefault();
        focusNextDetailCell(field);
      }}
    />
  );

  // Shared numeric input with formatting, zero-clear, and Enter-down support.
  // const numericInput = (field, options = {}) => (
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
  //     onFocus={(e) => {
  //       clearSoDetailZeroOnFocus(e, {
  //         isEditable: !(options.readOnly ?? isFormDisabled) && !options.blocked?.(),
  //         onClear: (value) => handleSODetailRowChange(index, field, value),
  //       });
  //     }}
  //     onBlur={(e) => {
  //       if (options.readOnly || options.blocked?.()) return;
  //       const num = parseFormattedNumber(e.target.value);
  //       handleSODetailRowChange(
  //         index,
  //         field,
  //         Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals)
  //       );
  //     }}
  //     onKeyDown={(e) => {
  //       if (e.key !== "Enter" || options.readOnly || options.blocked?.()) return;
  //       e.preventDefault();
  //       const num = parseFormattedNumber(e.target.value);
  //       handleSODetailRowChange(
  //         index,
  //         field,
  //         Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals)
  //       );
  //       focusNextDetailCell(field);
  //     }}
  //   />
  // );

  const numericInput = (field, options = {}) => (
  <input
    type="text"
    id={`${field}-${index}`}
    className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
    value={row[field] || ""}
    readOnly={isDetailRowDisabled || !!options.readOnly}
    onChange={(e) => {
      if (isDetailRowDisabled || options.readOnly || options.blocked?.()) return;
      const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
      const regex = options.regex || /^\d*\.?\d{0,2}$/;
      if (regex.test(sanitizedValue) || sanitizedValue === "") {
        handleSODetailRowChange(index, field, sanitizedValue);
      }
    }}
      onFocus={(e) => {
      options.onFocus?.(e);
      clearSoDetailZeroOnFocus(e, {
        isEditable: !isDetailRowDisabled && !options.readOnly && !options.blocked?.(),
        onClear: (value) => handleSODetailRowChange(index, field, value),
      });
    }}
    onBlur={(e) => {
      if (isDetailRowDisabled || options.readOnly || options.blocked?.()) return;
      if (typeof options.onBlur === "function" && options.onBlur(e) === false) return;

      const num = parseFormattedNumber(e.target.value);
      handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
    }}
    onKeyDown={(e) => {
      if (e.key !== "Enter" || isDetailRowDisabled || options.readOnly || options.blocked?.()) return;
      e.preventDefault();

      if (typeof options.onKeyDown === "function" && options.onKeyDown(e) === false) return;

      const num = parseFormattedNumber(e.target.value);
      handleSODetailRowChange(index, field, Number.isFinite(num) ? formatNumber(num, options.decimals) : formatNumber(0, options.decimals));
      focusNextDetailCell(field);
    }}
  />
);

  // Read-only amount display used by calculated amount columns.
  const readonlyAmountInput = (field, alwaysReadOnly = false) => (
    <input
      type="text"
      className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
      value={row[field] || ""}
      readOnly={alwaysReadOnly || isDetailRowDisabled}
      onChange={(e) => handleSODetailRowChange(index, field, e.target.value)}
    />
  );

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    soStat: () => { const isStatusLocked = !documentID || isDetailRowDisabled; return <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`soStat-${index}`} className="w-full global-tran-td-inputclass-ui text-left" value={row.soStat || "O"} disabled={isStatusLocked} onChange={(e) => handleSODetailRowChange(index, "soStat", e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isStatusLocked) return; e.preventDefault(); focusNextDetailCell("soStat"); }}>{soStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>; }, 
    itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.itemCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canSearchItem && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ selectedRowIndex: index, selectionContext: "rowItemLookup", insertAfterIndex: null, showItemModal: true })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>, 
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey)}</td>,
    itemSpecs: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="relative flex items-center">{textInput(columnKey, { className: "pr-8" })}{!isDetailRowDisabled && <FontAwesomeIcon icon={faSearch} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => useSwalHandleOpenSpecsModal(index, detailRows, handleSODetailRowChange, row.itemSpecs, "Specification", "itemSpecs", `Enter specification for ${row.itemCode || "this item"}...`)} />}</div></td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { className: "text-center" })}<input type="hidden" value={row.pmType || ""} readOnly /><input type="hidden" value={row.groupId || ""} readOnly /><input type="hidden" value={row.pmId || ""} readOnly /></td>,
    soQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), onFocus: () => { originalSOQuantityRef.current[index] = row.soQuantity; }, onBlur: (e) => validateSOQuantity(index, e.target.value), onKeyDown: (e) => validateSOQuantity(index, e.target.value) })}</td>,
    sellingPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: sellingPriceDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`), blocked: () => !isSellPriceOpenEditable || row.freeItem === "Y", readOnly: isFormDisabled || !isDiscountEditable || row.freeItem === "Y" })}</td>,
    grossAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey, true)}</td>,
    totDiscount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey)}</td>,
    netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{readonlyAmountInput(columnKey, true)}</td>,
    delDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`delDate-${index}`} name="delDate" value={row.delDate || ""} disabled={isDetailRowDisabled || isRowWithDR} updateState={(updates) => handleSODetailRowChange(index, "delDate", updates.delDate || "")} className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" /></td>, 
    customerPoNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput(columnKey, { readOnly: isRowWithDR })}</td>,
    salesRepCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="flex items-center gap-1"><input type="text" value={row.salesRepCode || ""} readOnly className="w-full h-7 text-xs bg-transparent focus:outline-none focus:ring-0" />{canEditDetailAfterDR && <button type="button" className="text-blue-600 hover:text-blue-800" onClick={() => updateState({ showSalesRepModal: true, selectedRowIndex: index, modalContext: "detailSalesRep" })}><FontAwesomeIcon icon={faSearch} /></button>}</div></td>,
    freeItem: () => <td key={columnKey} className="global-tran-td-ui" style={style}><button type="button" className={`w-full h-7 rounded-full border text-[11px] font-semibold transition-colors ${row.freeItem === "Y" ? "border-blue-500 bg-blue-500/15 text-blue-700" : "border-slate-300 bg-white text-slate-600"} ${isDetailRowDisabled || isRowWithDR ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} disabled={isDetailRowDisabled || isRowWithDR} onClick={() => handleSODetailRowChange(index, "freeItem", row.freeItem === "Y" ? "" : "Y")}>{row.freeItem === "Y" ? "Yes" : "No"}</button></td>,
    drQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>,
    siQuantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { decimals: quantityDecimals, regex: new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`), readOnly: true })}</td>,
  };

  if (visibleDiscountRateFields.includes(columnKey) || visibleDiscountAmountFields.includes(columnKey)) {
    detailColumnRenderers[columnKey] = () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput(columnKey, { blocked: () => !isDiscountEditable || row.freeItem === "Y", readOnly: isFormDisabled || !isDiscountEditable || row.freeItem === "Y" })}</td>;
  }

  return detailColumnRenderers[columnKey]?.() ?? null;
};


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

        isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || normalizedDocumentStatus === "CANCELLED"}
        isCopyDisabled={!documentID || normalizedDocumentStatus === "CANCELLED"}
        isCancelDisabled={!documentID || ["CANCELLED", "FINALIZED", "CLOSED"].includes(normalizedDocumentStatus) || totalDrQuantity > 0}
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



        {/* SO Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="so_hd">

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
              id="soNo"
              label="SO No."
              type="lookup"
              value={state.documentNo || documentNo || ""}
              disabled={state.isDocNoDisabled}
              onChange={(val) => updateState({ documentNo: val })}
              onBlur={handlesoNoBlur}
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
                  updateState={handleDocumentDateChange}
                  onFocus={handleDocumentDateFocus}
                  onBlurCustom={handleDocumentDateBlur}
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
                SO Date
              </label>
            </div>

            <FieldRenderer
              id="billToCustCode"
              label="Bill To Customer Code"
              required
              type="lookup"
              value={billToCustCode || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ custModalOpen: true, modalContext: "billTo" })}
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

            <FieldRenderer
              id="billToAddress"
              label="Bill To Address"
              type="text"
              value={billToAddress || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ billToAddress: val })}
            />
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="salesType"
              label="SO Type"
              type="select"
              value={salesType || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ salesType: val })}
              options={salesTypeOptions.map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />

            <FieldRenderer
              id="customerPoNo"
              label="Customer PO No."
              type="text"
              value={customerPoNo || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ customerPoNo: val })}
              onBlur={async () => {
                if (skipNextCustomerPoBlurRef.current) {
                  skipNextCustomerPoBlurRef.current = false;
                  return;
                }
                await handleHeaderCustomerPoBlur();
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  skipNextCustomerPoBlurRef.current = true;
                  await handleHeaderCustomerPoBlur();
                  e.currentTarget?.blur();
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
              id="shipToCode"
              label="Ship To Customer Code"
              required
              type="lookup"
              value={shipToCode || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ custModalOpen: true, modalContext: "shipTo" })}
            />

            <FieldRenderer
              id="shipToName"
              label="Ship To Customer Name"
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
                    !isFormDisabled &&
                    !isFetchDisabled &&
                    updateState({ custModalOpen: true, modalContext: "shipTo" })
                  }
                  disabled={isFormDisabled || isFetchDisabled}
                  title="Search"
                  className={`absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center rounded-r-lg border border-l-0 transition-colors ${
                    !isFormDisabled && !isFetchDisabled
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
              id="contactPerson"
              label="Contact Person"
              type="text"
              value={contactPerson || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ contactPerson: val })}
            />

            <FieldRenderer
              id="billtermName"
              label="Billing Term"
              required
              type="lookup"
              value={billtermName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ billtermModalOpen: true })}
            />

            <FieldRenderer
              id="salesRepName"
              label="Sales Rep"
              required
              type="lookup"
              value={salesRepName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
            />

            <FieldRenderer
              id="rcName"
              label="Responsibility Center"
              type="lookup"
              value={rcName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ showRcModal: true, modalContext: "headerRc" })}
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
                  id="deliveryDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={deliveryDate}
                  disabled={isFormDisabled}
                  updateState={updateState}
                />
              </div>
              <label htmlFor="deliveryDate" className="global-ref-floating-label">
                Delivery Date
              </label>
            </div>
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="refDocNo1"
              label="Ref SO No. 1"
              type="text"
              value={refDocNo1 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo1: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refso_no1")}
            />

            <FieldRenderer
              id="refDocNo2"
              label="Ref SO No. 2"
              type="text"
              value={refDocNo2 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo2: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refso_no2")}
            />

            <FieldRenderer
              id="soStatus"
              label="SO Status"
              type="select"
              value={soStatus || ""}
              disabled={!isHeaderSoStatusEditable}
              onChange={handleHeaderSoStatusChange}
              options={filteredHeaderSoStatusOptions.map((t) => ({
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


    </div>

          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            >
              SO Details
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

                {!isSoDetailsDisabled && (
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
            const hasDrQuantity = parseFormattedNumber(row.drQuantity || 0) > 0;
            const canDeleteRow = !hasDrQuantity && (row.soStat || "O") === "O";
            const soStatusOptions = hasDrQuantity
              ? [
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                ]
              : [
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                  { value: "X", label: "Cancelled" },
                ];

            return (
            <tr key={originalIndex} className="global-tran-tr-ui">
              {orderedDetailColumns.map((column) =>
                renderSODetailCell(column.key, row, originalIndex, soStatusOptions)
              )}


               {!isSoDetailsDisabled && (
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
                          disabled={!canDeleteRow}
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
    <div className="global-tran-tab-footer-main-div-ui">


    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <button
        onClick={handleOpenAddItemModal}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>


      <div
    className={`global-tran-tab-footer-total-main-div-ui grid gap-1 ${
      currRate > 1 ? "grid-cols-3" : "grid-cols-2"
    }`}
      >
        {/* Header Row */}
        <div></div>
        <div className="global-tran-tab-footer-total-label-ui text-right">
          Currency ({glCurrDefault})
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-label-ui text-right">
            Currency ({currCode})
          </div>
        )}

        {/* Total Gross Amount */}
        <div className="global-tran-tab-footer-total-label-ui">
          Total Gross Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalGrossAmount
            : formatNumber(parseFormattedNumber(totals.totalGrossAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalGrossAmount}
          </div>
        )}

        <div className="global-tran-tab-footer-total-label-ui">
          Total Discount Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalDiscountAmount
            : formatNumber(parseFormattedNumber(totals.totalDiscountAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalDiscountAmount}
          </div>
        )}

        <div className="global-tran-tab-footer-total-label-ui">
          Total Net Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalNetAmount
            : formatNumber(parseFormattedNumber(totals.totalNetAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalNetAmount}
          </div>
        )}
      </div>



    </div>
    </>
    )}

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

    {showSalesRepModal && (
      <SearchSalesRepRef
        isOpen={showSalesRepModal}
        onClose={handleCloseSalesRepModal}
      />
    )}

    {/* RC Code Modal */}
    {showRcModal && (
      <RCLookupModal
        isOpen={showRcModal}
        onClose={handleCloseRcModal}
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "soNo"}}
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
    endpoint="/getSOHistory"
    cacheKey={`SO:${state.branchCode || ""}`}
    activeTabKey="SO_Summary"
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

export default SO;
