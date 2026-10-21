import SearchTransactionReference from "@/NAYSA Cloud/Lookup/SearchTransactionReference.jsx";

const SearchLoanRef = (props) => <SearchTransactionReference {...props} endpoint="/lookupRefLoan" queryKey="lookupRefLoan" title="Select Loan Type" codeKey="code" nameKey="description" codeLabel="Loan Code" nameLabel="Loan Name" />;

export default SearchLoanRef;
