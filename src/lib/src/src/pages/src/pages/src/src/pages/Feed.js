import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Post from '../components/Post';
import CreatePost from '../components/CreatePost';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
    
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const postsWithLikes = await Promise.all(
        (data || []).map(async (post) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', post.id);
          
          return {
            ...post,
            likes_count: likesCount || 0,
            comments: comments || []
          };
        })
      );
      
      setPosts(postsWithLikes);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  if (loading) return <div className="loading-screen">Loading feed...</div>;

  return (
    <div className="feed">
      <CreatePost onPostCreated={handlePostCreated} />
      {posts.map(post => (
        <Post key={post.id} post={post} />
      ))}
      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>
          No posts yet. Be the first to share a photo!
        </div>
      )}
    </div>
  );
          }
