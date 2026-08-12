import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from '../../../Lookup/SearchGlobalGLPostingv1.jsx';
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from '@/NAYSA Cloud/Global/utilities.jsx';

const POSTING_ENDPOINT = 'postingMSIS';
const DOC_TYPE = 'MSIS';

const PostMSIS = ({ isOpen, onClose, userCode }) => {
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
      console.error('MSIS posting JSON parse error:', error, value);
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
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/,/g, '')
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
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
    makeFallbackCol('MSIS No', 'MSIS No', 120),
    makeFallbackCol('MSIS Date', 'MSIS Date', 120, 'date'),
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
        row.msisId,
        row.msis_id,
        row.MSIS_ID,
        row.msisHdId,
        row.msis_hd_id,
        row.documentID,
        row.documentId,
        row.docId,
        row.tranId
      );

      const msisNo = getValue(
        row['MSIS No'],
        row.msisNo,
        row.msis_no,
        row.MSIS_NO,
        row.docNo,
        row.documentNo
      );

      const msisDate = getValue(
        row['MSIS Date'],
        row.msisDate,
        row.msis_date,
        row.MSIS_DATE,
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
        row.msisStatus,
        row.msis_status,
        row.DOC_STATUS
      );

      return {
        ...row,

        lnNo: row.lnNo || row.lineNo || index + 1,
        lineNo: row.lineNo || row.lnNo || index + 1,
        _rowKey: `${groupId || msisNo || 'MSIS'}-${index}`,

        groupId,
        group_id: groupId,
        msisId: groupId,
        msis_id: groupId,
        documentID: groupId,
        documentId: groupId,
        docId: groupId,
        tranId: groupId,

        Branch: branchCode,
        branchCode,
        branch_code: branchCode,

        'MSIS No': msisNo,
        msisNo,
        msis_no: msisNo,
        docNo: msisNo,
        documentNo: msisNo,

        'MSIS Date': formatDateOnly(msisDate),
        msisDate: formatDateOnly(msisDate),
        msis_date: formatDateOnly(msisDate),
        docDate: formatDateOnly(msisDate),

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

        console.log('MSIS Posting Full Response:', response);
        console.log('MSIS Posting Raw Data:', rawData);
        console.log('MSIS Posting Normalized Data:', normalizedData);

        if (!normalizedData.length) {
          if (!alertFired.current) {
            useSwalValidationAlert({
              icon: 'info',
              title: 'No Records Found',
              message: 'There are no MSIS records available for posting.',
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
          console.warn('MSIS Posting column config error:', configError);
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
        console.error('Error fetching MSIS posting records:', error);

        useSwalValidationAlert({
          icon: 'error',
          title: 'Loading Error',
          message:
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to load MSIS records for posting.',
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
        message: 'Please select at least one MSIS record to post.',
      });
      return;
    }

    if (rowsMissingGroupId.length) {
      useSwalValidationAlert({
        icon: 'warning',
        title: 'Missing Document ID',
        message: 'One or more selected MSIS records do not have a valid document ID for posting.',
      });
      return;
    }

    setUserPassword(userPw || null);

    console.log('✅ MSIS Selected for Posting:', normalizedSelected);
console.log('✅ MSIS Posting Payload Expected:', {
  userCode,
  dt1: normalizedSelected.map((row, index) => ({
    lnNo: row.lnNo || index + 1,
    groupId: row.groupId,
  })),
});

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
      row['MSIS No'],
      row.msisNo,
      row.msis_no,
      row.MSIS_NO,
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
        message: 'Cannot determine MSIS No or Branch Code.',
      });
      return;
    }

    const TRAN_VIEW_URL = '/page/MSIS';
    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?msisNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize MS Issuance Slip"
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

export default PostMSIS;
