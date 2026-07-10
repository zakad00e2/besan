import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { demoDashboardState } from "./dashboard-data";
import type {
  Appointment,
  CustomerNote,
  CustomerStage,
  DashboardState,
  ReminderSettings,
} from "./dashboard-model";

export type DashboardAction =
  | { type: "appointment/add"; appointment: Appointment }
  | { type: "appointment/update"; appointment: Appointment }
  | { type: "customer/stage"; customerId: string; stage: CustomerStage }
  | { type: "customer/note"; customerId: string; note: CustomerNote }
  | { type: "availability/toggle"; slotId: string }
  | { type: "reminders/update"; settings: ReminderSettings };

type DashboardContextValue = {
  state: DashboardState;
  dispatch: Dispatch<DashboardAction>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "appointment/add":
      return { ...state, appointments: [...state.appointments, action.appointment] };
    case "appointment/update":
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.appointment.id ? action.appointment : appointment,
        ),
      };
    case "customer/stage":
      return {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.customerId
            ? { ...customer, stage: action.stage, updatedAt: new Date().toISOString() }
            : customer,
        ),
      };
    case "customer/note":
      return {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.customerId
            ? {
                ...customer,
                notes: [...customer.notes, action.note],
                updatedAt: action.note.createdAt,
              }
            : customer,
        ),
      };
    case "availability/toggle":
      return {
        ...state,
        availability: state.availability.map((slot) =>
          slot.id === action.slotId ? { ...slot, enabled: !slot.enabled } : slot,
        ),
      };
    case "reminders/update":
      return { ...state, reminderSettings: action.settings };
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, demoDashboardState);

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const value = useContext(DashboardContext);

  if (!value) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }

  return value;
}
