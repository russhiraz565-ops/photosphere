import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Post({ post }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    checkIfLiked();
  }, []);

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', post.id)
      .single();
    
    setLiked(!!data);
  };

  const handleLike = async () => {
    if (liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);
      
      if (!error) {
        setLiked(false);
        setLikesCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: post.id });
      
      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        post_id: post.id,
        content: newComment
      })
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .single();

    if (!error) {
      setComments(prev => [...prev, data]);
      setNewComment('');
    }
  };

  return (
    <div className="post">
      <div className="post-header">
        <Link to={`/profile/${post.profiles.username}`}>
          <img 
            src={post.profiles.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles.full_name}`} 
            alt={post.profiles.username} 
          />
        </Link>
        <div>
          <Link to={`/profile/${post.profiles.username}`} style={{ textDecoration: 'none', fontWeight: '600' }}>
            {post.profiles.full_name}
          </Link>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>@{post.profiles.username}</div>
        </div>
      </div>
      
      <img src={post.image_url} alt={post.caption} className="post-image" />
      
      <div className="post-actions">
        <button onClick={handleLike} style={{ color: liked ? 'red' : '#262626' }}>
          {liked ? '❤️' : '🤍'} {likesCount}
        </button>
        <button onClick={() => setShowComments(!showComments)}>
          💬 {comments.length}
        </button>
      </div>
      
      {post.caption && (
        <div className="post-caption">
          <strong>{post.profiles.full_name}</strong> {post.caption}
        </div>
      )}
      
      {showComments && (
        <div className="comments-section">
          {comments.map(comment => (
            <div key={comment.id} className="comment">
              <Link to={`/profile/${comment.profiles.username}`}>
                <strong>@{comment.profiles.username}</strong>
              </Link>
              <span>{comment.content}</span>
            </div>
          ))}
          
          <form onSubmit={handleComment} style={{ display: 'flex', marginTop: '12px' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ flex: 1, padding: '8px', border: 'none', outline: 'none' }}
            />
            <button type="submit" style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: '600' }}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
                 }
