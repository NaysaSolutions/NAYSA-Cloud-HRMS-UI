// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import {
//   ClipboardCopy,
//   Download,
//   FileText,
//   Maximize2,
//   Minimize2,
//   Minus,
//   MousePointer2,
//   Search,
//   Trash2,
//   Upload,
//   BookOpen,
//   X,
//   ZoomIn,
//   ZoomOut,
// } from "lucide-react";
// import { Document, Page, pdfjs } from "react-pdf";
// import { recognize } from "tesseract.js";
// import workerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";
// import "react-pdf/dist/Page/AnnotationLayer.css";
// import "react-pdf/dist/Page/TextLayer.css";

// pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// const DEFAULT_SCALE = 1.15;
// const MOBILE_SCALE = 0.82;
// const MIN_SCALE = 0.55;
// const MAX_SCALE = 2.8;
// const SCALE_STEP = 0.15;
// const MAX_PDF_FILES = 5;
// const MAX_PDF_SIZE_MB = 25;
// const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
// const EMPTY_EXTERNAL_FILES = [];

// const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// const cleanText = (value = "") =>
//   String(value || "")
//     .replace(/\u00a0/g, " ")
//     .replace(/[ \t]+/g, " ")
//     .replace(/\n{4,}/g, "\n\n\n")
//     .trim();

// const withTimeout = (promise, timeoutMs, message) =>
//   Promise.race([
//     promise,
//     new Promise((_, reject) => {
//       window.setTimeout(() => reject(new Error(message)), timeoutMs);
//     }),
//   ]);

// const safeFileName = (name = "captured-text") =>
//   String(name || "captured-text")
//     .replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "")
//     .replace(/[\\/:*?"<>|]/g, "-")
//     .trim() || "captured-text";

// const isImageFile = (file = {}) => {
//   const type = file.type || file.blob?.type || file.file?.type || "";
//   const name = String(file.name || file.file?.name || file.url || "").toLowerCase();

//   return (
//     type.startsWith("image/") ||
//     name.endsWith(".png") ||
//     name.endsWith(".jpg") ||
//     name.endsWith(".jpeg") ||
//     name.endsWith(".webp")
//   );
// };

// const isPdfFile = (file = {}) =>
//   file.type === "application/pdf" ||
//   file.blob?.type === "application/pdf" ||
//   file.file?.type === "application/pdf" ||
//   String(file.name || file.file?.name || file.url || "").toLowerCase().endsWith(".pdf");

// const getReadableFileKind = (file = {}) => {
//   if (isPdfFile(file)) return "pdf";
//   if (isImageFile(file)) return "image";
//   return "";
// };

// const getExternalFileSignature = (file = {}, index = 0) => {
//   const source = file.blob || file.file || file.url || file;
//   const name = file.name || source?.name || file.url || "";
//   const size = file.size || source?.size || "";
//   const lastModified = file.lastModified || source?.lastModified || "";
//   const type = file.type || source?.type || file.kind || "";

//   return [file.id || "", name, size, lastModified, type, index].join(":");
// };

// const getPdfTextByPage = async (pdf, pageNumber) => {
//   const page = await pdf.getPage(pageNumber);
//   const content = await page.getTextContent();

//   let lastY = null;
//   const lines = [];
//   let currentLine = "";

//   content.items.forEach((item) => {
//     const text = item.str || "";
//     const y = item.transform?.[5] ?? 0;

//     if (lastY !== null && Math.abs(y - lastY) > 5) {
//       if (currentLine.trim()) lines.push(currentLine.trim());
//       currentLine = text;
//     } else {
//       currentLine += `${currentLine ? " " : ""}${text}`;
//     }

//     lastY = y;
//   });

//   if (currentLine.trim()) lines.push(currentLine.trim());
//   return cleanText(lines.join("\n"));
// };

// const renderPdfPageToCanvas = async (pdf, pageNumber, scale = 2) => {
//   const page = await pdf.getPage(pageNumber);
//   const viewport = page.getViewport({ scale });
//   const canvas = document.createElement("canvas");
//   const context = canvas.getContext("2d");

//   canvas.width = Math.ceil(viewport.width);
//   canvas.height = Math.ceil(viewport.height);

//   await page.render({ canvasContext: context, viewport }).promise;
//   return canvas;
// };

// const getRectFromPoints = (start, end) => {
//   if (!start || !end) return null;
//   const left = Math.min(start.x, end.x);
//   const top = Math.min(start.y, end.y);
//   const width = Math.abs(end.x - start.x);
//   const height = Math.abs(end.y - start.y);
//   return { left, top, width, height };
// };

// const rectsIntersect = (a, b) => {
//   if (!a || !b) return false;
//   return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
// };

// const buildHighlightedHtml = (text, query) => {
//   const q = String(query || "").trim();
//   if (!q) return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
//   const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//   return text
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(new RegExp(escaped, "gi"), (m) => `<mark class=\"bg-yellow-200 px-0.5\">${m}</mark>`);
// };

// const PdfTextCaptureModal = ({
//   isOpen,
//   onClose,
//   title = "PDF Text Capture",
//   initialText = "",
//   onApply,
//   externalFile = null,
//   externalFiles = EMPTY_EXTERNAL_FILES,
// }) => {
//   const [pdfFiles, setPdfFiles] = useState([]);
//   const [activePdfId, setActivePdfId] = useState(null);
//   const [capturedText, setCapturedText] = useState(initialText || "");
//   const [isReading, setIsReading] = useState(false);
//   const [isCopied, setIsCopied] = useState(false);
//   const [loadError, setLoadError] = useState("");
//   const [scale, setScale] = useState(DEFAULT_SCALE);
//   const [isMaximized, setIsMaximized] = useState(false);
//   const [isMinimized, setIsMinimized] = useState(false);
//   const [isSnipMode, setIsSnipMode] = useState(false);
//   const [isMagnifierOn, setIsMagnifierOn] = useState(false);
//   const [snipStart, setSnipStart] = useState(null);
//   const [snipEnd, setSnipEnd] = useState(null);
//   const [snipRect, setSnipRect] = useState(null);
//   const [magnifier, setMagnifier] = useState({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
//   const [isPageRendering, setIsPageRendering] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [rightPaneWidth, setRightPaneWidth] = useState(380);
//   const [isPaneResizing, setIsPaneResizing] = useState(false);

//   const pdfDocsRef = useRef({});
//   const fileInputRef = useRef(null);
//   const pageShellRef = useRef(null);
//   const pageShellRefs = useRef({});
//   const viewerScrollRef = useRef(null);
//   const modalRef = useRef(null);

//   useEffect(() => {
//     if (!isOpen) return undefined;

//     const previousBodyOverflow = document.body.style.overflow;
//     const previousHtmlOverflow = document.documentElement.style.overflow;

//     document.body.style.overflow = "hidden";
//     document.documentElement.style.overflow = "hidden";

//     return () => {
//       document.body.style.overflow = previousBodyOverflow;
//       document.documentElement.style.overflow = previousHtmlOverflow;
//     };
//   }, [isOpen]);

//   const activePdf = useMemo(
//     () => pdfFiles.find((item) => item.id === activePdfId) || null,
//     [pdfFiles, activePdfId]
//   );

//   const activeFileKind = activePdf?.kind || getReadableFileKind(activePdf?.file || activePdf || {});
//   const isActiveImage = activeFileKind === "image";
//   const activePdfDoc = activeFileKind === "pdf" && activePdf ? pdfDocsRef.current[activePdf.id] : null;
//   const pageNumber = activePdf?.pageNumber || 1;
//   const numPages = isActiveImage ? 1 : activePdf?.numPages || 0;
//   const fileUrl = activePdf?.url || "";
//   const externalSourceSignature =
//     Array.isArray(externalFiles) && externalFiles.length > 0
//       ? externalFiles.map(getExternalFileSignature).join("|")
//       : externalFile
//         ? getExternalFileSignature(externalFile)
//         : "";

//   useEffect(() => {
//     pageShellRef.current = activePdfId ? pageShellRefs.current[activePdfId] || null : null;
//   }, [activePdfId, pdfFiles]);

//   useEffect(() => {
//     if (!isPageRendering) return undefined;

//     const timer = window.setTimeout(() => {
//       setIsPageRendering(false);
//     }, isActiveImage ? 300 : 1800);

//     return () => window.clearTimeout(timer);
//   }, [isPageRendering, activePdfId, pageNumber, scale, isActiveImage]);

//   const updateActivePdf = (updates) => {
//     if (!activePdfId) return;
//     setPdfFiles((prev) =>
//       prev.map((item) => (item.id === activePdfId ? { ...item, ...updates } : item))
//     );
//   };

//   useEffect(() => {
//     if (!isOpen) return;
//     const updateScale = () => {
//       setScale((prev) => {
//         if (prev !== DEFAULT_SCALE && prev !== MOBILE_SCALE) return prev;
//         return window.innerWidth < 640 ? MOBILE_SCALE : DEFAULT_SCALE;
//       });
//     };
//     updateScale();
//     window.addEventListener("resize", updateScale);
//     return () => window.removeEventListener("resize", updateScale);
//   }, [isOpen]);


//   const clearAll = () => {
//     pdfFiles.forEach((item) => URL.revokeObjectURL(item.url));
//     setPdfFiles([]);
//     setActivePdfId(null);
//     setCapturedText("");
//     setIsReading(false);
//     setIsCopied(false);
//     setLoadError("");
//     setIsMaximized(false);
//     setIsMinimized(false);
//     setIsSnipMode(false);
//     setIsMagnifierOn(false);
//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);
//     setSearchText("");
//     setMagnifier({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
//     pdfDocsRef.current = {};
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const handleClose = () => {
//     clearAll();
//     onClose?.();
//   };

//   useEffect(() => {
//     if (!isOpen) {
//       clearAll();
//     } else {
//       setCapturedText(initialText || "");

//       const sourceFiles = Array.isArray(externalFiles) && externalFiles.length > 0
//         ? externalFiles
//         : externalFile
//           ? [externalFile]
//           : [];

//       if (sourceFiles.length > 0) {
//         const nextTabs = sourceFiles
//           .map((file, index) => {
//             const source = file.blob || file.file || file.url || file;
//             const kind = file.kind || getReadableFileKind(file) || getReadableFileKind(source);
//             if (!kind) return null;

//             return {
//               id: `ext-${Date.now()}-${index}`,
//               identity: `ext-${file.id || file.name || index}`,
//               file: source,
//               name: file.name || `${kind === "image" ? "Image" : "PDF"} ${index + 1}`,
//               url: file.url || (source instanceof Blob ? URL.createObjectURL(source) : source),
//               kind,
//               pageNumber: 1,
//               numPages: kind === "image" ? 1 : 0,
//             };
//           })
//           .filter(Boolean);

//         setPdfFiles(nextTabs);
//         setActivePdfId(nextTabs[0]?.id || null);
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen, initialText, externalSourceSignature]);

//   useEffect(() => {
//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);

//     if (!fileUrl) {
//       setIsPageRendering(false);
//       return;
//     }

//     // When switching back to an already loaded tab, do not keep showing the loader.
//     setIsPageRendering(activeFileKind === "pdf" && !pdfDocsRef.current[activePdfId]);
//   }, [activePdfId, fileUrl, activeFileKind]);

//   useEffect(() => {
//     if (!fileUrl || !activePdfDoc || activeFileKind !== "pdf") return;
//     window.requestAnimationFrame(() => fitPdfToViewer(activePdfDoc, pageNumber, activePdfId));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activePdfId, pageNumber, rightPaneWidth, fileUrl, activeFileKind]);

//   useEffect(() => {
//     if (!isPaneResizing) return;
//     const previousCursor = document.body.style.cursor;
//     document.body.style.cursor = "col-resize";

//     const handleMove = (event) => {
//       const box = modalRef.current?.getBoundingClientRect();
//       if (!box) return;
//       const nextWidth = clamp(box.right - event.clientX, 300, Math.min(620, box.width * 0.55));
//       setRightPaneWidth(nextWidth);
//     };

//     const handleUp = () => setIsPaneResizing(false);
//     document.addEventListener("mousemove", handleMove);
//     document.addEventListener("mouseup", handleUp);
//     return () => {
//       document.body.style.cursor = previousCursor;
//       document.removeEventListener("mousemove", handleMove);
//       document.removeEventListener("mouseup", handleUp);
//     };
//   }, [isPaneResizing]);

//   const fitPdfToViewer = async (pdf = activePdfDoc, page = pageNumber, pdfId = activePdfId) => {
//     if (!pdf || !viewerScrollRef.current) return;

//     try {
//       // Guard against stale PDF proxy when switching/removing tabs quickly.
//       if (pdfId && pdfDocsRef.current[pdfId] && pdfDocsRef.current[pdfId] !== pdf) return;

//       const pdfPage = await pdf.getPage(page || 1);
//       const viewport = pdfPage.getViewport({ scale: 1 });
//       const availableWidth = Math.max(280, viewerScrollRef.current.clientWidth - 12);
//       const nextScale = clamp(Number((availableWidth / viewport.width).toFixed(2)), MIN_SCALE, MAX_SCALE);

//       setIsPageRendering(true);
//       setScale(nextScale);
//       window.setTimeout(() => setIsPageRendering(false), 700);
//     } catch (error) {
//       console.warn("Unable to fit PDF to viewer:", error);
//       setIsPageRendering(false);
//     }
//   };

//   const pageLabel = useMemo(() => {
//     if (isActiveImage) return "Image file";
//     if (!numPages) return "No PDF loaded";
//     return `Page ${pageNumber} of ${numPages}`;
//   }, [isActiveImage, numPages, pageNumber]);

//   const modalClassName = isMaximized
//     ? "grid h-[100dvh] w-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-slate-200 bg-white shadow-2xl"
//     : "grid h-[94vh] w-[96vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl";

//   const getPdfIdentity = (selectedFile) =>
//     `${selectedFile.name}__${selectedFile.size}__${selectedFile.lastModified}`;

//   const handleFileChange = (event) => {
//     const rawFiles = Array.from(event.target.files || []);
//     const selectedFiles = rawFiles.filter((item) => getReadableFileKind(item));

//     if (!selectedFiles.length) {
//       setLoadError("Please select valid PDF or image file(s).");
//       if (event.target) event.target.value = "";
//       return;
//     }

//     const oversizedFile = selectedFiles.find((item) => item.size > MAX_PDF_SIZE_BYTES);
//     if (oversizedFile) {
//       setLoadError(
//         `"${oversizedFile.name}" is too large. Maximum file size is ${MAX_PDF_SIZE_MB}MB per file.`
//       );
//       if (event.target) event.target.value = "";
//       return;
//     }

//     setPdfFiles((prev) => {
//       const existingByIdentity = new Map(prev.map((item) => [item.identity, item]));
//       const availableSlots = Math.max(0, MAX_PDF_FILES - prev.length);
//       const uniqueNewFiles = [];
//       let tabToActivate = null;

//       selectedFiles.forEach((selectedFile) => {
//         const identity = getPdfIdentity(selectedFile);
//         const existing = existingByIdentity.get(identity);

//         if (existing) {
//           tabToActivate = existing.id;
//           return;
//         }

//         if (uniqueNewFiles.length < availableSlots) {
//           uniqueNewFiles.push({ selectedFile, identity });
//         }
//       });

//       if (!availableSlots && !tabToActivate) {
//         setLoadError(`Maximum of ${MAX_PDF_FILES} files only.`);
//         return prev;
//       }

//       if (uniqueNewFiles.length < selectedFiles.filter((selectedFile) => !existingByIdentity.has(getPdfIdentity(selectedFile))).length) {
//         setLoadError(`Only ${MAX_PDF_FILES} files can be opened at a time.`);
//       } else {
//         setLoadError("");
//       }

//       const newTabs = uniqueNewFiles.map(({ selectedFile, identity }) => {
//         const kind = getReadableFileKind(selectedFile);
//         const nextTab = {
//           id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${selectedFile.name}`,
//           identity,
//           file: selectedFile,
//           name: selectedFile.name,
//           url: URL.createObjectURL(selectedFile),
//           kind,
//           pageNumber: 1,
//           numPages: kind === "image" ? 1 : 0,
//         };
//         tabToActivate = nextTab.id;
//         return nextTab;
//       });

//       if (tabToActivate) {
//         setActivePdfId(tabToActivate);
//       }

//       return [...prev, ...newTabs];
//     });

//     setIsPageRendering(true);
//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);

//     if (event.target) event.target.value = "";
//   };

//   const appendText = (text) => {
//     const nextText = cleanText(text);
//     if (!nextText) return;
//     setCapturedText((prev) => {
//       const current = String(prev || "").trimEnd();
//       return current ? `${current}\n\n\n${nextText}` : nextText;
//     });
//   };

//   const appendSelectedText = () => {
//     const selectedText = cleanText(window.getSelection?.().toString() || "");
//     appendText(selectedText);
//     window.getSelection?.().removeAllRanges?.();
//   };

//   const loadPdfDocumentFromSource = async (source) => {
//     if (!source) return null;

//     if (source instanceof Blob) {
//       const data = new Uint8Array(await source.arrayBuffer());
//       return pdfjs.getDocument({ data, disableWorker: true }).promise;
//     }

//     if (typeof source === "string") {
//       const response = await fetch(source);
//       const data = new Uint8Array(await response.arrayBuffer());
//       return pdfjs.getDocument({ data, disableWorker: true }).promise;
//     }

//     return pdfjs.getDocument({ data: source, disableWorker: true }).promise;
//   };

//   const ensureActivePdfDocument = async () => {
//     if (activePdfDoc) return activePdfDoc;
//     if (!activePdf || isActiveImage) return null;

//     const pdf = await loadPdfDocumentFromSource(activePdf.file || activePdf.url);
//     if (!pdf) return null;

//     pdfDocsRef.current[activePdf.id] = pdf;
//     setPdfFiles((prev) =>
//       prev.map((item) =>
//         item.id === activePdf.id ? { ...item, numPages: pdf.numPages || item.numPages || 0 } : item
//       )
//     );

//     return pdf;
//   };

//   const getPointFromEvent = (event) => {
//     const bounds = pageShellRef.current?.getBoundingClientRect();
//     if (!bounds) return null;
//     return { x: clamp(event.clientX - bounds.left, 0, bounds.width), y: clamp(event.clientY - bounds.top, 0, bounds.height) };
//   };

//   const handleSnipMouseDown = (event) => {
//     if (!isSnipMode || !fileUrl) return;
//     event.preventDefault();
//     const point = getPointFromEvent(event);
//     if (!point) return;
//     setSnipStart(point);
//     setSnipEnd(point);
//     setSnipRect(null);
//   };

//   const handleSnipMouseMove = (event) => {
//     const point = getPointFromEvent(event);

//     if (isMagnifierOn && point && pageShellRef.current) {
//       const canvas = pageShellRef.current.querySelector("canvas");
//       const zoom = 3;
//       setMagnifier({
//         visible: true,
//         x: point.x,
//         y: point.y,
//         bg: canvas?.toDataURL?.("image/png") || "",
//         bgWidth: (canvas?.clientWidth || 0) * zoom,
//         bgHeight: (canvas?.clientHeight || 0) * zoom,
//       });
//     }

//     if (!isSnipMode || !snipStart || !point) return;
//     setSnipEnd(point);
//   };

//   const handleViewerWheel = (event) => {
//     if (!fileUrl || !event.shiftKey) return;
//     event.preventDefault();
//     event.stopPropagation();
//     const direction = event.deltaY > 0 ? -1 : 1;
//     setIsPageRendering(true);
//     setScale((prev) => clamp(Number((prev + direction * SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE));
//   };

//   const handleSnipMouseLeave = () => setMagnifier((prev) => ({ ...prev, visible: false }));

//   const handleSnipMouseUp = (event) => {
//     if (!isSnipMode || !snipStart) return;
//     const point = getPointFromEvent(event);
//     if (!point) return;
//     const rect = getRectFromPoints(snipStart, point);
//     if (!rect || rect.width < 8 || rect.height < 8) {
//       setSnipStart(null);
//       setSnipEnd(null);
//       setSnipRect(null);
//       return;
//     }
//     setSnipEnd(point);
//     setSnipRect(rect);
//     window.requestAnimationFrame(() => captureSnippedText(rect));
//   };

//   const recognizeImageSource = async (source) => {
//     const result = await recognize(source, "eng", {
//       logger: (message) => {
//         if (!message?.status) return;
//         if (message.status === "recognizing text") {
//           setLoadError(`Reading text... ${Math.round((message.progress || 0) * 100)}%`);
//         }
//       },
//     });

//     setLoadError("");
//     return cleanText(result?.data?.text || "");
//   };

//   const cropImageSelectionToCanvas = (shell, targetRect) => {
//     const image = shell?.querySelector("img");
//     if (!image || !targetRect || !image.naturalWidth || !image.naturalHeight) return null;

//     const shellBox = shell.getBoundingClientRect();
//     const imageBox = image.getBoundingClientRect();
//     const imageLeft = imageBox.left - shellBox.left;
//     const imageTop = imageBox.top - shellBox.top;
//     const displayLeft = clamp(targetRect.left - imageLeft, 0, imageBox.width);
//     const displayTop = clamp(targetRect.top - imageTop, 0, imageBox.height);
//     const displayRight = clamp(targetRect.left + targetRect.width - imageLeft, 0, imageBox.width);
//     const displayBottom = clamp(targetRect.top + targetRect.height - imageTop, 0, imageBox.height);
//     const displayWidth = displayRight - displayLeft;
//     const displayHeight = displayBottom - displayTop;

//     if (displayWidth < 2 || displayHeight < 2) return null;

//     const scaleX = image.naturalWidth / imageBox.width;
//     const scaleY = image.naturalHeight / imageBox.height;
//     const canvas = document.createElement("canvas");

//     canvas.width = Math.max(1, Math.round(displayWidth * scaleX));
//     canvas.height = Math.max(1, Math.round(displayHeight * scaleY));
//     canvas
//       .getContext("2d")
//       ?.drawImage(
//         image,
//         Math.round(displayLeft * scaleX),
//         Math.round(displayTop * scaleY),
//         canvas.width,
//         canvas.height,
//         0,
//         0,
//         canvas.width,
//         canvas.height
//       );

//     return canvas;
//   };

//   const captureSnippedText = async (overrideRect = null) => {
//     const shell = pageShellRef.current;
//     const targetRect = overrideRect || snipRect;
//     if (!shell || !targetRect) return;

//     if (isActiveImage) {
//       try {
//         setIsReading(true);
//         const canvas = cropImageSelectionToCanvas(shell, targetRect);
//         if (!canvas) {
//           setLoadError("Unable to read the selected image area.");
//           return;
//         }
//         appendText(await recognizeImageSource(canvas));
//       } catch (error) {
//         console.error("Unable to read selected image area:", error);
//         setLoadError("Unable to read the selected image area.");
//       } finally {
//         setIsReading(false);
//         setSnipStart(null);
//         setSnipEnd(null);
//         setSnipRect(null);
//         setIsSnipMode(false);
//       }
//       return;
//     }

//     const shellBox = shell.getBoundingClientRect();
//     const selectionBox = {
//       left: shellBox.left + targetRect.left,
//       top: shellBox.top + targetRect.top,
//       right: shellBox.left + targetRect.left + targetRect.width,
//       bottom: shellBox.top + targetRect.top + targetRect.height,
//     };

//     const spans = Array.from(shell.querySelectorAll(".react-pdf__Page__textContent span"));
//     const text = spans
//       .filter((span) => rectsIntersect(selectionBox, span.getBoundingClientRect()))
//       .map((span) => span.textContent || "")
//       .join(" ");

//     const capturedValue = text || window.getSelection?.().toString() || "";
//     appendText(capturedValue);
//     window.getSelection?.().removeAllRanges?.();

//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);
//     setIsSnipMode(false);
//   };

//   const readCurrentPage = async () => {
//     if (!activePdf && !isActiveImage) return;
//     try {
//       setIsReading(true);
//       setLoadError("");

//       if (isActiveImage) {
//         const imageSource = activePdf?.url || activePdf?.file;
//         if (!imageSource) {
//           setLoadError("No image is loaded.");
//           return;
//         }

//         const text = await recognizeImageSource(imageSource);
//         if (!text) {
//           setLoadError("No readable text was found in this image.");
//           return;
//         }

//         appendText(text);
//         return;
//       }

//       const pdf = await ensureActivePdfDocument();
//       if (!pdf) {
//         setLoadError("No PDF is loaded.");
//         return;
//       }

//       let text = await getPdfTextByPage(pdf, pageNumber);
//       if (!text) {
//         setLoadError("No selectable text found. Reading page with OCR...");
//         const canvas = await renderPdfPageToCanvas(pdf, pageNumber);
//         text = await recognizeImageSource(canvas);
//       }

//       if (!text) {
//         setLoadError("No readable text was found on this page.");
//         return;
//       }

//       appendText(text);
//     } catch (error) {
//       console.error("Unable to read current file:", error);
//       setLoadError(isActiveImage ? "Unable to read text from this image." : "Unable to read the current page.");
//     } finally {
//       setIsReading(false);
//     }
//   };

//   const readEntirePdf = async () => {
//     if (!activePdf && !isActiveImage) return;
//     try {
//       setIsReading(true);
//       setLoadError("");

//       if (isActiveImage) {
//         const imageSource = activePdf?.url || activePdf?.file;
//         if (!imageSource) {
//           setLoadError("No image is loaded.");
//           return;
//         }

//         const text = await recognizeImageSource(imageSource);
//         if (!text) {
//           setCapturedText("");
//           setLoadError("No readable text was found in this image.");
//           return;
//         }

//         setCapturedText(text);
//         return;
//       }

//       const pdf = await ensureActivePdfDocument();
//       const totalPages = pdf?.numPages || numPages;
//       if (!pdf || !totalPages) {
//         setLoadError("No PDF is loaded.");
//         return;
//       }

//       const pageTexts = [];
//       setCapturedText("");
//       for (let page = 1; page <= totalPages; page += 1) {
//         setLoadError(`Reading page ${page} of ${totalPages}...`);
//         let pageText = "";

//         try {
//           pageText = await withTimeout(
//             getPdfTextByPage(pdf, page),
//             10000,
//             `Text extraction timed out on page ${page}.`
//           );
//         } catch (error) {
//           console.warn(error);
//         }

//         if (!pageText) {
//           try {
//             setLoadError(`No selectable text on page ${page}. Reading with OCR...`);
//             const canvas = await withTimeout(
//               renderPdfPageToCanvas(pdf, page),
//               15000,
//               `PDF page render timed out on page ${page}.`
//             );
//             pageText = await withTimeout(
//               recognizeImageSource(canvas),
//               45000,
//               `OCR timed out on page ${page}.`
//             );
//           } catch (error) {
//             console.warn(error);
//           }
//         }

//         if (pageText) {
//           const nextPageText = `Page ${page}\n${pageText}`;
//           pageTexts.push(nextPageText);
//           setCapturedText(cleanText(pageTexts.join("\n\n")));
//         }
//       }

//       if (!pageTexts.length) {
//         setCapturedText("");
//         setLoadError("No readable text was found in this PDF.");
//         return;
//       }

//       setLoadError("");
//       setCapturedText(cleanText(pageTexts.join("\n\n")));
//     } catch (error) {
//       console.error("Unable to read file:", error);
//       setLoadError(isActiveImage ? "Unable to read text from this image." : "Unable to read the entire PDF.");
//     } finally {
//       setIsReading(false);
//     }
//   };

//   const copyCapturedText = async () => {
//     if (!capturedText.trim()) return;
//     try {
//       await navigator.clipboard.writeText(capturedText);
//     } catch {
//       const textarea = document.createElement("textarea");
//       textarea.value = capturedText;
//       textarea.setAttribute("readonly", "");
//       textarea.style.position = "fixed";
//       textarea.style.top = "-9999px";
//       document.body.appendChild(textarea);
//       textarea.select();
//       document.execCommand("copy");
//       document.body.removeChild(textarea);
//     }
//     setIsCopied(true);
//     window.setTimeout(() => setIsCopied(false), 1200);
//     setIsMinimized(true);
//   };

//   const downloadCapturedText = () => {
//     if (!capturedText.trim()) return;
//     const blob = new Blob([capturedText], { type: "text/plain;charset=utf-8" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `${safeFileName(activePdf?.name || "captured-text")}.txt`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   const resetZoom = () => {
//     setIsPageRendering(true);
//     setScale(window.innerWidth < 640 ? MOBILE_SCALE : DEFAULT_SCALE);
//   };

//   const removePdfTab = (id, event) => {
//     event?.stopPropagation?.();
//     const target = pdfFiles.find((item) => item.id === id);
//     if (target) URL.revokeObjectURL(target.url);
//     delete pdfDocsRef.current[id];
//     delete pageShellRefs.current[id];
//     setPdfFiles((prev) => {
//       const next = prev.filter((item) => item.id !== id);
//       if (activePdfId === id) setActivePdfId(next[0]?.id || null);
//       return next;
//     });
//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);
//     setMagnifier((prev) => ({ ...prev, visible: false }));
//     setIsPageRendering(false);
//   };

//   const removeAllPdf = () => {
//     pdfFiles.forEach((item) => URL.revokeObjectURL(item.url));
//     setPdfFiles([]);
//     setActivePdfId(null);
//     setCapturedText("");
//     setSearchText("");
//     setLoadError("");
//     setIsReading(false);
//     setIsCopied(false);
//     setIsSnipMode(false);
//     setIsMagnifierOn(false);
//     setSnipStart(null);
//     setSnipEnd(null);
//     setSnipRect(null);
//     setMagnifier({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
//     setIsPageRendering(false);
//     pdfDocsRef.current = {};
//     pageShellRefs.current = {};
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const activeDragRect = getRectFromPoints(snipStart, snipEnd);
//   const visibleSnipRect = activeDragRect?.width || activeDragRect?.height ? activeDragRect : snipRect;
//   const searchMatchCount = searchText.trim()
//     ? (capturedText.match(new RegExp(searchText.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
//     : 0;

//   if (!isOpen) return null;

//   return createPortal(
//     <>
//       {isMinimized && (
//         <div className="fixed bottom-4 right-4 z-[1000000] flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
//           <div className="flex min-w-0 items-center gap-2">
//             <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
//             <div className="min-w-0">
//               <div className="max-w-[260px] truncate font-semibold text-slate-800">
//                 {activePdf?.file?.name || activePdf?.name || "PDF Text Capture"}
//               </div>
//               <div className="text-[10px] text-slate-500">Minimized reader</div>
//             </div>
//           </div>
//           <div className="ml-1 flex shrink-0 items-center gap-1">
//             <button
//               type="button"
//               className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
//               onClick={() => setIsMinimized(false)}
//             >
//               Restore
//             </button>
//             <button
//               type="button"
//               className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
//               onClick={handleClose}
//               aria-label="Close PDF reader"
//               title="Close"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>
//           </div>
//         </div>
//       )}

//       <div className={`fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/35 p-1 sm:p-2 ${isMinimized ? "pointer-events-none opacity-0" : ""}`}>
//         <div
//           ref={modalRef}
//           className={modalClassName}
//           style={isMaximized ? undefined : { resize: "both", minWidth: "min(980px, calc(100vw - 16px))", minHeight: "620px", maxWidth: "calc(100vw - 12px)", maxHeight: "calc(100dvh - 12px)" }}
//         >
//           <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
//             <div className="min-w-0">
//               <div className="flex items-center gap-2">
//                 <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
//                 <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
//               </div>
//               <p className="mt-0.5 text-xs text-slate-500">Preview, Shift + mouse wheel to zoom the active file, snip-highlight, capture selected text, or read the full PDF.</p>
//             </div>
//             <div className="flex items-center gap-2">
//               <input ref={fileInputRef} type="file" accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={handleFileChange} />
//               <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
//                 <Upload className="h-3.5 w-3.5" /> Browse PDF / Image
//               </button>
//               <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!fileUrl || isReading} onClick={readEntirePdf}>
//                 <BookOpen className="h-3.5 w-3.5" /> Read All
//               </button>
//               <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!pdfFiles.length} onClick={removeAllPdf}>
//                 <Trash2 className="h-3.5 w-3.5" /> Remove All
//               </button>
//               <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={() => setIsMinimized(true)} title="Minimize"><Minus className="h-4 w-4" /></button>
//               <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={() => setIsMaximized((prev) => !prev)} title={isMaximized ? "Restore" : "Maximize"}>{isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
//               <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={handleClose} aria-label="Close" title="Close"><X className="h-4 w-4" /></button>
//             </div>
//           </div>

//           {loadError && <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{loadError}</div>}

//           <div className="grid min-h-0 overflow-hidden" style={{ gridTemplateColumns: `minmax(0,1fr) 10px ${rightPaneWidth}px` }}>
//             <div className="flex min-h-0 flex-col bg-slate-100">
//               {pdfFiles.length > 0 && (
//                 <div className="flex min-h-[33px] items-end overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 pt-1">
//                   {pdfFiles.map((item, index) => {
//                     const active = item.id === activePdfId;
//                     return (
//                       <button
//                         key={item.id}
//                         type="button"
//                         className={`group -mb-px flex max-w-[260px] items-center gap-2 rounded-t-lg border px-3 py-1.5 text-xs ${active ? "border-slate-300 border-b-white bg-white font-semibold text-slate-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}
//                         onClick={() => { setActivePdfId(item.id); setLoadError(""); setIsPageRendering(false); setSnipStart(null); setSnipEnd(null); setSnipRect(null); }}
//                         title={item.name}
//                       >
//                         <span className="truncate">{item.name}</span>
//                         <span className="rounded p-0.5 opacity-60 group-hover:bg-slate-200" onClick={(e) => removePdfTab(item.id, e)}><X className="h-3 w-3" /></span>
//                       </button>
//                     );
//                   })}
//                 </div>
//               )}

//               <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
//                 <div className="min-w-[220px] flex-1 truncate text-xs font-medium text-slate-600">{activePdf?.name || "No file selected"}</div>
//                 <div className="flex flex-wrap items-center gap-1.5">
//                   <button type="button" className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${isSnipMode ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!fileUrl} onClick={() => setIsSnipMode((prev) => !prev)}><MousePointer2 className="h-3.5 w-3.5" />Snip</button>
//                   <button type="button" className={`rounded-md border px-2.5 py-1.5 text-xs ${isMagnifierOn ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!fileUrl} onClick={() => setIsMagnifierOn((prev) => !prev)}>Magnifier</button>
//                   <div className="mx-1 h-5 border-l border-slate-200" />
//                   <button type="button" className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!fileUrl || scale <= MIN_SCALE} onClick={() => { setIsPageRendering(true); setScale((prev) => clamp(Number((prev - SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE)); }}><ZoomOut className="h-3.5 w-3.5" /></button>
//                   <button type="button" className="min-w-[58px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50" onClick={resetZoom}>{Math.round(scale * 100)}%</button>
//                   <button type="button" className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!fileUrl || scale >= MAX_SCALE} onClick={() => { setIsPageRendering(true); setScale((prev) => clamp(Number((prev + SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE)); }}><ZoomIn className="h-3.5 w-3.5" /></button>
//                   <div className="mx-1 h-5 border-l border-slate-200" />
//                   <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={pageNumber <= 1} onClick={() => { setIsPageRendering(true); updateActivePdf({ pageNumber: Math.max(1, pageNumber - 1) }); }}>Prev</button>
//                   <span className="min-w-[92px] text-center text-xs text-slate-500">{pageLabel}</span>
//                   <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!numPages || pageNumber >= numPages} onClick={() => { setIsPageRendering(true); updateActivePdf({ pageNumber: Math.min(numPages, pageNumber + 1) }); }}>Next</button>
//                 </div>
//               </div>

//               <div ref={viewerScrollRef} className="relative min-h-0 flex-1 overflow-auto p-1 [scrollbar-gutter:stable]">
//                 {isPageRendering && fileUrl && (
//                   <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
//                     <span className="inline-flex items-center gap-1">Loading<span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.2s]" /><span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.1s]" /><span className="h-1 w-1 animate-bounce rounded-full bg-slate-500" /></span>
//                   </div>
//                 )}
//                 {!fileUrl ? (
//                   <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
//                     <div><Search className="mx-auto h-7 w-7 text-slate-300" /><div className="mt-3 text-sm font-medium text-slate-700">Select PDF or image file(s) to preview</div><div className="mt-1 text-xs text-slate-500">Multiple files will appear as sheet-style tabs.</div></div>
//                   </div>
//                 ) : (
//                   <div className="inline-block min-w-full bg-white p-0 shadow-sm">
//                     {pdfFiles.map((item) => {
//                       const isActiveTab = item.id === activePdfId;
//                       return (
//                         <div key={item.id} className={isActiveTab ? "block" : "hidden"} aria-hidden={!isActiveTab}>
//                           <div
//                             ref={(el) => {
//                               if (el) pageShellRefs.current[item.id] = el;
//                               if (isActiveTab) pageShellRef.current = el;
//                             }}
//                             className={`relative ${isActiveTab && isSnipMode ? "cursor-crosshair select-none" : ""}`}
//                             onMouseDown={isActiveTab ? handleSnipMouseDown : undefined}
//                             onMouseMove={isActiveTab ? handleSnipMouseMove : undefined}
//                             onMouseLeave={isActiveTab ? handleSnipMouseLeave : undefined}
//                             onMouseUp={isActiveTab ? handleSnipMouseUp : undefined}
//                             onWheel={isActiveTab ? handleViewerWheel : undefined}
//                           >
//                             {item.kind === "image" ? (
//                               <img
//                                 src={item.url}
//                                 alt={item.name || "Uploaded image"}
//                                 draggable={false}
//                                 className="block max-w-none select-none"
//                                 style={{ width: `${Math.max(20, Math.round(scale * 100))}%`, userSelect: "none" }}
//                                 onLoad={() => {
//                                   if (isActiveTab) setIsPageRendering(false);
//                                 }}
//                                 onError={() => {
//                                   if (isActiveTab) {
//                                     setLoadError("Unable to preview this image.");
//                                     setIsPageRendering(false);
//                                   }
//                                 }}
//                               />
//                             ) : (
//                             <Document
//                               file={item.file}
//                               loading={<div className="flex h-[360px] min-w-[260px] items-center justify-center text-xs text-slate-500">Loading PDF...</div>}
//                               error={<div className="p-5 text-sm text-rose-600">Unable to preview this PDF.</div>}
//                               onLoadSuccess={(pdf) => {
//                                 pdfDocsRef.current[item.id] = pdf;
//                                 setPdfFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, numPages: pdf.numPages || 0 } : row));
//                                 setLoadError("");
//                                 if (isActiveTab) {
//                                   window.requestAnimationFrame(() => fitPdfToViewer(pdf, item.pageNumber || 1, item.id));
//                                   window.setTimeout(() => setIsPageRendering(false), 800);
//                                 }
//                               }}
//                               onLoadError={(error) => {
//                                 console.error("PDF load error:", error);
//                                 if (isActiveTab) {
//                                   setLoadError("Unable to load this PDF file.");
//                                   setIsPageRendering(false);
//                                 }
//                               }}
//                             >
//                               <Page
//                                 pageNumber={item.pageNumber || 1}
//                                 scale={scale}
//                                 renderAnnotationLayer
//                                 renderTextLayer
//                                 loading={<div className="flex h-[360px] min-w-[260px] items-center justify-center text-xs text-slate-500">Rendering...</div>}
//                                 onRenderSuccess={() => { if (isActiveTab) setIsPageRendering(false); }}
//                                 onRenderError={() => { if (isActiveTab) setIsPageRendering(false); }}
//                               />
//                             </Document>
//                             )}
//                             {isActiveTab && visibleSnipRect && <div className="pointer-events-none absolute border border-blue-500 bg-blue-400/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]" style={{ left: `${visibleSnipRect.left}px`, top: `${visibleSnipRect.top}px`, width: `${visibleSnipRect.width}px`, height: `${visibleSnipRect.height}px` }} />}
//                             {isActiveTab && isMagnifierOn && magnifier.visible && <div className="pointer-events-none absolute z-40 h-52 w-72 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl ring-4 ring-white/80" style={{ left: `${magnifier.x + 20}px`, top: `${magnifier.y + 20}px`, backgroundImage: magnifier.bg ? `url(${magnifier.bg})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: magnifier.bgWidth && magnifier.bgHeight ? `${magnifier.bgWidth}px ${magnifier.bgHeight}px` : undefined, backgroundPosition: magnifier.bg ? `${144 - magnifier.x * 3}px ${104 - magnifier.y * 3}px` : undefined }} />}
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="relative cursor-col-resize bg-slate-100 hover:bg-blue-100" onMouseDown={() => setIsPaneResizing(true)} title="Drag to resize captured text panel"><div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" /></div>

//             <div className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
//               <div className="border-b border-slate-200 px-3 py-2">
//                 <div className="flex items-center justify-between gap-2">
//                   <div className="min-w-0"><div className="text-sm font-semibold text-slate-800">Captured Text</div><div className="text-xs text-slate-500">Capture or search text.</div></div>
//                   <div className="flex items-center gap-1.5">
//                     <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText.trim()} onClick={copyCapturedText}><ClipboardCopy className="h-3.5 w-3.5" />{isCopied ? "Copied" : "Copy"}</button>
//                     <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText.trim()} onClick={downloadCapturedText}><Download className="h-3.5 w-3.5" />TXT</button>
//                     <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText || isReading} onClick={() => setCapturedText("")} title="Clear captured text"><Trash2 className="h-3.5 w-3.5" />Clear</button>
//                   </div>
//                 </div>
//               </div>

//               <div className="border-b border-slate-100 px-3 py-2">
//                 <div className="relative">
//                   <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                   <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search captured text..." className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-xs font-['Aptos','Segoe_UI',sans-serif] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
//                   {searchText && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setSearchText("")}><X className="h-3.5 w-3.5" /></button>}
//                 </div>
//                 {searchText.trim() && <div className="mt-1 text-[11px] text-slate-500">{searchMatchCount} match{searchMatchCount === 1 ? "" : "es"} highlighted</div>}
//               </div>

//               <div className="relative min-h-0 flex-1 p-3">
//                 {isReading && <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow-sm">Reading...</div>}
//                 <textarea value={capturedText} onChange={(e) => setCapturedText(e.target.value)} placeholder="Captured or extracted file text will appear here." className={`h-full min-h-[220px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 font-['Aptos','Segoe_UI',sans-serif] text-[12px] leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${searchText ? "opacity-0" : ""}`} />
//                 {searchText && <div className="pointer-events-none absolute inset-3 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-300 bg-white p-3 font-['Aptos','Segoe_UI',sans-serif] text-[12px] leading-5 text-slate-800" dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(capturedText || "Captured or extracted file text will appear here.", searchText) }} />}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>,
//     document.body
//   );
// };

// export default PdfTextCaptureModal;



import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCopy,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer2,
  Search,
  Trash2,
  Upload,
  BookOpen,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { recognize } from "tesseract.js";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const DEFAULT_SCALE = 1.15;
const MOBILE_SCALE = 0.82;
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.8;
const SCALE_STEP = 0.15;
const MAX_PDF_FILES = 5;
const MAX_PDF_SIZE_MB = 25;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const EMPTY_EXTERNAL_FILES = [];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

const safeFileName = (name = "captured-text") =>
  String(name || "captured-text")
    .replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim() || "captured-text";

const isImageFile = (file = {}) => {
  const type = file.type || file.blob?.type || file.file?.type || "";
  const name = String(file.name || file.file?.name || file.url || "").toLowerCase();

  return (
    type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
};

const isPdfFile = (file = {}) =>
  file.type === "application/pdf" ||
  file.blob?.type === "application/pdf" ||
  file.file?.type === "application/pdf" ||
  String(file.name || file.file?.name || file.url || "").toLowerCase().endsWith(".pdf");

const getReadableFileKind = (file = {}) => {
  if (isPdfFile(file)) return "pdf";
  if (isImageFile(file)) return "image";
  return "";
};

const getExternalFileSignature = (file = {}, index = 0) => {
  const source = file.blob || file.file || file.url || file;
  const name = file.name || source?.name || file.url || "";
  const size = file.size || source?.size || "";
  const lastModified = file.lastModified || source?.lastModified || "";
  const type = file.type || source?.type || file.kind || "";

  return [file.id || "", name, size, lastModified, type, index].join(":");
};

const getTextItemsByVisualRows = (items = [], rowTolerance = 5) => {
  const textItems = items
    .map((item) => ({
      text: item.str || "",
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.text.trim());

  const rows = [];

  textItems
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .forEach((item) => {
      const row = rows.find((entry) => Math.abs(entry.y - item.y) <= rowTolerance);

      if (row) {
        row.items.push(item);
        row.y = (row.y + item.y) / 2;
      } else {
        rows.push({
          y: item.y,
          items: [item],
        });
      }
    });

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean);
};

const getPdfTextByPage = async (pdf, pageNumber) => {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const lines = getTextItemsByVisualRows(content.items, 5);

  return cleanText(lines.join("\n"));
};

const renderPdfPageToCanvas = async (pdf, pageNumber, scale = 2) => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

const getRectFromPoints = (start, end) => {
  if (!start || !end) return null;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { left, top, width, height };
};

const rectsIntersect = (a, b) => {
  if (!a || !b) return false;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
};

const getSelectedSpanTextByRows = (spans = [], selectionBox = null, rowTolerance = 5) => {
  const selectedSpans = spans
    .filter((span) => rectsIntersect(selectionBox, span.getBoundingClientRect()))
    .map((span) => {
      const box = span.getBoundingClientRect();

      return {
        text: span.textContent || "",
        x: box.left,
        y: box.top,
      };
    })
    .filter((item) => item.text.trim());

  const rows = [];

  selectedSpans
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((item) => {
      const row = rows.find((entry) => Math.abs(entry.y - item.y) <= rowTolerance);

      if (row) {
        row.items.push(item);
        row.y = (row.y + item.y) / 2;
      } else {
        rows.push({
          y: item.y,
          items: [item],
        });
      }
    });

  return rows
    .sort((a, b) => a.y - b.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
};



const buildHighlightedHtml = (text, query) => {
  const q = String(query || "").trim();
  if (!q) return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(new RegExp(escaped, "gi"), (m) => `<mark class=\"bg-yellow-200 px-0.5\">${m}</mark>`);
};

const PdfTextCaptureModal = ({
  isOpen,
  onClose,
  title = "PDF Text Capture",
  initialText = "",
  onApply,
  externalFile = null,
  externalFiles = EMPTY_EXTERNAL_FILES,
}) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [activePdfId, setActivePdfId] = useState(null);
  const [capturedText, setCapturedText] = useState(initialText || "");
  const [isReading, setIsReading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSnipMode, setIsSnipMode] = useState(false);
  const [isMagnifierOn, setIsMagnifierOn] = useState(false);
  const [snipStart, setSnipStart] = useState(null);
  const [snipEnd, setSnipEnd] = useState(null);
  const [snipRect, setSnipRect] = useState(null);
  const [magnifier, setMagnifier] = useState({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [rightPaneWidth, setRightPaneWidth] = useState(380);
  const [isPaneResizing, setIsPaneResizing] = useState(false);
  const [isCapturedTextMaximized, setIsCapturedTextMaximized] = useState(false);

  const pdfDocsRef = useRef({});
  const fileInputRef = useRef(null);
  const pageShellRef = useRef(null);
  const pageShellRefs = useRef({});
  const viewerScrollRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const activePdf = useMemo(
    () => pdfFiles.find((item) => item.id === activePdfId) || null,
    [pdfFiles, activePdfId]
  );

  const activeFileKind = activePdf?.kind || getReadableFileKind(activePdf?.file || activePdf || {});
  const isActiveImage = activeFileKind === "image";
  const activePdfDoc = activeFileKind === "pdf" && activePdf ? pdfDocsRef.current[activePdf.id] : null;
  const pageNumber = activePdf?.pageNumber || 1;
  const numPages = isActiveImage ? 1 : activePdf?.numPages || 0;
  const fileUrl = activePdf?.url || "";
  const externalSourceSignature =
    Array.isArray(externalFiles) && externalFiles.length > 0
      ? externalFiles.map(getExternalFileSignature).join("|")
      : externalFile
        ? getExternalFileSignature(externalFile)
        : "";

  useEffect(() => {
    pageShellRef.current = activePdfId ? pageShellRefs.current[activePdfId] || null : null;
  }, [activePdfId, pdfFiles]);

  useEffect(() => {
    if (!isPageRendering) return undefined;

    const timer = window.setTimeout(() => {
      setIsPageRendering(false);
    }, isActiveImage ? 300 : 1800);

    return () => window.clearTimeout(timer);
  }, [isPageRendering, activePdfId, pageNumber, scale, isActiveImage]);

  const updateActivePdf = (updates) => {
    if (!activePdfId) return;
    setPdfFiles((prev) =>
      prev.map((item) => (item.id === activePdfId ? { ...item, ...updates } : item))
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    const updateScale = () => {
      setScale((prev) => {
        if (prev !== DEFAULT_SCALE && prev !== MOBILE_SCALE) return prev;
        return window.innerWidth < 640 ? MOBILE_SCALE : DEFAULT_SCALE;
      });
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isOpen]);


  const clearAll = () => {
    pdfFiles.forEach((item) => URL.revokeObjectURL(item.url));
    setPdfFiles([]);
    setActivePdfId(null);
    setCapturedText("");
    setIsReading(false);
    setIsCopied(false);
    setLoadError("");
    setIsMaximized(false);
    setIsMinimized(false);
    setIsSnipMode(false);
    setIsMagnifierOn(false);
    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);
    setSearchText("");
    setIsCapturedTextMaximized(false);
    setMagnifier({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
    pdfDocsRef.current = {};
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    clearAll();
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) {
      clearAll();
    } else {
      setCapturedText(initialText || "");

      const sourceFiles = Array.isArray(externalFiles) && externalFiles.length > 0
        ? externalFiles
        : externalFile
          ? [externalFile]
          : [];

      if (sourceFiles.length > 0) {
        const nextTabs = sourceFiles
          .map((file, index) => {
            const source = file.blob || file.file || file.url || file;
            const kind = file.kind || getReadableFileKind(file) || getReadableFileKind(source);
            if (!kind) return null;

            return {
              id: `ext-${Date.now()}-${index}`,
              identity: `ext-${file.id || file.name || index}`,
              file: source,
              name: file.name || `${kind === "image" ? "Image" : "PDF"} ${index + 1}`,
              url: file.url || (source instanceof Blob ? URL.createObjectURL(source) : source),
              kind,
              pageNumber: 1,
              numPages: kind === "image" ? 1 : 0,
            };
          })
          .filter(Boolean);

        setPdfFiles(nextTabs);
        setActivePdfId(nextTabs[0]?.id || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialText, externalSourceSignature]);

  useEffect(() => {
    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);

    if (!fileUrl) {
      setIsPageRendering(false);
      return;
    }

    // When switching back to an already loaded tab, do not keep showing the loader.
    setIsPageRendering(activeFileKind === "pdf" && !pdfDocsRef.current[activePdfId]);
  }, [activePdfId, fileUrl, activeFileKind]);

  useEffect(() => {
    if (!fileUrl || !activePdfDoc || activeFileKind !== "pdf") return;
    window.requestAnimationFrame(() => fitPdfToViewer(activePdfDoc, pageNumber, activePdfId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePdfId, pageNumber, rightPaneWidth, fileUrl, activeFileKind]);

  useEffect(() => {
    if (!isPaneResizing) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "col-resize";

    const handleMove = (event) => {
      const box = modalRef.current?.getBoundingClientRect();
      if (!box) return;
      const nextWidth = clamp(box.right - event.clientX, 300, Math.min(620, box.width * 0.55));
      setRightPaneWidth(nextWidth);
    };

    const handleUp = () => setIsPaneResizing(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.body.style.cursor = previousCursor;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isPaneResizing]);

  const fitPdfToViewer = async (pdf = activePdfDoc, page = pageNumber, pdfId = activePdfId) => {
    if (!pdf || !viewerScrollRef.current) return;

    try {
      // Guard against stale PDF proxy when switching/removing tabs quickly.
      if (pdfId && pdfDocsRef.current[pdfId] && pdfDocsRef.current[pdfId] !== pdf) return;

      const pdfPage = await pdf.getPage(page || 1);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, viewerScrollRef.current.clientWidth - 12);
      const nextScale = clamp(Number((availableWidth / viewport.width).toFixed(2)), MIN_SCALE, MAX_SCALE);

      setIsPageRendering(true);
      setScale(nextScale);
      window.setTimeout(() => setIsPageRendering(false), 700);
    } catch (error) {
      console.warn("Unable to fit PDF to viewer:", error);
      setIsPageRendering(false);
    }
  };

  const pageLabel = useMemo(() => {
    if (isActiveImage) return "Image file";
    if (!numPages) return "No PDF loaded";
    return `Page ${pageNumber} of ${numPages}`;
  }, [isActiveImage, numPages, pageNumber]);

  const modalClassName = isMaximized
    ? "grid h-[100dvh] w-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-slate-200 bg-white shadow-2xl"
    : "grid h-[94vh] w-[96vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl";

  const getPdfIdentity = (selectedFile) =>
    `${selectedFile.name}__${selectedFile.size}__${selectedFile.lastModified}`;

  const handleFileChange = (event) => {
    const rawFiles = Array.from(event.target.files || []);
    const selectedFiles = rawFiles.filter((item) => getReadableFileKind(item));

    if (!selectedFiles.length) {
      setLoadError("Please select valid PDF or image file(s).");
      if (event.target) event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find((item) => item.size > MAX_PDF_SIZE_BYTES);
    if (oversizedFile) {
      setLoadError(
        `"${oversizedFile.name}" is too large. Maximum file size is ${MAX_PDF_SIZE_MB}MB per file.`
      );
      if (event.target) event.target.value = "";
      return;
    }

    setPdfFiles((prev) => {
      const existingByIdentity = new Map(prev.map((item) => [item.identity, item]));
      const availableSlots = Math.max(0, MAX_PDF_FILES - prev.length);
      const uniqueNewFiles = [];
      let tabToActivate = null;

      selectedFiles.forEach((selectedFile) => {
        const identity = getPdfIdentity(selectedFile);
        const existing = existingByIdentity.get(identity);

        if (existing) {
          tabToActivate = existing.id;
          return;
        }

        if (uniqueNewFiles.length < availableSlots) {
          uniqueNewFiles.push({ selectedFile, identity });
        }
      });

      if (!availableSlots && !tabToActivate) {
        setLoadError(`Maximum of ${MAX_PDF_FILES} files only.`);
        return prev;
      }

      if (uniqueNewFiles.length < selectedFiles.filter((selectedFile) => !existingByIdentity.has(getPdfIdentity(selectedFile))).length) {
        setLoadError(`Only ${MAX_PDF_FILES} files can be opened at a time.`);
      } else {
        setLoadError("");
      }

      const newTabs = uniqueNewFiles.map(({ selectedFile, identity }) => {
        const kind = getReadableFileKind(selectedFile);
        const nextTab = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${selectedFile.name}`,
          identity,
          file: selectedFile,
          name: selectedFile.name,
          url: URL.createObjectURL(selectedFile),
          kind,
          pageNumber: 1,
          numPages: kind === "image" ? 1 : 0,
        };
        tabToActivate = nextTab.id;
        return nextTab;
      });

      if (tabToActivate) {
        setActivePdfId(tabToActivate);
      }

      return [...prev, ...newTabs];
    });

    setIsPageRendering(true);
    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);

    if (event.target) event.target.value = "";
  };

  const appendText = (text) => {
    const nextText = cleanText(text);
    if (!nextText) return;
    setCapturedText((prev) => {
      const current = String(prev || "").trimEnd();
      return current ? `${current}\n\n\n${nextText}` : nextText;
    });
  };

  const appendSelectedText = () => {
    const selectedText = cleanText(window.getSelection?.().toString() || "");
    appendText(selectedText);
    window.getSelection?.().removeAllRanges?.();
  };

  const loadPdfDocumentFromSource = async (source) => {
    if (!source) return null;

    if (source instanceof Blob) {
      const data = new Uint8Array(await source.arrayBuffer());
      return pdfjs.getDocument({ data, disableWorker: true }).promise;
    }

    if (typeof source === "string") {
      const response = await fetch(source);
      const data = new Uint8Array(await response.arrayBuffer());
      return pdfjs.getDocument({ data, disableWorker: true }).promise;
    }

    return pdfjs.getDocument({ data: source, disableWorker: true }).promise;
  };

  const ensureActivePdfDocument = async () => {
    if (activePdfDoc) return activePdfDoc;
    if (!activePdf || isActiveImage) return null;

    const pdf = await loadPdfDocumentFromSource(activePdf.file || activePdf.url);
    if (!pdf) return null;

    pdfDocsRef.current[activePdf.id] = pdf;
    setPdfFiles((prev) =>
      prev.map((item) =>
        item.id === activePdf.id ? { ...item, numPages: pdf.numPages || item.numPages || 0 } : item
      )
    );

    return pdf;
  };

  const getPointFromEvent = (event) => {
    const bounds = pageShellRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return { x: clamp(event.clientX - bounds.left, 0, bounds.width), y: clamp(event.clientY - bounds.top, 0, bounds.height) };
  };

  const handleSnipMouseDown = (event) => {
    if (!isSnipMode || !fileUrl) return;
    event.preventDefault();
    const point = getPointFromEvent(event);
    if (!point) return;
    setSnipStart(point);
    setSnipEnd(point);
    setSnipRect(null);
  };

  const handleSnipMouseMove = (event) => {
    const point = getPointFromEvent(event);

    if (isMagnifierOn && point && pageShellRef.current) {
      const canvas = pageShellRef.current.querySelector("canvas");
      const zoom = 3;
      setMagnifier({
        visible: true,
        x: point.x,
        y: point.y,
        bg: canvas?.toDataURL?.("image/png") || "",
        bgWidth: (canvas?.clientWidth || 0) * zoom,
        bgHeight: (canvas?.clientHeight || 0) * zoom,
      });
    }

    if (!isSnipMode || !snipStart || !point) return;
    setSnipEnd(point);
  };

  const handleViewerWheel = (event) => {
    if (!fileUrl || !event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY > 0 ? -1 : 1;
    setIsPageRendering(true);
    setScale((prev) => clamp(Number((prev + direction * SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE));
  };

  const handleSnipMouseLeave = () => setMagnifier((prev) => ({ ...prev, visible: false }));

  const handleSnipMouseUp = (event) => {
    if (!isSnipMode || !snipStart) return;
    const point = getPointFromEvent(event);
    if (!point) return;
    const rect = getRectFromPoints(snipStart, point);
    if (!rect || rect.width < 8 || rect.height < 8) {
      setSnipStart(null);
      setSnipEnd(null);
      setSnipRect(null);
      return;
    }
    setSnipEnd(point);
    setSnipRect(rect);
    window.requestAnimationFrame(() => captureSnippedText(rect));
  };

  const recognizeImageSource = async (source) => {
    const result = await recognize(source, "eng", {
      logger: (message) => {
        if (!message?.status) return;
        if (message.status === "recognizing text") {
          setLoadError(`Reading text... ${Math.round((message.progress || 0) * 100)}%`);
        }
      },
    });

    setLoadError("");
    return cleanText(result?.data?.text || "");
  };

  const cropImageSelectionToCanvas = (shell, targetRect) => {
    const image = shell?.querySelector("img");
    if (!image || !targetRect || !image.naturalWidth || !image.naturalHeight) return null;

    const shellBox = shell.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    const imageLeft = imageBox.left - shellBox.left;
    const imageTop = imageBox.top - shellBox.top;
    const displayLeft = clamp(targetRect.left - imageLeft, 0, imageBox.width);
    const displayTop = clamp(targetRect.top - imageTop, 0, imageBox.height);
    const displayRight = clamp(targetRect.left + targetRect.width - imageLeft, 0, imageBox.width);
    const displayBottom = clamp(targetRect.top + targetRect.height - imageTop, 0, imageBox.height);
    const displayWidth = displayRight - displayLeft;
    const displayHeight = displayBottom - displayTop;

    if (displayWidth < 2 || displayHeight < 2) return null;

    const scaleX = image.naturalWidth / imageBox.width;
    const scaleY = image.naturalHeight / imageBox.height;
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(displayWidth * scaleX));
    canvas.height = Math.max(1, Math.round(displayHeight * scaleY));
    canvas
      .getContext("2d")
      ?.drawImage(
        image,
        Math.round(displayLeft * scaleX),
        Math.round(displayTop * scaleY),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

    return canvas;
  };

  const captureSnippedText = async (overrideRect = null) => {
    const shell = pageShellRef.current;
    const targetRect = overrideRect || snipRect;
    if (!shell || !targetRect) return;

    if (isActiveImage) {
      try {
        setIsReading(true);
        const canvas = cropImageSelectionToCanvas(shell, targetRect);
        if (!canvas) {
          setLoadError("Unable to read the selected image area.");
          return;
        }
        appendText(await recognizeImageSource(canvas));
      } catch (error) {
        console.error("Unable to read selected image area:", error);
        setLoadError("Unable to read the selected image area.");
      } finally {
        setIsReading(false);
        setSnipStart(null);
        setSnipEnd(null);
        setSnipRect(null);
        setIsSnipMode(false);
      }
      return;
    }

    const shellBox = shell.getBoundingClientRect();
    const selectionBox = {
      left: shellBox.left + targetRect.left,
      top: shellBox.top + targetRect.top,
      right: shellBox.left + targetRect.left + targetRect.width,
      bottom: shellBox.top + targetRect.top + targetRect.height,
    };

    const spans = Array.from(shell.querySelectorAll(".react-pdf__Page__textContent span"));
    const text = getSelectedSpanTextByRows(spans, selectionBox, 5);

    const capturedValue = text || window.getSelection?.().toString() || "";
    appendText(capturedValue);
    window.getSelection?.().removeAllRanges?.();

    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);
    setIsSnipMode(false);
  };

  const readCurrentPage = async () => {
    if (!activePdf && !isActiveImage) return;
    try {
      setIsReading(true);
      setLoadError("");

      if (isActiveImage) {
        const imageSource = activePdf?.url || activePdf?.file;
        if (!imageSource) {
          setLoadError("No image is loaded.");
          return;
        }

        const text = await recognizeImageSource(imageSource);
        if (!text) {
          setLoadError("No readable text was found in this image.");
          return;
        }

        appendText(text);
        return;
      }

      const pdf = await ensureActivePdfDocument();
      if (!pdf) {
        setLoadError("No PDF is loaded.");
        return;
      }

      let text = await getPdfTextByPage(pdf, pageNumber);
      if (!text) {
        setLoadError("No selectable text found. Reading page with OCR...");
        const canvas = await renderPdfPageToCanvas(pdf, pageNumber);
        text = await recognizeImageSource(canvas);
      }

      if (!text) {
        setLoadError("No readable text was found on this page.");
        return;
      }

      appendText(text);
    } catch (error) {
      console.error("Unable to read current file:", error);
      setLoadError(isActiveImage ? "Unable to read text from this image." : "Unable to read the current page.");
    } finally {
      setIsReading(false);
    }
  };

  const readEntirePdf = async () => {
    if (!activePdf && !isActiveImage) return;
    try {
      setIsReading(true);
      setLoadError("");

      if (isActiveImage) {
        const imageSource = activePdf?.url || activePdf?.file;
        if (!imageSource) {
          setLoadError("No image is loaded.");
          return;
        }

        const text = await recognizeImageSource(imageSource);
        if (!text) {
          setCapturedText("");
          setLoadError("No readable text was found in this image.");
          return;
        }

        setCapturedText(text);
        return;
      }

      const pdf = await ensureActivePdfDocument();
      const totalPages = pdf?.numPages || numPages;
      if (!pdf || !totalPages) {
        setLoadError("No PDF is loaded.");
        return;
      }

      const pageTexts = [];
      setCapturedText("");
      for (let page = 1; page <= totalPages; page += 1) {
        setLoadError(`Reading page ${page} of ${totalPages}...`);
        let pageText = "";

        try {
          pageText = await withTimeout(
            getPdfTextByPage(pdf, page),
            10000,
            `Text extraction timed out on page ${page}.`
          );
        } catch (error) {
          console.warn(error);
        }

        if (!pageText) {
          try {
            setLoadError(`No selectable text on page ${page}. Reading with OCR...`);
            const canvas = await withTimeout(
              renderPdfPageToCanvas(pdf, page),
              15000,
              `PDF page render timed out on page ${page}.`
            );
            pageText = await withTimeout(
              recognizeImageSource(canvas),
              45000,
              `OCR timed out on page ${page}.`
            );
          } catch (error) {
            console.warn(error);
          }
        }

        if (pageText) {
          const nextPageText = `Page ${page}\n${pageText}`;
          pageTexts.push(nextPageText);
          setCapturedText(cleanText(pageTexts.join("\n\n")));
        }
      }

      if (!pageTexts.length) {
        setCapturedText("");
        setLoadError("No readable text was found in this PDF.");
        return;
      }

      setLoadError("");
      setCapturedText(cleanText(pageTexts.join("\n\n")));
    } catch (error) {
      console.error("Unable to read file:", error);
      setLoadError(isActiveImage ? "Unable to read text from this image." : "Unable to read the entire PDF.");
    } finally {
      setIsReading(false);
    }
  };

  const copyCapturedText = async () => {
    if (!capturedText.trim()) return;
    try {
      await navigator.clipboard.writeText(capturedText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = capturedText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
    setIsMinimized(true);
  };

  const downloadCapturedText = () => {
    if (!capturedText.trim()) return;
    const blob = new Blob([capturedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(activePdf?.name || "captured-text")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetZoom = () => {
    setIsPageRendering(true);
    setScale(window.innerWidth < 640 ? MOBILE_SCALE : DEFAULT_SCALE);
  };

  const removePdfTab = (id, event) => {
    event?.stopPropagation?.();
    const target = pdfFiles.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.url);
    delete pdfDocsRef.current[id];
    delete pageShellRefs.current[id];
    setPdfFiles((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activePdfId === id) setActivePdfId(next[0]?.id || null);
      return next;
    });
    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);
    setMagnifier((prev) => ({ ...prev, visible: false }));
    setIsPageRendering(false);
  };

  const removeAllPdf = () => {
    pdfFiles.forEach((item) => URL.revokeObjectURL(item.url));
    setPdfFiles([]);
    setActivePdfId(null);
    setCapturedText("");
    setSearchText("");
    setIsCapturedTextMaximized(false);
    setLoadError("");
    setIsReading(false);
    setIsCopied(false);
    setIsSnipMode(false);
    setIsMagnifierOn(false);
    setSnipStart(null);
    setSnipEnd(null);
    setSnipRect(null);
    setMagnifier({ visible: false, x: 0, y: 0, bg: "", bgWidth: 0, bgHeight: 0 });
    setIsPageRendering(false);
    pdfDocsRef.current = {};
    pageShellRefs.current = {};
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const activeDragRect = getRectFromPoints(snipStart, snipEnd);
  const visibleSnipRect = activeDragRect?.width || activeDragRect?.height ? activeDragRect : snipRect;
  const searchMatchCount = searchText.trim()
    ? (capturedText.match(new RegExp(searchText.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
    : 0;

  if (!isOpen) return null;

  return createPortal(
    <>
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-[1000000] flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0">
              <div className="max-w-[260px] truncate font-semibold text-slate-800">
                {activePdf?.file?.name || activePdf?.name || "PDF Text Capture"}
              </div>
              <div className="text-[10px] text-slate-500">Minimized reader</div>
            </div>
          </div>
          <div className="ml-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setIsMinimized(false)}
            >
              Restore
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
              onClick={handleClose}
              aria-label="Close PDF reader"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/35 p-1 sm:p-2 ${isMinimized ? "pointer-events-none opacity-0" : ""}`}>
        <div
          ref={modalRef}
          className={modalClassName}
          style={isMaximized ? undefined : { resize: "both", minWidth: "min(980px, calc(100vw - 16px))", minHeight: "620px", maxWidth: "calc(100vw - 12px)", maxHeight: "calc(100dvh - 12px)" }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Preview, Shift + mouse wheel to zoom the active file, snip-highlight, capture selected text, or read the full PDF.</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={handleFileChange} />
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Browse PDF / Image
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!fileUrl || isReading} onClick={readEntirePdf}>
                <BookOpen className="h-3.5 w-3.5" /> Read All
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!pdfFiles.length} onClick={removeAllPdf}>
                <Trash2 className="h-3.5 w-3.5" /> Remove All
              </button>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={() => setIsMinimized(true)} title="Minimize"><Minus className="h-4 w-4" /></button>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={() => setIsMaximized((prev) => !prev)} title={isMaximized ? "Restore" : "Maximize"}>{isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={handleClose} aria-label="Close" title="Close"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {loadError && <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{loadError}</div>}

          <div className="grid min-h-0 overflow-hidden" style={{ gridTemplateColumns: `minmax(0,1fr) 10px ${rightPaneWidth}px` }}>
            <div className="flex min-h-0 flex-col bg-slate-100">
              {pdfFiles.length > 0 && (
                <div className="flex min-h-[33px] items-end overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 pt-1">
                  {pdfFiles.map((item, index) => {
                    const active = item.id === activePdfId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`group -mb-px flex max-w-[260px] items-center gap-2 rounded-t-lg border px-3 py-1.5 text-xs ${active ? "border-slate-300 border-b-white bg-white font-semibold text-slate-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}
                        onClick={() => { setActivePdfId(item.id); setLoadError(""); setIsPageRendering(false); setSnipStart(null); setSnipEnd(null); setSnipRect(null); }}
                        title={item.name}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="rounded p-0.5 opacity-60 group-hover:bg-slate-200" onClick={(e) => removePdfTab(item.id, e)}><X className="h-3 w-3" /></span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
                <div className="min-w-[220px] flex-1 truncate text-xs font-medium text-slate-600">{activePdf?.name || "No file selected"}</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${isSnipMode ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!fileUrl} onClick={() => setIsSnipMode((prev) => !prev)}><MousePointer2 className="h-3.5 w-3.5" />Snip</button>
                  <button type="button" className={`rounded-md border px-2.5 py-1.5 text-xs ${isMagnifierOn ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`} disabled={!fileUrl} onClick={() => setIsMagnifierOn((prev) => !prev)}>Magnifier</button>
                  <div className="mx-1 h-5 border-l border-slate-200" />
                  <button type="button" className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!fileUrl || scale <= MIN_SCALE} onClick={() => { setIsPageRendering(true); setScale((prev) => clamp(Number((prev - SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE)); }}><ZoomOut className="h-3.5 w-3.5" /></button>
                  <button type="button" className="min-w-[58px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50" onClick={resetZoom}>{Math.round(scale * 100)}%</button>
                  <button type="button" className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!fileUrl || scale >= MAX_SCALE} onClick={() => { setIsPageRendering(true); setScale((prev) => clamp(Number((prev + SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE)); }}><ZoomIn className="h-3.5 w-3.5" /></button>
                  <div className="mx-1 h-5 border-l border-slate-200" />
                  <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={pageNumber <= 1} onClick={() => { setIsPageRendering(true); updateActivePdf({ pageNumber: Math.max(1, pageNumber - 1) }); }}>Prev</button>
                  <span className="min-w-[92px] text-center text-xs text-slate-500">{pageLabel}</span>
                  <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!numPages || pageNumber >= numPages} onClick={() => { setIsPageRendering(true); updateActivePdf({ pageNumber: Math.min(numPages, pageNumber + 1) }); }}>Next</button>
                </div>
              </div>

              <div ref={viewerScrollRef} className="relative min-h-0 flex-1 overflow-auto p-1 [scrollbar-gutter:stable]">
                {isPageRendering && fileUrl && (
                  <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                    <span className="inline-flex items-center gap-1">Loading<span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.2s]" /><span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.1s]" /><span className="h-1 w-1 animate-bounce rounded-full bg-slate-500" /></span>
                  </div>
                )}
                {!fileUrl ? (
                  <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <div><Search className="mx-auto h-7 w-7 text-slate-300" /><div className="mt-3 text-sm font-medium text-slate-700">Select PDF or image file(s) to preview</div><div className="mt-1 text-xs text-slate-500">Multiple files will appear as sheet-style tabs.</div></div>
                  </div>
                ) : (
                  <div className="inline-block min-w-full bg-white p-0 shadow-sm">
                    {pdfFiles.map((item) => {
                      const isActiveTab = item.id === activePdfId;
                      return (
                        <div key={item.id} className={isActiveTab ? "block" : "hidden"} aria-hidden={!isActiveTab}>
                          <div
                            ref={(el) => {
                              if (el) pageShellRefs.current[item.id] = el;
                              if (isActiveTab) pageShellRef.current = el;
                            }}
                            className={`relative ${isActiveTab && isSnipMode ? "cursor-crosshair select-none" : ""}`}
                            onMouseDown={isActiveTab ? handleSnipMouseDown : undefined}
                            onMouseMove={isActiveTab ? handleSnipMouseMove : undefined}
                            onMouseLeave={isActiveTab ? handleSnipMouseLeave : undefined}
                            onMouseUp={isActiveTab ? handleSnipMouseUp : undefined}
                            onWheel={isActiveTab ? handleViewerWheel : undefined}
                          >
                            {item.kind === "image" ? (
                              <img
                                src={item.url}
                                alt={item.name || "Uploaded image"}
                                draggable={false}
                                className="block max-w-none select-none"
                                style={{ width: `${Math.max(20, Math.round(scale * 100))}%`, userSelect: "none" }}
                                onLoad={() => {
                                  if (isActiveTab) setIsPageRendering(false);
                                }}
                                onError={() => {
                                  if (isActiveTab) {
                                    setLoadError("Unable to preview this image.");
                                    setIsPageRendering(false);
                                  }
                                }}
                              />
                            ) : (
                            <Document
                              file={item.file}
                              loading={<div className="flex h-[360px] min-w-[260px] items-center justify-center text-xs text-slate-500">Loading PDF...</div>}
                              error={<div className="p-5 text-sm text-rose-600">Unable to preview this PDF.</div>}
                              onLoadSuccess={(pdf) => {
                                pdfDocsRef.current[item.id] = pdf;
                                setPdfFiles((prev) => prev.map((row) => row.id === item.id ? { ...row, numPages: pdf.numPages || 0 } : row));
                                setLoadError("");
                                if (isActiveTab) {
                                  window.requestAnimationFrame(() => fitPdfToViewer(pdf, item.pageNumber || 1, item.id));
                                  window.setTimeout(() => setIsPageRendering(false), 800);
                                }
                              }}
                              onLoadError={(error) => {
                                console.error("PDF load error:", error);
                                if (isActiveTab) {
                                  setLoadError("Unable to load this PDF file.");
                                  setIsPageRendering(false);
                                }
                              }}
                            >
                              <Page
                                pageNumber={item.pageNumber || 1}
                                scale={scale}
                                renderAnnotationLayer
                                renderTextLayer
                                loading={<div className="flex h-[360px] min-w-[260px] items-center justify-center text-xs text-slate-500">Rendering...</div>}
                                onRenderSuccess={() => { if (isActiveTab) setIsPageRendering(false); }}
                                onRenderError={() => { if (isActiveTab) setIsPageRendering(false); }}
                              />
                            </Document>
                            )}
                            {isActiveTab && visibleSnipRect && <div className="pointer-events-none absolute border border-blue-500 bg-blue-400/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]" style={{ left: `${visibleSnipRect.left}px`, top: `${visibleSnipRect.top}px`, width: `${visibleSnipRect.width}px`, height: `${visibleSnipRect.height}px` }} />}
                            {isActiveTab && isMagnifierOn && magnifier.visible && <div className="pointer-events-none absolute z-40 h-52 w-72 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl ring-4 ring-white/80" style={{ left: `${magnifier.x + 20}px`, top: `${magnifier.y + 20}px`, backgroundImage: magnifier.bg ? `url(${magnifier.bg})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: magnifier.bgWidth && magnifier.bgHeight ? `${magnifier.bgWidth}px ${magnifier.bgHeight}px` : undefined, backgroundPosition: magnifier.bg ? `${144 - magnifier.x * 3}px ${104 - magnifier.y * 3}px` : undefined }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="relative cursor-col-resize bg-slate-100 hover:bg-blue-100" onMouseDown={() => setIsPaneResizing(true)} title="Drag to resize captured text panel"><div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" /></div>

            {isCapturedTextMaximized && <div className="fixed inset-0 z-[1000001] bg-slate-950/35" />}

            <div className={`flex min-h-0 flex-col border-l border-slate-200 bg-white ${
              isCapturedTextMaximized
                ? "fixed inset-4 z-[1000002] rounded-2xl border border-slate-200 shadow-2xl"
                : ""
            }`}>
              <div className="border-b border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0" />
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => setIsCapturedTextMaximized((prev) => !prev)}>
                      {isCapturedTextMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      {isCapturedTextMaximized ? "Restore" : "Maximize"}
                    </button>
                    <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText.trim()} onClick={copyCapturedText}><ClipboardCopy className="h-3.5 w-3.5" />{isCopied ? "Copied" : "Copy"}</button>
                    <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText.trim()} onClick={downloadCapturedText}><Download className="h-3.5 w-3.5" />TXT</button>
                    <button type="button" className="inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!capturedText || isReading} onClick={() => setCapturedText("")} title="Clear captured text"><Trash2 className="h-3.5 w-3.5" />Clear</button>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search captured text..." className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-xs font-['Aptos','Segoe_UI',sans-serif] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  {searchText && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setSearchText("")}><X className="h-3.5 w-3.5" /></button>}
                </div>
                {searchText.trim() && <div className="mt-1 text-[11px] text-slate-500">{searchMatchCount} match{searchMatchCount === 1 ? "" : "es"} highlighted</div>}
              </div>

              <div className="relative min-h-0 flex-1 p-3">
                {isReading && <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow-sm">Reading...</div>}
                <textarea value={capturedText} onChange={(e) => setCapturedText(e.target.value)} placeholder="Captured or extracted file text will appear here." className={`h-full min-h-[220px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 font-['Aptos','Segoe_UI',sans-serif] text-[12px] leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${searchText ? "opacity-0" : ""}`} />
                {searchText && <div className="pointer-events-none absolute inset-3 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-300 bg-white p-3 font-['Aptos','Segoe_UI',sans-serif] text-[12px] leading-5 text-slate-800" dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(capturedText || "Captured or extracted file text will appear here.", searchText) }} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PdfTextCaptureModal;
