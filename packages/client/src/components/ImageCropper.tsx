import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react"
import { Cropper, CropperRef, RectangleStencil } from "react-advanced-cropper"
import "react-advanced-cropper/dist/style.css"

export interface ImageCropperHandle {
  getResult: () => string | null
}

export interface ImageCropperProps {
  src: string
  aspectRatio?: number | undefined
  className?: string
}

const ImageCropper = forwardRef<ImageCropperHandle, ImageCropperProps>(
  ({ src, aspectRatio = undefined, className }, ref) => {
    const cropperRef = useRef<CropperRef>(null)

    useImperativeHandle(ref, () => ({
      getResult: () => {
        const canvas = cropperRef.current?.getCanvas?.({
          maxWidth: 1024,
          maxHeight: 1024,
          imageSmoothingQuality: "high" as const,
          fillColor: "#ffffff",
        })
        return canvas ? canvas.toDataURL("image/jpeg", 0.92) : null
      },
    }))

    return (
      <Cropper
        ref={cropperRef}
        src={src}
        className={className}
        stencilComponent={RectangleStencil}
        stencilProps={{ grid: true }}
      />
    )
  }
)

export default ImageCropper