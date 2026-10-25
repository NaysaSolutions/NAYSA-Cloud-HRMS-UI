import SearchRefLookup from "./SearchRefLookup";
const SearchRefEmpStatus = (props) => <SearchRefLookup {...props} endpoint="/refEmployeeStatus" queryKey="refEmployeeStatus" codeKey="statCode" nameKey="statName" title="Select Employee Status" codeLabel="Status Code" nameLabel="Status Name" />;
export default SearchRefEmpStatus;
