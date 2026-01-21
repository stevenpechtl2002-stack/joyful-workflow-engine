import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, Loader2, Search, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const Customers = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // We'll store customers in reservations as unique customer entries
  // For now, we extract unique customers from reservations
  const fetchCustomers = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('customer_name, customer_phone, customer_email, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract unique customers by name
      const uniqueCustomers = new Map<string, CustomerRecord>();
      data?.forEach((r, index) => {
        const key = r.customer_name.toLowerCase().trim();
        if (!uniqueCustomers.has(key)) {
          uniqueCustomers.set(key, {
            id: `${index}`,
            name: r.customer_name,
            phone: r.customer_phone,
            email: r.customer_email,
            notes: r.notes,
            created_at: r.created_at,
          });
        }
      });

      setCustomers(Array.from(uniqueCustomers.values()));
    } catch (error: any) {
      toast.error('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user?.id]);

  const parseCSV = (text: string): { name: string; phone?: string; email?: string; notes?: string }[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Get header line and find column indices
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
    
    const nameIndex = headers.findIndex(h => 
      h.includes('name') || h.includes('kunde') || h.includes('kundenname')
    );
    const phoneIndex = headers.findIndex(h => 
      h.includes('phone') || h.includes('telefon') || h.includes('tel')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail') || h.includes('mail')
    );
    const notesIndex = headers.findIndex(h => 
      h.includes('note') || h.includes('notiz') || h.includes('bemerkung')
    );

    if (nameIndex === -1) {
      throw new Error('Spalte "Name" nicht gefunden. Bitte stellen Sie sicher, dass die CSV eine Name-Spalte hat.');
    }

    const results: { name: string; phone?: string; email?: string; notes?: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle both comma and semicolon delimiters
      const values = line.split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
      
      const name = values[nameIndex];
      if (!name) continue;

      results.push({
        name,
        phone: phoneIndex >= 0 ? values[phoneIndex] : undefined,
        email: emailIndex >= 0 ? values[emailIndex] : undefined,
        notes: notesIndex >= 0 ? values[notesIndex] : undefined,
      });
    }

    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        throw new Error('Keine gültigen Daten in der CSV gefunden');
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Import as reservations with a placeholder date (can be updated later)
      for (const customer of parsed) {
        try {
          const { error } = await supabase
            .from('reservations')
            .insert({
              user_id: user.id,
              customer_name: customer.name,
              customer_phone: customer.phone || null,
              customer_email: customer.email || null,
              notes: customer.notes || 'Importiert aus CSV',
              reservation_date: new Date().toISOString().split('T')[0],
              reservation_time: '00:00',
              party_size: 1,
              source: 'csv_import',
              status: 'completed',
            });

          if (error) throw error;
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`${customer.name}: ${err.message}`);
        }
      }

      setImportResult({ success, failed, errors });
      
      if (success > 0) {
        toast.success(`${success} Kunden erfolgreich importiert`);
        fetchCustomers();
      }
      
      if (failed > 0) {
        toast.error(`${failed} Einträge fehlgeschlagen`);
      }
    } catch (error: any) {
      toast.error('Import-Fehler: ' + error.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = 'Name;Telefon;Email;Notiz\nMax Mustermann;+49 123 456789;max@example.com;Stammkunde\nAnna Schmidt;+49 987 654321;anna@example.com;';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kunden_vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Kunden</h1>
          <p className="text-muted-foreground">Verwalten und importieren Sie Ihre Kundendaten</p>
        </div>
      </div>

      {/* Import Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Importieren Sie Kundendaten aus einer CSV-Datei. Die Datei sollte mindestens eine "Name" Spalte enthalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="gap-2"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                CSV-Datei auswählen
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Vorlage herunterladen
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Unterstützte Spalten:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Name / Kunde / Kundenname (erforderlich)</li>
                <li>Telefon / Phone / Tel</li>
                <li>Email / E-Mail / Mail</li>
                <li>Notiz / Note / Bemerkung</li>
              </ul>
            </div>

            {importResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{importResult.success} erfolgreich</span>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-4 h-4" />
                      <span>{importResult.failed} fehlgeschlagen</span>
                    </div>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-destructive">Fehler:</p>
                    <ul className="list-disc list-inside text-destructive/80">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... und {importResult.errors.length - 5} weitere</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Kunden suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kundenliste ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Kunden gefunden</p>
              <p className="text-sm mt-2">Importieren Sie Kunden über CSV oder erstellen Sie Reservierungen</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Notizen</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>
                      {customer.notes ? (
                        <span className="text-sm text-muted-foreground truncate max-w-xs block">
                          {customer.notes}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString('de-DE')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Customers;
