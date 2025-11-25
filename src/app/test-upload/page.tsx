'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
      console.log('File selected:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      console.log('Starting upload...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'test');

      console.log('Sending request to /api/upload');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      let data;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError(`Server returned non-JSON response: ${text.substring(0, 200)}`);
        setLoading(false);
        return;
      }

      console.log('Response data:', data);

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || data.details || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Upload Test Page</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image File
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            {file && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">File Info:</h3>
                <ul className="text-sm space-y-1">
                  <li><strong>Name:</strong> {file.name}</li>
                  <li><strong>Size:</strong> {Math.round(file.size / 1024)} KB</li>
                  <li><strong>Type:</strong> {file.type}</li>
                </ul>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="font-medium text-red-800 mb-2">Error:</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-medium text-green-800 mb-2">Success!</h3>
                <div className="text-sm space-y-2">
                  <p><strong>URL:</strong></p>
                  <a 
                    href={result.data.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {result.data.url}
                  </a>
                  {result.data.url && (
                    <div className="mt-4">
                      <img 
                        src={result.data.url} 
                        alt="Uploaded" 
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Make sure you're logged in as admin</li>
                <li>Select an image file</li>
                <li>Click Upload</li>
                <li>Check browser console (F12) for detailed logs</li>
                <li>Share any errors you see</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium mb-2">Debug Info:</h3>
              <ul className="text-xs space-y-1">
                <li><strong>User Agent:</strong> {navigator.userAgent}</li>
                <li><strong>Token exists:</strong> {localStorage.getItem('token') ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
