import Swal from 'sweetalert2';

export function focusNextRowField(fieldName, currentIndex) {
  const selector = `#${fieldName}-input-${currentIndex + 1}`;
  const nextInput = document.querySelector(selector);
  if (nextInput) nextInput.focus();
}

export function formatNumber(num, decimals = 2) {
  if (isNaN(num) || num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export const parseFormattedNumber = (value) => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return value || 0;
};

export const parseAndFormat = (value, decimals = 2) => {
  return formatNumber(parseFormattedNumber(value), decimals);
};





export const useSwalValidationAlert = ({ icon = "info", title = "", message = "" }) => {
  const formattedMessage = (message || "")
    .toString()
    .replace(/\r?\n/g, "<br/>");

  Swal.fire({
    icon,
    title,
    timer: 3000,
    timerProgressBar: true, 
    html: `<div style="text-align: left; padding: 0 10px;">${formattedMessage}</div>`,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.maxWidth = "400px";
        popup.style.width = "auto";
        popup.style.padding = "1rem";
        popup.style.fontSize = "14px";

        const titleEl = popup.querySelector(".swal2-title");
        if (titleEl) titleEl.style.fontSize = "16px";

        const body = popup.querySelector(".swal2-html-container");
        if (body) {
          body.style.fontSize = "13px";
          body.style.textAlign = "center";
          body.style.whiteSpace = "pre-wrap";
          body.style.maxHeight = "300px";
          body.style.overflowY = "auto";
        }
      }
    },
  });
};





export const useSwalvalidateRequiredFields = (fields, title) => {
  let errors = [];
  for (const [label, value] of Object.entries(fields)) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      errors.push(`- ${label}`);
    }
  }

  if (errors.length > 0) {
    const errorMessage = "The following fields are required:\n" + errors.join("\n");
    useSwalValidationAlert({
      icon: "info",
      title: title,
      message: errorMessage, 
    });  
    return false; 
  }
  return true; 
};






export const useSwalReturnSummary = ({ icon = "info", title = "", message = "" }) => {
  const formattedMessage = (message || "")
    .toString()
    .replace(/\r?\n/g, "<br/>");

  Swal.fire({
    icon,
    title,
    html: formattedMessage,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.maxWidth = "400px";
        popup.style.width = "auto";
        popup.style.padding = "1rem";
        popup.style.fontSize = "14px";

        const titleEl = popup.querySelector(".swal2-title");
        if (titleEl) titleEl.style.fontSize = "16px";

        const body = popup.querySelector(".swal2-html-container");
        if (body) {
          body.style.fontSize = "13px";
          body.style.textAlign = "left";
          body.style.whiteSpace = "pre-wrap";
          body.style.maxHeight = "300px";
          body.style.overflowY = "auto";
        }
      }
    },
  });
};

export const useSwalshowSaveSuccessDialog = (onConfirm, onPrint) => {
  Swal.fire({
    title: "Record Saved.",
    text: "What would you like to do next?",
    icon: "success",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonColor: "#3085d6",
    denyButtonColor: "#6c757d",
    cancelButtonColor: "#28a745",
    confirmButtonText: "Create New Transaction",
    denyButtonText: "Print Preview",
    cancelButtonText: "Completed",
    timer: 5000,
    timerProgressBar: true
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm();
    } else if (result.isDenied && typeof onPrint === "function") {
      onPrint();
    } else if (
      (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.timer) &&
      typeof onComplete === "function"
    ) {
      Swal.close();
    }
  });
};

export const useSwalshowSave = (onConfirm, onPrint) => {
  Swal.fire({
    title: "Record Saved.",
    // text: "What would you like to do next?",
    icon: "success",
    showCancelButton: false,
    showDenyButton: false,
    confirmButtonColor: "#3085d6",
    // denyButtonColor: "#6c757d",
    // cancelButtonColor: "#28a745",
    confirmButtonText: "Confirm",
    // denyButtonText: "Print Preview",
    // cancelButtonText: "Completed",
    timer: 5000,
    timerProgressBar: true
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm();
    } else if (result.isDenied && typeof onPrint === "function") {
      onPrint();
    } else if (
      (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.timer) &&
      typeof onComplete === "function"
    ) {
      Swal.close();
    }
  });
};





export const useSwalErrorAlert = (
  title = "Error!",
  message = "Something went wrong.",
  fixedMsg= ""

) => {

  if (fixedMsg === "endingCutoff") {
    title = "Invalid cut-off range";
    message = "Ending Cut-off must not be earlier than Starting Cut-off.";
  }

  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: undefined,
    title: "",
    html: `
      <div class="swal-sonner-error-toast-wrap">
        <div class="swal-sonner-error-toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </div>

        <div class="swal-sonner-error-toast-content">
          <div class="swal-sonner-error-toast-title">${title}</div>
          ${
            message
              ? `<div class="swal-sonner-error-toast-message">${String(message).replace(/\n/g, "<br/>")}</div>`
              : ""
          }
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 4000,
    timerProgressBar: true,
    width: 320, // Reduced width (from 400)
    padding: "0",
    background: "#ffffff",
    customClass: {
      popup: "swal-sonner-error-toast-popup",
      htmlContainer: "swal-sonner-error-toast-html",
      closeButton: "swal-sonner-error-toast-close",
      timerProgressBar: "swal-sonner-error-toast-progress",
    },
    didOpen: (toast) => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.borderRadius = "10px"; // Sharper corners for a smaller look
        
        // Target specific text elements to shrink them
        const titleEl = popup.querySelector(".swal-sonner-error-toast-title");
        const messageEl = popup.querySelector(".swal-sonner-error-toast-message");
        
        if (titleEl) {
           titleEl.style.fontSize = "13px"; // Smaller Title
           titleEl.style.fontWeight = "700";
        }
        if (messageEl) {
           messageEl.style.fontSize = "11px"; // Much smaller body text
           messageEl.style.lineHeight = "1.4";
           messageEl.style.marginTop = "2px";
        }
      }
       if (fixedMsg === "endingCutoff") {
    title = "Invalid cut-off range";
    message = "Ending Cut-off must not be earlier than Starting Cut-off.";
  }
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};







export const useSwalErrorAlertAPI = (
  title = "Error!",
  message = "Something went wrong."
) => {

  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: "error",
    title: title,
    html: `
      <div style="text-align:left; font-size:clamp(10px, 1.2vw, 14px); line-height:1.45; color:#374151; margin-bottom: -10px;">
        ${message}
      </div>
    `,

    showConfirmButton: false,
    showCloseButton: true,
    timer: 3000,
    timerProgressBar: true,

    width: 400,
    padding: "12px 14px",

    // ✅ smooth entrance (no shake / no zoom)
    showClass: {popup: "swal2-show toast-smooth-in",},
    hideClass: {popup: "swal2-hide toast-smooth-out",},

    customClass: {
      // ✅ translucent + glass
      popup: "toast-glass rounded-xl shadow-lg border border-white/20",
      htmlContainer: "m-0 p-0",
      closeButton: "text-gray-700/70 hover:text-gray-900",
      timerProgressBar: "rounded-b-xl",
      title: "margin-bottom: -10px",
    },

    didOpen: (toast) => {
      const icon = Swal.getIcon();
      if (icon) {
        icon.style.transform = "scale(0.9)";
        icon.style.margin = "0 0px 0 0";
      }
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};





export const useSwalSuccessAlert = (
  title = "Success!",
  message = "Details has been saved!"
) => {
  return Swal.fire({
    toast: true,                 // ✅ toast mode
    position: "top-end",         // ✅ upper right
    icon: "success",
    title: title,
    html: message
      ? `<div style="text-align:left; font-size:clamp(12px, 1.2vw, 14px); line-height:1.45; color:#374151;">${message}</div>`
      : "",

    showConfirmButton: false,
    showCloseButton: true,
    timer: 2200,
    timerProgressBar: true,

    width: 400,
    padding: "12px 14px",

    // ✅ smooth (no shake)
    showClass: { popup: "swal2-show toast-smooth-in" },
    hideClass: { popup: "swal2-hide toast-smooth-out" },

    customClass: {
      popup: "toast-glass rounded-xl shadow-lg border border-white/20",
      title: "text-sm font-semibold m-0 p-0 text-gray-900",
      htmlContainer: "m-0 p-0",
      closeButton: "text-gray-700/70 hover:text-gray-900",
      timerProgressBar: "rounded-b-xl",
    },

    didOpen: (toast) => {
      const icon = Swal.getIcon();
      if (icon) {
        icon.style.transform = "scale(0.9)";
        icon.style.margin = "0 8px 0 0";
      }
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};






export const useSwalWarningAlert = (title = "Warning!", message = "Please check your input.") => {
  return Swal.fire({
    icon: "warning",
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    confirmButtonText: "OK",
    confirmButtonColor: "#f8bb86", // A standard warning orange for the button
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });
};





export const useSwalInfoAlert = (title = "No data", message = "There is no data to export.") => {
  return Swal.fire({
    icon: "info",
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: true, 
    confirmButtonColor: "#3085d6", // Standard blue for Info alerts
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });
};






export const useSwalDeleteConfirm = async (
  title = "Delete this item?",
  text = "",
  confirmText = "Confirm"
) => {
  return await Swal.fire({
    title: title,
    text: text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    
    // --- Responsive Sizing ---
    width: "clamp(320px, 90vw, 300px)", // Small on mobile, capped on desktop
    padding: "1rem",
    
    customClass: {
      popup: "toast-glass rounded-xl shadow-2xl border border-white/20",
      title: "text-lg font-bold text-gray-800 m-0 pt-2",
      htmlContainer: "text-xs text-gray-600 m-0 pt-1",
      confirmButton: "text-xs py-2 px-4 rounded-lg shadow-sm",
      cancelButton: "text-xs py-2 px-4 rounded-lg",
      actions: "gap-2 mt-4 mb-2" // Adds spacing between buttons and from the text
    },

    // --- Modern Transitions ---
    showClass: { popup: "swal2-show toast-smooth-in" },
    hideClass: { popup: "swal2-hide toast-smooth-out" },

    didOpen: (popup) => {
      // Scale down the warning icon to keep the popup compact
      const icon = Swal.getIcon();
      if (icon) {
        icon.style.transform = "scale(0.75)";
        icon.style.marginBottom = "-10px";
      }
    }
  });
};





export const useSwalDeleteSuccess = () => {
  return Swal.fire({
    title: "Deleted",
    text: "The item has been deleted.",
    icon: "success",
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};




export const useSwalDeleteRecord = (
  title = "Deleted!",
  message = "Record has been successfully removed."
) => {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: title,
    html: `
      <div style="text-align:left; font-size:clamp(10px, 1.2vw, 14px); line-height:1.45; color:#374151; margin-bottom: -10px;">
        ${message}
      </div>
    `,

    showConfirmButton: false,
    showCloseButton: true,
    timer: 3000, // Slightly shorter than error for successful actions
    timerProgressBar: true,

    width: 400,
    padding: "12px 14px",

    // ✅ Match your smooth entrance/exit classes
    showClass: { popup: "swal2-show toast-smooth-in" },
    hideClass: { popup: "swal2-hide toast-smooth-out" },

    customClass: {
      // ✅ Same translucent + glass styling
      popup: "toast-glass rounded-xl shadow-lg border border-white/20",
      htmlContainer: "m-0 p-0",
      closeButton: "text-gray-700/70 hover:text-gray-900",
      timerProgressBar: "rounded-b-xl bg-green-500", // Using green for success
      title: "margin-bottom: -10px",
    },

    didOpen: (toast) => {
      const icon = Swal.getIcon();
      if (icon) {
        icon.style.transform = "scale(0.9)";
        icon.style.margin = "0 0px 0 0";
      }
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};



export const useSwalConfirmAlert = (title = "Are you sure?", message = "") => {
  return Swal.fire({
    title,
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, proceed!",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "rounded-xl shadow-2xl", // Keeps styling consistent with your Success alert
    },
  });
};




export const useSwalHandleOpenSpecsModal = (index, detailRows, handleDetailChange,rowValue, rowTitle, rowName,placeHolderValue) => {
  const row = detailRows[index];

  Swal.fire({
    title: rowTitle,
    input: 'textarea',
    inputValue: rowValue || '',
    inputPlaceholder: placeHolderValue,
   showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#64748b',
    reverseButtons: true, // Optional: puts 'Save' on the right, 'Cancel' on the left
    inputAttributes: {
      'aria-label': 'Type your specifications here',
      'style': 'height: 150px; font-size: 0.875rem;' // Optional: consistent sizing
    },
    customClass: {
      actions: 'w-full px-6 gap-2', // Containers for buttons
      confirmButton: 'flex-1 py-2', // Forces Save to take half width
      cancelButton: 'flex-1 py-2',  // Forces Cancel to take half width
      input: 'focus:ring-blue-500'   
    },
    buttonsStyling: true,
  }).then((result) => {
    if (result.isConfirmed) {
      handleDetailChange(index, rowName, result.value);
    }
  });
};