import React, { useState } from "react";

const PostTranModal = ({ isOpen, onClose }) => {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (confirmation) => {
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setError("");
    onClose(confirmation);
    setReason("");
    setPassword("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Modal Content */}
      <div className="w-[350px] p-6 border rounded-2xl shadow-lg bg-white space-y-4">
        <h2 className="text-lg font-semibold">Post Document</h2>
{/* 
        <div>
          <label className="text-sm font-medium">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for cancellation"
            className="mt-1 w-full border rounded-md p-2 text-sm"
          />
        </div> */}

        <p className="text-xs text-red-600 font-medium">
          ⚠️ Warning! NO un-posting of Posted transaction.
        </p>

        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="mt-1 w-full border rounded-md p-2 text-sm"
          />
        </div>

        {/* Validation error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onClose(false)} // pass false when cancelled
            className="px-4 py-1 border rounded-md text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit({ reason })}
            className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostTranModal;
