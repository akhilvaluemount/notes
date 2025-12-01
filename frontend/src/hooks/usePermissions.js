import { useAuth } from '../context/AuthContext';

const usePermissions = () => {
  const { user, isAuthenticated, hasPremiumAccess, isAdmin, getAILimit } = useAuth();

  // Check if user can use Vision AI (Premium/Admin only)
  const canUseVisionAI = () => {
    return hasPremiumAccess;
  };

  // Check if user can use Exam Mode (Premium/Admin only)
  const canUseExamMode = () => {
    return hasPremiumAccess;
  };

  // Check if user can manage other users (Admin only)
  const canManageUsers = () => {
    return isAdmin;
  };

  // Check if user can access all sessions (Admin only)
  const canAccessAllSessions = () => {
    return isAdmin;
  };

  // Get remaining AI calls for the day
  const getRemainingAICalls = () => {
    const limit = getAILimit();
    return limit.remaining;
  };

  // Check if user has AI calls remaining
  const hasAICallsRemaining = () => {
    const limit = getAILimit();
    // -1 means unlimited
    return limit.remaining === -1 || limit.remaining > 0;
  };

  // Check if user has unlimited AI calls
  const hasUnlimitedAICalls = () => {
    const limit = getAILimit();
    return limit.remaining === -1;
  };

  // Generic feature access check
  const hasFeatureAccess = (feature) => {
    if (!isAuthenticated) return false;

    switch (feature) {
      case 'visionAI':
        return canUseVisionAI();
      case 'examMode':
        return canUseExamMode();
      case 'userManagement':
        return canManageUsers();
      case 'allSessions':
        return canAccessAllSessions();
      case 'unlimitedAI':
        return hasUnlimitedAICalls();
      default:
        return true; // Basic features available to all authenticated users
    }
  };

  // Get user's role display name
  const getRoleDisplayName = () => {
    if (!user) return '';

    switch (user.role) {
      case 'admin':
        return 'Administrator';
      case 'premium':
        return 'Premium';
      case 'free':
        return 'Free';
      default:
        return user.role;
    }
  };

  // Get role badge class
  const getRoleBadgeClass = () => {
    if (!user) return '';
    return `role-badge ${user.role}`;
  };

  // Get AI limit status (for UI display)
  const getAILimitStatus = () => {
    const limit = getAILimit();

    if (limit.remaining === -1) {
      return {
        text: 'Unlimited',
        status: 'unlimited',
        className: 'unlimited'
      };
    }

    const percentage = (limit.remaining / limit.limit) * 100;

    if (percentage <= 10) {
      return {
        text: `${limit.remaining}/${limit.limit} calls remaining`,
        status: 'danger',
        className: 'danger'
      };
    }

    if (percentage <= 30) {
      return {
        text: `${limit.remaining}/${limit.limit} calls remaining`,
        status: 'warning',
        className: 'warning'
      };
    }

    return {
      text: `${limit.remaining}/${limit.limit} calls remaining`,
      status: 'normal',
      className: ''
    };
  };

  return {
    // Permission checks
    canUseVisionAI,
    canUseExamMode,
    canManageUsers,
    canAccessAllSessions,
    hasAICallsRemaining,
    hasUnlimitedAICalls,
    hasFeatureAccess,

    // AI limit info
    getRemainingAICalls,
    getAILimitStatus,

    // Role info
    getRoleDisplayName,
    getRoleBadgeClass,

    // User info
    user,
    isAuthenticated,
    hasPremiumAccess,
    isAdmin
  };
};

export default usePermissions;
