import { createContext, useContext, useState } from 'react';

const RequestContext = createContext(null);

export function RequestProvider({ children }) {
  const [activeRequest, setActiveRequest] = useState(null);
  return (
    <RequestContext.Provider value={{ activeRequest, setActiveRequest }}>
      {children}
    </RequestContext.Provider>
  );
}

export const useRequest = () => useContext(RequestContext);