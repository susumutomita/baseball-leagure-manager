export function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500"
      : score >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{score}%</span>
    </div>
  );
}
