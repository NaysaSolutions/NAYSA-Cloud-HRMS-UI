import SearchRefLookup from "./SearchRefLookup";
const SearchRefPosition = (props) => <SearchRefLookup {...props} endpoint="/pos" queryKey="refPosition" codeKey="posCode" nameKey="posName" title="Select Position" codeLabel="Position Code" nameLabel="Position Name" />;
export default SearchRefPosition;
