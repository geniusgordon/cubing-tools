import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({
  title = 'Cubing Tools',
  showBack = false,
}: AppHeaderProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <Link to="/" className="text-lg font-semibold tracking-tight">
        {title}
      </Link>
      <div className="ml-auto">
        <ModeToggle />
      </div>
    </header>
  );
}
