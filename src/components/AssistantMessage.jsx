import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stripImageGenDirective } from '../utils/messages'
import MarkdownCode from './MarkdownCode'
import MessageImages from './MessageImages'

export default function AssistantMessage({ content, images }) {
  const visible = stripImageGenDirective(content || '')

  return (
    <>
      {visible ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: MarkdownCode,
            img: ({ src, alt }) => (
              <figure className="message-image-wrap inline-md-image">
                <a href={src} target="_blank" rel="noopener noreferrer">
                  <img src={src} alt={alt || '图片'} loading="lazy" />
                </a>
              </figure>
            ),
          }}
        >
          {visible}
        </ReactMarkdown>
      ) : null}
      <MessageImages images={images} />
    </>
  )
}
