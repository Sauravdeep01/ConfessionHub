import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './UserProfile.css';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/confessions`;

function UserProfile({ confessions, onNameUpdate }) {
    const { user, isLoaded } = useAuth();
    const [activeTab, setActiveTab] = useState('My Posts');
    const [anonymousName, setAnonymousName] = useState('');
    const [customUserId, setCustomUserId] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAnonymousName();
        }
    }, [user]);

    const fetchAnonymousName = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/${user.id}`);
            const data = await res.json();
            setAnonymousName(data.anonymousName || '');
            setNewName(data.anonymousName || '');
            setCustomUserId(data.customUserId || '');
        } catch (err) {
            console.error('Failed to fetch anonymous name:', err);
        }
    };

    const handleUpdateName = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleId: user.id, anonymousName: newName })
            });
            if (res.ok) {
                setAnonymousName(newName);
                setIsEditing(false);
                if (onNameUpdate) onNameUpdate();
            }
        } catch (err) {
            console.error('Failed to update anonymous name:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await fetch(`${API_BASE_URL}/users/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();
            
            if (res.ok) {
                setPasswordSuccess('Password updated successfully!');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setTimeout(() => {
                    setShowPasswordChange(false);
                    setPasswordSuccess('');
                }, 2000);
            } else {
                setPasswordError(data.error || 'Failed to update password');
            }
        } catch (err) {
            setPasswordError('Network error. Please try again.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!isLoaded || !user) {
        return <div className="loading-profile">Loading profile...</div>;
    }

    // Filter confessions for the current user
    const myPosts = confessions.filter(c => c.userId === user.id);
    const savedPosts = confessions.filter(c => Array.isArray(c.savedBy) && c.savedBy.includes(user.id));
    const likedPosts = confessions.filter(c => Array.isArray(c.reactions) && c.reactions.some(r => r.userId === user.id));

    // Calculate stats
    const totalSecrets = myPosts.length;
    const totalHearts = myPosts.reduce((sum, c) => sum + (Array.isArray(c.reactions) ? c.reactions.filter(r => r.type === 'love').length : 0), 0);

    const renderEmptyState = (label) => (
        <div className="profile-empty-state">
            <div className="empty-icon">📭</div>
            <p>No {label.toLowerCase()} found yet.</p>
        </div>
    );

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / 86400000);

        if (diffDays < 1) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTabContent = () => {
        const renderList = (list) => (
            <div className="profile-posts-list">
                {list.map(post => (
                    <div key={post._id} className="profile-post-card">
                        <div className="post-main-info">
                            <p className="post-text">{post.text}</p>
                            <div className="post-meta">
                                <span>{formatDate(post.createdAt)}</span>
                                <span className="meta-dot">●</span>
                                <span>{post.reactions?.length || 0} Reactions</span>
                            </div>
                        </div>
                        <div className="post-status active">Active</div>
                    </div>
                ))}
            </div>
        );

        switch (activeTab) {
            case 'My Posts': return myPosts.length > 0 ? renderList(myPosts) : renderEmptyState('Posts');
            case 'Saved': return savedPosts.length > 0 ? renderList(savedPosts) : renderEmptyState('Saved posts');
            case 'Liked': return likedPosts.length > 0 ? renderList(likedPosts) : renderEmptyState('Liked posts');
            default: return null;
        }
    };

    return (
        <div className="user-profile-section">
            <h2 className="profile-header">My Personal Space</h2>

            <div className="profile-layout">
                {/* Left: User Card */}
                <div className="profile-sidebar-card">
                    <div className="profile-user-info">
                        <div className="profile-avatar-wrapper">
                            <img src={user.picture} alt="Profile" className="profile-large-avatar" />
                        </div>
                        <h3 className="profile-display-name">{user.firstName || 'Student'}</h3>

                        <div className="anonymous-name-section">
                            {isEditing ? (
                                <div className="anon-edit-form">
                                    <input
                                        type="text"
                                        className="anon-input"
                                        placeholder="Pick an anonymous name..."
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        maxLength={20}
                                    />
                                    <div className="anon-edit-btns">
                                        <button className="anon-save-btn" onClick={handleUpdateName} disabled={isSaving}>
                                            {isSaving ? '...' : 'Save'}
                                        </button>
                                        <button className="anon-cancel-btn" onClick={() => { setIsEditing(false); setNewName(anonymousName); }}>
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="anon-display">
                                    <div className="personal-id-tag">
                                        <span className="id-label">Personal ID:</span>
                                        <span className="id-value">#{anonymousName ? customUserId : '...'}</span>
                                    </div>
                                    <span className="anon-label">Set Anonymous Name:</span>
                                    <span className="anon-value">{anonymousName || 'Not set (defaults to Anonymous)'}</span>
                                    <button className="anon-edit-btn" onClick={() => setIsEditing(true)}>
                                        ✏️ Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="password-change-section">
                        {!showPasswordChange ? (
                            <button 
                                className="password-change-btn"
                                onClick={() => setShowPasswordChange(true)}
                            >
                                🔐 Change Password
                            </button>
                        ) : (
                            <form onSubmit={handlePasswordChange} className="password-change-form">
                                <h4>Change Password</h4>
                                
                                {passwordError && (
                                    <div className="password-error">{passwordError}</div>
                                )}
                                
                                {passwordSuccess && (
                                    <div className="password-success">{passwordSuccess}</div>
                                )}

                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    className="password-input"
                                    required
                                />

                                <input
                                    type="password"
                                    placeholder="New Password (min 6 chars)"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    className="password-input"
                                    minLength="6"
                                    required
                                />

                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    className="password-input"
                                    minLength="6"
                                    required
                                />

                                <div className="password-form-buttons">
                                    <button 
                                        type="submit" 
                                        className="password-save-btn"
                                        disabled={isChangingPassword}
                                    >
                                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                    <button 
                                        type="button"
                                        className="password-cancel-btn"
                                        onClick={() => {
                                            setShowPasswordChange(false);
                                            setPasswordError('');
                                            setPasswordSuccess('');
                                            setPasswordData({
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: ''
                                            });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="profile-stats-grid">
                        <div className="p-stat-item">
                            <span className="p-stat-value">{totalSecrets}</span>
                            <span className="p-stat-label">SECRETS</span>
                        </div>
                        <div className="p-stat-divider"></div>
                        <div className="p-stat-item">
                            <span className="p-stat-value">{totalHearts}</span>
                            <span className="p-stat-label">HEARTS</span>
                        </div>
                    </div>
                </div>

                {/* Right: Tabs & Content */}
                <div className="profile-content-area">
                    <div className="profile-tabs">
                        {['My Posts', 'Saved', 'Liked'].map(tab => (
                            <button
                                key={tab}
                                className={`profile-tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="profile-tab-content">
                        {getTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
