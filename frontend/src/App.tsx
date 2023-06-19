import React, { DragEvent, useState, useRef } from "react";
import "./App.css";
import axios from "axios";
import WaveForm from "./components/WaveForm";
import * as types from "./common/types";
import TranscriptionOutput from "./components/TranscriptionOutput";
import DownloadDropdown from "./components/DownloadDropdown";
import { FaSpinner } from "react-icons/fa";

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
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Disconnect the audio source if there was a previously selected file
      if (selectedFile) {
        const audioElement = audioElmRef.current;
        if (audioElement) {
          audioElement.pause();
          audioElement.src = "";
          audioElement.load();
        }
      }

      setSelectedFile(file);
      setAudioUrl(URL.createObjectURL(file));
      audioAnalyzer();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Disconnect the audio source if there was a previously selected file
      if (selectedFile) {
        const audioElement = audioElmRef.current;
        if (audioElement) {
          audioElement.pause();
          audioElement.src = "";
          audioElement.load();
        }
      }

      setSelectedFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
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
          setResponseStatus(response.status); // Set responseStatus regardless of the status code
          setTranscribing(false); // Set transcribing to false
        })
        .catch((error) => {
          // Handle any errors that occur during the request
          console.error(error);
          setResponseStatus(null); // Reset responseStatus to null
          setTranscribing(false); // Set transcribing to false
        });

      setTranscribing(true); // Set transcribing to true when transcribe button is clicked
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
    // source.mediaElement.onended = () => {
    //   source.disconnect();
    // };

    setAnalyzerData({ analyzer, bufferLength, dataArray });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex items-center justify-center">
        <h1 className="text-5xl font-bold mb-4 text-white text-center my-10">
          Transcription WebApp
        </h1>
      </div>
      <div className="flex flex-grow my-10">
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
              disabled={!selectedFile || transcribing}
            >
              {transcribing && responseStatus !== 200 ? (
                <FaSpinner className="text-3xl text-white animate-spin" />
              ) : (
                "Transcribe"
              )}
            </button>
          </div>
        </div>
        {responseStatus === 200 && (
          <div className="flex flex-col bg-gray-700 rounded-lg">
            <div className="flex-4 px-4">
              <div
                className="flex flex-col my-4 bg-white rounded-lg overflow-auto overflow-x-hidden"
                style={{ maxHeight: "calc(100vh - 250px)" }}
              >
                <div className="px-4 flex flex-col border-double border-sky-500">
                  {" "}
                  {transcriptionData && (
                    <TranscriptionOutput
                      transcriptionData={transcriptionData}
                      maxHeight={parseInt("100vh") - 250}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 px-4">
              <div className="mb-4 items-center">
                {" "}
                <DownloadDropdown transcriptionData={transcriptionData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
