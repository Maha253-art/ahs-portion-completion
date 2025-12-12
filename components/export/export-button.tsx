'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToCSV } from '@/lib/export-utils';

interface ExportButtonProps {
  getData: () => Promise<{
    headers: string[];
    rows: (string | number)[][];
    title?: string;
  }>;
  filename: string;
  className?: string;
}

export function ExportButton({ getData, filename, className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    setLoading(true);
    try {
      const data = await getData();

      switch (format) {
        case 'excel':
          exportToExcel(data, filename);
          break;
        case 'pdf':
          exportToPDF(data, filename);
          break;
        case 'csv':
          exportToCSV(data, filename);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={className}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-white/30">
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          className="cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <FileText className="h-4 w-4 mr-2 text-blue-600" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
