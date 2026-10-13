export default function MessageImages({ images, className = '' }) {
  if (!images?.length) return null

  return (
    <div className={`message-images ${className}`.trim()}>
      {images.map((img, index) => (
        <figure key={`${img.src.slice(0, 32)}-${index}`} className="message-image-wrap">
          <a href={img.src} target="_blank" rel="noopener noreferrer" title="点击查看原图">
            <img src={img.src} alt={img.alt || img.name || '图片'} loading="lazy" />
          </a>
          {img.caption && <figcaption>{img.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}
