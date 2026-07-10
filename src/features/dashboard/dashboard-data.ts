import {
  createAvailabilitySlots,
  type Appointment,
  type Customer,
  type DashboardState,
} from "./dashboard-model";

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "ليان منصور",
    phone: "+970 59 123 4567",
    stage: "new-inquiry",
    updatedAt: "2026-07-05T08:00:00.000Z",
    notes: [],
    activity: [{ id: "activity-1", label: "تم إنشاء ملف الزبونة", createdAt: "2026-07-05T08:00:00.000Z" }],
  },
  {
    id: "customer-2",
    name: "سارة خليل",
    phone: "+970 56 456 7812",
    stage: "measurements-taken",
    updatedAt: "2026-07-08T09:30:00.000Z",
    notes: [{ id: "note-1", body: "تفضّل أقمشة طبيعية بقصّة هادئة.", createdAt: "2026-07-08T09:30:00.000Z" }],
    activity: [],
  },
  {
    id: "customer-3",
    name: "نور حمدان",
    phone: "+962 79 222 8811",
    stage: "design-production",
    updatedAt: "2026-07-09T11:00:00.000Z",
    notes: [],
    activity: [],
  },
  {
    id: "customer-4",
    name: "مريم عودة",
    phone: "+970 59 700 4432",
    stage: "fitting",
    updatedAt: "2026-07-06T12:00:00.000Z",
    notes: [],
    activity: [],
  },
  {
    id: "customer-5",
    name: "تالا درويش",
    phone: "+962 78 919 3030",
    stage: "ready-delivery",
    updatedAt: "2026-07-10T07:15:00.000Z",
    notes: [],
    activity: [],
  },
  {
    id: "customer-6",
    name: "ريم شحادة",
    phone: "+970 56 333 9021",
    stage: "completed",
    updatedAt: "2026-07-03T16:30:00.000Z",
    notes: [],
    activity: [],
  },
];

const appointments: Appointment[] = [
  { id: "appointment-1", customerId: "customer-1", type: "design", purpose: "جلسة أولى", startsAt: "2026-07-10T10:00:00.000Z", endsAt: "2026-07-10T11:00:00.000Z", status: "confirmed", reminderStatus: "sent" },
  { id: "appointment-2", customerId: "customer-2", type: "design", purpose: "أخذ القياسات", startsAt: "2026-07-10T12:00:00.000Z", endsAt: "2026-07-10T13:00:00.000Z", status: "confirmed", reminderStatus: "sent" },
  { id: "appointment-3", customerId: "customer-3", type: "workshop", purpose: "ورشة الكورسيه", startsAt: "2026-07-11T10:00:00.000Z", endsAt: "2026-07-11T11:00:00.000Z", status: "pending", reminderStatus: "scheduled" },
  { id: "appointment-4", customerId: "customer-4", type: "design", purpose: "بروفة أولى", startsAt: "2026-07-12T13:00:00.000Z", endsAt: "2026-07-12T14:00:00.000Z", status: "confirmed", reminderStatus: "scheduled" },
  { id: "appointment-5", customerId: "customer-5", type: "design", purpose: "تسليم القطعة", startsAt: "2026-07-13T15:00:00.000Z", endsAt: "2026-07-13T16:00:00.000Z", status: "confirmed", reminderStatus: "scheduled" },
  { id: "appointment-6", customerId: "customer-6", type: "workshop", purpose: "ورشة أساسيات الباترون", startsAt: "2026-07-02T10:00:00.000Z", endsAt: "2026-07-02T11:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-7", customerId: "customer-2", type: "design", purpose: "استشارة قماش", startsAt: "2026-07-07T14:00:00.000Z", endsAt: "2026-07-07T15:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-8", customerId: "customer-3", type: "workshop", purpose: "دورة مصغرة خاصة", startsAt: "2026-07-14T11:00:00.000Z", endsAt: "2026-07-14T12:00:00.000Z", status: "pending", reminderStatus: "not-scheduled" },
  { id: "appointment-9", customerId: "customer-4", type: "design", purpose: "موعد قياسات", startsAt: "2026-06-29T12:00:00.000Z", endsAt: "2026-06-29T13:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-10", customerId: "customer-1", type: "workshop", purpose: "ورشة يوم واحد", startsAt: "2026-07-15T16:00:00.000Z", endsAt: "2026-07-15T17:00:00.000Z", status: "cancelled", reminderStatus: "not-scheduled" },
];

export const demoDashboardState: DashboardState = {
  customers,
  appointments,
  availability: createAvailabilitySlots(),
  reminderSettings: { customerWhatsapp: true, supervisorDashboard: true, hoursBefore: 24 },
};
