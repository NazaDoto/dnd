const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── GET /api/notes/:characterId ──────────────────────────────
router.get('/:characterId', auth, async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT n.* FROM notes n
       JOIN characters c ON c.id = n.character_id
       WHERE n.character_id = ? AND n.user_id = ?
       ORDER BY n.created_at DESC`, [req.params.characterId, req.user.id]
        );
        rows.forEach(r => {
            if (typeof r.tags === 'string') try { r.tags = JSON.parse(r.tags); } catch { r.tags = []; }
        });
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener notas' });
    }
});

// ── POST /api/notes/:characterId ─────────────────────────────
router.post('/:characterId', auth, async(req, res) => {
    try {
        const { title, content, session_date, tags } = req.body;
        if (!content) return res.status(400).json({ message: 'El contenido es obligatorio' });

        const [result] = await db.query(
            `INSERT INTO notes (character_id, user_id, title, content, session_date, tags)
       VALUES (?, ?, ?, ?, ?, ?)`, [
                req.params.characterId, req.user.id,
                title || null, content,
                session_date || null,
                tags ? JSON.stringify(tags) : '[]'
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Nota creada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear nota' });
    }
});

// ── PUT /api/notes/:noteId ───────────────────────────────────
router.put('/:noteId', auth, async(req, res) => {
    try {
        const { title, content, session_date, tags } = req.body;
        const [exists] = await db.query(
            'SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.noteId, req.user.id]
        );
        if (!exists.length) return res.status(404).json({ message: 'Nota no encontrada' });

        await db.query(
            `UPDATE notes SET title=?, content=?, session_date=?, tags=? WHERE id=? AND user_id=?`, [title || null, content, session_date || null, tags ? JSON.stringify(tags) : '[]',
                req.params.noteId, req.user.id
            ]
        );
        res.json({ message: 'Nota actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar nota' });
    }
});

// ── DELETE /api/notes/:noteId ────────────────────────────────
router.delete('/:noteId', auth, async(req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.noteId, req.user.id]);
        res.json({ message: 'Nota eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar nota' });
    }
});

module.exports = router;