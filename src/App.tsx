import { useState, useEffect } from 'react'
import './App.css'

interface JournalEntry {
  id?: number
  title: string
  content: string
  createdAt?: string
}

function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/entries')
      if (response.ok) {
        const data = await response.json()
        setEntries(data as JournalEntry[])
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      })

      if (response.ok) {
        setTitle('')
        setContent('')
        fetchEntries()
      }
    } catch (error) {
      console.error('Error creating entry:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📔 Journal</h1>
      </header>

      <main className="app-main">
        <section className="entry-form">
          <h2>New Entry</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="Write your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="textarea"
              rows={6}
            />
            <button type="submit" disabled={loading} className="button">
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </section>

        <section className="entries-list">
          <h2>Entries</h2>
          {loading && entries.length === 0 ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p className="empty-state">No entries yet. Create your first entry!</p>
          ) : (
            <div className="entries">
              {entries.map((entry) => (
                <article key={entry.id} className="entry-card">
                  <h3>{entry.title}</h3>
                  <p className="entry-date">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString()
                      : ''}
                  </p>
                  <p className="entry-content">{entry.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
