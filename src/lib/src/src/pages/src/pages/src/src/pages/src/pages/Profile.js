import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (!postsError) setPosts(postsData || []);

      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id);

      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      setFollowingCount(following || 0);

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  if (loading) return <div className="loading-screen">Loading profile...</div>;
  if (!profile) return <div className="loading-screen">Profile not found</div>;

  const isOwnProfile = user?.id === profile.id;

  return (
    <div style={{ maxWidth: '935px', margin: '80px auto 20px', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' }}>
        <img
          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=0095f6&color=fff`}
          alt={profile.username}
          style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '300' }}>{profile.username}</h2>
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                style={{
                  background: isFollowing ? '#efefef' : '#0095f6',
                  color: isFollowing ? '#262626' : 'white',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
            <div><strong>{posts.length}</strong> posts</div>
            <div><strong>{followersCount}</strong> followers</div>
            <div><strong>{followingCount}</strong> following</div>
          </div>
          <div>
            <h3 style={{ fontWeight: '600' }}>{profile.full_name}</h3>
            <p>{profile.bio}</p>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #dbdbdb', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '20px' }}>
        {posts.map(post => (
          <div key={post.id} style={{ aspectRatio: '1/1', background: '#efefef' }}>
            <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    </div>
  );
                        }
