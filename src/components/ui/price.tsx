import { cn, formatPKR } from "@/lib/utils";

export function Price({
  price,
  compareAt,
  className,
}: {
  price: number;
  compareAt?: number | null;
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-2 text-sm", className)}>
      <span className="font-medium text-foreground">{formatPKR(price)}</span>
      {compareAt ? (
        <>
          <s className="text-muted-foreground" aria-label={`was ${formatPKR(compareAt)}`}>
            {formatPKR(compareAt)}
          </s>
        </>
      ) : null}
    </p>
  );
}

export function discountPercent(price: number, compareAt: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
