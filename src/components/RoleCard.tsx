import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export const RoleCard = ({ title, description, icon: Icon, onClick }: RoleCardProps) => {
  return (
    <Card
      onClick={onClick}
      className="group relative overflow-hidden cursor-pointer border-2 border-border hover:border-primary transition-all duration-500 hover:shadow-[var(--shadow-soft)] hover:scale-105 p-8"
    >
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all duration-500 group-hover:scale-110">
          <Icon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors duration-500">
          {title}
        </h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
};
