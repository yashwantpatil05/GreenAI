import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CopyButton } from './CopyButton';
import { cn } from '../../lib/utils';

interface CodeExample {
  language: string;
  code: string;
}

interface CodeBlockProps {
  examples: CodeExample[];
  className?: string;
}

export function CodeBlock({ examples, className }: CodeBlockProps) {
  const [selectedLang, setSelectedLang] = useState(examples[0]?.language || 'curl');
  const currentCode = examples.find(e => e.language === selectedLang)?.code || '';

  return (
    <div className={cn("rounded-lg border bg-muted/50", className)}>
      <Tabs value={selectedLang} onValueChange={setSelectedLang}>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList className="h-9">
            {examples.map((example) => (
              <TabsTrigger
                key={example.language}
                value={example.language}
                className="text-xs uppercase"
              >
                {example.language}
              </TabsTrigger>
            ))}
          </TabsList>
          <CopyButton text={currentCode} label="Copy" />
        </div>
        {examples.map((example) => (
          <TabsContent key={example.language} value={example.language} className="m-0">
            <pre className="p-4 overflow-x-auto text-sm">
              <code className="text-foreground">{example.code}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
