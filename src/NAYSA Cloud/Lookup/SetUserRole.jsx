import { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faSave, faTimes, faSyncAlt } from "@fortawesome/free-solid-svg-icons";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";

export default function UserRoleModal({ isOpen, user, onClose }) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [appliedSet, setAppliedSet] = useState(new Set()); // roles already applied (server truth)
  const [selected, setSelected] = useState([]);            // checkbox state in UI
  
  const [filters, setFilters] = useState({ roleCode: '', roleName: '' });

  const userCode = user?.userCode || user?.USER_CODE || "";

  // --- Helpers ---------------------------------------------------------------
  const norm = (v) => String(v ?? "").trim();

  const parseRoleRows = (res) => {
    let rows = [];
    if (Array.isArray(res?.data) && res.data[0]?.result) {
      try { rows = JSON.parse(res.data[0].result) || []; } catch { rows = []; }
    } else if (Array.isArray(res?.data)) {
      rows = res.data;
    }
    return rows;
  };

  const loadUserRoles = useCallback(async () => {
    if (!userCode) return;
    setLoading(true);
    try {
      // 1) Load all roles
      const { data: rolesRes } = await apiClient.get("/role");
      const roleData =
        (Array.isArray(rolesRes?.data) && rolesRes.data[0]?.result)
          ? JSON.parse(rolesRes.data[0].result || "[]")
          : (Array.isArray(rolesRes?.data) ? rolesRes.data : []);
      setRoles(Array.isArray(roleData) ? roleData : []);

      // 2) Load this user's existing roles (server truth)
      const { data: urRes } = await apiClient.get("/getUserRoles", {
        params: { json_data: JSON.stringify({ users: [userCode] }) },
      });

      const rows = parseRoleRows(urRes);
      const filteredRows = rows.filter(r =>
        norm(r.userCode ?? r.USER_CODE ?? r.user_code ?? r.UserCode) === norm(userCode)
      );

      const applied = new Set(
        filteredRows
          .map(r => norm(r.roleCode ?? r.ROLE_CODE ?? r.role_code ?? r.RoleCode))
          .filter(Boolean)
      );

      setAppliedSet(applied);
      setSelected(Array.from(applied)); // UI mirrors server
    } catch (e) {
      console.error("Load user roles error:", e);
      // 2. USING API ERROR ALERT
      await useSwalErrorAlertAPI("Error", e?.response?.data?.message || e.message || "Failed to load user roles.");
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  // Initial/when opened
  useEffect(() => {
    if (!isOpen || !userCode) return;
    let alive = true;
    (async () => {
      await loadUserRoles();
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [isOpen, userCode, loadUserRoles]);

  // --- High-Performance Filtering (Matches RCMast) ---------------------------
  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      const code = r.roleCode ?? r.role_code ?? r.ROLE_CODE ?? r.RoleCode ?? "";
      const name = r.roleName ?? r.role_name ?? r.ROLE_NAME ?? r.RoleName ?? "";
      
      return code.toLowerCase().includes(filters.roleCode.toLowerCase()) &&
             name.toLowerCase().includes(filters.roleName.toLowerCase());
    });
  }, [roles, filters]);

  // --- UI Actions ------------------------------------------------------------
  const toggle = (roleCode) => {
    setSelected(prev => {
      const isChecked = prev.includes(roleCode);
      if (isChecked) {
        return prev.filter(x => x !== roleCode);
      } else {
        return [...prev, roleCode];
      }
    });
  };

  const handleSave = async () => {
    if (!userCode) {
      // 3. USING VALIDATION ERROR ALERT
      await useSwalErrorAlert("Validation Error", "Please pick a user first.");
      return;
    }

    const desired = Array.from(new Set(selected.filter(Boolean)));
    const applied = Array.from(appliedSet);

    // Filter into what needs to be ADDED vs what needs to be REMOVED
    const rolesToApply = desired;
    const rolesToRemove = applied.filter(role => !desired.includes(role));

    if (rolesToApply.length === applied.length && rolesToRemove.length === 0) {
      // 4. USING VALIDATION ERROR ALERT FOR NO CHANGES
      await useSwalErrorAlert("No Changes", "There are no modified rows to save.");
      return;
    }

    setLoading(true);
    try {
      
      // 1. ADD / UPSERT ROLES
      if (rolesToApply.length > 0) {
        const payload = {
          dt1: rolesToApply.map(roleCode => ({ roleCode })), 
          dt2: [{ userCode }],
        };

        const { data: res } = await apiClient.post("/UpsertUserRole", {
          json_data: payload, 
        });

        if (!res?.success && res?.data?.status !== "success") {
          throw new Error(res?.message || res?.data?.message || "Failed to assign roles.");
        }
      }

      // 2. DELETE REMOVED ROLES
      for (const roleCode of rolesToRemove) {
        const payload = {
          dt1: [{ roleCode }],
          dt2: [{ userCode }],
        };

        const { data: delRes } = await apiClient.post("/deleteUserRole", {
          json_data: payload,
        });

        if (!delRes?.success && delRes?.data?.status !== "success") {
          throw new Error(delRes?.message || delRes?.data?.message || "Failed to remove roles.");
        }
      }

      // 5. USING SUCCESS ALERT
      await useSwalSuccessAlert("Saved!", "User roles updated successfully.");
      await loadUserRoles(); // Refresh from server
      
    } catch (e) {
      console.error("Save roles error:", e);
      // 6. USING API ERROR ALERT
      await useSwalErrorAlertAPI("Error", e?.response?.data?.message || e.message || "Failed to update user roles.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        
        <div className="flex items-center justify-between p-2 border-b bg-slate-100">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <h2 className="text-md font-bold text-blue-800 propercase tracking-tight pl-2">
                        Set User Role: <span className="text-blue-600 ml-1 font-semibold">{user?.userName || userCode}</span>
                    </h2>
                    {/* Visual sync indicator */}
                    <div className="absolute -top-1 -right-4 flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${loading ? "block" : "hidden"}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500 ${loading ? "block" : "hidden"}`}></span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => loadUserRoles()}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                    title="Manual Refresh"
                    disabled={loading}
                >
                    <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={loading} />
                </button>
                <button
                    onClick={() => onClose?.(false)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
                    <p className="text-sm">Processing Roles...</p>
                </div>
            ) : (
                <div className="overflow-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200"> 
                        <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-2 text-left w-[180px]">
                                    <label className="block text-[13px] font-bold text-slate-600 propercase mb-1">Role Code</label>
                                    <input
                                        type="text"
                                        value={filters.roleCode}
                                        onChange={(e) => setFilters(p => ({ ...p, roleCode: e.target.value }))}
                                        placeholder="Filter..."
                                        className="w-full px-2 py-1 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <label className="block text-[13px] font-bold text-slate-600 propercase mb-1">Role Name</label>
                                    <input
                                        type="text"
                                        value={filters.roleName}
                                        onChange={(e) => setFilters(p => ({ ...p, roleName: e.target.value }))}
                                        placeholder="Filter..."
                                        className="w-full px-2 py-1 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </th>
                                <th className="px-4 py-2 text-center w-[100px] align-top pt-3">
                                    <label className="block text-[13px] font-bold text-slate-600 propercase mt-1">Assigned</label>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRoles.length > 0 ? (
                                filteredRoles.map((r, idx) => {
                                    const code = r.roleCode ?? r.role_code ?? r.ROLE_CODE ?? r.RoleCode;
                                    const name = r.roleName ?? r.role_name ?? r.ROLE_NAME ?? r.RoleName;
                                    const checked = selected.includes(code);
                                    
                                    return (
                                        <tr key={code ?? idx}
                                            onClick={() => toggle(code)}
                                            className="group hover:bg-blue-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-2 text-xs font-bold text-slate-700">{code}</td>
                                            <td className="px-4 py-2 text-xs text-slate-600">{name}</td>
                                            <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    checked={checked}
                                                    onChange={() => toggle(code)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-4 py-10 text-center text-slate-400 text-sm">
                                        No matching roles found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )} 
        </div>

        <div className="p-2 px-4 border-t bg-slate-50 flex justify-between items-center">
            <span className="text-[11px] text-slate-500 font-medium">
                {filteredRoles.length} Roles Found | <span className="text-blue-600 font-bold">{selected.length} Selected</span>
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onClose?.(false)}
                    className="px-4 py-1.5 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
                    disabled={loading}
                >
                    Close
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center"
                    disabled={loading}
                    title="Save roles"
                >
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : <FontAwesomeIcon icon={faSave} className="mr-1" />}
                    &nbsp;Save Roles
                </button>
            </div>
        </div>

        <style jsx="true">{`
            .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
            .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>

      </div>
    </div>
  );
}