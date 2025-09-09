export default function HeaderBar() {
  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Hansol Market Trend</h1>
        <div className="text-xs text-slate-500">internal dashboard</div>
      </div>
    </header>
  );
}
