import React, { createContext, useContext, useState } from "react";

const ResetContext = createContext();

export const ResetProvider = ({ children }) => {
  const [onSave, setOnSave] = useState(null);
  const [onReset, setOnReset] = useState(null);

  return (
    <ResetContext.Provider value={{ onSave, setOnSave, onReset, setOnReset }}>
      {children}
    </ResetContext.Provider>
  );
};

export const useReset = () => useContext(ResetContext);
