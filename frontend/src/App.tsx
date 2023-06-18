import React, { ChangeEvent, DragEvent, useState, useRef } from "react";
import "./App.css";
import axios from "axios";
import WaveForm from "./components/WaveForm";
import * as types from "./common/types";
import TranscriptionOutput from "./components/TranscriptionOutput";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [analyzerData, setAnalyzerData] = useState<types.AnalyzerData | null>(
    null
  );
  const [transcriptionData, setTranscriptionData] = useState<
    types.TranscriptionItem[] | null
  >(null);
  const audioElmRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (!file) return;
    setAudioUrl(URL.createObjectURL(file));
    audioAnalyzer();
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
    if (!file) return;
    setAudioUrl(URL.createObjectURL(file));
    audioAnalyzer();
  };

  const handleTranscribe = () => {
    if (selectedFile) {
      // Create a new FormData instance
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Make a POST request to your Python script endpoint
      axios
        .post(
          "http://localhost:8000/backend/transcription_webapp/transcribe/",
          formData
        )
        .then((response) => {
          if (response.status === 200) {
            // Handle the response from the Python script
            const responseData = response.data;
            setTranscriptionData(responseData.data);
          }
        })
        .catch((error) => {
          // Handle any errors that occur during the request
          console.error(error);
        });
    }
  };

  const audioAnalyzer = () => {
    const audioElement = audioElmRef.current;
    if (!audioElement) return;

    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 2048;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioCtx.createMediaElementSource(audioElement);
    source.connect(analyzer);
    source.connect(audioCtx.destination);
    source.mediaElement.onended = () => {
      source.disconnect();
    };

    setAnalyzerData({ analyzer, bufferLength, dataArray });
  };
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex items-center justify-center">
        <h1 className="text-5xl font-bold mb-4 text-white text-center">
          Transcription WebApp
        </h1>
      </div>
      <div className="flex flex-grow">
        <div className="flex flex-col w-1/4 px-4">
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
              className="py-2 px-4 flex bg-gray-200 text-gray-700 rounded w-full"
              style={{ marginBottom: "20px" }}
              onChange={handleFileChange}
            />

            <div
              style={{
                flex: "1",
                display: "flex",
                flexDirection: "column",
                marginBottom: "1px",
              }}
            >
              {" "}
              {analyzerData && <WaveForm analyzerData={analyzerData} />}
              <div
                style={{
                  height: 80,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: "1px",
                }}
              >
                <audio
                  src={audioUrl ?? ""}
                  controls
                  ref={audioElmRef}
                  onEnded={() => {
                    if (audioElmRef.current) {
                      audioElmRef.current.pause();
                      audioElmRef.current.currentTime = 0;
                    }
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleTranscribe}
              className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded mb-2 button-expand"
              disabled={!selectedFile}
            >
              Transcribe
            </button>
          </div>
        </div>
        <div className="flex px-4 bg-white rounded-lg">
          {transcriptionData && (
            <TranscriptionOutput transcriptionData={transcriptionData} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
