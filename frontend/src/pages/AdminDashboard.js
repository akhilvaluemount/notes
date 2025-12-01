import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/authApi';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [page, search, roleFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        authApi.getUsers(page, 20, search, roleFilter),
        authApi.getUserStats()
      ]);

      if (usersResponse.success) {
        setUsers(usersResponse.users);
        setPagination(usersResponse.pagination);
      }

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authApi.updateUserRole(userId, newRole);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      await authApi.deleteUser(userId);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <h1>Admin Dashboard</h1>
          <span className="admin-badge">Administrator</span>
        </div>
        <div className="header-right">
          <span className="user-name">{currentUser?.name}</span>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to App
          </button>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-error">
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-card admin">
            <h3>Admins</h3>
            <span className="stat-value">{stats.byRole.admin}</span>
          </div>
          <div className="stat-card premium">
            <h3>Premium</h3>
            <span className="stat-value">{stats.byRole.premium}</span>
          </div>
          <div className="stat-card free">
            <h3>Free</h3>
            <span className="stat-value">{stats.byRole.free}</span>
          </div>
          <div className="stat-card new">
            <h3>New This Week</h3>
            <span className="stat-value">{stats.newUsersThisWeek}</span>
          </div>
        </div>
      )}

      <div className="users-section">
        <div className="users-header">
          <h2>User Management</h2>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearch}
              className="search-input"
            />
            <select value={roleFilter} onChange={handleRoleFilter} className="role-select">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="premium">Premium</option>
              <option value="exam">Exam</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>AI Calls Today</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`role-badge-select ${user.role}`}
                        disabled={user._id === currentUser?.id}
                      >
                        <option value="admin">Admin</option>
                        <option value="premium">Premium</option>
                        <option value="exam">Exam</option>
                        <option value="free">Free</option>
                      </select>
                    </td>
                    <td>
                      {user.role === 'free' ? (
                        <span>{user.aiCallsToday || 0}/20</span>
                      ) : (
                        <span className="unlimited">Unlimited</span>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className="btn-delete"
                        disabled={user._id === currentUser?.id}
                        title={user._id === currentUser?.id ? "Cannot delete yourself" : "Delete user"}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span>Page {page} of {pagination.pages}</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
