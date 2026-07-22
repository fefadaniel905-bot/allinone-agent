'use client'
import { useState } from 'react'

export default function Home() {
  const [businessId, setBusinessId] = useState('sarah-cakes')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>(['AI: Hey! I am Allinone Agent. Ask me anything!'])
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if(!input) return
    setLoading(true)
    const newMessages = [...messages, `You: ${input}`]
    setMessages(newMessages)

    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userMessage: input, business_id: businessId })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setMessages([...newMessages, `Error: ${err.error ?? res.status}`])
      setInput('')
      setLoading(false)
      return
    }

    const data = await res.json()
    setMessages([...newMessages, `AI: ${data.reply}`])
    setInput('')
    setLoading(false)
  }

  return (
    <main style={{maxWidth: '700px', margin: '0 auto', padding: '20px'}}>
      <h1>🚀 Allinone Agent</h1>
      <p style={{fontSize: '13px', color: '#666'}}>
        business_id: <input value={businessId} onChange={e=>setBusinessId(e.target.value)} style={{padding: '4px'}} />
      </p>
      <div style={{border: '1px solid #ccc', padding: '10px', height: '400px', overflow: 'auto', marginBottom: '10px'}}>
        {messages.map((m,i) => <p key={i}>{m}</p>)}
      </div>
      <input 
        value={input} 
        onChange={e=>setInput(e.target.value)} 
        onKeyDown={e=> e.key === 'Enter' && sendMessage()}
        placeholder="Ask me anything..."
        style={{width: '80%', padding: '8px'}}
      />
      <button onClick={sendMessage} disabled={loading} style={{padding: '8px 16px'}}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
    </main>
  )
}
