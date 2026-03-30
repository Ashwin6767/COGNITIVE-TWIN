'use client'

import { Bot, User } from 'lucide-react'

/**
 * ChatMessage - Renders a single chat message bubble with role-based styling.
 * @param {Object} props
 * @param {Object} props.message - Message object with role, content, tools, cached, and error fields.
 */
export function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <Bot className="w-6 h-6 text-info mt-1 flex-shrink-0" />}
      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
        isUser
          ? 'bg-info/20 text-text-primary'
          : message.error
            ? 'bg-danger/20 text-danger'
            : 'bg-bg-card text-text-primary'
      }`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.tools && message.tools.length > 0 && (
          <div className="mt-2 text-xs text-text-secondary">
            Tools used: {message.tools.join(', ')}
          </div>
        )}
        {message.cached && (
          <div className="mt-1 text-xs text-text-secondary">⚡ Cached response</div>
        )}
      </div>
      {isUser && <User className="w-6 h-6 text-text-secondary mt-1 flex-shrink-0" />}
    </div>
  )
}
