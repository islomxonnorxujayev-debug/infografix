import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ImageIcon, Download, CreditCard } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-1.5">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">MarketModel AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              3 credits remaining
            </div>
            <Button variant="ghost" size="sm">Log out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Create and manage your product images</p>
          </div>
          <Button className="gradient-primary border-0" asChild>
            <Link to="/generate">
              <Plus className="mr-2 h-4 w-4" />
              Create New Image
            </Link>
          </Button>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">No images yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Create your first professional product image</p>
          <Button className="gradient-primary border-0" asChild>
            <Link to="/generate">
              <Plus className="mr-2 h-4 w-4" />
              Create New Image
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
