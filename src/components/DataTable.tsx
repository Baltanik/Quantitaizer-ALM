import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FedData } from "@/services/fedData";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableProps {
  data: FedData[];
}

export function DataTable({ data }: DataTableProps) {
  const exportToCSV = () => {
    const headers = [
      'Date', 'SOFR', 'IORB', 'Spread', 'WALCL', 'WRESBAL', 
      'RRPONTSYD', 'RPONTSYD', 'RPONTTLD', 'DTB3', 'DTB1YR', 'US10Y', 'Scenario'
    ];
    
    const csvData = data.map(d => [
      d.date,
      d.sofr ?? '',
      d.iorb ?? '',
      d.sofr_iorb_spread ?? '',
      d.walcl ?? '',
      d.wresbal ?? '',
      d.rrpontsyd ?? '',
      d.rpontsyd ?? '',
      d.rponttld ?? '',
      d.dtb3 ?? '',
      d.dtb1yr ?? '',
      d.us10y ?? '',
      d.scenario ?? ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fed-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Historical Data</CardTitle>
        <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>SOFR</TableHead>
                <TableHead>IORB</TableHead>
                <TableHead>Spread</TableHead>
                <TableHead>WALCL</TableHead>
                <TableHead>WRESBAL</TableHead>
                <TableHead>Scenario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 30).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.sofr?.toFixed(2) ?? 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.iorb?.toFixed(2) ?? 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.sofr_iorb_spread?.toFixed(2) ?? 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${(row.walcl ? row.walcl / 1000 : 0).toFixed(2)}T
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${(row.wresbal ? row.wresbal / 1000 : 0).toFixed(2)}T
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className={`
                      px-2 py-1 rounded-full text-xs
                      ${row.scenario === 'qe' || row.scenario === 'stealth_qe' ? 'bg-success/20 text-success' : ''}
                      ${row.scenario === 'qt' ? 'bg-destructive/20 text-destructive' : ''}
                      ${row.scenario === 'neutral' ? 'bg-warning/20 text-warning' : ''}
                    `}>
                      {row.scenario?.toUpperCase() ?? 'N/A'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}