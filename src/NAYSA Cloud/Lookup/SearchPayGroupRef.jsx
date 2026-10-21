import SearchLeaveReference from "@/NAYSA Cloud/Lookup/SearchLeaveReference.jsx";

const SearchPayGroupRef = (props) => <SearchLeaveReference {...props} sourceKey="payGroups" queryKey="lookupPayGroups" title="Select Pay Group" codeLabel="Pay Group Code" nameLabel="Pay Group Name" />;

export default SearchPayGroupRef;
