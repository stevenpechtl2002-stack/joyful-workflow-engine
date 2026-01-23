import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parse, isValid, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileText, Sparkles, CalendarIcon, Check, AlertCircle, Clipboard, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useProducts, Product } from '@/hooks/useProducts';

interface ParsedReservation {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
  staff_member_id?: string;
  product_id?: string;
  price_paid?: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SmartTextImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  defaultStaffId?: string;
}

// German weekday and month patterns
const WEEKDAY_MAP: Record<string, number> = {
  'montag': 1, 'mo': 1,
  'dienstag': 2, 'di': 2,
  'mittwoch': 3, 'mi': 3,
  'donnerstag': 4, 'do': 4,
  'freitag': 5, 'fr': 5,
  'samstag': 6, 'sa': 6,
  'sonntag': 0, 'so': 0
};

const MONTH_MAP: Record<string, number> = {
  'januar': 0, 'jan': 0,
  'februar': 1, 'feb': 1,
  'märz': 2, 'mar': 2, 'mär': 2,
  'april': 3, 'apr': 3,
  'mai': 4,
  'juni': 5, 'jun': 5,
  'juli': 6, 'jul': 6,
  'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'oktober': 9, 'okt': 9,
  'november': 10, 'nov': 10,
  'dezember': 11, 'dez': 11
};

export const SmartTextImport = ({ isOpen, onClose, onSuccess, defaultDate, defaultStaffId }: SmartTextImportProps) => {
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedReservation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { user } = useAuth();
  const { staffMembers } = useStaffMembers();
  const activeStaff = staffMembers.filter(s => s.is_active);
  const { data: products = [] } = useProducts(true);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState('');
  const [editPartySize, setEditPartySize] = useState(1);
  const [editNotes, setEditNotes] = useState('');
  const [editStaffId, setEditStaffId] = useState<string>('');
  const [editProductId, setEditProductId] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  // Find product by matching text
  const findMatchingProduct = useCallback((text: string): Product | undefined => {
    const lowerText = text.toLowerCase();
    
    // Try exact match first
    let match = products.find(p => lowerText.includes(p.name.toLowerCase()));
    if (match) return match;
    
    // Try partial matches with common service keywords
    const serviceKeywords = ['maniküre', 'pediküre', 'massage', 'facial', 'behandlung', 
      'nägel', 'gel', 'lack', 'shellac', 'waxing', 'headspa', 'head spa',
      'haare', 'schnitt', 'färben', 'strähnen', 'balayage', 'waschen'];
    
    for (const keyword of serviceKeywords) {
      if (lowerText.includes(keyword)) {
        match = products.find(p => p.name.toLowerCase().includes(keyword));
        if (match) return match;
      }
    }
    
    return undefined;
  }, [products]);

  const parseText = useCallback((text: string): ParsedReservation | null => {
    if (!text.trim()) return null;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const fullText = text.toLowerCase();
    
    let customer_name = '';
    let customer_phone: string | undefined;
    let customer_email: string | undefined;
    let reservation_date = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    let reservation_time = '10:00';
    let party_size = 1;
    let notes: string | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let matchedFields = 0;

    // Extract phone number
    const phoneRegex = /(?:\+49|0049|0)?[\s.-]?(\d{2,5})[\s.-]?(\d{3,8})[\s.-]?(\d{0,6})/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      customer_phone = phoneMatch[0].replace(/[\s.-]/g, '');
      matchedFields++;
    }

    // Extract email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      customer_email = emailMatch[0];
      matchedFields++;
    }

    // Extract time (HH:MM or H:MM)
    const timeRegex = /\b(\d{1,2})[:\.](\d{2})\s*(?:uhr|h)?/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      if (hours >= 0 && hours <= 23) {
        reservation_time = `${hours.toString().padStart(2, '0')}:${minutes}`;
        matchedFields++;
      }
    }

    // Extract party size (Personen, Gäste, Pax)
    const sizeRegex = /(\d+)\s*(?:personen?|gäste?|pax|p\.)/i;
    const sizeMatch = text.match(sizeRegex);
    if (sizeMatch) {
      party_size = parseInt(sizeMatch[1]) || 1;
      matchedFields++;
    }

    // Extract date - PRIORITIZE explicit date formats over relative references
    let explicitDateFound = false;
    
    // Format: DD.MM.YYYY or DD.MM.YY or DD.MM (explicit date has highest priority)
    const dateRegex1 = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
    const dateMatch1 = text.match(dateRegex1);
    if (dateMatch1) {
      const day = parseInt(dateMatch1[1]);
      const month = parseInt(dateMatch1[2]) - 1;
      let year = parseInt(dateMatch1[3]);
      if (year < 100) year += 2000;
      
      const parsedDate = new Date(year, month, day);
      if (isValid(parsedDate) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        reservation_date = format(parsedDate, 'yyyy-MM-dd');
        matchedFields++;
        explicitDateFound = true;
      }
    }

    // Only use relative references if no explicit date was found
    if (!explicitDateFound) {
      // Check for relative date references first (most specific)
      if (fullText.includes('heute')) {
        reservation_date = format(new Date(), 'yyyy-MM-dd');
        matchedFields++;
        explicitDateFound = true;
      } else if (fullText.includes('übermorgen')) {
        reservation_date = format(addDays(new Date(), 2), 'yyyy-MM-dd');
        matchedFields++;
        explicitDateFound = true;
      } else if (fullText.includes('morgen')) {
        reservation_date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        matchedFields++;
        explicitDateFound = true;
      }
    }

    // Only use weekday references if still no date found
    if (!explicitDateFound) {
      for (const [weekday, dayNum] of Object.entries(WEEKDAY_MAP)) {
        if (fullText.includes(weekday)) {
          const today = new Date();
          const currentDay = today.getDay();
          let daysToAdd = dayNum - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7;
          reservation_date = format(addDays(today, daysToAdd), 'yyyy-MM-dd');
          matchedFields++;
          break;
        }
      }
    }

    // Extract name - try different patterns
    // Pattern 1: "Herr/Frau Name" or "Hr./Fr. Name"
    const nameRegex1 = /(?:herr|frau|hr\.|fr\.)\s+([a-zA-ZäöüßÄÖÜ]+(?:\s+[a-zA-ZäöüßÄÖÜ]+)?)/i;
    const nameMatch1 = text.match(nameRegex1);
    if (nameMatch1) {
      customer_name = nameMatch1[1];
      matchedFields++;
    } else {
      // Pattern 2: "Name:" or "Kunde:" followed by name
      const nameRegex2 = /(?:name|kunde|gast|reservierung für)[:\s]+([a-zA-ZäöüßÄÖÜ]+(?:\s+[a-zA-ZäöüßÄÖÜ]+)?)/i;
      const nameMatch2 = text.match(nameRegex2);
      if (nameMatch2) {
        customer_name = nameMatch2[1];
        matchedFields++;
      } else {
        // Pattern 3: First line that looks like a name (capitalized words, no special chars)
        for (const line of lines) {
          if (/^[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][a-zäöüß]+)?$/.test(line)) {
            customer_name = line;
            matchedFields++;
            break;
          }
        }
        // Fallback: first line
        if (!customer_name && lines.length > 0) {
          customer_name = lines[0].slice(0, 50);
        }
      }
    }

    // Extract notes/service and try to match product
    const serviceRegex = /(?:service|behandlung|dienstleistung|termin für|für)[:\s]+(.+?)(?:\.|$)/i;
    const serviceMatch = text.match(serviceRegex);
    if (serviceMatch) {
      notes = serviceMatch[1].trim();
    }

    // Try to find matching product from the text
    const matchedProduct = findMatchingProduct(text);
    let product_id: string | undefined;
    let price_paid: number | undefined;
    
    if (matchedProduct) {
      product_id = matchedProduct.id;
      price_paid = matchedProduct.price;
      matchedFields++;
      // Use product name as notes if no explicit notes
      if (!notes) {
        notes = matchedProduct.name;
      }
    }

    // Calculate confidence
    if (matchedFields >= 4) {
      confidence = 'high';
    } else if (matchedFields >= 2) {
      confidence = 'medium';
    }

    return {
      customer_name: customer_name.trim() || 'Unbekannter Kunde',
      customer_phone,
      customer_email,
      reservation_date,
      reservation_time,
      party_size,
      notes,
      staff_member_id: defaultStaffId,
      product_id,
      price_paid,
      confidence
    };
  }, [defaultDate, defaultStaffId, findMatchingProduct]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    const parsed = parseText(text);
    setParsedData(parsed);
    if (parsed) {
      setEditName(parsed.customer_name);
      setEditPhone(parsed.customer_phone || '');
      setEditEmail(parsed.customer_email || '');
      setEditDate(parse(parsed.reservation_date, 'yyyy-MM-dd', new Date()));
      setEditTime(parsed.reservation_time);
      setEditPartySize(parsed.party_size);
      setEditNotes(parsed.notes || '');
      setEditStaffId(parsed.staff_member_id || defaultStaffId || '');
      setEditProductId(parsed.product_id || '');
      setEditPrice(parsed.price_paid?.toString() || '');
    }
  };

  const handleProductChange = (productId: string) => {
    setEditProductId(productId);
    if (productId && productId !== 'none') {
      const product = products.find(p => p.id === productId);
      if (product) {
        setEditPrice(product.price.toString());
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleTextChange(text);
    } catch (err) {
      toast.error('Zwischenablage konnte nicht gelesen werden');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      handleTextChange(text);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSave = async () => {
    if (!user || !editName) return;

    setIsSaving(true);
    try {
      const priceValue = editPrice ? parseFloat(editPrice) : null;
      const { error } = await supabase.from('reservations').insert({
        user_id: user.id,
        customer_name: editName,
        customer_phone: editPhone || null,
        customer_email: editEmail || null,
        reservation_date: editDate ? format(editDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        reservation_time: editTime || '10:00',
        party_size: editPartySize,
        notes: editNotes || null,
        staff_member_id: editStaffId || null,
        product_id: editProductId || null,
        price_paid: priceValue,
        status: 'confirmed',
        source: 'manual'
      });

      if (error) throw error;

      toast.success('Reservierung erstellt!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setRawText('');
    setParsedData(null);
    setIsEditing(false);
    onClose();
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'bg-emerald-600';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-orange-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Text-Import
          </DialogTitle>
          <DialogDescription>
            Fügen Sie Text per Drag & Drop oder Copy-Paste ein. Die Daten werden automatisch erkannt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / Text input */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 transition-all",
              isDragOver ? "border-primary bg-primary/10" : "border-border",
              parsedData && "border-solid"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Text eingeben oder einfügen</Label>
              <Button variant="outline" size="sm" onClick={handlePaste}>
                <Clipboard className="w-4 h-4 mr-2" />
                Einfügen
              </Button>
            </div>
            <Textarea
              data-smart-import-textarea
              placeholder={`Beispiel:
Frau Müller
0170 1234567
Freitag 14:30 Uhr
2 Personen
Maniküre + Pediküre`}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[120px]"
            />
            {isDragOver && (
              <div className="flex items-center justify-center gap-2 text-primary mt-2">
                <Upload className="w-4 h-4" />
                <span>Text hier ablegen</span>
              </div>
            )}
          </div>

          {/* Parsed preview */}
          {parsedData && (
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Erkannte Daten</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-white", getConfidenceColor(parsedData.confidence))}>
                    {parsedData.confidence === 'high' && 'Hohe Sicherheit'}
                    {parsedData.confidence === 'medium' && 'Mittlere Sicherheit'}
                    {parsedData.confidence === 'low' && 'Niedrige Sicherheit'}
                  </Badge>
                  <Button 
                    variant={isEditing ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? <Check className="w-4 h-4" /> : 'Bearbeiten'}
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {editDate ? format(editDate, 'dd.MM.yyyy') : 'Datum wählen'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editDate}
                          onSelect={setEditDate}
                          locale={de}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Uhrzeit</Label>
                    <Input 
                      type="time" 
                      value={editTime} 
                      onChange={(e) => setEditTime(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personenzahl</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      value={editPartySize} 
                      onChange={(e) => setEditPartySize(parseInt(e.target.value) || 1)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mitarbeiter</Label>
                    <Select value={editStaffId || "none"} onValueChange={(val) => setEditStaffId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nicht zugewiesen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nicht zugewiesen</SelectItem>
                        {activeStaff.map(staff => (
                          <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Produkt / Service</Label>
                    <Select value={editProductId || "none"} onValueChange={(val) => handleProductChange(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kein Produkt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Produkt</SelectItem>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price.toFixed(2)} €
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preis (€)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      min={0} 
                      value={editPrice} 
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notizen</Label>
                    <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{parsedData.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum:</span>
                    <span className="font-medium">
                      {format(parse(parsedData.reservation_date, 'yyyy-MM-dd', new Date()), 'dd.MM.yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefon:</span>
                    <span className="font-medium">{parsedData.customer_phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uhrzeit:</span>
                    <span className="font-medium">{parsedData.reservation_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">E-Mail:</span>
                    <span className="font-medium">{parsedData.customer_email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personen:</span>
                    <span className="font-medium">{parsedData.party_size}</span>
                  </div>
                  {parsedData.product_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produkt:</span>
                      <span className="font-medium text-primary">
                        {products.find(p => p.id === parsedData.product_id)?.name || '-'}
                      </span>
                    </div>
                  )}
                  {parsedData.price_paid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preis:</span>
                      <span className="font-medium text-primary">{parsedData.price_paid.toFixed(2)} €</span>
                    </div>
                  )}
                  {parsedData.notes && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Notizen:</span>
                      <span className="font-medium">{parsedData.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Low confidence warning */}
          {parsedData?.confidence === 'low' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Nur wenige Daten erkannt</p>
                <p className="text-muted-foreground">Bitte prüfen Sie die erkannten Felder und ergänzen Sie fehlende Informationen.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
            <Button 
              onClick={handleSave} 
              disabled={!parsedData || !editName || isSaving}
            >
              {isSaving ? 'Speichern...' : 'Reservierung erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
