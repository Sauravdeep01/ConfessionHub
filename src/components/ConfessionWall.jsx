import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './ConfessionWall.css';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/confessions`;

function ConfessionWall({ confessions, refreshData, currentAnonName, onPostClick }) {
    const { user, isLoaded } = useAuth();
    const [text, setText] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [localConfessions, setLocalConfessions] = useState(confessions);
    const [selectedFilter, setSelectedFilter] = useState('All');

    useEffect(() => {
        setLocalConfessions(confessions);
    }, [confessions]);

    if (!isLoaded || !user) {
        return <div className="loading-state">Loading your profile...</div>;
    }
    const [loading, setLoading] = useState(false); // Loading is now managed by App.jsx or assumed done
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [expandedComments, setExpandedComments] = useState({});
    const [editingComment, setEditingComment] = useState({ id: null, text: '', confessionId: null });
    const [hoveredConfession, setHoveredConfession] = useState(null);
    const [commentTexts, setCommentTexts] = useState({});
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Modal state
    const [modal, setModal] = useState({ open: false, type: '', id: '', code: '', newText: '', error: '' });

    // Fetch confessions via refreshData prop
    const fetchConfessions = refreshData;

    // Calculate stats
    const totalReactions = confessions.reduce(
        (sum, c) => sum + (c.reactions?.length || 0),
        0
    );

    // Post a new confession
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!text.trim()) {
            setError('Please write your confession.');
            return;
        }
        if (secretCode.length < 4) {
            setError('Secret code must be at least 4 characters.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text.trim(),
                    secretCode,
                    userId: user.id,
                    anonymousName: currentAnonName || 'Anonymous',
                    category: selectedFilter === 'All' ? 'General' : selectedFilter
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                return;
            }

            setSuccess('Confession posted anonymously! 🤫');
            setText('');
            setSecretCode('');
            setShowForm(false);
            fetchConfessions();

            // Clear success after 3s
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to post confession.');
        } finally {
            setSubmitting(false);
        }
    };

    // React to a confession
    const handleReact = async (id, type) => {
        try {
            // If type is null, it's an "Unlike" action (backend logic needs to handle this or we send a specific signal)
            const res = await fetch(`${API_URL}/${id}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type || 'unlike', userId: user.id })
            });

            if (res.ok) {
                fetchConfessions();
                setHoveredConfession(null); // Close menu
            }
        } catch (err) {
            console.error('Failed to react:', err);
        }
    };

    // Toggle Save
    const handleSave = async (id) => {
        try {
            const res = await fetch(`${API_URL}/${id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (res.ok) {
                fetchConfessions();
            }
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };

    // Add Comment
    const handleAddComment = async (id, text) => {
        try {
            const res = await fetch(`${API_URL}/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    userName: currentAnonName || 'Anonymous',
                    userImage: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Generic avatar
                    text
                })
            });

            if (res.ok) {
                fetchConfessions();
            }
        } catch (err) {
            console.error('Failed to comment:', err);
        }
    };

    // Delete Comment
    const handleDeleteComment = async (id, commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            const res = await fetch(`${API_URL}/${id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (res.ok) {
                fetchConfessions();
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    // Edit Comment
    const handleEditComment = async (id, commentId, newText) => {
        if (!newText.trim()) return;
        try {
            const res = await fetch(`${API_URL}/${id}/comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, text: newText.trim() })
            });

            if (res.ok) {
                setEditingComment({ id: null, text: '', confessionId: null });
                fetchConfessions();
            }
        } catch (err) {
            console.error('Failed to edit comment:', err);
        }
    };

    // Open modal for edit or delete
    const openModal = (type, id, currentText = '') => {
        setModal({ open: true, type, id, code: '', newText: currentText, error: '' });
    };

    const closeModal = () => {
        setModal({ open: false, type: '', id: '', code: '', newText: '', error: '' });
    };

    // Handle edit
    const handleEdit = async () => {
        if (modal.code.length < 4) {
            setModal(m => ({ ...m, error: 'Secret code must be at least 4 characters.' }));
            return;
        }
        if (!modal.newText.trim()) {
            setModal(m => ({ ...m, error: 'Confession text cannot be empty.' }));
            return;
        }

        try {
            const res = await fetch(`${API_URL}/${modal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretCode: modal.code, text: modal.newText.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                setModal(m => ({ ...m, error: data.error || 'Failed to edit.' }));
                return;
            }

            closeModal();
            fetchConfessions();
        } catch (err) {
            setModal(m => ({ ...m, error: 'Something went wrong.' }));
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (modal.code.length < 4) {
            setModal(m => ({ ...m, error: 'Secret code must be at least 4 characters.' }));
            return;
        }

        try {
            const res = await fetch(`${API_URL}/${modal.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretCode: modal.code })
            });

            const data = await res.json();

            if (!res.ok) {
                setModal(m => ({ ...m, error: data.error || 'Failed to delete.' }));
                return;
            }

            closeModal();
            // Optimistic update: remove from local state immediately
            setLocalConfessions(prev => prev.filter(c => c._id !== modal.id));
            // Then sync with server
            fetchConfessions();
        } catch (err) {
            setModal(m => ({ ...m, error: 'Something went wrong.' }));
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const categories = ['All', 'Funny', 'Sad', 'Happy', 'Angry', 'Secret', 'Crush'];

    // Filter confessions by selected filter
    const filteredConfessions = selectedFilter === 'All' 
        ? localConfessions 
        : localConfessions.filter(c => c.category === selectedFilter);

    return (
        <div className="confession-wall">

            {/* Success Banner */}
            {success && (
                <div className="success-banner">
                    <span>{success}</span>
                </div>
            )}

            {/* Write Button + Form */}
            <div className="write-section">
                {!showForm ? (
                    <button
                        className="write-btn"
                        id="write-confession-btn"
                        onClick={() => setShowForm(true)}
                    >
                        <span className="write-btn-icon">✏️</span>
                        <span>Write a Secret</span>
                    </button>
                ) : (
                    <div className="confession-form-card">
                        <div className="form-header">
                            <div>
                                <h3 className="form-title">📝 New Confession</h3>
                                <div className="posting-as-badge">
                                    Posting as: <strong>{currentAnonName || 'Anonymous'}</strong>
                                </div>
                            </div>
                            <button
                                className="form-close"
                                onClick={() => { setShowForm(false); setError(''); }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="confession-form">
                            <div className="field-group">
                                <textarea
                                    id="confession-text"
                                    className="confession-textarea"
                                    placeholder="What's on your mind? Share it anonymously..."
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    maxLength={1000}
                                    rows={4}
                                />
                                <div className="char-count">{text.length}/1000</div>
                            </div>

                            <div className="field-group">
                                <label htmlFor="secret-code" className="field-label">
                                    <span className="field-label-icon">🔑</span>
                                    Secret Code
                                </label>
                                <input
                                    id="secret-code"
                                    type="password"
                                    className="field-input"
                                    placeholder="Min 4 chars"
                                    value={secretCode}
                                    onChange={(e) => setSecretCode(e.target.value)}
                                    minLength={4}
                                    autoComplete="new-password"
                                />
                            </div>

                            {error && <div className="msg msg-error">⚠️ {error}</div>}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => { setShowForm(false); setError(''); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <span className="btn-loading">
                                            <span className="btn-spinner"></span>
                                            Posting...
                                        </span>
                                    ) : '🚀 Post Anonymously'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Section Header */}
            <div className="section-header">
                <h2 className="section-title">Confession Feed</h2>
                <div className="section-header-right">
                    <span className="section-count">{filteredConfessions.length} posts</span>
                    
                    {/* Filter Button */}
                    <div className="feed-filter-wrapper">
                        <button
                            className={`feed-filter-btn ${selectedFilter !== 'All' ? 'active' : ''}`}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <span className="feed-filter-label">Filter</span>
                            <span className="feed-filter-icon">🔽</span>
                        </button>

                        {showFilterDropdown && (
                            <div className="feed-filter-dropdown">
                                <div className="feed-filter-list">
                                    {['All', 'Funny', 'Sad', 'Happy', 'Angry', 'Secret', 'Crush'].map(filter => (
                                        <div
                                            key={filter}
                                            className={`feed-filter-item ${selectedFilter === filter ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedFilter(filter);
                                                setShowFilterDropdown(false);
                                            }}
                                        >
                                            <span className="feed-filter-text">{filter}</span>
                                            {selectedFilter === filter && <span className="feed-filter-check">✓</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confession List */}
            {loading ? (
                <div className="loading-state">
                    <div className="loader">
                        <div className="loader-dot"></div>
                        <div className="loader-dot"></div>
                        <div className="loader-dot"></div>
                    </div>
                    <p>Loading confessions...</p>
                </div>
            ) : filteredConfessions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-illustration">🤐</div>
                    <h3>No confessions yet</h3>
                    <p>Be the first to break the silence!</p>
                </div>
            ) : (
                <div className="confessions-list">
                    {filteredConfessions.map((confession, index) => (
                        <div
                            key={confession._id}
                            className="confession-card"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => onPostClick && onPostClick(confession._id)}
                        >
                            <div className="card-top">
                                <div className="card-avatar">
                                    <span>👤</span>
                                </div>
                                <div className="card-meta">
                                    <div className="card-header-info">
                                        <span className="card-author">{confession.anonymousName || 'Anonymous'}</span>
                                        {confession.category && (
                                            <span className={`category-tag tag-${confession.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                                {confession.category}
                                            </span>
                                        )}
                                    </div>
                                    <span className="card-time">{formatDate(confession.createdAt)}</span>
                                </div>
                                <div className="card-actions-menu">
                                    <button
                                        className="action-dot-btn edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openModal('edit', confession._id, confession.text);
                                        }}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="action-dot-btn delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openModal('delete', confession._id);
                                        }}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <p className="card-text">{confession.text}</p>

                            <div className="card-interactions">
                                {/* Interaction Summary (Counts Above Buttons) */}
                                {confession.reactions?.length > 0 && (
                                    <div className="interaction-summary">
                                        <div className="reaction-group">
                                            {[...new Set(confession.reactions.map(r => r.type))].slice(0, 4).map(type => (
                                                <span key={type} className="sum-emoji">
                                                    {type === 'like' ? '👍' : type === 'heart' ? '❤️' : type === 'laugh' ? '😂' : type === 'cry' ? '😢' : type === 'angry' ? '😠' : type === 'dislike' ? '👎' : '👍'}
                                                </span>
                                            ))}
                                            <span className="count-text">
                                                {confession.reactions.length}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="card-bottom">
                                    <div className="reactions-wrapper" onMouseLeave={() => setHoveredConfession(null)}>
                                        <div className="reaction-actions">
                                            <div className="trigger-container">
                                                <button
                                                    className={`reaction-trigger ${confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike') ? 'active-' + confession.reactions.find(r => r.userId === user.id).type : ''}`}
                                                    onMouseEnter={() => setHoveredConfession(confession._id)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const current = confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike');
                                                        handleReact(confession._id, current ? 'unlike' : 'like');
                                                    }}
                                                >
                                                    <span className="reaction-emoji">
                                                        {confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'heart' ? '❤️' :
                                                            confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'laugh' ? '😂' :
                                                                confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'cry' ? '😢' :
                                                                    confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'angry' ? '😠' : '👍'}
                                                    </span>
                                                    <span className="trigger-label">
                                                        {confession.reactions?.find(r => r.userId === user.id && r.type !== 'dislike') ?
                                                            confession.reactions.find(r => r.userId === user.id).type.charAt(0).toUpperCase() + confession.reactions.find(r => r.userId === user.id).type.slice(1) :
                                                            'Like'}
                                                    </span>
                                                </button>

                                                {hoveredConfession === confession._id && (
                                                    <div className="reaction-menu">
                                                        <button className="reaction-option" data-label="Like" onClick={(e) => { e.stopPropagation(); handleReact(confession._id, 'like'); }}>👍</button>
                                                        <button className="reaction-option" data-label="Love" onClick={(e) => { e.stopPropagation(); handleReact(confession._id, 'heart'); }}>❤️</button>
                                                        <button className="reaction-option" data-label="Haha" onClick={(e) => { e.stopPropagation(); handleReact(confession._id, 'laugh'); }}>😂</button>
                                                        <button className="reaction-option" data-label="Sad" onClick={(e) => { e.stopPropagation(); handleReact(confession._id, 'cry'); }}>😢</button>
                                                        <button className="reaction-option" data-label="Angry" onClick={(e) => { e.stopPropagation(); handleReact(confession._id, 'angry'); }}>😠</button>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className={`dislike-btn ${confession.reactions?.find(r => r.userId === user.id && r.type === 'dislike') ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReact(confession._id, 'dislike');
                                                }}
                                            >
                                                <span className="reaction-emoji">👎</span>
                                                <span>Dislike</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card-utility-btns">
                                        <button
                                            className={`utility-btn save-btn ${Array.isArray(confession.savedBy) && confession.savedBy.includes(user.id) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave(confession._id);
                                            }}
                                            title="Save Post"
                                        >
                                            {Array.isArray(confession.savedBy) && confession.savedBy.includes(user.id) ? '🔖 Saved' : '🔖 Save'}
                                        </button>
                                        <button
                                            className="utility-btn comment-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedComments(prev => ({ ...prev, [confession._id]: !prev[confession._id] }));
                                            }}
                                        >
                                            💬 {(Array.isArray(confession.comments) && confession.comments.length) || 0} Comments
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Comment Section */}
                            {expandedComments[confession._id] && (
                                <div className="comment-section" onClick={(e) => e.stopPropagation()}>
                                    {/* Comment Form at Top */}
                                    <form
                                        className="comment-form"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const text = commentTexts[confession._id] || '';
                                            if (text.trim()) {
                                                handleAddComment(confession._id, text);
                                                setCommentTexts(prev => ({ ...prev, [confession._id]: '' }));
                                            }
                                        }}
                                    >
                                        <div className="comment-input-wrapper">
                                            <div className="comment-input-container">
                                                <textarea
                                                    name="commentText"
                                                    placeholder="Write a comment..."
                                                    className="comment-input"
                                                    rows={2}
                                                    maxLength={500}
                                                    value={commentTexts[confession._id] || ''}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setCommentTexts(prev => ({ ...prev, [confession._id]: e.target.value }));
                                                    }}
                                                />
                                                <button type="submit" className="comment-submit-btn">Post</button>
                                            </div>
                                        </div>
                                    </form>

                                    <div className="comments-list">
                                        {Array.isArray(confession.comments) && confession.comments.map(comment => (
                                            <div key={comment._id} className="comment-item">
                                                <img src={comment.userImage} alt="" className="comment-avatar" />
                                                <div className="comment-content">
                                                    <div className="comment-header">
                                                        <span className="comment-author">{comment.userName}</span>
                                                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                                                    </div>
                                                    <p className="comment-text">
                                                        {editingComment.id === comment._id ? (
                                                            <div className="comment-edit-form">
                                                                <input
                                                                    type="text"
                                                                    className="comment-edit-input"
                                                                    value={editingComment.text}
                                                                    onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <button
                                                                    className="comment-edit-save"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Handle save edit
                                                                    }}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    className="comment-edit-cancel"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingComment({ id: null, text: '', confessionId: null });
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            comment.text
                                                        )}
                                                    </p>
                                                    {comment.userId === user.id && editingComment.id !== comment._id && (
                                                        <div className="comment-actions">
                                                            <button onClick={() => setEditingComment({ id: comment._id, text: comment.text, confessionId: confession._id })}>Edit</button>
                                                            <button onClick={() => handleDeleteComment(confession._id, comment._id)}>Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Overlay */}
            {modal.open && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}>✕</button>

                        <div className="modal-icon">
                            {modal.type === 'edit' ? '✏️' : '🗑️'}
                        </div>
                        <h3 className="modal-heading">
                            {modal.type === 'edit' ? 'Edit Confession' : 'Delete Confession'}
                        </h3>

                        {modal.type === 'edit' && (
                            <textarea
                                className="modal-textarea"
                                value={modal.newText}
                                onChange={(e) => setModal(m => ({ ...m, newText: e.target.value }))}
                                rows={4}
                                maxLength={1000}
                            />
                        )}

                        {modal.type === 'delete' && (
                            <p className="modal-desc">
                                This will permanently remove the confession. This action cannot be undone.
                            </p>
                        )}

                        <div className="modal-field">
                            <label className="field-label" htmlFor="modal-secret-code">
                                <span className="field-label-icon">🔑</span>
                                Secret Code
                            </label>
                            <input
                                id="modal-secret-code"
                                type="password"
                                className="field-input"
                                placeholder="Enter your secret code to verify"
                                value={modal.code}
                                onChange={(e) => setModal(m => ({ ...m, code: e.target.value, error: '' }))}
                                autoComplete="new-password"
                            />
                        </div>

                        {modal.error && <div className="msg msg-error">⚠️ {modal.error}</div>}

                        <div className="modal-btns">
                            <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                            <button
                                className={`btn-confirm ${modal.type === 'delete' ? 'btn-red' : 'btn-purple'}`}
                                onClick={modal.type === 'edit' ? handleEdit : handleDelete}
                            >
                                {modal.type === 'edit' ? 'Save Changes' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConfessionWall;
