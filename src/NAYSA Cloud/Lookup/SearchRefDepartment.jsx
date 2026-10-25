import SearchRefLookup from "./SearchRefLookup";
const SearchRefDepartment = (props) => <SearchRefLookup {...props} endpoint="/refDepartment" queryKey="refDepartment" codeKey="deptCode" nameKey="deptName" title="Select Department" codeLabel="Department Code" nameLabel="Department Name" />;
export default SearchRefDepartment;
