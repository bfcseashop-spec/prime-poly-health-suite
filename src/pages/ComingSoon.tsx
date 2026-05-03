import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      <Card className="p-12 text-center shadow-soft">
        <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Module coming soon</h2>
        <p className="text-muted-foreground mt-2">This Prime Poly Clinic module will be built in the next iteration.</p>
      </Card>
    </div>
  );
}
