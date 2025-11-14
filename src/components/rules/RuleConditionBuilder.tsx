import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface RuleConditionBuilderProps {
  type: 'keyword' | 'length' | 'pattern' | 'sentiment' | 'topic';
  condition: any;
  onChange: (condition: any) => void;
}

export function RuleConditionBuilder({ type, condition, onChange }: RuleConditionBuilderProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = condition.keywords || [];
    onChange({ ...condition, keywords: [...keywords, newKeyword.trim()] });
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) => {
    const keywords = condition.keywords || [];
    onChange({ ...condition, keywords: keywords.filter((k: string) => k !== keyword) });
  };

  if (type === 'keyword') {
    return (
      <div className="space-y-3">
        <Label>Blocked Keywords/Phrases</Label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Type keyword and press Enter..."
          />
          <Button onClick={addKeyword} size="icon" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(condition.keywords || []).map((keyword: string) => (
            <Badge key={keyword} variant="secondary" className="gap-1">
              {keyword}
              <button onClick={() => removeKeyword(keyword)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'length') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimum Length (words)</Label>
          <Input
            type="number"
            value={condition.min || ''}
            onChange={(e) => onChange({ ...condition, min: parseInt(e.target.value) })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Maximum Length (words)</Label>
          <Input
            type="number"
            value={condition.max || ''}
            onChange={(e) => onChange({ ...condition, max: parseInt(e.target.value) })}
            placeholder="1000"
          />
        </div>
      </div>
    );
  }

  if (type === 'pattern') {
    return (
      <div className="space-y-2">
        <Label>Regular Expression Pattern</Label>
        <Input
          value={condition.regex || ''}
          onChange={(e) => onChange({ ...condition, regex: e.target.value })}
          placeholder="e.g., \b(email|phone)\s*:\s*[\w@.-]+"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use regex to match specific patterns in responses
        </p>
      </div>
    );
  }

  if (type === 'sentiment') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Maximum Negativity Score (-1 to 0)</Label>
          <Input
            type="number"
            step="0.1"
            min="-1"
            max="0"
            value={condition.maxNegative || ''}
            onChange={(e) => onChange({ ...condition, maxNegative: parseFloat(e.target.value) })}
            placeholder="-0.3"
          />
          <p className="text-xs text-muted-foreground">
            Block responses with sentiment more negative than this threshold
          </p>
        </div>
      </div>
    );
  }

  if (type === 'topic') {
    return (
      <div className="space-y-3">
        <Label>Restricted Topics</Label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Type topic and press Enter..."
          />
          <Button onClick={addKeyword} size="icon" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(condition.keywords || []).map((topic: string) => (
            <Badge key={topic} variant="secondary" className="gap-1">
              {topic}
              <button onClick={() => removeKeyword(topic)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          AI will avoid discussing these topics
        </p>
      </div>
    );
  }

  return null;
}
