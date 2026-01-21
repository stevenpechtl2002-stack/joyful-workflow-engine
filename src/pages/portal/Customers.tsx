import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, Loader2, Search, Download, FileSpreadsheet, CheckCircle, XCircle, Trash2, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Contact {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  info: string | null;
  consent_status: string | null;
  gender: string | null;
  booking_count: number | null;
  original_created_at: string | null;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchContacts = async () => {
    if (!user?.id) return;
    
    try {
      // Get count first
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setTotalCount(count || 0);

      // Fetch first 100 for display
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .limit(100);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user?.id]);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));
    
    // Map column indices based on known format
    const colMap = {
      name: headers.findIndex(h => h === 'name'),
      vorname: headers.findIndex(h => h === 'vorname'),
      nachname: headers.findIndex(h => h === 'nachname'),
      telefon: headers.findIndex(h => h === 'telefon'),
      email: headers.findIndex(h => h === 'email'),
      info: headers.findIndex(h => h === 'info'),
      einwilligung: headers.findIndex(h => h.includes('einwilligung')),
      geschlecht: headers.findIndex(h => h === 'geschlecht'),
      sprache: headers.findIndex(h => h === 'sprache'),
      buchungen: headers.findIndex(h => h.includes('buchung')),
      erstellt: headers.findIndex(h => h === 'erstellt'),
    };

    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      const name = colMap.name >= 0 ? values[colMap.name]?.replace(/"/g, '') : '';
      if (!name) continue;

      results.push({
        name,
        first_name: colMap.vorname >= 0 ? values[colMap.vorname]?.replace(/"/g, '') || null : null,
        last_name: colMap.nachname >= 0 ? values[colMap.nachname]?.replace(/"/g, '') || null : null,
        phone: colMap.telefon >= 0 ? values[colMap.telefon]?.replace(/"/g, '') || null : null,
        email: colMap.email >= 0 ? values[colMap.email]?.replace(/"/g, '') || null : null,
        info: colMap.info >= 0 ? values[colMap.info]?.replace(/"/g, '') || null : null,
        consent_status: colMap.einwilligung >= 0 ? values[colMap.einwilligung]?.replace(/"/g, '') || null : null,
        gender: colMap.geschlecht >= 0 ? values[colMap.geschlecht]?.replace(/"/g, '') || null : null,
        booking_count: colMap.buchungen >= 0 ? parseInt(values[colMap.buchungen]) || 0 : 0,
        original_created_at: colMap.erstellt >= 0 ? values[colMap.erstellt]?.replace(/"/g, '') || null : null,
      });
    }

    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setImporting(true);
    setImportResult(null);
    setImportProgress(0);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        throw new Error('Keine gültigen Daten in der CSV gefunden');
      }

      toast.info(`${parsed.length} Einträge werden importiert...`);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Import in batches of 100
      const batchSize = 100;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize).map(contact => ({
          user_id: user.id,
          name: contact.name,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          email: contact.email,
          info: contact.info,
          consent_status: contact.consent_status,
          gender: contact.gender,
          booking_count: contact.booking_count,
          original_created_at: contact.original_created_at ? new Date(contact.original_created_at).toISOString() : null,
        }));

        try {
          const { error } = await supabase
            .from('contacts')
            .insert(batch);

          if (error) throw error;
          success += batch.length;
        } catch (err: any) {
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
        }

        setImportProgress(Math.round(((i + batchSize) / parsed.length) * 100));
      }

      setImportResult({ success, failed, errors });
      
      if (success > 0) {
        toast.success(`${success} Kunden erfolgreich importiert`);
        fetchContacts();
      }
      
      if (failed > 0) {
        toast.error(`${failed} Einträge fehlgeschlagen`);
      }
    } catch (error: any) {
      toast.error('Import-Fehler: ' + error.message);
    } finally {
      setImporting(false);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteAllContacts = async () => {
    if (!user?.id) return;
    if (!confirm(`Wirklich alle ${totalCount} Kontakte löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Alle Kontakte gelöscht');
      fetchContacts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Vorname,Nachname,Telefon,Email,Info,Einwilligungsstatus,Geschlecht,Sprache,Geburtsdatum,Geburtsmonat,Geburstag,Anzahl der Buchungen,Erstellt\n"Max Mustermann",Max,Mustermann,"+49 123 456789","max@example.com","Stammkunde",J,M,DE,1990-01-15,1,15,5,"2024-01-01 10:00:00"';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kunden_vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredContacts = contacts.filter(c =>
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
          <p className="text-muted-foreground">
            {totalCount > 0 ? `${totalCount.toLocaleString('de-DE')} Kontakte gespeichert` : 'Importieren Sie Ihre Kundendaten'}
          </p>
        </div>
        {totalCount > 0 && (
          <Button variant="destructive" size="sm" onClick={deleteAllContacts}>
            <Trash2 className="w-4 h-4 mr-2" />
            Alle löschen
          </Button>
        )}
      </div>

      {/* Import Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Importieren Sie Kundendaten aus Ihrer Kawaii Nails Export-Datei
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

            {importing && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground text-center">{importProgress}% importiert...</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Unterstützte Spalten (Kawaii Nails Format):</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>• Name, Vorname, Nachname</span>
                <span>• Telefon, Email</span>
                <span>• Info (Notizen)</span>
                <span>• Einwilligungsstatus (J/N)</span>
                <span>• Geschlecht (W/M)</span>
                <span>• Anzahl der Buchungen</span>
              </div>
            </div>

            {importResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{importResult.success.toLocaleString('de-DE')} erfolgreich</span>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-4 h-4" />
                      <span>{importResult.failed.toLocaleString('de-DE')} fehlgeschlagen</span>
                    </div>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Fehler:</p>
                    <ul className="list-disc list-inside text-destructive/80">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
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

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kundenliste 
            {totalCount > 100 && (
              <Badge variant="secondary" className="ml-2">
                Zeigt 100 von {totalCount.toLocaleString('de-DE')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Kunden gefunden</p>
              <p className="text-sm mt-2">Importieren Sie Kunden über die CSV-Datei</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Info</TableHead>
                  <TableHead className="text-center">Buchungen</TableHead>
                  <TableHead className="text-center">Einwilligung</TableHead>
                  <TableHead>Kunde seit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        {(contact.first_name || contact.last_name) && contact.name !== `${contact.first_name} ${contact.last_name}`.trim() && (
                          <p className="text-xs text-muted-foreground">
                            {contact.first_name} {contact.last_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                        {!contact.phone && !contact.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.info ? (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {contact.info}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.booking_count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.consent_status === 'J' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400">Ja</Badge>
                      ) : contact.consent_status === 'N' ? (
                        <Badge variant="secondary">Nein</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.original_created_at
                        ? new Date(contact.original_created_at).toLocaleDateString('de-DE')
                        : new Date(contact.created_at).toLocaleDateString('de-DE')}
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
