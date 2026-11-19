import { ROLES, isAdminRole, isLeadRole, normalizeUserRole, normalizeUserType, userTypeToAppRole } from './constants';

export const getPrivileges = ({ userType, userRole } = {}) => {
  const role = normalizeUserRole(userRole);
  const type = normalizeUserType(userType) || 'Sales';
  const admin = isAdminRole(role);
  const teamLead = role === 'Team lead';
  const member = role === 'Team member';
  const leadOrAdmin = isLeadRole(role);
  const salesType = type === 'Sales';
  const trainingType = type === 'Technical support';
  const canViewSales = admin || salesType;
  const canViewTraining = admin || trainingType;

  return {
    role,
    type,
    admin,
    teamLead,
    member,
    leadOrAdmin,
    workspace: userTypeToAppRole(type),
    canViewSales,
    canViewTraining,
    canSwitchModule: admin,
    canViewUsers: admin || teamLead,
    canManageUsers: admin,
    canEditUserTypeRole: admin,
    canEditTeamCalendar: admin || teamLead,
    canAddLead: canViewSales,
    canEditLead: canViewSales,
    canPassToTraining: canViewSales,
    canAssignTrainer: canViewTraining,
    canScheduleSession: canViewTraining,
    canScheduleForOthers: canViewTraining,
    canViewAllTrainers: canViewTraining,
    defaultTrainerScope: leadOrAdmin ? 'all' : 'self',
    canViewAllWorklogs: canViewTraining && leadOrAdmin,
    canEditOwnWorklog: canViewTraining,
    canEditOwnCalendar: canViewTraining || admin,
    canManageAnySession: canViewTraining && leadOrAdmin,
  };
};

export const workspaceFromPrivileges = (privileges, selectedRole) => {
  if (privileges.canSwitchModule) return selectedRole || privileges.workspace;
  if (privileges.canViewTraining && !privileges.canViewSales) return ROLES.TRAINING;
  return ROLES.SALES;
};
