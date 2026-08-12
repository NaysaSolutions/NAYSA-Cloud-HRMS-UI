import { useState, useEffect, useRef } from 'react';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostAPDM = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);
  const [userPassword, setUserPassword] = useState(null);



  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;
      setLoading(true);
      alertFired.current = false; 

      try {
        const endpoint = "postingAPDM";
        const response = await fetchDataJson(endpoint);
        const custData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (custData.length === 0 && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no records to display.",
          });
          alertFired.current = true; 
          onClose?.();
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
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(selectedData, userPw, "APDM", userCode, setLoading, onClose);
  };

const pickDocAndBranch = (row) => {
  if (!row) return { docNo: null, branchCode: null };
  const docNo = row.apdmNo;
  const branchCode = row.branchCode;
  return { docNo, branchCode };
};


const handleViewDocument = (row) => {

  const { docNo, branchCode } = pickDocAndBranch(row);
  if (!docNo || !branchCode) {
    useSwalValidationAlert({
      icon: "warning",
      title: "Missing keys",
      message: "Cannot determine Document No Column Index"
    });
    return;
  }



const TRAN_VIEW_URL = "/page/APDM";
const url =
  `${window.location.origin}${TRAN_VIEW_URL}` +
  `?apdmNo=${encodeURIComponent(docNo)}` +
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
        title="Finalize AP Debit Memo"
        userPassword={userPassword}
        btnCaption="Okay"
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

export default PostAPDM;

