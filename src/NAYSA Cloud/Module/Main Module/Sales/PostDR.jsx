import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert, useSwalInfoAlert } from '@/NAYSA Cloud/Global/behavior.jsx';
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ReactDOM from "react-dom";

/*
================================================================================
POST DR WORKFLOW
================================================================================
1. Modal opens from DR transaction page.
2. System loads open Delivery Receipt records from endpoint: postingDR.
3. System loads table column setup from hs_colconfig using endpoint postingDR.
4. User selects one or more DR records.
5. User clicks Okay/Post.
6. System calls global posting function with doc code DR.
7. Posting procedure finalizes selected records, posts picked FG stock movement,
   finalizes FG picking allocation, and updates GL balances.
================================================================================
*/

const PostDR = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [userPassword, setUserPassword] = useState(null);

  const alertFired = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Load records for posting
  |--------------------------------------------------------------------------
  | endpoint: postingDR
  | This should call sproc_PHP_DR @mode = 'Posting'
  */
  useEffect(() => {
    let isMounted = true;

    const fetchPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingDR";
        const response = await fetchDataJson(endpoint);

        const postingRows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingRows.length === 0 && !alertFired.current) {
          useSwalInfoAlert("No Records Found", "There are no records to display.");
          alertFired.current = true;
          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(postingRows);
          setColConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching DR posting data:", error);

        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: "Unable to load Delivery Receipt records for posting.",
        });

        onClose?.();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPostingData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  /*
  |--------------------------------------------------------------------------
  | Post selected records
  |--------------------------------------------------------------------------
  | useHandlePostTran will call posting API/procedure using doc code DR.
  */
  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "DR",
      userCode,
      setLoading,
      onClose
    );
  };

  /*
  |--------------------------------------------------------------------------
  | View document helper
  |--------------------------------------------------------------------------
  | Accepts possible key names:
  | - drNo from DR posting endpoint
  | - docNo from generic posting endpoint
  */
  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo = row.drNo || row.docNo || row.DRNo || row.DR_NO || null;
    const branchCode = row.branchCode || row.branch_code || null;

    return { docNo, branchCode };
  };

  /*
  |--------------------------------------------------------------------------
  | Open DR document in new tab
  |--------------------------------------------------------------------------
  | Make sure this route matches your React Router path.
  */
  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine DR No. or Branch Code.",
      });
      return;
    }

    const DR_VIEW_URL = "/page/DR";
    const url =
      `${window.location.origin}${DR_VIEW_URL}` +
      `?drNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize Delivery Receipt"
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

export default PostDR;
