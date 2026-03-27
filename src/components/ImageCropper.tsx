import { useState, useRef, useCallback } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface ImageCropperProps {
  aspectRatio: number;
  onCropped: (blob: Blob) => void;
  currentUrl?: string;
  label: string;
  hint?: string;
}

const ImageCropper = ({ aspectRatio, onCropped, currentUrl, label, hint }: ImageCropperProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.getCroppedCanvas({
      maxWidth: aspectRatio >= 1.5 ? 1200 : 600,
      maxHeight: aspectRatio >= 1.5 ? 675 : 600,
      imageSmoothingQuality: "high",
    }).toBlob((blob) => {
      if (blob) {
        setPreview(URL.createObjectURL(blob));
        onCropped(blob);
        setOpen(false);
      }
    }, "image/webp", 0.85);
  }, [aspectRatio, onCropped]);

  // Update preview when currentUrl changes
  if (currentUrl && !preview) {
    setPreview(currentUrl);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div
        className={`relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 flex items-center justify-center ${
          aspectRatio >= 1.5 ? "aspect-video" : "aspect-square w-32"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
              onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
            <Upload className="w-8 h-8" />
            <span className="text-xs text-center">Clique para enviar</span>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recortar imagem</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-hidden">
            {imageSrc && (
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                style={{ height: 400, width: "100%" }}
                aspectRatio={aspectRatio}
                guides
                viewMode={1}
                dragMode="move"
                autoCropArea={1}
                background={false}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrop}>Recortar e Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCropper;
