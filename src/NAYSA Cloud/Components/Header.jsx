import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faPen,
  faSave,
  faUndo,
  faPrint,
  faTimesCircle,
  faCopy,
  faInfoCircle,
  faVideo,
  faFilePdf,
  faPaperclip,
  faExclamationTriangle,
  faFileImport,
  faBell,
  faEllipsisH,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";
// import { useReset } from "./ResetContext"; // if you need it, keep; otherwise remove

const Header = ({
  // navigation / tabs
  activeTopTab, // 'details' | 'history' (optional; overrides auto-detection)
  detailsRoute = "/page/SVI",
  historyRoute = "/page/AllTranHistory",
  onDetails, // optional override (don’t navigate)
  onHistory, // optional override (don’t navigate)

  // actions
  showActions = true,
  showBIRForm = true,
  birFormLabel = "BIR Form",
  showCopyForm = true,
  showPrintCheck = false,
  isViewDocument = false,
  showPost = false,
  showCloseTransaction = false,
  showUpload = false,
  showNotify = false,
  isPrintDisabled = false,
  isPrintBIRDisabled,
  isSaveDisabled = false,   
  isCopyDisabled = false,   
  isAttachDisabled = false, 
  isCancelDisabled = false,
  isCloseTransactionDisabled = false,
  isResetDisabled = false, 
  isNotifyDisabled = false,


  // action callbacks
  pdfLink,
  videoLink,
  onPrint,
  onPrintBIR,
  onPrintCheck,
  printData,
  onReset,
  onSave,
  onPost,
  onCloseTransaction,
  onCancel,
  onCopy,
  onAttach,
  onUpload,
  onNotify,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { triggerReset } = useReset();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const guideDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        guideDropdownRef.current &&
        !guideDropdownRef.current.contains(e.target)
      ) {
        setIsGuideOpen(false);
      }

      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(e.target)
      ) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- compute which tab is active ----
  const computedActive =
    activeTopTab ??
    (location.pathname === historyRoute
      ? "history"
      : location.pathname === detailsRoute
        ? "details"
        : undefined);

  // ---- navigation guards: only navigate if path actually changes ----
  const goDetails = () => {
    if (onDetails) return onDetails();
    if (location.pathname !== detailsRoute) navigate(detailsRoute);
  };

  const goHistory = () => {
    if (onHistory) return onHistory();
    if (location.pathname !== historyRoute) navigate(historyRoute);
  };

  // ---- actions ----
  const handleSave = () => onSave?.();
  const handlePost = () => onPost?.();
  const handleCloseTransaction = () => onCloseTransaction?.();
  const handleAttach = () => onAttach?.();
  const handleReset = () => onReset?.();
  const handleCancel = () => onCancel?.();
  const handleCopy = () => onCopy?.();
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setIsGuideOpen(false);
  };
  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setIsGuideOpen(false);
  };
  const handlePrint = () => onPrint?.(printData);
  const handlePrintBIR = () => (onPrintBIR ?? onPrint)?.(printData);
  const resolvedPrintBIRDisabled = isPrintBIRDisabled ?? isPrintDisabled;
  const handlePrintCheck = () => onPrintCheck?.();
  const handleUpload = () => onUpload?.();
  const handleNotify = () => onNotify?.();
  const closeMoreMenu = () => setIsMoreOpen(false);

  const mobileLabelClass = "block text-[8px] leading-none lg:hidden";
  const desktopLabelClass = "hidden lg:inline lg:ml-2";
  const getBlueButtonClass = (disabled = false) =>
    `inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium rounded-md text-white transition-all duration-200 lg:flex-row lg:px-3 lg:py-2 lg:text-xs ${
      disabled
        ? "bg-blue-600 dark:bg-blue-800 opacity-65 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700"
    }`;
  const greenButtonClass =
    "inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium rounded-md bg-green-600 text-white transition-all duration-200 hover:bg-green-700 lg:flex-row lg:px-3 lg:py-2 lg:text-xs dark:bg-green-700 dark:hover:bg-green-600";
  const getRedButtonClass = (disabled = false) =>
    `inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium rounded-md text-white transition-all duration-200 lg:flex-row lg:px-3 lg:py-2 lg:text-xs ${
      disabled
        ? "bg-red-600 dark:bg-red-800 opacity-50 cursor-not-allowed"
        : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
    }`;
  const mobileMoreItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-600";
  const showMobileMore = showUpload || showNotify || true;

  return (
    <div className="fixed top-[50px] left-0 w-full z-30 bg-white shadow-md dark:bg-gray-800">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-1 gap-2 border-b border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center md:justify-start gap-1 lg:gap-2 w-full md:w-auto">
          <button
            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
              ${
                computedActive === "details"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
              }`}
            onClick={goDetails}
          >
            <FontAwesomeIcon icon={faPen} className="w-4 h-3 mr-2" />
            Transaction Details
          </button>

          {!isViewDocument && (
            <button
              className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
              ${
                computedActive === "history"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
              }`}
              onClick={goHistory}
            >
              <FontAwesomeIcon icon={faList} className="w-4 h-4 mr-2" />
              Transaction History
            </button>
          )}
        </div>

        {/* Actions (hidden when showActions=false) */}
        {showActions && !isViewDocument && (
          <div className="flex flex-wrap justify-center md:justify-end gap-1 lg:gap-2 w-full md:w-auto">
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className={getBlueButtonClass(isSaveDisabled)}
            >
              <FontAwesomeIcon icon={faSave} />{" "}
              <span className={mobileLabelClass}>Save</span>
              <span className={desktopLabelClass}>Save</span>
            </button>
            <button
              onClick={handleReset}
              disabled={isResetDisabled}
              className={getBlueButtonClass(isResetDisabled)}
            >
              <FontAwesomeIcon icon={faUndo} />{" "}
              <span className={mobileLabelClass}>Reset</span>
              <span className={desktopLabelClass}>Reset</span>
            </button>
            {showCopyForm && (
              <button
                onClick={handleCopy}
                disabled={isCopyDisabled}
                className={getBlueButtonClass(isCopyDisabled)}
              >
                <FontAwesomeIcon icon={faCopy} />{" "}
                <span className={mobileLabelClass}>Copy</span>
                <span className={desktopLabelClass}>Copy</span>
              </button>
            )}
            <button 
              onClick={handlePrint} 
              disabled={isPrintDisabled}
              className={getBlueButtonClass(isPrintDisabled)}
            >
              <FontAwesomeIcon icon={faPrint} />
              <span className={mobileLabelClass}>Print</span>
              <span className={desktopLabelClass}>Print</span>
            </button>
            {showPrintCheck && (
              <button 
                onClick={handlePrintCheck} 
                disabled={isPrintDisabled}
                className={getBlueButtonClass(isPrintDisabled)}
              >
                <FontAwesomeIcon icon={faPrint} />
                <span className={mobileLabelClass}>Print Check</span>
                <span className={desktopLabelClass}>Print Check</span>
              </button>
            )}
           {showBIRForm && (
              <button 
                onClick={handlePrintBIR} 
                disabled={resolvedPrintBIRDisabled}
                className={getBlueButtonClass(resolvedPrintBIRDisabled)}
              >
                <FontAwesomeIcon icon={faPrint} />
                <span className={mobileLabelClass}>{birFormLabel}</span>
                <span className={desktopLabelClass}>{birFormLabel}</span>
              </button>
            )}
            <button
              onClick={handleAttach}
              disabled={isAttachDisabled}
              className={getBlueButtonClass(isAttachDisabled)}
            >
              <FontAwesomeIcon icon={faPaperclip} />{" "}
              <span className={mobileLabelClass}>Attach</span>
              <span className={desktopLabelClass}>Attach</span>
            </button>

            {showUpload && (
              <button
                onClick={handleUpload}
                className={`${getBlueButtonClass(false)} max-lg:hidden`}
              >
                <FontAwesomeIcon icon={faFileImport} />{" "}
                <span className={mobileLabelClass}>Upload</span>
                <span className={desktopLabelClass}>Upload</span>
              </button>
            )}

            <div className="relative max-lg:hidden" ref={guideDropdownRef}>
              <button
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className={getBlueButtonClass(false)}
              >
                <FontAwesomeIcon icon={faInfoCircle} />{" "}
                <span className={mobileLabelClass}>Guide</span>
                <span className={desktopLabelClass}>Guide</span>
              </button>
              {isGuideOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                  <div className="py-1">
                    <button
                      onClick={handlePDFGuide}
                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-600"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={handleVideoGuide}
                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />{" "}
                      Video Guide
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showPost && (
              <button
                onClick={handlePost}
                className={greenButtonClass}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />{" "}
                <span className={mobileLabelClass}>Post</span>
                <span className={desktopLabelClass}>Post</span>
              </button>
            )}
            {showNotify && (
              <button
                onClick={handleNotify}
                disabled={isNotifyDisabled}
                className={`${getBlueButtonClass(isNotifyDisabled)} max-lg:hidden`}
              >
                <FontAwesomeIcon icon={faBell} />{" "}
                <span className={mobileLabelClass}>Notify</span>
                <span className={desktopLabelClass}>Notify</span>
              </button>
            )}
            {showMobileMore && (
              <div className="relative lg:hidden" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  className={getBlueButtonClass(false)}
                >
                  <FontAwesomeIcon icon={faEllipsisH} />{" "}
                  <span className={mobileLabelClass}>More</span>
                </button>

                {isMoreOpen && (
                  <div className="absolute right-0 top-full z-[70] mt-2 w-36 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                    {showUpload && (
                      <button
                        type="button"
                        onClick={() => {
                          closeMoreMenu();
                          handleUpload();
                        }}
                        className={mobileMoreItemClass}
                      >
                        <FontAwesomeIcon icon={faFileImport} />
                        Upload
                      </button>
                    )}
                    {showNotify && (
                      <button
                        type="button"
                        onClick={() => {
                          closeMoreMenu();
                          handleNotify();
                        }}
                        disabled={isNotifyDisabled}
                        className={mobileMoreItemClass}
                      >
                        <FontAwesomeIcon icon={faBell} />
                        Notify
                      </button>
                    )}
                    <div className="mt-1 border-t border-slate-100 pt-1 dark:border-gray-600">
                      <button
                        type="button"
                        onClick={() => {
                          closeMoreMenu();
                          handlePDFGuide();
                        }}
                        className={mobileMoreItemClass}
                      >
                        <FontAwesomeIcon icon={faFilePdf} />
                        PDF Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeMoreMenu();
                          handleVideoGuide();
                        }}
                        className={mobileMoreItemClass}
                      >
                        <FontAwesomeIcon icon={faVideo} />
                        Video Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showCloseTransaction && (
              <button
                onClick={handleCloseTransaction}
                disabled={isCloseTransactionDisabled}
                className={getRedButtonClass(isCloseTransactionDisabled)}
              >
                <FontAwesomeIcon icon={faLock} />{" "}
                <span className={mobileLabelClass}>Close</span>
                <span className={desktopLabelClass}>Close</span>
              </button>
            )}
           <button
              onClick={handleCancel}
              disabled={isCancelDisabled}
              className={getRedButtonClass(isCancelDisabled)}
            >
              <FontAwesomeIcon icon={faTimesCircle} />{" "}
              <span className={mobileLabelClass}>Cancel</span>
              <span className={desktopLabelClass}>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// push content below fixed header
export const HeaderSpacer = ({ height = "96px" }) => (
  <div style={{ height }} aria-hidden="true" />
);

export default Header;


