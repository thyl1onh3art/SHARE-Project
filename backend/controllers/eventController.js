const Event = require('../models/Event');
const SharedAccount = require('../models/SharedAccount');
const PaymentRequest = require('../models/PaymentRequest');
const { contributionProgressTotal } = require('../utils/contributionProgress');
const { parsePlannedContributors } = require('../utils/plannedContributors');
const {
  parseContributionFrequency,
  parseContributionAgreement,
  buildCreatorContributionPlan
} = require('../utils/contributionPlan');

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

const yourContributionPlanFromAccount = (account, userId) => {
  const plans = account.contributionPlans || [];
  const found = plans.find((plan) => String(plan.user) === String(userId));
  if (!found) return null;
  return {
    frequency: found.frequency || null,
    agreed: !!found.agreed,
    agreedAt: found.agreedAt || null
  };
};

const summarizeTripMoney = (account, userId, completedPayments = []) => ({
  _id: account._id,
  name: account.name,
  isDeleted: !!account.isDeleted,
  targetAmount: account.targetAmount || null,
  targetDate: account.targetDate || null,
  recordedTotal: recordedTotalFromRecords(account.financeRecords, completedPayments),
  yourContribution: yourContributionFromRecords(account.financeRecords, userId),
  plannedContributors: account.plannedContributors || null,
  yourContributionPlan: yourContributionPlanFromAccount(account, userId),
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
    .select('_id name isDeleted event targetAmount targetDate plannedContributors contributionPlans owner members financeRecords')
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
    const eventOwnerId = plain.user && (plain.user._id || plain.user);
    plain.ownedByCurrentUser = String(eventOwnerId) === String(userId);
    return plain;
  });

  return Array.isArray(events) ? decorated : decorated[0];
};

const potTargetDateFromTripDate = (eventDate) => {
  const fromTrip = new Date(`${eventDate}T23:59:59`);
  if (!Number.isNaN(fromTrip.getTime()) && fromTrip > new Date()) {
    return fromTrip;
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  return fallback;
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

// Create a Trip and its linked Trip Money in one step. If pot creation fails, the new Event is removed.
exports.createEventWithTripMoney = async (req, res) => {
  let createdEventId;
  try {
    const userId = req.user.userId;
    const { targetAmount, eventId, sharedAccount, plannedContributors, contributionFrequency, contributionPlanAgreed, ...tripFields } = req.body;
    const amount = parseFloat(targetAmount);

    if (!(amount > 0)) {
      return res.status(400).json({ message: 'Trip Money target must be greater than 0' });
    }
    if (!tripFields.title || !tripFields.eventDate || !tripFields.eventTime) {
      return res.status(400).json({ message: 'Trip name, date and start time are required' });
    }
    const planned = parsePlannedContributors(plannedContributors);
    if (planned.error) {
      return res.status(400).json({ message: planned.error });
    }
    const frequency = parseContributionFrequency(contributionFrequency);
    if (frequency.error) {
      return res.status(400).json({ message: frequency.error });
    }
    const agreement = parseContributionAgreement(contributionPlanAgreed);
    if (agreement.error) {
      return res.status(400).json({ message: agreement.error });
    }

    const eventData = {
      user: userId,
      ...tripFields
    };

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
    createdEventId = event._id;

    const potName = String(event.title || '').trim();
    const potDescription = String(event.description || '').trim() || `Shared costs for ${potName}`;
    const targetDate = potTargetDateFromTripDate(event.eventDate);

    try {
      const sharedAccountDoc = new SharedAccount({
        owner: userId,
        name: potName,
        description: potDescription,
        targetAmount: amount,
        targetDate,
        plannedContributors: planned.value,
        contributionPlans: [buildCreatorContributionPlan(userId, frequency.value)],
        perPersonAmount: amount,
        members: [],
        financeRecords: [],
        event: event._id
      });
      await sharedAccountDoc.save();

      const populatedAccount = await SharedAccount.findById(sharedAccountDoc._id)
        .populate('owner', 'firstName lastName email')
        .populate('members', 'firstName lastName email');

      return res.status(201).json({
        event: await attachTripMoneyToEvents(event, userId),
        sharedAccount: populatedAccount,
        message: 'Trip created'
      });
    } catch (potErr) {
      await Event.deleteOne({ _id: createdEventId, user: userId });
      if (potErr && potErr.code === 11000) {
        return res.status(400).json({
          message: 'This trip already has Trip Money. Open the existing pot instead of creating another.'
        });
      }
      return res.status(500).json({
        message: 'Could not create Trip Money for this trip. Please try again.'
      });
    }
  } catch (err) {
    if (createdEventId) {
      await Event.deleteOne({ _id: createdEventId, user: req.user.userId }).catch(() => {});
    }
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please check the trip details and try again.' });
    }
    return res.status(500).json({ message: 'Could not create this trip. Please try again.' });
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

// Get events the user owns, plus events linked to Shared Accounts they own or have joined.
exports.getUserEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const membershipPots = await SharedAccount.find({
      $or: [{ owner: userId }, { members: userId }],
      event: { $ne: null }
    }).select('event');

    const linkedEventIds = [...new Set(
      membershipPots
        .map((pot) => pot.event)
        .filter(Boolean)
        .map((id) => String(id))
    )];

    const events = await Event.find({
      $or: [
        { user: userId },
        { _id: { $in: linkedEventIds } }
      ]
    })
      .populate('user', 'firstName lastName')
      .populate('sharedWith', 'firstName lastName')
      .sort({ eventDate: 1, eventTime: 1 });

    res.json(await attachTripMoneyToEvents(events, userId));
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