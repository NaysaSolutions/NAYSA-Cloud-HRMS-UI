import SearchLeaveReference from "@/NAYSA Cloud/Lookup/SearchLeaveReference.jsx";

const SearchEmployeeStatusRef = (props) => <SearchLeaveReference {...props} sourceKey="employeeStatuses" queryKey="lookupEmployeeStatuses" title="Select Employee Status" codeLabel="Status Code" nameLabel="Status Name" />;

export default SearchEmployeeStatusRef;
