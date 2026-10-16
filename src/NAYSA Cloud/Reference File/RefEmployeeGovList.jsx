  import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
  } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

  import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
  import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

  import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
  import {
    faPlus,
    faSave,
    faUndo,
    faEdit,
    faTrashAlt,
    faInfoCircle,
    faChevronDown,
    faFilePdf,
    faVideo,
    faBuilding,
    faCircleCheck,
    faCircleXmark,
    faIdCard,
    faFileLines,
    faHandshake,
    faHouseUser,
    faClipboardList,
    faTableCells,
  } from "@fortawesome/free-solid-svg-icons";
  import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
  import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
  import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
  import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

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
    useSwalValidationAlert,
  } from "@/NAYSA Cloud/Global/behavior.jsx";

  import {
    useFieldLenghtCheck,
  } from "@/NAYSA Cloud/Global/procedure";

  const DOC_TYPE = "RefEmployeeGovInfo";