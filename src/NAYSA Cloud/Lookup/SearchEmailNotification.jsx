import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const SearchEmailNotification = ({ isOpen, onClose, initialValues }) => {
  const [emailNotifier, setEmailNotifier] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSSL, setSmtpSSL] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [notificationReceiver, setNotificationReceiver] = useState("");
  const [hostAddress, setHostAddress] = useState("");
  const [hostShared, setHostShared] = useState("");
  const [localDestination, setLocalDestination] = useState("");

  // Load current values from parent each time modal opens
  useEffect(() => {
    if (!isOpen) return;
    setEmailNotifier(initialValues?.emailNotifier || "");
    setSmtpHost(initialValues?.smtpHost || "");
    setSmtpPort(initialValues?.smtpPort || "");
    setSmtpPassword(initialValues?.smtpPassword || "");
    setSmtpSSL(!!initialValues?.smtpSSL);
    setProfileName(initialValues?.profileName || "");
    setNotificationReceiver(initialValues?.notificationReceiver || "");
    setHostAddress(initialValues?.hostAddress || "");
    setHostShared(initialValues?.hostShared || "");
    setLocalDestination(initialValues?.localDestination || "");
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleSave = () => {
    onClose({
      emailNotifier,
      smtpHost,
      smtpPort,
      smtpPassword,
      smtpSSL,
      profileName,
      notificationReceiver,
      hostAddress,
      hostShared,
      localDestination,
    });
  };

  const handleCancel = () => {
    onClose(null); // do not change anything
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Close Icon */}
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">
          Email Notification Parameter
        </h2>

        <div className="flex-1 overflow-auto p-4 space-y-4 text-xs">
          {/* Application Set-up */}
          <div>
            <div className="font-semibold text-[11px] mb-1">
              Application Set-up
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Email Notifier (Host)</label>
              <input
                type="email"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={emailNotifier}
                onChange={(e) => setEmailNotifier(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">SMTP Host</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
              <span className="w-10 text-right">Port</span>
              <input
                type="number"
                className="w-20 global-ref-textbox-ui global-ref-textbox-enabled"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
              <label className="ml-3 flex items-center gap-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={smtpSSL}
                  onChange={(e) => setSmtpSSL(e.target.checked)}
                />
                SSL
              </label>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Password</label>
              <input
                type="password"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Database Set-up */}
          <div>
            <div className="font-semibold text-[11px] mb-1">
              Database Set-up
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Profile Name</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Notification Receiver</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={notificationReceiver}
                onChange={(e) => setNotificationReceiver(e.target.value)}
              />
            </div>
          </div>

          {/* Application File Update Set-up */}
          <div>
            <div className="font-semibold text-[11px] mb-1">
              Application File Update Set-up
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Host Address</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Host Shared</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={hostShared}
                onChange={(e) => setHostShared(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <label className="w-40">Local Destination</label>
              <input
                type="text"
                className="flex-1 global-ref-textbox-ui global-ref-textbox-enabled"
                value={localDestination}
                onChange={(e) => setLocalDestination(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 text-xs">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchEmailNotification;
