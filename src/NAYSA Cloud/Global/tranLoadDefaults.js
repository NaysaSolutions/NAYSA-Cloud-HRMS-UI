import { useQuery } from '@tanstack/react-query';
import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';



export const useTopDocControlRow = (docId) => {
  return useQuery({
    queryKey: ['docControl', docId],
    queryFn: async () => {
      if (!docId) return null;
      try {
        const response = await fetchData("getHSDoc", { DOC_ID: docId });
        if (response.success) {
          const responseData = JSON.parse(response.data[0].result);
          return responseData.length > 0 ? responseData[0] : null;
        }
        return null;
      } catch (error) {
        console.error("Error fetching Document Control row:", error);
        return null;
      }
    },
    enabled: !!docId,
    staleTime: Infinity, 
    gcTime: Infinity,
  });
};





export const useTopHSOption = () => {
  return useQuery({
    queryKey: ['hsOption'], // Unique key for global options
    queryFn: async () => {
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
    },

    staleTime: Infinity, 
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
};






export const useTopCurrencyRow = (currCode) => {
  return useQuery({

    queryKey: ['currency', currCode],   
    queryFn: async () => {
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
    },

    // --- CONFIGURATION ---
    enabled: !!currCode,   // Only fetch if a currency code is provided
    staleTime: Infinity,   // Data never expires
    gcTime: Infinity,      // Keep in memory for the whole session
    refetchOnWindowFocus: false,
  });
};





export const useFieldLenghtCheck = (tableName) => {
  return useQuery({

    queryKey: ['fieldLengths', tableName],
    
    queryFn: async () => {
      if (!tableName) return [];
      
      try {
        const payload = { tableName };
        const response = await fetchData("getHSTblColLen", payload);

        if (!response || !response.success) {
          console.warn("Invalid API response structure", response);
          return [];
        }

        // Parsing the JSON string inside the first row's result column
        try {
          const parsedData = JSON.parse(response.data[0]?.result || "[]");
          return Array.isArray(parsedData) && parsedData.length > 0
            ? parsedData
            : null;
        } catch (parseError) {
          console.error("Error parsing response data:", parseError);
          return [];
        }
      } catch (error) {
        console.error("Error fetching Table Field length:", error);
        return [];
      }
    },

    // --- CONFIGURATION ---
    enabled: !!tableName,  // Only fetch if a table name is provided
    staleTime: Infinity,    // Field lengths are static metadata; fetch once per session
    gcTime: Infinity,       // Keep in memory forever
    refetchOnWindowFocus: false,
  });
};






export const useSelectedHSColConfigAll = (userCode) => {
  
  return useQuery({

    queryKey: ["hsColConfig", userCode],
    queryFn: async () => {
      try {
        const payload = {
          json_data: {
            endpoint: "", // Fetch all configs
            userCode,
            all: "Y",
          },
        };

        const response = await fetchData("getHSColConfig", {
          json_data: JSON.stringify(payload),
        });

        console.log(response)

        if (response?.success && response.data?.[0]?.result) {
          return JSON.parse(response.data[0].result);
        }

        throw new Error(response?.message || "No configurations found.");
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Config Load Failed",
          text: error.message || "Unknown error occurred",
        });
        throw error;
      }
    },



    staleTime: Infinity,          // Never consider data old
    gcTime: Infinity,             // Never garbage collect (keep in RAM)
    refetchOnMount: false,        // Don't refetch when a component mounts
    refetchOnWindowFocus: false,  // Don't refetch when switching tabs
    refetchOnReconnect: false,    // Don't refetch on internet reconnect
    select: (allData) => {
      if (!allData || !Array.isArray(allData)) return null;
      return allData.find((cfg) => cfg.endpoint === endpoint) || null;
    },
    enabled: !!userCode,


  });
};




