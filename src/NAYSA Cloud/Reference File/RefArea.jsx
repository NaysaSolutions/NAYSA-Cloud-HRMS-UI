import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faCircleCheck,
  faEdit,
  faFilePdf,
  faInfoCircle,
  faPlus,
  faSave,
  faTrashAlt,
  faUndo,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "AreaRef";

const DEFAULT_FORM = {
  areaCode: "",
  areaName: "",
  active: "Y",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeRecord = (record) => ({
  areaCode: record?.areaCode ?? record?.area_code ?? record?.code ?? "",
  areaName: record?.areaName ?? record?.area_description ?? record?.name ?? "",
  active: record?.active ?? record?.ACTIVE ?? record?.IS_ACTIVE ?? "N",
  registeredBy: record?.registeredBy ?? "",
  registeredDate: record?.registeredDate ?? "",
  lastUpdatedBy: record?.lastUpdatedBy ?? "",
  lastUpdatedDate: record?.lastUpdatedDate ?? "",
  __existing: false,
});

const RefArea = forwardRef(({ onStateChange }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const guideRef = useRef(null);
  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];
  const userCode =
    user?.userCode ||
    user?.USER_CODE ||
    user?.user_code ||
    user?.code ||
    "ADMIN";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);

  const selectedAreaCode = selectedRow?.areaCode ?? null;
  const isAdding = isEditing && !selectedAreaCode;

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
    setSelectedRow(null);
    setIsEditing(false);
    setIsDupCode(false);
  }, []);

  const areaListQuery = useQuery({
    queryKey: ["areaList"],
    queryFn: async () => {
      const res = await apiClient.get("/area");
      const rows = extractRows(res);
      return Array.isArray(rows) ? rows.map(normalizeRecord) : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const areas = useMemo(() => areaListQuery.data || [], [areaListQuery.data]);

  const checkDuplicate = async (areaCode) => {
    const code = String(areaCode || "").trim();
    if (!code) return false;

    const res = await apiClient.post("/checkDuplicateArea", {
      json_data: { areaCode: code },
    });

    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);

    return String(parsed?.result) === "1";
  };

  const checkInUsed = async (areaCode) => {
    const code = String(areaCode || "").trim();
    if (!code) return false;

    try {
      const res = await apiClient.post("/checkInUsedArea", {
        json_data: { areaCode: code },
      });

      const row0 = res?.data?.data?.[0] || {};
      const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
      const parsed = JSON.parse(raw);

      return String(parsed?.result) === "1";
    } catch {
      return false;
    }
  };

  const handleCodeValidate = async (arg) => {
    const isEvent = arg && typeof arg === "object" && "type" in arg;

    if (isEvent && arg.type === "keydown") {
      if (arg.key !== "Enter") return;
      enterValidatedRef.current = true;
    }

    if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
      enterValidatedRef.current = false;
      return;
    }

    const code = String(form.areaCode || "").trim();
    if (!code || !isEditing || form.__existing) return;

    const dup = await checkDuplicate(code);

    if (dup) {
      setIsDupCode(true);
      await useSwalErrorAlert(
        "Duplicate Entry",
        `Area Code "${code}" already exists.`,
      );
      setField("areaCode", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) =>
      apiClient.post("/upsertArea", {
        json_data: JSON.stringify({
          json_data: {
            areaCode: payload.areaCode,
            areaName: payload.areaName,
            active: payload.active,
            userCode: payload.userCode,
          },
        }),
      }),
    onSuccess: (response) => {
      const row = response?.data || {};
      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? "");

      if (errorcount > 0) {
        useSwalErrorAlert("Validation Error", errormsg || "Save failed.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["areaList"] });
      resetForm();
      useSwalSuccessAlert("Success!", "Area saved successfully.");
    },
    onError: (error) => {
      const msg = error?.response?.data?.message || "Failed to save area.";
      useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!isEditing || saveMutation.isPending) return;

    saveMutation.mutate({
      areaCode: String(form.areaCode || "").trim().toUpperCase(),
      areaName: String(form.areaName || "").trim(),
      active: form.active,
      userCode,
    });
  }, [form, isEditing, saveMutation, userCode]);

  const deleteMutation = useMutation({
    mutationFn: async (areaCode) =>
      apiClient.post("/deleteArea", {
        json_data: { areaCode, userCode },
      }),
    onSuccess: async (response, areaCode) => {
      const sqlRow = response?.data?.data?.[0] || response?.data || {};
      if (Number(sqlRow?.errorcount ?? 0) > 0) {
        await useSwalErrorAlert("Error", sqlRow?.errormsg || "Delete failed.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["areaList"] });
      await useSwalDeleteRecord("Deleted", `Area ${areaCode} has been removed.`);
      resetForm();
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      const code = row?.areaCode;
      if (!code) return;

      try {
        setIsCheckingDelete(true);
        const used = await checkInUsed(code);
        if (used) {
          return useSwalErrorAlert("Cannot Delete", `Area "${code}" is in use.`);
        }

        const confirm = await useSwalDeleteConfirm("Delete?", `Delete "${code}"?`);
        if (confirm?.isConfirmed) deleteMutation.mutate(code);
      } finally {
        setIsCheckingDelete(false);
      }
    },
    [deleteMutation],
  );

  const handleEdit = useCallback(
    async (row) => {
      const targetRow = row?.areaCode ? row : selectedRow;

      if (!targetRow?.areaCode) {
        await useSwalErrorAlert(
          "Selection Required",
          "Please select an Area record first.",
        );
        return;
      }

      setForm({
        ...normalizeRecord(targetRow),
        __existing: true,
      });
      setSelectedRow(targetRow);
      setIsEditing(true);
      setIsDupCode(false);
    },
    [selectedRow],
  );

  const startAdd = useCallback(() => {
    setForm(DEFAULT_FORM);
    setSelectedRow(null);
    setIsEditing(true);
    setIsDupCode(false);
    setTimeout(() => codeInputRef.current?.focus?.(), 0);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing) handleSave();
      }
    };

    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [handleSave, isEditing]);

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "areaCode",
        label: "Area Code",
        sortable: true,
        width: 120,
        minWidth: 120,
        requiredVisible: true,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {row.areaCode}
          </span>
        ),
      },
      {
        key: "areaName",
        label: "Area Name",
        sortable: true,
        width: 280,
        minWidth: 280,
        requiredVisible: true,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        minWidth: 100,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ],
    [handleDelete, handleEdit],
  );

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange]);

  useImperativeHandle(ref, () => ({
    add: startAdd,
    edit: handleEdit,
    save: handleSave,
    reset: () => resetForm(),
  }));

  const isBusy =
    areaListQuery.isLoading ||
    saveMutation.isPending ||
    deleteMutation.isPending ||
    isCheckingDelete;

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
              {reftables[DOC_TYPE] || "Area Codes"}
            </h1>
          </div>

          <div className="hidden md:flex justify-center w-full" />

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="hidden sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: startAdd,
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                    {
                      key: "save",
                      label: (
                        <span className="hidden sm:inline ml-1">Save</span>
                      ),
                      icon: faSave,
                      onClick: handleSave,
                      disabled:
                        !isEditing ||
                        isDupCode ||
                        saveMutation.isPending,
                      className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150 ${
                        !isEditing ||
                        isDupCode ||
                        saveMutation.isPending
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                      }`,
                    },
                    {
                      key: "reset",
                      label: (
                        <span className="hidden sm:inline ml-1">Reset</span>
                      ),
                      icon: faUndo,
                      onClick: () => resetForm(),
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${
                      isOpenGuide ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden origin-top-right animate-[fadeIn_0.12s_ease-out]">
                    <button
                      type="button"
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!pdfLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />
                      PDF Guide
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!videoLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24 sm:mt-24 grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] gap-3 w-full items-start">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg transition-colors duration-200 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-[11px] sm:text-[14px] p-1.5 text-gray-500 mt-0.5">
                {isEditing
                  ? selectedAreaCode
                    ? `Updating Record - ${selectedAreaCode}`
                    : "Fill in the fields below to add a new area"
                  : "Select Add or double-click a row to edit"}
              </p>
            </div>

            {isEditing && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ring-inset ${
                  isAdding
                    ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className={`text-[10px] ${
                    isAdding ? "text-blue-500" : "text-amber-500"
                  }`}
                />
                {isAdding ? "Adding" : "Editing"}
              </span>
            )}
          </div>

          <div
            id="ref-area-fields"
            className="grid grid-cols-1 md:grid-cols-1 gap-x-8 gap-y-3"
          >
            <FieldRenderer
              label="Area Code"
              required
              type="text"
              value={form.areaCode}
              inputRef={codeInputRef}
              maxLength={10}
              onChange={(v) =>
                setField("areaCode", String(v ?? "").toUpperCase())
              }
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={!isEditing || form.__existing}
            />

            <FieldRenderer
              label="Area Name"
              required
              type="text"
              value={form.areaName}
              maxLength={50}
              onChange={(v) => setField("areaName", v ?? "")}
              disabled={!isEditing}
            />

            <FieldRenderer
              label="Active"
              type="select"
              value={form.active}
              options={[
                { value: "Y", label: "Yes" },
                { value: "N", label: "No" },
              ]}
              onChange={(v) => setField("active", v ?? "N")}
              disabled={!isEditing}
            />
          </div>

          <div
            id="ref-area-registration"
            className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <RegistrationInfo layout="stacked" data={form} />
          </div>
        </div>

        <div className="global-tran-table-main-div-ui mt-0 min-w-0">
          <SearchGlobalReferenceTable
            docType={DOC_TYPE}
            columns={columns}
            data={areas}
            isLoading={areaListQuery.isLoading}
            onRowClick={(row) => setSelectedRow(row)}
            onRowDoubleClick={handleEdit}
            itemsPerPage={50}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ["areaList"] })
            }
            autoFillGrid="True"
          />
        </div>
      </div>
    </div>
  );
});

RefArea.displayName = "RefArea";

export default RefArea;
