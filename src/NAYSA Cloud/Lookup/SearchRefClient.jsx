import SearchRefLookup from "./SearchRefLookup";
const SearchRefClient = (props) => <SearchRefLookup {...props} endpoint="/client" queryKey="refClient" codeKey="clientCode" nameKey="clientName" title="Select Client" codeLabel="Client Code" nameLabel="Client Name" />;
export default SearchRefClient;
