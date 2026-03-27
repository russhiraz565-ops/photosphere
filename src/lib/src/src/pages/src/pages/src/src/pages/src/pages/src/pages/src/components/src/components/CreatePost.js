import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function CreatePost({ onPostCreated }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = (acceptedFiles) => {
    setImage(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;

    setUploading(true);
    try {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: caption
        })
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (postError) throw postError;

      setCaption('');
      setImage(null);
      onPostCreated(post);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post">
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        {image ? (
          <img src={URL.createObjectURL(image)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <p>📸 Drag & drop a photo, or click to select</p>
        )}
      </div>
      
      <textarea
        placeholder="Write a caption..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows="3"
      />
      
      <button type="submit" disabled={!image || uploading} className="auth-button">
        {uploading ? 'Uploading...' : 'Share'}
      </button>
    </form>
  );
    }
