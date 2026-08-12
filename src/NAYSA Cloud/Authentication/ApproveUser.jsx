import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    FiUser,
    FiMail,
    FiShield,
    FiMapPin,
    FiBriefcase,
    FiCheck,
    FiX,
    FiSearch,
    FiChevronDown
} from "react-icons/fi";
import {
    apiClient,
    setTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// Import your Lookup Modals
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";

/* ─── Animation variants ─────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const floatAnim = {
    animate: {
        y: [0, -6, 0],
        transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
    },
};

const blob1 = {
    animate: {
        x: [0, 25, -18, 0],
        y: [0, -18, 14, 0],
        scale: [1, 1.04, 0.97, 1],
        transition: { duration: 14, repeat: Infinity, ease: "easeInOut" },
    },
};

const blob2 = {
    animate: {
        x: [0, -22, 18, 0],
        y: [0, 18, -12, 0],
        scale: [1, 1.03, 0.98, 1],
        transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
    },
};

function Spinner({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
        </svg>
    );
}

/* ─── Field wrapper ──────────────────────────────────────────────── */
function Field({ label, children }) {
    return (
        <motion.div variants={fadeUp}>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </span>
            {children}
        </motion.div>
    );
}

/* ─── Input box with animated focus underline ────────────────────── */
function InputBox({ icon: Icon, children }) {
    const [focused, setFocused] = useState(false);
    return (
        <div
            className="relative"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                <Icon
                    size={14}
                    className={focused ? "text-sky-500" : "text-slate-400"}
                    style={{ transition: "color .2s" }}
                />
            </div>
            {children}
            <motion.span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left pointer-events-none z-10"
                style={{ background: "linear-gradient(90deg,#38bdf8,#6366f1)" }}
                animate={{ scaleX: focused ? 1 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
        </div>
    );
}

const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 " +
    "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
    "transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

/* ════════════════════════════════════════════════════════════════════
   ApproveUser Component
   ════════════════════════════════════════════════════════════════════ */
const ApproveUser = () => {
    const navigate = useNavigate();
    // Read the URL only once and lock it in memory
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const userCode = (params.get("userCode") || "").trim();
    const companyFromLink = (params.get("company") || "").trim();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [form, setForm] = useState({
        userName: "",
        emailAdd: "",
        userType: "R", // Default Regular
        branchCode: "",
        branchName: "",
        rcCode: "",
        rcName: "",
        position: "",
    });

    // Modal State
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [rcModalOpen, setRcModalOpen] = useState(false);

    useEffect(() => {
        if (companyFromLink) setTenant(companyFromLink);

        // NEW: Scrub the URL completely clean so it only shows the domain
        if (window.location.search || window.location.pathname !== "/") {
            const cleanUrl = window.location.protocol + "//" + window.location.host + "/";
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [companyFromLink]);

    // Fetch User Data on Load
    useEffect(() => {
        const fetchUser = async () => {
            if (!userCode || !companyFromLink) return;
            try {
                // Corrected to strictly use USER_CODE so Laravel accepts it
                const { data } = await apiClient.get("/getUser", {
                    params: { USER_CODE: userCode },
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
                } else if (data?.data && Array.isArray(data.data)) {
                    fullUserData = data.data[0];
                }

                if (fullUserData) {
                    setForm({
                        userName: fullUserData.userName || fullUserData.USER_NAME || "",
                        emailAdd: fullUserData.emailAdd || fullUserData.EMAIL_ADD || "",
                        userType: fullUserData.userType || "R",
                        branchCode: fullUserData.branchCode || "",
                        branchName: fullUserData.branchName || "",
                        rcCode: fullUserData.rcCode || "",
                        rcName: fullUserData.rcName || "",
                        position: fullUserData.position || "",
                    });
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
                useSwalErrorAlertAPI("Error", "Failed to load user details.");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userCode, companyFromLink]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const handleApprove = async () => {
        setSaving(true);
        try {
            // 1. Save updated details first
            const upsertPayload = {
                json_data: {
                    userCode: userCode,
                    userName: form.userName.trim(),
                    emailAdd: form.emailAdd.trim(),
                    userType: form.userType,
                    branchCode: form.branchCode,
                    rcCode: form.rcCode,
                    position: form.position.trim(),
                    viewCostamt: "N",
                    editUprice: "N",
                    active: "P",
                },
            };

            await apiClient.post("/users/upsert", upsertPayload);

            // 2. Approve and trigger email
            const { data } = await apiClient.post("/users/approve", {
                userCode: userCode,
                mode: "release",
            });

            if (data?.status === "success") {
                await useSwalSuccessAlert(
                    "Approved!",
                    "Account approved. A password setup link has been sent to the user."
                );
                navigate("/", { replace: true });
            } else {
                await useSwalErrorAlert("Error", data?.message || "Approval failed.");
            }
        } catch (error) {
            useSwalErrorAlertAPI("Error", error?.response?.data?.message || "Approval failed.");
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        const confirm = await useSwalDeleteConfirm(
            "Reject User?",
            `Are you sure you want to reject and delete ${form.userName}?`,
            "Yes, reject user"
        );

        if (!confirm?.isConfirmed) return;

        setSaving(true);
        try {
            await apiClient.post("/users/delete", {
                userCode: userCode,
            });

            await useSwalSuccessAlert("Rejected", "The user registration has been rejected and removed.");
            navigate("/", { replace: true });
        } catch (error) {
            useSwalErrorAlertAPI("Error", "Failed to reject user.");
        } finally {
            setSaving(false);
        }
    };

    if (!userCode || !companyFromLink) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
                Invalid Approval Link. Missing parameters.
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10"
            style={{ background: "linear-gradient(to bottom, #7392b7, #d8e1e9)" }}
        >
            {/* Modals */}
            {branchModalOpen && (
                <BranchLookupModal
                    isOpen={branchModalOpen}
                    onClose={(selected) => {
                        setBranchModalOpen(false);
                        if (selected) {
                            setForm((s) => ({
                                ...s,
                                branchCode: selected.branchCode,
                                branchName: selected.branchName,
                            }));
                        }
                    }}
                />
            )}
            {rcModalOpen && (
                <RCLookupModal
                    isOpen={rcModalOpen}
                    onClose={(selected) => {
                        setRcModalOpen(false);
                        if (selected) {
                            setForm((s) => ({
                                ...s,
                                rcCode: selected.rcCode,
                                rcName: selected.rcName,
                            }));
                        }
                    }}
                />
            )}

            {/* Blobs */}
            <motion.div
                {...blob1}
                className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,.28) 0%, rgba(56,189,248,.18) 100%)" }}
            />
            <motion.div
                {...blob2}
                className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(168,85,247,.22) 0%, rgba(217,70,239,.18) 100%)" }}
            />

            {/* CHANGED: max-w-lg to max-w-md to match ChangePassword perfectly */}
            <div className="relative w-full max-w-md">

                {/* Logo + Title */}
                <div className="mb-5 flex flex-col items-center text-center">
                    <motion.div {...floatAnim} className="mb-2">
                        <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-40 drop-shadow-md md:w-36" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                        className="mt-1 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl"
                    >
                        NAYSA Financials Cloud
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mt-1.5 text-sm text-slate-700"
                    >
                        Review and approve pending user registration.
                    </motion.p>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full rounded-2xl p-6 md:p-7"
                    style={{
                        background: "rgba(255,255,255,0.52)",
                        border: "1px solid rgba(255,255,255,0.65)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        boxShadow: "0 20px 60px rgba(55,90,140,.18), inset 0 1px 0 rgba(255,255,255,.85)",
                    }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                            <Spinner size={32} />
                            <p className="mt-4 text-sm font-semibold">Loading User Details...</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                            className="space-y-3" // Slightly tighter vertical spacing
                        >

                            {/* CHANGED: Removed the 2-column grids so everything stacks perfectly */}

                            <Field label="User ID">
                                <InputBox icon={FiUser}>
                                    <input
                                        type="text"
                                        value={userCode}
                                        disabled
                                        className={inputCls + " bg-slate-100 opacity-70"}
                                    />
                                </InputBox>
                            </Field>

                            <Field label="User Name">
                                <InputBox icon={FiUser}>
                                    <input
                                        type="text"
                                        name="userName"
                                        value={form.userName}
                                        onChange={handleChange}
                                        className={inputCls}
                                    />
                                </InputBox>
                            </Field>

                            <Field label="Email Address">
                                <InputBox icon={FiMail}>
                                    <input
                                        type="email"
                                        name="emailAdd"
                                        value={form.emailAdd}
                                        onChange={handleChange}
                                        className={inputCls}
                                    />
                                </InputBox>
                            </Field>

                            <Field label="User Type">
                                <InputBox icon={FiShield}>
                                    <select
                                        name="userType"
                                        value={form.userType}
                                        onChange={handleChange}
                                        className={inputCls + " appearance-none cursor-pointer pr-9"}
                                    >
                                        <option value="R">Regular</option>
                                        <option value="M">Management</option>
                                        <option value="S">System Administrator</option>
                                        <option value="X">Security Administrator</option>
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                                        <FiChevronDown size={14} />
                                    </span>
                                </InputBox>
                            </Field>

                            <Field label="Position">
                                <InputBox icon={FiBriefcase}>
                                    <input
                                        type="text"
                                        name="position"
                                        value={form.position}
                                        onChange={handleChange}
                                        className={inputCls}
                                        placeholder="e.g. Accountant"
                                    />
                                </InputBox>
                            </Field>

                            <Field label="Branch">
                                <div onClick={() => setBranchModalOpen(true)}>
                                    <InputBox icon={FiMapPin}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.branchName || form.branchCode || ""}
                                            placeholder="Select Branch..."
                                            className={inputCls + " cursor-pointer bg-slate-50 hover:bg-slate-100"}
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sky-500 z-10">
                                            <FiSearch size={14} />
                                        </span>
                                    </InputBox>
                                </div>
                            </Field>

                            <Field label="Department">
                                <div onClick={() => setRcModalOpen(true)}>
                                    <InputBox icon={FiMapPin}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={form.rcName || form.rcCode || ""}
                                            placeholder="Select Department..."
                                            className={inputCls + " cursor-pointer bg-slate-50 hover:bg-slate-100"}
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sky-500 z-10">
                                            <FiSearch size={14} />
                                        </span>
                                    </InputBox>
                                </div>
                            </Field>

                            {/* Action Buttons */}
                            <motion.div variants={fadeUp} className="pt-3 flex gap-3">
                                {/* Primary Blue Gradient Approve Button (Matches ChangePassword) */}
                                <motion.button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={saving}
                                    whileHover={!saving ? { y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" } : {}}
                                    whileTap={!saving ? { y: 0 } : {}}
                                    className="w-2/3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
                                >
                                    {saving ? <Spinner size={16} /> : <FiCheck size={16} />}
                                    Approve User
                                </motion.button>
                                {/* Neutral Slate Reject Button */}
                                <motion.button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={saving}
                                    whileHover={!saving ? { y: -1, boxShadow: "0 4px 14px rgba(148,163,184,.25)" } : {}}
                                    whileTap={!saving ? { y: 0 } : {}}
                                    className="w-1/3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    <FiX size={16} /> Reject
                                </motion.button>


                            </motion.div>

                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ApproveUser;