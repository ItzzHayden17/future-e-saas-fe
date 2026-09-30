import React, { createContext, useContext, useEffect, useState } from "react";

const InputContext = createContext();

export const InputProvider = ({ children }) => {
  const [lastKey, setLastKey] = useState(null);
  const [keyPressId, setKeyPressId] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      setLastKey(event.key);
      setKeyPressId((id) => id + 1);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <InputContext.Provider
      value={{
        lastKey,
        keyPressId,
      }}
    >
      {children}
    </InputContext.Provider>
  );
};

export const useInput = () => {
  return useContext(InputContext);
};