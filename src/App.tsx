import React, { ChangeEvent, DragEvent, useState } from "react";
import "./App.css";
import axios from "axios";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleTranscribe = () => {
    if (selectedFile) {
      // Create a new FormData instance
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Make a POST request to your Python script endpoint
      axios
        .post("/api/transcribe", formData)
        .then((response) => {
          // Handle the response from the Python script
          console.log(response.data);
        })
        .catch((error) => {
          // Handle any errors that occur during the request
          console.error(error);
        });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div
        className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <h1 className="text-3xl font-bold mb-4">File Upload</h1>
        <p className="text-gray-500 mb-6">
          Click the button or drag and drop a file to upload
        </p>
        <input
          type="file"
          accept=".wav, .mp3, .mp4, .m4a"
          className="py-2 px-4 bg-gray-200 text-gray-700 rounded"
          onChange={handleFileChange}
        />
        {selectedFile && (
          <p className="text-green-500 mt-4">
            Selected File: {selectedFile.name}
          </p>
        )}
        <button
          onClick={handleTranscribe}
          className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded mt-4 button-expand"
          disabled={!selectedFile}
        >
          Transcribe
        </button>
      </div>
    </div>
  );
}

export default App;
