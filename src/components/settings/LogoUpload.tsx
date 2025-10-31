import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onUploadComplete: (url: string) => void;
}

export function LogoUpload({ currentLogoUrl, onUploadComplete }: LogoUploadProps) {
  const { workspace } = useWorkspace();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file: File) => {
    if (!workspace?.id) {
      toast.error('No workspace found');
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      toast.error('Please upload a PNG, JPEG, or WebP image');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('business-logos').remove([oldPath]);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${workspace.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      // Update workspace
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ logo_url: publicUrl })
        .eq('id', workspace.id);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl} 
              alt="Company logo" 
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleChange}
          disabled={uploading}
        />
      </div>

      <div
        className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="logo-upload-zone"
          className="hidden"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleChange}
          disabled={uploading}
        />
        <label htmlFor="logo-upload-zone" className="cursor-pointer">
          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium mb-1">
            Drop your logo here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG or WebP (max 2MB)
          </p>
        </label>
      </div>
    </div>
  );
}
