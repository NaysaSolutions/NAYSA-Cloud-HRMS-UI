// import React, { useEffect, useMemo, useState, useCallback } from "react";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faSearch,
  faList,
  faTrashAlt,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo";

import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalshowSave,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

/* ---------- Small UI helpers ---------- */
const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
    {children}
  </div>
);

const parseSprocJsonResult = (rows) => {
  if (!rows || !rows.length) return null;
  const r = rows[0]?.result;
  if (!r) return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
};

const showValidation = async (title, lines) => {
  const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
  return useSwalValidationAlert({ icon: "error", title, message: msg });
};

export default function RefMaintenance({
  title,
  loadEndpoint,
  getEndpoint,
  deleteEndpoint,
  upsertEndpoint,
  getParamKey,
  codeLabel = "Code",
  nameLabel = "Name",
  daysLabel = "Days",
  mapRow,
  emptyForm,
  buildUpsertPayload,
  codeKey = "code",
  nameKey = "name",
  daysKey = "daysDue",

  // optional extra column (ex: AP Advances)
  extraColLabel = null,
  extraKey = null,
  extraOptions = null,
  extraDefault = "",

  // Active field support
  activeLabel = "Active",
  activeKey = "active",
  activeOptions = [
    { value: "Y", label: "Yes" },
    { value: "N", label: "No" },
  ],
  activeDefault = "Y",
  showActive = true,
}) {
  const [isLoading, setIsLoading] = useState(false);

  // ✅ view mode by default
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState("");
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);

  const [selectedCode, setSelectedCode] = useState("");
  // const [form, setForm] = useState({ ...(emptyForm || {}) });

  const [form, setForm] = useState({ ...(emptyForm || {}) });
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);


  const { user } = useAuth();
  // ✅ User code key differs per implementation; support common variants
  const userCode =
    user?.userCode ||
    user?.user_code ||
    user?.USER_CODE ||
    user?.UserCode ||
    user?.code ||
    "";

  // Contains filters
  const [colFilters, setColFilters] = useState({
    code: "",
    name: "",
    days: "",
    extra: "",
    active: "",
  });

  const updateColFilter = (key, value) =>
    setColFilters((p) => ({ ...p, [key]: value }));

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));
  const updateForm = (patch) => {
    formRef.current = { ...(formRef.current || {}), ...patch };
    setForm((p) => ({ ...p, ...patch }));
  };


  // ✅ supports:
  // - onChange(event)
  // - onChange(value)
  // - onChange(name, value)
  const getVal = (a, b) => {
    if (a?.target) return a.target.value;      // normal event
    if (b !== undefined) return b;            // (name, value)
    return a;                                 // direct value
  };

  const onFieldChange = (key) => (a, b) => updateForm({ [key]: getVal(a, b) });

  const isAddMode = !selectedCode;
  const fieldsDisabled = isLoading || !isEditing;

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(loadEndpoint);
      const parsed = parseSprocJsonResult(res?.data?.data);
      const list = Array.isArray(parsed) ? parsed : [];
      const normalized = mapRow ? list.map(mapRow) : list;

      setAllRows(normalized);
      setRows(normalized);
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error", `Failed to load ${title}.`);
      setAllRows([]);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadEndpoint, mapRow, title]);

  const fetchOne = useCallback(
    async (code) => {
      if (!code) return;

      setIsLoading(true);
      try {
        const res = await apiClient.get(getEndpoint, {
          params: { [getParamKey]: code },
        });

        const parsed = parseSprocJsonResult(res?.data?.data);
        const row = Array.isArray(parsed) ? parsed?.[0] : null;

        if (!row) {
          await useSwalValidationAlert({
            icon: "info",
            title: "Info",
            message: `${title} not found.`,
          });
          return;
        }

        const normalized = mapRow ? mapRow(row) : row;

        setSelectedCode(normalized?.[codeKey] ?? code);

        // ✅ store the FULL record so RegistrationInfo can read it
        setForm((p) => ({
          ...(emptyForm || {}),
          ...p,
          ...normalized,
          ...(showActive
            ? { [activeKey]: normalized?.[activeKey] ?? activeDefault }
            : {}),
        }));

        // ✅ keep view mode
        setIsEditing(false);
      } catch (e) {
        console.error(e);
        await useSwalErrorAlert("Error", `Failed to fetch ${title}.`);
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeDefault,
      activeKey,
      codeKey,
      emptyForm,
      getEndpoint,
      getParamKey,
      mapRow,
      showActive,
      title,
    ]
  );

  const isDuplicateCode = (code) => {
    if (!code) return false;
    return (allRows || []).some(
      (r) =>
        String(r?.[codeKey] ?? "").trim().toUpperCase() ===
        String(code).trim().toUpperCase()
    );
  };

  const save = async () => {
    // if (!isEditing) return;

    // const code = String(form?.[codeKey] ?? "").trim();
    // const name = String(form?.[nameKey] ?? "").trim();

    // const code = form?.[codeKey];
    // const name = form?.[nameKey];

    // const dueRaw = form?.[daysKey];
    // const dueStr = String(dueRaw ?? "").trim();
    // const dueNum = dueStr === "" ? null : Number(dueStr);

    const f = formRef.current || {};
    const code = String(f?.[codeKey] ?? "").trim();
    const name = String(f?.[nameKey] ?? "").trim();
    const dueRaw = f?.[daysKey];
    const dueStr = String(dueRaw ?? "").trim();
    const dueNum = dueStr === "" ? null : Number(dueStr);


    console.log({ code, name, dueRaw, dueNum, userCode });

    // const missing = [];
    // if (!code) missing.push(`• ${codeLabel}`);
    // if (!name) missing.push(`• ${nameLabel}`);
    // if (!userCode) missing.push("• User Code");

    // // ✅ allow 0, block empty/NaN/negative
    // if (dueStr === "" || Number.isNaN(dueNum) || dueNum < 0) {
    //   missing.push("• Due Days");
    // }

    // if (missing.length) return showValidation("Missing Required Field(s)", missing);
    // console.log({missing});

    // duplicate only on Add
    if (isAddMode) {
      if (isDuplicateCode(code)) {
        return showValidation("Duplicate Record", [
          `• ${codeLabel} already exists (${code}).`,
        ]);
      }
    }

    setIsLoading(true);
    try {
      const payload = buildUpsertPayload({
        ...form,
        // ✅ FIX: use the real field value (keep it as entered)
        [codeKey]: code,
        [nameKey]: name,
        [daysKey]: dueStr, // or dueNum, depending on your buildUpsertPayload
        userCode,
        ...(showActive
          ? { [activeKey]: (form?.[activeKey] ?? activeDefault) || activeDefault }
          : {}),
      });

      console.log({ payload });

      await apiClient.post(upsertEndpoint, {
        json_data: JSON.stringify(payload),
      });

      await useSwalshowSave(() => { }, () => { });
      setSelectedCode(code);
      setIsEditing(false);

      await loadList();
      await fetchOne(code); // ✅ reload record so reg info updates immediately
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        `Failed to save ${title}.`;

      await showValidation("Save Failed", [msg]);
    } finally {
      setIsLoading(false);
    }
  };

  const addNew = () => {
    setSelectedCode("");
    setForm({
      ...(emptyForm || {}),
      [daysKey]: "",
      userCode,
      ...(extraKey ? { [extraKey]: extraDefault } : {}),
      ...(showActive ? { [activeKey]: activeDefault } : {}),
    });
    setIsEditing(true);
  };

  const editSelected = () => {
    if (!selectedCode) return showValidation("Required", ["• Select a record to edit"]);
    setIsEditing(true);
  };

  const reset = () => {
    setSelectedCode("");
    setForm({
      ...(emptyForm || {}),
      ...(showActive ? { [activeKey]: activeDefault } : {}),
    });
    setIsEditing(false);
  };

  const deleteRecord = async () => {
    if (isEditing) return;

    const code = String(form?.[codeKey] ?? "").trim();
    if (!code) return showValidation("Required", [`• ${codeLabel}`]);

    const confirm = await useSwalDeleteConfirm(
      `Delete this ${title}?`,
      `Code: ${code} | Name: ${String(form?.[nameKey] ?? "").trim()}`,
      "Yes, delete it"
    );

    if (!confirm?.isConfirmed) return;

    setIsLoading(true);
    try {
      await apiClient.post(deleteEndpoint, {
        json_data: JSON.stringify({ [getParamKey]: code }),
      });

      await useSwalDeleteRecord();
      reset();
      await loadList();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        `Failed to delete ${title}.`;
      await showValidation("Delete Failed", [msg]);
    } finally {
      setIsLoading(false);
    }
  };

  const applySearch = (q) => {
    const s = String(q ?? "").trim().toLowerCase();
    if (!s) return setRows(allRows);

    setRows(
      allRows.filter((r) => {
        const c = String(r?.[codeKey] ?? "").toLowerCase();
        const n = String(r?.[nameKey] ?? "").toLowerCase();
        return c.includes(s) || n.includes(s);
      })
    );
  };

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    applySearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, allRows]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, colFilters]);

  // contains filtering
  const filteredRows = useMemo(() => {
    const codeF = String(colFilters.code || "").toLowerCase();
    const nameF = String(colFilters.name || "").toLowerCase();
    const daysF = String(colFilters.days || "").toLowerCase();
    const extraF = String(colFilters.extra || "").toLowerCase();
    const activeF = String(colFilters.active || "").toLowerCase();

    return (rows || []).filter((r) => {
      const codeV = String(r?.[codeKey] ?? "").toLowerCase();
      const nameV = String(r?.[nameKey] ?? "").toLowerCase();
      const daysV = String(r?.[daysKey] ?? "").toLowerCase();
      const extraV = extraKey ? String(r?.[extraKey] ?? "").toLowerCase() : "";
      const activeV = showActive ? String(r?.[activeKey] ?? "").toLowerCase() : "";

      return (
        (!codeF || codeV.includes(codeF)) &&
        (!nameF || nameV.includes(nameF)) &&
        (!daysF || daysV.includes(daysF)) &&
        (!extraKey || !extraF || extraV.includes(extraF)) &&
        (!showActive || !activeF || activeV.includes(activeF))
      );
    });
  }, [rows, colFilters, codeKey, nameKey, daysKey, extraKey, activeKey, showActive]);

  const totalRows = filteredRows.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalRows / pageSize)),
    [totalRows, pageSize]
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const buttons = useMemo(
    () => [
      { key: "add", label: "Add", icon: faPlus, onClick: addNew, disabled: isLoading },
      {
        key: "edit",
        label: "Edit",
        icon: faPenToSquare,
        onClick: editSelected,
        disabled: isLoading || !selectedCode || isEditing,
      },
      { key: "save", label: "Save", icon: faSave, onClick: save, disabled: isLoading || !isEditing },
      { key: "reset", label: "Reset", icon: faUndo, onClick: reset, disabled: isLoading },
      {
        key: "delete",
        label: "Delete",
        icon: faTrashAlt,
        onClick: deleteRecord,
        disabled: isLoading || isEditing,
        variant: "danger",
      },
    ],
    [isLoading, isEditing, selectedCode]
  );

  // ✅ RegistrationInfo expects these keys:
  // registeredBy, registeredDate, lastUpdatedBy, lastUpdatedDate
  const registrationData = useMemo(() => {
    const v = form || {};
    return {
      registeredBy: v.registeredBy ?? v.registered_by ?? v.createdBy ?? v.created_by ?? "",
      registeredDate: v.registeredDate ?? v.registered_date ?? v.createdDate ?? v.created_date ?? "",
      lastUpdatedBy: v.lastUpdatedBy ?? v.last_updated_by ?? v.updatedBy ?? v.updated_by ?? "",
      lastUpdatedDate: v.lastUpdatedDate ?? v.last_updated_date ?? v.updatedDate ?? v.updated_date ?? "",
    };
  }, [form]);

  const listColSpan = 3 + (extraKey ? 1 : 0) + (showActive ? 1 : 0);

  return (
    <>
      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="text-gray-500" />
            <div className="text-sm font-bold text-gray-800">{title}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or name..."
                className="global-tran-textbox-ui w-full sm:w-[260px]"
                disabled={isLoading}
              />
            </div>

            <ButtonBar buttons={buttons} />
          </div>
        </div>
      </Card>

      {/* List + Form */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        {/* LEFT: FORM */}
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <SectionHeader title="Basic Information" />

            <div className="grid grid-cols-1 gap-3">
              {/* Code enabled only when ADDING */}
              <FieldRenderer
                label={codeLabel}
                required
                type="text"
                value={form?.[codeKey] ?? ""}
                onChange={(a, b) => {
                  const v = getVal(a, b);
                  updateForm({ [codeKey]: v });

                  if (isAddMode) {
                    const c = String(v ?? "").trim();
                    if (c && isDuplicateCode(c)) {
                      showValidation("Duplicate Record", [
                        `• ${codeLabel} already exists (${c}).`,
                      ]);
                    }
                  }
                }}
                readOnly={!isEditing || !isAddMode}
                disabled={isLoading || !isEditing || !isAddMode}
              />

              <FieldRenderer
                label={nameLabel}
                required
                type="text"
                value={form?.[nameKey] ?? ""}
                onChange={onFieldChange(nameKey)}
                readOnly={!isEditing}
                disabled={fieldsDisabled}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldRenderer
                  label="Due Days"
                  required
                  type="number"
                  value={form?.[daysKey] ?? ""}
                  onChange={onFieldChange(daysKey)}
                  readOnly={!isEditing}
                  disabled={fieldsDisabled}
                />

                {extraKey ? (
                  <FieldRenderer
                    label={extraColLabel || "AP Advances"}
                    type="select"
                    options={extraOptions || []}
                    value={(form?.[extraKey] ?? extraDefault) || extraDefault}
                    onChange={onFieldChange(extraKey)}
                    readOnly={!isEditing}
                    disabled={fieldsDisabled}
                  />
                ) : null}

                {showActive ? (
                  <FieldRenderer
                    label={activeLabel}
                    type="select"
                    options={activeOptions || []}
                    value={(form?.[activeKey] ?? activeDefault) || activeDefault}
                    onChange={onFieldChange(activeKey)}
                    readOnly={!isEditing}
                    disabled={fieldsDisabled}
                  />
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Registration Information" />
            <RegistrationInfo data={registrationData} disabled />
          </Card>
        </div>

        {/* RIGHT: LIST */}
        <Card>
          <SectionHeader title="List" />

          <div className="overflow-auto border border-gray-100 rounded-md ">
            <table className="min-w-full text-xs shadow-lg">
              <thead className="bg-blue-200 border-b border-blue-300">
                <tr className="text-blue-900">
                  <th className="text-left px-3 py-2 font-bold">{codeLabel}</th>
                  <th className="text-left px-3 py-2 font-bold">{nameLabel}</th>
                  <th className="text-left px-3 py-2 font-bold">{daysLabel}</th>
                  {extraKey ? (
                    <th className="text-left px-3 py-2 font-bold">{extraColLabel || "AP Advances"}</th>
                  ) : null}
                  {showActive ? (
                    <th className="text-left px-3 py-2 font-bold">{activeLabel}</th>
                  ) : null}
                </tr>

                {/* Contains row */}
                <tr className="border-t">
                  <th className="px-2 py-1">
                    <input
                      className="global-tran-textbox-ui w-full text-xs"
                      placeholder="Contains:"
                      value={colFilters.code}
                      onChange={(e) => updateColFilter("code", e.target.value)}
                      disabled={isLoading}
                    />
                  </th>

                  <th className="px-2 py-1">
                    <input
                      className="global-tran-textbox-ui w-full text-xs"
                      placeholder="Contains:"
                      value={colFilters.name}
                      onChange={(e) => updateColFilter("name", e.target.value)}
                      disabled={isLoading}
                    />
                  </th>

                  <th className="px-2 py-1">
                    <input
                      className="global-tran-textbox-ui w-full text-xs text-right"
                      placeholder="Contains:"
                      value={colFilters.days}
                      onChange={(e) => updateColFilter("days", e.target.value)}
                      disabled={isLoading}
                    />
                  </th>

                  {extraKey ? (
                    <th className="px-2 py-1">
                      <input
                        className="global-tran-textbox-ui w-full text-xs"
                        placeholder="Contains:"
                        value={colFilters.extra}
                        onChange={(e) => updateColFilter("extra", e.target.value)}
                        disabled={isLoading}
                      />
                    </th>
                  ) : null}

                  {showActive ? (
                    <th className="px-2 py-1">
                      <input
                        className="global-tran-textbox-ui w-full text-xs"
                        placeholder="Contains:"
                        value={colFilters.active}
                        onChange={(e) => updateColFilter("active", e.target.value)}
                        disabled={isLoading}
                      />
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((r) => {
                  const code = r?.[codeKey] ?? "";
                  const selected = String(code) === String(selectedCode);

                  return (
                    <tr
                      key={code || Math.random()}
                      className={`cursor-pointer border-t ${selected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      onClick={() => {
                        setSelectedCode(code);
                        setIsEditing(false);
                        fetchOne(code); // ✅ loads full record & registration fields
                      }}
                      onDoubleClick={() => fetchOne(code)}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {code}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r?.[nameKey] ?? ""}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {Number(r?.[daysKey] ?? 0)}
                      </td>

                      {extraKey ? (
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {String(r?.[extraKey] ?? extraDefault)}
                        </td>
                      ) : null}

                      {showActive ? (
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {String(r?.[activeKey] ?? activeDefault)}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}

                {!isLoading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={listColSpan} className="px-3 py-6 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Rows per page:</span>
              <select
                className="global-tran-textbox-ui w-[90px]"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                disabled={isLoading}
              >
                {[10, 20, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <span className="text-gray-500">
                {totalRows === 0
                  ? "0–0 of 0"
                  : `${(page - 1) * pageSize + 1}–${Math.min(
                    page * pageSize,
                    totalRows
                  )} of ${totalRows}`}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={isLoading || page <= 1}
              >
                Prev
              </button>

              <span className="text-xs text-gray-600">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={isLoading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
