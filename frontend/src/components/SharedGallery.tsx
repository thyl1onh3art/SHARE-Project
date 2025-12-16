import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface GalleryImage {
  _id?: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  eventId?: string;
  eventTitle?: string;
  sharedAccountId?: string;
  sharedAccountName?: string;
  caption: string;
  tags: string[];
  isPublic: boolean;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

interface SharedAccount {
  _id: string;
  name: string;
}

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  eventTime: string;
}

const SharedGallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterSharedAccount, setFilterSharedAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    caption: '',
    tags: '',
    eventId: '',
    sharedAccountId: '',
    isPublic: false
  });

  useEffect(() => {
    fetchImages();
    fetchEvents();
    fetchSharedAccounts();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/gallery/images');
      setImages(response.data);
    } catch (err: any) {
      console.error('Error fetching images:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view gallery');
      } else {
        setError(`Failed to load gallery: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchSharedAccounts = async () => {
    try {
      const response = await axios.get('/shared-accounts');
      setSharedAccounts(response.data);
    } catch (err: any) {
      console.error('Error fetching shared accounts:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setUploadData({ ...uploadData, file });
      setError('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', uploadData.file);
    formData.append('caption', uploadData.caption);
    formData.append('tags', uploadData.tags);
    formData.append('eventId', uploadData.eventId);
    if (uploadData.sharedAccountId) {
      formData.append('sharedAccountId', uploadData.sharedAccountId);
    }
    formData.append('isPublic', uploadData.isPublic.toString());

    try {
      await axios.post('/gallery/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadData({
        file: null,
        caption: '',
        tags: '',
        eventId: '',
        sharedAccountId: '',
        isPublic: false
      });
      setShowUploadModal(false);
      fetchImages();
    } catch (err: any) {
      setError(`Failed to upload image: ${err.response?.data?.message || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await axios.delete(`/gallery/images/${id}`);
      fetchImages();
    } catch (err: any) {
      setError(`Failed to delete image: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredImages = images.filter(image => {
    const matchesEvent = filterEvent === 'all' || image.eventId === filterEvent;
    const matchesSharedAccount = filterSharedAccount === 'all' || image.sharedAccountId === filterSharedAccount;
    const matchesSearch = searchTerm === '' || 
      image.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      image.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.sharedAccountName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesEvent && matchesSharedAccount && matchesSearch;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading gallery...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Shared Gallery</h1>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
          >
            Upload Image
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div>
              <strong>Error:</strong> {error}
              {error.includes('log in') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <a href="/login" style={{ color: '#3182ce', textDecoration: 'underline' }}>
                    Click here to log in
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">Filter by Event</label>
            <select
              className="form-input"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event._id} value={event._id}>
                  {event.title} - {new Date(`${event.eventDate}T${event.eventTime}`).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Shared Account</label>
            <select
              className="form-input"
              value={filterSharedAccount}
              onChange={(e) => setFilterSharedAccount(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {sharedAccounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by caption, tags, event, or account..."
            />
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>
          Gallery ({filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'})
        </h2>
        
        {filteredImages.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No images found. Upload your first image to get started!
          </p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1rem' 
          }}>
            {filteredImages.map((image) => (
              <div key={image._id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`/gallery/images/${image._id}/view`}
                    alt={image.caption || image.originalName}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedImage(image)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    display: 'flex',
                    gap: '0.25rem'
                  }}>
                    {image.isPublic && (
                      <span style={{
                        background: '#4caf50',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        Public
                      </span>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image._id || '');
                      }}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div style={{ padding: '1rem' }}>
                  {image.caption && (
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                      {image.caption}
                    </p>
                  )}
                  
                  {image.eventTitle && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                      Event: {image.eventTitle}
                    </p>
                  )}
                  
                  {image.sharedAccountName && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#667eea', fontWeight: '500' }}>
                      Shared Account: {image.sharedAccountName}
                    </p>
                  )}
                  
                  {image.tags.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      {image.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            background: '#e3f2fd',
                            color: '#1976d2',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            marginRight: '0.25rem',
                            marginBottom: '0.25rem',
                            display: 'inline-block'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p style={{ margin: '0', fontSize: '0.8rem', color: '#999' }}>
                    {formatFileSize(image.size)} • {formatDate(image.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Upload Image</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Select Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="form-input"
                  required
                />
                {uploadData.file && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    Selected: {uploadData.file.name} ({formatFileSize(uploadData.file.size)})
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Caption</label>
                <textarea
                  className="form-input"
                  value={uploadData.caption}
                  onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                  placeholder="Describe this image..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="fun, party, friends, vacation..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Associated Event</label>
                <select
                  className="form-input"
                  value={uploadData.eventId}
                  onChange={(e) => setUploadData({ ...uploadData, eventId: e.target.value })}
                >
                  <option value="">No event</option>
                  {events.map(event => (
                    <option key={event._id} value={event._id}>
                      {event.title} - {new Date(`${event.eventDate}T${event.eventTime}`).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Shared Account (Optional)</label>
                <select
                  className="form-input"
                  value={uploadData.sharedAccountId}
                  onChange={(e) => setUploadData({ ...uploadData, sharedAccountId: e.target.value })}
                >
                  <option value="">No shared account</option>
                  {sharedAccounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Link this image to a shared account so all participants can see it
                </p>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={uploadData.isPublic}
                    onChange={(e) => setUploadData({ ...uploadData, isPublic: e.target.checked })}
                  />
                  Make this image public
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!uploadData.file || uploading}
                >
                  {uploading ? <span className="spinner"></span> : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '1.5rem',
                cursor: 'pointer',
                zIndex: 1002
              }}
            >
              ×
            </button>
            <img
              src={`/gallery/images/${selectedImage._id}/view`}
              alt={selectedImage.caption || selectedImage.originalName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-60px',
              left: 0,
              right: 0,
              background: 'white',
              padding: '1rem',
              borderRadius: '8px'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                {selectedImage.caption || 'No caption'}
              </p>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                {selectedImage.eventTitle && `${selectedImage.eventTitle} • `}
                {formatFileSize(selectedImage.size)} • {formatDate(selectedImage.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedGallery;
