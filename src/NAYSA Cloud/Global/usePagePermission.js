import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

const normalizePermission = (value, fallback = "READ") => {
  const permission = String(value || "").trim().toUpperCase();

  if (permission === "FULL") return "FULL";
  if (permission === "READ") return "READ";

  return fallback;
};

const normalizeText = (value) => {
  return String(value || "").trim().toLowerCase();
};

const readMenuArrayFromStorage = () => {
  if (typeof window === "undefined") return [];

  const possibleKeys = [
    "menu",
    "menus",
    "userMenu",
    "userMenus",
    "menuList",
    "sidebarMenu",
    "naysaMenu",
    "auth",
    "user",
    "authUser",
  ];

  const collected = [];

  possibleKeys.forEach((key) => {
    try {
      const raw =
        window.localStorage.getItem(key) ||
        window.sessionStorage.getItem(key);

      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) collected.push(parsed);
      if (Array.isArray(parsed?.menu)) collected.push(parsed.menu);
      if (Array.isArray(parsed?.menus)) collected.push(parsed.menus);
      if (Array.isArray(parsed?.userMenu)) collected.push(parsed.userMenu);
      if (Array.isArray(parsed?.userMenus)) collected.push(parsed.userMenus);
      if (Array.isArray(parsed?.data?.menu)) collected.push(parsed.data.menu);
      if (Array.isArray(parsed?.data?.menus)) collected.push(parsed.data.menus);
      if (Array.isArray(parsed?.data?.userMenu)) collected.push(parsed.data.userMenu);
      if (Array.isArray(parsed?.data?.userMenus)) collected.push(parsed.data.userMenus);
    } catch {
      // Ignore invalid JSON storage values
    }
  });

  return collected;
};

const getNodePermission = (node) => {
  return (
    node?.permissionType ||
    node?.permission_type ||
    node?.PERMISSION_TYPE ||
    node?.permission ||
    node?.accessType ||
    node?.access_type ||
    ""
  );
};

const getNodeChildren = (node) => {
  return [
    ...(Array.isArray(node?.subMenu) ? node.subMenu : []),
    ...(Array.isArray(node?.submenu) ? node.submenu : []),
    ...(Array.isArray(node?.children) ? node.children : []),
    ...(Array.isArray(node?.items) ? node.items : []),
    ...(Array.isArray(node?.menu) ? node.menu : []),
    ...(Array.isArray(node?.menus) ? node.menus : []),
  ];
};

const getMenuPermissionFromTree = (menuSources = [], options = {}) => {
  const currentPath = normalizeText(options.path);
  const targetComponent = normalizeText(options.componentKey);
  const targetMenuCode = normalizeText(options.menuCode);
  const targetMenuName = normalizeText(options.menuName);

  const visit = (node) => {
    if (!node || typeof node !== "object") return "";

    const path = normalizeText(node.path || node.PATH);

    const componentKey = normalizeText(
      node.componentKey ||
        node.component_key ||
        node.COMPONENT_KEY ||
        node.key
    );

    const code = normalizeText(
      node.code ||
        node.menuCode ||
        node.menu_code ||
        node.MENU_CODE
    );

    const name = normalizeText(
      node.name ||
        node.menuName ||
        node.menu_name ||
        node.MENU_NAME
    );

    const matchedByPath = !!currentPath && path === currentPath;
    const matchedByComponent =
      !!targetComponent &&
      (componentKey === targetComponent || componentKey.includes(targetComponent));

    const matchedByMenuCode = !!targetMenuCode && code === targetMenuCode;
    const matchedByMenuName = !!targetMenuName && name === targetMenuName;

    const matched =
      matchedByPath ||
      matchedByComponent ||
      matchedByMenuCode ||
      matchedByMenuName;

    if (matched) {
      return getNodePermission(node);
    }

    const children = getNodeChildren(node);

    for (const child of children) {
      const found = visit(child);
      if (found) return found;
    }

    return "";
  };

  for (const source of menuSources) {
    const list = Array.isArray(source) ? source : [source];

    for (const item of list) {
      const found = visit(item);
      if (found) return found;
    }
  }

  return "";
};

export const usePagePermission = ({
  componentKey = "",
  menuCode = "",
  menuName = "",
  debug = false,
} = {}) => {
  const { user } = useAuth();
  const location = useLocation();

  const userType = String(
    user?.USER_TYPE ||
      user?.userType ||
      user?.user_type ||
      user?.type ||
      ""
  )
    .trim()
    .toUpperCase();

  const userCode =
    user?.USER_CODE ||
    user?.userCode ||
    user?.user_code ||
    user?.code ||
    "";

  const pagePermission = useMemo(() => {
    const routePermission =
      location?.state?.permissionType ||
      location?.state?.permission_type ||
      location?.state?.permission;

    if (routePermission) {
      return normalizePermission(routePermission);
    }

    const authMenuSources = [
      user?.menu,
      user?.menus,
      user?.userMenu,
      user?.userMenus,
      user?.data?.menu,
      user?.data?.menus,
      user?.data?.userMenu,
      user?.data?.userMenus,
      ...readMenuArrayFromStorage(),
    ].filter(Boolean);

    const menuPermission = getMenuPermissionFromTree(authMenuSources, {
      path: location?.pathname,
      componentKey,
      menuCode,
      menuName,
    });

    if (menuPermission) {
      return normalizePermission(menuPermission);
    }

    // System Admin and Security Admin default to FULL
    if (userType === "S" || userType === "X") {
      return "FULL";
    }

    // Regular role users default to READ when no permission is found
    return "READ";
  }, [
    location?.pathname,
    location?.state,
    user,
    userType,
    componentKey,
    menuCode,
    menuName,
  ]);

  const isReadOnly = pagePermission === "READ";
  const isFullAccess = pagePermission === "FULL";

  const canView = true;

  // For reference and transaction files
  const canAdd = isFullAccess;
  const canEdit = isFullAccess;
  const canSave = isFullAccess;
  const canDelete = isFullAccess;
  const canPost = isFullAccess;
  const canCancel = isFullAccess;
  const canFinalize = isFullAccess;
  const canApprove = isFullAccess;
  const canRelease = isFullAccess;
  const canUpload = isFullAccess;
  const canImport = isFullAccess;

  // For reports
  const canPreview = true;
  const canPrint = true;
  const canExport = true;
  const canSaveLayout = isFullAccess;
  const canDeleteLayout = isFullAccess;

  if (debug) {
    console.log("usePagePermission Debug:", {
      componentKey,
      menuCode,
      menuName,
      path: location?.pathname,
      routeState: location?.state,
      userCode,
      userType,
      pagePermission,
      isReadOnly,
      isFullAccess,
    });
  }

  return {
    pagePermission,
    isReadOnly,
    isFullAccess,

    userType,
    userCode,

    canView,

    canAdd,
    canEdit,
    canSave,
    canDelete,
    canPost,
    canCancel,
    canFinalize,
    canApprove,
    canRelease,
    canUpload,
    canImport,

    canPreview,
    canPrint,
    canExport,
    canSaveLayout,
    canDeleteLayout,
  };
};