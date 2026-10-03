import SearchLeaveReference from "@/NAYSA Cloud/Lookup/SearchLeaveReference.jsx";

const SearchDepartmentRef = (props) => <SearchLeaveReference {...props} sourceKey="departments" queryKey="lookupDepartments" title="Select Department" codeLabel="Department Code" nameLabel="Department Name" />;

export default SearchDepartmentRef;
