import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ReactDOM from "react-dom";

/*
================================================================================
POST FGAJ WORKFLOW
================================================================================
1. Modal opens from FGAJ transaction page.
2. System loads open FG Adjustment records from endpoint: postingFGAJ.
3. System loads table column setup from hs_colconfig using endpoint postingFGAJ.
4. User selects one or more FGAJ records.
5. User clicks Okay/Post.
6. System calls global posting function with doc code FGAJ.
7. Posting procedure finalizes selected records and updates FG inventory movement.
================================================================================
*/

const PostFGAJ = ({ isOpen, onClose, userCode }) => {
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
  | endpoint: postingFGAJ
  | This should call sproc_PHP_FGAJ @mode = 'Posting'
  */
  useEffect(() => {
    let isMounted = true;

    const fetchPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingFGAJ";
        const response = await fetchDataJson(endpoint);

        const postingRows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingRows.length === 0 && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no FG Adjustment records to post.",
          });

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
        console.error("Error fetching FGAJ posting data:", error);

        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: "Unable to load FG Adjustment records for posting.",
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
  | useHandlePostTran will call posting API/procedure using doc code FGAJ.
  */
  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "FGAJ",
      userCode,
      setLoading,
      onClose
    );
  };

  /*
  |--------------------------------------------------------------------------
  | View document helper
  |--------------------------------------------------------------------------
  | Accepts both possible key names:
  | - fgajNo from FGAJ posting endpoint
  | - docNo from generic posting endpoint
  */
  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo = row.fgajNo || row.docNo || row.FGAJNo || row.FGAJ_NO || null;
    const branchCode = row.branchCode || row.branch_code || null;

    return { docNo, branchCode };
  };

  /*
  |--------------------------------------------------------------------------
  | Open FGAJ document in new tab
  |--------------------------------------------------------------------------
  | Make sure this route matches your React Router path.
  */
  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine FGAJ No. or Branch Code.",
      });
      return;
    }

    const FGAJ_VIEW_URL = "/page/FGAJ";
    const url =
      `${window.location.origin}${FGAJ_VIEW_URL}` +
      `?fgajNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize FG Inventory Adjustment"
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

export default PostFGAJ;
