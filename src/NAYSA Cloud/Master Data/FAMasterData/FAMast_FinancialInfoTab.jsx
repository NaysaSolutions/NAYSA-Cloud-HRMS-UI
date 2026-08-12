// src/NAYSA Cloud/Master Data/FAMasterData/FAMast_FinancialInfoTab.jsx
import React, { useMemo } from "react";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

const pick = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
};

/**
 * Fixed Asset Financial Information tab
 *
 * Filter / Reset actions are handled by the parent header (same pattern as FAAssetInquiry).
 * This tab only renders the table; no local search bar or Load Records button.
 */
const FAMast_FinancialInfoTab = ({
  data = [],
  isLoading = false,
  isFetching = false,
  selectedRow = null,
  onRowClick,
  onRowDoubleClick,
  onRefresh,
  tableRef,
}) => {
  // ── Column definitions ────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: "faCode",                  label: "Asset Code",               classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "faName",                  label: "Description",              classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "categName",               label: "Category",                 classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "className",               label: "Sub Category",             classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "locName",                 label: "Location",                 classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "rcName",                  label: "RC Name",                  classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "currCode",                label: "Curr Code",                classNames: "text-center", renderType: "text",  renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "acquisitionDate",         label: "Acquisition Date",         classNames: "text-center", renderType: "date",  renderFormat: "MM/dd/yyyy", roundingOff: 0, hidden: 0 },
      { key: "deprStart",               label: "Depr. Start",              classNames: "text-center", renderType: "text",  renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "acquisitionCost",         label: "Acquisition Cost",         classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "eul",                     label: "EUL",                      classNames: "text-right", renderType: "number", renderFormat: "quantity",   roundingOff: 0, hidden: 0 },
      { key: "rul",                     label: "RUL",                      classNames: "text-right", renderType: "number", renderFormat: "quantity",   roundingOff: 0, hidden: 0 },
      { key: "monthlyDepreciation",     label: "Monthly Depreciation",     classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "accumulatedDepreciation", label: "Accumulated Depreciation", classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "netBookValue",            label: "Net Book Value",           classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "salvageValue",            label: "Salvage Value",            classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
    ],
    []
  );

  const tableData = useMemo(() => {
    const list = Array.isArray(data) ? data : [];

    return list.map((row) => ({
      ...row,
      faCode: pick(row, ["faCode", "FA_CODE", "fa_code"]),
      faName: pick(row, ["faName", "FA_NAME", "fa_name", "description", "DESCRIPTION", "assetDescription"]),
      categName: pick(row, ["categName", "CATEG_NAME", "categ_name", "categoryName", "CATEGORY_NAME", "category"]),
      className: pick(row, ["className", "CLASS_NAME", "class_name", "subCategoryName", "SUB_CATEGORY_NAME", "assetSubCategory"]),
      locName: pick(row, ["locName", "LOC_NAME", "loc_name", "flocName", "FLOC_NAME", "floc_name", "locationName", "LOCATION_NAME", "location", "LOCATION"]),
      rcName: pick(row, ["rcName", "RC_NAME", "rc_name", "deptName", "DEPT_NAME", "departmentName"]),
      currCode: pick(row, ["currCode", "CURR_CODE", "curr_code"]),
      acquisitionDate: pick(row, ["acquisitionDate", "ACQUISITION_DATE", "acquisition_date", "acqDate", "ACQ_DATE", "acq_date"]),
      deprStart: pick(row, ["deprStart", "DEPR_START", "depr_start", "dcutoffCode", "DCUTOFF_CODE", "dcutoff_code"]),
      acquisitionCost: pick(row, ["acquisitionCost", "ACQUISITION_COST", "acquisition_cost", "acqCost", "ACQ_COST", "acq_cost"]),
      eul: pick(row, ["eul", "EUL"]),
      rul: pick(row, ["rul", "RUL"]),
      monthlyDepreciation: pick(row, ["monthlyDepreciation", "MONTHLY_DEPRECIATION", "monthly_depreciation", "deprMonth", "DEPR_MONTH", "depr_month"]),
      accumulatedDepreciation: pick(row, ["accumulatedDepreciation", "ACCUMULATED_DEPRECIATION", "accumulated_depreciation", "accumDepr", "ACCUM_DEPR", "accum_depr"]),
      netBookValue: pick(row, ["netBookValue", "NET_BOOK_VALUE", "net_book_value", "nbValue", "NB_VALUE", "nb_value"]),
      salvageValue: pick(row, ["salvageValue", "SALVAGE_VALUE", "salvage_value"]),
    }));
  }, [data]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SearchGlobalReferenceTable
        ref={tableRef}
        columns={columns}
        data={tableData}
        itemsPerPage={50}
        showPagination={true}
        showFilters={false}
        showGlobalSearch={false}
        showGroupBy={true}
        enableGroupBy={true}
        docType="FAMastFinancialInfo"
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        selectedRow={selectedRow}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={onRefresh}
        tableSize="Full"
      />
    </div>
  );
};

export default FAMast_FinancialInfoTab;