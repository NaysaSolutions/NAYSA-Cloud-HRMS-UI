// import { useEffect, useMemo, useRef, useState } from "react";
// import { AnimatePresence, motion } from "motion/react";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
// import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
// import UserRoleModal from "@/NAYSA Cloud/Lookup/SetUserRole";
// import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faEdit,
//   faTrashAlt,
//   faPlus,
//   faPrint,
//   faChevronDown,
//   faFileCsv,
//   faFileExcel,
//   faFilePdf,
//   faSave,
//   faUndo,
//   faUsers,
//   faKey,
//   faSpinner,
//   faInfoCircle,
//   faVideo,
//   faUserShield,
// } from "@fortawesome/free-solid-svg-icons";

// import {
//   reftables,
//   reftablesPDFGuide,
//   reftablesVideoGuide,
// } from "@/NAYSA Cloud/Global/reftable";

// import {
//   useSwalErrorAlert,
//   useSwalSuccessAlert,
//   useSwalErrorAlertAPI,
//   useSwalDeleteConfirm,
//   useSwalDeleteRecord,
// } from "@/NAYSA Cloud/Global/behavior.jsx";

// const UpdateUser = () => {
//   const docType = "UserUpdate";
//   const { user } = useAuth();
//   const queryClient = useQueryClient();

//   const documentTitle = reftables[docType];
//   const pdfLink = reftablesPDFGuide[docType];
//   const videoLink = reftablesVideoGuide[docType];

//   const [userId, setUserId] = useState("");
//   const [userName, setUserName] = useState("");
//   const [userType, setUserType] = useState("");
//   const [branchCode, setBranchCode] = useState("");
//   const [branchName, setBranchName] = useState("");
//   const [branchModalOpen, setBranchModalOpen] = useState(false);
//   const [rcCode, setRcCode] = useState("");
//   const [rcName, setRcName] = useState("");
//   const [rcModalOpen, setRcModalOpen] = useState(false);
//   const [showUserRoleModal, setShowUserRoleModal] = useState(false);
//   const [position, setPosition] = useState("");
//   const [emailAdd, setEmailAdd] = useState("");
//   const [viewCostamt, setViewCostamt] = useState("N");
//   const [editUprice, setEditUprice] = useState("N");
//   const [active, setActive] = useState("Yes");

//   const [selectedUser, setSelectedUser] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const [activeTab, setActiveTab] = useState("active");

//   const [showSpinner, setShowSpinner] = useState(false);
//   const [isOpenExport, setOpenExport] = useState(false);
//   const [isOpenGuide, setOpenGuide] = useState(false);

//   const [userTypes, setUserTypes] = useState([""]);

//   const exportRef = useRef(null);
//   const guideRef = useRef(null);
//   const codeInputRef = useRef(null);

//   const currentUserCode =
//     user?.USER_CODE || user?.userCode || user?.code || "SYSTEM";

//   const LoadingSpinner = () => (
//     <div className="global-tran-spinner-main-div-ui">
//       <div className="global-tran-spinner-sub-div-ui">
//         <FontAwesomeIcon
//           icon={faSpinner}
//           spin
//           size="2x"
//           className="text-blue-500 mb-2"
//         />
//         <p>Please wait...</p>
//       </div>
//     </div>
//   );

//   const activeLabel = (code) => {
//     if (code === "Y") return "Yes";
//     if (code === "P") return "Pending";
//     if (code === "N") return "No";
//     return "-";
//   };

//   const {
//     data: users = [],
//     isLoading: usersLoading,
//     refetch: refetchUsers,
//   } = useQuery({
//     queryKey: ["users", activeTab],
//     queryFn: async () => {
//       const { data } = await apiClient.get("/load", {
//         params: {
//           Status:
//             activeTab === "active"
//               ? "Active"
//               : activeTab === "pending"
//                 ? "Pending"
//                 : "Inactive",
//         },
//       });

//       let userData = [];

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         if (data.data[0]?.result) {
//           try {
//             userData = JSON.parse(data.data[0].result);
//           } catch (parseError) {
//             console.error("Error parsing JSON result:", parseError);
//             userData = [];
//           }
//         }
//       } else if (data?.result) {
//         try {
//           userData = JSON.parse(data.result);
//         } catch (parseError) {
//           console.error("Error parsing JSON result:", parseError);
//           userData = [];
//         }
//       } else if (Array.isArray(data)) {
//         userData = data;
//       }

//       if (!Array.isArray(userData)) return [];

//       const filteredUsers = userData.filter(
//         (u) =>
//           u &&
//           (u.userCode ||
//             u.userName ||
//             u.userType ||
//             u.emailAdd ||
//             u.branchCode ||
//             u.position ||
//             u.rcCode ||
//             u.active ||
//             u.viewCostamt ||
//             u.editUprice)
//       );

//       return filteredUsers.map((u) => ({
//         ...u,
//         branchName:
//           u.branchName ?? u.b?.branchName ?? u.b?.branchname ?? u.branchCode ?? "",
//         rcName: u.rcName ?? u.c?.rcName ?? u.c?.rcname ?? u.rcCode ?? "",
//       }));
//     },
//   });

//   useEffect(() => {
//     if (users.length > 0) {
//       const uniqueTypes = [...new Set(users.map((u) => u.userType).filter(Boolean))];
//       setUserTypes(["", ...uniqueTypes]);
//     } else {
//       setUserTypes([""]);
//     }
//   }, [users]);

//   const saveMutation = useMutation({
//     mutationFn: async ({ payload }) => {
//       return apiClient.post("/users/upsert", payload);
//     },
//     onSuccess: async (response, variables) => {
//       const res = response.data;
//       const isNewRecord = variables.isNewRecord;

//       if (res?.success === true || res?.data?.status === "success") {
//         if (isNewRecord && active === "Yes") {
//           try {
//             await apiClient.post("/users/approve", {
//               userCode: userId.trim(),
//               mode: "admin_add",
//             });
//           } catch (e) {
//             console.warn("Temp password email failed:", e);
//           }
//         }

//         await queryClient.invalidateQueries({ queryKey: ["users"] });

//         if (isNewRecord) {
//           await useSwalSuccessAlert(
//             "Success!",
//             "User created successfully. A temporary password has been sent to the user's email."
//           );
//         } else {
//           await useSwalSuccessAlert("Success!", "User updated successfully.");
//         }

//         resetForm();
//       } else {
//         await useSwalErrorAlert("Error!", res?.message || "Failed to save user.");
//       }
//     },
//     onError: async (error) => {
//       const msg =
//         error?.response?.data?.message ||
//         error?.message ||
//         "Error saving user.";

//       await useSwalErrorAlert("Validation Error", msg);
//     },
//   });

//   const handleCheckDuplicate = async () => {
//     if (!userId?.trim()) return;

//     try {
//       const { data } = await apiClient.post("/users/checkduplicate", {
//         userCode: userId.trim(),
//       });

//       const result = data?.data?.[0];

//       if (result?.errorcount > 0) {
//         await useSwalErrorAlert("Duplicate", result.errormsg);

//         // reset field
//         setUserId("");

//         // refocus back
//         setTimeout(() => {
//           codeInputRef.current?.focus();
//         }, 100);
//       }
//     } catch (error) {
//       console.error("Duplicate check failed:", error);
//     }
//   };

//   const deleteMutation = useMutation({
//     mutationFn: async (targetUser) => {
//       return apiClient.post("/users/delete", {
//         json_data: {
//           userCode: targetUser.userCode,
//           userCodeAudit: currentUserCode,
//         },
//       });
//     },
//     onSuccess: async (response) => {
//       const raw = response?.data;
//       const resultText =
//         raw?.data?.[0]?.result ??
//         raw?.result ??
//         raw?.data?.result ??
//         raw?.data?.message ??
//         "";

//       let parsed = null;
//       try {
//         parsed = typeof resultText === "string" ? JSON.parse(resultText) : resultText;
//       } catch {
//         parsed = raw;
//       }

//       const message =
//         parsed?.message ||
//         raw?.message ||
//         raw?.data?.message ||
//         "User delete operation completed.";

//       await useSwalDeleteRecord("Success", message);

//       await queryClient.invalidateQueries({ queryKey: ["users"] });
//       resetForm();
//     },
//     onError: async (error) => {
//       console.error("Delete error:", error);
//       const errorMsg =
//         error?.response?.data?.message ||
//         error?.response?.data?.details ||
//         error?.message ||
//         "Failed to delete user.";
//       await useSwalErrorAlertAPI("Error", errorMsg);
//     },
//   });

//   const saving = saveMutation.isPending || deleteMutation.isPending;
//   const loading = usersLoading;

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       const clickedOutsideExport =
//         exportRef.current && !exportRef.current.contains(event.target);
//       const clickedOutsideGuide =
//         guideRef.current && !guideRef.current.contains(event.target);

//       if (clickedOutsideExport) setOpenExport(false);
//       if (clickedOutsideGuide) setOpenGuide(false);
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.ctrlKey && e.key.toLowerCase() === "s") {
//         e.preventDefault();
//         if (!saving && isEditing) {
//           handleSaveUser();
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [
//     saving,
//     isEditing,
//     userId,
//     userName,
//     userType,
//     branchCode,
//     rcCode,
//     viewCostamt,
//     editUprice,
//     active,
//     position,
//     emailAdd,
//     selectedUser,
//   ]);

//   useEffect(() => {
//     let timer;
//     if (loading || saving) {
//       timer = setTimeout(() => setShowSpinner(true), 200);
//     } else {
//       setShowSpinner(false);
//     }
//     return () => clearTimeout(timer);
//   }, [loading, saving]);

//   const handleOpenBranchModal = () => {
//     if (isEditing) setBranchModalOpen(true);
//   };

//   const handleCloseBranchModal = (selectedBranch = null) => {
//     setBranchModalOpen(false);
//     if (selectedBranch) {
//       setBranchCode(selectedBranch.branchCode || "");
//       setBranchName(selectedBranch.branchName || "");
//     }
//   };

//   const handleOpenRCModal = () => {
//     if (isEditing) setRcModalOpen(true);
//   };

//   const handleCloseRCModal = (selectedRC = null) => {
//     setRcModalOpen(false);
//     if (selectedRC) {
//       setRcCode(selectedRC.rcCode || "");
//       setRcName(selectedRC.rcName || "");
//     }
//   };

//   const resetForm = () => {
//     setUserId("");
//     setUserName("");
//     setUserType("");
//     setBranchCode("");
//     setBranchName("");
//     setRcCode("");
//     setRcName("");
//     setPosition("");
//     setEmailAdd("");
//     setActive("Yes");
//     setViewCostamt("N");
//     setEditUprice("N");
//     setSelectedUser(null);
//     setIsEditing(false);
//   };

//   const handleSaveUser = async () => {
//     const payload = {
//       json_data: {
//         userCode: userId.trim(),
//         userName: userName.trim(),
//         emailAdd: emailAdd ? emailAdd.trim() : "",
//         userType: userType || "",
//         branchCode: branchCode || "",
//         rcCode: rcCode || "",
//         viewCostamt: viewCostamt || "N",
//         editUprice: editUprice || "N",
//         active: active === "Yes" ? "Y" : active === "Pending" ? "P" : "N",
//         position: position ? position.trim() : "",
//         userCodeAudit: currentUserCode,
//       },
//     };

//     saveMutation.mutate({
//       payload,
//       isNewRecord: !selectedUser,
//     });
//   };

//   const handleDeleteUser = async (userToDelete = null) => {
//     const targetUser = userToDelete || selectedUser;

//     if (!targetUser?.userCode) {
//       await useSwalErrorAlert(
//         "Validation Error",
//         "Please select a user to delete."
//       );
//       return;
//     }

//     const confirm = await useSwalDeleteConfirm(
//       "Delete this user?",
//       `ID: ${targetUser.userCode} | Name: ${targetUser.userName || ""}`,
//       "Yes, delete it"
//     );

//     if (!confirm?.isConfirmed) return;

//     deleteMutation.mutate(targetUser);
//   };

//   const handleEditUser = async (rowUser) => {
//     let userData = rowUser;

//     if (rowUser.active === "P") setActiveTab("pending");
//     if (rowUser.active === "Y") setActiveTab("active");
//     if (rowUser.active === "N") setActiveTab("inactive");

//     if (
//       (!rowUser.branchName && rowUser.branchCode) ||
//       (!rowUser.rcName && rowUser.rcCode)
//     ) {
//       try {
//         const { data } = await apiClient.get("/get", {
//           params: {
//             userCode: rowUser.userCode,
//           },
//         });

//         let fullUserData = null;

//         if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
//           const parsedResult = JSON.parse(data.data[0].result);
//           if (Array.isArray(parsedResult) && parsedResult.length > 0) {
//             fullUserData = parsedResult[0];
//           }
//         } else if (data?.result) {
//           const parsedResult = JSON.parse(data.result);
//           if (Array.isArray(parsedResult) && parsedResult.length > 0) {
//             fullUserData = parsedResult[0];
//           }
//         }

//         if (fullUserData) {
//           userData = { ...rowUser, ...fullUserData };
//         }
//       } catch (error) {
//         console.error("Error fetching user details:", error);
//       }
//     }

//     setUserId(userData.userCode || "");
//     setUserName(userData.userName || "");
//     setUserType(userData.userType || "");
//     setBranchCode(userData.branchCode || "");
//     setBranchName(userData.branchName || "");
//     setRcCode(userData.rcCode || "");
//     setRcName(userData.rcName || "");
//     setPosition(userData.position || "");
//     setEmailAdd(userData.emailAdd || "");
//     setActive(
//       userData.active === "Y" ? "Yes" : userData.active === "P" ? "Pending" : "No"
//     );
//     setViewCostamt(userData.viewCostamt === "Y" ? "Y" : "N");
//     setEditUprice(userData.editUprice === "Y" ? "Y" : "N");

//     setSelectedUser(userData);
//     setIsEditing(true);
//   };

//   const startNew = () => {
//     resetForm();
//     setIsEditing(true);
//   };

//   const handleResetPassword = async () => {
//     if (!selectedUser?.userCode) {
//       await useSwalErrorAlert(
//         "Validation Error",
//         "Please select a user to reset password."
//       );
//       return;
//     }

//     const confirmRes = await useSwalDeleteConfirm(
//       "Reset Password",
//       `Are you sure you want to reset the password for ${selectedUser.userName}?`,
//       "Yes, reset it"
//     );

//     if (!confirmRes?.isConfirmed) return;

//     try {
//       setShowSpinner(true);

//       const { data } = await apiClient.post("/users/request-password-reset", {
//         userCode: selectedUser.userCode,
//       });

//       if (data?.status === "success") {
//         await useSwalSuccessAlert(
//           "Success",
//           "Password reset link has been emailed to the user."
//         );
//       } else {
//         await useSwalErrorAlert(
//           "Error",
//           data?.message || "Failed to send the reset email."
//         );
//       }
//     } catch (error) {
//       console.error("Password reset error:", error);
//       const msg =
//         error?.response?.data?.message || error.message || "Request failed.";
//       await useSwalErrorAlertAPI("Error", msg);
//     } finally {
//       setShowSpinner(false);
//     }
//   };

//   const handleUnlockAccount = async () => {

  //const handleReleaseAccount = async () => {
//     if (!selectedUser?.userCode) {
//       await useSwalErrorAlert(
//         "Validation Error",
//         "Please select a user to approve account."
//       );
//       return;
//     }

//     const confirmRes = await useSwalDeleteConfirm(
//       "Approve Account",
//       `Are you sure you want to approve the account for ${selectedUser.userName}?`,
//       "Yes, approve it"
//     );

//     if (!confirmRes?.isConfirmed) return;

//     try {
//       setShowSpinner(true);

//       const { data } = await apiClient.post("/users/approve", {
//         userCode: selectedUser.userCode,
//         mode: "release",
//       });

//       if (data?.status === "success") {
//         await useSwalSuccessAlert(
//           "Success",
//           "Account approved. A password setup link has been sent."
//         );

//         setActiveTab("active");
//         setSelectedUser(null);
//         setIsEditing(false);

//         await queryClient.invalidateQueries({ queryKey: ["users"] });
//         await refetchUsers();
//       } else {
//         await useSwalErrorAlert("Error", data?.message || "Approval failed.");
//       }
//     } catch (error) {
//       await useSwalErrorAlertAPI(
//         "Error",
//         error?.response?.data?.message || error.message || "Approval failed."
//       );
//     } finally {
//       setShowSpinner(false);
//     }
//   };

//   const handleExport = async (format) => {
//     setOpenExport(false);

//     try {
//       const payload = {
//         json_data: {
//           filter:
//             activeTab === "active"
//               ? "Active"
//               : activeTab === "pending"
//                 ? "Pending"
//                 : "Inactive",
//         },
//         format,
//       };

//       const response = await apiClient.post("/users/export", payload, {
//         responseType: "blob",
//       });

//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement("a");
//       link.href = url;

//       const ext = format === "excel" ? "xlsx" : format;
//       const fileName = `users_export_${format}_${new Date()
//         .toISOString()
//         .slice(0, 10)}.${ext}`;

//       link.setAttribute("download", fileName);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error(`Error exporting to ${format}:`, error);
//       await useSwalErrorAlertAPI(
//         "Export Error",
//         `Failed to export to ${format.toUpperCase()}`
//       );
//     }
//   };

//   const handlePDFGuide = () => {
//     if (pdfLink) window.open(pdfLink, "_blank");
//     setOpenGuide(false);
//   };

//   const handleVideoGuide = () => {
//     if (videoLink) window.open(videoLink, "_blank");
//     setOpenGuide(false);
//   };

//   const tableRows = useMemo(() => {
//     return users
//       .filter((u) =>
//         activeTab === "active"
//           ? u.active === "Y"
//           : activeTab === "pending"
//             ? u.active === "P"
//             : u.active === "N"
//       )
//       .map((u) => ({
//         ...u,
//         activeLabel: activeLabel(u.active),
//         branchDisplay: u.branchName || u.branchCode || "-",
//         rcDisplay: u.rcName || u.rcCode || "-",
//       }));
//   }, [users, activeTab]);

//   const tableColumns = useMemo(() => {
//     return [
//       {
//         key: "userCode",
//         label: "User ID",
//         sortable: true,
//         className: "w-[110px] min-w-[110px]",
//       },
//       {
//         key: "userName",
//         label: "User Name",
//         sortable: true,
//         className: "w-[190px] min-w-[190px]",
//       },
//       {
//         key: "userType",
//         label: "User Type",
//         sortable: true,
//         className: "w-[110px] min-w-[110px]",
//       },
//       {
//         key: "branchDisplay",
//         label: "Branch",
//         sortable: true,
//         className: "w-[110px] min-w-[110px]",
//       },
//       {
//         key: "rcDisplay",
//         label: "Department",
//         sortable: true,
//         className: "w-[140px] min-w-[140px]",
//       },
//       {
//         key: "position",
//         label: "Position",
//         sortable: true,
//         className: "w-[180px] min-w-[180px]",
//       },
//       {
//         key: "emailAdd",
//         label: "Email Address",
//         sortable: true,
//         className: "min-w-[280px]",
//       },
//       {
//         key: "activeLabel",
//         label: "Active",
//         sortable: true,
//         className: "w-[90px] min-w-[90px] text-center",
//       },
//       {
//         key: "editAction",
//         label: "Edit",
//         className: "w-[80px] min-w-[80px] text-center",
//         render: (row) => (
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               handleEditUser(row);
//             }}
//             title="Edit"
//             className="flex items-center justify-center h-7 w-7 mx-auto rounded bg-blue-500 text-white hover:bg-blue-600 shadow-sm transition"
//           >
//             <FontAwesomeIcon icon={faEdit} className="text-[12px]" />
//           </button>
//         ),
//       },
//       {
//         key: "roleAction",
//         label: "Set Role",
//         className: "w-[95px] min-w-[95px] text-center",
//         render: (row) => (
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               setSelectedUser(row);
//               setShowUserRoleModal(true);
//             }}
//             title="Set Role"
//             className="flex items-center justify-center h-7 w-7 mx-auto rounded bg-blue-500 text-white hover:bg-blue-600 shadow-sm transition"
//           >
//             <FontAwesomeIcon icon={faUserShield} className="text-[12px]" />
//           </button>
//         ),
//       },
//       {
//         key: "deleteAction",
//         label: "Delete",
//         className: "w-[85px] min-w-[85px] text-center",
//         render: (row) => (
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               setSelectedUser(row);
//               handleDeleteUser(row);
//             }}
//             title="Delete"
//             className="flex items-center justify-center h-7 w-7 mx-auto rounded bg-red-500 text-white hover:bg-red-600 shadow-sm transition"
//           >
//             <FontAwesomeIcon icon={faTrashAlt} className="text-[12px]" />
//           </button>
//         ),
//       },
//     ];
//   }, [selectedUser, activeTab, users]);

//   return (
//     <motion.div
//       className="global-ref-main-div-ui mt-24"
//       initial={{ opacity: 0, y: 12 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.22, ease: "easeOut" }}
//     >
//       {(showSpinner || loading || saving) && <LoadingSpinner />}

//       {branchModalOpen && (
//         <BranchLookupModal
//           isOpen={branchModalOpen}
//           onClose={handleCloseBranchModal}
//         />
//       )}

//       {rcModalOpen && (
//         <RCLookupModal isOpen={rcModalOpen} onClose={handleCloseRCModal} />
//       )}

//       {showUserRoleModal && selectedUser && (
//         <UserRoleModal
//           isOpen={showUserRoleModal}
//           user={selectedUser}
//           onClose={() => setShowUserRoleModal(false)}
//         />
//       )}

//       <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
//         <div className="flex items-center gap-3 w-full sm:w-auto">
//           <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
//         </div>

//         <div className="flex gap-2 justify-center text-xs flex-wrap">
//           <button
//             onClick={startNew}
//             className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
//           >
//             <FontAwesomeIcon icon={faPlus} /> Add
//           </button>

//           <button
//             onClick={handleSaveUser}
//             className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
//               }`}
//             disabled={!isEditing || saving}
//             title="Ctrl+S to Save"
//           >
//             <FontAwesomeIcon icon={faSave} /> Save
//           </button>

//           <button
//             onClick={resetForm}
//             className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
//             disabled={saving}
//           >
//             <FontAwesomeIcon icon={faUndo} /> Reset
//           </button>

//           <div ref={exportRef} className="relative">
//             <button
//               onClick={() => setOpenExport((v) => !v)}
//               className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
//             >
//               <FontAwesomeIcon icon={faPrint} /> Export
//               <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
//             </button>

//             {isOpenExport && (
//               <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
//                 <button
//                   onClick={() => handleExport("csv")}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon
//                     icon={faFileCsv}
//                     className="mr-2 text-green-600"
//                   />
//                   CSV
//                 </button>
//                 <button
//                   onClick={() => handleExport("excel")}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon
//                     icon={faFileExcel}
//                     className="mr-2 text-green-600"
//                   />
//                   Excel
//                 </button>
//                 <button
//                   onClick={() => handleExport("pdf")}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon
//                     icon={faFilePdf}
//                     className="mr-2 text-red-600"
//                   />
//                   PDF
//                 </button>
//               </div>
//             )}
//           </div>

//           <div ref={guideRef} className="relative">
//             <button
//               onClick={() => setOpenGuide((v) => !v)}
//               className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
//             >
//               <FontAwesomeIcon icon={faInfoCircle} /> Info
//               <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
//             </button>

//             {isOpenGuide && (
//               <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
//                 <button
//                   onClick={handlePDFGuide}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon
//                     icon={faFilePdf}
//                     className="mr-2 text-red-600"
//                   />
//                   User Guide
//                 </button>
//                 <button
//                   onClick={handleVideoGuide}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon
//                     icon={faVideo}
//                     className="mr-2 text-blue-600"
//                   />
//                   Video Guide
//                 </button>
//               </div>
//             )}
//           </div>

//           {selectedUser && selectedUser.active === "Y" && (
//             <button
//               onClick={handleResetPassword}
//               className="bg-purple-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
//             >
//               <FontAwesomeIcon icon={faKey} /> Reset Password
//             </button>
//           )}

//           {selectedUser && selectedUser.active === "P" && (
//             <button
//               onClick={handleReleaseAccount}
//               className="bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700"
//             >
//               <FontAwesomeIcon icon={faUsers} /> Approve
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="global-tran-tab-div-ui">
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={selectedUser?.userCode || "new-user-form"}
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             transition={{ duration: 0.2, ease: "easeOut" }}
//             className="grid grid-cols-1 md:grid-cols-3 gap-6"
//           >
//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 label="User ID"
//                 required
//                 value={userId}
//                 inputRef={codeInputRef}
//                 onChange={(v) => setUserId(v ?? "")}
//                 onBlur={handleCheckDuplicate}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     handleCheckDuplicate();
//                   }
//                 }}
//                 disabled={!isEditing || !!selectedUser}
//               />

//               <FieldRenderer
//                 id="userName"
//                 name="userName"
//                 label="User Name"
//                 required
//                 value={userName}
//                 onChange={(v) => setUserName(v ?? "")}
//                 disabled={!isEditing}
//               />

//               <FieldRenderer
//                 id="userType"
//                 name="userType"
//                 label="User Type"
//                 type="select"
//                 value={userType}
//                 onChange={(v) => setUserType(v ?? "")}
//                 disabled={!isEditing}
//                 options={userTypes
//                   .filter((type) => type !== "")
//                   .map((type) => ({ value: type, label: type }))}
//               />

//               <FieldRenderer
//                 id="active"
//                 name="active"
//                 label="Active?"
//                 type="select"
//                 value={active}
//                 onChange={(v) => setActive(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Yes", label: "Yes" },
//                   { value: "Pending", label: "Pending" },
//                   { value: "No", label: "No" },
//                 ]}
//               />
//             </div>

//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 id="branchName"
//                 name="branchName"
//                 label="Branch"
//                 type="lookup"
//                 value={branchName || ""}
//                 onChange={() => { }}
//                 onLookup={handleOpenBranchModal}
//                 disabled={!isEditing}
//                 readOnly
//               />

//               <FieldRenderer
//                 id="rcName"
//                 name="rcName"
//                 label="Department"
//                 type="lookup"
//                 value={rcName || ""}
//                 onChange={() => { }}
//                 onLookup={handleOpenRCModal}
//                 disabled={!isEditing}
//                 readOnly
//               />

//               <FieldRenderer
//                 id="position"
//                 name="position"
//                 label="Position"
//                 value={position}
//                 onChange={(v) => setPosition(v ?? "")}
//                 disabled={!isEditing}
//               />

//               <FieldRenderer
//                 id="emailAdd"
//                 name="emailAdd"
//                 label="Email Address"
//                 type="text"
//                 value={emailAdd}
//                 onChange={(v) => setEmailAdd(v ?? "")}
//                 disabled={!isEditing}
//               />
//             </div>

//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 id="viewCostamt"
//                 name="viewCostamt"
//                 label="View Cost Amount"
//                 type="select"
//                 value={viewCostamt || "N"}
//                 onChange={(v) => setViewCostamt(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Y", label: "Yes" },
//                   { value: "N", label: "No" },
//                 ]}
//               />

//               <FieldRenderer
//                 id="editUprice"
//                 name="editUprice"
//                 label="Can Edit Unit Price?"
//                 type="select"
//                 value={editUprice}
//                 onChange={(v) => setEditUprice(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Y", label: "Yes" },
//                   { value: "N", label: "No" },
//                 ]}
//               />
//             </div>
//           </motion.div>
//         </AnimatePresence>
//       </div>

//       <div className="global-ref-tab-div-ui mt-6">
//         <div className="flex flex-row sm:flex-row mb-2">
//           <button
//             onClick={() => setActiveTab("active")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "active"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Active Users
//           </button>

//           <button
//             onClick={() => setActiveTab("pending")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "pending"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Pending Users
//           </button>

//           <button
//             onClick={() => setActiveTab("inactive")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "inactive"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Inactive Users
//           </button>
//         </div>

//         <motion.div
//           className="global-ref-table-main-div-ui"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.2 }}
//         >
//           <div className="global-ref-table-main-div-ui">
//             <div className="w-full overflow-x-auto">
//               <SearchGlobalReferenceTable
//                 title={`${documentTitle} - ${activeTab === "active"
//                   ? "Active Users"
//                   : activeTab === "pending"
//                     ? "Pending Users"
//                     : "Inactive Users"
//                   }`}
//                 data={tableRows}
//                 columns={tableColumns}
//                 loading={loading}
//                 onRowDoubleClick={handleEditUser}
//                 onRowClick={handleEditUser}
//                 defaultPageSize={10}
//                 pageSizeOptions={[10, 20, 50, 100]}
//                 searchPlaceholder="Search users..."
//                 emptyMessage="No users found"
//                 fileName={`users_${activeTab}`}
//                 enableExport={true}
//                 enableColumnToggle={true}
//                 enableColumnGrouping={true}
//               />
//             </div>
//           </div>
//         </motion.div>
//       </div>
//     </motion.div>
//   );
// };

// export default UpdateUser;
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import { AnimatePresence, motion } from "motion/react";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
// import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
// import UserRoleModal from "@/NAYSA Cloud/Lookup/SetUserRole";
// import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faEdit,
//   faTrashAlt,
//   faPlus,
//   faPrint,
//   faChevronDown,
//   faFileCsv,
//   faFileExcel,
//   faFilePdf,
//   faSave,
//   faUndo,
//   faUsers,
//   faKey,
//   faInfoCircle,
//   faVideo,
//   faUserShield,
// } from "@fortawesome/free-solid-svg-icons";

// import {
//   reftables,
//   reftablesPDFGuide,
//   reftablesVideoGuide,
// } from "@/NAYSA Cloud/Global/reftable";

// import {
//   useSwalErrorAlert,
//   useSwalSuccessAlert,
//   useSwalErrorAlertAPI,
//   useSwalDeleteConfirm,
//   useSwalDeleteRecord,
// } from "@/NAYSA Cloud/Global/behavior.jsx";

// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// // ─── User Type Map ────────────────────────────────────────────────────────────
// const USER_TYPE_MAP = {
//   S: "System Administrator",
//   R: "Regular",
//   X: "Security Administrator",
//   M: "Management",
// };

// const userTypeOptions = [
//   { value: "S", label: "System Administrator" },
//   { value: "R", label: "Regular" },
//   { value: "X", label: "Security Administrator" },
//   { value: "M", label: "Management" },
// ];
// // ─────────────────────────────────────────────────────────────────────────────

// const UpdateUser = () => {
//   const docType = "UserUpdate";
//   const { user } = useAuth();
//   const queryClient = useQueryClient();

//   const documentTitle = reftables[docType];
//   const pdfLink = reftablesPDFGuide[docType];
//   const videoLink = reftablesVideoGuide[docType];

//   const [userId, setUserId] = useState("");
//   const [userName, setUserName] = useState("");
//   const [userType, setUserType] = useState("");
//   const [branchCode, setBranchCode] = useState("");
//   const [branchName, setBranchName] = useState("");
//   const [branchModalOpen, setBranchModalOpen] = useState(false);
//   const [rcCode, setRcCode] = useState("");
//   const [rcName, setRcName] = useState("");
//   const [rcModalOpen, setRcModalOpen] = useState(false);
//   const [showUserRoleModal, setShowUserRoleModal] = useState(false);
//   const [position, setPosition] = useState("");
//   const [emailAdd, setEmailAdd] = useState("");
//   const [viewCostamt, setViewCostamt] = useState("N");
//   const [editUprice, setEditUprice] = useState("N");
//   const [active, setActive] = useState("Yes");

//   const [selectedUser, setSelectedUser] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const [activeTab, setActiveTab] = useState("active");

//   const [showSpinner, setShowSpinner] = useState(false);
//   const [isOpenExport, setOpenExport] = useState(false);
//   const [isOpenGuide, setOpenGuide] = useState(false);

//   const exportRef = useRef(null);
//   const guideRef = useRef(null);
//   const codeInputRef = useRef(null);

//   const currentUserCode =
//     user?.USER_CODE || user?.userCode || user?.code || "SYSTEM";

//   const activeLabel = (code) => {
//     if (code === "Y") return "Yes";
//     if (code === "P") return "Pending";
//     if (code === "N") return "No";
//     return "-";
//   };

//   const {
//     data: users = [],
//     isLoading: usersLoading,
//     refetch: refetchUsers,
//   } = useQuery({
//     queryKey: ["users", activeTab],
//     queryFn: async () => {
//       const { data } = await apiClient.get("/load", {
//         params: {
//           Status:
//             activeTab === "active"
//               ? "Active"
//               : activeTab === "pending"
//                 ? "Pending"
//                 : "Inactive",
//         },
//       });

//       let userData = [];

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         if (data.data[0]?.result) {
//           try {
//             userData = JSON.parse(data.data[0].result);
//           } catch (parseError) {
//             console.error("Error parsing JSON result:", parseError);
//             userData = [];
//           }
//         }
//       } else if (data?.result) {
//         try {
//           userData = JSON.parse(data.result);
//         } catch (parseError) {
//           console.error("Error parsing JSON result:", parseError);
//           userData = [];
//         }
//       } else if (Array.isArray(data)) {
//         userData = data;
//       }

//       if (!Array.isArray(userData)) return [];

//       const filteredUsers = userData.filter(
//         (u) =>
//           u &&
//           (u.userCode ||
//             u.userName ||
//             u.userType ||
//             u.emailAdd ||
//             u.branchCode ||
//             u.position ||
//             u.rcCode ||
//             u.active ||
//             u.viewCostamt ||
//             u.editUprice)
//       );

//       return filteredUsers.map((u) => ({
//         ...u,
//         branchName:
//           u.branchName ?? u.b?.branchName ?? u.b?.branchname ?? u.branchCode ?? "",
//         rcName: u.rcName ?? u.c?.rcName ?? u.c?.rcname ?? u.rcCode ?? "",
//       }));
//     },
//   });

//   const [searchParams, setSearchParams] = useSearchParams();

//   // Handle incoming links from the Admin Email Notification
//   useEffect(() => {
//     const targetTab = searchParams.get("tab");
//     const targetUser = searchParams.get("userCode");

//     if (targetTab === "pending" && activeTab !== "pending") {
//       setActiveTab("pending");
//     }

//     if (targetUser && users.length > 0) {
//       const foundUser = users.find((u) => u.userCode === targetUser);

//       if (foundUser && selectedUser?.userCode !== targetUser) {
//         handleEditUser(foundUser);
//         searchParams.delete("userCode");
//         searchParams.delete("tab");
//         setSearchParams(searchParams, { replace: true });
//       }
//     }
//   }, [searchParams, users, activeTab, selectedUser]);

//   const saveMutation = useMutation({
//     mutationFn: async ({ payload }) => {
//       return apiClient.post("/users/upsert", payload);
//     },

//     onSuccess: async (response, variables) => {
//       const res = response?.data;

//       const row =
//         res?.data?.[0] ??
//         res?.data?.data?.[0] ??
//         res?.result?.[0] ??
//         null;

//       const errorcount = Number(row?.errorcount ?? 0);
//       const errormsg =
//         row?.errormsg ||
//         res?.errormsg ||
//         res?.message ||
//         "Failed to save user.";

//       if (errorcount > 0) {
//         // Reverted: Using "" safely removes the title without printing "null"
//         // errormsg comes directly from your backend with the <b> tags
//         await useSwalErrorAlert("", errormsg);
//         return;
//       }

//       const isNewRecord = variables.isNewRecord;

//       if (isNewRecord && active === "Yes") {
//         try {
//           await apiClient.post("/users/approve", {
//             userCode: userId.trim(),
//             mode: "admin_add",
//           });
//         } catch (e) {
//           console.warn("Temp password email failed:", e);
//         }
//       }

//       await queryClient.invalidateQueries({ queryKey: ["users"] });

//       if (isNewRecord) {
//         await useSwalSuccessAlert(
//           "Success!",
//           "User created successfully. A temporary password has been sent to the user's email."
//         );
//       } else {
//         await useSwalSuccessAlert("Success!", "User updated successfully.");
//       }

//       resetForm();
//     },

//     onError: async (error) => {
//       const msg =
//         error?.response?.data?.message ||
//         error?.message ||
//         "Error saving user.";

//       // Reverted: Removed the "System Error" injection
//       await useSwalErrorAlertAPI("", msg);
//     },
//   });

//   const handleCheckDuplicate = async () => {
//     if (isEditing && selectedUser?.userCode === userId.trim()) return;

//     if (!userId?.trim()) return;

//     try {
//       const payload = {
//         json_data: { userCode: userId.trim() },
//         userCode: userId.trim()
//       };

//       const { data } = await apiClient.post("/users/checkduplicate", payload);

//       const firstRow = data?.data?.[0] || {};
//       const rawResult = firstRow?.result ?? Object.values(firstRow)[0] ?? data?.result ?? "";

//       let parsed = {};
//       try {
//         parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
//       } catch {
//         parsed = {};
//       }

//       if (String(parsed?.result) === "1") {
//         // Reverted back to your exact format
//         await useSwalErrorAlert(
//           "Duplicate",
//           `User ID "${userId.trim()}" already exists.`
//         );
//         setUserId("");
//         setTimeout(() => {
//           codeInputRef.current?.focus();
//         }, 100);
//       }
//     } catch (error) {
//       console.error("Duplicate check failed:", error);
//     }
//   };

//   const deleteMutation = useMutation({
//     mutationFn: async (targetUser) => {
//       return apiClient.post("/users/delete", {
//         userCode: targetUser.userCode,
//       });
//     },
//     onSuccess: async (response) => {
//       const raw = response?.data;
//       const resultText =
//         raw?.data?.[0]?.result ??
//         raw?.result ??
//         raw?.data?.result ??
//         raw?.data?.message ??
//         "";

//       let parsed = null;
//       try {
//         parsed = typeof resultText === "string" ? JSON.parse(resultText) : resultText;
//       } catch {
//         parsed = raw;
//       }

//       const message =
//         parsed?.message ||
//         raw?.message ||
//         raw?.data?.message ||
//         "User delete operation completed.";

//       await useSwalDeleteRecord("Success", message);
//       await queryClient.invalidateQueries({ queryKey: ["users"] });
//       resetForm();
//     },
//     onError: async (error) => {
//       console.error("Delete error:", error);
//       const errorMsg =
//         error?.response?.data?.message ||
//         error?.response?.data?.details ||
//         error?.message ||
//         "Failed to delete user.";

//       // Reverted back to your exact format
//       await useSwalErrorAlertAPI("Error", errorMsg);
//     },
//   });

//   const saving = saveMutation.isPending || deleteMutation.isPending;
//   const loading = usersLoading;

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       const clickedOutsideExport =
//         exportRef.current && !exportRef.current.contains(event.target);
//       const clickedOutsideGuide =
//         guideRef.current && !guideRef.current.contains(event.target);

//       if (clickedOutsideExport) setOpenExport(false);
//       if (clickedOutsideGuide) setOpenGuide(false);
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.ctrlKey && e.key.toLowerCase() === "s") {
//         e.preventDefault();
//         if (!saving && isEditing) {
//           handleSaveUser();
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [
//     saving,
//     isEditing,
//     userId,
//     userName,
//     userType,
//     branchCode,
//     rcCode,
//     viewCostamt,
//     editUprice,
//     active,
//     position,
//     emailAdd,
//     selectedUser,
//   ]);

//   // Spinner is now strictly tied to loading data, not saving/deleting
//   useEffect(() => {
//     let timer;
//     if (loading) {
//       timer = setTimeout(() => setShowSpinner(true), 200);
//     } else {
//       setShowSpinner(false);
//     }
//     return () => clearTimeout(timer);
//   }, [loading]);

//   const handleOpenBranchModal = () => {
//     if (isEditing) setBranchModalOpen(true);
//   };

//   const handleCloseBranchModal = (selectedBranch = null) => {
//     setBranchModalOpen(false);
//     if (selectedBranch) {
//       setBranchCode(selectedBranch.branchCode || "");
//       setBranchName(selectedBranch.branchName || "");
//     }
//   };

//   const handleOpenRCModal = () => {
//     if (isEditing) setRcModalOpen(true);
//   };

//   const handleCloseRCModal = (selectedRC = null) => {
//     setRcModalOpen(false);
//     if (selectedRC) {
//       setRcCode(selectedRC.rcCode || "");
//       setRcName(selectedRC.rcName || "");
//     }
//   };

//   const resetForm = () => {
//     setUserId("");
//     setUserName("");
//     setUserType("");
//     setBranchCode("");
//     setBranchName("");
//     setRcCode("");
//     setRcName("");
//     setPosition("");
//     setEmailAdd("");
//     setActive("Yes");
//     setViewCostamt("N");
//     setEditUprice("N");
//     setSelectedUser(null);
//     setIsEditing(false);
//   };

//   const handleSaveUser = async () => {
//     // --- 1. ADD THIS EMAIL VALIDATION BLOCK ---
//     const trimmedEmail = emailAdd.trim();
//     if (trimmedEmail !== "") {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(trimmedEmail)) {
//         await useSwalErrorAlert(
//           "",
//           "<b>Invalid Input</b><br/>Please enter a valid email address."
//         );
//         return; // Stop saving
//       }
//     }
//     // ------------------------------------------

//     const payload = {
//       json_data: {
//         userCode: userId.trim(),
//         userName: userName.trim(),
//         emailAdd: trimmedEmail,
//         userType: userType || "",
//         branchCode: branchCode || "",
//         rcCode: rcCode || "",
//         viewCostamt: viewCostamt || "N",
//         editUprice: editUprice || "N",
//         active: active === "Yes" ? "Y" : active === "Pending" ? "P" : "N",
//         position: position ? position.trim() : "",
//         userCodeAudit: currentUserCode,
//       },
//     };

//     saveMutation.mutate({
//       payload,
//       isNewRecord: !selectedUser,
//     });
//   };

//   const handleDeleteUser = async (userToDelete = null) => {
//     const targetUser = userToDelete || selectedUser;

//     if (!targetUser?.userCode) {
//       await useSwalErrorAlert(null, "Please select a user to delete.");
//       return;
//     }

//     const confirm = await useSwalDeleteConfirm(
//       "Delete this user?",
//       `ID: ${targetUser.userCode} | Name: ${targetUser.userName || ""}`,
//       "Yes, delete it"
//     );

//     if (!confirm?.isConfirmed) return;

//     deleteMutation.mutate(targetUser);
//   };

//   const handleEditUser = async (rowUser) => {
//     let userData = rowUser;

//     if (rowUser.active === "P") setActiveTab("pending");
//     if (rowUser.active === "Y") setActiveTab("active");
//     if (rowUser.active === "N") setActiveTab("inactive");

//     if (
//       (!rowUser.branchName && rowUser.branchCode) ||
//       (!rowUser.rcName && rowUser.rcCode)
//     ) {
//       try {
//         const { data } = await apiClient.get("/get", {
//           params: { userCode: rowUser.userCode },
//         });

//         let fullUserData = null;

//         if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
//           const parsedResult = JSON.parse(data.data[0].result);
//           if (Array.isArray(parsedResult) && parsedResult.length > 0) {
//             fullUserData = parsedResult[0];
//           }
//         } else if (data?.result) {
//           const parsedResult = JSON.parse(data.result);
//           if (Array.isArray(parsedResult) && parsedResult.length > 0) {
//             fullUserData = parsedResult[0];
//           }
//         }

//         if (fullUserData) {
//           userData = { ...rowUser, ...fullUserData };
//         }
//       } catch (error) {
//         console.error("Error fetching user details:", error);
//       }
//     }

//     setUserId(userData.userCode || "");
//     setUserName(userData.userName || "");
//     setUserType(userData.userType || "");
//     setBranchCode(userData.branchCode || "");
//     setBranchName(userData.branchName || "");
//     setRcCode(userData.rcCode || "");
//     setRcName(userData.rcName || "");
//     setPosition(userData.position || "");
//     setEmailAdd(userData.emailAdd || "");
//     setActive(
//       userData.active === "Y" ? "Yes" : userData.active === "P" ? "Pending" : "No"
//     );
//     setViewCostamt(userData.viewCostamt === "Y" ? "Y" : "N");
//     setEditUprice(userData.editUprice === "Y" ? "Y" : "N");

//     setSelectedUser(userData);
//     setIsEditing(true);

//     // Smooth scroll to top when retrieving an item
//     window.scrollTo({
//       top: 0,
//       behavior: "smooth",
//     });
//   };

//   const startNew = () => {
//     resetForm();
//     setIsEditing(true);
//     setTimeout(() => {
//       codeInputRef.current?.focus();
//     }, 50);

//     // Smooth scroll to top when clicking Add
//     window.scrollTo({
//       top: 0,
//       behavior: "smooth",
//     });
//   };

//   const handleResetPassword = async () => {
//     if (!selectedUser?.userCode) {
//       await useSwalErrorAlert(null, "Please select a user to reset password.");
//       return;
//     }

//     const confirmRes = await useSwalDeleteConfirm(
//       "Reset Password",
//       `Are you sure you want to reset the password for ${selectedUser.userName}?`,
//       "Yes, reset it"
//     );

//     if (!confirmRes?.isConfirmed) return;

//     try {
//       const { data } = await apiClient.post("/users/request-password-reset", {
//         userCode: selectedUser.userCode,
//       });

//       if (data?.status === "success") {
//         await useSwalSuccessAlert(
//           "Success",
//           "Password reset link has been emailed to the user."
//         );
//       } else {
//         await useSwalErrorAlert(null, data?.message || "Failed to send the reset email.");
//       }
//     } catch (error) {
//       console.error("Password reset error:", error);
//       const msg =
//         error?.response?.data?.message || error.message || "Request failed.";
//       await useSwalErrorAlertAPI(null, msg);
//     }
//   };

//   const handleReleaseAccount = async () => {
//     if (!selectedUser?.userCode) {
//       await useSwalErrorAlert(null, "Please select a user to approve account.");
//       return;
//     }

//     const confirmRes = await useSwalDeleteConfirm(
//       "Approve Account",
//       `Are you sure you want to approve the account for ${selectedUser.userName}?`,
//       "Yes, approve it"
//     );

//     if (!confirmRes?.isConfirmed) return;

//     try {
//       const { data } = await apiClient.post("/users/approve", {
//         userCode: selectedUser.userCode,
//         mode: "release",
//       });

//       if (data?.status === "success") {
//         await useSwalSuccessAlert(
//           "Success",
//           "Account approved. A password setup link has been sent."
//         );

//         setActiveTab("active");
//         setSelectedUser(null);
//         setIsEditing(false);

//         await queryClient.invalidateQueries({ queryKey: ["users"] });
//         await refetchUsers();
//       } else {
//         await useSwalErrorAlert(null, data?.message || "Approval failed.");
//       }
//     } catch (error) {
//       await useSwalErrorAlertAPI(
//         null,
//         error?.response?.data?.message || error.message || "Approval failed."
//       );
//     }
//   };

//   const handleExport = async (format) => {
//     setOpenExport(false);

//     try {
//       const payload = {
//         json_data: {
//           filter:
//             activeTab === "active"
//               ? "Active"
//               : activeTab === "pending"
//                 ? "Pending"
//                 : "Inactive",
//         },
//         format,
//       };

//       const response = await apiClient.post("/users/export", payload, {
//         responseType: "blob",
//       });

//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement("a");
//       link.href = url;

//       const ext = format === "excel" ? "xlsx" : format;
//       const fileName = `users_export_${format}_${new Date()
//         .toISOString()
//         .slice(0, 10)}.${ext}`;

//       link.setAttribute("download", fileName);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error(`Error exporting to ${format}:`, error);
//       await useSwalErrorAlertAPI(null, `Failed to export to ${format.toUpperCase()}`);
//     }
//   };

//   const handlePDFGuide = () => {
//     if (pdfLink) window.open(pdfLink, "_blank");
//     setOpenGuide(false);
//   };

//   const handleVideoGuide = () => {
//     if (videoLink) window.open(videoLink, "_blank");
//     setOpenGuide(false);
//   };

//   const tableRows = useMemo(() => {
//     return users
//       .filter((u) =>
//         activeTab === "active"
//           ? u.active === "Y"
//           : activeTab === "pending"
//             ? u.active === "P"
//             : u.active === "N"
//       )
//       .map((u) => ({
//         ...u,
//         activeLabel: activeLabel(u.active),
//         branchDisplay: u.branchName || u.branchCode || "-",
//         rcDisplay: u.rcName || u.rcCode || "-",
//         userTypeDisplay: USER_TYPE_MAP[u.userType] ?? u.userType ?? "-",
//       }));
//   }, [users, activeTab]);

//   const [isMobile, setIsMobile] = useState(false);
//   const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
//   const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
//   const [selectedMobileRow, setSelectedMobileRow] = useState(null);

//   useEffect(() => {
//     const checkMobile = () => setIsMobile(window.innerWidth < 768);
//     checkMobile();
//     window.addEventListener("resize", checkMobile);
//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   const openMobileActionSheet = (row) => {
//     setSelectedMobileRow(row);
//     setIsMobileActionSheetMounted(true);
//     requestAnimationFrame(() => {
//       setIsMobileActionSheetOpen(true);
//     });
//   };

//   const closeMobileActionSheet = () => {
//     setIsMobileActionSheetOpen(false);
//     setTimeout(() => {
//       setIsMobileActionSheetMounted(false);
//       setSelectedMobileRow(null);
//     }, 300);
//   };

//   const tableColumns = useMemo(() => {
//     return [
//       {
//         key: "actions",
//         label: <span className="hidden md:inline">Actions</span>,
//         className: "w-[180px] min-w-[180px] text-center",
//         render: (row) => (
//           <div className="flex gap-1 justify-center w-full">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 if (isMobile) {
//                   openMobileActionSheet(row);
//                 } else {
//                   handleEditUser(row);
//                 }
//               }}
//               title="Edit"
//               className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
//             >
//               <FontAwesomeIcon icon={faEdit} />
//               <span className="md:hidden">Edit</span>
//             </button>

//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 if (isMobile) {
//                   openMobileActionSheet(row);
//                 } else {
//                   setSelectedUser(row);
//                   setShowUserRoleModal(true);
//                 }
//               }}
//               title="Set Role"
//               className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
//             >
//               <FontAwesomeIcon icon={faUserShield} />
//               <span className="md:hidden">Set Role</span>
//             </button>

//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 if (isMobile) {
//                   openMobileActionSheet(row);
//                 } else {
//                   setSelectedUser(row);
//                   handleDeleteUser(row);
//                 }
//               }}
//               title="Delete"
//               className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
//             >
//               <FontAwesomeIcon icon={faTrashAlt} />
//               <span className="md:hidden">Delete</span>
//             </button>
//           </div>
//         ),
//       },
//       {
//         key: "userCode",
//         label: "User ID",
//         sortable: true,
//         className: "w-[110px] min-w-[110px]",
//       },
//       {
//         key: "userName",
//         label: "User Name",
//         sortable: true,
//         className: "w-[160px] min-w-[160px]",
//       },
//       {
//         key: "userTypeDisplay",
//         label: "User Type",
//         sortable: true,
//         className: "w-[180px] min-w-[180px]",
//       },
//       {
//         key: "branchDisplay",
//         label: "Branch",
//         sortable: true,
//         className: "w-[140px] min-w-[140px]",
//       },
//       {
//         key: "rcDisplay",
//         label: "Department",
//         sortable: true,
//         className: "w-[160px] min-w-[160px]",
//       },
//       {
//         key: "position",
//         label: "Position",
//         sortable: true,
//         className: "w-[140px] min-w-[140px]",
//       },
//       {
//         key: "emailAdd",
//         label: "Email Address",
//         sortable: true,
//         className: "min-w-[180px] max-w-[220px]",
//         render: (row) => (
//           <span
//             className="block truncate max-w-[200px]"
//             title={row.emailAdd || ""}
//           >
//             {row.emailAdd || ""}
//           </span>
//         ),
//       },
//       {
//         key: "activeLabel",
//         label: "Active",
//         sortable: true,
//         className: "w-[70px] min-w-[70px] text-center overflow-hidden",
//       },
//     ];
//   }, [selectedUser, activeTab, users, isMobile]);

//   const userTypeSelectValue = userType === "" ? "__none__" : userType;
//   const handleUserTypeChange = (v) => setUserType(v === "__none__" ? "" : v);

//   return (
//     <motion.div
//       className="global-ref-main-div-ui mt-24"
//       initial={{ opacity: 0, y: 12 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.22, ease: "easeOut" }}
//     >
//       {showSpinner && <LoadingSpinner />}

//       {branchModalOpen && (
//         <BranchLookupModal
//           isOpen={branchModalOpen}
//           onClose={handleCloseBranchModal}
//         />
//       )}

//       {rcModalOpen && (
//         <RCLookupModal isOpen={rcModalOpen} onClose={handleCloseRCModal} />
//       )}

//       {showUserRoleModal && selectedUser && (
//         <UserRoleModal
//           isOpen={showUserRoleModal}
//           user={selectedUser}
//           onClose={() => setShowUserRoleModal(false)}
//         />
//       )}

//       <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
//         <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto">
//           <h1 className="global-ref-headertext-ui text-center sm:text-left">{documentTitle}</h1>
//         </div>

//         <div className="flex gap-2 justify-center sm:justify-end text-xs flex-wrap">
//           <button
//             onClick={startNew}
//             title="Add"
//             className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
//           >
//             <FontAwesomeIcon icon={faPlus} />
//             <span className="hidden sm:inline">Add</span>
//           </button>

//           <button
//             onClick={handleSaveUser}
//             title="Save (Ctrl+S)"
//             className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
//               }`}
//             disabled={!isEditing || saving}
//           >
//             <FontAwesomeIcon icon={faSave} />
//             <span className="hidden sm:inline">Save</span>
//           </button>

//           <button
//             onClick={resetForm}
//             title="Reset"
//             className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
//             disabled={saving}
//           >
//             <FontAwesomeIcon icon={faUndo} />
//             <span className="hidden sm:inline">Reset</span>
//           </button>

//           <div ref={guideRef} className="relative">
//             <button
//               onClick={() => setOpenGuide((v) => !v)}
//               title="Info"
//               className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
//             >
//               <FontAwesomeIcon icon={faInfoCircle} />
//               <span className="hidden sm:inline">Info</span>
//               <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline text-xs" />
//             </button>

//             {isOpenGuide && (
//               <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
//                 <button
//                   onClick={handlePDFGuide}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
//                   User Guide
//                 </button>
//                 <button
//                   onClick={handleVideoGuide}
//                   className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
//                 >
//                   <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" />
//                   Video Guide
//                 </button>
//               </div>
//             )}
//           </div>

          
//             <button
//               onClick={handleResetPassword}
//               title="Reset Password"
//               className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${!selectedUser || selectedUser.active !== "Y" ? "opacity-50 cursor-not-allowed" : ""
//                 }`}
//               disabled={!selectedUser || selectedUser.active !== "Y"}
//             >
//               <FontAwesomeIcon icon={faKey} />
//               <span className="hidden sm:inline">Reset Password</span>
//             </button>
          

//           {selectedUser && selectedUser.active === "P" && (
//             <button
//               onClick={handleReleaseAccount}
//               title="Approve"
//               className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
//             >
//               <FontAwesomeIcon icon={faUsers} />
//               <span className="hidden sm:inline">Approve</span>
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="global-tran-tab-div-ui">
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={selectedUser?.userCode || "new-user-form"}
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             transition={{ duration: 0.2, ease: "easeOut" }}
//             className="grid grid-cols-1 md:grid-cols-3 gap-6"
//           >
//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 label="User ID"
//                 required
//                 value={userId}
//                 inputRef={codeInputRef}
//                 onChange={(v) => setUserId(v ?? "")}
//                 onBlur={handleCheckDuplicate}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     handleCheckDuplicate();
//                   }
//                 }}
//                 disabled={!isEditing || !!selectedUser}
//                 maxLength={10}
//               />

//               <FieldRenderer
//                 id="userName"
//                 name="userName"
//                 label="User Name"
//                 required
//                 value={userName}
//                 onChange={(v) => setUserName(v ?? "")}
//                 disabled={!isEditing}
//                 maxLength={100}
//               />

//               <FieldRenderer
//                 id="userType"
//                 name="userType"
//                 label="User Type"
//                 required
//                 type="select"
//                 value={userTypeSelectValue}
//                 onChange={handleUserTypeChange}
//                 disabled={!isEditing}
//                 options={userTypeOptions}
//               />

//               <FieldRenderer
//                 id="active"
//                 name="active"
//                 label="Active?"
//                 type="select"
//                 value={active}
//                 onChange={(v) => setActive(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Yes", label: "Yes" },
//                   { value: "Pending", label: "Pending" },
//                   { value: "No", label: "No" },
//                 ]}
//               />
//             </div>

//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 id="branchName"
//                 name="branchName"
//                 label="Branch"
//                 type="lookup"
//                 value={branchName || ""}
//                 onChange={() => { }}
//                 onLookup={handleOpenBranchModal}
//                 disabled={!isEditing}
//                 readOnly
//               />

//               <FieldRenderer
//                 id="rcName"
//                 name="rcName"
//                 label="Department"
//                 type="lookup"
//                 value={rcName || ""}
//                 onChange={() => { }}
//                 onLookup={handleOpenRCModal}
//                 disabled={!isEditing}
//                 readOnly
//               />

//               <FieldRenderer
//                 id="position"
//                 name="position"
//                 label="Position"
//                 value={position}
//                 onChange={(v) => setPosition(v ?? "")}
//                 disabled={!isEditing}
//                 maxLength={100}
//               />

//               <FieldRenderer
//                 id="emailAdd"
//                 required
//                 name="emailAdd"
//                 label="Email Address"
//                 type="text"
//                 value={emailAdd}
//                 onChange={(v) => setEmailAdd(v ?? "")}
//                 disabled={!isEditing}
//                 maxLength={100}
//               />
//             </div>

//             <div className="global-ref-textbox-group-div-ui">
//               <FieldRenderer
//                 id="viewCostamt"
//                 name="viewCostamt"
//                 label="View Cost Amount"
//                 type="select"
//                 value={viewCostamt || "N"}
//                 onChange={(v) => setViewCostamt(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Y", label: "Yes" },
//                   { value: "N", label: "No" },
//                 ]}
//               />

//               <FieldRenderer
//                 id="editUprice"
//                 name="editUprice"
//                 label="Can Edit Unit Price?"
//                 type="select"
//                 value={editUprice}
//                 onChange={(v) => setEditUprice(v ?? "")}
//                 disabled={!isEditing}
//                 options={[
//                   { value: "Y", label: "Yes" },
//                   { value: "N", label: "No" },
//                 ]}
//               />
//             </div>
//           </motion.div>
//         </AnimatePresence>
//       </div>

//       <div className="global-ref-tab-div-ui mt-6">
//         <div className="flex flex-row sm:flex-row mb-2">
//           <button
//             onClick={() => setActiveTab("active")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "active"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Active Users
//           </button>

//           <button
//             onClick={() => setActiveTab("pending")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "pending"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Pending Users
//           </button>

//           <button
//             onClick={() => setActiveTab("inactive")}
//             className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "inactive"
//               ? "bg-blue-600 text-white"
//               : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//           >
//             Inactive Users
//           </button>
//         </div>

//         <motion.div
//           className="global-ref-table-main-div-ui"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.2 }}
//         >
//           <div className="global-ref-table-main-div-ui">
//             <div className="w-full overflow-x-auto">
//               <SearchGlobalReferenceTable
//                 title={`${documentTitle} - ${activeTab === "active"
//                   ? "Active Users"
//                   : activeTab === "pending"
//                     ? "Pending Users"
//                     : "Inactive Users"
//                   }`}
//                 data={tableRows}
//                 columns={tableColumns}
//                 loading={loading}
//                 onRowDoubleClick={handleEditUser}
//                 onRowClick={handleEditUser}
//                 docType="User"
//                 defaultPageSize={10}
//                 pageSizeOptions={[10, 20, 50, 100]}
//                 searchPlaceholder="Search users..."
//                 emptyMessage="No users found"
//                 fileName={`users_${activeTab}`}
//                 enableExport={true}
//                 enableColumnToggle={true}
//                 enableColumnGrouping={true}
//               />
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Mobile Action Sheet */}
//       {isMobileActionSheetMounted && (
//         <div className="fixed inset-0 z-[120] md:hidden">
//           <div
//             className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
//               }`}
//             onClick={closeMobileActionSheet}
//           />

//           <div
//             className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
//               }`}
//           >
//             <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

//             <div className="mb-3">
//               <h2 className="text-sm font-bold text-gray-800">User Actions</h2>
//               <p className="text-xs text-gray-500">
//                 {selectedMobileRow?.userCode}
//                 {selectedMobileRow?.userName ? ` - ${selectedMobileRow.userName}` : ""}
//               </p>
//             </div>

//             <div className="space-y-2">
//               <button
//                 onClick={() => {
//                   handleEditUser(selectedMobileRow);
//                   closeMobileActionSheet();
//                 }}
//                 className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
//               >
//                 <FontAwesomeIcon icon={faEdit} />
//                 Edit
//               </button>

//               <button
//                 onClick={() => {
//                   setSelectedUser(selectedMobileRow);
//                   setShowUserRoleModal(true);
//                   closeMobileActionSheet();
//                 }}
//                 className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
//               >
//                 <FontAwesomeIcon icon={faUserShield} />
//                 Set Role
//               </button>

//               <button
//                 onClick={() => {
//                   setSelectedUser(selectedMobileRow);
//                   handleDeleteUser(selectedMobileRow);
//                   closeMobileActionSheet();
//                 }}
//                 className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 py-3 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
//               >
//                 <FontAwesomeIcon icon={faTrashAlt} />
//                 Delete
//               </button>

//               <button
//                 onClick={closeMobileActionSheet}
//                 className="w-full rounded-lg bg-gray-100 text-gray-700 py-3 text-sm font-medium"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </motion.div>
//   );
// };

// export default UpdateUser;
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
import UserRoleModal from "@/NAYSA Cloud/Lookup/SetUserRole";
import LoginPassPolicy from "@/NAYSA Cloud/Lookup/LoginPassPolicy";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPlus,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faSave,
  faUndo,
  faUsers,
  faKey,
  faInfoCircle,
  faVideo,
  faUserShield,
  faShieldHalved,
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

// ─── User Type Map ────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

const UpdateUser = () => {
  const docType = "UserUpdate";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [rcCode, setRcCode] = useState("");
  const [rcName, setRcName] = useState("");
  const [rcModalOpen, setRcModalOpen] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [showLoginPolicyModal, setShowLoginPolicyModal] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [position, setPosition] = useState("");
  const [emailAdd, setEmailAdd] = useState("");
  const [viewCostamt, setViewCostamt] = useState("N");
  const [editUprice, setEditUprice] = useState("N");
  const [active, setActive] = useState("Yes");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const [showSpinner, setShowSpinner] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const exportRef = useRef(null);
  const guideRef = useRef(null);
  const codeInputRef = useRef(null);
  const formRef = useRef(null); // Added formRef for perfect panning

  const currentUserCode =
    user?.USER_CODE || user?.userCode || user?.code || "SYSTEM";

  // Normalize userType to single-letter code regardless of what auth stores.
  // Covers camelCase (userType), snake_case (user_type), and UPPER variants,
  // plus full-label values like "Security Administrator".
  const rawUserType =
    user?.userType     ||
    user?.USER_TYPE    ||
    user?.user_type    ||
    user?.usertype     ||
    "";
  const currentUserType = (() => {
    const t = rawUserType.trim().toUpperCase();
    if (t === "S" || t === "SYSTEM ADMINISTRATOR")   return "S";
    if (t === "X" || t === "SECURITY ADMINISTRATOR") return "X";
    if (t === "M" || t === "MANAGEMENT")             return "M";
    if (t === "R" || t === "REGULAR")                return "R";
    return t;
  })();

  const activeLabel = (code) => {
    if (code === "Y") return "Yes";
    if (code === "P") return "Pending";
    if (code === "N") return "No";
    return "-";
  };

  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users", activeTab],
    queryFn: async () => {
      const { data } = await apiClient.get("/load", {
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
          } catch (parseError) {
            console.error("Error parsing JSON result:", parseError);
            userData = [];
          }
        }
      } else if (data?.result) {
        try {
          userData = JSON.parse(data.result);
        } catch (parseError) {
          console.error("Error parsing JSON result:", parseError);
          userData = [];
        }
      } else if (Array.isArray(data)) {
        userData = data;
      }

      if (!Array.isArray(userData)) return [];

      const filteredUsers = userData.filter(
        (u) =>
          u &&
          (u.userCode ||
            u.userName ||
            u.userType ||
            u.emailAdd ||
            u.branchCode ||
            u.position ||
            u.rcCode ||
            u.active ||
            u.viewCostamt ||
            u.editUprice)
      );

      return filteredUsers.map((u) => ({
        ...u,
        branchName:
          u.branchName ?? u.b?.branchName ?? u.b?.branchname ?? u.branchCode ?? "",
        rcName: u.rcName ?? u.c?.rcName ?? u.c?.rcname ?? u.rcCode ?? "",
      }));
    },
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle incoming links from the Admin Email Notification
  useEffect(() => {
    const targetTab = searchParams.get("tab");
    const targetUser = searchParams.get("userCode");

    if (targetTab === "pending" && activeTab !== "pending") {
      setActiveTab("pending");
    }

    if (targetUser && users.length > 0) {
      const foundUser = users.find((u) => u.userCode === targetUser);

      if (foundUser && selectedUser?.userCode !== targetUser) {
        handleEditUser(foundUser);
        searchParams.delete("userCode");
        searchParams.delete("tab");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, users, activeTab, selectedUser]);

  // Fetch password policy (maxLog) once on mount
  useEffect(() => {
    apiClient
      .get("/security/policy")
      .then(({ data }) => {
        if (data?.success && data?.data) setPolicy(data.data);
      })
      .catch(() => {});
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ payload }) => {
      return apiClient.post("/users/upsert", payload);
    },

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
        // Using "" safely removes the title without printing "null"
        // errormsg comes directly from your backend with the <b> tags
        await useSwalErrorAlert("", errormsg);
        return;
      }

      const isNewRecord = variables.isNewRecord;

      if (isNewRecord && active === "Yes") {
        try {
          await apiClient.post("/users/approve", {
            userCode: userId.trim(),
            mode: "admin_add",
          });
        } catch (e) {
          console.warn("Temp password email failed:", e);
        }
      }

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
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Error saving user.";

      await useSwalErrorAlertAPI("", msg);
    },
  });

  const handleCheckDuplicate = async () => {
    if (isEditing && selectedUser?.userCode === userId.trim()) return;

    if (!userId?.trim()) return;

    try {
      const payload = {
        json_data: { userCode: userId.trim() },
        userCode: userId.trim()
      };

      const { data } = await apiClient.post("/users/checkduplicate", payload);

      const firstRow = data?.data?.[0] || {};
      const rawResult = firstRow?.result ?? Object.values(firstRow)[0] ?? data?.result ?? "";

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
        setTimeout(() => {
          codeInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("Duplicate check failed:", error);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (targetUser) => {
      return apiClient.post("/users/delete", {
        userCode: targetUser.userCode,
        doneBy:    currentUserCode, 
      });
    },
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
        parsed = typeof resultText === "string" ? JSON.parse(resultText) : resultText;
      } catch {
        parsed = raw;
      }

      const message =
        parsed?.message ||
        raw?.message ||
        raw?.data?.message ||
        "User delete operation completed.";

      await useSwalDeleteRecord("Success", message);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      resetForm();
    },
    onError: async (error) => {
      console.error("Delete error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.details ||
        error?.message ||
        "Failed to delete user.";

      await useSwalErrorAlertAPI("Error", errorMsg);
    },
  });

  const saving = saveMutation.isPending || deleteMutation.isPending;
  const loading = usersLoading;

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideExport =
        exportRef.current && !exportRef.current.contains(event.target);
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);

      if (clickedOutsideExport) setOpenExport(false);
      if (clickedOutsideGuide) setOpenGuide(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) {
          handleSaveUser();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    saving,
    isEditing,
    userId,
    userName,
    userType,
    branchCode,
    rcCode,
    viewCostamt,
    editUprice,
    active,
    position,
    emailAdd,
    selectedUser,
  ]);

  // Spinner is now strictly tied to loading data, not saving/deleting
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSpinner(true), 200);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleOpenBranchModal = () => {
    if (isEditing) setBranchModalOpen(true);
  };

  const handleCloseBranchModal = (selectedBranch = null) => {
    setBranchModalOpen(false);
    if (selectedBranch) {
      setBranchCode(selectedBranch.branchCode || "");
      setBranchName(selectedBranch.branchName || "");
    }
  };

  const handleOpenRCModal = () => {
    if (isEditing) setRcModalOpen(true);
  };

  const handleCloseRCModal = (selectedRC = null) => {
    setRcModalOpen(false);
    if (selectedRC) {
      setRcCode(selectedRC.rcCode || "");
      setRcName(selectedRC.rcName || "");
    }
  };

  const resetForm = () => {
    setUserId("");
    setUserName("");
    setUserType("");
    setBranchCode("");
    setBranchName("");
    setRcCode("");
    setRcName("");
    setPosition("");
    setEmailAdd("");
    setActive("Yes");
    setViewCostamt("N");
    setEditUprice("N");
    setSelectedUser(null);
    setIsEditing(false);
  };

  const handleSaveUser = async () => {
    // --- EMAIL VALIDATION BLOCK ---
    const trimmedEmail = emailAdd.trim();
    if (trimmedEmail !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        await useSwalErrorAlert(
          "",
          "<b>Invalid Input</b><br/>Please enter a valid email address."
        );
        return; // Stop saving
      }
    }

    const payload = {
      json_data: {
        userCode: userId.trim(),
        userName: userName.trim(),
        emailAdd: trimmedEmail,
        userType: userType || "",
        branchCode: branchCode || "",
        rcCode: rcCode || "",
        viewCostamt: viewCostamt || "N",
        editUprice: editUprice || "N",
        active: active === "Yes" ? "Y" : active === "Pending" ? "P" : "N",
        position: position ? position.trim() : "",
        doneBy: currentUserCode, 
      },
    };

    saveMutation.mutate({
      payload,
      isNewRecord: !selectedUser,
    });
  };

  const handleDeleteUser = async (userToDelete = null) => {
    const targetUser = userToDelete || selectedUser;

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

  const handleEditUser = async (rowUser) => {
    let userData = rowUser;

    if (rowUser.active === "P") setActiveTab("pending");
    if (rowUser.active === "Y") setActiveTab("active");
    if (rowUser.active === "N") setActiveTab("inactive");

    if (
      (!rowUser.branchName && rowUser.branchCode) ||
      (!rowUser.rcName && rowUser.rcCode)
    ) {
      try {
        const { data } = await apiClient.get("/get", {
          params: { userCode: rowUser.userCode },
        });

        let fullUserData = null;

        if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
          const parsedResult = JSON.parse(data.data[0].result);
          if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            fullUserData = parsedResult[0];
          }
        } else if (data?.result) {
          const parsedResult = JSON.parse(data.result);
          if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            fullUserData = parsedResult[0];
          }
        }

        if (fullUserData) {
          userData = { ...rowUser, ...fullUserData };
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    }

    setUserId(userData.userCode || "");
    setUserName(userData.userName || "");
    setUserType(userData.userType || "");
    setBranchCode(userData.branchCode || "");
    setBranchName(userData.branchName || "");
    setRcCode(userData.rcCode || "");
    setRcName(userData.rcName || "");
    setPosition(userData.position || "");
    setEmailAdd(userData.emailAdd || "");
    setActive(
      userData.active === "Y" ? "Yes" : userData.active === "P" ? "Pending" : "No"
    );
    setViewCostamt(userData.viewCostamt === "Y" ? "Y" : "N");
    setEditUprice(userData.editUprice === "Y" ? "Y" : "N");

    setSelectedUser(userData);
    setIsEditing(true);

    // Smooth pan to form section
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const startNew = () => {
    resetForm();
    setIsEditing(true);
    setTimeout(() => {
      codeInputRef.current?.focus();
      
      // Smooth pan to form section
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const handleResetPassword = async () => {
    if (!selectedUser?.userCode) {
      await useSwalErrorAlert("", "Please select a user to reset password.");
      return;
    }

    const confirmRes = await useSwalDeleteConfirm(
      "Reset Password",
      `Are you sure you want to reset the password for ${selectedUser.userName}?`,
      "Yes, reset it"
    );

    if (!confirmRes?.isConfirmed) return;

    try {
      const { data } = await apiClient.post("/users/request-password-reset", {
        userCode: selectedUser.userCode,
      });

      if (data?.status === "success") {
        await useSwalSuccessAlert(
          "Success",
          "Password reset link has been emailed to the user."
        );
      } else {
        await useSwalErrorAlert("", data?.message || "Failed to send the reset email.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      const msg =
        error?.response?.data?.message || error.message || "Request failed.";
      await useSwalErrorAlertAPI("", msg);
    }
  };

  const handleUnlockAccount = async () => {
    if (!selectedUser?.userCode) return;

    const confirmRes = await useSwalDeleteConfirm(
      "Release Locked Account",
      `Release the locked account for <strong>${selectedUser.userName}</strong>?<br/>
       The user will receive an email with a password reset link.`,
      "Yes, release it"
    );

    if (!confirmRes?.isConfirmed) return;

    try {
      const { data } = await apiClient.post("/users/release-locked", {
        userCode: selectedUser.userCode,
        doneBy:   currentUserCode,
      });

      if (data?.status === "success") {
        await useSwalSuccessAlert(
          "Account Released",
          `The account for <strong>${selectedUser.userName}</strong> has been unlocked.<br/>
           A password reset link has been sent to their email address.`
        );
        setActiveTab("active");
        setSelectedUser(null);
        setIsEditing(false);
        await queryClient.invalidateQueries({ queryKey: ["users"] });
        await refetchUsers();
      } else {
        await useSwalErrorAlert("", data?.message || "Release failed.");
      }
    } catch (error) {
      await useSwalErrorAlertAPI(
        "",
        error?.response?.data?.message || error.message || "Release failed."
      );
    }
  };

  const handleReleaseAccount = async () => {
    if (!selectedUser?.userCode) {
      await useSwalErrorAlert("", "Please select a user to approve account.");
      return;
    }

    const confirmRes = await useSwalDeleteConfirm(
      "Approve Account",
      `Are you sure you want to approve the account for ${selectedUser.userName}?`,
      "Yes, approve it"
    );

    if (!confirmRes?.isConfirmed) return;

    try {
      const { data } = await apiClient.post("/users/approve", {
        userCode: selectedUser.userCode,
        mode: "release",
      });

      if (data?.status === "success") {
        await useSwalSuccessAlert(
          "Success",
          "Account approved. A password setup link has been sent."
        );

        setActiveTab("active");
        setSelectedUser(null);
        setIsEditing(false);

        await queryClient.invalidateQueries({ queryKey: ["users"] });
        await refetchUsers();
      } else {
        await useSwalErrorAlert("", data?.message || "Approval failed.");
      }
    } catch (error) {
      await useSwalErrorAlertAPI(
        "",
        error?.response?.data?.message || error.message || "Approval failed."
      );
    }
  };

  const handleExport = async (format) => {
    setOpenExport(false);

    try {
      const payload = {
        json_data: {
          filter:
            activeTab === "active"
              ? "Active"
              : activeTab === "pending"
                ? "Pending"
                : "Inactive",
        },
        format,
      };

      const response = await apiClient.post("/users/export", payload, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const ext = format === "excel" ? "xlsx" : format;
      const fileName = `users_export_${format}_${new Date()
        .toISOString()
        .slice(0, 10)}.${ext}`;

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      await useSwalErrorAlertAPI("", `Failed to export to ${format.toUpperCase()}`);
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
      .filter((u) =>
        activeTab === "active"
          ? u.active === "Y"
          : activeTab === "pending"
            ? u.active === "P"
            : u.active === "N"
      )
      .map((u) => ({
        ...u,
        stat:            u.stat ?? 0,
        activeLabel:     activeLabel(u.active),
        branchDisplay:   u.branchName || u.branchCode || "-",
        rcDisplay:       u.rcName || u.rcCode || "-",
        userTypeDisplay: USER_TYPE_MAP[u.userType] ?? u.userType ?? "-",
        // True when account was locked by exceeding max login attempts
        isLocked:        u.active === "N" && (u.stat ?? 0) > 0,
      }));
  }, [users, activeTab]);

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);
    requestAnimationFrame(() => {
      setIsMobileActionSheetOpen(true);
    });
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);
    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  const tableColumns = useMemo(() => {
    return [
      {
        key: "actions",
        label: <span className="hidden md:inline">Actions</span>,
        className: "w-[180px] min-w-[180px] text-center",
        render: (row) => (
          <div className="flex gap-1 justify-center w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  handleEditUser(row);
                }
              }}
              title="Edit"
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  setSelectedUser(row);
                  setShowUserRoleModal(true);
                }
              }}
              title="Set Role"
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faUserShield} />
              <span className="md:hidden">Set Role</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  setSelectedUser(row);
                  handleDeleteUser(row);
                }
              }}
              title="Delete"
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
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
        className: "w-[160px] min-w-[160px]",
      },
      {
        key: "userTypeDisplay",
        label: "User Type",
        sortable: true,
        className: "w-[180px] min-w-[180px]",
      },
      {
        key: "branchDisplay",
        label: "Branch",
        sortable: true,
        className: "w-[140px] min-w-[140px]",
      },
      {
        key: "rcDisplay",
        label: "Department",
        sortable: true,
        className: "w-[160px] min-w-[160px]",
      },
      {
        key: "position",
        label: "Position",
        sortable: true,
        className: "w-[140px] min-w-[140px]",
      },
      {
        key: "emailAdd",
        label: "Email Address",
        sortable: true,
        className: "min-w-[180px] max-w-[220px]",
        render: (row) => (
          <span
            className="block truncate max-w-[200px]"
            title={row.emailAdd || ""}
          >
            {row.emailAdd || ""}
          </span>
        ),
      },
      {
        key: "activeLabel",
        label: "Active",
        sortable: true,
        className: "w-[70px] min-w-[70px] text-center overflow-hidden",
      },
      {
        key: "isLocked",
        label: "Status",
        sortable: false,
        className: "w-[90px] min-w-[90px] text-center",
        render: (row) => {
          if (row.active === "Y") return null;
          if (row.active === "P") return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
              Pending
            </span>
          );
          return row.isLocked ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
              <FontAwesomeIcon icon={faLockOpen} className="text-[10px]" />
              Locked
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
              Inactive
            </span>
          );
        },
      },
    ];
  }, [selectedUser, activeTab, users, isMobile]);

  const userTypeSelectValue = userType === "" ? "__none__" : userType;
  const handleUserTypeChange = (v) => setUserType(v === "__none__" ? "" : v);

  return (
    <motion.div
      className="global-ref-main-div-ui mt-24"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {showSpinner && <LoadingSpinner />}

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {rcModalOpen && (
        <RCLookupModal isOpen={rcModalOpen} onClose={handleCloseRCModal} />
      )}

      {showUserRoleModal && selectedUser && (
        <UserRoleModal
          isOpen={showUserRoleModal}
          user={selectedUser}
          onClose={() => setShowUserRoleModal(false)}
        />
      )}

      {showLoginPolicyModal && (
        <LoginPassPolicy
          isOpen={showLoginPolicyModal}
          onClose={() => setShowLoginPolicyModal(false)}
        />
      )}

      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui text-center sm:text-left">{documentTitle}</h1>
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
            className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!isEditing || saving}
          >
            <FontAwesomeIcon icon={faSave} />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={resetForm}
            title="Reset"
            className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            disabled={saving}
          >
            <FontAwesomeIcon icon={faUndo} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              title="Info"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              <span className="hidden sm:inline">Info</span>
              <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline text-xs" />
            </button>

            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={handlePDFGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                  User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" />
                  Video Guide
                </button>
              </div>
            )}
          </div>

          {["S", "X"].includes(currentUserType) && (
            <button
              onClick={handleResetPassword}
              title="Reset Password"
              className={`bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all ${!selectedUser || selectedUser.active !== "Y" ? "opacity-50 cursor-not-allowed" : ""
                }`}
              disabled={!selectedUser || selectedUser.active !== "Y"}
            >
              <FontAwesomeIcon icon={faKey} />
              <span className="hidden sm:inline">Reset Password</span>
            </button>
          )}

          {currentUserType === "X" &&
            selectedUser &&
            selectedUser.active === "N" &&
            policy?.maxLog > 0 &&
            (selectedUser.stat ?? 0) >= policy.maxLog && (
            <button
              onClick={handleUnlockAccount}
              title="Release Locked Account"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faLockOpen} />
              <span className="hidden sm:inline">Release Account</span>
            </button>
          )}

          {currentUserType === "X" && (
            <button
              onClick={() => setShowLoginPolicyModal(true)}
              title="Login / Password Policy"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faShieldHalved} />
              <span className="hidden sm:inline">Login / Password Policy</span>
            </button>
          )}

          {currentUserType === "X" && selectedUser && selectedUser.active === "P" && (
            <button
              onClick={handleReleaseAccount}
              title="Approve"
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon icon={faUsers} />
              <span className="hidden sm:inline">Approve</span>
            </button>
          )}
        </div>
      </div>

      <div ref={formRef} className="global-tran-tab-div-ui">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedUser?.userCode || "new-user-form"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="global-ref-textbox-group-div-ui">
              <FieldRenderer
                label="User ID"
                required
                value={userId}
                inputRef={codeInputRef}
                onChange={(v) => setUserId(v ?? "")}
                onBlur={handleCheckDuplicate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
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
                onChange={(v) => setUserName(v ?? "")}
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

              <FieldRenderer
                id="active"
                name="active"
                label="Active?"
                type="select"
                value={active}
                onChange={(v) => setActive(v ?? "")}
                disabled={!isEditing}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "Pending", label: "Pending" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            <div className="global-ref-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                name="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                onChange={() => { }}
                onLookup={handleOpenBranchModal}
                disabled={!isEditing}
                readOnly
              />

              <FieldRenderer
                id="rcName"
                name="rcName"
                label="Department"
                type="lookup"
                value={rcName || ""}
                onChange={() => { }}
                onLookup={handleOpenRCModal}
                disabled={!isEditing}
                readOnly
              />

              <FieldRenderer
                id="position"
                name="position"
                label="Position"
                value={position}
                onChange={(v) => setPosition(v ?? "")}
                disabled={!isEditing}
                maxLength={100}
              />

              <FieldRenderer
                id="emailAdd"
                required
                name="emailAdd"
                label="Email Address"
                type="text"
                value={emailAdd}
                onChange={(v) => setEmailAdd(v ?? "")}
                disabled={!isEditing}
                maxLength={100}
              />
            </div>

            <div className="global-ref-textbox-group-div-ui">
              <FieldRenderer
                id="viewCostamt"
                name="viewCostamt"
                label="View Cost Amount"
                type="select"
                value={viewCostamt || "N"}
                onChange={(v) => setViewCostamt(v ?? "")}
                disabled={!isEditing}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
              />

              <FieldRenderer
                id="editUprice"
                name="editUprice"
                label="Can Edit Unit Price?"
                type="select"
                value={editUprice}
                onChange={(v) => setEditUprice(v ?? "")}
                disabled={!isEditing}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="global-ref-tab-div-ui mt-6">
        <div className="flex flex-row sm:flex-row mb-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Active Users
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "pending"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Pending Users
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === "inactive"
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
          <div className="global-ref-table-main-div-ui">
            <div className="w-full overflow-x-auto">
              <SearchGlobalReferenceTable
                title={`${documentTitle} - ${activeTab === "active"
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
                fileName={`users_${activeTab}`}
                enableExport={true}
                enableColumnToggle={true}
                enableColumnGrouping={true}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Action Sheet */}
      {isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
              }`}
            onClick={closeMobileActionSheet}
          />

          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
              }`}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">User Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.userCode}
                {selectedMobileRow?.userName ? ` - ${selectedMobileRow.userName}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  handleEditUser(selectedMobileRow);
                  closeMobileActionSheet();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>

              <button
                onClick={() => {
                  setSelectedUser(selectedMobileRow);
                  setShowUserRoleModal(true);
                  closeMobileActionSheet();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faUserShield} />
                Set Role
              </button>

              <button
                onClick={() => {
                  setSelectedUser(selectedMobileRow);
                  handleDeleteUser(selectedMobileRow);
                  closeMobileActionSheet();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 py-3 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                Delete
              </button>

              <button
                onClick={closeMobileActionSheet}
                className="w-full rounded-lg bg-gray-100 text-gray-700 py-3 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default UpdateUser;