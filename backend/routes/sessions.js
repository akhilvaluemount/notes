const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// GET /api/sessions - List all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find()
      .select('user_name company_name interviewer_name role status created_at updated_at')
      .sort({ updated_at: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
  try {
    const {
      user_name,
      company_name,
      interviewer_name,
      role,
      technologies
    } = req.body;

    // Validate required fields
    if (!user_name || !company_name || !interviewer_name || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_name, company_name, interviewer_name, role' 
      });
    }

    const session = new Session({
      user_name,
      company_name,
      interviewer_name,
      role,
      technologies: technologies || []
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:id - Get specific session with questions
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// PUT /api/sessions/:id - Update session details
router.put('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// POST /api/sessions/:id/questions - Add question/answer to session
router.post('/:id/questions', async (req, res) => {
  try {
    const { question, answer, question_type, language, topic } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Missing required fields: question, answer' 
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.questions.push({
      question,
      answer,
      question_type: question_type || 'general',
      language: language || null,
      topic: topic || null,
      timestamp: new Date()
    });

    await session.save();
    res.status(201).json(session.questions[session.questions.length - 1]);
  } catch (error) {
    console.error('Error adding question to session:', error);
    res.status(500).json({ error: 'Failed to add question to session' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// PUT /api/sessions/:id/status - Update session status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'completed', 'paused'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: active, completed, or paused' 
      });
    }

    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { status, updated_at: new Date() },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ error: 'Failed to update session status' });
  }
});

module.exports = router;