import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from '../../../Lookup/SearchGlobalGLPostingv1.jsx';
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from '@/NAYSA Cloud/Global/utilities.jsx';

const POSTING_ENDPOINT = 'postingRMIS';
const DOC_TYPE = 'RMIS';

const PostRMIS = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [userPassword, setUserPassword] = useState(null);

  const alertFired = useRef(false);

  const getValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return '';
  };

  const safeJsonParse = (value, fallback = []) => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return fallback;

    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return parsed ?? fallback;
    } catch (error) {
      console.error('RMIS posting JSON parse error:', error, value);
      return fallback;
    }
  };

  const unwrapPostingPayload = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
      if (payload[0]?.result !== undefined) return safeJsonParse(payload[0].result, []);
      if (payload[0]?.Result !== undefined) return safeJsonParse(payload[0].Result, []);
      if (payload[0]?.RESULT !== undefined) return safeJsonParse(payload[0].RESULT, []);
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      if (payload.data[0]?.result !== undefined) return safeJsonParse(payload.data[0].result, []);
      if (payload.data[0]?.Result !== undefined) return safeJsonParse(payload.data[0].Result, []);
      if (payload.data[0]?.RESULT !== undefined) return safeJsonParse(payload.data[0].RESULT, []);
      return payload.data;
    }

    if (payload?.result !== undefined) return safeJsonParse(payload.result, []);
    if (payload?.Result !== undefined) return safeJsonParse(payload.Result, []);
    if (payload?.RESULT !== undefined) return safeJsonParse(payload.RESULT, []);

    if (typeof payload === 'string') return safeJsonParse(payload, []);

    return [];
  };

  const formatDateOnly = (value) => {
    if (!value) return '';

    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.substring(0, 10);

    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime())
      ? text.substring(0, 10)
      : dateValue.toISOString().split('T')[0];
  };

  const toAmount = (value) => {
    const num = Number(value ?? 0);
    return Number.isNaN(num) ? 0 : num;
  };

  const toBool = (value) => {
  if (value === true) return true;
  if (value === false) return false;

  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'y' || text === 'yes';
};

const normalizeColumnConfig = (columns) =>
  (Array.isArray(columns) ? columns : [])
    .map((column) => {
      const key = getValue(
        column.key,
        column.colName,
        column.ColName,
        column.COLUMN_NAME,
        column.columnName,
        column.ColumnName,
        column.fieldName,
        column.FieldName,
        column.field,
        column.name,
        column.accessorKey,
        column.dataField
      );

      if (!key) return null;

      const label = getValue(
        column.label,
        column.caption,
        column.Caption,
        column.CAPTION,
        column.header,
        column.Header,
        column.HEADER,
        column.headerName,
        column.HeaderName,
        column.title,
        key
      );

      const isGroupId = String(key).trim().toLowerCase() === 'groupid';

      const hidden =
        isGroupId ||
        toBool(column.hidden) ||
        toBool(column.Hidden) ||
        toBool(column.hide) ||
        toBool(column.Hide) ||
        toBool(column.HIDE) ||
        toBool(column.isHidden) ||
        toBool(column.IsHidden) ||
        column.visible === false ||
        column.Visible === false ||
        column.VISIBLE === false ||
        String(column.visible ?? '').trim().toLowerCase() === 'false' ||
        String(column.Visible ?? '').trim().toLowerCase() === 'false' ||
        String(column.VISIBLE ?? '').trim().toLowerCase() === 'false' ||
        column.show === false ||
        String(column.show ?? '').trim().toLowerCase() === 'false';

      return {
        ...column,
        key,
        label,
        hidden,
        hide: hidden,
        isHidden: hidden,
        visible: !hidden,
        width: column.width || column.Width || column.WIDTH || 140,
      };
    })
    .filter(Boolean);

  const makeFallbackCol = (key, label, width = 140, renderType = 'text', roundingOff = 2) => ({
    key,
    label,
    width,
    hidden: false,
    renderType,
    roundingOff,
  });

  const getFallbackColConfig = () => [
    makeFallbackCol('Branch', 'Branch', 90),
    makeFallbackCol('RMIS No', 'RMIS No', 120),
    makeFallbackCol('RMIS Date', 'RMIS Date', 120, 'date'),
    makeFallbackCol('Warehouse', 'Warehouse', 130),
    makeFallbackCol('Warehouse Name', 'Warehouse Name', 180),
    makeFallbackCol('Location', 'Location', 120),
    makeFallbackCol('Location Name', 'Location Name', 180),
    makeFallbackCol('Requesting Dept.', 'Requesting Dept.', 180),
    makeFallbackCol('Item Amount', 'Item Amount', 140, 'number', 2),
    makeFallbackCol('Remarks', 'Remarks', 220),
  ];

  const normalizePostingRows = (rows) => {
    return (Array.isArray(rows) ? rows : []).map((row, index) => {
      const branchCode = getValue(
        row.Branch,
        row.branchCode,
        row.branch_code,
        row.BRANCH_CODE
      );

      const groupId = getValue(
        row.groupId,
        row.group_id,
        row.GroupId,
        row.GROUP_ID,
        row.rmisId,
        row.rmis_id,
        row.RMIS_ID,
        row.rmisHdId,
        row.rmis_hd_id,
        row.documentID,
        row.documentId,
        row.docId,
        row.tranId
      );

      const rmisNo = getValue(
        row['RMIS No'],
        row.rmisNo,
        row.rmis_no,
        row.RMIS_NO,
        row.docNo,
        row.documentNo
      );

      const rmisDate = getValue(
        row['RMIS Date'],
        row.rmisDate,
        row.rmis_date,
        row.RMIS_DATE,
        row.docDate
      );

      const whCode = getValue(
        row.Warehouse,
        row.whCode,
        row.whouseCode,
        row.whouse_code,
        row.WHOUSE_CODE
      );

      const whName = getValue(
        row['Warehouse Name'],
        row.whName,
        row.whouseName,
        row.whouse_name,
        row.WHOUSE_NAME
      );

      const locCode = getValue(
        row.Location,
        row.locCode,
        row.loc_code,
        row.LOC_CODE
      );

      const locName = getValue(
        row['Location Name'],
        row.locName,
        row.loc_name,
        row.LOC_NAME
      );

      const reqDept = getValue(
        row['Requesting Dept.'],
        row['Requesting Dept'],
        row.reqDept,
        row.req_dept,
        row.REQ_DEPT,
        row.requestingDept,
        row.requestDept
      );

      const reqDeptName = getValue(
        row['Requesting Dept. Name'],
        row.reqDeptName,
        row.req_dept_name,
        row.requestingDeptName
      );

      const remarks = getValue(row.Remarks, row.remarks, row.REMARKS);

      const itemAmount = toAmount(getValue(
        row['Item Amount'],
        row.itemAmount,
        row.item_amount,
        row.ITEM_AMOUNT,
        row.totalAmount
      ));

      const totalDebit = toAmount(getValue(
        row['Total Debit'],
        row.totalDebit,
        row.total_debit,
        row.TOTAL_DEBIT
      ));

      const totalCredit = toAmount(getValue(
        row['Total Credit'],
        row.totalCredit,
        row.total_credit,
        row.TOTAL_CREDIT
      ));

      const docStatus = getValue(
        row['Doc Status'],
        row.docStatus,
        row.rmisStatus,
        row.rmis_status,
        row.DOC_STATUS
      );

      return {
        ...row,

        lnNo: row.lnNo || row.lineNo || index + 1,
        lineNo: row.lineNo || row.lnNo || index + 1,
        _rowKey: `${groupId || rmisNo || 'RMIS'}-${index}`,

        groupId,
        group_id: groupId,
        rmisId: groupId,
        rmis_id: groupId,
        documentID: groupId,
        documentId: groupId,
        docId: groupId,
        tranId: groupId,

        Branch: branchCode,
        branchCode,
        branch_code: branchCode,

        'RMIS No': rmisNo,
        rmisNo,
        rmis_no: rmisNo,
        docNo: rmisNo,
        documentNo: rmisNo,

        'RMIS Date': formatDateOnly(rmisDate),
        rmisDate: formatDateOnly(rmisDate),
        rmis_date: formatDateOnly(rmisDate),
        docDate: formatDateOnly(rmisDate),

        Warehouse: whCode,
        whCode,
        whouseCode: whCode,
        whouse_code: whCode,

        'Warehouse Name': whName,
        whName,
        whouseName: whName,

        Location: locCode,
        locCode,
        loc_code: locCode,

        'Location Name': locName,
        locName,

        'Requesting Dept.': reqDeptName || reqDept,
        'Requesting Dept': reqDeptName || reqDept,
        reqDept,
        req_dept: reqDept,
        requestingDept: reqDeptName || reqDept,
        requestingDeptName: reqDeptName,

        'Item Amount': itemAmount,
        itemAmount,
        item_amount: itemAmount,
        totalAmount: itemAmount,

        'Total Debit': totalDebit,
        totalDebit,

        'Total Credit': totalCredit,
        totalCredit,

        'Doc Status': docStatus,
        docStatus,

        Remarks: remarks,
        remarks,
      };
    });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      alertFired.current = false;
      setModalReady(false);

      try {
        const response = await fetchDataJson(POSTING_ENDPOINT);
        const rawData = unwrapPostingPayload(response);
        const normalizedData = normalizePostingRows(rawData);

        console.log('RMIS Posting Full Response:', response);
        console.log('RMIS Posting Raw Data:', rawData);
        console.log('RMIS Posting Normalized Data:', normalizedData);

        if (!normalizedData.length) {
          if (!alertFired.current) {
            useSwalValidationAlert({
              icon: 'info',
              title: 'No Records Found',
              message: 'There are no RMIS records available for posting.',
            });

            alertFired.current = true;
          }

          onClose?.();
          return;
        }

        let colConfig = [];
        try {
          colConfig = normalizeColumnConfig(await useSelectedHSColConfig(POSTING_ENDPOINT));
        } catch (configError) {
          console.warn('RMIS Posting column config error:', configError);
        }

        if (!colConfig.length) {
          colConfig = getFallbackColConfig();
        }

        if (isMounted) {
          setData(normalizedData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error('Error fetching RMIS posting records:', error);

        useSwalValidationAlert({
          icon: 'error',
          title: 'Loading Error',
          message:
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load RMIS records for posting.',
        });
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
    const normalizedSelected = normalizePostingRows(selectedData);
    const rowsMissingGroupId = normalizedSelected.filter((row) => !row.groupId);

    if (!normalizedSelected.length) {
      useSwalValidationAlert({
        icon: 'warning',
        title: 'No Selected Records',
        message: 'Please select at least one RMIS record to post.',
      });
      return;
    }

    if (rowsMissingGroupId.length) {
      useSwalValidationAlert({
        icon: 'warning',
        title: 'Missing Document ID',
        message: 'One or more selected RMIS records do not have a valid document ID for posting.',
      });
      return;
    }

    setUserPassword(userPw || null);
    await useHandlePostTran(
      normalizedSelected,
      userPw,
      DOC_TYPE,
      userCode,
      setLoading,
      onClose
    );
  };

  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo = getValue(
      row['RMIS No'],
      row.rmisNo,
      row.rmis_no,
      row.RMIS_NO,
      row.docNo,
      row.documentNo
    );

    const branchCode = getValue(
      row.Branch,
      row.branchCode,
      row.branch_code,
      row.BRANCH_CODE
    );

    return { docNo, branchCode };
  };

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: 'warning',
        title: 'Missing keys',
        message: 'Cannot determine RMIS No or Branch Code.',
      });
      return;
    }

    const TRAN_VIEW_URL = '/page/RMIS';
    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?rmisNo=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(branchCode)}` +
      `&viewDocument=true`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Finalize RM Issuance Slip"
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

export default PostRMIS;
