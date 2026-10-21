/* eslint-disable react/prop-types */
import SearchTransactionReference from "@/NAYSA Cloud/Lookup/SearchTransactionReference.jsx";

const SearchEmployeeRef = (props) => <SearchTransactionReference {...props} endpoint="/lookupEmployee" queryKey="lookupEmployee" title={props.multiSelect ? "Select Employees" : "Select Employee"} codeKey="empNo" nameKey="empName" codeLabel="Employee No." nameLabel="Employee Name" extraColumns={props.multiSelect ? [{ key: "branchCode", label: "Branch" }, { key: "payGroup", label: "Pay Group" }, { key: "deptCode", label: "Department" }] : []} params={{ PARAMS: "{}" }} />;

export default SearchEmployeeRef;

