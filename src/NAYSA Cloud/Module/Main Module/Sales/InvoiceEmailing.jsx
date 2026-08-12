import { useEffect, useRef, useState } from "react";
import {
  fetchDataJson,
  postRequest,
} from "../../../Configuration/BaseURL.jsx";

import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";

import {
  useSwalValidationAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const InvoiceQueuing = ({
  isOpen,
  onClose,
  userCode,
}) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);

  const alertFired = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) {
        return;
      }

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "iesPosting";

        /*
         * Load eligible SI, SVI, ARCM and ARDM records.
         */
        const response = await fetchDataJson(endpoint);

        if (response?.success === false) {
          throw new Error(
            response?.message ||
              "Unable to retrieve Invoice Queuing records."
          );
        }

        const rawResult =
          response?.data?.[0]?.result ??
          response?.data?.result ??
          null;

        let postingData = [];

        if (typeof rawResult === "string" && rawResult.trim() !== "") {
          postingData = JSON.parse(rawResult);
        } else if (Array.isArray(response?.data)) {
          postingData = response.data;
        }

        if (!Array.isArray(postingData)) {
          postingData = [];
        }

        if (
          postingData.length === 0 &&
          !alertFired.current
        ) {
          useSwalInfoAlert(
            "No Records Found",
            "There are no eligible invoices for customer notification."
          );

          alertFired.current = true;
          onClose?.();
          return;
        }

        /*
         * Columns must come exclusively from HS_COLCONFIG.
         * There is intentionally no default column configuration.
         */
        const colConfig =
          await useSelectedHSColConfig(endpoint);

        if (
          !Array.isArray(colConfig) ||
          colConfig.length === 0
        ) {
          useSwalValidationAlert({
            icon: "warning",
            title: "Missing Column Configuration",
            message:
              "No HS_COLCONFIG records were found for endpoint eisPosting.",
          });

          onClose?.();
          return;
        }

        if (isMounted) {
          setData(postingData);
          setColConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error(
          "Error loading Invoice Queuing records:",
          error
        );

        useSwalValidationAlert({
          icon: "error",
          title: "Invoice Queuing",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load Invoice Queuing records.",
        });

        onClose?.();
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
      setData([]);
      setColConfigData([]);
    };
  }, [isOpen, onClose]);

  const generateRequestId = () => {
    const dateStamp = new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);

    const randomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `NAYSA-CLOUD-${dateStamp}-${randomCode}`;
  };

  const handlePost = async (
    selectedData,
    userPassword
  ) => {
    if (
      !Array.isArray(selectedData) ||
      selectedData.length === 0
    ) {
      const message =
        "Please select at least one invoice.";

      useSwalValidationAlert({
        icon: "warning",
        title: "No Selected Invoice",
        message,
      });

      return {
        success: false,
        message,
      };
    }

    /*
     * Normalize the selected rows into the exact structure expected by
     * dbo.sproc_PHP_InvoiceTransmission.
     */
    const selectedDocuments = selectedData.map(
      (row) => ({
        documentType: String(
          row?.documentType ??
            row?.sourceDocumentType ??
            ""
        )
          .trim()
          .toUpperCase(),

        branchCode: String(
          row?.branchCode ?? ""
        ).trim(),

        groupId: String(
          row?.groupId ?? ""
        ).trim(),
      })
    );

    const invalidRow = selectedDocuments.find(
      (row) =>
        !row.documentType ||
        !row.branchCode ||
        !row.groupId
    );

    if (invalidRow) {
      const message =
        "One or more selected records are missing Document Type, Branch Code, or Group ID.";

      useSwalValidationAlert({
        icon: "warning",
        title: "Incomplete Selection",
        message,
      });

      return {
        success: false,
        message,
      };
    }

    const unsupportedDocument =
      selectedDocuments.find(
        (row) =>
          ![
            "SI",
            "SVI",
            "ARCM",
            "ARDM",
          ].includes(row.documentType)
      );

    if (unsupportedDocument) {
      const message =
        `Document Type ${unsupportedDocument.documentType} ` +
        "is not supported for Invoice Queuing.";

      useSwalValidationAlert({
        icon: "warning",
        title: "Unsupported Document Type",
        message,
      });

      return {
        success: false,
        message,
      };
    }

    setLoading(true);

    try {
      const requestId = generateRequestId();

      const requestBody = {
        /*
         * These credentials are used only by the existing
         * posting.credential middleware.
         */
        userCode: userCode || "",
        userPassword: userPassword || "",

        /*
         * This is the exact selection wrapper expected by
         * dbo.sproc_PHP_InvoiceTransmission.
         */
        json_data: {
          userCode: userCode || "",
          requestId,
          dt1: selectedDocuments,
        },
      };

      /*
       * Never log the actual posting password.
       */
      console.log(
        "Invoice Queuing request:",
        {
          userCode: requestBody.userCode,
          userPassword:
            requestBody.userPassword
              ? "[PROVIDED]"
              : "[MISSING]",
          json_data: requestBody.json_data,
        }
      );

      const rawResponse = await postRequest(
        "invoiceEmailing",
        requestBody
      );

      /*
       * BaseURL helpers may return either:
       *   1. the JSON response body directly; or
       *   2. an Axios-style object containing response.data.
       *
       * The controller now returns the accepted ESRS result at the
       * top level. It no longer returns the old SQL result under
       * response.data[0].result.
       */
      const response =
        rawResponse?.data &&
        typeof rawResponse.data === "object" &&
        !Array.isArray(rawResponse.data) &&
        (
          Object.prototype.hasOwnProperty.call(
            rawResponse.data,
            "success"
          ) ||
          Object.prototype.hasOwnProperty.call(
            rawResponse.data,
            "status"
          ) ||
          Object.prototype.hasOwnProperty.call(
            rawResponse.data,
            "rows"
          )
        )
          ? rawResponse.data
          : rawResponse;

      console.log(
        "Invoice Queuing controller response:",
        response
      );

      if (
        !response ||
        typeof response !== "object"
      ) {
        throw new Error(
          "The Invoice Queuing API returned an invalid response."
        );
      }

      if (response?.success === false) {
        throw new Error(
          response?.message ||
            "Invoice Queuing failed."
        );
      }

      /*
       * The ESRS integration result is normally rows[0].
       * Keep a fallback to esrsResponse.rows[0] for compatibility.
       */
      const integrationRow =
        (
          Array.isArray(response?.rows)
            ? response.rows[0]
            : null
        ) ??
        (
          Array.isArray(
            response?.esrsResponse?.rows
          )
            ? response.esrsResponse.rows[0]
            : null
        ) ??
        {};

      const status = String(
        response?.status ??
          integrationRow?.status ??
          ""
      )
        .trim()
        .toUpperCase();

      if (status !== "ACCEPTED") {
        throw new Error(
          response?.message ||
            integrationRow?.message ||
            `Unexpected Invoice Queuing status: ${
              status || "UNKNOWN"
            }.`
        );
      }

      /*
       * Decode the per-document result only for display and diagnostics.
       * The controller's top-level ACCEPTED response is the authoritative
       * result of this request.
       */
      let acceptedDocuments = [];

      if (
        typeof integrationRow?.result ===
          "string" &&
        integrationRow.result.trim() !== ""
      ) {
        try {
          const parsedResult = JSON.parse(
            integrationRow.result
          );

          if (Array.isArray(parsedResult)) {
            acceptedDocuments =
              parsedResult;
          }
        } catch (parseError) {
          console.warn(
            "Unable to parse the ESRS per-document result:",
            parseError
          );
        }
      } else if (
        Array.isArray(integrationRow?.result)
      ) {
        acceptedDocuments =
          integrationRow.result;
      }

      const documentCount = Number(
        response?.documentCount ??
          integrationRow?.documentCount ??
          acceptedDocuments.length ??
          selectedDocuments.length
      );

      const insertedCount = Number(
        response?.insertedCount ??
          integrationRow?.insertedCount ??
          0
      );

      const duplicateCount = Number(
        response?.duplicateCount ??
          integrationRow?.duplicateCount ??
          0
      );

      const customerInsertedCount = Number(
        response?.customerInsertedCount ??
          integrationRow?.customerInsertedCount ??
          0
      );

      const customerUpdatedCount = Number(
        response?.customerUpdatedCount ??
          integrationRow?.customerUpdatedCount ??
          0
      );

      const helperResult =
        response?.customerNotificationHelperResult ??
        response?.esrsResponse
          ?.customerNotificationHelperResult ??
        null;

      const helperStatus = String(
        helperResult?.status ?? ""
      )
        .trim()
        .toUpperCase();

      /*
       * ACCEPTED means received by ESRS. It does not mean that the
       * customer email was already sent.
       */
      let successMessage =
        `${documentCount} document${
          documentCount === 1 ? "" : "s"
        } accepted by ESRS for customer notification.` +
        ` Inserted: ${insertedCount};` +
        ` Already existing: ${duplicateCount}.`;

      if (
        customerInsertedCount > 0 ||
        customerUpdatedCount > 0
      ) {
        successMessage +=
          ` Customers inserted: ${customerInsertedCount};` +
          ` refreshed: ${customerUpdatedCount}.`;
      }

      if (
        helperStatus === "IDLE" &&
        helperResult?.message
      ) {
        successMessage +=
          ` ${helperResult.message}`;
      }

      await useSwalSuccessAlert(
        "Invoice Queuing Accepted",
        successMessage
      );

      onClose?.();

      return {
        success: true,
        status,
        message:
          response?.message ??
          integrationRow?.message ??
          successMessage,
        data: response,
        documents: acceptedDocuments,
      };
    } catch (error) {
      console.error(
        "Invoice Queuing error:",
        error
      );

      const responseData =
        error?.response?.data ?? null;

      const message =
        responseData?.message ||
        error?.message ||
        "Unable to prepare the selected invoices.";

      const errorCode = String(
        responseData?.error ?? ""
      )
        .trim()
        .toUpperCase();

      if (
        errorCode ===
          "INVALID_CREDENTIALS" ||
        /incorrect password|invalid password/i.test(
          message
        )
      ) {
        await useSwalErrorAlert(
          "Incorrect Password",
          "The password you entered is incorrect. Please try again."
        );

        return {
          success: false,
          message: "Invalid credentials.",
          error: errorCode,
        };
      }

      /*
       * Allow GlobalGLPostingModalv1 to retain its required-password
       * prompt behavior when no password was entered.
       */
      if (
        errorCode ===
          "MISSING_CREDENTIALS" ||
        /password is missing/i.test(message)
      ) {
        return {
          success: false,
          message,
          error: errorCode,
        };
      }

      useSwalValidationAlert({
        icon: "error",
        title: "Invoice Queuing Failed",
        message,
      });

      return {
        success: false,
        message,
        diagnostic:
          responseData?.diagnostic ?? null,
      };
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (row) => {
    const pathUrl = String(
      row?.pathUrl ?? ""
    ).trim();

    if (!pathUrl) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Document URL",
        message:
          "The selected transaction has no document URL.",
      });

      return;
    }
    const url = /^https?:\/\//i.test(pathUrl)
      ? pathUrl
      : `${window.location.origin}${
          pathUrl.startsWith("/") ? "" : "/"
        }${pathUrl}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Invoice Queuing"
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

export default InvoiceQueuing;
