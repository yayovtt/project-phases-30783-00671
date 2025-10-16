import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskTemplateOption {
  id: string;
  name: string;
  description: string;
}

const PREDEFINED_TEMPLATES: TaskTemplateOption[] = [
  { id: 'permit', name: 'משימות להיתר', description: 'רשימת משימות סטנדרטית לקבלת היתר בנייה' },
  { id: 'taba', name: 'משימות לשינוי תבע', description: 'רשימת משימות לתהליך שינוי בתבע' },
  { id: 'execution', name: 'משימות לביצוע', description: 'רשימת משימות למעקב ביצוע עבודות' },
  { id: 'custom', name: 'רשימה מותאמת אישית', description: 'צור רשימה חדשה או ייבא מקובץ' },
];

interface TaskTemplateState {
  templateType: string;
  customTemplateName: string;
  importedTasks: any[];
}

interface TaskTemplateSelectorProps {
  value: TaskTemplateState;
  onChange: (value: TaskTemplateState) => void;
}

export const TaskTemplateSelector = ({ value, onChange }: TaskTemplateSelectorProps) => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      let tasks: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        tasks = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const task: any = {};
          headers.forEach((header, i) => {
            task[header] = values[i] || '';
          });
          return task;
        });
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        tasks = JSON.parse(text);
      } else if (file.name.endsWith('.txt')) {
        // Parse TXT - each line is a task name
        tasks = text.split('\n')
          .filter(line => line.trim())
          .map(line => ({ name: line.trim() }));
      } else if (file.name.endsWith('.xml')) {
        // Basic XML parsing
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const taskElements = xml.querySelectorAll('task');
        tasks = Array.from(taskElements).map(elem => ({
          name: elem.getAttribute('name') || elem.textContent?.trim() || '',
          description: elem.getAttribute('description') || '',
        }));
      }

      onChange({
        ...value,
        importedTasks: tasks,
      });

      toast({
        title: 'הקובץ יובא בהצלחה',
        description: `נמצאו ${tasks.length} משימות`,
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה בייבוא הקובץ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>בחר תבנית משימות</CardTitle>
        <CardDescription>
          בחר תבנית קיימת או צור רשימת משימות חדשה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={value.templateType}
          onValueChange={(val) => onChange({ ...value, templateType: val })}
        >
          {PREDEFINED_TEMPLATES.map((template) => (
            <div key={template.id} className="flex items-start space-x-2 space-x-reverse">
              <RadioGroupItem value={template.id} id={template.id} />
              <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground">{template.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {value.templateType === 'custom' && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="customTemplateName">שם הרשימה המותאמת</Label>
              <Input
                id="customTemplateName"
                value={value.customTemplateName}
                onChange={(e) => onChange({ ...value, customTemplateName: e.target.value })}
                placeholder="לדוגמה: משימות לפרויקט מיוחד"
              />
            </div>

            <div className="space-y-2">
              <Label>ייבוא משימות מקובץ</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('file-import')?.click()}
                  disabled={isImporting}
                >
                  <FileUp className="ml-2 h-4 w-4" />
                  {isImporting ? 'מייבא...' : 'ייבא מקובץ (Excel, CSV, TXT, XML, JSON)'}
                </Button>
                <input
                  id="file-import"
                  type="file"
                  accept=".csv,.txt,.xml,.json,.xlsx,.xls"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </div>
              {value.importedTasks.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {value.importedTasks.length} משימות נטענו
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
