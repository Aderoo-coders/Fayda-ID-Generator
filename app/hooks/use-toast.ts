import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      const msg = title ?? "";
      sonnerToast(msg, {
        description,
        className: variant === "destructive" ? "!bg-red-600 !text-white" : undefined,
      });
    },
  };
}
