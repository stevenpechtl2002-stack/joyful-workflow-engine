import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Package, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Product {
  id: string;
  category: string;
  name: string;
  duration_minutes: number;
  price: number;
  price_type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_PRODUCTS = [
  { category: 'Maniküre', name: 'Maniküre ohne Lack', duration_minutes: 10, price: 10, price_type: 'fixed' as const, description: 'Klassische Maniküre ohne Lack, Nägel kürzen und pflegen' },
  { category: 'Maniküre', name: 'Maniküre mit Lack & Massage', duration_minutes: 15, price: 15, price_type: 'fixed' as const, description: 'Maniküre inklusive Farblack und kurzer Handmassage' },
  { category: 'Maniküre', name: 'Maniküre mit Shellac', duration_minutes: 30, price: 30, price_type: 'fixed' as const, description: 'Maniküre mit langanhaltendem Shellac-Lack' },
  { category: 'Shellac', name: 'Farb-Shellac', duration_minutes: 35, price: 20, price_type: 'fixed' as const, description: 'Shellac Farbauftrag, Haltbarkeit ca. 2–3 Wochen' },
  { category: 'Shellac', name: 'Farb-Shellac Auffüllen', duration_minutes: 35, price: 20, price_type: 'fixed' as const, description: 'Shellac Auffüllen inkl. Farbauffrischung' },
  { category: 'Shellac', name: 'Neu Farb Shellac', duration_minutes: 35, price: 20, price_type: 'fixed' as const, description: 'Neuer Shellac Farbauftrag ohne Modellage' },
  { category: 'Acryl', name: 'Acryl Natur Auffüllen', duration_minutes: 45, price: 25, price_type: 'fixed' as const, description: 'Acryl Nägel naturfarben, bestehende Modellage auffüllen' },
  { category: 'Acryl', name: 'Acryl Natur Neumodellage', duration_minutes: 45, price: 27, price_type: 'fixed' as const, description: 'Neue Acrylmodellage in Naturoptik' },
  { category: 'Acryl', name: 'Acryl mit Farbgel Auffüllen', duration_minutes: 45, price: 35, price_type: 'fixed' as const, description: 'Acryl Auffüllen mit Farbgel oder Gellack' },
  { category: 'Acryl', name: 'Acryl mit Farbgel Neumodellage', duration_minutes: 50, price: 40, price_type: 'fixed' as const, description: 'Neue Acrylmodellage mit Farbgel oder Gellack' },
  { category: 'Acryl', name: 'Schülerangebot Acryl Natur mit Tip', duration_minutes: 45, price: 25, price_type: 'from' as const, description: 'Schülerangebot bis 25 Jahre, Acrylmodellage natur mit Tips' },
  { category: 'Pediküre', name: 'Luxus Spa Pediküre ohne Lack', duration_minutes: 30, price: 25, price_type: 'fixed' as const, description: 'Fußpflege inklusive Spa-Behandlung ohne Lack' },
  { category: 'Pediküre', name: 'Luxus Spa Pediküre mit Lack', duration_minutes: 40, price: 35, price_type: 'fixed' as const, description: 'Spa-Pediküre inkl. Farblack und Massagestuhl' },
  { category: 'Pediküre', name: 'Luxus Spa Pediküre mit Shellac', duration_minutes: 55, price: 50, price_type: 'fixed' as const, description: 'Spa-Pediküre mit Shellac, inkl. Massagestuhl' },
  { category: 'Kosmetik', name: 'Augenbrauen färben & zupfen', duration_minutes: 30, price: 20, price_type: 'fixed' as const, description: 'Augenbrauen formen und färben' },
  { category: 'Kosmetik', name: 'Augenbrauen & Wimpern Paket', duration_minutes: 40, price: 30, price_type: 'fixed' as const, description: 'Augenbrauen zupfen & färben plus Wimpernbehandlung' },
  { category: 'Nagelmodellage', name: 'Acrylmodellage allgemein', duration_minutes: 60, price: 25, price_type: 'from' as const, description: 'Acrylmodellage je nach Länge, Farbe und Design' },
  { category: 'Nagelmodellage', name: 'Bio-Gelnägel', duration_minutes: 60, price: 35, price_type: 'from' as const, description: 'Schonende Bio-Gel-Modellage, Preis abhängig vom Design' },
  { category: 'Nagelmodellage', name: 'Gelmodellage', duration_minutes: 60, price: 35, price_type: 'from' as const, description: 'Gelmodellage inkl. Aufbau, Farbe optional' },
  { category: 'Nägel', name: 'Shellac Haltbar 2–3 Wochen', duration_minutes: 35, price: 20, price_type: 'from' as const, description: 'Shellac mit ca. 2–3 Wochen Haltbarkeit' },
  { category: 'Nägel', name: 'Zehenmodellage', duration_minutes: 60, price: 40, price_type: 'from' as const, description: 'Nagelmodellage für Zehennägel' },
  { category: 'Extras', name: 'Nagel Extras', duration_minutes: 10, price: 3, price_type: 'from' as const, description: 'Strasssteine, Design, French, Ombre, Längenaufpreis' },
  { category: 'Kosmetik', name: 'Gesichtsbehandlung', duration_minutes: 60, price: 39, price_type: 'from' as const, description: 'Basis-Gesichtsbehandlung, Preis je nach Aufwand' },
  { category: 'Wimpern', name: 'Wimpernverlängerung', duration_minutes: 60, price: 10, price_type: 'from' as const, description: 'Wimpernverlängerung je nach Technik und Volumen' },
  { category: 'Permanent Make-up', name: 'Permanent Make-up', duration_minutes: 120, price: 150, price_type: 'from' as const, description: 'PMU für Augenbrauen, Lippen oder Lidstrich' },
];

const CATEGORIES = [
  'Maniküre', 'Shellac', 'Acryl', 'Pediküre', 'Kosmetik', 
  'Nagelmodellage', 'Nägel', 'Extras', 'Wimpern', 'Permanent Make-up'
];

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    duration_minutes: 30,
    price: 0,
    price_type: 'fixed' as string,
    description: '',
    is_active: true,
  });

  const fetchProducts = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  const initializeDefaultProducts = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const productsToInsert = DEFAULT_PRODUCTS.map((p, index) => ({
        ...p,
        user_id: user.id,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;
      
      toast.success('Standard-Produkte wurden hinzugefügt');
      fetchProducts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            category: formData.category,
            name: formData.name,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            price_type: formData.price_type,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produkt aktualisiert');
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            category: formData.category,
            name: formData.name,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            price_type: formData.price_type,
            description: formData.description || null,
            is_active: formData.is_active,
            sort_order: products.length,
          });

        if (error) throw error;
        toast.success('Produkt erstellt');
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Produkt wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Produkt gelöscht');
      fetchProducts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      name: '',
      duration_minutes: 30,
      price: 0,
      price_type: 'fixed',
      description: '',
      is_active: true,
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      category: product.category,
      name: product.name,
      duration_minutes: product.duration_minutes,
      price: Number(product.price),
      price_type: product.price_type,
      description: product.description || '',
      is_active: product.is_active,
    });
    setIsFormOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(products.map(p => p.category))];

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
          <h1 className="text-3xl font-display font-bold text-foreground">Produkte</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Dienstleistungen und Preise</p>
        </div>
        <div className="flex gap-2">
          {products.length === 0 && (
            <Button onClick={initializeDefaultProducts} disabled={saving} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
              Standard-Produkte laden
            </Button>
          )}
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingProduct(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Neues Produkt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Produktname *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Maniküre mit Lack"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dauer (Min.)</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                      min={5}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preis (€)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preistyp</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, price_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Festpreis</SelectItem>
                        <SelectItem value="from">Ab-Preis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Beschreibung der Dienstleistung"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Aktiv (buchbar)</Label>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? 'Speichern' : 'Erstellen'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alle Kategorien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Dienstleistungen ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Produkte gefunden</p>
              {products.length === 0 && (
                <Button onClick={initializeDefaultProducts} variant="link" className="mt-2">
                  Standard-Produkte laden
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Produktname</TableHead>
                  <TableHead className="text-center">Dauer</TableHead>
                  <TableHead className="text-right">Preis</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{product.duration_minutes} Min.</TableCell>
                    <TableCell className="text-right font-medium">
                      {product.price_type === 'from' ? 'ab ' : ''}
                      {Number(product.price).toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => toggleActive(product)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default Products;
