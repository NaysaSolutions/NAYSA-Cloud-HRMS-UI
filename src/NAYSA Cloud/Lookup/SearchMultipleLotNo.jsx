const LotSplitModal = ({ modal, onClose, onSave }) => {
  const rrQty = roundQty(
    modal?.row?.quantity || modal?.row?.rrQuantity || modal?.row?.rrQty || 0
  );

  const [rows, setRows] = useState(modal.rows || []);

  const totalQty = rows.reduce((sum, row) => sum + toNum(row.quantity), 0);
  const remainingQty = roundQty(rrQty - totalQty);
  const isBalanced = roundQty(totalQty) === roundQty(rrQty);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        quantity: remainingQty > 0 ? remainingQty : 0,
        lotNo: "",
        whCode: modal?.row?.whouseCode || modal?.row?.whCode || "",
        locCode: modal?.row?.locCode || "",
        qsCode: modal?.row?.qstatCode || modal?.row?.qsCode || "",
        bbDate: "",
        controlNo: "",
      },
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSave = () => {
    const cleanedRows = rows
      .map((row) => ({
        ...row,
        quantity: roundQty(row.quantity),
        lotNo: String(row.lotNo || "").trim(),
      }))
      .filter((row) => row.quantity > 0 || row.lotNo);

    if (cleanedRows.length === 0) {
      alert("Please add at least one lot split.");
      return;
    }

    if (cleanedRows.some((row) => !row.lotNo)) {
      alert("Lot No is required for all split rows.");
      return;
    }

    const splitTotal = cleanedRows.reduce(
      (sum, row) => sum + toNum(row.quantity),
      0
    );

    if (roundQty(splitTotal) !== roundQty(rrQty)) {
      alert(`Split quantity must be equal to RR Quantity: ${rrQty}`);
      return;
    }

    onSave(cleanedRows);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-blue-800">Lot Quantity Split</h2>
            <p className="text-xs text-slate-500">
              Item: {modal?.row?.itemCode} - {modal?.row?.itemName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex gap-6 text-sm font-semibold">
            <span>RR Quantity: {rrQty}</span>
            <span>Total Split: {roundQty(totalQty)}</span>
            <span className={remainingQty === 0 ? "text-green-600" : "text-red-600"}>
              Remaining: {remainingQty}
            </span>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Qty</th>
                  <th className="p-2 text-left">Lot No</th>
                  <th className="p-2 text-left">Warehouse</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">QStat</th>
                  <th className="p-2 text-left">BB Date</th>
                  <th className="p-2 text-left">Control No</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.000001"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(index, "quantity", e.target.value)
                        }
                        className="w-28 border rounded px-2 py-1 text-right"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.lotNo || ""}
                        onChange={(e) =>
                          updateRow(index, "lotNo", e.target.value)
                        }
                        className="w-40 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.whCode || ""}
                        onChange={(e) =>
                          updateRow(index, "whCode", e.target.value)
                        }
                        className="w-32 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.locCode || ""}
                        onChange={(e) =>
                          updateRow(index, "locCode", e.target.value)
                        }
                        className="w-32 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.qsCode || ""}
                        onChange={(e) =>
                          updateRow(index, "qsCode", e.target.value)
                        }
                        className="w-28 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="date"
                        value={row.bbDate || ""}
                        onChange={(e) =>
                          updateRow(index, "bbDate", e.target.value)
                        }
                        className="w-36 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.controlNo || ""}
                        onChange={(e) =>
                          updateRow(index, "controlNo", e.target.value)
                        }
                        className="w-40 border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 bg-slate-100 rounded font-semibold"
            >
              Add Lot Row
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 rounded font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isBalanced}
                className="px-4 py-2 bg-blue-700 text-white rounded font-semibold disabled:opacity-50"
              >
                Save Split
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};