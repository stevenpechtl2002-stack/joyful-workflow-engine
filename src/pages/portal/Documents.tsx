import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search,
  Folder,
  File,
  Image,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  folder: string;
  tags: string[];
  created_at: string;
}

const Documents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Fehler',
        description: 'Dokumente konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Upload fehlgeschlagen',
          description: `${file.name} konnte nicht hochgeladen werden.`,
          variant: 'destructive',
        });
        continue;
      }

      // Save to database
      const { error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        folder: '/',
        tags: [],
      });

      if (dbError) {
        console.error('DB error:', dbError);
        toast({
          title: 'Fehler',
          description: 'Dokument konnte nicht gespeichert werden.',
          variant: 'destructive',
        });
      }
    }

    setIsUploading(false);
    toast({
      title: 'Erfolgreich',
      description: 'Dokument(e) wurden hochgeladen.',
    });
    fetchDocuments();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Datei konnte nicht heruntergeladen werden.',
        variant: 'destructive',
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: Document) => {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (dbError) {
      toast({
        title: 'Fehler',
        description: 'Dokument konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Erfolgreich',
      description: 'Dokument wurde gelöscht.',
    });
    fetchDocuments();
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Dokumente
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Dateien und Dokumente
          </p>
        </div>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button 
            variant="hero" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {isUploading ? 'Wird hochgeladen...' : 'Hochladen'}
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Dokumente durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/50 rounded-xl bg-secondary/20 hover:bg-secondary/30 hover:border-primary/50 transition-all cursor-pointer"
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">
            Dateien hierher ziehen oder <span className="text-primary">durchsuchen</span>
          </span>
        </label>
      </motion.div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Folder className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Keine Dokumente gefunden
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Versuchen Sie andere Suchbegriffe.'
              : 'Laden Sie Ihre erste Datei hoch.'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc, index) => {
            const FileIcon = getFileIcon(doc.file_type);
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <FileIcon className="w-6 h-6 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4 mr-2" />
                            Herunterladen
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h4 className="font-medium text-foreground truncate mb-1" title={doc.name}>
                      {doc.name}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Documents;
