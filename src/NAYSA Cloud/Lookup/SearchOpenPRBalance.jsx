import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { postRequest } from "../Configuration/BaseURL";

const SearchPROpenModal = ({ isOpen, onClose, branchCode, prTranType }) => {

  // HEADER GRID
  const [headerRows, setHeaderRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState(-1);

  // DETAIL GRID
  const [detailRows, setDetailRows] = useState([]);
  const [unselectAll, setUnselectAll] = useState(false);

  const loadHeaders = async () => {
  const payload = {
    mode: "Header",
    branchCode,
    prTranType,
  };

  console.log("🔵 Sending HEADER payload:", payload);

  const res = await postRequest("/getPROpen", payload);

  console.log("🟢 HEADER response:", res);

  if (res.success) {
    setHeaderRows(res.data);
    setFiltered(res.data);
    setSelectedHeaderIndex(0);
  } else {
    setHeaderRows([]);
    setFiltered([]);
  }
};

const loadDetails = async () => {
  const row = filtered[selectedHeaderIndex];
  if (!row) {
    console.log("⚠️ No header row selected.");
    return;
  }

  const payload = {
    mode: "Detail",
    branchCode: row.BC,
    prId: row.PrId,  // <-- THIS IS WHAT MUST BE INTEGER
  };

  console.log("🟡 Sending DETAIL payload:", payload);

  const res = await postRequest("/getPROpen", payload);

  console.log("🟢 DETAIL response:", res);

  if (res.success) {
    setDetailRows(res.data.map(r => ({ ...r, isSelected: true })));
    setUnselectAll(false);
  }
};


  const toggleDetail = (idx) => {
    const updated = [...detailRows];
    updated[idx].isSelected = !updated[idx].isSelected;
    setDetailRows(updated);
  };

  const handleGetSelected = () => {
    const header = filtered[selectedHeaderIndex];
    const selectedDetails = detailRows.filter(r => r.isSelected);

    if (!header) {
      alert("Select a PR Header first");
      return;
    }
    if (selectedDetails.length === 0) {
      alert("Select at least one detail");
      return;
    }
    
    const groupId =
    header.GroupId || header.GROUP_ID || header.groupId || ""; 
    
  onClose({
    header: { ...header, groupId },
    details: selectedDetails.map(d => ({ ...d, groupId })),
  });
};

  useEffect(() => {
    if (!isOpen) return;
    loadHeaders();
    setDetailRows([]);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 w-[95%] max-w-6xl rounded shadow max-h-[90vh] flex flex-col">

        {/* HEADER BAR */}
        <div className="p-2 border-b flex justify-between">
          <div className="font-semibold">
            {prTranType === "PR02"
              ? "OPEN PR for JOB ORDER"
              : "OPEN PR for PURCHASE ORDER"}
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
              placeholder="Search PR No / Department / Particulars"
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
                <th className="border p-1">PR No</th>
                <th className="border p-1">PR Date</th>
                <th className="border p-1">Date Needed</th>
                <th className="border p-1">PR Type</th>
                <th className="border p-1">Ref No</th>
                <th className="border p-1">Req Dept</th>
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
                  <td className="border p-1">{row.PRNo}</td>
                  <td className="border p-1">{row.PRDate?.substring(0, 10)}</td>
                  <td className="border p-1">{row.DateNeeded?.substring(0, 10)}</td>
                  <td className="border p-1">{row.PRType}</td>
                  <td className="border p-1">{row.RefNo}</td>
                  <td className="border p-1">{row.ReqRcCode}</td>
                  <td className="border p-1">{row.Particulars}</td>
                  <td className="border p-1">{row.PreparedBy}</td>
                  <td className="border p-1">{row.DateStamp?.substring(0, 10)}</td>
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
            Load PR Details
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
                setDetailRows(detailRows.map(r => ({ ...r, isSelected: !v })));
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
                <th className="border p-1">PR No</th>
                <th className="border p-1">Type</th>
                <th className="border p-1">LN</th>
                <th className="border p-1">Job Code</th>
                <th className="border p-1">Scope of Work</th>
                <th className="border p-1">UOM</th>
                <th className="border p-1">Qty</th>
                <th className="border p-1">Date Needed</th>
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
                  <td className="border p-1">{row.PRNo}</td>
                  <td className="border p-1">{row.Type}</td>
                  <td className="border p-1">{row.Ln}</td>
                  <td className="border p-1">{row.JobCode}</td>
                  <td className="border p-1">{row.ScopeOfWork}</td>
                  <td className="border p-1">{row.UOM}</td>
                  <td className="border p-1 text-right">{row.QtyNeeded}</td>
                  <td className="border p-1">
                    {row.DateNeeded?.substring(0, 10)}
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

export default SearchPROpenModal;
