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
  const [wordSearch, setWordSearch] = useState("");
  const [timeSearch, setTimeSearch] = useState("");
  const [oldTranscriptionData, setOldTranscriptionData] = useState<
    types.TranscriptionItem[] | null
  >(null);

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

    setAnalyzerData({ analyzer, bufferLength, dataArray });
  };

  const handleTranscriptionDataUpdate = (
    updatedTranscriptionData: types.TranscriptionItem[]
  ) => {
    setTranscriptionData(updatedTranscriptionData);
    setOldTranscriptionData(updatedTranscriptionData);
  };

  const handleWordSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWordSearch(e.target.value);
  };

  const handleTimeSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;
    // Remove any non-digit characters from the input value
    const cleanedValue = inputValue.replace(/[^\d]/g, "");

    // Limit the cleaned value to a maximum length of 6 characters (HH:MM:SS)
    const limitedValue = cleanedValue.slice(0, 6);

    // Format the limited value into the HH:MM:SS format
    let formattedValue = "";
    if (limitedValue.length > 0) {
      formattedValue = limitedValue.replace(
        /^(\d{0,2})(\d{0,2})(\d{0,2})$/,
        (match, hour, minute, second) =>
          `${hour ? hour + ":" : ""}${minute ? minute + ":" : ""}${second}`
      );
    }
    setTimeSearch(formattedValue);
  };

  const handleSearch = () => {
    if (!wordSearch && !timeSearch) {
      // If both wordSearch and timeSearch are empty, display unfiltered data
      if (oldTranscriptionData) {
        setTranscriptionData(oldTranscriptionData);
      } else {
        setTranscriptionData(transcriptionData);
      }
      return;
    }

    if (transcriptionData) {
      let filteredData: types.TranscriptionItem[] = [];
      const dataCopy = [...transcriptionData];

      if (wordSearch && !timeSearch) {
        // Execute word search when time search is empty
        filteredData = dataCopy.filter((item: types.TranscriptionItem) =>
          item.text.includes(wordSearch)
        );
      } else if (!wordSearch && timeSearch) {
        // Execute time search when word search is empty
        const timeSearchParts = timeSearch.split(":");
        if (timeSearchParts.length === 3) {
          const [hours, minutes, seconds] = timeSearchParts;
          const timeSearchMs =
            parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

          filteredData = dataCopy.filter((item: types.TranscriptionItem) => {
            const matchesWordSearch = item.text.includes(wordSearch);
            const startTimeParts = item.start_time_hms.split(":");
            const endTimeParts = item.end_time_hms.split(":");

            if (startTimeParts.length === 3 && endTimeParts.length === 3) {
              const startTimeMs =
                parseInt(startTimeParts[0]) * 3600 +
                parseInt(startTimeParts[1]) * 60 +
                parseInt(startTimeParts[2]);
              const endTimeMs =
                parseInt(endTimeParts[0]) * 3600 +
                parseInt(endTimeParts[1]) * 60 +
                parseInt(endTimeParts[2]);

              const matchesTimeSearch =
                timeSearchMs >= startTimeMs && timeSearchMs <= endTimeMs;
              return matchesWordSearch && matchesTimeSearch;
            }

            return false;
          });
        }
      } else if (wordSearch && timeSearch) {
        // Execute both word search and time search when both are provided
        const timeSearchParts = timeSearch.split(":");
        if (timeSearchParts.length === 3) {
          const [hours, minutes, seconds] = timeSearchParts;
          const timeSearchMs =
            parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

          filteredData = dataCopy.filter((item: types.TranscriptionItem) => {
            const matchesWordSearch = item.text.includes(wordSearch);
            const startTimeParts = item.start_time_hms.split(":");
            const endTimeParts = item.end_time_hms.split(":");

            if (startTimeParts.length === 3 && endTimeParts.length === 3) {
              const startTimeMs =
                parseInt(startTimeParts[0]) * 3600 +
                parseInt(startTimeParts[1]) * 60 +
                parseInt(startTimeParts[2]);
              const endTimeMs =
                parseInt(endTimeParts[0]) * 3600 +
                parseInt(endTimeParts[1]) * 60 +
                parseInt(endTimeParts[2]);

              const matchesTimeSearch =
                timeSearchMs >= startTimeMs && timeSearchMs <= endTimeMs;
              return matchesWordSearch && matchesTimeSearch;
            }

            return false;
          });
        }
      }

      let oldData: types.TranscriptionItem[] = [];
      oldData = [...transcriptionData];
      setOldTranscriptionData(oldData);
      setTranscriptionData(filteredData);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleReset = () => {
    // Reset both word search and time search
    setWordSearch("");
    setTimeSearch("");
    // Reset the transcription data back to the unfiltered version
    if (oldTranscriptionData) {
      // Reset the transcription data back to the unfiltered version
      console.log(oldTranscriptionData);
      setTranscriptionData(oldTranscriptionData);
      handleTranscriptionDataUpdate(oldTranscriptionData);
    }
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
              }}
            >
              {" "}
              {analyzerData && <WaveForm analyzerData={analyzerData} />}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
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
            <div className="pt-4">
              <button
                onClick={handleTranscribe}
                className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded button-expand"
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
        </div>
        {responseStatus === 200 && (
          <div className="flex flex-grow pr-4">
            <div className="flex flex-col flex-grow bg-gray-700 rounded-lg">
              <div className="flex-4 px-4">
                <div className="flex flex-col my-4 bg-white rounded-lg ">
                  <div className="px-4 flex flex-col">
                    <div className="flex items-center justify-between mt-4 mb-4">
                      <div className="w-1/2 pr-2">
                        <input
                          type="text"
                          className="py-2 px-4 bg-gray-200 text-gray-700 rounded w-full"
                          placeholder="Search by words"
                          value={wordSearch}
                          onChange={handleWordSearchChange}
                          onKeyDown={handleKeyPress}
                        />
                      </div>
                      <div className="w-1/2 pl-2">
                        <input
                          type="text"
                          className="py-2 px-4 bg-gray-200 text-gray-700 rounded w-full"
                          placeholder="Search by time"
                          value={timeSearch}
                          onChange={handleTimeSearchChange}
                          onKeyDown={handleKeyPress}
                        />
                      </div>
                      <div className="pl-2 pt-2">
                        <button
                          className="py-2 px-2 bg-gray-500 hover:bg-gray-600 text-white rounded mb-2"
                          onClick={handleReset}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div
                      className="overflow-auto overflow-x-hidden"
                      style={{ maxHeight: "calc(100vh - 400px)" }}
                    >
                      {transcriptionData && (
                        <TranscriptionOutput
                          transcriptionData={transcriptionData}
                          maxHeight={parseInt("100vh") - 400}
                          onTranscriptionDataUpdate={
                            handleTranscriptionDataUpdate
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 px-4">
                <div className="mb-4 items-center">
                  {" "}
                  <DownloadDropdown
                    transcriptionData={transcriptionData}
                    fileName={selectedFile?.name}
                  />
                </div>
              </div>
            </div>{" "}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
