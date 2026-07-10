import { useMemo, useState, type Dispatch } from "react";
import { toast } from "sonner";
import type { Appointment, Customer } from "./dashboard-model";
import { customerStages, stageLabels } from "./dashboard-model";
import type { DashboardAction } from "./dashboard-store";
import { DashboardEmptyState, StatusBadge } from "./dashboard-ui";

export function DashboardCustomerProfile({
  customer,
  appointments,
  dispatch,
  now = new Date(),
}: {
  customer: Customer;
  appointments: Appointment[];
  dispatch: Dispatch<DashboardAction>;
  now?: Date;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const { upcoming, previous } = useMemo(() => {
    const all = appointments
      .filter((item) => item.customerId === customer.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      upcoming: all.filter((item) => new Date(item.startsAt) >= now),
      previous: all.filter((item) => new Date(item.startsAt) < now).reverse(),
    };
  }, [appointments, customer.id, now]);
  function changeStage(stage: Customer["stage"]) {
    dispatch({ type: "customer/stage", customerId: customer.id, stage });
    setStatus("تم تحديث مرحلة الزبونة.");
    toast.success("تم تحديث مرحلة الزبونة.");
  }
  function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = note.trim();
    if (!body) {
      setStatus("اكتبي ملاحظة قبل الحفظ.");
      return;
    }
    dispatch({
      type: "customer/note",
      customerId: customer.id,
      note: { id: `note-${Date.now()}`, body, createdAt: new Date().toISOString() },
    });
    setNote("");
    setStatus("تمت إضافة الملاحظة.");
    toast.success("تمت إضافة الملاحظة.");
  }
  const appointmentList = (items: Appointment[], empty: string) =>
    items.length === 0 ? (
      <DashboardEmptyState title={empty} body="ستظهر التفاصيل هنا عند توفرها." />
    ) : (
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{item.purpose}</p>
              <p className="mt-1 text-xs text-slate-500" dir="ltr">
                {item.startsAt.slice(0, 10)} · {item.startsAt.slice(11, 16)}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    );
  return (
    <div className="space-y-6">
      <p className="sr-only" role="status">
        {status}
      </p>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{customer.name}</h2>
            <p className="mt-2 text-sm text-slate-500" dir="ltr">
              {customer.phone}
            </p>
          </div>
          <label className="text-sm text-slate-600">
            مرحلة الزبونة
            <select
              aria-label="مرحلة الزبونة"
              value={customer.stage}
              onChange={(event) => changeStage(event.target.value as Customer["stage"])}
              className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3"
            >
              {customerStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabels[stage]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold">المواعيد القادمة</h3>
          {appointmentList(upcoming, "لا توجد مواعيد قادمة")}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold">المواعيد السابقة</h3>
          {appointmentList(previous, "لا توجد مواعيد سابقة")}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addNote} className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold">
            ملاحظة جديدة
            <textarea
              aria-label="ملاحظة جديدة"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm"
            />
          </label>
          <button className="mt-3 min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white">
            إضافة الملاحظة
          </button>
        </form>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold">سجل النشاط</h3>
          {customer.activity.length === 0 ? (
            <DashboardEmptyState title="لا يوجد نشاط بعد" body="سيظهر تسلسل التحديثات هنا." />
          ) : (
            <div className="space-y-3">
              {customer.activity.map((item) => (
                <div key={item.id} className="border-r-2 border-violet-200 pr-3">
                  <p className="text-sm">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500" dir="ltr">
                    {item.createdAt.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <h3 className="mb-3 mt-5 font-semibold">الملاحظات</h3>
          {customer.notes.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد ملاحظات.</p>
          ) : (
            <div className="space-y-3">
              {[...customer.notes].reverse().map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-500" dir="ltr">
                    {item.createdAt.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
