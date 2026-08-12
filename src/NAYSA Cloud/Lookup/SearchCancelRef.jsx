// import React, { useEffect, useState } from "react";
// import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

// const CancelTranModal = ({ isOpen, onClose, resetPasswordTrigger }) => {
//   const [reason, setReason] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   useEffect(() => {
//     if (!isOpen) {
//       setReason("");
//       setPassword("");
//     }
//   }, [isOpen]);

//   useEffect(() => {
//     if (resetPasswordTrigger) {
//       setPassword("");
//     }
//   }, [resetPasswordTrigger]);

//   const resetFields = () => {
//     setReason("");
//     setPassword("");
//   };

//   const handleClose = () => {
//     resetFields();
//     onClose(false);
//   };

//   const handleSubmit = () => {
//     const trimmedReason = reason.trim();
//     const trimmedPassword = password.trim();

//     if (!trimmedReason || !trimmedPassword) {
//       useSwalErrorAlert(
//         "Required Fields",
//         "Reason and password are required."
//       );
//       return;
//     }

//     onClose({
//       reason: trimmedReason,
//       password: trimmedPassword,
//     });
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
//       <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//         <div className="px-6 pt-5 pb-2 flex justify-between items-center bg-white">
//           <h2 className="text-lg font-black text-gray-900 tracking-tight">
//             Cancel Document
//           </h2>

//           <button
//             type="button"
//             onClick={handleClose}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <svg
//               className="w-5 h-5"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M6 18L18 6M6 6l12 12"
//               />
//             </svg>
//           </button>
//         </div>

//         <div className="px-6 pb-6 pt-2 space-y-4">
//           <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
//             <svg
//               className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
//               />
//             </svg>
//             <p className="text-sm text-red-800 font-medium leading-snug">
//               This action is permanent. Cancelled transactions cannot be unposted.
//             </p>
//           </div>

//           <div className="space-y-3">
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Reason for Cancellation
//               </label>
//               <textarea
//                 value={reason}
//                 onChange={(e) => setReason(e.target.value)}
//                 placeholder="Explain why you are canceling this document..."
//                 rows={3}
//                 className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Password
//               </label>
//               <input
//                 type={showPassword ? "text" : "password"}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 onPaste={(e) => e.preventDefault()}
//                 onCopy={(e) => e.preventDefault()}
//                 onCut={(e) => e.preventDefault()}
//                 onContextMenu={(e) => e.preventDefault()}
//                 autoComplete="one-time-code"
//                 spellCheck={false}
//                 className="border rounded px-2 py-1.5 text-xs w-full pr-8"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
//           <button
//             type="button"
//             onClick={handleClose}
//             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
//           >
//             Keep Document
//           </button>

//           <button
//             type="button"
//             onClick={handleSubmit}
//             className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700"
//           >
//             Cancel Document
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CancelTranModal;


import React, { useEffect, useState } from "react";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const CancelTranModal = ({ isOpen, onClose, resetPasswordTrigger }) => {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setPassword("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (resetPasswordTrigger) {
      setPassword("");
    }
  }, [resetPasswordTrigger]);

  const resetFields = () => {
    setReason("");
    setPassword("");
  };

  const handleClose = () => {
    resetFields();
    onClose(false);
  };

  const handleSubmit = () => {
    const trimmedReason = reason.trim();
    const trimmedPassword = password.trim();

    if (!trimmedReason || !trimmedPassword) {
      useSwalErrorAlert(
        "Required Fields",
        "Reason and password are required."
      );
      return;
    }

    onClose({
      reason: trimmedReason,
      password: trimmedPassword,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 pt-5 pb-2 flex justify-between items-center bg-white">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Cancel Document
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-800 font-medium leading-snug">
              This action is permanent. Cancelled transactions cannot be unposted.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reason for Cancellation
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you are canceling this document..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-black-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-black-500/20 focus:border-black-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                autoComplete="one-time-code"
                spellCheck={false}
                className="w-full px-3 py-2 text-sm border border-black-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-black-500/20 focus:border-black-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            Keep Document
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700"
          >
            Cancel Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelTranModal;