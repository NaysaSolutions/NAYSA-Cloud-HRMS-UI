import Swal from 'sweetalert2';

const SWAL_AUTO_CLOSE_TIMER = 5000; // 5 seconds

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
    timer: SWAL_AUTO_CLOSE_TIMER,
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


export const useSwalvalidateRequiredFields = async (
  fields,
  title = "Required Fields"
) => {
  let errors = [];

  for (const [label, value] of Object.entries(fields)) {
    if (
      !value ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "string" && value.trim() === "")
    ) {
      errors.push(`- ${label}`);
    }
  }

  if (errors.length > 0) {
    const errorMessage =
      "The following fields are required:\n" + errors.join("\n");

    await Swal.fire({
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
            <div class="swal-sonner-error-toast-message">${String(errorMessage).replace(/\n/g, "<br/>")}</div>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      timer: SWAL_AUTO_CLOSE_TIMER,
      timerProgressBar: true,
      width: 320,
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
          popup.style.borderRadius = "10px";

          const titleEl = popup.querySelector(".swal-sonner-error-toast-title");
          const messageEl = popup.querySelector(".swal-sonner-error-toast-message");

          if (titleEl) {
            titleEl.style.fontSize = "13px";
            titleEl.style.fontWeight = "700";
          }

          if (messageEl) {
            messageEl.style.fontSize = "11px";
            messageEl.style.lineHeight = "1.4";
            messageEl.style.marginTop = "2px";
          }
        }

        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
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


export const useSwalshowSaveSuccessDialog = (
  onConfirm,
  onPrint,
  onComplete
) => {
  Swal.fire({
    title: "",
    text: "",
    icon: undefined,
    html: `
      <div class="swal-save-dialog-wrap">
        <div class="swal-save-dialog-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        </div>

        <div class="swal-save-dialog-title">Record Saved</div>
        <div class="swal-save-dialog-message">What would you like to do next?</div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "Create New",
    denyButtonText: "Print Preview",
    cancelButtonText: "Completed",
    reverseButtons: false,
    buttonsStyling: false,

    width: 430,
    padding: "0",
    background: "#ffffff",

    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,

    customClass: {
      popup: "swal-save-dialog-popup",
      htmlContainer: "swal-save-dialog-html",
      actions: "swal-save-dialog-actions",
      confirmButton: "swal-save-dialog-confirm",
      denyButton: "swal-save-dialog-deny",
      cancelButton: "swal-save-dialog-cancel",
      timerProgressBar: "swal-save-dialog-progress",
    },

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    didOpen: () => {
      const popup = Swal.getPopup();

      if (popup) {
        popup.style.borderRadius = "18px";
        popup.style.boxShadow = "0 14px 32px rgba(15, 23, 42, 0.18)";

        popup.addEventListener("mouseenter", Swal.stopTimer);
        popup.addEventListener("mouseleave", Swal.resumeTimer);
      }
    },

    willClose: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.removeEventListener("mouseenter", Swal.stopTimer);
        popup.removeEventListener("mouseleave", Swal.resumeTimer);
      }
    },
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm();
    } else if (result.isDenied && typeof onPrint === "function") {
      onPrint();
    } else if (
      (result.dismiss === Swal.DismissReason.cancel ||
        result.dismiss === Swal.DismissReason.timer) &&
      typeof onComplete === "function"
    ) {
      onComplete();
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
    timer: SWAL_AUTO_CLOSE_TIMER,
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
    timer: SWAL_AUTO_CLOSE_TIMER,
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
    icon: undefined,
    title: "",
    html: `
      <div class="swal-sonner-error-toast-wrap">
        <div class="swal-sonner-error-toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v5"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </div>

        <div class="swal-sonner-error-toast-content">
          <div class="swal-sonner-error-toast-title">${title}</div>
          ${
            message
              ? `<div class="swal-sonner-error-toast-message">${message}</div>`
              : ""
          }
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,
    width: 400,
    padding: "0",
    background: "#ffffff",

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    customClass: {
      popup: "swal-sonner-error-toast-popup",
      htmlContainer: "swal-sonner-error-toast-html",
      closeButton: "swal-sonner-error-toast-close",
      timerProgressBar: "swal-sonner-error-toast-progress",
    },

    didOpen: (toast) => {
      const popup = Swal.getPopup();
      const closeBtn = popup?.querySelector(".swal2-close");

      if (popup) {
        popup.style.borderRadius = "14px";
        popup.style.border = "1px solid rgba(254, 226, 226, 0.9)";
        popup.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
      }

      if (closeBtn) {
        closeBtn.style.width = "28px";
        closeBtn.style.height = "28px";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.borderRadius = "9999px";
        closeBtn.style.color = "#94a3b8";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.transition = "all 0.2s ease";
      }

      closeBtn?.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#f1f5f9";
        closeBtn.style.color = "#334155";
      });

      closeBtn?.addEventListener("mouseleave", () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = "#94a3b8";
      });

      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};




export const useSwalSuccessAlert = (
  title = "Success!",
  message = "Bank record saved successfully."
) => {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: undefined,
    title: "",
    html: `
      <div class="swal-sonner-success-wrap">
        <div class="swal-sonner-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>

        <div class="swal-sonner-success-content">
          <div class="swal-sonner-success-title">${title}</div>
          ${
            message
              ? `<div class="swal-sonner-success-message">${String(message).replace(/\n/g, "<br/>")}</div>`
              : ""
          }
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,
    width: 400,
    padding: "0",
    background: "rgba(255,255,255,0.96)",

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    customClass: {
      popup: "swal-sonner-success-popup",
      htmlContainer: "swal-sonner-success-html",
      closeButton: "swal-sonner-success-close",
      timerProgressBar: "swal-sonner-success-progress",
    },

    didOpen: (toast) => {
      const popup = Swal.getPopup();
      const closeBtn = popup?.querySelector(".swal2-close");

      if (popup) {
        popup.style.borderRadius = "14px";
        popup.style.border = "1px solid rgba(219, 234, 254, 0.95)";
        popup.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
        popup.style.backdropFilter = "blur(10px)";
      }

      if (closeBtn) {
        closeBtn.style.width = "28px";
        closeBtn.style.height = "28px";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.borderRadius = "9999px";
        closeBtn.style.color = "#94a3b8";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.transition = "all 0.2s ease";
      }

      closeBtn?.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#f1f5f9";
        closeBtn.style.color = "#334155";
      });

      closeBtn?.addEventListener("mouseleave", () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = "#94a3b8";
      });

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
    timer: SWAL_AUTO_CLOSE_TIMER,
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


export const useSwalInfoAlert = (
  title = "Info",
  message = "Something to note.",
  fixedMsg = ""
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
          <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,
    width: 320,
    padding: "0",
    background: "#ffffff",
    customClass: {
      popup: "swal-sonner-error-toast-popup",
      htmlContainer: "swal-sonner-error-toast-html",
      closeButton: "swal-sonner-error-toast-close",
      timerProgressBar: "swal-sonner-info-toast-progress", // 👈 NEW CLASS
    },
    didOpen: (toast) => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.borderRadius = "10px";

        const titleEl = popup.querySelector(".swal-sonner-error-toast-title");
        const messageEl = popup.querySelector(".swal-sonner-error-toast-message");

        if (titleEl) {
          titleEl.style.fontSize = "13px";
          titleEl.style.fontWeight = "700";
        }
        if (messageEl) {
          messageEl.style.fontSize = "11px";
          messageEl.style.lineHeight = "1.4";
          messageEl.style.marginTop = "2px";
        }
      }

      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};


export const useSwalDeleteConfirm = async (
  title = "Delete Record?",
  text = "Are you sure you want to delete this record?",
  confirmText = "Yes, delete it"
) => {
  return await Swal.fire({
    title: "",
    text: "",
    html: `
      <div class="swal-sonner-delete-wrap">
        <div class="swal-sonner-delete-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8v5"></path>
            <path d="M12 16h.01"></path>
            <path d="M10.29 3.86l-7.5 13A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.71-3.14l-7.5-13a2 2 0 0 0-3.42 0z"></path>
          </svg>
        </div>

        <div class="swal-sonner-delete-title">${title}</div>
        <div class="swal-sonner-delete-message">${String(text).replace(/\n/g, "<br/>")}</div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    reverseButtons: false,
    buttonsStyling: false,

    width: 360,
    padding: "0",
    background: "#ffffff",

    customClass: {
      popup: "swal-sonner-delete-popup",
      htmlContainer: "swal-sonner-delete-html",
      actions: "swal-sonner-delete-actions",
      confirmButton: "swal-sonner-delete-confirm",
      cancelButton: "swal-sonner-delete-cancel",
    },

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.borderRadius = "16px";
        popup.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.18)";
      }
    },
  });
};



export const useSwalProceedConfirm = async (
  title = "Confirm Logout",
  text = "Are you sure you want to logout?",
  confirmText = "Yes, logout!",
  cancelText = "Cancel"
) => {
  return await Swal.fire({
    title: "",
    html: `
      <style>
        .swal-proceed-wrap {
          text-align: center;
          padding: 24px 24px 12px;
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .swal-proceed-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 18px;
        }

        .swal-proceed-icon svg {
          width: 100%;
          height: 100%;
        }

        .swal-proceed-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 10px;
        }

        .swal-proceed-text {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .swal-proceed-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 0 20px 22px;
        }

        .swal-proceed-confirm {
          background: #ef4444;
          color: #fff;
          padding: 12px 22px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          min-width: 120px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .swal-proceed-confirm:hover {
          background: #dc2626;
        }

        .swal-proceed-cancel {
          background: #6b7280;
          color: #fff;
          padding: 12px 22px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          min-width: 110px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .swal-proceed-cancel:hover {
          background: #4b5563;
        }
      </style>

      <div class="swal-proceed-wrap">
        <div class="swal-proceed-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f4a261" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <!-- outer circle -->
            <circle cx="12" cy="12" r="9"></circle>
            <!-- question mark -->
            <path d="M9.75 9a2.25 2.25 0 1 1 4.5 1.2c-.7.8-1.75 1.2-1.75 2.8"></path>
            <circle cx="12" cy="16.8" r="0.7" fill="#f4a261" stroke="none"></circle>
          </svg>
        </div>

        <div class="swal-proceed-title">${title}</div>
        <div class="swal-proceed-text">${String(text).replace(/\n/g, "<br/>")}</div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    buttonsStyling: false,

    width: 360,
    padding: "0",
    background: "#ffffff",

    customClass: {
      actions: "swal-proceed-actions",
      confirmButton: "swal-proceed-confirm",
      cancelButton: "swal-proceed-cancel",
    },

    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.borderRadius = "18px";
        popup.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
      }
    },
  });
};


export const useSwalDeleteSuccess = () => {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: undefined,
    title: "",
    html: `
      <div class="swal-sonner-delete-toast-wrap">
        <div class="swal-sonner-delete-toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        </div>

        <div class="swal-sonner-delete-toast-content">
          <div class="swal-sonner-delete-toast-title">Deleted</div>
          <div class="swal-sonner-delete-toast-message">The item has been deleted.</div>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,
    width: 400,
    padding: "0",
    background: "rgba(255,255,255,0.96)",

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    customClass: {
      popup: "swal-sonner-delete-toast-popup",
      htmlContainer: "swal-sonner-delete-toast-html",
      closeButton: "swal-sonner-delete-toast-close",
      timerProgressBar: "swal-sonner-delete-toast-progress",
    },

    didOpen: (toast) => {
      const popup = Swal.getPopup();
      const closeBtn = popup?.querySelector(".swal2-close");

      if (popup) {
        popup.style.borderRadius = "14px";
        popup.style.border = "1px solid rgba(254, 226, 226, 0.95)";
        popup.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
        popup.style.backdropFilter = "blur(10px)";
      }

      if (closeBtn) {
        closeBtn.style.width = "28px";
        closeBtn.style.height = "28px";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.borderRadius = "9999px";
        closeBtn.style.color = "#94a3b8";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.transition = "all 0.2s ease";
      }

      closeBtn?.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#f1f5f9";
        closeBtn.style.color = "#334155";
      });

      closeBtn?.addEventListener("mouseleave", () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = "#94a3b8";
      });

      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};

export const useSwalDeleteRecord = (
  title = "Deleted",
  message = "Record deleted Successfully."
) => {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: undefined,
    title: "",
    html: `
      <div class="swal-sonner-delete-toast-wrap">
        <div class="swal-sonner-delete-toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        </div>

        <div class="swal-sonner-delete-toast-content">
          <div class="swal-sonner-delete-toast-title">${title}</div>
          ${
            message
              ? `<div class="swal-sonner-delete-toast-message">${String(message).replace(/\n/g, "<br/>")}</div>`
              : ""
          }
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: SWAL_AUTO_CLOSE_TIMER,
    timerProgressBar: true,
    width: 400,
    padding: "0",
    background: "#ffffff",

    showClass: {
      popup: "swal2-show toast-smooth-in",
    },
    hideClass: {
      popup: "swal2-hide toast-smooth-out",
    },

    customClass: {
      popup: "swal-sonner-delete-toast-popup",
      htmlContainer: "swal-sonner-delete-toast-html",
      closeButton: "swal-sonner-delete-toast-close",
      timerProgressBar: "swal-sonner-delete-toast-progress",
    },

    didOpen: (toast) => {
      const popup = Swal.getPopup();
      const closeBtn = popup?.querySelector(".swal2-close");

      if (popup) {
        popup.style.borderRadius = "14px";
        popup.style.border = "1px solid rgba(254, 226, 226, 0.9)";
        popup.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
      }

      if (closeBtn) {
        closeBtn.style.width = "28px";
        closeBtn.style.height = "28px";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.borderRadius = "9999px";
        closeBtn.style.color = "#94a3b8";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.transition = "all 0.2s ease";
      }

      closeBtn?.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#f1f5f9";
        closeBtn.style.color = "#334155";
      });

      closeBtn?.addEventListener("mouseleave", () => {
        closeBtn.style.background = "transparent";
        closeBtn.style.color = "#94a3b8";
      });

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





export const useSwalHandleOpenSpecsModal = (
  index,
  detailRows,
  handleDetailChange,
  rowValue,
  rowTitle,
  rowName,
  placeHolderValue
) => {
  Swal.fire({
    title: "",
    html: `
      <div style="
        background: #f8faff;
        padding: 16px 20px;
        border-bottom: 1px solid #dbeafe;
        text-align: left;
        display: flex;
        align-items: center;
      ">
        <div style="color: #1e40af; font-size: 15px; font-weight: 700;">
          ${rowTitle || "Specification"}
        </div>
      </div>
    `,
    input: "textarea",
    inputValue: rowValue || "",
    inputPlaceholder: placeHolderValue || "Enter specification for this item...",
    showCloseButton: true,
    showCancelButton: false,
    confirmButtonText: "Apply",
    width: 400,
    padding: "0",
    background: "#ffffff",
    buttonsStyling: false,
    customClass: {
      popup: "rounded-xl shadow-2xl border border-slate-200 overflow-hidden",
      closeButton:
        "text-slate-400 hover:text-slate-600 focus:outline-none transition-colors",
      input: "m-0",
      actions: "flex justify-center px-5 mt-4 mb-4",
      confirmButton:
        "bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-md shadow-blue-100",
      htmlContainer: "p-0 m-0",
    },
    inputAttributes: {
      style: `
        width: calc(100% - 40px);
        margin: 16px 20px 0 20px;
        min-height: 110px;
        max-height: 190px;
        padding: 12px;
        border-radius: 8px;
        border: 0.5px solid #93c5fd;
        outline: none;
        font-size: 13px;
        line-height: 1.5;
        color: #334155;
        box-sizing: border-box;
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.08);
        resize: vertical;
      `,
    },
    didOpen: () => {
      const popup = Swal.getPopup();

      const header = popup.querySelector(".swal2-header");
      const title = popup.querySelector(".swal2-title");

      if (title) title.style.display = "none";

      if (header) {
        header.style.padding = "0";
        header.style.minHeight = "0";
        header.style.border = "none";
      }

      const closeBtn = popup.querySelector(".swal2-close");

      if (closeBtn) {
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "14px";
        closeBtn.style.right = "20px";
        closeBtn.style.padding = "0";
        closeBtn.style.margin = "0";
        closeBtn.style.width = "24px";
        closeBtn.style.height = "24px";
        closeBtn.style.fontSize = "24px";
        closeBtn.style.lineHeight = "1";
        closeBtn.style.display = "flex";
        closeBtn.style.alignItems = "center";
        closeBtn.style.justifyContent = "center";
        closeBtn.style.background = "transparent";
        closeBtn.style.color = "#94a3b8";
      }

      const confirmBtn = Swal.getConfirmButton();

      if (confirmBtn) {
        confirmBtn.innerHTML = `
          <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          ">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="17" 
              height="17" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2.35" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            Apply
          </span>
        `;
      }

      const input = Swal.getInput();

      if (input) {
        input.focus();

        input.onfocus = () => {
          input.style.border = "0.5px solid #2563eb";
          input.style.boxShadow = "0 0 0 2px rgba(37, 99, 235, 0.12)";
        };

        input.onblur = () => {
          input.style.border = "0.5px solid #93c5fd";
          input.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.08)";
        };
      }
    },
    preConfirm: (value) => (value || "").trim(),
  }).then((result) => {
    if (result.isConfirmed) {
      handleDetailChange(index, rowName, result.value);
    }
  });
};


//   index,
//   detailRows,
//   handleDetailChange,
//   rowValue,
//   rowTitle,
//   rowName,
//   placeHolderValue
// ) => {
//   Swal.fire({
//     title: "", 
//     html: `
//       <div style="
//         background: #f8faff;
//         padding: 16px 20px;
//         border-bottom: 1px solid #e2e8f0;
//         text-align: left;
//         display: flex;
//         align-items: center;
//       ">
//         <div style="color: #1e40af; font-size: 15px; font-weight: 700;">
//           ${rowTitle || "Specification"}
//         </div>
//       </div>
//     `,
//     input: "textarea",
//     inputValue: rowValue || "",
//     inputPlaceholder: placeHolderValue || "Enter specification for this item...",
//     showCloseButton: true,
//     showCancelButton: false,
//     confirmButtonText: "Apply",
//     width: 400, 
//     padding: "0", 
//     background: "#ffffff",
//     buttonsStyling: false,
//     customClass: {
//       popup: "rounded-xl shadow-2xl border border-slate-200 overflow-hidden", // 'overflow-hidden' clips the corners perfectly
//       closeButton: "text-slate-400 hover:text-slate-600 focus:outline-none transition-colors", 
//       input: "m-0",
//       actions: "flex justify-center px-5 mt-4 mb-4", 
//       confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-10 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-100",
//       htmlContainer: "p-0 m-0", // Ensures no extra space around our custom header
//     },
//     inputAttributes: {
//       style: `
//         width: calc(100% - 40px);
//         margin: 16px 20px 0 20px;
//         min-height: 80px;
//         max-height: 150px;
//         padding: 12px;
//         border-radius: 8px;
//         border: 1px solid #cbd5e1;
//         font-size: 13px;
//         line-height: 1.5;
//         color: #334155;
//         box-sizing: border-box;
//       `,
//     },
//     didOpen: () => {
//       const popup = Swal.getPopup();

//       // Hide the empty title wrappers to completely remove the white gap on top
//       const header = popup.querySelector('.swal2-header');
//       const title = popup.querySelector('.swal2-title');
//       if (title) title.style.display = 'none';
//       if (header) {
//         header.style.padding = '0';
//         header.style.minHeight = '0';
//         header.style.border = 'none';
//       }

//       // Precisely align the 'X' button with the "Specification" text
//       const closeBtn = popup.querySelector('.swal2-close');
//       if (closeBtn) {
//         closeBtn.style.position = 'absolute';
//         closeBtn.style.top = '14px'; // Pushed down to align perfectly with the text baseline
//         closeBtn.style.right = '20px'; // Matched with the 20px padding of the header
//         closeBtn.style.padding = '0'; // Strips SweetAlert's default padding
//         closeBtn.style.margin = '0';
//         closeBtn.style.width = '24px'; // Fixed bounding box
//         closeBtn.style.height = '24px';
//         closeBtn.style.fontSize = '24px'; 
//         closeBtn.style.lineHeight = '1';
//         closeBtn.style.display = 'flex';
//         closeBtn.style.alignItems = 'center';
//         closeBtn.style.justifyContent = 'center';
//         closeBtn.style.background = 'transparent';
//         closeBtn.style.color = '#94a3b8'; // Standard slate-400
//       }

//       const input = Swal.getInput();
//       if (input) {
//         input.focus();
//         input.onfocus = () => (input.style.borderColor = "#3b82f6");
//         input.onblur = () => (input.style.borderColor = "#cbd5e1");
//       }
//     },
//     preConfirm: (value) => (value || "").trim(),
//   }).then((result) => {
//     if (result.isConfirmed) {
//       handleDetailChange(index, rowName, result.value);
//     }
//   });
// };
