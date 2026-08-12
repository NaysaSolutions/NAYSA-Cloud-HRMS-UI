import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import {
  useSwalValidationAlert,
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostBUDAU = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);
  const [userPassword] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingBUDAU";
        const response = await fetchDataJson(endpoint);

        const budauData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : Array.isArray(response?.data)
            ? response.data
            : response?.data?.result
              ? JSON.parse(response.data.result)
              : [];

        if (budauData.length === 0 && !alertFired.current) {
          useSwalInfoAlert("No Records Found", "There are no records to display.");
          alertFired.current = true;
          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(budauData);
          setcolConfigData(colConfig || []);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching BUDAU posting data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "BUDAU",
      userCode,
      setLoading,
      onClose
    );
  };

  const handleViewDocument = (row = {}) => {
    const docNo = row.docNo || row.documentNo || row.budauNo || "";
    const branchCode = row.branchCode || "";

    if (!docNo) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine Document No Column Index",
      });
      return;
    }

    const BUDAU_VIEW_URL = "/page/BUDAU";

    const url =
      `${window.location.origin}${BUDAU_VIEW_URL}` +
      `?docNo=${encodeURIComponent(docNo)}` +
      (branchCode ? `&branchCode=${encodeURIComponent(branchCode)}` : "") +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Finalize Budget Augmentation"
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

export default PostBUDAU;
