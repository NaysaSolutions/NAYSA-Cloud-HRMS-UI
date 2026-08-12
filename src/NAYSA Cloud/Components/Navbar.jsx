import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import ReactDOM from "react-dom";
import Webcam from "react-webcam";
import Cropper from "react-easy-crop";
import {
  Menu,
  LogOut,
  Fingerprint,
  KeyRound,
  ChevronDown,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  X,
  RotateCcw,
  ImagePlus,
  CircleHelp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FiSun, FiMoon } from "react-icons/fi";
import Swal from "sweetalert2";
import {
  useSwalDeleteConfirm,
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "../Global/behavior";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import apiClient, { ensureCsrf } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { Link, useNavigate } from "react-router-dom";

const DEFAULT_AVATAR = "/3135715.png";
const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "naysa-theme-change";

const getStoredTheme = () =>
  localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";

const applyTheme = (theme) => {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  return isDark;
};

const broadcastThemeChange = (theme) => {
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme },
    })
  );
};

const Navbar = ({
  onMenuClick,
  onLogout,
  onBiometricClick,
  onUpdateClick,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [profileImageSrc, setProfileImageSrc] = useState(DEFAULT_AVATAR);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const { user, setUser } = useAuth();

  const apiBaseUrl = (apiClient?.defaults?.baseURL || "").replace(/\/$/, "");
  const companyDb =
    apiClient?.defaults?.headers?.common?.["X-Company-DB"] || "";

  const buildProfileImageUrl = useCallback(
    (userCode, bust = true) => {
      if (!userCode) return DEFAULT_AVATAR;

      const params = new URLSearchParams();

      if (companyDb) {
        params.set("company", companyDb);
      }

      if (bust) {
        params.set("t", Date.now().toString());
      }

      return `${apiBaseUrl}/user/profile-image/${encodeURIComponent(
        userCode
      )}?${params.toString()}`;
    },
    [apiBaseUrl, companyDb]
  );

  const handleProfileImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  const refreshProfileImage = useCallback(() => {
    if (!user?.USER_CODE) {
      setProfileImageSrc(DEFAULT_AVATAR);
      return;
    }

    setProfileImageSrc(buildProfileImageUrl(user.USER_CODE, true));
  }, [user?.USER_CODE, buildProfileImageUrl]);

  useEffect(() => {
    refreshProfileImage();
  }, [refreshProfileImage]);

  useEffect(() => {
    setIsDark(applyTheme(getStoredTheme()));

    const handleThemeChange = (event) => {
      if (event.type === "storage" && event.key !== THEME_STORAGE_KEY) return;

      const nextTheme =
        event.type === "storage"
          ? event.newValue
          : event.detail?.theme;

      if (nextTheme === "dark" || nextTheme === "light") {
        setIsDark(applyTheme(nextTheme));
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const styleId = "global-swal-zindex-fix";
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = `
        .swal2-container {
          z-index: 3000000 !important;
        }
      `;
      document.head.appendChild(styleTag);
    }

    return () => {};
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = isDark ? "light" : "dark";
    setIsDark(applyTheme(nextTheme));
    broadcastThemeChange(nextTheme);
  };

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const margin = isMobile ? 8 : 12;

    if (isMobile) {
      const mobileWidth = Math.min(window.innerWidth - 16, 360);

      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + margin,
        left: Math.max((window.innerWidth - mobileWidth) / 2, 8),
        width: mobileWidth,
        zIndex: 999999,
      });

      return;
    }

    const dropdownWidth = 320;
    let left = rect.right - dropdownWidth;

    if (left < 8) left = 8;
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = window.innerWidth - dropdownWidth - 8;
    }

    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + margin,
      left,
      width: dropdownWidth,
      zIndex: 999999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isDropdownOpen) return;

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isDropdownOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedTrigger =
        triggerRef.current && triggerRef.current.contains(event.target);
      const clickedDropdown =
        dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!clickedTrigger && !clickedDropdown) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const biometricRow = {
    pathUrl: "/security-settings/biometric",
  };

  const handleBiometricAction = useCallback(
    (row) => {
      const isAbsolute = row.pathUrl.startsWith("http");

      if (isAbsolute) {
        window.location.href = row.pathUrl;
      } else {
        navigate(row.pathUrl);
      }

      onBiometricClick?.(row);
    },
    [navigate, onBiometricClick]
  );

  const handleLogoutClick = async () => {
    setIsDropdownOpen(false);

    try {
      const result = await useSwalDeleteConfirm(
        "Confirm Logout",
        "Are you sure you want to logout?",
        "Yes, logout!"
      );

      if (result?.isConfirmed && onLogout) {
        await onLogout();
      }
    } catch (error) {
      console.error("Logout confirmation failed:", error);
    }
  };

  const encodePassword = (value) => {
    try {
      return btoa(unescape(encodeURIComponent(value)));
    } catch (error) {
      return btoa(value);
    }
  };

  const promptInitializePassword = async () => {
    const result = await Swal.fire({
      title: "Confirm Initialize",
      text: "Enter your password to authorize the initialization.",
      icon: "warning",
      input: "password",
      inputPlaceholder: "Password",
      inputAttributes: {
        autocapitalize: "off",
        autocorrect: "off",
        autocomplete: "new-password",
      },
      showCancelButton: true,
      confirmButtonText: "Initialize",
      cancelButtonText: "Cancel",
      focusConfirm: false,
      reverseButtons: true,
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage("Password is required to proceed.");
          return null;
        }
        return value.trim();
      },
    });

    return result.isConfirmed ? result.value : null;
  };

  const handleInitializeClick = async () => {
  if (isInitializing) return;

  const password = await promptInitializePassword();
  if (!password) return;

  // Validate password first by silent login
  try {
    await ensureCsrf();

    await apiClient.post(
      "/login",
      {
        USER_CODE: user?.USER_CODE,
        PASSWORD: password,
      },
      {
        headers: {
          "X-Skip-Logout-Broadcast": "1",
        },
      }
    );
  } catch (err) {
    console.error("Password verification failed:", err);

    if (err?.response?.status === 401 || err?.response?.status === 403) {
      useSwalErrorAlert(
        "Incorrect Password",
        err?.response?.data?.message || "The password you entered is incorrect."
      );
    } else {
      useSwalErrorAlert(
        "Verification Error",
        err?.response?.data?.message ||
          err?.message ||
          "Failed to verify password."
      );
    }

    return;
  }

  // If password is valid, proceed to initialize
  setIsInitializing(true);

  try {
    const response = await apiClient.post("/initialize", {
      mode: "Initialize",
      params: {
        user_code: user?.USER_CODE,
      },
    });

    const apiMessage = response?.data?.message;
    const apiSuccess =
      typeof response?.data?.success !== "undefined"
        ? !!response.data.success
        : true;

    if (!apiSuccess) {
      useSwalErrorAlert(
        "Initialization Failed",
        apiMessage || "Initialization failed."
      );
    } else {
      useSwalSuccessAlert(
        "Initialized",
        apiMessage || "Initialize completed successfully."
      );
    }
  } catch (error) {
    console.error("API initialize failed:", error);

    useSwalErrorAlert(
      "Initialization Error",
      error?.response?.data?.message ||
        error?.message ||
        "Failed to execute API initialize."
    );
  } finally {
    setIsInitializing(false);
  }
};

  const resetPhotoEditor = () => {
    setCapturedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setBrightness(100);
    setCroppedAreaPixels(null);
  };

  const closePhotoModal = () => {
    resetPhotoEditor();
    setIsPhotoModalOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const dataURLToFile = (dataUrl, fileName = "profile.jpg") => {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], fileName, { type: mime });
  };

  const uploadProfileImageFile = async (file) => {
    if (!file || !user?.USER_CODE) return;

    try {
      setIsUploadingPhoto(true);

      const formData = new FormData();
      formData.append("USER_CODE", user.USER_CODE);
      formData.append("PROFILE_IMAGE", file);

      await apiClient.post("/user/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      refreshProfileImage();

      if (typeof setUser === "function") {
        setUser((prev) => ({
          ...prev,
          PROFILE_IMG_UPDATED: Date.now(),
        }));
      }

      closePhotoModal();
    } catch (error) {
      console.error("FULL ERROR:", error);
      console.error("RESPONSE DATA:", error?.response?.data);

      alert(
        error?.response?.data?.message ||
          JSON.stringify(error?.response?.data) ||
          "Upload failed"
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      resetPhotoEditor();
      setCapturedImage(reader.result);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    resetPhotoEditor();
    setCapturedImage(imageSrc);
  };

  const handleRetake = () => {
    resetPhotoEditor();
  };

  const createCroppedImageFile = async (
    imageSrc,
    cropPixels,
    brightnessValue,
    fileName = "profile.jpg"
  ) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = Math.round(cropPixels.width);
    canvas.height = Math.round(cropPixels.height);

    ctx.filter = `brightness(${brightnessValue}%)`;
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to create cropped image."));
            return;
          }

          resolve(new File([blob], fileName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    });
  };

  const handleSaveCapturedPhoto = async () => {
    if (!capturedImage || !croppedAreaPixels) return;

    const file = await createCroppedImageFile(
      capturedImage,
      croppedAreaPixels,
      brightness,
      `profile_${user?.USER_CODE || "user"}.jpg`
    );

    await uploadProfileImageFile(file);
  };

  const handleDeletePhoto = async () => {
    if (!user?.USER_CODE) return;

    try {
      const result = await useSwalDeleteConfirm(
        "Remove Profile Photo",
        "Are you sure you want to remove your profile photo?",
        "Yes, remove it!"
      );

      if (!result?.isConfirmed) return;

      setIsUploadingPhoto(true);

      await apiClient.delete(
        `/user/profile-image/${encodeURIComponent(user.USER_CODE)}`
      );

      setProfileImageSrc(DEFAULT_AVATAR);

      if (typeof setUser === "function") {
        setUser((prev) => ({
          ...prev,
          PROFILE_IMG_UPDATED: Date.now(),
        }));
      }

      closePhotoModal();
    } catch (error) {
      console.error("Failed to delete profile image:", error);
      alert(error?.response?.data?.message || "Failed to remove profile image.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const dropdownItemClass =
    "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150";

  const dropdownIconWrapClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors dark:bg-slate-700 dark:text-slate-200";

  const dropdownContent = (
    <AnimatePresence>
      {isDropdownOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          style={dropdownStyle}
          className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-gray-800 ${
            isMobileView
              ? "max-h-[calc(100vh-90px)] rounded-[20px] overflow-y-auto"
              : "rounded-[24px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsDropdownOpen(false)}
            className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className={`text-center ${
              isMobileView ? "px-4 pb-4 pt-4" : "px-5 pb-4 pt-5"
            }`}
          >
            <div
              className={`group relative mx-auto mb-3 ${
                isMobileView ? "h-16 w-16" : "h-20 w-20"
              }`}
            >
              <div
                className={`overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md transition-all duration-200 ease-out group-hover:scale-125 group-hover:border-blue-200 group-hover:shadow-[0_0_0_4px_rgba(59,130,246,0.18),0_12px_24px_rgba(59,130,246,0.18)] dark:border-gray-800 dark:bg-slate-700 dark:group-hover:border-blue-400 ${
                  isMobileView ? "h-16 w-16" : "h-20 w-20"
                }`}
              >
                <img
                  src={profileImageSrc}
                  alt="User"
                  className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-110"
                  onError={handleProfileImageError}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsPhotoModalOpen(true);
                }}
                className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-white bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:border-gray-800 ${
                  isMobileView ? "h-7 w-7" : "h-8 w-8"
                }`}
                title="Change profile photo"
              >
                <Camera className={isMobileView ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </button>
            </div>

            <div
              className={`truncate font-semibold text-slate-800 dark:text-white ${
                isMobileView ? "text-sm" : "text-[15px]"
              }`}
            >
              {user?.USER_NAME || "User"}
            </div>

            <div
              className={`mt-1 break-all text-slate-500 dark:text-slate-400 ${
                isMobileView ? "text-xs" : "text-sm"
              }`}
            >
              {user?.EMAIL_ADD || "No email available"}
            </div>

            <div
              className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1 font-medium text-slate-600 dark:text-slate-300 ${
                isMobileView ? "text-[10px]" : "text-[11px]"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {user?.USER_CODE || "User Account"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsPhotoModalOpen(true);
              }}
              className={`mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 ${
                isMobileView ? "px-3 py-2 text-[11px]" : "px-3 py-2 text-xs"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Change Photo
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          <div className="p-2">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                handleBiometricAction(biometricRow);
              }}
              className={`${dropdownItemClass} hover:bg-slate-100 dark:hover:bg-slate-700`}
            >
              <div className={dropdownIconWrapClass}>
                <Fingerprint className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Biometrics Settings
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Manage biometric login
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onUpdateClick?.();
              }}
              className={`${dropdownItemClass} hover:bg-slate-100 dark:hover:bg-slate-700`}
            >
              <div className={dropdownIconWrapClass}>
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Update Account
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Edit profile/password
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                navigate("/help-support");
              }}
              className={`${dropdownItemClass} hover:bg-blue-50 dark:hover:bg-blue-500/10`}
            >
              <div className={`${dropdownIconWrapClass} group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-500/20 dark:group-hover:text-blue-300`}>
                <CircleHelp className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Help &amp; Support Center
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  User manuals, videos, and support
                </div>
              </div>

            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          <div className="p-2">
            <button
              onClick={handleLogoutClick}
              className={`${dropdownItemClass} hover:bg-red-50 dark:hover:bg-red-500/10`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                  Logout
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Sign out
                </div>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const photoModalContent = (
    <AnimatePresence>
      {isPhotoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ isolation: "isolate" }}
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/20 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-medium tracking-tight text-slate-800 dark:text-white">
                  Profile Photo
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Capture or upload, then crop and adjust before saving
                </p>
              </div>

              <button
                type="button"
                onClick={closePhotoModal}
                disabled={isUploadingPhoto}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 rounded-[24px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 p-2 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
                <div className="relative h-64 w-full overflow-hidden rounded-[20px] bg-black">
                  {capturedImage ? (
                    <Cropper
                      image={capturedImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                      style={{
                        containerStyle: {
                          background: "#000",
                        },
                        mediaStyle: {
                          filter: `brightness(${brightness}%)`,
                        },
                      }}
                    />
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: "user",
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {!capturedImage && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-40 w-40 rounded-full border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]">
                          <div className="absolute -left-1 -top-1 h-5 w-5 rounded-tl-full border-l-4 border-t-4 border-white" />
                          <div className="absolute -right-1 -top-1 h-5 w-5 rounded-tr-full border-r-4 border-t-4 border-white" />
                          <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-full border-b-4 border-l-4 border-white" />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-br-full border-b-4 border-r-4 border-white" />
                        </div>
                      </div>

                      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        Center your face before capturing
                      </div>
                    </>
                  )}
                </div>
              </div>

              {capturedImage && (
                <div className="mb-4 space-y-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span>Zoom</span>
                      <span>{zoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      disabled={isUploadingPhoto}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span>Brightness</span>
                      <span>{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="1"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      disabled={isUploadingPhoto}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {!capturedImage ? (
                <>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      title="Upload photo"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCapture}
                      disabled={isUploadingPhoto}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(37,99,235,0.25)] ring-4 ring-blue-100 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:ring-blue-900/30"
                      title="Capture photo"
                    >
                      <div className="h-11 w-11 rounded-full border-[5px] border-blue-600 dark:border-blue-400" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      disabled={isUploadingPhoto}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-sm transition hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      title="Remove photo"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleCapture}
                      disabled={isUploadingPhoto}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={handleRetake}
                      disabled={isUploadingPhoto}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      title="Retake"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCapturedPhoto}
                      disabled={isUploadingPhoto}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] transition hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Save photo"
                    >
                      <Upload className="h-6 w-6" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      disabled={isUploadingPhoto}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-sm transition hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      title="Remove photo"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={handleSaveCapturedPhoto}
                      disabled={isUploadingPhoto}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingPhoto ? "Saving..." : "Save Edited Photo"}
                    </button>

                    <button
                      type="button"
                      onClick={handleRetake}
                      disabled={isUploadingPhoto}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retake Photo
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-[100] w-full border-b bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-12 w-full items-center justify-between px-4 text-sm dark:text-white sm:text-base">
          <div className="flex items-center space-x-2 font-extrabold text-blue-900 dark:text-gray-100">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onMenuClick}
              className="rounded-md p-1 hover:bg-blue-50 dark:hover:bg-gray-800"
            >
              <Menu />
            </motion.button>

            <Link 
              to="/" 
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <img
                src="/naysa_logo.png"
                className="h-[35px] w-[70px] object-contain"
                alt="Logo"
              />
              <span className="hidden md:inline">Financials</span>
            </Link>

          </div>

          <div className="flex-grow text-center">
            <span className="whitespace-nowrap text-xs font-bold uppercase tracking-tight text-blue-900 dark:text-white sm:text-lg">
              NAYSA-SOLUTIONS INC.
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleDarkMode}
              className="rounded-full bg-gray-100 p-1.5 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleInitializeClick}
              disabled={isInitializing}
              className="rounded-full bg-red-600 p-1.5 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-700 dark:text-white dark:hover:bg-red-600"
              title="Initialize Transactions"
            >
              <RotateCcw className={`h-4 w-4 ${isInitializing ? "animate-spin" : ""}`} />
            </motion.button>

            <div className="relative">
              <motion.button
                ref={triggerRef}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-full px-1 py-1 hover:bg-slate-100 dark:hover:bg-gray-800 sm:gap-2"
              >
                <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 hover:border-blue-500 dark:border-slate-700">
                  <img
                    src={profileImageSrc}
                    alt="User"
                    className="h-full w-full object-cover"
                    onError={handleProfileImageError}
                  />
                </div>

                <ChevronDown
                  className={`hidden h-4 w-4 text-slate-500 transition-transform sm:block ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {typeof document !== "undefined"
        ? ReactDOM.createPortal(dropdownContent, document.body)
        : null}

      {typeof document !== "undefined"
        ? ReactDOM.createPortal(photoModalContent, document.body)
        : null}
    </>
  );
};

export default Navbar;