import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "min-h-24 py-2", props.className)} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-medium text-ink/80">{children}</label>;
}
