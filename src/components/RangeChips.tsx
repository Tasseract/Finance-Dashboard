"use client";

import { Segmented } from "./ui/Segmented";
import { RANGES, type RangeKey } from "@/lib/analytics";

export function RangeChips({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <Segmented
      name="Time range"
      size="sm"
      value={value}
      onChange={onChange}
      options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
    />
  );
}
