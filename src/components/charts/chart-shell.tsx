import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";

export function ChartShell({
  title,
  eyebrow,
  action,
  footer,
  children
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} eyebrow={eyebrow} action={action} />
      <div className="h-72 px-2 py-4 sm:px-4">{children}</div>
      {footer ? <div className="border-t border-line px-5 py-3">{footer}</div> : null}
    </Card>
  );
}
