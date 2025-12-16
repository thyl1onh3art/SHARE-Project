const Event = require('../models/Event');
const User = require('../models/User');

// Get event recommendations for a user
exports.getEventRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's previous events
    const userEvents = await Event.find({ user: userId });
    
    // Analyze user preferences
    const preferences = analyzeUserPreferences(user, userEvents);
    
    // Generate recommendations based on:
    // 1. User's interests (from signup)
    // 2. Previous event categories
    // 3. Previous event locations
    // 4. Event frequency patterns
    
    const recommendations = generateRecommendations(preferences, userEvents);
    
    res.json({
      recommendations,
      preferences: {
        favoriteCategories: preferences.favoriteCategories,
        favoriteLocations: preferences.favoriteLocations,
        averageBudget: preferences.averageBudget
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Analyze user preferences from signup info and previous events
function analyzeUserPreferences(user, events) {
  const preferences = {
    interests: user.interests || [],
    favoriteCategories: [],
    favoriteLocations: [],
    averageBudget: 0,
    eventFrequency: 'monthly' // default
  };

  // Analyze event categories
  const categoryCounts = {};
  events.forEach(event => {
    categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
  });
  
  preferences.favoriteCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  // Analyze locations
  const locationCounts = {};
  events.forEach(event => {
    if (event.location) {
      locationCounts[event.location] = (locationCounts[event.location] || 0) + 1;
    }
  });
  
  preferences.favoriteLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([location]) => location);

  // Calculate average budget
  const budgets = events
    .filter(e => e.budget && e.budget.totalAmount > 0)
    .map(e => e.budget.totalAmount);
  
  if (budgets.length > 0) {
    preferences.averageBudget = budgets.reduce((sum, amount) => sum + amount, 0) / budgets.length;
  }

  // Analyze event frequency
  if (events.length > 1) {
    const sortedEvents = events.sort((a, b) => 
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
    const avgDaysBetween = calculateAverageDaysBetween(sortedEvents);
    
    if (avgDaysBetween < 7) {
      preferences.eventFrequency = 'weekly';
    } else if (avgDaysBetween < 30) {
      preferences.eventFrequency = 'monthly';
    } else if (avgDaysBetween < 90) {
      preferences.eventFrequency = 'quarterly';
    } else {
      preferences.eventFrequency = 'yearly';
    }
  }

  return preferences;
}

function calculateAverageDaysBetween(events) {
  if (events.length < 2) return 30;
  
  let totalDays = 0;
  for (let i = 1; i < events.length; i++) {
    const days = Math.abs(
      (new Date(events[i].eventDate).getTime() - new Date(events[i - 1].eventDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    totalDays += days;
  }
  
  return totalDays / (events.length - 1);
}

// Generate recommendations based on preferences
function generateRecommendations(preferences, userEvents) {
  const recommendations = [];
  const now = new Date();
  
  // Recommendation 1: Suggest events based on favorite categories
  preferences.favoriteCategories.forEach(category => {
    const nextDate = calculateNextRecommendedDate(preferences.eventFrequency);
    recommendations.push({
      type: 'category_based',
      title: `Recommended ${category.charAt(0).toUpperCase() + category.slice(1)} Event`,
      category: category,
      suggestedDate: nextDate,
      reason: `Based on your interest in ${category} events`,
      confidence: 'high'
    });
  });

  // Recommendation 2: Suggest events in favorite locations
  preferences.favoriteLocations.forEach(location => {
    const nextDate = calculateNextRecommendedDate(preferences.eventFrequency);
    recommendations.push({
      type: 'location_based',
      title: `Event in ${location}`,
      location: location,
      suggestedDate: nextDate,
      reason: `You frequently attend events in ${location}`,
      confidence: 'medium'
    });
  });

  // Recommendation 3: Suggest based on user interests (from signup)
  preferences.interests.forEach(interest => {
    const matchingCategory = mapInterestToCategory(interest);
    if (matchingCategory && !preferences.favoriteCategories.includes(matchingCategory)) {
      const nextDate = calculateNextRecommendedDate(preferences.eventFrequency);
      recommendations.push({
        type: 'interest_based',
        title: `Recommended ${matchingCategory.charAt(0).toUpperCase() + matchingCategory.slice(1)} Event`,
        category: matchingCategory,
        suggestedDate: nextDate,
        reason: `Based on your interest: ${interest}`,
        confidence: 'medium'
      });
    }
  });

  // Recommendation 4: Suggest events with similar budget
  if (preferences.averageBudget > 0) {
    const nextDate = calculateNextRecommendedDate(preferences.eventFrequency);
    recommendations.push({
      type: 'budget_based',
      title: 'Event with Similar Budget',
      suggestedBudget: Math.round(preferences.averageBudget),
      suggestedDate: nextDate,
      reason: `Based on your average event budget of £${preferences.averageBudget.toFixed(2)}`,
      confidence: 'low'
    });
  }

  return recommendations.slice(0, 10); // Return top 10 recommendations
}

function calculateNextRecommendedDate(frequency) {
  const now = new Date();
  const nextDate = new Date(now);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
    default:
      nextDate.setFullYear(now.getFullYear() + 1);
      break;
  }
  
  return nextDate.toISOString().split('T')[0];
}

function mapInterestToCategory(interest) {
  const interestLower = interest.toLowerCase();
  
  if (interestLower.includes('sport') || interestLower.includes('fitness') || interestLower.includes('gym')) {
    return 'sports';
  }
  if (interestLower.includes('music') || interestLower.includes('concert') || interestLower.includes('festival')) {
    return 'concert';
  }
  if (interestLower.includes('travel') || interestLower.includes('holiday') || interestLower.includes('vacation')) {
    return 'travel';
  }
  if (interestLower.includes('work') || interestLower.includes('business') || interestLower.includes('professional')) {
    return 'work';
  }
  if (interestLower.includes('birthday') || interestLower.includes('party')) {
    return 'birthday';
  }
  if (interestLower.includes('social') || interestLower.includes('friend') || interestLower.includes('meet')) {
    return 'social';
  }
  
  return 'other';
}

