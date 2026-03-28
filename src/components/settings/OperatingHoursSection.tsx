import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { type OperatingHours, type DaySchedule, dayLabels, orderedDays } from "@/lib/storeStatus";

interface Props {
  value: OperatingHours | null;
  onChange: (hours: OperatingHours) => void;
}

const defaultSchedule: OperatingHours = {
  monday: { open: "08:00", close: "22:00", is_closed: false },
  tuesday: { open: "08:00", close: "22:00", is_closed: false },
  wednesday: { open: "08:00", close: "22:00", is_closed: false },
  thursday: { open: "08:00", close: "22:00", is_closed: false },
  friday: { open: "08:00", close: "22:00", is_closed: false },
  saturday: { open: "08:00", close: "22:00", is_closed: false },
  sunday: { open: "08:00", close: "22:00", is_closed: true },
};

const OperatingHoursSection = ({ value, onChange }: Props) => {
  const [hours, setHours] = useState<OperatingHours>(value || defaultSchedule);

  useEffect(() => {
    if (value) setHours(value);
  }, [value]);

  const update = (day: keyof OperatingHours, field: keyof DaySchedule, val: string | boolean) => {
    const updated = {
      ...hours,
      [day]: { ...hours[day], [field]: val },
    };
    setHours(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {orderedDays.map((day) => {
        const schedule = hours[day];
        return (
          <div key={day} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="w-20 shrink-0">
              <span className="text-sm font-medium text-foreground">{dayLabels[day]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!schedule.is_closed}
                onCheckedChange={(checked) => update(day, "is_closed", !checked)}
              />
              <span className="text-xs text-muted-foreground w-14">
                {schedule.is_closed ? "Fechado" : "Aberto"}
              </span>
            </div>
            {!schedule.is_closed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={schedule.open}
                  onChange={(e) => update(day, "open", e.target.value)}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-muted-foreground text-sm">às</span>
                <Input
                  type="time"
                  value={schedule.close}
                  onChange={(e) => update(day, "close", e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OperatingHoursSection;
