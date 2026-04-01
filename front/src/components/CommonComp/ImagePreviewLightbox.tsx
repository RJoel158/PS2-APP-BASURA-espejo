import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './ImagePreviewLightbox.css';

interface GalleryImage {
  previewSrc: string;
  fullSrc?: string;
  alt: string;
}

interface ImagePreviewLightboxProps {
  previewSrc: string;
  fullSrc?: string;
  alt: string;
  className?: string;
  gallery?: GalleryImage[];
  startIndex?: number;
}

const buildPreviewSrc = (src: string) => {
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }

  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}w=480&q=55&fit=cover`;
};

const ImagePreviewLightbox: React.FC<ImagePreviewLightboxProps> = ({
  previewSrc,
  fullSrc,
  alt,
  className,
  gallery,
  startIndex,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex || 0);

  const galleryImages = useMemo<GalleryImage[]>(() => {
    if (gallery && gallery.length > 0) {
      return gallery;
    }

    return [{ previewSrc, fullSrc, alt }];
  }, [gallery, previewSrc, fullSrc, alt]);

  const safeIndex = Math.min(Math.max(currentIndex, 0), galleryImages.length - 1);
  const activeImage = galleryImages[safeIndex];

  const resolvedFullSrc = activeImage.fullSrc || activeImage.previewSrc;
  const resolvedPreviewSrc = useMemo(() => buildPreviewSrc(activeImage.previewSrc), [activeImage.previewSrc]);

  const canNavigate = galleryImages.length > 1;

  const openViewer = () => {
    setCurrentIndex(startIndex || 0);
    setFullLoaded(false);
    setIsOpen(true);
  };

  const goPrev = () => {
    setFullLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const goNext = () => {
    setFullLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
      if (canNavigate && event.key === 'ArrowLeft') {
        goPrev();
      }
      if (canNavigate && event.key === 'ArrowRight') {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen, canNavigate]);

  const viewer = (
    <div
      className="image-preview-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="image-preview-lightbox-close"
        onClick={() => setIsOpen(false)}
        aria-label="Cerrar vista ampliada"
      >
        x
      </button>

      <div
        className="image-preview-lightbox-stage"
        onClick={(event) => event.stopPropagation()}
      >
        {canNavigate && (
          <button
            type="button"
            className="image-preview-lightbox-nav is-prev"
            onClick={goPrev}
            aria-label="Imagen anterior"
          >
            ‹
          </button>
        )}

        <img
          className={`image-preview-lightbox-preview ${fullLoaded ? 'is-hidden' : ''}`}
          src={resolvedPreviewSrc}
          alt={activeImage.alt}
          loading="eager"
          decoding="sync"
        />

        {!fullLoaded && (
          <div className="image-preview-lightbox-loading">
            <span className="image-preview-lightbox-spinner" />
            Cargando resolución completa...
          </div>
        )}

        <img
          className={`image-preview-lightbox-full ${fullLoaded ? 'is-visible' : ''}`}
          src={resolvedFullSrc}
          alt={activeImage.alt}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onLoad={() => setFullLoaded(true)}
        />

        {canNavigate && (
          <button
            type="button"
            className="image-preview-lightbox-nav is-next"
            onClick={goNext}
            aria-label="Imagen siguiente"
          >
            ›
          </button>
        )}

        {canNavigate && (
          <div className="image-preview-lightbox-counter">
            {safeIndex + 1} / {galleryImages.length}
          </div>
        )}
      </div>

      {canNavigate && (
        <div className="image-preview-lightbox-strip" onClick={(event) => event.stopPropagation()}>
          {galleryImages.map((image, index) => (
            <button
              key={`${image.previewSrc}-${index}`}
              type="button"
              className={`image-preview-lightbox-strip-item ${index === safeIndex ? 'is-active' : ''}`}
              onClick={() => {
                setFullLoaded(false);
                setCurrentIndex(index);
              }}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <img src={buildPreviewSrc(image.previewSrc)} alt={image.alt} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={`image-preview-lightbox-trigger ${className || ''}`.trim()}
        onClick={openViewer}
        aria-label="Ver imagen ampliada"
      >
        <img
          className={className}
          src={buildPreviewSrc(previewSrc)}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      </button>

      {isOpen && createPortal(viewer, document.body)}
    </>
  );
};

export default ImagePreviewLightbox;
