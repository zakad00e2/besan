import type { Dispatch } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { AvailabilitySlot, ReminderSettings, WorkingDay } from "./dashboard-model";
import { workingDayLabels } from "./dashboard-model";
import type { DashboardAction } from "./dashboard-store";

export function DashboardAvailability({
  availability,
  reminderSettings,
  dispatch,
}: {
  availability: AvailabilitySlot[];
  reminderSettings: ReminderSettings;
  dispatch: Dispatch<DashboardAction>;
}) {
  const days = Object.keys(workingDayLabels) as WorkingDay[];
  function saved(message: string) {
    toast.success(message);
  }
  function updateReminders(patch: Partial<ReminderSettings>) {
    dispatch({ type: "reminders/update", settings: { ...reminderSettings, ...patch } });
    saved("تم حفظ الإعدادات.");
  }
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">الأوقات المتاحة</h2>
            <p className="mt-1 text-sm text-slate-500">الأحد إلى الخميس، من 10:00 حتى 18:00.</p>
          </div>
          <p className="text-xs text-slate-500">اضغطي على أي فترة لتفعيلها أو تعطيلها.</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-5 gap-3">
            {days.map((day) => (
              <div key={day} className="rounded-lg border border-slate-100 p-2">
                <h3 className="mb-2 text-center text-sm font-semibold">{workingDayLabels[day]}</h3>
                <div className="space-y-2">
                  {availability
                    .filter((slot) => slot.day === day)
                    .map((slot) => {
                      const label = `${workingDayLabels[day]} ${slot.startsAt} إلى ${slot.endsAt} ${slot.enabled ? "متاح" : "غير متاح"}`;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          aria-label={label}
                          aria-pressed={slot.enabled}
                          onClick={() => {
                            dispatch({ type: "availability/toggle", slotId: slot.id });
                            saved("تم حفظ التوفر.");
                          }}
                          className={`min-h-10 w-full rounded-md border px-2 text-xs font-medium ${slot.enabled ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-400"}`}
                        >
                          <span dir="ltr">
                            {slot.startsAt}–{slot.endsAt}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">إعدادات التذكير</h2>
        <p className="mt-1 text-sm text-slate-500">
          يتم إرسال التذكير قبل الموعد بـ 24 ساعة في النسخة النهائية.
        </p>
        <div className="mt-5 space-y-4">
          <label className="flex min-h-10 items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">تذكير الزبونة عبر WhatsApp</span>
              <span className="mt-1 block text-xs text-slate-500">
                محاكاة للإرسال في النسخة الحالية.
              </span>
            </span>
            <Switch
              aria-label="تذكير الزبونة عبر WhatsApp"
              checked={reminderSettings.customerWhatsapp}
              onCheckedChange={(checked) => updateReminders({ customerWhatsapp: checked })}
            />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">تنبيه المشرفة داخل لوحة التحكم</span>
              <span className="mt-1 block text-xs text-slate-500">سيظهر ضمن تذكيرات الغد.</span>
            </span>
            <Switch
              aria-label="تنبيه المشرفة داخل لوحة التحكم"
              checked={reminderSettings.supervisorDashboard}
              onCheckedChange={(checked) => updateReminders({ supervisorDashboard: checked })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
