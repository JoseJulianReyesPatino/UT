import React from "react";

interface TourContextValue {
  isAdminTourActive: boolean;
  isDocenteTourActive: boolean;
}

export const TourContext = React.createContext<TourContextValue>({ isAdminTourActive: false, isDocenteTourActive: false });

export function useTourActive(): TourContextValue {
  return React.useContext(TourContext);
}
