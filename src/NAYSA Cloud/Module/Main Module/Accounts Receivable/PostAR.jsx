import { useState, useEffect,useRef } from 'react';
import { fetchDataJson, postRequest } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import  GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert,useSwalInfoAlert } from '@/NAYSA Cloud/Global/behavior.jsx';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostAR = ({ isOpen, onClose,userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false); // controls modal display
  const alertFired = useRef(false);
  const [userPassword, setUserPassword] = useState(null);


  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;
      setLoading(true);
      alertFired.current = false; 

      try {
        const endpoint = "postingAR";
        const response = await fetchDataJson(endpoint);
        const custData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (custData.length === 0 && !alertFired.current) {
          useSwalInfoAlert( "No Records Found", "There are no records to display.");
          alertFired.current = true; 
          onClose();
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(custData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen]);




  
const handlePost = async (selectedData, userPw) => {
  await useHandlePostTran(selectedData,userPw,"AR",userCode,setLoading,onClose)
}




const pickDocAndBranch = (row) => {
  if (!row) return { docNo: null, branchCode: null };
  const docNo = row.arNo;
  const branchCode = row.branchCode;
  return { docNo, branchCode };
};


const handleViewDocument = (row) => {
  const { docNo, branchCode } = pickDocAndBranch(row, colConfigData);
  if (!docNo || !branchCode) {
    useSwalValidationAlert({
      icon: "warning",
      title: "Missing keys",
      message: "Cannot determine Document No Column Index"
    });
    return;
  }

 const SVI_VIEW_URL = "/page/AR";
const url =
  `${window.location.origin}${SVI_VIEW_URL}` +
  `?arNo=${encodeURIComponent(docNo)}` +
  `&branchCode=${encodeURIComponent(branchCode)}` +
  `&viewDocument=true`;

window.open(url, "_blank", "noopener,noreferrer");
};



return (
  <>
    {/* Mount the modal only when ready */}
    {modalReady && (
      <GlobalGLPostingModalv1
      data={data} 
      colConfigData={colConfigData} 
        title="Finalize Acknowledgment Receipt"
      userPassword ={userPassword}
      btnCaption="Ok"
      onClose={onClose}
      onPost={handlePost} 
      onViewDocument={handleViewDocument}
      remoteLoading={loading}
      />
    )}

  {loading && <LoadingSpinner />}
  
  </>
);
};



export default PostAR;

