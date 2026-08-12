import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Minimize2,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useHelpSupportResources from "./useHelpSupportResources";

const PAGE_SIZE = 10;

const UserManuals = ({ manualBaseUrl = "/Guide" }) => {
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const { manuals, loading, error, refresh } =
    useHelpSupportResources();

  const [searchText, setSearchText] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedManual, setSelectedManual] = useState(null);
  const [page, setPage] = useState(1);

  const buildManualUrl = (fileName) => {
    if (!fileName) return "";

    if (/^https?:\/\//i.test(fileName)) {
      return fileName;
    }

    const base = String(manualBaseUrl || "").replace(/\/$/, "");
    const file = String(fileName).replace(/^\/+/, "");

    return `${base}/${encodeURI(file)}`;
  };

  const modules = useMemo(
    () =>
      Array.from(
        new Map(
          manuals.map((item) => [
            item.moduleCode || item.module,
            item.module || item.moduleCode,
          ])
        ).entries()
      )
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [manuals]
  );

  const filteredManuals = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return manuals.filter((item) => {
      const matchesModule =
        selectedModule === "ALL" ||
        item.moduleCode === selectedModule ||
        item.module === selectedModule;

      const matchesSearch =
        !keyword ||
        [
          item.moduleCode,
          item.module,
          item.subMenu,
          item.menuCode,
          item.menuName,
          item.userManual,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return matchesModule && matchesSearch;
    });
  }, [manuals, searchText, selectedModule]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredManuals.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const currentRows = filteredManuals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const groupedManuals = currentRows.reduce((result, item) => {
    const moduleName = item.module || "Other";
    result[moduleName] = result[moduleName] || [];
    result[moduleName].push(item);
    return result;
  }, {});

  useEffect(() => {
    if (filteredManuals.length === 0) {
      setSelectedManual(null);
      return;
    }

    const selectedStillExists = filteredManuals.some(
      (item) =>
        (item.id || item.menuCode) ===
        (selectedManual?.id || selectedManual?.menuCode)
    );

    if (!selectedStillExists) {
      setSelectedManual(filteredManuals[0]);
    }
  }, [filteredManuals, selectedManual]);

  const selectedManualUrl = useMemo(
    () => buildManualUrl(selectedManual?.userManual),
    [selectedManual, manualBaseUrl]
  );

  const openFloatingSupport = (item = selectedManual) => {
    if (!item?.userManual) return;

    const url = buildManualUrl(item.userManual);

    window.dispatchEvent(
      new CustomEvent("support:open", {
        detail: {
          title: item.menuName || item.menuCode || "User Manual",
          fileName: item.userManual,
          url,
        },
      })
    );
  };

  const handleSelectManual = (item) => {
    setSelectedManual(item);
    openFloatingSupport(item);
  };

  const handleDownload = () => {
    if (!selectedManualUrl || !selectedManual?.userManual) return;

    const anchor = document.createElement("a");
    anchor.href = selectedManualUrl;
    anchor.download = selectedManual.userManual.split("/").pop();
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handlePrint = () => {
    if (!selectedManualUrl) return;

    try {
      const iframeWindow = previewRef.current?.contentWindow;

      if (iframeWindow) {
        iframeWindow.focus();
        iframeWindow.print();
        return;
      }
    } catch (printError) {
      console.warn("Inline PDF print failed:", printError);
    }

    const printWindow = window.open(
      selectedManualUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  };

  return (
    <div className="min-h-full w-full bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 lg:px-5">
      <div className="w-full">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/help-support")}
              className="mt-1 rounded-full p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Documentation Center</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                User Manuals
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select a manual to preview, download, or print.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(380px,0.85fr)_minmax(620px,1.4fr)]">
          <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px] xl:grid-cols-1 2xl:grid-cols-[1fr_200px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search manuals..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <select
                value={selectedModule}
                onChange={(event) => {
                  setSelectedModule(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="ALL">All Modules</option>

                {modules.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading user manuals...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : filteredManuals.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <FileText className="h-10 w-10 text-slate-400" />

                <h3 className="mt-4 font-semibold text-slate-800 dark:text-white">
                  No user manuals found
                </h3>

                <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Add the PDF filename to the HS_MENU.user_manual column.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedManuals).map(
                  ([moduleName, items]) => (
                    <section key={moduleName}>
                      <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                        {moduleName}
                      </h2>

                      <div className="space-y-3">
                        {items.map((item) => {
                          const isSelected =
                            (selectedManual?.id ||
                              selectedManual?.menuCode) ===
                            (item.id || item.menuCode);

                          return (
                            <button
                              key={item.id || item.menuCode}
                              type="button"
                              onClick={() => handleSelectManual(item)}
                              className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left shadow-sm transition ${
                                isSelected
                                  ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-900/30"
                                  : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
                                  }`}
                                >
                                  <FileText className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {item.menuName || item.menuCode}
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {item.subMenu || "User Manual"}
                                  </p>

                                  <p
                                    className="mt-1 max-w-[300px] truncate text-[11px] text-slate-400"
                                    title={item.userManual}
                                  >
                                    {item.userManual}
                                  </p>
                                </div>
                              </div>

                              <Eye
                                className={`h-4 w-4 shrink-0 ${
                                  isSelected
                                    ? "text-blue-600 dark:text-blue-300"
                                    : "text-slate-400"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}

            {!loading && !error && filteredManuals.length > 0 && (
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredManuals.length
                  )}{" "}
                  of {filteredManuals.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setPage((value) => Math.max(1, value - 1))
                    }
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">
                    {currentPage}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setPage((value) =>
                        Math.min(totalPages, value + 1)
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="min-w-0">
            <div className="sticky top-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                    PDF Preview
                  </div>

                  <h2 className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">
                    {selectedManual?.menuName ||
                      selectedManual?.menuCode ||
                      "Select a user manual"}
                  </h2>

                  {selectedManual?.userManual && (
                    <p
                      className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                      title={selectedManual.userManual}
                    >
                      {selectedManual.userManual}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFloatingSupport()}
                    disabled={!selectedManualUrl}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Keep Open
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!selectedManualUrl}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-500/10"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!selectedManualUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>

              <div className="h-[72vh] min-h-[560px] bg-slate-100 dark:bg-slate-950">
                {selectedManualUrl ? (
                  <iframe
                    ref={previewRef}
                    key={selectedManualUrl}
                    src={`${selectedManualUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    title={
                      selectedManual?.menuName ||
                      selectedManual?.userManual ||
                      "PDF Preview"
                    }
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <FileText className="h-14 w-14 text-slate-300 dark:text-slate-700" />

                    <h3 className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-200">
                      No PDF selected
                    </h3>

                    <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                      Select a user manual from the list to preview it here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default UserManuals;