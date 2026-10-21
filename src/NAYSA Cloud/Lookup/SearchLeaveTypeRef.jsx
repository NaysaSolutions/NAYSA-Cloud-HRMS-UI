import SearchLeaveReference from "@/NAYSA Cloud/Lookup/SearchLeaveReference.jsx";

const SearchLeaveTypeRef = (props) => <SearchLeaveReference {...props} referenceEndpoint="/leaveLedger/references" sourceKey="leaveTypes" queryKey="lookupLeaveTypes" title="Select Leave Type" codeLabel="Leave Code" nameLabel="Leave Name" />;

export default SearchLeaveTypeRef;
