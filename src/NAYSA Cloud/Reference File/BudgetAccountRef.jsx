
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faUndo,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

const docType = "BudgetRequiredAccounts";
const documentTitle = "Budget Required Accounts";

const parseSqlJsonResult = (payload, fallback = []) => {
  const row = payload?.data?.data?.[0] || payload?.data?.[0] || payload?.data || payload;
  const raw = row?.result || row?.RESULT || Object.values(row || {})?.[0];

  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const yesNoText = (value) => (String(value || "N").toUpperCase() === "Y" ? "Yes" : "No");

const buildPayload = (rows, userCode) => ({
  json_data: JSON.stringify({
    json_data: {
      userCode,
      dt1: rows.map((row, index) => ({
        lineNo: index + 1,
        acctCode: row.acctCode,
        requireBudget: row.requireBudget === "Y" ? "Y" : "N",
      })),
    },
  }),
});

const BudgetRequiredAccounts = () => {
  const queryClient = useQueryClient();
  const { user, currentUserRow } = useAuth();

  const [rows, setRows] = useState([]);
  const [originalMap, setOriginalMap] = useState({});
  const [isSavingAction, setIsSavingAction] = useState(false);

  const activeUserCode =
    user?.USER_CODE ||
    user?.userCode ||
    currentUserRow?.userCode ||
    currentUserRow?.USER_CODE ||
    "ADMIN";

  const {
    data: accountRows = [],
    isLoading: isListLoading,
    isFetching,
  } = useQuery({
    queryKey: ["budgetRequiredAccounts"],
    queryFn: async () => {
      const response = await apiClient.get("/budgetRequiredAccounts");
      return parseSqlJsonResult(response, []);
    },
    staleTime: 0,
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    /*
      sproc_PHP_COAMast / LoadBudgetRequiredAccounts returns exact fields:
      acctCode, acctName, accountGroup, accountType, accountBalance, requireBudget, active

      accountGroup/accountType/accountBalance are already display names from SQL.
      Example:
      accountGroup = Asset, not A - Asset
      accountBalance = Debit, not DR - Debit
    */
    setRows(accountRows || []);

    const nextOriginalMap = (accountRows || []).reduce((map, row) => {
      map[row.acctCode] = row.requireBudget === "Y" ? "Y" : "N";
      return map;
    }, {});

    setOriginalMap(nextOriginalMap);
  }, [accountRows]);

  const changedRows = useMemo(
    () =>
      rows.filter((row) => {
        const currentValue = row.requireBudget === "Y" ? "Y" : "N";
        const originalValue = originalMap[row.acctCode] === "Y" ? "Y" : "N";

        return currentValue !== originalValue;
      }),
    [rows, originalMap],
  );

  const updateRequireBudget = useCallback((acctCode, value) => {
    setRows((previousRows) =>
      previousRows.map((row) =>
        row.acctCode === acctCode
          ? {
              ...row,
              requireBudget: value === "Y" ? "Y" : "N",
            }
          : row,
      ),
    );
  }, []);

  const resetChanges = useCallback(() => {
    setRows((previousRows) =>
      previousRows.map((row) => ({
        ...row,
        requireBudget: originalMap[row.acctCode] === "Y" ? "Y" : "N",
      })),
    );
  }, [originalMap]);

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["budgetRequiredAccounts"] });
  }, [queryClient]);

  const { mutate: saveBudgetRequiredAccounts, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/updateBudgetRequiredAccounts", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0] || response?.data?.[0] || response?.data;
      const errorCount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? response?.data?.errorCount ?? 0);
      const errorMsg = sqlRow?.errormsg || sqlRow?.errorMsg || response?.data?.message || "";

      if (errorCount > 0 || response?.data?.success === false) {
        useSwalErrorAlert("Save Error", errorMsg || "Failed to save Budget Required Accounts.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["budgetRequiredAccounts"] });
      useSwalSuccessAlert("Success!", "Budget Required Accounts updated successfully.");
    },
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error),
      );
    },
    onSettled: () => {
      setIsSavingAction(false);
    },
  });

  const handleSave = async () => {
    if (changedRows.length === 0) {
      return useSwalValidationAlert({
        icon: "info",
        title: "No Changes",
        message: "There are no updated account budget requirements to save.",
      });
    }

    const invalidRows = changedRows.filter((row) => !row.acctCode);

    if (invalidRows.length > 0) {
      return useSwalErrorAlert("Validation Error", "One or more rows has no Account Code.");
    }

    setIsSavingAction(true);
    saveBudgetRequiredAccounts(buildPayload(changedRows, activeUserCode));
  };

  const columns = useMemo(
    () => [
      {
        key: "acctCode",
        label: "Account Code",
        sortable: true,
        width: 145,
        requiredVisible: true,
      },
      {
        key: "acctName",
        label: "Account Name",
        sortable: true,
        width: 400,
        maxWidth: 440,
        requiredVisible: true,
      },
      {
        key: "accountGroup",
        label: "Account Group",
        sortable: true,
        width: 200,
      },
      {
        key: "accountType",
        label: "Account Type",
        sortable: true,
        width: 150,
      },
      {
        key: "accountBalance",
        label: "Account Balance",
        sortable: true,
        width: 150,
      },
      {
        key: "requireBudgetText",
        label: "Current Value",
        sortable: false,
        width: 110,
        render: (row) => yesNoText(row.requireBudget),
      },
      {
        key: "requireBudget",
        label: "Require Budget?",
        sortable: true,
        width: 110,
        requiredVisible: true,
        render: (row) => {
          const value = row.requireBudget === "Y" ? "Y" : "N";

          return (
            <button
              type="button"
              className={`h-8 w-full rounded-full border text-[11px] font-semibold transition-colors ${
                value === "Y"
                  ? "border-blue-500 bg-blue-500/15 text-blue-700"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
              onClick={() => updateRequireBudget(row.acctCode, value === "Y" ? "N" : "Y")}
            >
              {value === "Y" ? "Yes" : "No"}
            </button>
          );
        },
      },
    ],
    [updateRequireBudget],
  );

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isFetching || isSaving || isSavingAction) && (
        <LoadingSpinner />
      )}

      <div className="global-ref-header-ui">
        <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto] md:gap-0">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {documentTitle}
            </h1>
          </div>

          <div className="flex w-full justify-end md:w-auto md:justify-end md:justify-self-end">
            <ButtonBar
              buttons={[
                {
                  key: "save",
                  label: <span className="ml-1 sm:inline">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: changedRows.length === 0 || isSaving || isSavingAction,
                  className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium transition-all sm:h-8 sm:w-auto sm:px-4 ${
                    changedRows.length === 0 || isSaving || isSavingAction
                      ? "cursor-not-allowed bg-blue-500 text-white opacity-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`,
                },
                {
                  key: "undo",
                  label: <span className="ml-1 sm:inline">Undo</span>,
                  icon: faUndo,
                  onClick: resetChanges,
                  disabled: changedRows.length === 0 || isSaving || isSavingAction,
                  className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium transition-all sm:h-8 sm:w-auto sm:px-4 ${
                    changedRows.length === 0 || isSaving || isSavingAction
                      ? "cursor-not-allowed bg-blue-500 text-white opacity-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`,
                },
                {
                  key: "refresh",
                  label: <span className="ml-1 sm:inline">Refresh</span>,
                  icon: faRotateRight,
                  onClick: refreshList,
                  className:
                    "flex h-7 w-20 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-24 flex flex-col gap-4 md:mt-22">
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={rows}
            isLoading={isListLoading}
            itemsPerPage={75}
            title="Budget Required Account Records"
            fileName={`BudgetRequiredAccounts_${new Date().toISOString().split("T")[0]}`}
            totalExemptions={[
              "acctCode",
              "acctName",
              "accountGroup",
              "accountType",
              "accountBalance",
              "requireBudgetText",
              "requireBudget",
            ]}
            autoFillGrid={true}
          />
        </div>
      </div>
    </div>
  );
};

export default BudgetRequiredAccounts;

