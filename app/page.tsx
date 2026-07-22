
'use client'
import { useState } from 'react'

export default function Home() {
  const [businessId, setBusinessId] = useState('sarah-cakes')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  const sendMessage = async () => {
    if (!input.trim()) return

    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: input, business_id: businessId })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMessages([...messages, `You: ${input}`, `Error: ${err.error ?? res.status}`])
      setInput('')
      return
    }

    const data = await res.json()
    setMessages([...messages, `You: ${input}`, `AI: ${data.reply}`])
    setInput('')
  }

  return (
    <div style={{padding: '20px'}}>
      <h1>🚀 Allinone Agent</h1>
      <p>
        business_id:{' '}
        <input value={businessId} onChange={e => setBusinessId(e.target.value)} />
      </p>
      {messages.map((m,i) => <p key={i}>{m}</p>)}
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
