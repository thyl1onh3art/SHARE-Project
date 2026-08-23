const Event = require('../models/Event');
const SharedAccount = require('../models/SharedAccount');
const PaymentRequest = require('../models/PaymentRequest');
const { contributionProgressTotal } = require('../utils/contributionProgress');

const personSummary = (person) => {
  if (!person) return null;
  if (typeof person === 'string') return { _id: person };
  return {
    _id: person._id,
    firstName: person.firstName || '',
    lastName: person.lastName || ''
  };
};

const recordedTotalFromRecords = (records, completedPayments) =>
  contributionProgressTotal(records, completedPayments);

const yourContributionFromRecords = (records, userId) =>
  (records || []).reduce((sum, record) => {
    if (!record || record.type !== 'input') return sum;
    const recordUser = record.user && (record.user._id || record.user);
    if (String(recordUser) !== String(userId)) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);

const summarizeTripMoney = (account, userId, completedPayments = []) => ({
  _id: account._id,
  name: account.name,
  isDeleted: !!account.isDeleted,
  targetAmount: account.targetAmount || null,
  targetDate: account.targetDate || null,
  recordedTotal: recordedTotalFromRecords(account.financeRecords, completedPayments),
  yourContribution: yourContributionFromRecords(account.financeRecords, userId),
  owner: personSummary(account.owner),
  members: (account.members || []).map(personSummary).filter(Boolean)
});

const attachTripMoneyToEvents = async (events, userId) => {
  const list = Array.isArray(events) ? events : [events];
  const ids = list.map((event) => event._id).filter(Boolean);
  if (ids.length === 0) {
    return Array.isArray(events) ? [] : events;
  }

  const pots = await SharedAccount.find({ event: { $in: ids } })
    .select('_id name isDeleted event targetAmount targetDate owner members financeRecords')
    .populate('owner', 'firstName lastName')
    .populate('members', 'firstName lastName')
    .populate('financeRecords', 'type amount user');
  const byEvent = new Map(pots.map((pot) => [String(pot.event), pot]));
  const completedPayments = await PaymentRequest.find({
    sharedAccount: { $in: pots.map((pot) => pot._id) },
    status: { $in: ['executed', 'approved'] }
  }).select('sharedAccount status amount description');
  const completedByPot = new Map();
  completedPayments.forEach((payment) => {
    const key = String(payment.sharedAccount);
    const list = completedByPot.get(key) || [];
    list.push(payment);
    completedByPot.set(key, list);
  });

  const decorated = list.map((event) => {
    const plain = typeof event.toObject === 'function' ? event.toObject() : { ...event };
    const linked = byEvent.get(String(event._id));
    plain.tripMoney = linked
      ? summarizeTripMoney(linked, userId, completedByPot.get(String(linked._id)) || [])
      : null;
    return plain;
  });

  return Array.isArray(events) ? decorated : decorated[0];
};

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
    const events = await Event.find({ user: req.user.userId })
      .populate('user', 'firstName lastName')
      .populate('sharedWith', 'firstName lastName')
      .sort({ eventDate: 1, eventTime: 1 });
    res.json(await attachTripMoneyToEvents(events, req.user.userId));
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
    })
      .populate('user', 'firstName lastName')
      .populate('sharedWith', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(await attachTripMoneyToEvents(event, req.user.userId));
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