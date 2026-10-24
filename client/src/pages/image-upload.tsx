import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage('');

    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        // Extract slip number and weight type from filename
        // Expected format: slip_XX_first.jpg or slip_XX_second.jpg
        const filename = file.name;
        const match = filename.match(/slip_(\d+)_(first|second)/);
        
        if (!match) {
          setMessage(`Invalid filename format: ${filename}. Use format: slip_XX_first.jpg or slip_XX_second.jpg`);
          continue;
        }

        const slipNo = match[1];
        const weightType = match[2];
        const folder = weightType === 'first' ? 'first_weight' : 'second_weight';
        const targetFilename = `slip_${slipNo}.jpg`;

        const response = await fetch(`/api/upload-image/${folder}/${targetFilename}`, {
          method: 'POST',
          body: file // Send file directly
        });

        if (response.ok) {
          setMessage(prev => prev + `✓ Uploaded: ${filename}\n`);
        } else {
          setMessage(prev => prev + `✗ Failed: ${filename}\n`);
        }
      }
    } catch (error) {
      setMessage('Upload failed: ' + error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded border">
      <h2 className="text-xl font-bold mb-4 text-black">Upload Weight Images</h2>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Rename your images to: slip_XX_first.jpg or slip_XX_second.jpg</li>
          <li>• Replace XX with the slip number (e.g., slip_13_first.jpg)</li>
          <li>• Select multiple files to upload all at once</li>
        </ul>
      </div>

      <div className="mb-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <Button 
        disabled={uploading}
        className="mb-4"
      >
        {uploading ? 'Uploading...' : 'Select Images to Upload'}
      </Button>

      {message && (
        <div className="mt-4 p-3 bg-gray-50 border rounded">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">{message}</pre>
        </div>
      )}
    </div>
  );
}