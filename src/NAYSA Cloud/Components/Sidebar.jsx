import React, { useState, useEffect, useMemo, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  FiChevronDown,
  FiChevronRight,
  FiHome,
  FiBook,
  FiCreditCard,
  FiDollarSign,
  FiGlobe,
  FiShield,
  FiSun,
  FiMoon,
  FiMapPin,
  FiMaximize2,
  FiMinimize2,
  FiBox,
  FiShoppingCart,
  FiSearch,
  FiCheckCircle,
  FiLayers,
} from "react-icons/fi";

export const SIDEBAR_PINNED_KEY = "naysa_sidebar_pinned";
export const SIDEBAR_OPEN_KEYS = "naysa_sidebar_open_keys";
export const SIDEBAR_SCROLL_TOP = "naysa_sidebar_scroll_top";

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

const iconMap = {
  Dashboard: FiHome,
  "General Ledger": FiBook,
  "Accounts Payable": FiCreditCard,
  "Accounts Receivable": FiDollarSign,
  "Global Reference": FiGlobe,
  "Application Security": FiShield,
  Purchasing: FiShoppingCart,
  Inventory: FiBox,
};

const highlightText = (text, searchTerm) => {
  if (!searchTerm) return text;
  const safe = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${safe})`, "gi");

  return String(text)
    .split(regex)
    .map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-yellow-300/80 dark:bg-yellow-500/60 text-inherit rounded px-1"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
};

const anyDescendantMatches = (node, lcTerm) => {
  if (!node) return false;
  if ((node.name || "").toLowerCase().includes(lcTerm)) return true;
  return Array.isArray(node.subMenu)
    ? node.subMenu.some((child) => anyDescendantMatches(child, lcTerm))
    : false;
};

const getLevelClasses = (level) => {
  if (level === 0) return "pl-3";
  if (level === 1) return "pl-8";
  if (level === 2) return "pl-12";
  return "pl-16";
};

const readStoredOpenKeys = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIDEBAR_OPEN_KEYS) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const collectMenuKeys = (items = [], parentKey = "") =>
  items.flatMap((item, index) => {
    const key = parentKey
      ? `${parentKey}/${index}-${item?.name || "item"}`
      : `${index}-${item?.name || "item"}`;

    if (!Array.isArray(item?.subMenu) || item.subMenu.length === 0) {
      return [];
    }

    return [key, ...collectMenuKeys(item.subMenu, key)];
  });

const MenuItem = ({
  item,
  itemKey,
  level = 0,
  searchTerm,
  openMenuKeys,
  onToggleMenu,
  onNavigate,
  onOpenModal,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const hasSubMenu = Array.isArray(item?.subMenu) && item.subMenu.length > 0;
  const Icon = level === 0 ? iconMap[item?.name] : null;

  const itemName = item?.name || "";
  const isSpecialBlue = /(post|finalize|approval)/i.test(itemName);
  const lcSearchTerm = (searchTerm || "").toLowerCase();
  const searchForcesOpen = Boolean(
    lcSearchTerm && hasSubMenu && anyDescendantMatches(item, lcSearchTerm)
  );
  const isOpen = hasSubMenu && (openMenuKeys.includes(itemKey) || searchForcesOpen);

  useEffect(() => {
    if (!lcSearchTerm) {
      setIsVisible(true);
      return;
    }

    const matches = itemName.toLowerCase().includes(lcSearchTerm);
    const descendant = hasSubMenu && anyDescendantMatches(item, lcSearchTerm);

    setIsVisible(matches || descendant);
  }, [lcSearchTerm, itemName, item, hasSubMenu]);

  if (!isVisible) return null;

  const baseTextColor =
    level === 0
      ? isSpecialBlue
        ? "text-blue-700 dark:text-blue-400"
        : "text-slate-800 dark:text-slate-100"
      : isSpecialBlue
      ? "text-blue-700 dark:text-blue-400"
      : "text-slate-700 dark:text-slate-200";

  const hoverBg =
    level === 0
      ? "hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 dark:hover:from-blue-950/40 dark:hover:to-slate-800/40"
      : "hover:bg-slate-50 dark:hover:bg-slate-800/60";

  const activeBg =
    "bg-gradient-to-r from-blue-100 to-sky-50 dark:from-blue-900/40 dark:to-slate-800/80";

  const rowBase = `
    relative
    flex items-center justify-between
    py-2 px-1
    rounded-xl
    transition-all duration-300 ease-out
    group
    ${getLevelClasses(level)}
    ${hoverBg}
    hover:translate-x-[3px] hover:shadow-sm
    active:scale-[0.99]
  `;

  const label = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {level === 0 && (
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-300 ease-out
          ${
            isOpen
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 scale-[1.03]"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:scale-[1.03]"
          }`}
        >
          {Icon ? <Icon className="text-[18px]" /> : <FiLayers className="text-[18px]" />}
        </div>
      )}

      {level > 0 && (
        isSpecialBlue ? (
          <FiCheckCircle className="text-blue-600 dark:text-blue-400 shrink-0 text-[14px] transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 bg-slate-300 dark:bg-slate-600 transition-all duration-300 group-hover:scale-125 group-hover:bg-blue-400 dark:group-hover:bg-blue-400" />
        )
      )}

      <span
        className={`truncate text-xs sm:text-sm font-medium ${baseTextColor} transition-colors duration-300`}
        title={itemName}
      >
        {highlightText(itemName, searchTerm)}
      </span>

      {isSpecialBlue && !hasSubMenu && level === 0 && (
        <FiCheckCircle className="text-blue-600 dark:text-blue-400 shrink-0 transition-transform duration-300 group-hover:scale-110" />
      )}
    </div>
  );

  if (hasSubMenu) {
    return (
      <li className="mb-1">
        <button
          type="button"
          className={`${rowBase} w-full cursor-pointer`}
          onClick={() => onToggleMenu(itemKey)}
        >
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-500 transition-all duration-300 ${
              isOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
            }`}
          />
          {label}
          <div
            className={`shrink-0 ml-0 rounded-lg p-1 transition-all duration-300 ${
              isOpen
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-slate-400 dark:text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700"
            }`}
          >
            {isOpen ? (
              <FiChevronDown className="transition-transform duration-300" />
            ) : (
              <FiChevronRight className="transition-transform duration-300 group-hover:translate-x-[1px]" />
            )}
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <ul className="space-y-1 border-l border-slate-200 dark:border-slate-700 ml-2 pl-0.5">
              {item.subMenu.map((sub, i) => (
                <div
                  key={i}
                  className={`transition-all duration-300 ${
                    isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                  style={{ transitionDelay: isOpen ? `${Math.min(i * 35, 180)}ms` : "0ms" }}
                >
                  <MenuItem
                    item={sub}
                    itemKey={`${itemKey}/${i}-${sub?.name || "item"}`}
                    level={level + 1}
                    searchTerm={searchTerm}
                    openMenuKeys={openMenuKeys}
                    onToggleMenu={onToggleMenu}
                    onNavigate={onNavigate}
                    onOpenModal={onOpenModal}
                  />
                </div>
              ))}
            </ul>
          </div>
        </div>
      </li>
    );
  }

  if (item?.isModal) {
    return (
      <li className="mb-1">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            onOpenModal?.(item?.componentKey || item, item?.permissionType);
          }}
          className={`${rowBase} w-full text-left`}
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-y-100 scale-y-50" />
          {label}
        </button>
      </li>
    );
  }

  return (
    <li className="mb-1">
      <NavLink
        to={item?.path || "#"}
        state={{ permissionType: item?.permissionType }}
        onClick={() => {
          onNavigate?.();
          if (item?.onOpenModal) {
            onOpenModal?.(item);
          }
        }}
        className={({ isActive }) =>
          `${rowBase} ${isActive ? activeBg : ""} ${
            isActive ? "shadow-sm" : ""
          }`
        }
      >
        {({ isActive }) => (
          <div className="flex items-center justify-between w-full min-w-0">
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-500 transition-all duration-300 ${
                isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50 group-hover:opacity-100"
              }`}
            />
            <div className="flex-1 min-w-0">{label}</div>
            {isActive && (
              <span className="ml-2 w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 animate-pulse" />
            )}
          </div>
        )}
      </NavLink>
    </li>
  );
};

const Sidebar = ({ menuItems = null, onNavigate, onOpenModal }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredTheme() === "dark");
  const [isPinned, setIsPinned] = useState(
    () => localStorage.getItem(SIDEBAR_PINNED_KEY) === "Y"
  );
  const [openMenuKeys, setOpenMenuKeys] = useState(() => readStoredOpenKeys());
  const menuScrollRef = useRef(null);
  const { user } = useAuth();

  const accountMode = String(user?.ACCOUNT_MODE || "").toUpperCase();
  const isLicenseAdmin = accountMode === "LICENSE_ADMIN";

  // MIRACLE must load the menus of its permission template (for example NAYSA).
  // Normal users continue to use their own USER_CODE.
  const permissionUserCode =
    user?.PERMISSION_USER_CODE ||
    user?.AUTH_USER_CODE ||
    user?.USER_CODE ||
    "";

  const hasProvidedMenu =
    Array.isArray(menuItems) && menuItems.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["sidebarMenu", permissionUserCode],
    queryFn: () =>
      fetchData("menu-items", {
        USER_CODE: permissionUserCode,
      }),
    enabled:
      Boolean(permissionUserCode) &&
      !isLicenseAdmin &&
      !hasProvidedMenu,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    setIsDarkMode(applyTheme(getStoredTheme()));

    const handleThemeChange = (event) => {
      if (event.type === "storage" && event.key !== THEME_STORAGE_KEY) return;

      const nextTheme =
        event.type === "storage"
          ? event.newValue
          : event.detail?.theme;

      if (nextTheme === "dark" || nextTheme === "light") {
        setIsDarkMode(applyTheme(nextTheme));
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
    localStorage.setItem(SIDEBAR_PINNED_KEY, isPinned ? "Y" : "N");

    if (!isPinned) {
      localStorage.removeItem(SIDEBAR_OPEN_KEYS);
      localStorage.removeItem(SIDEBAR_SCROLL_TOP);
    }
  }, [isPinned]);

  useEffect(() => {
    if (isPinned) {
      localStorage.setItem(SIDEBAR_OPEN_KEYS, JSON.stringify(openMenuKeys));
    }
  }, [isPinned, openMenuKeys]);

  const items = isLicenseAdmin
    ? []
    : hasProvidedMenu
    ? menuItems
    : data?.menuItems ?? data?.data ?? [];
  const allMenuKeys = useMemo(() => collectMenuKeys(items), [items]);
  const isAllExpanded =
    allMenuKeys.length > 0 && allMenuKeys.every((key) => openMenuKeys.includes(key));

  useEffect(() => {
    if (!isPinned) return;

    const savedTop = Number(localStorage.getItem(SIDEBAR_SCROLL_TOP) || 0);
    const id = requestAnimationFrame(() => {
      if (menuScrollRef.current) {
        menuScrollRef.current.scrollTop = Number.isFinite(savedTop) ? savedTop : 0;
      }
    });

    return () => cancelAnimationFrame(id);
  }, [isPinned, items.length]);

  const filteredCount = useMemo(() => {
    if (!searchTerm) return items.length;
    return items.filter((item) =>
      anyDescendantMatches(item, searchTerm.toLowerCase())
    ).length;
  }, [items, searchTerm]);

  const handleTogglePinned = () => {
    setIsPinned((prev) => {
      const next = !prev;

      if (next) {
        localStorage.setItem(SIDEBAR_OPEN_KEYS, JSON.stringify(openMenuKeys));
        localStorage.setItem(
          SIDEBAR_SCROLL_TOP,
          String(menuScrollRef.current?.scrollTop || 0)
        );
      } else {
        localStorage.removeItem(SIDEBAR_OPEN_KEYS);
        localStorage.removeItem(SIDEBAR_SCROLL_TOP);
      }

      return next;
    });
  };

  const handleToggleMenu = (key) => {
    setOpenMenuKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleToggleExpandAll = () => {
    setOpenMenuKeys(isAllExpanded ? [] : allMenuKeys);
  };

  const handleNavigate = () => {
    onNavigate?.();
  };

  const handleMenuScroll = (event) => {
    if (isPinned) {
      localStorage.setItem(SIDEBAR_SCROLL_TOP, String(event.currentTarget.scrollTop));
    }
  };

  return (
    <div className="sidebar flex flex-col h-screen w-100 bg-white dark:bg-gray-900 shadow-2xl border-r border-slate-200 dark:border-slate-800">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <NavLink 
              to="/" 
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <img
                src="/naysa_logo.png"
                className="h-[35px] w-[70px] object-contain"
                alt="Logo"
              />
              {/* <span className="hidden md:inline">Financials</span> */}
            </NavLink>

            <div className="min-w-0">
              <div className="mt-1 font-bold text-blue-800 dark:text-blue-300 truncate">
                Financials
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePinned}
              title={isPinned ? "Unpin sidebar menu" : "Pin sidebar menu"}
              aria-pressed={isPinned}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
                isPinned
                  ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <FiMapPin className={isPinned ? "rotate-45" : ""} />
            </button>

            <button
              type="button"
              onClick={handleToggleExpandAll}
              title={isAllExpanded ? "Collapse all menus" : "Expand all menus"}
              aria-pressed={isAllExpanded}
              disabled={allMenuKeys.length === 0}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                isAllExpanded
                  ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {isAllExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextTheme = isDarkMode ? "light" : "dark";
                setIsDarkMode(applyTheme(nextTheme));
                broadcastThemeChange(nextTheme);
              }}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isDarkMode ? <FiSun /> : <FiMoon />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search menu..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 focus:shadow-sm"
          />
        </div>

        {/* <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {searchTerm
            ? `${filteredCount} matching menu group${filteredCount !== 1 ? "s" : ""}`
            : `${items.length} menu group${items.length !== 1 ? "s" : ""}`}
        </div> */}
      </div>

      <div
        ref={menuScrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar"
        onScroll={handleMenuScroll}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400 animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 animate-spin mb-3" />
            <span className="text-sm font-medium">Loading menu...</span>
          </div>
        ) : error ? (
          <div className="mx-2 mt-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300 animate-in fade-in duration-300">
            Error loading menu
          </div>
        ) : items.length === 0 ? (
          <div className="mx-2 mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-500 dark:text-slate-400 animate-in fade-in duration-300">
            No menu available.
          </div>
        ) : (
          <ul className="space-y-1 text-xs font-medium animate-in fade-in slide-in-from-left-1 duration-300">
            {items.map((item, idx) => (
              <MenuItem
                key={idx}
                item={item}
                itemKey={`${idx}-${item?.name || "item"}`}
                searchTerm={searchTerm}
                openMenuKeys={openMenuKeys}
                onToggleMenu={handleToggleMenu}
                onNavigate={handleNavigate}
                onOpenModal={onOpenModal}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar;