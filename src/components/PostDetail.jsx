import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './ConfessionWall.css';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/confessions`;

function PostDetail({ confessionId, onBack, currentAnonName }) {
    const { user, isLoaded } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [expandedComments, setExpandedComments] = useState({});
    const [editingComment, setEditingComment] = useState({ id: null, text: '', confessionId: null });
    const [hoveredConfession, setHoveredConfession] = useState(null);

    useEffect(() => {
        fetchPost();
    }, [confessionId]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`${API_URL}/${confessionId}`);
            if (!res.ok) {
                throw new Error('Post not found');
            }
            const data = await res.json();
            setPost(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setSubmittingComment(true);
        try {
            const res = await fetch(`${API_URL}/${confessionId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText.trim(),
                    userId: user.id,
                    anonymousName: currentAnonName || 'Anonymous'
                })
            });

            if (!res.ok) throw new Error('Failed to post comment');

            setCommentText('');
            fetchPost(); // Refresh post to show new comment
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleReact = async (id, type) => {
        try {
            // If type is null, it's an "Unlike" action (backend logic needs to handle this or we send a specific signal)
            const res = await fetch(`${API_URL}/${id}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type || 'unlike', userId: user.id })
            });

            if (res.ok) {
                fetchPost(); // Refresh post to show new reaction
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
                fetchPost(); // Refresh post to show new save status
            }
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    if (!isLoaded || !user) {
        return <div className="loading-state">Loading your profile...</div>;
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="loader">
                    <div className="loader-dot"></div>
                    <div className="loader-dot"></div>
                    <div className="loader-dot"></div>
                </div>
                <p>Loading post...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <div className="error-illustration">😞</div>
                <h3>Post not found</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={onBack}>Go Back</button>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="error-state">
                <div className="error-illustration">😞</div>
                <h3>Post not found</h3>
                <p>This post doesn't exist or has been removed.</p>
                <button className="btn-primary" onClick={onBack}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="confession-wall">
            {/* Back Button */}
            <button className="back-button" onClick={onBack}>
                <span className="back-icon">←</span>
                <span>Back to Feed</span>
            </button>

            {/* Exact same structure as ConfessionWall */}
            <div className="confession-card">
                <div className="card-top">
                    <div className="card-avatar">
                        <span>👤</span>
                    </div>
                    <div className="card-meta">
                        <div className="card-header-info">
                            <span className="card-author">{post.anonymousName || 'Anonymous'}</span>
                            {post.category && (
                                <span className={`category-tag tag-${post.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {post.category}
                                </span>
                            )}
                        </div>
                        <span className="card-time">{formatDate(post.createdAt)}</span>
                    </div>
                </div>

                <p className="card-text">{post.text}</p>

                <div className="card-interactions">
                    {/* Interaction Summary - Exact same as ConfessionWall */}
                    {post.reactions?.length > 0 && (
                        <div className="interaction-summary">
                            <div className="reaction-group">
                                {[...new Set(post.reactions.map(r => r.type))].slice(0, 4).map(type => (
                                    <span key={type} className="sum-emoji">
                                        {type === 'like' ? '👍' : type === 'heart' ? '❤️' : type === 'laugh' ? '😂' : type === 'cry' ? '😢' : type === 'angry' ? '😠' : type === 'dislike' ? '👎' : '👍'}
                                    </span>
                                ))}
                                <span className="count-text">
                                    {post.reactions.length}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="card-bottom">
                                    <div className="reactions-wrapper" onMouseLeave={() => setHoveredConfession(null)}>
                                        <div className="reaction-actions">
                                            <div className="trigger-container">
                                                <button
                                                    className={`reaction-trigger ${post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike') ? 'active-' + post.reactions.find(r => r.userId === user.id).type : ''}`}
                                                    onMouseEnter={() => setHoveredConfession(post._id)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const current = post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike');
                                                        handleReact(post._id, current ? 'unlike' : 'like');
                                                    }}
                                                >
                                                    <span className="reaction-emoji">
                                                        {post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'heart' ? '❤️' :
                                                            post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'laugh' ? '😂' :
                                                                post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'cry' ? '😢' :
                                                                    post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike')?.type === 'angry' ? '😠' : '👍'}
                                                    </span>
                                                    <span className="trigger-label">
                                                        {post.reactions?.find(r => r.userId === user.id && r.type !== 'dislike') ?
                                                            post.reactions.find(r => r.userId === user.id).type.charAt(0).toUpperCase() + post.reactions.find(r => r.userId === user.id).type.slice(1) :
                                                            'Like'}
                                                    </span>
                                                </button>

                                                {hoveredConfession === post._id && (
                                                    <div className="reaction-menu">
                                                        <button className="reaction-option" data-label="Like" onClick={() => handleReact(post._id, 'like')}>👍</button>
                                                        <button className="reaction-option" data-label="Love" onClick={() => handleReact(post._id, 'heart')}>❤️</button>
                                                        <button className="reaction-option" data-label="Haha" onClick={() => handleReact(post._id, 'laugh')}>😂</button>
                                                        <button className="reaction-option" data-label="Sad" onClick={() => handleReact(post._id, 'cry')}>😢</button>
                                                        <button className="reaction-option" data-label="Angry" onClick={() => handleReact(post._id, 'angry')}>😠</button>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className={`dislike-btn ${post.reactions?.find(r => r.userId === user.id && r.type === 'dislike') ? 'active' : ''}`}
                                                onClick={() => handleReact(post._id, 'dislike')}
                                            >
                                                <span className="reaction-emoji">👎</span>
                                                <span>Dislike</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card-utility-btns">
                                        <button
                                            className={`utility-btn save-btn ${Array.isArray(post.savedBy) && post.savedBy.includes(user.id) ? 'active' : ''}`}
                                            onClick={() => handleSave(post._id)}
                                            title="Save Post"
                                        >
                                            {Array.isArray(post.savedBy) && post.savedBy.includes(user.id) ? '🔖 Saved' : '🔖 Save'}
                                        </button>
                                        <button
                                            className="utility-btn comment-btn"
                                            onClick={() => {
                                                const commentsSection = document.querySelector('.comments-section');
                                                if (commentsSection) {
                                                    commentsSection.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }}
                                        >
                                            💬 {(Array.isArray(post.comments) && post.comments.length) || 0} Comments
                                        </button>
                                    </div>
                                </div>
                </div>
            </div>

            {/* Simple Comment Section Below */}
            <div className="comments-section">
                <h4 className="comments-title">
                    Comments ({post.comments && Array.isArray(post.comments) ? post.comments.length : 0})
                </h4>

                {/* Comment Form */}
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                    <div className="comment-input-wrapper">
                        <div className="comment-input-container">
                            <textarea
                                className="comment-input"
                                placeholder="Share your thoughts..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={3}
                                maxLength={500}
                            />
                            <button
                                type="submit"
                                className="comment-submit-btn"
                                disabled={submittingComment || !commentText.trim()}
                            >
                                {submittingComment ? '⏳' : 'Post'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Comments List */}
                <div className="comments-list">
                    {post.comments && Array.isArray(post.comments) && post.comments.length > 0 ? (
                        post.comments.map((comment) => (
                            <div key={comment._id} className="comment-item">
                                <div className="comment-avatar">
                                    <span>👤</span>
                                </div>
                                <div className="comment-content">
                                    <div className="comment-header">
                                        <span className="comment-author">
                                            {comment.anonymousName || 'Anonymous'}
                                        </span>
                                        <span className="comment-time">
                                            {formatDate(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="comment-text">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-comments">
                            <div className="no-comments-icon">💬</div>
                            <p>No comments yet. Be the first to share your thoughts!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PostDetail;
