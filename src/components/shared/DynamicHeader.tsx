export function DynamicHeader() {
  return (
    <header className="sticky top-0 z-header h-12 border-b border-[var(--border)] bg-background/85 backdrop-blur-md px-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>Gate Monitor Console</span>
      </div>
    </header>
  );
}

export default DynamicHeader;
