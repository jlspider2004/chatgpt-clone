import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stripImageGenDirective } from '../utils/messages'
import MarkdownCode from './MarkdownCode'
import MessageImages from './MessageImages'

export default function AssistantMessage({ content, images, renderDiagrams = true }) {
  const visible = stripImageGenDirective(content || '')

  const components = useMemo(
    () => ({
      code: (props) => <MarkdownCode {...props} renderDiagrams={renderDiagrams} />,
      img: ({ src, alt }) => (
              <figure className="message-image-wrap inline-md-image">
                <a href={src} target="_blank" rel="noopener noreferrer">
                  <img src={src} alt={alt || '图片'} loading="lazy" />
                </a>
              </figure>
            ),
    }),
    [renderDiagrams],
  )

  return (
    <>
      {visible ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {visible}
        </ReactMarkdown>
      ) : null}
      <MessageImages images={images} />
    </>
  )
}
