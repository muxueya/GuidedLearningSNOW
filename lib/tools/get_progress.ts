import Database from 'better-sqlite3'

export function executeGetProgress(db: Database.Database, opts: { topic: string }): {
  topics: Array<{ name: string; averageScore: number; sessionCount: number }>
} {
  const rows = db.prepare(`
    SELECT t.name,
      COALESCE(ROUND(AVG(p.score), 0), 0) as averageScore,
      COUNT(p.id) as sessionCount
    FROM topics t
    LEFT JOIN progress p ON p.topic_id = t.id
    WHERE t.name LIKE ?
    GROUP BY t.id
    ORDER BY t.name
  `).all(`%${opts.topic}%`) as Array<{ name: string; averageScore: number; sessionCount: number }>
  return { topics: rows }
}
