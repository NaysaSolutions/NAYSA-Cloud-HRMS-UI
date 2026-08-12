import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { postRequest } from "../Configuration/BaseURL";

/**
 * Open PO lookup modal
 * - Uses sproc_PHP_PO_Open
 * - Endpoint: /getPOOpen  (configure in Laravel to call the sproc)
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: (selection | null) => void
 *      selection = { header, details[] }
 *  - branchCode: string
 *  - poTranType: string | null  (PO11, PO12, etc. optional)
 */
const SearchPOOpenModal = ({ isOpen, onClose, branchCode, poTranType }) => {
  // HEADER GRID
  const [headerRows, setHeaderRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState(-1);

  // DETAIL GRID
  const [detailRows, setDetailRows] = useState([]);
  const [unselectAll, setUnselectAll] = useState(false);

  // ───── HEADER LOAD ─────
  const loadHeaders = async () => {
    const payload = {
      mode: "Header",
      branchCode,
      poTranType, // can be null if you want all open POs
    };

    console.log("🔵 Sending PO HEADER payload:", payload);

    const res = await postRequest("/getPOOpen", payload); // <-- map to sproc_PHP_PO_Open

    console.log("🟢 PO HEADER response:", res);

    if (res?.success && Array.isArray(res.data)) {
      setHeaderRows(res.data);
      setFiltered(res.data);
      setSelectedHeaderIndex(res.data.length > 0 ? 0 : -1);
    } else {
      setHeaderRows([]);
      setFiltered([]);
      setSelectedHeaderIndex(-1);
    }
    setDetailRows([]);
  };

  // ───── DETAIL LOAD ─────
  const loadDetails = async () => {
    const row = filtered[selectedHeaderIndex];
    if (!row) {
      console.log("⚠️ No PO header row selected.");
      return;
    }

    const payload = {
      mode: "Detail",
      branchCode: row.BC,
      poId: row.PoId, // string PoId from sproc_PHP_PO_Open
    };

    console.log("🟡 Sending PO DETAIL payload:", payload);

    const res = await postRequest("/getPOOpen", payload);

    console.log("🟢 PO DETAIL response:", res);

    if (res?.success && Array.isArray(res.data)) {
      // auto–select all details initially
      setDetailRows(res.data.map((r) => ({ ...r, isSelected: true })));
      setUnselectAll(false);
    } else {
      setDetailRows([]);
    }
  };

  const toggleDetail = (idx) => {
    const updated = [...detailRows];
    updated[idx].isSelected = !updated[idx].isSelected;
    setDetailRows(updated);
  };

  const handleGetSelected = () => {
  const header = filtered[selectedHeaderIndex];
  const selectedDetails = detailRows.filter((r) => r.isSelected);

  if (!header) {
    alert("Select a PO Header first");
    return;
  }
  if (selectedDetails.length === 0) {
    alert("Select at least one detail");
    return;
  }

  onClose({
    header: {
      ...header,
      WhCode: header.WhCode ?? header.whCode ?? header.WH_CODE ?? "",
      WhName: header.WhName ?? header.whName ?? header.WH_NAME ?? "",
    },
    details: selectedDetails,
  });
};


  // simple client-side filter (PO No / Vendor / Particulars)
  useEffect(() => {
    if (!searchText) {
      setFiltered(headerRows);
      return;
    }

    const text = searchText.toLowerCase();
    const f = headerRows.filter((r) => {
      return (
        (r.PoNo || "").toLowerCase().includes(text) ||
        (r.VendName || "").toLowerCase().includes(text) ||
        (r.Particulars || "").toLowerCase().includes(text)
      );
    });
    setFiltered(f);
    setSelectedHeaderIndex(f.length > 0 ? 0 : -1);
  }, [searchText, headerRows]);

  useEffect(() => {
    if (!isOpen) return;
    loadHeaders();
  }, [isOpen, branchCode, poTranType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 w-[95%] max-w-6xl rounded shadow max-h-[90vh] flex flex-col">

        {/* HEADER BAR */}
        <div className="p-2 border-b flex justify-between items-center">
          <div className="font-semibold">
            OPEN PO
            {poTranType ? ` (${poTranType})` : ""}
          </div>
          <button onClick={() => onClose(null)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* SEARCH */}
        <div className="p-2 border-b flex">
          <div className="relative flex-1">
            <input
              className="w-full border rounded pl-6 py-1 text-sm"
              placeholder="Search PO No / Vendor / Particulars"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <span className="absolute left-2 top-2 text-gray-400">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </span>
          </div>
        </div>

        {/* HEADER GRID */}
        <div className="flex-1 overflow-auto p-2 border-b">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-1">BC</th>
                <th className="border p-1">PO No</th>
                <th className="border p-1">PO Date</th>
                <th className="border p-1">Del Date</th>
                <th className="border p-1">PO Type</th>
                <th className="border p-1">Ref No</th>
                <th className="border p-1">RC Code</th>
                <th className="border p-1">Vendor</th>
                <th className="border p-1">Particulars</th>
                <th className="border p-1">Prepared By</th>
                <th className="border p-1">DateStamp</th>
                <th className="border p-1">TimeStamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={idx}
                  className={`cursor-pointer hover:bg-blue-100 ${
                    idx === selectedHeaderIndex ? "bg-blue-200" : ""
                  }`}
                  onClick={() => setSelectedHeaderIndex(idx)}
                >
                  <td className="border p-1">{row.BC}</td>
                  <td className="border p-1">{row.PoNo}</td>
                  <td className="border p-1">
                    {row.PoDate?.substring(0, 10)}
                  </td>
                  <td className="border p-1">
                    {row.DelDate?.substring(0, 10)}
                  </td>
                  <td className="border p-1">{row.PoType}</td>
                  <td className="border p-1">{row.RefNo}</td>
                  <td className="border p-1">{row.RcCode}</td>
                  <td className="border p-1">
                    {row.VendCode} - {row.VendName}
                  </td>
                  <td className="border p-1">{row.Particulars}</td>
                  <td className="border p-1">{row.PreparedBy}</td>
                  <td className="border p-1">
                    {row.DateStamp?.substring(0, 10)}
                  </td>
                  <td className="border p-1">{row.TimeStamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BUTTONS */}
        <div className="p-2 flex gap-2 border-b">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded"
            onClick={loadDetails}
          >
            Load PO Details
          </button>

          <button
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={handleGetSelected}
          >
            Get Selected Items
          </button>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={unselectAll}
              onChange={(e) => {
                const v = e.target.checked;
                setUnselectAll(v);
                setDetailRows(detailRows.map((r) => ({ ...r, isSelected: !v })));
              }}
            />
            <span className="ml-1 text-xs">Unselect All</span>
          </label>
        </div>

        {/* DETAIL GRID */}
        <div className="p-2 overflow-auto max-h-[30vh]">
          <table className="w-full border text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-1">Sel</th>
                <th className="border p-1">PO No</th>
                <th className="border p-1">Type</th>
                <th className="border p-1">LN</th>
                <th className="border p-1">Item Code</th>
                <th className="border p-1">Item Name</th>
                <th className="border p-1">UOM</th>
                <th className="border p-1">Qty Ordered</th>
                <th className="border p-1">Qty Received</th>
                <th className="border p-1">Qty Balance</th>
                <th className="border p-1">Del Date</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="border p-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.isSelected}
                      onChange={() => toggleDetail(idx)}
                    />
                  </td>
                  <td className="border p-1">{row.PoNo}</td>
                  <td className="border p-1">{row.Type}</td>
                  <td className="border p-1">{row.Ln}</td>
                  <td className="border p-1">{row.ItemCode}</td>
                  <td className="border p-1">{row.ItemName}</td>
                  <td className="border p-1">{row.UOM}</td>
                  <td className="border p-1 text-right">
                    {row.QtyOrdered}
                  </td>
                  <td className="border p-1 text-right">
                    {row.QtyReceived}
                  </td>
                  <td className="border p-1 text-right">
                    {row.QtyBalance}
                  </td>
                  <td className="border p-1">
                    {row.DelDate?.substring(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default SearchPOOpenModal;
