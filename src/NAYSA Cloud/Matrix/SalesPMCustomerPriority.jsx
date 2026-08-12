import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { GripVertical, Search, Settings, Trash2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPen,
  faTimes,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useSwalDeleteConfirm as swalDeleteConfirm,
  useSwalSuccessAlert as swalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";

const MATRIX_TYPE_OPTIONS = [
  { value: "PMCUST", label: "Customer" },
  { value: "PMCHAIN", label: "Chain" },
  { value: "PMAREA", label: "Area" },
  { value: "PMCTYPE", label: "Customer Type" },
];

const DEFAULT_GENERAL_PRIORITY_RULES = [
  { id: "general-1", pmType: "PMCUST" },
  { id: "general-2", pmType: "PMCHAIN" },
  { id: "general-3", pmType: "PMAREA" },
  { id: "general-4", pmType: "PMCTYPE" },
];

const EMPTY_RULE = {
  pmType: "PMCUST",
};

const getMatrixTypeLabel = (pmType) =>
  MATRIX_TYPE_OPTIONS.find((item) => item.value === pmType)?.label || pmType;

const renderModalPortal = (children) =>
  typeof document === "undefined" ? children : createPortal(children, document.body);

const normalizeRules = (rules = []) =>
  rules.map((item, index) => ({
    ...item,
    priority: index + 1,
  }));

const getFirstAvailablePmType = (activeRules = []) =>
  MATRIX_TYPE_OPTIONS.find(
    (option) => !activeRules.some((item) => item.pmType === option.value)
  )?.value || "";

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const extractPriorityCustomers = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    [];

  return parseJsonArray(raw)
    .filter((customer) => String(customer?.custCode || "").trim())
    .map((customer) => ({
      custCode: customer.custCode || "",
      custName: customer.custName || "",
      areaCode: customer.areaCode || "",
      chainCode: customer.chainCode || "",
      customerType: customer.customerType || "",
      priorityRules: normalizeRules(parseJsonArray(customer.priorityRules)),
    }));
};

const SalesPMCustomerPriority = forwardRef((props, ref) => {
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerLoadError, setCustomerLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState(null);
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [isSavingPriority, setIsSavingPriority] = useState(false);
  const [isDeletingPriority, setIsDeletingPriority] = useState(false);
  const [draggedRuleIndex, setDraggedRuleIndex] = useState(null);
  const [generalRules, setGeneralRules] = useState(() =>
    normalizeRules(DEFAULT_GENERAL_PRIORITY_RULES)
  );
  const [generalNewRule, setGeneralNewRule] = useState(() => ({
    pmType: getFirstAvailablePmType(DEFAULT_GENERAL_PRIORITY_RULES),
  }));
  const [isSavingGeneralPriority, setIsSavingGeneralPriority] = useState(false);
  const [draggedGeneralRuleIndex, setDraggedGeneralRuleIndex] = useState(null);

  const availableMatrixTypeOptions = useMemo(() => {
    const selectedTypes = new Set((rules || []).map((item) => item.pmType));
    return MATRIX_TYPE_OPTIONS.filter(
      (option) => !selectedTypes.has(option.value)
    );
  }, [rules]);

  const hasAvailableMatrixTypes = availableMatrixTypeOptions.length > 0;

  const availableGeneralMatrixTypeOptions = useMemo(() => {
    const selectedTypes = new Set((generalRules || []).map((item) => item.pmType));
    return MATRIX_TYPE_OPTIONS.filter(
      (option) => !selectedTypes.has(option.value)
    );
  }, [generalRules]);

  const hasAvailableGeneralMatrixTypes =
    availableGeneralMatrixTypeOptions.length > 0;

  const loadPriorityCustomers = useCallback(async () => {
    try {
      setIsLoadingCustomers(true);
      setCustomerLoadError("");

      const response = await apiClient.get("/getPriceMatrixPrio");
      setCustomers(extractPriorityCustomers(response));
    } catch (error) {
      setCustomerLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load customer priority rules."
      );
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  const displayedCustomers = useMemo(() => {
    const validCustomers = customers.filter((customer) =>
      String(customer?.custCode || "").trim()
    );

    if (!selectedCustomerFilter?.custCode) return validCustomers;

    return validCustomers.filter(
      (customer) =>
        String(customer.custCode || "").trim() ===
        String(selectedCustomerFilter.custCode || "").trim()
    );
  }, [customers, selectedCustomerFilter]);

  useEffect(() => {
    loadPriorityCustomers();
  }, [loadPriorityCustomers]);

  useEffect(() => {
    if (!showModal) return;

    const currentValue = String(newRule.pmType || "").trim();
    const hasCurrentValue = availableMatrixTypeOptions.some(
      (option) => option.value === currentValue
    );

    if (hasCurrentValue) return;

    setNewRule({
      pmType: availableMatrixTypeOptions[0]?.value || "",
    });
  }, [availableMatrixTypeOptions, newRule.pmType, showModal]);

  useEffect(() => {
    const currentValue = String(generalNewRule.pmType || "").trim();
    const hasCurrentValue = availableGeneralMatrixTypeOptions.some(
      (option) => option.value === currentValue
    );

    if (hasCurrentValue) return;

    setGeneralNewRule({
      pmType: availableGeneralMatrixTypeOptions[0]?.value || "",
    });
  }, [availableGeneralMatrixTypeOptions, generalNewRule.pmType]);

  const customerColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Action",
        sortable: false,
        filterable: false,
        width: 90,
        className: "text-center",
        render: (row) => (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenModal(row);
              }}
              title="Edit"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteCustomerPriority(row);
              }}
              disabled={isDeletingPriority || !row.priorityRules?.length}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
      {
        key: "custCode",
        label: "Customer Code",
        sortable: true,
        width: 140,
      },
      {
        key: "custName",
        label: "Customer Name",
        sortable: true,
        width: 220,
      },
      {
        key: "customerDetails",
        label: "Customer Details",
        sortable: false,
        width: 280,
        render: (row) => (
          <div className="space-y-1 py-1 text-[11px] leading-relaxed text-slate-700">
            <div>
              <span className="font-semibold text-slate-500">Area :</span>{" "}
              <span>{row.areaCode || "-"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Chain :</span>{" "}
              <span>{row.chainCode || "-"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">
                Customer Type :
              </span>{" "}
              <span>{row.customerType || "-"}</span>
            </div>
          </div>
        ),
      },
      {
        key: "assignedRules",
        label: "Assigned Rules",
        sortable: false,
        width: 220,
        render: (row) =>
          row.priorityRules?.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {row.priorityRules.slice(0, 4).map((rule, index) => (
                <span
                  key={rule.id || `${row.custCode}_${index}`}
                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                >
                  <span className="mr-1 rounded-full bg-blue-100 px-1.5 py-[1px] text-[10px] font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  {getMatrixTypeLabel(rule.pmType)}
                </span>
              ))}
              {row.priorityRules.length > 4 && (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  +{row.priorityRules.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">No rules</span>
          ),
      },
    ],
    []
  );

  const handleOpenModal = (customer, allowCustomerSelect = false) => {
    const normalizedRules = normalizeRules(customer.priorityRules || []);
    setShowCustomerSelector(allowCustomerSelect);
    setSelectedCustomer(customer);
    setRules(normalizedRules);
    setNewRule({
      pmType: getFirstAvailablePmType(normalizedRules),
    });
    setShowModal(true);
  };

  const handleOpenFindModal = () => {
    setShowCustomerSelector(true);
    setSelectedCustomer(null);
    setRules([]);
    setNewRule({
      pmType: getFirstAvailablePmType([]),
    });
    setDraggedRuleIndex(null);
    setShowModal(true);
  };

  const handleCustomerLookupSelect = (selected) => {
    setShowCustomerLookup(false);

    if (!selected?.custCode) return;

    const selectedCustCode = String(selected.custCode || "").trim();
    const existingCustomer = customers.find(
      (customer) =>
        String(customer.custCode || "").trim() === selectedCustCode
    );

    if (existingCustomer) {
      handleOpenModal(existingCustomer);
      return;
    }

    const customerForPriority = {
      ...selected,
      custCode: selectedCustCode,
      custName: selected.custName || "",
      areaCode: selected.areaCode || selected.area || "",
      chainCode: selected.chainCode || selected.chain || "",
      customerType: selected.customerType || selected.custType || "",
      priorityRules: [],
    };

    handleOpenModal(customerForPriority);
  };

  const handleDeleteCustomerPriority = async (customer) => {
    if (!customer?.custCode) return;

    const result = await swalDeleteConfirm(
      "Delete Priority?",
      `Remove special priority rules for ${customer.custCode} - ${customer.custName}?`,
      "Yes, delete"
    );

    if (!result.isConfirmed) return;

    const payload = {
      json_data: {
        custCode: customer.custCode,
      },
    };

    try {
      setIsDeletingPriority(true);
      await apiClient.post("/deletePriceMatrixPrio", payload);
      await loadPriorityCustomers();
      await swalSuccessAlert(
        "Deleted",
        "Customer priority rules deleted successfully."
      );
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete customer priority rules.",
      });
    } finally {
      setIsDeletingPriority(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowCustomerSelector(false);
    setSelectedCustomer(null);
    setRules([]);
    setNewRule({
      pmType: getFirstAvailablePmType([]),
    });
    setDraggedRuleIndex(null);
  };

  const reorderRules = (updatedRules) => {
    setRules(normalizeRules(updatedRules));
  };

  const handleRemoveRule = (index) => {
    reorderRules(rules.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const handleRuleDragStart = (index) => {
    setDraggedRuleIndex(index);
  };

  const handleRuleDragOver = (event) => {
    event.preventDefault();
  };

  const handleRuleDrop = (dropIndex) => {
    if (draggedRuleIndex === null || draggedRuleIndex === dropIndex) {
      setDraggedRuleIndex(null);
      return;
    }

    const updated = [...rules];
    const [draggedRule] = updated.splice(draggedRuleIndex, 1);
    updated.splice(dropIndex, 0, draggedRule);
    reorderRules(updated);
    setDraggedRuleIndex(null);
  };

  const handleRuleDragEnd = () => {
    setDraggedRuleIndex(null);
  };

  const reorderGeneralRules = (updatedRules) => {
    setGeneralRules(normalizeRules(updatedRules));
  };

  const handleRemoveGeneralRule = (index) => {
    reorderGeneralRules(
      generalRules.filter((_, ruleIndex) => ruleIndex !== index)
    );
  };

  const handleGeneralRuleDragStart = (index) => {
    setDraggedGeneralRuleIndex(index);
  };

  const handleGeneralRuleDragOver = (event) => {
    event.preventDefault();
  };

  const handleGeneralRuleDrop = (dropIndex) => {
    if (
      draggedGeneralRuleIndex === null ||
      draggedGeneralRuleIndex === dropIndex
    ) {
      setDraggedGeneralRuleIndex(null);
      return;
    }

    const updated = [...generalRules];
    const [draggedRule] = updated.splice(draggedGeneralRuleIndex, 1);
    updated.splice(dropIndex, 0, draggedRule);
    reorderGeneralRules(updated);
    setDraggedGeneralRuleIndex(null);
  };

  const handleGeneralRuleDragEnd = () => {
    setDraggedGeneralRuleIndex(null);
  };

  const handleAddGeneralRule = () => {
    if (!generalNewRule.pmType) return;

    const updatedRules = [
      ...generalRules,
      {
        id: `general-${Date.now()}`,
        pmType: generalNewRule.pmType,
      },
    ];

    reorderGeneralRules(updatedRules);
    setGeneralNewRule({
      pmType: getFirstAvailablePmType(updatedRules),
    });
  };

  const handleSaveGeneralPriority = async () => {
    if (isSavingGeneralPriority) return;

    const payload = {
      json_data: {
        custCode: "",
        priorityRules: generalRules.map((item, index) => ({
          priorityNo: index + 1,
          pmType: item.pmType,
        })),
      },
    };

    try {
      setIsSavingGeneralPriority(true);
      await apiClient.post("/upsertPriceMatrixPrio", payload);
      setShowGeneralModal(false);
      await loadPriorityCustomers();

      await swalSuccessAlert(
        "Saved",
        "General matrix priority updated successfully."
      );
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save general matrix priority.",
      });
    } finally {
      setIsSavingGeneralPriority(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.pmType) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Rule",
        text: "Please select a matrix type.",
      });
      return;
    }

    const isDuplicate = rules.some((item) => item.pmType === newRule.pmType);

    if (isDuplicate) {
      Swal.fire({
        icon: "warning",
        title: "Duplicate Rule",
        text: "Duplicate rule is not allowed.",
      });
      return;
    }

    const updatedRules = [
      ...rules,
      {
        id: Date.now(),
        pmType: newRule.pmType,
      },
    ];

    reorderRules(updatedRules);

    setNewRule({
      pmType: getFirstAvailablePmType(updatedRules),
    });
  };

  const handleSave = async () => {
    if (!selectedCustomer || isSavingPriority) return;

    const payload = {
      json_data: {
        custCode: selectedCustomer.custCode,
        priorityRules: rules.map((item, index) => ({
          priorityNo: index + 1,
          pmType: item.pmType,
        })),
      },
    };

    try {
      setIsSavingPriority(true);

      await apiClient.post("/upsertPriceMatrixPrio", payload);
      handleCloseModal();
      await loadPriorityCustomers();

      await swalSuccessAlert(
        "Saved",
        "Matrix priority rules updated successfully."
      );
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save matrix priority rules.",
      });
    } finally {
      setIsSavingPriority(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      openFind: handleOpenFindModal,
      resetFilters: () => setSelectedCustomerFilter(null),
    }),
    []
  );

  return (
    <div className="space-y-4">
      {(isLoadingCustomers || isDeletingPriority) && <LoadingSpinner />}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Matrix Priority
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set the sequence of matrix rules to apply for each customer.
            </p>
          </div>

          <div className="lg:max-w-[58%]">
            <div className="mb-2 flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                General Default
              </span>
              <button
                type="button"
                onClick={() => setShowGeneralModal(true)}
                className="inline-flex h-7 items-center justify-center rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                title="Configure Default"
              >
                <Settings size={13} />
                <span className="ml-1">Setup</span>
              </button>
            </div>

            {generalRules.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 lg:justify-end">
                {generalRules.map((rule, index) => (
                  <span
                    key={rule.id}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                  >
                    <span className="rounded-full bg-blue-100 px-1.5 py-[1px] text-[10px] font-semibold text-blue-700">
                      {index + 1}
                    </span>
                    {getMatrixTypeLabel(rule.pmType)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 lg:text-right">
                No general priority defined.
              </div>
            )}
          </div>
        </div>
      </div>

      {customerLoadError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {customerLoadError}
        </div>
      )}

      <div className="global-tran-table-main-div-ui relative z-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          docType="Matrix Priority Customers"
          columns={customerColumns}
          data={displayedCustomers}
          itemsPerPage={20}
          showFilters
          showGroupBy={true}
          showGlobalSearch
          selectedRow={null}
          onRowClick={() => {}}
          initialState={{ autoFillGrid: "True" }}
        />
      </div>

      {showModal &&
        renderModalPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]">
          <div
            className="flex max-h-[90vh] w-[480px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-800">
                    Configure Price Matrix Priority
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {selectedCustomer
                      ? `${selectedCustomer.custCode} - ${selectedCustomer.custName}`
                      : "Select a customer to configure special priority."}
                  </p>
                </div>

                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  onClick={handleCloseModal}
                  title="Close"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-4">
              <div className="space-y-4">
                {showCustomerSelector && !selectedCustomer && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Customer Priority
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Select a customer to configure its special matrix priority.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                      onClick={() => {
                        setShowModal(false);
                        setShowCustomerLookup(true);
                      }}
                    >
                      <Search size={14} className="mr-1.5" />
                      Select Customer
                    </button>
                  </div>
                </div>
                )}

                {selectedCustomer && (
                  <>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Add Rule
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Choose a matrix type and add it to the sequence.
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                      Add
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Matrix Type
                      </label>
                      <select
                        value={newRule.pmType}
                        onChange={(event) =>
                          setNewRule((prev) => ({
                            ...prev,
                            pmType: event.target.value || "PMCUST",
                          }))
                        }
                        disabled={!hasAvailableMatrixTypes}
                        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition ${
                          hasAvailableMatrixTypes
                            ? "border-slate-300 bg-white text-slate-800 focus:border-blue-500"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        {hasAvailableMatrixTypes ? (
                          availableMatrixTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        ) : (
                          <option value="">No more matrix types available</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!hasAvailableMatrixTypes}
                      className={`mb-[1px] flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white transition ${
                        hasAvailableMatrixTypes
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-300 text-slate-100"
                      }`}
                      onClick={handleAddRule}
                      title="Add Rule"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Priority Rules
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        The topmost rule is evaluated first.
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      {rules.length} Rule{rules.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  {rules.length > 0 ? (
                    <div className="space-y-2">
                      {rules.map((rule, index) => (
                        <div
                          key={rule.id}
                          draggable
                          onDragStart={() => handleRuleDragStart(index)}
                          onDragOver={handleRuleDragOver}
                          onDrop={() => handleRuleDrop(index)}
                          onDragEnd={handleRuleDragEnd}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
                            draggedRuleIndex === index
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <button
                              type="button"
                              draggable
                              onDragStart={() => handleRuleDragStart(index)}
                              onDragEnd={handleRuleDragEnd}
                              className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600 active:cursor-grabbing"
                              title="Drag to reorder"
                            >
                              <GripVertical size={14} />
                            </button>

                            <div className="flex h-8 min-w-[32px] shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-semibold text-blue-700">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold leading-none text-slate-800">
                                {getMatrixTypeLabel(rule.pmType)}
                              </div>
                              <div className="mt-1 text-[10px] leading-none text-slate-500">
                                Priority level {index + 1}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
                              onClick={() => handleRemoveRule(index)}
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <div className="text-sm font-semibold text-slate-600">
                        No priority rules added yet.
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Select a matrix type above, then add it to the sequence.
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                onClick={handleCloseModal}
                disabled={isSavingPriority}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
                onClick={handleSave}
                disabled={isSavingPriority || !selectedCustomer}
              >
                <FontAwesomeIcon icon={faSave} className="mr-1" />
                {isSavingPriority ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
        )}

      {showGeneralModal &&
        renderModalPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-[480px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-800">
                    Configure General Priority
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Default order used by customers without special priority.
                  </p>
                </div>

                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  onClick={() => setShowGeneralModal(false)}
                  title="Close"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Add Rule
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Add a matrix type to the default sequence.
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Default
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Matrix Type
                      </label>
                      <select
                        value={generalNewRule.pmType}
                        onChange={(event) =>
                          setGeneralNewRule({
                            pmType: event.target.value || "",
                          })
                        }
                        disabled={!hasAvailableGeneralMatrixTypes}
                        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition ${
                          hasAvailableGeneralMatrixTypes
                            ? "border-slate-300 bg-white text-slate-800 focus:border-blue-500"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        {hasAvailableGeneralMatrixTypes ? (
                          availableGeneralMatrixTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        ) : (
                          <option value="">No more matrix types available</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!hasAvailableGeneralMatrixTypes}
                      onClick={handleAddGeneralRule}
                      className={`mb-[1px] flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white transition ${
                        hasAvailableGeneralMatrixTypes
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-300 text-slate-100"
                      }`}
                      title="Add General Rule"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800">
                        General Priority Rules
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Drag to reorder the default priority.
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      {generalRules.length} Rule{generalRules.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  {generalRules.length > 0 ? (
                    <div className="space-y-2">
                      {generalRules.map((rule, index) => (
                        <div
                          key={rule.id}
                          draggable
                          onDragStart={() => handleGeneralRuleDragStart(index)}
                          onDragOver={handleGeneralRuleDragOver}
                          onDrop={() => handleGeneralRuleDrop(index)}
                          onDragEnd={handleGeneralRuleDragEnd}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
                            draggedGeneralRuleIndex === index
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <button
                              type="button"
                              draggable
                              onDragStart={() => handleGeneralRuleDragStart(index)}
                              onDragEnd={handleGeneralRuleDragEnd}
                              className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600 active:cursor-grabbing"
                              title="Drag to reorder"
                            >
                              <GripVertical size={14} />
                            </button>

                            <div className="flex h-8 min-w-[32px] shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-semibold text-blue-700">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold leading-none text-slate-800">
                                {getMatrixTypeLabel(rule.pmType)}
                              </div>
                              <div className="mt-1 text-[10px] leading-none text-slate-500">
                                Default priority level {index + 1}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
                            onClick={() => handleRemoveGeneralRule(index)}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <div className="text-sm font-semibold text-slate-600">
                        No general priority defined.
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Select a matrix type above, then add it to the sequence.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                onClick={() => setShowGeneralModal(false)}
                disabled={isSavingGeneralPriority}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
                onClick={handleSaveGeneralPriority}
                disabled={isSavingGeneralPriority}
              >
                <FontAwesomeIcon icon={faSave} className="mr-1" />
                {isSavingGeneralPriority ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
        )}

      {showCustomerLookup && (
        <CustomerMastLookupModal
          isOpen={showCustomerLookup}
          customParam="ActiveNonChain"
          onClose={handleCustomerLookupSelect}
        />
      )}
    </div>
  );
});

SalesPMCustomerPriority.displayName = "SalesPMCustomerPriority";

export default SalesPMCustomerPriority;
