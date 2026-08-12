import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  Eye,
  EyeOff,
  FileText,
  Grid2X2,
  Layers3,
  Menu,
  Minus,
  PanelLeftClose,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  SaveAll,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

import {
  apiClient,
  getTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "./AuthContext.jsx";
import {
  useSwalErrorAlertAPI,
  useSwalValidationAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const TABS = [
  {
    id: "switches",
    label: "Application Switch",
    description: "Review HS_OPTION configuration in tables.",
    icon: SlidersHorizontal,
  },
  {
    id: "documents",
    label: "Document Setup",
    description: "Maintain HS_DOC document definitions.",
    icon: Layers3,
  },
  {
    id: "dropdowns",
    label: "Document Dropdown",
    description: "Maintain HS_DROPDOWN records.",
    icon: FileText,
  },
  {
    id: "modules",
    label: "Module Licensing",
    description: "Remove and restore HS_MENU modules through a tenant JSON master.",
    icon: Boxes,
  },
  {
    id: "environment",
    label: "API Environment",
    description: "Update approved Laravel environment values.",
    icon: ServerCog,
  },
  {
    id: "license",
    label: "License Seats",
    description: "Monitor concurrent users and seat capacity.",
    icon: ShieldCheck,
  },
];

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r " +
  "from-[#0369a1] to-[#1d4ed8] px-4 py-2.5 text-sm font-extrabold text-white " +
  "shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
  "disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 " +
  "bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition " +
  "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50";

const errorText = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const OPTION_MODULES = [
  {
    id: "sales-order",
    label: "Sales Order",
    shortLabel: "SO",
    matches: (name) =>
      name.startsWith("SO_") || name.startsWith("SOAPP_"),
  },
  {
    id: "sales-invoice",
    label: "Sales Invoice & DR",
    shortLabel: "SI / DR",
    matches: (name) =>
      name.startsWith("SI_") || name.startsWith("DR_"),
  },
  {
    id: "purchasing",
    label: "Purchasing",
    shortLabel: "PUR",
    matches: (name) =>
      name.startsWith("PR_") ||
      name.startsWith("PO_") ||
      name.startsWith("JO_") ||
      name.startsWith("RRAPP_") ||
      name.startsWith("PRAPP_") ||
      name.startsWith("POAPP_") ||
      name.startsWith("JOAPP_") ||
      name.startsWith("CVAPP_") ||
      name.startsWith("PUR"),
  },
  {
    id: "inventory",
    label: "Inventory",
    shortLabel: "INV",
    matches: (name) =>
      name.startsWith("FGINV_") ||
      name.startsWith("RMINV_") ||
      name.startsWith("MSINV_") ||
      name.startsWith("INVUOM2_"),
  },
  {
    id: "item-settings",
    label: "Item Settings",
    shortLabel: "ITEM",
    matches: (name) => name.startsWith("ITEM_"),
  },
  {
    id: "general-ledger",
    label: "General Ledger",
    shortLabel: "GL",
    matches: (name) => name.startsWith("GL_"),
  },
  {
    id: "payroll",
    label: "Payroll",
    shortLabel: "PAY",
    matches: (name) => name.startsWith("MONTH13_"),
  },
  {
    id: "system",
    label: "System",
    shortLabel: "SYS",
    matches: (name) => name === "PATH_PRINTING",
  },
  {
    id: "other",
    label: "Other",
    shortLabel: "OTHER",
    matches: () => true,
  },
];

const optionModuleFor = (fieldName = "") => {
  const name = String(fieldName).toUpperCase();

  return (
    OPTION_MODULES.find(
      (module) =>
        module.id !== "other" && module.matches(name)
    )?.id || "other"
  );
};

const optionModuleLabel = (moduleId) =>
  OPTION_MODULES.find((module) => module.id === moduleId)?.label ||
  "Other";

const environmentGroupLabel = (groupId) => {
  const labels = {
    application: "Application",
    session: "Session & Security",
    services: "Connected Services",
    mail: "Mail Configuration",
    backend: "Laravel Environment",
  };

  return labels[groupId] || String(groupId || "Environment");
};

const cardSurface =
  "rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)]";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm " +
  "font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 " +
  "focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 " +
  "disabled:text-slate-500";

function Switch({ enabled, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition ${
        enabled ? "bg-blue-700" : "bg-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
          enabled ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function LoadingCards({ count = 6 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="h-3 w-24 rounded-full bg-slate-100" />
          <div className="mt-4 h-6 w-3/4 rounded-lg bg-slate-100" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ApplicationSwitchTab() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [activeModule, setActiveModule] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get("/heartstrong/options", {
        withCredentials: true,
      });

      const nextFields = (
        Array.isArray(data?.data?.fields) ? data.data.fields : []
      ).map((field) => ({
        ...field,
        dirty: false,
        moduleId: optionModuleFor(field.name),
      }));

      setFields(nextFields);

      setActiveModule((current) => {
        if (
          current &&
          nextFields.some((field) => field.moduleId === current)
        ) {
          return current;
        }

        return (
          OPTION_MODULES.find((module) =>
            nextFields.some((field) => field.moduleId === module.id)
          )?.id || ""
        );
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load application configuration",
        text: errorText(error, "HS_OPTION could not be retrieved."),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableModules = useMemo(
    () =>
      OPTION_MODULES.filter((module) =>
        fields.some((field) => field.moduleId === module.id)
      ).map((module) => {
        const moduleFields = fields.filter(
          (field) => field.moduleId === module.id
        );

        return {
          ...module,
          fieldCount: moduleFields.length,
          changedCount: moduleFields.filter(
            (field) =>
              field.controlType !== "switch" &&
              String(field.value ?? "") !==
                String(field.originalValue ?? "")
          ).length,
        };
      }),
    [fields]
  );

  const activeDefinition =
    availableModules.find(
      (module) => module.id === activeModule
    ) || availableModules[0];

  const activeFields = useMemo(
    () =>
      fields.filter(
        (field) => field.moduleId === activeDefinition?.id
      ),
    [activeDefinition?.id, fields]
  );

  const dirtyFields = activeFields.filter(
    (field) =>
      field.controlType !== "switch" &&
      String(field.value ?? "") !==
        String(field.originalValue ?? "")
  );

  const allDirtyFields = fields.filter(
    (field) =>
      field.controlType !== "switch" &&
      String(field.value ?? "") !==
        String(field.originalValue ?? "")
  );

  const toggle = async (fieldName, enabled) => {
    const previous = fields;

    setSavingField(fieldName);
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              enabled,
              value: enabled
                ? field.enabledValue
                : field.disabledValue,
            }
          : field
      )
    );

    try {
      const { data } = await apiClient.post(
        "/heartstrong/options",
        {
          field: fieldName,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      setFields((current) =>
        current.map((field) =>
          field.name === fieldName
            ? {
                ...field,
                enabled: Boolean(
                  data?.data?.enabled ?? enabled
                ),
                value:
                  data?.data?.storedValue ??
                  field.value,
              }
            : field
        )
      );
    } catch (error) {
      setFields(previous);

      await Swal.fire({
        icon: "error",
        title: "Unable to update switch",
        text: errorText(
          error,
          "The HS_OPTION switch was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSavingField("");
    }
  };

  const changeValue = (fieldName, value) => {
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              value,
              dirty:
                String(value ?? "") !==
                String(field.originalValue ?? ""),
            }
          : field
      )
    );
  };

  const resetValue = (fieldName) => {
    setFields((current) =>
      current.map((field) =>
        field.name === fieldName
          ? {
              ...field,
              value: field.originalValue ?? "",
              dirty: false,
            }
          : field
      )
    );
  };

  const persistValue = async (field, showSuccess = true) => {
    const { data } = await apiClient.post(
      "/heartstrong/options",
      {
        field: field.name,
        value: field.value,
      },
      {
        withCredentials: true,
      }
    );

    const storedValue =
      data?.data?.storedValue ?? field.value;

    setFields((current) =>
      current.map((item) =>
        item.name === field.name
          ? {
              ...item,
              value: storedValue ?? "",
              originalValue: storedValue ?? "",
              dirty: false,
            }
          : item
      )
    );

    if (showSuccess) {
      await Swal.fire({
        icon: "success",
        title: "Setting saved",
        text: `${field.label} was updated.`,
        timer: 1100,
        showConfirmButton: false,
      });
    }
  };

  const saveValue = async (field) => {
    setSavingField(field.name);

    try {
      await persistValue(field);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update setting",
        text: errorText(
          error,
          "The HS_OPTION value was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSavingField("");
    }
  };

  const saveFields = async (fieldsToSave, title) => {
    if (!fieldsToSave.length) return;

    const confirmation = await Swal.fire({
      icon: "question",
      title,
      text: `${fieldsToSave.length} changed ${
        fieldsToSave.length === 1 ? "value" : "values"
      } will be updated.`,
      showCancelButton: true,
      confirmButtonText: "Save changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) return;

    setSavingAll(true);
    const failed = [];

    for (const field of fieldsToSave) {
      try {
        await persistValue(field, false);
      } catch (error) {
        failed.push({ field, error });
      }
    }

    setSavingAll(false);

    if (failed.length) {
      await Swal.fire({
        icon: "warning",
        title: "Some values were not saved",
        text: `${failed.length} of ${fieldsToSave.length} updates failed.`,
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    await Swal.fire({
      icon: "success",
      title: "Settings saved",
      text: `${fieldsToSave.length} HS_OPTION ${
        fieldsToSave.length === 1 ? "value was" : "values were"
      } updated.`,
      timer: 1400,
      showConfirmButton: false,
    });
  };

  const renderInput = (field) => {
    const className =
      "w-full min-w-[180px] rounded-lg border border-slate-300 bg-white " +
      "px-3 py-2 text-sm font-semibold text-slate-800 outline-none " +
      "focus:border-sky-500 focus:ring-2 focus:ring-sky-100 " +
      "disabled:bg-slate-100 disabled:text-slate-500";

    if (field.controlType === "number") {
      return (
        <input
          type="number"
          step={field.numberStep || "1"}
          value={field.value ?? ""}
          onChange={(event) =>
            changeValue(field.name, event.target.value)
          }
          disabled={
            savingField === field.name || savingAll
          }
          className={className}
        />
      );
    }

    return (
      <input
        type="text"
        value={field.value ?? ""}
        maxLength={
          Number(field.maxLength) > 0
            ? Number(field.maxLength)
            : undefined
        }
        onChange={(event) =>
          changeValue(field.name, event.target.value)
        }
        disabled={
          savingField === field.name || savingAll
        }
        className={className}
      />
    );
  };

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Application Configuration
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Review and update HS_OPTION values in a compact table.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={load}
            disabled={loading || savingAll}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              saveFields(
                allDirtyFields,
                "Save all changed application values?"
              )
            }
            disabled={
              loading ||
              savingAll ||
              allDirtyFields.length === 0
            }
            className={primaryButton}
          >
            <SaveAll size={16} />
            Save All
            {allDirtyFields.length > 0
              ? ` (${allDirtyFields.length})`
              : ""}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingCards count={6} />
      ) : fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No HS_OPTION fields were found.
        </div>
      ) : (
        <>
          <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="flex min-w-max gap-2">
              {availableModules.map((module) => {
                const selected =
                  module.id === activeDefinition?.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() =>
                      setActiveModule(module.id)
                    }
                    className={`rounded-lg border px-4 py-2 text-left text-sm font-black transition ${
                      selected
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {module.label}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                        selected
                          ? "bg-white/15 text-white"
                          : module.changedCount > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {module.fieldCount}
                      {module.changedCount > 0
                        ? ` / ${module.changedCount} changed`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-slate-900">
                {activeDefinition?.label}
              </p>
              <p className="text-xs text-slate-500">
                {activeFields.length} configuration rows
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                saveFields(
                  dirtyFields,
                  `Save changed ${activeDefinition?.label} values?`
                )
              }
              disabled={
                savingAll || dirtyFields.length === 0
              }
              className={primaryButton}
            >
              <Save size={16} />
              Save Module
              {dirtyFields.length > 0
                ? ` (${dirtyFields.length})`
                : ""}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                      Setting
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                      Database Field
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                      Stored Value
                    </th>
                    <th className="min-w-[260px] px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                      Current / New Value
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="sticky right-0 whitespace-nowrap bg-slate-100 px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {activeFields.map((field) => {
                    const dirty =
                      field.controlType !== "switch" &&
                      String(field.value ?? "") !==
                        String(field.originalValue ?? "");

                    return (
                      <tr
                        key={field.name}
                        className={
                          dirty
                            ? "bg-amber-50/60"
                            : "hover:bg-sky-50/40"
                        }
                      >
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          {field.label}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                          {field.name}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {field.controlType === "switch"
                            ? "Switch"
                            : field.dataType}
                        </td>

                        <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-600">
                          {field.originalValue === null ||
                          field.originalValue === ""
                            ? "NULL / blank"
                            : String(field.originalValue)}
                        </td>

                        <td className="px-4 py-3">
                          {field.controlType === "switch" ? (
                            <div className="flex items-center gap-3">
                              <Switch
                                label={field.label}
                                enabled={Boolean(field.enabled)}
                                disabled={
                                  savingField === field.name ||
                                  savingAll
                                }
                                onChange={(next) =>
                                  toggle(field.name, next)
                                }
                              />
                              <span
                                className={`text-xs font-black ${
                                  field.enabled
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {field.enabled
                                  ? `Enabled (${field.enabledValue})`
                                  : `Disabled (${field.disabledValue})`}
                              </span>
                            </div>
                          ) : (
                            renderInput(field)
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              field.controlType === "switch"
                                ? field.enabled
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                                : dirty
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {field.controlType === "switch"
                              ? field.enabled
                                ? "Enabled"
                                : "Disabled"
                              : dirty
                                ? "Unsaved"
                                : "Saved"}
                          </span>
                        </td>

                        <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 text-right">
                          {field.controlType === "switch" ? (
                            <span className="text-xs font-semibold text-slate-400">
                              Auto-save
                            </span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {dirty && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    resetValue(field.name)
                                  }
                                  disabled={
                                    savingField === field.name ||
                                    savingAll
                                  }
                                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                  title="Discard change"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => saveValue(field)}
                                disabled={
                                  savingField === field.name ||
                                  savingAll ||
                                  !dirty
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-40"
                              >
                                <Save size={14} />
                                {savingField === field.name
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              Showing {activeFields.length} rows for{" "}
              {activeDefinition?.label}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RecordEditor({
  open,
  columns,
  initialValues,
  defaultValues = {},
  saving,
  title,
  subtitle,
  onClose,
  onSave,
}) {
  const editableColumns = useMemo(
    () =>
      columns.filter(
        (column) => !column.isIdentity
      ),
    [columns]
  );

  const [values, setValues] = useState({});

  useEffect(() => {
    if (!open) return;

    setValues(
      Object.fromEntries(
        editableColumns.map((column) => [
          column.name,
          initialValues?.[column.name] ??
            defaultValues?.[column.name] ??
            "",
        ])
      )
    );
  }, [
    defaultValues,
    editableColumns,
    initialValues,
    open,
  ]);

  if (!open) return null;

  const renderControl = (column) => {
    const value = values[column.name] ?? "";

    const updateValue = (nextValue) => {
      setValues((current) => ({
        ...current,
        [column.name]: nextValue,
      }));
    };

    const disabled =
      column.isPrimaryKey &&
      Boolean(initialValues);

    const className =
      "mt-2 w-full rounded-lg border border-slate-300 bg-white " +
      "px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none " +
      "focus:border-sky-500 focus:ring-2 focus:ring-sky-100 " +
      "disabled:bg-slate-100 disabled:text-slate-500";

    if (
      column.inputType === "select" &&
      Array.isArray(column.options)
    ) {
      return (
        <select
          value={value}
          onChange={(event) =>
            updateValue(event.target.value)
          }
          disabled={disabled}
          className={className}
        >
          {column.nullable && (
            <option value="">Blank</option>
          )}

          {column.options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={
          column.inputType === "number"
            ? "number"
            : "text"
        }
        value={value}
        maxLength={
          Number(column.maxLength) > 0
            ? Number(column.maxLength)
            : undefined
        }
        onChange={(event) =>
          updateValue(event.target.value)
        }
        disabled={disabled}
        className={className}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              {title ||
                (initialValues
                  ? "Edit Record"
                  : "Add Record")}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {subtitle || "HeartStrong setup"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {editableColumns.map((column) => (
              <label
                key={column.name}
                className="block"
              >
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  {column.label}

                  {!column.nullable &&
                    !column.isIdentity && (
                      <span className="ml-1 text-rose-500">
                        *
                      </span>
                    )}
                </span>

                {renderControl(column)}

                <span className="mt-1 block font-mono text-[10px] text-slate-400">
                  {column.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButton}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(values)}
            className={primaryButton}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


function DocumentSetupTab() {
  const [payload, setPayload] = useState({
    columns: [],
    keyColumns: [],
    moduleCodes: [],
    statuses: [],
    totalRows: 0,
    rows: [],
  });

  const [selectedModuleCode, setSelectedModuleCode] =
    useState("");
  const [selectedStatus, setSelectedStatus] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState({
    open: false,
    row: null,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/documents",
        {
          params: {
            ...(selectedModuleCode
              ? {
                  moduleCode: selectedModuleCode,
                }
              : {}),
            ...(selectedStatus
              ? {
                  docStatus: selectedStatus,
                }
              : {}),
          },
          withCredentials: true,
        }
      );

      setPayload({
        columns: Array.isArray(data?.data?.columns)
          ? data.data.columns
          : [],
        keyColumns: Array.isArray(
          data?.data?.keyColumns
        )
          ? data.data.keyColumns
          : [],
        moduleCodes: Array.isArray(
          data?.data?.moduleCodes
        )
          ? data.data.moduleCodes
          : [],
        statuses: Array.isArray(
          data?.data?.statuses
        )
          ? data.data.statuses
          : [],
        totalRows: Number(
          data?.data?.totalRows ?? 0
        ),
        rows: Array.isArray(data?.data?.rows)
          ? data.data.rows
          : [],
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load document setup",
        text: errorText(
          error,
          "HS_DOC could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedModuleCode, selectedStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    if (!query) return payload.rows;

    return payload.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [payload.rows, searchTerm]);

  const keysForRow = (row) =>
    Object.fromEntries(
      payload.keyColumns.map((name) => [
        name,
        row?.[name] ?? null,
      ])
    );

  const defaultValues = useMemo(
    () => ({
      ...(selectedModuleCode
        ? {
            MODULE_CODE: selectedModuleCode,
          }
        : {}),
      ...(selectedStatus
        ? {
            DOC_STAT: selectedStatus,
          }
        : {
            DOC_STAT: "Active",
          }),
    }),
    [selectedModuleCode, selectedStatus]
  );

  const saveRow = async (values) => {
    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/documents/save",
        {
          keys: editor.row
            ? keysForRow(editor.row)
            : null,
          values,
        },
        {
          withCredentials: true,
        }
      );

      setEditor({
        open: false,
        row: null,
      });

      await load();

      await Swal.fire({
        icon: "success",
        title: "Document setup saved",
        text:
          data?.message ||
          "HS_DOC was updated.",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to save document setup",
        text: errorText(
          error,
          "The HS_DOC record was not saved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleColumns = payload.columns;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Document Setup
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Maintain document definitions from HS_DOC. New
            HS_DOC columns are displayed automatically.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={selectedModuleCode}
            onChange={(event) => {
              setSelectedModuleCode(
                event.target.value
              );
              setSearchTerm("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-extrabold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All Modules</option>

            {payload.moduleCodes.map(
              (moduleCode) => (
                <option
                  key={moduleCode}
                  value={moduleCode}
                >
                  {moduleCode}
                </option>
              )
            )}
          </select>

          <select
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(
                event.target.value
              );
              setSearchTerm("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-extrabold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">
              All Document Statuses
            </option>

            {payload.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search documents..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-60"
            />
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setEditor({
                open: true,
                row: null,
              })
            }
            className={primaryButton}
          >
            <Plus size={16} />
            Add Document
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          Module: {selectedModuleCode || "All"}
        </span>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          Status: {selectedStatus || "All"}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {payload.totalRows} records
        </span>
      </div>

      <div className="mb-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <FileText
          size={18}
          className="mt-0.5 flex-none text-sky-700"
        />

        <p className="text-sm text-sky-800">
          Use Document Status to deactivate a
          document instead of deleting its master
          record.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[650px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.name}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="sticky right-0 bg-slate-100 px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!loading &&
                filteredRows.map(
                  (row, rowIndex) => (
                    <tr
                      key={
                        JSON.stringify(
                          keysForRow(row)
                        ) || rowIndex
                      }
                      className="hover:bg-sky-50/40"
                    >
                      {visibleColumns.map(
                        (column) => {
                          const value =
                            row?.[column.name];

                          const isStatus =
                            String(column.name)
                              .toUpperCase() ===
                            "DOC_STAT";

                          const isYesNo = [
                            "DOC_CENTRAL",
                            "DOC_APP",
                            "DOC_UPLOAD",
                          ].includes(
                            String(column.name)
                              .toUpperCase()
                          );

                          return (
                            <td
                              key={column.name}
                              className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 text-slate-700"
                              title={String(
                                value ?? ""
                              )}
                            >
                              {isStatus ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    String(value)
                                      .toLowerCase() ===
                                    "active"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {value || "—"}
                                </span>
                              ) : isYesNo ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    String(value)
                                      .toUpperCase() ===
                                    "Y"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {String(value)
                                    .toUpperCase() === "Y"
                                    ? "Yes"
                                    : String(value)
                                        .toUpperCase() ===
                                      "N"
                                      ? "No"
                                      : value || "—"}
                                </span>
                              ) : (
                                String(value ?? "") ||
                                "—"
                              )}
                            </td>
                          );
                        }
                      )}

                      <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              open: true,
                              row,
                            })
                          }
                          className="rounded-lg px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(
                        1,
                        visibleColumns.length + 1
                      )}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      No HS_DOC records were found.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
          Showing {filteredRows.length} of{" "}
          {payload.totalRows} records
        </div>
      </div>

      <RecordEditor
        open={editor.open}
        columns={payload.columns}
        initialValues={editor.row}
        defaultValues={defaultValues}
        saving={saving}
        title={
          editor.row
            ? "Edit Document Setup"
            : "Add Document Setup"
        }
        subtitle="HS_DOC"
        onClose={() =>
          setEditor({
            open: false,
            row: null,
          })
        }
        onSave={saveRow}
      />
    </section>
  );
}

function DocumentDropdownTab() {
  const [payload, setPayload] = useState({
    columns: [],
    keyColumns: [],
    docCodeColumn: "DOC_CODE",
    docCodes: [],
    totalRows: 0,
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDocCode, setSelectedDocCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editor, setEditor] = useState({
    open: false,
    row: null,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/document-dropdowns",
        {
          params: selectedDocCode
            ? { docCode: selectedDocCode }
            : {},
          withCredentials: true,
        }
      );

      setPayload({
        columns: Array.isArray(data?.data?.columns)
          ? data.data.columns
          : [],
        keyColumns: Array.isArray(data?.data?.keyColumns)
          ? data.data.keyColumns
          : [],
        docCodeColumn:
          data?.data?.docCodeColumn || "DOC_CODE",
        docCodes: Array.isArray(data?.data?.docCodes)
          ? data.data.docCodes
          : [],
        totalRows: Number(data?.data?.totalRows ?? 0),
        rows: Array.isArray(data?.data?.rows)
          ? data.data.rows
          : [],
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load document dropdowns",
        text: errorText(
          error,
          "HS_DROPDOWN could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDocCode]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return payload.rows;

    return payload.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [payload.rows, searchTerm]);

  const keysForRow = (row) => {
    const names = payload.keyColumns.length
      ? payload.keyColumns
      : payload.columns.map((column) => column.name);

    return Object.fromEntries(
      names.map((name) => [name, row?.[name] ?? null])
    );
  };

  const defaultValues = useMemo(() => {
    if (!selectedDocCode || !payload.docCodeColumn) {
      return {};
    }

    return {
      [payload.docCodeColumn]: selectedDocCode,
    };
  }, [payload.docCodeColumn, selectedDocCode]);

  const saveRow = async (values) => {
    setSaving(true);

    try {
      await apiClient.post(
        "/heartstrong/document-dropdowns/save",
        {
          keys: editor.row
            ? keysForRow(editor.row)
            : null,
          values,
        },
        {
          withCredentials: true,
        }
      );

      setEditor({
        open: false,
        row: null,
      });

      await load();

      await Swal.fire({
        icon: "success",
        title: "Document dropdown saved",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to save document dropdown",
        text: errorText(
          error,
          "The record was not saved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete this document dropdown?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      await apiClient.post(
        "/heartstrong/document-dropdowns/delete",
        {
          keys: keysForRow(row),
        },
        {
          withCredentials: true,
        }
      );

      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to delete document dropdown",
        text: errorText(
          error,
          "The record was not deleted."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    }
  };

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Document Dropdown
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Select a document code to display only its
            HS_DROPDOWN records.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="block">
            <span className="sr-only">
              Filter by document code
            </span>

            <select
              value={selectedDocCode}
              onChange={(event) => {
                setSelectedDocCode(event.target.value);
                setSearchTerm("");
              }}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-extrabold text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:min-w-[210px]"
            >
              <option value="">All Document Codes</option>

              {payload.docCodes.map((docCode) => (
                <option key={docCode} value={docCode}>
                  {docCode}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder={
                selectedDocCode
                  ? `Search ${selectedDocCode}...`
                  : "Search dropdown..."
              }
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:w-60"
            />
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setEditor({
                open: true,
                row: null,
              })
            }
            className={primaryButton}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          Document Code:{" "}
          <span className="text-blue-700">
            {selectedDocCode || "All"}
          </span>
        </span>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
          {payload.totalRows} matching records
        </span>

        {selectedDocCode && (
          <button
            type="button"
            onClick={() => {
              setSelectedDocCode("");
              setSearchTerm("");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 transition hover:bg-rose-100"
          >
            <X size={12} />
            Clear document filter
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[620px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {payload.columns.map((column) => (
                  <th
                    key={column.name}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!loading &&
                filteredRows.map((row, rowIndex) => (
                  <tr
                    key={
                      JSON.stringify(keysForRow(row)) ||
                      rowIndex
                    }
                    className="hover:bg-sky-50/50"
                  >
                    {payload.columns.map((column) => (
                      <td
                        key={column.name}
                        className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 text-slate-700"
                        title={String(
                          row?.[column.name] ?? ""
                        )}
                      >
                        {String(
                          row?.[column.name] ?? ""
                        ) || "—"}
                      </td>
                    ))}

                    <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            open: true,
                            row,
                          })
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-sky-700 hover:bg-sky-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRow(row)}
                        className="ml-1 rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(
                      1,
                      payload.columns.length + 1
                    )}
                    className="px-6 py-14 text-center text-slate-500"
                  >
                    {selectedDocCode
                      ? `No records were found for document code ${selectedDocCode}.`
                      : "No document dropdown records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
          Showing {filteredRows.length} of {payload.totalRows}{" "}
          records
          {selectedDocCode
            ? ` for ${selectedDocCode}`
            : ""}
        </div>
      </div>

      <RecordEditor
        open={editor.open}
        columns={payload.columns}
        initialValues={editor.row}
        defaultValues={defaultValues}
        saving={saving}
        title={
          editor.row
            ? "Edit Document Dropdown"
            : "Add Document Dropdown"
        }
        subtitle="HS_DROPDOWN"
        onClose={() =>
          setEditor({
            open: false,
            row: null,
          })
        }
        onSave={saveRow}
      />
    </section>
  );
}

function EnvironmentTab() {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/heartstrong/environment",
        {
          withCredentials: true,
        }
      );

      const nextSettings = Array.isArray(data?.data?.settings)
        ? data.data.settings
        : [];

      const nextValues = Object.fromEntries(
        nextSettings.map((setting) => [
          setting.key,
          setting.value ?? "",
        ])
      );

      setSettings(nextSettings);
      setValues(nextValues);
      setOriginal(nextValues);
      setVisibleSecrets({});
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load Laravel environment",
        text: errorText(
          error,
          "The approved environment settings could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changedValues = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(values).filter(
          ([key, value]) => value !== original[key]
        )
      ),
    [original, values]
  );

  const changedCount = Object.keys(changedValues).length;

  const grouped = useMemo(
    () =>
      settings.reduce((result, setting) => {
        const groupId =
          setting.group || setting.target || "backend";

        if (!result[groupId]) result[groupId] = [];
        result[groupId].push(setting);

        return result;
      }, {}),
    [settings]
  );

  const save = async () => {
    if (!changedCount) return;

    const confirmation = await Swal.fire({
      icon: "warning",
      title: `Update ${changedCount} environment values?`,
      text: "Laravel must be restarted after saving these changes.",
      showCancelButton: true,
      confirmButtonText: "Save environment",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) return;

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/environment",
        {
          values: changedValues,
        },
        {
          withCredentials: true,
        }
      );

      await load();

      await Swal.fire({
        icon: "success",
        title: "Laravel environment updated",
        text:
          data?.message ||
          "Restart the Laravel API to apply the changes.",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update Laravel environment",
        text: errorText(
          error,
          "The environment was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  const setValue = (key, value) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const renderControl = (setting) => {
    const key = setting.key;
    const value = values[key] ?? "";
    const className =
      "w-full min-w-[220px] rounded-lg border border-slate-300 bg-white " +
      "px-3 py-2 text-sm font-semibold text-slate-800 outline-none " +
      "focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

    if (
      ["APP_DEBUG", "SESSION_SECURE_COOKIE"].includes(key)
    ) {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (key === "MAIL_ENCRYPTION") {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          <option value="">None</option>
          <option value="tls">tls</option>
          <option value="ssl">ssl</option>
        </select>
      );
    }

    if (key === "LOG_LEVEL") {
      return (
        <select
          value={value}
          onChange={(event) =>
            setValue(key, event.target.value)
          }
          className={className}
        >
          {[
            "debug",
            "info",
            "notice",
            "warning",
            "error",
            "critical",
          ].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      );
    }

    if (setting.secret) {
      const visible = Boolean(visibleSecrets[key]);

      return (
        <div className="relative min-w-[240px]">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) =>
              setValue(key, event.target.value)
            }
            placeholder={
              setting.hasValue
                ? "Leave blank to keep existing secret"
                : setting.placeholder || ""
            }
            className={`${className} pr-10`}
          />

          <button
            type="button"
            onClick={() =>
              setVisibleSecrets((current) => ({
                ...current,
                [key]: !current[key],
              }))
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {visible ? (
              <EyeOff size={15} />
            ) : (
              <Eye size={15} />
            )}
          </button>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(event) =>
          setValue(key, event.target.value)
        }
        placeholder={setting.placeholder || ""}
        className={className}
      />
    );
  };

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            API Environment
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Approved Laravel environment values displayed in tables.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || saving}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={save}
            disabled={
              loading || saving || !changedCount
            }
            className={primaryButton}
          >
            <SaveAll size={16} />
            Save Environment
            {changedCount > 0
              ? ` (${changedCount})`
              : ""}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle
          size={18}
          className="mt-0.5 flex-none text-amber-600"
        />
        <p className="text-sm text-amber-800">
          Laravel must be restarted after saving environment changes.
          Secret values remain hidden and blank values keep the existing
          secret.
        </p>
      </div>

      {loading ? (
        <LoadingCards count={5} />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([groupId, items]) => (
            <div
              key={groupId}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
                <div>
                  <p className="font-black text-slate-900">
                    {environmentGroupLabel(groupId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {items.length} approved values
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 font-mono text-[10px] font-black text-slate-500">
                  Laravel API .env
                </span>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                        Setting
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                        Environment Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                        Stored Value
                      </th>
                      <th className="min-w-[280px] px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                        New Value
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((setting) => {
                      const dirty =
                        values[setting.key] !==
                        original[setting.key];

                      return (
                        <tr
                          key={setting.key}
                          className={
                            dirty
                              ? "bg-amber-50/60"
                              : "hover:bg-sky-50/40"
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-slate-900">
                              {setting.label}
                            </p>
                            {setting.help && (
                              <p className="mt-1 max-w-[300px] text-xs text-slate-500">
                                {setting.help}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                            {setting.key}
                          </td>

                          <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-600">
                            {setting.secret
                              ? setting.hasValue
                                ? "Configured"
                                : "Not configured"
                              : original[setting.key] === ""
                                ? "Blank"
                                : String(
                                    original[setting.key]
                                  )}
                          </td>

                          <td className="px-4 py-3">
                            {renderControl(setting)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                dirty
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {dirty ? "Changed" : "Saved"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}



function ModuleLicensingTab() {
  const [modules, setModules] = useState([]);
  const [meta, setMeta] = useState({});
  const [activeModuleCode, setActiveModuleCode] =
    useState("");
  const [
    selectedModuleCodes,
    setSelectedModuleCodes,
  ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const showValidation = useCallback(
    async ({
      title,
      message,
      details = [],
    }) => {
      const detailText = details.length
        ? `\n\n${details
            .map((detail) => `• ${detail}`)
            .join("\n")}`
        : "";

      return useSwalValidationAlert({
        icon: "warning",
        title,
        message: `${message}${detailText}`,
      });
    },
    []
  );

  const showApiError = useCallback(
    async ({
      title,
      error,
      fallback,
      details = [],
    }) => {
      const detailText = details.length
        ? `\n\n${details
            .map((detail) => `• ${detail}`)
            .join("\n")}`
        : "";

      return useSwalErrorAlertAPI(
        title,
        `${errorText(error, fallback)}${detailText}`
      );
    },
    []
  );

  const load = useCallback(
    async ({
      initial = false,
      silent = false,
    } = {}) => {
      if (initial) {
        setLoading(true);
      } else if (!silent) {
        setIsRefreshing(true);
      }

      try {
        const { data } = await apiClient.get(
          "/heartstrong/modules",
          {
            withCredentials: true,
          }
        );

        const payload = data?.data || {};
        const nextModules = Array.isArray(
          payload.modules
        )
          ? payload.modules
          : [];

        setModules(nextModules);
        setMeta({
          mode: payload.mode || "delete_restore",
          snapshotFile: payload.snapshotFile || "",
          snapshotCreatedAt:
            payload.snapshotCreatedAt || null,
          snapshotUpdatedAt:
            payload.snapshotUpdatedAt || null,
          totalMasterRows: Number(
            payload.totalMasterRows ?? 0
          ),
          totalExistingRows: Number(
            payload.totalExistingRows ?? 0
          ),
          totalMissingRows: Number(
            payload.totalMissingRows ?? 0
          ),
          tenant: payload.tenant || null,
        });

        setSelectedModuleCodes((current) => {
          const validCodes = new Set(
            nextModules.map((module) => module.code)
          );

          return current.filter((code) =>
            validCodes.has(code)
          );
        });

        setActiveModuleCode((current) => {
          if (
            current &&
            nextModules.some(
              (module) => module.code === current
            )
          ) {
            return current;
          }

          return nextModules[0]?.code || "";
        });
      } catch (error) {
        if (initial) {
          setModules([]);
          setSelectedModuleCodes([]);
        }

        await showApiError({
          title: "Unable to load module licensing",
          error,
          fallback:
            "The tenant HS_MENU JSON master could not be loaded.",
          details: [
            "Confirm that the selected tenant is reachable.",
            "Confirm that storage/app/heartstrong/modules is writable.",
          ],
        });
      } finally {
        if (initial) {
          setLoading(false);
        }

        if (!initial && !silent) {
          setIsRefreshing(false);
        }
      }
    },
    [showApiError]
  );

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  const activeModule =
    modules.find(
      (module) =>
        module.code === activeModuleCode
    ) || modules[0];

  const selectedModules = useMemo(() => {
    const selected = new Set(
      selectedModuleCodes
    );

    return modules.filter((module) =>
      selected.has(module.code)
    );
  }, [modules, selectedModuleCodes]);

  const selectedInstalledRows = useMemo(
    () =>
      selectedModules.reduce(
        (total, module) =>
          total +
          Number(module.existingCount ?? 0),
        0
      ),
    [selectedModules]
  );

  const selectedRemovedRows = useMemo(
    () =>
      selectedModules.reduce(
        (total, module) =>
          total +
          Number(module.missingCount ?? 0),
        0
      ),
    [selectedModules]
  );

  const allModulesSelected =
    modules.length > 0 &&
    selectedModuleCodes.length === modules.length;

  const filteredItems = useMemo(() => {
    const items = Array.isArray(
      activeModule?.items
    )
      ? activeModule.items
      : [];

    const query =
      searchTerm.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      [
        item.menuCode,
        item.menuName,
        item.subMenu,
        item.path,
        item.componentKey,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [activeModule, searchTerm]);

  const toggleModuleSelection = (moduleCode) => {
    setSelectedModuleCodes((current) =>
      current.includes(moduleCode)
        ? current.filter(
            (code) => code !== moduleCode
          )
        : [...current, moduleCode]
    );
  };

  const toggleSelectAllModules = () => {
    setSelectedModuleCodes(
      allModulesSelected
        ? []
        : modules.map((module) => module.code)
    );
  };

  const updateMenu = async (
    module,
    item,
    enabled
  ) => {
    const operationKey =
      `menu:${item.snapshotKey}`;

    if (!enabled) {
      const confirmation =
        await useSwalDeleteConfirm(
          "Remove Menu?",
          `This will permanently remove ${item.menuName} (${item.menuCode}) from HS_MENU. The record will remain recoverable from the tenant JSON master.`
        );

      if (!confirmation?.isConfirmed) return;
    }

    setSavingKey(operationKey);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules",
        {
          scope: "menu",
          snapshotKey: item.snapshotKey,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });

      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          data?.message ||
            `${item.menuName} restored successfully.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          data?.message ||
            `${item.menuName} has been removed.`
        );
      }
    } catch (error) {
      await showApiError({
        title: enabled
          ? "Unable to restore menu"
          : "Unable to remove menu",
        error,
        fallback:
          "The HS_MENU row was not updated.",
        details: [
          `${module?.code || "Module"} · ${
            item.menuCode || "Menu"
          }`,
        ],
      });
    } finally {
      setSavingKey("");
    }
  };

  const updateWholeModule = async (
    module,
    enabled
  ) => {
    if (!module) return;

    const operationKey =
      `module:${module.code}:${enabled}`;

    if (
      enabled &&
      Number(module.missingCount ?? 0) === 0
    ) {
      await showValidation({
        title: "Nothing to restore",
        message:
          "Every menu under this module is already installed in HS_MENU.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
      return;
    }

    if (
      !enabled &&
      Number(module.existingCount ?? 0) === 0
    ) {
      await showValidation({
        title: "Nothing to remove",
        message:
          "This module is already fully removed from HS_MENU.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
      return;
    }

    const confirmation = enabled
      ? await useSwalProceedConfirm(
          "Restore Module?",
          `${module.name} (${module.code}) will restore ${Number(
            module.missingCount ?? 0
          )} missing row(s) from the tenant JSON master.`,
          "Restore"
        )
      : await useSwalDeleteConfirm(
          "Remove Module?",
          `${module.name} (${module.code}) will permanently remove ${Number(
            module.existingCount ?? 0
          )} installed row(s) from HS_MENU. The rows remain recoverable from JSON.`
        );

    if (!confirmation?.isConfirmed) return;

    setSavingKey(operationKey);

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules",
        {
          scope: "module",
          moduleCode: module.code,
          enabled,
        },
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });

      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          data?.message ||
            `${module.name} restored successfully.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          data?.message ||
            `${module.name} has been removed.`
        );
      }
    } catch (error) {
      await showApiError({
        title: enabled
          ? "Unable to restore module"
          : "Unable to remove module",
        error,
        fallback:
          "The module rows were not updated.",
        details: [
          `${module.name} (${module.code})`,
        ],
      });
    } finally {
      setSavingKey("");
    }
  };

  const updateSelectedModules = async (
    enabled
  ) => {
    if (selectedModules.length === 0) {
      await showValidation({
        title: "No modules selected",
        message:
          "Select at least one module using the checkbox before continuing.",
        details: [
          "Use Select All to mark every module.",
          "You can still open a module without selecting it.",
        ],
        confirmButtonText: "Select Modules",
      });
      return;
    }

    const candidates = selectedModules.filter(
      (module) =>
        enabled
          ? Number(module.missingCount ?? 0) > 0
          : Number(module.existingCount ?? 0) > 0
    );

    if (candidates.length === 0) {
      await showValidation({
        title: enabled
          ? "Selected modules are already installed"
          : "Selected modules are already removed",
        message: enabled
          ? "None of the selected modules has a missing HS_MENU row to restore."
          : "None of the selected modules has an installed HS_MENU row to remove.",
        details: selectedModules
          .slice(0, 8)
          .map(
            (module) =>
              `${module.name} (${module.code})`
          ),
      });
      return;
    }

    const skippedCount =
      selectedModules.length - candidates.length;

    const affectedEstimate = candidates.reduce(
      (total, module) =>
        total +
        Number(
          enabled
            ? module.missingCount ?? 0
            : module.existingCount ?? 0
        ),
      0
    );

    const skippedMessage =
      skippedCount > 0
        ? ` ${skippedCount} selected module(s) will be skipped because they do not require this action.`
        : "";

    const confirmation = enabled
      ? await useSwalProceedConfirm(
          `Restore ${candidates.length} Selected Module(s)?`,
          `${affectedEstimate} missing row(s) will be restored from the tenant JSON master.${skippedMessage}`,
          "Restore Selected"
        )
      : await useSwalDeleteConfirm(
          `Remove ${candidates.length} Selected Module(s)?`,
          `${affectedEstimate} installed row(s) will be permanently removed from HS_MENU. The rows remain recoverable from JSON.${skippedMessage}`
        );

    if (!confirmation?.isConfirmed) return;

    setSavingKey(
      enabled
        ? "bulk-restore"
        : "bulk-remove"
    );

    let successfulModules = 0;
    let affectedRows = 0;
    const failedModules = [];

    for (const module of candidates) {
      try {
        const { data } = await apiClient.post(
          "/heartstrong/modules",
          {
            scope: "module",
            moduleCode: module.code,
            enabled,
          },
          {
            withCredentials: true,
          }
        );

        successfulModules += 1;
        affectedRows += Number(
          data?.data?.affectedRows ?? 0
        );
      } catch (error) {
        failedModules.push({
          module,
          message: errorText(
            error,
            "Unknown server error"
          ),
        });
      }
    }

    await load({ silent: true });

    setSelectedModuleCodes(
      failedModules.map(
        ({ module }) => module.code
      )
    );

    if (successfulModules > 0) {
      if (enabled) {
        await useSwalSuccessAlert(
          "Success!",
          `${successfulModules} module(s) restored. ${affectedRows} row(s) were inserted.`
        );
      } else {
        await useSwalDeleteRecord(
          "Removed",
          `${successfulModules} module(s) removed. ${affectedRows} row(s) were deleted.`
        );
      }
    }

    if (failedModules.length > 0) {
      await showApiError({
        title: `${failedModules.length} module operation(s) failed`,
        error: {
          message:
            "Some selected modules could not be updated. Failed modules remain selected.",
        },
        fallback:
          "Some modules could not be updated.",
        details: failedModules.map(
          ({ module, message }) =>
            `${module.name} (${module.code}): ${message}`
        ),
      });
    }

    setSavingKey("");
  };

  const restoreAll = async () => {
    if (Number(meta.totalMissingRows ?? 0) === 0) {
      await showValidation({
        title: "Nothing to restore",
        message:
          "Every row in the tenant JSON master is already installed in HS_MENU.",
      });
      return;
    }

    const confirmation =
      await useSwalProceedConfirm(
        "Restore All Removed Menus?",
        `${Number(
          meta.totalMissingRows ?? 0
        )} missing HS_MENU row(s) will be restored from the current tenant JSON master.`,
        "Restore All"
      );

    if (!confirmation?.isConfirmed) return;

    setSavingKey("reset-all");

    try {
      const { data } = await apiClient.post(
        "/heartstrong/modules/reset",
        {},
        {
          withCredentials: true,
        }
      );

      await load({ silent: true });
      setSelectedModuleCodes([]);

      await useSwalSuccessAlert(
        "Success!",
        data?.message ||
          "Missing HS_MENU rows were restored."
      );
    } catch (error) {
      await showApiError({
        title: "Unable to restore all modules",
        error,
        fallback:
          "HS_MENU could not be restored from JSON.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const totalMasterRows = Number(
    meta.totalMasterRows ?? 0
  );
  const totalExistingRows = Number(
    meta.totalExistingRows ?? 0
  );
  const totalMissingRows = Number(
    meta.totalMissingRows ?? 0
  );

  return (
    <section className="space-y-3">
      {(savingKey !== "" || isRefreshing) && (
        <LoadingSpinner />
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-4 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">
                Module Licensing
              </h2>

              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-100">
                JSON-backed
              </span>
            </div>

            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-blue-100/90">
              Select modules on the left. Review and
              manage the selected module's menus on the
              right.
            </p>

            {!!meta.snapshotFile && (
              <p
                className="mt-2 max-w-4xl truncate font-mono text-[10px] font-bold text-blue-200"
                title={meta.snapshotFile}
              >
                {meta.snapshotFile}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black">
              {modules.length} modules
            </span>

            <span className="rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-100">
              {totalExistingRows} installed
            </span>

            <span className="rounded-lg bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-100">
              {totalMissingRows} removed
            </span>

            <button
              type="button"
              onClick={restoreAll}
              disabled={
                loading ||
                savingKey !== "" ||
                totalMissingRows === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={14} />
              {savingKey === "reset-all"
                ? "Restoring..."
                : "Restore All"}
            </button>

            <button
              type="button"
              onClick={() => load()}
              disabled={
                loading ||
                savingKey !== "" ||
                isRefreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  loading || isRefreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingCards count={4} />
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No HS_MENU modules were found in the JSON master.
        </div>
      ) : (
        <div className="grid gap-3 xl:h-[calc(100vh-225px)] xl:min-h-[620px] xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Module Selection
                  </p>

                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {selectedModules.length} selected
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={allModulesSelected}
                    onChange={toggleSelectAllModules}
                    disabled={savingKey !== ""}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  {allModulesSelected
                    ? "Clear"
                    : "Select All"}
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedModules(true)
                  }
                  disabled={savingKey !== ""}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {savingKey === "bulk-restore"
                    ? "Restoring..."
                    : "Restore"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSelectedModules(false)
                  }
                  disabled={savingKey !== ""}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {savingKey === "bulk-remove"
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-black">
                <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700">
                  {selectedInstalledRows} installed rows
                </div>

                <div className="rounded-lg bg-rose-50 px-2.5 py-2 text-rose-700">
                  {selectedRemovedRows} removed rows
                </div>
              </div>
            </div>

            <div className="min-h-[320px] flex-1 overflow-y-auto p-2 xl:min-h-0">
              <div className="space-y-1.5">
                {modules.map((module) => {
                  const selected =
                    selectedModuleCodes.includes(
                      module.code
                    );
                  const active =
                    module.code ===
                    activeModule?.code;
                  const fullyRemoved =
                    Number(module.existingCount ?? 0) ===
                    0;
                  const fullyInstalled =
                    Number(module.missingCount ?? 0) ===
                    0;

                  return (
                    <div
                      key={module.code}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${
                        active
                          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-100"
                          : selected
                            ? "border-sky-300 bg-sky-50/60"
                            : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleModuleSelection(
                            module.code
                          )
                        }
                        disabled={savingKey !== ""}
                        title={`Select ${module.name}`}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setActiveModuleCode(
                            module.code
                          );
                          setSearchTerm("");
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-900">
                              {module.name}
                            </p>

                            <p className="mt-0.5 font-mono text-[10px] font-black text-blue-700">
                              {module.code}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                                fullyRemoved
                                  ? "bg-rose-100 text-rose-700"
                                  : fullyInstalled
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {fullyRemoved
                                ? "Removed"
                                : fullyInstalled
                                  ? "Installed"
                                  : "Partial"}
                            </span>

                            <p className="mt-1 text-[10px] font-black text-slate-500">
                              {module.existingCount ?? 0}/
                              {module.menuCount ?? 0}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-black text-slate-950">
                      {activeModule?.name}
                    </p>

                    <span className="rounded-full bg-blue-100 px-2 py-1 font-mono text-[9px] font-black text-blue-700">
                      {activeModule?.code}
                    </span>

                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black text-slate-600">
                      {activeModule?.existingCount ?? 0}/
                      {activeModule?.menuCount ?? 0} installed
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(
                          event.target.value
                        )
                      }
                      placeholder="Search menu..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-52"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateWholeModule(
                        activeModule,
                        true
                      )
                    }
                    disabled={
                      savingKey !== "" ||
                      Number(
                        activeModule?.missingCount ?? 0
                      ) === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {savingKey ===
                    `module:${activeModule?.code}:true`
                      ? "Restoring..."
                      : "Restore Module"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateWholeModule(
                        activeModule,
                        false
                      )
                    }
                    disabled={
                      savingKey !== "" ||
                      Number(
                        activeModule?.existingCount ?? 0
                      ) === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {savingKey ===
                    `module:${activeModule?.code}:false`
                      ? "Removing..."
                      : "Remove Module"}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-[360px] flex-1 overflow-auto xl:min-h-0">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Menu Code
                    </th>

                    <th className="min-w-[220px] px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Menu Name
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Sub Menu
                    </th>

                    <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Visibility
                    </th>

                    <th className="sticky right-0 bg-slate-100 px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Installed
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const key =
                      item.snapshotKey;
                    const operationKey =
                      `menu:${key}`;

                    return (
                      <tr
                        key={key}
                        className={
                          item.exists
                            ? "hover:bg-sky-50/40"
                            : "bg-rose-50/50 hover:bg-rose-50"
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] font-black text-blue-700">
                          {item.menuCode || "—"}
                        </td>

                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          {item.menuName || "—"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {item.subMenu || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${
                              item.isVisible
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.isVisible
                              ? "Visible"
                              : "Hidden"}
                          </span>
                        </td>

                        <td
                          className={`sticky right-0 px-3 py-2.5 ${
                            item.exists
                              ? "bg-white"
                              : "bg-rose-50"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              label={`Install ${item.menuName}`}
                              enabled={Boolean(
                                item.exists
                              )}
                              disabled={
                                savingKey !== ""
                              }
                              onChange={(next) =>
                                updateMenu(
                                  activeModule,
                                  item,
                                  next
                                )
                              }
                            />

                            <span
                              className={`min-w-[72px] text-left text-[10px] font-black ${
                                item.exists
                                  ? "text-emerald-700"
                                  : "text-rose-600"
                              }`}
                            >
                              {savingKey === operationKey
                                ? "Updating..."
                                : item.exists
                                  ? "Installed"
                                  : "Removed"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-slate-500"
                      >
                        No matching menu rows were found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredItems.length} menu row(s)
                displayed.
              </span>

              <span>
                Removed rows remain recoverable from JSON.
              </span>
            </div>
          </main>
        </div>
      )}
    </section>
  );
}

function LicenseSeatsTab() {
  const [status, setStatus] = useState(null);
  const [seatCount, setSeatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSeatNumbers, setShowSeatNumbers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get(
        "/license-management/status",
        {
          withCredentials: true,
        }
      );

      const next = data?.data ?? null;
      setStatus(next);
      setSeatCount(Number(next?.seatCap ?? 0));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to load license seats",
        text: errorText(
          error,
          "The license seat setup could not be retrieved."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentCap = Number(status?.seatCap ?? 0);
  const activeSeats = Number(status?.activeSeats ?? 0);
  const remainingSeats = Number(
    status?.remainingSeats ?? 0
  );
  const proposedCap = Number(seatCount ?? 0);
  const hasChanges =
    Number.isInteger(proposedCap) &&
    proposedCap !== currentCap;

  const utilization =
    currentCap > 0
      ? Math.min(
          100,
          Math.round(
            (activeSeats / currentCap) * 100
          )
        )
      : 0;

  const revealSeatNumbers = () => {
    setShowSeatNumbers(true);
  };

  const hideSeatNumbers = () => {
    setShowSeatNumbers(false);
  };

  const displaySeatNumber = (value) => {
    if (loading) return "—";

    return showSeatNumbers ? String(value) : "•••";
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(status?.activeUsers)
      ? status.activeUsers
      : [];

    const query = searchTerm.trim().toLowerCase();

    if (!query) return users;

    return users.filter((row) => {
      const code = String(
        row.USER_CODE ?? row.user_code ?? ""
      ).toLowerCase();

      const name = String(
        row.USER_NAME ?? row.user_name ?? ""
      ).toLowerCase();

      return (
        code.includes(query) ||
        name.includes(query)
      );
    });
  }, [searchTerm, status?.activeUsers]);

  const save = async () => {
    const count = Number(seatCount);

    if (!Number.isInteger(count) || count < 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid seat count",
        text: "Enter a whole number equal to or greater than zero.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    if (!hasChanges) return;

    const result = await Swal.fire({
      icon:
        count < activeSeats
          ? "warning"
          : "question",
      title: "Update license seats?",
      text:
        count < activeSeats
          ? `There are currently ${activeSeats} occupied seats based on LOGIN_STAT = 1.`
          : `Change the allowed seats from ${currentCap} to ${count}?`,
      showCancelButton: true,
      confirmButtonText: "Save changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!result.isConfirmed) return;

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/license-management/seats",
        { count },
        {
          withCredentials: true,
        }
      );

      await Swal.fire({
        icon: "success",
        title: "License seats updated",
        text:
          data?.message ||
          "The seat capacity was updated successfully.",
        confirmButtonColor: "#1d4ed8",
      });

      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update license seats",
        text: errorText(
          error,
          "The license seat capacity was not updated."
        ),
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            License Seat Setup
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Occupied seats are based on USERS.LOGIN_STAT = 1,
            not the number of users with ACTIVE = Y. Seat numbers are
            hidden by default; press and hold the eye button to reveal them.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onPointerDown={revealSeatNumbers}
            onPointerUp={hideSeatNumbers}
            onPointerCancel={hideSeatNumbers}
            onPointerLeave={hideSeatNumbers}
            onContextMenu={(event) => event.preventDefault()}
            className={secondaryButton}
            aria-label="Press and hold to reveal seat numbers"
            title="Press and hold to reveal seat numbers"
          >
            {showSeatNumbers ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
            {showSeatNumbers
              ? "Release to Hide"
              : "Hold to Reveal"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                License Metric
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                Current Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                Basis
              </th>
              <th className="min-w-[260px] px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                Update
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900">
                Seat Capacity
              </td>
              <td className="px-4 py-3 text-lg font-black text-blue-700">
                {displaySeatNumber(currentCap)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                Encrypted LAC value in HS_SYS
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type={
                        showSeatNumbers ? "number" : "password"
                      }
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={seatCount}
                      onChange={(event) =>
                        setSeatCount(event.target.value)
                      }
                      className="w-32 rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-center font-black tracking-widest outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      aria-label="Allowed license seats"
                    />

                    <button
                      type="button"
                      onPointerDown={revealSeatNumbers}
                      onPointerUp={hideSeatNumbers}
                      onPointerCancel={hideSeatNumbers}
                      onPointerLeave={hideSeatNumbers}
                      onContextMenu={(event) =>
                        event.preventDefault()
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                      aria-label="Press and hold to reveal allowed seats"
                      title="Press and hold to reveal"
                    >
                      {showSeatNumbers ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={save}
                    disabled={
                      loading ||
                      saving ||
                      !hasChanges
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-40"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save"}
                  </button>

                  <span className="text-[11px] font-semibold text-slate-400">
                    Press and hold the eye to view
                  </span>
                </div>
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900">
                Occupied Seats
              </td>
              <td className="px-4 py-3 text-lg font-black text-emerald-700">
                {displaySeatNumber(activeSeats)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                USERS.LOGIN_STAT = 1, excluding HEARTSTRONG
                and MIRACLE
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                Updated by active login sessions
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900">
                Remaining Seats
              </td>
              <td className="px-4 py-3 text-lg font-black text-amber-700">
                {displaySeatNumber(remainingSeats)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                Seat Capacity − Occupied Seats
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                Calculated automatically
              </td>
            </tr>

            <tr>
              <td className="px-4 py-3 font-extrabold text-slate-900">
                Utilization
              </td>
              <td className="px-4 py-3 text-lg font-black text-slate-950">
                {loading ? "—" : `${utilization}%`}
              </td>
              <td className="px-4 py-3 text-slate-600">
                Occupied Seats ÷ Seat Capacity
              </td>
              <td className="px-4 py-3">
                <div className="h-2.5 min-w-[220px] overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      utilization >= 90
                        ? "bg-rose-500"
                        : utilization >= 70
                          ? "bg-amber-500"
                          : "bg-blue-700"
                    }`}
                    style={{
                      width: `${utilization}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-900">
              Users Occupying License Seats
            </p>
            <p className="text-xs text-slate-500">
              Current users with LOGIN_STAT = 1
            </p>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search user..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-60"
            />
          </div>
        </div>

        <div className="max-h-[500px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                  User Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                  User Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600">
                  Login Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">
                  Last Seen
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 4 }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td
                        colSpan={4}
                        className="px-4 py-4"
                      >
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                filteredUsers.map((row) => {
                  const code =
                    row.USER_CODE ??
                    row.user_code ??
                    "—";

                  return (
                    <tr
                      key={code}
                      className="hover:bg-sky-50/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-black text-blue-700">
                        {code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {row.USER_NAME ??
                          row.user_name ??
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          LOGIN_STAT = 1
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {row.LAST_SEEN_AT ??
                          row.last_seen_at ??
                          "—"}
                      </td>
                    </tr>
                  );
                })}

              {!loading &&
                filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No users are currently occupying
                      license seats.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
          Showing {filteredUsers.length} occupied seats
        </div>
      </div>
    </section>
  );
}

export default function HeartStrong() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("switches");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(() => ({
    code:
      getTenant?.() ||
      localStorage.getItem("companyCode") ||
      "",
    company: "",
    database: "",
  }));

  useEffect(() => {
    let cancelled = false;

    const resolveCurrentTenant = async () => {
      const selectedCode = String(
        getTenant?.() ||
          localStorage.getItem("companyCode") ||
          ""
      ).trim();

      if (!selectedCode) {
        if (!cancelled) {
          setCurrentTenant({
            code: "",
            company: "",
            database: "",
          });
        }
        return;
      }

      try {
        const { data } = await apiClient.get("/companies", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : data?.data && typeof data.data === "object"
              ? Object.values(data.data)
              : [];

        const selectedUpper = selectedCode.toUpperCase();

        const matchedTenant = rows.find((row) => {
          const rowCode = String(
            row?.code ?? row?.CODE ?? ""
          )
            .trim()
            .toUpperCase();

          const rowDatabase = String(
            row?.database ?? row?.DATABASE ?? ""
          )
            .trim()
            .toUpperCase();

          return (
            rowCode === selectedUpper ||
            rowDatabase === selectedUpper
          );
        });

        if (cancelled) return;

        setCurrentTenant({
          code: selectedCode,
          company: String(
            matchedTenant?.company ??
              matchedTenant?.COMPANY ??
              ""
          ).trim(),
          database: String(
            matchedTenant?.database ??
              matchedTenant?.DATABASE ??
              ""
          ).trim(),
        });
      } catch (error) {
        console.warn(
          "Unable to resolve selected tenant details:",
          error
        );

        if (!cancelled) {
          setCurrentTenant({
            code: selectedCode,
            company: "",
            database: "",
          });
        }
      }
    };

    const handleTenantChange = () => {
      resolveCurrentTenant();
    };

    resolveCurrentTenant();

    window.addEventListener("focus", handleTenantChange);
    window.addEventListener("storage", handleTenantChange);
    window.addEventListener(
      "tenant-changed",
      handleTenantChange
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        "focus",
        handleTenantChange
      );
      window.removeEventListener(
        "storage",
        handleTenantChange
      );
      window.removeEventListener(
        "tenant-changed",
        handleTenantChange
      );
    };
  }, []);

  useEffect(() => {
    const toggleFromNavbar = () => {
      setSidebarOpen((current) => !current);
    };

    window.addEventListener(
      "heartstrong:toggle-sidebar",
      toggleFromNavbar
    );

    return () => {
      window.removeEventListener(
        "heartstrong:toggle-sidebar",
        toggleFromNavbar
      );
    };
  }, []);

  const canManage = useMemo(
    () =>
      ["LICENSE_ADMIN", "SYSTEM_ADMIN"].includes(
        String(user?.ACCOUNT_MODE || "").toUpperCase()
      ),
    [user?.ACCOUNT_MODE]
  );

  const activeDefinition =
    TABS.find((tab) => tab.id === activeTab) || TABS[0];

  const ActiveDefinitionIcon = activeDefinition.icon;

  const ActiveTab =
    activeTab === "switches"
      ? ApplicationSwitchTab
      : activeTab === "documents"
        ? DocumentSetupTab
        : activeTab === "dropdowns"
          ? DocumentDropdownTab
          : activeTab === "modules"
            ? ModuleLicensingTab
            : activeTab === "environment"
              ? EnvironmentTab
              : LicenseSeatsTab;

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  if (!canManage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <Settings2
            className="mx-auto text-slate-400"
            size={42}
          />
          <h1 className="mt-4 text-xl font-black text-slate-950">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account is not allowed to access HeartStrong.
          </p>
        </div>
      </div>
    );
  }

  const accountCode =
    user?.SYSTEM_ACCOUNT_CODE ||
    user?.PERMISSION_USER_CODE ||
    user?.USER_CODE ||
    "HEARTSTRONG";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(186,230,253,.55),_transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eff6ff_46%,#e0f2fe_100%)]">
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
        <header className="relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-r from-slate-950 via-blue-950 to-sky-900 text-white shadow-[0_22px_70px_rgba(15,23,42,.22)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 18%, rgba(125,211,252,.28), transparent 30%), radial-gradient(circle at 92% 8%, rgba(255,255,255,.16), transparent 28%), linear-gradient(120deg, transparent 35%, rgba(255,255,255,.06) 50%, transparent 65%)",
            }}
          />

          <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-9">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl border border-white/20 bg-white/95 p-2 shadow-xl sm:h-20 sm:w-20">
                <img
                  src="/naysa_logo.png"
                  alt="NAYSA Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                    System Configuration
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                    <CheckCircle2 size={12} />
                    Online
                  </span>
                </div>

                <h1 className="mt-3 truncate text-3xl font-black tracking-tight sm:text-4xl">
                  HeartStrong
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                  Secure application, module, environment, and license
                  setup for NAYSA Financials.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
              >
                <Menu size={17} />
                Setup Navigation
              </button>

              <div className="min-w-[220px] rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-300/15 text-amber-200">
                    <Database size={17} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-200/80">
                      Current Tenant
                    </p>
                    <p
                      className="mt-0.5 truncate text-sm font-black text-white"
                      title={
                        currentTenant.company ||
                        currentTenant.code ||
                        "No tenant selected"
                      }
                    >
                      {currentTenant.company ||
                        currentTenant.code ||
                        "No tenant selected"}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-100/80">
                      {currentTenant.code || "No code"}
                      {currentTenant.database
                        ? ` • ${currentTenant.database}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Signed in as
                </p>
                <p className="mt-0.5 text-sm font-black text-white">
                  {accountCode}
                  <span className="ml-2 font-semibold text-sky-300">
                    {user?.ACCOUNT_MODE}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {sidebarOpen && (
          <div className="fixed inset-0 z-[120] flex">
            <aside className="relative flex h-full w-[330px] max-w-[90vw] flex-col overflow-hidden bg-slate-950 text-white shadow-2xl">
              <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-blue-950 to-slate-950 p-5">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-400/10 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-300">
                      HeartStrong
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Setup Navigation
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Choose the configuration area to manage.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Close setup navigation"
                  >
                    <PanelLeftClose size={19} />
                  </button>
                </div>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                {TABS.map((tab, index) => {
                  const Icon = tab.icon;
                  const selected = tab.id === activeTab;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                        selected
                          ? "border-sky-400/40 bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-lg shadow-blue-950/30"
                          : "border-white/5 bg-white/[0.035] text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
                          selected
                            ? "bg-white/15 text-white"
                            : "bg-white/5 text-slate-400 group-hover:text-white"
                        }`}
                      >
                        <Icon size={18} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold">
                          {tab.label}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-xs ${
                            selected
                              ? "text-blue-100"
                              : "text-slate-500"
                          }`}
                        >
                          {tab.description}
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black ${
                            selected
                              ? "text-blue-100"
                              : "text-slate-600"
                          }`}
                        >
                          0{index + 1}
                        </span>
                        <ChevronRight
                          size={15}
                          className={
                            selected
                              ? "text-white"
                              : "text-slate-600"
                          }
                        />
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-white/10 p-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                  <p className="text-xs font-black text-slate-300">
                    Protected setup area
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Available only to LICENSE_ADMIN and SYSTEM_ADMIN
                    accounts.
                  </p>
                </div>
              </div>
            </aside>

            <button
              type="button"
              className="flex-1 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close setup navigation overlay"
            />
          </div>
        )}

        <main className="py-5">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-200">
                <ActiveDefinitionIcon size={20} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <span>HeartStrong</span>
                  <ChevronRight size={13} />
                  <span className="truncate text-blue-700">
                    {activeDefinition.label}
                  </span>
                </div>

                <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                  {activeDefinition.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={secondaryButton}
            >
              <Menu size={16} />
              Change Section
            </button>
          </div>

          <div className="rounded-[28px] border border-white/90 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,.09)] backdrop-blur sm:p-6 lg:p-7">
            <ActiveTab />
          </div>
        </main>
      </div>
    </div>
  );
}