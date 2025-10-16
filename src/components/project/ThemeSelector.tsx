import { useState, useEffect } from 'react';
import { Settings, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    primaryGlow: string;
    accent: string;
    success: string;
    warning: string;
    destructive: string;
  };
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'כחול קלאסי',
    colors: {
      primary: '221 83% 53%',
      primaryGlow: '221 83% 70%',
      accent: '210 40% 96.1%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
  {
    id: 'purple',
    name: 'סגול מודרני',
    colors: {
      primary: '262 83% 58%',
      primaryGlow: '262 83% 75%',
      accent: '270 40% 96%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
  {
    id: 'green',
    name: 'ירוק טבעי',
    colors: {
      primary: '142 76% 36%',
      primaryGlow: '142 76% 55%',
      accent: '138 40% 96%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
  {
    id: 'orange',
    name: 'כתום אנרגטי',
    colors: {
      primary: '24 95% 53%',
      primaryGlow: '24 95% 70%',
      accent: '33 100% 96%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
  {
    id: 'rose',
    name: 'ורוד עדין',
    colors: {
      primary: '346 77% 50%',
      primaryGlow: '346 77% 70%',
      accent: '340 40% 96%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
  {
    id: 'teal',
    name: 'טורקיז רענן',
    colors: {
      primary: '173 80% 40%',
      primaryGlow: '173 80% 60%',
      accent: '180 40% 96%',
      success: '142 76% 36%',
      warning: '48 96% 53%',
      destructive: '0 84% 60%',
    },
  },
];

export const ThemeSelector = () => {
  const [open, setOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('selected-theme') || 'default';
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssVarName}`, value);
    });
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('selected-theme', themeId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="hover-lift"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            בחירת ערכת נושא
          </DialogTitle>
          <DialogDescription>
            בחר את ערכת הצבעים המועדפת עליך לממשק
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {themes.map((theme) => (
            <Card
              key={theme.id}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl",
                selectedTheme === theme.id && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleThemeSelect(theme.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{theme.name}</h3>
                  {selectedTheme === theme.id && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Color Preview */}
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className="h-12 rounded-md shadow-sm"
                    style={{
                      backgroundColor: `hsl(${theme.colors.primary})`,
                    }}
                  />
                  <div
                    className="h-12 rounded-md shadow-sm"
                    style={{
                      backgroundColor: `hsl(${theme.colors.primaryGlow})`,
                    }}
                  />
                  <div
                    className="h-12 rounded-md shadow-sm"
                    style={{
                      backgroundColor: `hsl(${theme.colors.accent})`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
