import SearchRefLookup from "./SearchRefLookup";
const SearchRefShift = (props) => <SearchRefLookup {...props} endpoint="/shift" queryKey="refShift" codeKey="shiftCode" nameKey="shiftName" title="Select Shift" codeLabel="Shift Code" nameLabel="Shift Name" extraKey="shiftType" extraLabel="Shift Type" />;
export default SearchRefShift;
