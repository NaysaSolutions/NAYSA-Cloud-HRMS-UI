import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostFGRR = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "postingFGRR";
        const response = await fetchDataJson(endpoint);

        let rawData = [];

        if (Array.isArray(response?.data)) {

          // Case 1: JSON string response (SVI-style)
          if (response.data?.[0]?.result) {
            try {
              rawData = JSON.parse(response.data[0].result || "[]");
            } catch (err) {
              console.error("JSON parse error:", err);
              rawData = [];
            }
          }
          // Case 2: direct SQL rows
          else {
            rawData = response.data;
          }
        }

        if (!rawData.length && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no records to display.",
          });

          alertFired.current = true;
          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(rawData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }

      } catch (error) {
        console.error("Error fetching FGRR:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  // =========================================
  // 🔥 CRITICAL FIX: NORMALIZE BEFORE POSTING
  // =========================================
    const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(selectedData, userPw, "FGRR", userCode, setLoading, onClose);
  };

const pickDocAndBranch = (row) => {
  if (!row) return { docNo: null, branchCode: null };
  const docNo =
    row.rrNo ||
    row.rr_no ||
    row.RR_NO ||
    row.fgrrNo ||
    row.FGRR_NO ||
    row.documentNo ||
    row.docNo;
  const branchCode =
    row.branchCode ||
    row.branch_code ||
    row.BRANCH_CODE ||
    row.bCode ||
    row.BCode ||
    row.BC;
  return { docNo, branchCode };
};
  // =========================================
  // VIEW DOCUMENT
  // =========================================
  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine FGRR No or Branch Code"
      });
      return;
    }

    const TRAN_VIEW_URL = "/page/FGRR";
    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?rrNo=${encodeURIComponent(docNo)}` +
      `&poNo=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(branchCode)}` +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Finalize MS Receiving Report"
          userPassword={userPassword}
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}

      {ReactDOM.createPortal(
        loading ? <LoadingSpinner /> : null,
        document.body
      )}
    </>
  );
};

export default PostFGRR;
