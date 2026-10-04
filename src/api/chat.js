const MODELS = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  { id: 'grok-4.5', label: 'Grok 4.5' },
]

export { MODELS }

export async function sendChat(messages, model) {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      thinking: { type: 'disabled' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed (${response.status})`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
