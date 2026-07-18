import React from "react";

interface TourContextValue {
  isAdminTourActive: boolean;
}

export const TourContext = React.createContext<TourContextValue>({ isAdminTourActive: false });

export function useTourActive(): TourContextValue {
  return React.useContext(TourContext);
}
