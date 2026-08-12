import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostMSRFP = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [userPassword, setUserPassword] = useState(null);
  const alertFired = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingMSRFP";
        const response = await fetchDataJson(endpoint);
        let rawData = [];

        if (Array.isArray(response?.data)) {
          if (response.data[0]?.result) {
            try {
              rawData = JSON.parse(response.data[0].result || "[]");
            } catch (error) {
              console.error("MSRFP posting JSON parse error:", error);
            }
          } else {
            rawData = response.data;
          }
        }

        if (!rawData.length) {
          if (!alertFired.current) {
            useSwalValidationAlert({
              icon: "info",
              title: "No Records Found",
              message: "There are no MSRFP records to display.",
            });
            alertFired.current = true;
          }

          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(rawData);
          setColConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching MSRFP posting records:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPostingData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) => {
    setUserPassword(userPw || null);
    await useHandlePostTran(
      selectedData,
      userPw,
      "MSRFP",
      userCode,
      setLoading,
      onClose,
    );
  };

  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo =
      row.rfpNo ||
      row.rfp_no ||
      row.RFP_NO ||
      row.msrfpNo ||
      row.MSRFPNo ||
      row.MSRFP_NO ||
      row.documentNo ||
      row.docNo;
    const branchCode =
      row.branchCode ||
      row.branch_code ||
      row.BRANCH_CODE ||
      row.bCode ||
      row.BCode ||
      row.BC ||
      row.Branch;

    return { docNo, branchCode };
  };

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine MSRFP No or Branch Code.",
      });
      return;
    }

    const url =
      `${window.location.origin}/page/MSRFP` +
      `?rfpNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize MS Return from Production"
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
        document.body,
      )}
    </>
  );
};

export default PostMSRFP;
