const Event = require('../models/Event');

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      user: req.user.userId,
      ...req.body
    };

    // Calculate savings if budget is provided
    if (eventData.budget && eventData.budget.totalAmount > 0 && eventData.eventDate) {
      const savingsData = calculateSavingsPlan(
        eventData.budget.totalAmount,
        eventData.eventDate,
        eventData.budget.savingsFrequency || 'monthly'
      );
      
      eventData.budget = {
        ...eventData.budget,
        ...savingsData
      };
    }

    const event = new Event(eventData);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Calculate savings plan
function calculateSavingsPlan(totalAmount, eventDate, frequency = 'monthly') {
  const now = new Date();
  const eventDateTime = new Date(eventDate);
  const timeDiff = eventDateTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return {
      totalAmount,
      savingsGoal: totalAmount,
      amountPerPeriod: totalAmount,
      startDate: now.toISOString().split('T')[0],
      isActive: false
    };
  }

  let periodsLeft;
  const startDate = now.toISOString().split('T')[0];

  switch (frequency) {
    case 'weekly':
      periodsLeft = Math.ceil(timeDiff / (7 * 24 * 60 * 60 * 1000));
      break;
    case 'biweekly':
      periodsLeft = Math.ceil(timeDiff / (14 * 24 * 60 * 60 * 1000));
      break;
    case 'monthly':
    default:
      periodsLeft = Math.ceil(timeDiff / (30 * 24 * 60 * 60 * 1000));
      break;
  }

  const amountPerPeriod = Math.ceil(totalAmount / Math.max(periodsLeft, 1));

  return {
    totalAmount,
    savingsGoal: totalAmount,
    amountPerPeriod,
    startDate,
    isActive: true
  };
}

// Get all events for the user
exports.getUserEvents = async (req, res) => {
  try {
    const events = await Event.find({ user: req.user.userId }).sort({ eventDate: 1, eventTime: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get a specific event
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get upcoming events (next 30 days)
exports.getUpcomingEvents = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const events = await Event.find({
      user: req.user.userId,
      eventDate: {
        $gte: today.toISOString().split('T')[0],
        $lte: thirtyDaysFromNow.toISOString().split('T')[0]
      }
    }).sort({ eventDate: 1, eventTime: 1 });
    
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get events shared with the user
exports.getSharedEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const User = require('../models/User');
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.json([]);
    }
    
    // Get events explicitly shared with this user (by user ID)
    const eventsSharedById = await Event.find({
      isShared: true,
      sharedWith: userId
    })
      .populate('user', 'firstName lastName email')
      .sort({ eventDate: 1, eventTime: 1 });
    
    // Get events from users who have shared their calendar with this user (by email)
    const usersWithSharedCalendars = await User.find({
      'calendarSettings.privacy': 'shared',
      'calendarSettings.sharedWith': currentUser.email
    }).select('_id');
    
    const sharedUserIds = usersWithSharedCalendars.map(u => u._id);
    
    const eventsFromSharedCalendars = await Event.find({
      user: { $in: sharedUserIds },
      user: { $ne: userId } // Exclude own events
    })
      .populate('user', 'firstName lastName email')
      .sort({ eventDate: 1, eventTime: 1 });
    
    // Combine both types of shared events
    const allSharedEvents = [...eventsSharedById, ...eventsFromSharedCalendars];
    
    res.json(allSharedEvents);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};