/** A figure on the admin page: what it counts, the number, and an optional note under it. */
export function Stat({ label, value, note, testId }: { label: string; value: number | string; note?: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 text-[28px] font-semibold" data-testid={testId}>
        {value}
      </div>
      {note ? <div className="text-[12px] text-muted">{note}</div> : null}
    </div>
  );
}
