import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';



// Company
// ATC



export async function useTopUserRow(userCode) {
  try {
    const response = await fetchData("getUser", { USER_CODE: userCode});
   
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching User row:", error);
    return null;
  }
}




export async function useTopCompanyRow() {
  try {
    const response = await fetchData("getCompany");
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Company row:", error);
    return null;
  }
}



export async function useTopCompanyGlobalTables() {
  try {
    const response = await fetchData("getGlobalTables");
 
    const resultString = response?.data?.[0]?.result;

    if (!response?.success || !resultString) {
      return null;
    }

    const responseData = JSON.parse(resultString);
    return responseData;
  } catch (error) {
    console.error("Error fetching Company row:", error);
    return null;
  }
}




export async function useTopBranchRow(branchCode) {
  try {
    const response = await fetchData("getBranch", { BRANCH_CODE: branchCode});
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Branch row:", error);
    return null;
  }
}







export async function useTopHSOption() {
  try {
    const response = await fetchData("getHSOption");
    if (response.success) {
       
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
     
    }
    return null;
  } catch (error) {
    console.error("Error fetching HS Option row:", error);
    return null;
  }
}




export async function useTopDocControlRow(docId) {
  if (!docId) return null;

  try {
    const response = await fetchData("getHSDoc", { DOC_ID: docId });
    if (response?.success) {
      const responseData = JSON.parse(response.data?.[0]?.result || "[]");
      if (!Array.isArray(responseData)) return null;
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Document Control row:", error);
    return null;
  }
}






export async function useTopHSRptRow(reportId) {
  if (!reportId) return null;
  try {
    const response = await fetchData("getHsrpt", { REPORT_ID: reportId });
    if (response?.success) {
      const responseData = JSON.parse(response.data?.[0]?.result || "[]");
      if (!Array.isArray(responseData)) return null;
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Document Control row:", error);
    return null;
  }
}



export async function useTopDocDropDown(documentCode, documentCol) {
  if (!documentCode || !documentCol) {
    console.warn("Document code or column not provided");
    return [];
  }

  const payload = {
    json_data: {
      dropdownColumn: documentCol,
      docCode: documentCode
    }
  };


  try {
    const response = await postRequest("getHSDropdown", JSON.stringify(payload));

    
    // Validate response structure
    if (!response || !response.success || !response.data || !Array.isArray(response.data)) {
      console.warn("Invalid API response structure", response);
      return [];
    }

    // Safely parse the result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");
    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // Ensure we always return an array
    return Array.isArray(parsedData) ? parsedData : [];

  } catch (error) {
    console.error("Error fetching Document Dropdown:", error);
    return [];
  }
}





export async function useTopVatRow(vatCode) {
  if (!vatCode) return null;

  try {
    const response = await fetchData("getVat", { VAT_CODE: vatCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching VAT row:", error);
    return null;
  }
}



export async function useTopVatAmount(vatCode, grossAmt) {
  if (!vatCode || grossAmt === 0) return 0;

  try {
    const response = await fetchData("getVat", { VAT_CODE: vatCode });
    if (!response.success) return 0;
 

    const [result] = JSON.parse(response.data[0].result);
    if (!result) return 0;

    const { vatRate } = result;
    return +((grossAmt * vatRate * 0.01) / (1 + vatRate * 0.01)).toFixed(2);
  } catch (error) {
    console.error("Error fetching VAT Amount:", error);
    return 0;
  }
}





export async function useTopATCRow(atcCode) {
  if (!atcCode) return null;

  try {
    const response = await fetchData("getATC", { atcCode: atcCode });

    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching ATC row:", error);
    return null;
  }
}




export async function useTopATCAmount(atcCode, netAmount) {
  if (!atcCode || netAmount === 0) return 0;

  try {
    const res = await fetchData("getATC", { atcCode: atcCode });
    if (!res.success) return 0;

    const [row] = JSON.parse(res.data[0].result);
    if (!row) return 0;

    return +(netAmount * row.atcRate * 0.01).toFixed(2);
  } catch (e) {
    console.error("Error fetching ATC Amount:", e);
    return 0;
  }
}





export async function useTopBillCodeRow(billCode) {
  if (!billCode) return null;

  try {
    const response = await fetchData("getbillCode", { billCode: billCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bill Code row:", error);
    return null;
  }
}






export async function useTopBillTermRow(billtermCode) {
  if (!billtermCode) return null;


  try {
    const response = await fetchData("getBillterm", { BILLTERM_CODE: billtermCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bill Term row:", error);
    return null;
  }
}







export async function useTopSalesRepRow(salesRepCode) {
  if (!salesRepCode) return null;

  try {
    const response = await fetchData("getsalesRep", { salesRepCode: salesRepCode });
    if (!response?.success) return null;

    const rawResult = response?.data?.[0]?.result;
    if (!rawResult) return null;

    const responseData = JSON.parse(rawResult);
    if (!Array.isArray(responseData)) return null;

    return responseData.length > 0 ? responseData[0] : null;
  } catch (error) {
    console.error("Error fetching Sales Rep row:", error);
    return null;
  }
}






// export async function useTopRCRow(rcCode) {
//   if (!rcCode) return null;

//   try {
//     const response = await fetchData("getRCMast", { RC_CODE: rcCode });
//     if (response.success) {
//       const responseData = JSON.parse(response.data[0].result);
//       return responseData.length > 0 ? responseData[0] : null;
//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching RC row:", error);
//     return null;
//   }
// }


export async function useTopRCRow(rcCode) {
  if (!rcCode) return null;

  try {
    const response = await fetchData("getRCMast", { RC_CODE: rcCode });
    if (!response?.success) return null;

    const rawResult = response?.data?.[0]?.result;
    if (!rawResult) return null;

    const responseData = JSON.parse(rawResult);

    if (!Array.isArray(responseData)) return null;

    return responseData.length > 0 ? responseData[0] : null;
  } catch (error) {
    console.error("Error fetching RC row:", error);
    return null;
  }
}






export async function useTopSLRow(slCode) {
  if (!slCode) return null;

  try {
    const response = await fetchData("getSL", { SL_CODE: slCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching SL row:", error);
    return null;
  }
}





export async function useTopCutOffRow(cutoffCode) {
  if (!cutoffCode) return null;

  try {
    const response = await fetchData("getCutOff", { CUTOFF_CODE: cutoffCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Cutoff row:", error);
    return null;
  }
}



export async function useTopAccountRow(acctCode) {
  if (!acctCode) return null;

  try {
    const response = await fetchData("getCOA", { ACCT_CODE: acctCode });
    if (!response?.success) return null;

    const rawResult = response?.data?.[0]?.result;
    if (!rawResult) return null;

    const responseData = JSON.parse(rawResult);

    if (!Array.isArray(responseData)) return null;

    return responseData.length > 0 ? responseData[0] : null;
  } catch (error) {
    console.error("Error fetching Account row:", error);
    return null;
  }
}

// export async function useTopAccountRow(acctCode) {
//   if (!acctCode) return null;

//   try {
//     const response = await fetchData("getCOA", { ACCT_CODE: acctCode });
//     if (response.success) {
//       const responseData = JSON.parse(response.data[0].result);
//       return responseData.length > 0 ? responseData[0] : null;
//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching Account row:", error);
//     return null;
//   }
// }







export async function useTopPayeeRow(vendCode) {
  if (!vendCode) return null;

  try {
    const response = await fetchData("getVendMast", { VEND_CODE: vendCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Payee row:", error);
    return null;
  }
}






export async function useTopCurrencyRow(currCode) {
  if (!currCode) return null;

  try {
    const response = await fetchData("getCurr", { CURR_CODE: currCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Currency row:", error);
    return null;
  }
}







//global curreny update
export const useTopForexRate = async (currencyCode, documentDate) => {
  if (!currencyCode || currencyCode.toUpperCase() === "PHP") {
    return "1.000000";
  }

  try {
    const forexPayload = {
      json_data: {
        docDate: documentDate,
        currCode: currencyCode,
      },
    };
    const forexResponse = await postRequest(
      "getDForexByDate",
      JSON.stringify(forexPayload)
    );

    if (!forexResponse?.success) return "1.000000";

    const rawResult = forexResponse.data?.[0]?.result;
    if (!rawResult) return "1.000000";

    const forexData = JSON.parse(rawResult);
    const rate = forexData?.[0]?.currRate2;

    return rate != null ? Number(rate).toFixed(6) : "1.000000";
  } catch (error) {
    console.error("Forex API error:", error);
    return "1.000000";
  }
};





export async function useTopDocSign(documentID) {

  if (!documentID) return null;

  try {
    const response = await fetchData("getDocSign", {documentID: documentID });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Doc Sign row:", error);
    return null;
  }
}



export async function useTopBankRow(bankCode) {
  if (!bankCode) return null;

  try {
    const response = await fetchData("getBank", { BANK_CODE: bankCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bank row:", error);
    return null;
  }
}






export async function useTopBankMastRow(bankCode) {
  if (!bankCode) return null;

  try {
    const response = await fetchData("getBank", { bankCode: bankCode });
    if (response.success) {
      const responseData = JSON.parse(response.data[0].result);
      return responseData.length > 0 ? responseData[0] : null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bank Master row:", error);
    return null;
  }
}





export const useTopPayTermRow = async (paytermCode) => {
  if (!paytermCode) return null;
  
  try {
    const response = await fetchData("getPayterm", { 
      PAYTERM_CODE: paytermCode 
    });
    
    if (response.success) {
      const paytermData = JSON.parse(response.data[0].result);
      return {
        paytermCode: paytermData[0]?.paytermCode || paytermData[0]?.PAYTERM_CODE || "",
        paytermName: paytermData[0]?.paytermName || paytermData[0]?.PAYTERM_NAME || "",
        daysDue: paytermData[0]?.daysDue || paytermData[0]?.DAYS_DUE || 0
      };
    }
  } catch (error) {
    console.error("Error fetching payment term:", error);
    return null;
  }
};






export const useTopWarehouseRow = async (whouseCode) => {
  if (!whouseCode) return null;

  try {
      const response = await fetchData("warehouse/getWarehouse", {
      whCode: whouseCode,
    });

    if (response.success) {
      const warehouseData = JSON.parse(response.data[0].result);

      return {
        whouseCode:   warehouseData[0]?.whCode ||"",
        whouseName:warehouseData[0]?.whName     
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return null;
  }
};







export async function useTopDocDropDownAll() {
  try {
    // Change postRequest to fetchData to avoid the 405 Method Not Allowed error
    const response = await fetchData("getHSDropdownAll"); 
    
    if (!response || !response.success || !response.data || !Array.isArray(response.data)) {
      return [];
    }

    const fullJsonString = response.data
      .map(row => Object.values(row)[0]) 
      .join("");

    if (!fullJsonString) return [];

    try {
      const parsedData = JSON.parse(fullJsonString);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (parseError) {
      console.error("Parse Error: Invalid JSON string");
      return [];
    }
  } catch (error) {
    return [];
  }
}
