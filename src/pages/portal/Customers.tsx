import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Upload, Users, Loader2, Search, Download, FileSpreadsheet, CheckCircle, XCircle, Trash2, Phone, Mail, ChevronLeft, ChevronRight, Filter, CalendarIcon, X, Link2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ContactDetailDialog from '@/components/portal/ContactDetailDialog';

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

const PAGE_SIZE = 50;

const BOOKING_FILTERS = [
  { value: 'all', label: 'Alle Buchungen' },
  { value: '0', label: '0 Buchungen' },
  { value: '1-5', label: '1-5 Buchungen' },
  { value: '6-10', label: '6-10 Buchungen' },
  { value: '11-25', label: '11-25 Buchungen' },
  { value: '26-50', label: '26-50 Buchungen' },
  { value: '51+', label: '51+ Buchungen' },
];

const Customers = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [bookingFilter, setBookingFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Detail dialog
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [linkingAll, setLinkingAll] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchContacts = useCallback(async () => {
    if (!user?.id) return;
    
    setSearching(true);
    try {
      // Build query
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Search filter
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,info.ilike.%${debouncedSearch}%`);
      }

      // Date filters
      if (dateFrom) {
        query = query.gte('original_created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('original_created_at', endOfDay.toISOString());
      }

      // Booking count filter
      if (bookingFilter !== 'all') {
        if (bookingFilter === '0') {
          query = query.eq('booking_count', 0);
        } else if (bookingFilter === '1-5') {
          query = query.gte('booking_count', 1).lte('booking_count', 5);
        } else if (bookingFilter === '6-10') {
          query = query.gte('booking_count', 6).lte('booking_count', 10);
        } else if (bookingFilter === '11-25') {
          query = query.gte('booking_count', 11).lte('booking_count', 25);
        } else if (bookingFilter === '26-50') {
          query = query.gte('booking_count', 26).lte('booking_count', 50);
        } else if (bookingFilter === '51+') {
          query = query.gte('booking_count', 51);
        }
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      setContacts(data || []);
      setFilteredCount(count || 0);

      // Get total count without filters
      if (!debouncedSearch && !dateFrom && !dateTo && bookingFilter === 'all') {
        setTotalCount(count || 0);
      }
    } catch (error: any) {
      toast.error('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [user?.id, debouncedSearch, dateFrom, dateTo, bookingFilter, currentPage]);

  // Initial total count
  useEffect(() => {
    const fetchTotalCount = async () => {
      if (!user?.id) return;
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalCount(count || 0);
    };
    fetchTotalCount();
  }, [user?.id]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setBookingFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = debouncedSearch || dateFrom || dateTo || bookingFilter !== 'all';

  const openContactDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  const linkAllReservations = async () => {
    if (!user?.id) return;
    
    setLinkingAll(true);
    try {
      const { data, error } = await supabase.rpc('link_reservations_to_contacts', {
        p_user_id: user.id
      });

      if (error) throw error;
      toast.success(`${data || 0} Reservierungen verknüpft`);
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setLinkingAll(false);
    }
  };

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
    
    const colMap = {
      name: headers.findIndex(h => h === 'name'),
      vorname: headers.findIndex(h => h === 'vorname'),
      nachname: headers.findIndex(h => h === 'nachname'),
      telefon: headers.findIndex(h => h === 'telefon'),
      email: headers.findIndex(h => h === 'email'),
      info: headers.findIndex(h => h === 'info'),
      einwilligung: headers.findIndex(h => h.includes('einwilligung')),
      geschlecht: headers.findIndex(h => h === 'geschlecht'),
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
    if (!confirm(`Wirklich alle ${totalCount} Kontakte löschen?`)) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Alle Kontakte gelöscht');
      setTotalCount(0);
      fetchContacts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Vorname,Nachname,Telefon,Email,Info,Einwilligungsstatus,Geschlecht,Anzahl der Buchungen,Erstellt\n"Max Mustermann",Max,Mustermann,"+49 123 456789","max@example.com","Stammkunde",J,M,5,"2024-01-01 10:00:00"';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kunden_vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex gap-2">
          {totalCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={linkAllReservations}
              disabled={linkingAll}
            >
              {linkingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Reservierungen verknüpfen
            </Button>
          )}
          {totalCount > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteAllContacts}>
              <Trash2 className="w-4 h-4 mr-2" />
              Alle löschen
            </Button>
          )}
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
            Importieren Sie Kundendaten aus Ihrer Export-Datei
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
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                CSV-Datei auswählen
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Vorlage
              </Button>
            </div>

            {importing && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-muted-foreground text-center">{importProgress}% importiert...</p>
              </div>
            )}

            {importResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-primary">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Name, Telefon, Email oder Info suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t"
            >
              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Kunde seit (von)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd.MM.yyyy", { locale: de }) : "Von..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => { setDateFrom(date); setCurrentPage(1); }}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Kunde seit (bis)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd.MM.yyyy", { locale: de }) : "Bis..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => { setDateTo(date); setCurrentPage(1); }}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Booking Count Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Anzahl Buchungen</Label>
                <Select value={bookingFilter} onValueChange={(v) => { setBookingFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_FILTERS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full gap-2"
                >
                  <X className="w-4 h-4" />
                  Filter zurücksetzen
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {hasActiveFilters ? (
              <span>{filteredCount.toLocaleString('de-DE')} gefilterte Ergebnisse</span>
            ) : (
              <span>Kundenliste</span>
            )}
          </CardTitle>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{hasActiveFilters ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Filter zurücksetzen
                </Button>
              )}
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
                {contacts.map((contact) => (
                  <TableRow 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openContactDetail(contact)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        {contact.gender && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {contact.gender === 'W' ? 'Weiblich' : contact.gender === 'M' ? 'Männlich' : contact.gender}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.phone && contact.phone !== '+49 8888 88' && (
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
                        {(!contact.phone || contact.phone === '+49 8888 88') && !contact.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.info ? (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {contact.info}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={contact.booking_count && contact.booking_count > 10 ? "default" : "secondary"}>
                        {contact.booking_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.consent_status === 'J' ? (
                        <Badge className="bg-primary/20 text-primary">Ja</Badge>
                      ) : contact.consent_status === 'N' ? (
                        <Badge variant="secondary">Nein</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.original_created_at
                        ? format(new Date(contact.original_created_at), 'dd.MM.yyyy', { locale: de })
                        : format(new Date(contact.created_at), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Bottom Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Zeige {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, filteredCount)} von {filteredCount.toLocaleString('de-DE')}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Erste
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Letzte
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Dialog */}
      <ContactDetailDialog
        contact={selectedContact}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onContactUpdated={fetchContacts}
      />
    </motion.div>
  );
};

export default Customers;
