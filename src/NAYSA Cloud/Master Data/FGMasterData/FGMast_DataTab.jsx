import React, { useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// -------------------- Helpers --------------------
const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};

const FGMast_DataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick
}) => {
  const docType = "FGMast";

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); // default to "Contains"

  const tableColumns = useMemo(() => [
    { key: "itemCode",      label: "Item No",           sortable: true, width: 130 },
    { key: "itemDesc",      label: "Item Description",  sortable: true, width: 260 },
    { key: "uom",           label: "UOM",               sortable: true, width: 80  },
    { key: "uom2",          label: "UOM2",              sortable: true, width: 80  },
    { key: "qtyOnHand",     label: "Qty on Hand",       sortable: true, width: 110 },
    { key: "stdUnitCost",   label: "STD Unit Cost",     sortable: true, width: 120 },
    { key: "stdDlCost",     label: "STD DL Cost",       sortable: true, width: 110 },
    { key: "stdFohCost",    label: "STD FOH Cost",      sortable: true, width: 110 },
    { key: "stdOsCost",     label: "STD OS Cost",       sortable: true, width: 110 },
    { key: "stdDmCost",     label: "STD DM Cost",       sortable: true, width: 110 },
    { key: "sellingPrice",  label: "Selling Price",     sortable: true, width: 120 },
    { key: "categoryCode",  label: "Category Code",     sortable: true, width: 120 },
    { key: "categoryName",  label: "Category Name",     sortable: true, width: 180 },
    { key: "classCode",     label: "Class Code",        sortable: true, width: 110 },
    { key: "className",     label: "Class Name",        sortable: true, width: 160 },
    { key: "active",        label: "Active",            sortable: true, width: 80  },
  ], []);

  const handleLoad = useCallback(() => {
    if (typeof onFilter === "function") onFilter();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  // 1. DATA MAPPING: Format raw SQL rows into standard React camelCase properties.
  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      // Load mode : select * from fg_mast for json auto  → exact DB col names
      // Get  mode : aliased camelCase from sproc         → camelCase aliases
      // Both cases covered; SQL Server FOR JSON preserves original casing
      itemCode:     pick(r, ["item_code",     "ITEM_CODE",     "itemCode"]),
      itemDesc:     pick(r, ["item_name",     "ITEM_NAME",     "itemName",    "itemDesc"]),
      uom:          pick(r, ["uom_code",      "UOM_CODE",      "uomCode",     "uom"]),
      uom2:         pick(r, ["uom2_code",     "UOM2_CODE",     "uom2Code",    "uom2",     "uom_code2", "UOM_CODE2"]),
      qtyOnHand:    pick(r, ["qty_onhand",    "QTY_ONHAND",    "qtyOnhand",   "qtyOnHand"]),
      stdUnitCost:  pick(r, ["unit_price",    "UNIT_PRICE",    "unitPrice",   "stdUnitCost",  "std_unit_cost"]),
      stdDlCost:    pick(r, ["std_dlcost",    "STD_DLCOST",    "stdDlcost",   "stdDlCost",    "std_dl_cost"]),
      stdFohCost:   pick(r, ["std_fohcost",   "STD_FOHCOST",   "stdFohcost",  "stdFohCost",   "std_foh_cost"]),
      stdOsCost:    pick(r, ["std_oscost",    "STD_OSCOST",    "stdOscost",   "stdOsCost",    "std_os_cost"]),
      stdDmCost:    pick(r, ["std_dmcost",    "STD_DMCOST",    "stdDmcost",   "stdDmCost",    "std_dm_cost"]),
      sellingPrice: pick(r, ["selling_price", "SELLING_PRICE", "sellingPrice"]),
      categoryCode: pick(r, ["categ_code",    "CATEG_CODE",    "categCode",   "categoryCode"]),
      categoryName: pick(r, ["categoryName",  "categoryname",  "categ_name",  "CATEG_NAME",   "categName"]),
      classCode:    pick(r, ["class_code",    "CLASS_CODE",    "classCode"]),
      className:    pick(r, ["className",     "classname",     "class_name",  "CLASS_NAME"]),
      active:       pick(r, ["active",        "ACTIVE"]),
    }));
  }, [rows]);

  // 2. SEARCH LOGIC
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    const keysToSearch = tableColumns.map((c) => c.key);

    return tableDataRaw.filter((r) =>
      keysToSearch.some((k) => {
        const cell = String(r?.[k] || "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [tableDataRaw, searchTerm, searchMode, tableColumns]);

  // 3. PERFORMANCE SLICER: Caps rendering at 100 rows to prevent freezing
  const tableData = useMemo(() => tableDataFiltered.slice(0, 100), [tableDataFiltered]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">

        {/* Search Input with Clear Button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faBoxOpen} />
          </span>
          <input
            type="text"
            placeholder="Search FG Item Name or No..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {/* Search Modes */}
        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="start"
              checked={searchMode === "start"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="part"
              checked={searchMode === "part"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && (
            <span className="text-[11px] text-red-500 font-bold mr-2 animate-pulse uppercase tracking-wider">
              Showing top 100 of {tableDataFiltered.length} records
            </span>
          )}

          <button
            type="button"
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Load Records"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            Load Records
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Reset"
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={onRowDoubleClick}
      />
    </div>
  );
};

export default FGMast_DataTab;