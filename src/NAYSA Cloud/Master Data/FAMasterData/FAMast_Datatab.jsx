// src/NAYSA Cloud/Master Data/FAMasterData/FAMast_DataTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";

// -------------------- Helpers --------------------
const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};

const FAMast_DataTab = ({
  isLoading = false,
  rows = [],
  onRowDoubleClick,
  userCode = "",
}) => {
  const docType = "FAMastLookup";

  // ── Column definitions from hs_colconfig / selectedData.js ────────────────
  const fallbackColumns = useMemo(() => [
    { key: "faCode",            label: "Asset Code",           classNames: "text-left",  renderType: "text" },
    { key: "faName",            label: "Asset Name",           classNames: "text-left",  renderType: "text" },
    { key: "categCode",         label: "Category Code",        classNames: "text-left",  renderType: "text" },
    { key: "categName",         label: "Category Name",        classNames: "text-left",  renderType: "text" },
    { key: "classCode",         label: "Sub Category Code",    classNames: "text-left",  renderType: "text" },
    { key: "className",         label: "Sub Category Name",    classNames: "text-left",  renderType: "text" },
    { key: "flocCode",          label: "Location Code",        classNames: "text-left",  renderType: "text" },
    { key: "flocName",          label: "Location Name",        classNames: "text-left",  renderType: "text" },
    { key: "serialNo",          label: "Serial No",            classNames: "text-left",  renderType: "text" },
    { key: "modelNo",           label: "Model No",             classNames: "text-left",  renderType: "text" },
    { key: "tagNo",             label: "Tag No",               classNames: "text-left",  renderType: "text" },
    { key: "rcCode",            label: "RC Code",              classNames: "text-left",  renderType: "text" },
    { key: "rcName",            label: "RC Name",              classNames: "text-left",  renderType: "text" },
    { key: "empNo",             label: "Employee No",          classNames: "text-left",  renderType: "text" },
    { key: "empName",           label: "Employee Name",        classNames: "text-left",  renderType: "text" },
    { key: "acqDate",           label: "Acquisition Date",     classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "acqCost",           label: "Acquisition Cost",     classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "accumDepr",         label: "Accum Depr",           classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "deprMonth",         label: "Monthly Depr",         classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "nbValue",           label: "Net Book Value",       classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "salvageValue",      label: "Salvage Value",        classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "faStatus",          label: "Status",               classNames: "text-left",  renderType: "text" },
    { key: "warrantyStartDate", label: "Warranty Start",       classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "warrantyExpiry",    label: "Warranty Expiry",      classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "lockedTranCode",    label: "Locked Tran Code",     classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranId",      label: "Locked Tran ID",       classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranNo",      label: "Locked Tran No",       classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranDate",    label: "Locked Tran Date",     classNames: "text-left",  renderType: "date", renderFormat: "MM/DD/YYYY", hidden: true },
    { key: "lockedBy",          label: "Locked By",            classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedDate",        label: "Locked Date",          classNames: "text-left",  renderType: "date", renderFormat: "MM/DD/YYYY", hidden: true },
  ], []);

  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    let alive = true;

    const loadColumns = async () => {
      const config = await useSelectedHSColConfig(docType, userCode || "", "");

      if (!alive) return;

      const mapped = Array.isArray(config)
        ? config.map((c) => ({
            key: c.key,
            label: c.label,
            classNames: c.classNames || "text-left",
            hidden: String(c.hidden ?? "0") === "1" || c.hidden === true,
            renderType: c.renderType || "text",
            renderFormat: c.renderFormat ?? null,
            sortable: true,
          }))
        : [];

      setSelectedColumns(mapped.length ? mapped : fallbackColumns);
    };

    loadColumns();

    return () => {
      alive = false;
    };
  }, [docType, userCode, fallbackColumns]);

  const tableColumns = useMemo(() => {
    return (selectedColumns.length ? selectedColumns : fallbackColumns).map((c) => ({
      ...c,
      width:
        c.hidden ? 0 :
        c.key === "faName" ? 240 :
        c.key?.toLowerCase?.().includes("name") ? 180 :
        c.renderType === "number" ? 140 :
        c.renderType === "date" ? 140 :
        120,
    }));
  }, [selectedColumns, fallbackColumns]);

  // ── DATA MAPPING ─────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      faCode:            pick(r, ["fa_code",              "FA_CODE",              "faCode"            ]),
      faName:            pick(r, ["fa_name",              "FA_NAME",              "faName"            ]),
      categCode:         pick(r, ["categ_code",           "CATEG_CODE",           "categCode"         ]),
      categName:         pick(r, ["categ_name",           "CATEG_NAME",           "categName"         ]),
      classCode:         pick(r, ["class_code",           "CLASS_CODE",           "classCode"         ]),
      className:         pick(r, ["class_name",           "CLASS_NAME",           "className"         ]),
      flocCode:          pick(r, ["floc_code",            "FLOC_CODE",            "flocCode"          ]),
      flocName:          pick(r, ["floc_name",            "FLOC_NAME",            "flocName"          ]),
      serialNo:          pick(r, ["serial_no",            "SERIAL_NO",            "serialNo"          ]),
      modelNo:           pick(r, ["model_no",             "MODEL_NO",             "modelNo"           ]),
      tagNo:             pick(r, ["tag_no",               "TAG_NO",               "tagNo"             ]),
      rcCode:            pick(r, ["rc_code",              "RC_CODE",              "rcCode"            ]),
      rcName:            pick(r, ["rc_name",              "RC_NAME",              "rcName"            ]),
      empNo:             pick(r, ["emp_no",               "EMP_NO",               "empNo"             ]),
      empName:           pick(r, ["emp_name",             "EMP_NAME",             "empName"           ]),
      acqDate:           pick(r, ["acq_date",             "ACQ_DATE",             "acqDate"           ]),
      acqCost:           pick(r, ["acq_cost",             "ACQ_COST",             "acqCost"           ]),
      accumDepr:         pick(r, ["accum_depr",           "ACCUM_DEPR",           "accumDepr"         ]),
      deprMonth:         pick(r, ["depr_month",           "DEPR_MONTH",           "deprMonth"         ]),
      nbValue:           pick(r, ["nb_value",             "NB_VALUE",             "nbValue"           ]),
      salvageValue:      pick(r, ["salvage_value",        "SALVAGE_VALUE",        "salvageValue"      ]),
      faStatus:          pick(r, ["fa_status",            "FA_STATUS",            "faStatus"          ]),
      warrantyStartDate: pick(r, ["warranty_start_date",  "WARRANTY_START_DATE",  "warrantyStartDate", "warrantyStart" ]),
      warrantyExpiry:    pick(r, ["warranty_expiry_date", "WARRANTY_EXPIRY_DATE", "warrantyExpiryDate","warrantyExpiry"]),
      // lock fields (hidden, passed through for parent consumption)
      lockedTranCode:    pick(r, ["locked_tran_code",     "LOCKED_TRAN_CODE",     "lockedTranCode"    ]),
      lockedTranId:      pick(r, ["locked_tran_id",       "LOCKED_TRAN_ID",       "lockedTranId"      ]),
      lockedTranNo:      pick(r, ["locked_tran_no",       "LOCKED_TRAN_NO",       "lockedTranNo"      ]),
      lockedTranDate:    pick(r, ["locked_tran_date",     "LOCKED_TRAN_DATE",     "lockedTranDate"    ]),
      lockedBy:          pick(r, ["locked_by",            "LOCKED_BY",            "lockedBy"          ]),
      lockedDate:        pick(r, ["locked_date",          "LOCKED_DATE",          "lockedDate"        ]),
    }));
  }, [rows]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters={false}
        showGlobalSearch={false}
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={onRowDoubleClick}
        isLoading={isLoading}
      />
    </div>
  );
};

export default FAMast_DataTab;