import React, { lazy } from "react";

// Maps DB componentKey -> lazy React component. Keep keys stable because the
// backend stores them in menu-routes/menu-items.
const lazyPage = (loader) => lazy(loader);

const UniversalReportModal = lazyPage(() =>
  import("./NAYSA Cloud/Printing/UniversalReportModal.jsx")
);

const reportModal = (module) => {
  const ReportModal = (props) => (
    <UniversalReportModal {...props} module={module} />
  );
  ReportModal.displayName = `${module}ReportModal`;
  return ReportModal;
};

export const pageRegistry = {
  
  // Global & Queries
  AllTranHistory: lazyPage(() => import("./NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx")),

  // Global Reference
  RefCompany: lazyPage(() => import("./NAYSA Cloud/Reference File/RefCompany.jsx")),
  RefBranch: lazyPage(() => import("./NAYSA Cloud/Reference File/RefBranch.jsx")),
  RefLeaveCredit: lazyPage(() => import("./NAYSA Cloud/Reference File/RefLeaveCredit.jsx")),
  GenerateLeaveCredits: lazyPage(() => import("./NAYSA Cloud/Leaves/GenerateLeaveCredits.jsx")),
  EmployeeLeaveLedger: lazyPage(() => import("./NAYSA Cloud/Leaves/LeaveLedger.jsx")),
  LeaveLedger: lazyPage(() => import("./NAYSA Cloud/Leaves/LeaveLedger.jsx")),
  LeaveCreditBalance: lazyPage(() => import("./NAYSA Cloud/Leaves/LeaveCreditBalance.jsx")),
  RefArea: lazyPage(() => import("./NAYSA Cloud/Reference File/RefArea.jsx")),
  RefBank: lazyPage(() => import("./NAYSA Cloud/Reference File/RefBank.jsx")),
  RefHoliday: lazyPage(() => import("./NAYSA Cloud/Reference File/RefHoliday.jsx")),
  RefEmployee: lazyPage(() => import("./NAYSA Cloud/Reference File/RefEmployee.jsx")),
  RefPayGroup: lazyPage(() => import("./NAYSA Cloud/Reference File/RefPayGroup.jsx")),
  RefPosition: lazyPage(() => import("./NAYSA Cloud/Reference File/RefPOS.jsx")),
  RefLeave: lazyPage(() => import("./NAYSA Cloud/Reference File/RefLeave.jsx")),
  RefOvertime: lazyPage(() => import("./NAYSA Cloud/Reference File/RefOvertime.jsx")),
  RefEmployeeStatus: lazyPage(() => import("./NAYSA Cloud/Reference File/RefEmployeeStatus.jsx")),
    RefClient: lazyPage(() => import("./NAYSA Cloud/Reference File/RefClient.jsx")),
  
  RefGovtSSS: lazyPage(() => import("./NAYSA Cloud/Reference File/RefGovtSSS.jsx")),
  RefGovtTAX: lazyPage(() => import("./NAYSA Cloud/Reference File/RefGovtTAX.jsx")),
  RefTaxTable: lazyPage(() => import("./NAYSA Cloud/Reference File/RefGovtTAX.jsx")),
  RefSSSTable: lazyPage(() => import("./NAYSA Cloud/Reference File/RefGovtSSS.jsx")),

  RefEmployee: lazyPage(() => import("./NAYSA Cloud/Reference File/RefEmployee.jsx")),


  //TRANSACTIONS
  Timesheet: lazyPage(() => import("./NAYSA Cloud/Transactions/Timesheet.jsx")),

  //ACCESS RIGHTS (HRMS)
  UserManagement: lazyPage(() => import("./NAYSA Cloud/Security/UserManagement.jsx")),
  RefShift: lazyPage(() => import("./NAYSA Cloud/Reference File/RefShift.jsx")),

  UpdateUser: lazyPage(() => import("./NAYSA Cloud/Security/UpdateUser.jsx")),
  UserAccessRights: lazyPage(() => import("./NAYSA Cloud/Security/UserAccessRights.jsx")),
  MasterDataAccessRights: lazyPage(() => import("./NAYSA Cloud/Security/MasterAccessRights.jsx")),
  ReportAccessRights: lazyPage(() => import("./NAYSA Cloud/Security/ReportAccessRights.jsx")),
  

  // Printing (Universal Modal Mapping)
  APReportModal: reportModal("AP"),


};
