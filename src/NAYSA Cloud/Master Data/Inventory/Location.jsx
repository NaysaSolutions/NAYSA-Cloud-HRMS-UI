import React, {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalValidationAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchWareMast from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";

const INITIAL_FORM = {
  whCode: "",
  whName: "",
  locCode: "",
  locName: "",
  locType: "",
  active: "Y",
  __existing: false,
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const parseSprocJsonResult = (rows) => {
  if (!rows) return [];
  const r = rows?.[0]?.result;
  if (typeof r === "string") {
    try {
      return JSON.parse(r);
    } catch {
      return [];
    }
  }
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object")
    return rows;
  return [];
};

const extractSprocValidation = (axiosResponse) => {
  const payload = axiosResponse?.data ?? axiosResponse;
  const data = payload?.data;
  if (
    Array.isArray(data) &&
    data[0] &&
    (data[0].errorCount !== undefined || data[0].errorcount !== undefined)
  ) {
    return {
      errorCount: Number(data[0].errorCount ?? data[0].errorcount ?? 0),
      errorMsg: String(data[0].errorMsg ?? data[0].errormsg ?? ""),
    };
  }
  return null;
};

// Expose functions to the parent wrapper using forwardRef
const Location = forwardRef(
  ({ isMobile, onMobileActionOpen, onStateChange }, ref) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [form, setForm] = useState(INITIAL_FORM);
    const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
    const [isEditing, setIsEditing] = useState(false);
    const [isWarehouseModalOpen, setWarehouseModalOpen] = useState(false);
    const [tblFieldArray, setTblFieldArray] = useState([]);

    const setField = (key, value) =>
      setForm((prev) => ({ ...prev, [key]: value }));

    useEffect(() => {
      let mounted = true;
      (async () => {
        const res = await useFieldLenghtCheck("LOCATION");
        if (mounted) setTblFieldArray(res || []);
      })();
      return () => {
        mounted = false;
      };
    }, []);

    const getMax = (col) => useGetFieldLength(tblFieldArray, col);

    const normalizeCode = (value) => String(value || "").trim().toUpperCase();

    const locationListQuery = useQuery({
      queryKey: ["locationList"],
      queryFn: async () => {
        const result = await apiClient.get("/location/location");
        return parseSprocJsonResult(result?.data?.data);
      },
    });

    const { data: dropdowns, isLoading: isDropdownLoading } = useQuery({
      queryKey: ["locDropdown"],
      queryFn: async () => {
        const [typ] = await Promise.all([
          useTopDocDropDown("LOCTYPE", "LOC_TYPE"),
        ]);
        return { typ };
      },
    });

    const locations = useMemo(() => {
      const selectedWarehouse = normalizeCode(form.whCode);

      let filtered = (locationListQuery.data || []).map((row) => ({
        whCode: row?.whCode ?? row?.WH_CODE ?? "",
        whName: row?.whName ?? row?.WH_NAME ?? "",
        locCode: row?.locCode ?? row?.LOC_CODE ?? "",
        locName: row?.locName ?? row?.LOC_NAME ?? "",
        locType: row?.locType ?? row?.LOC_TYPE ?? "",
        active: row?.active ?? row?.ACTIVE ?? "Y",
        registeredBy: row?.registeredBy ?? row?.REGISTERED_BY ?? row?.registered_by ?? "",
        registeredDate: row?.registeredDate ?? row?.REGISTERED_DATE ?? row?.registered_date ?? "",
        lastUpdatedBy: row?.lastUpdatedBy ?? row?.updatedBy ?? row?.UPDATED_BY ?? row?.updated_by ?? "",
        lastUpdatedDate: row?.lastUpdatedDate ?? row?.updatedDate ?? row?.UPDATED_DATE ?? row?.updated_date ?? "",
      }));

      if (selectedWarehouse) {
        filtered = filtered.filter(
          (loc) => normalizeCode(loc.whCode) === selectedWarehouse,
        );
      }

      return filtered;
    }, [locationListQuery.data, form.whCode]);

    const saveMutation = useMutation({
      mutationFn: async (payload) =>
        apiClient.post("/location/upsertLocation", {
          json_data: JSON.stringify(payload),
        }),
      onSuccess: async (response) => {
        const sprocValidation = extractSprocValidation(response);
        if (Number(sprocValidation?.errorCount ?? 0) > 0) {
          useSwalErrorAlert(
            "Validation Failed",
            String(sprocValidation?.errorMsg),
          );
          return;
        }
        await queryClient.invalidateQueries({ queryKey: ["locationList"] });
        useSwalSuccessAlert("Success!", "Location saved successfully.");
        handleReset();
      },
      onError: (error) => useSwalErrorAlertAPI("Error", error),
    });

    const deleteMutation = useMutation({
      mutationFn: async (payload) =>
        apiClient.post("/location/deleteLocation", { json_data: payload }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["locationList"] });
        useSwalDeleteRecord(
          "Deleted!",
          "Location record removed successfully.",
        );
        handleReset();
      },
      onError: (error) => useSwalErrorAlertAPI("Error", error),
    });

    // Calculate isSaving to use in the useEffect and the loading spinner
    const isSaving =
      saveMutation.isPending ||
      deleteMutation.isPending ||
      locationListQuery.isLoading ||
      isDropdownLoading;

    // Reactively send the current state back up to the parent component
    useEffect(() => {
      if (onStateChange) {
        onStateChange({ isEditing, isSaving });
      }
    }, [isEditing, isSaving, onStateChange]);

    const handleReset = () => {
      setForm(INITIAL_FORM);
      setRegistrationInfo(INITIAL_REG);
      setIsEditing(false);
    };

   const handleSave = async () => {
      if (!isEditing || saveMutation.isPending) return;
      const whCode = String(form.whCode || "").trim();
      const locCode = String(form.locCode || "").trim();
      const locName = String(form.locName || "").trim();
      const locType = String(form.locType || "").trim();

      if (!whCode || !locCode || !locName) {
        return useSwalValidationAlert({
          icon: "warning",
          title: "Required Field",
          message: "Warehouse, Location Code, and Location Name are required.",
        });
      }

      saveMutation.mutate({
        whCode,
        locCode,
        locName,
        locType,
        active: form.active,
        action: form.__existing ? "EDIT" : "ADD", // Added action type
        userCode: user?.USER_CODE || "ADMIN",     // FIX: Changed to uppercase USER_CODE
      });
    };

    const handleEdit = (row) => {
      setForm({ ...INITIAL_FORM, ...row, __existing: true });
      setRegistrationInfo({
        registeredBy: row.registeredBy,
        registeredDate: row.registeredDate,
        lastUpdatedBy: row.lastUpdatedBy,
        lastUpdatedDate: row.lastUpdatedDate,
      });
      setIsEditing(true);
    };

   const handleDelete = async (row) => {
      try {
        // 1. Check if the location is currently in use
        const checkRes = await apiClient.post("/location/checkInUsedLocation", {
          json_data: { locCode: row.locCode }
        });

        const inUseData = checkRes?.data?.data;
        
        // 2. Validate the result
        if (inUseData && inUseData.result === "1") {
          return useSwalErrorAlert(
            "Cannot Delete",
            `Location ${row.locCode} is currently in use by active records and cannot be deleted.`
          );
        }

        // 3. If not in use, proceed with normal delete confirmation
        const confirm = await useSwalDeleteConfirm(
          "Confirm Delete",
          `Delete location ${row.locCode}?`,
        );
        
        if (confirm?.isConfirmed) {
          deleteMutation.mutate({ whCode: row.whCode, locCode: row.locCode });
        }
      } catch (error) {
        useSwalErrorAlertAPI("Error", error);
      }
    };

    useImperativeHandle(ref, () => ({
      handleAdd: () => {
        handleReset();
        setIsEditing(true);
      },
      handleSave,
      handleReset,
      isEditing,
      isSaving,
    }));

    const columns = [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                isMobile
                  ? onMobileActionOpen(row, handleEdit, handleDelete)
                  : handleEdit(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                isMobile
                  ? onMobileActionOpen(row, handleEdit, handleDelete)
                  : handleDelete(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "locCode", label: "Location Code", sortable: true, width: 140 },
      { key: "locName", label: "Location Name", sortable: true, width: 200 },
      { key: "whCode", label: "Warehouse Code", sortable: true, width: 140 },
      { key: "whName", label: "Warehouse Name", sortable: true, width: 200 },
      {
        key: "locType",
        label: "Type",
        sortable: true,
        width: 120,
        render: (row) => {
          const match = dropdowns?.typ?.find(
            (d) => d.DROPDOWN_CODE === row.locType,
          );
          return match ? match.DROPDOWN_NAME : row.locType;
        },
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 90,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ];

    return (
      <div className="flex flex-col xl:flex-row gap-4 w-full h-auto xl:h-[calc(100vh-130px)]">
        {isSaving && <LoadingSpinner />}

        {/* LEFT SIDE: Entry Details & Registration Info */}
        <div className="w-full xl:w-[400px] flex flex-col gap-4 shrink-0">
          {/* Entry Details Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
            <h2 className="text-sm font-bold text-blue-600 mb-6 uppercase tracking-wider border-b pb-2">
              Entry Details
            </h2>

            <div className="space-y-4">
              {/* WAREHOUSE FIELD */}
              <FieldRenderer
                label="Warehouse"
                required
                type="lookup"
                value={form.whCode ? `${form.whCode} - ${form.whName}` : ""}
                onLookup={() => setWarehouseModalOpen(true)}
                disabled={false}
              />

              <FieldRenderer
                label="Location Code"
                required
                type="text"
                value={form.locCode}
                disabled={!isEditing || !form.whCode || form.__existing}
                onChange={(v) => setField("locCode", String(v).toUpperCase())}
                maxLength={getMax("LOC_CODE") || 20}
              />

              <FieldRenderer
                label="Location Name"
                required
                type="text"
                value={form.locName}
                disabled={!isEditing || !form.whCode}
                onChange={(v) => setField("locName", v)}
                maxLength={getMax("LOC_NAME") || 100}
              />

              <div className="grid grid-cols-2 gap-3">
                <FieldRenderer
                  label="Type"
                  type="select"
                  value={form.locType}
                  disabled={!isEditing}
                  options={dropdowns?.typ?.map((d) => ({
                    value: d.DROPDOWN_CODE,
                    label: d.DROPDOWN_NAME,
                  }))}
                  onChange={(v) => setField("locType", v)}
                />
                <FieldRenderer
                  label="Active?"
                  type="select"
                  value={form.active}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  disabled={!isEditing}
                  onChange={(v) => setField("active", v)}
                />
              </div>
            </div>
          </div>

          {/* Registration Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 xl:mb-0">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        {/* RIGHT SIDE: Global Reference Table */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col">
          <SearchGlobalReferenceTable
            docType="Location Master"
            columns={columns}
            data={locations}
            onRowDoubleClick={handleEdit}
            itemsPerPage={200}
            onMobileRowOpen={(row) =>
              onMobileActionOpen(row, handleEdit, handleDelete)
            }
            isLoading={locationListQuery.isLoading}
            onRefresh={() => locationListQuery.refetch()}
            tableSize="Half"
          />
        </div>

        {/* Modals */}
        <SearchWareMast
          isOpen={isWarehouseModalOpen}
          filter="Active" // <-- Changed "ActiveAll" to "Active" to match standard filtering logic
          onClose={(row) => {
            setWarehouseModalOpen(false);
            if (row) {
              setField("whCode", row.whCode);
              setField("whName", row.whName);
            }
          }}
        />
      </div>
    );
  },
);

export default Location;
