// src/AccountsReceivable/ARINQ/ARINQActionBar.jsx
import React, { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSave, faUndo, faPrint, faFileExport, faMagnifyingGlass,
    faRedo, faFilePdf, faInfoCircle, faSpinner, faTriangleExclamation
} from "@fortawesome/free-solid-svg-icons";

/**
 * Props:
 * - activeTab: "inquiry" | "advances" | "aging" | "deferred"
 * - onAction: (actionId: string) => void
 * - help: { pdfLink?: string, videoLink?: string }
 * - busy?: boolean
 */
export default function ARINQActionBar({ activeTab, onAction, help = {}, busy = false }) {
    const [openGuide, setOpenGuide] = useState(false);
    const ref = useRef(null);

    const click = (id) => () => onAction?.(id);

    // Button map per tab (IDs are used by the handler in ARINQ.jsx)
    const BUTTONS = {
        inquiry: [
            { id: "find", label: "Find", icon: faMagnifyingGlass, color: "bg-blue-600" },
            { id: "reset", label: "Reset", icon: faUndo, color: "bg-blue-600" },
            // { id: "print", label: "Print", icon: faPrint, color: "bg-blue-600" },
            // { id: "export", label: "Export", icon: faFileExport, color: "bg-blue-600" },
        ],
        advances: [
            { id: "find", label: "Find", icon: faMagnifyingGlass, color: "bg-blue-600" },
            { id: "reset", label: "Reset", icon: faUndo, color: "bg-blue-600" },
            // { id: "print", label: "Print", icon: faPrint, color: "bg-blue-600" },
            // { id: "export", label: "Export", icon: faFileExport, color: "bg-blue-600" },
        ],

        aging: [
            { id: "reprocess", label: "Find", icon: faMagnifyingGlass, color: "bg-blue-600" },
            { id: "reset", label: "Reset", icon: faUndo, color: "bg-blue-600" },
            // { id: "print", label: "Print", icon: faPrint, color: "bg-blue-600" },
            // { id: "export", label: "Export", icon: faFileExport, color: "bg-blue-600" },
        ],
        
    };

    const items = BUTTONS[activeTab] || [];

    // The component now only renders the action buttons and the help dropdown.
    // The previous wrapper divs for sticky positioning, background, and shadow have been removed.
    return (
        <div className="flex flex-wrap items-center justify-end gap-1 lg:gap-2">
            {items.map(btn => (
                <button
                    key={btn.id}
                    onClick={click(btn.id)}
                    disabled={busy}
                    className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md text-white hover:opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${btn.color}`}
                >
                    {busy ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                        <FontAwesomeIcon icon={btn.icon} />
                    )}
                    <span className="hidden lg:block ml-2">{btn.label}</span>
                </button>
            ))}

            {/* Help dropdown (optional) */}
            {(help?.pdfLink || help?.videoLink) && (
                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpenGuide(v => !v)}
                        className="flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:opacity-90"
                    >
                        <FontAwesomeIcon icon={faInfoCircle} />
                        <span className="hidden lg:block ml-2">Guide</span>
                    </button>
                    {openGuide && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                            {help.pdfLink && (
                                <button
                                    onClick={() => { window.open(help.pdfLink, "_blank"); setOpenGuide(false); }}
                                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                                    PDF Guide
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}