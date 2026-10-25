import SearchRefLookup from "./SearchRefLookup";
const SearchRefBank = (props) => <SearchRefLookup {...props} endpoint="/bank" queryKey="refBank" codeKey="bankCode" nameKey="bankName" title="Select Bank" codeLabel="Bank Code" nameLabel="Bank Name" />;
export default SearchRefBank;
