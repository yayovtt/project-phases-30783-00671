import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={"system"}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl animate-slide-down",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-muted/80",
          success: "group-[.toast]:border-l-4 group-[.toast]:border-l-success group-[.toast]:bg-success/5",
          error: "group-[.toast]:border-l-4 group-[.toast]:border-l-destructive group-[.toast]:bg-destructive/5",
          warning: "group-[.toast]:border-l-4 group-[.toast]:border-l-warning group-[.toast]:bg-warning/5",
          info: "group-[.toast]:border-l-4 group-[.toast]:border-l-info group-[.toast]:bg-info/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
