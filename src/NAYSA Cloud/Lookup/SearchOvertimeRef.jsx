import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const parseResult = (response, fallback = {}) => {
  try {
    return JSON.parse(response?.data?.data?.[0]?.result || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const SearchOvertimeRef = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [overtimes, setOvertimes] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    const loadOvertimes = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/overtimeTransactions/selectionReferences");
        const data = parseResult(response, { overtimes: [] });
        setOvertimes(data.overtimes || []);
      } finally {
        setLoading(false);
      }
    };
    loadOvertimes();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return overtimes;
    return overtimes.filter(
      (ot) =>
        String(ot.code || "").toLowerCase().includes(q) ||
        String(ot.description || "").toLowerCase().includes(q)
    );
  }, [overtimes, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {loading && <LoadingSpinner />}
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Select Overtime Code
          </h3>
          <button
            type="button"
            onClick={() => onClose(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search OT Code or Description..."
            className="h-8 w-full rounded border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 max-h-80">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              <tr>
                <th className="p-2">OT Code</th>
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((ot) => (
                <tr
                  key={ot.code}
                  onClick={() => onClose(ot)}
                  className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <td className="p-2 font-semibold">{ot.code}</td>
                  <td className="p-2">{ot.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SearchOvertimeRef;