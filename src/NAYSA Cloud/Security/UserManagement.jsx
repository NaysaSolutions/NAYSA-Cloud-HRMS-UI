import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPlus,
  faChevronDown,
  faFilePdf,
  faSave,
  faUndo,
  faUsers,
  faKey,
  faInfoCircle,
  faVideo,
  faLockOpen,
} from "@fortawesome/free-solid-svg-icons";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────────────────────
const USER_TYPE_MAP = {
  S: "System Administrator",
  R: "Regular",
  X: "Security Administrator",
  M: "Management",
};

const userTypeOptions = [
  { value: "S", label: "System Administrator" },
  { value: "R", label: "Regular" },
  { value: "X", label: "Security Administrator" },
  { value: "M", label: "Management" },
];

const API_BASE = "/user-management";

const getFirstValue = (object, keys, fallback = "") => {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const formatDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const UserManagement = () => {
  const docType = "UserManagement";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const documentTitle = reftables?.[docType] || "User Management";
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  // Main fields
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("");
  const [viewAmount, setViewAmount] = useState("N");
  const [emailAdd, setEmailAdd] = useState("");
  const [active, setActive] = useState("Yes");

  // Registration Information - read only
  const [registeredBy, setRegisteredBy] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const [showSpinner, setShowSpinner] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [maxLog, setMaxLog] = useState(0);

  const guideRef = useRef(null);
  const codeInputRef = useRef(null);
  const formRef = useRef(null);

  const currentUserCode =
    user?.USER_CODE || user?.userCode || user?.code || "SYSTEM";

  const rawCurrentUserType =
    user?.USER_TYPE || user?.userType || user?.user_type || "";

  const currentUserType = (() => {
    const value = String(rawCurrentUserType).trim().toUpperCase();
    if (value === "X" || value === "SECURITY ADMINISTRATOR") return "X";
    if (value === "S" || value === "SYSTEM ADMINISTRATOR") return "S";
    if (value === "M" || value === "MANAGEMENT") return "M";
    if (value === "R" || value === "REGULAR") return "R";
    return value;
  })();

  const activeLabel = (code) => {
    if (code === "Y") return "Yes";
    if (code === "P") return "Pending";
    if (code === "N") return "No";
    return "-";
  };

  // Load the current failed-login policy so a manually inactive user is not
  // mistaken for an account that was locked by failed login attempts.
  useEffect(() => {
    apiClient
      .get(`${API_BASE}/policy`)
      .then(({ data }) => {
        const policyMaxLog = Number(data?.data?.maxLog ?? 0);
        setMaxLog(Number.isFinite(policyMaxLog) ? policyMaxLog : 0);
      })
      .catch((error) => {
        console.warn("Unable to load user lock policy:", error);
        setMaxLog(0);
      });
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Load users
  // Uses the same endpoints/response structure as UpdateUser.jsx
  // ───────────────────────────────────────────────────────────────────────────
  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["user-management", activeTab],
    queryFn: async () => {
      const { data } = await apiClient.get(`${API_BASE}/load`, {
        params: {
          Status:
            activeTab === "active"
              ? "Active"
              : activeTab === "pending"
                ? "Pending"
                : "Inactive",
        },
      });

      let userData = [];

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        if (data.data[0]?.result) {
          try {
            userData = JSON.parse(data.data[0].result);
          } catch (error) {
            console.error("Error parsing user list:", error);
            userData = [];
          }
        }
      } else if (data?.result) {
        try {
          userData = JSON.parse(data.result);
        } catch (error) {
          console.error("Error parsing user list:", error);
          userData = [];
        }
      } else if (Array.isArray(data)) {
        userData = data;
      }

      if (!Array.isArray(userData)) return [];

      return userData
        .filter(
          (item) =>
            item &&
            (item.userCode ||
              item.userName ||
              item.userType ||
              item.emailAdd ||
              item.active ||
              item.viewCostamt)
        )
        .map((item) => ({
          ...item,
          // Keep the existing UpdateUser backend property, but expose it in
          // this screen as "View Amount".
          viewAmount: item.viewCostamt ?? item.viewAmount ?? "N",

          registeredBy: getFirstValue(item, [
            "registeredBy",
            "registered_by",
            "REGISTERED_BY",
            "regBy",
            "reg_by",
          ]),
          registeredDate: getFirstValue(item, [
            "registeredDate",
            "registered_date",
            "REGISTERED_DATE",
            "regDate",
            "reg_date",
          ]),
          updatedBy: getFirstValue(item, [
            "updatedBy",
            "updated_by",
            "UPDATED_BY",
            "updBy",
            "upd_by",
          ]),
          updatedDate: getFirstValue(item, [
            "updatedDate",
            "updated_date",
            "UPDATED_DATE",
            "updDate",
            "upd_date",
          ]),
        }));
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Save / Update
  // ───────────────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ payload }) => apiClient.post(`${API_BASE}/upsert`, payload),

    onSuccess: async (response, variables) => {
      const res = response?.data;
      const row =
        res?.data?.[0] ??
        res?.data?.data?.[0] ??
        res?.result?.[0] ??
        null;

      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg =
        row?.errormsg ||
        res?.errormsg ||
        res?.message ||
        "Failed to save user.";

      if (errorcount > 0) {
        await useSwalErrorAlert("", errormsg);
        return;
      }

      const isNewRecord = variables.isNewRecord;

      // Same behavior as UpdateUser.jsx: active users created by an admin
      // are immediately approved and receive their password email.
      if (isNewRecord && active === "Yes") {
        try {
          await apiClient.post(`${API_BASE}/approve`, {
            userCode: userId.trim(),
            mode: "admin_add",
            doneBy: currentUserCode,
          });
        } catch (error) {
          console.warn("Temporary password email failed:", error);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["user-management"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      if (isNewRecord) {
        await useSwalSuccessAlert(
          "Success!",
          "User created successfully. A temporary password has been sent to the user's email."
        );
      } else {
        await useSwalSuccessAlert("Success!", "User updated successfully.");
      }

      resetForm();
    },

    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Error saving user.";

      await useSwalErrorAlertAPI("", message);
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (targetUser) =>
      apiClient.post(`${API_BASE}/delete`, {
        userCode: targetUser.userCode,
        doneBy: currentUserCode,
      }),

    onSuccess: async (response) => {
      const raw = response?.data;
      const resultText =
        raw?.data?.[0]?.result ??
        raw?.result ??
        raw?.data?.result ??
        raw?.data?.message ??
        "";

      let parsed = null;
      try {
        parsed =
          typeof resultText === "string" ? JSON.parse(resultText) : resultText;
      } catch {
        parsed = raw;
      }

      const message =
        parsed?.message ||
        raw?.message ||
        raw?.data?.message ||
        "User delete operation completed.";

      await useSwalDeleteRecord("Success", message);
      await queryClient.invalidateQueries({ queryKey: ["user-management"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      resetForm();
    },

    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.details ||
        error?.message ||
        "Failed to delete user.";

      await useSwalErrorAlertAPI("Error", message);
    },
  });

  const saving = saveMutation.isPending || deleteMutation.isPending;
  const loading = usersLoading;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guideRef.current && !guideRef.current.contains(event.target)) {
        setOpenGuide(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving && isEditing) handleSaveUser();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    saving,
    isEditing,
    userId,
    userName,
    userType,
    viewAmount,
    emailAdd,
    active,
    selectedUser,
  ]);

  useEffect(() => {
    let timer;

    if (loading) {
      timer = setTimeout(() => setShowSpinner(true), 200);
    } else {
      setShowSpinner(false);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  const resetForm = () => {
    setUserId("");
    setUserName("");
    setUserType("");
    setViewAmount("N");
    setEmailAdd("");
    setActive("Yes");

    setRegisteredBy("");
    setRegisteredDate("");
    setUpdatedBy("");
    setUpdatedDate("");

    setSelectedUser(null);
    setIsEditing(false);
  };

  const handleCheckDuplicate = async () => {
    if (isEditing && selectedUser?.userCode === userId.trim()) return;
    if (!userId.trim()) return;

    try {
      const payload = {
        json_data: { userCode: userId.trim() },
        userCode: userId.trim(),
      };

      const { data } = await apiClient.post(`${API_BASE}/checkduplicate`, payload);
      const firstRow = data?.data?.[0] || {};
      const rawResult =
        firstRow?.result ?? Object.values(firstRow)[0] ?? data?.result ?? "";

      let parsed = {};
      try {
        parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      } catch {
        parsed = {};
      }

      if (String(parsed?.result) === "1") {
        await useSwalErrorAlert(
          "Duplicate",
          `User ID "${userId.trim()}" already exists.`
        );

        setUserId("");
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Duplicate check failed:", error);
    }
  };

  const handleSaveUser = async () => {
    const trimmedEmail = emailAdd.trim();

    if (trimmedEmail !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        await useSwalErrorAlert(
          "",
          "<b>Invalid Input</b><br/>Please enter a valid email address."
        );
        return;
      }
    }

    const payload = {
      json_data: {
        userCode: userId.trim(),
        userName: userName.trim(),
        userType: userType || "",

        // Existing backend field from UpdateUser.jsx
        viewCostamt: viewAmount || "N",

        emailAdd: trimmedEmail,
        active: active === "Yes" ? "Y" : active === "Pending" ? "P" : "N",
        doneBy: currentUserCode,
      },
    };

    saveMutation.mutate({
      payload,
      isNewRecord: !selectedUser,
    });
  };

  const handleDeleteUser = async (row = null) => {
    const targetUser = row || selectedUser;

    if (!targetUser?.userCode) {
      await useSwalErrorAlert("", "Please select a user to delete.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete this user?",
      `ID: ${targetUser.userCode} | Name: ${targetUser.userName || ""}`,
      "Yes, delete it"
    );

    if (!confirm?.isConfirmed) return;
    deleteMutation.mutate(targetUser);
  };

  const loadRegistrationInfo = (userData) => {
    setRegisteredBy(
      getFirstValue(userData, [
        "registeredBy",
        "registered_by",
        "REGISTERED_BY",
        "regBy",
        "reg_by",
      ])
    );

    setRegisteredDate(
      getFirstValue(userData, [
        "registeredDate",
        "registered_date",
        "REGISTERED_DATE",
        "regDate",
        "reg_date",
      ])
    );

    setUpdatedBy(
      getFirstValue(userData, [
        "updatedBy",
        "updated_by",
        "UPDATED_BY",
        "updBy",
        "upd_by",
      ])
    );

    setUpdatedDate(
      getFirstValue(userData, [
        "updatedDate",
        "updated_date",
        "UPDATED_DATE",
        "updDate",
        "upd_date",
      ])
    );
  };

  const handleEditUser = async (rowUser) => {
    if (!rowUser) return;

    let userData = rowUser;

    if (rowUser.active === "P") setActiveTab("pending");
    if (rowUser.active === "Y") setActiveTab("active");
    if (rowUser.active === "N") setActiveTab("inactive");

    // Fetch full user data so registration/audit fields can be displayed even
    // if /load only returns the summarized list.
    try {
      const { data } = await apiClient.get(`${API_BASE}/get`, {
        params: { userCode: rowUser.userCode },
      });

      let fullUserData = null;

      if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
        const parsed = JSON.parse(data.data[0].result);
        if (Array.isArray(parsed) && parsed.length > 0) fullUserData = parsed[0];
      } else if (data?.result) {
        const parsed = JSON.parse(data.result);
        if (Array.isArray(parsed) && parsed.length > 0) fullUserData = parsed[0];
      }

      if (fullUserData) userData = { ...rowUser, ...fullUserData };
    } catch (error) {
      console.error("Error fetching user details:", error);
    }

    setUserId(userData.userCode || "");
    setUserName(userData.userName || "");
    setUserType(userData.userType || "");
    setViewAmount(userData.viewCostamt ?? userData.viewAmount ?? "N");
    setEmailAdd(userData.emailAdd || "");
    setActive(
      userData.active === "Y"
        ? "Yes"
        : userData.active === "P"
          ? "Pending"
          : "No"
    );

    loadRegistrationInfo(userData);

    setSelectedUser(userData);
    setIsEditing(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const startNew = () => {
    resetForm();
    setIsEditing(true);

    setTimeout(() => {
      codeInputRef.current?.focus();
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleResetPassword = async () => {
    if (!selectedUser?.userCode) {
      await useSwalErrorAlert("", "Please select a user to reset password.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Reset Password",
      `Are you sure you want to reset the password for ${selectedUser.userName}?`,
      "Yes, reset it"
    );

    if (!confirm?.isConfirmed) return;

    try {
      const { data } = await apiClient.post(`${API_BASE}/request-password-reset`, {
        userCode: selectedUser.userCode,
      });

      if (data?.status === "success") {
        await useSwalSuccessAlert(
          "Success",
          "Password reset link has been emailed to the user."
        );
      } else {
        await useSwalErrorAlert(
          "",
          data?.message || "Failed to send the reset email."
        );
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Request failed.";
      await useSwalErrorAlertAPI("", message);
    }
  };

  const handleApproveAccount = async () => {
    if (!selectedUser?.userCode) {
      await useSwalErrorAlert("", "Please select a user to approve account.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Approve Account",
      `Are you sure you want to approve the account for ${selectedUser.userName}?`,
      "Yes, approve it"
    );

    if (!confirm?.isConfirmed) return;

    try {
      const { data } = await apiClient.post(`${API_BASE}/approve`, {
        userCode: selectedUser.userCode,
        mode: "release",
        doneBy: currentUserCode,
      });

      if (data?.status === "success") {
        await useSwalSuccessAlert(
          "Success",
          "Account approved. A password setup link has been sent."
        );

        setActiveTab("active");
        resetForm();
        await queryClient.invalidateQueries({ queryKey: ["user-management"] });
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        await refetchUsers();
      } else {
        await useSwalErrorAlert("", data?.message || "Approval failed.");
      }
    } catch (error) {
      await useSwalErrorAlertAPI(
        "",
        error?.response?.data?.message || error?.message || "Approval failed."
      );
    }
  };

  const handleReleaseAccount = async () => {
    if (!selectedUser?.userCode) {
      await useSwalErrorAlert("", "Please select a locked user account.");
      return;
    }

    const currentStat = Number(selectedUser.stat ?? 0);
    const isLocked =
      selectedUser.active === "N" &&
      maxLog > 0 &&
      currentStat >= maxLog;

    if (!isLocked) {
      await useSwalErrorAlert(
        "",
        "The selected account is inactive, but it is not locked by failed login attempts."
      );
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Release Locked Account",
      `Release the locked account for ${selectedUser.userName || selectedUser.userCode}?`,
      "Yes, release it"
    );

    if (!confirm?.isConfirmed) return;

    try {
      const { data } = await apiClient.post(`${API_BASE}/release-account`, {
        userCode: selectedUser.userCode,
        doneBy: currentUserCode,
      });

      if (data?.success === true || data?.status === "success") {
        await useSwalSuccessAlert(
          "Account Released",
          "The account is now active and its login lock has been cleared."
        );

        setActiveTab("active");
        resetForm();

        await queryClient.invalidateQueries({ queryKey: ["user-management"] });
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        await refetchUsers();
      } else {
        await useSwalErrorAlert(
          "",
          data?.message || "Failed to release the account."
        );
      }
    } catch (error) {
      await useSwalErrorAlertAPI(
        "",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to release the account."
      );
    }
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  const tableRows = useMemo(() => {
    return users
      .filter((item) =>
        activeTab === "active"
          ? item.active === "Y"
          : activeTab === "pending"
            ? item.active === "P"
            : item.active === "N"
      )
      .map((item) => ({
        ...item,
        userTypeDisplay: USER_TYPE_MAP[item.userType] ?? item.userType ?? "-",
        viewAmountDisplay:
          (item.viewCostamt ?? item.viewAmount) === "Y" ? "Yes" : "No",
        activeLabel: activeLabel(item.active),
        isLocked:
          item.active === "N" &&
          maxLog > 0 &&
          Number(item.stat ?? 0) >= maxLog,
      }));
  }, [users, activeTab, maxLog]);

  const tableColumns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        className: "w-[95px] min-w-[95px] text-center",
        render: (row) => (
          <div className="flex gap-1 justify-center">
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleEditUser(row);
              }}
              title="Edit"
              className="h-7 w-7 flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setSelectedUser(row);
                handleDeleteUser(row);
              }}
              title="Delete"
              className="h-7 w-7 flex items-center justify-center bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "userCode",
        label: "User ID",
        sortable: true,
        className: "w-[110px] min-w-[110px]",
      },
      {
        key: "userName",
        label: "User Name",
        sortable: true,
        className: "w-[180px] min-w-[180px]",
      },
      {
        key: "userTypeDisplay",
        label: "User Type",
        sortable: true,
        className: "w-[180px] min-w-[180px]",
      },
      {
        key: "viewAmountDisplay",
        label: "View Amount",
        sortable: true,
        className: "w-[110px] min-w-[110px] text-center",
      },
      {
        key: "emailAdd",
        label: "Email Address",
        sortable: true,
        className: "min-w-[220px]",
        render: (row) => (
          <span className="block truncate max-w-[260px]" title={row.emailAdd || ""}>
            {row.emailAdd || ""}
          </span>
        ),
      },
      {
        key: "activeLabel",
        label: "Active",
        sortable: true,
        className: "w-[80px] min-w-[80px] text-center",
      },
    ],
    []
  );

  const userTypeSelectValue = userType === "" ? "__none__" : userType;
  const handleUserTypeChange = (value) =>
    setUserType(value === "__none__" ? "" : value);

  const selectedUserStat = Number(selectedUser?.stat ?? 0);
  const isSelectedUserLocked =
    selectedUser?.active === "N" &&
    maxLog > 0 &&
    selectedUserStat >= maxLog;

  return (
    <motion.div
      className="global-ref-main-div-ui mt-24"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {showSpinner && <LoadingSpinner />}

      {/* Header */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui text-center sm:text-left">
            {documentTitle}
          </h1>
        </div>

        <div className="flex gap-2 justify-center sm:justify-end text-xs flex-wrap">
          <button
            onClick={startNew}
            title="Add"
            className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            onClick={handleSaveUser}
            title="Save (Ctrl+S)"
            disabled={!isEditing || saving}
            className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${
              !isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FontAwesomeIcon icon={faSave} />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={resetForm}
            title="Reset"
            disabled={saving}
            className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
          >
            <FontAwesomeIcon icon={faUndo} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((value) => !value)}
              title="Info"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              <span className="hidden sm:inline">Info</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="hidden sm:inline text-xs"
              />
            </button>

            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={handlePDFGuide}
                  disabled={!pdfLink}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                  User Guide
                </button>

                <button
                  onClick={handleVideoGuide}
                  disabled={!videoLink}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" />
                  Video Guide
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleResetPassword}
            title="Reset Password"
            disabled={!selectedUser || selectedUser.active !== "Y"}
            className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${
              !selectedUser || selectedUser.active !== "Y"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <FontAwesomeIcon icon={faKey} />
            <span className="hidden sm:inline">Reset Password</span>
          </button>

          {currentUserType === "X" && isSelectedUserLocked && (
            <button
              onClick={handleReleaseAccount}
              title="Release Locked Account"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faLockOpen} />
              <span className="hidden sm:inline">Release Account</span>
            </button>
          )}

          {selectedUser?.active === "P" && (
            <button
              onClick={handleApproveAccount}
              title="Approve"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faUsers} />
              <span className="hidden sm:inline">Approve</span>
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div ref={formRef} className="global-tran-tab-div-ui">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedUser?.userCode || "new-user-form"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* User Information - Column 1 */}
            <div className="global-ref-textbox-group-div-ui">
              <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  User Information
                </h2>
              </div>

              <FieldRenderer
                label="User ID"
                required
                value={userId}
                inputRef={codeInputRef}
                onChange={(value) => setUserId(value ?? "")}
                onBlur={handleCheckDuplicate}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCheckDuplicate();
                  }
                }}
                disabled={!isEditing || !!selectedUser}
                maxLength={10}
              />

              <FieldRenderer
                id="userName"
                name="userName"
                label="User Name"
                required
                value={userName}
                onChange={(value) => setUserName(value ?? "")}
                disabled={!isEditing}
                maxLength={100}
              />

              <FieldRenderer
                id="userType"
                name="userType"
                label="User Type"
                required
                type="select"
                value={userTypeSelectValue}
                onChange={handleUserTypeChange}
                disabled={!isEditing}
                options={userTypeOptions}
              />
            </div>

            {/* User Information - Column 2 */}
            <div className="global-ref-textbox-group-div-ui">
              <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Account Settings
                </h2>
              </div>

              <FieldRenderer
                id="viewAmount"
                name="viewAmount"
                label="View Amount"
                type="select"
                value={viewAmount || "N"}
                onChange={(value) => setViewAmount(value ?? "N")}
                disabled={!isEditing}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
              />

              <FieldRenderer
                id="emailAdd"
                name="emailAdd"
                label="Email Address"
                required
                type="text"
                value={emailAdd}
                onChange={(value) => setEmailAdd(value ?? "")}
                disabled={!isEditing}
                maxLength={100}
              />

              <FieldRenderer
                id="active"
                name="active"
                label="Active?"
                type="select"
                value={active}
                onChange={(value) => setActive(value ?? "Yes")}
                disabled={!isEditing}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "Pending", label: "Pending" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Registration Information */}
            <div className="global-ref-textbox-group-div-ui">
              <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Registration Information
                </h2>
              </div>

              <FieldRenderer
                id="registeredBy"
                name="registeredBy"
                label="Registered By"
                value={registeredBy}
                disabled
                readOnly
              />

              <FieldRenderer
                id="registeredDate"
                name="registeredDate"
                label="Registered Date"
                value={formatDateTime(registeredDate)}
                disabled
                readOnly
              />

              <FieldRenderer
                id="updatedBy"
                name="updatedBy"
                label="Updated By"
                value={updatedBy}
                disabled
                readOnly
              />

              <FieldRenderer
                id="updatedDate"
                name="updatedDate"
                label="Updated Date"
                value={formatDateTime(updatedDate)}
                disabled
                readOnly
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Users Table */}
      <div className="global-ref-tab-div-ui mt-6">
        <div className="flex flex-row mb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${
              activeTab === "active"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Active Users
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending Users
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${
              activeTab === "inactive"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Inactive Users
          </button>
        </div>

        <motion.div
          className="global-ref-table-main-div-ui"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-full overflow-x-auto">
            <SearchGlobalReferenceTable
              title={`${documentTitle} - ${
                activeTab === "active"
                  ? "Active Users"
                  : activeTab === "pending"
                    ? "Pending Users"
                    : "Inactive Users"
              }`}
              data={tableRows}
              columns={tableColumns}
              loading={loading}
              onRowDoubleClick={handleEditUser}
              onRowClick={handleEditUser}
              docType="User"
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50, 100]}
              searchPlaceholder="Search users..."
              emptyMessage="No users found"
              fileName={`user_management_${activeTab}`}
              enableExport
              enableColumnToggle
              enableColumnGrouping
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserManagement;
