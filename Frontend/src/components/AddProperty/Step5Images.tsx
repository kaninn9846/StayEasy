import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: any;
  existingImages?: Array<{id: number, image: string}>;
  setExistingImages?: React.Dispatch<React.SetStateAction<Array<{id: number, image: string}>>>;
}

const Step5Images: React.FC<Props> = ({ formData, setFormData, existingImages, setExistingImages }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const MIN_IMAGES = 3;
  const MAX_IMAGES = 10;

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const filesArray = Array.from(e.target.files);
    const currentTotal = (existingImages?.length || 0) + (formData.images?.length || 0);
    const canAdd = MAX_IMAGES - currentTotal;
    
    if (canAdd <= 0) {
      alert(`Maximum ${MAX_IMAGES} images allowed per property. Please remove some images first.`);
      return;
    }
    
    // Limit files to not exceed max
    const filesToAdd = filesArray.slice(0, canAdd);
    
    if (filesArray.length > canAdd) {
      alert(`Only ${canAdd} more image(s) can be added. Maximum is ${MAX_IMAGES} per property.`);
    }
    
    setFormData({
      ...formData,
      images: [...(formData.images || []), ...filesToAdd],
    });
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = formData.images.filter((_: File, i: number) => i !== index);
    setFormData({ ...formData, images: updated });
  };

  const handleRemoveExisting = (id: number) => {
    if (setExistingImages) {
      setExistingImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const totalImages = (existingImages?.length || 0) + (formData.images?.length || 0);
  const maxVisible = 3;
  const showOverlay = totalImages > maxVisible;
  const visibleCount = showOverlay ? maxVisible - 1 : totalImages;
  const overlayCount = totalImages - visibleCount;
  
  // Validation states
  const isMinMet = totalImages >= MIN_IMAGES;
  const isMaxReached = totalImages >= MAX_IMAGES;
  const canAddMore = totalImages < MAX_IMAGES;
  const remainingSlots = MAX_IMAGES - totalImages;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Photos</h2>
        <p className="text-gray-500">Upload property images (minimum 3, maximum 10)</p>
      </div>

      {/* Image Count Status */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Images: <span className="font-bold text-lg text-[#A989C8]">{totalImages}</span>/{MAX_IMAGES}
          </span>
          {isMinMet ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-sm font-medium">✓ Minimum met</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <span className="text-sm font-medium">
                Need {MIN_IMAGES - totalImages} more image(s)
              </span>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isMinMet ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${(totalImages / MAX_IMAGES) * 100}%` }}
          />
        </div>
      </div>

      {existingImages && existingImages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Current Images ({existingImages.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(() => {
              const items: React.ReactNode[] = [];
              let shown = 0;

              if (existingImages) {
                for (const img of existingImages) {
                  if (showOverlay && shown >= visibleCount) break;
                  items.push(
                    <div key={`existing-${img.id}`} className="border rounded-lg overflow-hidden relative group">
                      <img
                        src={`http://127.0.0.1:8000${img.image}`}
                        alt="Property"
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExisting(img.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                  shown++;
                }
              }

              if (showOverlay) {
                items.push(
                  <div key="overlay" className="border rounded-lg overflow-hidden relative bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-500">+{overlayCount}</span>
                  </div>
                );
              }

              return items;
            })()}
          </div>
        </div>
      )}

      {/* Upload Area - Disabled if max reached */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-colors ${
          canAddMore
            ? 'border-gray-300 hover:border-[#A87DC2] bg-gray-50 hover:bg-[#A87DC2]/5 cursor-pointer'
            : 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
        }`}
        onClick={canAddMore ? handleClick : undefined}
      >
        <Upload className={`mx-auto mb-4 ${canAddMore ? 'text-[#A989C8]' : 'text-gray-400'}`} size={40} />
        <p className={`font-semibold ${canAddMore ? 'text-gray-700' : 'text-gray-500'}`}>
          {canAddMore ? 'Click to upload photos' : 'Maximum images reached'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {canAddMore 
            ? `PNG, JPG up to 5MB (${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining)`
            : 'Remove some images to add more'
          }
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          ref={inputRef}
          className="hidden"
          onChange={handleFiles}
          disabled={!canAddMore}
        />
      </div>

      {formData.images && formData.images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            New Images ({formData.images.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {formData.images.map((file: File, index: number) => (
              <div key={index} className="border rounded-lg overflow-hidden relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={14} />
                </button>
                <p className="text-[10px] text-gray-500 truncate px-1 py-0.5 bg-white">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimum requirement warning */}
      {!isMinMet && totalImages > 0 && (
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
          <p className="text-sm text-orange-800">
            ⚠️ You need at least <strong>{MIN_IMAGES} images</strong>. Currently: <strong>{totalImages}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default Step5Images;
