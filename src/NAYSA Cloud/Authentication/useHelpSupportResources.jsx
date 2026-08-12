import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  return ["1", "Y", "YES", "TRUE"].includes(
    String(value ?? "").trim().toUpperCase()
  );
};

const normalizeMenuRow = (row, index) => ({
  id: firstDefined(row?.id, row?.ID, index + 1),

  moduleCode: String(
    firstDefined(row?.module_code, row?.MODULE_CODE, row?.moduleCode, "")
  ).trim(),

  module: String(
    firstDefined(row?.module, row?.MODULE, "")
  ).trim(),

  subMenu: String(
    firstDefined(row?.sub_menu, row?.SUB_MENU, row?.subMenu, "")
  ).trim(),

  menuCode: String(
    firstDefined(row?.menu_code, row?.MENU_CODE, row?.menuCode, "")
  ).trim(),

  menuName: String(
    firstDefined(row?.menu_name, row?.MENU_NAME, row?.menuName, "")
  ).trim(),

  isVisible: toBoolean(
    firstDefined(row?.is_visible, row?.IS_VISIBLE, row?.isVisible, 1)
  ),

  userManual: String(
    firstDefined(
      row?.user_manual,
      row?.USER_MANUAL,
      row?.userManual,
      ""
    )
  ).trim(),

  videoTutorial: String(
    firstDefined(
      row?.video_tutorial,
      row?.VIDEO_TUTORIAL,
      row?.videoTutorial,
      ""
    )
  ).trim(),

  sortModule: Number(
    firstDefined(row?.sort_module, row?.SORT_MODULE, row?.sortModule, 0)
  ),

  sortSubmenu: Number(
    firstDefined(
      row?.sort_submenu,
      row?.SORT_SUBMENU,
      row?.sortSubmenu,
      0
    )
  ),

  sortItem: Number(
    firstDefined(row?.sort_item, row?.SORT_ITEM, row?.sortItem, 0)
  ),
});

const sortResources = (a, b) =>
  a.sortModule - b.sortModule ||
  a.sortSubmenu - b.sortSubmenu ||
  a.sortItem - b.sortItem ||
  a.module.localeCompare(b.module) ||
  a.menuName.localeCompare(b.menuName);

const useHelpSupportResources = () => {
  const { user } = useAuth();

  const permissionUserCode =
    user?.PERMISSION_USER_CODE ||
    user?.AUTH_USER_CODE ||
    user?.USER_CODE ||
    "";

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!permissionUserCode) {
      setResources([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchData("menu-routes", {
        USER_CODE: permissionUserCode,
      });

      const rows =
        response?.routes ??
        response?.data ??
        response?.menuRoutes ??
        response?.menu_routes ??
        [];

      const normalizedRows = (Array.isArray(rows) ? rows : [])
        .map(normalizeMenuRow)
        .filter((row) => row.isVisible)
        .sort(sortResources);

      setResources(normalizedRows);
    } catch (err) {
      console.error("Failed to load Help & Support resources:", err);

      setResources([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load Help & Support resources."
      );
    } finally {
      setLoading(false);
    }
  }, [permissionUserCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const manuals = useMemo(
    () => resources.filter((row) => row.userManual),
    [resources]
  );

  const videos = useMemo(
    () => resources.filter((row) => row.videoTutorial),
    [resources]
  );

  return {
    resources,
    manuals,
    videos,
    loading,
    error,
    refresh,
  };
};

export default useHelpSupportResources;
