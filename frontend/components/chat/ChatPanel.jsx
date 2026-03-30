'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot } from 'lucide-react'
import { api } from '@/lib/api'
import { ChatMessage } from './ChatMessage'
import { SuggestionChips } from './SuggestionChips'

export function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => scrollToBottom(), [messages])

  const handleSend = async (message = input) => {
    if (!message.trim() || isLoading) return

    const userMsg = { role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const result = await api.chat(message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        tools: result.tools_called,
        cached: result.cached,
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Failed to get response. Backend may be warming up — try again in a moment.',
        error: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = [
    "What happens if Port Shanghai is delayed by 6 hours?",
    "What are the highest risk ports?",
    "Suggest reroute options for S001",
    "Give me a supply chain overview",
  ]

  return (
    <div className="bg-bg-secondary rounded-lg border border-border flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="w-5 h-5 text-info" />
        <h2 className="font-semibold text-sm">AI Decision Agent</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-8">
            <p>Ask about your supply chain...</p>
            <SuggestionChips suggestions={suggestions} onSelect={handleSend} />
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="animate-pulse">●●●</div>
            Analyzing supply chain...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about disruptions, reroutes, risks..."
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-info hover:bg-info/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
