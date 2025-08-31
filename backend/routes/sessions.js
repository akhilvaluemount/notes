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

// POST /api/sessions/:id/transcript - Save transcript messages to session
router.post('/:id/transcript', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages array is required' 
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Process each message and add to session
    const processedMessages = messages.map(msg => ({
      message_id: msg.id || msg.message_id,
      text: msg.text,
      timestamp: new Date(msg.timestamp),
      is_partial: msg.isPartial || msg.is_partial || false,
      silence_segmented: msg.silenceSegmented || msg.silence_segmented || false,
      has_silence_gap: msg.hasSilenceGap || msg.has_silence_gap || false,
      last_activity_time: msg.lastActivityTime ? new Date(msg.lastActivityTime) : null
    }));

    // Add new messages to existing transcript (avoid duplicates based on message_id)
    const existingMessageIds = session.transcript_messages.map(msg => msg.message_id);
    const newMessages = processedMessages.filter(msg => !existingMessageIds.includes(msg.message_id));
    
    session.transcript_messages.push(...newMessages);
    session.updated_at = new Date();

    await session.save();
    
    res.status(201).json({ 
      message: 'Transcript messages saved successfully',
      saved_count: newMessages.length,
      total_messages: session.transcript_messages.length
    });
  } catch (error) {
    console.error('Error saving transcript messages:', error);
    res.status(500).json({ error: 'Failed to save transcript messages' });
  }
});

// GET /api/sessions/:id/transcript - Get transcript messages for session
router.get('/:id/transcript', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).select('transcript_messages');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Sort messages by timestamp
    const sortedMessages = session.transcript_messages.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    res.json({
      messages: sortedMessages,
      total_count: sortedMessages.length
    });
  } catch (error) {
    console.error('Error fetching transcript messages:', error);
    res.status(500).json({ error: 'Failed to fetch transcript messages' });
  }
});

// PUT /api/sessions/:id/transcript - Update specific transcript messages
router.put('/:id/transcript', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages array is required' 
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let updatedCount = 0;

    // Update existing messages based on message_id
    messages.forEach(updatedMsg => {
      const existingMsgIndex = session.transcript_messages.findIndex(
        msg => msg.message_id === updatedMsg.message_id || msg.message_id === updatedMsg.id
      );
      
      if (existingMsgIndex !== -1) {
        session.transcript_messages[existingMsgIndex].text = updatedMsg.text;
        session.transcript_messages[existingMsgIndex].is_partial = updatedMsg.isPartial || updatedMsg.is_partial || false;
        session.transcript_messages[existingMsgIndex].silence_segmented = updatedMsg.silenceSegmented || updatedMsg.silence_segmented || false;
        session.transcript_messages[existingMsgIndex].has_silence_gap = updatedMsg.hasSilenceGap || updatedMsg.has_silence_gap || false;
        
        if (updatedMsg.lastActivityTime) {
          session.transcript_messages[existingMsgIndex].last_activity_time = new Date(updatedMsg.lastActivityTime);
        }
        
        updatedCount++;
      }
    });

    session.updated_at = new Date();
    await session.save();
    
    res.json({ 
      message: 'Transcript messages updated successfully',
      updated_count: updatedCount
    });
  } catch (error) {
    console.error('Error updating transcript messages:', error);
    res.status(500).json({ error: 'Failed to update transcript messages' });
  }
});

// DELETE /api/sessions/:id/transcript/:messageId - Delete specific transcript message
router.delete('/:id/transcript/:messageId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messageIndex = session.transcript_messages.findIndex(
      msg => msg.message_id === req.params.messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Transcript message not found' });
    }

    session.transcript_messages.splice(messageIndex, 1);
    session.updated_at = new Date();
    await session.save();
    
    res.json({ 
      message: 'Transcript message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transcript message:', error);
    res.status(500).json({ error: 'Failed to delete transcript message' });
  }
});

module.exports = router;