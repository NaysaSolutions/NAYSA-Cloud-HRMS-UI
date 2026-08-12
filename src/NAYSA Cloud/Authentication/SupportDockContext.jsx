import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const SupportDockContext = createContext(null);

export const SupportDockProvider = ({ children }) => {
  const [manual, setManual] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openManual = useCallback((manualData) => {
    setManual(manualData || null);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const minimize = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(true);
  }, []);

  const restore = useCallback(() => {
    if (!manual) return;
    setIsOpen(true);
    setIsMinimized(false);
  }, [manual]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setManual(null);
  }, []);

  const value = useMemo(
    () => ({
      manual,
      isOpen,
      isMinimized,
      openManual,
      minimize,
      restore,
      close,
    }),
    [
      manual,
      isOpen,
      isMinimized,
      openManual,
      minimize,
      restore,
      close,
    ]
  );

  return (
    <SupportDockContext.Provider value={value}>
      {children}
    </SupportDockContext.Provider>
  );
};

export const useSupportDock = () => {
  const context = useContext(SupportDockContext);

  if (!context) {
    throw new Error(
      "useSupportDock must be used inside SupportDockProvider."
    );
  }

  return context;
};
