import SearchRefLookup from "./SearchRefLookup";
const SearchRefPayGroup = (props) => <SearchRefLookup {...props} endpoint="/paygroup" queryKey="refPayGroup" codeKey="groupCode" nameKey="groupName" title="Select Pay Group" codeLabel="Pay Group Code" nameLabel="Pay Group Name" />;
export default SearchRefPayGroup;
