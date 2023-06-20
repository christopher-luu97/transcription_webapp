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

  const deepCopy = <T, U = T extends Array<infer V> ? V : never>(
    source: T
  ): T => {
    if (Array.isArray(source)) {
      return source.map((item) => deepCopy(item)) as T & U[];
    }
    if (source instanceof Date) {
      return new Date(source.getTime()) as T & Date;
    }
    if (source && typeof source === "object") {
      return (Object.getOwnPropertyNames(source) as (keyof T)[]).reduce<T>(
        (o, prop) => {
          Object.defineProperty(
            o,
            prop,
            Object.getOwnPropertyDescriptor(source, prop)!
          );
          o[prop] = deepCopy(source[prop]);
          return o;
        },
        Object.create(Object.getPrototypeOf(source))
      );
    }
    return source;
  };

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
    // Regular expression pattern to match the HH:MM:SS format
    const timePattern = /^(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)$/;

    if (inputValue === "" || timePattern.test(inputValue)) {
      setTimeSearch(inputValue);
    }
  };

  const handleSearch = () => {
    if (!wordSearch && !timeSearch) {
      // If both wordSearch and timeSearch are empty, display unfiltered data
      setTranscriptionData(transcriptionData);
      return;
    }

    if (transcriptionData) {
      let filteredData: types.TranscriptionItem[] = [];
      const dataCopy = deepCopy(transcriptionData);

      if (wordSearch && !timeSearch) {
        // Execute word search when time search is empty
        filteredData = dataCopy.filter((item: types.TranscriptionItem) =>
          item.text.includes(wordSearch)
        );
      } else if (!wordSearch && timeSearch) {
        // Execute time search when word search is empty
        filteredData = dataCopy.filter(
          (item: types.TranscriptionItem) =>
            item.start_time_hms.includes(timeSearch) ||
            item.end_time_hms.includes(timeSearch)
        );
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
      oldData = deepCopy(transcriptionData);
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
                      <div>
                        <button
                          className="py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded mb-2"
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
