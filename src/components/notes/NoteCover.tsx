import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Upload, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAsset, assetToDataUrl } from '@/lib/data/assets';
import { toast } from 'sonner';

interface NoteCoverProps {
  coverImage: string | null;
  onCoverChange: (url: string | null) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop',
];

const GRADIENT_COVERS = [
  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export default function NoteCover({ coverImage, onCoverChange }: NoteCoverProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [displayUrl, setDisplayUrl] = useState<string | null>(coverImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function resolveUrl() {
      if (coverImage && coverImage.startsWith('asset://')) {
        const url = await assetToDataUrl(coverImage);
        setDisplayUrl(url);
      } else {
        setDisplayUrl(coverImage);
      }
    }
    resolveUrl();
  }, [coverImage]);

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onCoverChange(urlInput.trim());
      setUrlInput('');
      setShowPicker(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const assetUrl = await saveAsset(file);
      onCoverChange(assetUrl);
      setShowPicker(false);
      toast.success(t('cover.upload_success'));
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('cover.upload_failed'));
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const isGradient = coverImage?.startsWith('linear-gradient');

  return (
    <div className="relative group">
      <AnimatePresence>
        {coverImage ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 200 }}
            exit={{ opacity: 0, height: 0 }}
            className="relative w-full h-[200px] overflow-hidden"
          >
            {isGradient ? (
              <div
                className="w-full h-full"
                style={{ background: coverImage }}
              />
            ) : (
              <img
                src={displayUrl || coverImage || ''}
                alt="Note cover"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
              <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPicker(true)}
                  className="bg-background/90 hover:bg-background"
                >
                  <ImagePlus className="h-4 w-4 mr-1" />
                  {t('cover.change')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCoverChange(null)}
                  className="bg-background/90 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-12 flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPicker(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {t('cover.add_cover')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover picker modal */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-lg shadow-lg p-4 mx-4 mt-2"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">{t('cover.choose_cover')}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowPicker(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Local Upload */}
            <div className="mb-4">
              <span className="text-xs text-muted-foreground mb-2 block">{t('cover.local_file')}</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start text-muted-foreground font-normal"
                onClick={triggerFileUpload}
              >
                <FileImage className="h-4 w-4 mr-2" />
                {t('cover.upload_image')}
              </Button>
            </div>

            {/* Gradients */}
            <div className="mb-4">
              <span className="text-xs text-muted-foreground mb-2 block">{t('cover.gradients')}</span>
              <div className="grid grid-cols-6 gap-2">
                {GRADIENT_COVERS.map((gradient, i) => (
                  <button
                    key={i}
                    className="w-full aspect-[3/1] rounded-md cursor-pointer hover:ring-2 ring-primary transition-all"
                    style={{ background: gradient }}
                    onClick={() => {
                      onCoverChange(gradient);
                      setShowPicker(false);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="mb-4">
              <span className="text-xs text-muted-foreground mb-2 block">{t('cover.photos')}</span>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COVERS.map((url, i) => (
                  <button
                    key={i}
                    className="w-full aspect-[3/1] rounded-md overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                    onClick={() => {
                      onCoverChange(url);
                      setShowPicker(false);
                    }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL */}
            <div>
              <span className="text-xs text-muted-foreground mb-2 block">{t('cover.custom_url')}</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder={t('cover.paste_url')}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                />
                <Button size="sm" onClick={handleAddUrl}>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
