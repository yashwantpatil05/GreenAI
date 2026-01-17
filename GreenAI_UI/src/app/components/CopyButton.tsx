import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CopyButton({ text, label, variant = 'ghost', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && <span>{label}</span>}
    </Button>
  );
}
