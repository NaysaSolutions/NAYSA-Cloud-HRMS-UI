// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { AnimatePresence, motion } from "framer-motion";
// import {
//   X,
//   Camera,
//   CameraOff,
//   CheckCircle2,
//   RotateCcw,
//   ImagePlus,
//   FolderOpen,
//   CameraIcon,
//   Loader2,
//   QrCode,
//   Barcode,
//   ScanLine,
// } from "lucide-react";
// import jsQR from "jsqr";

// const QUAGGA_READERS = [
//   "code_128_reader",
//   "ean_reader",
//   "ean_8_reader",
//   "upc_reader",
//   "upc_e_reader",
//   "code_39_reader",
//   "codabar_reader",
//   "i2of5_reader",
// ];

// const GlassIconButton = ({
//   icon,
//   label,
//   onClick,
//   disabled = false,
//   active = false,
//   className = "",
// }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     disabled={disabled}
//     title={label}
//     className={`group flex min-w-[62px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2.5 text-white backdrop-blur-xl transition
//       ${
//         active
//           ? "border-white/25 bg-white/14 shadow-[0_10px_30px_rgba(255,255,255,0.06)]"
//           : "border-white/10 bg-white/6 hover:bg-white/10"
//       }
//       disabled:cursor-not-allowed disabled:opacity-50
//       sm:border-white/15 sm:bg-white/10 sm:hover:bg-white/16
//       ${className}`}
//   >
//     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 sm:bg-white/10">
//       {icon}
//     </div>
//     <span className="text-[10px] font-medium tracking-wide text-white/90">
//       {label}
//     </span>
//   </button>
// );

// const BarcodeQrReaderModal = ({
//   isOpen,
//   onClose,
//   onScan,
//   title = "Scan QR or Barcode",
//   scanOnce = true,
// }) => {
//   const [result, setResult] = useState("");
//   const [status, setStatus] = useState("idle"); // idle | scanning | success | paused
//   const [errorText, setErrorText] = useState("");
//   const [lastScanned, setLastScanned] = useState("");
//   const [isProcessingImage, setIsProcessingImage] = useState(false);
//   const [processingLabel, setProcessingLabel] = useState("");
//   const [folderScanSummary, setFolderScanSummary] = useState("");
//   const [capturedPreview, setCapturedPreview] = useState("");
//   const [cameraReady, setCameraReady] = useState(false);
//   const [detectedType, setDetectedType] = useState("");
//   const [detectedEngine, setDetectedEngine] = useState("");

//   const lastScanRef = useRef("");
//   const closeBtnRef = useRef(null);
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const folderInputRef = useRef(null);
//   const scanTimerRef = useRef(null);
//   const quaggaRef = useRef(null);
//   const isMountedRef = useRef(false);
//   const liveScanBusyRef = useRef(false);
//   const successAudioRef = useRef(null);

//   const hints = useMemo(
//     () => [
//       "Center the code inside the frame",
//       "Avoid glare and shaky movement",
//       "Use capture for difficult scans",
//       "You can also scan from image or folder",
//     ],
//     []
//   );

//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   useEffect(() => {
//     const audio = new Audio("/sounds/scan-success.mp3");
//     audio.preload = "auto";
//     successAudioRef.current = audio;

//     return () => {
//       if (successAudioRef.current) {
//         successAudioRef.current.pause();
//         successAudioRef.current = null;
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isOpen) {
//       setStatus("scanning");
//       setErrorText("");
//       setResult("");
//       setCapturedPreview("");
//       setFolderScanSummary("");
//       setProcessingLabel("");
//       setIsProcessingImage(false);
//       setLastScanned("");
//       setCameraReady(false);
//       setDetectedType("");
//       setDetectedEngine("");
//       lastScanRef.current = "";
//       setTimeout(() => closeBtnRef.current?.focus(), 50);
//       document.body.style.overflow = "hidden";
//       startCamera();
//     } else {
//       stopScanningLoop();
//       stopCamera();
//       document.body.style.overflow = "";
//     }

//     return () => {
//       stopScanningLoop();
//       stopCamera();
//       document.body.style.overflow = "";
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen]);

//   useEffect(() => {
//     if (!isOpen) return;

//     if (status === "paused" || isProcessingImage || !cameraReady) {
//       stopScanningLoop();
//       return;
//     }

//     if (status === "scanning") {
//       startScanningLoop();
//     } else {
//       stopScanningLoop();
//     }

//     return () => stopScanningLoop();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen, status, isProcessingImage, cameraReady]);

//   const safeSetState = (setter, value) => {
//     if (!isMountedRef.current) return;
//     setter(value);
//   };

//   const normalizeText = (value) => String(value || "").trim();

//   const playSuccessSound = async () => {
//     try {
//       if (!successAudioRef.current) return;
//       successAudioRef.current.currentTime = 0;
//       await successAudioRef.current.play();
//     } catch {
//       // ignore play interruption/autoplay errors
//     }
//   };

//   const handleDetected = (text, meta = {}) => {
//     const clean = normalizeText(text);
//     if (!clean) return;
//     if (scanOnce && lastScanRef.current === clean) return;

//     lastScanRef.current = clean;
//     safeSetState(setResult, clean);
//     safeSetState(setLastScanned, clean);
//     safeSetState(setStatus, "success");
//     safeSetState(setErrorText, "");
//     safeSetState(setDetectedType, meta?.type || "");
//     safeSetState(setDetectedEngine, meta?.engine || "");

//     playSuccessSound();

//     if (meta?.summary) {
//       safeSetState(setFolderScanSummary, meta.summary);
//     }

//     if (typeof onScan === "function") {
//       onScan(clean, meta);
//     }

//     if (!scanOnce) {
//       setTimeout(() => {
//         if (!isMountedRef.current) return;
//         setStatus("scanning");
//       }, 1200);
//     }
//   };

//   const ensureQuagga = async () => {
//     if (quaggaRef.current) return quaggaRef.current;
//     const mod = await import("@ericblade/quagga2");
//     quaggaRef.current = mod.default || mod;
//     return quaggaRef.current;
//   };

//   const startCamera = async () => {
//     try {
//       safeSetState(setErrorText, "");
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: false,
//         video: {
//           facingMode: { ideal: "environment" },
//           width: { ideal: 1920 },
//           height: { ideal: 1080 },
//         },
//       });

//       streamRef.current = stream;

//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play().catch(() => {});
//       }

//       safeSetState(setCameraReady, true);
//     } catch (err) {
//       safeSetState(
//         setErrorText,
//         String(err?.message || err || "Unable to access camera.")
//       );
//       safeSetState(setCameraReady, false);
//     }
//   };

//   const stopCamera = () => {
//     const stream = streamRef.current;
//     if (stream) {
//       stream.getTracks().forEach((track) => track.stop());
//       streamRef.current = null;
//     }

//     if (videoRef.current) {
//       videoRef.current.srcObject = null;
//     }

//     setCameraReady(false);
//   };

//   const stopScanningLoop = () => {
//     if (scanTimerRef.current) {
//       clearInterval(scanTimerRef.current);
//       scanTimerRef.current = null;
//     }
//   };

//   const startScanningLoop = () => {
//     stopScanningLoop();

//     scanTimerRef.current = setInterval(async () => {
//       if (liveScanBusyRef.current) return;
//       if (
//         !videoRef.current ||
//         !cameraReady ||
//         status !== "scanning" ||
//         isProcessingImage
//       ) {
//         return;
//       }

//       liveScanBusyRef.current = true;

//       try {
//         const frameCanvas = captureVideoFrame(videoRef.current);
//         if (!frameCanvas) return;

//         const decoded = await decodeCanvasHybrid(frameCanvas, {
//           includeRotations: false,
//           liveMode: true,
//           requiredMatches: 2,
//         });

//         if (decoded?.text) {
//           handleDetected(decoded.text, {
//             source: "camera-live",
//             format: decoded.format || "",
//             engine: decoded.engine || "",
//             type: decoded.type || "",
//             confidence: decoded.confidence || "",
//           });
//         }
//       } catch {
//         // ignore live scan errors
//       } finally {
//         liveScanBusyRef.current = false;
//       }
//     }, 450);
//   };

//   const captureVideoFrame = (video) => {
//     if (!video || !video.videoWidth || !video.videoHeight) return null;

//     const canvas = document.createElement("canvas");
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//     return canvas;
//   };

//   const cloneCanvas = (source) => {
//     const canvas = document.createElement("canvas");
//     canvas.width = source.width;
//     canvas.height = source.height;
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(source, 0, 0);
//     return canvas;
//   };

//   const scaleCanvas = (source, scale = 1) => {
//     const canvas = document.createElement("canvas");
//     canvas.width = Math.max(1, Math.round(source.width * scale));
//     canvas.height = Math.max(1, Math.round(source.height * scale));
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
//     return canvas;
//   };

//   const rotateCanvas = (source, degrees) => {
//     const radians = (degrees * Math.PI) / 180;
//     const swap = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

//     const canvas = document.createElement("canvas");
//     canvas.width = swap ? source.height : source.width;
//     canvas.height = swap ? source.width : source.height;

//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.translate(canvas.width / 2, canvas.height / 2);
//     ctx.rotate(radians);
//     ctx.drawImage(source, -source.width / 2, -source.height / 2);

//     return canvas;
//   };

//   const cropCanvasCenter = (source, ratioX = 1, ratioY = 1) => {
//     const cropW = Math.max(1, Math.round(source.width * ratioX));
//     const cropH = Math.max(1, Math.round(source.height * ratioY));
//     const sx = Math.max(0, Math.round((source.width - cropW) / 2));
//     const sy = Math.max(0, Math.round((source.height - cropH) / 2));

//     const canvas = document.createElement("canvas");
//     canvas.width = cropW;
//     canvas.height = cropH;

//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

//     return canvas;
//   };

//   const grayscaleCanvas = (source) => {
//     const canvas = cloneCanvas(source);
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     const data = imageData.data;

//     for (let i = 0; i < data.length; i += 4) {
//       const gray = Math.round(
//         data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
//       );
//       data[i] = gray;
//       data[i + 1] = gray;
//       data[i + 2] = gray;
//     }

//     ctx.putImageData(imageData, 0, 0);
//     return canvas;
//   };

//   const contrastCanvas = (source, factor = 1.45) => {
//     const canvas = grayscaleCanvas(source);
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     const data = imageData.data;

//     for (let i = 0; i < data.length; i += 4) {
//       const v = Math.max(
//         0,
//         Math.min(255, Math.round((data[i] - 128) * factor + 128))
//       );
//       data[i] = v;
//       data[i + 1] = v;
//       data[i + 2] = v;
//     }

//     ctx.putImageData(imageData, 0, 0);
//     return canvas;
//   };

//   const thresholdCanvas = (source, threshold = 145) => {
//     const canvas = grayscaleCanvas(source);
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     const data = imageData.data;

//     for (let i = 0; i < data.length; i += 4) {
//       const v = data[i] >= threshold ? 255 : 0;
//       data[i] = v;
//       data[i + 1] = v;
//       data[i + 2] = v;
//     }

//     ctx.putImageData(imageData, 0, 0);
//     return canvas;
//   };

//   const getImageDataFromCanvas = (canvas) => {
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     return ctx.getImageData(0, 0, canvas.width, canvas.height);
//   };

//   const tryQrDecode = (canvas) => {
//     try {
//       const imageData = getImageDataFromCanvas(canvas);
//       const qr = jsQR(imageData.data, imageData.width, imageData.height, {
//         inversionAttempts: "attemptBoth",
//       });

//       const text = normalizeText(qr?.data);
//       if (!text) return null;

//       return {
//         text,
//         format: "qr_code",
//         engine: "jsqr",
//         type: "qr",
//       };
//     } catch {
//       return null;
//     }
//   };

//   const extractQuaggaErrorScore = (res) => {
//     try {
//       const errs = res?.codeResult?.decodedCodes
//         ?.map((x) => x?.error)
//         ?.filter((x) => typeof x === "number" && Number.isFinite(x));

//       if (!errs?.length) return null;
//       return errs.reduce((a, b) => a + b, 0) / errs.length;
//     } catch {
//       return null;
//     }
//   };

//   const calcEAN13Checksum = (digits) => {
//     const nums = digits.split("").map(Number);
//     const body = nums.slice(0, 12);
//     const sum = body.reduce((acc, n, idx) => {
//       return acc + n * (idx % 2 === 0 ? 1 : 3);
//     }, 0);
//     return (10 - (sum % 10)) % 10;
//   };

//   const calcEAN8Checksum = (digits) => {
//     const nums = digits.split("").map(Number);
//     const body = nums.slice(0, 7);
//     const sum = body.reduce((acc, n, idx) => {
//       return acc + n * (idx % 2 === 0 ? 3 : 1);
//     }, 0);
//     return (10 - (sum % 10)) % 10;
//   };

//   const isValidBarcodeByFormat = (text, format) => {
//     const value = normalizeText(text);
//     const fmt = String(format || "").toLowerCase();

//     if (!value) return false;

//     if (fmt.includes("ean_13") || fmt === "ean") {
//       return (
//         /^\d{13}$/.test(value) &&
//         calcEAN13Checksum(value) === Number(value[12])
//       );
//     }

//     if (fmt.includes("ean_8")) {
//       return (
//         /^\d{8}$/.test(value) && calcEAN8Checksum(value) === Number(value[7])
//       );
//     }

//     if (fmt.includes("upc")) {
//       return /^\d{11,12}$/.test(value);
//     }

//     if (fmt.includes("i2of5")) {
//       return /^\d{6,}$/.test(value);
//     }

//     if (fmt.includes("code_39")) {
//       return /^[0-9A-Z\-\.\ \$\/\+\%]+$/.test(value) && value.length >= 3;
//     }

//     if (fmt.includes("codabar")) {
//       return /^[0-9\-\$\:\.\+\/A-D]+$/i.test(value) && value.length >= 4;
//     }

//     if (fmt.includes("code_128")) {
//       return value.length >= 4;
//     }

//     return value.length >= 3;
//   };

//   const tryBarcodeDecode = async (canvas, { locate = true } = {}) => {
//     try {
//       const Quagga = await ensureQuagga();

//       const res = await new Promise((resolve) => {
//         Quagga.decodeSingle(
//           {
//             src: canvas.toDataURL("image/png"),
//             numOfWorkers: 0,
//             locate,
//             decoder: {
//               readers: QUAGGA_READERS,
//               multiple: false,
//             },
//           },
//           (value) => resolve(value || null)
//         );
//       });

//       const text = normalizeText(res?.codeResult?.code);
//       if (!text) return null;

//       const format = res?.codeResult?.format || "";
//       const errorScore = extractQuaggaErrorScore(res);

//       return {
//         text,
//         format,
//         errorScore,
//         engine: "quagga2",
//         type: "barcode",
//       };
//     } catch {
//       return null;
//     }
//   };

//   const buildQrVariants = (
//     baseCanvas,
//     { includeRotations = false, liveMode = false } = {}
//   ) => {
//     const variants = [];
//     const add = (canvas) => {
//       if (canvas) variants.push(canvas);
//     };

//     if (liveMode) {
//       const square = cropCanvasCenter(baseCanvas, 0.78, 0.78);
//       add(square);
//       add(scaleCanvas(square, 1.4));
//       add(contrastCanvas(square, 1.25));
//       add(baseCanvas);
//       return variants;
//     }

//     add(baseCanvas);
//     add(scaleCanvas(baseCanvas, 1.5));
//     add(scaleCanvas(baseCanvas, 2));
//     add(contrastCanvas(baseCanvas, 1.25));
//     add(thresholdCanvas(baseCanvas, 145));

//     const square = cropCanvasCenter(baseCanvas, 0.78, 0.78);
//     add(square);
//     add(scaleCanvas(square, 1.8));
//     add(contrastCanvas(square, 1.3));
//     add(thresholdCanvas(square, 145));

//     if (includeRotations) {
//       [90, -90, 180].forEach((deg) => {
//         const rotated = rotateCanvas(baseCanvas, deg);
//         add(rotated);
//         add(scaleCanvas(rotated, 1.5));
//       });
//     }

//     return variants;
//   };

//   const buildBarcodeVariants = (
//     baseCanvas,
//     { includeRotations = false, liveMode = false } = {}
//   ) => {
//     const variants = [];
//     const add = (canvas) => {
//       if (canvas) variants.push(canvas);
//     };

//     if (liveMode) {
//       const wide = cropCanvasCenter(baseCanvas, 0.92, 0.42);
//       add(wide);
//       add(scaleCanvas(wide, 1.5));
//       add(contrastCanvas(wide, 1.35));
//       add(baseCanvas);
//       return variants;
//     }

//     add(baseCanvas);
//     add(scaleCanvas(baseCanvas, 1.5));
//     add(scaleCanvas(baseCanvas, 2));
//     add(contrastCanvas(baseCanvas, 1.35));
//     add(thresholdCanvas(baseCanvas, 145));

//     const wide = cropCanvasCenter(baseCanvas, 0.94, 0.42);
//     add(wide);
//     add(scaleCanvas(wide, 1.8));
//     add(contrastCanvas(wide, 1.4));
//     add(thresholdCanvas(wide, 145));

//     if (includeRotations) {
//       [90, -90, 180].forEach((deg) => {
//         const rotated = rotateCanvas(baseCanvas, deg);
//         add(rotated);
//         add(scaleCanvas(rotated, 1.6));
//         add(contrastCanvas(rotated, 1.35));
//       });
//     }

//     return variants;
//   };

//   const pickQrConsensus = (candidates, requiredMatches = 2) => {
//     if (!candidates.length) return null;

//     const grouped = new Map();

//     candidates.forEach((item) => {
//       const key = item.text;
//       if (!grouped.has(key)) grouped.set(key, []);
//       grouped.get(key).push(item);
//     });

//     const ranked = [...grouped.entries()]
//       .map(([text, items]) => ({
//         text,
//         items,
//         count: items.length,
//         best: items[0],
//       }))
//       .sort((a, b) => b.count - a.count);

//     const top = ranked[0];
//     if (!top) return null;

//     if (
//       top.count >= requiredMatches ||
//       (requiredMatches === 1 && top.count >= 1)
//     ) {
//       return {
//         ...top.best,
//         confidence: `consensus:${top.count}`,
//       };
//     }

//     return null;
//   };

//   const pickBarcodeConsensus = (candidates, requiredMatches = 2) => {
//     if (!candidates.length) return null;

//     const grouped = new Map();

//     candidates.forEach((item) => {
//       const key = `${item.text}__${item.format}`;
//       if (!grouped.has(key)) grouped.set(key, []);
//       grouped.get(key).push(item);
//     });

//     const ranked = [...grouped.entries()]
//       .map(([key, items]) => {
//         const bestError = items
//           .map((x) => x.errorScore)
//           .filter((x) => typeof x === "number")
//           .sort((a, b) => a - b)[0];

//         const best = [...items].sort((a, b) => {
//           const ea = typeof a.errorScore === "number" ? a.errorScore : 999;
//           const eb = typeof b.errorScore === "number" ? b.errorScore : 999;
//           return ea - eb;
//         })[0];

//         return {
//           key,
//           items,
//           count: items.length,
//           bestError: typeof bestError === "number" ? bestError : 999,
//           best,
//         };
//       })
//       .sort((a, b) => {
//         if (b.count !== a.count) return b.count - a.count;
//         return a.bestError - b.bestError;
//       });

//     const top = ranked[0];
//     if (!top) return null;

//     if (top.count >= requiredMatches) {
//       return {
//         ...top.best,
//         confidence: `consensus:${top.count}`,
//       };
//     }

//     if (top.count === 1 && top.bestError <= 0.12) {
//       return {
//         ...top.best,
//         confidence: "single-low-error",
//       };
//     }

//     return null;
//   };

//   const decodeQrConsensus = async (
//     baseCanvas,
//     { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
//   ) => {
//     const variants = buildQrVariants(baseCanvas, {
//       includeRotations,
//       liveMode,
//     });
//     const hits = [];

//     for (const canvas of variants) {
//       const qr = tryQrDecode(canvas);
//       if (qr?.text) {
//         hits.push(qr);
//       }
//     }

//     return pickQrConsensus(hits, requiredMatches);
//   };

//   const decodeBarcodeConsensus = async (
//     baseCanvas,
//     { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
//   ) => {
//     const variants = buildBarcodeVariants(baseCanvas, {
//       includeRotations,
//       liveMode,
//     });
//     const hits = [];

//     for (const canvas of variants) {
//       const located = await tryBarcodeDecode(canvas, { locate: true });
//       if (
//         located?.text &&
//         isValidBarcodeByFormat(located.text, located.format) &&
//         (typeof located.errorScore !== "number" || located.errorScore <= 0.25)
//       ) {
//         hits.push(located);
//       }

//       const nonLocated = await tryBarcodeDecode(canvas, { locate: false });
//       if (
//         nonLocated?.text &&
//         isValidBarcodeByFormat(nonLocated.text, nonLocated.format) &&
//         (typeof nonLocated.errorScore !== "number" ||
//           nonLocated.errorScore <= 0.25)
//       ) {
//         hits.push(nonLocated);
//       }
//     }

//     return pickBarcodeConsensus(hits, requiredMatches);
//   };

//   const decodeCanvasHybrid = async (
//     baseCanvas,
//     { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
//   ) => {
//     const qrResult = await decodeQrConsensus(baseCanvas, {
//       includeRotations,
//       liveMode,
//       requiredMatches: liveMode ? 1 : requiredMatches,
//     });

//     if (qrResult?.text) return qrResult;

//     const barcodeResult = await decodeBarcodeConsensus(baseCanvas, {
//       includeRotations,
//       liveMode,
//       requiredMatches,
//     });

//     if (barcodeResult?.text) return barcodeResult;

//     return null;
//   };

//   const fileToCanvas = async (file) => {
//     const bitmap = await createImageBitmap(file);
//     const canvas = document.createElement("canvas");
//     canvas.width = bitmap.width;
//     canvas.height = bitmap.height;
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     ctx.drawImage(bitmap, 0, 0);
//     return canvas;
//   };

//   const fileToDataUrl = (file) =>
//     new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => resolve(String(reader.result || ""));
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });

//   const handlePauseResume = () => {
//     if (isProcessingImage) return;
//     setStatus((prev) => (prev === "paused" ? "scanning" : "paused"));
//   };

//   const handleReset = () => {
//     setResult("");
//     setErrorText("");
//     setLastScanned("");
//     setCapturedPreview("");
//     setFolderScanSummary("");
//     setProcessingLabel("");
//     setIsProcessingImage(false);
//     setDetectedType("");
//     setDetectedEngine("");
//     lastScanRef.current = "";
//     setStatus("scanning");
//   };

//   const handleUseResult = () => {
//     if (!result) return;
//     if (typeof onScan === "function") {
//       onScan(result, {
//         source: "manual-use-result",
//         type: detectedType,
//         engine: detectedEngine,
//       });
//     }
//     onClose?.();
//   };

//   const handleCaptureAndRead = async () => {
//     try {
//       setErrorText("");
//       setFolderScanSummary("");
//       setProcessingLabel("Capturing image...");
//       setIsProcessingImage(true);

//       const frameCanvas = captureVideoFrame(videoRef.current);
//       if (!frameCanvas) {
//         throw new Error("Camera frame is not ready yet.");
//       }

//       setCapturedPreview(frameCanvas.toDataURL("image/png"));
//       setProcessingLabel("Decoding captured image...");

//       const decoded = await decodeCanvasHybrid(frameCanvas, {
//         includeRotations: true,
//         liveMode: false,
//         requiredMatches: 2,
//       });

//       if (decoded?.text) {
//         handleDetected(decoded.text, {
//           source: "camera-capture",
//           format: decoded.format || "",
//           engine: decoded.engine || "",
//           type: decoded.type || "",
//           confidence: decoded.confidence || "",
//         });
//       } else {
//         setErrorText(
//           "No trustworthy QR code or barcode value found in captured image."
//         );
//       }
//     } catch (err) {
//       setErrorText(String(err?.message || err || "Failed to capture image."));
//     } finally {
//       setIsProcessingImage(false);
//       setProcessingLabel("");
//     }
//   };

//   const handlePickFileClick = () => {
//     fileInputRef.current?.click();
//   };

//   const handlePickFolderClick = () => {
//     if (!folderInputRef.current) return;
//     folderInputRef.current.setAttribute("webkitdirectory", "");
//     folderInputRef.current.setAttribute("directory", "");
//     folderInputRef.current.click();
//   };

//   const handleFileSelection = async (event) => {
//     const files = Array.from(event.target.files || []);
//     event.target.value = "";

//     if (!files.length) return;

//     try {
//       setErrorText("");
//       setFolderScanSummary("");
//       setProcessingLabel("Reading image file...");
//       setIsProcessingImage(true);

//       const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
//       if (!imageFiles.length) {
//         throw new Error("Please select an image file.");
//       }

//       const file = imageFiles[0];
//       const preview = await fileToDataUrl(file);
//       setCapturedPreview(preview);

//       const canvas = await fileToCanvas(file);
//       const decoded = await decodeCanvasHybrid(canvas, {
//         includeRotations: true,
//         liveMode: false,
//         requiredMatches: 2,
//       });

//       if (decoded?.text) {
//         handleDetected(decoded.text, {
//           source: "file",
//           fileName: file.name,
//           format: decoded.format || "",
//           engine: decoded.engine || "",
//           type: decoded.type || "",
//           confidence: decoded.confidence || "",
//         });
//       } else {
//         setErrorText(
//           `No trustworthy QR code or barcode value found in "${file.name}".`
//         );
//       }
//     } catch (err) {
//       setErrorText(String(err?.message || err || "Failed to read image file."));
//     } finally {
//       setIsProcessingImage(false);
//       setProcessingLabel("");
//     }
//   };

//   const handleFolderSelection = async (event) => {
//     const files = Array.from(event.target.files || []);
//     event.target.value = "";

//     if (!files.length) return;

//     try {
//       setErrorText("");
//       setFolderScanSummary("");
//       setProcessingLabel("Scanning folder images...");
//       setIsProcessingImage(true);

//       const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
//       if (!imageFiles.length) {
//         throw new Error("Selected folder contains no image files.");
//       }

//       const allHits = [];
//       let firstPreview = "";

//       for (let i = 0; i < imageFiles.length; i++) {
//         const file = imageFiles[i];
//         setProcessingLabel(
//           `Scanning folder images... (${i + 1}/${imageFiles.length})`
//         );

//         try {
//           const canvas = await fileToCanvas(file);
//           const decoded = await decodeCanvasHybrid(canvas, {
//             includeRotations: true,
//             liveMode: false,
//             requiredMatches: 2,
//           });

//           if (decoded?.text) {
//             allHits.push({
//               fileName: file.name,
//               text: decoded.text,
//               format: decoded.format || "",
//               engine: decoded.engine || "",
//               type: decoded.type || "",
//               confidence: decoded.confidence || "",
//             });

//             if (!firstPreview) {
//               firstPreview = await fileToDataUrl(file);
//             }
//           }
//         } catch {
//           // continue scanning next file
//         }
//       }

//       if (allHits.length) {
//         setCapturedPreview(firstPreview || "");
//         handleDetected(allHits[0].text, {
//           source: "folder",
//           fileName: allHits[0].fileName,
//           format: allHits[0].format || "",
//           engine: allHits[0].engine || "",
//           type: allHits[0].type || "",
//           confidence: allHits[0].confidence || "",
//           hits: allHits,
//           summary: `${allHits.length} trustworthy code(s) found out of ${imageFiles.length} image file(s). Showing first result from "${allHits[0].fileName}".`,
//         });
//       } else {
//         setErrorText(
//           `No trustworthy QR code or barcode value found in ${imageFiles.length} image file(s).`
//         );
//       }
//     } catch (err) {
//       setErrorText(
//         String(err?.message || err || "Failed to scan selected folder.")
//       );
//     } finally {
//       setIsProcessingImage(false);
//       setProcessingLabel("");
//     }
//   };

//   const showBottomPanel = !!(
//     result ||
//     errorText ||
//     processingLabel ||
//     folderScanSummary
//   );

//   if (!isOpen) return null;

//   return (
//     <AnimatePresence>
//       <motion.div
//         className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         onClick={onClose}
//       >
//         <motion.div
//           className="relative h-[100dvh] w-full bg-black sm:h-[88vh] sm:max-h-[860px] sm:w-[min(92vw,760px)] sm:rounded-[34px] sm:border sm:border-white/10 sm:bg-black sm:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
//           initial={{ opacity: 0, y: 20, scale: 0.98 }}
//           animate={{ opacity: 1, y: 0, scale: 1 }}
//           exit={{ opacity: 0, y: 12, scale: 0.98 }}
//           transition={{ duration: 0.22 }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/*"
//             className="hidden"
//             onChange={handleFileSelection}
//           />

//           <input
//             ref={folderInputRef}
//             type="file"
//             accept="image/*"
//             multiple
//             className="hidden"
//             onChange={handleFolderSelection}
//           />

//           <div className="absolute inset-0 overflow-hidden sm:rounded-[34px]">
//             <video
//               ref={videoRef}
//               className="absolute inset-0 h-full w-full object-cover"
//               muted
//               playsInline
//               autoPlay
//             />

//             <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70 sm:from-black/42 sm:via-black/8 sm:to-black/68" />
//           </div>

//           <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 -translate-y-10 sm:-translate-y-8">
//             <div className="relative h-[48vw] w-[48vw] min-h-[205px] min-w-[205px] max-h-[280px] max-w-[280px] rounded-[28px] border border-white/15 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.24)] sm:h-[310px] sm:w-[310px]">
             
//                 {isProcessingImage && (
//                     <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-black/28 backdrop-blur-[2px]">
//                       <div className="flex flex-col items-center gap-3">
//                         <motion.div
//                           className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white"
//                           animate={{ rotate: 360 }}
//                           transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
//                         />
//                         <div className="text-center text-xs font-medium text-white/90">
//                           {processingLabel || "Processing image..."}
//                         </div>
//                       </div>
//                     </div>
//                   )}


         
//               <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-[28px] border-l-4 border-t-4 border-white" />
//               <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-[28px] border-r-4 border-t-4 border-white" />
//               <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-[28px] border-b-4 border-l-4 border-white" />
//               <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-[28px] border-b-4 border-r-4 border-white" />

//               {status === "scanning" && !isProcessingImage && (
//                 <motion.div
//                   className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]"
//                   animate={{ y: [0, 210, 0] }}
//                   transition={{
//                     duration: 2,
//                     repeat: Infinity,
//                     ease: "easeInOut",
//                   }}
//                 />
//               )}
//             </div>
//           </div>

//           <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-5">
//             <div className="mx-auto flex w-full items-start justify-between">
//               <div className="max-w-[78%] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-xl">
//                 <div className="flex items-center gap-2">
//                   <ScanLine size={16} className="text-white/85" />
//                   <h2 className="truncate text-sm font-semibold sm:text-base">
//                     {title}
//                   </h2>
//                 </div>
//                 <p className="mt-1 text-[11px] text-white/70 sm:text-xs">
//                   Powered by NAYSA
//                 </p>
//               </div>

//               <button
//                 ref={closeBtnRef}
//                 type="button"
//                 onClick={onClose}
//                 className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-xl transition hover:bg-white/12 sm:border-white/15 sm:bg-white/10 sm:hover:bg-white/15"
//                 aria-label="Close scanner"
//               >
//                 <X size={18} />
//               </button>
//             </div>
//           </div>

//           <div className="absolute inset-x-0 top-[88px] z-10 px-4 sm:px-5">
//             <div className="mx-auto flex flex-wrap items-center gap-2">
//               <div className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-[11px] text-white/88 backdrop-blur-xl sm:bg-black/30">
//                 {isProcessingImage
//                   ? "Processing image..."
//                   : status === "paused"
//                   ? "Camera paused"
//                   : status === "success"
//                   ? "Code detected"
//                   : cameraReady
//                   ? "Scanning..."
//                   : "Preparing camera..."}
//               </div>

//               {(detectedType || detectedEngine) && (
//                 <div className="flex flex-wrap gap-2">
//                   {detectedType === "qr" && (
//                     <div className="inline-flex items-center gap-1 rounded-full border border-blue-300/20 bg-blue-400/12 px-3 py-1.5 text-[11px] text-blue-100 backdrop-blur-xl sm:bg-blue-400/15">
//                       <QrCode size={12} />
//                       QR
//                     </div>
//                   )}

//                   {detectedType === "barcode" && (
//                     <div className="inline-flex items-center gap-1 rounded-full border border-violet-300/20 bg-violet-400/12 px-3 py-1.5 text-[11px] text-violet-100 backdrop-blur-xl sm:bg-violet-400/15">
//                       <Barcode size={12} />
//                       Barcode
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {capturedPreview && (
//             <div className="absolute right-4 top-[138px] z-10 sm:right-5 sm:top-[145px]">
//               <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/8 shadow-xl backdrop-blur-xl sm:border-white/15 sm:bg-white/10">
//                 <img
//                   src={capturedPreview}
//                   alt="Captured preview"
//                   className="h-14 w-14 object-cover sm:h-20 sm:w-20"
//                 />
//               </div>
//             </div>
//           )}

//           {showBottomPanel && (
//             <div className="absolute inset-x-0 bottom-[208px] z-10 px-3 sm:bottom-[108px] sm:px-5">
//               <div className="mx-auto">
//                 <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-white shadow-2xl backdrop-blur-2xl sm:rounded-[24px] sm:bg-black/35 sm:p-4">
//                   <div className="mb-2 flex items-center gap-2">
//                     <CheckCircle2
//                       size={16}
//                       className={result ? "text-emerald-300" : "text-white/40"}
//                     />
//                     <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
//                       Detected value
//                     </span>
//                   </div>

//                   {!!result && (
//                     <div className="max-h-[60px] overflow-y-auto break-all text-[13px] font-medium text-white sm:max-h-[88px] sm:text-base">
//                       {result}
//                     </div>
//                   )}

//                   {/* {!!processingLabel && (
//                     <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-[12px] text-white/85">
//                       <Loader2 size={14} className="animate-spin" />
//                       {processingLabel}
//                     </div>
//                   )} */}

//                   {!!processingLabel && (
//                     <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/8">
//                       <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/85">
//                         <Loader2 size={14} className="animate-spin" />
//                         <span>{processingLabel}</span>
//                         <span className="ml-auto flex items-center gap-1">
//                           <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.2s]" />
//                           <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.1s]" />
//                           <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" />
//                         </span>
//                       </div>

//                       <motion.div
//                         className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
//                         animate={{ x: ["-100%", "100%"] }}
//                         transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
//                       />
//                     </div>
//                   )}

//                   {!!folderScanSummary && (
//                     <div className="mt-2 rounded-2xl border border-blue-300/15 bg-blue-400/10 px-3 py-2 text-[12px] text-blue-100">
//                       {folderScanSummary}
//                     </div>
//                   )}

//                   {!!errorText && (
//                     <div className="mt-2 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100">
//                       {errorText}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 sm:px-5">
//             <div className="mx-auto">
//               <div className="rounded-[28px] border border-white/10 bg-black/22 p-3 shadow-2xl backdrop-blur-2xl sm:bg-black/35">
//                 <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
//                   <GlassIconButton
//                     label={status === "paused" ? "Resume" : "Pause"}
//                     icon={
//                       status === "paused" ? (
//                         <Camera size={18} />
//                       ) : (
//                         <CameraOff size={18} />
//                       )
//                     }
//                     onClick={handlePauseResume}
//                     disabled={isProcessingImage}
//                     active={status === "paused"}
//                   />

//                   <GlassIconButton
//                     label="Capture"
//                     icon={<CameraIcon size={18} />}
//                     onClick={handleCaptureAndRead}
//                     disabled={isProcessingImage}
//                   />

//                   <GlassIconButton
//                     label="Image"
//                     icon={<ImagePlus size={18} />}
//                     onClick={handlePickFileClick}
//                     disabled={isProcessingImage}
//                   />

//                   <GlassIconButton
//                     label="Folder"
//                     icon={<FolderOpen size={18} />}
//                     onClick={handlePickFolderClick}
//                     disabled={isProcessingImage}
//                   />

//                   <GlassIconButton
//                     label="Reset"
//                     icon={<RotateCcw size={18} />}
//                     onClick={handleReset}
//                   />

//                   <GlassIconButton
//                     label="Use"
//                     icon={<CheckCircle2 size={18} />}
//                     onClick={handleUseResult}
//                     disabled={!result}
//                     active={!!result}
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     </AnimatePresence>
//   );
// };

// export default BarcodeQrReaderModal;


import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Camera,
  CameraOff,
  CheckCircle2,
  RotateCcw,
  ImagePlus,
  FolderOpen,
  CameraIcon,
  Loader2,
  QrCode,
  Barcode,
  ScanLine,
} from "lucide-react";
import jsQR from "jsqr";

const QUAGGA_READERS = [
  "code_128_reader",
  "ean_reader",
  "ean_8_reader",
  "upc_reader",
  "upc_e_reader",
  "code_39_reader",
  "codabar_reader",
  "i2of5_reader",
];

const GlassIconButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  className = "",
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`group flex min-w-[62px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2.5 text-white backdrop-blur-xl transition
      ${
        active
          ? "border-white/25 bg-white/14 shadow-[0_10px_30px_rgba(255,255,255,0.06)]"
          : "border-white/10 bg-white/6 hover:bg-white/10"
      }
      disabled:cursor-not-allowed disabled:opacity-50
      sm:border-white/15 sm:bg-white/10 sm:hover:bg-white/16
      ${className}`}
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 sm:bg-white/10">
      {icon}
    </div>
    <span className="text-[10px] font-medium tracking-wide text-white/90">
      {label}
    </span>
  </button>
);

const BarcodeQrReaderModal = ({
  isOpen,
  onClose,
  onScan,
  title = "Scan QR or Barcode",
  scanOnce = true,
}) => {
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("idle"); // idle | scanning | success | paused
  const [errorText, setErrorText] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [folderScanSummary, setFolderScanSummary] = useState("");
  const [capturedPreview, setCapturedPreview] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [detectedType, setDetectedType] = useState("");
  const [detectedEngine, setDetectedEngine] = useState("");

  const lastScanRef = useRef("");
  const closeBtnRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const quaggaRef = useRef(null);
  const isMountedRef = useRef(false);
  const liveScanBusyRef = useRef(false);
  const successAudioRef = useRef(null);

  const hints = useMemo(
    () => [
      "Center the code inside the frame",
      "Avoid glare and shaky movement",
      "Use capture for difficult scans",
      "You can also scan from image or folder",
    ],
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio("/sounds/scan-success.mp3");
    audio.preload = "auto";
    successAudioRef.current = audio;

    return () => {
      if (successAudioRef.current) {
        successAudioRef.current.pause();
        successAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatus("scanning");
      setErrorText("");
      setResult("");
      setCapturedPreview("");
      setFolderScanSummary("");
      setProcessingLabel("");
      setIsProcessingImage(false);
      setLastScanned("");
      setCameraReady(false);
      setDetectedType("");
      setDetectedEngine("");
      lastScanRef.current = "";
      setTimeout(() => closeBtnRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
      startCamera();
    } else {
      stopScanningLoop();
      stopCamera();
      document.body.style.overflow = "";
    }

    return () => {
      stopScanningLoop();
      stopCamera();
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (status === "paused" || isProcessingImage || !cameraReady) {
      stopScanningLoop();
      return;
    }

    if (status === "scanning") {
      startScanningLoop();
    } else {
      stopScanningLoop();
    }

    return () => stopScanningLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status, isProcessingImage, cameraReady]);

  const safeSetState = (setter, value) => {
    if (!isMountedRef.current) return;
    setter(value);
  };

  const normalizeText = (value) => String(value || "").trim();

  const playSuccessSound = async () => {
    try {
      if (!successAudioRef.current) return;
      successAudioRef.current.currentTime = 0;
      await successAudioRef.current.play();
    } catch {
      // ignore play interruption/autoplay errors
    }
  };

  const handleDetected = (text, meta = {}) => {
    const clean = normalizeText(text);
    if (!clean) return;
    if (scanOnce && lastScanRef.current === clean) return;

    lastScanRef.current = clean;
    safeSetState(setResult, clean);
    safeSetState(setLastScanned, clean);
    safeSetState(setStatus, "success");
    safeSetState(setErrorText, "");
    safeSetState(setDetectedType, meta?.type || "");
    safeSetState(setDetectedEngine, meta?.engine || "");

    playSuccessSound();

    if (meta?.summary) {
      safeSetState(setFolderScanSummary, meta.summary);
    }

    if (typeof onScan === "function") {
      onScan(clean, meta);
    }

    if (!scanOnce) {
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setStatus("scanning");
      }, 1200);
    }
  };

  const ensureQuagga = async () => {
    if (quaggaRef.current) return quaggaRef.current;
    const mod = await import("@ericblade/quagga2");
    quaggaRef.current = mod.default || mod;
    return quaggaRef.current;
  };

  const startCamera = async () => {
    try {
      safeSetState(setErrorText, "");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      safeSetState(setCameraReady, true);
    } catch (err) {
      safeSetState(
        setErrorText,
        String(err?.message || err || "Unable to access camera.")
      );
      safeSetState(setCameraReady, false);
    }
  };

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  };

  const stopScanningLoop = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  };

  const startScanningLoop = () => {
    stopScanningLoop();

    scanTimerRef.current = setInterval(async () => {
      if (liveScanBusyRef.current) return;
      if (
        !videoRef.current ||
        !cameraReady ||
        status !== "scanning" ||
        isProcessingImage
      ) {
        return;
      }

      liveScanBusyRef.current = true;

      try {
        const frameCanvas = captureVideoFrame(videoRef.current);
        if (!frameCanvas) return;

        const decoded = await decodeCanvasHybrid(frameCanvas, {
          includeRotations: false,
          liveMode: true,
          requiredMatches: 2,
        });

        if (decoded?.text) {
          handleDetected(decoded.text, {
            source: "camera-live",
            format: decoded.format || "",
            engine: decoded.engine || "",
            type: decoded.type || "",
            confidence: decoded.confidence || "",
          });
        }
      } catch {
        // ignore live scan errors
      } finally {
        liveScanBusyRef.current = false;
      }
    }, 450);
  };

  const captureVideoFrame = (video) => {
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
  };

  const cloneCanvas = (source) => {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    return canvas;
  };

  const scaleCanvas = (source, scale = 1) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const rotateCanvas = (source, degrees) => {
    const radians = (degrees * Math.PI) / 180;
    const swap = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

    const canvas = document.createElement("canvas");
    canvas.width = swap ? source.height : source.width;
    canvas.height = swap ? source.width : source.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);

    return canvas;
  };

  const cropCanvasCenter = (source, ratioX = 1, ratioY = 1) => {
    const cropW = Math.max(1, Math.round(source.width * ratioX));
    const cropH = Math.max(1, Math.round(source.height * ratioY));
    const sx = Math.max(0, Math.round((source.width - cropW) / 2));
    const sy = Math.max(0, Math.round((source.height - cropH) / 2));

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    return canvas;
  };

  const grayscaleCanvas = (source) => {
    const canvas = cloneCanvas(source);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(
        data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      );
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const contrastCanvas = (source, factor = 1.45) => {
    const canvas = grayscaleCanvas(source);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.max(
        0,
        Math.min(255, Math.round((data[i] - 128) * factor + 128))
      );
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const thresholdCanvas = (source, threshold = 145) => {
    const canvas = grayscaleCanvas(source);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] >= threshold ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const getImageDataFromCanvas = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const tryQrDecode = (canvas) => {
    try {
      const imageData = getImageDataFromCanvas(canvas);
      const qr = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      const text = normalizeText(qr?.data);
      if (!text) return null;

      return {
        text,
        format: "qr_code",
        engine: "jsqr",
        type: "qr",
      };
    } catch {
      return null;
    }
  };

  const extractQuaggaErrorScore = (res) => {
    try {
      const errs = res?.codeResult?.decodedCodes
        ?.map((x) => x?.error)
        ?.filter((x) => typeof x === "number" && Number.isFinite(x));

      if (!errs?.length) return null;
      return errs.reduce((a, b) => a + b, 0) / errs.length;
    } catch {
      return null;
    }
  };

  const calcEAN13Checksum = (digits) => {
    const nums = digits.split("").map(Number);
    const body = nums.slice(0, 12);
    const sum = body.reduce((acc, n, idx) => {
      return acc + n * (idx % 2 === 0 ? 1 : 3);
    }, 0);
    return (10 - (sum % 10)) % 10;
  };

  const calcEAN8Checksum = (digits) => {
    const nums = digits.split("").map(Number);
    const body = nums.slice(0, 7);
    const sum = body.reduce((acc, n, idx) => {
      return acc + n * (idx % 2 === 0 ? 3 : 1);
    }, 0);
    return (10 - (sum % 10)) % 10;
  };

  const isValidBarcodeByFormat = (text, format) => {
    const value = normalizeText(text);
    const fmt = String(format || "").toLowerCase();

    if (!value) return false;

    if (fmt.includes("ean_13") || fmt === "ean") {
      return (
        /^\d{13}$/.test(value) &&
        calcEAN13Checksum(value) === Number(value[12])
      );
    }

    if (fmt.includes("ean_8")) {
      return (
        /^\d{8}$/.test(value) && calcEAN8Checksum(value) === Number(value[7])
      );
    }

    if (fmt.includes("upc")) {
      return /^\d{11,12}$/.test(value);
    }

    if (fmt.includes("i2of5")) {
      return /^\d{6,}$/.test(value);
    }

    if (fmt.includes("code_39")) {
      return /^[0-9A-Z\-\.\ \$\/\+\%]+$/.test(value) && value.length >= 3;
    }

    if (fmt.includes("codabar")) {
      return /^[0-9\-\$\:\.\+\/A-D]+$/i.test(value) && value.length >= 4;
    }

    if (fmt.includes("code_128")) {
      return value.length >= 4;
    }

    return value.length >= 3;
  };

  const tryBarcodeDecode = async (canvas, { locate = true } = {}) => {
    try {
      const Quagga = await ensureQuagga();

      const res = await new Promise((resolve) => {
        Quagga.decodeSingle(
          {
            src: canvas.toDataURL("image/png"),
            numOfWorkers: 0,
            locate,
            decoder: {
              readers: QUAGGA_READERS,
              multiple: false,
            },
          },
          (value) => resolve(value || null)
        );
      });

      const text = normalizeText(res?.codeResult?.code);
      if (!text) return null;

      const format = res?.codeResult?.format || "";
      const errorScore = extractQuaggaErrorScore(res);

      return {
        text,
        format,
        errorScore,
        engine: "quagga2",
        type: "barcode",
      };
    } catch {
      return null;
    }
  };

  const buildQrVariants = (
    baseCanvas,
    { includeRotations = false, liveMode = false } = {}
  ) => {
    const variants = [];
    const add = (canvas) => {
      if (canvas) variants.push(canvas);
    };

    if (liveMode) {
      const square = cropCanvasCenter(baseCanvas, 0.78, 0.78);
      add(square);
      add(scaleCanvas(square, 1.4));
      add(contrastCanvas(square, 1.25));
      add(baseCanvas);
      return variants;
    }

    add(baseCanvas);
    add(scaleCanvas(baseCanvas, 1.5));
    add(scaleCanvas(baseCanvas, 2));
    add(contrastCanvas(baseCanvas, 1.25));
    add(thresholdCanvas(baseCanvas, 145));

    const square = cropCanvasCenter(baseCanvas, 0.78, 0.78);
    add(square);
    add(scaleCanvas(square, 1.8));
    add(contrastCanvas(square, 1.3));
    add(thresholdCanvas(square, 145));

    if (includeRotations) {
      [90, -90, 180].forEach((deg) => {
        const rotated = rotateCanvas(baseCanvas, deg);
        add(rotated);
        add(scaleCanvas(rotated, 1.5));
      });
    }

    return variants;
  };

  const buildBarcodeVariants = (
    baseCanvas,
    { includeRotations = false, liveMode = false } = {}
  ) => {
    const variants = [];
    const add = (canvas) => {
      if (canvas) variants.push(canvas);
    };

    if (liveMode) {
      const wide = cropCanvasCenter(baseCanvas, 0.92, 0.42);
      add(wide);
      add(scaleCanvas(wide, 1.5));
      add(contrastCanvas(wide, 1.35));
      add(baseCanvas);
      return variants;
    }

    add(baseCanvas);
    add(scaleCanvas(baseCanvas, 1.5));
    add(scaleCanvas(baseCanvas, 2));
    add(contrastCanvas(baseCanvas, 1.35));
    add(thresholdCanvas(baseCanvas, 145));

    const wide = cropCanvasCenter(baseCanvas, 0.94, 0.42);
    add(wide);
    add(scaleCanvas(wide, 1.8));
    add(contrastCanvas(wide, 1.4));
    add(thresholdCanvas(wide, 145));

    if (includeRotations) {
      [90, -90, 180].forEach((deg) => {
        const rotated = rotateCanvas(baseCanvas, deg);
        add(rotated);
        add(scaleCanvas(rotated, 1.6));
        add(contrastCanvas(rotated, 1.35));
      });
    }

    return variants;
  };

  const pickQrConsensus = (candidates, requiredMatches = 2) => {
    if (!candidates.length) return null;

    const grouped = new Map();

    candidates.forEach((item) => {
      const key = item.text;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    const ranked = [...grouped.entries()]
      .map(([text, items]) => ({
        text,
        items,
        count: items.length,
        best: items[0],
      }))
      .sort((a, b) => b.count - a.count);

    const top = ranked[0];
    if (!top) return null;

    if (
      top.count >= requiredMatches ||
      (requiredMatches === 1 && top.count >= 1)
    ) {
      return {
        ...top.best,
        confidence: `consensus:${top.count}`,
      };
    }

    return null;
  };

  const pickBarcodeConsensus = (candidates, requiredMatches = 2) => {
    if (!candidates.length) return null;

    const grouped = new Map();

    candidates.forEach((item) => {
      const key = `${item.text}__${item.format}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    const ranked = [...grouped.entries()]
      .map(([key, items]) => {
        const bestError = items
          .map((x) => x.errorScore)
          .filter((x) => typeof x === "number")
          .sort((a, b) => a - b)[0];

        const best = [...items].sort((a, b) => {
          const ea = typeof a.errorScore === "number" ? a.errorScore : 999;
          const eb = typeof b.errorScore === "number" ? b.errorScore : 999;
          return ea - eb;
        })[0];

        return {
          key,
          items,
          count: items.length,
          bestError: typeof bestError === "number" ? bestError : 999,
          best,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.bestError - b.bestError;
      });

    const top = ranked[0];
    if (!top) return null;

    if (top.count >= requiredMatches) {
      return {
        ...top.best,
        confidence: `consensus:${top.count}`,
      };
    }

    if (top.count === 1 && top.bestError <= 0.12) {
      return {
        ...top.best,
        confidence: "single-low-error",
      };
    }

    return null;
  };

  const decodeQrConsensus = async (
    baseCanvas,
    { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
  ) => {
    const variants = buildQrVariants(baseCanvas, {
      includeRotations,
      liveMode,
    });
    const hits = [];

    for (const canvas of variants) {
      const qr = tryQrDecode(canvas);
      if (qr?.text) {
        hits.push(qr);
      }
    }

    return pickQrConsensus(hits, requiredMatches);
  };

  const decodeBarcodeConsensus = async (
    baseCanvas,
    { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
  ) => {
    const variants = buildBarcodeVariants(baseCanvas, {
      includeRotations,
      liveMode,
    });
    const hits = [];

    for (const canvas of variants) {
      const located = await tryBarcodeDecode(canvas, { locate: true });
      if (
        located?.text &&
        isValidBarcodeByFormat(located.text, located.format) &&
        (typeof located.errorScore !== "number" || located.errorScore <= 0.25)
      ) {
        hits.push(located);
      }

      const nonLocated = await tryBarcodeDecode(canvas, { locate: false });
      if (
        nonLocated?.text &&
        isValidBarcodeByFormat(nonLocated.text, nonLocated.format) &&
        (typeof nonLocated.errorScore !== "number" ||
          nonLocated.errorScore <= 0.25)
      ) {
        hits.push(nonLocated);
      }
    }

    return pickBarcodeConsensus(hits, requiredMatches);
  };

  const decodeCanvasHybrid = async (
    baseCanvas,
    { includeRotations = false, liveMode = false, requiredMatches = 2 } = {}
  ) => {
    const qrResult = await decodeQrConsensus(baseCanvas, {
      includeRotations,
      liveMode,
      requiredMatches: liveMode ? 1 : requiredMatches,
    });

    if (qrResult?.text) return qrResult;

    const barcodeResult = await decodeBarcodeConsensus(baseCanvas, {
      includeRotations,
      liveMode,
      requiredMatches,
    });

    if (barcodeResult?.text) return barcodeResult;

    return null;
  };

  const fileToCanvas = async (file) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const waitForPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

  const handleCloseModal = useCallback(() => {
    stopScanningLoop();
    stopCamera();
    setIsProcessingImage(false);
    setProcessingLabel("");
    onClose?.();
  }, [onClose]);

  const handlePauseResume = () => {
    if (isProcessingImage) return;
    setStatus((prev) => (prev === "paused" ? "scanning" : "paused"));
  };

  const handleReset = () => {
    setResult("");
    setErrorText("");
    setLastScanned("");
    setCapturedPreview("");
    setFolderScanSummary("");
    setProcessingLabel("");
    setIsProcessingImage(false);
    setDetectedType("");
    setDetectedEngine("");
    lastScanRef.current = "";
    setStatus("scanning");
  };

  const handleUseResult = () => {
    if (!result) return;
    if (typeof onScan === "function") {
      onScan(result, {
        source: "manual-use-result",
        type: detectedType,
        engine: detectedEngine,
      });
    }
    handleCloseModal();
  };

  const handleCaptureAndRead = async () => {
    if (isProcessingImage) return;

    try {
      setErrorText("");
      setFolderScanSummary("");
      setResult("");
      setDetectedType("");
      setDetectedEngine("");

      setProcessingLabel("Processing capture...");
      setIsProcessingImage(true);

      await waitForPaint();

      const frameCanvas = captureVideoFrame(videoRef.current);
      if (!frameCanvas) {
        throw new Error("Camera frame is not ready yet.");
      }

      setCapturedPreview(frameCanvas.toDataURL("image/png"));
      setProcessingLabel("Decoding captured image...");

      const decoded = await decodeCanvasHybrid(frameCanvas, {
        includeRotations: true,
        liveMode: false,
        requiredMatches: 2,
      });

      if (decoded?.text) {
        handleDetected(decoded.text, {
          source: "camera-capture",
          format: decoded.format || "",
          engine: decoded.engine || "",
          type: decoded.type || "",
          confidence: decoded.confidence || "",
        });
      } else {
        setErrorText(
          "No trustworthy QR code or barcode value found in captured image."
        );
      }
    } catch (err) {
      setErrorText(String(err?.message || err || "Failed to capture image."));
    } finally {
      setIsProcessingImage(false);
      setProcessingLabel("");
    }
  };

  const handlePickFileClick = () => {
    fileInputRef.current?.click();
  };

  const handlePickFolderClick = () => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
    folderInputRef.current.click();
  };

  const handleFileSelection = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    try {
      setErrorText("");
      setFolderScanSummary("");
      setProcessingLabel("Reading image file...");
      setIsProcessingImage(true);

      const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
      if (!imageFiles.length) {
        throw new Error("Please select an image file.");
      }

      const file = imageFiles[0];
      const preview = await fileToDataUrl(file);
      setCapturedPreview(preview);

      const canvas = await fileToCanvas(file);
      const decoded = await decodeCanvasHybrid(canvas, {
        includeRotations: true,
        liveMode: false,
        requiredMatches: 2,
      });

      if (decoded?.text) {
        handleDetected(decoded.text, {
          source: "file",
          fileName: file.name,
          format: decoded.format || "",
          engine: decoded.engine || "",
          type: decoded.type || "",
          confidence: decoded.confidence || "",
        });
      } else {
        setErrorText(
          `No trustworthy QR code or barcode value found in "${file.name}".`
        );
      }
    } catch (err) {
      setErrorText(String(err?.message || err || "Failed to read image file."));
    } finally {
      setIsProcessingImage(false);
      setProcessingLabel("");
    }
  };

  const handleFolderSelection = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    try {
      setErrorText("");
      setFolderScanSummary("");
      setProcessingLabel("Scanning folder images...");
      setIsProcessingImage(true);

      const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
      if (!imageFiles.length) {
        throw new Error("Selected folder contains no image files.");
      }

      const allHits = [];
      let firstPreview = "";

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setProcessingLabel(
          `Scanning folder images... (${i + 1}/${imageFiles.length})`
        );

        try {
          const canvas = await fileToCanvas(file);
          const decoded = await decodeCanvasHybrid(canvas, {
            includeRotations: true,
            liveMode: false,
            requiredMatches: 2,
          });

          if (decoded?.text) {
            allHits.push({
              fileName: file.name,
              text: decoded.text,
              format: decoded.format || "",
              engine: decoded.engine || "",
              type: decoded.type || "",
              confidence: decoded.confidence || "",
            });

            if (!firstPreview) {
              firstPreview = await fileToDataUrl(file);
            }
          }
        } catch {
          // continue scanning next file
        }
      }

      if (allHits.length) {
        setCapturedPreview(firstPreview || "");
        handleDetected(allHits[0].text, {
          source: "folder",
          fileName: allHits[0].fileName,
          format: allHits[0].format || "",
          engine: allHits[0].engine || "",
          type: allHits[0].type || "",
          confidence: allHits[0].confidence || "",
          hits: allHits,
          summary: `${allHits.length} trustworthy code(s) found out of ${imageFiles.length} image file(s). Showing first result from "${allHits[0].fileName}".`,
        });
      } else {
        setErrorText(
          `No trustworthy QR code or barcode value found in ${imageFiles.length} image file(s).`
        );
      }
    } catch (err) {
      setErrorText(
        String(err?.message || err || "Failed to scan selected folder.")
      );
    } finally {
      setIsProcessingImage(false);
      setProcessingLabel("");
    }
  };

  const showBottomPanel = !!(
    result ||
    errorText ||
    processingLabel ||
    folderScanSummary
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCloseModal}
      >
        <motion.div
          className="relative h-[100dvh] w-full bg-black sm:h-[88vh] sm:max-h-[860px] sm:w-[min(92vw,760px)] sm:rounded-[34px] sm:border sm:border-white/10 sm:bg-black sm:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelection}
          />

          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFolderSelection}
          />

          <div className="absolute inset-0 overflow-hidden sm:rounded-[34px]">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70 sm:from-black/42 sm:via-black/8 sm:to-black/68" />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 -translate-y-10 sm:-translate-y-8">
            <div className="relative h-[48vw] w-[48vw] min-h-[205px] min-w-[205px] max-h-[280px] max-w-[280px] rounded-[28px] border border-white/15 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.24)] sm:h-[310px] sm:w-[310px]">
              {isProcessingImage && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-black/28 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <div className="text-center text-xs font-medium text-white/90">
                      {processingLabel || "Processing image..."}
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-[28px] border-l-4 border-t-4 border-white" />
              <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-[28px] border-r-4 border-t-4 border-white" />
              <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-[28px] border-b-4 border-l-4 border-white" />
              <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-[28px] border-b-4 border-r-4 border-white" />

              {status === "scanning" && !isProcessingImage && (
                <motion.div
                  className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]"
                  animate={{ y: [0, 210, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-5">
            <div className="mx-auto flex w-full items-start justify-between">
              <div className="max-w-[78%] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <ScanLine size={16} className="text-white/85" />
                  <h2 className="truncate text-sm font-semibold sm:text-base">
                    {title}
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-white/70 sm:text-xs">
                  Powered by NAYSA
                </p>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleCloseModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-xl transition hover:bg-white/12 sm:border-white/15 sm:bg-white/10 sm:hover:bg-white/15"
                aria-label="Close scanner"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 top-[88px] z-10 px-4 sm:px-5">
            <div className="mx-auto flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-[11px] text-white/88 backdrop-blur-xl sm:bg-black/30">
                {isProcessingImage
                  ? "Processing image..."
                  : status === "paused"
                  ? "Camera paused"
                  : status === "success"
                  ? "Code detected"
                  : cameraReady
                  ? "Scanning..."
                  : "Preparing camera..."}
              </div>

              {(detectedType || detectedEngine) && (
                <div className="flex flex-wrap gap-2">
                  {detectedType === "qr" && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-blue-300/20 bg-blue-400/12 px-3 py-1.5 text-[11px] text-blue-100 backdrop-blur-xl sm:bg-blue-400/15">
                      <QrCode size={12} />
                      QR
                    </div>
                  )}

                  {detectedType === "barcode" && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-violet-300/20 bg-violet-400/12 px-3 py-1.5 text-[11px] text-violet-100 backdrop-blur-xl sm:bg-violet-400/15">
                      <Barcode size={12} />
                      Barcode
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {capturedPreview && (
            <div className="absolute right-4 top-[138px] z-10 sm:right-5 sm:top-[145px]">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/8 shadow-xl backdrop-blur-xl sm:border-white/15 sm:bg-white/10">
                <img
                  src={capturedPreview}
                  alt="Captured preview"
                  className="h-14 w-14 object-cover sm:h-20 sm:w-20"
                />
              </div>
            </div>
          )}

          {showBottomPanel && (
            <div className="absolute inset-x-0 bottom-[208px] z-10 px-3 sm:bottom-[108px] sm:px-5">
              <div className="mx-auto">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-white shadow-2xl backdrop-blur-2xl sm:rounded-[24px] sm:bg-black/35 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className={result ? "text-emerald-300" : "text-white/40"}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                      Detected value
                    </span>
                  </div>

                  {!!result && (
                    <div className="max-h-[60px] overflow-y-auto break-all text-[13px] font-medium text-white sm:max-h-[88px] sm:text-base">
                      {result}
                    </div>
                  )}

                  {!!processingLabel && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/8">
                      <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/85">
                        <Loader2 size={14} className="animate-spin" />
                        <span>{processingLabel}</span>
                        <span className="ml-auto flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" />
                        </span>
                      </div>

                      <motion.div
                        className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                  )}

                  {!!folderScanSummary && (
                    <div className="mt-2 rounded-2xl border border-blue-300/15 bg-blue-400/10 px-3 py-2 text-[12px] text-blue-100">
                      {folderScanSummary}
                    </div>
                  )}

                  {!!errorText && (
                    <div className="mt-2 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100">
                      {errorText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 sm:px-5">
            <div className="mx-auto">
              <div className="rounded-[28px] border border-white/10 bg-black/22 p-3 shadow-2xl backdrop-blur-2xl sm:bg-black/35">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <GlassIconButton
                    label={status === "paused" ? "Resume" : "Pause"}
                    icon={
                      status === "paused" ? (
                        <Camera size={18} />
                      ) : (
                        <CameraOff size={18} />
                      )
                    }
                    onClick={handlePauseResume}
                    disabled={isProcessingImage}
                    active={status === "paused"}
                  />

                  <GlassIconButton
                    label="Capture"
                    icon={<CameraIcon size={18} />}
                    onClick={handleCaptureAndRead}
                    disabled={isProcessingImage}
                  />

                  <GlassIconButton
                    label="Image"
                    icon={<ImagePlus size={18} />}
                    onClick={handlePickFileClick}
                    disabled={isProcessingImage}
                  />

                  <GlassIconButton
                    label="Folder"
                    icon={<FolderOpen size={18} />}
                    onClick={handlePickFolderClick}
                    disabled={isProcessingImage}
                  />

                  <GlassIconButton
                    label="Reset"
                    icon={<RotateCcw size={18} />}
                    onClick={handleReset}
                  />

                  <GlassIconButton
                    label="Use"
                    icon={<CheckCircle2 size={18} />}
                    onClick={handleUseResult}
                    disabled={!result}
                    active={!!result}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeQrReaderModal;