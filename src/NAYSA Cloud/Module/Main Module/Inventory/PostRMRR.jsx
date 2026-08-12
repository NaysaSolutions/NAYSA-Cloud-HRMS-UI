import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostRMRR = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "postingRMRR";
        const response = await fetchDataJson(endpoint);

        let rawData = [];

        if (Array.isArray(response?.data)) {
          if (response.data?.[0]?.result) {
            try {
              rawData = JSON.parse(response.data[0].result || "[]");
            } catch (err) {
              console.error("JSON parse error:", err);
              rawData = [];
            }
          } else {
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

        const normalizedRawData = rawData.map((row, index) => normalizePostingRow(row, index));
        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(normalizedRawData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching RMRR:", error);
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

  const getRowValue = (row, keys = []) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  };

  const normalizePostingRow = (row = {}, index = 0) => {
    const rrId = getRowValue(row, [
      "rrId",
      "RR_ID",
      "rr_id",
      "documentID",
      "DOCUMENT_ID",
      "documentId",
      "docId",
      "DOC_ID",
      "tranId",
      "TranId",
      "TRAN_ID",
      "id",
      "ID",
    ]);

    const rrNo = getRowValue(row, [
      "rrNo",
      "RR_NO",
      "rr_no",
      "rmrrNo",
      "RMRR_NO",
      "documentNo",
      "DOCUMENT_NO",
      "docNo",
      "DOC_NO",
    ]);

    const branchCode = getRowValue(row, [
      "branchCode",
      "BRANCH_CODE",
      "branch_code",
      "bCode",
      "BCode",
      "BCODE",
      "BC",
      "bc",
    ]);

    const oldGroupId = getRowValue(row, [
      "groupId",
      "GROUP_ID",
      "group_id",
      "GroupId",
      "GROUPID",
    ]);

    /*
      IMPORTANT:
      The posting sproc Finalize checks the selected key against rmrr_hd.rr_id.
      Therefore, groupId must be the HEADER rr_id when available.
      If your posting lookup only returns DT1 group_id, also apply the SQL patch
      named sproc_PHP_Posting_RMRR_resolve_posting_key_patch.sql.
    */
    const postingKey = rrId || oldGroupId || rrNo;

    return {
      ...row,
      lnNo: getRowValue(row, ["lnNo", "ln", "LN", "lineNo", "LINE_NO"]) || index + 1,
      groupId: postingKey,
      rrId: rrId || postingKey,
      documentID: rrId || postingKey,
      rrNo,
      branchCode,
    };
  };

  const normalizePostingRows = (selectedData) => {
    const rows = Array.isArray(selectedData) ? selectedData : [selectedData];
    return rows
      .filter(Boolean)
      .map((row, index) => normalizePostingRow(row, index));
  };

  // =========================================
  // POST RMRR
  // =========================================
  const handlePost = async (selectedData, userPw) => {
    const rowsForPosting = normalizePostingRows(selectedData);

    console.log("✅ RMRR POST normalized rows:", rowsForPosting);

    await useHandlePostTran(
      rowsForPosting,
      userPw,
      "RMRR",
      userCode,
      setLoading,
      onClose
    );
  };

  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo =
      row.rrNo ||
      row.rr_no ||
      row.RR_NO ||
      row.rmrrNo ||
      row.RMRR_NO ||
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
        message: "Cannot determine RR No or Branch Code",
      });
      return;
    }

    const TRAN_VIEW_URL = "/page/RMRR";
    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?rrNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize RM Receiving Report"
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

export default PostRMRR;
